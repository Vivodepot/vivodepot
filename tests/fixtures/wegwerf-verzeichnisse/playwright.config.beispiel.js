'use strict';
/* Fixture für die Startweg-Achse (tools/wegwerf-verzeichnisse-pruefen.js): eine Playwright-Konfiguration, die das
   Laufverzeichnis beim Laden setzt und im globalTeardown räumt — das GUTE Beispiel. Wird nie geladen, nur gelesen. */
const path = require('node:path');
require('../../../tools/lib/test-lauf.js').playwrightLaufBeginnen();

module.exports = {
  testDir: path.join(__dirname, 'tests', 'e2e'),
  globalTeardown: require.resolve('../../e2e/global-teardown.js'),
};
