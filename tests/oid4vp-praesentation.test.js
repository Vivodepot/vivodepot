'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   oid4vp-praesentation.test.js — die Präsentation aus der Datei an eine Stelle (U2-ADR-502 Abschnitte A, C, D; Wagen H2, 18.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gegenstand: `oid4vpPraesentationBauen(geprueft, auswahl, opt)` (Spanne OID4VP-ANFRAGE), `oid4vpAntwortJwe(praesentation,
   geprueft)` (beim JWE-Schreiben) und `sdjwtHalterSchluessel(kennung, ziel)` (Schlüssel je Stelle, Domäne sdjwt-halter).

   ROTE PROBE ZUERST: diese Datei stand vor den Funktionen im Kern.

   WAS GILT, je mit eigenem Fall:
   · Rundlauf: Anfrage prüfen → Präsentation bauen → JWE mit dem Testschlüssel der Stelle öffnen (node:crypto, nicht der Kern)
     → SD-JWT VC und KB-JWT nachrechnen: typ kb+jwt (RFC 9901 §4.3), sd_hash über die Präsentation bis einschließlich der
     letzten „~“ (RFC 9901 §4.3.1), aud = client_id samt Präfix, nonce aus der Anfrage (OpenID4VP 1.0 §14.1, Anhang B);
     A128GCM ohne Angabe der Stelle (OpenID4VP 1.0 §8.3); alles gelesen 17.10.2026;
   · Halter-Schlüssel je Stelle: zwei Stellen, zwei Schlüssel; dieselbe Stelle, derselbe; verschieden vom Schlüssel der Domäne
     antwort und vom Schlüssel aus dem Passwort; Testvektor, unabhängig mit node:crypto nachgerechnet;
   · nur die gewählten Offenlegungen stehen in der Präsentation, weder als Offenlegung noch als Digest mehr;
   · nicht erfüllbare Queries bleiben unbeantwortet; eine verlangte credential_set, die nicht erfüllbar ist, ergibt eine Abweisung
     mit Grund, keinen Wurf; nur eine gebaute Präsentation zu genau dieser geprüften Anfrage wird verschlüsselt;
   · der Exportweg nach U2-ADR-457 bleibt beim Schlüssel aus dem Passwort;
   · kein Netz, kein PID-Typ, kein sdJwtVcIdentitaet in den neuen Teilen.
   · Z (das ECDH-Ergebnis) und der CEK sind nach oid4vpAntwortJweRoh überschrieben, auf dem Erfolgsweg und auf Fehlerwegen
     (encrypt wirft, der Import des CEK wirft). Beobachtet über eine Hülle um crypto.subtle des geladenen Kerns.
   Rot-Beweise: ein Kern ohne die Übernahme der nonce; ein Kern mit dem Schlüssel aus dem Passwort statt des Schlüssels je Stelle;
   ein Kern ohne das Überschreiben im finally von oid4vpAntwortJweRoh.

   Alle Schlüssel entstehen zur Laufzeit (tests/lib/x509-test-zertifikate.js, node:crypto). Kein Schlüssel liegt im Repo.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const nodeCrypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const Z = require('./lib/x509-test-zertifikate.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const KERN = fs.readFileSync(KERN_PFAD, 'utf8');
const JETZT = '2026-10-14T12:00:00Z';
const LISTE_BIS = '2026-12-31T00:00:00Z';
const PW = 'oid4vp-praesentation-probe-2026';
const NONCE = 'n-0S6_WzA2Mj';
const NAMEN = ['oid4vpAnfragePruefen', 'oid4vpPraesentationBauen', 'oid4vpAntwortJwe', 'sdjwtHalterSchluessel',
  'antwortSchluesselJeStelle', 'antwortSchluesselInfo', 'OID4VP_PRAESENTATION_GRUENDE', 'OID4VP_ANTWORT_GRUENDE',
  'OID4VP_PRAESENTATION_ANGEBOT', '_halterSignaturHolen'];

const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const vonB64u = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
const sha256b64u = (s) => nodeCrypto.createHash('sha256').update(Buffer.from(s, 'ascii')).digest('base64url');
const sekunden = (iso) => Math.floor(new Date(iso).getTime() / 1000);

/* ── Die Stellen: Kette mit Blatt (SAN = Rechner), Schlüssel zur Verschlüsselung der Antwort ── */
function stelle(rechner) {
  const kette = Z.kette({
    zwischen: {},
    blattInhaber: Z.name(Z.cn(rechner), Z.org('Testamt ' + rechner)),
    blattErweiterungen: [Z.erw.basis(false), Z.erw.ku('digitalSignature'), Z.erw.san(rechner), Z.erw.richtlinien(Z.BEISPIEL_RICHTLINIE)],
  });
  const enc = nodeCrypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pub = enc.publicKey.export({ format: 'jwk' });
  return { rechner, kette, encPrivat: enc.privateKey, encJwk: { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y, use: 'enc', alg: 'ECDH-ES', kid: 'enc-' + rechner } };
}
const DCQL = Object.freeze({
  credentials: [{
    id: 'finanzen', format: 'dc+sd-jwt', meta: { vct_values: ['urn:vivodepot:finanzen'] },
    claims: [{ id: 'anbieter', path: ['pension_provider'] }, { id: 'bav', path: ['occupational_pension'] }],
    claim_sets: [['anbieter', 'bav'], ['anbieter']],
  }],
});
/* Ein Anfrage-Objekt der Stelle s, signiert vom Blatt (ES256, r‖s). n ergänzt oder ersetzt die Nutzlast. */
function anfrage(s, n) {
  const nutzlast = Object.assign({
    client_id: 'x509_san_dns:' + s.rechner, response_type: 'vp_token', response_mode: 'direct_post.jwt',
    response_uri: 'https://' + s.rechner + '/antwort', nonce: NONCE, state: 'nur-test', exp: sekunden('2026-10-14T12:10:00Z'),
    client_metadata: { jwks: { keys: [s.encJwk] } }, dcql_query: DCQL,
  }, n || {});
  for (const [k, w] of Object.entries(nutzlast)) if (w === undefined) delete nutzlast[k];
  const eingabe = b64u({ alg: 'ES256', typ: 'oauth-authz-req+jwt', x5c: s.kette.x5c }) + '.' + b64u(nutzlast);
  const sig = nodeCrypto.sign('sha256', Buffer.from(eingabe), { key: s.kette.blattSchluessel.privat, dsaEncoding: 'ieee-p1363' });
  return eingabe + '.' + sig.toString('base64url');
}
const opts = (s) => ({ anker: s.kette.anker, ankerGueltigBis: LISTE_BIS, jetzt: JETZT });

/* ── Ein Kern mit offenem Depot und drei Angaben im Bereich Finanzen (eine davon sensibel) ── */
async function kernMitDepot(htmlPfad) {
  const { V } = ladeKern(htmlPfad ? { htmlPfad, backen: true, zusatzBindungen: NAMEN } : { zusatzBindungen: NAMEN });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('finance', 'privatePensionProvision', 'Cosmos Direkt');
  V.sektorFeldSetzen('finance', 'companyPensionSchemeBav', 'Allianz bAV');
  V.sektorFeldSetzen('finance', 'policyContractNumber', 'POL-772-4493');
  return V.__zusatz;
}
async function geprueftVon(K, s, n) {
  const g = await K.oid4vpAnfragePruefen(anfrage(s, n), opts(s));
  assert.equal(g.gueltig, true, 'Vorbedingung: die Anfrage ist gültig: ' + g.grund + ' ' + (g.detail || ''));
  return g;
}

/* ── Unabhängig vom Kern: JWE öffnen (ECDH-ES direkt, Concat KDF nach RFC 7518 §4.6.2, AES-GCM) ── */
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };
function concatKdf(z, enc, bits) {
  const alg = Buffer.from(enc, 'ascii');
  return nodeCrypto.createHash('sha256').update(Buffer.concat([u32(1), z, u32(alg.length), alg, u32(0), u32(0), u32(bits)])).digest().subarray(0, bits / 8);
}
function jweOeffnen(jwe, privat) {
  const [h, ek, iv, ct, tag] = jwe.split('.');
  assert.equal(ek, '', 'ECDH-ES direkt: kein verpackter Schlüssel');
  const kopf = vonB64u(h);
  const z = nodeCrypto.diffieHellman({ privateKey: privat, publicKey: nodeCrypto.createPublicKey({ key: kopf.epk, format: 'jwk' }) });
  const bits = { A128GCM: 128, A256GCM: 256 }[kopf.enc];
  const d = nodeCrypto.createDecipheriv('aes-' + bits + '-gcm', concatKdf(z, kopf.enc, bits), Buffer.from(iv, 'base64url'));
  d.setAAD(Buffer.from(h, 'ascii'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  const klar = Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]);
  return { kopf, inhalt: JSON.parse(klar.toString('utf8')) };
}
/* ── Unabhängig vom Kern: SD-JWT mit KB-JWT zerlegen und nachrechnen ── */
function jwtLesen(jwt) {
  const [h, p, s] = jwt.split('.');
  return { kopf: vonB64u(h), nutzlast: vonB64u(p), sig: Buffer.from(s, 'base64url'), eingabe: Buffer.from(h + '.' + p, 'ascii') };
}
const edPruefen = (jwk, j) => nodeCrypto.verify(null, j.eingabe, nodeCrypto.createPublicKey({ key: jwk, format: 'jwk' }), j.sig);
function zerlegen(praesentation) {
  const i = praesentation.lastIndexOf('~');
  const ohneKb = praesentation.slice(0, i + 1);
  const teile = ohneKb.split('~');
  const sdJwt = jwtLesen(teile[0]);
  const offenlegungen = teile.slice(1, -1);
  return { ohneKb, sdJwt, offenlegungen, namen: offenlegungen.map((d) => vonB64u(d)[1]), kb: jwtLesen(praesentation.slice(i + 1)) };
}
const cnfX = (p, id) => zerlegen(p.vpToken[id || 'finanzen'][0]).sdJwt.nutzlast.cnf.jwk.x;

/* ══ Rundlauf ══ */

test('[OID4VP·Präsentation·Rundlauf] prüfen, bauen, JWE öffnen, SD-JWT VC und KB-JWT nachrechnen (aud, nonce, sd_hash)', async () => {
  const K = await kernMitDepot();
  const s = stelle('verifier.test.invalid');
  const g = await geprueftVon(K, s);
  const p = await K.oid4vpPraesentationBauen(g, { finanzen: ['pension_provider', 'occupational_pension'] }, { jetzt: JETZT });
  assert.equal(p.gueltig, true, p.grund + ' ' + (p.detail || ''));
  assert.deepEqual([...p.beantwortet], ['finanzen']);
  assert.ok(Object.isFrozen(p) && Object.isFrozen(p.vpToken), 'die gebaute Präsentation ist eingefroren');
  const a = await K.oid4vpAntwortJwe(p, g);
  assert.equal(a.gueltig, true, a.grund);
  assert.equal(a.responseUri, 'https://verifier.test.invalid/antwort');
  const { kopf, inhalt } = jweOeffnen(a.jwe, s.encPrivat);
  assert.equal(kopf.alg, 'ECDH-ES');
  assert.equal(kopf.enc, 'A128GCM', 'ohne Angabe der Stelle A128GCM (OpenID4VP 1.0 §8.3)');
  assert.equal(kopf.kid, 'enc-verifier.test.invalid');
  for (const f of ['apu', 'apv', 'typ', 'cty', 'pad', 'vorgang']) assert.ok(!(f in kopf), 'kein ' + f + ' im Kopf');
  assert.deepEqual(Object.keys(inhalt).sort(), ['state', 'vp_token']);
  assert.equal(inhalt.state, 'nur-test');
  assert.deepEqual(Object.keys(inhalt.vp_token), ['finanzen']);
  assert.equal(inhalt.vp_token.finanzen.length, 1);

  const z = zerlegen(inhalt.vp_token.finanzen[0]);
  // Das SD-JWT VC: selbst signiert mit dem Halter-Schlüssel je Stelle, Kopf-jwk = cnf.jwk (U2-ADR-457 Punkt 5).
  assert.equal(z.sdJwt.kopf.typ, 'dc+sd-jwt');
  assert.equal(z.sdJwt.kopf.alg, 'Ed25519');
  assert.deepEqual(z.sdJwt.kopf.jwk, z.sdJwt.nutzlast.cnf.jwk);
  assert.equal(z.sdJwt.nutzlast.vct, 'urn:vivodepot:finanzen');
  assert.equal(z.sdJwt.nutzlast._sd_alg, 'sha-256');
  assert.ok(edPruefen(z.sdJwt.nutzlast.cnf.jwk, z.sdJwt), 'Signatur des SD-JWT');
  assert.deepEqual([...z.sdJwt.nutzlast._sd].sort(), z.offenlegungen.map(sha256b64u).sort(), 'jede Offenlegung steht im _sd, und nur sie');
  // Das KB-JWT.
  assert.equal(z.kb.kopf.typ, 'kb+jwt', 'RFC 9901 §4.3');
  assert.equal(z.kb.kopf.alg, 'Ed25519', 'alg passend zum cnf-Schlüssel');
  assert.ok(!('jwk' in z.kb.kopf) && !('x5c' in z.kb.kopf));
  assert.ok(edPruefen(z.sdJwt.nutzlast.cnf.jwk, z.kb), 'Signatur des KB-JWT mit dem cnf-Schlüssel');
  assert.equal(z.kb.nutzlast.aud, 'x509_san_dns:verifier.test.invalid', 'aud = client_id samt Präfix');
  assert.equal(z.kb.nutzlast.aud, g.clientId);
  assert.equal(z.kb.nutzlast.nonce, NONCE, 'nonce aus der Anfrage');
  assert.equal(z.kb.nutzlast.iat, sekunden(JETZT));
  assert.equal(z.kb.nutzlast.sd_hash, sha256b64u(z.ohneKb), 'sd_hash über die Präsentation bis einschließlich der letzten „~“');
  assert.ok(z.ohneKb.endsWith('~'));
  assert.notEqual(z.kb.nutzlast.sd_hash, sha256b64u(z.ohneKb.slice(0, -1)), 'Gegenprobe: ohne die Tilde ein anderer Wert');
});

test('[OID4VP·Präsentation·enc] A256GCM vor A128GCM; ohne beide eine Abweisung; ohne passenden Schlüssel eine Abweisung', async () => {
  const K = await kernMitDepot();
  const s = stelle('verifier.test.invalid');
  const auswahl = { finanzen: ['pension_provider'] };
  const fall = async (cm) => {
    const g = await geprueftVon(K, s, { client_metadata: cm });
    return K.oid4vpAntwortJwe(await K.oid4vpPraesentationBauen(g, auswahl, { jetzt: JETZT }), g);
  };
  const a256 = await fall({ jwks: { keys: [s.encJwk] }, encrypted_response_enc_values_supported: ['A128GCM', 'A256GCM'] });
  assert.equal(a256.enc, 'A256GCM');
  assert.equal(jweOeffnen(a256.jwe, s.encPrivat).kopf.enc, 'A256GCM');
  const a128 = await fall({ jwks: { keys: [s.encJwk] }, encrypted_response_enc_values_supported: ['A128GCM'] });
  assert.equal(a128.enc, 'A128GCM');
  assert.equal(jweOeffnen(a128.jwe, s.encPrivat).inhalt.state, 'nur-test');
  assert.deepEqual(await fall({ jwks: { keys: [s.encJwk] }, encrypted_response_enc_values_supported: ['A192GCM'] }), { gueltig: false, grund: 'enc-nicht-unterstuetzt' });
  assert.deepEqual(await fall({ jwks: { keys: [] } }), { gueltig: false, grund: 'schluessel-der-stelle' });
  assert.deepEqual(await fall({ jwks: { keys: [Object.assign({}, s.encJwk, { use: 'sig' })] } }), { gueltig: false, grund: 'schluessel-der-stelle' });
  const ohneAlg = Object.assign({}, s.encJwk); delete ohneAlg.alg;
  assert.deepEqual(await fall({ jwks: { keys: [ohneAlg] } }), { gueltig: false, grund: 'schluessel-der-stelle' }, 'ohne alg nie gewählt (VP §8.3: alg MUST be present)');
  const ohneMeta = await geprueftVon(K, s, { client_metadata: undefined });
  assert.deepEqual(await K.oid4vpAntwortJwe(await K.oid4vpPraesentationBauen(ohneMeta, auswahl, { jetzt: JETZT }), ohneMeta), { gueltig: false, grund: 'schluessel-der-stelle' });
});

/* ══ Halter-Schlüssel je Stelle ══ */

test('[OID4VP·Präsentation·je Stelle] zwei Stellen, zwei Halter-Schlüssel; dieselbe Stelle, derselbe; getrennt von antwort und vom Passwort-Schlüssel', async () => {
  const K = await kernMitDepot();
  const sa = stelle('verifier.test.invalid');
  const sb = stelle('andere.test.invalid');
  const auswahl = { finanzen: ['pension_provider'] };
  const ga1 = await geprueftVon(K, sa);
  const ga2 = await geprueftVon(K, sa, { nonce: 'zweite-anfrage-1', state: 'zwei' });
  const gb = await geprueftVon(K, sb);
  const pa1 = await K.oid4vpPraesentationBauen(ga1, auswahl, { jetzt: JETZT });
  const pa2 = await K.oid4vpPraesentationBauen(ga2, auswahl, { jetzt: JETZT });
  const pb = await K.oid4vpPraesentationBauen(gb, auswahl, { jetzt: JETZT });
  assert.ok(pa1.gueltig && pa2.gueltig && pb.gueltig);
  assert.equal(cnfX(pa1), cnfX(pa2), 'dieselbe Stelle erkennt den Schlüssel wieder');
  assert.notEqual(cnfX(pa1), cnfX(pb), 'über Stellen hinweg nicht über den Schlüssel verkettbar');
  assert.equal(cnfX(pa1), (await K.sdjwtHalterSchluessel(ga1.stelle.kennung)).jwk.x, 'der Schlüssel stammt aus sdjwtHalterSchluessel');
  assert.notEqual(cnfX(pa1), (await K.antwortSchluesselJeStelle(ga1.stelle.kennung)).jwk.x, 'Domäne sdjwt-halter ≠ Domäne antwort');
  const passwort = await K._halterSignaturHolen();
  assert.ok(passwort && passwort.jwk && passwort.jwk.x, 'Vorbedingung: der Schlüssel aus dem Passwort entsteht');
  assert.notEqual(cnfX(pa1), passwort.jwk.x, 'nicht der Schlüssel aus dem Passwort');
  assert.notEqual(cnfX(pb), passwort.jwk.x);
});

const SEED = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
const VEKTOR = {
  kennung: 'signiert:dns:0021:verifier.test.invalid',
  info: '7669766f6465706f742f616e74776f72742d7363686c75657373656c2f76310073646a77742d68616c7465720000277369676e696572743a646e733a303032313a76657269666965722e746573742e696e76616c6964',
  x: '7lg45y5Inn22q9s0TC10TPcOub4ZpJtNNO7vCv_YLys',
};
test('[OID4VP·Präsentation·Vektor] Halter-Schlüssel je Stelle: info, öffentlicher Schlüssel, unabhängig nachgerechnet; nur für signiert:', async () => {
  const { V } = ladeKern({ zusatzBindungen: NAMEN });
  const K = V.__zusatz;
  assert.equal(Buffer.from(K.antwortSchluesselInfo('sdjwt-halter', VEKTOR.kennung)).toString('hex'), VEKTOR.info);
  const okm = Buffer.from(nodeCrypto.hkdfSync('sha256', SEED, Buffer.alloc(0), Buffer.from(VEKTOR.info, 'hex'), 32));
  const pk8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), okm]);
  const x = nodeCrypto.createPublicKey(nodeCrypto.createPrivateKey({ key: pk8, format: 'der', type: 'pkcs8' })).export({ format: 'jwk' }).x;
  assert.equal(x, VEKTOR.x, 'der Vektor stimmt');
  const ziel = { antwortSeed: { form: 1, wert: SEED.toString('base64url') } };
  const h = await K.sdjwtHalterSchluessel(VEKTOR.kennung, ziel);
  assert.equal(h.jwk.x, VEKTOR.x, 'der Kern findet denselben Schlüssel');
  assert.equal(h.schluessel.extractable, false, 'privat nicht herausholbar');
  assert.notEqual((await K.antwortSchluesselJeStelle(VEKTOR.kennung, ziel)).jwk.x, VEKTOR.x, 'Domäne antwort: ein anderer Schlüssel');
  await assert.rejects(() => K.sdjwtHalterSchluessel('unsigniert:0021:verifier.test.invalid', ziel), /sdjwt-halter:kennung/);
});

/* ══ Nur die gewählten Offenlegungen ══ */

test('[OID4VP·Präsentation·Auswahl] nur gewählte und verlangte Angaben; keine weiteren Offenlegungen, keine weiteren Digests', async () => {
  const K = await kernMitDepot();
  const s = stelle('verifier.test.invalid');
  const g = await geprueftVon(K, s);
  // claim_sets [[anbieter, bav], [anbieter]]: die Person wählt nur den Anbieter (und eine nicht verlangte sensible Angabe).
  const p1 = await K.oid4vpPraesentationBauen(g, { finanzen: ['pension_provider', 'pension_provider_contract_number'] }, { jetzt: JETZT });
  const z1 = zerlegen(p1.vpToken.finanzen[0]);
  assert.deepEqual(z1.namen, ['pension_provider']);
  assert.equal(z1.sdJwt.nutzlast._sd.length, 1, 'nur ein Digest');
  assert.equal(vonB64u(z1.offenlegungen[0])[2], 'Cosmos Direkt');
  // Beide gewählt: beide offengelegt; die sensible Angabe steht nie darin, auch nicht mit Zustimmung, weil keine Query sie verlangt.
  const p2 = await K.oid4vpPraesentationBauen(g, { finanzen: ['pension_provider', 'occupational_pension', 'pension_provider_contract_number'] }, { jetzt: JETZT, sensibel: true });
  const z2 = zerlegen(p2.vpToken.finanzen[0]);
  assert.deepEqual([...z2.namen].sort(), ['occupational_pension', 'pension_provider']);
  assert.equal(z2.sdJwt.nutzlast._sd.length, 2);
  for (const z of [z1, z2]) assert.ok(!z.offenlegungen.map(vonB64u).some((d) => d[2] === 'POL-772-4493'), 'die Vertragsnummer reist nicht mit');
  // Ohne claim_sets muss jede verlangte Angabe gewählt sein [P4].
  const gOhneSets = await geprueftVon(K, s, { dcql_query: { credentials: [{ id: 'finanzen', format: 'dc+sd-jwt', meta: { vct_values: ['urn:vivodepot:finanzen'] }, claims: [{ path: ['pension_provider'] }, { path: ['occupational_pension'] }] }] } });
  assert.deepEqual(await K.oid4vpPraesentationBauen(gOhneSets, { finanzen: ['pension_provider'] }, { jetzt: JETZT }), { gueltig: false, grund: 'nichts-erfuellbar' });
  // Eine Query ohne claims legt nichts offen [P3].
  const gOhneClaims = await geprueftVon(K, s, { dcql_query: { credentials: [{ id: 'finanzen', format: 'dc+sd-jwt', meta: { vct_values: ['urn:vivodepot:finanzen'] } }] } });
  const p3 = await K.oid4vpPraesentationBauen(gOhneClaims, { finanzen: ['pension_provider'] }, { jetzt: JETZT });
  assert.deepEqual(zerlegen(p3.vpToken.finanzen[0]).namen, []);
  assert.deepEqual(zerlegen(p3.vpToken.finanzen[0]).sdJwt.nutzlast._sd, []);
});

/* ══ Nicht erfüllbar, Abweisungen mit Grund ══ */

test('[OID4VP·Präsentation·nicht erfüllbar] unbeantwortet bleiben fremde Formate, fremde vct und Identität; credential_set verlangt → Grund; kein Wurf', async () => {
  const K = await kernMitDepot();
  const s = stelle('verifier.test.invalid');
  const fin = DCQL.credentials[0];
  const ident = { id: 'ident', format: 'dc+sd-jwt', meta: { vct_values: ['urn:vivodepot:identitaet', 'urn:eudi:pid:1'] }, claims: [{ path: ['given_name'] }] };
  const mdoc = { id: 'mdoc', format: 'mso_mdoc', meta: { doctype_value: 'org.iso.18013.5.1.mDL' } };
  const auswahl = { finanzen: ['pension_provider'], ident: ['given_name'], mdoc: ['x'] };
  const g1 = await geprueftVon(K, s, { dcql_query: { credentials: [fin, ident, mdoc] } });
  const p1 = await K.oid4vpPraesentationBauen(g1, auswahl, { jetzt: JETZT });
  assert.equal(p1.gueltig, true, p1.grund);
  assert.deepEqual([...p1.beantwortet], ['finanzen']);
  assert.deepEqual([...p1.unbeantwortet], ['ident', 'mdoc'], 'keine Identität aus dem Depot, kein PID-Typ, kein mso_mdoc');
  assert.deepEqual(Object.keys(p1.vpToken), ['finanzen']);

  const g2 = await geprueftVon(K, s, { dcql_query: { credentials: [fin, ident], credential_sets: [{ options: [['finanzen']] }, { options: [['ident']], required: true }] } });
  assert.deepEqual(await K.oid4vpPraesentationBauen(g2, auswahl, { jetzt: JETZT }), { gueltig: false, grund: 'credential-set-nicht-erfuellbar', detail: 1 });
  const g3 = await geprueftVon(K, s, { dcql_query: { credentials: [fin, ident], credential_sets: [{ options: [['finanzen']] }, { options: [['ident']], required: false }] } });
  const p3 = await K.oid4vpPraesentationBauen(g3, auswahl, { jetzt: JETZT });
  assert.deepEqual([...p3.beantwortet], ['finanzen'], 'eine nicht verlangte credential_set darf offen bleiben');

  const GRUENDE = [...K.OID4VP_PRAESENTATION_GRUENDE];
  const g = await geprueftVon(K, s);
  const faelle = [
    ['nichts gewählt', 'nichts-erfuellbar', () => K.oid4vpPraesentationBauen(g, {}, { jetzt: JETZT })],
    ['Auswahl kein Objekt', 'auswahl-form', () => K.oid4vpPraesentationBauen(g, 'finanzen', { jetzt: JETZT })],
    ['Auswahl mit Zahl', 'auswahl-form', () => K.oid4vpPraesentationBauen(g, { finanzen: [1] }, { jetzt: JETZT })],
    ['Kopie der geprüften Anfrage (kein Prüfvermerk)', 'anfrage-nicht-geprueft', () => K.oid4vpPraesentationBauen(Object.assign({}, g), { finanzen: ['pension_provider'] }, { jetzt: JETZT })],
    ['eine Abweisung statt der geprüften Anfrage', 'anfrage-nicht-geprueft', () => K.oid4vpPraesentationBauen({ gueltig: false, grund: 'anfrage-form' }, { finanzen: ['pension_provider'] })],
    ['nichts', 'anfrage-nicht-geprueft', () => K.oid4vpPraesentationBauen(undefined, undefined)],
  ];
  for (const [name, grund, lauf] of faelle) {
    const r = await lauf();
    assert.equal(r.gueltig, false, name);
    assert.equal(r.grund, grund, name + ': ' + JSON.stringify(r));
    assert.ok(GRUENDE.includes(r.grund), name);
  }
});

test('[OID4VP·Präsentation·ein Weg] verschlüsselt wird nur eine gebaute Präsentation zu genau dieser geprüften Anfrage', async () => {
  const K = await kernMitDepot();
  const s = stelle('verifier.test.invalid');
  const g = await geprueftVon(K, s);
  const anders = await geprueftVon(K, s, { nonce: 'andere-anfrage-9' });
  const p = await K.oid4vpPraesentationBauen(g, { finanzen: ['pension_provider'] }, { jetzt: JETZT });
  assert.equal((await K.oid4vpAntwortJwe(p, g)).gueltig, true, 'Positivkontrolle');
  const fremd = { gueltig: false, grund: 'praesentation-fremd' };
  assert.deepEqual(await K.oid4vpAntwortJwe(Object.assign({}, p), g), fremd, 'eine nachgebaute Präsentation');
  assert.deepEqual(await K.oid4vpAntwortJwe(p, anders), fremd, 'die Präsentation einer anderen Anfrage');
  assert.deepEqual(await K.oid4vpAntwortJwe(p, Object.assign({}, g)), fremd, 'eine Kopie der geprüften Anfrage');
  assert.deepEqual(await K.oid4vpAntwortJwe({ vpToken: { finanzen: ['x~'] } }, g), fremd);
  assert.deepEqual(await K.oid4vpAntwortJwe(null, null), fremd);
  assert.ok([...K.OID4VP_ANTWORT_GRUENDE].includes('praesentation-fremd'));
});

test('[OID4VP·Präsentation·Exportweg] der Export nach U2-ADR-457 bleibt beim Schlüssel aus dem Passwort', async () => {
  const { V } = ladeKern({ zusatzBindungen: NAMEN });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('finance', 'privatePensionProvision', 'Cosmos Direkt');
  const r = await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcFinanzen());
  assert.equal(r.signiert, true);
  assert.equal(r.jwtPayload.cnf.jwk.x, (await V.__zusatz._halterSignaturHolen()).jwk.x);
  assert.ok(!r.serialisierung.slice(r.serialisierung.lastIndexOf('~') + 1), 'der Export trägt kein KB-JWT');
});

/* ══ Rot-Beweise ══ */

function kernKopie(alt, neu, zweck) {
  assert.equal(KERN.split(alt).length, 2, 'Vorbedingung (' + zweck + '): die Zeile steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-oid4vp-praesentation-rot-'));
  const p = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(p, KERN.replace(alt, neu));
  return { p, weg: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const NONCE_ZEILE = '  const kbNutzlast = { iat, aud: geprueft.clientId, nonce: geprueft.nonce, sd_hash: sdHash };';
test('[OID4VP·Präsentation·Rot-Beweis] ein Kern ohne Übernahme der nonce fiele in der Probe auf', async () => {
  const k = kernKopie(NONCE_ZEILE, "  const kbNutzlast = { iat, aud: geprueft.clientId, nonce: 'fest', sd_hash: sdHash };", 'nonce');
  try {
    const R = await kernMitDepot(k.p);
    const s = stelle('verifier.test.invalid');
    const g = await geprueftVon(R, s);
    const p = await R.oid4vpPraesentationBauen(g, { finanzen: ['pension_provider'] }, { jetzt: JETZT });
    assert.equal(p.gueltig, true, 'die geschwächte Fassung baut weiter');
    assert.notEqual(zerlegen(p.vpToken.finanzen[0]).kb.nutzlast.nonce, NONCE, 'die nonce der Anfrage fehlt — der Rundlauf oben würde rot');
  } finally { k.weg(); }
});

const HALTER_ZEILE = '  const halter = await sdjwtHalterSchluessel(geprueft.stelle.kennung, opt.ziel);';
test('[OID4VP·Präsentation·Rot-Beweis] ein Kern mit dem Schlüssel aus dem Passwort machte zwei Stellen gleich', async () => {
  const k = kernKopie(HALTER_ZEILE, '  const halter = await _halterSignaturHolen();', 'Halter-Schlüssel');
  try {
    const R = await kernMitDepot(k.p);
    const pa = await R.oid4vpPraesentationBauen(await geprueftVon(R, stelle('verifier.test.invalid')), { finanzen: ['pension_provider'] }, { jetzt: JETZT });
    const pb = await R.oid4vpPraesentationBauen(await geprueftVon(R, stelle('andere.test.invalid')), { finanzen: ['pension_provider'] }, { jetzt: JETZT });
    assert.ok(pa.gueltig && pb.gueltig, 'die geschwächte Fassung baut weiter');
    assert.equal(cnfX(pa), cnfX(pb), 'über Stellen hinweg derselbe Schlüssel — die Probe „je Stelle“ oben würde rot');
    assert.equal(cnfX(pa), (await R._halterSignaturHolen()).jwk.x);
  } finally { k.weg(); }
});

/* ══ Kein Netz, keine Identität, kein PID ══ */

const TEILE = [
  ['/* ══ OID4VP · DIE PRÄSENTATION AUS DER DATEI', '/* OID4VP-ANFRAGE:END */'],
  ['/* ══ OID4VP · DIE ANTWORT AN DIE STELLE ALS JWE', '/* ══ ENDE OID4VP · DIE ANTWORT AN DIE STELLE ALS JWE ══ */'],
];
function h2Code(text) {
  return TEILE.map(([a, e]) => {
    const i = text.indexOf(a);
    assert.ok(i > 0 && text.indexOf(a, i + 1) === -1, 'Vorbedingung: ' + a + ' steht genau einmal');
    const j = text.indexOf(e, i);
    assert.ok(j > i, 'Vorbedingung: Ende zu ' + a);
    return text.slice(i, j);
  }).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((z) => z.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
}
const NETZ = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|\bimport\s*\(/;
const IDENTITAET = /sdJwtVcIdentitaet|urn:vivodepot:identitaet|\bpid\b/i;

test('[OID4VP·Präsentation·Grenzen] kein Netz, kein sdJwtVcIdentitaet, kein PID-Typ; angeboten werden genau Finanzen und Sozialversicherung', async () => {
  const code = h2Code(KERN);
  assert.match(code, /async function oid4vpPraesentationBauen\(/, 'Positivkontrolle');
  assert.match(code, /async function oid4vpAntwortJwe\(/, 'Positivkontrolle');
  assert.ok(!NETZ.test(code), 'kein Netz');
  assert.ok(!IDENTITAET.test(code), 'keine Identität, kein PID');
  assert.ok(NETZ.test(code + '\nconst r = await fetch(u);') && IDENTITAET.test(code + '\nsdJwtVcIdentitaet(o)'), 'Rot-Beweis: beides würde gefunden');
  const { V } = ladeKern({ zusatzBindungen: NAMEN });
  assert.deepEqual(Object.keys(V.__zusatz.OID4VP_PRAESENTATION_ANGEBOT).sort(), ['urn:vivodepot:finanzen', 'urn:vivodepot:sozialversicherung']);
  assert.ok(Object.isFrozen(V.__zusatz.OID4VP_PRAESENTATION_ANGEBOT));
});

/* ══ Z und CEK werden überschrieben ══ */

/* Hüllt crypto.subtle des geladenen Kerns (dasselbe webcrypto-Objekt, tests/load-kern.js) für die Dauer von `lauf`: deriveBits
   (ECDH) meldet seinen Ergebnis-Puffer, importKey('raw', …, AES-GCM) den übergebenen CEK. `wirft` = 'encrypt' | 'importKey'
   lässt diesen Schritt werfen. Die Hülle wird im finally wieder entfernt. */
async function mitBeobachtung(wirft, lauf) {
  const subtle = webcrypto.subtle;
  const orig = { deriveBits: subtle.deriveBits, importKey: subtle.importKey, encrypt: subtle.encrypt };
  const gesehen = { z: [], cek: [] };
  subtle.deriveBits = async function (alg, ...rest) {
    const r = await orig.deriveBits.call(subtle, alg, ...rest);
    if (alg && alg.name === 'ECDH') gesehen.z.push(r);
    return r;
  };
  subtle.importKey = async function (format, daten, alg, ...rest) {
    if (format === 'raw' && alg && alg.name === 'AES-GCM') {
      gesehen.cek.push(daten);
      if (wirft === 'importKey') throw new Error('probe-importKey');
    }
    return orig.importKey.call(subtle, format, daten, alg, ...rest);
  };
  subtle.encrypt = async function (...a) {
    if (wirft === 'encrypt') throw new Error('probe-encrypt');
    return orig.encrypt.apply(subtle, a);
  };
  try { return { ergebnis: await lauf(), gesehen }; }
  finally { delete subtle.deriveBits; delete subtle.importKey; delete subtle.encrypt; }
}
const nurNullen = (b) => { const u = b instanceof Uint8Array ? b : new Uint8Array(b); return u.length > 0 && u.every((x) => x === 0); };

async function zUndCekLauf(K, wirft) {
  const s = stelle('verifier.test.invalid');
  const g = await geprueftVon(K, s);
  const p = await K.oid4vpPraesentationBauen(g, { finanzen: ['pension_provider'] }, { jetzt: JETZT });
  assert.equal(p.gueltig, true, p.grund);
  return mitBeobachtung(wirft, () => K.oid4vpAntwortJwe(p, g));
}

test('[OID4VP·Präsentation·Überschreiben] Z und CEK sind nach der Antwort-JWE nur Nullen, auch wenn encrypt oder der CEK-Import wirft', async () => {
  const K = await kernMitDepot();
  assert.equal(webcrypto.subtle.deriveBits, Object.getPrototypeOf(webcrypto.subtle).deriveBits, 'Vorbedingung: keine Hülle steht');
  for (const wirft of [null, 'encrypt', 'importKey']) {
    const { ergebnis, gesehen } = await zUndCekLauf(K, wirft);
    const name = wirft ? wirft + ' wirft' : 'Erfolgsweg';
    if (wirft) assert.deepEqual(ergebnis, { gueltig: false, grund: 'warf' }, name + ': eine Abweisung, kein Wurf');
    else assert.equal(ergebnis.gueltig, true, name);
    assert.equal(gesehen.z.length, 1, name + ': Positivkontrolle, Z gesehen');
    assert.equal(gesehen.cek.length, 1, name + ': Positivkontrolle, CEK gesehen');
    assert.equal(new Uint8Array(gesehen.cek[0]).length, 16, name + ': A128GCM, 16 Byte CEK');
    assert.ok(nurNullen(gesehen.z[0]), name + ': Z überschrieben');
    assert.ok(nurNullen(gesehen.cek[0]), name + ': CEK überschrieben');
  }
  assert.equal(webcrypto.subtle.deriveBits, Object.getPrototypeOf(webcrypto.subtle).deriveBits, 'die Hülle ist wieder entfernt');
});

const JWE_FINALLY = '  } finally { if (z) z.fill(0); if (cek) cek.fill(0); }';
test('[OID4VP·Präsentation·Überschreiben·Rot-Beweis] ein Kern ohne das Überschreiben im finally ließe Z und CEK stehen', async () => {
  // Dieselbe Zeile steht auch in antwortJweSchluessel; ersetzt wird nur die in oid4vpAntwortJweRoh.
  const a = KERN.indexOf('async function oid4vpAntwortJweRoh(');
  const e = KERN.indexOf('async function oid4vpAntwortJwe(', a);
  const i = KERN.indexOf(JWE_FINALLY, a);
  assert.ok(a > 0 && e > a && i > a && i < e, 'Vorbedingung: die Zeile steht in oid4vpAntwortJweRoh');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-oid4vp-praesentation-rot-'));
  try {
    const p = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(p, KERN.slice(0, i) + '  } finally { }' + KERN.slice(i + JWE_FINALLY.length));
    const R = await kernMitDepot(p);
    for (const wirft of [null, 'encrypt']) {
      const { gesehen } = await zUndCekLauf(R, wirft);
      assert.equal(gesehen.z.length, 1);
      assert.ok(!nurNullen(gesehen.z[0]), (wirft || 'Erfolgsweg') + ': Z bliebe stehen — die Probe oben würde rot');
      assert.ok(!nurNullen(gesehen.cek[0]), (wirft || 'Erfolgsweg') + ': CEK bliebe stehen — die Probe oben würde rot');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* ══ Schlüsselwahl und state (VP §8.3, §5.3; gelesen 18.10.2026) ══ */

test('[OID4VP·Präsentation·Schlüsselwahl] aus X25519, P-384 und zwei P-256 wird der erste P-256 gewählt; use fehlt ist zulässig; kid im Kopf', async () => {
  const K = await kernMitDepot();
  const s = stelle('verifier.test.invalid');
  const roh = (namedCurve) => { const k = nodeCrypto.generateKeyPairSync('ec', { namedCurve }); return { privat: k.privateKey, jwk: k.publicKey.export({ format: 'jwk' }) }; };
  const x25519 = nodeCrypto.generateKeyPairSync('x25519').publicKey.export({ format: 'jwk' });
  const p384 = roh('secp384r1');
  const erster = roh('prime256v1');
  const zweiter = roh('prime256v1');
  const keys = [
    Object.assign({}, x25519, { use: 'enc', alg: 'ECDH-ES', kid: 'x25519' }),
    Object.assign({}, p384.jwk, { use: 'enc', alg: 'ECDH-ES', kid: 'p384' }),
    Object.assign({}, erster.jwk, { use: 'enc', alg: 'ECDH-ES', kid: 'p256-erster' }),
    Object.assign({}, zweiter.jwk, { use: 'enc', alg: 'ECDH-ES', kid: 'p256-zweiter' }),
  ];
  const auswahl = { finanzen: ['pension_provider'] };
  const g = await geprueftVon(K, s, { client_metadata: { jwks: { keys } } });
  const a = await K.oid4vpAntwortJwe(await K.oid4vpPraesentationBauen(g, auswahl, { jetzt: JETZT }), g);
  assert.equal(a.gueltig, true, a.grund);
  const o = jweOeffnen(a.jwe, erster.privat);
  assert.equal(o.kopf.kid, 'p256-erster', 'der erste P-256-Schlüssel, sein kid im Kopf');
  assert.equal(o.inhalt.state, 'nur-test');
  assert.throws(() => jweOeffnen(a.jwe, zweiter.privat), 'Gegenprobe: der zweite P-256-Schlüssel öffnet nicht');
  // use fehlt: zulässig. use sig davor: übersprungen. Ohne kid: kein kid im Kopf.
  const ohneUse = Object.assign({}, erster.jwk, { alg: 'ECDH-ES' });
  const g2 = await geprueftVon(K, s, { client_metadata: { jwks: { keys: [Object.assign({}, zweiter.jwk, { use: 'sig', alg: 'ECDH-ES', kid: 'sig' }), ohneUse] } } });
  const a2 = await K.oid4vpAntwortJwe(await K.oid4vpPraesentationBauen(g2, auswahl, { jetzt: JETZT }), g2);
  assert.equal(a2.gueltig, true, a2.grund);
  const o2 = jweOeffnen(a2.jwe, erster.privat);
  assert.ok(!('kid' in o2.kopf), 'ohne kid am Schlüssel kein kid im Kopf');
});

test('[OID4VP·Präsentation·state] state nur in der Nutzlast, wenn die Anfrage eines trug (VP §5.3)', async () => {
  const K = await kernMitDepot();
  const s = stelle('verifier.test.invalid');
  const auswahl = { finanzen: ['pension_provider'] };
  const mit = await geprueftVon(K, s, { state: 'mit-state-7' });
  const ohne = await geprueftVon(K, s, { state: undefined });
  const am = await K.oid4vpAntwortJwe(await K.oid4vpPraesentationBauen(mit, auswahl, { jetzt: JETZT }), mit);
  const ao = await K.oid4vpAntwortJwe(await K.oid4vpPraesentationBauen(ohne, auswahl, { jetzt: JETZT }), ohne);
  assert.deepEqual(Object.keys(jweOeffnen(am.jwe, s.encPrivat).inhalt).sort(), ['state', 'vp_token']);
  assert.equal(jweOeffnen(am.jwe, s.encPrivat).inhalt.state, 'mit-state-7');
  assert.deepEqual(Object.keys(jweOeffnen(ao.jwe, s.encPrivat).inhalt), ['vp_token'], 'ohne state in der Anfrage kein state in der Antwort');
});

/* Der flüchtige ECDH-Schlüssel der Antwort-JWE (oid4vpAntwortJweRoh) entsteht mit extractable:false, wie der der Antwort an
   eine Stelle (tests/kern-antwort-fluechtiger-schluessel.test.js). Gemessen am echten Aufruf: die Probe hört generateKey mit. */
const FLUECHTIG_VP_ZEILE = "  const fluechtigVp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);";
async function fluechtigVerletzungen(K) {
  const s = stelle('verifier.test.invalid');
  const g = await geprueftVon(K, s);
  const p = await K.oid4vpPraesentationBauen(g, { finanzen: ['pension_provider'] }, { jetzt: JETZT });
  assert.equal(p.gueltig, true, p.grund);
  const gesehen = [];
  const orig = webcrypto.subtle.generateKey;
  webcrypto.subtle.generateKey = async function (alg, ...rest) {
    const k = await orig.call(this, alg, ...rest);
    if (alg && alg.name === 'ECDH') gesehen.push(k);
    return k;
  };
  try {
    const a = await K.oid4vpAntwortJwe(p, g);
    assert.equal(a.gueltig, true, a.grund);
  } finally {
    webcrypto.subtle.generateKey = orig;
  }
  const v = [];
  if (gesehen.length !== 1) v.push('nicht-genau-ein-fluechtiges-paar:' + gesehen.length);
  for (const k of gesehen) {
    if (k.privateKey.extractable !== false) v.push('fluechtiger-privater-teil-herausholbar');
    try { await webcrypto.subtle.exportKey('jwk', k.privateKey); v.push('export-des-privaten-teils-gelang'); } catch (e) { /* so soll es sein */ }
  }
  return v;
}

test('[OID4VP·Präsentation·flüchtig] der flüchtige Schlüssel der Antwort-JWE ist nicht herausholbar', async () => {
  assert.deepEqual(await fluechtigVerletzungen(await kernMitDepot()), []);
});

test('[OID4VP·Präsentation·flüchtig·Rot-Beweis] eine Fassung mit extractable:true wird gemeldet', async () => {
  const k = kernKopie(FLUECHTIG_VP_ZEILE, FLUECHTIG_VP_ZEILE.replace(', false,', ', true,'), 'flüchtiger Schlüssel');
  try {
    const v = await fluechtigVerletzungen(await kernMitDepot(k.p));
    assert.ok(v.includes('fluechtiger-privater-teil-herausholbar') && v.includes('export-des-privaten-teils-gelang'), v.join());
  } finally { k.weg(); }
});
