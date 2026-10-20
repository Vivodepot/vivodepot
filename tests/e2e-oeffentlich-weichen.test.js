'use strict';
/* E2E-Weichen für den öffentlichen Zuschnitt (20.10.2026, öffentlicher Lauf v933). Für Playwright gibt es tests/helfer/nur-privat.js
   nicht; ein Test, der öffentlich nicht laufen kann, setzt als erste Zeile `test.skip(OEFFENTLICHER_ZUSCHNITT …, '<Grund>')`.
   Diese Probe zählt jede solche Stelle und verlangt, dass sie hier mit Datei und Grund steht — exakt, kein Spielraum. Eine
   neue Weiche ohne Eintrag, ein Grund außerhalb der Liste oder ein toter Eintrag fällt. Die Liste kann nur sinken (Register der
   Gegenlesung). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUENDE = Object.freeze(['öffentlich kein Pro-Produkt', 'öffentlich ohne die zurückgehaltenen Vorlagen']);
const WEICHEN = Object.freeze({
  'tests/e2e/eine-anlege-aufforderung-je-ansicht.spec.js': ['öffentlich kein Pro-Produkt'],
  'tests/e2e/f8-dokument-oeffner-abnahme.spec.js': ['öffentlich ohne die zurückgehaltenen Vorlagen'],
  'tests/e2e/fix-6-trefferflaechen.spec.js': ['öffentlich ohne die zurückgehaltenen Vorlagen'],
  'tests/e2e/nachlese-f8-m1-zug4-abnahme.spec.js': ['öffentlich ohne die zurückgehaltenen Vorlagen'],
});

const STELLE = /test\.skip\(\s*OEFFENTLICHER_ZUSCHNITT\b[^,]*,\s*(['"`])(.*?)\1\s*\)/g;

/* Je Datei die Gründe ihrer Weichen. Rein. */
function weichenIn(dateien) {
  const aus = {};
  for (const [rel, text] of dateien) {
    const g = [...text.matchAll(STELLE)].map((m) => m[2]);
    if (g.length) aus[rel] = g;
  }
  return aus;
}

function befunde(gefunden, liste, gruende) {
  const b = [];
  for (const [rel, g] of Object.entries(gefunden)) {
    for (const grund of g) if (!gruende.includes(grund)) b.push(rel + ': Grund nicht benannt: ' + grund);
    if (JSON.stringify(g) !== JSON.stringify(liste[rel] || [])) b.push(rel + ': Weichen ' + JSON.stringify(g) + ' statt ' + JSON.stringify(liste[rel] || []));
  }
  for (const rel of Object.keys(liste)) if (!gefunden[rel]) b.push(rel + ': toter Eintrag');
  return b;
}

function specs() {
  const ordner = path.join(REPO, 'tests', 'e2e');
  return fs.readdirSync(ordner).filter((n) => n.endsWith('.spec.js'))
    .map((n) => ['tests/e2e/' + n, fs.readFileSync(path.join(ordner, n), 'utf8')]);
}

test('[E2E-Weichen] jede Weiche für den öffentlichen Zuschnitt steht mit Datei und benanntem Grund in der Liste, exakt', () => {
  assert.deepEqual(befunde(weichenIn(specs()), WEICHEN, GRUENDE), []);
});

test('[E2E-Weichen·Rot-Beweis] eine ungelistete Weiche, ein fremder Grund und ein toter Eintrag fallen', () => {
  const gefunden = weichenIn([
    ['tests/e2e/a.spec.js', "test.skip(OEFFENTLICHER_ZUSCHNITT, 'öffentlich kein Pro-Produkt');"],
    ['tests/e2e/b.spec.js', "test.skip(OEFFENTLICHER_ZUSCHNITT && x, 'weil es halt rot ist');"],
  ]);
  const b = befunde(gefunden, { 'tests/e2e/c.spec.js': ['öffentlich kein Pro-Produkt'] }, GRUENDE);
  assert.ok(b.includes('tests/e2e/b.spec.js: Grund nicht benannt: weil es halt rot ist'), JSON.stringify(b));
  assert.ok(b.some((x) => x.startsWith('tests/e2e/a.spec.js: Weichen')), JSON.stringify(b));
  assert.ok(b.includes('tests/e2e/c.spec.js: toter Eintrag'), JSON.stringify(b));
});
