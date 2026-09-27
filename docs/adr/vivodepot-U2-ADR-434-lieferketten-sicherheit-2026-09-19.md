# U2-ADR-434: Lieferketten-Sicherheit — festgeschriebene Versionen, erzeugte Stückliste, Schwachstellen-Abgleich

- **Status:** Angenommen (25.09.2026)
- **Status heute:** gilt — Belege im `konformitaet`-Block unten.
- **Angelegt:** 19.09.2026 als Entwurf B16-ADR-058; beim Annehmen als U2-ADR-434 nummeriert (keine akzeptierte ADR entschied die Sache bisher).
- **Herkunft:** Die ursprüngliche Skizze mit dieser Nummer ist nicht überliefert. Dieser Entwurf stützt sich ausschließlich auf Belege im heutigen Bestand.
- **Kategorie:** SICHERHEIT | PROZESS

## Was belegt ist

Die interne ADR-Gültigkeitsprüfung vom 19.07.2026 führt „Supply-Chain-Security" unter den fortgeltenden Entscheidungen: „umgesetzt, teils mit abweichenden Werkzeugen (CycloneDX statt SPDX, OSV statt CodeQL)". Die Einzelprüfung vom 13.07.2026 nennt als Beleg: Schwachstellen-Scan, Stückliste, Lockfile. Ein Originaltext der Skizze wurde in keiner Ablage gefunden.

## Was heute im Bestand gilt

Alle Stellen beziehen sich auf den Stand vom 19.09.2026 (Zeilenangaben können sich verschieben).

- **Lockfile:** `package-lock.json` in der Repo-Wurzel.
- **Stückliste (SBOM) im Format CycloneDX:** `vivodepot.sbom.cdx.json`. Sie wird erzeugt, nicht von Hand geschrieben: `tools/sbom-pflegen.js` (Kopfkommentar: Quellen sind die Bibliotheks-Marker in `vivodepot.html`, die Schrift-Blöcke und `code-listen/*.json`; Pflichtfelder nach BSI TR-03183 Teil 2). Aufruf über `package.json:43-44` (`sbom:build`, `sbom:check`).
- **Schwachstellen-Scan gegen OSV.dev:** `scripts/osv-scan.py`; Exit 1 bei Schwachstelle, Exit 2 bei Scan-Fehler (`.github/workflows/osv-scan.yml:1-11`).
- **Durchsetzung lokal:** `hooks/pre-commit` (Kopf: „Behavior-Suite + OSV-Schwachstellen-Scan") und `hooks/pre-push` (Kopf: OSV-Scan hart, auch bei Scan-Fehler), aktiviert über `git config core.hooksPath hooks`.
- **Workflow-Datei:** `.github/workflows/osv-scan.yml`. Ob die Workflows auf dem Hosting tatsächlich laufen, ist in diesem Entwurf nicht geprüft.

## Abweichung von der Skizze

Die Gültigkeitsprüfung nennt zwei Werkzeugwechsel: CycloneDX statt SPDX, OSV statt CodeQL. Was die Skizze selbst vorsah, ist nicht überliefert; belegt ist nur der heutige Stand.

## Verwandte Entscheidungen

- `vivodepot-B16-ADR-067-ci-cd-haertung-2026-05-04.md` — Aufbau der Prüfstrecke, in der der Scan läuft.
- `vivodepot-B16-ADR-066-privacy-erzwingung-2026-05-04.md` — Offline-Architektur; die Bibliotheken sind eingebettet, der Scan prüft diese eingebetteten Abhängigkeiten.

## Entscheidung

Entscheidung vom 25.09.2026: Keine fremde Bibliothek gelangt unbemerkt in das, was ausgeliefert wird.

1. **Festgeschriebene Versionen.** Jede Abhängigkeit aus `package.json` steht im Lockfile mit Version und Integritäts-Hash.
2. **Erzeugte Stückliste.** Die SBOM (CycloneDX) wird aus dem Bestand erzeugt, nicht von Hand geschrieben, und trägt die Pflichtfelder nach BSI TR-03183 Teil 2; eine Abweichung zwischen Bestand und Stückliste ist ein Fehler, keine Warnung.
3. **Schwachstellen-Abgleich gegen OSV.** Der pre-push fährt den Scan hart — auch ein Scan-Fehler hält ihn an; der pre-commit hält bei einem Fund an; die CI hat einen eigenen Lauf.

## Begründung

Der Bau stand, aber keine akzeptierte Entscheidung trug ihn; eine Zusicherung ohne Entscheidung und ohne Probe ist von einer fehlenden nicht zu unterscheiden. Warum CycloneDX statt SPDX und OSV statt CodeQL gewählt wurden, steht in keinem gefundenen Dokument; die Werkzeugnamen sind belegt, die Gründe werden hier nicht nachträglich erfunden.

## Offen

- Die Gründe der beiden Werkzeugwechsel sind nicht mehr rekonstruierbar (s. Begründung).
- Ob die Workflows auf dem Hosting tatsächlich laufen, prüft diese Entscheidung nicht; das ist Sache von B16-ADR-067.

## Konformität

```konformitaet
aussage:  Jede Abhängigkeit aus package.json steht im Lockfile mit Version und Integritäts-Hash.
zustand:  geprüft
herkunft: Entscheidung (1)
pruefung: tests/lieferkette-u2-adr-434.test.js#[U2-ADR-434·Lockfile] jede Abhängigkeit aus package.json steht im Lockfile, mit Version und Integritäts-Hash
pruefung: tests/lieferkette-u2-adr-434.test.js#[U2-ADR-434·Lockfile·Rot-Beweis] eine Abhängigkeit nur in package.json und eine ohne Hash werden gemeldet
```

```konformitaet
aussage:  Die Stückliste wird erzeugt, trägt die TR-03183-Pflichtfelder, und eine Abweichung zum Bestand wird gefunden.
zustand:  geprüft
herkunft: Entscheidung (2)
pruefung: tests/sbom-pflegen.test.js#[SBOM-Pflege] echte vivodepot.html + echte SBOM: keine Drift (Positivkontrolle des Ist-Zustands)
pruefung: tests/sbom-pflegen.test.js#[TR-03183] die erzeugte SBOM trägt alle sechs Pflichtfelder
pruefung: tests/sbom-pflegen.test.js#[Negativprobe / Rotmachbarkeit] eine gepflanzte Versions-Drift wird gefunden
```

```konformitaet
aussage:  Der OSV-Scan hält den pre-push hart an, den pre-commit bei einem Fund, und läuft in der CI als eigener Lauf.
zustand:  geprüft
herkunft: Entscheidung (3)
pruefung: tests/lieferkette-u2-adr-434.test.js#[U2-ADR-434·OSV] der pre-push fährt den Scan hart, der pre-commit blockiert bei einem Fund, die CI hat einen eigenen Lauf
pruefung: tests/lieferkette-u2-adr-434.test.js#[U2-ADR-434·OSV·Rot-Beweis] ein verschluckter Ausgang, ein Aufruf unter set +e und ein Fund ohne Abbruch werden erkannt
```
