# Faktenbasis — maschinell erzeugt, nicht von Hand gepflegt

**Erzeugt am:** 2026-10-04 · **Commit:** `(Arbeitsstand, ohne Hash)` · **Werkzeug:** `tools/faktenbasis-erzeugen.js`

Jede Zahl hier stammt aus dem geladenen Kern (`vivodepot.html` via `tests/load-kern.js`) oder direkt aus dem Quelltext — nicht aus einem Kommentar, nicht aus dem Gedächtnis. Bei Abweichung schlägt `tests/faktenbasis-aktualitaet.test.js` an (`node tools/faktenbasis-erzeugen.js --check`).

---

## Export-Formate (11)

| Kennung | Erzeuger | MIME | Endung | Sektor | Flags | Versions-/Profil-Belege im Code |
|---|---|---|---|---|---|---|
| `fhir-ips` | `fhirIpsBundle` | application/fhir+json | json | health | — | `http://hl7.org/fhir/StructureDefinition/data-absent-reason`, `http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips`, `http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips`, `http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips`, `http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips`, `http://hl7.eu/fhir/eps/StructureDefinition/device-eu-eps`, `http://hl7.eu/fhir/eps/StructureDefinition/deviceUseStatement-eu-eps`, `http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-status-uv-ips`, `http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-pregnancy-edd-uv-ips`, `http://hl7.org/fhir/uv/ips/StructureDefinition/Flag-alert-uv-ips`, `http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips`, `http://hl7.eu/fhir/eps/StructureDefinition/composition-eu-eps`, `http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips`, `http://hl7.eu/fhir/eps/StructureDefinition/bundle-eu-eps`, `resourceType:AllergyIntolerance`, `resourceType:MedicationStatement`, `resourceType:Condition`, `resourceType:Procedure`, `resourceType:Device`, `resourceType:DeviceUseStatement`, `resourceType:Observation`, `resourceType:Flag`, `resourceType:Composition`, `resourceType:RelatedPerson`, `resourceType:Provenance`, `resourceType:Bundle` |
| `isik` | `isikDokumente` | application/fhir+json | json | health | nurExport | `resourceType:DocumentReference`, `resourceType:Bundle` |
| `sd-jwt-vc-identitaet` | `sdJwtVcIdentitaet` | application/dc+sd-jwt | sd-jwt | identity | — | `vct:urn:vivodepot:identitaet` |
| `xoev-verwaltung` | `xoevVerwaltung` | application/json | json | administration | — | kein Versions-/Profil-Marker im Code gefunden |
| `bildungsangaben` | `edciBildung` | application/json | json | education | — | kein Versions-/Profil-Marker im Code gefunden |
| `sd-jwt-vc-finanzen` | `sdJwtVcFinanzen` | application/dc+sd-jwt | sd-jwt | finance | — | `vct:urn:vivodepot:finanzen` |
| `sd-jwt-vc-sozialversicherung` | `sdJwtVcSozialversicherung` | application/dc+sd-jwt | sd-jwt | socialInsurance | — | `vct:urn:vivodepot:sozialversicherung` |
| `fim-json` | `fimVerwaltung` | application/json | json | administration | — | kein Versions-/Profil-Marker im Code gefunden |
| `vcard-identitaet` | `vcardIdentitaet` | text/vcard | vcf | identity | — | `VERSION:4.0` |
| `vcard-menschen` | `vcardMenschen` | text/vcard | vcf | people | ohneAuswahl | `VERSION:4.0` |
| `ics-vorsorge` | `icsKalender` | text/calendar | ics | advanceCare | nurExport, ohneAuswahl | `VERSION:2.0` |

---

## Import-Formate (18)

| Kennung | Erzeuger | Sektor | Flags | Versions-/Profil-Belege im Code |
|---|---|---|---|---|
| `json` | `_vollDepotParsen` | — | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `fhir-lab` | `flowImportAutoritativ (autoritativDoc — Ablage-Zweig statt Feld-Vorschau; `parse` liefert bewusst null, reine Absicherung)` | health | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `fhir-ips` | `_jsonParse` | health | — | kein Versions-/Profil-Marker im Code gefunden |
| `sd-jwt-vc-identitaet` | `_sdJwtVcObjekt` | identity | — | kein Versions-/Profil-Marker im Code gefunden |
| `sd-jwt-vc-finanzen` | `_sdJwtVcObjekt` | finance | — | kein Versions-/Profil-Marker im Code gefunden |
| `sd-jwt-vc-sozialversicherung` | `_sdJwtVcObjekt` | socialInsurance | — | kein Versions-/Profil-Marker im Code gefunden |
| `xoev-verwaltung` | `_jsonParse` | administration | — | kein Versions-/Profil-Marker im Code gefunden |
| `fim-json` | `_jsonParse` | administration | — | kein Versions-/Profil-Marker im Code gefunden |
| `bildungsangaben` | `_jsonParse` | education | — | kein Versions-/Profil-Marker im Code gefunden |
| `edci-europass-extern` | `_edciExternNutzlast` | education | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `openbadges-3-extern` | `_ob3Lesen` | education | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `vcard-identitaet` | `parseVCards` | identity | — | kein Versions-/Profil-Marker im Code gefunden |
| `vcard-menschen` | `parseVCards` | people | — | kein Versions-/Profil-Marker im Code gefunden |
| `camt053` | `parseCamt053` | finance | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `xmeld` | `parseXMeld` | identity | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `elster` | `_jsonParse` | finance | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `vivodepot-beta` | `parseVivodepotBeta` | — | nurImport | kein Versions-/Profil-Marker im Code gefunden |
| `provider-credential` | `felderAusClaims (fachpfad — kein `parse`, geprüfte Nutzlast wird direkt auf Felder abgebildet, s. Kommentar in vivodepot.html)` | — | nurImport | kein Versions-/Profil-Marker im Code gefunden |

---

## Sektoren, Felder, Unterfelder

**13 Sektoren, 321 Felder, 194 Unterfelder gesamt.**

| Sektor | Label | Felder | Unterfelder |
|---|---|---|---|
| `identity` | Identität & Person | 36 | 20 |
| `people` | Meine Menschen | 8 | 24 |
| `mobility` | Mobilität & Reise | 13 | 7 |
| `finance` | Finanzen & Zahlungen | 22 | 18 |
| `assets` | Vermögen und Einkommen | 11 | 0 |
| `health` | Gesundheit | 32 | 10 |
| `education` | Bildung & Beruf | 31 | 0 |
| `socialInsurance` | Sozialversicherung | 22 | 7 |
| `advanceCare` | Vorsorge & Recht | 49 | 75 |
| `administration` | Verwaltung & Behörden | 27 | 18 |
| `housing` | Wohnen & Eigentum | 15 | 11 |
| `emergencyPreparedness` | Krisenvorsorge | 33 | 0 |
| `personal` | Persönliches | 22 | 4 |

**Anlässe:** 19 · **Assistenten (Wizards):** 7 · **Situationen:** 10

---

## Krypto

- PBKDF2-Iterationen: 600000
- AES-256-GCM verwendet: ja
- JWS-Signatur primär: EdDSA · Fallback: ES256
- Krypto-Version: 3

---

## Prüfebene

- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): 12034
- E2E (Playwright): 542 `test(`-Aufrufe in `tests/e2e/*.spec.js` + 28 aus Schleifen über CPU-Drosselungen = **570 ausgeführte Tests** (mechanisch gezählt, nicht ausgeführt — die Differenz ist konstant)
- Wächter-Register (intern): 142
- Schema-Version: 91 · SCHALEN_STAND: v917 · Build-Version: v1.0

---

## ADR-Register (426)

| Nummer | Titel |
|---|---|
| U2-ADR-001 | Eigener ADR-Namensraum für die Umbau2-Linie |
| U2-ADR-002 | Vereinheitlichter HKDF-pro-Depot-Pfad für den Anker |
| U2-ADR-003 | Sub-Depot-Passwort-Architektur und Vertrauens-Modus |
| U2-ADR-004 | Teststrategie — stehende Suite statt Wegwerf-Harness |
| U2-ADR-005 | Urheberschaft pro Eintrag (Vollmachts-Kette) |
| U2-ADR-006 | Andock-Architektur — Übergabe rein und raus |
| U2-ADR-007 | Gesundheits-Sektor — schlank, FHIR über Template |
| U2-ADR-008 | Propagation — einmal eintragen, überall auswählen |
| U2-ADR-009 | Template-Architektur — Module, die sich nicht wie Module anfühlen |
| U2-ADR-010 | Feld-Architektur der generischen Maschine — drei Ebenen, zwei Schichten, codierte Listen, getrennte Render-Schicht |
| U2-ADR-011 | Auto-Save beim Bereichs-Wechsel — die Pausen-Phrase trägt eine Mechanik |
| U2-ADR-012 | Situationsblatt-Architektur — eine Wahrheit für Anlässe, generische `sensibel`-Property |
| U2-ADR-013 | Dokumenten-Mappe — Dateien im Depot, krypto-agnostisch auf der bestehenden Surface |
| U2-ADR-014 | Was ist ein Dokument? — Die Dokument-Ebene über Feldern und Dateien |
| U2-ADR-015 | Interner verschlüsselter Arbeitsstand (Zwei-Ebenen-Persistenz, IndexedDB-Senke) |
| U2-ADR-016 | kryptoVersion-3-Sprung: Schlüsseltrennung + Legacy-Ausbau |
| U2-ADR-017 | Identitäts-Name speist Akteur-/Provenienz-Name |
| U2-ADR-018 | Pflegegrad gehört in Sozialversicherung, nicht in Gesundheit |
| U2-ADR-019 | Pflegedienst & Pflegegeld nach Sozialversicherung — Auflösung der Sektion pflegegrad-sek |
| U2-ADR-020 | Rename `vivodepot-clean-slate-kern.html` → `vivodepot.html`; Auflösung der Pages-Drift (Weg 1) |
| U2-ADR-021 | Rolle am Bezug, nicht an der Person — rollenloses Personen-Register |
| U2-ADR-022 | Personen-Vereinheitlichung — ein Topf (das Register) + Kinder als Person (C2) |
| U2-ADR-023 | Rechenbare Datums-Felder + abgeleitete Minderjährigkeit + Kinder-Liste vereinheitlicht |
| U2-ADR-024 | Export-Auswahl als Opt-in (datensparsam) + Sub-Depot-Akzent-Vererbung an der Wurzel + Auslieferungs-Fix |
| U2-ADR-025 | Haftungshinweis „Werkzeug, kein Berater" — Fußzeile + Dokument-Fuß (Erst-Eintritt verworfen) |
| U2-ADR-026 | Sicherheit Block A — Stufe-1-Klartext-Cache (offener Zielkonflikt) + Schlüssel-Extrahierbarkeit bestätigt |
| U2-ADR-027 | Sicherheit Block B — Passphrase-Stärke-Rückmeldung (hinweisend), Zwang/Empfehlung offen |
| U2-ADR-028 | Sicherheit Block C — eingehende Verifikation Ebene 3a (signierte Anbieter-Zertifikate) |
| U2-ADR-029 | Selbst Erfasstes bleibt Freitext — keine Laien-Kodierung (Bürger-Schicht) |
| U2-ADR-030 | Sozialversicherungs-Sektor — unsignierter SD-JWT-VC-Selbstauskunft-Export (Variante A) |
| U2-ADR-031 | Persistenz-Ehrlichkeit — Status ≠ Aktion, „gesichert" nur für die Datei |
| U2-ADR-032 | Begriffe — Dokument, Wizard, Modul, Credential trennen |
| U2-ADR-033 | Basis-Vorlagen — Umfang, Haltung, Grenzen |
| U2-ADR-034 | Wiedereintritts-Akteur — beim Entsperren gilt der Inhaber als 'selbst' |
| U2-ADR-035 | Setup-first — Passwort (Akteur) vor dem ersten Eintrag |
| U2-ADR-036 | Kind-Verhältnisse — Sorgerecht pro Kind (entdoppelt), Kind-Beziehung-Enum, Selbstauskunft-Invariante |
| U2-ADR-037 | Gemeinsames selbst-beschreibendes Feld-Modell über die vier Komponenten |
| U2-ADR-038 | CRL/Widerruf: ablaufbasiertes Vertrauen (Option C) |
| U2-ADR-039 | Trust-1B Schritt 3: Anbieter-Template-Signatur Pflicht (Ende der additiven Toleranz) |
| U2-ADR-040 | Basistemplate-Treuhand-Signatur (Option A, geteilter Pfad, tolerant-dann-scharf) |
| U2-ADR-041 | Bereich „Persönliches" steht immer zuletzt in `SEKTOREN` |
| U2-ADR-042 | FHIR-Lab-Modul — Laborbericht nach HL7 Europe Laboratory Report; Validator-Anker umgestellt |
| U2-ADR-043 | Datei-Magic-Bytes — Format-Kennung + Version am Anfang der .vivodepot-Datei (Bau, Option A) |
| U2-ADR-044 | SHL / xShare: nicht in v1 — Website-Aussage korrigiert |
| U2-ADR-045 | Autoritative Original-Ablage: extern ausgestellte FHIR-Dokumente verbatim (Datenklasse) |
| U2-ADR-046 | Rein/Raus-UX: zentrale Sidebar-Türen (Durchstich Gesundheit) + Format-Tag-Korrekturen |
| U2-ADR-047 | SHL-Provider (Offline-Teil): JWE-Erzeugung + shlink:/-Payload aus dem autoritativen Original |
| U2-ADR-048 | eu-hdr (Entlassbrief) auf dem autoritativen Passthrough; Erkenner ehrlich benannt |
| U2-ADR-049 | IPS (Patientenkurzakte) auf dem autoritativen Verbatim-Passthrough |
| U2-ADR-050 | Feldmodell-Regel angewandt: E1–E3 (BMI-Hint, Stub-Code-Slots, Laborwerte-Abwicklung) + Verwaisungs-Regel, Schema 25 |
| U2-ADR-051 | Code-Listen reisen im Template-Vertrag (Reise-als-Daten) + App-Stubs ausgetragen, Schema 26 |
| U2-ADR-052 | Wortlaut aus dem iOS/Desktop-Test (04.07.): Speicher-Zusage, Provider-Import, Bereich-Tür, Wizard-Zielbereiche |
| U2-ADR-053 | Kosmetik aus dem iOS/Desktop-Test (04.07.): Wizard-Schrift, Sidebar-Aktiv-Bug, Raster, Label-Ausrichtung |
| U2-ADR-054 | Wizard-Navigation: Abbrechen → Ausgangsbereich (Bug 1), kein Scroll-/Fokus-Sprung (Bug 2), Frage-Titel auf Kern-Größe |
| U2-ADR-055 | Struktur-Aufräumen „Weitere Möglichkeiten" + Einlese-Dichte: Chooser-Bündelung, Wizard-Aufklappen, Bereichs-Einlese-Guard |
| U2-ADR-056 | Zentrale „Daten einlesen"-Tür wird bereich-neutral („Wohin einlesen?") |
| U2-ADR-057 | Zentrale „Daten herausgeben"-Tür wird bereich-neutral („Woraus herausgeben?") |
| U2-ADR-058 | „Ganzes Depot" in beide Türen; Gesamt-Exporte aus den Einstellungen |
| U2-ADR-059 | Chooser-Bündel: Fachpfad-Schnitt · Notfall-Stelle · Karte/QR raus aus „Ganzes Depot" |
| U2-ADR-060 | Angehörigen-Modus: fünf Situationsblätter (Spec-Struktur nach ADR-061v3) |
| U2-ADR-061 | Datei-Speichern: Web-Share-Blatt nur auf Touch/Standalone (Desktop-WebKit → Download) |
| U2-ADR-062 | Vertrauens-Zugang — Ort-Hinweis und Passwort-Schranke |
| U2-ADR-062 | Stufe-2-Vertrauens-Zugang: Owner-Setup + cache-only Angehörigen-Eintritt (ersetzt Option B) |
| U2-ADR-063 | Feldtyp `mehrfachauswahl` (Checkboxen, Array-Wert) + erste Anwendung vollmachtsGrundlage |
| U2-ADR-064 | Erteilte Vollmachten als `liste`-Record + conditional Sub-Felder (reaktive Modal-Schicht) |
| U2-ADR-065 | Personen-Mehrfachpick (`refMehrfach`) + Umsortier-Controls + Vertretungs-Modus |
| U2-ADR-066 | Patientenverfügung: BMJ-Textbaustein-Wizard + Dokument-Generator |
| U2-ADR-067 | Vorsorge-Sektor: Darstellung geheilt (Instrument-Gruppierung + Gate-Kopplung) |
| U2-ADR-068 | Geteilter Dokument-Generator (Modul-Vertrag) · PV als erste Instanz |
| U2-ADR-069 | KI-Verfügung „Mein digitales Weiterleben" als zweite Generator-Instanz |
| U2-ADR-070 | Instrument-Modul-Registry: vier leere Module strukturell eingehängt |
| U2-ADR-071 | Bild C: Vorsorge-Regal + Cross-Sektor-Sichtbarkeit (Weg β, Liste-Projektion) |
| U2-ADR-072 | Phase 3: Personen-Cluster (skalare Kontakt-Felder → Personen-Liste) + Notfall-QR-Nachzug |
| U2-ADR-073 | Phase 4: Slot-Cluster (verstreute Slots → Listen) + Abhängige-Zusammenführung + gueterstand-Umzug |
| U2-ADR-074 | Phase 5: Konten-Liste + Bankvollmacht-Verweis (Record-id) + Import-Umschrift |
| U2-ADR-075 | Schema-Governance: Lückenlosigkeits-Guard + dokumentierte Leerstellen 20/22 |
| U2-ADR-076 | FHIR-Narrativ-Renderer in der Mappen-Vorschau (autoritative eu-lab/eu-hdr/ips) + parseXML-Härtung |
| U2-ADR-077 | Nachtrag: der PDF-Selbstverifikations-QR trug dasselbe Leck |
| U2-ADR-077 | Notfall-QR-Kodierung: Klartext → Kontakte-vCard (Option C) |
| U2-ADR-078 | Rücknahme des passwortlosen Stufe-1-Cache |
| U2-ADR-079 | Delegierter FHIR-IPS-Export — RelatedPerson + Provenance (Wiedereinbau eines Clean-Slate-Verlusts) |
| U2-ADR-080 | EUDIW-Nachweise: keine Import-Verifikation — der Fluss kennt keine importierbare Datei |
| U2-ADR-081 | FHIR-Provenance im IPS-Bundle — auch im Selbst-Fall (letzter Clean-Slate-Verlust) |
| U2-ADR-082 | Die QR-Kette — proprietäres Rahmenformat, Kamera-Bau (revidiert) |
| U2-ADR-083 | Chip-Mechanik für Code-Slot-Felder (E1 Option C) |
| U2-ADR-084 | Supersede: „Multi-Entry ist keine Basis-Form" (für Code-Slot-Chips) |
| U2-ADR-085 | Institutions-Stufenmodell — Stufe 1 (QR-Scan) gestrichen |
| U2-ADR-086 | Klasse-4-Datei-Export — Durchreiche, kein Producer |
| U2-ADR-087 | IPS-Export — eu-eps-Konformität (Procedures + Medical Devices) |
| U2-ADR-088 | Selbstbezug-Ausschluss — Präzisierung zu ADR-021 |
| U2-ADR-089 | Block 2 — Gate-Konsumenten auf abgeleitete Instrument-Existenz |
| U2-ADR-089 | Vorsorge-Instrument-Liste als gemeinsame Liste |
| U2-ADR-090 | Präfix- und Benennungsregel für den ADR-Nummernraum |
| U2-ADR-091 | Persistenz-Trigger für refMehrfach-Widgets |
| U2-ADR-092 | Reihenfolge der elf Bereiche |
| U2-ADR-093 | Teardown-Architektur und der Eingangsschirm als Ausgang |
| U2-ADR-094 | Nachtrag zu B16-ADR-106 — Allowlist wird durchsetzend, Versions-Gate in der Lese-App |
| U2-ADR-095 | Passwort-Lebenszyklus — Wechsel-Flow und Notfall-Blatt |
| U2-ADR-096 | Unterfeld-Adressierung für typisierte Listen — Zeile wählen, Feld lesen |
| U2-ADR-097 | Die produkttragenden Zusicherungen |
| U2-ADR-098 | Format der Konformitätsklausel |
| U2-ADR-098 | Die Bindung zwischen ADR und Prüfung |
| U2-ADR-099 | Reihenfolge des Aufbaus der Prüf-Architektur |
| U2-ADR-100 | Der Vorsorge-Umbau — ein Ort für Vorsorge-Instrumente |
| U2-ADR-101 | Feldsätze der Angehörigen-Situationsblätter werden festgelegt |
| U2-ADR-102 | Was untersagt ist, erscheint auf keinem Anzeige- oder Ausgabepfad als Bedingung |
| U2-ADR-103 | Teardown-Garantie für Schlüsselmaterial und der Hintergrund-Wipe (Politik A) |
| U2-ADR-104 | Datenmodell-Block — vier Skalarfelder werden Listen, ein Kontaktfeld wird zwei (Schema 41) |
| U2-ADR-105 | `dataAbsentReason` für undatierte Prozeduren und Medizinprodukte |
| U2-ADR-106 | Ein Ort für externe Autoritäten — Validator-Registry und Zusagen-Wächter |
| U2-ADR-107 | Das Export-Gate deckt beide IPS-Pflichtfelder der Identität |
| U2-ADR-108 | Je Schema-Sprung eine Probe — und der nächste Bump bringt seine mit |
| U2-ADR-109 | „Kinder und Schutzbefohlene" sind eine Liste (Schema 42) |
| U2-ADR-110 | Ein übergebenes Datum wird auch verwendet — keine Realm-Prüfung |
| U2-ADR-111 | Der Wechselmoment — ein Prädikat, zwei Aufrufer, ein Wächter |
| U2-ADR-112 | Die STRINGS-Schicht — was durch sie laufen muss, und was nicht |
| U2-ADR-113 | Das Testament trägt kein Prüfintervall |
| U2-ADR-114 | Eine Art, die es nicht gibt — sichtbar im Bereich, abwesend in jeder Übersicht |
| U2-ADR-115 | Die elfte Anlass-Kachel — Umzug |
| U2-ADR-116 | Vier Freitextfelder werden Institutions-Referenzen (Schema 43) |
| U2-ADR-117 | Ein Blatt für die Lebenslagen — Bereichsfelder an Ort und Stelle editierbar |
| U2-ADR-118 | Der ICS-Kalender hängt an den Prüfterminen — Instrument-Datum wird Dokument |
| U2-ADR-119 | Die Flachfeld-Altlasten im Referenzdepot sind geräumt |
| U2-ADR-120 | Übergabe und Widerruf sind ein Paar |
| U2-ADR-121 | ADR — Rechtsraum-Katalog über den Instrument-Typen |
| U2-ADR-122 | Tod-Übergangs-Architektur — Bevollmächtigung, drei Übergangs-Wege und Anker-Provenance-Snapshot |
| U2-ADR-123 | Sub-Depot-Selbstbestimmung statt Re-Key-Ceremony |
| U2-ADR-124 | Depot-Hülle umpacken — Gleichwertigkeit auch am Startseiten-Öffnen-Weg |
| U2-ADR-125 | Browser-Testfähigkeit ist Voraussetzung für Änderungen am Speicher- und Statusweg |
| U2-ADR-126 | Schema-Default „zurückhalten" für 97 besonders schützenswerte Felder |
| U2-ADR-127 | `renderContent()` erhält Scroll und Fokus per Default |
| U2-ADR-128 | Sensibel-Mechanismus — dritte Adressierungsebene und Situations-Schema-Flag |
| U2-ADR-129 | Rechtsgrundlagen der Vertretung — ein Katalog statt zwei, gesetzliche Betreuung ergänzt |
| U2-ADR-130 | Krisenvorsorge wird ein eigenständiger, zwölfter Bereich |
| U2-ADR-131 | Eine Ausgabeschicht statt vier — der Modul-Vertrag wird Datenvertrag |
| U2-ADR-132 | pvwiz legt seine Instrument-Zeile selbst an — U2-ADR-100 gewinnt die Kollision mit U2-ADR-066 §3 |
| U2-ADR-133 | gebwiz legt das Kind an — amendiert U2-ADR-089-Nachtrag §8 für genau einen Assistenten |
| U2-ADR-134 | Eine fremde Vorlage darf ein Dokument erzeugen — Weg C, Signatur beweist Herkunft, nicht Richtigkeit |
| U2-ADR-135 | Frühere Namen sind eine Liste, kein zweites Geburtsname-Feld — und der Anlass „Personenstandsänderung" trägt eine eigene Schutz-Auflage |
| U2-ADR-136 | `verborgenWenn` ist der eine Mechanismus für gegenstandslose Wizard-Schritte — nicht mehr auf kiwiz beschränkt |
| U2-ADR-137 | Das Schema-Sensibel-Flag ist eine Voreinstellung, keine Sperre — die Bürgerin entscheidet an beiden Stellen |
| U2-ADR-138 | Ein Dokument kann eine Listen-ZEILE referenzieren, nicht nur ein Listen-FELD — zeilenId, kein Raten |
| U2-ADR-139 | Die Rentenversicherungsnummer wird ein einziges Feld (Schema 63) |
| U2-ADR-140 | Vier neue Anlass-Kacheln — Trennung/Scheidung, Verwitwung, Arbeitslosigkeit, Rechtliche Betreuung |
| U2-ADR-141 | Anzeigetexte liegen in einem austauschbaren Satz, nicht in der Felddefinition |
| U2-ADR-142 | Institutions-Arten sind von aussen erweiterbar — der fünfte Andockweg |
| U2-ADR-143 | Die Bereichsliste hat EINE Quelle, und ihr Schlüsselraum ist die ID |
| U2-ADR-144 | Gültigkeit ist eine Eigenschaft JEDES Feldwerts, auch eines angedockten |
| U2-ADR-145 | Ein eingelassenes Modul sagt „ich habe es selbst hineingelassen" |
| U2-ADR-146 | Ein Format-Kanal ist eine Beschreibung, niemals Code |
| U2-ADR-147 | Ableitungslinie — alles Architektonische in den Kern, Versionen werden abgeleitet |
| U2-ADR-148 | Ein Ablaufdatum wohnt bei seiner Gültigkeit, nicht im Bereich |
| U2-ADR-149 | Der Depot-Inhalt zerfällt in Feld-Einheiten — und der Beleg reist mit |
| U2-ADR-150 | Ein unbekannter Fall wird benannt, nicht angeglichen |
| U2-ADR-151 | Eine Kennungsform, versionierte Format-Kennungen — und eine Migrationsstufe statt vier |
| U2-ADR-152 | Die Anfrage von aussen — Beschreibung statt Formular, und ein eigener Schritt statt eines Warnhinweises |
| U2-ADR-153 | Der verschlüsselte Rückweg — zwei Verfahren, eine Empfängerseite, und ein wiederaufgenommener Zusammensetzer |
| U2-ADR-154 | Bereiche sind das fünfte Einlass-Register — und ein angedockter Bereich kommt auf dasselbe Blatt |
| U2-ADR-155 | Ein Leser trägt seine Version — und XML und CSV folgen der Konvention, die JSON schon hat |
| U2-ADR-156 | Empfängerkreise — ein Empfänger, ein Passwort, ein Zuschnitt |
| U2-ADR-157 | Ein Modul schlägt vor, die Bürgerin hebt |
| U2-ADR-158 | Eine Person gilt als verstorben — und das löst das Ereignis „Tod" aus |
| U2-ADR-159 | Kein Feld, das Geheimnisse aufnimmt, ohne `autocomplete="off"` UND explizites Räumen beim Laden |
| U2-ADR-160 | Der Bereichssatz wird Dateieigenschaft — Weglassen, nicht Umbelegen |
| U2-ADR-161 | Die zwanzig Korb-1-Felder werden mehrwertig — neun Listen statt zwanzig Skalare |
| U2-ADR-162 | Der Rechtsraum kommt in den Textsatz-Schlüssel — Sprache und Rechtsraum zusammen |
| U2-ADR-163 | Fünf Register, eine Form — `bereiche` wird Objekt wie `arten`/`typen` |
| U2-ADR-164 | Modul-Beschriftungen je Sprache — `beschriftungen` additiv neben `label` |
| U2-ADR-165 | Zwei Fassungen desselben Depots zusammenführen — Erkennen und Zusammenführen, beides v1 |
| U2-ADR-166 | Die Lese-App trägt die Textsatz-Regeln — und nur die zwei, die auch der Kern anwendet |
| U2-ADR-167 | Ändert eine Institution den vorgeschlagenen Prüf-Rhythmus, sagt die Feldzeile es leise |
| U2-ADR-168 | Rücknahme einer Modul-Vorlage — sehen, wer sie brachte; Werte leeren, Struktur behalten |
| U2-ADR-169 | Der Bereichssatz bekommt seinen ersten Aufrufer — Auswahl im Anker-Anlage-Dialog |
| U2-ADR-170 | Eine unbekannte Feld-Eigenschaft wird generator-seitig gemeldet, kern-seitig abgewiesen |
| U2-ADR-171 | Sidebar-Navigation gruppiert sich in fünf Themen-Cluster, kollabierbar |
| U2-ADR-172 | Die Zwischenstufe — ein Ausgabe-Schlüssel zwischen Anker und Kunde |
| U2-ADR-173 | Notfall-Widerruf — ein schmaler, schneller Weg für die Sperrliste, getrennt vom Feature-Release |
| U2-ADR-174 | Bottom-Tab-Navigation mobil — vier Tabs als Schnellzugriff neben dem Hamburger, Desktop bleibt Sidebar |
| U2-ADR-175 | Statuskarten (`.feldgruppen-karte`) sind das Leitmuster für jede Feldgruppe — vollständige Migration beschlossen |
| U2-ADR-181 | Vertrauensstufen für Module — `vivodepot/kern` und `vivodepot/pruefstelle` auf derselben Kette |
| U2-ADR-182 | Vor-Depot-Konfiguration — jeder Modultyp als signiertes Modul, die App-Datei bleibt für alle gleich |
| U2-ADR-183 | SHL-Ablage-Host: eigener, netzloser Zwei-Seiten-Weg (U2-ADR-047 Zone 2) |
| U2-ADR-184 | Hintergrund-Wipe — Gnadenfrist vor Politik A + Bildschirm-Zusicherung |
| U2-ADR-185 | Sperrschirm statt Eingangsschirm nach dem Hintergrund-Wipe |
| U2-ADR-186 | Ein gekauftes Modul bleibt im Bestand nutzbar — Widerruf wirkt am Einlass, nicht im Depot |
| U2-ADR-187 | Bereichs-Identität überlebt das Verwaisen |
| U2-ADR-188 | Die Registry folgt data |
| U2-ADR-189 | Ein vor dem Depot angedocktes Sprachmodul wird vererbt |
| U2-ADR-190 | Bedingtes skipWaiting — präzise statt pauschale Anwendung von U2-ADR-015 |
| U2-ADR-193 | BBK-Quellenangabe — aktueller Stand statt veralteter Auflage |
| U2-ADR-194 | Eine index.html je Ausliefer-Verzeichnis, die auf das eigene vivodepot.html weiterleitet |
| U2-ADR-195 | Ein einmal gelernter Begriff bedeutet überall dasselbe |
| U2-ADR-196 | Ein Verweis auf eine Bedienstelle nennt sie, wie sie dasteht |
| U2-ADR-197 | Aussage-Prüfung-Abgleich — folgt die Aussage wirklich aus der Probe? |
| U2-ADR-199 | Organspende-Register — ein Feld für die Eintragungs-ID, kein Hinweistext |
| U2-ADR-201 | Datengestalten — die E2E-Suite lebt die Vertretungswege, nicht nur die Standardgestalt |
| U2-ADR-202 | Die Live-Sichtbarkeits-Verdrahtung im Listen-Eintrag-Modal kennt `verborgenWenn` |
| U2-ADR-206 | Das Signier-Werkzeug merkt sich die zwei stehenden Pfade — nie den Inhalt, nie die Passphrase |
| U2-ADR-207 | Ein Vor-Depot-Sprachmodul übersteht ein fremdes Depot |
| U2-ADR-208 | Eine Sprachkennung ohne eigene Modul-Regel fällt auf die aktive Sprache zurück, nicht auf Deutsch |
| U2-ADR-209 | Produkt-Trennung im geteilten internen Speicher (Record-Kennung, nicht Datenbankname) |
| U2-ADR-211 | Sicherungsstand bekannt — persistiert statt Arbeitsspeicher-Variable |
| U2-ADR-212 | der Sichern-Knopf folgt dem Speicher-Modus — intern, wenn intern möglich |
| U2-ADR-213 | PBKDF2 statt Argon2id — gemessen, nicht nur vermutet |
| U2-ADR-214 | Ein benannter, ADR-gedeckter Schalter hebt den sw.js-Wächter auf — und ein Abbruch nimmt vollständig zurück |
| U2-ADR-215 | Der Schalen-Lockstep-Wächter prüft den ausgelieferten Dateisatz, nicht nur zwei von vier Dateien |
| U2-ADR-216 | Fremd ausgestellte Nachweise halten — bewusst offene Option |
| U2-ADR-217 | Format-Tags in Lese-App und Bürger-App-Spezifikation nachgezogen |
| U2-ADR-218 | Die `.vdkey`-Hüllenschicht kommt unter denselben Wächter wie der Kryptokern |
| U2-ADR-219 | der plattformabhängige Sicherungs-Hinweis bleibt bei iOS — Android und Schreibtisch-Safari bekommen den bestehenden, plattformunabhängigen Hinweis |
| U2-ADR-220 | der Sicherungsdatei-Namens-Hinweis verspricht nicht mehr, was er nicht halten kann |
| U2-ADR-221 | Barrierefreiheits-Sichten-Lücke geschlossen (Verwaltungs-Liste + Entsiegeln-Dialog) — und die Serif-Ausnahme dokumentiert |
| U2-ADR-222 | ein leeres Depot ist keine Sicherung |
| U2-ADR-223 | Die Datei ist das Depot — der interne Speicher ist ein Zwischenspeicher |
| U2-ADR-224 | Boot-Wettlauf behoben — der vorDepot-Zweig überschreibt den bereits gezeigten Passwort-Eintritt nicht mehr |
| U2-ADR-225 | Feste Temp-Dateinamen ersetzt — Eindeutigkeit schließt den Prozess ein |
| U2-ADR-226 | die Klausel→Probe-Bindung prüft eindeutig UND vollständig, nicht nur die erste Zeile |
| U2-ADR-227 | `_signJWS` kommt unter den Hüllenschicht-Wächter — die Signierfunktion selbst wird ein bewachter Verbatim-Träger |
| U2-ADR-228 | die Suite-Zahl in erzeugten Dokumenten kommt aus den von Git getrackten Testdateien, nicht aus Nodes eigener Dateisuche |
| U2-ADR-229 | Die Prüfsumme der ausgelieferten Datei wird bewacht, nicht gepflegt |
| U2-ADR-230 | Krypto-Stärkeparameter ändern sich nur über einen Sprung der `kryptoVersion` — nie an Ort und Stelle |
| U2-ADR-231 | die Ganzkette läuft am Stück — jetzt mit vollem Feldbestand geprüft, nicht nur mit fünf Sentinels |
| U2-ADR-232 | Jeder git-Unterprozessaufruf gegen ein fremdes Arbeitsverzeichnis streift GIT_* ab |
| U2-ADR-233 | Original-Bytes bleiben roh, Erkennung bleibt dekodiert |
| U2-ADR-235 | der Sub-Depot-Umschlag wird je Kryptoversion vollständig geprüft und versionsecht zurückgeschrieben |
| U2-ADR-236 | Rahmen folgt Kontext — Sub-Depot-Farbe von Rand statt Fläche nachgezogen |
| U2-ADR-237 | Jede Änderung sichert still intern — die Datei wird eine eigene, seltene Sicherungskopie |
| U2-ADR-238 | Depot-Pillen-Menü schließt nicht mehr über den Fokus als Stellvertreter |
| U2-ADR-241 | Export-Übersicht — Topf-B-Lücken bei geteilten Mapping-Tabellen und bei eigenständigen Bedienwegen |
| U2-ADR-243 | Pro-Modul, vollständiger Feldsatz — sechs Bereiche, angedockt |
| U2-ADR-244 | Das Anlegen selbst braucht keinen Speicherort mehr |
| U2-ADR-245 | Ein `logikModul` braucht ein ausdrückliches Recht auf ein sensibles Feld — kein stillschweigendes |
| U2-ADR-246 | Situationen werden andockbar — das achte Einlass-Register |
| U2-ADR-247 | Anzeige erfährt Zustandsänderung — Sichern-Knopf-Klick und Statuskarte |
| U2-ADR-248 | Der Erbschein-Vorbereitungsauszug las `kinder` aus dem falschen Sektor — auf beiden Lesepfaden |
| U2-ADR-249 | Die `.vdkey`-Hülle bekommt eine Versions-Allowlist — die Ableitung bleibt unangetastet |
| U2-ADR-250 | Assistenten werden andockbar — das neunte Einlass-Register |
| U2-ADR-251 | Ereignis-Achse wird andockbar — das zehnte Einlass-Register |
| U2-ADR-252 | Ein vor dem Depot angedocktes Modul übersteht die Depot-Anlage — auf beiden Schichten |
| U2-ADR-253 | Bürgerdepot wird Modul — Commit A: die Konsumenten werden entkoppelt |
| U2-ADR-254 | ADR — Rechtsraum-Vorbelegung: Vorschlagswert statt hartem DE, an zwei Stellen |
| U2-ADR-255 | Ausgabeformat/Rechtsraum-Kopplung — additiv, zwei Formate, ein Gate |
| U2-ADR-256 | Namens-Anzeigereihenfolge kommt vom Menschen, nicht von Sprache oder Rechtsraum |
| U2-ADR-257 | `FORMAT_SCHREIBER` — die Schreibseite der Format-Module |
| U2-ADR-258 | Die Herkunft eines Moduls erreicht den Empfänger — im Artefakt, nicht nur in der Anzeige |
| U2-ADR-259 | Jedes erzeugte Dokument sagt, aus welchem Stand es stammt |
| U2-ADR-260 | Zwei Fehler, die in jeder ausgelieferten Kopie mitreisen — der Transparenz-Link ohne Ziel und die Sprachdeklaration, die dem Schalter statt der Sprache folgte |
| U2-ADR-262 | Handkopien von Kern-Konstanten bekommen einen Wächter |
| U2-ADR-263 | Der PDF-Export prüft die Schriftdeckung, bevor er ein Zeichen zeichnet |
| U2-ADR-266 | Nach dem ersten Datei-Sichern erfährt die Bürgerin, dass die Datei verschlüsselt ist |
| U2-ADR-267 | Ein Modul-Einlass ist unumkehrbar — und niemand sagte es vorher |
| U2-ADR-269 | Das Rollen-Vokabular gebaut — vier Rollen, erste Listenzeilen-Form |
| U2-ADR-270 | `module/` fällt bereits unter Schicht 1 (EUPL-1.2) — kein Lizenztext nötig |
| U2-ADR-271 | PBKDF2-Iterationszahl wird aufrüstbar — Allowlist gekoppelt an die Kryptoversion |
| U2-ADR-273 | Der Abbruch beendet die Prozeßgruppe, nicht nur den Wartenden |
| U2-ADR-274 | institutionsArt — die Auszugs-Fähigkeit bewiesen, der native Bestand unangetastet |
| U2-ADR-275 | INSTITUTION_ART_EINGEBAUT wird fest verdrahtet statt abgeleitet |
| U2-ADR-276 | Ein Golden-Master für die Ausgabewege des Bürgerdepots — das Netz vor dem Gerüst-Umbau |
| U2-ADR-277 | Die Notfallkarte achtet `displayFamilyNameFirst` — die eine Stelle, die U2-ADR-256 ausließ |
| U2-ADR-278 | Die Sprachkennung folgt jetzt auch dem Rechtsraum-Fach, nicht nur dem Modul |
| U2-ADR-279 | `vorsorge_instrumente` über die Rolle `instrumenteListe`, nicht über den Feldnamen |
| U2-ADR-280 | Kein Prüfer stellte fest, ob eine ausgelieferte Datei überhaupt Code ist |
| U2-ADR-282 | Die Erste-Partei-Zone — native Feld-Bezeichner ohne den `tpl_`-Zwang |
| U2-ADR-284 | ADR — Stellensatz: eine Bezugsstelle, die mit dem Rechtsraum reist |
| U2-ADR-285 | "DE"/'de' bleiben für Fremde reserviert — ein Gerüst-eigener Ladeweg darf sie tragen |
| U2-ADR-287 | Was ein Template ist — und der erste Fall auf dem Pro-Modul |
| U2-ADR-288 | Byte-Gleichheit war bewiesen, Erreichbarkeit nie — der Erbschein-Vorbereitungsauszug wird ab Werk eingelassen |
| U2-ADR-289 | Vivodepot Pro ist angedockt und provisioniert; signierfertig braucht ein eigenes Werkzeug, nicht das der Fremden |
| U2-ADR-290 | Ein Modul darf sein eigenes Feld nicht nur benennen, sondern auch erklären |
| U2-ADR-291 | Das Bürgerdepot wird in vier Module geschnitten — Struktur, Sprache, Recht, Marke |
| U2-ADR-292 | Der Ladeweg auf die Erste-Partei-Zone — Struktur ersetzbar, alle dreizehn Sektoren bewiesen |
| U2-ADR-293 | Das englische Sprach-Modul — Struktur-Invarianz bewiesen, eine veraltete Auslieferung gefunden |
| U2-ADR-294 | Zehn-Register-Nachlese — der fehlende Wirkungsbeweis fürs Assistenten-Register nachgezogen |
| U2-ADR-295 | Drittes Template, wieder auf dem Pro-Modul — Geschäftsführerin, Vertretung/Nachfolge/Notfall |
| U2-ADR-296 | Vivodepots eigene Marke wird ein Datenwert; ein fremder Beitrag im Bürgerdepot trägt einen Rand |
| U2-ADR-297 | Ein Produkt mit Vor-Depot-Konfiguration füllt die Kopfzeile mit der Institutionsfarbe — Fall 2 aus U2-ADR-296 |
| U2-ADR-298 | Zwei vorbestehende E2E-Rotläufe, beide Nachwirkung von U2-ADR-288 |
| U2-ADR-299 | Der Produktabnahmebeweis, Kern-Seite — Struktur/Feld-Definitionen/Textsatz gegen das ECHTE Bündel |
| U2-ADR-300 | Der Produktabnahmebeweis, E2E-Seite — PDF-Modelle/Exportkanäle/Datei-Rundlauf gegen das ECHTE Bündel, im echten Browser |
| U2-ADR-301 | Der Erzeuger um Situationen und Assistenten erweitert — und ein Riegel gefunden, der bei Sektoren nicht steht |
| U2-ADR-302 | Der Produktabnahmebeweis, Branding-Achse — E2E, im echten Browser |
| U2-ADR-303 | Der Aufrufer statt des Riegels — das mitgelieferte Bündel kommt über das Gerüst, nicht über den Einlass |
| U2-ADR-304 | Die Landkarte vor E4 — was umfällt, wenn `SEKTOREN` quelltextlich leer ist |
| U2-ADR-305 | Situations-Hinweis in ADR-301 korrigiert, plus ein `hinweis`-Feld gegen dieselbe Verwechslung |
| U2-ADR-306 | buergermodulWizardErsetzen — das dritte Gegenstück, für die Assistenten-Achse (WIZARDS) |
| U2-ADR-307 | Die Rechtsraum-Überlagerung für Feld-Fristen — und die drei Regeln, die mein eigener Schnitt nie besucht hat |
| U2-ADR-308 | buergermodulSituationErsetzen — das Gegenstück zu buergermodulSektorErsetzen für die Situations-Achse |
| U2-ADR-309 | Der zweite Rechtsraum — die Mechanik ist bewiesen, das Recht bleibt offen |
| U2-ADR-310 | Der Produktabnahmebeweis, E4-Bündel-Seite |
| U2-ADR-311 | Zwei benannte Grenzen aus ADR-292 geschlossen — Options-Schnappschuss behoben, Gültigkeitsvorschlag in Arbeit |
| U2-ADR-312 | SEKTOREN leer, ohne Sturz — WIZARDS bindet auf Lesezeit, nicht auf Auswertungszeit |
| U2-ADR-313 | Der Produktabnahmebeweis, E4-Assistenten-Interaktion — und ein stiller schwerer Fund |
| U2-ADR-314 | Der Gültigkeits-Vorschlag kommt aus dem Rechtsraum — das Modul trägt die Zahl, der Kern rechnet |
| U2-ADR-315 | `hooks/pre-push` prüft Stand-Zahlen und Faktenbasis eigenständig, nicht nur über pre-commit |
| U2-ADR-316 | Ein Werkzeug für die Standzahl — es verkleinert das Fenster, es schließt es nicht |
| U2-ADR-317 | Die Deckung des Bündel-Erzeugers — acht Verweise waren gemeint, hundertneun sind es |
| U2-ADR-318 | Die Deckung der drei übrigen Achsen — Sprache, Rechtsraum, Marke |
| U2-ADR-319 | Ein Bereich entsteht aus dem Bündel — und die Erlaubnisliste stand auf dem, was weicht |
| U2-ADR-320 | Der native Bereichsbestand verlässt die Datei — das Bündel ist die einzige Quelle |
| U2-ADR-321 | Die Abnahme gegen das AUSGELIEFERTE Nativ — A==B gegen einen eingefrorenen Commit statt gegen den eigenen Arbeitsbaum |
| U2-ADR-322 | Jeder Text-Träger löst in den Textsatz auf — und der Wächter läuft den Bestand ab, nicht die Ortsliste |
| U2-ADR-323 | Angedockte Bereiche erreichen den Empfänger — die Lese-App meldet an, statt zu kennen |
| U2-ADR-324 | Eine Probe, die den nativen Bestand maß und Robustheit versprach |
| U2-ADR-325 | `listenfeldAlle` erreicht die Lese-App — und die Typliste kommt aus einer Quelle |
| U2-ADR-326 | Das Auszugs-Tor wird generisch — und `zugang-zum-recht` bekommt seinen zweiten Zweck |
| U2-ADR-329 | Die E2E-Suite kehrt in den pre-push zurück — vier Wochen ohne Netz |
| U2-ADR-330 | Teil 0 — der Beratungshilfe-Auszug führt die Personen-Angaben mit |
| U2-ADR-331 | Ein Satz über den eigenen Zustand ist kein Inhalt — kein Modul überschreibt ihn |
| U2-ADR-332 | Das Regal hat keinen Bereichsfilter — und der Wächter, der das offenhält |
| U2-ADR-333 | Die Wortlaute der Vorsorge-Dokumente werden überschreibbar — und was dabei fehlt, wird gezählt |
| U2-ADR-334 | Die Beschriftung eines angedockten Bereichs erreicht den Empfänger in seiner Sprache |
| U2-ADR-334 | Erfinden verboten, Übersetzen erlaubt |
| U2-ADR-335 | Die Lese-App liest, sie prüft nicht — kein „geprüft" aus einem Depot-Feld |
| U2-ADR-336 | Vier reservierte Klassennamen — und die Lücke, die eine Umbenennung offenließ |
| U2-ADR-337 | Das englische Sprachmodul bekommt einen `regeln`-Kopf — Währung bleibt am Rechtsraum, nicht an der Sprache |
| U2-ADR-338 | VOLLMACHT_BMJ bekommt einen Schlüssel-Weg — der Ort ist da, kein englischer Wortlaut |
| U2-ADR-339 | Der Design-Namensraum bekommt eine Typprüfung statt einer Namensliste |
| U2-ADR-340 | Ein Design darf keine Warnung ausblenden — die Zusicherung misst das Ergebnis, nicht den Weg |
| U2-ADR-341 | Optionen aus einer Situation gehören hinter die Bündel-Anwendung, nicht in ein Literal davor |
| U2-ADR-341 | U2-ADR-341b (A1b) · SITUATIONEN sind real ins Bündel umgezogen — der native Block ist leer |
| U2-ADR-342 | Der Beleg bleibt im Depot — und zwei Klassen von Lesern sehen verschiedene Dinge |
| U2-ADR-343 | Die 39 amtlich übernehmbaren Wortlaute — mechanisch gegen die BMJ-Formulare belegt |
| U2-ADR-344 | Die drei amtlichen BMJ-Dokumente verlassen den nativen Block |
| U2-ADR-345 | Die vier Dokumentmodule + STANDARD_VORLAGEN wandern ins eingebettete Bündel |
| U2-ADR-346 | U2-ADR-346 (A2) · Fünf WIZARDS sind real ins Bündel umgezogen — pvwiz/kiwiz kommen über U2-ADR-344, auf einem eigenen Weg |
| U2-ADR-347 | Die SITUATIONEN der Lese-App sind eine erzeugte Kopie mit Prüfung |
| U2-ADR-348 | U2-ADR-348 (vorläufig — Nummer beim Landen zu bestätigen) · Struktur-Achse: Tausch statt Ergänzung |
| U2-ADR-349 | Die Lese-App erkennt ihre eigenen Sektor-/Feld-Beschriftungen als übersetzbar |
| U2-ADR-350 | Der Nachtmodus-Selektor-Wächter: Struktur statt Handarbeit |
| U2-ADR-351 | Der Kanal für Schriftgrad-Rollen — geöffnet, nicht bewiesen |
| U2-ADR-352 | U2-ADR-352 (E1, Teil 1) · RECHTSRAUM_KATALOG ist real ins Bündel umgezogen — die Einlass-Reservierung für "DE" bleibt unangetastet |
| U2-ADR-353 | Die zwei Ab-Werk-Vorlagen bekommen Textsatz-Kennungen — lokal, kein Präzedenzfall |
| U2-ADR-354 | Templates bekommen ihren Ort — „Weitere Bereiche" als eigenes Verzeichnis, kein vierzehnter Bereich |
| U2-ADR-356 | Reine Dokument-Commits laufen ohne die volle Behavior-Suite |
| U2-ADR-357 | Die Lese-App zeigt die zwei Ab-Werk-Vorlagen übersetzbar — Geschwister zu 353, nicht Nachtrag zu 349 |
| U2-ADR-358 | Der vierte Träger — `faktenbasis-erzeugen --ohne-suite` + `ableitungen:build` |
| U2-ADR-359 | Deutsch wird ein Sprachmodul, wie Englisch — heben, nicht abschaffen |
| U2-ADR-360 | `faktenbasis-erzeugen.js` erkennt Import-Wege auch ohne `parse` |
| U2-ADR-361 | Vier Produkte, ein Gerüst — `produkt-konfektionieren.js` |
| U2-ADR-362 | Branding anschließen — `name`/`domain` erreichen die Bürgerin |
| U2-ADR-363 | Der Rückfall auf Deutsch verlässt textLesen() |
| U2-ADR-364 | Nur lateinische Schrift im deutschen Sprachmodul — ein Beispiel getauscht, ein Wächter dauerhaft |
| U2-ADR-366 | Die Ausgabe wird zur Antwort auf ein benanntes Template — Schema-Bindung zuerst, Orchestrierung und Zeitachse beschrieben, nicht gebaut |
| U2-ADR-367 | `TEXTSATZ_EINGEBAUT` wird das deutsche Sprachmodul selbst |
| U2-ADR-368 | Rechtsraum DE wird ein Modul, wie Sprache — heben und verdrahten, nicht umschalten |
| U2-ADR-369 | Der umgedrehte Wächter 3 — eine benannte Erlaubnisliste für das Deutsch-Leck |
| U2-ADR-370 | 'modul' als Prüftermin-Quelle — ein Template kann eine periodische Prüfpflicht mitbringen |
| U2-ADR-371 | Zwei gebeugte Literale — generisches „Depot" statt Marke, nicht `{marke}` |
| U2-ADR-372 | Die vier Produkte gegen v515 — A==B über den echten Öffnen-Weg, kein Sektor-Byte-Vergleich |
| U2-ADR-373 | „Annahme" ist der Einlass — der Modul-Prüftermin entsteht mit ihm und ist danach abschaltbar, nicht löschbar |
| U2-ADR-374 | Bestands-Wächter statt Muster-Wächter — gebeugte Marke-Literale |
| U2-ADR-375 | der zweite Einlass zieht das Intervall nach — außer die Bürgerin hat abgeschaltet |
| U2-ADR-377 | sprechende Dateinamen für die vier Produkte + die vierzeilige Erklärdatei |
| U2-ADR-378 | der Sichtbarkeitswächter für die vier Produkte — umgedreht, damit er niemanden sperrt |
| U2-ADR-379 | das Pro-Bereichs-Modul wird ein ausgeliefertes Artefakt — "Modul Pro" war zwei Module, nicht eins |
| U2-ADR-380 | Tote Ausnahmen sind ein Befund, kein Ordnungsfimmel |
| U2-ADR-381 | xShare in der v515-Vier-Produkte-Abnahme nachgeholt |
| U2-ADR-382 | Rechtsraum Deutschland wird ein Modul, wie Sprache |
| U2-ADR-383 | der Baukasten bekommt eine Abnahme seiner eigenen Zusammensetzung — die Modul-Tabelle als Daten, nicht als Code |
| U2-ADR-384 | Vivodepots eigene Marke wird Ab-Werk-Saat — konfektionieren ist nicht einlassen |
| U2-ADR-385 | Grundlinie: die vier Produkte gegen Lese-App und VC-Issuer |
| U2-ADR-386 | "ein fünftes Produkt ist eine Zeile an einem Ort" wird ein Mechanismus, kein Satz im ADR |
| U2-ADR-387 | Die Ab-Werk-Rangfolge für logikModul, und der gemeinsame Wächter darüber |
| U2-ADR-388 | UX/Erscheinung ist gemessen vollständig — kein Artefakt aus sachlichem Grund |
| U2-ADR-396 | Die KI-Verfügung wird selbst übersetzt: Vivodepot ist hier Autor, nicht Träger |
| U2-ADR-398 | Das gekündigte Zimmer: eingebackene Struktur reist als Mitschrift mit der Datei |
| U2-ADR-399 | `feld.<feldId>.vorschlaege` nimmt die Trägerkette auf — gemessen, nicht blind übernommen |
| U2-ADR-400 | White Label — Reichweite bis ins PDF, EIN Herkunftsort (Nummer beim Landen zu bestätigen) |
| U2-ADR-401 | Achsen-Verriegelung — exklusive Achsen schlagen an, statt still zu überschreiben (Nummer beim Landen zu bestätigen) |
| U2-ADR-402 | Vollimport — acht Schlüssel bleiben draußen, weil sie DIESER Datei gehören, nicht der Bürgerin (Nummer beim Landen zu bestätigen) |
| U2-ADR-404 | Provisionierung mit K9/Weg C verdrahtet — plus ein gefundener Bestandsfehler |
| U2-ADR-405 | Zutaten-Prüfsumme gegen das Rezeptbuch im Schwesterrepo |
| U2-ADR-406 | `produktTextErzeugen` in den Schwesterrepo kopiert, mit gepinnter Code-Prüfsumme |
| U2-ADR-407 | `tools/kern-ausliefern.js` — der Auslieferungsweg zum Speicher |
| U2-ADR-408 | Die Palette folgt der Marke — White Label bis zum letzten Grünton |
| U2-ADR-409 | Das Feldregister — der Bestand nach außen, Vorschläge nach innen |
| U2-ADR-410 | ZVR-Abschrift — das Register nimmt ab 01.10.2026 den Text selbst |
| U2-ADR-411 | Der Bestellweg — Produkte entstehen aus Rezept und Zutaten; für v1 je Version, je Bestellung nach v1 |
| U2-ADR-412 | Jede Herausgabe bekommt auch ein PDF — drei Chiffrat-Ausnahmen |
| U2-ADR-413 | Vorführung — ein gebackenes Beispiel-Depot, das nichts verlässt |
| U2-ADR-414 | Das Produkt ist ein signiertes Rezept — die Kette ersetzt die gepinnte Prüfsumme |
| U2-ADR-415 | Vom Stick geöffnet — beim Schließen auf den Stick, danach die Browser-Kopie räumen |
| U2-ADR-416 | Sprachmodule werden mit jeder Version ausgeliefert |
| U2-ADR-417 | U2-ADR-417 (Nummer beim Landen zu bestätigen) · Situationen/Wizards ab Werk — eigener Speisepfad statt Fremdmodul-Prüfer |
| U2-ADR-419 | U2-ADR-419 (Nummer beim Landen zu bestätigen) · Manifest-Konfektionierung — Bibliothek + Wächter (Block D) |
| U2-ADR-420 | U2-ADR-420 (Nummer beim Landen zu bestätigen) · Doppelt vergebene ADR-Nummern: gefunden, benannt, eine sofort behoben |
| U2-ADR-421 | U2-ADR-421 (Nummer beim Landen zu bestätigen) · VD Pro ersetzt statt ergänzt |
| U2-ADR-422 | U2-ADR-422 (Nummer beim Landen zu bestätigen) · Die YAML-Form der Konformitätsklausel ist gleichrangig zur eingezäunten Form |
| U2-ADR-423 | U2-ADR-423 (Nummer beim Landen zu bestätigen) · Signierte Sprachmodule übersetzen Zusicherungssätze |
| U2-ADR-424 | Private Sachversicherungen strukturiert, Basiskonto und P-Konto als Kontomerkmal |
| U2-ADR-425 | Hilfe in der Datei — Bedienungsanleitung als Kern-Inhalt |
| U2-ADR-426 | Das Gerüst trägt keinen vollen Sprachsatz — Englisch kommt als Modul |
| U2-ADR-427 | Templates stehen im Rezept in einer eigenen Liste |
| U2-ADR-428 | Deutsch ist ein Sprachmodul — das Gerüst trägt keinen Sprachsatz |
| U2-ADR-429 | Ein Depot trägt seine Sprache, und die Bürgerin schaltet unter den vollen Sprachen um |
| U2-ADR-430 | Wiederherstellungs-Hülle, abwählbar |
| U2-ADR-431 | Die unersetzbaren Angaben am Herkunftsort stehen in EINER Quelle — erzeugter Block, Platzhalter, Abweisen beim Erzeugen, Ergänzen beim Anzeigen |
| U2-ADR-432 | Ein Sub-Depot ist ein Depot wie jedes andere — Korrektur zu U2-ADR-235 |
| U2-ADR-433 | Notvertretung durch Ehegatten — die Ablehnung im Depot der vertretenen Person |
| U2-ADR-434 | Lieferketten-Sicherheit — festgeschriebene Versionen, erzeugte Stückliste, Schwachstellen-Abgleich |
| U2-ADR-435 | Angehörigen-Blätter sind Inhalt (Template), kein Gerüst |
| U2-ADR-436 | Die privaten Schlüssel des Template-Generators im Speicher — in Hüllen, nicht herausholbar, verworfen |
| U2-ADR-437 | Die Antwort auf eine Anfrage sagt, wer antwortet — als Angabe der Person, im verschlüsselten Datensatz |
| U2-ADR-438 | Verständigung und Unterstützung — und die Freitexte der Notfallvorsorge auf der Karte |
| U2-ADR-439 | Personenstandsurkunden — die Ablageorte werden Kennungen im Bereich Identität |
| U2-ADR-440 | Die Festlegungen der Patientenverfügung werden Kennungen — abgeleitet, nicht gepflegt |
| U2-ADR-441 | Zertifikatsweg für externe Prüfer |
| U2-ADR-443 | Bildungsnachweise halten — ein fremd ausgestelltes EDC wird als Original verwahrt und unverändert vorgezeigt |
| U2-ADR-444 | Verwahrung — Nachweis beim Weitergeben, Übergang an die Person, Widerspruch |
| U2-ADR-445 | Open Badges 3.0 halten — ein fremd ausgestellter Badge wird als Original verwahrt und unverändert vorgezeigt |
| U2-ADR-446 | SNOMED GPS — Nutzungsmuster statt ID-Freigabe |
| U2-ADR-449 | Die Antwort auf eine Anfrage als JWE |
| U2-ADR-452 | „Gilt bis“ je Fach und die Vertretung als FHIR RelatedPerson |
| U2-ADR-454 | Kind-Datei — das Kind übernimmt sein Sub-Depot ohne Mitwirkung der Eltern |
| U2-ADR-455 | Schwangerschaft und Weglaufgefährdung als Kennungen (Notfalldatensatz) |
| U2-ADR-456 | FIM-Bezüge: Kennung, Fassung und Status je Depot-Feld |
| U2-ADR-457 | SD-JWT VC mit Selbst-Signatur der Halterin |
| U2-ADR-458 | Die Sprache des IPS-Begleittexts wird beim Export gewählt |
| U2-ADR-459 | Patientenverfügung im Wortlaut der BMJ-Textbausteine, Angabezeilen nach dem Formular |
| U2-ADR-460 | Anfrage per QR — kompakte Transportform und Kurzlink mit Weiterleitung auf die eigene App |
| U2-ADR-463 | Ablage ohne Netz — Passwort aus Wörtern, Zusammenführen, Doppelklick öffnet die Datei |
| U2-ADR-464 | Was eine Depotdatei über ihre Versionen verrät: Einheiten auf 1-KiB-Stufen, Stand-Marke statt Zeitpunkt |
| U2-ADR-466 | Vollmacht und Patientenverfügung im IPS/EPS-Export |
| U2-ADR-467 | Getrennte Namens- und Anschriftsfelder, ohne Raten |
| U2-ADR-468 | ISiK Stufe 6 — Vollmacht und IPS als DocumentReference für das Krankenhaus |
| U2-ADR-473 | Erscheinungsbild im Branding-Modul — Token-Vollständigkeit, Profile, Steckplatz Navigation |

---

## Gestaltung (15 Klassen)

Handkuratierte Namensliste (`DESIGN_KLASSEN` in `tools/faktenbasis-erzeugen.js`) — welche Klassen zu den Design-System-Komponenten gehören, ist keine mechanisch ableitbare Frage. Regel- und Verwendungszahl je Name sind mechanisch aus `vivodepot.html` gelesen, nicht zugeschrieben.

| Klasse | Regeln im Stylesheet | Verwendung außerhalb des Stylesheets |
|---|---|---|
| `.btn` | 36 | 228 |
| `.btn-sek` | 15 | 107 |
| `.btn-dezent` | 5 | 11 |
| `.btn-klein` | 3 | 15 |
| `.btn-notfall` | 2 | 0 |
| `.btn-mini` | 10 | 36 |
| `.karte` | 5 | 68 |
| `.modal` | 19 | 156 |
| `.toast` | 9 | 298 |
| `.banner-stapel` | 2 | 2 |
| `.topbar` | 37 | 2 |
| `.sidebar` | 19 | 5 |
| `.leer` | 3 | 296 |
| `.pause-erlaubnis` | 2 | 3 |
| `.hinweis-box` | 7 | 27 |
