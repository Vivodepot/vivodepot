# E2E-Reise-Ebene — Anleitung

Die Test-Suite hat zwei Schichten:

- **Schicht 1 — Unit/Krypto/Integration** (`npm test`, `node --test`). Läuft offline,
  ohne Browser, in Millisekunden. Lädt die `<script>`-Blöcke der HTML in einen
  Node-Kontext mit DOM-Stub. 375 Tests grün / 1 skip (HL7-Validator skippt ohne Java).
- **Schicht 2 — E2E-Reisen + axe** (`npm run test:e2e`, Playwright). Klickt die echte
  App in einem echten Browser durch (Chromium) und prüft Barrierefreiheit (axe,
  WCAG 2.2 AA). Braucht Browser-Binaries.

## Einmalig einrichten (am Mac / mit Netz)
```
npm install                 # @playwright/test + @axe-core/playwright
npm run test:e2e:install    # lädt den Chromium-Browser (npx playwright install)
```

## Ausführen
```
npm run test:e2e            # alle Reisen + axe-Scans
npm run test:e2e:report     # HTML-Report der letzten Läufe öffnen
```
Einzelne Reise: `npx playwright test tests/e2e/03-wizard-pvwiz.spec.js`
Sichtbar (zum Zuschauen): `npx playwright test --headed`

## Die Reisen (tests/e2e/)
- `00-smoke` — App lädt offline über file://, Welcome erscheint, keine Konsolen-Fehler.
- `01-erstanlage` — Depot anlegen → Bereich → Feld eintragen → bleibt stehen.
- `02-anlass-blatt-export` — Anlass „Arzttermin" → Situationsblatt → JSON-Export (Download).
- `03-wizard-pvwiz` — geführter Einstieg in Bereich 8 (Patientenverfügung): Start, Fortschritt,
  Weiter/Zurück, Abbrechen → Ausgangsbereich. Fuhr bis U2-ADR-096 auf dem entfallenen `vvwiz`.
- `04-vollmacht-submodus` — Vollmacht-Modus färbt schieferblau; Verwaltete-Depots-Sicht.
- `05-angehoerigen` — Vertrauensperson-Vollbild mit den Akut-Karten.
- `06-notfall-cache` — Notfall-Sicht zeigt die Akut-Allowlist; Stufe-1-Einstieg vom Welcome.
- `07-axe` — WCAG-2.2-AA-Scan über Welcome, Sektor-Sicht und die vier Modus-Färbungen.

## Wichtig — Umgebung
Schicht 2 braucht `@playwright/test` und die Browser-Binaries (siehe „Einmalig einrichten").
Sie läuft lokal oder in CI (`.github/workflows/e2e.yml`, Job `e2e-reisen`). Schicht 1 ist
davon unberührt und bleibt der schnelle Offline-Gate.

Hinweis axe: `07-axe` lässt den Test nur bei **schweren/kritischen** Verstößen rot
werden; moderate/minor Hinweise werden in der Konsole protokolliert (zum Priorisieren),
damit der erste Lauf nicht an Kleinigkeiten scheitert.
