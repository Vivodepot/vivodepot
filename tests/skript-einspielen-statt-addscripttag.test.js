'use strict';
/* Wächter: keine Probe spielt ein Skript per page.addScriptTag in eine Anwendung ein (U2-ADR-470).
   addScriptTag setzt Skript-Text — die Vertrauensregel der Anwendungen lehnt das ab, die Probe stirbt an der Ablehnung statt
   an ihrer Aussage (gemessen 20.10.2026: alle fünf Landmarks-Proben). Der Weg ist tools/lib/skript-einspielen.js.
   Erlaubt bleibt addScriptTag nur auf Seiten ohne die CSP einer Anwendung — je Datei mit Grund. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ERLAUBT = {
  'tests/e2e/jws-altlast-alg-chromium.spec.js': 'lädt den JWS-Block in eine leere Fixture-Seite ohne CSP',
  'tools/qr-decoder-korpus-messen.js': 'eigene Messseite mit eigener CSP, keine Anwendung',
};
const MUSTER = /\.addScriptTag\s*\(/;

function dateien(dir, aus = []) {
  for (const e of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'fixtures') dateien(rel, aus); }
    else if (/\.(c|m)?js$/.test(e.name)) aus.push(rel);
  }
  return aus;
}

test('[Skript-Einspielen] kein addScriptTag in Proben und Werkzeugen außer den benannten Seiten ohne Anwendungs-CSP', () => {
  const selbst = 'tests/' + path.basename(__filename);
  const funde = ['tests', 'tools', 'scripts'].filter((d) => fs.existsSync(path.join(REPO, d))).flatMap((d) => dateien(d))
    .filter((f) => f !== selbst && !ERLAUBT[f] && MUSTER.test(fs.readFileSync(path.join(REPO, f), 'utf8')));
  assert.deepEqual(funde, [], 'addScriptTag gegen eine Anwendung — tools/lib/skript-einspielen.js nehmen');
});

test('[Skript-Einspielen] jede Ausnahme trifft noch eine Datei mit addScriptTag (keine Karteileiche)', () => {
  for (const f of Object.keys(ERLAUBT)) {
    assert.ok(fs.existsSync(path.join(REPO, f)), 'Ausnahme ohne Datei: ' + f);
    assert.match(fs.readFileSync(path.join(REPO, f), 'utf8'), MUSTER, 'Ausnahme ohne addScriptTag: ' + f);
  }
});

test('[Skript-Einspielen·Rot-Beweis] der Wächter sieht ein addScriptTag', () => {
  assert.match('  await seite.addScriptTag({ path: AXE });', MUSTER);
});
