# U2-ADR-020: Rename `vivodepot-clean-slate-kern.html` → `vivodepot.html`; Auflösung der Pages-Drift (Weg 1)

**Status:** Akzeptiert
**Datum:** 18.06.2026
**Kategorie:** ARCHITEKTUR, DISTRIBUTION, BUILD
**U2-Bezug:** `U2-ADR-015` (D43 — PWA/Service-Worker-Auslieferung, Pages als Auslieferung-nicht-Betrieb), `U2-ADR-004` (Teststrategie/Block-Hash-Gate), `U2-ADR-002` (eine Datei = der Kern). Produktiv-Bezug: `ADR-001` (Single-File).
**Drei-Anker:**
- **Code-Stelle:** Datei-Rename `vivodepot-clean-slate-kern.html` → `vivodepot.html` (+ abgeleitete `…sbom.cdx.json`, `…html.sha256`) und alle ~70 Referenzen (Test-Loader, Tools, CI-Pfad-Filter, PWA-Schale `sw.js`/`manifest.webmanifest`/Inline-Manifest, SBOM, Lizenz-Dateien, ADRs).
- **Sprint-Commit:** dieser Bau (Commit 4 der Reihe — isoliert, nur Rename-betroffene Dateien).
- **ADR-Bezug:** dieser ADR (U2-ADR-020).
**Status heute:** gilt — `vivodepot.html` ist weiterhin die eine Auslieferungs- und Testdatei (`tests/load-kern.js:56`), keine `index.html`-Kopie.

---

## Kontext

Der Dateiname `vivodepot-clean-slate-kern.html` war ein interner Arbeitsname („clean-slate-kern"). Für die öffentliche Auslieferung ist `vivodepot.html` der saubere Name. Zugleich bestand eine **Drift-Quelle**: `pages/index.html` war eine **von Hand gepflegte byte-identische Kopie** des Kerns (umbenannt zu `index.html`, weil GitHub Pages `index.html` als Verzeichnis-Einstieg ausliefert) — sie driftete still vom Kern weg (zuletzt pre-D55). Dazu zwei eingefrorene Diagnose-Schnappschüsse (`vivodepot-DIAGNOSE.html`, `vivodepot-test-leicht.html`). Die vorangegangene Stufe-1-Analyse legte zwei Wege vor (eigenständiger ADR-Vorlauf, hier nicht wiederholt).

## Entscheidung — Weg 1 (pur)

**`vivodepot.html` ist selbst der Auslieferungs-Einstieg. Keine `index.html`-Kopie, kein Redirect-Stub. Genau eine App-Datei — dieselbe, die die Tests laden.**

1. **Rename** `vivodepot-clean-slate-kern.html` → `vivodepot.html`; abgeleitet `…sbom.cdx.json` → `vivodepot.sbom.cdx.json`, `…html.sha256` → `vivodepot.html.sha256`.
2. **Drift-Quelle aufgelöst:** `pages/index.html` entfernt (keine zweite App-Datei mehr). Diagnose-Schnappschüsse `vivodepot-DIAGNOSE.html` + `vivodepot-test-leicht.html` entfernt.
3. **Alle Referenzen nachgezogen** (Suite + Auslieferung brechen sonst): Test-Loader (`tests/load-kern.js` zentral + ~20 weitere), Tools/Skripte (`osv-scan.py` → SBOM, `build-code-listen.js`, `font-subset.py`, `manifest-slim.py`), CI-Workflows samt Pfad-Filtern (e2e, fhir-ips, konformitaet, osv-scan), SBOM-Inhalt (`name`/`subjects`), `.sha256`-Inhalt, `THIRD_PARTY_LICENSES`, `OFL.txt`, Kern-Selbst-Kommentare, Docs/ADRs/Style-Guide/`package.json`/`.gitignore`/Test-Command.
4. **PWA-Schale + Cache-Disziplin (Distributions-kritisch):** `sw.js` (Cache-Liste + Offline-Fallback) und `manifest.webmanifest` (`start_url`) auf `vivodepot.html`; zusätzlich die **Service-Worker-Cache-Version hochgezählt** (`vivodepot-shell-v1` → `-v2`), damit eine bereits installierte PWA den alten Cache beim `activate` verwirft und den neuen Stand lädt, sobald die Testerin bewusst online geht. (Ein Service Worker hält sonst die alte gecachte Schale fest — „bewusst online" allein genügt nicht.)

**Inventur-Lücke (gefunden + geschlossen):** Die `start_url` lag **zusätzlich** base64-kodiert im **Inline-Manifest** des Kerns (`data:application/manifest+json;base64,…`) — von der Plain-Text-Inventur nicht erfasst, vom Test `d43-etappe7-manifest` aufgedeckt (Inline muss == separate sein). Wert erzwungen (`vivodepot.html`), kein Spielraum; im dekodierten JSON nur dieser eine String geändert, neu kodiert. Es war die einzige versteckte Referenz.

## Konsequenzen

- **Genau eine App-Datei** (`vivodepot.html`) = dieselbe, die `load-kern.js` und alle Gates laden. Keine Kopie, keine Drift mehr.
- **Distribution:** Alte `vivodepot-clean-slate-kern.html`-/alte `vivodepot.html`-Stände (B16, Umbau 1) liegen nur bei **3–5 Testern**. Aktualisierung über **bewusstes Online-Update** der Programm-Schale **plus** die neue SW-Cache-Version (`-v2`), die den alten Schalen-Cache räumt. Kein Distributions-Risiko bei dieser Tester-Zahl und dem bewussten Update-Pfad.
- **Krypto unberührt:** VdCrypto-Block-Pin `8d31c678906a4916372340d1eb05474ee44e400a6affa204e00aa8053e650258` unverändert (Block-Integritäts-Test grün; nur Kommentare + Inline-Manifest im `<head>` geändert, beide außerhalb des Blocks). Neuer **Voll-Datei-SHA** `dec619782240c3c89655f1c931992b2e7dc99ee5cdf7ce26565bf7daadacb2c1` (`vivodepot.html.sha256` aktualisiert). Suite 884/0 (1 bewusster FHIR-Skip).

## Offener Punkt (gemeldet, nicht eigenmächtig gelöst)

Das **`pages/`-Staging-Bündel** (`pages/sw.js`, `pages/manifest.webmanifest`, `pages/README.md`, `pages/.nojekyll`) ist mit Weg 1 in seiner bisherigen Form (Kopie via `index.html`) überholt — `pages/index.html` ist entfernt, die übrigen Dateien verweisen aber noch auf die alte `index.html`-Logik. Ob das Bündel **ganz entfällt** oder als Deploy-Staging bleibt und auf `vivodepot.html` umgestellt wird, ist eine Distributions-Entscheidung — **bewusst nicht in diesem Bau gelöscht** (Auftrag: „falls unklar, stoppen und melden"). Folge-Produktentscheidung.

## Implementations-Verweis

Umgesetzt 18.06.2026 (clean-rebuild): Datei-Renames (`git mv`), Entfernen der drei Kopien (`git rm`), Stamm-Referenz-Ersetzung über alle Fundstellen (außer `pages/sw.js` = Stop-Bündel), Kern-Inline-Manifest-`start_url` neu kodiert, SW-Cache-Version `-v2`, `.sha256` neu berechnet. Suite 884/0/1, Block-Pin unverändert.
