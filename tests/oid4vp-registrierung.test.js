'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   oid4vp-registrierung.test.js — Schritt 9 der Anfrageprüfung: das Registrierungszertifikat in verifier_info (U2-ADR-501 Punkt 18)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Gegenstand: oid4vpAnfragePruefen in der Spanne OID4VP-ANFRAGE von vivodepot.html, Schritt 9 (_anfrageRegistrierungPruefen).
   Quellen: OpenID4VP 1.0 §5.1; ETSI TS 119 472-2 V1.3.1 §6.3.2.2 (RO-01 bis RO-16); ETSI TS 119 475 V1.2.1.
   Was gilt, je mit eigenem Fall:
   · ein gültiges Zertifikat unter einem Registrar-Anker gibt registrierung.stand „registriert“, mit Zweck, Name und Ablauf; data in
     beiden Formen (das JWS selbst, base64url darüber); ein null im Pfad gilt für genau denselben deklarierten Pfad;
   · ohne Element, ohne Anker im Produkt oder unter einem fremden Anker: „nicht-registriert“, die Anfrage gilt weiter;
   · registrar_dataset ist nur eine Angabe der Stelle (angabeDerStelle), nie „registriert“;
   · abgewiesen (registrierung-abgewiesen, detail): Signatur, fremder Schlüssel, Zeit, mehr als 12 Monate, fremdes sub, act,
     intermediary, Mehrverlangen bei Pfad und vct, credential_ids, zwei Zertifikate, kein JWS, falscher typ, Liste in falscher Form;
   · Wächter: die Liste der Registrar-Anker im Produkt ist leer, oder jede ihrer Zeilen nennt ein Wort mit Datum;
   · Rot-Beweis: ein Kern ohne den Abgleich nähme eine Anfrage an, die mehr verlangt, als registriert ist.
   Alles zur Laufzeit erzeugt (tests/lib/wrprc-test-material.js); kein Schlüssel im Repo.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const W = require('./lib/wrprc-test-material.js');
const Z = require('./lib/x509-test-zertifikate.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const NAMEN = ['oid4vpAnfragePruefen', 'OID4VP_REGISTRAR_ANKER'];
const JETZT = '2026-11-04T12:00:00Z';
const LISTE_BIS = '2026-12-31T00:00:00Z';
const VCT = 'urn:beispiel:nur-test:1';

let _K = null;
const K = () => (_K = _K || ladeKern({ zusatzBindungen: NAMEN }).V.__zusatz);
const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');

/* Eine Stelle mit organizationIdentifier W.KENNUNG, client_id x509_hash, und ein Registrar. */
const S = W.stelle();
const REG = W.registrar();
const CLIENT_ID = 'x509_hash:' + crypto.createHash('sha256').update(S.blatt).digest('base64url');
const DCQL = { credentials: [{ id: 'alter', format: 'dc+sd-jwt', meta: { vct_values: [VCT] }, claims: [{ path: ['birthdate'] }] }] };

function anfrage(n) {
  const nutzlast = Object.assign({
    client_id: CLIENT_ID, response_type: 'vp_token', response_mode: 'direct_post.jwt', response_uri: 'https://verifier.test.invalid/antwort',
    nonce: 'n-registrierung', dcql_query: DCQL,
  }, n || {});
  const eingabe = b64u({ alg: 'ES256', typ: 'oauth-authz-req+jwt', x5c: S.x5c }) + '.' + b64u(nutzlast);
  return eingabe + '.' + crypto.sign('sha256', Buffer.from(eingabe), { key: S.blattSchluessel.privat, dsaEncoding: 'ieee-p1363' }).toString('base64url');
}
const opts = (extra) => Object.assign({ anker: S.anker, ankerGueltigBis: LISTE_BIS, jetzt: JETZT, registrarAnker: REG.anker }, extra || {});
const pruefen = async (jws, o, kern) => ({ ...(await (kern || K()).oid4vpAnfragePruefen(jws, o || opts())) });
const mitZert = (wrprc, weitere) => ({ verifier_info: [W.verifierInfo(wrprc)].concat(weitere || []) });

test('[Registrierung·gültig] Zertifikat unter dem Registrar-Anker: „registriert“, mit Zweck, Name, Nutzung und Ablauf', async () => {
  const n = W.nutzlast();
  const r = await pruefen(anfrage(mitZert(W.wrprc(REG, n))));
  assert.equal(r.gueltig, true, r.grund + ' ' + (r.detail || ''));
  assert.deepEqual(r.registrierung, {
    stand: 'registriert', grund: null, sub: W.KENNUNG, name: 'Stelle nur Test', zweck: [{ lang: 'de', wert: 'Nur Test: Alter prüfen' }],
    nutzung: 'test-nutzung-1', datenschutz: 'https://verifier.test.invalid/datenschutz', statusliste: 'nicht-abgefragt', bis: n.exp * 1000,
  });
  assert.equal(r.angabeDerStelle, null);
});

test('[Registrierung·gültig] data als base64url über das JWS (RO-16) und eine Teilmenge der registrierten Angaben', async () => {
  const jwt = W.wrprc(REG, W.nutzlast());
  const r = await pruefen(anfrage({ verifier_info: [W.verifierInfo(jwt, { base64url: true })] }));
  assert.equal(r.registrierung && r.registrierung.stand, 'registriert', JSON.stringify(r));
  const ohneStatus = await pruefen(anfrage(mitZert(W.wrprc(REG, W.nutzlast({ weg: ['status'] })))));
  // Die Statusliste fragt der Kern nicht ab (ohne Netz): mit und ohne status bleibt es „nicht abgefragt“.
  assert.equal(ohneStatus.registrierung.statusliste, 'nicht-abgefragt');
});

test('[Registrierung·gültig] ein null im Pfad gilt nur für genau denselben deklarierten Pfad', async () => {
  const jwt = W.wrprc(REG, W.nutzlast({ credentials: [JSON.parse(JSON.stringify(W.FORMEN.sdJwtNullPfad))] }));
  const q = (p) => ({ credentials: [{ id: 'n', format: 'dc+sd-jwt', meta: { vct_values: [VCT] }, claims: [{ path: p }] }] });
  assert.equal((await pruefen(anfrage(Object.assign(mitZert(jwt), { dcql_query: q(['nationalities', null]) })))).gueltig, true);
  const r = await pruefen(anfrage(Object.assign(mitZert(jwt), { dcql_query: q(['nationalities', 0]) })));
  assert.deepEqual(r, { gueltig: false, grund: 'registrierung-abgewiesen', detail: 'mehr-verlangt-pfad' });
});

test('[Registrierung·nicht registriert] ohne Element, ohne Anker im Produkt, unter fremdem Anker: die Anfrage gilt weiter', async () => {
  const jwt = W.wrprc(REG, W.nutzlast());
  const ohne = await pruefen(anfrage());
  assert.deepEqual([ohne.gueltig, ohne.registrierung], [true, { stand: 'nicht-registriert', grund: 'fehlt' }]);
  const produkt = await pruefen(anfrage(mitZert(jwt)), opts({ registrarAnker: undefined }));
  assert.deepEqual([produkt.gueltig, produkt.registrierung], [true, { stand: 'nicht-registriert', grund: 'kein-anker' }], 'im Produkt ist die Ankerliste leer');
  const fremd = await pruefen(anfrage(mitZert(jwt)), opts({ registrarAnker: W.registrar({ wurzelName: 'Fremde Registrar-Wurzel' }).anker }));
  assert.deepEqual([fremd.gueltig, fremd.registrierung], [true, { stand: 'nicht-registriert', grund: 'anker-unbekannt' }]);
  const andereFormate = await pruefen(anfrage({ verifier_info: [{ format: 'jwt', data: 'irgendwas' }] }));
  assert.deepEqual(andereFormate.registrierung, { stand: 'nicht-registriert', grund: 'fehlt' }, 'ein anderes format bleibt unbeachtet (§5.1)');
});

test('[Registrierung·Angabe der Stelle] registrar_dataset wird nur als Angabe der Stelle zurückgegeben, nie als „registriert“', async () => {
  const r = await pruefen(anfrage({ verifier_info: [W.registrarDataset()] }));
  assert.equal(r.gueltig, true);
  assert.deepEqual(r.registrierung, { stand: 'nicht-registriert', grund: 'fehlt' });
  assert.deepEqual(r.angabeDerStelle, {
    beschreibung: [{ lang: 'de', wert: 'Nur Test: Dienst der Stelle' }], zweck: [{ lang: 'de', wert: 'Nur Test: Alter prüfen' }],
    nutzung: 'test-nutzung-1', datenschutz: 'https://verifier.test.invalid/datenschutz', register: 'https://registrar.test.invalid/wrp',
  });
  const falsch = await pruefen(anfrage({ verifier_info: [{ format: 'registrar_dataset', data: 'kein objekt' }] }));
  assert.deepEqual([falsch.gueltig, falsch.angabeDerStelle], [true, null], 'eine falsche Form weist nicht ab');
});

test('[Registrierung·leere Ankerliste] ein Zertifikat, das Vivodepot nicht prüfen kann, weist die Anfrage nie ab', async () => {
  const jwt = W.wrprc(REG, W.nutzlast());
  const ohneAnker = opts({ registrarAnker: undefined });
  const faelle = [
    ['credential_ids im Element', { verifier_info: [Object.assign(W.verifierInfo(jwt), { credential_ids: ['alter'] })] }],
    ['zwei Zertifikate', { verifier_info: [W.verifierInfo(jwt), W.verifierInfo(jwt)] }],
    ['kein JWS', mitZert('kein-jws')],
    ['typ fremd', mitZert(W.wrprc(REG, W.nutzlast(), { kopf: { typ: 'JWT' } }))],
    ['alg fremd', mitZert(W.wrprc(REG, W.nutzlast(), { kopf: { alg: 'none' } }))],
    ['sub fehlt', mitZert(W.wrprc(REG, W.nutzlast({ weg: ['sub'] })))],
  ];
  for (const [name, n] of faelle) {
    const r = await pruefen(anfrage(n), ohneAnker);
    assert.deepEqual([r.gueltig, r.registrierung], [true, { stand: 'nicht-registriert', grund: 'kein-anker' }], name + ': leere Ankerliste');
    const mitAnker = await pruefen(anfrage(n));
    assert.deepEqual([mitAnker.gueltig, mitAnker.grund], [false, 'registrierung-abgewiesen'], name + ': mit Anker bleibt es eine Abweisung');
  }
  const form = await pruefen(anfrage({ verifier_info: [{ format: 'registration_cert' }] }), ohneAnker);
  assert.deepEqual([form.gueltig, form.grund, form.detail], [false, 'registrierung-abgewiesen', 'verifier-info-form'], 'eine kaputte Liste bleibt auch ohne Anker abgewiesen');
});

test('[Registrierung·Trennung] ein Zugangs-Anker gilt nie als Registrar-Anker', async () => {
  const unterZugang = W.wrprc({ x5c: S.x5c, schluessel: S.blattSchluessel }, W.nutzlast());
  const getrennt = await pruefen(anfrage(mitZert(unterZugang)));
  assert.deepEqual([getrennt.gueltig, getrennt.registrierung], [true, { stand: 'nicht-registriert', grund: 'anker-unbekannt' }], 'gegen den Registrar-Anker unbekannt');
  const gegenprobe = await pruefen(anfrage(mitZert(unterZugang)), opts({ registrarAnker: S.anker }));
  assert.equal(gegenprobe.registrierung.stand, 'registriert', 'dasselbe Zertifikat besteht, wenn sein Anker als Registrar-Anker dasteht: Allein die Trennung der Listen ergibt das Ergebnis oben');
});

test('[Registrierung·abgewiesen] je Detail ein Fall', async () => {
  const jwt = W.wrprc(REG, W.nutzlast());
  const t = jwt.split('.');
  const sig = Buffer.from(t[2], 'base64url'); sig[3] ^= 0x01;
  const iat = W.sekunden('2026-10-01T00:00:00Z');
  const faelle = [
    ['Signaturbyte verändert', 'signatur', mitZert(t[0] + '.' + t[1] + '.' + sig.toString('base64url'))],
    ['fremder Schlüssel', 'signatur', mitZert(W.wrprc(REG, W.nutzlast(), { signierer: Z.schluessel('P-256') }))],
    ['abgelaufen', 'zeit', mitZert(W.wrprc(REG, W.nutzlast({ iat: W.sekunden('2026-01-01T00:00:00Z'), exp: W.sekunden('2026-06-01T00:00:00Z') })))],
    ['noch nicht ausgestellt', 'zeit', mitZert(W.wrprc(REG, W.nutzlast({ iat: W.sekunden('2026-11-05T00:00:00Z') })))],
    ['mehr als 12 Monate', 'zeit', mitZert(W.wrprc(REG, W.nutzlast({ iat, exp: iat + 400 * 86400 })))],
    ['fremdes sub', 'bindung', mitZert(W.wrprc(REG, W.nutzlast({ sub: 'NTRDE-FREMD' })))],
    ['act (Zwischenstelle)', 'zwischenstelle', mitZert(W.wrprc(REG, W.nutzlast({ act: { sub: 'NTRDE-TEST0009' } })))],
    ['intermediary (Zwischenstelle)', 'zwischenstelle', mitZert(W.wrprc(REG, W.nutzlast({ intermediary: { sub: 'NTRDE-TEST0009' } })))],
    ['Pfad nicht registriert', 'mehr-verlangt-pfad', Object.assign(mitZert(jwt), { dcql_query: { credentials: [{ id: 'a', format: 'dc+sd-jwt', meta: { vct_values: [VCT] }, claims: [{ path: ['family_name'] }] }] } })],
    ['vct nicht registriert', 'mehr-verlangt-vct', Object.assign(mitZert(jwt), { dcql_query: { credentials: [{ id: 'a', format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:anders'] } }] } })],
    ['Eintrag ohne claim registriert keine Angabe', 'mehr-verlangt-pfad', mitZert(W.wrprc(REG, W.nutzlast({ credentials: [JSON.parse(JSON.stringify(W.FORMEN.sdJwtOhneClaim))] })))],
    ['nur mdoc registriert', 'mehr-verlangt-vct', mitZert(W.wrprc(REG, W.nutzlast({ credentials: [JSON.parse(JSON.stringify(W.FORMEN.mdoc))] })))],
    ['credential_ids im Element (RO-14)', 'credential-ids', { verifier_info: [Object.assign(W.verifierInfo(jwt), { credential_ids: ['alter'] })] }],
    ['zwei Zertifikate', 'mehrdeutig', { verifier_info: [W.verifierInfo(jwt), W.verifierInfo(jwt)] }],
    ['data ist kein JWS', 'form', { verifier_info: [{ format: 'registration_cert', data: 'kein jws' }] }],
    ['typ fremd', 'typ', mitZert(W.wrprc(REG, W.nutzlast(), { kopf: { typ: 'JWT' } }))],
    ['verifier_info kein Array', 'verifier-info-form', { verifier_info: { format: 'registration_cert', data: jwt } }],
    ['Element ohne format', 'verifier-info-form', { verifier_info: [{ data: jwt }] }],
  ];
  for (const [name, detail, n] of faelle) {
    const r = await pruefen(anfrage(n));
    assert.deepEqual(r, { gueltig: false, grund: 'registrierung-abgewiesen', detail }, name);
  }
  // Eingang wie beim Zugangszertifikat (_x509StellePruefen): ein Signierzertifikat des Registrars ohne Richtlinie fällt.
  const ohneRichtlinie = W.registrar({ blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature')] });
  const r = await pruefen(anfrage(mitZert(W.wrprc(ohneRichtlinie, W.nutzlast()))), opts({ registrarAnker: ohneRichtlinie.anker }));
  assert.deepEqual(r, { gueltig: false, grund: 'registrierung-abgewiesen', detail: 'kette-policy-fehlt' });
});

test('[Registrierung·Wächter] die Registrar-Anker im Produkt: leer, oder jede Zeile nennt ein Wort mit Datum', () => {
  assert.ok(Object.isFrozen(K().OID4VP_REGISTRAR_ANKER));
  const m = /const OID4VP_REGISTRAR_ANKER = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(KERN);
  assert.ok(m, 'Vorbedingung: die Liste steht im Kern');
  const zeilen = m[1].split('\n').map((z) => z.trim()).filter(Boolean);
  for (const z of zeilen) assert.match(z, /mit Wort vom \d{4}-\d{2}-\d{2}/, 'Anker ohne Wort: ' + z.slice(0, 80));
  assert.equal(K().OID4VP_REGISTRAR_ANKER.length, zeilen.length, 'je Anker genau eine Zeile');
});

const ABGLEICH = '  const mehr = _registrierungAbgleich(nutzlast.dcql_query, n.credentials);';
test('[Registrierung·Rot-Beweis] ohne den Abgleich nähme der Kern eine Anfrage an, die mehr verlangt, als registriert ist', async () => {
  assert.equal(KERN.split(ABGLEICH).length, 2, 'Vorbedingung: der Abgleich steht genau einmal');
  const mehr = anfrage(Object.assign(mitZert(W.wrprc(REG, W.nutzlast())), { dcql_query: { credentials: [{ id: 'a', format: 'dc+sd-jwt', meta: { vct_values: [VCT] }, claims: [{ path: ['family_name'] }] }] } }));
  assert.equal((await pruefen(mehr)).grund, 'registrierung-abgewiesen', 'der Kern selbst weist ab');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-oid4vp-registrierung-rot-'));
  try {
    const p = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(p, KERN.replace(ABGLEICH, '  const mehr = null;'));
    const R = ladeKern({ htmlPfad: p, backen: true, zusatzBindungen: NAMEN }).V.__zusatz;
    assert.equal((await pruefen(mehr, opts(), R)).gueltig, true, 'die geschwächte Fassung nimmt das Mehrverlangen an — die Probe oben würde rot');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
