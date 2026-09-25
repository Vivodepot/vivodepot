'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   D1 — Was schaltet der Ablauf eines Anbieter-Zertifikats tatsächlich ab?
   ────────────────────────────────────────────────────────────────────────────
   Strang D1 des Laufzettels „Nacht 21./22.08.2026"; Erhebung 3 des Laufzettels
   „Nach den dreizehn", deren Ergebnis ausstand.

   WARUM DIE FRAGE AM VERTRIEBSMODELL HÄNGT, wörtlich aus dem Auftrag: „Bei
   Einzelkunden braucht sonst jede und jeder einmal im Jahr eine neue Datei — und
   die Anwendung darf nicht daran erinnern, weil sie offline ist."

   DER AUFTRAG SAGT AUSDRÜCKLICH: „Am 19.08. wurde berichtet, es verschwinde
   nichts; das ist gegen den heutigen Stand zu BESTÄTIGEN, nicht zu übernehmen."
   Diese Datei übernimmt darum nichts. Sie baut ein echtes Zertifikat, lässt es
   ablaufen und misst, was danach noch da ist — am laufenden Kern, nicht am
   Quelltext.

   DIE VIER LAGEN, die im Bericht oft zu einer werden:
     A · Cert gültig                                 → geprüft
     B · Cert abgelaufen, Signatur gültig, nicht widerrufen → Schonfrist
     C · Cert widerrufen                             → Widerruf schlägt Schonfrist
     D · Cert kaputt oder fremd                      → hart ungültig
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const M = require('../tools/zertifikat-ablauf-messen.js');

/* Derselbe Sentinel-Schlüssel wie in `trust-1b-template-signatur.test.js` — ein
   Prüfstoff-Anker, nie ein Produktivschlüssel. */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

const VOR_DEM_ABLAUF = '2026-06-19T00:00:00Z';
const NACH_DEM_ABLAUF = '2028-06-19T00:00:00Z';   // liegt hinter expirationDate

function templateObjekt() {
  return { felder: [{ feldname: 'Zählpunkt', feldtyp: 'text', bereich: 'housing', gruppe: 'Energie & Erzeugung' }] };
}

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

function baueCert(publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de',
    issuanceDate: '2026-05-31T12:00:00Z',
    expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'institution/x', anbieterName: 'X',
      anbieterTyp: 'institution/sparkasse-de', publicKeyJwk },
  };
}

async function kette() {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(templateObjekt(), anbieterSign, {});
  return { V, certJws, templateJws };
}

test('[D1·Positivkontrolle] VOR dem Ablauf ist die Kette gültig und die Definition kommt an', async () => {
  /* Ohne sie wäre „nach dem Ablauf ist alles weg" nicht davon zu unterscheiden,
     dass die Kette nie etwas geliefert hat. */
  const { V, certJws, templateJws } = await kette();
  const plan = await V.importPlanGeprueft('provider-credential', certJws,
    { jetzt: VOR_DEM_ABLAUF, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(plan.ungueltig, false, 'die Kette gilt: ' + (plan.grund || ''));
  assert.equal(plan.feldDefinitionen.length, 1);
  assert.equal(plan.feldDefinitionen[0].feldId, 'tpl_zaehlpunkt');
});

test('[D1·DIE ANTWORT] NACH dem Ablauf: die geprüfte HERKUNFT fällt — der EINGETRAGENE WERT bleibt', async () => {
  /* DAS IST DIE ANTWORT AUF DIE FRAGE DES AUFTRAGS, und sie ist zweiteilig.
     Die Kette wird ungültig, das Feld wird nicht mehr NEU eingelassen. Aber ein
     Feld, das schon im Depot der Bürgerin steht, ist ein Depot-Eintrag und kein
     Zertifikatsanhängsel — es wird von keiner Cert-Prüfung berührt. */
  const { V, certJws, templateJws } = await kette();

  /* Erst das Feld einlassen, solange das Cert gilt. */
  await V.depotAnlegen('pw-d1');
  V.akteurSelbstErklaeren('Tester');
  const plan = await V.importPlanGeprueft('provider-credential', certJws,
    { jetzt: VOR_DEM_ABLAUF, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  const d = V.getData();
  d.feldDefinitionen = plan.feldDefinitionen.slice();
  V.sektorFeldSetzen('housing', plan.feldDefinitionen[0].feldId, 'DE0001234567890');

  /* Jetzt läuft das Cert ab. */
  const spaeter = await V.importPlanGeprueft('provider-credential', certJws,
    { jetzt: NACH_DEM_ABLAUF, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(spaeter.ungueltig, true, 'die geprüfte HERKUNFT fällt — ein neuer Einlass geht nicht mehr');

  /* Und das Depot: unberührt. */
  const nachher = V.getData();
  assert.equal(nachher.feldDefinitionen.length, 1, 'die Definition steht weiter im Depot');
  assert.equal(nachher.sektoren.housing[plan.feldDefinitionen[0].feldId], 'DE0001234567890',
    'DER EINGETRAGENE WERT BLEIBT — das ist die Antwort, an der das Vertriebsmodell hängt: '
    + 'niemand braucht jährlich eine neue Datei, weil kein Ablauf Daten entfernt');
});

test('[D1·Rot-Beleg] die Prüfung SIEHT den Ablauf — sonst bewiese der Test darüber nichts', async () => {
  /* Wenn `importPlanGeprueft` den Zeitpunkt gar nicht läse, wäre „nach dem
     Ablauf ungültig" ein Zufall und „der Wert bleibt" eine Trivialität. */
  const { V, certJws, templateJws } = await kette();
  const frueh = await V.importPlanGeprueft('provider-credential', certJws,
    { jetzt: VOR_DEM_ABLAUF, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  const spaet = await V.importPlanGeprueft('provider-credential', certJws,
    { jetzt: NACH_DEM_ABLAUF, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.notEqual(frueh.ungueltig, spaet.ungueltig,
    'derselbe Beleg, zwei Zeitpunkte, zwei Ergebnisse — die Zeit wird wirklich gelesen');
});

test('[D1·Die vier Lagen] Schonfrist, Veraltet-Markierung und Vorwarnung sind gebaut', () => {
  /* Die statische Hälfte der Erhebung: die vier Lagen sind im Kern
     unterscheidbar, und der Ablauf ENTFERNT nichts. Die Gegenprobe zeigt, dass
     die Suche Löschungen finden WÜRDE — sie findet nur keine in der Nähe des
     Ablaufs. */
  const m = M.messen();
  assert.equal(m.schonfristGebaut, true, 'die Schonfrist (Lage B) ist gebaut');
  assert.equal(m.veraltetStattEntfernt, true, '`_veralteteBasisVorlagen` markiert statt zu entfernen');
  assert.equal(m.vorwarnungGebaut, true, 'die Vorwarnung auf das früheste Ablaufdatum steht');
  assert.deepEqual(m.loeschungenNahAmAblauf, [],
    'kein Löschpfad in der Nähe der Ablauf-Logik');
  assert.ok(m.loeschungenGesamt > 5,
    'Gegenprobe: die Suche findet ' + m.loeschungenGesamt + ' Löschungen im Kern — '
    + 'sie ist also nicht blind');
  assert.equal(m.lagen.length, 4, 'vier unterscheidbare Lagen, nicht eine');
});
