'use strict';
/* Signierte Sprachmodule dürfen Zusicherungssätze übersetzen (Entwurf U2-ADR-NNN, 19.09.2026).
   Vertrauen kommt NUR aus der beim Öffnen erneut geprüften Signaturkette, nie aus dem Marker im Depot; Deutsch und Englisch bleiben
   app-eigen; ein Satz mit falscher Form fällt einzeln heraus; ein fehlender Satz fällt zurück (Modulsprache → Englisch → Deutsch),
   ein Zusicherungssatz trägt seine Ersatzsprache sichtbar mit. Wegwerf-Anker und -Schlüssel wie in pruefstufe-eigene-treuhand-kette. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
// S1 (20.09.2026): Zusicherung unverändert (Sätze der Anwendung sind für ein Depot-Modul nicht überschreibbar, Rückfall auf die Ersatzsprache); gemessen am ENGLISCHEN Standardprodukt (ladeKern bäckt privat-en), wo die englischen Sätze der Anwendung (aus dem Sprachmodul) stehen — seit S1 trägt das Gerüst keine mehr (U2-ADR-426).
process.env.VD_TEST_PRODUKT = 'privat-en';
const { ladeKern, webcrypto } = require('./load-kern.js');

const ANKER_PRIV = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: ANKER_PRIV.x }), jetzt: '2026-09-16T12:00:00Z' });
const SATZ = 'strings:herkunftSatzKeine.text';
const SATZ_HU = 'Ezek az adatok teljes egészében a {marke} saját forrásából származnak. Nincs hozzáadott bővítmény.';
const NORMAL = 'strings:einlesenKnopf.text';

function modul(extra) {
  return Object.assign({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { [SATZ]: SATZ_HU, 'strings:standSatzBekannt.text': 'Az állapot minden bővítménynél ismert — összesen {n}.' } }, extra || {});
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
const signieren = async (V, nutzlast, jwk) => V._signJWS(nutzlast, await V._jwsImportSignKey(jwk), {});

/* Ein Depot mit einem über die Kette eingelassenen Sprachmodul. `stelle`: 'pruefer' | 'herausgeber' | 'intern'. */
async function depotMit(stelle, inhalt) {
  const { V } = ladeKern();
  const zw = await paar(); const blatt = await paar();
  const [zwId, zwTyp, zwExtra, blattId, blattTyp] = {
    pruefer: ['pruefstelle-x', V.VIVODEPOT_PRUEFSTELLE_ANBIETERTYP, { rolle: 'pruefer' }, 'uebersetzer-hu', 'institution/test'],
    herausgeber: ['fremde-ausgabestelle', V.AUSGABESTELLE_ANBIETERTYP, undefined, 'uebersetzer-hu', 'institution/test'],
    intern: ['vivodepot-ausgabestelle', V.AUSGABESTELLE_ANBIETERTYP, undefined, 'vivodepot', 'vivodepot/anbieter'],
  }[stelle];
  const ausstellerZertifikatJws = await signieren(V, zert(zwId, zwTyp, zw.pub, zwExtra), ANKER_PRIV);
  const providerCredentialJws = await signieren(V, zert(blattId, blattTyp, blatt.pub), zw.priv);
  const modulSignaturJws = await signieren(V, inhalt || modul(), blatt.priv);
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws }), d, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das Modul wird eingelassen — ' + r.grund);
  d.textsprache = 'hu';
  V.setData(d);
  return { V, d };
}
function neuLaden(V, d) {   // wie depotLaden: Vertrauen leeren, erneut prüfen, anmelden
  V._TEXTSATZ_BELEGT.clear();
  return V._textsatzModuleBelegPruefen(d, OPTS).then(() => { V._textsatzModuleAusDepotAnmelden(d); V.textsatzNeuAnwenden(); });
}

test('[Sprachmodul·Zusicherung] pruefer: der übersetzte Zusicherungssatz gilt und nennt, wer die Übersetzung geprüft hat', async () => {
  const { V, d } = await depotMit('pruefer');
  await neuLaden(V, d);
  const t = V.STRINGS.herkunftSatzKeine;
  assert.ok(t.startsWith('Ezek az adatok teljes egészében a '), 'der ungarische Satz steht da: ' + t);
  assert.ok(t.includes('pruefer') && t.includes('uebersetzer-hu'), 'die Herkunft der Übersetzung steht am Satz: ' + t);
});

test('[Sprachmodul·Zusicherung] intern gilt ebenfalls', async () => {
  const { V, d } = await depotMit('intern');
  await neuLaden(V, d);
  assert.ok(V.STRINGS.herkunftSatzKeine.startsWith('Ezek az adatok'), V.STRINGS.herkunftSatzKeine);
});

test('[Sprachmodul·Zusicherung·Rot-Beweis] herausgeber reicht NICHT — der Satz fällt auf Englisch zurück und sagt es', async () => {
  const { V, d } = await depotMit('herausgeber');
  await neuLaden(V, d);
  const t = V.STRINGS.herkunftSatzKeine;
  assert.ok(!t.startsWith('Ezek az adatok'), 'die Übersetzung eines nur ausgebenden Herausgebers gilt für Zusicherungen nicht: ' + t);
  assert.ok(t.endsWith(' [English]'), 'Englisch als Rückfall, sichtbar gekennzeichnet: ' + t);
});

test('[Sprachmodul·Zusicherung·Rot-Beweis] ein von Hand in die Datei geschriebener Marker macht kein Modul vertrauenswürdig', async () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.textsprache = 'hu';
  d.textsatzModule = [modul({ ungeprueft: false, pruefstufe: 'intern', anbieterIdGeprueft: true, anbieterId: 'vivodepot' })];
  V.setData(d);
  await neuLaden(V, d);
  assert.ok(V.STRINGS.herkunftSatzKeine.endsWith(' [English]'), 'ohne Beleg kein Zusicherungssatz: ' + V.STRINGS.herkunftSatzKeine);
});

test('[Sprachmodul·Zusicherung·Rot-Beweis] ein geändertes Wort im gespeicherten Modul nimmt ihm den Status', async () => {
  const { V, d } = await depotMit('pruefer');
  d.textsatzModule[0].texte[SATZ] = 'Minden rendben, bízzon bennünk. {marke}';
  await neuLaden(V, d);
  const t = V.STRINGS.herkunftSatzKeine;
  assert.ok(!t.includes('Minden rendben'), 'die Fälschung kommt nicht durch: ' + t);
  assert.ok(t.endsWith(' [English]'), t);
});

test('[Sprachmodul·Zusicherung·Rot-Beweis] Deutsch und Englisch bleiben app-eigen, auch mit gültiger Kette', async () => {
  const { V, d } = await depotMit('pruefer', modul({ sprache: 'en', texte: { [SATZ]: 'FAKE — {marke} vouches for everything.' } }));
  d.textsprache = 'en';
  await neuLaden(V, d);
  assert.ok(!V.STRINGS.herkunftSatzKeine.includes('FAKE'), V.STRINGS.herkunftSatzKeine);
  assert.equal(V._textsatzModulBelegtInfo(d.textsatzModule[0]), null, 'für en gibt es keinen Vertrauenseintrag');
});

test('[Sprachmodul·Zusicherung·Form] ein Satz mit anderen Platzhaltern fällt einzeln heraus, die übrigen bleiben', async () => {
  const { V } = ladeKern();
  const m = modul({ texte: { [SATZ]: 'Nincs {marke_de_rossz} itt.', 'strings:standSatzBekannt.text': 'Az állapot ismert — {n}.' } });
  const r = V.textsatzModulPruefen(m, { vertrauenswuerdig: 'signiert' });
  assert.deepEqual(r.verworfene.map((v) => v.kennung + ':' + v.grund), [SATZ + ':zusicherung-form']);
  assert.ok(r.texte['strings:standSatzBekannt.text'], 'der Satz mit richtigen Platzhaltern bleibt');
  const roh = V.textsatzModulPruefen(m);
  assert.equal(roh.verworfene.filter((v) => v.grund === 'zusicherung').length, 2, 'ohne Vertrauen bleiben beide gesperrt (unverändert)');
});

test('[Sprachmodul·Rückfall] ein fehlender gewöhnlicher Text fällt auf Englisch zurück, ohne Marke am Satz, und zählt als Lücke', async () => {
  const { V, d } = await depotMit('pruefer', modul({ texte: { 'strings:standSatzBekannt.text': 'Az állapot ismert — {n}.' } }));
  await neuLaden(V, d);
  const t = V.STRINGS.einlesenKnopf;
  assert.equal(t, V.TEXTSATZ_EN_QUELLE.texte[NORMAL], 'Englisch statt der rohen Kennung: ' + t);
  assert.ok(V.sprachfassungLueckenAnzahl() >= 1, 'die Lücke wird gezählt, der Hinweis erscheint einmal je Ansicht');
});

test('[Sprachmodul·Rückfall] der Hinweis „Sprachfassung unvollständig" kommt bei einer Lücke — in der Ersatzsprache — und geht mit der Sprache', async () => {
  const { V, d } = await depotMit('pruefer', modul({ texte: { 'strings:standSatzBekannt.text': 'Az állapot ismert — {n}.' } }));
  await neuLaden(V, d);
  void V.STRINGS.einlesenKnopf;
  assert.ok(V.sprachfassungLueckenAnzahl() >= 1, 'das ungarische Modul trägt fast nichts, die Ersatztexte werden gezählt');
  const html = V.sprachfassungHinweisHTML();
  assert.ok(html.includes('id="sprach-luecke"') && html.includes('role="note"'), html);
  assert.ok(html.includes('This language version is incomplete'), 'die Hinweiszeile selbst fällt auf Englisch zurück: ' + html);
  d.textsprache = 'de';
  V.textsatzNeuAnwenden();
  assert.equal(V.sprachfassungLueckenAnzahl(), 0, 'auf Deutsch gibt es keine Lücke, also keinen Hinweis');
});
