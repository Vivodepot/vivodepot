'use strict';
/* Speichern in Chromium, Firefox und WebKit (05.10.2026): eine Reise je Browser über file://, wie ein heruntergeladenes
   Produkt geöffnet wird. Specs: tests/e2e-drei-browser/. Lauf: npx playwright test --config=playwright.config.drei-browser.js
   (mit Suite-Platz, wie jede E2E-Reise). */
const { defineConfig, devices } = require('@playwright/test');
// U2-ADR-470: geschriebene HTML-Kopien (Rot-Beweise) tragen die passenden CSP-Hashes — s. tools/lib/csp-beim-schreiben.js.
require('./tools/lib/csp-beim-schreiben.js').einhaengen();
const path = require('node:path');
// Eigenes TMPDIR samt Temp-Netz für den ganzen Lauf (Befund TEMP-RESTE-WIEDER): BEIM LADEN gesetzt, nicht erst im globalSetup —
// tests/e2e/global-setup.js rechnet seine Pfade unter os.tmpdir() schon beim Laden aus, und die Specs laden es beim Sammeln.
// Worker erben die Umgebung; das globalTeardown räumt das Verzeichnis (tools/lib/test-lauf.js).
require('./tools/lib/test-lauf.js').playwrightLaufBeginnen();

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e-drei-browser'),
  testMatch: '**/*.spec.js',
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  fullyParallel: true,
  workers: require('./tools/lib/test-parallel.js').pwWorker(),
  reporter: 'list',
  use: {
    launchOptions: require('./tools/lib/netz-sperre.js').mitSperre(),   // harte Netzsperre: nur lokal (tools/lib/netz-sperre.js)
    trace: 'retain-on-failure', screenshot: 'only-on-failure', acceptDownloads: true,
  },
  outputDir: path.join(__dirname, 'tests', 'e2e-drei-browser', '.artifacts'),
  // Die iPad-Probe des Studios ist nur WebKit (das Gerät iPad ist WebKit); in den anderen Projekten läuft sie nicht,
  // statt sich dort auszusetzen.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: '**/studio-ipad.spec.js' },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: '**/studio-ipad.spec.js' },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
