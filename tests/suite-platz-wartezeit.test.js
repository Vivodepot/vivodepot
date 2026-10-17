'use strict';
/* Wartezeit auf den Suite-Platz (16.10.2026): Vorgabe 7200 s an EINER Stelle (tools/lib/suite-platz.js, WARTEN_S_VORGABE und
   wartenS), überschreibbar mit VD_SUITE_PLATZ_WARTEN_S. Bis hierher stand 600 s in jedem Aufrufer; zweimal in einer Nacht brach
   ein Push nach zehn Minuten ab, weil beide Plätze lange belegt waren.
   1. Vorgabe und Überschreiben.
   2. Klasse: kein Werkzeug unter tools/ setzt eine eigene Zahl als Rückfall für VD_SUITE_PLATZ_WARTEN_S (Rot-Beweis am alten
      Muster). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sp = require('../tools/lib/suite-platz.js');

const REPO = path.join(__dirname, '..');

test('[Platz·Wartezeit] Vorgabe 7200 s, die Umgebungsvariable überschreibt, Unsinn fällt auf die Vorgabe', () => {
  assert.equal(sp.WARTEN_S_VORGABE, 7200);
  assert.equal(sp.wartenS({}), 7200);
  assert.equal(sp.wartenS({ VD_SUITE_PLATZ_WARTEN_S: '30' }), 30);
  assert.equal(sp.wartenS({ VD_SUITE_PLATZ_WARTEN_S: 'x' }), 7200);
  assert.equal(sp.wartenS({ VD_SUITE_PLATZ_WARTEN_S: '0' }), 7200);
});

const EIGENE_ZAHL = /VD_SUITE_PLATZ_WARTEN_S\s*\|\|\s*\d+/;
function eigeneZahlen(dateien) {
  return dateien.filter(([, text]) => EIGENE_ZAHL.test(text)).map(([rel]) => rel);
}
function werkzeuge() {
  const aus = [];
  const lauf = (rel) => {
    for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') lauf(r); continue; }
      if (/\.(c|m)?js$/.test(e.name)) aus.push([r.split(path.sep).join('/'), fs.readFileSync(path.join(REPO, r), 'utf8')]);
    }
  };
  lauf('tools');
  return aus;
}

test('[Platz·Wartezeit·Klasse] kein Werkzeug setzt eine eigene Rückfallzahl für die Wartezeit', () => {
  assert.deepEqual(eigeneZahlen(werkzeuge()), []);
});

test('[Platz·Wartezeit·Klasse·Rot-Beweis] das frühere Muster „VD_SUITE_PLATZ_WARTEN_S || 600“ wird gefunden, der Aufruf von wartenS nicht', () => {
  const frueher = 'wartenS: Number(process.env.' + 'VD_SUITE_PLATZ_WARTEN_S || 600),';
  assert.deepEqual(eigeneZahlen([['tools/x.js', frueher], ['tools/y.js', 'wartenS: sp.wartenS(),']]), ['tools/x.js']);
});
