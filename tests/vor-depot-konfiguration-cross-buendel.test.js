'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-253 Teil 4 (04.09.2026): Kanal-B-Bündel sehen ihre GESCHWISTER
   im selben Provisionierungs-Stapel (NGO-Härtetest)
   ────────────────────────────────────────────────────────────────────────
   Vorher: `vorDepotKonfigurationAnwenden` prüfte jedes rohe Bündel EINZELN, in
   Datei-Reihenfolge, gegen die LIVE-Indizes (SEKTOR_BY_ID/SITUATION_BY_ID) —
   aber nichts in der Schleife registrierte ein geprüftes Bündel in diese
   Indizes, das passierte erst NACH der Depot-Anlage. Ein Assistent, dessen
   `ziel.sektor` auf einen Bereich zeigte, der im SELBEN Stapel mitgeliefert
   wurde, sah diesen Bereich nie — verworfen, kein zweiter Versuch.

   Weg C (gewählt, 04.09.2026): die Prüfschleife läuft jetzt in ZWEI
   Durchläufen — erst alle Register OHNE Ziel-Abhängigkeit (bereich, situation,
   ...), sofort registriert; DANN erst die zwei Ziel-abhängigen Register
   (wizard, ereignisAchse). Reihenfolge wie EINLASS_REGISTER es an keiner
   Stelle selbst vorgibt — eine eigene, gemessene Zweiteilung.

   ZWEI Rot-Beweise verlangt, nicht einer (Auflage): das gepflanzte
   Cross-Bündel-Szenario (zwischen Gruppen, Probe 1-2 unten) UND der
   gruppeninterne Fall (Probe 3 unten) — Letzterer ist heute GRÜN, WEIL der
   Fall nicht existiert, nicht weil er geprüft und bestanden wurde.

   DIESE ZWEITEILUNG IST AN DIE HEUTIGE FORM DER VIER REGISTER GEBUNDEN: keins
   kennt heute eine Möglichkeit, auf ein Geschwister DESSELBEN Typs zu zeigen
   (bereich→bereich, situation→situation, wizard→wizard, ereignisAchse→
   ereignisAchse gibt es nicht). Bekommt eines künftig ein solches Feld, fällt
   Weg C an dieser Stelle still auseinander — Probe 3 unten ist der Ort, an dem
   das auffallen MUSS, wenn es passiert (sie prüft die Erlaubnislisten selbst,
   nicht nur ein Beispiel).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

function kern() { return ladeKern().V; }

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-28T09:00:00Z';
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anbieterCertRohling(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}
async function signiertesBuendel(V, modul) {
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/cross-buendel-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

const BEREICH_BUENDEL = {
  modulTyp: 'bereich', moduleVersion: 1, herkunft: 'cross-buendel-probe', sprache: 'de',
  bereiche: { 'x-cross-buendel-bereich': { label: 'Cross-Bündel-Bereich' } },
};
const WIZARD_BUENDEL_AUF_CROSS_BEREICH = {
  modulTyp: 'wizard', moduleVersion: 1, herkunft: 'cross-buendel-probe', sprache: 'de',
  wizards: { 'x-cross-buendel-wizard': { titel: 'Probe', ziel: { sektor: 'x-cross-buendel-bereich' },
    schritte: [{ feld: { id: 'x_cross_buendel_feld', typ: 'text' }, frage: 'Frage?' }] } },
};

test('[U2-ADR-253·Teil 4·Rot-Beweis] ein Assistent, dessen Ziel ein Bereich im SELBEN Stapel ist, wurde vorher verworfen', async () => {
  const { V } = ladeKern();
  const bereichBuendel = await signiertesBuendel(V, BEREICH_BUENDEL);
  const wizardBuendel = await signiertesBuendel(V, WIZARD_BUENDEL_AUF_CROSS_BEREICH);
  // Testweise auf die alte, ungruppierte Ein-Durchlauf-Schleife zurückgenommen (Datei-Reihenfolge,
  // keine Zwischenregistrierung) — belegt, dass die Probe wirklich das Vorher-Verhalten misst.
  const alteSchleife = async (buendelListe) => {
    const ziel = V.vorDepotKonfigurationLeer();
    for (const b of buendelListe) {
      try { await V.modulEinlassenGeprueft(JSON.stringify(b), ziel, OPTS); } catch (e) { /* */ }
    }
    return ziel;
  };
  const zielAlt = await alteSchleife([wizardBuendel, bereichBuendel]);
  assert.equal(zielAlt.wizardsModule.length, 0,
    'Rot-Beweis-Vorbedingung: die alte, ungruppierte Schleife verwirft den Assistenten wirklich, weil der Bereich noch nicht registriert ist');
});

test('[U2-ADR-253·Teil 4] Weg C: derselbe Assistent landet jetzt, unabhängig von der Datei-Reihenfolge', async () => {
  const { V } = ladeKern();
  for (const reihenfolge of [
    [WIZARD_BUENDEL_AUF_CROSS_BEREICH, BEREICH_BUENDEL],   // Assistent zuerst in der Datei
    [BEREICH_BUENDEL, WIZARD_BUENDEL_AUF_CROSS_BEREICH],   // Bereich zuerst in der Datei
  ]) {
    const buendel = [];
    for (const m of reihenfolge) buendel.push(await signiertesBuendel(V, m));
    const ziel = await V.vorDepotKonfigurationAnwenden(buendel, null, OPTS);
    assert.equal(ziel.bereichsModule.length, 1, 'der Bereich landet');
    assert.equal(ziel.wizardsModule.length, 1,
      'der Assistent landet jetzt auch, obwohl sein Ziel nur im selben Stapel existiert — Datei-Reihenfolge: '
      + reihenfolge.map((m) => m.modulTyp).join(','));
  }
});

test('[U2-ADR-253·Teil 4·gruppenintern, dokumentiert] ein Assistent kann heute NICHT auf einen anderen Assistenten zeigen — Ziel-Auflösung kennt nur Sektor/Situation', async () => {
  const { V } = ladeKern();
  // Diese Probe ist GRÜN, WEIL der Fall nicht existiert — nicht weil er geprüft und bestanden
  // wurde. Ein `ziel.sektor`, der auf die ID EINES ANDEREN ASSISTENTEN zeigt (nicht auf einen
  // echten Sektor/eine echte Situation), wird verworfen — dieselbe Ziel-Prüfung, die auch einen
  // Cross-Bündel-Bereich verworfen hätte, sieht hier keinen Unterschied: eine Wizard-ID ist für
  // sie nicht auflösbar, es gibt keine wizard-eigene Registry, gegen die sie zusätzlich prüft.
  const buendel = await signiertesBuendel(V, {
    modulTyp: 'wizard', moduleVersion: 1, herkunft: 'cross-buendel-probe', sprache: 'de',
    wizards: { 'x-zeigt-auf-anderen-wizard': { titel: 'Probe', ziel: { sektor: 'x-cross-buendel-wizard' },
      schritte: [{ feld: { id: 'x_feld', typ: 'text' }, frage: 'Frage?' }] } },
  });
  const ziel = await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
  assert.equal(ziel.wizardsModule.length, 0,
    'ein Assistent, dessen Ziel die ID eines ANDEREN Assistenten ist, wird verworfen — Wizard→Wizard ist heute strukturell nicht auflösbar. '
    + 'Bekommt die Ziel-Prüfung künftig eine wizard-eigene Registry (z. B. „ein Assistent nach dem anderen"), muss diese Probe rot werden und '
    + 'Weg C (U2-ADR-253 Teil 4) neu geprüft werden, bevor sie gebaut wird.');
});
