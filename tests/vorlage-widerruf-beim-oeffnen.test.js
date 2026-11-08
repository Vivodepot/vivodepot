'use strict';
/* Wirkt der Widerruf eines Herausgeberschlüssels auch auf eine Vorlage, die vorher eingelesen wurde? (06.11.2026)
   Für Module gilt das: Beim nächsten Öffnen wird ihr Beleg nachgeprüft, und ein widerrufener Schlüssel nimmt ihnen den
   Status „geprüft“ (die Ladeprüfung der Module hält das fest). Diese Probe misst dasselbe
   für eine eingelesene Vorlage (`importierteVorlagen`): signiert mit Wegwerf-Schlüsseln, eingelesen, gespeichert, dann
   mit dem Herausgeberschlüssel auf der Widerrufsliste neu geöffnet.
   Kontrollen: Beim Einlesen lehnt die App eine Vorlage mit widerrufenem Schlüssel ab; ohne Widerruf bleibt sie nach dem
   Öffnen in Gebrauch.
   Gemessen 06.11.2026: rot, das Öffnen prüfte eingelesene Vorlagen nicht nach (Befund VORLAGE-WIDERRUF-NICHT-NACHGEPRUEFT).
   Seit dem Fix prüft das Öffnen den Beleg jeder eingelesenen Vorlage nach (`_vorlagenWiderrufPruefen`); Rot-Beweis: ohne den
   Aufruf beim Öffnen fällt der letzte Fall. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeKern } = require('./load-kern.js');

const JETZT = '2026-11-06T00:00:00Z';
const PW = 'vorlage-widerruf-oeffnen-1!';

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

let _bündel = null;
function buendel() {
  if (_bündel) return _bündel;
  _bündel = (async () => {
    const anker = await paar();
    const herausgeber = await paar();
    const G = ladeGenerator().V;
    const anbieter = G.baueAnbieter({
      anbieterName: 'Beispiel-Verlag eG', rechtsform: 'eG', ustId: 'DE123456789',
      strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt', land: 'Deutschland',
      kontaktName: 'E. Beispiel', kontaktFunktion: 'Vorstand', kontaktEmail: 'vorstand@beispiel-verlag.example',
      kontaktTelefon: '+49 30 1234567', bereich: 'housing', useCase: 'Probe: Widerruf einer eingelesenen Vorlage.',
    });
    const submission = await G.baueSubmissionSigniert({
      anbieter, publicKeyJwk: herausgeber.pub, ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false,
      felder: [{ feldname: 'Vertragsnummer', feldtyp: 'text', pflicht: false, bereich: 'housing', gruppe: 'Verlag' }],
    }, herausgeber.priv);
    const I = ladeIssuer().V;
    const d = I.submissionZuAnbieterDaten(submission);
    const vc = I.baueProviderVC({
      anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp, publicKeyJwk: d.publicKeyJwk,
      templates: d.templates, issuanceDate: '2026-11-01T00:00:00Z', expirationDate: '2028-05-01T00:00:00Z',
      anbieterPruefungAbgeschaltet: true,   // Wegwerf-Probe; die Prüfung vor der Ausstellung ist hier nicht Gegenstand
    });
    const cert = await I.stelleProviderCredentialAus(vc, await I._jwsImportSignKey(anker.priv));
    const b = I.baueAuslieferungsBundle(cert, d.templatesJws[0]);
    const ankerJwk = { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: anker.pub.x };
    return { b, ankerJwk, herausgeber };
  })();
  return _bündel;
}

async function eingelesenUndGespeichert(opts) {
  const { b, ankerJwk } = await buendel();
  const V = ladeKern().V;
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Probe');
  const teil = V._importEingabeAufteilen(JSON.stringify(b));
  const plan = await V.importPlanGeprueft('provider-credential', teil.text, Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk }, opts || {}));
  return { V, plan };
}

test('[Vorlage·Widerruf] Kontrolle: beim Einlesen lehnt die App eine Vorlage mit widerrufenem Schlüssel ab', async () => {
  const { herausgeber } = await buendel();
  const V0 = ladeKern().V;
  const tp = await V0._jwkThumbprint(herausgeber.pub);
  const { plan } = await eingelesenUndGespeichert({ widerrufsListe: [tp] });
  assert.equal(plan.ungueltig, true, 'die Widerrufsliste wirkt beim Einlesen');
});

async function nachOeffnen(widerrufen) {
  const { ankerJwk, herausgeber } = await buendel();
  const { V, plan } = await eingelesenUndGespeichert();
  assert.equal(plan.ungueltig, false, 'Kontrolle: die Vorlage ist gültig eingelesen: ' + (plan.grund || ''));
  V.importAnwenden(plan, {});
  assert.equal(V.importierteVorlagenUebersicht().length, 1, 'Kontrolle: eine Vorlage im Depot');
  const umschlag = await V.depotSerialisieren();
  const L = ladeKern().V;
  const tp = await L._jwkThumbprint(herausgeber.pub);
  await L.depotLaden(umschlag, PW, Object.assign({ ankerJwk }, widerrufen ? { widerrufsListe: [tp] } : {}));
  return L.importierteVorlagenUebersicht();
}

test('[Vorlage·Widerruf] Gegenprobe: ohne Widerruf bleibt die Vorlage nach dem Öffnen in Gebrauch', async () => {
  const liste = await nachOeffnen(false);
  assert.equal(liste.length, 1);
  assert.equal(liste[0].widerrufen, null);
});

test('[Vorlage·Widerruf] mit widerrufenem Herausgeberschlüssel gilt die eingelesene Vorlage nach dem Öffnen als widerrufen',
  async () => {
  const liste = await nachOeffnen(true);
  assert.equal(liste.length, 1);
  assert.ok(liste[0].widerrufen, 'die Übersicht zeigt die Vorlage als widerrufen');
});
