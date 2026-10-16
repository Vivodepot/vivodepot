'use strict';
/* Sub-Depot als verschlüsselte Datei exportieren, über den echten Klickweg, dann wieder öffnen — in Chromium, Firefox und
   WebKit (Befund SUB-DEPOT-EXPORT-KLICKWEG). Ablauf und Herleitung: tests/e2e/sub-depot-export-klickweg.spec.js. */
const { test } = require('@playwright/test');
const { durchspielen } = require('../e2e/sub-depot-export-klickweg-ablauf.js');

test('[Sub-Depot·Export·Klickweg] aus dem eigenen Depot: verschlüsselte Datei, dann wieder öffnen', async ({ page }, testInfo) => {
  await durchspielen(page, testInfo, { nachBetreten: false });
});

test('[Sub-Depot·Export·Klickweg] nach dem Betreten des Sub-Depots: verschlüsselte Datei, dann wieder öffnen', async ({ page }, testInfo) => {
  await durchspielen(page, testInfo, { nachBetreten: true });
});
