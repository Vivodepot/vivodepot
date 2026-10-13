'use strict';
/* QR-Übergabe eines Empfängerkreises, Format v2 (U2-ADR-156-Nachtrag QR-Übergabe, 05.10.2026).
   Der Kern schreibt `v: 2` und verschlüsselt mit der AAD `vivodepot/empfaenger-qr/v2`; die Lese-App liest `v` und wählt danach
   den Zweig. Ein umgeschriebenes `v` scheitert in beide Richtungen an GCM. v1 (ohne AAD) nimmt die Lese-App nur bis
   EMPFAENGER_QR_V1_ANNAHME_BIS an; die Entfall-Probe wird rot, sobald BUILD_DATUM des Kerns danach liegt und der v1-Zweig noch
   steht. Die Lese-App normalisiert das Passwort auf NFC wie der Kern.
   Die v1-Codes baut die Probe selbst, genau in der Form, die der Kern bis 05.10.2026 schrieb (PBKDF2 600 000, SHA-256, 16 Byte
   Salz, AES-256-GCM ohne AAD); der Kern schreibt sie nicht mehr. Alle Passwörter sind Testwerte dieser Probe. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeKern, webcrypto, HTML_PATH } = require('./load-kern.js');
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');
const { nurCode } = require('../tools/anzeige-index-leser.js');

const KERN_PW = 'kern-passwort-1234!!';
const TEST_PW = 'empfaenger-pw-12';
const VOR_STICHTAG = Date.parse('2026-10-05T12:00:00Z');
const NACH_STICHTAG = Date.parse('2026-11-16T00:00:01Z');

const b64u = (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const ausB64u = (s) => JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
const umschreiben = (payloadB64, aendern) => { const u = ausB64u(payloadB64); aendern(u); return b64u(Buffer.from(JSON.stringify(u))); };

async function kernPayload(pw) {
  const { V } = ladeKern();
  await V.depotAnlegen(KERN_PW);
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  await V.empfaengerkreisSetzen({ id: 'k1', name: 'Tochter', bausteine: ['notfall'] });
  const erg = await V.empfaengerQrHerausgeben(V.empfaengerkreisFinden('k1'), pw || TEST_PW);
  return { V, payloadB64: erg.url.split('#')[1].slice(V.EMPFAENGER_QR_HASH_PRAEFIX.length) };
}

async function schluessel(pw, salt, nutzung) {
  const basis = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(pw), { name: 'PBKDF2' }, false, ['deriveKey']);
  return webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    basis, { name: 'AES-GCM', length: 256 }, false, [nutzung]);
}

/* Ein Code in der Form v1, wie ihn der Kern bis 05.10.2026 schrieb: ohne AAD. */
async function v1Payload(pw) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const nutzlast = { v: 1, kreis: 'Tochter', erzeugt: VOR_STICHTAG, ablauf: VOR_STICHTAG + 86400000, inhalt: { sektoren: { identity: { givenName: 'Anna' } } } };
  const ct = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, await schluessel(pw.normalize('NFC'), salt, 'encrypt'),
    new TextEncoder().encode(JSON.stringify(nutzlast)));
  return b64u(Buffer.from(JSON.stringify({ v: 1, s: Buffer.from(salt).toString('base64'), i: Buffer.from(iv).toString('base64'),
    c: Buffer.from(new Uint8Array(ct)).toString('base64') })));
}

test('[QR-AAD] Kern schreibt v2, Lese-App öffnet v2', async () => {
  const { V, payloadB64 } = await kernPayload();
  assert.equal(ausB64u(payloadB64).v, 2);
  const L = ladeLesen().V;
  assert.equal(L.EMPFAENGER_QR_AAD, V.EMPFAENGER_QR_AAD, 'die AAD steht in Kern und Lese-App zeichengleich');
  assert.equal(V.EMPFAENGER_QR_AAD, 'vivodepot/empfaenger-qr/v2');
  const n = await L._empfaengerQrEntschluesseln(payloadB64, TEST_PW);
  assert.equal(n.v, 2);
  assert.equal(n.kreis, 'Tochter');
  assert.equal(n.inhalt.sektoren.identity.givenName, 'Anna');
});

test('[QR-AAD·Rot] v2 mit falscher AAD scheitert', async () => {
  const { payloadB64 } = await kernPayload();
  const u = ausB64u(payloadB64);
  const k = await schluessel(TEST_PW, Buffer.from(u.s, 'base64'), 'decrypt');
  const oeffnen = (aad) => webcrypto.subtle.decrypt(
    Object.assign({ name: 'AES-GCM', iv: Buffer.from(u.i, 'base64') }, aad == null ? {} : { additionalData: new TextEncoder().encode(aad) }),
    k, Buffer.from(u.c, 'base64'));
  await oeffnen('vivodepot/empfaenger-qr/v2');                       // Gegenprobe: mit der richtigen AAD geht es
  await assert.rejects(() => oeffnen('vivodepot/empfaenger-qr/v3'));
  await assert.rejects(() => oeffnen(null), 'ohne AAD öffnet ein v2-Code nicht');
});

test('[QR-AAD·Rot] v2 auf v1 umgeschrieben scheitert', async () => {
  const { payloadB64 } = await kernPayload();
  const L = ladeLesen().V;
  await assert.rejects(() => L._empfaengerQrEntschluesseln(umschreiben(payloadB64, (u) => { u.v = 1; }), TEST_PW, VOR_STICHTAG));
});

test('[QR-AAD·Rot] v1 auf v2 umgeschrieben scheitert; v1 vor dem Stichtag öffnet', async () => {
  const L = ladeLesen().V;
  const v1 = await v1Payload(TEST_PW);
  const n = await L._empfaengerQrEntschluesseln(v1, TEST_PW, VOR_STICHTAG);
  assert.equal(n.inhalt.sektoren.identity.givenName, 'Anna');
  await assert.rejects(() => L._empfaengerQrEntschluesseln(umschreiben(v1, (u) => { u.v = 2; }), TEST_PW, VOR_STICHTAG));
});

test('[QR-AAD·Rot] v1 nach dem Stichtag scheitert', async () => {
  const L = ladeLesen().V;
  assert.equal(L.EMPFAENGER_QR_V1_ANNAHME_BIS, '2026-11-15');
  const v1 = await v1Payload(TEST_PW);
  await L._empfaengerQrEntschluesseln(v1, TEST_PW, Date.parse('2026-11-15T23:59:59Z'));   // der Tag selbst gilt noch
  await assert.rejects(() => L._empfaengerQrEntschluesseln(v1, TEST_PW, NACH_STICHTAG), /qr-fassung-entfallen/);
});

test('[QR-AAD] eine unbekannte Version wird benannt abgelehnt, nicht geraten', async () => {
  const { payloadB64 } = await kernPayload();
  const L = ladeLesen().V;
  for (const v of [3, 0, '2', undefined]) {
    await assert.rejects(() => L._empfaengerQrEntschluesseln(umschreiben(payloadB64, (u) => { u.v = v; }), TEST_PW), /qr-fassung-unbekannt/);
  }
});

test('[QR-AAD] die Lese-App sagt bei fremder Fassung, dass sie den Code nicht öffnen kann, nicht „falsches Passwort“', async () => {
  const { payloadB64 } = await kernPayload();
  const Lr = ladeLesen();
  let absenden = null;
  const orig = Lr.document.getElementById.bind(Lr.document);
  Lr.document.getElementById = (id) => {
    const e = orig(id);
    if (id === 'pw-form' && e) e.addEventListener = (art, fn) => { if (art === 'submit') absenden = fn; };
    return e;
  };
  Lr.V.renderEmpfaengerQrPasswort(umschreiben(payloadB64, (u) => { u.v = 9; }));
  assert.ok(absenden, 'Vorbedingung: der Submit-Handler ist eingefangen');
  orig('pw-feld').value = TEST_PW;
  await absenden({ preventDefault() {} });
  assert.equal(orig('pw-fehler').textContent, Lr.V.STRINGS.kreiseQrFassung);
  assert.notEqual(Lr.V.STRINGS.kreiseQrFassung, Lr.V.STRINGS.pwFalsch);
});

test('[QR-AAD] ein NFD-Passwort öffnet einen mit NFC erzeugten Code', async () => {
  const nfc = 'Prüfwort-Grüße'.normalize('NFC');
  const nfd = nfc.normalize('NFD');
  assert.notEqual(nfc, nfd, 'Vorbedingung: die zwei Formen sind verschiedene Zeichenfolgen');
  const { payloadB64 } = await kernPayload(nfc);
  const L = ladeLesen().V;
  const n = await L._empfaengerQrEntschluesseln(payloadB64, nfd);
  assert.equal(n.kreis, 'Tochter');
});

/* Entfall: liegt BUILD_DATUM des Kerns nach dem Stichtag, darf die Lese-App keinen v1-Zweig mehr tragen. */
function entfallVerletzung(buildDatum, leseHtml, bis) {
  if (!(buildDatum > bis)) return null;
  return /EMPFAENGER_QR_V1_ANNAHME_BIS|\.v\s*===\s*1\b/.test(nurCode(leseHtml)) ? 'v1-zweig-nach-stichtag' : null;
}
test('[QR-AAD·Entfall] nach dem Stichtag existiert kein v1-Zweig mehr', () => {
  const kern = fs.readFileSync(HTML_PATH, 'utf8');
  const m = kern.match(/const BUILD_DATUM = '(\d{4}-\d{2}-\d{2})';/);
  assert.ok(m, 'Vorbedingung: BUILD_DATUM im Kern gefunden');
  const lesen = fs.readFileSync(LESEN_PATH, 'utf8');
  assert.equal(entfallVerletzung(m[1], lesen, '2026-11-15'), null,
    'BUILD_DATUM ' + m[1] + ' liegt nach dem Stichtag, und die Lese-App nimmt v1 noch an: v1-Zweig entfernen oder den Tag per Nachtrag verschieben');
});
test('[QR-AAD·Entfall·Rot] ein BUILD_DATUM nach dem Stichtag mit stehendem v1-Zweig wird gemeldet', () => {
  const lesen = fs.readFileSync(LESEN_PATH, 'utf8');
  assert.equal(entfallVerletzung('2026-11-16', lesen, '2026-11-15'), 'v1-zweig-nach-stichtag');
  assert.equal(entfallVerletzung('2026-11-15', lesen, '2026-11-15'), null, 'am Stichtag selbst noch nicht');
});
