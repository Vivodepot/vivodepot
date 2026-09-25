# U2-ADR-NNN2 · Ende des eigenen Vorlagen-Formats: STANDARD_VORLAGEN wird Basistemplate

**Status:** Angenommen (Nummer wird beim Landen vergeben)
**Datum:** 17.09.2026
**Kategorie:** ARCHITEKTUR, SIGNATUR, VOKABULAR
**Linie:** U2
**Betrifft:** `vivodepot.html` (`STANDARD_VORLAGEN`, `AB_WERK_BASISTEMPLATE_DE`,
`BUERGERMODUL_BUENDEL.standardVorlagen` entfernt), `tools/basistemplate-neu-signieren.js`
(Eingabedatei), `tools/dokument-module/vivodepot-standardvorlage-<id>.json` (vier Dateien, nicht
Gegenstand dieser ADR)
**Bezug:** U2-ADR-040 (1E Basistemplate-Signatur, Option A treuhänderisch), U2-ADR-345
(Dokumentmodule/Standardvorlagen ins Bündel), U2-ADR-382 (Rechtsraum DE wird Modul — wörtliches
Vorbild für diesen Zug), die begleitende ADR „Korpus-Zuordnung" (derselbe Umbau, Rechtsraum-Katalog-
Hälfte)

---

## 0 · Der Auftrag

Eine signierte Standardvorlage ist ein Template, das signiert ausgeliefert wird — die Signatur
deckt gemessen den Inhalt, nicht den Ort. Ein Register fällt damit weg. Vor dem Bau: messen, ob
irgendetwas das Vorlagen-Register über einen Weg liest, der voraussetzt, daß es neben den
Bereichen steht (Konfektionierer, Rezeptprüfung, Gateway).

## 1 · Der Befund

**Kein gemessener Konsument setzt eine Bündel-Position voraus.** Fünf Konsumenten geprüft:

- `_standardVorlage(id)` (vivodepot.html:30419) — liest den globalen `STANDARD_VORLAGEN`-Array,
  unabhängig davon, woher er materialisiert wurde.
- `basisVorlagenVerifizieren` (vivodepot.html:32070-32072) — Default-Parameter liest denselben
  globalen Array, dieselbe Unabhängigkeit.
- Sektor-Rendering (vivodepot.html:38018) — filtert `STANDARD_VORLAGEN` nach `.sektor`, kein
  Bezug zur Bündel-Struktur.
- `tools/lib/vor-umzug-achse-a4-standard-vorlagen.js` — golden-master Textverlust-Wächter, liest
  `V.STANDARD_VORLAGEN`, dokumentiert selbst „DEPOT-UNABHÄNGIG … derselbe Text für jedes Depot,
  jede Bürgerin" (Kopf-Kommentar, Zeile 50-52) — bereits heute keine Bündel-Positions-Annahme.
- `tools/basistemplate-neu-signieren.js` — Signierlauf, bereits GENERISCH (Schleife über
  `inhalte`, kein hartcodiertes „vier" im Code selbst), Guard vergleicht NUR gegen
  `V.STANDARD_VORLAGEN.length`/-Inhalt, nicht gegen irgendeine Bündel-Position.

**Der eigentliche „Registercharakter" liegt woanders:** `BUERGERMODUL_BUENDEL.standardVorlagen`
war ein Sub-Objekt IM SELBEN Bündel wie `bereiche` — strukturell dieselbe Situation, aus der
U2-ADR-382 den Rechtsraum-Katalog bereits gelöst hat („RECHTSRAUM_KATALOG wird selbst das
deutsche Rechtsraum-Modul … statt eine[r] instrument-geschlüsselte[n] Tabelle"). STANDARD_VORLAGEN
ist ebenfalls depot-/produkt-unabhängig (wie Rechtsraum=DE), keine Konfektionierer-Variable (wie
Bereich/Sprache/Feld-Bausatz) — derselbe Formfehler wie beim Rechtsraum-Katalog vor U2-ADR-382,
bisher unkorrigiert.

**Zweiter Fund:** `AB_WERK_VORLAGEN_QUELLEN` (bestehende, leere, funktionsfähige Region) kann die
Basistemplate-Form strukturell nicht aufnehmen — anderer Gegenstand, andere `felder[]`-Bedeutung
(s. begleitende ADR „Korpus-Zuordnung", §4).

## 2 · Die Entscheidung

1. **`STANDARD_VORLAGEN` wird `AB_WERK_BASISTEMPLATE_DE`** — ein eigener, dedizierter Ab-Werk-Slot
   nach demselben Muster wie `AB_WERK_RECHTSRAUM_DE` (U2-ADR-382) und `AB_WERK_TEXTSATZ_DE`
   (U2-ADR-367): eine native Konstante, materialisiert aus den vier signierten Basistemplate-
   Quelldateien statt aus einem Sub-Objekt des allgemeinen Bündels. „Basistemplate" statt
   „Standardvorlage"/„Vorlage" — Begriff bereits im Code etabliert (`STANDARD_VORLAGEN_CERTS`,
   `basisVorlagenVerifizieren`, „1E Basistemplate-Signatur", `tools/basistemplate-neu-
   signieren.js`), mit Trennsatz gegen das Gerüst-Template-Konzept: **„Basistemplate" bezeichnet
   hier das signierte Dokumentformular (Vorsorgevollmacht/Patientenverfügung/
   Betreuungsverfügung/Organspende), nicht das Template-Konzept (Thema/Berufsstand) der
   Gerüst-Architektur.**
2. **`BUERGERMODUL_BUENDEL.standardVorlagen` entfällt.** Die vier Basistemplates sind kein
   Sub-Objekt des allgemeinen Depot-Bündels mehr — dieselbe Kollaps-Bewegung, die U2-ADR-382 für
   den Rechtsraum-Katalog bereits vollzogen hat. Das ist das „Register", das wegfällt: nicht der
   Signaturmechanismus (der bleibt exakt, wie er ist), sondern die Bündel-Mitgliedschaft.
3. **Die vier Quelldateien sind ein eigenständiges Artefakt, nicht neu gebaut.**
   `tools/dokument-module/vivodepot-standardvorlage-<id>.json` (patientenverfuegung/
   betreuungsverfuegung/vorsorgevollmacht/organspende) — unabhängig geprüft: Struktur-Fidelity
   (`tools/dokumentmodule-fidelity-pruefen.js`, alle vier `gleich: true`) UND echte
   kryptografische 1E-Verifikation (`basisVorlagenVerifizieren` gegen `STANDARD_VORLAGEN_CERTS`,
   alle vier `_gepruefteBasisVorlagen`-Treffer), beides am 17.09.2026 selbst nachvollzogen, nicht
   nur berichtet übernommen.
4. **`tools/basistemplate-neu-signieren.js` und sein Eingabe-Wächter bleiben unverändert in
   ihrer Logik** — der Wächter vergleicht Zahl/Inhalt gegen `V.STANDARD_VORLAGEN`, das bleibt
   dieselbe globale Bindung, nur die Materialisierungsquelle dahinter ändert sich. Die
   Eingabedatei `docs/template-generator/basistemplate-inhalte.json` muß inhaltlich Schritt
   halten, falls sich Zahl/Form der vier Basistemplates durch diesen Zug ändert (bisher: keine
   inhaltliche Änderung, nur der Materialisierungsweg — Eingabedatei bleibt darum unverändert
   gültig).

## 3 · Was ausdrücklich NICHT Teil dieser Entscheidung ist

- **Kein neues Signaturformat, keine neue Kryptografie.** Die 1E-Kette
  (`verifiziereTemplateKette`, `STANDARD_VORLAGEN_CERTS`, TA-Anker) bleibt exakt bestehen — diese
  ADR ändert, WOHER die vier Einträge kommen, nicht WIE sie geprüft werden.
- **Kein mehrsprachiges/mehr-rechtsraumfähiges Basistemplate-Register.** Anders als Rechtsraum
  (`_RECHTSRAUM_MODUL_REGISTRY`, mehrere Länder-Fächer) bleibt Basistemplate=DE-only — ein
  künftiges Fremdsprachen-/Fremdland-Basistemplate ist eine eigene, spätere Entscheidung.
- **Die Datei-Form der vier Quelldateien selbst** — diese ADR beschreibt nur, wie sie in den Kern
  einwandern, nicht ihre eigene Herkunft/Form.

## Konformität

```konformitaet
aussage:   Kein gemessener Konsument (_standardVorlage, basisVorlagenVerifizieren-Default,
           Sektor-Rendering, vor-umzug-Golden-Master, basistemplate-neu-signieren.js) setzt eine
           Bündel-Position von STANDARD_VORLAGEN voraus — alle lesen den globalen Array,
           unabhängig von seiner Materialisierungsquelle.
zustand:   nicht-prüfbar
```
Begründung: eine Negativ-Beobachtung über fünf Lesestellen im Quelltext, von Hand nachvollzogen
(s. §1) — kein einzelner Testfall bildet „kein Konsument tut X" ab, ohne den ganzen Kern
nachzubauen.

```konformitaet
aussage:   Die 1E-Basistemplate-Kette (STANDARD_VORLAGEN_CERTS/verifiziereTemplateKette) prüft
           ein Basistemplate bereits heute wie jedes andere signierte Template — derselbe
           Mechanismus bleibt unverändert, unabhängig von der Materialisierungsquelle.
zustand:   prüfbar
pruefung:  tests/trust-basistemplate-signatur.test.js#Basis: TA-signiertes Behörden-Cert + treuhand-signiertes templateJws → Kette gültig
```

```konformitaet
aussage:   Die vier Basistemplate-Quelldateien sind inhaltlich identisch zum vormals im Bündel
           gepflegten Stand UND bestehen die echte kryptografische 1E-Verifikation.
zustand:   prüfbar
pruefung:  tests/trust-basistemplate-signatur.test.js#1b: exakter Inhalt → verifiziert
```

```konformitaet
aussage:   Der amtliche Wortlaut der Basistemplates bleibt durch diesen Umzug ohne Textverlust
           gegenüber dem historischen Beleg (37038011) erhalten.
zustand:   prüfbar
pruefung:  tests/vor-umzug-a4-standard-vorlagen.test.js#[Vor-Umzug·a4·immer] der amtliche Wortlaut der STANDARD_VORLAGEN ist gegenüber dem Beleg (37038011) erhalten — jede Lücke ist eine BENANNTE, entschiedene Ausnahme
```

```konformitaet
aussage:   AB_WERK_BASISTEMPLATE_DE existiert, materialisiert aus einer eigenen eingebetteten
           Quelle, BUERGERMODUL_BUENDEL.standardVorlagen entfällt, alle bestehenden
           STANDARD_VORLAGEN-Konsumenten bleiben unverändert grün.
zustand:   prüfbar
pruefung:  tests/vor-umzug-a4-standard-vorlagen.test.js#[Vor-Umzug·a4·Rot-Beweis Ende-zu-Ende] eine echte Kern-Verfälschung bricht die immer-Prüfung
```

```konformitaet
aussage:   Die vier externen Quelldateien landen am selben Pfad
           (tools/dokument-module/vivodepot-standardvorlage-<id>.json) im Kanon.
           AB_WERK_BASISTEMPLATE_DE ist im Gerüst die LEERE ANDOCKSTELLE dafür
           — Leerwert Object.freeze([]) zwischen den Marken :BEGIN und :END,
           gefüllt wird sie erst beim Konfektionieren. Ein Laufzeit-Ladeweg von
           den Quelldateien besteht nicht.
zustand:   offen
frist:     2026-10-31
bedingung: Die vier Quelldateien liegen im Kanon (gebaut). Offen ist der Abgleich: ein Werkzeug hält sie gegen den konfektionierten
           Stand beziehungsweise gegen die Modulquelle, aus der gefüllt wird — NICHT gegen die Gerüst-Konstante AB_WERK_BASISTEMPLATE_DE.
           Die Konstante steht zwischen ihren BEGIN- und END-Marken und ist bestimmungsgemäß LEER (Object.freeze([]), die Andockstelle,
           kein Rest eines Umbaus); ein Abgleich gegen sie verglich die vier Dateien mit nichts und meldete grün. Frist am 22.09.2026
           neu gesetzt (die frühere, 2026-09-20, war abgelaufen; die Klausel wird nicht als überholt geschlossen: die Zusicherung, dass das
           Ausgelieferte mit den vier Quelldateien übereinstimmt, hält heute niemand). Das Werkzeug tools/dokumentmodule-fidelity-pruefen.js,
           das als Muster genannt war, stürzt ohne Argumente ab (TypeError: V._standardVorlageAusBuendelErzeugen is not a function, Exit 1).
```

---

*Vivodepot GmbH · Berlin · 17.09.2026*
