'use strict';
/* Signierte Sprachmodule und Zusicherungssätze in der LESE-APP (Spiegel der Kern-Proben in sprachmodul-zusicherungen-signiert.test.js).
   Die Lese-App prüft den mitgeführten Beleg beim Öffnen selbst (Kette über die Zwischenstufe, Prüfstufe nur intern/pruefer) und übernimmt
   dieselbe Rückfall-Reihenfolge samt Kennzeichnung. Das signierte Modul wird mit dem Kern-Werkzeug gebaut, verifiziert wird in der Lese-App. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const ANKER_PRIV = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ANKER_PRIV.x }), jetzt: '2026-09-16T12:00:00Z' });
const SATZ = 'strings:klartextHinweis.text';
const SATZ_HU = 'Ez a fájl nincs titkosítva. Bárki elolvashatja, aki megnyitja.';

function modul(extra) {
  return Object.assign({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { [SATZ]: SATZ_HU } }, extra || {});
}
async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function zert(anbieterId, anbieterTyp, publicKeyJwk, extra) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: Object.assign({ anbieterId, anbieterTyp, anbieterName: anbieterId, publicKeyJwk }, extra || {}),
  };
}
/* Das im Depot mitgeführte Beleg-Bündel, wie der Kern es beim Einlassen ablegt (`beleg` mit Ausgabestellen-Zertifikat). */
async function belegFuer(stelle, inhalt) {
  const { V } = ladeKern({ blank: true });
  const signieren = async (nutzlast, jwk) => V._signJWS(nutzlast, await V._jwsImportSignKey(jwk), {});
  const zw = await paar(); const blatt = await paar();
  const [zwId, zwTyp, zwExtra, blattId, blattTyp] = {
    pruefer: ['pruefstelle-x', V.VIVODEPOT_PRUEFSTELLE_ANBIETERTYP, { rolle: 'pruefer' }, 'uebersetzer-hu', 'institution/test'],
    herausgeber: ['fremde-ausgabestelle', V.AUSGABESTELLE_ANBIETERTYP, undefined, 'uebersetzer-hu', 'institution/test'],
    intern: ['vivodepot-ausgabestelle', V.AUSGABESTELLE_ANBIETERTYP, undefined, 'vivodepot', 'vivodepot/anbieter'],
  }[stelle];
  return {
    ausstellerZertifikatJws: await signieren(zert(zwId, zwTyp, zw.pub, zwExtra), ANKER_PRIV),
    providerCredentialJws: await signieren(zert(blattId, blattTyp, blatt.pub), zw.priv),
    modulSignaturJws: await signieren(inhalt || modul(), blatt.priv),
  };
}
function depotMit(m, sprache) {
  return { schemaVersion: 75, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, logikModule: [], textsatzModule: [m], textsprache: sprache || 'hu' };
}
async function oeffnen(m, sprache) {
  const { V: L } = ladeLesen();
  const d = depotMit(m, sprache);
  L._TEXTSATZ_BELEGT.clear();
  await L._textsatzModuleBelegPruefen(d, OPTS);
  L.setData(d);
  L._foldVollmachtenLesen(d);
  return { L, d };
}

test('[Lese-App·Sprachmodul] pruefer und intern: der übersetzte Zusicherungssatz gilt und nennt, wer die Übersetzung geprüft hat', async () => {
  for (const stelle of ['pruefer', 'intern']) {
    const { L } = await oeffnen(modul({ beleg: await belegFuer(stelle) }));
    const t = L.STRINGS.klartextHinweis;
    assert.ok(t.startsWith(SATZ_HU), stelle + ': der ungarische Satz steht da: ' + t);
    assert.ok(t.includes(stelle === 'intern' ? '[intern' : '[pruefer'), stelle + ': die Herkunft der Übersetzung steht am Satz: ' + t);
  }
});

test('[Lese-App·Sprachmodul·Rot-Beweis] herausgeber reicht nicht, ein Hand-Marker auch nicht, ein geändertes Wort nimmt den Status', async () => {
  const { L: a } = await oeffnen(modul({ beleg: await belegFuer('herausgeber') }));
  assert.ok(a.STRINGS.klartextHinweis.endsWith(' [English]') && !a.STRINGS.klartextHinweis.includes('Ez a fájl'), a.STRINGS.klartextHinweis);
  const { L: b } = await oeffnen(modul({ ungeprueft: false, pruefstufe: 'intern', anbieterIdGeprueft: true, anbieterId: 'vivodepot' }));
  assert.ok(b.STRINGS.klartextHinweis.endsWith(' [English]'), b.STRINGS.klartextHinweis);
  const beleg = await belegFuer('pruefer');
  const { L: c } = await oeffnen(modul({ beleg, texte: { [SATZ]: 'Ez a fájl titkosítva van, bízzon bennünk.' } }));
  assert.ok(!c.STRINGS.klartextHinweis.includes('bízzon'), c.STRINGS.klartextHinweis);
});

test('[Lese-App·Sprachmodul·Rot-Beweis] Deutsch und Englisch bleiben app-eigen, auch mit gültiger Kette', async () => {
  const { L } = await oeffnen(modul({ sprache: 'en', beleg: await belegFuer('pruefer', modul({ sprache: 'en', texte: { [SATZ]: 'FAKE — securely encrypted.' } })),
    texte: { [SATZ]: 'FAKE — securely encrypted.' } }), 'en');
  assert.equal(L.STRINGS.klartextHinweis, L.ZUSICHERUNG_TEXTE_EN.klartextHinweis);
});

test('[Lese-App·Rückfall] fehlt ein Zusicherungssatz: Englisch mit Kennzeichnung; fehlt ein gewöhnlicher Text: Englisch und der Hinweis', async () => {
  const { L } = await oeffnen(modul({ texte: { 'strings:navAngehoerigenBlaetter.text': 'Rokonok lapjai' } }));
  assert.equal(L.STRINGS.klartextHinweis, L.ZUSICHERUNG_TEXTE_EN.klartextHinweis + ' [English]', 'ohne Beleg: der englische Satz der App, gekennzeichnet');
  assert.equal(L.STRINGS.navAngehoerigenBlaetter, 'Rokonok lapjai');
  assert.equal(L.STRINGS.appName, L.LESE_TEXTE_EN.appName, 'gewöhnlicher Text: Englisch ohne Marke am Satz');
  assert.ok(L.sprachfassungLueckenAnzahl() > 50, 'das Modul trägt fast nichts: ' + L.sprachfassungLueckenAnzahl());
  assert.ok(L.sprachfassungHinweisHTML().includes('This language version is incomplete'), L.sprachfassungHinweisHTML());
});

/* SL1 (23.09.2026): Englisch ist nicht mehr von der Lücken-Zählung ausgenommen — ein englisches Modul, das die Bereichsnamen nicht trägt,
   zeigt jetzt ehrlich den Hinweis. Die Aussage dieser Probe bleibt: Oberflächentexte, die die App selbst englisch trägt, sind keine Lücke. */
const BEREICHSNAMEN_EN = Object.fromEntries(ladeLesen().V.bereicheAlleLesen().map((b) => [b.id + '.label', 'Area ' + b.id]));
test('[Lese-App·Rückfall] Deutsch und Englisch zeigen keinen Hinweis', async () => {
  const { L: en } = await oeffnen(modul({ sprache: 'en', texte: Object.assign({ 'strings:navAngehoerigenBlaetter.text': 'Sheets' }, BEREICHSNAMEN_EN) }), 'en');
  assert.equal(en.sprachfassungHinweisHTML(), '');
  const { L: de } = await oeffnen(modul({ sprache: 'de' }), 'de');
  assert.equal(de.sprachfassungHinweisHTML(), '');
});
