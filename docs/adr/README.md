# ADR-Namensraum — kurz

Zwei disjunkte Nummernräume, unterschieden durch Präfix: **`B16-ADR-NNN`** (alte Linie, im
früheren internen Repo, beendet und eingefroren) und **`U2-ADR-NNN`** (diese Linie, aktiv).

Eine unpräfigierte Referenz in einem vor dem 20.07.2026 entstandenen Dokument meint B16 — U2
ist jünger, die Zuordnung ist damit eindeutig. Neue Referenzen tragen ab sofort immer ein
Präfix. Ein Nachtrag trägt die Nummer des ADRs, auf das er sich bezieht, plus `-Nachtrag` —
kein eigener Nummernschlitz.

Volle Begründung, verworfene Alternative und drei ausdrücklich benannte Zustände (Lücke
U2-ADR-007, U2-ADR-015, U2-ADR-077-Nachtrag): siehe **U2-ADR-090**
(`vivodepot-U2-ADR-090-praefix-benennungsregel-2026-07-20.md`).

## Versionierungs-Regel

- Monotone Nummernfolge, beginnend bei `U2-ADR-001`.
- **Keine `v`-Suffixe.** Wird eine Entscheidung iteriert, bekommt sie eine **neue Nummer** mit explizitem Vorgänger-Verweis; die alte erhält den Nachfolger-Verweis und den Status `Ersetzt durch …`.
- Das ist die bewusste Abweichung vom Produktiv-Vorbild, wo Doppel-Belegungen (v1/v2 auf gleicher Nummer) als Drift entstanden sind.

## Datei-Konventionen

- Eine Datei pro Entscheidung, keine erneute Belegung einer Nummer.
- Header-Block: `# U2-ADR-NNN: Titel`, `**Status:**`, `**Datum:**`, `**Kategorie:**`.
- Implementations-Verweis (Commit-Hash oder Sprint-Bericht), sobald umgesetzt.
- Vorgänger-/Nachfolger-Beziehung explizit nennen; Cross-Referenzen auf den Produktiv-Kanon mit nacktem `ADR-NNN`.
- Ein ADR nennt die Entscheidung, ihre Gründe, Folgen und Prüfungen — nicht, wer entschieden, gemessen, gefunden oder beauftragt hat, und keine beteiligten Arbeitssitzungen (Wortliste `tools/lib/adr-entscheider-muster.js`, gehalten von der Ratsche `tools/oeffentlicher-zuschnitt-spuren-pruefen.js`).

(Beide Abschnitte wortgleich übernommen aus dem abgelösten `vivodepot-U2-INDEX-2026-05-29.md`
— Festlegungen, keine Beschreibungen, darum nicht neu formuliert. Datei aus `docs/adr/`
entfernt, liegt als Zeitzeuge außerhalb des Repos.)

## Interne Quellen in `Grundlage:` und `Bezug:`

Historische ADRs nennen in ihren `Grundlage:`- und `Bezug:`-Feldern zum Teil interne
Arbeitsdokumente, die nicht Teil dieses Repos sind (etwa ein Krypto-Gutachten oder eine frühere
Krypto-Architektur-Fassung). Die Verweise bleiben stehen — sie belegen, worauf die Entscheidung
damals beruhte, und das bleibt wahr, auch wenn die Quelle selbst nicht einsehbar ist. Die
Entscheidungen tragen sich ohne diese Quellen: Was gilt, steht in der ADR selbst, und was davon
geprüft ist, steht im `konformitaet`-Block der Datei (`pruefung:`-Zeile).

## Status je ADR

Vier Zustände: **gilt** (Beleg am Code geführt) · **teilweise überholt** / **überholt** durch ein
anderes U2-ADR · **gegenstandslos** (der Gegenstand existiert nicht mehr) · **ungeprüft** (noch
nicht durchgesehen — ehrlich offen, nicht erfunden). Diese Tabelle wird erzeugt
(`tools/adr-readme-erzeugen.js`), nicht von Hand gepflegt.

**Stand:** 451 Dateien — 372 × gilt · 61 × ungeprüft · 2 × überholt · 2 × überholt (19.09.2026) · 1 × teilweise überholt durch U2-ADR-101 · 1 × teilweise überholt durch U2-ADR-190 · 1 × teilweise überholt durch U2-ADR-136 · 1 × teilweise überholt durch U2-ADR-100 · 1 × überholt durch U2-ADR-050 (E3) · 1 × überholt durch U2-ADR-056 (Einlesen bereich-neutral) · 1 × teilweise überholt durch U2-ADR-059 · 1 × teilweise überholt durch U2-ADR-156 (nur der Mechanismus) · 1 × überholt durch U2-ADR-089 · 1 × teilweise überholt durch U2-ADR-100 (nur Organspende) · 1 × gegenstandslos · 1 × teilweise überholt durch U2-ADR-133 (§8 gebwiz) · 1 × gilt (Block 1) · 1 × teilweise überholt durch U2-ADR-184.

| Nummer | Titel | Status | Datum |
| --- | --- | --- | --- |
| U2-ADR-001 | Eigener ADR-Namensraum für die Umbau2-Linie | gilt | 2026-05-29 |
| U2-ADR-002 | Vereinheitlichter HKDF-pro-Depot-Pfad für den Anker | gilt | 2026-05-29 |
| U2-ADR-003 | Sub-Depot-Passwort-Architektur und Vertrauens-Modus | gilt | 2026-05-29 |
| U2-ADR-004 | Teststrategie — stehende Suite statt Wegwerf-Harness | gilt | 2026-05-29 |
| U2-ADR-005 | Urheberschaft pro Eintrag (Vollmachts-Kette) | gilt | 2026-05-29 |
| U2-ADR-006 | Andock-Architektur — Übergabe rein und raus | gilt | 2026-05-29 |
| U2-ADR-007 | Gesundheits-Sektor — schlank, FHIR über Template | gilt | 2026-05-29 |
| U2-ADR-008 | Propagation — einmal eintragen, überall auswählen | gilt | 2026-05-29 |
| U2-ADR-009 | Template-Architektur — Module, die sich nicht wie Module anfühlen | gilt | 2026-05-29 |
| U2-ADR-010 | Feld-Architektur der generischen Maschine — drei Ebenen, zwei Schichten, codierte Listen, getrennte Render-Schicht | gilt | 2026-05-30 |
| U2-ADR-011 | Auto-Save beim Bereichs-Wechsel — die Pausen-Phrase trägt eine Mechanik | gilt | 2026-05-30 |
| U2-ADR-012 | Situationsblatt-Architektur — eine Wahrheit für Anlässe, generische `sensibel`-Property | teilweise überholt durch U2-ADR-101 | 2026-05-30 |
| U2-ADR-013 | Dokumenten-Mappe — Dateien im Depot, krypto-agnostisch auf der bestehenden Surface | gilt | 2026-05-30 |
| U2-ADR-014 | Was ist ein Dokument? — Die Dokument-Ebene über Feldern und Dateien | gilt | 2026-06-03 |
| U2-ADR-015 | Interner verschlüsselter Arbeitsstand (Zwei-Ebenen-Persistenz, IndexedDB-Senke) — D43 | teilweise überholt durch U2-ADR-190 | 2026-06-12 |
| U2-ADR-016 | kryptoVersion-3-Sprung: Schlüsseltrennung + Legacy-Ausbau | gilt | 2026-06-12 |
| U2-ADR-017 | Identitäts-Name speist Akteur-/Provenienz-Name (Vervollständigung von D37) | gilt | 2026-06-15 |
| U2-ADR-018 | Pflegegrad gehört in Sozialversicherung, nicht in Gesundheit | gilt | 2026-06-18 |
| U2-ADR-019 | Pflegedienst & Pflegegeld nach Sozialversicherung — Auflösung der Sektion pflegegrad-sek | gilt | 2026-06-18 |
| U2-ADR-020 | Rename `vivodepot-clean-slate-kern.html` → `vivodepot.html`; Auflösung der Pages-Drift (Weg 1) | gilt | 2026-06-18 |
| U2-ADR-021 | Rolle am Bezug, nicht an der Person — rollenloses Personen-Register | gilt | 2026-06-18 |
| U2-ADR-022 | Personen-Vereinheitlichung — ein Topf (das Register) + Kinder als Person (C2) | gilt | 2026-06-19 |
| U2-ADR-023 | Rechenbare Datums-Felder + abgeleitete Minderjährigkeit + Kinder-Liste vereinheitlicht | gilt | 2026-06-19 |
| U2-ADR-024 | Export-Auswahl als Opt-in (datensparsam) + Sub-Depot-Akzent-Vererbung an der Wurzel + Auslieferungs-Fix | gilt | 2026-06-19 |
| U2-ADR-025 | Haftungshinweis „Werkzeug, kein Berater" — Fußzeile + Dokument-Fuß (Erst-Eintritt verworfen) | gilt | 2026-06-19 |
| U2-ADR-026 | Sicherheit Block A — Stufe-1-Klartext-Cache (offener Zielkonflikt) + Schlüssel-Extrahierbarkeit bestätigt | gilt | 2026-06-19 |
| U2-ADR-027 | Sicherheit Block B — Passphrase-Stärke-Rückmeldung (hinweisend), Zwang/Empfehlung offen | gilt | 2026-06-19 |
| U2-ADR-028 | Sicherheit Block C — eingehende Verifikation Ebene 3a (signierte Anbieter-Zertifikate) | gilt | 2026-06-19 |
| U2-ADR-029 | Selbst Erfasstes bleibt Freitext — keine Laien-Kodierung (Bürger-Schicht) | gilt | 2026-06-20 |
| U2-ADR-030 | Sozialversicherungs-Sektor — unsignierter SD-JWT-VC-Selbstauskunft-Export (Variante A) | gilt | 2026-06-21 |
| U2-ADR-031 | Persistenz-Ehrlichkeit — Status ≠ Aktion, „gesichert" nur für die Datei | gilt | 2026-06-21 |
| U2-ADR-032 | Begriffe — Dokument, Wizard, Modul, Credential trennen | teilweise überholt durch U2-ADR-136 | 2026-06-22 |
| U2-ADR-033 | Basis-Vorlagen — Umfang, Haltung, Grenzen | teilweise überholt durch U2-ADR-100 | 2026-06-22 |
| U2-ADR-034 | Wiedereintritts-Akteur — beim Entsperren gilt der Inhaber als 'selbst' | gilt | 2026-06-22 |
| U2-ADR-035 | Setup-first — Passwort (Akteur) vor dem ersten Eintrag | gilt | 2026-06-23 |
| U2-ADR-036 | Kind-Verhältnisse — Sorgerecht pro Kind (entdoppelt), Kind-Beziehung-Enum, Selbstauskunft-Invariante | gilt | 2026-06-23 |
| U2-ADR-037 | Gemeinsames selbst-beschreibendes Feld-Modell über die vier Komponenten | gilt | 2026-06-24 |
| U2-ADR-038 | CRL/Widerruf: ablaufbasiertes Vertrauen (Option C) | gilt | 2026-06-24 |
| U2-ADR-039 | Trust-1B Schritt 3: Anbieter-Template-Signatur Pflicht (Ende der additiven Toleranz) | gilt | 2026-06-27 |
| U2-ADR-040 | Basistemplate-Treuhand-Signatur (Option A, geteilter Pfad, tolerant-dann-scharf) | gilt | 2026-06-29 |
| U2-ADR-041 | Bereich „Persönliches" steht immer zuletzt in `SEKTOREN` | gilt | 2026-06-30 |
| U2-ADR-042 | FHIR-Lab-Modul — Laborbericht nach HL7 Europe Laboratory Report; Validator-Anker umgestellt | überholt durch U2-ADR-050 (E3) | 2026-07-01 |
| U2-ADR-043 | Datei-Magic-Bytes — Format-Kennung + Version am Anfang der .vivodepot-Datei (Bau, Option A) | gilt | 2026-07-02 |
| U2-ADR-044 | SHL / xShare (xButton-Auftrag): nicht in v1 — Website-Claim korrigiert | ungeprüft | 2026-07-03 |
| U2-ADR-045 | Autoritative Original-Ablage: extern ausgestellte FHIR-Dokumente verbatim (Datenklasse) | gilt | 2026-07-04 |
| U2-ADR-046 | Rein/Raus-UX: zentrale Sidebar-Türen (Durchstich Gesundheit) + Format-Tag-Korrekturen | überholt durch U2-ADR-056 (Einlesen bereich-neutral) | 2026-07-04 |
| U2-ADR-047 | SHL-Provider (Offline-Teil): JWE-Erzeugung + shlink:/-Payload aus dem autoritativen Original | gilt | 2026-07-04 |
| U2-ADR-048 | eu-hdr (Entlassbrief) auf dem autoritativen Passthrough; Erkenner ehrlich benannt | gilt | 2026-07-04 |
| U2-ADR-049 | IPS (Patientenkurzakte) auf dem autoritativen Verbatim-Passthrough | gilt | 2026-07-04 |
| U2-ADR-050 | Feldmodell-Regel angewandt: E1–E3 (BMI-Hint, Stub-Code-Slots, Laborwerte-Abwicklung) + Verwaisungs-Regel, Schema 25 | gilt | 2026-07-04 |
| U2-ADR-051 | Code-Listen reisen im Template-Vertrag (Reise-als-Daten) + App-Stubs ausgetragen, Schema 26 | gilt | 2026-07-04 |
| U2-ADR-052 | Wortlaut-Findings aus dem iOS/Desktop-Test (04.07.): Speicher-Zusage, Provider-Import, Bereich-Tür, Wizard-Zielbereiche | gilt | 2026-07-04 |
| U2-ADR-053 | Kosmetik-Findings aus dem iOS/Desktop-Test (04.07.): Wizard-Schrift, Sidebar-Aktiv-Bug, Raster, Label-Ausrichtung | gilt | 2026-07-04 |
| U2-ADR-054 | Wizard-Navigation: Abbrechen → Ausgangsbereich (Bug 1), kein Scroll-/Fokus-Sprung (Bug 2), Frage-Titel auf Kern-Größe | gilt | 2026-07-05 |
| U2-ADR-055 | Struktur-Aufräumen „Weitere Möglichkeiten" + Einlese-Dichte: Chooser-Bündelung, Wizard-Aufklappen, Bereichs-Einlese-Guard | gilt | 2026-07-05 |
| U2-ADR-056 | Zentrale „Daten einlesen"-Tür wird bereich-neutral („Wohin einlesen?") | gilt | 2026-07-05 |
| U2-ADR-057 | Zentrale „Daten herausgeben"-Tür wird bereich-neutral („Woraus herausgeben?") | gilt | 2026-07-05 |
| U2-ADR-058 | „Ganzes Depot" in beide Türen; Gesamt-Exporte aus den Einstellungen | teilweise überholt durch U2-ADR-059 | 2026-07-05 |
| U2-ADR-059 | Chooser-Bündel: Fachpfad-Schnitt · Notfall-Stelle · Karte/QR raus aus „Ganzes Depot" | gilt | 2026-07-05 |
| U2-ADR-060 | Angehörigen-Modus: fünf Situationsblätter (Spec-Struktur nach ADR-061v3) | gilt | 2026-07-06 |
| U2-ADR-061 | Datei-Speichern: Web-Share-Blatt nur auf Touch/Standalone (Desktop-WebKit → Download) | gilt | 2026-07-06 |
| U2-ADR-062 | Stufe-2-Vertrauens-Zugang: Owner-Setup + cache-only Angehörigen-Eintritt (ersetzt Option B) | teilweise überholt durch U2-ADR-156 (nur der Mechanismus) | 2026-07-06 |
| U2-ADR-062-Nachtrag | Vertrauens-Zugang — Ort-Hinweis und Passwort-Schranke | gilt | 2026-07-21 |
| U2-ADR-063 | Feldtyp `mehrfachauswahl` (Checkboxen, Array-Wert) + erste Anwendung vollmachtsGrundlage | gilt | 2026-07-06 |
| U2-ADR-064 | Erteilte Vollmachten als `liste`-Record + conditional Sub-Felder (reaktive Modal-Schicht) | überholt durch U2-ADR-089 | 2026-07-07 |
| U2-ADR-065 | Personen-Mehrfachpick (`refMehrfach`) + Umsortier-Controls + Vertretungs-Modus | gilt | 2026-07-08 |
| U2-ADR-066 | Patientenverfügung: BMJ-Textbaustein-Wizard + Dokument-Generator | teilweise überholt durch U2-ADR-100 (nur Organspende) | 2026-07-10 |
| U2-ADR-067 | Vorsorge-Sektor: Darstellung geheilt (Instrument-Gruppierung + Gate-Kopplung) | gilt | 2026-07-10 |
| U2-ADR-068 | Geteilter Dokument-Generator (Modul-Vertrag) · PV als erste Instanz | gilt | 2026-07-11 |
| U2-ADR-069 | KI-Verfügung „Mein digitales Weiterleben" als zweite Generator-Instanz | gilt | 2026-07-11 |
| U2-ADR-070 | Instrument-Modul-Registry: vier leere Module strukturell eingehängt | gilt | 2026-07-11 |
| U2-ADR-071 | Bild C: Vorsorge-Regal + Cross-Sektor-Sichtbarkeit (Weg β, Liste-Projektion) | gilt | 2026-07-11 |
| U2-ADR-072 | Phase 3: Personen-Cluster (skalare Kontakt-Felder → Personen-Liste) + Notfall-QR-Nachzug | gilt | 2026-07-11 |
| U2-ADR-073 | Phase 4: Slot-Cluster (verstreute Slots → Listen) + Abhängige-Zusammenführung + gueterstand-Umzug | gilt | 2026-07-11 |
| U2-ADR-074 | Phase 5: Konten-Liste + Bankvollmacht-Verweis (Record-id) + Import-Umschrift | gilt | 2026-07-11 |
| U2-ADR-075 | Schema-Governance: Lückenlosigkeits-Guard + dokumentierte Leerstellen 20/22 | gilt | 2026-07-12 |
| U2-ADR-076 | FHIR-Narrativ-Renderer in der Mappen-Vorschau (autoritative eu-lab/eu-hdr/ips) + parseXML-Härtung | gilt | 2026-07-12 |
| U2-ADR-077 | Notfall-QR-Kodierung: Klartext → Kontakte-vCard (Option C) | gilt | 2026-07-12 |
| U2-ADR-077-Nachtrag | Nachtrag: der PDF-Selbstverifikations-QR trug dasselbe Leck | gegenstandslos | 2026-07-13 |
| U2-ADR-078 | Rücknahme des passwortlosen Stufe-1-Cache | gilt | 2026-07-12 |
| U2-ADR-079 | Delegierter FHIR-IPS-Export — RelatedPerson + Provenance (Wiedereinbau eines Clean-Slate-Verlusts) | gilt | 2026-07-12 |
| U2-ADR-080 | EUDIW-Nachweise: keine Import-Verifikation — der Fluss kennt keine importierbare Datei | gilt | 2026-07-13 |
| U2-ADR-081 | FHIR-Provenance im IPS-Bundle — auch im Selbst-Fall (letzter Clean-Slate-Verlust) | gilt | 2026-07-13 |
| U2-ADR-082 | Die QR-Kette — proprietäres Rahmenformat, Kamera-Bau (revidiert) | gilt | 2026-07-13 |
| U2-ADR-083 | Chip-Mechanik für Code-Slot-Felder (E1 Option C) | gilt | 2026-07-13 |
| U2-ADR-084 | Supersede: „Multi-Entry ist keine Basis-Form" (für Code-Slot-Chips) | gilt | 2026-07-13 |
| U2-ADR-085 | Institutions-Stufenmodell — Stufe 1 (QR-Scan) gestrichen | gilt | 2026-07-14 |
| U2-ADR-086 | Klasse-4-Datei-Export — Durchreiche, kein Producer | gilt | 2026-07-14 |
| U2-ADR-087 | IPS-Export — eu-eps-Konformität (Procedures + Medical Devices) | gilt | 2026-07-14 |
| U2-ADR-088 | Selbstbezug-Ausschluss — Präzisierung zu ADR-021 | gilt | 2026-07-15 |
| U2-ADR-089 | Vorsorge-Instrument-Liste als gemeinsame Liste | gilt (Block 1) | 2026-07-17 |
| U2-ADR-089-Nachtrag | Block 2 — Gate-Konsumenten auf abgeleitete Instrument-Existenz | teilweise überholt durch U2-ADR-133 (§8 gebwiz) | 2026-07-22 |
| U2-ADR-090 | Präfix- und Benennungsregel für den ADR-Nummernraum | gilt | 2026-07-20 |
| U2-ADR-091 | Persistenz-Trigger für refMehrfach-Widgets | gilt | 2026-07-20 |
| U2-ADR-092 | Reihenfolge der elf Bereiche | gilt | 2026-07-20 |
| U2-ADR-093 | Teardown-Architektur und der Eingangsschirm als Ausgang | gilt | 2026-07-20 |
| U2-ADR-094-Nachtrag | Nachtrag zu B16-ADR-106 — Allowlist wird durchsetzend, Versions-Gate in der Lese-App | gilt | 2026-07-21 |
| U2-ADR-095 | Passwort-Lebenszyklus — Wechsel-Flow und Notfall-Blatt | gilt | 2026-07-21 |
| U2-ADR-096 | Unterfeld-Adressierung für typisierte Listen — Zeile wählen, Feld lesen | gilt | 2026-07-22 |
| U2-ADR-097 | Die produkttragenden Zusicherungen | gilt | 2026-07-23 |
| U2-ADR-098 | Format der Konformitätsklausel | gilt | 2026-07-23 |
| U2-ADR-098-Nachtrag | Die Bindung zwischen ADR und Prüfung | gilt | 2026-07-24 |
| U2-ADR-099 | Reihenfolge des Aufbaus der Prüf-Architektur | gilt | 2026-07-23 |
| U2-ADR-100 | Der Vorsorge-Umbau — ein Ort für Vorsorge-Instrumente | gilt | 2026-07-24 |
| U2-ADR-101 | Feldsätze der Angehörigen-Situationsblätter werden festgelegt | gilt | 2026-07-23 |
| U2-ADR-102 | Was untersagt ist, erscheint auf keinem Anzeige- oder Ausgabepfad als Bedingung | gilt | 2026-07-26 |
| U2-ADR-103 | Teardown-Garantie für Schlüsselmaterial und der Hintergrund-Wipe (Politik A) | teilweise überholt durch U2-ADR-184 | 2026-07-26 |
| U2-ADR-104 | Datenmodell-Block — vier Skalarfelder werden Listen, ein Kontaktfeld wird zwei (Schema 41) | gilt | 2026-07-26 |
| U2-ADR-105 | `dataAbsentReason` für undatierte Prozeduren und Medizinprodukte | gilt | 2026-07-26 |
| U2-ADR-106 | Ein Ort für externe Autoritäten — Validator-Registry und Zusagen-Wächter | gilt | 2026-07-26 |
| U2-ADR-107 | Das Export-Gate deckt beide IPS-Pflichtfelder der Identität | gilt | 2026-07-26 |
| U2-ADR-108 | Je Schema-Sprung eine Probe — und der nächste Bump bringt seine mit | gilt | 2026-07-26 |
| U2-ADR-109 | „Kinder und Schutzbefohlene" sind eine Liste (Schema 42) | gilt | 2026-07-26 |
| U2-ADR-110 | Ein übergebenes Datum wird auch verwendet — keine Realm-Prüfung | gilt | 2026-07-26 |
| U2-ADR-111 | Der Wechselmoment — ein Prädikat, zwei Aufrufer, ein Wächter | gilt | 2026-07-26 |
| U2-ADR-112 | Die STRINGS-Schicht — was durch sie laufen muss, und was nicht | ungeprüft | 2026-07-28 |
| U2-ADR-113 | Das Testament trägt kein Prüfintervall | gilt | 2026-07-29 |
| U2-ADR-114 | Eine Art, die es nicht gibt — sichtbar im Bereich, abwesend in jeder Übersicht | gilt | 2026-07-29 |
| U2-ADR-115 | Die elfte Anlass-Kachel — Umzug | gilt | 2026-07-29 |
| U2-ADR-116 | Vier Freitextfelder werden Institutions-Referenzen (Schema 43) | gilt | 2026-07-29 |
| U2-ADR-117 | Ein Blatt für die Lebenslagen — Bereichsfelder an Ort und Stelle editierbar | gilt | 2026-07-30 |
| U2-ADR-118 | Der ICS-Kalender hängt an den Prüfterminen — Instrument-Datum wird Dokument | gilt | 2026-07-30 |
| U2-ADR-119 | Die Flachfeld-Altlasten im Referenzdepot sind geräumt | gilt | 2026-07-30 |
| U2-ADR-120 | Übergabe und Widerruf sind ein Paar | gilt | 2026-07-30 |
| U2-ADR-121 | ADR — Rechtsraum-Katalog über den Instrument-Typen | gilt | 2026-08-01 |
| U2-ADR-122 | Tod-Übergangs-Architektur — Bevollmächtigung, drei Übergangs-Wege und Anker-Provenance-Snapshot | gilt | 2026-05-18 |
| U2-ADR-123 | Sub-Depot-Selbstbestimmung statt Re-Key-Ceremony | gilt | 2026-08-01 |
| U2-ADR-124 | Depot-Hülle umpacken — Gleichwertigkeit auch am Startseiten-Öffnen-Weg | gilt | 2026-08-04 |
| U2-ADR-125 | Browser-Testfähigkeit ist Voraussetzung für Änderungen am Speicher- und Statusweg | gilt | 2026-08-08 |
| U2-ADR-126 | Schema-Default „zurückhalten" für 97 besonders schützenswerte Felder | gilt | 2026-08-09 |
| U2-ADR-127 | `renderContent()` erhält Scroll und Fokus per Default | gilt | 2026-08-09 |
| U2-ADR-128 | Sensibel-Mechanismus — dritte Adressierungsebene und Situations-Schema-Flag | gilt | 2026-08-09 |
| U2-ADR-129 | Rechtsgrundlagen der Vertretung — ein Katalog statt zwei, gesetzliche Betreuung ergänzt | gilt | 2026-08-09 |
| U2-ADR-130 | Krisenvorsorge wird ein eigenständiger, zwölfter Bereich | gilt | 2026-08-10 |
| U2-ADR-131 | Eine Ausgabeschicht statt vier — der Modul-Vertrag wird Datenvertrag | gilt | 2026-08-10 |
| U2-ADR-132 | pvwiz legt seine Instrument-Zeile selbst an — U2-ADR-100 gewinnt die Kollision mit U2-ADR-066 §3 | gilt | 2026-08-11 |
| U2-ADR-133 | gebwiz legt das Kind an — amendiert U2-ADR-089-Nachtrag §8 für genau einen Assistenten | gilt | 2026-08-11 |
| U2-ADR-134 | Eine fremde Vorlage darf ein Dokument erzeugen — Weg C, Signatur beweist Herkunft, nicht Richtigkeit | gilt | 2026-08-11 |
| U2-ADR-135 | Frühere Namen sind eine Liste, kein zweites Geburtsname-Feld — und der Anlass „Personenstandsänderung" trägt eine eigene Schutz-Auflage | gilt | 2026-08-11 |
| U2-ADR-136 | `verborgenWenn` ist der eine Mechanismus für gegenstandslose Wizard-Schritte — nicht mehr auf kiwiz beschränkt | gilt | 2026-08-11 |
| U2-ADR-137 | Das Schema-Sensibel-Flag ist eine Voreinstellung, keine Sperre — die Bürgerin entscheidet an beiden Stellen | gilt | 2026-08-11 |
| U2-ADR-138 | Ein Dokument kann eine Listen-ZEILE referenzieren, nicht nur ein Listen-FELD — zeilenId, kein Raten | gilt | 2026-08-11 |
| U2-ADR-139 | Die Rentenversicherungsnummer wird ein einziges Feld (Schema 63) | gilt | 2026-08-14 |
| U2-ADR-140 | Vier neue Anlass-Kacheln — Trennung/Scheidung, Verwitwung, Arbeitslosigkeit, Rechtliche Betreuung | gilt | 2026-08-14 |
| U2-ADR-141 | Anzeigetexte liegen in einem austauschbaren Satz, nicht in der Felddefinition | gilt | 2026-08-17 |
| U2-ADR-142 | Institutions-Arten sind von aussen erweiterbar — der fünfte Andockweg | gilt | 2026-08-17 |
| U2-ADR-143 | Die Bereichsliste hat EINE Quelle, und ihr Schlüsselraum ist die ID | gilt | 2026-08-17 |
| U2-ADR-144 | Gültigkeit ist eine Eigenschaft JEDES Feldwerts, auch eines angedockten | gilt | 2026-08-17 |
| U2-ADR-145 | Ein eingelassenes Modul sagt „ich habe es selbst hineingelassen" | gilt | 2026-08-17 |
| U2-ADR-146 | Ein Format-Kanal ist eine Beschreibung, niemals Code | gilt | 2026-08-18 |
| U2-ADR-147 | Ableitungslinie — alles Architektonische in den Kern, Versionen werden abgeleitet | gilt | 2026-08-18 |
| U2-ADR-148 | Ein Ablaufdatum wohnt bei seiner Gültigkeit, nicht im Bereich | gilt | 2026-08-18 |
| U2-ADR-149 | Der Depot-Inhalt zerfällt in Feld-Einheiten — und der Beleg reist mit | gilt | 2026-08-19 |
| U2-ADR-150 | Ein unbekannter Fall wird benannt, nicht angeglichen | gilt | 2026-08-19 |
| U2-ADR-151 | Eine Kennungsform, versionierte Format-Kennungen — und eine Migrationsstufe statt vier | gilt | 2026-08-20 |
| U2-ADR-152 | Die Anfrage von aussen — Beschreibung statt Formular, und ein eigener Schritt statt eines Warnhinweises | gilt | 2026-08-20 |
| U2-ADR-153 | Der verschlüsselte Rückweg — zwei Verfahren, eine Empfängerseite, und ein wiederaufgenommener Zusammensetzer | gilt | 2026-08-20 |
| U2-ADR-154 | Bereiche sind das fünfte Einlass-Register — und ein angedockter Bereich kommt auf dasselbe Blatt | gilt | 2026-08-20 |
| U2-ADR-155 | Ein Leser trägt seine Version — und XML und CSV folgen der Konvention, die JSON schon hat | gilt | 2026-08-20 |
| U2-ADR-156 | Empfängerkreise — ein Empfänger, ein Passwort, ein Zuschnitt | gilt | 2026-08-21 |
| U2-ADR-157 | Ein Modul schlägt vor, die Bürgerin hebt | gilt | 2026-08-21 |
| U2-ADR-158 | Eine Person gilt als verstorben — und das löst das Ereignis „Tod" aus | gilt | 2026-08-21 |
| U2-ADR-159 | Kein Feld, das Geheimnisse aufnimmt, ohne `autocomplete="off"` UND explizites Räumen beim Laden | gilt | 2026-08-22 |
| U2-ADR-160 | Der Bereichssatz wird Dateieigenschaft — Weglassen, nicht Umbelegen | gilt | 2026-08-22 |
| U2-ADR-161 | Die zwanzig Korb-1-Felder werden mehrwertig — neun Listen statt zwanzig Skalare | gilt | 2026-08-22 |
| U2-ADR-162 | Der Rechtsraum kommt in den Textsatz-Schlüssel — Sprache und Rechtsraum zusammen | gilt | 2026-08-23 |
| U2-ADR-163 | Fünf Register, eine Form — `bereiche` wird Objekt wie `arten`/`typen` | gilt | 2026-08-23 |
| U2-ADR-164 | Modul-Beschriftungen je Sprache — `beschriftungen` additiv neben `label` | gilt | 2026-08-23 |
| U2-ADR-165 | Zwei Fassungen desselben Depots zusammenführen — Erkennen und Zusammenführen, beides v1 | gilt | 2026-08-23 |
| U2-ADR-166 | Die Lese-App trägt die Textsatz-Regeln — und nur die zwei, die auch der Kern anwendet | gilt | 2026-08-23 |
| U2-ADR-167 | Ändert eine Institution den vorgeschlagenen Prüf-Rhythmus, sagt die Feldzeile es leise | gilt | 2026-08-23 |
| U2-ADR-168 | Rücknahme einer Modul-Vorlage — sehen, wer sie brachte; Werte leeren, Struktur behalten | gilt | 2026-08-23 |
| U2-ADR-169 | Der Bereichssatz bekommt seinen ersten Aufrufer — Auswahl im Anker-Anlage-Dialog | überholt | 2026-08-23 |
| U2-ADR-170 | Eine unbekannte Feld-Eigenschaft wird generator-seitig gemeldet, kern-seitig abgewiesen | gilt | 2026-08-23 |
| U2-ADR-171 | Sidebar-Navigation gruppiert sich in fünf Themen-Cluster, kollabierbar | gilt | 2026-08-25 |
| U2-ADR-172 | Die Zwischenstufe — ein Ausgabe-Schlüssel zwischen Anker und Kunde | gilt | 2026-08-25 |
| U2-ADR-173 | Notfall-Widerruf — ein schmaler, schneller Weg für die Sperrliste, getrennt vom Feature-Release | gilt | 2026-08-25 |
| U2-ADR-174 | Bottom-Tab-Navigation mobil — vier Tabs als Schnellzugriff neben dem Hamburger, Desktop bleibt Sidebar | gilt | 2026-08-25 |
| U2-ADR-175 | Statuskarten (`.feldgruppen-karte`) sind das Leitmuster für jede Feldgruppe — vollständige Migration beschlossen | gilt | 2026-08-27 |
| U2-ADR-181 | Vertrauensstufen für Module — `vivodepot/kern` und `vivodepot/pruefstelle` auf derselben Kette | gilt | 2026-08-27 |
| U2-ADR-182 | Vor-Depot-Konfiguration — jeder Modultyp als signiertes Modul, die App-Datei bleibt für alle gleich | gilt | 2026-08-28 |
| U2-ADR-183 | SHL-Ablage-Host: eigener, netzloser Zwei-Seiten-Weg (U2-ADR-047 Zone 2) | ungeprüft | 2026-08-28 |
| U2-ADR-184 | Hintergrund-Wipe — Gnadenfrist vor Politik A + Bildschirm-Zusicherung | gilt | 2026-08-31 |
| U2-ADR-185 | Sperrschirm statt Eingangsschirm nach dem Hintergrund-Wipe | gilt | 2026-09-01 |
| U2-ADR-186 | Ein gekauftes Modul bleibt im Bestand nutzbar — Widerruf wirkt am Einlass, nicht im Depot | gilt | 2026-09-01 |
| U2-ADR-187 | Bereichs-Identität überlebt das Verwaisen | gilt | 2026-09-01 |
| U2-ADR-188 | Die Registry folgt data | gilt | 2026-09-01 |
| U2-ADR-189 | Ein vor dem Depot angedocktes Sprachmodul wird vererbt | gilt | 2026-09-01 |
| U2-ADR-190 | Bedingtes skipWaiting — präzise statt pauschale Anwendung von U2-ADR-015 Etappe 8 | gilt | 2026-09-01 |
| U2-ADR-193 | BBK-Quellenangabe — aktueller Stand statt veralteter Auflage | gilt | 2026-09-01 |
| U2-ADR-194 | Eine index.html je Ausliefer-Verzeichnis, die auf das eigene vivodepot.html weiterleitet | gilt | 2026-09-01 |
| U2-ADR-195 | Ein einmal gelernter Begriff bedeutet überall dasselbe | gilt | 2026-09-01 |
| U2-ADR-196 | Ein Verweis auf eine Bedienstelle nennt sie, wie sie dasteht | gilt | 2026-09-01 |
| U2-ADR-197 | Aussage-Prüfung-Abgleich — folgt die Aussage wirklich aus der Probe? | gilt | 2026-09-01 |
| U2-ADR-199 | Organspende-Register — ein Feld für die Eintragungs-ID, kein Hinweistext | gilt | 2026-09-01 |
| U2-ADR-201 | Datengestalten — die E2E-Suite lebt die Vertretungswege, nicht nur die Standardgestalt | gilt | 2026-09-01 |
| U2-ADR-202 | Die Live-Sichtbarkeits-Verdrahtung im Listen-Eintrag-Modal kennt `verborgenWenn` | gilt | 2026-09-01 |
| U2-ADR-206 | Das Signier-Werkzeug merkt sich die zwei stehenden Pfade — nie den Inhalt, nie die Passphrase | gilt | 2026-09-01 |
| U2-ADR-207 | Ein Vor-Depot-Sprachmodul übersteht ein fremdes Depot | gilt | 2026-09-02 |
| U2-ADR-208 | Eine Sprachkennung ohne eigene Modul-Regel fällt auf die aktive Sprache zurück, nicht auf Deutsch | gilt | 2026-09-02 |
| U2-ADR-209 | Produkt-Trennung im geteilten internen Speicher (Record-Kennung, nicht Datenbankname) | gilt | 2026-09-02 |
| U2-ADR-211 | Sicherungsstand bekannt — persistiert statt Arbeitsspeicher-Variable | gilt | 2026-09-02 |
| U2-ADR-212 | der Sichern-Knopf folgt dem Speicher-Modus — intern, wenn intern möglich | gilt | 2026-09-02 |
| U2-ADR-213 | PBKDF2 statt Argon2id — gemessen, nicht nur vermutet | gilt | 2026-09-02 |
| U2-ADR-214 | Ein benannter, ADR-gedeckter Schalter hebt den sw.js-Wächter auf — und ein Abbruch nimmt vollständig zurück | gilt | 2026-09-02 |
| U2-ADR-215 | Der Schalen-Lockstep-Wächter prüft den ausgelieferten Dateisatz, nicht nur zwei von vier Dateien | gilt | 2026-09-03 |
| U2-ADR-216 | Fremd ausgestellte Nachweise halten — bewusst offene Option | gilt | 2026-09-02 |
| U2-ADR-217 | Format-Tags in Lese-App und Bürger-App-Spezifikation nachgezogen | gilt | 2026-09-02 |
| U2-ADR-218 | Die `.vdkey`-Hüllenschicht kommt unter denselben Wächter wie der Kryptokern | gilt | 2026-09-02 |
| U2-ADR-219 | der plattformabhängige Sicherungs-Hinweis bleibt bei iOS — Android und Schreibtisch-Safari bekommen den bestehenden, plattformunabhängigen Hinweis | gilt | 2026-09-03 |
| U2-ADR-220 | der Sicherungsdatei-Namens-Hinweis verspricht nicht mehr, was er nicht halten kann | gilt | 2026-09-02 |
| U2-ADR-221 | Barrierefreiheits-Sichten-Lücke geschlossen (Verwaltungs-Liste + Entsiegeln-Dialog) — und die Serif-Ausnahme dokumentiert | gilt | 2026-09-02 |
| U2-ADR-222 | ein leeres Depot ist keine Sicherung | gilt | 2026-09-02 |
| U2-ADR-223 | Die Datei ist das Depot — der interne Speicher ist ein Zwischenspeicher | gilt | 2026-09-02 |
| U2-ADR-224 | Boot-Wettlauf behoben — der vorDepot-Zweig überschreibt den bereits gezeigten Passwort-Eintritt nicht mehr | gilt | 2026-09-02 |
| U2-ADR-225 | Feste Temp-Dateinamen ersetzt — Eindeutigkeit schließt den Prozess ein | gilt | 2026-09-03 |
| U2-ADR-226 | die Klausel→Probe-Bindung prüft eindeutig UND vollständig, nicht nur die erste Zeile | gilt | 2026-09-03 |
| U2-ADR-227 | `_signJWS` kommt unter den Hüllenschicht-Wächter — die Signierfunktion selbst wird ein bewachter Verbatim-Träger | gilt | 2026-09-03 |
| U2-ADR-228 | die Suite-Zahl in erzeugten Dokumenten kommt aus den von Git getrackten Testdateien, nicht aus Nodes eigener Dateisuche | gilt | 2026-09-03 |
| U2-ADR-229 | Die Prüfsumme der ausgelieferten Datei wird bewacht, nicht gepflegt | gilt | 2026-09-03 |
| U2-ADR-230 | Krypto-Stärkeparameter ändern sich nur über einen Sprung der `kryptoVersion` — nie an Ort und Stelle | gilt | 2026-09-03 |
| U2-ADR-231 | die Ganzkette läuft am Stück — jetzt mit vollem Feldbestand geprüft, nicht nur mit fünf Sentinels | gilt | 2026-09-03 |
| U2-ADR-232 | Jeder git-Unterprozessaufruf gegen ein fremdes Arbeitsverzeichnis streift GIT_* ab | gilt | 2026-09-03 |
| U2-ADR-233 | Original-Bytes bleiben roh, Erkennung bleibt dekodiert | gilt | 2026-09-03 |
| U2-ADR-235 | der Sub-Depot-Umschlag wird je Kryptoversion vollständig geprüft und versionsecht zurückgeschrieben | gilt | 2026-09-03 |
| U2-ADR-236 | Rahmen folgt Kontext — Sub-Depot-Farbe von Rand statt Fläche nachgezogen | gilt | 2026-09-03 |
| U2-ADR-237 | Jede Änderung sichert still intern — die Datei wird eine eigene, seltene Sicherungskopie | gilt | 2026-09-03 |
| U2-ADR-238 | Depot-Pillen-Menü schließt nicht mehr über den Fokus als Stellvertreter | gilt | 2026-09-03 |
| U2-ADR-241 | Export-Übersicht — Topf-B-Lücken bei geteilten Mapping-Tabellen und bei eigenständigen Bedienwegen | gilt | 2026-09-03 |
| U2-ADR-243 | Pro-Modul, vollständiger Feldsatz — sechs Bereiche, angedockt | gilt | 2026-09-03 |
| U2-ADR-244 | Das Anlegen selbst braucht keinen Speicherort mehr | gilt | 2026-09-03 |
| U2-ADR-245 | Ein `logikModul` braucht ein ausdrückliches Recht auf ein sensibles Feld — kein stillschweigendes | gilt | 2026-09-04 |
| U2-ADR-246 | Situationen werden andockbar — das achte Einlass-Register | gilt | 2026-09-04 |
| U2-ADR-247 | Anzeige erfährt Zustandsänderung — Sichern-Knopf-Klick und Statuskarte | gilt | 2026-09-01 |
| U2-ADR-248 | Der Erbschein-Vorbereitungsauszug las `kinder` aus dem falschen Sektor — auf beiden Lesepfaden | gilt | 2026-09-04 |
| U2-ADR-249 | Die `.vdkey`-Hülle bekommt eine Versions-Allowlist — die Ableitung bleibt unangetastet | gilt | 2026-09-04 |
| U2-ADR-250 | Assistenten werden andockbar — das neunte Einlass-Register | gilt | 2026-09-04 |
| U2-ADR-251 | Ereignis-Achse wird andockbar — das zehnte Einlass-Register | gilt | 2026-09-04 |
| U2-ADR-252 | Ein vor dem Depot angedocktes Modul übersteht die Depot-Anlage — auf beiden Schichten | gilt | 2026-09-04 |
| U2-ADR-253 | Bürgerdepot wird Modul — Commit A: die Konsumenten werden entkoppelt | gilt | 2026-09-04 |
| U2-ADR-254 | ADR — Rechtsraum-Vorbelegung: Vorschlagswert statt hartem DE, an zwei Stellen | gilt | 2026-09-04 |
| U2-ADR-255 | Ausgabeformat/Rechtsraum-Kopplung — additiv, zwei Formate, ein Gate | gilt | 2026-09-04 |
| U2-ADR-256 | Namens-Anzeigereihenfolge kommt vom Menschen, nicht von Sprache oder Rechtsraum | gilt | 2026-09-04 |
| U2-ADR-257 | `FORMAT_SCHREIBER` — die Schreibseite der Format-Module | gilt | 2026-09-04 |
| U2-ADR-258 | Die Herkunft eines Moduls erreicht den Empfänger — im Artefakt, nicht nur in der Anzeige | gilt | 2026-09-04 |
| U2-ADR-259 | Jedes erzeugte Dokument sagt, aus welchem Stand es stammt | gilt | 2026-09-04 |
| U2-ADR-260 | Zwei Fehler, die in jeder ausgelieferten Kopie mitreisen — der Transparenz-Link ohne Ziel und die Sprachdeklaration, die dem Schalter statt der Sprache folgte | gilt | 2026-09-04 |
| U2-ADR-262 | Handkopien von Kern-Konstanten bekommen einen Wächter | gilt | 2026-09-04 |
| U2-ADR-263 | Der PDF-Export prüft die Schriftdeckung, bevor er ein Zeichen zeichnet | gilt | 2026-09-04 |
| U2-ADR-266 | Nach dem ersten Datei-Sichern erfährt die Bürgerin, dass die Datei verschlüsselt ist | gilt | 2026-09-04 |
| U2-ADR-267 | Ein Modul-Einlass ist unumkehrbar — und niemand sagte es vorher | gilt | 2026-09-04 |
| U2-ADR-269 | Das Rollen-Vokabular gebaut — vier Rollen, erste Listenzeilen-Form | gilt | 2026-09-04 |
| U2-ADR-270 | `module/` fällt bereits unter Schicht 1 (EUPL-1.2) — kein Lizenztext nötig | überholt (19.09.2026) | 2026-09-04 |
| U2-ADR-273 | Der Abbruch beendet die Prozeßgruppe, nicht nur den Wartenden | gilt | 2026-09-04 |
| U2-ADR-274 | institutionsArt — die Auszugs-Fähigkeit bewiesen, der native Bestand unangetastet | gilt | 2026-09-04 |
| U2-ADR-275 | INSTITUTION_ART_EINGEBAUT wird fest verdrahtet statt abgeleitet | gilt | 2026-09-04 |
| U2-ADR-276 | Ein Golden-Master für die Ausgabewege des Bürgerdepots — das Netz vor dem Gerüst-Umbau | gilt | 2026-09-05 |
| U2-ADR-278 | Die Sprachkennung folgt jetzt auch dem Rechtsraum-Fach, nicht nur dem Modul | gilt | 2026-09-05 |
| U2-ADR-279 | `vorsorge_instrumente` über die Rolle `instrumenteListe`, nicht über den Feldnamen | gilt | 2026-09-05 |
| U2-ADR-280 | Kein Prüfer stellte fest, ob eine ausgelieferte Datei überhaupt Code ist | gilt | 2026-09-05 |
| U2-ADR-282 | Die Erste-Partei-Zone — native Feld-Bezeichner ohne den `tpl_`-Zwang | gilt | 2026-09-05 |
| U2-ADR-284 | ADR — Stellensatz: eine Bezugsstelle, die mit dem Rechtsraum reist | gilt | 2026-09-05 |
| U2-ADR-285 | "DE"/'de' bleiben für Fremde reserviert — ein Gerüst-eigener Ladeweg darf sie tragen | gilt | 2026-09-05 |
| U2-ADR-287 | Was ein Template ist — und der erste Fall auf dem Pro-Modul | gilt | 2026-09-05 |
| U2-ADR-288 | Byte-Gleichheit war bewiesen, Erreichbarkeit nie — der Erbschein-Vorbereitungsauszug wird ab Werk eingelassen | gilt | 2026-09-05 |
| U2-ADR-289 | Vivodepot Pro ist angedockt und provisioniert; signierfertig braucht ein eigenes Werkzeug, nicht das der Fremden | gilt | 2026-09-05 |
| U2-ADR-290 | Ein Modul darf sein eigenes Feld nicht nur benennen, sondern auch erklären | gilt | 2026-09-05 |
| U2-ADR-291 | Das Bürgerdepot wird in vier Module geschnitten — Struktur, Sprache, Recht, Marke | gilt | 2026-09-05 |
| U2-ADR-292 | Der Ladeweg auf die Erste-Partei-Zone — Struktur ersetzbar, alle dreizehn Sektoren bewiesen | gilt | 2026-09-05 |
| U2-ADR-293 | Das englische Sprach-Modul — Struktur-Invarianz bewiesen, eine veraltete Auslieferung gefunden | gilt | 2026-09-05 |
| U2-ADR-294 | Zehn-Register-Nachlese — der fehlende Wirkungsbeweis fürs Assistenten-Register nachgezogen | gilt | 2026-09-05 |
| U2-ADR-295 | Drittes Template, wieder auf dem Pro-Modul — Geschäftsführerin, Vertretung/Nachfolge/Notfall | gilt | 2026-09-05 |
| U2-ADR-296 | Vivodepots eigene Marke wird ein Datenwert; ein fremder Beitrag im Bürgerdepot trägt einen Rand | gilt | 2026-09-05 |
| U2-ADR-297 | Ein Produkt mit Vor-Depot-Konfiguration füllt die Kopfzeile mit der Institutionsfarbe — Fall 2 aus U2-ADR-296 | gilt | 2026-09-05 |
| U2-ADR-298 | Zwei vorbestehende E2E-Rotläufe, beide Nachwirkung von U2-ADR-288 | gilt | 2026-09-05 |
| U2-ADR-299 | Der Produktabnahmebeweis, Kern-Seite — Struktur/Feld-Definitionen/Textsatz gegen das ECHTE Bündel | gilt | 2026-09-05 |
| U2-ADR-300 | Der Produktabnahmebeweis, E2E-Seite — PDF-Modelle/Exportkanäle/Datei-Rundlauf gegen das ECHTE Bündel, im echten Browser | gilt | 2026-09-05 |
| U2-ADR-301 | Der Erzeuger um Situationen und Assistenten erweitert — und ein Riegel gefunden, der bei Sektoren nicht steht | gilt | 2026-09-05 |
| U2-ADR-302 | Der Produktabnahmebeweis, Branding-Achse — E2E, im echten Browser | gilt | 2026-09-05 |
| U2-ADR-303 | Der Aufrufer statt des Riegels — das mitgelieferte Bündel kommt über das Gerüst, nicht über den Einlass | gilt | 2026-09-05 |
| U2-ADR-304 | Die Landkarte vor E4 — was umfällt, wenn `SEKTOREN` quelltextlich leer ist | gilt | 2026-09-05 |
| U2-ADR-305 | Der Situations-Befund in ADR-301 war zur Hälfte falsch — korrigiert, plus ein `hinweis`-Feld, das dieselbe Verwechslung künftig verhindert | gilt | 2026-09-05 |
| U2-ADR-306 | buergermodulWizardErsetzen — das dritte Gegenstück, für die Assistenten-Achse (WIZARDS) | gilt | 2026-09-06 |
| U2-ADR-307 | Die Rechtsraum-Überlagerung für Feld-Fristen — und die drei Regeln, die mein eigener Schnitt nie besucht hat | gilt | 2026-09-05 |
| U2-ADR-308 | buergermodulSituationErsetzen — das Gegenstück zu buergermodulSektorErsetzen für die Situations-Achse | gilt | 2026-09-05 |
| U2-ADR-309 | Der zweite Rechtsraum — die Mechanik ist bewiesen, das Recht bleibt offen | gilt | 2026-09-05 |
| U2-ADR-310 | Der Produktabnahmebeweis, E4-Bündel-Seite | gilt | 2026-09-05 |
| U2-ADR-311 | Zwei benannte Grenzen aus ADR-292 geschlossen — Options-Schnappschuss behoben, Gültigkeitsvorschlag in Arbeit | gilt | 2026-09-05 |
| U2-ADR-312 | SEKTOREN leer, ohne Sturz — WIZARDS bindet auf Lesezeit, nicht auf Auswertungszeit | gilt | 2026-09-05 |
| U2-ADR-313 | Der Produktabnahmebeweis, E4-Assistenten-Interaktion — und ein stiller schwerer Fund | gilt | 2026-09-05 |
| U2-ADR-314 | Der Gültigkeits-Vorschlag kommt aus dem Rechtsraum — das Modul trägt die Zahl, der Kern rechnet | gilt | 2026-09-06 |
| U2-ADR-315 | `hooks/pre-push` prüft Stand-Zahlen und Faktenbasis eigenständig, nicht nur über pre-commit | gilt | 2026-09-06 |
| U2-ADR-316 | Ein Werkzeug für die Standzahl — es verkleinert das Fenster, es schließt es nicht | gilt | 2026-09-06 |
| U2-ADR-317 | Die Deckung des Bündel-Erzeugers — acht Verweise waren gemeint, hundertneun sind es | gilt | 2026-09-06 |
| U2-ADR-318 | Die Deckung der drei übrigen Achsen — Sprache, Rechtsraum, Marke | gilt | 2026-09-06 |
| U2-ADR-319 | Ein Bereich entsteht aus dem Bündel — und die Erlaubnisliste stand auf dem, was weicht | gilt | 2026-09-06 |
| U2-ADR-320 | Der native Bereichsbestand verlässt die Datei — das Bündel ist die einzige Quelle | gilt | 2026-09-06 |
| U2-ADR-321 | Die Abnahme gegen das AUSGELIEFERTE Nativ — A==B gegen einen eingefrorenen Commit statt gegen den eigenen Arbeitsbaum | gilt | 2026-09-06 |
| U2-ADR-322 | Jeder Text-Träger löst in den Textsatz auf — und der Wächter läuft den Bestand ab, nicht die Ortsliste | gilt | 2026-09-06 |
| U2-ADR-323 | Angedockte Bereiche erreichen den Empfänger — die Lese-App meldet an, statt zu kennen | gilt | 2026-09-06 |
| U2-ADR-324 | Eine Probe, die den nativen Bestand maß und Robustheit versprach | gilt | 2026-09-06 |
| U2-ADR-325 | `listenfeldAlle` erreicht die Lese-App — und die Typliste kommt aus einer Quelle | gilt | 2026-09-06 |
| U2-ADR-326 | Das Auszugs-Tor wird generisch — und `zugang-zum-recht` bekommt seinen zweiten Zweck | gilt | 2026-09-06 |
| U2-ADR-329 | Die E2E-Suite kehrt in den pre-push zurück — vier Wochen ohne Netz | gilt | 2026-09-06 |
| U2-ADR-330 | Teil 0 — der Beratungshilfe-Auszug führt die Personen-Angaben mit | gilt | 2026-09-06 |
| U2-ADR-331 | Ein Satz über den eigenen Zustand ist kein Inhalt — kein Modul überschreibt ihn | gilt | 2026-09-06 |
| U2-ADR-332 | Das Regal hat keinen Bereichsfilter — und der Wächter, der das offenhält | gilt | 2026-09-06 |
| U2-ADR-333 | Die Wortlaute der Vorsorge-Dokumente werden überschreibbar — und was dabei fehlt, wird gezählt | gilt | 2026-09-06 |
| U2-ADR-334 | Die Beschriftung eines angedockten Bereichs erreicht den Empfänger in seiner Sprache | gilt | 2026-09-06 |
| U2-ADR-334-Nachtrag | Erfinden verboten, Übersetzen erlaubt | gilt | 2026-09-07 |
| U2-ADR-335 | Die Lese-App liest, sie prüft nicht — kein „geprüft" aus einem Depot-Feld | gilt | 2026-09-06 |
| U2-ADR-336 | Vier reservierte Klassennamen — und die Lücke, die eine Umbenennung offenließ | gilt | 2026-09-06 |
| U2-ADR-337 | Das englische Sprachmodul bekommt einen `regeln`-Kopf — Währung bleibt am Rechtsraum, nicht an der Sprache | gilt | 2026-09-06 |
| U2-ADR-338 | VOLLMACHT_BMJ bekommt einen Schlüssel-Weg — der Ort ist da, kein englischer Wortlaut | gilt | 2026-09-06 |
| U2-ADR-339 | Der Design-Namensraum bekommt eine Typprüfung statt einer Namensliste | gilt | 2026-09-06 |
| U2-ADR-340 | Ein Design darf keine Warnung ausblenden — die Zusicherung misst das Ergebnis, nicht den Weg | gilt | 2026-09-06 |
| U2-ADR-341b | (A1b) · SITUATIONEN sind real ins Bündel umgezogen — der native Block ist leer | gilt | 2026-09-06 |
| U2-ADR-341 | Optionen aus einer Situation gehören hinter die Bündel-Anwendung, nicht in ein Literal davor | gilt | 2026-09-06 |
| U2-ADR-342 | Der Beleg bleibt im Depot — und zwei Klassen von Lesern sehen verschiedene Dinge | gilt | 2026-09-06 |
| U2-ADR-343 | Die 39 amtlich übernehmbaren Wortlaute — mechanisch gegen die BMJ-Formulare belegt | gilt | 2026-09-06 |
| U2-ADR-344 | Die drei amtlichen BMJ-Dokumente verlassen den nativen Block | gilt | 2026-09-06 |
| U2-ADR-345 | Die vier Dokumentmodule + STANDARD_VORLAGEN wandern ins eingebettete Bündel | gilt | 2026-09-06 |
| U2-ADR-346 | (A2) · Fünf WIZARDS sind real ins Bündel umgezogen — pvwiz/kiwiz kommen über U2-ADR-344, auf einem eigenen Weg | gilt | 2026-09-06 |
| U2-ADR-347 | Die SITUATIONEN der Lese-App sind eine erzeugte Kopie mit Prüfung | überholt | 2026-09-07 |
| U2-ADR-348 | (vorläufig — Nummer beim Landen zu bestätigen) · Struktur-Achse: Tausch statt Ergänzung | überholt (19.09.2026) | 2026-09-07 |
| U2-ADR-349 | Die Lese-App erkennt ihre eigenen Sektor-/Feld-Beschriftungen als übersetzbar | gilt | 2026-09-07 |
| U2-ADR-350 | Der Nachtmodus-Selektor-Wächter: Struktur statt Handarbeit | gilt | 2026-09-07 |
| U2-ADR-351 | Der Kanal für Schriftgrad-Rollen — geöffnet, nicht bewiesen | gilt | 2026-09-07 |
| U2-ADR-352 | (E1, Teil 1) · RECHTSRAUM_KATALOG ist real ins Bündel umgezogen — die Einlass-Reservierung für "DE" bleibt unangetastet | gilt | 2026-09-07 |
| U2-ADR-353 | Die zwei Ab-Werk-Vorlagen bekommen Textsatz-Kennungen — lokal, kein Präzedenzfall | gilt | 2026-09-07 |
| U2-ADR-354 | Templates bekommen ihren Ort — „Weitere Bereiche" als eigenes Verzeichnis, kein vierzehnter Bereich | gilt | 2026-09-07 |
| U2-ADR-356 | Reine Dokument-Commits laufen ohne die volle Behavior-Suite | gilt | 2026-09-07 |
| U2-ADR-357 | Die Lese-App zeigt die zwei Ab-Werk-Vorlagen übersetzbar — Geschwister zu 353, nicht Nachtrag zu 349 | gilt | 2026-09-07 |
| U2-ADR-358 | Der vierte Träger — `faktenbasis-erzeugen --ohne-suite` + `ableitungen:build` | gilt | 2026-09-07 |
| U2-ADR-359 | Deutsch wird ein Sprachmodul, wie Englisch — Zug 1: heben, nicht abschaffen | gilt | 2026-09-07 |
| U2-ADR-360 | `faktenbasis-erzeugen.js` erkennt Import-Wege auch ohne `parse` | gilt | 2026-09-07 |
| U2-ADR-361 | Vier Produkte, ein Gerüst — `produkt-konfektionieren.js` | gilt | 2026-09-07 |
| U2-ADR-362 | Branding anschließen — `name`/`domain` erreichen die Bürgerin | gilt | 2026-09-07 |
| U2-ADR-363 | Der Rückfall auf Deutsch verlässt textLesen() — Zug 2 | gilt | 2026-09-07 |
| U2-ADR-364 | Nur lateinische Schrift im deutschen Sprachmodul — ein Beispiel getauscht, ein Wächter dauerhaft | gilt | 2026-09-07 |
| U2-ADR-366 | Die Ausgabe wird zur Antwort auf ein benanntes Template — Schema-Bindung zuerst, Orchestrierung und Zeitachse beschrieben, nicht gebaut | ungeprüft | 2026-09-07 |
| U2-ADR-367 | `TEXTSATZ_EINGEBAUT` wird das deutsche Sprachmodul selbst — Zug 3, Besitz-Zug | gilt | 2026-09-07 |
| U2-ADR-368 | Rechtsraum DE wird ein Modul, wie Sprache — Zug 1: heben und verdrahten, nicht umschalten | gilt | 2026-09-07 |
| U2-ADR-369 | Der umgedrehte Wächter 3 — eine benannte Erlaubnisliste für das Deutsch-Leck | gilt | 2026-09-08 |
| U2-ADR-370 | 'modul' als Prüftermin-Quelle — ein Template kann eine periodische Prüfpflicht mitbringen | gilt | 2026-09-08 |
| U2-ADR-371 | Zwei gebeugte Literale — generisches „Depot" statt Marke, nicht `{marke}` | gilt | 2026-09-08 |
| U2-ADR-372 | Die vier Produkte gegen v515 — A==B über den echten Öffnen-Weg, kein Sektor-Byte-Vergleich | gilt | 2026-09-08 |
| U2-ADR-373 | „Annahme" ist der Einlass — der Modul-Prüftermin entsteht mit ihm und ist danach abschaltbar, nicht löschbar | ungeprüft | 2026-09-08 |
| U2-ADR-374 | Bestands-Wächter statt Muster-Wächter — gebeugte Marke-Literale | gilt | 2026-09-08 |
| U2-ADR-375 | der zweite Einlass zieht das Intervall nach — außer die Bürgerin hat abgeschaltet | ungeprüft | 2026-09-08 |
| U2-ADR-377 | sprechende Dateinamen für die vier Produkte + die vierzeilige Erklärdatei | gilt | 2026-09-08 |
| U2-ADR-378 | der Sichtbarkeitswächter für die vier Produkte — umgedreht, damit er niemanden sperrt | gilt | 2026-09-08 |
| U2-ADR-379 | das Pro-Bereichs-Modul wird ein ausgeliefertes Artefakt — "Modul Pro" war zwei Module, nicht eins | gilt | 2026-09-08 |
| U2-ADR-380 | Tote Ausnahmen sind ein Befund, kein Ordnungsfimmel | gilt | 2026-09-08 |
| U2-ADR-381 | xShare in der v515-Vier-Produkte-Abnahme nachgeholt | gilt | 2026-09-08 |
| U2-ADR-382 | Rechtsraum Deutschland wird ein Modul, wie Sprache — Besitz-Zug | gilt | 2026-09-08 |
| U2-ADR-383 | der Baukasten bekommt eine Abnahme seiner eigenen Zusammensetzung — die Modul-Tabelle als Daten, nicht als Code | gilt | 2026-09-08 |
| U2-ADR-384 | Vivodepots eigene Marke wird Ab-Werk-Saat — konfektionieren ist nicht einlassen | gilt | 2026-09-08 |
| U2-ADR-385 | Grundlinie: die vier Produkte gegen Lese-App und VC-Issuer | gilt | 2026-09-08 |
| U2-ADR-386 | "ein fünftes Produkt ist eine Zeile an einem Ort" wird ein Mechanismus, kein Satz im ADR | gilt | 2026-09-08 |
| U2-ADR-387 | Die Ab-Werk-Rangfolge für logikModul, und der gemeinsame Wächter darüber | gilt | 2026-09-08 |
| U2-ADR-388 | UX/Erscheinung ist gemessen vollständig — kein Artefakt aus sachlichem Grund | gilt | 2026-09-08 |
| U2-ADR-396 | Die KI-Verfügung wird selbst übersetzt: Vivodepot ist hier Autor, nicht Träger | gilt | 2026-09-08 |
| U2-ADR-398 | Das gekündigte Zimmer: eingebackene Struktur reist als Mitschrift mit der Datei | gilt | 2026-09-08 |
| U2-ADR-399 | `feld.<feldId>.vorschlaege` nimmt die Trägerkette auf — gemessen, nicht blind übernommen | gilt | 2026-09-06 |
| U2-ADR-400 | White Label — Reichweite bis ins PDF, EIN Herkunftsort (Nummer beim Landen zu bestätigen) | gilt | 2026-09-10 |
| U2-ADR-401 | Achsen-Verriegelung — exklusive Achsen schlagen an, statt still zu überschreiben (Nummer beim Landen zu bestätigen) | gilt | 2026-09-11 |
| U2-ADR-402 | Vollimport — acht Schlüssel bleiben draußen, weil sie DIESER Datei gehören, nicht der Bürgerin (Nummer beim Landen zu bestätigen) | gilt | 2026-09-11 |
| U2-ADR-404 | Provisionierung mit K9/Weg C verdrahtet — plus ein gefundener Bestandsfehler | gilt | 2026-09-12 |
| U2-ADR-405 | Zutaten-Prüfsumme gegen das Rezeptbuch im Schwesterrepo | gilt | 2026-09-12 |
| U2-ADR-406 | `produktTextErzeugen` in den Schwesterrepo kopiert, mit gepinnter Code-Prüfsumme | gilt | 2026-09-12 |
| U2-ADR-407 | `tools/kern-ausliefern.js` — der Auslieferungsweg zum Speicher | gilt | 2026-09-12 |
| U2-ADR-408 | Die Palette folgt der Marke — White Label bis zum letzten Grünton | gilt | 2026-09-13 |
| U2-ADR-409 | Das Feldregister — der Bestand nach außen, Vorschläge nach innen | gilt | 2026-09-13 |
| U2-ADR-410 | ZVR-Abschrift — das Register nimmt ab 01.10.2026 den Text selbst | gilt | 2026-09-13 |
| U2-ADR-411 | Der Bestellweg — Produkte entstehen aus Rezept und Zutaten; für v1 je Version, je Bestellung nach v1 | gilt | 2026-09-13 |
| U2-ADR-412 | Jede Herausgabe bekommt auch ein PDF — drei Chiffrat-Ausnahmen | gilt | 2026-09-14 |
| U2-ADR-413 | Vorführung — ein gebackenes Beispiel-Depot, das nichts verlässt | gilt | 2026-09-15 |
| U2-ADR-414 | Das Produkt ist ein signiertes Rezept — die Kette ersetzt die gepinnte Prüfsumme | gilt | 2026-09-15 |
| U2-ADR-415 | Vom Stick geöffnet — beim Schließen auf den Stick, danach die Browser-Kopie räumen | gilt | 2026-09-16 |
| U2-ADR-416 | Sprachmodule werden mit jeder Version ausgeliefert | gilt | 2026-09-16 |
| U2-ADR-417 | (Nummer beim Landen zu bestätigen) · Situationen/Wizards ab Werk — eigener Speisepfad statt Fremdmodul-Prüfer | gilt | 2026-09-17 |
| U2-ADR-419 | (Nummer beim Landen zu bestätigen) · Manifest-Konfektionierung — Bibliothek + Wächter (Block D) | gilt | 2026-09-07 |
| U2-ADR-420 | (Nummer beim Landen zu bestätigen) · Doppelt vergebene ADR-Nummern: gefunden, benannt, eine sofort behoben | gilt | 2026-09-17 |
| U2-ADR-421 | (Nummer beim Landen zu bestätigen) · VD Pro ersetzt statt ergänzt | gilt | 2026-09-08 |
| U2-ADR-422 | (Nummer beim Landen zu bestätigen) · Die YAML-Form der Konformitätsklausel ist gleichrangig zur eingezäunten Form | gilt | 2026-09-17 |
| U2-ADR-423 | (Nummer beim Landen zu bestätigen) · Signierte Sprachmodule übersetzen Zusicherungssätze | gilt | 2026-09-19 |
| U2-ADR-424 | Private Sachversicherungen strukturiert, Basiskonto und P-Konto als Kontomerkmal | gilt | 2026-09-19 |
| U2-ADR-425 | Hilfe in der Datei — Bedienungsanleitung als Kern-Inhalt | gilt | 2026-09-20 |
| U2-ADR-426 | Das Gerüst trägt keinen vollen Sprachsatz — Englisch kommt als Modul | gilt | 2026-09-20 |
| U2-ADR-427 | Templates stehen im Rezept in einer eigenen Liste | gilt | 2026-09-20 |
| U2-ADR-428 | Deutsch ist ein Sprachmodul — das Gerüst trägt keinen Sprachsatz | gilt | 2026-09-21 |
| U2-ADR-429 | Ein Depot trägt seine Sprache, und die Bürgerin schaltet unter den vollen Sprachen um | gilt | 2026-09-21 |
| U2-ADR-430 | Wiederherstellungs-Hülle, abwählbar | gilt | 2026-09-21 |
| U2-ADR-431 | Die unersetzbaren Angaben am Herkunftsort stehen in EINER Quelle — erzeugter Block, Platzhalter, Abweisen beim Erzeugen, Ergänzen beim Anzeigen | gilt | 2026-09-21 |
| U2-ADR-432 | Ein Sub-Depot ist ein Depot wie jedes andere — Korrektur zu U2-ADR-235 | gilt | 2026-09-23 |
| vivodepot-U2-ADR-NNN3-migrationsbeleg-additive-schluessel-oberste-ebene-2026-09-17.md | U2-ADR-NNN3 · Migrationsbeleg kennt benannte additive Schlüssel auch auf oberster Ebene | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-U2-ADR-NNN2-ende-eigenes-vorlagen-format-basistemplate-2026-09-17.md | U2-ADR-NNN2 · Ende des eigenen Vorlagen-Formats: STANDARD_VORLAGEN wird Basistemplate | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-U2-ADR-NNN-rechtsraum-de-ist-ein-modul-nachfolge-zu-285-2026-09-20.md | U2-ADR-NNN · Rechtsraum DE ist ein Modul wie jedes andere — Nachfolge zu U2-ADR-285 | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-U2-ADR-NNN-offener-json-vollexport-entfernt-2026-09-17.md | U2-ADR-NNN — Der offene JSON-Vollexport wird entfernt, nicht gefiltert | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-U2-ADR-NNN-korpus-zuordnung-rechtsraum-und-template-2026-09-17.md | U2-ADR-NNN · Korpus-Zuordnung: amtlicher Wortlaut ins Rechtsraum-Modul, eigene Formulierung ins Template | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-U2-ADR-NNN-generator-schluessel-im-speicher-2026-09-19.md | U2-ADR-NNN: Die privaten Schlüssel des Template-Generators im Speicher — in Hüllen, nicht herausholbar, verworfen | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-U2-ADR-NNN-angehoerigen-blaetter-sind-template-nicht-geruest-2026-09-19.md | U2-ADR-NNN — Angehörigen-Blätter sind Inhalt (Template), kein Gerüst | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-113-erst-eintritts-architektur-verschluesselungs-disziplin-2026-05-24.md | ADR — Erst-Eintritts-Architektur und Verschlüsselungs-Disziplin | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-102-modus-wechsel-disziplin-2026-05-24.md | ADR — Modus-Wechsel-Disziplin | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-098-lese-app-architektur-2026-05-23.md | B16-ADR-098 · Lese-App-Architektur | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-097-notfallkarte-als-druck-export-2026-05-23.md | B16-ADR-097 · Notfallkarte als Druck-Export (V3.2) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-094-welcome-architektur-konsolidierung-2026-05-21.md | B16-ADR-094 · Welcome-Architektur-Konsolidierung | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-088-mutterpass-komplement-schwangerschaften-array-2026-05-20.md | B16-ADR-088 — Mutterpass-Komplement-Architektur: data.schwangerschaften[]-Array, Schema-Bump 15→16 | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-087-erbschafts-vorlage-konsumenten-schicht-2026-05-20.md | B16-ADR-087 — Erbschafts-Vorlage-Konsumenten-Schicht in v1.0 | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-085-lese-app-krypto-sync-auf-stand-b16-adr-050-2026-05-19.md | B16-ADR-085: Lese-App-Krypto-Sync auf B16-ADR-050-Stand (Cross-Komponenten-Migration mit Legacy-Fallback) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-084-lese-datei-provenance-anzeige-2026-05-19.md | B16-ADR-084: Lese-Datei-Provenance-Anzeige (B16-ADR-081 Komponente 6 Implementations-Beleg) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-083-sentinel-logik-vc-issuer-entfernung-2026-05-19.md | B16-ADR-083: Sentinel-Logik im VC-Issuer entfernt (Pre-Release-Krypto-Bereinigung, Schritt 2) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-082-test-schluessel-bypass-entfernung-2026-05-19.md | B16-ADR-082: Test-Schlüssel-Bypass-Pfad in `_verifyJWS` entfernt (Pre-Release-Krypto-Bereinigung) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-075-harmonisierungs-sprint-feld-sektor-zuordnung-v2-2026-05-08.md | B16-ADR-075: Harmonisierungs-Sprint Feld-Sektor-Zuordnung v2 | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-074-sektor-agnostische-datenschicht-2026-05-08.md | B16-ADR-074: Sektor-agnostische Datenschicht — Komplementarität zu EUDIW | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-070-plan-linien-konsolidierung-2026-05-03.md | B16-ADR-070: Plan-Linien-Konsolidierung | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-067-ci-cd-haertung-2026-05-04.md | B16-ADR-067: CI/CD-Härtung — von Grund auf etablieren | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-066-privacy-erzwingung-2026-05-04.md | B16-ADR-066: Privacy-Erzwingung — Offline-Architektur durchsetzen | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-065-template-uebergabe-mechanismus-2026-04-28.md | B16-ADR-065: Template-Übergabe-Mechanismus · Architektur-Anker | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-064-beziehungs-codierung-anker-sub-depot-eigentuemer-2026-04-28.md | B16-ADR-064: Beziehungs-Codierung Anker-Person zu Sub-Depot-Eigentümer | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-063-fhir-provenance-sub-depot-ips-export-2026-04-28.md | B16-ADR-063: FHIR-Provenance-Ressource bei Sub-Depot-IPS-Export | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-062-provenance-erhaltung-beim-sub-depot-export-2026-04-28.md | B16-ADR-062: Provenance-Erhaltung beim Sub-Depot-Export | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-061-notfall-cache-konsolidierung-fuenf-situationsblaetter-2026-05-23.md | B16-ADR-061v3 · Notfall-Cache Stufe 2 · Konsolidierung mit B16-ADR-081 auf fünf Situationsblätter | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-060-disaster-recovery-entwurf-2026-09-19.md | B16-ADR-060: Disaster Recovery (Entwurf zur Durchsicht) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-059-ci-cd-haertung-entwurf-2026-09-19.md | B16-ADR-059: CI/CD-Härtung (Entwurf zur Durchsicht) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-058-supply-chain-security-entwurf-2026-09-19.md | B16-ADR-058: Supply-Chain-Security (Entwurf zur Durchsicht) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-057-privacy-erzwingung-entwurf-2026-09-19.md | B16-ADR-057: Privacy-Erzwingung (Entwurf zur Durchsicht) | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-056-software-entwicklungs-gesamtkonzept-2026-04-27.md | B16-ADR-056: Software-Entwicklungs-Gesamtkonzept als integratives Dokument | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-055-externe-test-quellen-krypto-schicht-2026-04-27.md | B16-ADR-055: Externe Test-Quellen für die Krypto-Schicht | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-054-schema-migration-sauberer-schnitt-2026-04-26.md | B16-ADR-054: Sauberer Schnitt bei Schema-Migrationen | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-052-sorge-struktur-sub-depot-hierarchie-2026-04-26.md | B16-ADR-052: Sorge-Struktur und Sub-Depot-Hierarchie | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-047-nutzerfuehrung-v1-2026-04-25.md | B16-ADR-047: Nutzerführung in v1.0 — Komplett-Konzept | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-034-cra-konformitaet-operativer-prozess-2026-04-01.md | B16-ADR-034: CRA-Konformität als operativer Prozess ab 11.09.2026 | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-033-wcag-2-2-level-aa-als-grundstruktur-nicht-nachr-stung-2026-04-01.md | Scan-Treffer: Strategie | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-031-bordmittel-linie-web-crypto-api-als-fundament-pbkdf2-in-v1-0-2026-04-01.md | Scan-Treffer: Strategie | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-030-feature-detection-mit-progressive-enhancement-statt-user-age-2026-04-01.md | B16-ADR-030: Feature Detection mit Progressive Enhancement statt User-Agent-Sniffing | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-024-institutioneller-template-import-per-datei-und-qr-code-2026-04-01.md | B16-ADR-024: Institutioneller Template-Import per Datei und QR-Code | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-018-wcag-2-2-als-erweiterter-barrierefreiheitsstandard-2026-04-01.md | B16-ADR-018: WCAG 2.2 als erweiterter Barrierefreiheitsstandard | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-017-build-workflow-und-lib-auslagerung-abgelehnt-2026-04-01.md | B16-ADR-017: Build-Workflow und Lib-Auslagerung abgelehnt | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-014-leseansicht-eigenstaendig-2026-04-01.md | B16-ADR-014 · Eigenständige Leseansicht als separater Übergabekanal | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-012-github-pages-als-hosting-kein-aws-2026-04-01.md | B16-ADR-012: GitHub Pages als Hosting, kein AWS | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-008-white-label-f-higkeit-als-produktstrategie-2026-04-01.md | B16-ADR-008: White-Label-Fähigkeit als Produktstrategie | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-007-versionsnummer-erst-bei-lastenheft-abschluss-2026-04-01.md | B16-ADR-007: Versionsnummer erst bei Lastenheft-Abschluss | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-006-barrierefreiheit-als-designprinzip-2026-04-01.md | B16-ADR-006: Barrierefreiheit als Designprinzip | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-005-keine-mehrsprachigkeit-in-version-beta-15-2026-04-01.md | B16-ADR-005: Keine Mehrsprachigkeit in Version beta.15 | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-004-eupl-1-2-als-lizenz-des-app-kerns-2026-04-01.md | B16-ADR-004: EUPL-1.2 als Lizenz des App-Kerns | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-003-aes-256-verschluesselung-lokal-fruehe-2025-01-01.md | B16-ADR-003: AES-256-Verschlüsselung lokal Frühe | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-002-fhir-r4-als-interoperabilit-tsstandard-m-rz-2026-04-01.md | B16-ADR-002: FHIR R4 als Interoperabilitätsstandard März – | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-001-single-file-html-architektur-2025-04-01.md | B16-ADR-001: Single-File HTML-Architektur | ungeprüft | (Datum nicht aus Dateiname ableitbar) |
| vivodepot-B16-ADR-085-Nachtrag-nachtrag-aad-bindung-krypto-versions-feld-2026-05-23.md | B16-ADR-085-Nachtrag: AAD-Bindung der Iterations-Zahl und kryptoVersion-Feld-Allowlist | ungeprüft | (Datum nicht aus Dateiname ableitbar) |

## Index nach Status

Dieselben Dateien wie oben, nach `**Status heute:**`-Grundwert gruppiert — zum Überfliegen, nicht als zweite Quelle (die Tabelle oben trägt Titel und Datum).

**gilt** (373): U2-ADR-001, U2-ADR-002, U2-ADR-003, U2-ADR-004, U2-ADR-005, U2-ADR-006, U2-ADR-007, U2-ADR-008, U2-ADR-009, U2-ADR-010, U2-ADR-011, U2-ADR-013, U2-ADR-014, U2-ADR-016, U2-ADR-017, U2-ADR-018, U2-ADR-019, U2-ADR-020, U2-ADR-021, U2-ADR-022, U2-ADR-023, U2-ADR-024, U2-ADR-025, U2-ADR-026, U2-ADR-027, U2-ADR-028, U2-ADR-029, U2-ADR-030, U2-ADR-031, U2-ADR-034, U2-ADR-035, U2-ADR-036, U2-ADR-037, U2-ADR-038, U2-ADR-039, U2-ADR-040, U2-ADR-041, U2-ADR-043, U2-ADR-045, U2-ADR-047, U2-ADR-048, U2-ADR-049, U2-ADR-050, U2-ADR-051, U2-ADR-052, U2-ADR-053, U2-ADR-054, U2-ADR-055, U2-ADR-056, U2-ADR-057, U2-ADR-059, U2-ADR-060, U2-ADR-061, U2-ADR-062-Nachtrag, U2-ADR-063, U2-ADR-065, U2-ADR-067, U2-ADR-068, U2-ADR-069, U2-ADR-070, U2-ADR-071, U2-ADR-072, U2-ADR-073, U2-ADR-074, U2-ADR-075, U2-ADR-076, U2-ADR-077, U2-ADR-078, U2-ADR-079, U2-ADR-080, U2-ADR-081, U2-ADR-082, U2-ADR-083, U2-ADR-084, U2-ADR-085, U2-ADR-086, U2-ADR-087, U2-ADR-088, U2-ADR-089, U2-ADR-090, U2-ADR-091, U2-ADR-092, U2-ADR-093, U2-ADR-094-Nachtrag, U2-ADR-095, U2-ADR-096, U2-ADR-097, U2-ADR-098, U2-ADR-098-Nachtrag, U2-ADR-099, U2-ADR-100, U2-ADR-101, U2-ADR-102, U2-ADR-104, U2-ADR-105, U2-ADR-106, U2-ADR-107, U2-ADR-108, U2-ADR-109, U2-ADR-110, U2-ADR-111, U2-ADR-113, U2-ADR-114, U2-ADR-115, U2-ADR-116, U2-ADR-117, U2-ADR-118, U2-ADR-119, U2-ADR-120, U2-ADR-121, U2-ADR-122, U2-ADR-123, U2-ADR-124, U2-ADR-125, U2-ADR-126, U2-ADR-127, U2-ADR-128, U2-ADR-129, U2-ADR-130, U2-ADR-131, U2-ADR-132, U2-ADR-133, U2-ADR-134, U2-ADR-135, U2-ADR-136, U2-ADR-137, U2-ADR-138, U2-ADR-139, U2-ADR-140, U2-ADR-141, U2-ADR-142, U2-ADR-143, U2-ADR-144, U2-ADR-145, U2-ADR-146, U2-ADR-147, U2-ADR-148, U2-ADR-149, U2-ADR-150, U2-ADR-151, U2-ADR-152, U2-ADR-153, U2-ADR-154, U2-ADR-155, U2-ADR-156, U2-ADR-157, U2-ADR-158, U2-ADR-159, U2-ADR-160, U2-ADR-161, U2-ADR-162, U2-ADR-163, U2-ADR-164, U2-ADR-165, U2-ADR-166, U2-ADR-167, U2-ADR-168, U2-ADR-170, U2-ADR-171, U2-ADR-172, U2-ADR-173, U2-ADR-174, U2-ADR-175, U2-ADR-181, U2-ADR-182, U2-ADR-184, U2-ADR-185, U2-ADR-186, U2-ADR-187, U2-ADR-188, U2-ADR-189, U2-ADR-190, U2-ADR-193, U2-ADR-194, U2-ADR-195, U2-ADR-196, U2-ADR-197, U2-ADR-199, U2-ADR-201, U2-ADR-202, U2-ADR-206, U2-ADR-207, U2-ADR-208, U2-ADR-209, U2-ADR-211, U2-ADR-212, U2-ADR-213, U2-ADR-214, U2-ADR-215, U2-ADR-216, U2-ADR-217, U2-ADR-218, U2-ADR-219, U2-ADR-220, U2-ADR-221, U2-ADR-222, U2-ADR-223, U2-ADR-224, U2-ADR-225, U2-ADR-226, U2-ADR-227, U2-ADR-228, U2-ADR-229, U2-ADR-230, U2-ADR-231, U2-ADR-232, U2-ADR-233, U2-ADR-235, U2-ADR-236, U2-ADR-237, U2-ADR-238, U2-ADR-241, U2-ADR-243, U2-ADR-244, U2-ADR-245, U2-ADR-246, U2-ADR-247, U2-ADR-248, U2-ADR-249, U2-ADR-250, U2-ADR-251, U2-ADR-252, U2-ADR-253, U2-ADR-254, U2-ADR-255, U2-ADR-256, U2-ADR-257, U2-ADR-258, U2-ADR-259, U2-ADR-260, U2-ADR-262, U2-ADR-263, U2-ADR-266, U2-ADR-267, U2-ADR-269, U2-ADR-273, U2-ADR-274, U2-ADR-275, U2-ADR-276, U2-ADR-278, U2-ADR-279, U2-ADR-280, U2-ADR-282, U2-ADR-284, U2-ADR-285, U2-ADR-287, U2-ADR-288, U2-ADR-289, U2-ADR-290, U2-ADR-291, U2-ADR-292, U2-ADR-293, U2-ADR-294, U2-ADR-295, U2-ADR-296, U2-ADR-297, U2-ADR-298, U2-ADR-299, U2-ADR-300, U2-ADR-301, U2-ADR-302, U2-ADR-303, U2-ADR-304, U2-ADR-305, U2-ADR-306, U2-ADR-307, U2-ADR-308, U2-ADR-309, U2-ADR-310, U2-ADR-311, U2-ADR-312, U2-ADR-313, U2-ADR-314, U2-ADR-315, U2-ADR-316, U2-ADR-317, U2-ADR-318, U2-ADR-319, U2-ADR-320, U2-ADR-321, U2-ADR-322, U2-ADR-323, U2-ADR-324, U2-ADR-325, U2-ADR-326, U2-ADR-329, U2-ADR-330, U2-ADR-331, U2-ADR-332, U2-ADR-333, U2-ADR-334, U2-ADR-334-Nachtrag, U2-ADR-335, U2-ADR-336, U2-ADR-337, U2-ADR-338, U2-ADR-339, U2-ADR-340, U2-ADR-341b, U2-ADR-341, U2-ADR-342, U2-ADR-343, U2-ADR-344, U2-ADR-345, U2-ADR-346, U2-ADR-349, U2-ADR-350, U2-ADR-351, U2-ADR-352, U2-ADR-353, U2-ADR-354, U2-ADR-356, U2-ADR-357, U2-ADR-358, U2-ADR-359, U2-ADR-360, U2-ADR-361, U2-ADR-362, U2-ADR-363, U2-ADR-364, U2-ADR-367, U2-ADR-368, U2-ADR-369, U2-ADR-370, U2-ADR-371, U2-ADR-372, U2-ADR-374, U2-ADR-377, U2-ADR-378, U2-ADR-379, U2-ADR-380, U2-ADR-381, U2-ADR-382, U2-ADR-383, U2-ADR-384, U2-ADR-385, U2-ADR-386, U2-ADR-387, U2-ADR-388, U2-ADR-396, U2-ADR-398, U2-ADR-399, U2-ADR-400, U2-ADR-401, U2-ADR-402, U2-ADR-404, U2-ADR-405, U2-ADR-406, U2-ADR-407, U2-ADR-408, U2-ADR-409, U2-ADR-410, U2-ADR-411, U2-ADR-412, U2-ADR-413, U2-ADR-414, U2-ADR-415, U2-ADR-416, U2-ADR-417, U2-ADR-419, U2-ADR-420, U2-ADR-421, U2-ADR-422, U2-ADR-423, U2-ADR-424, U2-ADR-425, U2-ADR-426, U2-ADR-427, U2-ADR-428, U2-ADR-429, U2-ADR-430, U2-ADR-431, U2-ADR-432

**teilweise überholt** (9): U2-ADR-012, U2-ADR-015, U2-ADR-032, U2-ADR-033, U2-ADR-058, U2-ADR-062, U2-ADR-066, U2-ADR-089-Nachtrag, U2-ADR-103

**überholt** (7): U2-ADR-042, U2-ADR-046, U2-ADR-064, U2-ADR-169, U2-ADR-270, U2-ADR-347, U2-ADR-348

**gegenstandslos** (1): U2-ADR-077-Nachtrag

**ungeprüft** (61): U2-ADR-044, U2-ADR-112, U2-ADR-183, U2-ADR-366, U2-ADR-373, U2-ADR-375, vivodepot-U2-ADR-NNN3-migrationsbeleg-additive-schluessel-oberste-ebene-2026-09-17.md, vivodepot-U2-ADR-NNN2-ende-eigenes-vorlagen-format-basistemplate-2026-09-17.md, vivodepot-U2-ADR-NNN-rechtsraum-de-ist-ein-modul-nachfolge-zu-285-2026-09-20.md, vivodepot-U2-ADR-NNN-offener-json-vollexport-entfernt-2026-09-17.md, vivodepot-U2-ADR-NNN-korpus-zuordnung-rechtsraum-und-template-2026-09-17.md, vivodepot-U2-ADR-NNN-generator-schluessel-im-speicher-2026-09-19.md, vivodepot-U2-ADR-NNN-angehoerigen-blaetter-sind-template-nicht-geruest-2026-09-19.md, vivodepot-B16-ADR-113-erst-eintritts-architektur-verschluesselungs-disziplin-2026-05-24.md, vivodepot-B16-ADR-102-modus-wechsel-disziplin-2026-05-24.md, vivodepot-B16-ADR-098-lese-app-architektur-2026-05-23.md, vivodepot-B16-ADR-097-notfallkarte-als-druck-export-2026-05-23.md, vivodepot-B16-ADR-094-welcome-architektur-konsolidierung-2026-05-21.md, vivodepot-B16-ADR-088-mutterpass-komplement-schwangerschaften-array-2026-05-20.md, vivodepot-B16-ADR-087-erbschafts-vorlage-konsumenten-schicht-2026-05-20.md, vivodepot-B16-ADR-085-lese-app-krypto-sync-auf-stand-b16-adr-050-2026-05-19.md, vivodepot-B16-ADR-084-lese-datei-provenance-anzeige-2026-05-19.md, vivodepot-B16-ADR-083-sentinel-logik-vc-issuer-entfernung-2026-05-19.md, vivodepot-B16-ADR-082-test-schluessel-bypass-entfernung-2026-05-19.md, vivodepot-B16-ADR-075-harmonisierungs-sprint-feld-sektor-zuordnung-v2-2026-05-08.md, vivodepot-B16-ADR-074-sektor-agnostische-datenschicht-2026-05-08.md, vivodepot-B16-ADR-070-plan-linien-konsolidierung-2026-05-03.md, vivodepot-B16-ADR-067-ci-cd-haertung-2026-05-04.md, vivodepot-B16-ADR-066-privacy-erzwingung-2026-05-04.md, vivodepot-B16-ADR-065-template-uebergabe-mechanismus-2026-04-28.md, vivodepot-B16-ADR-064-beziehungs-codierung-anker-sub-depot-eigentuemer-2026-04-28.md, vivodepot-B16-ADR-063-fhir-provenance-sub-depot-ips-export-2026-04-28.md, vivodepot-B16-ADR-062-provenance-erhaltung-beim-sub-depot-export-2026-04-28.md, vivodepot-B16-ADR-061-notfall-cache-konsolidierung-fuenf-situationsblaetter-2026-05-23.md, vivodepot-B16-ADR-060-disaster-recovery-entwurf-2026-09-19.md, vivodepot-B16-ADR-059-ci-cd-haertung-entwurf-2026-09-19.md, vivodepot-B16-ADR-058-supply-chain-security-entwurf-2026-09-19.md, vivodepot-B16-ADR-057-privacy-erzwingung-entwurf-2026-09-19.md, vivodepot-B16-ADR-056-software-entwicklungs-gesamtkonzept-2026-04-27.md, vivodepot-B16-ADR-055-externe-test-quellen-krypto-schicht-2026-04-27.md, vivodepot-B16-ADR-054-schema-migration-sauberer-schnitt-2026-04-26.md, vivodepot-B16-ADR-052-sorge-struktur-sub-depot-hierarchie-2026-04-26.md, vivodepot-B16-ADR-047-nutzerfuehrung-v1-2026-04-25.md, vivodepot-B16-ADR-034-cra-konformitaet-operativer-prozess-2026-04-01.md, vivodepot-B16-ADR-033-wcag-2-2-level-aa-als-grundstruktur-nicht-nachr-stung-2026-04-01.md, vivodepot-B16-ADR-031-bordmittel-linie-web-crypto-api-als-fundament-pbkdf2-in-v1-0-2026-04-01.md, vivodepot-B16-ADR-030-feature-detection-mit-progressive-enhancement-statt-user-age-2026-04-01.md, vivodepot-B16-ADR-024-institutioneller-template-import-per-datei-und-qr-code-2026-04-01.md, vivodepot-B16-ADR-018-wcag-2-2-als-erweiterter-barrierefreiheitsstandard-2026-04-01.md, vivodepot-B16-ADR-017-build-workflow-und-lib-auslagerung-abgelehnt-2026-04-01.md, vivodepot-B16-ADR-014-leseansicht-eigenstaendig-2026-04-01.md, vivodepot-B16-ADR-012-github-pages-als-hosting-kein-aws-2026-04-01.md, vivodepot-B16-ADR-008-white-label-f-higkeit-als-produktstrategie-2026-04-01.md, vivodepot-B16-ADR-007-versionsnummer-erst-bei-lastenheft-abschluss-2026-04-01.md, vivodepot-B16-ADR-006-barrierefreiheit-als-designprinzip-2026-04-01.md, vivodepot-B16-ADR-005-keine-mehrsprachigkeit-in-version-beta-15-2026-04-01.md, vivodepot-B16-ADR-004-eupl-1-2-als-lizenz-des-app-kerns-2026-04-01.md, vivodepot-B16-ADR-003-aes-256-verschluesselung-lokal-fruehe-2025-01-01.md, vivodepot-B16-ADR-002-fhir-r4-als-interoperabilit-tsstandard-m-rz-2026-04-01.md, vivodepot-B16-ADR-001-single-file-html-architektur-2025-04-01.md, vivodepot-B16-ADR-085-Nachtrag-nachtrag-aad-bindung-krypto-versions-feld-2026-05-23.md

