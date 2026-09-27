# U2-ADR-005: Urheberschaft pro Eintrag (Vollmachts-Kette)

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** ARCHITEKTUR, DATENMODELL, DSGVO
**Cross-Referenz (Produktiv-Kanon):** `ADR-062` (Provenance pro Datensatz, `eingabeDurch`/`datum`/`vollmachtsGrundlage`), `ADR-063` (FHIR-Provenance-Mapping beim IPS-Export), `ADR-064` (Beziehungs-Codierung).
**U2-Bezug:** U2-ADR-003 (Sub-Depot/Übergabe-Linie).
**Status heute:** gilt — Provenienz-Struktur (`akteur`/`eigenschaft`/`zeitpunkt` pro Eintrag) im Kern
nachweisbar (`vivodepot.html:9256` u. a.), `eingabeArt`/`quelle`-Stempel produktiv im Einsatz.

---

## Kontext

In einer Vollmachts-Kette wechselt die handelnde Person über die Zeit. Beispiel: B legt sein Depot als gesundes Ankerdepot selbst an; A verwaltet es später unter Vollmacht; nach A's Tod übernimmt D unter Vollmacht. Jeder Eintrag muss erkennen lassen, wer ihn vorgenommen hat und in welcher Eigenschaft — sonst verliert die Kette ihren Beweiswert.

## Entscheidung

**Provenance pro Datensatz als anhängende, unveränderliche Liste** — geerbt aus `ADR-062`. Einträge werden angehängt, nie überschrieben; D kann nicht tilgen, dass A einen Eintrag verfasst hat.

Jeder Eintrag trägt:
- **Akteur** — Verweis auf eine **konkrete Person** (aus dem zentralen Personenspeicher), nicht nur eine Rolle. Das ist die U2-Verfeinerung gegenüber dem Produktiv-`eingabeDurch`, das nur `anker`/Eigentümer kannte: Weil die verwaltende Rolle über die Zeit den Inhaber wechselt (A → D), muss der Stempel die Person benennen.
- **Eigenschaft** — selbst (eigenes Ankerdepot, wie B zu Beginn) oder unter Vollmacht (mit Vollmachts-Grundlage analog `ADR-062` `vollmachtsGrundlage`).
- **Zeitpunkt** — ISO-8601.

**Beweiskraft, Baseline:** Der Akteur erklärt sich zu Sitzungsbeginn selbst — wer ein leeres Depot befüllt, trägt sich als handelnde Person ein. Credential über ID-Import ist möglich, aber kein Muss. Die kryptografisch gebundene Form (VC/SD-JWT über die Trust Authority) ist eine spätere Schicht, nicht die Eintrittshürde. Das hält die Eintrittsschwelle niedrig.

**FHIR-Naht:** Diese allgemeine Urheberschaft speist beim Gesundheits-Export die FHIR-Provenance nach `ADR-063` (`agent.who` = RelatedPerson, `recorded` = Zeitpunkt, `policy` = Vollmachts-Grundlage) — sie läuft nicht doppelt daneben.

## Konsequenzen

- Die Kette ist nachvollziehbar: Bei jedem Eintrag steht, ob er von B selbst, von A oder von D stammt.
- Unveränderlichkeit sichert den Beweiswert über Verwalter-Wechsel hinweg.
- **Zeitpunkt:** Die Urheberschafts-Dimension gehört ins Datenmodell, **bevor** die Sektoren sich füllen — als eigener Strang neben der Übergabe-Linie. Ein Nachrüsten später hätte den Sweep-über-viele-Stellen-Aufwand, den die Produktiv-Schema-Bumps hatten. Blockiert die Übergabe-Schritte nicht.
- Selbst-erklärte Akteurs-Angabe ist zunächst nicht kryptografisch bewiesen — bewusst in Kauf genommen zugunsten der Niedrigschwelligkeit; die VC-Bindung adressiert das als spätere Schicht.

## Grenze (keine technische Frage)

Ob ein Bevollmächtigter bestimmte höchstpersönliche Einträge überhaupt verfassen darf — eine Patientenverfügung etwa ist höchstpersönlich —, ist eine Rechtsfrage. Die Urheberschafts-Mechanik macht solche Fälle nur sichtbar; ob das Produkt sie verhindern oder kennzeichnen soll, ist offen und gehört in die rechtliche Beratung, nicht in diese ADR.

## Offene Folge

Ein Auftrag für die Datenmodell-Verankerung folgt, vor dem Sektor-Ausbau. Implementations-Verweis wird nach Umsetzung ergänzt.
