# Konformitäts-Quellen

**Zweck:** Diese Liste ordnet jede Aussage der öffentlichen
Konformitätsseite ihrer **echten, automatisch laufenden Quelle** zu. Beim V1-Launch wird
die Seite aus diesen Quellen gespeist — **nicht** aus dem Gedächtnis oder aus datierten
Hand-Zählungen. Jede Zahl unten stammt aus einem Gate, der bei einem echten Verstoß ROT
wird (Negativ-Probe je Gate verifiziert).

**Maßgabe:** Läuft ein Gate nicht echt (stiller Skip / deklariert-aber-nicht-geprüft), darf
seine Aussage NICHT auf die Seite. Frühere Fälle: HL7-Validator (skippte still), OSV
(manuell, „bei jedem Commit" deklariert), „19/19 extractable" (datierte Hand-Zählung),
„31 Sichten" (überzeichnet) — alle hier auf echte Gates umgestellt.

---

## Gates & Quellen (alle echt ausführend)

| Aussage (Seite) | Echte Zahl/Quelle (V1) | Gate-Datei | Frequenz |
|---|---|---|---|
| ~~HL7 FHIR Validator (eu-lab, self-erzeugt)~~ | **Gate ersatzlos entfernt (U2-ADR-050):** der self-erzeugte `fhirLabBundle`-Generator entfiel — self-attestiert war strukturell nie eu-lab-konform (performer=Patient). Der konforme Laborweg ist der **autoritative Import** des Original-Befunds (U2-ADR-045/048); dessen Erkennung/Ablage deckt `tests/autoritativ-import.test.js` per-commit | — | — |
| **HL7 FHIR Validator (IPS/eu-eps, `externe-validatoren.mjs`)** | **Zurück in die automatische Kette (Produktentscheidung, 06.08.2026):** gepinnte Version (6.9.12) + SHA-256, weiterhin vom Hersteller geladen, kein Re-Hosting. Es entscheidet die Fehlerklasse, nicht der Ablageort: Beschaffungsfehler → **ungemessen** (Exit 0, Gate bleibt grün), Checksummen-Mismatch → **rot**. `tools/hl7-validator-alarm-waechter.js` schlägt Alarm bei 5 aufeinanderfolgenden „ungemessen"-Läufen | `tools/hl7-validator-beschaffen.js`, `tools/hl7-validator-alarm-waechter.js`, `tests/konformitaet/externe-validatoren.mjs` | **automatisch** (`.github/workflows/konformitaet.yml`, jeder Push/PR) |
| **OSV.dev Schwachstellen-Scan** | 0 Schwachstellen (`jspdf@4.2.1` + `qrcode-generator@1.4.4`); rot bei Vuln **und** Scan-Fehler | `scripts/osv-scan.py` + `.github/workflows/osv-scan.yml` | per-commit |
| **SBOM (CycloneDX 1.4)** | 2 Libraries inline (`jspdf@4.2.1`, `qrcode-generator@1.4.4`) + Code-Listen; @vd-lib/SBOM/TPL konsistent | `tests/compliance.test.js` (Tests 1–6) | per-commit (`npm test`) |
| **jsPDF-Version** | 4.2.1 (advisory-frei lt. OSV) | SBOM-Komponente `jspdf` | aus SBOM |
| **Externe Krypto-Vektoren** | **419/419 bestanden** — RFC 5869 HKDF 3 · NIST CAVP AES-GCM-256 30 · Wycheproof AES-GCM-256 66 · Wycheproof HKDF-SHA-256 86 · **Wycheproof HMAC-SHA-256 174** (neu 19.08.2026 — die Primitive der pseudonymen Feld-Adressen) · **Wycheproof PBKDF2-HMAC-SHA-256 60** (neu 19.08.2026 — eine Lücke, die schon vor dem Zerfall bestand: jedes Öffnen eines Depots läuft über PBKDF2, geprüft wurde es gegen keinen externen Vektor) | `tests/konformitaet/krypto-vektoren.mjs` | CI (`test:konformitaet`) |
| **Unabhängiger Krypto-Harness** | Eigener Code, eigener Prozess, eigener `vm`-Kontext gegen die kanonische Blockquelle: Block-Pin · RFC 5869 HKDF · **RFC 4231 HMAC-SHA-256** · NIST-GCM-Anker über zwei Engines · die Primitiven der Krypto-Generation 4 (Adress-Determinismus, Schlüsseltrennung, erweiterte AAD, Nicht-Extrahierbarkeit). **Bis zum 19.08.2026 lief er in keinem Kreislauf** — er stand in keinem npm-Skript und in keinem Workflow. Absichtlich NICHT in `node --test`: sein Wert liegt darin, dass er nicht dieselben Annahmen trägt wie der Code, den er prüft | `tools/independent-krypto-harness.js` | CI (`npm run krypto:harness`) |
| **Offline-Garantie** | **0 externe HTTP/S-Requests** bei Laden + Nutzung · keine WebSockets · zusätzlich CSP `connect-src 'none'` | `tests/konformitaet/offline-garantie.mjs` | CI (`test:konformitaet`) |
| **extractable: false** | **10/10 geheime/private CryptoKeys** nicht-extrahierbar (PBKDF2 · HKDF · AES-GCM · Ed25519) · 1 öffentlicher Schlüssel (legitim extrahierbar) — Runtime-verifiziert | `tests/konformitaet/extractable-inventur.js` | CI (`test:konformitaet`) |
| **WCAG 2.2 AA (axe-core)** | **33 Sichten gescannt, 0 Violations** (Welcome · Zuhause · 13 Sektoren · Anlass-Auswahl · 10 Situationen · Notfall · Einstellungen · Export-Übersicht · Mappe · Prüftermine · Depot-Liste · Angehörigen-Auswahl · Akut-Situation · QR-Bereich · Sub-Depot-Kontext) · Logotype-Ausnahme WCAG 1.4.3 (Gold-Wortmarke) | `tests/konformitaet/wcag-axe.mjs` | CI (`test:konformitaet`) |
| **Institutions-Vorlagen: Herkunft der Code-Werte** (U2-ADR-040-Nachtrag 4b) | Eine mitgebrachte `codeListe` muss auf eine **bei uns geführte Terminologie** zeigen (`uri`-Abgleich); unbekannt → Ablehnung mit benannter Ursache. Geführte Systeme: `atc`, `snomedAllergen`, `icd10`, `loinc`, `esco`, `xoev-rollencode` — maschinenlesbare Quelle: `code-listen/*.json` + `REIHENFOLGE` in `tools/build-code-listen.js` (Laufzeit-Registry: `CODE_LISTEN`, `vivodepot.html`) | `validateTemplate` (`vivodepot.html`), `tests/fix-a110-codeherkunft.test.js` | per-commit (`npm test`) |
| **VdCrypto-Block-Integrität** | Block-Hash `732ff4b0…` byte-identisch (Kern + Lese-App) | `tests/vdcrypto-block-integritaet.test.js` u. a. | per-commit (`npm test`) |
| **Behavior-Suite** | 6.709 Tests grün | `npm test` (alle `tests/*.test.js`) | per-commit |

---

## Korrigierte Überzeichnungen (Wahrheit vs. alte Seite)

- **„31 Sichten gescannt"** (alte Seite, nie automatisch geprüft) → jetzt **33 real aufgezählte, automatisch gescannte V1-Sichten** (s. axe-Gate; 24 Kern + 9 erweitert: Einstellungen, Export-Übersicht, Mappe, Prüftermine, Depot-Liste, Angehörigen-Auswahl, Akut-Situation, QR-Bereich, Sub-Depot-Kontext). Die erweiterten Sichten werden defensiv geöffnet; nicht echt scanbare würden übersprungen und gemeldet — aktuell wird **keine** übersprungen.
- **„19/19 extractable, 29.05.2026"** → war eine datierte **Hand-Zählung** (10× importKey + 9× deriveKey), kein Test. Jetzt **10/10 geheime/private Schlüssel Runtime-verifiziert** für V1 (V1 ist schlanker/stärker gewrappt als die Vorgängerfassung).
- **OSV „bei jedem Commit"** → war **manuell** (letzter Lauf der Vorgängerfassung 25.05.). Jetzt echter per-commit-Gate.
- **HL7-Validator** → skippte in der Vorgängerfassung still ohne Java; auf V1 echter per-commit-Gate (15.06.).

## Negativ-Proben (jeder Gate wird bei echtem Verstoß ROT)

- Krypto-Vektoren: verfälschter Vektor → rot. ✓
- Offline: Detektor fängt externen Request einer Kontroll-Seite. ✓ (V1 selbst: CSP `connect-src 'none'` verhindert Requests doppelt.)
- extractable: ein test-weise extrahierbarer Geheimschlüssel → rot. ✓
- axe-WCAG: Kontroll-Seite (Bild ohne alt + Niedrigkontrast) → `image-alt` + `color-contrast` erkannt. ✓

## Offen

- Die öffentliche Validierungsseite wird beim Launch aus dieser Liste neu gespeist (Datum, echte Zahlen, V1-Bezug).
- V1-`release.yml` (SHA-256-Release-Integrität + SBOM-Erzeugung beim Release) — noch nicht vorhanden.
