# U2-ADR-139: Die Rentenversicherungsnummer wird ein einziges Feld (Schema 63)

**Status:** Angenommen
**Datum:** 14.08.2026
**Kategorie:** DATENMODELL, MIGRATION
**Linie:** U2
**U2-Bezug:** U2-ADR-050 (Verwaisungs-Regel — Bürgerdaten werden durch Migration nie gelöscht,
hier auf zwei konkurrierende Quellfelder statt eines entfallenden Feldes angewandt) · U2-ADR-108
(jeder Schema-Sprung bringt seine Probe mit)
**Anker:** Befund vom 13.08.2026 (ein Sachverhalt, zwei Felder) · Umsetzung vom 14.08.2026
**Status heute:** gilt — Beleg `tests/rv-nummer-vereinheitlichung.test.js`.

---

## Kontext

`finanzen.dt_rentenversicherungsnr` und `sozialversicherung.rentenversicherungsnummer` waren
zwei Felder für denselben Sachverhalt: identisches Beispiel, beide `sensibel: true`, beide auf
denselben SD-JWT-VC-Claim `social_insurance_number` gemappt — nur in zwei verschiedenen
Credentials (Finanzen-VC und Sozialversicherungs-VC). Das Referenzdepot trug bereits zwei
verschiedene Nummern für dieselbe Person; eine Bürgerin, die beide Nachweise herausgibt, gäbe
zwei sich widersprechende Dokumente heraus.

Der B16-Import zielte bereits ausschließlich auf `sozialversicherung.rentenversicherungsnummer`
(zwei Alt-Schlüssel-Aliase, keiner auf `finanzen`) — ein Hinweis, welches Feld der eigentliche
Wahrheitsort war.

## Entscheidung

**`sozialversicherung.rentenversicherungsnummer` bleibt das einzige Feld.**
`finanzen.dt_rentenversicherungsnr` entfällt als eigenständiges Formularfeld. Finanzen zeigt den
Wert fortan als Cross-Sektor-Lese-Sicht (`CROSS_SEKTOR_FELDER`, Muster identisch zu
Gesundheit→Sozialversicherung für Krankenkasse/Versichertennummer) — ein Wert, zwei
Anzeigeorte, keine zweite Ablage.

**Migration Schema 62 → 63**, additiv nach der Verwaisungs-Regel (U2-ADR-050):

- Nur `finanzen` befüllt → der Wert wandert nach `sozialversicherung`.
- Nur `sozialversicherung` befüllt → unverändert.
- Beide befüllt, **gleicher** Wert (Leerzeichen-/Groß-Klein-normalisiert) → zusammengeführt,
  `sozialversicherung` behält ihren eigenen Wert, kein Rettungsfeld.
- Beide befüllt, **verschiedener** Wert → `sozialversicherung` behält ihren Wert (die Bürgerin
  sieht ihn dort unverändert weiter); der abweichende `finanzen`-Wert wird **nicht
  stillschweigend verworfen**, sondern wandert ins Rettungsfeld
  `finanzen.dt_rentenversicherungsnr_frueher`.

**VC-Mapping:** `VC_FINANZEN_MAPPING` verliert den Eintrag `dt_rentenversicherungsnr` →
`social_insurance_number`. Der Claim lebt nur noch im Sozialversicherungs-VC
(`VC_SOZIALVERSICHERUNG_MAPPING`). Ein Empfänger, der den bisherigen Finanzen-Nachweis wollte,
um daraus die Sozialversicherungsnummer zu lesen, muss künftig den
Sozialversicherungs-Nachweis anfragen — eine schärfere Trennung von Kreditgeber-relevanten
Finanz-Claims und Sozialversicherungs-Claims, kein Funktionsverlust am eigentlichen Claim selbst.

**Die Unstimmigkeits-Ansage** (`_rvNummernWiderspruch`, Entscheidung vom 13.08.2026) ist mit der
Zusammenführung gegenstandslos — es gibt nur noch ein Feld, also keinen Widerspruch mehr zu
melden. Geprüft, ob `social_insurance_number`
der einzige doppelt gemappte Claim war (ja, einziger Treffer mit Zähler 2 unter allen
VC-Claim-Zielen) — darum ersatzlos entfernt, nicht generalisiert. Die zugehörige Probe
(`tests/rv-nummer-widerspruch.test.js`) ist gelöscht.

**`finanzen.dt_rentenversicherungsnr` im `ALT_LABEL_REGISTER`** (U2-ADR-116 §7-Pflicht: „Ein
Feld zu entfernen heisst, seinen Registereintrag zu schreiben") — für ein Depot, das die
Migration nie fährt, bleibt das Label auffindbar. Aus der Lese-App-Felddeklaration entfernt
(Parität zum Kern).

## Begründung

- **Ein Sachverhalt, ein Feld:** zwei Wahrheitsorte für dieselbe Sozialversicherungsnummer
  erzeugen genau die Art von Unstimmigkeit, die ein Verifiable Credential nicht tragen darf —
  ein Empfänger vertraut einer signierten Aussage, die intern widersprüchlich sein kann.
- **Sozialversicherung statt Finanzen als Wahrheitsort:** der B16-Import zielte bereits dorthin;
  die Nummer ist sachlich eine Sozialversicherungsangabe, keine Finanzangabe.
- **Rettungsfeld statt Löschen bei Widerspruch:** dieselbe Verwaisungs-Regel wie bei jeder
  anderen Feld-Konsolidierung (U2-ADR-050, U2-ADR-116) — eine Bürgerin, die zwei verschiedene
  Nummern eingetragen hatte, verliert die abweichende nicht kommentarlos.

## Konsequenzen

- Positiv: keine widersprüchlichen Nachweise mehr möglich; ein Sensibel-Feld weniger im
  Datenmodell; die Doppelerfassung-Angabe im Bereich „Ruhestand / private Vorsorge" verweist nur
  noch auf den einen Wahrheitsort.
- Offen/Kosten: eine Bürgerin mit zwei abweichenden Alt-Werten sieht die `finanzen`-Fassung nicht
  mehr im Formular — sie bleibt im Rettungsfeld erhalten, aber ohne eigene UI (wie jedes andere
  Rettungsfeld). Das Referenzdepot-Fixture trug zwei unterschiedliche Beispielwerte
  (`12 345678 A 123` / `65 120358 A 456`) — bereinigt auf den einen verbliebenen Wert.

## Verifikation

- **Neu** `tests/rv-nummer-vereinheitlichung.test.js` (7 Tests): vier Migrationsfälle + Idempotenz
  + Cross-Sektor-Anmeldung.
- **Entfernt** `tests/rv-nummer-widerspruch.test.js` (gegenstandslos).
- Nachgezogen: `tests/fixtures/persona-p3.js`, `tests/fixtures/referenzdepot.js` (Feld
  entfernt), `tests/fixtures/migrations-stufen.js` (Stufe 63 + Korrektur einer hart verdrahteten
  Zwischenversion in Stufe 62, s. Kommentar dort), `tests/herausgeben-zentral-neutral.test.js` +
  `tests/weitere-formate.test.js` (Sonden auf ein weiterhin existierendes Finanzen-Feld
  umgestellt), `tests/fixtures/render-aufnahme/{leer,befuellt}__finanzen.html` (Charakterisierungs-
  Aufnahme neu gezogen, `RENDER_AUFNAHME_NEU=1`), Lese-App-Felddeklaration + `ALT_LABEL_REGISTER`.
