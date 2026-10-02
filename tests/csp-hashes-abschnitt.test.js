'use strict';
/* Der Abschnitt zwischen den CSP_HASHES-Markern in tools/lib/csp-hashes.js steht byte-gleich im Download-Gateway
   (dort in einer ESM-Hülle). Eine kopierte Funktion, die still vom Original abweicht, baut Produkte, deren Inline-Blöcke
   der Browser blockiert. Darum ist die sha256 des Abschnitts hier gepinnt, und dieselbe Zahl im Gateway.
   Ändert sich der Abschnitt, ändert sich die Zahl in BEIDEN Repositorien im selben Zug. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const GEPINNT = 'c668ac7bd3319a1d2b051034e1c79214f02e771ab9f8a0b77344736f12e4f522';
const BEGIN = '/* ==CSP_HASHES:BEGIN== */';
const END = '/* ==CSP_HASHES:END== */';

function abschnitt(text) {
  const a = text.indexOf(BEGIN);
  const e = text.indexOf(END);
  if (a < 0 || e < a) throw new Error('CSP_HASHES-Marker fehlen');
  return text.slice(a + BEGIN.length, e);
}
const summe = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

test('[CSP-Hashes·Abschnitt] die gepinnte Prüfsumme stimmt — dieselbe steht im Gateway', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'tools', 'lib', 'csp-hashes.js'), 'utf8');
  assert.equal(summe(abschnitt(text)), GEPINNT);
});

test('[CSP-Hashes·Abschnitt·Rot-Beweis] ein geändertes Zeichen im Abschnitt ändert die Prüfsumme', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'tools', 'lib', 'csp-hashes.js'), 'utf8');
  assert.notEqual(summe(abschnitt(text.replace("'sha256-", "'sha384-"))), GEPINNT);
});
