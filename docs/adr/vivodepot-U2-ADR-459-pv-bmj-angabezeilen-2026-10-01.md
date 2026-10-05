# U2-ADR-459 · Patientenverfügung im Wortlaut der BMJ-Textbausteine, Angabezeilen nach dem Formular

**Status:** Akzeptiert, gebaut.
**Datum:** 01.10.2026
**Kategorie:** INHALT, STANDARDS
**Status heute:** gilt
**Betrifft:** `tools/dokument-module/vivodepot-dokumentmodul-patientenverfuegung.json` (Abschnitte 2.1–2.12), `tools/dokument-module/vivodepot-dokumente-de.json` (`PV_BMJ.steps`, neue Festlegung `counsellingBy`), `tools/textsatz-de-modul.json`, `tools/textsatz-en-modul.json`, `vivodepot.html` (Block-Handler `freitextSatz`, `instrumentPersonVerweis`, `_pvPersonAngaben`, `_aufzaehlungVerbinden`), `vivodepot-lesen.html` (`_aufzaehlungVerbinden`), `tools/pv-festlegungen-bmj-beleg.js`, `tests/fixtures/bmj-patientenverfuegung-textbausteine.txt`.
**Bezug:** U2-ADR-440 (Festlegungen aus PV_BMJ.steps), U2-ADR-066 (Platzhalter „Baustein nicht gewählt“), Regel „offizielle Inhalte vor eigenen“.

## Frage

Steht die erzeugte Patientenverfügung Wort für Wort in den „Textbausteinen für eine schriftliche Patientenverfügung“ des Bundesministeriums der Justiz, und wo die Bausteine eine eigene Angabe vorsehen, in der Form des Formulars?

## Entscheidung

1. **Jede Zeile stammt zeichengleich aus den Bausteinen.** Referenz ist die Textfassung des BMJ-PDF (`tests/fixtures/bmj-patientenverfuegung-textbausteine.txt`, amtliches Werk nach § 5 UrhG). Eine Zeile wird an den Eingaben der Person geteilt; jedes übrige Stück ist ein zusammenhängendes Stück des amtlichen Textes oder ein Bezugssatz, der vor einem Aufzählungspunkt endet, gefolgt von einem Baustein, der nach einem Aufzählungspunkt beginnt — so setzt das BMJ selbst zusammen. Die frühere eigene Überleitung der Anwendungssituationen und die Kurzsätze in Eingangsformel, Beistand, Schweigepflicht und Verbindlichkeit entfallen.
2. **Angabezeilen nach dem Formular (2.7, 2.12).** In 2.7 stehen bevollmächtigte und betreuende Person als Kopfzeile mit „Name:“, „Anschrift:“, „Telefon“/„Telefax“, „E-Mail:“, wie im Formular. Der „(ggf.: …)“-Teil zur Besprechung steht nur, wenn die Besprechung bejaht ist; eine Besprechung wird nie erfunden. 2.12 hat zwei Lücken: „informiert bei/durch …“ und „beraten lassen durch …“. Dafür gibt es die dreißigste Festlegung `counsellingBy`.
3. **Eine fehlende Angabe bleibt „...“.** Wie im amtlichen Formular steht an einer leeren Lücke die Auslassung zum handschriftlichen Ausfüllen, nicht ein erfundener Ersatz. Eine Aufzählung verbindet „...“ ohne zusätzliches Satzzeichen.
4. **Jede Festlegung ist belegt.** `tools/pv-festlegungen-bmj-beleg.js` sucht jeden Optionstext und Einleitungssatz der 30 Festlegungen wörtlich im amtlichen Text und nennt den Abschnitt. Platzhalter „(kein …)“ tragen keinen Baustein.

## Was diese Entscheidung nicht leistet

Sie übersetzt den Rechtstext nicht: die englische Fassung trägt die deutschen Bausteine, die offenen Schlüssel stehen in `tools/textsatz-en-juristisch-offen.js`. Sie prüft keine Rechtswirksamkeit im Einzelfall; sie sichert nur die Herkunft des Wortlauts.

```yaml
konformitaet:
  - aussage: >-
      Jede Zeile der erzeugten Patientenverfügung stammt zeichengleich aus den BMJ-Textbausteinen; die Liste der
      bekannten Abweichungen ist leer.
    zustand: erfuellt
    herkunft: U2-ADR-459 (01.10.2026)
    pruefung:
      - tests/pv-bmj-wortlaut.test.js
        "[PV·Wortlaut] jede Zeile der erzeugten Patientenverfügung stammt zeichengleich aus den BMJ-Textbausteinen, bis auf die bekannten"
      - tests/pv-bmj-wortlaut.test.js
        "[PV·Wortlaut·Rot-Beweis] die frühere Überleitung der Anwendungssituationen fällt"
  - aussage: >-
      In 2.7 steht die Vorsorgevollmacht nur bei bejahter Besprechung; in 2.12 stehen beide Lücken einzeln.
    zustand: erfuellt
    herkunft: U2-ADR-459 (01.10.2026)
    pruefung:
      - tests/pv-bmj-wortlaut.test.js
        "[PV·2.7] die Vorsorgevollmacht steht nur bei bejahter Besprechung — eine Besprechung wird nie erfunden"
      - tests/pv-bmj-wortlaut.test.js
        "[PV·2.12] beide Lücken einzeln: „informiert bei/durch …“ und „beraten lassen durch …“"
  - aussage: >-
      Jede Festlegung ist wörtlich aus den Textbausteinen belegt.
    zustand: erfuellt
    herkunft: U2-ADR-459 (01.10.2026)
    pruefung:
      - tests/pv-festlegungen-bmj-beleg.test.js
        "[PV·BMJ] jede Festlegung ist wörtlich aus den Textbausteinen belegt"
```
