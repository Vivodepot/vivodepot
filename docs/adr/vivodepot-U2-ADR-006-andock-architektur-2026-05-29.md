# U2-ADR-006: Andock-Architektur — Übergabe rein und raus

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** ARCHITEKTUR, GESCHÄFTSMODELL
**Cross-Referenz (Produktiv-Kanon):** `ADR-065` (Template-Übergabe-Mechanismus, JWS-signiert, Trust Authority — Klärungen 2–8 geklärt), `ADR-063` (FHIR-Provenance), `ADR-002` (FHIR R4).
**U2-Bezug:** U2-ADR-005 (Urheberschaft). Erster Andockfall: Gesundheits-Sektor.
**Status heute:** gilt — Andock-Architektur im Kern nachweisbar: `codeSlotSicherstellen()` (Kommentar „U2-ADR-006: leerer Code-Slot"), Template-Schicht unter `docs/template-generator/`, FHIR-IPS-Bundle-Export vorhanden. Abschnitt „Geschäftsmodell“ überholt, s. Nachtrag 03.10.2026.

---

## Kontext

Umbau 1 musste das Modulare nachträglich in einen gewachsenen Monolithen hineinarbeiten. Die U2-Linie legt die Andockbarkeit von Anfang an als tragendes Prinzip an — das ist der eigentliche Grund des Neubaus. Diese ADR hält das Prinzip fest, damit jeder Sektor demselben Muster folgt.

Der Auslöser war die Codierungs-Frage im Gesundheits-Sektor: FHIR verlangt hinter einem Befund einen Code (SNOMED/LOINC), aber der Bürger kann nicht selbst codieren (Niedrigschwelligkeit). Die Lösung — Code-Tabellen als Template danebenlegen statt in den Kern packen — verallgemeinert sich: Jeder Sektor hat sein „rein und raus"-Standardformat, und die Tabellen dazu kommen als Auflage.

## Entscheidung

**Drei Schichten:**

1. **Sektor (Kern):** hält die Daten schlank und intern. Pro Eintrag ein **optionaler Code-Slot**, der leer bleibt, solange kein Template ihn füllt.
2. **Übersetzungs-Schicht:** bildet bidirektional zwischen der internen Form und dem Sektor-Standardformat ab — Import und Export. Pro Sektor das jeweilige Format: Medizin → FHIR, Identität → SD-JWT-VC, Bildung → EDCI, Sozialversicherung/Vorsorge → W3C-VC, Verwaltung → XOEV.
3. **Template:** liefert die sektor-spezifischen Tabellen und Codes, die die Übersetzung braucht. Vivodepot zertifiziert die Templates als Trust Authority.

**Der Kern kennt nur die Andock-Punkte** — die Formate und Tabellen kommen als zertifizierte Auflage dazu, nicht eingebacken. Das hielt die Produktiv-Datei klein, wo die IPS-Maschinerie sie groß machte.

**Ohne Template** trägt ein Sektor Freitext mit „uncodiert"-Vermerk (FHIR-konform: `CodeableConcept` darf nur Text tragen). **Mit Template** codiert er. Damit ist die Lizenzfrage (z. B. SNOMED CT, lizenzpflichtig) eine **Bestückungs-Frage**, keine Fundament-Frage: Das Template wird mitgeliefert oder nicht; die Architektur bleibt gleich.

## Geschäftsmodell

Die Template-Zertifizierungsstelle ist kein Anhängsel, sondern der Punkt, an dem aus dem kostenlosen Bürger-Werkzeug die institutionelle Einnahmequelle wird. Eine Klinik liefert ein FHIR-Medizin-Template, eine Kasse ein Sozialversicherungs-Template, ein Finanzinstitut sein eigenes — Vivodepot zertifiziert. Ein Mechanismus, viele Bereiche (Energiegenossenschaften, Behörden, Stiftungen). Die kommerzielle Template-Ebene und die Zertifizierungsgebühren liegen in der BUSL-Schicht.

## Konsequenzen

- **Kern bleibt niedrigschwellig und klein;** Codierung und Formate sind andockbare Schichten.
- **Pro Sektor mitwachsen, nicht in einem Wurf.** Die vollständige Import-Export-Schicht über alle Sektoren ist eines der dicksten Module — dicker als die Übergabe. Sie wird beim Ausbau jedes Sektors um dessen Andockpunkt erweitert. Medizin zuerst.
- **Jeder Sektor folgt diesem Muster.** Der Gesundheits-Sektor ist der erste Andockfall und setzt das Muster; alle weiteren folgen ihm.
- **Urheberschaft (U2-ADR-005) speist die Übersetzung:** beim Medizin-Export die FHIR-Provenance (`ADR-063`).

## Offene Voraussetzung (nicht in dieser ADR gelöst)

Ob die U2-Linie bereits einen Template-Mechanismus hat, ist am Code zu prüfen, bevor die Übersetzungs-Schicht über das erste Beispiel hinaus gebaut wird. In der Produktiv-Linie ist der Mechanismus `ADR-065` (JWS-signiert, Verifiable Credentials, Trust Authority) — geklärt, aber in U2 noch nicht zwingend vorhanden. Die Zertifizierungsstelle als Trust Authority ist ein eigener, gewichtiger Baustein, kein Nebenprodukt eines Sektor-Ausbaus.

## Grenze (Rechts-/Geschäftssphäre, nicht technisch)

Template-Zertifizierungsgebühren, BUSL-Schicht für die kommerzielle Template-Ebene, SNOMED-CT-Lizenz — offene Punkte für die rechtliche und geschäftliche Klärung, nicht für diese ADR.

## Erster Andockfall

Der Gesundheits-Sektor wird jetzt schlank gebaut: Speicher- und Anzeige-Schicht, optionaler Code-Slot pro Eintrag (vorerst leer), FHIR-Korrespondenz pro Feldgruppe als Anschluss-Notiz — ohne IPS-/FHIR-Maschinerie im Kern. Der Code-Slot und die Anschluss-Notiz sind die Vorkehrung, die diese Architektur einlöst, ohne den Template-Mechanismus vorauszusetzen.

## Nachtrag 03.10.2026 — Geschäftsmodell und Lizenz überholt

Der Abschnitt „Geschäftsmodell“ und die in „Grenze“ genannten Zertifizierungsgebühren und die
BUSL-Schicht gelten nicht mehr (s. U2-ADR-270). Die Lizenz ist die EUPL-1.2, maßgeblich ist
[LICENSING.md](../../LICENSING.md).

Zum Begriff „zertifiziert“ gilt U2-ADR-097 §8.

Korrigiert am 04.10.2026: In der Cross-Referenz ist der Verweis auf „ADR-076 v2“ gestrichen, eine solche ADR gibt es
nicht. Im Status-Kopf steht statt einer Zeilennummer nur die Funktion `codeSlotSicherstellen()`.
