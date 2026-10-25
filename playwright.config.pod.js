'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Playwright-Konfiguration — Pod-Brücke gegen einen lokalen Community Solid Server
   ────────────────────────────────────────────────────────────────────────
   Eigene Strecke, nicht Teil von `npm run test:e2e`: sie braucht einen installierten @solid/community-server außerhalb des
   Repos (VD_POD_CSS) und überspringt sich ohne ihn. Alle Anfragen gehen an 127.0.0.1 oder localhost; die Netzsperre bleibt an.
   Aufruf: VD_POD_CSS=<Ordner mit @solid/community-server> npm run test:e2e:pod
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');
// U2-ADR-470: geschriebene HTML-Kopien tragen die passenden CSP-Hashes — s. tools/lib/csp-beim-schreiben.js.
require('./tools/lib/csp-beim-schreiben.js').einhaengen();
// Eigenes TMPDIR samt Temp-Netz für den ganzen Lauf (Befund TEMP-RESTE-WIEDER): BEIM LADEN gesetzt, nicht erst im globalSetup —
// Worker erben die Umgebung; das globalTeardown räumt das Verzeichnis (tools/lib/test-lauf.js).
require('./tools/lib/test-lauf.js').playwrightLaufBeginnen();

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e-pod'),
  testMatch: 'pod-bruecke.spec.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  use: {
    launchOptions: require('./tools/lib/netz-sperre.js').mitSperre(),   // harte Netzsperre: nur lokal (tools/lib/netz-sperre.js)
    ignoreHTTPSErrors: true,   // Wegwerf-Testzertifikat des lokalen Pods
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
