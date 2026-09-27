# B16-ADR-067: CI/CD-Härtung — von Grund auf etablieren

> **Überführt in den Bestand am 18.09.2026** — Original-Entscheidungsdatum 04.05.2026. Inhalt aus dem Vorgängerprojekt B16 übernommen, Personennamen neutralisiert.

---


- **Status:** akzeptiert
- **Datum:** 2026-05-04
- **Kategorien:** SICHERHEIT | INFRASTRUKTUR | STRATEGIE
- **Format:** MADR 4.0 mit Vivodepot-Erweiterungen (Kategorien-Header, Nachweis-Abschnitt)

## Kontext und Problemstellung

Ein externes Review empfahl CI/CD-Härtung mit verschiedenen Tools (Semgrep, Trivy, Axe-core, HL7-Validator). Die Klärungs-Sitzung 04.05.2026 plus die CI/CD-Stand-Inventur haben ergeben, dass B16-ADR-067 nicht „Härtung erweitern" ist, sondern „CI/CD von Grund auf etablieren".

Die CI/CD-Stand-Inventur hat offengelegt: `.github/workflows/` ist leer, keine GitHub-Actions existieren. Tests laufen ausschließlich manuell oder lokal über `npm test`. Die 185 Wycheproof-NIST-Vektoren (vier Klasse-A-Tests) laufen vollständig, aber nicht automatisch. HL7-Validator-Tests existieren mit skip-when-not-installed-Pattern, laufen aber nirgends automatisch. Es gibt keine SAST-Tool-Integration, kein Action-Pinning, keine Branch-Protection, keine SBOM, keinen Output-Hash. Zusätzlich hatte eine frühere Test-Inventur den HL7-Validator-Kern mehrdeutig als „CI integriert" beschrieben; eine erneute Inventur zeigte, dass das nicht zutraf.

Zum NLnet-Antrag (01.06.2026) plus Pilotpartner-Anbahnung: ohne CI/CD-Kern ist die Audit-Spur dünn, externe Reviewer erwarten automatisierte Verifikations-Schichten.

**Frage:** Wie wird CI/CD methodisch von Grund auf etabliert, sodass v1.0-Release plus NLnet-Antrag plus Pilotpartner-Anbahnung tragfähig sind?

## Entscheidungstreiber

- **Werkzeug-Philosophie verlangt Reproducible-Build-Disziplin:** Single-File-HTML als Auslieferungs-Kern braucht klare Verifikation, dass der ausgelieferte Build dem Repository-Stand entspricht. SHA-Hash plus SBOM sind methodische Anker.
- **Audit-Spur für externe Reviewer:** NLnet, Pilotpartner, anwaltliche Begleitung erwarten dokumentierte Verifikations-Schichten. „Tests laufen lokal" ist nicht ausreichend, weil nicht reproduzierbar.
- **Klassen-A-Disziplin verlangt automatisierte Verifikation:** Crypto-Kern, Migrations-Kern, FHIR-Kern sind Klasse A. Klasse-A-Disziplin verlangt Test-First plus Zwei-Pass-Review plus externe Validierung — ohne CI nicht systematisch.
- **Drei-Akteure-Architektur verlangt Gatekeeping:** Die Umsetzung produziert Code, die Produktverantwortliche entscheidet. Zwischen dieser Code-Produktion und der Entscheidung sollte ein automatischer Verifikations-Schritt liegen, der Klasse-A-Verstöße verhindert.
- **Standard-Konformität für Behörden-Anschluss:** SPDX als ISO/IEC 5962:2021 ist methodisch wichtiger Standard für SBOM. EU-CRA plus NIS2-Direktive referenzieren SPDX explizit.

## Geprüfte Optionen

1. **Option A — Minimal:** nur ein Test-Workflow, der `npm test` bei push/pull-request ausführt. Keine SAST, kein SBOM, keine Branch-Protection.
2. **Option B — Mittel:** Tests plus Action-Pinning plus Branch-Protection plus Output-Hash, aber ohne SAST-Tool, ohne SBOM, ohne HL7-Validator-CI-Integration.
3. **Option C — Vollständig:** alle Härtungs-Kerne für v1.0 (SAST, Wycheproof-Vollständigkeits-Lauf, HL7-Validator als Docker, SBOM, Output-Hash, Branch-Protection, Action-Pinning, drei Workflows, strikter Fail-Behavior).

## Entscheidung

Gewählt: **Option C — Vollständig: alle Härtungs-Kerne für v1.0**, weil nur diese Tiefe eine methodisch tragfähige Audit-Spur für NLnet-Antrag und Pilotpartner-Anbahnung etabliert. Aufwand 8–12 h Umsetzungsaufwand.

Konkret in neun Festlegungen:

1. **Drei GitHub-Actions-Workflows.** `main.yml` (push/PR auf `main` und Branches: schnelle plus mittlere Tests, CodeQL, Action-Pinning-Verifikation), `nightly.yml` (nightly via cron: vollständige Suite — Wycheproof-NIST-Vektoren, HL7-Validator als Docker, CodeQL-Tiefen-Scan), `release.yml` (Tag/Release: alle Tests plus SBOM (SPDX) plus SHA-256-Hash plus Release-Artefakte).
2. **Alle Tests standardmäßig im CI.** Lokales `npm test` bleibt schnell für die Bürger-Entwicklung; CI führt die vollständige Suite aus. Befehl-Struktur: `npm test` (schnelle/mittlere Tests, lokal), `npm run test:external` (Wycheproof plus HL7-Validator), `npm run test:all` (Aggregat).
3. **SAST mit CodeQL**, weil GitHub-nativ, einfacher Setup, kostenlos für Open Source, solide JavaScript-Unterstützung. Bricht den Build bei kritischen Befunden ab.
4. **HL7-Validator als Docker in CI**, integriert in den nightly-Workflow (Docker-Image mehrere hundert MB, deshalb nightly statt bei jedem push, zusätzlich im Release-Workflow für Release-Verifikation).
5. **SBOM im SPDX-Format** (ISO/IEC 5962:2021), erstellt im Release-Workflow. Dokumentiert eingebettete Bibliotheken (Crypto-Hilfsfunktionen, FHIR-Validatoren) mit Quelle, Version, Lizenz. Bei Bedarf kann zusätzlich CycloneDX über Syft erzeugt werden; SPDX bleibt Primärstandard.
6. **Output-Hash für Reproducible-Build-Disziplin.** Bei jedem Release wird SHA-256 der HTML-Datei berechnet und veröffentlicht, damit Bürger und Pilotpartner den Build gegen den Repository-Stand verifizieren können.
7. **Strikter Fail-Behavior.** Jeder Befund (CodeQL-Warnung, Testfehlschlag, HL7-Validator-Fehler) bricht den Build ab. Spätere Relaxierung auf differenzierte Fail-Behavior (Klasse A bricht ab, Klasse B/C nur Warnung) bei methodischen Schwierigkeiten möglich.
8. **Branch-Protection für `main`:** Pull-Request-Pflicht, alle CI-Checks grün vor Merge, mindestens ein Review (Produktverantwortliche), Force-Push verboten, Branch-Löschen-Schutz.
9. **Action-Pinning mit Commit-Hash** statt Tag (z. B. `uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11` statt `@v4`), gegen Supply-Chain-Risiken bei kompromittierten Actions.

## Konsequenzen

**Positiv.**
- Audit-Spur für externe Reviewer methodisch tragfähig — NLnet, Pilotpartner, anwaltliche Begleitung sehen dokumentierte Verifikations-Schichten; CI-Läufe sind reproduzierbar und archivierbar.
- Klassen-A-Disziplin systematisch durchgesetzt — kein Klasse-A-Code geht ohne CodeQL-Lauf, Wycheproof-Verifikation, HL7-Validator-Konformität durch.
- Reproducible-Build-Disziplin durch Output-Hash plus SBOM.
- Strikter Fail-Behavior etabliert die Disziplin früh.
- Drei-Workflow-Struktur balanciert Geschwindigkeit (Haupt), Vollständigkeit (Nightly), Release-Sorgfalt.
- SPDX-Wahl methodisch konsequent zu Behörden-Anschluss (CRA, NIS2), mit Flexibilität für CycloneDX bei Bedarf.

**Negativ.**
- Implementations-Aufwand gewichtig — 8–12 h Umsetzungsaufwand für v1.0, plus laufende Wartung (Action-Updates, Docker-Image-Updates, CodeQL-Befund-Behandlung).
- Strikter Fail-Behavior kann anfangs frustrieren, wenn False-Positives den Build abbrechen.
- HL7-Validator-Docker-Image ist groß — Nightly-Workflow läuft länger; GitHub-Actions-Minuten-Verbrauch ist zu beobachten (bei öffentlichen Repos kostenlos, aber mit Limits).
- Offene Lücke: CodeQL-False-Positive-Behandlung noch ungeklärt — nach zwei bis vier Wochen Erfahrung Regel-Anpassungen prüfen.
- Offene Lücke: GitHub-Actions-Minuten-Limits bei intensiver Nightly- plus Docker-Nutzung im Blick behalten; bei Überschreitung methodische Klärung nötig.
- Offene Lücke: Self-Hosted-Runner als mögliche Folge-Maßnahme, falls GitHub-Actions-Limits erreicht werden — eigener Aufwand, eigene Sicherheits-Konsequenzen.
- Offene Lücke: Diese ADR fokussiert auf Klasse-A-Kern; Klasse-B/C-Tests (UI, Bürger-Erlebnis) sind in der CI-Struktur enthalten, aber nicht detailliert ausgearbeitet.

**Neutral.**
- Der Review-Vorschlag „Semgrep" wird durch CodeQL ersetzt (GitHub-nativer); Semgrep kann später ergänzend für Custom-Regeln hinzukommen.
- Der Review-Vorschlag „Trivy/OSV-Scanner" entfällt, weil Vivodepot keine npm-Dependencies hat und der klassische Supply-Chain-Fall damit umgangen wird; SBOM für eingebettete Bibliotheken plus Action-Pinning übernehmen diese Schicht.

## Vor- und Nachteile der Optionen

### Option A — Minimal
- **Gut:** niedriger Aufwand (2–3 h).
- **Schlecht:** methodisch zu dünn für den NLnet-Antrag; Audit-Spur etabliert sich nicht.

### Option B — Mittel
- **Gut:** mittlerer Aufwand (4–6 h); Standard-Härtung etabliert.
- **Schlecht:** methodische Lücken bei Klasse-A-Disziplin, Supply-Chain-Argumentation, FHIR-Konformität.

### Option C — Vollständig (gewählt)
- **Gut:** methodisch tragfähig für externe Reviewer; Klassen-A-Disziplin systematisch durchgesetzt; Reproducible-Build-Disziplin etabliert; strikter Fail-Behavior verhindert versehentliche Lücken.
- **Schlecht:** Implementations-Aufwand gewichtig (8–12 h); operative Wartung; HL7-Validator-Docker-Image groß.

## Nachweis

> „Glocken und Pfeifen [vollständig für v1.0]"
>
> — *[Entscheidung zu CI/CD-Tiefe, ADR-Sitzung 04.05.2026]*

> „Wichtig ist, dass diese Tests standardmäßig durchlaufen werden."
>
> — *[Wertung zu Test-Integration, ADR-Sitzung 04.05.2026]*

> „Wir brauchen Interoperabilität und Standard-Konformität. Bitte das Tool wählen, das diesen Kriterien entspricht."
>
> — *[Auswahl zu SBOM-Format, ADR-Sitzung 04.05.2026]*

> „externe Prüfbarkeit der Audit-Spur ist das zentrale Vertrauens-Argument der KI-gestützten Arbeitsweise"
>
> — *[Gesamtkonzept v1.0, Vorbemerkung]*

Die Entscheidung wurde in neun Einzel-Klärungen der ADR-Sitzung vom 04.05.2026 entwickelt (CI/CD-Tiefe, SAST-Tool, Wycheproof-Integration als eigener Script, Alle-Tests-Standard, HL7-Validator-Docker, SBOM plus Output-Hash, Branch-Protection plus Action-Pinning, drei Workflows, strikter Fail-Behavior, SPDX-Format) — inhaltlich deckungsgleich mit den neun Festlegungen oben.

## Weiterführend

**Verwandte ADRs.**
- B16-ADR-055 — externe Verifikations-Anker (NIST plus Wycheproof), Vorgänger dieser Entscheidung.
- B16-ADR-070 — Disziplin-Regel 4, durch diese ADR präzisiert.
- B16-ADR-066 — Privacy-Erzwingung, methodischer Bezug.

**Bezugsdokumente.** Erhebungen zum CI/CD-Stand und zum Stand der Wycheproof-NIST-Tests (jeweils am Commit des damaligen Stands) sowie das externe Review zu Verifikations-Tools.

**Begleit-HTML-Dokumente (nicht migriert).** Zu diesem Hauptdokument existieren laut INDEX acht weitere HTML-Dateien zu B16-ADR-067 — vier Sub-Sprint-Aufträge und drei Präzisierungen zur Umsetzung. Diese bleiben bewusst als HTML liegen (Regel: nur Hauptdokumente werden zu `.md` migriert) und sind hier nicht inhaltlich eingearbeitet.

**Folge-Aktivitäten nach B16-ADR-067-Akzeptanz.**
1. Arbeitspaket CI/CD-Etablierung Sub-Sprint 1 — drei Workflow-Dateien plus Branch-Protection plus Action-Pinning (3–4 h, Klasse B)
2. Arbeitspaket CI/CD-Etablierung Sub-Sprint 2 — CodeQL-Integration plus `npm run test:external` (2–3 h, Klasse B)
3. Arbeitspaket CI/CD-Etablierung Sub-Sprint 3 — HL7-Validator-Docker-Integration in nightly (2–3 h, Klasse B)
4. Arbeitspaket CI/CD-Etablierung Sub-Sprint 4 — SBOM-Erstellung (SPDX) plus Output-Hash im Release-Workflow (1–2 h, Klasse B)
5. Arbeitsplan-v1.4-Aktualisierung mit korrigierter P0-Erfüllung (Klarstellung zur HL7-Validator-CI) plus B16-ADR-067-Kern
6. NLnet-Antrag-Kern aktualisieren — CI/CD-Kern als Audit-Anker benennen
7. Self-Assessment-Update in `docs/self-assessment/` mit CI/CD-Kern
8. Bürger-Anleitung SHA-256-Hash-Verifikation für v1.0-Auslieferung (parallel zur Supply-Chain-Strategie-Notiz)

**Bestätigung.** In der Klärungs-Sitzung 04.05.2026 bestätigt.
