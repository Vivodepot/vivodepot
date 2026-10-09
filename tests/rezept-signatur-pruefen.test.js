'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rezept-signatur-pruefen.test.js — die öffentliche Prüfung einer Rezept-Signatur (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   KEIN ECHTES SCHLÜSSELMATERIAL: frisch erzeugte Ed25519-Schlüssel je Lauf, dazu der statische
   Prüfstoff unter tests/fixtures/rezept-signatur/ (eigener Prüfstoff-Anker, private Hälften beim
   Erzeugen verworfen).

   Was hier bewiesen wird:
     - jede Stufe der Kette fällt geschlossen aus (fremder Anker, keine Ausgabestelle, falsche
       Rolle, Übergang nur für die genannten Schlüssel und nur bis zum Datum, falscher Schlüssel,
       anderer Slug, andere Bytes, abgelaufen, kein JWS);
     - der Prüfstoff unter dem PRODUKT-Anker trägt nicht — die Kommandozeile nimmt keinen anderen;
     - das Werkzeug kann nichts signieren und nichts schreiben (Leitplanke: es prüft, es öffnet
       keinen Weg, mit dem etwas wie signiert wirkt).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');
const P = require('../tools/lib/rezept-signatur-pruefen.js');

const V = ladeIssuer().V;
const JETZT = new Date('2026-10-05T12:00:00Z');
const WERKZEUG = path.join(__dirname, '..', 'tools', 'lib', 'rezept-signatur-pruefen.js');

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty: 'OKP', crv: 'Ed25519', x: pub.x }, priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function zertifikat(anker, stelle, cs = {}, bis = '2027-12-01T00:00:00Z') {
  const credentialSubject = { anbieterId: 'beispiel/ausgabestelle', anbieterTyp: V.AUSGABESTELLE_ANBIETERTYP, publicKeyJwk: stelle.pub, rolle: 'rezept', ...cs };
  if (credentialSubject.rolle === null) delete credentialSubject.rolle;
  return V._signJWS({ issuer: 'did:web:example.invalid', issuanceDate: '2026-09-01T00:00:00Z', expirationDate: bis, credentialSubject },
    await V._jwsImportSignKey(anker.priv), {});
}
async function signatur(slug, bytes, signierer, certJws, extra = {}) {
  return V._signJWS({
    typ: 'vivodepot/rezept', slug, rezeptPruefsumme: crypto.createHash('sha256').update(bytes).digest('hex'),
    validFrom: '2026-10-01T00:00:00.000Z', validUntil: '2027-12-01T00:00:00.000Z', ausstellerZertifikatJws: certJws, ...extra,
  }, await V._jwsImportSignKey(signierer.priv), {});
}
const BYTES = Buffer.from('{"slug":"beispiel-de","kernStand":"kern/v1.html"}\n');

async function fall({ cs, bis, slugSigniert = 'beispiel-de', signiererFremd = false, extra } = {}) {
  const anker = await paar();
  const stelle = await paar();
  const certJws = await zertifikat(anker, stelle, cs, bis);
  const signierer = signiererFremd ? await paar() : stelle;
  const jwsText = await signatur(slugSigniert, BYTES, signierer, certJws, extra);
  return { anker, stelle, jwsText };
}

test('[rezept-signatur-pruefen·Positivkontrolle] Anker → Ausgabestelle (rolle rezept) → Signatur über genau diese Bytes', async () => {
  const f = await fall();
  const r = await P.rezeptSignaturPruefen('beispiel-de', { rezeptBytes: BYTES, jwsText: f.jwsText, ankerJwk: f.anker.pub, jetzt: JETZT });
  assert.equal(r.gueltig, true, r.grund);
  assert.equal(r.nutzlast.slug, 'beispiel-de');
});

test('[rezept-signatur-pruefen·Rot-Beweis] jede Stufe fällt geschlossen aus', async () => {
  const pruefe = async (f, o = {}) => P.rezeptSignaturPruefen(o.slug || 'beispiel-de', {
    rezeptBytes: o.bytes || BYTES, jwsText: o.jws || f.jwsText, ankerJwk: o.anker || f.anker.pub, jetzt: o.jetzt || JETZT,
    uebergangAusgabestellen: o.uebergang,
  });
  const gut = await fall();
  assert.match((await pruefe(gut, { anker: (await paar()).pub })).grund, /Zertifikat trägt nicht/, 'fremder Anker');
  assert.match((await pruefe(await fall({ cs: { anbieterTyp: 'vivodepot/herausgeber' } }))).grund, /keine Ausgabestelle/);
  assert.match((await pruefe(await fall({ cs: { rolle: 'herausgeber' } }))).grund, /rolle „herausgeber"/);
  assert.match((await pruefe(await fall({ signiererFremd: true }))).grund, /Signatur trägt nicht/, 'nicht mit dem Schlüssel aus dem Zertifikat signiert');
  assert.match((await pruefe(await fall({ slugSigniert: 'anderes-produkt' }))).grund, /anderen Typ oder Slug/);
  assert.match((await pruefe(await fall({ extra: { typ: 'vivodepot/modul' } }))).grund, /anderen Typ oder Slug/);
  assert.match((await pruefe(gut, { bytes: Buffer.from(BYTES.toString().replace('v1', 'v2')) })).grund, /andere Bytes/);
  assert.equal((await pruefe(gut, { jetzt: new Date('2028-01-01T00:00:00Z') })).gueltig, false, 'abgelaufen');
  assert.match((await pruefe(gut, { jws: 'kein.jws' })).grund, /kein lesbares JWS|kein Ausgabestellen-Zertifikat/);
  assert.match((await P.rezeptSignaturPruefen('beispiel-de', { rezeptBytes: BYTES, jwsText: null, ankerJwk: gut.anker.pub })).grund, /keine Signatur/);
  assert.match((await P.rezeptSignaturPruefen('beispiel-de', { rezeptBytes: null, jwsText: gut.jwsText, ankerJwk: gut.anker.pub })).grund, /kein Rezept/);
});

test('[rezept-signatur-pruefen] Übergang ohne rolle: nur für genannte Schlüssel und nur bis OHNE_ROLLE_BIS', async () => {
  const f = await fall({ cs: { rolle: null } });
  const tp = P._jwkThumbprint(f.stelle.pub);
  const mit = { rezeptBytes: BYTES, jwsText: f.jwsText, ankerJwk: f.anker.pub };
  assert.equal((await P.rezeptSignaturPruefen('beispiel-de', { ...mit, jetzt: JETZT, uebergangAusgabestellen: [tp] })).gueltig, true);
  assert.match((await P.rezeptSignaturPruefen('beispiel-de', { ...mit, jetzt: JETZT })).grund, /rolle „undefined"/, 'Schlüssel nicht in der Übergangsliste');
  const nachher = new Date(Date.parse(P.OHNE_ROLLE_BIS) + 1000);
  const fSpaet = await fall({ cs: { rolle: null }, bis: '2028-12-01T00:00:00Z' });
  const r = await P.rezeptSignaturPruefen('beispiel-de', { rezeptBytes: BYTES, jwsText: fSpaet.jwsText, ankerJwk: fSpaet.anker.pub, jetzt: nachher,
    uebergangAusgabestellen: [P._jwkThumbprint(fSpaet.stelle.pub)] });
  assert.equal(r.gueltig, false, 'nach dem Übergangsdatum trägt ein Zertifikat ohne rolle nicht mehr');
});

test('[rezept-signatur-pruefen] Selbsttest ohne Argument: Prüfstoff gueltig/ trägt, ungueltig/ scheitert (Exit 0)', () => {
  const r = spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /NICHT der Produkt-Anker/);
  for (const name of ['anderer-slug', 'bytes-veraendert', 'falsche-rolle', 'fremder-anker']) {
    assert.ok(fs.existsSync(path.join(P.FIXTURE_ORDNER, 'ungueltig', name + '.jws')), name);
  }
});

test('[rezept-signatur-pruefen·Rot-Beweis] der Prüfstoff trägt unter dem Produkt-Anker NICHT (Exit 1)', () => {
  const r = spawnSync(process.execPath, [WERKZEUG, '--ordner', path.join(P.FIXTURE_ORDNER, 'gueltig')], { encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /Produkt-Anker/);
  assert.match(r.stdout, /beispiel-de: UNGÜLTIG/);
});

test('[rezept-signatur-pruefen] die Kommandozeile nimmt keinen eigenen Anker an', () => {
  const r = spawnSync(process.execPath, [WERKZEUG, '--anker', path.join(P.FIXTURE_ORDNER, 'anker', 'pruefstoff-anker.public.jwk.json')], { encoding: 'utf8' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
});

test('[rezept-signatur-pruefen·Leitplanke] das Werkzeug prüft nur: kein Signieren, kein Schlüsselerzeugen, kein Schreiben', () => {
  const quelle = fs.readFileSync(WERKZEUG, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const verboten of ['_signJWS', '_jwsImportSignKey', 'generateKey', 'writeFile', 'schuetzeSchluesselJwk', 'schluesselbund']) {
    assert.ok(!quelle.includes(verboten), 'kommt vor: ' + verboten);
  }
  assert.deepEqual(Object.keys(P).filter((k) => /sign|schreib|ausstell/i.test(k) && k !== 'rezeptSignaturPruefen'), []);
});
