# U2-ADR-004: Teststrategie — stehende Suite statt Wegwerf-Harness

**Status:** Akzeptiert
**Datum:** 29.05.2026
**Kategorie:** METHODIK, SICHERHEIT, TEST
**Cross-Referenz (Produktiv-Kanon):** Klasse-A-Tests (A-08, C-A-01/02/05), `ADR-063` (FHIR-Provenance, IPS, HL7-Validator als CI-Schritt), `ADR-064` (HL7-V3-RoleCode mit drei korrigierten Codes).
**Status heute:** gilt — stehende Suite produktiv (`package.json` `"test": "node --test"`, 480 Testdateien unter `tests/`), Block-Integritäts-Gate aktiv (`tests/vdcrypto-block-integritaet.test.js`, `BLOCK_HASH_ERWARTET`-Mechanik in `tests/load-generator.js`).

---

## Kontext

Die Verifikation lief bisher über einen temporären Prüfstand (`_verify.js`), der danach wieder entfernt wird. Für einen Prototyp ist das in Ordnung; für eine Produktiv-Kandidatin ist es ein mit jedem Modul wachsendes Risiko. Es gibt kein Netz zwischen den Modulen: Schritt 2 und 3 (Blackbox-Export, Einhängen) fassen genau die Sub-Depot-Mechanik aus U2-ADR-003 an, deren Isolations- und Nicht-Persistenz-Eigenschaft DSGVO-kritisch ist. Bricht sie bei einem späteren Modul, bemerkt das niemand, solange jede Verifikation ein Wegwerf-Stand ist.

Die Produktiv-App hat rund 2.106 Tests, aber der größere Teil prüft genau den Ballast, den U2 weggelassen hat — Versions-Allowlist, Migrationsfunktionen, Schema-Bump-Sweeps, Wizards auf der flachen `data`-Struktur. Diese Tests zu portieren hieße, das alte Verhalten wieder hereinzuholen.

## Entscheidung

U2 führt ab dem Übergaben-Modul eine stehende, im Repo versionierte Testsuite. Sie lädt die Script-Blöcke der Single-File-HTML headless (echtes WebCrypto, `node --test`, wie die Produktiv-Linie) und prüft die architekturunabhängigen Invarianten. Sie wächst mit jedem Modul. Der Wegwerf-Harness entfällt als Verifikationsform.

Das Produkt bleibt eine Datei. Die Suite lebt daneben als eigene Testdatei(en) im Repo; die HTML selbst trägt keine Test-Haken — die Suite extrahiert die `<script>`-Blöcke zur Laufzeit.

## Zwei Schichten

Die Suite hat zwei Schichten, analog zur Produktiv-Linie:

- **Headless-Krypto-Einheitstests** (`node --test`, echtes WebCrypto): prüfen die sicherheitskritischen Invarianten direkt am Code — Krypto-Runde, Sub-Depot-Isolation, Nicht-Persistenz, Umschlag-Form, Block-Integrität. Diese Schicht kommt zuerst, weil sie das Netz unter den nächsten Modulen ist.
- **E2E-Reisen** (Playwright/chromium gegen die gerenderte HTML): prüfen den Durchlauf aus Bürgerinnen-Sicht. Wächst, sobald Module UI rendern; nicht der erste Schritt.

## Geerbte Prüf-Absichten

Aus der Produktiv-Linie übernommen als Absicht, neu formuliert gegen die U2-API, nicht als Code kopiert:

- **Krypto-Runde:** Roundtrip mit Originalpasswort (Klartext-Marker restauriert), Falschpasswort wirft, manipulierte `ct`/Datei wirft. (vgl. C-A-01, C-A-02)
- **Sub-Depot-Isolation (DSGVO, Klasse-A):** Anker-Passwort öffnet Sub-Depot nicht; der direkte Master kann ein v2-Depot nicht entschlüsseln. (vgl. A-08, C-A-02)
- **Nicht-Persistenz (Klasse-A):** Sub-Passwort und Sub-Key nirgends serialisiert; Sub-Key nicht-extrahierbar; keine `localStorage`/`sessionStorage`-Nutzung.
- **Umschlag-Form:** genau sechs Felder, `kryptoVersion 2`, `depotUUID` als uuid-v4, Salt- und IV-Längen.
- **VdCrypto-Block-Integrität (Klasse-A):** der Block-Hash (`6eb590b9…` == `PORT-VERBATIM.js`) wird in der Suite geprüft, damit ein versehentliches Antasten der Primitive sofort rot wird.
- **FHIR-R4/IPS-Konformität** des Gesundheits-Sektors: IPS-Pflichtbereiche, IPS-Codes, HL7-Validator als CI-Schritt (skip-when-not-installed). Wächst, wie der Gesundheits-Sektor sich füllt. (vgl. `ADR-063`)
- **HL7-V3-RoleCode-Korrektheit:** kein zurückgezogener `ADOPT`, kein nicht-existenter `NIENE`, `OTH` im NullFlavor-System; Patienten-Perspektive. (vgl. `ADR-064`)
- **E2E-Reisen (zweite Schicht, Szenario-Absicht):** Erstanlage, Notfall, Vertrauensperson, Sub-Depot, Tod-Übergang, mit dem Personas-Muster (Anker-Person plus Sub-Depot-Eigentümer) und axe-Scan auf kritische Verletzungen. Geerbt als Szenario und Persona, nicht als Code — Selektoren und Datenpfade sind U2-spezifisch (die Produktiv-Reisen greifen z. B. auf `_root.subDepots` und `localStorage`-`STORE_KEY` zu, beides in U2 anders). Die Disziplin-vier-Prüfung „kein Klartext vor Passwort" ist die E2E-Form der Nicht-Persistenz-Invariante; in U2 an der serialisierten Datei statt am `localStorage` geprüft.

Nicht übernommen: Tests für Versions-Allowlist, Migration v1→v2, Schema-Bump-Sweeps und Wizards auf flacher `data`-Struktur — sie prüfen den weggelassenen Ballast.

## Klassifizierung

Klasse-A = sicherheitskritisch: Sub-Depot-Isolation, Nicht-Persistenz, Krypto-Runde, Block-Integrität. Diese müssen bei jedem Schritt grün sein, bevor committet wird.

## Konsequenzen

- Netz zwischen den Modulen: Schritt 2 und 3 fallen sofort hinein, statt ihre eigene Mechanik isoliert zu prüfen.
- Block-Integrität wird maschinell statt manuell geprüft.
- Einmaliger Aufwand: Aufsetzen der Suite vor Schritt 2.
- Die Suite ersetzt kein externes Krypto-Audit (aus `ADR-068 v2`) — sie ist die Regressions-Absicherung darunter.

## Implementations-Verweis

- **Commit:** `cdede66484df744163547b2e1cf8393fc92bda63` (Branch `main`, lokal, kein Push) — zweiter, von der Produkt-Datei getrennter Commit; genau `package.json` plus sieben Dateien unter `tests/`.
- **Umfang:** 15 Fälle in sechs Testdateien, davon 13 Klasse-A (Krypto-Runde, Sub-Depot-Isolation, Nicht-Persistenz, Umschlag-Form, Block-Integrität) plus zwei Gesundheits-Sektor-Smoke.
- **Gate-Nachweis erbracht:** Der Block-Integritäts-Test wurde an einer Kopie absichtlich rot gemacht (ein Byte im Krypto-Block gekippt) — genau die zwei Integritäts-Tests fielen, alles andere blieb grün; nach Rücknahme wieder 15/15 grün. Damit ist belegt, dass das Integritäts-Gate greift.
- **Gepinnter Block-Hash:** Die Suite pinnt den reproduzierbaren `6eb590b9…f56d05` (== `vivodepot-krypto-kern-PORT-VERBATIM.js`).
- **HTML unberührt:** Die Suite liest die HTML nur und schneidet die `<script>`-Blöcke zur Laufzeit heraus; keine Test-Haken in der HTML, `git diff HEAD` der HTML leer.
