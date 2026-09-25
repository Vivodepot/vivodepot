# U2-ADR-424: Private Sachversicherungen strukturiert, Basiskonto und P-Konto als Kontomerkmal

**Status:** entschieden, gelandet.
**Status heute:** gilt
**Datum:** 19.09.2026
**Bezug:** U2-ADR-126 (Sensibel-Default), U2-ADR-399 (Vorschläge-Trägerkette)
**Betrifft:** `tools/bereich-templates/vivodepot-finance.json`, `tests/fixtures/buergermodul-situationen-ab-werk.json` (die Ab-Werk-Situationen), `depotNormalisieren` (Schema 84→85), Textsatz DE/EN

## Befund

Zwei kleine Lücken in Finanzen: (1) Haftpflicht-, Hausrat- und Rechtsschutzversicherung stehen nur als Freitext-Vorschlag in der Situation „Volljährigkeit" (`vj_versicherungen`, ein einzelnes Textfeld) — kein strukturiertes Feld wie bei der Altersvorsorge. (2) Ein Basiskonto (§ 33 ZKG) oder ein Pfändungsschutzkonto (P-Konto) lässt sich an keiner Konto-Zeile eintragen.

## Entscheidung

1. **Neues Listenfeld `finance.privateInsurancePolicies`** (Sektion „konten-steuern-vorsorge", Feldgruppe „Versicherungen"), Unterfelder: `insuranceType` (Text mit Vorschlägen, dieselben sechs wie zuvor am Freitext), `insurer` (Verweis Institution), `insurancePolicyNumber` (sensibel), `insuranceContactPerson`, `insuranceTerminationMethod`, `note`.
2. **`finance.accounts` bekommt zwei Ergänzungen:** `accountType` trägt „Basiskonto" zusätzlich als Vorschlag (bleibt Freitext, keine Grenze); ein neues Unterfeld `garnishmentProtection` (Auswahl ja/nein, wie die übrigen ja/nein-Merkmale im Katalog) markiert ein P-Konto.
3. **Der Freitext verschwindet aus der Situation.** Das Feld `vj_versicherungen` wird aus dem Ab-Werk-Situationsmodul „Volljährigkeit" entfernt — es ist danach nicht mehr Teil des Eingabeflusses, keine zweite Stelle mehr, an der dieselbe Angabe gepflegt werden könnte.
4. **Migration, additiv (Schema 84→85).** Ein vorhandener Freitext wandert einmalig als EIN Eintrag (Feld `note`) in `finance.privateInsurancePolicies`. Der alte Rohwert bleibt im Depot stehen (Verwaisungsregel wie bei den KARTEILEICHEN-Feldern der Lese-App) — kein Datenverlust, aber auch keine doppelte Pflege, weil kein Weg ihn mehr liest oder zeigt.
5. **Keine eigene Schemastufe für die additiven Teile.** Neue leere Felder (das Listenfeld selbst, `garnishmentProtection`, der Vorschlag „Basiskonto") brauchen keinen Versionssprung — ein Alt-Depot hat sie einfach nicht gesetzt. Die Schemastufe 84→85 gilt ausschließlich der Migration des vorhandenen Freitexts.
6. **Die Migration hängt nicht allein am Versions-Gate.** Ein Inhalts-Check (derselbe Notiztext gilt als schon migriert) hält sie idempotent, unabhängig von einer möglichen doppelten Ausführung.

## Was diese Entscheidung nicht leistet

Keine Dokumentgenerator-Integration (Versicherungen erscheinen in keinem PDF-Auszug). Keine Prüfung, ob die drei genannten Sparten (Haftpflicht/Hausrat/Rechtsschutz) tatsächlich eingetragen sind — das Feld ist eine Liste, keine Pflicht.

## Offen

- Ob `insurancePolicyNumber` als sensibel richtig eingestuft ist (Analogie zu `policyContractNumber`/`companyPensionPolicyNumber`) und ob `garnishmentProtection` ebenfalls sensibel sein sollte (Lebenslage Verschuldung) — hier bewusst NICHT sensibel gesetzt, analog `accountType`.

```yaml
konformitaet:
  - aussage: >-
      finance.accounts trägt ein Merkmal für ein Pfändungsschutzkonto (P-Konto), und „Basiskonto"
      ist als Vorschlag für die Kontoart eingetragen; beides in Kern und Lese-App gleich.
    zustand: erfuellt
    herkunft: U2-ADR-424 (19.09.2026)
    pruefung:
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·P-Konto] accountType trägt „Basiskonto“ als Vorschlag, garnishmentProtection ist ja/nein"
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·P-Konto] Kern und Lese-App zeigen dieselbe Zusammenfassung, mit Feldbezeichnung vor ja/nein"

  - aussage: >-
      Private Sachversicherungen (Haftpflicht, Hausrat, Rechtsschutz und weitere) stehen als
      strukturierte Liste in finance.privateInsurancePolicies, nicht mehr nur als Situations-Freitext.
    zustand: erfuellt
    herkunft: U2-ADR-424 (19.09.2026)
    pruefung:
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·Versicherungen] das neue Feld trägt die sechs Unterfelder mit deutschem Text"
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·Versicherungen] der alte Freitext ist aus der Situation „Volljährigkeit“ entfernt, die übrigen Felder bleiben"

  - aussage: >-
      Ein vorhandener Freitext aus der Situation „Volljährigkeit" wandert beim Normalisieren einmalig
      in das neue Listenfeld; der alte Rohwert bleibt erhalten, eine zweite Migration bleibt aus.
    zustand: erfuellt
    herkunft: U2-ADR-424 (19.09.2026)
    pruefung:
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·Migration] ein vorhandener Freitext wandert nach privateInsurancePolicies, der Rohwert bleibt stehen"
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·Migration] ohne alten Freitext bleibt die Liste leer, die Schemastufe steigt trotzdem"
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·Migration·Rot-Beweis] ein Depot, das die Stufe schon hinter sich hat, migriert kein zweites Mal"
      - tests/finanzen-versicherungen-und-p-konto.test.js
        "[Finanzen·Migration·Rot-Beweis] die Migration ist inhaltlich idempotent, unabhängig von der Versionsnummer der Stufe"
```
