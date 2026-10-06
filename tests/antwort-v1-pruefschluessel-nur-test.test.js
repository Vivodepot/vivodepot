'use strict';
/* Der Wegwerf-Prüfschlüssel der eingefrorenen v1-Umschläge (tests/fixtures/antwort-v1-umschlaege.json, Feld testPrivateJwk)
   bleibt ein Testwert. Der Geheimnis-Scanner nimmt ihn als benannte Ausnahme aus, eng: genau diese Datei, genau diese Stelle
   und die Probe-Marke im d. Diese Probe hält die Bedingungen der Gegenlesung zu dieser Ausnahme:
   - das Feld heißt erkennbar test…, und sein d beginnt mit der Probe-Marke;
   - weder der öffentliche Teil (x, y) noch d steht in irgendeiner versionierten Datei außerhalb von tests/: in keinem
     Produkt, keinem Anker, keiner Positivliste und keiner Depot-Datei. Ein Prüfschlüssel, der dorthin wandert, wäre kein
     Prüfschlüssel mehr. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const FIXTURE_REL = 'tests/fixtures/antwort-v1-umschlaege.json';
const MARKE = 'NURPROBE' + 'antwortV1';   // die Probe-Marke der Ausnahme, zusammengesetzt wie ein Fixture-Wert

function pruefschluessel() {
  const f = JSON.parse(fs.readFileSync(path.join(REPO, FIXTURE_REL), 'utf8'));
  return f.schluesselpaar.testPrivateJwk;
}

/* Rein: welche Dateien außerhalb von tests/ tragen einen der Werte? */
function fundeAusserhalbTests(dateien, lesen, werte) {
  const funde = [];
  for (const d of dateien) {
    if (d.startsWith('tests/')) continue;
    let t; try { t = lesen(d); } catch (_) { continue; }
    for (const w of werte) if (t.includes(w)) funde.push(d);
  }
  return funde;
}

function versionierteDateien() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: REPO, env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 }).toString('utf8').split('\0').filter(Boolean);
}

test('[Antwort v1 · Prüfschlüssel] Feld test…, und d trägt die Probe-Marke', () => {
  const f = JSON.parse(fs.readFileSync(path.join(REPO, FIXTURE_REL), 'utf8'));
  assert.deepEqual(Object.keys(f.schluesselpaar).sort(), ['testPrivateJwk', 'umschlag']);
  const jwk = f.schluesselpaar.testPrivateJwk;
  assert.ok(jwk.d.startsWith(MARKE), 'd beginnt mit der Probe-Marke');
  assert.equal(jwk.kty, 'EC'); assert.equal(jwk.crv, 'P-256');
});

test('[Antwort v1 · Prüfschlüssel] x, y und d stehen in keiner versionierten Datei außerhalb von tests/', () => {
  const jwk = pruefschluessel();
  const dateien = versionierteDateien();
  assert.ok(dateien.includes(FIXTURE_REL), 'Testvoraussetzung: die Fixture ist versioniert');
  const funde = fundeAusserhalbTests(dateien, (d) => fs.readFileSync(path.join(REPO, d), 'latin1'), [jwk.x, jwk.y, jwk.d]);
  assert.deepEqual(funde, []);
});

test('[Antwort v1 · Prüfschlüssel · Rot-Beweis] ein Anker oder ein Produkt mit dem öffentlichen Teil wird gefunden, tests/ nicht', () => {
  const jwk = pruefschluessel();
  const welt = {
    'docs/vertrauensanker.json': '{"x":"' + jwk.x + '"}',
    'vivodepot.html': '… "y": "' + jwk.y + '" …',
    'tests/anderer-test.js': jwk.x,
    'tools/sauber.json': '{}',
  };
  const funde = fundeAusserhalbTests(Object.keys(welt), (d) => welt[d], [jwk.x, jwk.y, jwk.d]);
  assert.deepEqual(funde, ['docs/vertrauensanker.json', 'vivodepot.html']);
});
