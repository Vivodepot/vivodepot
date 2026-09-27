'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Playwright-Konfiguration — Firefox-Abnahme (Speicherweg ohne Datei-Picker)
   ────────────────────────────────────────────────────────────────────────
   Eigene Config PARALLEL zu playwright.config.js (Bürger-App-internes E2E,
   fährt nur Chromium — s. dort Rang 0.3 „Nur Chromium. Für Safari existiert
   kein Playwright-Weg in dieser Umgebung."). Diese hier fährt tests/e2e-firefox/
   in echtem Firefox: Firefox hat KEIN File System Access API — genau der Weg,
   auf dem der Zug-0-Befund dieses Auftrags entstand (Auftrag „Speicherweg ohne
   Datei-Picker", 09.08.2026): fünf Sicherungen erzeugten fünf Dateien mit
   Browser-Zähler-Suffix, die Kopfzeile blieb bei „1 ungespeicherte Änderung"
   hängen. Ein Chromium-Lauf (mit FSA-Attrappe) sieht diesen Weg NIE.

   `npx playwright install firefox` wird gebraucht (separates Binary von
   Chromium, nicht Teil von `test:e2e:install`). Bewusst NICHT Teil des
   Standard-`npm run test:e2e` — Firefox-Abnahme ist eine gezielte, seltene
   Prüfung für Änderungen am Nicht-Picker-Weg, kein Dauerlauf. Aufruf:
   `npx playwright test --config=playwright.config.firefox.js`.
   ════════════════════════════════════════════════════════════════════════ */
const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  // Das Produkt wird vor dem Lauf gebacken (wie tests/e2e): die rohe vivodepot.html ist seit dem Schnitt ein Gerüst ohne Bereiche.
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  testDir: path.join(__dirname, 'tests', 'e2e-firefox'),
  testMatch: '**/*.spec.js',
  fullyParallel: false,   // Downloads landen im selben Kontext-Downloads-Verzeichnis — seriell, deterministisch.
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    acceptDownloads: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
