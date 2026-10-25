'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Pod-Brücke: über die Grenze geht nur Chiffrat (U2-ADR-512, Punkt 3)
   ────────────────────────────────────────────────────────────────────────
   Die Brücke (pod/) ist eine eigene Seite mit Netz. Sie legt im Pod nur ab, was der Kern selbst verschlüsselt hat. Die Tür
   dafür ist pod/chiffrat-pruefen.js, eine reine Formprüfung ohne Schlüssel.

   WAS DIESE PROBE HÄLT
     1. Die drei Formen des Kerns gehen durch: SHL-JWE (alg dir), Antwort-JWE (PBES2), Depot-Datei mit Hülle v3 oder v4.
     2. Rot-Beweise: Klartext, JSON ohne Hülle, eine Hülle mit einem Feld, das der Kern nicht schreibt, ein JWE mit
        unbekanntem Verfahren, ein „dir“-JWE mit Schlüsselteil und eine Datei mit beiden Hüllenformen werden abgewiesen.
     3. Eine echte Depot-Datei des Kerns geht durch: erzeugt mit den Kernfunktionen dateiMitMagic und der Feldliste
        UMSCHLAG_FELDER_BEKANNT, damit die Tür nicht still vom Kern abweicht.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../pod/chiffrat-pruefen.js');

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const jwe = (kopf, ek = '') => [b64u(kopf), ek, b64u('iv-iv-iv-iv'), b64u('chiffrat'), b64u('tag-tag-tag-tag')].join('.');
const huelleV3 = { kryptoVersion: 3, depotUUID: 'u', pbkdf2: { salt: 's', iterations: 600000 }, depotSalt: 'd', iv: 'i', ct: 'c' };
const huelleV4 = { kryptoVersion: 4, depotUUID: 'u', pbkdf2: { salt: 's' }, depotSalt: 'd', einheiten: { a: 'x' }, umschlagTabelle: [{ f: 1 }] };
const depot = (u) => 'VIVODEPOT\u0001' + JSON.stringify(u, null, 2);

test('[Pod-Brücke·Chiffrat] die drei Formen des Kerns gehen durch', () => {
  assert.deepEqual(C.pruefen(jwe({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' })), { art: 'shl' });
  assert.deepEqual(C.pruefen(jwe({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', p2c: 600000, p2s: 'x', typ: 't', cty: 'json', vorgang: 'v' }, b64u('ek'))), { art: 'antwort' });
  assert.deepEqual(C.pruefen(jwe({ alg: 'ECDH-ES', enc: 'A256GCM', typ: 't', cty: 'json', vorgang: 'v', anbieter: 'a', epk: {}, apv: 'dg' })), { art: 'antwort' });
  assert.deepEqual(C.pruefen(depot(huelleV3)), { art: 'depot' });
  assert.deepEqual(C.pruefen(depot(Object.assign({ stand_marke: 'm' }, huelleV4))), { art: 'depot' });
});

test('[Pod-Brücke·Chiffrat·Rot-Beweis] Klartext und alles, was nicht genau die Form des Kerns hat, wird abgewiesen', () => {
  const faelle = {
    'Klartext': 'Name: Erna Beispiel, geboren 1940',
    'JSON ohne Hülle': JSON.stringify({ name: 'Erna' }),
    'Depot-Präfix mit Klartext': 'VIVODEPOT\u0001' + JSON.stringify({ name: 'Erna' }),
    'Hülle mit fremdem Feld': depot(Object.assign({ notiz: 'Erna Beispiel' }, huelleV3)),
    'beide Hüllenformen': depot(Object.assign({}, huelleV3, { einheiten: { a: 1 }, umschlagTabelle: [1] })),
    'JWE, unbekanntes Verfahren': jwe({ alg: 'none', enc: 'A256GCM' }),
    'JWE, andere Inhaltsverschlüsselung': jwe({ alg: 'dir', enc: 'A128CBC-HS256' }),
    'dir mit Schlüsselteil': jwe({ alg: 'dir', enc: 'A256GCM' }, b64u('k')),
    'ECDH-ES mit Schlüsselteil': jwe({ alg: 'ECDH-ES', enc: 'A256GCM', epk: {} }, b64u('k')),
    'PBES2 ohne Schlüsselteil': jwe({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', p2s: 'x', p2c: 1 }),
    'ECDH-ES+A256KW (schreibt der Kern nicht)': jwe({ alg: 'ECDH-ES+A256KW', enc: 'A256GCM', epk: {} }, b64u('k')),
    'SHL-Kopf mit fremdem Feld': jwe({ alg: 'dir', enc: 'A256GCM', cty: 'x', name: 'Erna Beispiel' }),
    'Antwort-Kopf mit fremdem Feld': jwe({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', p2s: 'x', p2c: 1, notiz: 'Erna' }, b64u('ek')),
    'JWS statt JWE': [b64u({ alg: 'ES256' }), b64u({ name: 'Erna' }), b64u('sig')].join('.'),
    'leer': ''
  };
  for (const [name, text] of Object.entries(faelle)) {
    assert.ok(C.pruefen(text).fehler, name + ' muss abgewiesen werden, war ' + JSON.stringify(C.pruefen(text)));
  }
});

test('[Pod-Brücke·Chiffrat·Kern] die Tür kennt genau die Hüllenfelder und das Präfix des Kerns', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const m = kern.match(/const UMSCHLAG_FELDER_BEKANNT = (\[[^\]]+\]);/);
  assert.ok(m, 'UMSCHLAG_FELDER_BEKANNT im Kern gefunden');
  const kernFelder = JSON.parse(m[1].replace(/'/g, '"'));
  const tuerFelder = C.HUELLE.filter((f) => f !== 'stand_marke' && f !== 'gespeichert_am');
  assert.deepEqual([...tuerFelder].sort(), [...kernFelder].sort(), 'Feldliste der Tür = Feldliste des Kerns');
  assert.match(kern, /const DATEI_MAGIC = 'VIVODEPOT';/);
  assert.match(kern, /const DATEI_MAGIC_PREFIX = DATEI_MAGIC \+ String\.fromCharCode\(DATEI_MAGIC_VERSION\);/);
  assert.match(kern, /dateiInhalt = Object\.assign\(\{\}, umschlag, marke \? \{ stand_marke: marke \} : \{ gespeichert_am: ts \}\);/,
    'neben die Hülle schreibt der Kern nur stand_marke oder gespeichert_am');
});

test('[Pod-Brücke·Chiffrat·Kern] die Kopffelder der Tür sind genau die, die der Kern schreibt', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const shl = kern.match(/const kopf = \{ alg: 'dir', enc: 'A256GCM', cty: 'application\/fhir\+json' \};/);
  assert.ok(shl, 'SHL-Kopf im Kern unverändert');
  const basis = kern.match(/function _jweKopfBasis\(meta\) \{[\s\S]*?const k = \{ ([^}]+) \};[\s\S]*?if \(m\.anbieterId\) k\.anbieter =/);
  assert.ok(basis, '_jweKopfBasis im Kern gefunden');
  const basisFelder = basis[1].split(',').map((x) => x.split(':')[0].trim()).concat(['anbieter']);
  assert.match(kern, /Object\.assign\(\{ alg: 'ECDH-ES' \}, _jweKopfBasis\(meta\), \{ epk \}\);[\s\S]{0,120}kopf\.apv = /);
  assert.match(kern, /Object\.assign\(\{ alg: ANTWORT_JWE_PBES2 \}, _jweKopfBasis\(meta\), \{ p2s: [^,]+, p2c: ANTWORT_JWE_P2C \}\);/);
  assert.deepEqual([...C.KOPF['ECDH-ES']].sort(), ['alg', ...basisFelder, 'epk', 'apv'].sort());
  assert.deepEqual([...C.KOPF['PBES2-HS512+A256KW']].sort(), ['alg', ...basisFelder, 'p2s', 'p2c'].sort());
  assert.deepEqual([...C.KOPF.shl].sort(), ['alg', 'cty', 'enc']);
});
