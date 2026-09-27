'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Sprachmodul von vor dem Kennungs-Umbau kommt an — Schlüssel übersetzt, Text und Signatur
   unberührt (16.09.2026, U2-ADR-141 Entscheidung 4)
   ────────────────────────────────────────────────────────────────────────
   Das Tor `_textsatzTexteUebernehmen` verwarf die alten Kennungen als unbekannt (oder ließ eine
   alte Bereichskennung als Beschriftung eines fremden Bereichs durch). Die Signatur galt, die Texte
   kamen nie an, das Produkt zeigte rohe Kennungen. Gemessen mit
   tools/altbestand-vier-produkte-messen.js am Betriebssatz-Bündel der Modul-App und an einer
   englischen Datei von vor dem Umbau, die ihr Modul eingebettet trägt.

   Die Proben halten die Zusage aus beiden Richtungen:
     - jede alte Form kommt unter der heutigen Kennung an (Bereich, Feld, Unterfeld, Sektion,
       Assistent, Vollmacht, Vorschläge, Situation) — über die EINE Tabelle KENNUNG_MAPPING;
     - das heutige englische Modul bleibt Schlüssel für Schlüssel, wie es ist;
     - eine erfundene Kennung bleibt verworfen; trägt ein Modul beide Fassungen, gilt die neue;
     - ein signiertes Bündel mit alten Kennungen kommt an, ein nachträglich veränderter Text lässt
       die Signaturprüfung weiter scheitern, und im Depot liegt das Modul roh, wie signiert;
     - die echte Vor-Umbau-Datei (demo-en) zeigt nach dem Öffnen englische Beschriftungen.

   ROT-BEWEIS, GEMESSEN (16.09.2026): mit dem Tor von vorher sind 4 der 7 Proben rot — Übersetzung,
   signiertes Bündel, Datei, und die Probe zur erfundenen Kennung (dort an ihrer Hälfte `gesundheit.label`,
   die ohne Übersetzung unter der alten Kennung stehen bleibt). Grün bleiben das heutige Modul, „beide
   Fassungen" (die neue kam schon vorher an) und der veränderte Text.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// S1 (20.09.2026, U2-ADR-426): gemessen wird bei aktivem Englisch — das Gerüst trägt keinen englischen Satz mehr, darum das englische Standardprodukt; Assertions unverändert.
process.env.VD_TEST_PRODUKT = 'privat-en';
const { ladeKern, webcrypto } = require('./load-kern.js');

const EN_MODUL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8'));
const pruefen = (V, texte) => V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, texte });

test('[Alt-Kennung] jede alte Form kommt unter der heutigen Kennung an, der Text bleibt', () => {
  const { V } = ladeKern();
  const r = pruefen(V, {
    'identitaet.label': 'Identity & person',
    'identitaet.vorname.label': 'First name',
    'identitaet.ausweis/system.label': 'Issuing system',
    'identitaet#fruehere-namen.hint': 'Earlier names',
    'wizard:umzwiz.strasse.label': 'Street',
    'wizard:kiwiz.ki_zweck/trauer.label': 'Grief',
    'vollmacht:vm_gesundheit_entscheiden/ja.label': 'Yes',
    'feld.nationalitaet.vorschlaege': 'German',
  });
  assert.deepEqual(r.verworfene, []);
  assert.deepEqual({ ...r.texte }, {
    'identity.label': 'Identity & person',
    'identity.givenName.label': 'First name',
    'identity.idDocuments/system.label': 'Issuing system',
    'identity#fruehere-namen.hint': 'Earlier names',
    'wizard:umzwiz.streetAddress.label': 'Street',
    'wizard:kiwiz.purpose/trauer.label': 'Grief',
    'vollmacht:healthCareGeneralDecision/ja.label': 'Yes',
    'feld.nationality.vorschlaege': 'German',
  });
});

test('[Alt-Kennung·Gegenprobe] das heutige englische Modul bleibt Schlüssel für Schlüssel, wie es ist', () => {
  const { V } = ladeKern();
  const r = V.textsatzModulPruefen(EN_MODUL);
  /* NACHGEZOGEN (ZS2, 19.09.2026, U2-ADR-331 im Kern): DIESER Aufruf ist der UNGETRUSTETE Weg —
     die zwölf Zusicherungs-Kennungen (herkunftSatz-/standSatz- + Fuss-Varianten), die
     textsatz-en-modul.json seit U2-ADR-259 mitträgt, dürfen nur über den vertrauenswürdigen
     Ab-Werk-Aufruf gesetzt werden, s. tests/textsatz-en-modul-erzeugen.test.js. Dieselbe
     Zusicherung, hier gegen die COMMITTETE Datei statt gegen baueModul(). */
  const zusicherungsKennungen = new Set(V.ZUSICHERUNGS_SCHLUESSEL_KERN.map((k) => 'strings:' + k + '.text'));
  const erwartet = Object.keys(EN_MODUL.texte)
    .filter((kennung) => zusicherungsKennungen.has(kennung))
    .map((kennung) => ({ kennung, grund: 'zusicherung' }));
  assert.deepEqual(r.verworfene, erwartet);
  assert.deepEqual(Object.keys(r.texte).sort(),
    Object.keys(EN_MODUL.texte).filter((k) => !zusicherungsKennungen.has(k)).sort());
});

test('[Alt-Kennung·Gegenprobe] eine erfundene Kennung bleibt verworfen — auch unter einem alten Bereich', () => {
  const { V } = ladeKern();
  const r = pruefen(V, { 'identitaet.gibtEsNicht.label': 'x', 'gesundheit.label': 'Health' });
  assert.deepEqual(r.verworfene, [{ kennung: 'identitaet.gibtEsNicht.label', grund: 'unbekannt' }]);
  assert.deepEqual({ ...r.texte }, { 'health.label': 'Health' });
});

test('[Alt-Kennung·Gegenprobe] trägt ein Modul beide Fassungen, gilt die neue', () => {
  const { V } = ladeKern();
  for (const reihenfolge of [['identitaet.vorname.label', 'identity.givenName.label'], ['identity.givenName.label', 'identitaet.vorname.label']]) {
    const texte = {};
    for (const k of reihenfolge) texte[k] = k.startsWith('identity.') ? 'NEU' : 'ALT';
    assert.equal(pruefen(V, texte).texte['identity.givenName.label'], 'NEU', reihenfolge.join(' vor '));
  }
});

/* ── signiert: Wegwerf-Anker und Wegwerf-Anbieter, wie tests/modul-einlassen-geprueft.test.js ── */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x }), jetzt: '2026-08-23T12:00:00Z' });
async function signiertesBuendel(V, modul) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const zert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'institution/alt-kennung-probe', anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk: pubJwk },
  };
  const signieren = async (nutzlast, jwk) => V._signJWS(nutzlast, await V._jwsImportSignKey(jwk), {});
  return { providerCredentialJws: await signieren(zert, SENTINEL_PRIVATE_JWK), modulSignaturJws: await signieren(modul, privJwk) };
}
const ALT_MODUL = Object.freeze({ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
  texte: Object.freeze({ 'identitaet.vorname.label': 'First name (signed)' }) });

test('[Alt-Kennung·signiert] ein signiertes Bündel mit alten Kennungen kommt an; im Depot liegt es roh, wie signiert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('alt-kennung-probe-2026');
  const d = V.getData();
  const r = await V.modulEinlassenGeprueft(JSON.stringify(await signiertesBuendel(V, ALT_MODUL)), d, OPTS);
  assert.equal(r.angenommen, true, 'abgewiesen: ' + r.grund);
  assert.deepEqual(Object.keys(d.textsatzModule[0].texte), ['identitaet.vorname.label'], 'gespeichert wird das signierte Modul, nicht die Übersetzung');
  V._textsatzModuleAusDepotAnmelden(d);
  d.textsprache = 'en';
  assert.equal(V.textLesen('identity.givenName.label'), 'First name (signed)');
});

test('[Alt-Kennung·signiert·Gegenprobe] ein nachträglich veränderter Text lässt die Signaturprüfung scheitern', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('alt-kennung-probe-2026');
  const d = V.getData();
  const b = await signiertesBuendel(V, ALT_MODUL);
  const [kopf, nutzlast, sig] = b.modulSignaturJws.split('.');
  const veraendert = JSON.parse(Buffer.from(nutzlast, 'base64url').toString('utf8'));
  veraendert.texte['identitaet.vorname.label'] = 'Untergeschoben';
  const gefaelscht = Object.assign({}, b, { modulSignaturJws: [kopf, Buffer.from(JSON.stringify(veraendert)).toString('base64url'), sig].join('.') });
  const r = await V.modulEinlassenGeprueft(JSON.stringify(gefaelscht), d, OPTS);
  assert.equal(r.angenommen, false);
  assert.equal((d.textsatzModule || []).length, 0);
  // Vorbedingung, dass die Fälschung das Einzige ist, was scheitert: dasselbe Bündel unverändert kommt an.
  assert.equal((await V.modulEinlassenGeprueft(JSON.stringify(b), d, OPTS)).angenommen, true);
});

test('[Alt-Kennung·Datei] die englische Vorführdatei von vor dem Umbau zeigt englische Beschriftungen', async () => {
  const { V } = ladeKern();
  const roh = fs.readFileSync(path.join(__dirname, 'fixtures', 'vorfuehrung-zugang-zum-recht', 'demo-en.vivodepot'), 'utf8');
  await V.depotLaden(JSON.parse(roh.slice(roh.indexOf('{'))), 'zugang-zum-recht-vorfuehrung-2026');   // Passwort im README der Fixture
  assert.equal(V.getData().textsprache, 'en');
  assert.equal(V.textLesen('identity.givenName.label'), EN_MODUL.texte['identity.givenName.label']);
  assert.equal(V.textLesen('identity.label'), EN_MODUL.texte['identity.label']);
});
