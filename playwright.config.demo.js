'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Playwright-Konfiguration — Demo-Rohaufnahmen (Deliverable 3, xShare-TD)
   ────────────────────────────────────────────────────────────────────────
   Getrennt von playwright.config.js (E2E-Reise-Ebene): diese Specs zeichnen
   STUMME Bildschirmvideos auf (recordVideo je Test, siehe tools/demo-aufnahme/*.spec.js)
   und laufen bewusst NICHT parallel (eine Aufnahme nach der anderen, damit
   Timing/Video nicht durch Nebenläufigkeit verzerrt wird).
   Bezug: „Playwright-Rohaufnahme der beiden Demo-Clips" (04.08.2026).
   ════════════════════════════════════════════════════════════════════════ */
const { defineConfig } = require('@playwright/test');
const path = require('node:path');
// Eigenes TMPDIR samt Temp-Netz für den ganzen Lauf (Befund TEMP-RESTE-WIEDER): BEIM LADEN gesetzt, nicht erst im globalSetup —
// tests/e2e/global-setup.js rechnet seine Pfade unter os.tmpdir() schon beim Laden aus, und die Specs laden es beim Sammeln.
// Worker erben die Umgebung; das globalTeardown räumt das Verzeichnis (tools/lib/test-lauf.js).
require('./tools/lib/test-lauf.js').playwrightLaufBeginnen();

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tools', 'demo-aufnahme'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.js'),
  testMatch: '**/*.spec.js',
  timeout: 6 * 60 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    launchOptions: require('./tools/lib/netz-sperre.js').mitSperre(),   // harte Netzsperre: nur lokal (tools/lib/netz-sperre.js)
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'chromium', use: {} },
  ],
});
