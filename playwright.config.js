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
// U2-ADR-470: geschriebene HTML-Kopien (Rot-Beweise) tragen die passenden CSP-Hashes — s. tools/lib/csp-beim-schreiben.js.
require('./tools/lib/csp-beim-schreiben.js').einhaengen();
const path = require('node:path');
// Eigenes TMPDIR samt Temp-Netz für den ganzen Lauf (Befund TEMP-RESTE-WIEDER): BEIM LADEN gesetzt, nicht erst im globalSetup —
// tests/e2e/global-setup.js rechnet seine Pfade unter os.tmpdir() schon beim Laden aus, und die Specs laden es beim Sammeln.
// Worker erben die Umgebung; das globalTeardown räumt das Verzeichnis (tools/lib/test-lauf.js).
require('./tools/lib/test-lauf.js').playwrightLaufBeginnen();

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e'),
  testMatch: '**/*.spec.js',
  // VD_PW_AUSLASSEN (04.10.2026): kommagetrennte Spec-Dateinamen, die dieser Lauf auslässt — gesetzt nur von einer Umgebung,
  // in der ein Browser nicht startet und die Specs anderswo laufen. Ohne die Variable läuft alles wie bisher.
  testIgnore: process.env.VD_PW_AUSLASSEN ? process.env.VD_PW_AUSLASSEN.split(',').filter(Boolean).map((n) => '**/' + n) : undefined,
  // Schnitt-Nachtrag (18.09.2026): backt die vier Produkte einmal vor dem ganzen Lauf —
  // s. Kopf-Kommentar in tests/e2e/global-setup.js für den Anlass und den gemessenen Preis.
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Höchstens ein Viertel der Kerne (die Hälfte der node-Parallelität), übersteuerbar mit PW_WORKERS oder
  // VD_TEST_PARALLEL — tools/lib/test-parallel.js (29.09.2026, der Rechner wurde bei zwei Läufen heiß).
  workers: process.env.CI ? 1 : require('./tools/lib/test-parallel.js').pwWorker(),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    launchOptions: require('./tools/lib/netz-sperre.js').mitSperre(),   // harte Netzsperre: nur lokal (tools/lib/netz-sperre.js)
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
