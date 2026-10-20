'use strict';
/* ════════════════════════════════════════════════════════════════════════
   e2e-workflow-browser.test.js — der öffentliche Job E2E-Reisen installiert jeden Browser, den seine Konfiguration startet (17.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Von v928 bis v930 war der Workflow „E2E-Reisen“ im öffentlichen Repo rot, für jeden sichtbar: der Job installierte nur chromium,
   aber drei Specs der Standardkonfiguration starten WebKit selbst (`webkit.launch(`), und Playwright meldete „Executable doesn't
   exist … webkit“. Geprüft: die Browser aus den Projekten von playwright.config.js und aus den Specs, die einen Browser selbst
   starten, stehen alle in der Installationszeile des Jobs e2e-reisen. Rot-Beweis an eingesetztem Text. Die Erhebung liegt in
   tools/lib/e2e-workflow-browser.js; der öffentliche Lauf (tools/oeffentlicher-lauf-beleg.js) liest dieselbe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

const { selbstGestartet, installiert, abgleich } = require('../tools/lib/e2e-workflow-browser.js');

test('[E2E-Workflow·Browser] der Job e2e-reisen installiert jeden Browser, den die Standardkonfiguration startet', () => {
  const r = abgleich(REPO);
  assert.ok(r.specs > 50, 'Vorbedingung: die Specs sind gelesen');
  assert.ok(r.ausSpecs.includes('webkit'), 'Vorbedingung: mindestens eine Spec startet WebKit selbst');
  assert.ok(r.installiert, 'Vorbedingung: der Job e2e-reisen steht im Workflow');
  assert.deepEqual(r.fehlend, [], 'Browser fehlt in der Installation des Jobs e2e-reisen');
});

test('[E2E-Workflow·Browser·Rot-Beweis] ein fehlender Browser fällt auf, ein vorhandener nicht', () => {
  const wf = (zeile) => 'jobs:\n  schicht1-unit:\n    steps:\n      - run: npx playwright install chromium firefox webkit\n'
    + '  e2e-reisen:\n    steps:\n      - run: ' + zeile + '\n      - run: npm run test:e2e\n';
  assert.deepEqual(installiert(wf('npx playwright install --with-deps chromium'), 'e2e-reisen'), ['chromium'], 'nur der eigene Job zählt, nicht der Nachbar');
  assert.deepEqual(installiert(wf('npx playwright install --with-deps chromium webkit'), 'e2e-reisen'), ['chromium', 'webkit']);
  assert.deepEqual(selbstGestartet("const b = await webkit.launch();\nawait firefox.launchPersistentContext(d);"), ['webkit', 'firefox']);
  assert.deepEqual(selbstGestartet("// webkit\nconst { webkit } = require('@playwright/test');"), [], 'ein Import allein startet nichts');
});
