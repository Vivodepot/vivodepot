'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   oid4vp-spike.test.js — OID4VP-Spike (O1): die Anfrage-JWS mit ES256/ES384/ES512, und der Schnitt der Spike-Spanne
   ────────────────────────────────────────────────────────────────────────────
   Gegenstand ist die Spanne „OID4VP-SPIKE (O1, nur Entwicklerfassung)" in vivodepot.html, eine ENTWICKLERLEISTE-Spanne, die
   aus jedem Produkt geschnitten wird. Seit 15.10.2026 liegt der X.509-Leser (DER, Zertifikat, Kette, ECDSA) im Produktteil
   (Spanne X509-LESER, Probe tests/x509-leser.test.js); hier bleibt, was die OID4VP-Anfrage betrifft.

   LADEWEG: `ladeKern()` bäckt das Standardprodukt mit `mitEntwicklerleiste: true` — die Spike-Spanne bleibt im Test-Artefakt;
   die Funktionen kommen über `opts.zusatzBindungen` (V.__zusatz).

   WAS GILT, je mit eigenem Fall:
   · die JWS: nur ES256/ES384/ES512, alg an die Kurve gebunden, Signaturlänge fest, crit abgelehnt; unter WebKit ist ES512
     „kurve-nicht-gemessen";
   · nach dem Schnitt der Entwicklerleiste steht kein Bezeichner des Spikes mehr im Text — mit Rot-Beweis.
   FIXTURES: tests/fixtures/oid4vp/ (eingefroren, tools/oid4vp-test-zertifikate-erzeugen.js; nur Test).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { _entwicklerleisteSchneiden, ENTWICKLERLEISTE_MARKEN } = require('../tools/lib/produkt-text-erzeugen.js');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const FIX = path.join(__dirname, 'fixtures', 'oid4vp');
const JETZT = '2026-10-14T12:00:00Z';
const NAMEN = ['_x509Lesen', '_x509StellePruefen', '_x509ClientIdBinden', '_oid4vpJwsPruefen'];
// WebKit erkennt der Kern an einer Fähigkeit (_webkitEngine: CSS.supports('font', '-apple-system-body')), nicht am Namen.
const CSS_WEBKIT = { supports: (p, v) => p === 'font' && v === '-apple-system-body' };

let _K = null;
const K = () => (_K = _K || ladeKern({ zusatzBindungen: NAMEN }).V.__zusatz);

const pemB64 = (name) => fs.readFileSync(path.join(FIX, 'test-' + name + '.crt'), 'utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
const der = (name) => new Uint8Array(Buffer.from(pemB64(name), 'base64'));
const jws = (name) => fs.readFileSync(path.join(FIX, 'test-' + name + '.jws'), 'utf8').trim();
const b64u = (text) => Buffer.from(text).toString('base64url');
const teile = (j) => j.split('.');
const kopfVon = (j) => JSON.parse(Buffer.from(teile(j)[0], 'base64url').toString('utf8'));
const mitKopf = (j, kopf) => [b64u(JSON.stringify(kopf)), teile(j)[1], teile(j)[2]].join('.');
function tlv(tag, inhalt) {
  const n = inhalt.length;
  const kopf = n < 0x80 ? [tag, n] : n < 0x100 ? [tag, 0x81, n] : [tag, 0x82, n >> 8, n & 0xff];
  return new Uint8Array([...kopf, ...inhalt]);
}

/* ── JWS ────────────────────────────────────────────────────────────────── */

test('[OID4VP·JWS·Gegenprobe] die Anfrage ES256 trägt über den Eingang der Stelle, Blattschlüssel und client_id-Bindung, ebenso ES512', async () => {
  for (const [name, wurzel] of [['anfrage-es256', 'wurzel-p256'], ['anfrage-es512', 'wurzel-p521']]) {
    const j = jws(name);
    const k = await K()._x509StellePruefen(kopfVon(j).x5c, [der(wurzel)], JETZT);
    assert.equal(k.gueltig, true, name + ': ' + k.grund);
    const r = await K()._oid4vpJwsPruefen(j, k.blatt.spki);
    assert.equal(r.gueltig, true, name + ': ' + r.grund);
    assert.equal(r.nutzlast.client_id, 'x509_san_dns:verifier.test.invalid');
    assert.deepEqual({ ...(await K()._x509ClientIdBinden(r.nutzlast.client_id, k.blatt)) }, { gueltig: true, kennung: 'verifier.test.invalid' });
  }
});

test('[OID4VP·JWS·alg-passt-nicht] ES256 gegen einen P-521-Schlüssel, ES384 gegen einen P-256-Schlüssel', async () => {
  const p256 = K()._x509Lesen(der('blatt-p256')).spki;
  const p521 = K()._x509Lesen(der('blatt-p521')).spki;
  assert.equal((await K()._oid4vpJwsPruefen(jws('anfrage-es256'), p521)).grund, 'alg-passt-nicht');
  const j = jws('anfrage-es256');
  assert.equal((await K()._oid4vpJwsPruefen(mitKopf(j, { ...kopfVon(j), alg: 'ES384' }), p256)).grund, 'alg-passt-nicht');
});

test('[OID4VP·JWS·signatur-form] ein Byte zu kurz, leer, oder als DER statt r‖s', async () => {
  const p256 = K()._x509Lesen(der('blatt-p256')).spki;
  const [h, p, s] = teile(jws('anfrage-es256'));
  const rs = Buffer.from(s, 'base64url');
  assert.equal((await K()._oid4vpJwsPruefen([h, p, rs.subarray(1).toString('base64url')].join('.'), p256)).grund, 'signatur-form');
  assert.equal((await K()._oid4vpJwsPruefen([h, p, ''].join('.'), p256)).grund, 'signatur-form');
  const zahl = (b) => tlv(0x02, [0x00, ...b]);
  const alsDer = Buffer.from(tlv(0x30, [...zahl(rs.subarray(0, 32)), ...zahl(rs.subarray(32))]));
  assert.equal((await K()._oid4vpJwsPruefen([h, p, alsDer.toString('base64url')].join('.'), p256)).grund, 'signatur-form');
});

test('[OID4VP·JWS·alg-nicht-erlaubt] none, HS256, RS256, EdDSA und Ed25519 sind abgelehnt', async () => {
  const p256 = K()._x509Lesen(der('blatt-p256')).spki;
  const j = jws('anfrage-es256');
  for (const alg of ['none', 'HS256', 'RS256', 'EdDSA', 'Ed25519', 'es256', undefined]) {
    const kopf = alg === undefined ? { typ: 'oauth-authz-req+jwt' } : { alg, typ: 'oauth-authz-req+jwt' };
    const ohneSig = alg === 'none' ? [b64u(JSON.stringify(kopf)), teile(j)[1], ''].join('.') : mitKopf(j, kopf);
    assert.equal((await K()._oid4vpJwsPruefen(ohneSig, p256)).grund, 'alg-nicht-erlaubt', String(alg));
  }
});

test('[OID4VP·JWS·signatur-ungueltig] eine veränderte Nutzlast fällt; crit im Kopf ist jws-form', async () => {
  const p256 = K()._x509Lesen(der('blatt-p256')).spki;
  const j = jws('anfrage-es256');
  const nutzlast = JSON.parse(Buffer.from(teile(j)[1], 'base64url').toString('utf8'));
  const anders = [teile(j)[0], b64u(JSON.stringify({ ...nutzlast, nonce: 'anders' })), teile(j)[2]].join('.');
  assert.equal((await K()._oid4vpJwsPruefen(anders, p256)).grund, 'signatur-ungueltig');
  assert.equal((await K()._oid4vpJwsPruefen(mitKopf(j, { ...kopfVon(j), crit: ['b64'] }), p256)).grund, 'jws-form');
});

test('[OID4VP·JWS·WebKit] unter WebKit ist ES512 kurve-nicht-gemessen, ES256 trägt', async () => {
  const W = ladeKern({ zusatzBindungen: NAMEN, CSS: CSS_WEBKIT }).V.__zusatz;
  assert.equal((await W._oid4vpJwsPruefen(jws('anfrage-es512'), K()._x509Lesen(der('blatt-p521')).spki)).grund, 'kurve-nicht-gemessen');
  assert.equal((await W._oid4vpJwsPruefen(jws('anfrage-es256'), K()._x509Lesen(der('blatt-p256')).spki)).gueltig, true);
});

/* ── Nie im Produkt ─────────────────────────────────────────────────────── */

/* Die Bezeichner des Spikes werden aus der Spanne selbst gelesen, nicht aufgezählt: jede Funktion und jede _OID4VP_-
   Konstante darin, dazu jedes `_oid4vp…` überhaupt. „OID4VP" als Wort und `Oid4vpWrapper` stehen im Kern schon außerhalb
   des Spikes (Standards-Texte) und sind darum nicht das Muster. */
const KOPF = 'OID4VP-SPIKE (O1, nur Entwicklerfassung)';
function spikeSpanne(text) {
  const [anfang, ende] = ENTWICKLERLEISTE_MARKEN[0];
  const k = text.indexOf(KOPF);
  assert.ok(k > 0, 'Vorbedingung: der Spike-Kopf steht im Text');
  const a = text.lastIndexOf(anfang, k), e = text.indexOf(ende, k);
  return { a, e, ende, inhalt: text.slice(a, e) };
}
function spurenNachSchnitt(text, namen) {
  const geschnitten = _entwicklerleisteSchneiden(text, 'vivodepot.html');
  const spuren = namen.filter((n) => new RegExp('\\b' + n + '\\b').test(geschnitten));
  if (/\b_oid4vp\w*/i.test(geschnitten)) spuren.push('_oid4vp…');
  return spuren;
}
function spikeNamen(text) {
  const { inhalt } = spikeSpanne(text);
  return [...new Set([...inhalt.matchAll(/function\s+([A-Za-z_$][\w$]*)/g), ...inhalt.matchAll(/const\s+(_OID4VP_\w+)/g)].map((m) => m[1]))];
}

test('[OID4VP·Schnitt] nach dem Schnitt der Entwicklerleiste steht kein Bezeichner des Spikes mehr im Text', () => {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  const namen = spikeNamen(text);
  for (const n of ['_oid4vpJwsPruefen', '_OID4VP_JWS_ALGS']) assert.ok(namen.includes(n), 'Positivkontrolle: ' + n + ' steht in der Spanne');
  assert.deepEqual(namen.filter((n) => !/^_oid4vp|^_OID4VP_/.test(n)), [], 'in der Spike-Spanne steht nur Spike-Eigenes (der Leser liegt in X509-LESER)');
  assert.deepEqual(spurenNachSchnitt(text, namen), []);
  assert.equal(typeof K()._oid4vpJwsPruefen, 'function', 'das Test-Artefakt trägt den Spike, sonst prüften die Proben oben nichts');
});

test('[OID4VP·Schnitt·Rot-Beweis] eine Funktion hinter das Ende der Spanne verschoben, bleibt im Produkt stehen', () => {
  const text = fs.readFileSync(KERN_PFAD, 'utf8');
  const namen = spikeNamen(text);
  const { e, ende } = spikeSpanne(text);
  const fn = text.lastIndexOf('async function _oid4vpJwsPruefen(', e);
  assert.ok(fn > 0 && fn < e, 'Vorbedingung: _oid4vpJwsPruefen steht in der Spanne');
  const verschoben = text.slice(0, fn) + ende + '\n' + text.slice(fn, e) + text.slice(e + ende.length);
  assert.ok(spurenNachSchnitt(verschoben, namen).includes('_oid4vpJwsPruefen'));
});
