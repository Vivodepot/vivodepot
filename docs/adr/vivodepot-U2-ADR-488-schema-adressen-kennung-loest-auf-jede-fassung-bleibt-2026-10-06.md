# U2-ADR-488: Schema-Adressen — die Kennung löst auf, jede Fassung bleibt

**Status:** Angenommen (06.10.2026) — gebaut
**Datum:** 06.10.2026
**Kategorie:** SCHNITTSTELLEN, MODULE, AUSLIEFERUNG
**Linie:** U2
**Bezug:** U2-ADR-362 (die `$id`-Adressen sind Kennungen der Daten, `tools/marken-adressen-pruefen.js`) · U2-ADR-409
(Einreichung, `submission-schema.json`) · die Auslieferung des Registers
**Status heute:** gilt — Belege im `konformitaet`-Block unten.

## Frage

Die Schemas der Module und des Vorlagen-Werkzeugs tragen `$id`-Adressen unter `https://vivodepot.de/schemas/`. Wer ein
Modul baut oder eine Einreichung prüft, ruft diese Adresse auf und bekam 404. Ein Schema ändert sich mit der Zeit; ein
Modul, das unter einer älteren Fassung entstanden ist, braucht deren Wortlaut auch später noch.

## Entscheidung

1. **Die `$id` bleibt unverändert.** Sie ist die Kennung der Daten; umbenannt wird nichts. Unter ihr liegt immer die
   geltende Fassung, byte-gleich mit dem Schema im Repository.
2. **Jede Fassung hat eine eigene, unveränderliche Adresse** `https://vivodepot.de/schemas/<name>/<n>.json`, `<n>` ab 1.
   Die Datei dort trägt dieselben Bytes wie die Fassung `<n>`, nur mit der eigenen Adresse als `$id`: nach JSON Schema
   2020-12 Core § 9.1.2 identifiziert eine URI genau ein Schema.
3. **Die Fassung steht nicht im Schema**, sondern im Verzeichnis `docs/schema-fassungen.json`: je Schema und Fassung der
   git-Blob der kanonischen Bytes und zwei Prüfsummen (kanonisch und ausgeliefert). Ein Annotationsfeld im Schema
   (`x-…`) bricht Ajv 2020 schon in der Standard-Einstellung („strict mode: unknown keyword“), die eigenen Proben und jeden
   Integrator, der Ajv nimmt.
4. **Jede Byte-Änderung eines Schemas ist eine neue Fassung.** Die Regel urteilt nicht über „kompatibel“; sie ist
   mechanisch prüfbar. `tools/schema-fassungen.js --eintragen` hängt die Fassung an. Das Verzeichnis wird nur angehängt.
5. **Ausgeliefert wird `schemas/`** (`tools/schema-fassungen.js --ordner <dir>`) über die Website-Auslieferung, wie das
   Register: die geltende Fassung unter der `$id`, jede Fassung unter ihrer Adresse und eine Übersicht index.json im selben Ordner mit Name,
   Fassung, Adresse und Prüfsumme. Alte Fassungen bleiben auf dem Webspace; sie gelten für bestehende Module weiter.
6. **Erste Fassung** aller 20 Schemas ist `1`, der heutige Inhalt (mit dem Feldregister).

## Abgrenzung

- Ob ein Modul unter einer neueren Fassung noch gilt, entscheidet diese ADR nicht; sie macht nur jede Fassung abrufbar.
- Eingebettete Kopien (Studio, VC-Issuer) tragen weiter die bisherige `$id` der geltenden Fassung.

```yaml
konformitaet:
  - aussage: >-
      Jedes Schema mit $id unter vivodepot.de/schemas ist im Verzeichnis eingetragen; eine Byte-Änderung ohne neue Fassung
      und ein neues Schema ohne Eintrag sind rot; das Verzeichnis wird nur angehängt.
    zustand: erfuellt
    herkunft: U2-ADR-488 (06.10.2026)
    pruefung:
      - tests/schema-fassungen.test.js "[Schema-Fassungen] jedes Schema mit $id unter vivodepot.de/schemas ist verzeichnet, jede Fassung wiederherstellbar"
      - tests/schema-fassungen.test.js "[Schema-Fassungen·Rot-Beweis] eine Byte-Änderung ohne neue Fassung ist rot"
      - tests/schema-fassungen.test.js "[Schema-Fassungen·nur anhängen·Rot-Beweis] ein geänderter oder gelöschter alter Eintrag ist rot"
  - aussage: >-
      Die ausgelieferte Fassung weicht vom Kanon nur im $id ab; die geltende Fassung ist byte-gleich mit dem Repository.
    zustand: erfuellt
    herkunft: U2-ADR-488 (06.10.2026)
    pruefung:
      - tests/schema-fassungen.test.js "[Schema-Fassungen] die ausgelieferte Fassung weicht vom Kanon nur im $id ab, mit eigener Adresse"
  - aussage: >-
      Jede ausgelieferte Fassung übersetzt mit Ajv 2020 im Strict-Modus; ein unbekanntes Schlüsselwort bricht.
    zustand: erfuellt
    herkunft: U2-ADR-488 (06.10.2026)
    pruefung:
      - tests/mit-modul/schema-fassungen-ajv.test.js "[Schema-Fassungen·Ajv strict] jede ausgelieferte Datei übersetzt mit Ajv 2020, strict"
  - aussage: >-
      Jede Adresse liefert live 200 und die verzeichnete Prüfsumme.
    zustand: offen
    herkunft: U2-ADR-488 (06.10.2026)
    frist: 2026-11-06
    bedingung: >-
      Der Ordner schemas/ ist über die Website-Auslieferung hochgeladen und `node tools/schema-fassungen.js --live-pruefen`
      ist grün. Bis dahin steht der Befund SCHEMA-ID-NICHT-AUFLOESBAR in der Befund-Ratsche offen.
```
