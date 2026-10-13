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

/* Weitere Dateien (09.10.2026): das Studio trägt seit W4 das Öffnen der Antworten; es wird ganz gemessen, mit eigener Grundlinie. */
test('[Krypto-Aufrufer] das Studio trägt keinen unbenannten Zuwachs', () => {
  const lesen = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  assert.ok(T.WEITERE_DATEIEN.includes('vivodepot-studio.html'));
  assert.deepEqual(T.pruefenWeitere(lesen, GRUNDLINIE), []);
});
test('[Negativprobe] [Krypto-Aufrufer·Rot-Beweis] ein zusätzlicher unwrapKey im Studio wird gefunden', () => {
  const lesen = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8') + (rel === 'vivodepot-studio.html' ? '\nconst x = await crypto.subtle.unwrapKey("raw", a, b, c, "AES-GCM", false, []);\n' : '');
  const f = T.pruefenWeitere(lesen, GRUNDLINIE);
  assert.ok(f.some((x) => x.startsWith('vivodepot-studio.html · unwrapKey:')), JSON.stringify(f));
});

/* Signieren und Prüfen (11.10.2026): `verify` und `sign` zählen mit, und Lese-App und VC-Issuer werden ganz gemessen. */
test('[Krypto-Aufrufer·verify/sign] beide Operationen werden gemessen und stehen für den Kern und jede weitere Datei in der Grundlinie', () => {
  const m = T.messen(KERN);
  assert.equal(typeof m.verify, 'number');
  assert.equal(typeof m.sign, 'number');
  assert.ok(m.verify >= 1 && m.sign >= 1, 'Vorbedingung: der JWS-Block außerhalb des gepinnten Blocks wird gesehen');
  for (const op of ['verify', 'sign']) {
    assert.ok(GRUNDLINIE.operationen[op] && GRUNDLINIE.operationen[op].grund, 'Kern · ' + op + ' ohne Zeile oder ohne Grund');
    for (const datei of T.WEITERE_DATEIEN) {
      const g = GRUNDLINIE.weitereDateien[datei];
      assert.ok(g && g.operationen[op] && g.operationen[op].grund, datei + ' · ' + op + ' ohne Zeile oder ohne Grund');
    }
  }
});

test('[Negativprobe] [Krypto-Aufrufer·verify/sign·Rot-Beweis] ein zweites verify und ein zweites sign außerhalb des Blocks werden gefunden, auch über einen Alias; im Block, im Kommentar und als Math.sign nicht', () => {
  const zeilen = KERN.split('\n');
  const [s] = T.blockGrenzen(zeilen);
  const direkt = KERN + '\nconst ok = await crypto.subtle.verify({ name: "Ed25519" }, k, sig, bytes);\nconst sg = await crypto.subtle.sign({ name: "Ed25519" }, k, bytes);\n';
  const f = T.pruefen(T.messen(direkt), GRUNDLINIE);
  assert.ok(f.some((x) => x.startsWith('verify:')), 'verify-Zuwachs nicht gefunden: ' + JSON.stringify(f));
  assert.ok(f.some((x) => x.startsWith('sign:')), 'sign-Zuwachs nicht gefunden: ' + JSON.stringify(f));
  const alias = KERN + '\nconst sb = crypto.subtle; const ok = await sb.verify({ name: "Ed25519" }, k, sig, bytes);\nconst sg = await sb.sign("HMAC", k, bytes);\n';
  const fa = T.pruefen(T.messen(alias), GRUNDLINIE);
  assert.ok(fa.some((x) => x.startsWith('verify:')), 'ein verify über einen Alias von crypto.subtle nicht gefunden');
  assert.ok(fa.some((x) => x.startsWith('sign:')), 'ein sign über einen Alias von crypto.subtle nicht gefunden');
  const harmlos = KERN + '\n// await crypto.subtle.verify( im Kommentar\n   * crypto.subtle.sign( im Blockkommentar\nconst v = Math.sign(-3);\n';
  assert.deepEqual(T.pruefen(T.messen(harmlos), GRUNDLINIE), [], 'Kommentar und Math.sign zählen nicht');
  const imBlock = zeilen.slice(0, s + 1).concat(['  const z = await crypto.subtle.verify({ name: "Ed25519" }, k, sig, bytes); const y = await crypto.subtle.sign("HMAC", k, bytes);'], zeilen.slice(s + 1)).join('\n');
  assert.deepEqual(T.pruefen(T.messen(imBlock), GRUNDLINIE), [], 'eine Stelle im gepinnten Block zählt nicht');
});

test('[Krypto-Aufrufer] Lese-App und VC-Issuer werden gemessen und tragen keinen unbenannten Zuwachs', () => {
  const lesen = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  for (const datei of ['vivodepot-lesen.html', 'vivodepot-vc-issuer.html']) assert.ok(T.WEITERE_DATEIEN.includes(datei), datei + ' wird nicht gemessen');
  assert.deepEqual(T.pruefenWeitere(lesen, GRUNDLINIE), []);
});

test('[Negativprobe] [Krypto-Aufrufer·Rot-Beweis] je weiterer Datei wird eine zusätzliche Stelle gefunden: verify, sign und eine der früheren Operationen', () => {
  for (const datei of T.WEITERE_DATEIEN) {
    const lesen = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
      + (rel === datei ? '\nconst ok = await crypto.subtle.verify({ name: "Ed25519" }, k, sig, bytes);\nconst sg = await crypto.subtle.sign({ name: "Ed25519" }, k, bytes);\nconst e = await crypto.subtle.exportKey("jwk", k);\n' : '');
    const f = T.pruefenWeitere(lesen, GRUNDLINIE);
    for (const op of ['verify', 'sign', 'exportKey']) assert.ok(f.some((x) => x.startsWith(datei + ' · ' + op + ':')), datei + ' · ' + op + ': ' + JSON.stringify(f));
    assert.ok(f.every((x) => x.startsWith(datei + ' · ')), 'nur die geänderte Datei meldet: ' + JSON.stringify(f));
  }
});
