'use strict';
/* U2-ADR-430 Ziffer 4 („kein dritter Ableitungsweg“): die Krypto-Stellen außerhalb des gepinnten Blocks stehen in einer
   Grundlinie, erhoben vor dem Bau des Wiederherstellungs-Codes (tools/krypto-aufrufer-pruefen.js). Ein Zuwachs ist nur
   benannt erlaubt. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../tools/krypto-aufrufer-pruefen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const GRUNDLINIE = JSON.parse(fs.readFileSync(T.GRUNDLINIE, 'utf8'));

test('[Krypto-Aufrufer] der Kern trägt außerhalb des gepinnten Blocks keinen unbenannten Zuwachs', () => {
  const m = T.messen(KERN);
  assert.ok(Object.keys(m).length >= 8, 'Vorbedingung: alle Operationen gemessen');
  assert.deepEqual(T.pruefen(m, GRUNDLINIE), []);
});

test('[Negativprobe] [Krypto-Aufrufer·Rot-Beweis] ein zusätzlicher unwrapKey, ein zweiter PBKDF2-Weg und ein encrypt über einen Alias außerhalb des Blocks werden gefunden, im Block und im Kommentar nicht', () => {
  const zeilen = KERN.split('\n');
  const [s] = T.blockGrenzen(zeilen);
  const ausserhalb = KERN + '\nconst x = await crypto.subtle.unwrapKey("raw", a, b, c, "HKDF", false, []);\nconst y = await deriveMasterBits(p, s);\nconst o = crypto.subtle; await o.encrypt(a, b, c);\n// crypto.subtle.unwrapKey( im Kommentar\n';
  const f = T.pruefen(T.messen(ausserhalb), GRUNDLINIE);
  assert.ok(f.some((x) => x.startsWith('unwrapKey:')), 'unwrapKey-Zuwachs nicht gefunden');
  assert.ok(f.some((x) => x.startsWith('deriveMasterBits:')), 'deriveMasterBits-Zuwachs nicht gefunden');
  assert.ok(f.some((x) => x.startsWith('encrypt:')), 'ein encrypt über einen Alias von crypto.subtle nicht gefunden');
  const imBlock = zeilen.slice(0, s + 1).concat(['  const z = await crypto.subtle.unwrapKey("raw", a, b, c, "HKDF", false, []);'], zeilen.slice(s + 1)).join('\n');
  assert.deepEqual(T.pruefen(T.messen(imBlock), GRUNDLINIE), [], 'eine Stelle im gepinnten Block zählt nicht');
});
