'use strict';
/* Schutzliste und Vivodepots eigene, signierte Sprachbündel (04.10.2026).
   Ein Bündel gilt für die Schutzliste nur dann als Vivodepots eigenes, wenn beim Öffnen seine Signaturkette gegen den Anker
   nachgeprüft wurde, bei der eigenen Treuhand endet (Prüfstufe 'intern') UND sein ganzer Inhalt gleich der signierten Nutzlast
   ist (_textsatzBelegtEintragen → _TEXTSATZ_INTERN_VOLL, gelesen in _textsatzPruefstufeFuerSchutz). Nie über ein Feld im Modul.
   Wegwerf-Anker und -Schlüssel wie in tests/sprachmodul-zusicherungen-signiert.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const ANKER_PRIV = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ANKER_PRIV.x }), jetzt: '2026-09-16T12:00:00Z' });
const HAFTUNG = 'strings:dokFussHaftung.text';
const modul = () => ({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, anbieterId: 'vivodepot',
  texte: { [HAFTUNG]: 'VIVODEPOT · Tervezet', 'strings:fussQuellcode.text': 'Forráskód' } });

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function zert(anbieterId, anbieterTyp, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp, anbieterName: anbieterId, publicKeyJwk },
  };
}
const signieren = async (V, nutzlast, jwk) => V._signJWS(nutzlast, await V._jwsImportSignKey(jwk), {});

async function depotMitInternemBuendel() {
  const { V } = ladeKern();
  const zw = await paar(); const blatt = await paar();
  const ausstellerZertifikatJws = await signieren(V, zert('vivodepot-ausgabestelle', V.AUSGABESTELLE_ANBIETERTYP, zw.pub), ANKER_PRIV);
  const providerCredentialJws = await signieren(V, zert('vivodepot', 'vivodepot/anbieter', blatt.pub), zw.priv);
  const modulSignaturJws = await signieren(V, modul(), blatt.priv);
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws }), d, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das Bündel wird über die Kette eingelassen — ' + r.grund);
  d.textsprache = 'hu';
  V.setData(d);
  return { V, d };
}
async function neuLaden(V, d) {   // wie depotLaden: Vertrauen leeren, erneut prüfen, anmelden
  V._TEXTSATZ_BELEGT.clear();
  V._TEXTSATZ_INTERN_VOLL.clear(); V._TEXTSATZ_SIGNIERT_VOLL.clear();
  await V._textsatzModuleBelegPruefen(d, OPTS);
  V._textsatzModuleAusDepotAnmelden(d);
  V.textsatzNeuAnwenden();
}

test('[Schutzliste·intern] ein beim Öffnen geprüftes, intern signiertes Bündel trägt seinen Haftungssatz', async () => {
  const { V, d } = await depotMitInternemBuendel();
  await neuLaden(V, d);
  assert.equal(V._textsatzPruefstufeFuerSchutz(d.textsatzModule[0]), 'intern');
  assert.equal(V.textLesen(HAFTUNG), 'VIVODEPOT · Tervezet');
});

test('[Schutzliste·intern·Rot-Beweis] echter Beleg, aber geänderter Inhalt: gilt nicht als intern, der Haftungssatz bleibt der mitgelieferte', async () => {
  const { V, d } = await depotMitInternemBuendel();
  d.textsatzModule[0].texte[HAFTUNG] = 'FREMD';
  await neuLaden(V, d);
  assert.equal(V._textsatzPruefstufeFuerSchutz(d.textsatzModule[0]), null);
  assert.notEqual(V.textLesen(HAFTUNG), 'FREMD');
});

test('[Schutzliste·intern·Rot-Beweis] Felder „vivodepot“, „intern“, „geprüft“ ohne gültige Signatur zählen nicht', async () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.textsatzModule = [Object.assign(modul(), { anbieterId: 'vivodepot', pruefstufe: 'intern', ungeprueft: false, anbieterIdGeprueft: true,
    texte: { [HAFTUNG]: 'FREMD' } })];
  d.textsprache = 'hu';
  V.setData(d);
  await neuLaden(V, d);
  assert.equal(V._textsatzPruefstufeFuerSchutz(d.textsatzModule[0]), null);
  assert.notEqual(V.textLesen(HAFTUNG), 'FREMD');
});

/* Die Selbst-Einlass-Sperre nimmt ein signiertes Sprachmodul nur aus, wenn sein GANZER Inhalt gleich der beim Öffnen nachgeprüften
   Nutzlast ist (_textsatzSigniertVollGleich). Der Zusicherungs-Fingerabdruck deckt nur die Zusicherungssätze: ein echter Beleg mit
   geänderten übrigen Texten hätte sonst als belegt gegolten. */
test('[Sperre·signiert] unverändertes signiertes Bündel: beim Öffnen nicht gesperrt', async () => {
  const { V, d } = await depotMitInternemBuendel();
  await neuLaden(V, d);
  V._depotModuleSperreMarkieren(d, true);
  assert.equal(V.gesperrteDepotModule().length, 0);
});

test('[Sperre·signiert·Rot-Beweis] echter Beleg, ein übriger Text geändert: gesperrt', async () => {
  const { V, d } = await depotMitInternemBuendel();
  d.textsatzModule[0].texte['strings:fussQuellcode.text'] = 'FREMD';
  await neuLaden(V, d);
  V._depotModuleSperreMarkieren(d, true);
  assert.equal(V.gesperrteDepotModule().length, 1, 'der Beleg allein nimmt ein Modul mit anderem Inhalt nicht aus');
});
