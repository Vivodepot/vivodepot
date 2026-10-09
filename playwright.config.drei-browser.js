'use strict';
/* Speichern in Chromium, Firefox und WebKit (05.10.2026): eine Reise je Browser über file://, wie ein heruntergeladenes
   Produkt geöffnet wird. Specs: tests/e2e-drei-browser/. Lauf: npx playwright test --config=playwright.config.drei-browser.js
   (mit Suite-Platz, wie jede E2E-Reise). */
const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e-drei-browser'),
  testMatch: '**/*.spec.js',
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  fullyParallel: true,
  workers: require('./tools/lib/test-parallel.js').pwWorker(),
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', acceptDownloads: true },
  outputDir: path.join(__dirname, 'tests', 'e2e-drei-browser', '.artifacts'),
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
