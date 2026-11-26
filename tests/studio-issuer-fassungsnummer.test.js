'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio und VC-Issuer tragen die volle Fassungsnummer (Entscheidung 21.11.2026: ohne die Nummer gibt es keinen Support).
   STUDIO_FASSUNG und ISSUER_FASSUNG sind gleich SCHALEN_STAND in vivodepot.html; der Zugkopf-Commit setzt alle
   drei. Fußzeile und Einreichungspaket des Studios und das version-Feld des Issuers tragen „v1.0.<n>“.
   ROT-BEWEIS: der letzte Fall setzt eine abweichende Fassung ein und erwartet rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const R = (d) => fs.readFileSync(path.join(__dirname, '..', d), 'utf8');
const wert = (text, name) => { const m = text.match(new RegExp('^const ' + name + " = '(v\\d+)';", 'm')); return m ? m[1] : null; };

function befunde(studio, issuer, kern) {
  const f = [];
  const schale = wert(kern, 'SCHALEN_STAND'), s = wert(studio, 'STUDIO_FASSUNG'), i = wert(issuer, 'ISSUER_FASSUNG');
  if (!schale) f.push('SCHALEN_STAND nicht lesbar');
  if (s !== schale) f.push('STUDIO_FASSUNG ' + s + ' ≠ SCHALEN_STAND ' + schale);
  if (i !== schale) f.push('ISSUER_FASSUNG ' + i + ' ≠ SCHALEN_STAND ' + schale);
  if (!/^const GENERATOR_VERSION = 'v1\.0' \+ '\.' \+ STUDIO_FASSUNG\.slice\(1\);$/m.test(studio)) f.push('Studio: GENERATOR_VERSION ohne Fassung');
  if (!/^const ISSUER_VERSION = 'v1\.0' \+ '\.' \+ ISSUER_FASSUNG\.slice\(1\);$/m.test(issuer)) f.push('Issuer: ISSUER_VERSION ohne Fassung');
  if (!/fv\.textContent = GENERATOR_VERSION/.test(studio)) f.push('Studio: Fußzeile ohne Version');
  if ((studio.match(/generatorVersion: GENERATOR_VERSION/g) || []).length < 2) f.push('Studio: Einreichungspaket ohne Version');
  if ((issuer.match(/version: ISSUER_VERSION/g) || []).length < 2) f.push('Issuer: version-Feld ohne Version');
  return f;
}

test('[Fassungsnummer] Studio und Issuer tragen v1.0.<SCHALEN_STAND>', () => {
  assert.deepEqual(befunde(R('vivodepot-studio.html'), R('vivodepot-vc-issuer.html'), R('vivodepot.html')), []);
  const bsp = JSON.parse(R('docs/template-generator/beispiel-submission.json'));
  assert.match(bsp.generatorVersion, /^v1\.0\.\d+$/);
});

test('[Fassungsnummer · Rot-Beweis] eine abweichende oder fehlende Fassung wird rot', () => {
  const st = R('vivodepot-studio.html'), is = R('vivodepot-vc-issuer.html'), k = R('vivodepot.html');
  assert.ok(befunde(st.replace(/^const STUDIO_FASSUNG = 'v\d+';/m, "const STUDIO_FASSUNG = 'v1';"), is, k).some((x) => x.startsWith('STUDIO_FASSUNG')));
  assert.ok(befunde(st, is.replace(/^const ISSUER_FASSUNG = 'v\d+';/m, "const ISSUER_FASSUNG = 'v1';"), k).some((x) => x.startsWith('ISSUER_FASSUNG')));
  assert.ok(befunde(st.replace(/^const GENERATOR_VERSION = .*$/m, "const GENERATOR_VERSION = 'v1.0';"), is, k).some((x) => x.startsWith('Studio: GENERATOR_VERSION')));
});
