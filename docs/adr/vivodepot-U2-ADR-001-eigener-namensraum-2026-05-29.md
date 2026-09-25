# U2-ADR-001: Eigener ADR-Namensraum für die Umbau2-Linie

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** METHODIK, DOKUMENTATION
**Status heute:** gilt — Namensraum aktiv in Nutzung, 144 Dateien unter `docs/adr/` mit `U2-ADR-NNN`-Präfix in monotoner Folge ohne v-Suffixe. **Nachtrag 15.08.2026:** der in Konsequenz 1 genannte „zweite, kleine INDEX" (`U2-INDEX`) ist aufgegeben — zugunsten der erzeugten `docs/adr/README.md` (Produktentscheidung: „EINE Datei, und die muss stimmen"). Die Datei selbst ist aus `docs/adr/` entfernt, liegt als Zeitzeuge außerhalb des Repos. Diese ADR bleibt sonst unverändert gültig — nur der Weg zur Übersicht hat sich geändert, nicht die Namensraum-/Versionierungs-Entscheidung selbst.

---

## Kontext

Mit der Umbau2-Linie (U2) existieren zwei Entscheidungsräume nebeneinander: die Produktiv-Linie und die parallele Neuimplementation U2. Beide divergieren bereits real auf der Datenebene — das Krypto-Fundament ist der erste Beleg: Produktiv trägt den Depot-Umschlag aus `ADR-068 v2` samt Versions-Allowlist und Migrationskette, U2 trägt den schlanken HKDF-Umschlag ohne diese Schichten (siehe U2-ADR-002).

Eine gemeinsam fortgeführte ADR-Nummernfolge würde dieselbe Nummer in den beiden Linien teils Widersprüchliches beschreiben lassen — genau die Verwechslung ähnlich klingender Titel, gegen die der Produktiv-INDEX gebaut wurde, nur diesmal über zwei Codebasen hinweg. Die Produktiv-Linie hat zudem bereits bestehende Nummerierungs-Drift, die bewusst nicht aufgelöst wurde; ein zweiter Strom in denselben Namensraum würde diese Reibung vervielfachen.

## Entscheidung

Die U2-Linie führt einen eigenen ADR-Namensraum mit Präfix `U2-`. Eigene, bei `U2-ADR-001` beginnende monotone Nummernfolge. Nacktes `ADR-NNN` bleibt dem Produktiv-Kanon vorbehalten.

Versionierung in der U2-Linie ohne `v`-Suffixe: Eine iterierte Entscheidung bekommt eine neue Nummer mit Vorgänger-/Nachfolger-Verweis, statt eine Nummer doppelt zu belegen.

## Begründung

Die Herkunft steht im Bezeichner selbst — Kollision ist strukturell unmöglich, Cross-Referenzen werden ohne Übersetzung eindeutig. Eine bloße Bereichs-Partitionierung (etwa „U2 ab 500") wäre brüchig: Sie rät die benötigte Nummernmenge je Linie und stellt bei falschem Tipp die Kollision wieder her, ohne Herkunft im Bezeichner zu tragen.

Vor allem hält die Trennung beide Zukünfte offen: U2 ist heute Kandidatin, nicht beschlossene Ablösung. Scheitert U2, hat es die Produktiv-Nummerierung nie berührt. Gewinnt es und ersetzt die Produktiv-App, ist die Zusammenführung der Namensräume ein bewusster späterer Schritt — statt einer heute durch geteilten Namensraum stillschweigend vorweggenommenen Entscheidung.

## Konsequenzen

- Ein zweiter, kleiner INDEX (`U2-INDEX`) wird geführt.
- Cross-Referenzen erfordern Disziplin: Produktiv = nacktes `ADR-NNN`, U2 = `U2-ADR-NNN`.
- Token-Wahl `U2`: knapp und im Repo-Kontext sofort lesbar. Außerhalb des Projekts (Veröffentlichung, Promotionskontext) ohne Erklärung zunächst stumm — bewusst in Kauf genommen für ein internes Arbeitsvokabular.

## Folge

U2-ADR-002 (HKDF-Anker) ist die erste fachliche Entscheidung unter diesem Namensraum; sie war bewusst ohne Nummer entworfen und wird mit dieser Trennung verortet.
