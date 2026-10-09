'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Krypto-Parameter in SECURITY.md entsprechen dem Code (04.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Hält tools/krypto-parameter-tabelle.js: der Block in SECURITY.md ist genau
   das, was das Werkzeug aus Kern und Lese-App erzeugt.
   ROT-BEWEIS: ein Kern mit anderer Iterationszahl, eine von Hand geänderte
   Tabelle, ein Kern ohne Anker, eine Entscheidung ohne ADR-Datei.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pruefen, block, adrFehlend } = require('../tools/krypto-parameter-tabelle.js');

const REPO = path.join(__dirname, '..');
const lies = (r) => fs.readFileSync(path.join(REPO, r), 'utf8');
const echt = () => ({ kern: lies('vivodepot.html'), lesen: lies('vivodepot-lesen.html'), security: lies('SECURITY.md') });

test('[Krypto-Parameter] der Block in SECURITY.md entspricht dem Code', () => {
  assert.deepEqual(pruefen(echt()), []);
});

test('[Krypto-Parameter · Rot-Beweis] eine andere Iterationszahl im Kern macht den Block veraltet', () => {
  const t = echt();
  const kern = t.kern.replace('const PBKDF2_ITERATIONS = 600000;', 'const PBKDF2_ITERATIONS = 200000;');
  assert.notEqual(kern, t.kern, 'Pflanz-Anker fehlt');
  const lesen = t.lesen.replace('const PBKDF2_ITERATIONS = 600000;', 'const PBKDF2_ITERATIONS = 200000;');
  assert.equal(pruefen({ kern, lesen, security: t.security }).length, 1);
});

test('[Krypto-Parameter · Rot-Beweis] eine von Hand geänderte Zelle ist rot', () => {
  const t = echt();
  const security = t.security.replace('| PBKDF2-Salt | 16 Byte', '| PBKDF2-Salt | 32 Byte');
  assert.notEqual(security, t.security, 'Pflanz-Anker fehlt');
  assert.equal(pruefen({ kern: t.kern, lesen: t.lesen, security }).length, 1);
});

test('[Krypto-Parameter · Rot-Beweis] ein fehlender oder uneinheitlicher Anker bricht ab, statt einen Leerwert zu schreiben', () => {
  const t = echt();
  assert.throws(() => block(t.kern.replace('const SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES = 32;', ''), t.lesen), /SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES/);
  assert.throws(() => block(t.kern, t.lesen.replace('const KRYPTO_VERSION_ALLOWLIST = [3, 4];', 'const KRYPTO_VERSION_ALLOWLIST = [3];')), /Allowlist/);
});

test('[Krypto-Parameter · Rot-Beweis] eine Entscheidung ohne ADR-Datei ist rot', () => {
  const zeile = ['x', 'y', 'z', 'U2-ADR-9999, B16-ADR-085-Nachtrag'];
  assert.deepEqual(adrFehlend([zeile], ['vivodepot-B16-ADR-085-Nachtrag-a.md']), ['U2-ADR-9999']);
  assert.deepEqual(adrFehlend([zeile], []), ['U2-ADR-9999', 'B16-ADR-085-Nachtrag']);
});
