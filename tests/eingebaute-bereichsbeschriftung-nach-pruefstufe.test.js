'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Nachtrag zu U2-ADR-331 (18.09.2026, s. Vermerk in der ADR): die Sperre gegen ein
   Depot-Modul, das die Beschriftung eines EINGEBAUTEN Bereichs setzt, hängt seit heute an der
   PRÜFSTUFE, nicht mehr am Kanal (Depot-Datei vs. Ab-Werk-Saat).

   BEIDE RICHTUNGEN, WEIL DIE EINE OHNE DIE ANDERE WERTLOS IST: ein signiertes, verifiziertes
   institutionelles Modul (die Fähigkeit, ohne die ein Modul einer fremdsprachigen Institution im
   deutschen Bürgerdepot keinen Sinn ergäbe — wörtliche Produktentscheidung, s.
   tests/vor-depot-modul-vererbung.test.js) darf die Beschriftung setzen. Ein unsigniertes oder
   nicht verifiziertes Modul weiterhin nicht — genau der Angriff, gegen den U2-ADR-331 gebaut
   wurde (s. tests/u2-adr-331-zusicherungen-nicht-ueberschreibbar.test.js, „…Wache·Kern", bleibt
   unangetastet grün).

   DER UNTERSCHIED ZUR ADR-EIGENEN PROBE: deren „Angriffsmodul" wird roh in `textsatzModule`
   geschrieben, ganz am Einlass vorbei. Hier läuft das „verifizierte" Modul durch den ECHTEN,
   signierten Weg (`modulEinlassenGeprueft`, wie in tests/depotladen-sprachwechsel-ohne-eigenes-
   modul.test.js), und das "unverifizierte" Gegenstück trägt bewusst `ungeprueft: true` — derselbe
   Marker, den `modulEinlassen` bei einer fehlgeschlagenen Signaturprüfung selbst setzt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
// S1 (20.09.2026, U2-ADR-426): gemessen wird bei aktivem Englisch — das Gerüst trägt keinen englischen Satz mehr, darum das englische Standardprodukt; Assertions unverändert.
process.env.VD_TEST_PRODUKT = 'privat-en';
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-09-18T09:00:00Z' });

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
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/eingebaute-beschriftung-pruefstufe-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

test('[Prüfstufe·Gegenprobe] ein signiertes, verifiziertes Modul setzt die Beschriftung eines eingebauten Bereichs erfolgreich', async () => {
  const V = ladeKern().V;
  await V.depotAnlegen('pruefstufe-verifiziert-pw-1!');
  V.akteurSelbstErklaeren('Verifiziert-Probe');
  const eingebaut = V.BEREICH_IDS_EINGEBAUT[0];
  const modul = {
    modulTyp: 'textsatz', moduleVersion: 1, sprache: 'hu', herkunft: 'pruefstufe-verifiziert-modul',
    texte: { [eingebaut + '.label']: 'Verifizierte Übersetzung' },
  };
  const buendel = await signiertesBuendel(V, modul);
  const r = await V.modulEinlassenGeprueft(JSON.stringify(buendel), null, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das signierte Modul muss angenommen werden — ' + JSON.stringify(r));
  V._moduleEinlassWirken(r);
  assert.equal(V.getData().textsatzModule[0].ungeprueft, false,
    'Vorbedingung: der Einlassweg muss das Modul als verifiziert markieren — sonst prüft dieser Test gar nicht die Prüfstufe');
  V.getData().textsprache = 'hu';
  V._textsatzModuleAusDepotAnmelden(V.getData());
  assert.equal(V.textLesen(eingebaut + '.label'), 'Verifizierte Übersetzung',
    'ein Modul, dessen Signaturkette tatsächlich verifiziert wurde, darf die Beschriftung eines eingebauten Bereichs setzen — sonst bleibt die Fähigkeit tot, die eine fremdsprachige Institution im deutschen Bürgerdepot braucht');
});

test('[Prüfstufe·Rot-Beweis] ein NICHT verifiziertes Modul wird weiterhin abgewiesen, auch wenn es sich als Depot-Modul ausgibt', () => {
  const V = ladeKern().V;
  const eingebaut = V.BEREICH_IDS_EINGEBAUT[0];
  const d = V.leeresDepot();
  d.textsprache = 'hu';
  // Bewusst OHNE modulEinlassenGeprueft — dasselbe Muster wie U2-ADR-331s eigener „Angriffsmodul"-
  // Test, nur mit dem Marker, den ein ECHTER fehlgeschlagener Einlass hinterlassen würde.
  d.textsatzModule = [{
    modulTyp: 'textsatz', moduleVersion: 1, sprache: 'hu', herkunft: 'pruefstufe-unverifiziert-modul',
    ungeprueft: true,
    texte: { [eingebaut + '.label']: 'GEKAPERT' },
  }];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.notEqual(V.textLesen(eingebaut + '.label'), 'GEKAPERT',
    'ROT ERWARTET, wenn falsch: ein unverifiziertes Modul darf die Beschriftung eines eingebauten Bereichs nicht kapern — die Prüfstufen-Unterscheidung muss auf beiden Seiten greifen, nicht nur auf der Erlaubnis-Seite');
});

test('[Prüfstufe·Rückwärtskompatibel] das bestehende Fach (z. B. die englische Ab-Werk-Fassung) wird bei einem unverifizierten Angriff nicht gelöscht', () => {
  const eingebaut = ladeKern().V.BEREICH_IDS_EINGEBAUT[0];
  // Baseline OHNE Angriffsmodul — derselbe Gegenprobe-Kunstgriff wie in U2-ADR-331s eigenem
  // Wache·Kern-Test (`messung(false)` vs `messung(true)`): erst messen, was die englische
  // Ab-Werk-Fassung tatsächlich ist, dann denselben Aufbau mit dem Angriff wiederholen.
  const ohneAngriff = ladeKern().V;
  const dOhne = ohneAngriff.leeresDepot();
  dOhne.textsprache = 'en';
  ohneAngriff.setData(dOhne);
  ohneAngriff._textsatzModuleAusDepotAnmelden(dOhne);
  const bekannteEnglischeBeschriftung = ohneAngriff.textLesen(eingebaut + '.label');
  assert.ok(typeof bekannteEnglischeBeschriftung === 'string' && bekannteEnglischeBeschriftung.length > 2,
    'Vorbedingung: der eingebaute Bereich hat auch auf Englisch eine Beschriftung — sonst prüft der Vergleich unten zwei leere Zeichenketten gegeneinander');

  const V = ladeKern().V;
  const d = V.leeresDepot();
  d.textsprache = 'en';
  d.textsatzModule = [{
    modulTyp: 'textsatz', moduleVersion: 1, sprache: 'en', herkunft: 'pruefstufe-unverifiziert-loeschversuch',
    ungeprueft: true,
    texte: { [eingebaut + '.label']: 'GEKAPERT' },
  }];
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.equal(V.textLesen(eingebaut + '.label'), bekannteEnglischeBeschriftung,
    'ein Verwerfen allein wäre eine Löschung — die amtliche Ab-Werk-Fassung muss stehen bleiben, nicht leer werden');
});
