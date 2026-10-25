'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   oid4vp-anfrage-pruefen.test.js — die Anfrage einer Stelle im Produkt prüfen (U2-ADR-501 Abschnitt D, Wagen H1, 17.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gegenstand ist `oid4vpAnfragePruefen(requestObjectJws, opts)` in der Spanne OID4VP-ANFRAGE von vivodepot.html, im Produktteil
   (nicht in der Entwicklerleiste). Sie ist das Tor vor jeder Übergabe an eine Stelle: ohne `gueltig: true` entsteht keine
   Antwort (Bedingung 2 der Produktentscheidung vom 14.10.2026).

   ROTE PROBE ZUERST: diese Datei stand vor der Funktion im Kern.

   WAS GILT, je mit eigenem Fall:
   · je Grund aus OID4VP_ANFRAGE_GRUENDE mindestens ein Fall, und die Liste der gesehenen Gründe ist genau die Liste des Kerns;
   · eine gültige Anfrage (x509_san_dns und x509_hash) wird angenommen, mit Stelle, client_id, nonce, response_uri und DCQL;
   · was OpenID4VP 1.0 zuläßt, wird angenommen (DCQL-Form nach §6, verifier_info und unbekannte Parameter nach §5.1, Port);
     Fundstellen gelesen 17.10.2026 (OpenID4VP 1.0 final, HAIP 1.0 final, RFC 9101);
   · die eingefrorene openssl-Anfrage aus tests/fixtures/oid4vp/ trägt Kette, Signatur und Bindung und fällt erst an
     `response_mode` `direct_post` (verlangt ist `direct_post.jwt`, Bedingung 3) — so prüft eine fremd erzeugte Kette den Weg mit;
   · Rot-Beweis: ein Kern ohne die client_id-Bindung nimmt eine Anfrage an, deren client_id nicht zum Blatt passt;
   · der Spike bleibt draußen: die Spanne ruft den Spike-Prüfer nicht und nennt keinen Spike-Bezeichner (Auflage der
     Gegenlesung zum Spike), mit Rot-Beweis;
   · kein Netz in der Spanne, und der Kern bleibt `connect-src 'none'`.

   GÜLTIGE ANFRAGEN entstehen zur Laufzeit: tests/lib/x509-test-zertifikate.js stellt Wurzel, Zwischen-CA und Blatt aus, der
   Blattschlüssel lebt nur im Speicher und signiert das Anfrage-Objekt mit node:crypto (ES256, r‖s). Kein Schlüssel liegt im Repo.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { _entwicklerleisteSchneiden } = require('../tools/lib/produkt-text-erzeugen.js');
const Z = require('./lib/x509-test-zertifikate.js');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const KERN = fs.readFileSync(KERN_PFAD, 'utf8');
const FIX = path.join(__dirname, 'fixtures', 'oid4vp');
const JETZT = '2026-10-14T12:00:00Z';
const LISTE_BIS = '2026-12-31T00:00:00Z';
const NAMEN = ['oid4vpAnfragePruefen', 'OID4VP_ANFRAGE_GRUENDE'];
const SPANNE = ['/* OID4VP-ANFRAGE:BEGIN */', '/* OID4VP-ANFRAGE:END */'];

let _K = null;
const K = () => (_K = _K || ladeKern({ zusatzBindungen: NAMEN }).V.__zusatz);

const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const sekunden = (iso) => Math.floor(new Date(iso).getTime() / 1000);
const pemB64 = (name) => fs.readFileSync(path.join(FIX, 'test-' + name + '.crt'), 'utf8').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
const der = (name) => new Uint8Array(Buffer.from(pemB64(name), 'base64'));

/* Eine Stelle: Wurzel, Zwischen-CA, Blatt mit SAN verifier.test.invalid und certificatePolicies; o wie Z.kette. */
const stelle = (o) => Z.kette(Object.assign({ zwischen: {} }, o || {}));
const NUTZLAST = Object.freeze({
  client_id: 'x509_san_dns:verifier.test.invalid',
  response_type: 'vp_token',
  response_mode: 'direct_post.jwt',
  response_uri: 'https://verifier.test.invalid/antwort',
  nonce: 'n-0S6_WzA2Mj',
  state: 'nur-test',
  exp: sekunden('2026-10-14T12:10:00Z'),
  client_metadata: { jwks: { keys: [] } },
  dcql_query: { credentials: [{ id: 'probe', format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:nur-test'] }, claims: [{ path: ['vorname'] }] }] },
});
/* Ein Anfrage-Objekt, signiert vom Blatt der Stelle `s` (ES256, r‖s nach RFC 7518 §3.4). kopf/nutzlast ergänzen oder ersetzen. */
function anfrage(s, nutzlast, kopf) {
  const k = Object.assign({ alg: 'ES256', typ: 'oauth-authz-req+jwt', x5c: s.x5c }, kopf || {});
  const n = Object.assign({}, NUTZLAST, nutzlast || {});
  for (const [name, wert] of Object.entries(k)) if (wert === undefined) delete k[name];
  for (const [name, wert] of Object.entries(n)) if (wert === undefined) delete n[name];
  const eingabe = b64u(k) + '.' + b64u(n);
  const sig = crypto.sign('sha256', Buffer.from(eingabe), { key: s.blattSchluessel.privat, dsaEncoding: 'ieee-p1363' });
  return eingabe + '.' + sig.toString('base64url');
}
const opts = (s, extra) => Object.assign({ anker: s.anker, ankerGueltigBis: LISTE_BIS, jetzt: JETZT }, extra || {});
const pruefen = async (jws, o, kern) => ({ ...(await (kern || K()).oid4vpAnfragePruefen(jws, o)) });
const hashVon = (derBytes) => crypto.createHash('sha256').update(derBytes).digest('base64url');

/* ── Die gültige Anfrage ────────────────────────────────────────────────── */

test('[OID4VP·Anfrage·gültig] x509_san_dns: angenommen, mit Stelle, client_id, nonce, response_uri und DCQL', async () => {
  const s = stelle({ blattInhaber: Z.name(Z.cn('verifier.test.invalid'), Z.org('Stadt Musterstadt Testamt')) });
  const r = await pruefen(anfrage(s), opts(s));
  assert.equal(r.gueltig, true, r.grund + ' ' + (r.detail || ''));
  assert.equal(r.clientId, 'x509_san_dns:verifier.test.invalid');
  assert.equal(r.nonce, NUTZLAST.nonce);
  assert.equal(r.responseUri, NUTZLAST.response_uri);
  assert.equal(r.responseMode, 'direct_post.jwt');
  assert.equal(r.state, 'nur-test');
  assert.deepEqual(r.dcql, NUTZLAST.dcql_query);
  assert.deepEqual(r.clientMetadata, NUTZLAST.client_metadata);
  assert.equal(r.stelle.anzeige, 'Stadt Musterstadt Testamt', 'Anzeige aus organizationName, nie aus dem CN');
  assert.equal(r.stelle.kennung, 'signiert:dns:0021:verifier.test.invalid', 'Kennung nach U2-ADR-501 Punkt 10 (STELLENKENNUNG-BLOCK)');
});

test('[OID4VP·Anfrage·gültig] x509_hash: SHA-256 des Blatts und organizationIdentifier; die Antwortadresse steht im SAN', async () => {
  const s = stelle({ blattInhaber: Z.name(Z.cn('Testamt'), Z.org('Testamt'), Z.orgKennung('LEIXG-TEST-0001')) });
  const clientId = 'x509_hash:' + hashVon(s.blatt);
  const r = await pruefen(anfrage(s, { client_id: clientId }), opts(s));
  assert.equal(r.gueltig, true, r.grund + ' ' + (r.detail || ''));
  assert.equal(r.clientId, clientId);
  assert.equal(r.stelle.kennung, 'signiert:org:0015:LEIXG-TEST-0001');
});

test('[OID4VP·Anfrage·openssl] die eingefrorene Anfrage trägt Kette, Signatur und Bindung und fällt erst an direct_post', async () => {
  const j = fs.readFileSync(path.join(FIX, 'test-anfrage-es256.jws'), 'utf8').trim();
  const r = await pruefen(j, { anker: [der('wurzel-p256')], ankerGueltigBis: LISTE_BIS, jetzt: JETZT });
  assert.deepEqual(r, { gueltig: false, grund: 'anfrage-nicht-unterstuetzt', detail: 'response_mode' });
  const fremd = await pruefen(j, { anker: [der('fremd-wurzel-p256')], ankerGueltigBis: LISTE_BIS, jetzt: JETZT });
  assert.equal(fremd.grund, 'zertifikat-unbekannt', 'Gegenprobe: unter einem fremden Anker fällt sie früher');
});

test('[OID4VP·Anfrage·gültig·Quelle] was OpenID4VP 1.0 zuläßt, wird angenommen: DCQL-Pfad mit null und Zahl, credential_sets, claim_sets, unbekannte Properties, leeres meta, verifier_info, unbekannter Parameter, Port', async () => {
  const s = stelle();
  const dcqlVoll = {
    credentials: [
      { id: 'a', format: 'dc+sd-jwt', meta: { vct_values: ['urn:beispiel:nur-test'] }, claims: [{ id: 'c1', path: ['adressen', null, 'ort'] }, { id: 'c2', path: ['kinder', 0] }], claim_sets: [['c1'], ['c2']], unbekannt: true },
      { id: 'b', format: 'dc+sd-jwt', meta: {} },
    ],
    credential_sets: [{ options: [['a'], ['b']], required: true }],
    unbekannt: { egal: 1 },
  };
  const varianten = [
    ['DCQL voll', { dcql_query: dcqlVoll }],
    ['verifier_info wird nicht ausgewertet (§5.1)', { verifier_info: [{ format: 'jwt', data: 'registrierung-probe' }] }],
    ['unbekannter Parameter (§5.1)', { irgendwas_neues: 'x' }],
    ['response_uri mit Port', { response_uri: 'https://verifier.test.invalid:8443/antwort' }],
    ['credential_sets: mso_mdoc ODER dc+sd-jwt', { dcql_query: { credentials: [{ id: 'm', format: 'mso_mdoc', meta: { doctype_value: 'org.iso.18013.5.1.mDL' } }, NUTZLAST.dcql_query.credentials[0]], credential_sets: [{ options: [['m'], ['probe']] }] } }],
  ];
  for (const [name, n] of varianten) {
    const r = await pruefen(anfrage(s, n), opts(s));
    assert.equal(r.gueltig, true, name + ': ' + r.grund + ' ' + (r.detail || ''));
    assert.ok(!('verifierInfo' in r) && !JSON.stringify(r).includes('registrierung-probe'), name + ': verifier_info steht nicht in der Rückgabe');
  }
  const voll = await pruefen(anfrage(s, { dcql_query: dcqlVoll }), opts(s));
  assert.deepEqual(voll.dcql, dcqlVoll, 'die DCQL geht unverändert an H2');
  const port = await pruefen(anfrage(s, { response_uri: 'https://fremd.test.invalid:8443/antwort' }), opts(s));
  assert.equal(port.grund, 'antwortadresse-fremd', 'Gegenprobe: mit Port, aber fremdem Rechner');
});

/* ── Je Grund ein Fall ──────────────────────────────────────────────────── */

/* Jeder Fall: [Name, erwarteter Grund, () => [jws, opts]]. Die Stellen werden je Fall frisch ausgestellt. */
function faelle() {
  const s = stelle();
  const fremd = stelle({ wurzelName: Z.name(Z.cn('X509 Fremde Wurzel')) });
  const namensgleich = stelle(); // gleicher Wurzelname wie s, anderer Schlüssel: der Leser meldet signatur-ungueltig
  const j = anfrage(s);
  const [h, p, sig] = j.split('.');
  const ohnePolicy = stelle({ blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san('verifier.test.invalid')] });
  const mitOrg = stelle({ blattInhaber: Z.name(Z.cn('Testamt'), Z.orgKennung('LEIXG-TEST-0002')) });
  return [
    ['ein Wurf unterwegs (opts liest sich nicht)', 'warf', () => [j, { get anker() { throw new Error('probe'); } }]],
    ['kein Text', 'anfrage-form', () => [42, opts(s)]],
    ['zwei Teile statt drei', 'anfrage-form', () => [h + '.' + p, opts(s)]],
    ['Nutzlast kein JSON', 'anfrage-form', () => [h + '.' + b64u('kein json') + '.' + sig, opts(s)]],
    ['zu lang', 'anfrage-form', () => [j + 'A'.repeat(200000), opts(s)]],
    ['nonce fehlt', 'anfrage-form', () => [anfrage(s, { nonce: undefined }), opts(s)]],
    ['alg none ohne Signatur', 'anfrage-unsigniert', () => [b64u({ alg: 'none', x5c: s.x5c }) + '.' + p + '.', opts(s)]],
    ['ohne x5c', 'anfrage-unsigniert', () => [anfrage(s, {}, { x5c: undefined }), opts(s)]],
    ['client_id mit Präfix redirect_uri', 'anfrage-unsigniert', () => [anfrage(s, { client_id: 'redirect_uri:https://verifier.test.invalid/antwort' }), opts(s)]],

    ['crit im Kopf', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, {}, { crit: ['b64'] }), opts(s)]],
    ['typ fremd', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, {}, { typ: 'JWT' }), opts(s)]],
    ['ein anderes client_id-Präfix', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { client_id: 'decentralized_identifier:did:example:test' }), opts(s)]],
    ['client_id ohne Präfix (vorregistriert, §5.9.2)', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { client_id: 'verifier' }), opts(s)]],
    ['client_id mit Präfix origin (§5.9.3: nicht annehmen)', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { client_id: 'origin:https://verifier.test.invalid' }), opts(s)]],
    ['response_mode direct_post', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { response_mode: 'direct_post' }), opts(s)]],
    ['response_type fremd', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { response_type: 'vp_token id_token' }), opts(s)]],
    ['DCQL: credential_sets leer', 'anfrage-form', () => [anfrage(s, { dcql_query: Object.assign({}, NUTZLAST.dcql_query, { credential_sets: [] }) }), opts(s)]],
    ['DCQL: meta fehlt', 'anfrage-form', () => [anfrage(s, { dcql_query: { credentials: [{ id: 'probe', format: 'dc+sd-jwt' }] } }), opts(s)]],
    ['DCQL: id mit Leerzeichen', 'anfrage-form', () => [anfrage(s, { dcql_query: { credentials: [{ id: 'a b', format: 'dc+sd-jwt', meta: {} }] } }), opts(s)]],
    ['DCQL: leerer Pfad', 'anfrage-form', () => [anfrage(s, { dcql_query: { credentials: [{ id: 'p', format: 'dc+sd-jwt', meta: {}, claims: [{ path: [] }] }] } }), opts(s)]],
    ['DCQL: negative Zahl im Pfad', 'anfrage-form', () => [anfrage(s, { dcql_query: { credentials: [{ id: 'p', format: 'dc+sd-jwt', meta: {}, claims: [{ path: ['a', -1] }] }] } }), opts(s)]],
    ['DCQL nur mit mso_mdoc (keine dc+sd-jwt-Query)', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { dcql_query: { credentials: [{ id: 'm', format: 'mso_mdoc', meta: { doctype_value: 'x' } }] } }), opts(s)]],
    ['DCQL: Formfehler an der mso_mdoc-Query (meta fehlt)', 'anfrage-form', () => [anfrage(s, { dcql_query: { credentials: [Object.assign({}, NUTZLAST.dcql_query.credentials[0]), { id: 'm', format: 'mso_mdoc' }] } }), opts(s)]],

    ['transaction_data', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { transaction_data: ['e30'] }), opts(s)]],
    ['presentation_definition (in 1.0 nicht definiert)', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { presentation_definition: {} }), opts(s)]],
    ['scope ohne dcql_query', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { scope: 'probe', dcql_query: undefined }), opts(s)]],
    ['scope und dcql_query zusammen (§5.1: nicht beides)', 'anfrage-nicht-unterstuetzt', () => [anfrage(s, { scope: 'probe' }), opts(s)]],
    ['Ankerliste abgelaufen', 'ankerliste-abgelaufen', () => [j, opts(s, { ankerGueltigBis: '2026-10-01T00:00:00Z' })]],
    ['Stand der Ankerliste fehlt', 'ankerliste-abgelaufen', () => [j, opts(s, { ankerGueltigBis: undefined })]],
    ['Kette unter fremdem Anker', 'zertifikat-unbekannt', () => [j, opts(fremd)]],
    ['Kette unter gleichnamigem Anker mit anderem Schlüssel', 'zertifikat-abgewiesen', () => [j, opts(namensgleich)]],
    ['keine Anker', 'zertifikat-unbekannt', () => [j, opts(s, { anker: [] })]],
    ['Blatt außerhalb der Gültigkeit', 'zertifikat-zeit', () => [anfrage(s, { exp: undefined }), opts(s, { jetzt: '2029-06-01T00:00:00Z', ankerGueltigBis: '2030-01-01T00:00:00Z' })]],
    ['Blatt ohne certificatePolicies', 'zertifikat-abgewiesen', () => [anfrage(ohnePolicy), opts(ohnePolicy)]],
    ['Nutzlast nach dem Signieren geändert', 'signatur-ungueltig', () => [h + '.' + b64u(Object.assign({}, NUTZLAST, { nonce: 'anders' })) + '.' + sig, opts(s)]],
    ['ES384 an einem P-256-Blatt', 'signatur-ungueltig', () => [anfrage(s, {}, { alg: 'ES384' }), opts(s)]],
    ['HS256', 'signatur-ungueltig', () => [anfrage(s, {}, { alg: 'HS256' }), opts(s)]],
    ['Signatur ein Byte kurz', 'signatur-ungueltig', () => [h + '.' + p + '.' + Buffer.from(sig, 'base64url').subarray(1).toString('base64url'), opts(s)]],
    ['x509_san_dns nicht im SAN', 'client-id-passt-nicht', () => [anfrage(s, { client_id: 'x509_san_dns:andere.test.invalid', response_uri: 'https://andere.test.invalid/antwort' }), opts(s)]],
    ['x509_hash eines anderen Blatts', 'client-id-passt-nicht', () => [anfrage(mitOrg, { client_id: 'x509_hash:' + hashVon(fremd.blatt) }), opts(mitOrg)]],
    ['x509_hash ohne organizationIdentifier', 'client-id-passt-nicht', () => [anfrage(s, { client_id: 'x509_hash:' + hashVon(s.blatt) }), opts(s)]],
    ['response_uri auf fremdem Rechner', 'antwortadresse-fremd', () => [anfrage(s, { response_uri: 'https://fremd.test.invalid/antwort' }), opts(s)]],
    ['response_uri ohne https', 'antwortadresse-fremd', () => [anfrage(s, { response_uri: 'http://verifier.test.invalid/antwort' }), opts(s)]],
    ['response_uri mit Anmeldeteil', 'antwortadresse-fremd', () => [anfrage(s, { response_uri: 'https://verifier.test.invalid@fremd.test.invalid/antwort' }), opts(s)]],
    ['exp vorbei', 'anfrage-zeit', () => [anfrage(s, { exp: sekunden('2026-10-14T11:00:00Z') }), opts(s)]],
    ['nbf in der Zukunft', 'anfrage-zeit', () => [anfrage(s, { nbf: sekunden('2026-10-14T13:00:00Z') }), opts(s)]],
  ];
}

test('[OID4VP·Anfrage·Gründe] je Grund mindestens ein Fall; jede Abweisung trägt genau einen Grund aus der Liste', async () => {
  const GRUENDE = [...K().OID4VP_ANFRAGE_GRUENDE];
  assert.ok(GRUENDE.length >= 10, 'Vorbedingung: die Liste steht im Kern');
  assert.ok(Object.isFrozen(K().OID4VP_ANFRAGE_GRUENDE));
  const gesehen = new Set();
  for (const [name, grund, bau] of faelle()) {
    const [jws, o] = bau();
    const r = await pruefen(jws, o);
    assert.equal(r.gueltig, false, name + ': angenommen');
    assert.equal(r.grund, grund, name + ': ' + JSON.stringify(r));
    assert.ok(GRUENDE.includes(r.grund), name + ': Grund außerhalb der Liste');
    for (const feld of Object.keys(r)) assert.ok(['gueltig', 'grund', 'detail'].includes(feld), name + ': eine Abweisung trägt nur gueltig, grund, detail');
    gesehen.add(r.grund);
  }
  assert.deepEqual([...gesehen].sort(), [...GRUENDE].sort(), 'jeder Grund hat einen Fall, und kein Fall trifft einen Grund außerhalb der Liste');
});

/* ── Rot-Beweis ─────────────────────────────────────────────────────────── */

const BINDUNG = '  const bindung = await _x509ClientIdBinden(clientId, blatt);';
test('[OID4VP·Anfrage·Rot-Beweis] ohne die client_id-Bindung nähme der Kern eine fremde client_id an', async () => {
  assert.equal(KERN.split(BINDUNG).length, 2, 'Vorbedingung: die Bindung steht genau einmal');
  const s = stelle();
  const falsch = anfrage(s, { client_id: 'x509_san_dns:andere.test.invalid', response_uri: 'https://andere.test.invalid/antwort' });
  assert.equal((await pruefen(falsch, opts(s))).grund, 'client-id-passt-nicht', 'der Kern selbst weist ab');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-oid4vp-anfrage-rot-'));
  try {
    const p = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(p, KERN.replace(BINDUNG, "  const bindung = { gueltig: true, kennung: clientId.slice(clientId.indexOf(':') + 1) };"));
    const R = ladeKern({ htmlPfad: p, backen: true, zusatzBindungen: NAMEN }).V.__zusatz;
    assert.equal((await pruefen(falsch, opts(s), R)).gueltig, true, 'die geschwächte Fassung nimmt die fremde client_id an — die Probe oben würde rot');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ── Der Spike bleibt draußen, kein Netz ─────────────────────────────────── */

function spanne(text) {
  const a = text.indexOf(SPANNE[0]), e = text.indexOf(SPANNE[1]);
  assert.ok(a > 0 && e > a, 'Vorbedingung: die Spanne OID4VP-ANFRAGE steht im Kern');
  assert.equal(text.indexOf(SPANNE[0], a + 1), -1, 'die Spanne steht genau einmal');
  return text.slice(a, e + SPANNE[1].length);
}
// Der Spike-Prüfer und jeder Spike-Bezeichner (_oid4vp…, _OID4VP_…), auch in Kommentaren.
const spikeSpuren = (inhalt) => [...new Set([...inhalt.matchAll(/\b_oid4vp\w*/gi)].map((m) => m[0]))];
const NETZ = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|\bimport\s*\(/;

test('[OID4VP·Anfrage·Spike draußen] die Spanne ruft den Spike-Prüfer nicht und nennt keinen Spike-Bezeichner; sie übersteht den Schnitt', () => {
  const inhalt = spanne(KERN);
  assert.match(inhalt, /async function oid4vpAnfragePruefen\(/, 'Positivkontrolle: die Funktion steht in der Spanne');
  assert.deepEqual(spikeSpuren(inhalt), []);
  const geschnitten = _entwicklerleisteSchneiden(KERN, 'vivodepot.html');
  assert.ok(geschnitten.includes(inhalt), 'die Spanne ist Produkt: der Schnitt der Entwicklerleiste läßt sie unverändert');
  assert.ok(!/\b_oid4vpJwsPruefen\b/.test(geschnitten), 'im Produkt steht der Spike-Prüfer nicht, also ruft ihn dort niemand');
});

test('[OID4VP·Anfrage·Spike draußen·Rot-Beweis] ein Aufruf des Spike-Prüfers in der Spanne wird gefunden', () => {
  const eingespielt = KERN.replace(SPANNE[1], 'async function nebenweg(j, s) { return _oid4vpJwsPruefen(j, s); }\n' + SPANNE[1]);
  assert.notEqual(eingespielt, KERN, 'Testvoraussetzung');
  assert.deepEqual(spikeSpuren(spanne(eingespielt)), ['_oid4vpJwsPruefen']);
});

test('[OID4VP·Anfrage·kein Netz] die Spanne holt nichts, und der Kern bleibt connect-src \'none\'', () => {
  const zeilen = spanne(KERN).split('\n').filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z));
  assert.deepEqual(zeilen.filter((z) => NETZ.test(z)), []);
  assert.ok(NETZ.test("const r = await fetch(responseUri);"), 'Rot-Beweis: ein Abruf wird erkannt');
  const csp = /<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/i.exec(KERN);
  assert.ok(csp, 'Vorbedingung: die CSP steht im Kern');
  assert.match(csp[1], /connect-src 'none'/);
});
