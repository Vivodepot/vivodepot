'use strict';
/* Test 5 — KLASSE-A (muss vor jedem Commit grün sein)
   VdCrypto-Block-Integrität: der aus der HTML gelesene Krypto-Block hat den
   erwarteten Hash (== vivodepot-krypto-kern-PORT-VERBATIM.js). Damit wird ein
   versehentliches Antasten der Primitive sofort rot. (U2-ADR-002/004)
   Dies ist das Integritäts-Gate. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeKern, kryptoBlock, sha256, PORT_VERBATIM_PATH, BLOCK_HASH_ERWARTET } = require('./load-kern.js');

test('[Klasse-A] Block-Integrität: Block-Hash == erwarteter Hash', () => {
  const { script1 } = ladeKern();
  const block = kryptoBlock(script1);
  assert.equal(sha256(block), BLOCK_HASH_ERWARTET,
    'der eingebettete Krypto-Block weicht vom erwarteten Hash ab');
});

test('[Klasse-A] Block-Integrität: Block byte-identisch zu PORT-VERBATIM.js', () => {
  const { script1 } = ladeKern();
  const block = kryptoBlock(script1);
  const port = fs.readFileSync(PORT_VERBATIM_PATH, 'utf8');
  assert.equal(block, port, 'eingebetteter Block != PORT-VERBATIM.js');
  assert.equal(sha256(port), BLOCK_HASH_ERWARTET, 'PORT-VERBATIM.js-Hash unerwartet');
});
