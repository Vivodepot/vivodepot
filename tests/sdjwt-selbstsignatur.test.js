'use strict';
/* Die kompakte SD-JWT-Form ist selbst signiert (Ed25519, Schlüssel der Halterin aus dem Passwort abgeleitet). Formkonform
   nach RFC 9901 §4.1, Vertrauen null ohne Institutionssignatur. Proben: Normvektoren (RFC 8037 Anhang A, RFC 9901 §5.1),
   die Ausgabe prüft unabhängig vom Kern gegen den jwk im Kopf, Ableitung und Domänentrennung, alg passt zum Schlüssel,
   der Rückfall ohne Ed25519 behauptet kein SD-JWT, und die eigene Selbst-Signatur kommt geprüft wieder herein. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
// Die Ableitung des öffentlichen Schlüssels, wie der Kern sie hineinreicht (eingebettete noble-ed25519, U2-ADR-457 Nachtrag v865).
const OEFFENTLICH_AUS_SEED = (seed) => require('./helfer/noble-ed25519.js').harnessBibliothek().getPublicKey(seed);
const { ladeKern, webcrypto, HTML_PATH } = require('./load-kern.js');

const s = webcrypto.subtle;
const b64uBytes = (t) => new Uint8Array(Buffer.from(t, 'base64url'));
const b64uJson = (t) => JSON.parse(Buffer.from(t, 'base64url').toString('utf8'));
const sha256b64u = async (str) => Buffer.from(await s.digest('SHA-256', new TextEncoder().encode(str))).toString('base64url');

// RFC 8037 Anhang A.1/A.3/A.4 und RFC 9901 §5.1 — Werte aus den Normtexten (rfc-editor.org), nicht nachgerechnet.
const RFC8037 = {
  x: '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo',
  thumbprint: 'kPrK_qmxVWaYVA9wwBF6Iuo3vVzz7TxHCTwXBygrS4k',
  jws: 'eyJhbGciOiJFZERTQSJ9.RXhhbXBsZSBvZiBFZDI1NTE5IHNpZ25pbmc.hgyY0il_MGCjP0JzlnLWG1PPOt7-09PGcvMg3AIbQR6dWbhijcNR4ki4iylGjg5BhVsPt9g7sVvpAr_MuM0KAg',
};
const RFC9901 = { disclosure: 'WyIyR0xDNDJzS1F2ZUNmR2ZyeU5STjl3IiwgImdpdmVuX25hbWUiLCAiSm9obiJd', digest: 'jsu9yVulwQQlhFlM_3JlzMaSFzglhQG0DpfayQwLUK4' };

async function depot(V, passwort) {
  await V.depotAnlegen(passwort);
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('identity', 'birthDate', '1964-08-12');
}
// Ein vom Kern unabhängiger SD-JWT-Prüfer: Signatur gegen den jwk im Kopf (nur WebCrypto), jede Offenlegung im _sd.
async function unabhaengigPruefen(serialisierung) {
  const teile = serialisierung.split('~');
  const [h, p, sig] = teile[0].split('.');
  const kopf = b64uJson(h), nutzlast = b64uJson(p);
  const key = await s.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: kopf.jwk.x }, { name: 'Ed25519' }, false, ['verify']);
  const signaturOk = await s.verify({ name: 'Ed25519' }, key, b64uBytes(sig), new TextEncoder().encode(h + '.' + p));
  const offen = teile.slice(1).filter(Boolean);
  const digests = await Promise.all(offen.map(sha256b64u));
  return { kopf, nutzlast, signaturOk, offenlegungenImSd: digests.every((d) => nutzlast._sd.includes(d)) };
}

test('[SD-JWT·Selbstsignatur·Norm] Vektoren aus RFC 8037 (Thumbprint, Signatur) und RFC 9901 (Offenlegungs-Digest)', async () => {
  const { V } = ladeKern();
  assert.equal(await V.jwkThumbprintOkp({ kty: 'OKP', crv: 'Ed25519', x: RFC8037.x }), RFC8037.thumbprint);
  // Die Nutzlast des Vektors ist kein JSON; geprüft wird darum über die alg-Abbildung des JWS-Blocks direkt.
  const key = await V._jwsImportVerifyKey({ kty: 'OKP', crv: 'Ed25519', x: RFC8037.x });
  const [h, p, sig] = RFC8037.jws.split('.');
  for (const alg of ['EdDSA', 'Ed25519']) {
    assert.equal(V._jwsAlgPasstZuKey(alg, key), true, alg);
    assert.equal(await s.verify(V._jwsWebCryptoParams(alg), key, b64uBytes(sig), new TextEncoder().encode(h + '.' + p)), true, alg);
  }
  assert.equal(await V._eudiwDigest(RFC9901.disclosure), RFC9901.digest);
});

test('[SD-JWT·Selbstsignatur] die Ausgabe ist signiert, prüft unabhängig vom Kern und zeigt die Selbstausstellung offen', async () => {
  const { V } = ladeKern();
  await depot(V, 'selbstsignatur-probe-lang-genug-2026');
  const res = await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}));
  assert.equal(res.signiert, true);
  const u = await unabhaengigPruefen(res.serialisierung);
  assert.equal(u.signaturOk, true, 'Signatur gültig gegen den jwk im Kopf');
  assert.equal(u.offenlegungenImSd, true, 'jede Offenlegung steht im _sd');
  assert.equal(u.kopf.alg, 'Ed25519');
  assert.equal(u.kopf.typ, 'dc+sd-jwt');
  assert.equal(u.kopf.kid, await V.jwkThumbprintOkp(u.kopf.jwk));
  assert.deepEqual(u.nutzlast.cnf, { jwk: u.kopf.jwk }, 'Halterin = Ausstellerin');
  assert.equal(u.nutzlast.iss, 'urn:vivodepot:selbstauskunft');
  for (const fremd of ['x5c', 'x5u', 'jku', 'trust_chain']) assert.equal(u.kopf[fremd], undefined, 'kein Feld einer dritten Stelle: ' + fremd);
  assert.equal(Object.keys(u.kopf.jwk).sort().join(), 'crv,kty,x', 'nur der öffentliche Schlüssel im Kopf');
});

test('[SD-JWT·Selbstsignatur·Schlüssel] dieselbe Sitzung → derselbe Schlüssel; anderes Passwort oder Depot → ein anderer; nicht extrahierbar', async () => {
  const { V } = ladeKern();
  const master = async (n) => V.importMasterHkdfKey(new Uint8Array(32).fill(n).buffer);
  const salt = new Uint8Array(32).fill(7);
  const a1 = await V.deriveHalterSignaturV4(await master(1), salt, 'depot-a', OEFFENTLICH_AUS_SEED);
  const a2 = await V.deriveHalterSignaturV4(await master(1), salt, 'depot-a', OEFFENTLICH_AUS_SEED);
  const b = await V.deriveHalterSignaturV4(await master(1), salt, 'depot-b', OEFFENTLICH_AUS_SEED);
  const c = await V.deriveHalterSignaturV4(await master(2), salt, 'depot-a', OEFFENTLICH_AUS_SEED);
  assert.equal(a1.jwk.x, a2.jwk.x);
  assert.notEqual(a1.jwk.x, b.jwk.x, 'anderes Depot');
  assert.notEqual(a1.jwk.x, c.jwk.x, 'anderes Passwort');
  assert.equal(a1.schluessel.extractable, false);
  assert.deepEqual(a1.schluessel.usages, ['sign']);
});

test('[SD-JWT·Selbstsignatur·Domäne] die Ableitung ist von Depot- und Adressschlüssel getrennt', async () => {
  const { V } = ladeKern();
  const infos = [V.HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX, V.HKDF_INFO_DEPOT_V2_PREFIX, V.HKDF_INFO_ADRESSE_V4_PREFIX, V.HKDF_INFO_SUBDEPOT_V1];
  assert.equal(new Set(infos).size, infos.length);
  for (const i of infos) for (const j of infos) if (i !== j) assert.equal(i.startsWith(j), false, i + ' beginnt mit ' + j);
  // Dieselbe Wurzel, dasselbe Depot: die Bits der Signatur-Domäne sind andere als die der Depot-Domäne.
  const wurzel = await s.importKey('raw', new Uint8Array(32).fill(3), { name: 'HKDF' }, false, ['deriveBits']);
  const bits = async (info) => Buffer.from(await s.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode(info + 'd') }, wurzel, 256)).toString('hex');
  assert.notEqual(await bits(V.HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX), await bits(V.HKDF_INFO_DEPOT_V2_PREFIX));
});

test('[SD-JWT·Selbstsignatur·Rot-Beweis] veränderte Offenlegung, veränderter Kopf, getauschter Schlüssel → rot', async () => {
  const { V } = ladeKern();
  await depot(V, 'selbstsignatur-rot-lang-genug-2026');
  const ser = (await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung;
  assert.equal((await V.sdJwtSelbstSignaturPruefen(ser)).gueltig, true, 'Gegenprobe');
  const [jwt, ...rest] = ser.split('~');
  const [h, p, sig] = jwt.split('.');
  // Offenlegung verändert: Signatur bleibt gültig, aber der Digest steht nicht im _sd.
  const fremd = Buffer.from(JSON.stringify(['salz', 'givenName', 'Mallory'])).toString('base64url');
  assert.equal((await unabhaengigPruefen([jwt, fremd, ...rest].join('~'))).offenlegungenImSd, false);
  // Kopf verändert.
  const kopf = b64uJson(h); kopf.typ = 'vc+sd-jwt';
  const h2 = Buffer.from(JSON.stringify(kopf)).toString('base64url');
  assert.equal((await V.sdJwtSelbstSignaturPruefen([h2, p, sig].join('.') + '~' + rest.join('~'))).gueltig, false);
  // Fremder Schlüssel in Kopf und cnf.
  const anderer = (await V.deriveHalterSignaturV4(await V.importMasterHkdfKey(new Uint8Array(32).fill(9).buffer), new Uint8Array(32), 'x', OEFFENTLICH_AUS_SEED)).jwk;
  const k3 = b64uJson(h); k3.jwk = anderer; const n3 = b64uJson(p); n3.cnf = { jwk: anderer };
  const t3 = [Buffer.from(JSON.stringify(k3)).toString('base64url'), Buffer.from(JSON.stringify(n3)).toString('base64url'), sig].join('.');
  assert.equal((await V.sdJwtSelbstSignaturPruefen(t3 + '~' + rest.join('~'))).gueltig, false);
  // Ein https-Aussteller oder ein x5c ist keine Selbst-Signatur: abgewiesen, nicht gelesen.
  const n4 = b64uJson(p); n4.iss = 'https://aussteller.example';
  const t4 = [h, Buffer.from(JSON.stringify(n4)).toString('base64url'), sig].join('.') + '~' + rest.join('~');
  assert.equal(V.sdJwtKompaktLesen(t4)['#abgewiesen'], 'signiert-pruefung-fehlt');
});

test('[SD-JWT·Selbstsignatur·alg] alg gehört zum Schlüssel; none und HS* sind abgelehnt', async () => {
  const { V } = ladeKern();
  const ed = (await s.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify'])).privateKey;
  const ec = (await s.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])).privateKey;
  assert.equal(V._jwsAlgPasstZuKey('Ed25519', ed), true);
  assert.equal(V._jwsAlgPasstZuKey('EdDSA', ed), true);
  assert.equal(V._jwsAlgPasstZuKey('ES256', ec), true);
  for (const [alg, key] of [['ES256', ed], ['Ed25519', ec], ['EdDSA', ec], ['none', ed], ['none', ec], ['HS256', ed], ['HS256', ec]]) {
    assert.equal(V._jwsAlgPasstZuKey(alg, key), false, alg + ' mit ' + key.algorithm.name);
  }
  await assert.rejects(V._signJWS({ a: 1 }, ed, { alg: 'ES256' }), /jws-alg-schluessel-ungleich:ES256/);
  const pub = await V._jwsImportVerifyKey({ kty: 'OKP', crv: 'Ed25519', x: RFC8037.x });
  const none = Buffer.from('{"alg":"none"}').toString('base64url') + '.' + RFC8037.jws.split('.')[1] + '.';
  assert.equal((await V._verifyJWS(none, pub)).gueltig, false);
});

test('[SD-JWT·Selbstsignatur·Rückfall] ohne Ed25519 entsteht die unsignierte Selbstauskunft unter eigenem typ, kein SD-JWT', async () => {
  const { V } = ladeKern();
  await depot(V, 'selbstsignatur-rueckfall-lang-genug-2026');
  const res = await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}), { signatur: async () => null });
  assert.equal(res.signiert, false);
  assert.equal(res.header.alg, 'none');
  assert.equal(res.header.typ, V.EUDIW_SELBSTAUSKUNFT_TYP);
  assert.notEqual(res.header.typ, 'dc+sd-jwt');
  // Gelesen wird sie weiter (Bestand), als Selbstauskunft.
  assert.equal(V.sdJwtKompaktLesen(res.serialisierung).iss, 'urn:vivodepot:selbstauskunft');
});

// Klassenwächter: an keiner Stelle des Kerns steht alg none neben dem SD-JWT-typ.
function noneMitSdJwtTyp(quelle) {
  return quelle.split('\n').map((z, i) => [z, i + 1])
    .filter(([z]) => /alg:\s*'none'/.test(z) && !/EUDIW_SELBSTAUSKUNFT_TYP/.test(z)).map(([, n]) => n);
}
test('[SD-JWT·Selbstsignatur·Klasse] alg none steht im Kern nur neben dem eigenen Selbstauskunft-typ', () => {
  assert.deepEqual(noneMitSdJwtTyp(fs.readFileSync(HTML_PATH, 'utf8')), []);
});
test('[SD-JWT·Selbstsignatur·Klasse·Rot-Beweis] alg none mit dem SD-JWT-typ wird gefunden', () => {
  assert.deepEqual(noneMitSdJwtTyp("const a = 1;\n  const header = { alg: 'none', typ: EUDIW_SD_JWT_TYP };\n"), [2]);
});

test('[SD-JWT·Selbstsignatur·Import] die eigene Selbst-Signatur kommt geprüft herein; eine gebrochene Signatur nicht', async () => {
  const { V } = ladeKern();
  await depot(V, 'selbstsignatur-import-lang-genug-2026');
  const ser = (await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcIdentitaet({}))).serialisierung;
  const plan = await V.importPlanGeprueft('sd-jwt-vc-identitaet', ser);
  assert.ok(!plan.ungueltig, plan.grund);
  assert.ok(plan.zeilen.some((z) => z.feldId === 'givenName' && z.neuWert === 'Erika'));
  const [jwt, ...rest] = ser.split('~');
  const teile = jwt.split('.');
  teile[2] = teile[2].slice(0, -2) + (teile[2].endsWith('AA') ? 'BB' : 'AA');
  const kaputt = await V.importPlanGeprueft('sd-jwt-vc-identitaet', teile.join('.') + '~' + rest.join('~'));
  assert.equal(kaputt.ungueltig, true);
});

// Klassenwächter SDJWTVC-NAME-AUF-JSON: ein Exportformat, das „SD-JWT“ im Namen trägt, schreibt die kompakte, signierte
// Form (kompakt, application/dc+sd-jwt, .sd-jwt) — nie JSON unter einem Standardnamen.
function sdJwtNameOhneForm(formate) {
  return formate.filter((f) => /sd-?jwt/i.test(f.id + ' ' + (f.dateibasis || '')))
    .filter((f) => !(f.kompakt === true && f.mime === 'application/dc+sd-jwt' && f.endung === 'sd-jwt')).map((f) => f.id);
}
test('[SD-JWT·Name·Klasse] jedes Exportformat mit SD-JWT im Namen schreibt die signierte kompakte Form', () => {
  const { V } = ladeKern();
  const mitName = V.EXPORT_FORMATE.filter((f) => /sd-?jwt/i.test(f.id));
  assert.ok(mitName.length >= 3, 'Vorbedingung: die drei sd-jwt-vc-*-Exporte stehen in der Registry');
  assert.deepEqual(sdJwtNameOhneForm(V.EXPORT_FORMATE), []);
});
test('[SD-JWT·Name·Klasse·Rot-Beweis] ein JSON-Export mit SD-JWT im Namen wird gefunden', () => {
  assert.deepEqual(sdJwtNameOhneForm([{ id: 'sd-jwt-vc-probe', mime: 'application/json', endung: 'json' }]), ['sd-jwt-vc-probe']);
  assert.deepEqual(sdJwtNameOhneForm([{ id: 'vcard-probe', mime: 'text/vcard', endung: 'vcf' }]), []);
});
