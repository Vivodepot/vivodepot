# U2-ADR-438: Verständigung und Unterstützung — und die Freitexte der Notfallvorsorge auf der Karte

**Status:** Angenommen
**Datum:** 27.09.2026
**Kategorie:** FELDER, VORSORGE, NOTFALL
**Linie:** U2
**Bezug:** U2-ADR-432 (jedes Depot gleich) · U2-ADR-433 (Muster: eigene Gruppe in der Vorsorge, Karte, Blatt Krankenhaus)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Das Depot kannte kein Feld für Kommunikationsbedarf: keine Sprache, in der man sich am besten verständigt, kein Dolmetschen,
keine Gebärdensprache, keine Leichte Sprache. Eine Begleitperson für Gespräche gab es nur als Tipp in einer Situation, einen
Schutzbedarf („wer nicht informiert werden soll") gar nicht. Hilfsmittel, GdB mit Merkzeichen und Pflegegrad waren da.

„Besondere Situation" und „Hinweis für Rettungskräfte" (`emergencyPreparedness.specialSituation`,
`.noteForEmergencyResponders`) standen als Freitext im Depot, aber weder auf der Notfallkarte noch in der Angehörigen-Sicht —
also nicht dort, wo eine Rettungskraft oder die Klinik sie liest.

## Entscheidung

Entscheidung vom 26.09.2026 (Felder, Sensibilität) und 27.09.2026 (Kürzung auf der Karte):

1. **Eine eigene Gruppe in der Vorsorge** (`advanceCare`, Sektion `communication-support`, direkt nach den Pflege-Wünschen),
   in jedem Depot gleich (U2-ADR-432). Fünf Felder:
   `communicationLanguage` (Text), `communicationSupport` (Mehrfachauswahl: dolmetschen, gebaerdensprache, leichte-sprache),
   `supportPerson` (Verweis auf eine Person), `whatHelpsMe` (Freitext), `doNotInform` (Freitext).
   Hilfsmittel bleiben, wo sie sind; kein zweites Feld dafür.
2. **Sensibel ist nur `doNotInform`.** `communicationSupport` und `whatHelpsMe` sind für Helfende gedacht — Rettungskräfte,
   Klinik, Angehörige sollen sie lesen; als sensibel wären sie dort zurückgehalten, wo sie wirken sollen.
3. **Notfallkarte:** Sprache, Unterstützung und Begleitperson (als Name), jeweils nur wenn ausgefüllt. `whatHelpsMe` steht
   nie auf der Karte (zu lang), `doNotInform` nie.
4. **Die zwei Freitexte der Notfallvorsorge auf die Karte**, nur wenn ausgefüllt, gekürzt auf höchstens **160 Zeichen** am
   Wortende mit dem Verweis „(vollständig in der Datei)"; ungekürzt im Blatt Krankenhaus.
5. **Angehörigen-Sicht, Blatt Krankenhaus:** zwei Blöcke — „Verständigung und Unterstützung" (Sprache, Unterstützung,
   Begleitperson, Was mir hilft) und „Besondere Hinweise" (die zwei Freitexte). `doNotInform` nie.
6. **Die Lese-App** zeigt dieselbe Karte (Handkopie der Kartenzeilen und der Kürzung).

```yaml
konformitaet:
  - aussage: >-
      Die fünf Felder überleben Speichern und Laden; nur doNotInform ist sensibel.
    zustand: erfuellt
    herkunft: Entscheidung vom 26.09.2026
    pruefung:
      - tests/k3-verstaendigung-notfallkarte.test.js
        "[K3] die fünf Felder überleben Speichern und Laden"
      - tests/k3-verstaendigung-notfallkarte.test.js
        "[K3·Sensibel] nur doNotInform ist sensibel — communicationSupport und whatHelpsMe nicht (Entscheidung 26.09.2026)"
  - aussage: >-
      Die Notfallkarte zeigt Sprache, Unterstützung, Begleitperson als Name und die zwei Freitexte, lange auf 160 Zeichen am
      Wortende gekürzt mit Verweis auf die Datei; doNotInform und whatHelpsMe nie.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026
    pruefung:
      - tests/k3-verstaendigung-notfallkarte.test.js
        "[K3·Notfallkarte] ein langer Freitext wird am Wortende auf 160 Zeichen gekürzt und verweist auf die Datei"
      - tests/k3-verstaendigung-notfallkarte.test.js
        "[K3·Notfallkarte·Rot-Beweis] „Wer nicht informiert werden soll“ und „Was mir hilft“ stehen nie auf der Karte"
  - aussage: >-
      Das Blatt Krankenhaus trägt die Verständigungs-Felder und die zwei Freitexte, doNotInform nie; jedes Depot gleich;
      die Lese-App zeigt dieselbe Karte.
    zustand: erfuellt
    herkunft: Entscheidung vom 26.09.2026; U2-ADR-432
    pruefung:
      - tests/k3-verstaendigung-notfallkarte.test.js
        "[K3·Angehörige] das Blatt Krankenhaus trägt die vier Verständigungs-Felder und die zwei Freitexte — doNotInform nie"
      - tests/k3-verstaendigung-notfallkarte.test.js
        "[K3·jedes Depot gleich] im Sub-Depot gelten dieselben Felder und dieselbe Karte (U2-ADR-432)"
      - tests/k3-verstaendigung-notfallkarte.test.js
        "[K3·Lese-App] die Notfallkarte der Lese-App zeigt dieselben Zeilen wie der Kern, kürzt gleich und zeigt doNotInform nie"
```
