# U2-ADR-433: Notvertretung durch Ehegatten — die Ablehnung im Depot der vertretenen Person

**Status:** Angenommen
**Datum:** 25.09.2026
**Kategorie:** FELDER, VORSORGE, NOTFALL
**Linie:** U2
**Bezug:** U2-ADR-432 (jedes Depot gleich) · U2-ADR-109 (Ablauf der Notvertretung beim Vertretenden) · U2-ADR-096 (Instrumente in der Liste)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Die Notvertretung durch Ehegatten in Gesundheitsfragen kannte das Depot nur auf der Seite des VERTRETENDEN
(`people.childrenAndDependants/basisOfRepresentation` mit der Option `ehegattennotvertretung`, dazu die Ablauf-Rechnung).
Im Depot der Person, die vertreten würde, gab es keine Kennung dafür, dass sie eine solche Vertretung ablehnt. Eine Klinik
konnte das nicht erfragen, die Notfallkarte konnte es nicht zeigen.

Die Rechtslage (§ 1358 BGB, § 78a BNotO): Kann eine Person in Gesundheitsfragen vorübergehend nicht selbst entscheiden,
darf ihr Ehegatte sie bis zu sechs Monate vertreten — nicht aber, wenn sie eine solche Vertretung ablehnt oder eine
Vollmacht für diese Angelegenheiten erteilt hat. Eine Ablehnung kann im Zentralen Vorsorgeregister eingetragen werden.

## Entscheidung

Entscheidung vom 25.09.2026:

1. **Eine eigene Gruppe in der Vorsorge** (`advanceCare`, Sektion `spousal-representation`), kein weiteres Instrument in
   `provisionInstruments`: eine Klinik fragt „liegt eine Ablehnung vor?", das ist eine einzelne, stabile Kennung.
   Vier Felder: `spousalRepresentationObjection` (ja/nein), `spousalRepresentationObjectionSince` (Datum, bei ja),
   `spousalObjectionRegistered` (ja/nein, bei ja), `spousalObjectionRegisterNumber` (Text, sensibel, bei eingetragen).
2. **Immer sichtbar**, unabhängig vom Familienstand; der Hilfetext sagt, für wen es gilt.
3. **Bürgertext in Worten.** Die Beschriftung sagt „Notvertretung durch Ehegatten in Gesundheitsfragen"; die Norm steht
   nur in der Fundstelle des Hilfetexts. Kein Rechtsrat.
4. **Notfallkarte nur bei „ja".** Ein „nein" ist keine Auskunft, die im Ernstfall etwas ändert. Die Eintragung erscheint
   nur zusammen mit der Ablehnung; die Eintragungsnummer nie.
5. **Auch in der Angehörigen-Sicht** (Blatt Krankenhaus): Ablehnung, Datum, Eintragung — die sensible Nummer nicht.
6. **In jedem Depot gleich** (U2-ADR-432): Anker und Sub-Depot tragen dieselben Felder, kein eigener Weg.
7. **Nicht** auf dem PDF der Vorsorgevollmacht: das ist ein anderes Dokument.

Die Vertretungsseite (Ablauf der sechs Monate am Datum der ärztlichen Feststellung) bleibt unverändert.

```yaml
konformitaet:
  - aussage: >-
      Die vier Felder überleben Speichern und Laden; eine Anfrage findet sie, die Eintragungsnummer ist sensibel.
    zustand: erfuellt
    herkunft: Entscheidung vom 25.09.2026
    pruefung:
      - tests/ehegatten-notvertretung.test.js
        "[Notvertretung] die vier Felder überleben Speichern und Laden"
      - tests/ehegatten-notvertretung.test.js
        "[Notvertretung·Anfrage] eine Anfrage nennt die Kennungen und findet sie; die Eintragungsnummer ist sensibel"
  - aussage: >-
      Die Notfallkarte zeigt die Ablehnung und ihre Eintragung genau bei „ja", nie die Nummer.
    zustand: erfuellt
    herkunft: Entscheidung vom 25.09.2026
    pruefung:
      - tests/ehegatten-notvertretung.test.js
        "[Notvertretung·Notfallkarte] die Karte zeigt die Ablehnung und die Eintragung genau bei „ja", nie die Nummer"
  - aussage: >-
      Die Angehörigen-Sicht (Blatt Krankenhaus) trägt die Ablehnung, die Nummer nicht; jedes Depot gleich.
    zustand: erfuellt
    herkunft: Entscheidung vom 25.09.2026; U2-ADR-432
    pruefung:
      - tests/ehegatten-notvertretung.test.js
        "[Notvertretung·Angehörige] das Blatt Krankenhaus trägt die Ablehnung, die Angehörigen-Sicht auch — die Nummer nicht"
      - tests/ehegatten-notvertretung.test.js
        "[Notvertretung·jedes Depot gleich] in einem eingehängten Sub-Depot gelten dieselben Felder, dieselbe Karte — kein Sonderweg (U2-ADR-432)"
```
