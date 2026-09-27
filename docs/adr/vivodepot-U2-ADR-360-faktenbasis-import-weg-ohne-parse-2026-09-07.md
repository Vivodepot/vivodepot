# U2-ADR-360: `faktenbasis-erzeugen.js` erkennt Import-Wege auch ohne `parse`

**Status:** gilt.
**Status heute:** gilt. Fund beim Poster-Bau, hier behoben und mit Rot-Beweis
belegt.
**Betrifft:** `tools/faktenbasis-erzeugen.js`, `tests/faktenbasis-erzeugen.test.js`.

---

## Der Befund

`docs/faktenbasis.md` beschrieb zwei registrierte Import-Formate als Löcher:

- `fhir-lab`: „(kein Import-Pfad — Funktion liefert stets null)"
- `provider-credential`: „(kein Parser hinterlegt)"

Beide Sätze beschreiben `parse`. Die tatsächliche FÄHIGKEIT beschreiben sie nicht:

- `fhir-lab` trägt `autoritativDoc: true`. `parse` liefert bewusst `() => null` — reine
  Absicherung, falls die Funktion je regulär aufgerufen würde. Der eigentliche Import läuft
  über den Ablage-Zweig `flowImportAutoritativ` (zwei Aufrufer im Kern), ausgelöst durch
  `def.autoritativDoc` selbst. Der Import legt ab, statt Felder zu ziehen — er FINDET
  trotzdem statt. Eigene Wächter: `tests/autoritativ-import.test.js`,
  `tests/import-ambiguitaet.test.js`.
- `provider-credential` trägt `fachpfad: true`, `signiert: true` und **gar kein `parse`-Feld**
  — stattdessen `felderAusClaims`, eine eigene Funktion mit demselben Zweck (geprüfte
  Nutzlast auf Felder abbilden), real aufgerufen im Kern (`def.felderAusClaims(nutzlast)`).

`importErzeugerName` mißt ausschließlich an `parse` entlang. Für beide Formate ist das nicht
nur ungenau, sondern irreführend — es liest sich als „gibt es nicht". Ein Poster-Bau auf
Basis der Faktenbasis hätte beinahe eine echte, gebaute Fähigkeit als fehlend dargestellt.

## Die Reparatur

Neue Funktion `importWegBeschreiben(def)`, VOR der bisherigen `importErzeugerName(def.parse)`-
Prüfung geschaltet, mit dem GANZEN `def`, nicht nur `def.parse`:

1. Trägt `def.felderAusClaims` als Funktion → beschreibt den Fachpfad, nicht „kein Parser".
2. Trägt `def.autoritativDoc` UND `parse` ist wörtlich `() => null` → beschreibt den
   Ablage-Zweig `flowImportAutoritativ`, nicht „kein Import-Pfad".
3. Sonst: unverändertes Verhalten über `importErzeugerName` (eigener, geprüfter
   Ein-Funktions-Kontrakt, unangetastet — bestehende Tests bleiben gültig).

**Systematisch geprüft, nicht nur der eine gemeldete Fall:** alle 17 `IMPORT_FORMATE`-Einträge
gegen alle Sonderfelder (`autoritativDoc`, `fachpfad`, `felderAusClaims`, `signiert`,
`nurImport`) durchgezählt. Genau zwei Einträge (`fhir-lab`, `provider-credential`) sind von
diesem Fehler betroffen — `vivodepot-beta` trägt zwar auch `fachpfad: true`, hat aber einen
regulären `parse`, der bereits korrekt erkannt wird.

```yaml
konformitaet:
  - aussage: >-
      Ein Import-Eintrag mit autoritativDoc:true und parse:()=>null wird als Ablage-Weg
      (flowImportAutoritativ) ausgewiesen, nicht als "kein Import-Pfad".
    zustand: erfuellt
    herkunft: U2-ADR-360 (07.09.2026)
    pruefung:
      - tests/faktenbasis-erzeugen.test.js
        "[Rot-Beweis] autoritativDoc: true mit parse: () => null wird als Ablage-Weg ausgewiesen, nicht als Loch"

  - aussage: >-
      Ein Import-Eintrag mit felderAusClaims und ohne parse-Feld wird als eigener Import-Weg
      ausgewiesen, nicht als "kein Parser hinterlegt".
    zustand: erfuellt
    herkunft: U2-ADR-360 (07.09.2026)
    pruefung:
      - tests/faktenbasis-erzeugen.test.js
        "[Rot-Beweis] felderAusClaims OHNE parse-Feld wird als eigener Import-Weg ausgewiesen, nicht als \"kein Parser\""

  - aussage: >-
      Beide realen Formate im Kern (fhir-lab, provider-credential) werden nach der Reparatur
      korrekt erkannt.
    zustand: erfuellt
    herkunft: U2-ADR-360 (07.09.2026)
    pruefung:
      - tests/faktenbasis-erzeugen.test.js
        "[Positivkontrolle·echter Bestand] fhir-lab und provider-credential werden im echten Kern korrekt als Import-Wege erkannt"

  - aussage: >-
      Ein Import-Eintrag mit einem echten "() => null"-Parser OHNE autoritativDoc bleibt
      weiterhin ehrlich als Loch ausgewiesen — nicht jeder Null-Parser bekommt einen
      Ersatzweg erfunden.
    zustand: erfuellt
    herkunft: U2-ADR-360 (07.09.2026)
    pruefung:
      - tests/faktenbasis-erzeugen.test.js
        "[Gegenprobe] ein Eintrag ohne autoritativDoc/felderAusClaims verhält sich wie bisher (importErzeugerName unverändert)"
```
