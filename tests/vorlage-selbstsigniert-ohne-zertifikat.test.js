'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vorlage-selbstsigniert-ohne-zertifikat.test.js — eine selbst signierte Vorlage wirkt nie geprüft (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Das Bauen und Selbstsignieren einer Vorlage ist offen (Studio, `baueSubmissionSigniert`). Was eine
   Vorlage zur geprüften macht, ist allein das Kundenzertifikat unter dem Anker, und das stellt der
   Ausgabebetrieb aus. Diese Probe hält fest, dass der offene Teil keinen Weg dorthin öffnet:
     Kern      — ein Anbieter, der sich sein „Zertifikat“ selbst ausstellt (mit dem eigenen Schlüssel,
                 Form wie ein echtes), bekommt seine Vorlage nicht übernommen: der Import fällt ganz;
     Lese-App  — ein Depot, das diese Vorlage samt Beleg trägt, zeigt sie als ungültig, und eine
                 Vorlage, die sich nur selbst „geprüft“ nennt, als nicht prüfbar — nie als gültig.
   Rot-Beweis: dieselbe Vorlage unter einem Zertifikat, das ein (Test-)Anker ausgestellt hat, wird
   übernommen bzw. als gültig gezeigt. Der einzige Unterschied zwischen den Fällen ist der Aussteller.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ladeGenerator } = require('./load-generator.js');

const JETZT = '2026-10-05T12:00:00Z';

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { pub: { kty: 'OKP', crv: 'Ed25519', x: pub.x }, priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function stammdaten() {
  return {
    anbieterName: 'Beispiel Beratungsstelle', rechtsform: 'e.V.',
    strasse: 'Beispielweg 1', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland',
    kontaktName: 'Erika Beispiel', kontaktFunktion: 'Leitung', kontaktEmail: 'kontakt@beispiel.example', kontaktTelefon: '+49 30 0000000',
    bereich: 'health',
    useCase: 'Erfassung der Angaben, die wir für eine Beratung brauchen, damit die Person sie nicht jedes Mal neu nennen muss.',
  };
}

/* Die Institution baut und signiert ihre Vorlage mit dem eigenen Schlüssel — genau wie das Studio. */
async function selbstSignierteVorlage(G, anbieterPaar) {
  const state = { anbieter: G.baueAnbieter(stammdaten()), publicKeyJwk: anbieterPaar.pub,
    felder: [{ feldname: 'Beratungsanlass', feldtyp: 'text', pflicht: true, bereich: 'health' }] };
  const paket = await G.baueSubmissionSigniert(state, anbieterPaar.priv);
  return { templateJws: paket.templatesJws[0] };
}
/* Ein „Zertifikat“ in der Form eines echten: der Aussteller ist der übergebene Schlüssel. */
async function zertifikat(V, ausstellerPriv, anbieterPub) {
  return V._signJWS({
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-09-01T00:00:00Z', expirationDate: '2027-09-01T00:00:00Z',
    credentialSubject: { anbieterId: 'beispiel-beratung', anbieterName: 'Beispiel Beratungsstelle', publicKeyJwk: anbieterPub },
  }, await V._jwsImportSignKey(ausstellerPriv), {});
}

test('[Vorlage·selbst signiert·Kern] ohne Zertifikat vom Anker wird die Vorlage nicht übernommen', async () => {
  const { V } = ladeKern();
  const G = ladeGenerator().V;
  const anbieter = await paar();
  const { templateJws } = await selbstSignierteVorlage(G, anbieter);
  const selbstZert = await zertifikat(V, anbieter.priv, anbieter.pub);
  const plan = await V.importPlanGeprueft('provider-credential', selbstZert, { jetzt: JETZT, templateJws });
  assert.equal(plan.ungueltig, true, 'das selbst ausgestellte Zertifikat trägt nicht');
  assert.equal((plan.feldDefinitionen || []).length, 0, 'keine Felddefinition übernommen');
  assert.ok(!plan.beleg, 'kein Beleg, der später als geprüft gelesen werden könnte');
});

test('[Vorlage·selbst signiert·Lese-App] mit selbst ausgestelltem Beleg ungültig, mit bloßer Behauptung nicht prüfbar — nie gültig', async () => {
  const V = ladeKern().V;
  const L = ladeLesen().V;
  const G = ladeGenerator().V;
  const anbieter = await paar();
  const { templateJws } = await selbstSignierteVorlage(G, anbieter);
  const selbstZert = await zertifikat(V, anbieter.priv, anbieter.pub);
  const depot = { importierteVorlagen: [
    { id: 'mit-beleg', feldIds: ['f-a'], beleg: { providerCredentialJws: selbstZert, templateJws } },
    { id: 'nur-behauptet', feldIds: ['f-b'], anbieterName: 'Beispiel Beratungsstelle', geprueft: true, ungeprueft: false, verifiziert: true, pruefstufe: 'extern-geprueft:herausgeber' },
  ] };
  const karte = await L.vorlagenPruefstandBerechnen(depot, { jetzt: JETZT });
  assert.equal(karte['vorlage:mit-beleg'].zustand, 'ungueltig');
  assert.equal(karte['vorlage:nur-behauptet'].zustand, 'nicht-pruefbar');
  for (const s of Object.values(karte)) assert.notEqual(s.zustand, 'gueltig');
});

test('[Vorlage·selbst signiert·Rot-Beweis] dieselbe Vorlage unter einem Zertifikat vom (Test-)Anker trägt — nur der Aussteller unterscheidet', async () => {
  const V = ladeKern().V;
  const L = ladeLesen().V;
  const G = ladeGenerator().V;
  const anker = await paar();
  const anbieter = await paar();
  const { templateJws } = await selbstSignierteVorlage(G, anbieter);
  const echtesZert = await zertifikat(V, anker.priv, anbieter.pub);
  const opts = { jetzt: JETZT, ankerJwk: anker.pub };
  const plan = await V.importPlanGeprueft('provider-credential', echtesZert, Object.assign({ templateJws }, opts));
  assert.equal(plan.ungueltig, false, plan.grund);
  assert.equal(plan.feldDefinitionen.length, 1);
  const karte = await L.vorlagenPruefstandBerechnen({ importierteVorlagen: [{ id: 'v', feldIds: ['f'], beleg: { providerCredentialJws: echtesZert, templateJws } }] }, opts);
  assert.equal(karte['vorlage:v'].zustand, 'gueltig');
});
