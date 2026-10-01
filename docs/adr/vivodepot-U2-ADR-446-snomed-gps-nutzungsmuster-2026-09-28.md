# U2-ADR-446: SNOMED GPS — Nutzungsmuster statt ID-Freigabe

**Status:** Angenommen (28.09.2026)
**Datum:** 28.09.2026
**Kategorie:** STANDARDS, LIZENZ, GESUNDHEIT
**Linie:** U2
**Bezug:** U2-ADR-029 (selbst Erfasstes wird nicht laienhaft kodiert) · Standards-Register (`docs/standards-schnittstelle.md`)
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Ausgangslage

Vivodepot kodiert eine kleine Zahl von Allergie- und Befundbegriffen mit SNOMED CT, aus dem **Global Patient Set (GPS)**,
das SNOMED International unter Creative Commons BY-ND 4.0 veröffentlicht. Bisher stand jede genutzte Kennung einzeln auf einer
Freigabeliste (`tools/snomed-freigabe.json`), freigegeben von SNOMED International im Ticket #61950 vom 26.09.2026. Vor
jeder Ausweitung, auch für weitere Konzepte, sollte gefragt werden. Das galt ebenso für die weiteren Konzepte, die Pro
nutzen würde.

## Entscheidung

1. **Maßgeblich ist das Nutzungsmuster, nicht die einzelne Kennung.** SNOMED International hat im selben Ticket am
   28.09.2026 geantwortet: „every active SNOMED CT concept is in the GPS by definition, so you don't need to check
   identifiers with us going forward“. Es gilt, solange die Nutzung dem Muster folgt: unveränderter Begriff, keine
   Hierarchie, keine Beziehungen, keine Subsumption, kein ECL („unmodified term, no hierarchy, relationships,
   subsumption or ECL“).
2. **Die Liste bleibt, ihre Bedeutung wechselt.** `tools/snomed-freigabe.json` führt die genutzten Kennungen weiter.
   Eine steht dort, weil sie im **gepinnten GPS-Release** aktiv ist und ihr Begriff wörtlich aus dem Release stammt,
   nicht mehr, weil sie einzeln genehmigt wurde. Der Release ist `SnomedINTL_GPSRelease_PRODUCTION_20260101T120000Z.zip`,
   gepinnt mit Name und SHA-256 in `tools/standards-artefakte.json`. Er kommt nicht ins Repo (Creative Commons BY-ND, keine
   Weitergabe). Geprüft wird mit `node tools/snomed-gps-abgleich.js --gps <zip>`, die Suite läuft gegen eine Fixture.
3. **Der Begriff ist wörtlich FSN oder US Preferred Term.** Eine deutsche Bezeichnung steht in `text` oder in einer
   lokalen Codierung, nie als `coding.display` der SNOMED-Codierung.
4. **Keine Hierarchie, keine Beziehungen, keine Subsumption, kein ECL im Code.** Ein Musterwächter erkennt die
   Terminologie-Operationen, die ECL-Operatoren vor einer Konzept-ID, memberOf, is-a/subsumes und die IS-A-Kennung.
5. **Die Namensnennung bleibt Pflicht** (NOTICE.md, THIRD_PARTY_LICENSES).
6. **Pro-„additional concepts“:** Für Konzepte, die dem Muster folgen, ist die Frage mit der Antwort vom 28.09.2026
   erledigt. Wer vom Muster abweicht, fragt wieder.

**Folge am 28.09.2026:** Die zwei angefragten Konzepte Peanut (762952008) und Tree nut (442571000124108) sind aktiv im
GPS 20260101 und stehen jetzt unter den genutzten. Die interne Liste der angefragten Kennungen ist leer.

Die Anzeige (display nur der unveränderte Begriff) und die Namensnennung hält die Suite zusätzlich mit ihren SNOMED-Proben.

```yaml
konformitaet:
  - aussage: >-
      Jede genutzte SNOMED-Kennung ist im gepinnten GPS-Release aktiv, und ihr Begriff ist wörtlich der US Preferred Term.
    zustand: erfuellt
    herkunft: SNOMED International, Ticket #61950 (26. und 28.09.2026)
    pruefung:
      - tests/snomed-gps-abgleich.test.js
        "[SNOMED·GPS-Abgleich·Rot-Beweis] inaktiv, fehlend, anderer Begriff, ohne gps-Feld — und unlesbar endet mit 2"
      - tests/snomed-nutzungsmuster.test.js
        "[SNOMED·Muster] jede genutzte Kennung nennt genau den gepinnten GPS-Release und ist dort aktiv"
  - aussage: >-
      Im Code werden weder Hierarchie noch Beziehungen, Subsumption oder ECL ausgewertet.
    zustand: erfuellt
    herkunft: SNOMED International, Ticket #61950 (28.09.2026)
    pruefung:
      - tests/snomed-nutzungsmuster.test.js
        "[SNOMED·Muster] im Code keine Hierarchie, keine Beziehungen, keine Subsumption, kein ECL"
      - tests/snomed-nutzungsmuster.test.js
        "[SNOMED·Muster·Rot-Beweis] ECL-Operatoren, memberOf, is-a, subsumes und die IS-A-Kennung fallen; gewöhnlicher Code nicht"
```
