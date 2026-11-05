'use strict';
// Befund A5-DATEIDIALOG-WACKELT (04.11.2026): eine E2E-Probe wartete 5 s auf den Dateidialog und lief unter Last
// (Air-Runner) in den Timeout, ohne dass sich am Produkt etwas geändert hatte. Wächter gegen die Klasse: keine Spec
// wartet mit einer eigenen Frist unter 15 s auf den Dateidialog. Ohne eigene Frist gilt die Playwright-Frist des Tests.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const MINDEST_MS = 15000;
const MUSTER = /waitForEvent\(\s*['"]filechooser['"]\s*,\s*\{[^}]*timeout:\s*(\d+)/g;

function kurzeFristen(text) {
  const funde = [];
  for (const m of text.matchAll(MUSTER)) if (Number(m[1]) < MINDEST_MS) funde.push(Number(m[1]));
  return funde;
}

function specs(dir) {
  const aus = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) aus.push(...specs(p));
    else if (e.name.endsWith('.spec.js')) aus.push(p);
  }
  return aus;
}

test('[A5-DATEIDIALOG-WACKELT·Rot-Beweis] eine Frist von 5 s fällt auf, 15 s und keine Frist nicht', () => {
  assert.deepStrictEqual(kurzeFristen("page.waitForEvent('filechooser', { timeout: 5000 })"), [5000]);
  assert.deepStrictEqual(kurzeFristen("page.waitForEvent('filechooser', { timeout: 15000 })"), []);
  assert.deepStrictEqual(kurzeFristen("page.waitForEvent('filechooser')"), []);
});

test('[A5-DATEIDIALOG-WACKELT·Klasse] keine E2E-Spec wartet kürzer als 15 s auf den Dateidialog', () => {
  const wurzel = path.join(__dirname, 'e2e');
  const funde = [];
  for (const datei of specs(wurzel)) {
    for (const ms of kurzeFristen(fs.readFileSync(datei, 'utf8'))) funde.push(`${path.relative(wurzel, datei)}: ${ms} ms`);
  }
  assert.deepStrictEqual(funde, [], 'Dateidialog-Frist unter 15 s');
});
