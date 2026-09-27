# B16-ADR-059: CI/CD-Härtung (Entwurf zur Durchsicht)

- **Status:** Abgelehnt (25.09.2026) — als eigene Entscheidung nicht nötig, die Sache entscheidet B16-ADR-067
- **Status heute:** abgelehnt — es gilt `vivodepot-B16-ADR-067-ci-cd-haertung-2026-05-04.md`
- **Angelegt:** 19.09.2026
- **Herkunft:** Die ursprüngliche Skizze mit dieser Nummer ist nicht überliefert. Dieser Entwurf stützt sich ausschließlich auf Belege im heutigen Bestand.
- **Kategorie:** PROZESS | SICHERHEIT

## Was belegt ist

Die interne ADR-Gültigkeitsprüfung vom 19.07.2026 führt „CI/CD-Härtung" unter den fortgeltenden Entscheidungen: „umgesetzt, teils mit abweichenden Werkzeugen". Die Einzelprüfung vom 13.07.2026 nennt als Nachfolger die ausgeschriebene Entscheidung zum selben Thema. Ein Originaltext der Skizze wurde in keiner Ablage gefunden.

## Was heute im Bestand gilt

Alle Stellen beziehen sich auf den Stand vom 19.09.2026 (Zeilenangaben können sich verschieben).

- **Workflow-Dateien in `.github/workflows/`:** `e2e.yml` (E2E-Reisen), `e2e-cross.yml` (Vier-Komponenten), `konformitaet.yml` (Konformitäts-Gates, löst bei Änderung an `vivodepot.html` und den Konformitäts-Tests aus), `kampagne.yml` (alle Breiten), `osv-scan.yml` (Schwachstellen-Scan).
- **Lokale Schranken:** `hooks/pre-commit` (schnelle Gates, blockiert den Commit bei Rot) und `hooks/pre-push` (vollständige Gates: Krypto-Vektoren, Offline-Garantie, Barrierefreiheits-Prüfung, OSV-Scan; blockiert den Push bei Rot). Aktivierung: `git config core.hooksPath hooks`.
- Beide Hook-Köpfe halten fest, dass ein Push erst nach bestandener Konformitäts-Suite nach außen geht.
- **Nicht geprüft:** ob die Workflows auf dem Hosting derzeit tatsächlich ausgeführt werden. Belegt ist nur, dass die Dateien im Repo liegen; die lokalen Hooks sind die nachweisbare Schranke.

## Abweichung von der Skizze

Die Gültigkeitsprüfung nennt „teils abweichende Werkzeuge". Welche die Skizze vorsah, ist nicht überliefert.

## Verwandte Entscheidungen

- `vivodepot-B16-ADR-067-ci-cd-haertung-2026-05-04.md` — vollständig ausgeschrieben, dieselbe Sachfrage. Ob 059 die Vorstufe davon war, ist plausibel, aber nicht belegt.
- `vivodepot-U2-ADR-434-lieferketten-sicherheit-2026-09-19.md` — der Schwachstellen-Scan als Teil der Strecke (vormals Entwurf B16-ADR-058).

## Entscheidung

Abgelehnt (25.09.2026). B16-ADR-067 entscheidet dieselbe Sachfrage und ist akzeptiert. Dieser Entwurf bleibt als Beleg stehen, wo die Prüfstrecke am 19.09.2026 stand.

## Begründung

Die Gründe der Skizze sind nicht überliefert; die der geltenden Fassung stehen in B16-ADR-067 und werden hier nicht als Gründe der Skizze ausgegeben.

## Offen

- Klären, welche Workflows auf dem Hosting tatsächlich laufen sollen.
