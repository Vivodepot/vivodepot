'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Playwright-Konfiguration (Teil 7) — E2E-Reise-Ebene gegen den clean-rebuild
   ────────────────────────────────────────────────────────────────────────
   Die Bürger-App ist eine SINGLE-FILE-HTML; die Specs laden sie direkt über
   file:// — kein Server nötig. Die Schicht-1-Suite (node --test) bleibt davon
   unberührt; Playwright greift NUR tests/e2e/*.spec.js.

   HINWEIS Umgebung: Der tatsächliche Lauf braucht Browser-Binaries
   (`npx playwright install chromium`). In der Bau-Sandbox waren weder
   @playwright/test noch die Binaries beschaffbar (npm-Registry 403) — der Lauf
   passiert am Mac (mit Netz) oder in CI (.github/workflows/e2e.yml). Das Gerüst
   und die Specs sind vollständig und lauffähig konfiguriert.
   ════════════════════════════════════════════════════════════════════════ */
const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e'),
  testMatch: '**/*.spec.js',
  // Schnitt-Nachtrag (18.09.2026): backt die vier Produkte einmal vor dem ganzen Lauf —
  // s. Kopf-Kommentar in tests/e2e/global-setup.js für den Anlass und den gemessenen Preis.
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
