# U2-ADR-440: Die Festlegungen der Patientenverfügung werden Kennungen — abgeleitet, nicht gepflegt

**Status:** Angenommen
**Datum:** 27.09.2026
**Kategorie:** FELDER, VORSORGE, ANFRAGE
**Linie:** U2
**Löst ab:** U2-ADR-089 Punkt 1 („PV-Bausteine bleiben wizard-intern“), den Grund wahrend (Nachtrag dort).
**Bezug:** U2-ADR-409 (Feldregister: Kennungen dauerhaft) · U2-ADR-066 (PV-Assistent nach den BMJ-Textbausteinen) ·
U2-ADR-067 (Vorsorge-Darstellung) · U2-ADR-152 (die Anfrage von außen) · U2-ADR-137 (sensibel ist Voreinstellung, keine Sperre)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Eine Klinik, die nachts wissen muss, ob eine Operation dem Willen der Patientin entspricht, braucht die Festlegungen der
Patientenverfügung, nicht nur deren Ablageort. Ohne Genehmigung des Betreuungsgerichts darf eine Bevollmächtigte in einen
riskanten Eingriff nur einwilligen, wenn sie und der behandelnde Arzt darüber einig sind, dass die Einwilligung dem nach § 1827
festgestellten Willen entspricht (§ 1829 Abs. 4 und 5 BGB).

Der Assistent zur Patientenverfügung (nach den Textbausteinen des BMJ) schreibt seine 29 Festlegungen seit U2-ADR-066 in
`data.sektoren.advanceCare`. Sie waren aber keine Felder des Bereichs Vorsorge, also keine Kennungen. Eine Anfrage konnte sie
nicht erfragen, Feldkatalog und Lese-App kannten sie nicht.

## Entscheidung

1. **Die 29 Festlegungen sind Kennungen im Bereich `advanceCare`**, Sektion `living-will-decisions` („Festlegungen der
   Patientenverfügung“). Die Kennungen sind die Schlüssel, unter denen der Assistent schon schreibt (`advanceCare.lifeSustainingMeasures` usw.).
2. **Eine Quelle.** Die Sektion wird im Kern zur Laufzeit aus `PV_BMJ.steps` abgeleitet: Id, Typ, Optionswerte und Sichtbarkeit.
   Beschriftung und Optionstexte kommen über den Textsatz (`advanceCare.<id>.label`, `advanceCare.<id>/<wert>.label`); ihren
   Wortlaut leiten die beiden Sprach-Erzeuger aus dem Satz des Assistenten ab (`tools/lib/pv-festlegungen-textsatz.js`). Es gibt
   keine zweite, gepflegte Fassung. Wo außerhalb des Kerns eine statische Form nötig ist (Feldkatalog, Lese-App-Spiegel), wird sie
   aus dem Kern erzeugt und gegen ihn gehalten. Das Bürgermodul-Bündel trägt die Sektion nicht: jeder Kern leitet sie beim Start
   selbst ab.
3. **Jede Festlegung ist sensibel:** Sie geht nur mit, wenn sie einzeln freigegeben ist (U2-ADR-137). Ohne Freigabe bleibt sie
   zurück und wird in der Antwort nur gezählt.
4. **Im Formular nur mit Wert und nur angezeigt** (`nurMitWert`, `nurAnzeige`): Wer den Assistenten nicht benutzt hat, sieht
   keine 29 leeren Felder. Auch mit Schreibrecht zeigt die Zeile den Wert nur an; die Eingabe bleibt beim Assistenten, der den
   amtlichen Wortlaut zusammensetzt.
5. **Keine Schemastufe.** Die Werte stehen schon unter diesen Schlüsseln; es wird deklariert, nicht verschoben.
6. **Englisch** über denselben Weg: Die Beschriftungen kommen aus dem englischen Satz des Assistenten; die Sektion heißt
   „Decisions in the advance directive“.

```yaml
konformitaet:
  - aussage: >-
      Die Sektion trägt genau die Schritte des Assistenten (Id, Typ, Optionswerte, Wortlaut, Sichtbarkeit); jede Festlegung ist eine
      sensible Kennung des Kerns.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026
    pruefung:
      - tests/pv-festlegungen-kennungen.test.js
        "[PV·eine Quelle] die Sektion trägt genau die Schritte des Assistenten — Id, Typ, Optionswerte, Sichtbarkeit —, jedes Feld sensibel"
      - tests/pv-festlegungen-kennungen.test.js
        "[PV·eine Quelle·Rot-Beweis] die Sektion hat keine eigene Fassung: jedes Feld trägt das Merkmal der Ableitung, eine Id außerhalb der Schritte ist keine Kennung"
      - tests/pv-festlegungen-kennungen.test.js
        "[PV·Textsatz] der Wortlaut der Felder ist in beiden Sprachmodulen der des Assistenten — abgeleitet, nicht gepflegt"
  - aussage: >-
      Ein Depot, in das der Assistent geschrieben hat, ist ohne Migration anfragbar; nur einzeln Freigegebenes geht mit.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026; § 1829 Abs. 4 mit § 1827 BGB
    pruefung:
      - tests/pv-festlegungen-kennungen.test.js
        "[PV·Bestand·Anfrage] ein Depot, in das der Assistent geschrieben hat, ist ohne Migration anfragbar — zurück bleibt, was nicht einzeln freigegeben ist"
  - aussage: >-
      Im Formular erscheinen die Festlegungen nur mit Wert und nur angezeigt; im englischen Produkt tragen sie die englischen
      Beschriftungen.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026
    pruefung:
      - tests/pv-festlegungen-kennungen.test.js
        "[PV·Formular] nur mit Wert sichtbar und nur angezeigt: leer verborgen, vom Assistenten geschrieben sichtbar, keine Eingabe"
      - tests/pv-festlegungen-kennungen.test.js
        "[PV·Englisch] dieselbe Sektion im englischen Produkt, Beschriftung aus dem englischen Satz"
  - aussage: >-
      Wer ohne Kern liest, bekommt die aus dem Kern erzeugten Formen, und sie tragen alle Festlegungen (Feldkatalog, Lese-App);
      das Bürgermodul-Bündel ist Prüfstoff, keine Auslieferung.
    zustand: erfuellt
    herkunft: Rückfrage der Gegenlesung vom 28.09.2026
    pruefung:
      - tests/pv-festlegungen-kennungen.test.js
        "[PV·nach außen] was Dritte statisch lesen, trägt alle Festlegungen: Feldkatalog und Lese-App — das Bürgermodul-Bündel ist Prüfstoff, nicht Auslieferung"
  - aussage: >-
      Der Grund von U2-ADR-089 bleibt: die Sektion entsteht ausschließlich aus PV_BMJ.steps, keine literale Definition der
      Festlegungen steht im Kern oder in einem Bereichs-Template, keine Doppelablage; KI_KORPUS bleibt wizard-intern.
    zustand: erfuellt
    herkunft: Entscheidung vom 27.09.2026; U2-ADR-089 Punkt 1
    pruefung:
      - tests/w5-wizard-instrument-zeile-pruefen.test.js
        "[W-5·TeilA] die PV-Festlegungen sind Felder in living-will-decisions, abgeleitet aus PV_BMJ.steps — keine literale Definition, keine Doppelablage"
      - tests/w5-wizard-instrument-zeile-pruefen.test.js
        "[W-5·TeilA·Rot-Beweis] eine von Hand eingefügte Felddefinition in living-will-decisions fällt — ebenso eine literale im Quelltext"
```
