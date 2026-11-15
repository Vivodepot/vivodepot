'use strict';
/* Probe PROVIDER-VC-DATUMSFELDER, Teil Anker-Satz (11.11.2026).
   Der Issuer schreibt im v2-Kontext validFrom/validUntil (VC Data Model 2.0, W3C Recommendation 15.05.2025, 4.9).
   Der Anker-Satz mit gueltigBis fragt, wann signiert wurde. Ausgelieferte Kerne lesen dafür nur issuanceDate oder
   iat. Darum setzt der Issuer beim Signieren iat = Signierzeit in Sekunden (VC-JOSE-COSE, W3C Recommendation
   13.10.2026, 3.1.3: iat steht für die Ausstellzeit der Signatur). Diese Probe hält fest:
     - der neue Kern liest validFrom im Anker-Satz (auch ohne iat);
     - ein Kern mit der alten Zeile (nur issuanceDate oder iat) nimmt ein neues Zertifikat an, solange vor dem Ende
       des Ankers signiert wurde — Rot-Beweis: ohne iat fällt es dort mit anker-nach-ende-ausgestellt;
     - iat ist die Signierzeit und wird nicht aus einem künftigen validFrom abgeleitet.
   Den alten Kern bildet die Probe aus dem heutigen, indem sie in der Anker-Zeile nur `n.validFrom || ` entfernt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ladeIssuer } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');
const KID = 'probe-anker-vc20';
const ANKER_ENDE = '2026-12-31';
const JETZT = '2026-11-15T12:00:00Z';
const NEUE_ZEILE = "const ausgestellt = n.validFrom || n.issuanceDate || (typeof n.iat === 'number'";
const ALTE_ZEILE = "const ausgestellt = n.issuanceDate || (typeof n.iat === 'number'";

const ISSUER = ladeIssuer().V;

async function wegwerfAnker() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty: pub.kty, crv: pub.crv, x: pub.x, alg: 'EdDSA' }, priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function satz(a) {
  return Object.freeze([Object.freeze({ kid: KID, alg: 'EdDSA', jwk: a.pub, gueltigAb: '2026-01-01', gueltigBis: ANKER_ENDE, nurPruefenBis: null })]);
}
async function zertifikat(a, { validFrom, iat, ohneIat } = {}) {
  const vc = ISSUER.baueProviderVC({
    issuer: 'did:web:vivodepot.de', anbieterId: 'institution/vc20-anker', anbieterName: 'VC20 Anker', anbieterTyp: 'institution/test',
    publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: a.pub.x },
    issuanceDate: validFrom || '2026-11-01T00:00:00Z', expirationDate: '2028-01-01T00:00:00Z',
  });
  const key = await ISSUER._jwsImportSignKey(a.priv);
  if (ohneIat) return ISSUER._signJWS(vc, key, { kid: KID });
  return ISSUER.stelleProviderCredentialAus(vc, key, Object.assign({ kid: KID }, iat === undefined ? {} : { iat }));
}
function nutzlast(jws) { return JSON.parse(Buffer.from(jws.split('.')[1], 'base64url').toString('utf8')); }

function alterKern() {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(html.split(NEUE_ZEILE).length, 2, 'Vorbedingung: die Anker-Zeile steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc20-anker-'));
  try {
    const pfad = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(pfad, html.replace(NEUE_ZEILE, ALTE_ZEILE));
    return ladeKern({ htmlPfad: pfad }).V;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

let A;
async function anker() { if (!A) A = await wegwerfAnker(); return A; }

test('[VC20·Anker·neu] Kern und Lese-App lesen validFrom im Anker-Satz, auch ohne iat', async () => {
  const a = await anker();
  const vorEnde = await zertifikat(a, { ohneIat: true });
  const nachEnde = await zertifikat(a, { ohneIat: true, validFrom: '2027-02-01T00:00:00Z' });
  assert.equal('iat' in nutzlast(vorEnde), false, 'Vorbedingung: ohne iat signiert');
  for (const [name, V] of [['Kern', ladeKern().V], ['Lese-App', ladeLesen().V]]) {
    const r = await V.verifiziereProviderCredential(vorEnde, { ankerSatz: satz(a), jetzt: JETZT });
    assert.equal(r.gueltig, true, name + ': ' + r.grund);
    const f = await V.verifiziereProviderCredential(nachEnde, { ankerSatz: satz(a), jetzt: '2027-03-01T00:00:00Z' });
    assert.equal(f.gueltig, false, name);
    assert.equal(f.grund, 'anker-nach-ende-ausgestellt', name);
  }
});

test('[VC20·Anker·alt] ein Kern mit der alten Anker-Zeile nimmt das neue Zertifikat über iat an', async () => {
  const a = await anker();
  const K = alterKern();
  const jws = await zertifikat(a);
  const n = nutzlast(jws);
  assert.equal('issuanceDate' in n, false, 'Vorbedingung: das neue Zertifikat trägt den alten Namen nicht');
  assert.equal(Number.isInteger(n.iat), true);
  const r = await K.verifiziereProviderCredential(jws, { ankerSatz: satz(a), jetzt: JETZT });
  assert.equal(r.gueltig, true, r.grund);
});

test('[VC20·Anker·Rot-Beweis] ohne iat lehnt der alte Kern dasselbe Zertifikat ab', async () => {
  const a = await anker();
  const K = alterKern();
  const r = await K.verifiziereProviderCredential(await zertifikat(a, { ohneIat: true }), { ankerSatz: satz(a), jetzt: JETZT });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'anker-nach-ende-ausgestellt');
});

test('[VC20·iat] iat ist die Signierzeit, nicht ein künftiges validFrom; kein nbf', async () => {
  const a = await anker();
  const vorher = Math.floor(Date.now() / 1000);
  const n = nutzlast(await zertifikat(a, { validFrom: '2030-01-01T00:00:00Z' }));
  const nachher = Math.floor(Date.now() / 1000);
  assert.ok(n.iat >= vorher && n.iat <= nachher, 'iat=' + n.iat);
  assert.equal(n.validFrom, '2030-01-01T00:00:00Z');
  assert.equal('nbf' in n, false);
  assert.equal(nutzlast(await zertifikat(a, { iat: 1790000000 })).iat, 1790000000, 'opts.iat für reproduzierbare Proben');
});

/* Uhrzeitversatz (Wort 11.11.2026, RFC 7519 4.1.5 „some small leeway"): _verifyJWS duldet bei validFrom/nbf 5 Minuten,
   beim Ende keine. Kern, Lese-App und Issuer hier; das Studio trägt denselben Block byte-gleich
   (tools/krypto-block-propagation-pruefen.js). */
test('[VC20·Versatz] validFrom +4 Min angenommen, +6 Min abgelehnt, nbf ebenso; validUntil -1 s abgelehnt', async () => {
  const a = await anker();
  const jetzt = Date.parse(JETZT);
  const iso = (ms) => new Date(jetzt + ms).toISOString();
  const nutz = (felder) => Object.assign({ '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential'] }, felder);
  const key = await ISSUER._jwsImportSignKey(a.priv);
  for (const [name, V] of [['Kern', ladeKern().V], ['Lese-App', ladeLesen().V], ['Issuer', ISSUER]]) {
    const pub = await V._jwsImportVerifyKey(a.pub);
    const pruefe = async (felder) => V._verifyJWS(await ISSUER._signJWS(nutz(felder), key), pub, { jetzt: JETZT });
    assert.equal((await pruefe({ validFrom: iso(4 * 60000) })).gueltig, true, name + ': +4 Min');
    const sechs = await pruefe({ validFrom: iso(6 * 60000) });
    assert.equal(sechs.gueltig, false, name + ': +6 Min');
    assert.equal(sechs.vorGueltigkeit, true, name);
    assert.equal((await pruefe({ nbf: Math.floor((jetzt + 4 * 60000) / 1000) })).gueltig, true, name + ': nbf +4 Min');
    assert.equal((await pruefe({ nbf: Math.floor((jetzt + 6 * 60000) / 1000) })).gueltig, false, name + ': nbf +6 Min');
    const ende = await pruefe({ validFrom: iso(-86400000), validUntil: iso(-1000) });
    assert.equal(ende.gueltig, false, name + ': validUntil -1 s');
    assert.equal(ende.abgelaufen, true, name);
  }
});

test('[VC20·Versatz·errechnet] mit opts.ohneVersatz gilt der Beginn genau (Tagesrand), in Kern, Lese-App und Issuer', async () => {
  const a = await anker();
  const key = await ISSUER._jwsImportSignKey(a.priv);
  const jws = await ISSUER._signJWS({ '@context': ['https://www.w3.org/ns/credentials/v2'], validFrom: '2026-11-15T12:04:00Z' }, key);
  for (const [name, V] of [['Kern', ladeKern().V], ['Lese-App', ladeLesen().V], ['Issuer', ISSUER]]) {
    const pub = await V._jwsImportVerifyKey(a.pub);
    assert.equal((await V._verifyJWS(jws, pub, { jetzt: JETZT })).gueltig, true, name + ': Uhr, +4 Min geduldet');
    assert.equal((await V._verifyJWS(jws, pub, { jetzt: JETZT, ohneVersatz: true })).gueltig, false, name + ': errechnet, genau');
  }
});
