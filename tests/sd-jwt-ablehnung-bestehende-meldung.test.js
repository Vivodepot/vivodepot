'use strict';
/* Die Ablehnung einer ungebundenen SD-JWT-Offenlegung bringt keinen neuen Text mit.
   ──────────────────────────────────────────────────────────────────────────────────
   sdJwtOffenlegungenGebunden meldet eigene Gründe (offenlegung-nicht-gebunden, offenlegung-doppelt …). Der Einleseweg zeigt
   für jeden davon den vorhandenen Satz STRINGS.importUngueltig, so wie für eine ungültige Signatur. Die Gründe werden aus dem
   Quelltext der Funktion gelesen: ein neuer Grund ist ohne eigenen Handgriff mitgeprüft. Bekäme einer einen eigenen Text
   (IMPORT_GRUND_TEXT, neuer STRINGS-Schlüssel), wird die Probe rot; der Rot-Beweis zeigt das an einer Ersatz-Funktion.
   Eine benannte Ausnahme (Gegenlesung 23.11.2026): offenlegung-verschachtelt hat einen eigenen Satz
   (STRINGS.importSdJwtVerschachtelt), weil die Datei nicht kaputt ist, sondern eine Form trägt, die diese Fassung nicht an
   ihrer Stelle liest. Jeder andere Grund zeigt weiter den vorhandenen Satz. */
const EIGENER_SATZ = Object.freeze({ 'offenlegung-verschachtelt': 'importSdJwtVerschachtelt' });
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

function gruendeDerBindung(quelltext) {
  const start = quelltext.indexOf('async function sdJwtOffenlegungenGebunden(');
  assert.ok(start >= 0, 'sdJwtOffenlegungenGebunden nicht gefunden');
  const ende = quelltext.indexOf('\n}\n', start);
  const koerper = quelltext.slice(start, ende);
  const aus = new Set();
  for (const m of koerper.matchAll(/grund:\s*'([a-z0-9-]+)'/g)) aus.add(m[1]);
  return [...aus].sort();
}
function abweichungen(textFuer, gruende, erwartet) {
  return gruende.filter((g) => textFuer(g) !== erwartet);
}

test('[SD-JWT·Meldung] jeder Ablehnungsgrund der Bindung zeigt den vorhandenen Satz', () => {
  const { V } = ladeKern();
  const gruende = gruendeDerBindung(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
  assert.ok(gruende.includes('offenlegung-nicht-gebunden') && gruende.length >= 4, 'Gründe nicht gelesen: ' + gruende.join(', '));
  const erwartet = V.STRINGS.importUngueltig;
  assert.ok(typeof erwartet === 'string' && erwartet.length > 0);
  const textFuer = (g) => V.importPlanAbweisungText({ ungueltig: true, formatId: 'sd-jwt-vc-identitaet', grund: g });
  assert.equal(textFuer('signatur-ungueltig'), erwartet, 'Vergleichsfall ungültige Signatur');
  for (const [g, schluessel] of Object.entries(EIGENER_SATZ)) {
    assert.ok(gruende.includes(g), 'benannte Ausnahme nicht mehr im Quelltext: ' + g);
    assert.equal(textFuer(g), V.STRINGS[schluessel], 'eigener Satz für ' + g);
  }
  assert.deepEqual(abweichungen(textFuer, gruende.filter((g) => !(g in EIGENER_SATZ)), erwartet), [], 'Grund mit eigenem Text');
});

test('[SD-JWT·Meldung·Rot-Beweis] ein Grund mit eigenem Text fällt auf', () => {
  const textFuer = (g) => (g === 'offenlegung-doppelt' ? 'Eigener Satz' : 'Vorhandener Satz');
  assert.deepEqual(abweichungen(textFuer, ['offenlegung-nicht-gebunden', 'offenlegung-doppelt'], 'Vorhandener Satz'), ['offenlegung-doppelt']);
  assert.deepEqual(gruendeDerBindung("async function sdJwtOffenlegungenGebunden(t) {\n  return { grund: 'a-b' };\n}\n"), ['a-b']);
});
