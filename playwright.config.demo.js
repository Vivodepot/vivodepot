'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Playwright-Konfiguration — Demo-Rohaufnahmen (Deliverable 3, xShare-TD)
   ────────────────────────────────────────────────────────────────────────
   Getrennt von playwright.config.js (E2E-Reise-Ebene): diese Specs zeichnen
   STUMME Bildschirmvideos auf (recordVideo je Test, siehe tests/demo/*.spec.js)
   und laufen bewusst NICHT parallel (eine Aufnahme nach der anderen, damit
   Timing/Video nicht durch Nebenläufigkeit verzerrt wird).
   Bezug: „Playwright-Rohaufnahme der beiden Demo-Clips" (04.08.2026).
   ════════════════════════════════════════════════════════════════════════ */
const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'demo'),
  testMatch: '**/*.spec.js',
  timeout: 6 * 60 * 1000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'chromium', use: {} },
  ],
});
