'use strict';
/* Jedes Depot, das die Lese-App öffnet, läuft durch einen Einstieg, der die Signaturketten der Sprachmodule zuerst prüft (Voll, Sub, Klartext, Klartext-roh, Empfänger-QR).
   Vorher lief die Prüfung nur an zwei der vier Stellen: eine Klartext-Datei mit gültig signiertem Sprachmodul zeigte ihre Zusicherungssätze nicht in der Modulsprache.
   Wächter: `_foldVollmachtenLesen(` steht nur im Einstieg; Rot-Beweis: eine Zuweisung daran vorbei; Verhalten: signiertes Modul in einer Klartext-Datei. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');

/* Stellen im Quelltext, an denen `_foldVollmachtenLesen(` AUFGERUFEN wird (nicht die Definition, nicht Kommentare), mit dem Namen der umgebenden Funktion. */
function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\w])\/\/[^\n]*/g, '$1');
}
function aufrufer(text) {
  const raus = [];
  let funktion = null;
  ohneKommentare(text).split('\n').forEach((z, i) => {
    const m = z.match(/^(?:async )?function ([A-Za-z0-9_]+)\(/);
    if (m) funktion = m[1];
    if (/_foldVollmachtenLesen\(/.test(z) && !/^function _foldVollmachtenLesen\(/.test(z)) raus.push({ zeile: i + 1, funktion });
  });
  return raus;
}

test('[Lese-App·Einstieg] `_foldVollmachtenLesen(` wird nur im geprüften Einstieg aufgerufen', () => {
  const stellen = aufrufer(QUELLE);
  const fremd = stellen.filter((x) => x.funktion !== '_depotUebernehmenGeprueft');
  assert.ok(stellen.some((x) => x.funktion === '_depotUebernehmenGeprueft'), 'Positivkontrolle: der Einstieg ruft den Fold auf');
  assert.deepEqual(fremd, [], 'ein Depot landet in `data` ohne vorherige Belegprüfung');
});

test('[Lese-App·Einstieg] alle vier Öffnungswege benutzen den Einstieg', () => {
  const zuweisungen = QUELLE.split('\n').filter((z) => /(^|[^.\w])data = await _depotUebernehmenGeprueft\(|_depotUebernehmenGeprueft\([^)]*\)\.then\(\(d\) => \{ data = d;/.test(z));
  assert.equal(zuweisungen.length, 4, 'Voll/Sub, Klartext, Klartext-roh, Empfänger-QR: ' + zuweisungen.length);
});

test('[Lese-App·Einstieg·Rot-Beweis] eine Zuweisung am Einstieg vorbei wird gefunden', () => {
  const mutiert = QUELLE.replace('_depotUebernehmenGeprueft(obj.depot).then((d) => { data = d; renderVollExport(); })', 'Promise.resolve(_foldVollmachtenLesen(obj.depot)).then((d) => { data = d; renderVollExport(); })');
  assert.notEqual(mutiert, QUELLE, 'Mutationsstelle fehlt');
  assert.ok(aufrufer(mutiert).some((x) => x.funktion !== '_depotUebernehmenGeprueft'));
});

/* ── Verhalten: ein gültig signiertes Sprachmodul in einer Klartext-Datei ── */
const ANKER_PRIV = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ANKER_PRIV.x }), jetzt: '2026-09-16T12:00:00Z' });
const SATZ = 'strings:klartextHinweis.text';
const SATZ_HU = 'Ez a fájl nincs titkosítva. Bárki elolvashatja, aki megnyitja.';
const modul = (extra) => Object.assign({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { [SATZ]: SATZ_HU } }, extra || {});
async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
const zert = (anbieterId, anbieterTyp, publicKeyJwk, extra) => ({
  '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
  issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
  credentialSubject: Object.assign({ anbieterId, anbieterTyp, anbieterName: anbieterId, publicKeyJwk }, extra || {}),
});
async function belegPruefer() {
  const { V } = ladeKern({ blank: true });
  const sign = async (n, jwk) => V._signJWS(n, await V._jwsImportSignKey(jwk), {});
  const zw = await paar(); const blatt = await paar();
  return {
    ausstellerZertifikatJws: await sign(zert('pruefstelle-x', V.VIVODEPOT_PRUEFSTELLE_ANBIETERTYP, zw.pub, { rolle: 'pruefer' }), ANKER_PRIV),
    providerCredentialJws: await sign(zert('uebersetzer-hu', 'institution/test', blatt.pub), zw.priv),
    modulSignaturJws: await sign(modul(), blatt.priv),
  };
}
const depot = (m) => ({ schemaVersion: 75, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, logikModule: [], textsatzModule: [m], textsprache: 'hu' });

test('[Lese-App·Einstieg] eine Klartext-Datei mit gültig signiertem Sprachmodul zeigt den Zusicherungssatz in der Modulsprache; ohne Beleg im Rückfall', async () => {
  const { V: L } = ladeLesen();
  const mitBeleg = depot(modul({ beleg: await belegPruefer() }));
  L.setData(await L._depotUebernehmenGeprueft(mitBeleg, OPTS));
  assert.ok(L.STRINGS.klartextHinweis.startsWith(SATZ_HU), L.STRINGS.klartextHinweis);
  const { V: L2 } = ladeLesen();
  L2.setData(await L2._depotUebernehmenGeprueft(depot(modul()), OPTS));
  assert.ok(L2.STRINGS.klartextHinweis.endsWith(' [English]') && !L2.STRINGS.klartextHinweis.includes('Ez a fájl'), L2.STRINGS.klartextHinweis);
});
