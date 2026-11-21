'use strict';
/* QR-Code einer signierten Anfrage zum Aushängen am Schalter (U2-ADR-460). Die kompakte Form einer signierten Anfrage ist viel länger,
   als ein Aushang-Code fasst (gemessen: die Demo-Anfrage hat über 2000 Zeichen, ein Aushang-Code fasst 300). U2-ADR-460 Nr. 3 entscheidet
   darum: die Stelle legt die kompakte Form auf share.vivodepot.de ab, und der Code trägt die kurze Adresse, die die Ablage vergibt.
   Heute verlangt das Studio stattdessen, dass die Stelle die Form selbst irgendwo ablegt und eine kurze Adresse von außen einträgt.
   (1) Messung: die kompakte Adresse passt nicht in einen Aushang-Code (bleibt grün; sie begründet den Weg über die Ablage).
   (2) Das Studio legt die kompakte Form selbst auf der Ablage ab und bekommt die kurze Adresse zurück (erwartete Röte bis zum Fix).
   ROT-BEWEIS: am heutigen Studio ist (2) rot (kein Weg zur Ablage, nur ein Feld für eine Adresse von außen). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');
const { ladeKern, webcrypto } = require('./load-kern.js');

const STUDIO = fs.readFileSync(GEN_PATH, 'utf8');
/* Eine kleine Anfrage genügt: schon Signatur und Zertifikat machen die kompakte Form länger, als ein Aushang-Code fasst. */
const ANFRAGE = { modulTyp: 'anfrage', anfrageVersion: 1, vorgang: 'HEIM-1', von: 'Pflegeheim am Beispielpark', zweck: 'Aufnahme',
  gueltigBis: '2027-06-30', felder: [{ feld: 'identity.firstName', pflicht: true }, { feld: 'identity.lastName', pflicht: true },
    { feld: 'identity.birthDate', pflicht: true }, { feld: 'health.allergies', pflicht: false }] };
async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function signierterUmschlag(K) {
  const anker = await paar(); const stelle = await paar();
  const cert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'heim/beispielpark', anbieterName: 'Pflegeheim am Beispielpark', anbieterTyp: 'institution/pflege', publicKeyJwk: stelle.pub } };
  const zertifikat = await K._signJWS(cert, await K._jwsImportSignKey(anker.priv), {});
  const anfrageJws = await K._signJWS(ANFRAGE, await K._jwsImportSignKey(stelle.priv), {});
  return { format: 'vivodepot-anfrage@1', anfrage: ANFRAGE, zertifikat, anfrageJws };
}

test('[Anfrage · QR · 1] die kompakte signierte Anfrage passt nicht in einen Aushang-Code', async () => {
  const { V: K } = ladeKern();
  const geladen = ladeGenerator();
  const a = STUDIO.indexOf('<script id="qrcode_VivodepotInline">');
  vm.runInContext(STUDIO.slice(STUDIO.indexOf('>', a) + 1, STUDIO.indexOf('</script>', a)), geladen.sandbox);
  const form = await geladen.V.anfrageKompakt(await signierterUmschlag(K));
  const link = 'https://share.vivodepot.de/anfrage.html#anfrage=' + form;
  assert.ok(link.length > 300, 'Vorbedingung: die Adresse ist länger als ein Aushang-Code fasst (' + link.length + ')');
  assert.equal(geladen.V.kurzlinkQrDataUrl(link), null);
});

test('[Anfrage · QR · 2] das Studio legt die kompakte Form selbst auf der Ablage ab (U2-ADR-460 Nr. 3)',
  { todo: 'Befund ANFRAGE-KURZLINK-ADR460-NICHT-LIVE (HOCH): die Ablage mit kurzer Adresse nach U2-ADR-460 ist nicht gelandet und nicht live, ohne selbst beschaffte Adresse entsteht kein QR-Code; Eigentümer Studio' },
  () => {
    const a = STUDIO.indexOf('async function anfrageQrTeilAnhaengen(');
    const rumpf = STUDIO.slice(a, STUDIO.indexOf('\n}\n', a));
    assert.ok(a > 0, 'Vorbedingung: der QR-Teil der Anfrage steht im Studio');
    assert.match(rumpf, /anfrage-ablegen/, 'das Studio kennt keinen Weg zur Ablage; die Stelle muss eine kurze Adresse von außen eintragen');
  });
