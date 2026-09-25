# U2-ADR-023: Rechenbare Datums-Felder + abgeleitete Minderjährigkeit + Kinder-Liste vereinheitlicht

**Status:** Akzeptiert
**Datum:** 19.06.2026
**Kategorie:** DATENMODELL, ARCHITEKTUR, UX
**Cross-Referenz (Produktiv-Kanon):** `ADR-095` (Referenz-/Propagations-Modell).
**U2-Bezug:** `U2-ADR-022` (**Vorgänger** — Personen-Vereinheitlichung; dieser ADR nimmt dessen `geburtsjahr`→Notiz-Faltung zurück und baut auf dem Register-Geburtsdatum auf), `U2-ADR-021` (rollenloses Register — Anti-Silo-Linie, hier eine Ebene tiefer), `U2-ADR-010` (Feld-Architektur/`typ`), `U2-ADR-014` (Dokument-Ebene — die `ablaufDatum`/`gueltigAb`-Datenpunkte, schon ISO-normalisiert).
**Drei-Anker:**
- **Code-Stelle:** `vivodepot.html` — `geburtsjahr` im Register (`personHinzufuegen`/`personAktualisieren`/`MENSCHEN_REGISTER_FELD`); `_datumTeile`/`_heuteTeile`/`personGeburtsjahr`/`personAlter`/`minderjaehrigkeit`/`kinderMitStatus`/`kinderGefiltert`; vereinheitlichte `kinder`-Liste (erwachsene_kinder entfällt) mit Ausbildungs-Marker; `_b16KindEintrag` (Geburtsjahr strukturiert statt in die Notiz).
- **Sprint-Commit:** dieser Bau (Substrat „rechenbare Datums-Felder").
- **ADR-Bezug:** dieser ADR (U2-ADR-023).
**Status heute:** gilt — Beleg `tests/sonderfall-verbote.test.js#u2-023-abgeleitetes-alter-nie-gespeichert`.

---

## Kontext

Geplant sind zwei Funktionen, die auf rechenbarem Alter/Datum aufsetzen: Minderjährigkeit feststellen und (später) alters-/fälligkeits-getriggerte Vorsorge & Erinnerung. Dieser ADR baut nur das **Substrat** — Daten rechenbar machen. Die Funktionen, die darauf rechnen, sind der **nächste** Auftrag.

Auslöser am Code: U2-ADR-022 faltete beim b16-Import das erwachsene-`geburtsjahr` als Freitext „geboren JJJJ" in die `anmerkung` der Register-Person — ein Geburtsjahr, das eine Maschine nicht ohne Weiteres zurückrechnen kann. Zugleich existierten zwei Kinder-Listen (`kinder` mit vollem Geburtsdatum, `erwachsene_kinder` mit Geburtsjahr), deren Trennung eine **gespeicherte** Minderjährigkeits-Aussage zementierte, die mit der Zeit falsch wird.

## Entscheidung

**Datum ist rechenbar; abgeleitete Eigenschaften (Alter, Minderjährigkeit) werden NIE gespeichert.**

1. **Geburtsdatum strukturiert, Geburtsjahr als Rückfall.** `geburtsdatum` (ISO `YYYY-MM-DD`) am Register; `geburtsjahr` (nur Jahr) als Rückfall, wenn der Tag unbekannt ist. Die U2-ADR-022-Faltung „geboren JJJJ" in `anmerkung` ist zurückgenommen — der b16-Import schreibt das Jahr strukturiert ins Feld.
2. **Minderjährigkeit abgeleitet, nicht gespeichert.** `minderjaehrigkeit(person, heute)` rechnet aus `geburtsdatum` (volles Datum → **exakt**, Grenze 18. Geburtstag) bzw. dem Rückfall `geburtsjahr` (→ **Näherung** übers Kalenderjahr, als `unsicher: true` markiert). Kein manuell setzbares Status-Feld minderjährig/volljährig (das dem Datum widersprechen könnte) — Anti-Silo eine Ebene tiefer als U2-ADR-021/022. `heute` ist injizierbar (Testbarkeit); Datums-Komponenten werden aus dem ISO-String **geparst** (keine Zeitzonen-Verschiebung über `new Date(str)`).
3. **EINE Kinder-Liste.** `kinder` und `erwachsene_kinder` sind vereinheitlicht. Minderjährig/volljährig ist ein **Live-Filter** auf das abgeleitete Alter (`kinderMitStatus`/`kinderGefiltert`), kein eigener Topf — „unter 18" erscheint automatisch in der gefilterten Sicht, ohne doppelte Pflege.
4. **Ausbildungs-Marker als Eingabe-Feld (Substrat).** An der Kind-**Bezugszeile** (kontextabhängig/zeitlich begrenzt → nicht an der Person): `in_ausbildung` (auswahl ja/nein) + `ausbildung_ende` (datum, voraussichtliches Ende). **Nur das Eingabe-Feld** — die Ableitung „potenzielle Unterhaltsverpflichtung" ist NICHT hier.

## §4 — Inventur der übrigen Datums-Felder (Befund)

Read-only-Inventur über alle Sektor-Felder + die Dokument-Ebene ergab:
- **Schon strukturiert (`typ:'datum'`):** `identitaet/geburtsdatum`, `sozialversicherung/schwerbehindertenausweis_gueltig`, `vorsorge/testament_datum`, neu `meine-menschen/kinder›ausbildung_ende`. Dokument-Ebene `gueltigAb`/`ablaufDatum`/`aktualisiertAm` sind beim Setzen bereits auf ISO normalisiert (`_erParseIso`) und treiben die Prüftermine-Ampel — rechenbar.
- **Spec-erwartet, aber im cleanslate-Code NICHT vorhanden:** `impfung_covid_datum`, `impfung_grippe_datum`, `impfung_tetanus_datum`, `ks_erstehilfe_datum`, `verwaltung_datum`, `verwaltung_gueltig_bis`. Der aktuelle Kern führt Impfungen als EIN `text+code`-Feld (`impfungen`, SNOMED-codeListe), nicht als granulare Datums-Felder. Diese Felder waren also nichts umzustellen — der Auftrag verlangte ausdrücklich „im Code verifizieren".
- **Bewusst unscharf (gemeldete Gabelung, NICHT erzwungen):** `sozialversicherung/pflegegrad_seit` ist jahr-granular („Pflegegrad seit (Jahr)", Freitext numerisch) — analog zum `geburtsjahr`-Rückfall. Bleibt jahr-granular; eine Umstellung auf volles Datum wäre eine Schein-Präzision (der Tag ist selten bekannt).

Ergebnis: **keine Freitext→Datum-Umstellung nötig** — die echten Datums-Felder sind bereits strukturiert.

## Abgrenzung / Scope-Grenze (NICHT in diesem Auftrag)

- **Erinnerungs-Engine (D50), Vorsorge-Alters-Trigger, Pflegegrad-Status-Ableitung, Unterhalts-Ableitung** (Kinder unter 18 / in Ausbildung als potenzielle Unterhaltsverpflichtung) — eigener Feature-Folge-Auftrag. Dort gilt die Framing-Grenze: **„potenziell, bitte prüfen"**, kein quasi-rechtlicher Feststellungs-Ton. Dieser ADR liefert nur das rechenbare Substrat.
- **Kein Migrations-Zwang:** v3 vor-produktiv (Linie U2-ADR-017/018/021/022). Alt in `erwachsene_kinder`-Zeilen abgelegte Daten werden vom vereinheitlichten Schema nicht mehr gelesen — bewusst akzeptiert (keine Produktivdaten auf `clean-rebuild`).

## Konsequenzen

- **Rechenbar statt gespeichert:** Alter/Minderjährigkeit folgen immer dem Datum; kein veraltbarer Status-Silo. Das Geburtsjahr ist wieder eine Zahl, keine Notiz.
- **Eine Liste, ein Filter:** Kinder werden einmal gepflegt; minderjährig/volljährig ist eine Sicht darauf. Ausbildungs-Marker + Ende stehen bereit für die spätere Unterhalts-Logik.
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258` unverändert (nur Register-/Render-/Ableitungs-Funktionen außerhalb des Blocks). Block-Integrität 2/0. Suite **900/0/1** (1 bewusster FHIR-Skip). Neuer Voll-Datei-SHA in `vivodepot.html.sha256` nachgezogen.
- **Mac-Abnahme:** Datums-Eingabe-UI (Datepicker) und der minderjährig-Filter in der Anzeige gehen wie üblich auf den Mac (manuelle Abnahme); node-grün ist Datenmodell + Ableitungs-Logik.

## Implementations-Verweis

Umgesetzt 19.06.2026 (clean-rebuild):
- **Kern** `vivodepot.html`: `geburtsjahr` ins Register-Schema; `_datumTeile`/`_heuteTeile`/`personGeburtsjahr`/`personAlter`/`minderjaehrigkeit` (abgeleitet, `heute` injizierbar); `kinderMitStatus`/`kinderGefiltert` (Live-Filter); `kinder`-Liste vereinheitlicht (`erwachsene_kinder` entfällt) + `in_ausbildung`/`ausbildung_ende`; `_b16KindEintrag` schreibt Geburtsjahr strukturiert; b16-Import + `importAnwenden`-Special-Case auf die EINE `kinder`-Liste.
- **Tests:** neu `rechenbare-datums-felder.test.js` (geburtsdatum strukturiert + Jahr-Rückfall, exakte + Näherungs-Minderjährigkeit, vereinheitlichte Liste + Filter, Ausbildungs-Marker an der Zeile, b16-Geburtsjahr strukturiert statt Notiz, §4-Datums-Inventur). Nachgezogen: `sektoren-spec` (zwei Listen), `personen-vereinheitlichung` (vereinheitlichte kinder statt erwachsene_kinder). `load-kern.js`: Ableitungs-Funktionen exportiert.

## Konformität

```konformitaet
aussage:   U2-023: abgeleitete Eigenschaften (Alter, Minderjährigkeit) werden NIE gespeichert —
           `minderjaehrigkeit()` bleibt eine reine Rechenfunktion; ihr Ergebnis wird nicht in den
           Datenpfad geschrieben, und es existiert kein Modell-Feld `minderjaehrig`/`alter`.
zustand:   prüfbar
pruefung:  tests/sonderfall-verbote.test.js#u2-023-abgeleitetes-alter-nie-gespeichert
quelle:    invariante
```

*Bindung nachgetragen 25.07.2026 (Stufe 7 der 26-Verbote-Strecke), über `tests/bindung-pruefen.js`.
Geltungsbereich: statisch geprüft sind die Schreib-Wege in den Datenpfad und die Feldmodell-Deklaration
(die realistische Regression). Ein Datenfluss-Beweis über alle Zwischenvariablen ist damit nicht
behauptet — er wäre nur zur Laufzeit führbar.*
