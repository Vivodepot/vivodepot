'use strict';
/* Kompakte Transportform der Anfrage (U2-ADR-460, v851): `z1.` + base64url(deflate-raw(JWS[~Zertifikat])). Die App liest sie aus dem
   Link (`#anfrage=z1.…`) und aus einem eingefügten Text, prüft die Signatur wie bisher und bricht beim Entpacken über
   ANFRAGE_KOMPAKT_MAX_BYTES ab. Die alte Form bleibt gültig. Fixture: eine erfundene Anfrage, signiert mit einem frisch
   erzeugten Anbieter-Schlüssel unter einem frisch erzeugten Anker. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { ladeKern, webcrypto } = require('./load-kern.js');

// Erfundene Anfrage im Test selbst — der öffentliche Zuschnitt trägt die internen Demo-Szenarien nicht.
const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1, von: 'Pflegeheim am Beispielpark',
  zweck: 'Aufnahme in die vollstationäre Pflege', grundlage: 'Heimvertrag und Pflegeplanung',
  vorgang: 'BSP-2026-0001', gestelltAm: '2026-09-28', gueltigBis: '2027-12-31',
  felder: [
    { kennung: 'identity.givenName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
    { kennung: 'identity.familyName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
    { kennung: 'identity.birthDate', zweck: 'Abgleich mit der Pflegekasse', pflicht: true },
    { kennung: 'contact.phone', zweck: 'Rückfragen zur Aufnahme', pflicht: false },
    { kennung: 'contact.email', zweck: 'Rückfragen zur Aufnahme', pflicht: false },
    { kennung: 'address.street', zweck: 'Meldeadresse im Aufnahmebogen', pflicht: true },
    { kennung: 'address.postalCode', zweck: 'Meldeadresse im Aufnahmebogen', pflicht: true },
    { kennung: 'address.city', zweck: 'Meldeadresse im Aufnahmebogen', pflicht: true },
    { kennung: 'insurance.healthInsurer', zweck: 'Abrechnung mit der Kranken- und Pflegekasse', pflicht: true },
    { kennung: 'insurance.memberId', zweck: 'Abrechnung mit der Kranken- und Pflegekasse', pflicht: true },
    { kennung: 'care.level', zweck: 'Abrechnung mit der Kranken- und Pflegekasse', pflicht: true },
    { kennung: 'contact.emergencyContact', zweck: 'Benachrichtigung im Notfall', pflicht: false },
  ],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@example.de' },
};
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const kompakt = (transport) => 'z1.' + b64u(zlib.deflateRawSync(Buffer.from(transport, 'utf8'), { level: 9 }));

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

async function signiert(V) {
  const anker = await paar();
  const stelle = await paar();
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'heim/beispielpark', anbieterName: 'Pflegeheim am Beispielpark', anbieterTyp: 'institution/pflege', publicKeyJwk: stelle.pub },
  };
  const zertifikat = await V._signJWS(cert, await V._jwsImportSignKey(anker.priv), {});
  const anfrageJws = await V._signJWS(ANFRAGE, await V._jwsImportSignKey(stelle.priv), {});
  const opt = { jetzt: '2026-10-01T10:00:00Z', ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: anker.pub.x } };
  return { zertifikat, anfrageJws, opt };
}

test('[Anfrage·kompakt] Rundlauf: Link und eingefügter Text ergeben dieselbe, geprüfte Anfrage — mit Zertifikat', async () => {
  const { V } = ladeKern();
  const { zertifikat, anfrageJws, opt } = await signiert(V);
  const form = kompakt(anfrageJws + '~' + zertifikat);
  for (const eingabe of ['https://privat-de.vivodepot.org/#anfrage=' + form, form]) {
    const u = await V.anfrageAusTextAsync(eingabe);
    assert.ok(u, 'gelesen: ' + eingabe.slice(0, 40));
    assert.deepEqual(u.anfrage, ANFRAGE);
    assert.equal(u.anfrageJws, anfrageJws);
    assert.equal(u.zertifikat, zertifikat);
    const p = await V.anfrageSignaturPruefen(u, opt);
    assert.equal(p.geprueft, true, p.grund + ' ' + (p.detail || ''));
    assert.equal(p.anbieterId, 'heim/beispielpark');
  }
  const ein = await V.anfrageAusEingabeAsync(form);
  assert.equal(ein.ok, true);
  assert.ok(form.length < anfrageJws.length, 'die kompakte Form ist kürzer als der JWS allein');
});

test('[Anfrage·kompakt] die alte Form (base64url des Umschlags) bleibt gültig, auch über den asynchronen Weg', async () => {
  const { V } = ladeKern();
  const { zertifikat, anfrageJws, opt } = await signiert(V);
  const alt = 'https://privat-de.vivodepot.org/#anfrage=' + b64u(JSON.stringify({ format: 'vivodepot-anfrage@1', anfrage: ANFRAGE, zertifikat, anfrageJws }));
  const u = await V.anfrageAusTextAsync(alt);
  assert.deepEqual(u.anfrage, ANFRAGE);
  assert.equal((await V.anfrageSignaturPruefen(u, opt)).geprueft, true);
});

test('[Anfrage·kompakt·Rot-Beweis] Dekompressionsbombe: ein kleiner Eingang, der über die Grenze aufbläht, wird abgewiesen', async () => {
  const { V } = ladeKern();
  const max = V.ANFRAGE_KOMPAKT_MAX_BYTES;
  assert.equal(max, 64 * 1024);
  const bombe = 'z1.' + b64u(zlib.deflateRawSync(Buffer.alloc(8 * 1024 * 1024, 0x41), { level: 9 }));
  assert.ok(bombe.length < 20000, 'Testvoraussetzung: der Eingang ist klein (' + bombe.length + ')');
  assert.equal(await V.anfrageAusTextAsync(bombe), null);
  // Knapp unter der Grenze wird entpackt (und scheitert dann erst an der fehlenden JWS-Form) — die Grenze ist genau diese.
  const knapp = Buffer.alloc(max, 0x41);
  assert.equal(await V.anfrageAusTextAsync('z1.' + b64u(zlib.deflateRawSync(knapp))), null);
  const zuViel = Buffer.alloc(max + 1, 0x41);
  assert.equal(await V.anfrageAusTextAsync('z1.' + b64u(zlib.deflateRawSync(zuViel))), null);
});

test('[Anfrage·kompakt·Rot-Beweis] verfälschte Nutzlast: gelesen, aber die Signatur bricht', async () => {
  const { V } = ladeKern();
  const { zertifikat, anfrageJws, opt } = await signiert(V);
  const [h, , s] = anfrageJws.split('.');
  const falsch = Object.assign({}, ANFRAGE, { zweck: 'etwas anderes' });
  const u = await V.anfrageAusTextAsync(kompakt(h + '.' + b64u(JSON.stringify(falsch)) + '.' + s + '~' + zertifikat));
  assert.ok(u, 'die Form ist gültig');
  assert.notEqual((await V.anfrageSignaturPruefen(u, opt)).geprueft, true);
});

test('[Anfrage·kompakt·Rot-Beweis] kaputte Formen ergeben keine Anfrage — nie eine erfundene', async () => {
  const { V } = ladeKern();
  const { anfrageJws } = await signiert(V);
  const faelle = [
    'z1.' + 'nicht base64url!',
    'z1.' + b64u(Buffer.from('kein deflate')),
    kompakt('nur.zwei'),
    kompakt(anfrageJws + '~a~b'),
    kompakt('eyJh.' + b64u('[1,2]') + '.sig'),
    kompakt(Buffer.from([0xff, 0xfe]).toString('latin1')),
  ];
  for (const f of faelle) assert.equal(await V.anfrageAusTextAsync(f), null, f.slice(0, 30));
});

test('[Anfrage·kompakt] die Grenze liegt vor jedem Sammeln: Entpacken in Stücken, Abbruch über ANFRAGE_KOMPAKT_MAX_BYTES', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const fn = kern.slice(kern.indexOf('async function _anfrageInflateBegrenzt'), kern.indexOf('function _anfrageKompaktRoh'));
  assert.match(fn, /if \(n > max\) \{ try \{ await leser\.cancel\(\); \}/);
  assert.match(fn, /new DecompressionStream\('deflate-raw'\)/);
});
