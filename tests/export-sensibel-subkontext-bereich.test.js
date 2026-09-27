'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-188 — der Export „ohne sensible Daten" hält auch ein im Sub-Kontext
   angedocktes sensibles Feld zurück
   ────────────────────────────────────────────────────────────────────────
   Fund (01.09.2026), live gemessen gegen den ausgelieferten v487-Stand
   (vor diesem Fix): subKontextBetreten() tauscht `data`, ohne
   `_BEREICHS_MODUL_REGISTRY` neu aufzubauen (derselbe Befund wie Paar A in
   registry-folgt-data.test.js — hier seine sicherheitsrelevante Folge, nicht
   nur eine Anzeigelücke). `vollExportJSON({sensibel:false})`s gesamte
   Rückhaltung — eingebaute UND angedockte Felder gleichermaßen
   (vivodepot.html:18729 ff., „DIE ANGEDOCKTEN FELDER DESSELBEN BEREICHS",
   A359 Fund 1) — läuft innerhalb von `for (const s of bereicheAlle())`.
   Fehlt ein Bereich in `bereicheAlle()`, wird seine gesamte innere Prüfung
   nie erreicht — ein Feld, das die Bürgerin ausdrücklich als sensibel
   markiert hat, geht dann im „ohne sensible Daten"-Export mit heraus.

   Vorlage: das Mess-Skript der ursprünglichen Erhebung (messung-subkontext-export.js, Scratch-Bereich,
   nicht im Repo) — hier als versionierter Wächter übertragen, nicht
   kopiert: der Bereichs-Einlass läuft über die volle Signaturkette
   (modulEinlassenGeprueft + _moduleEinlassWirken, derselbe reale Weg wie
   in registry-folgt-data.test.js), statt über den ungeprüften
   V.modulEinlassen() des Messskripts. Die Feld-Definition selbst bleibt
   direkte Datenzuweisung (data.feldDefinitionen[]) — dieselbe Form, die der
   Template-Import erzeugt und die tests/bereichs-module-einlass.test.js
   (A389) bereits so aufbaut; für Feld-Definitionen gibt es keinen zweiten,
   signierten Einlassweg neben den fünf Modul-Registern.

   ROT-BEWEIS PFLICHT (Auflage, 01.09.2026), ZWEITE RUNDE: die erste
   Fassung hatte zwischen dem Wiedereintritt und dem Export ein hartes
   `assert.ok` auf bereicheAlle() stehen ("Vorbedingung") — ohne den
   Registry-Fix fiel DAS zuerst, und die Export-Zeile wurde nie erreicht.
   Bewiesen war damit nur, dass der Test auf den Registerfehler anspringt,
   NICHT, dass die Export-Zusicherung selbst je scharf ist — zu Recht
   zurückgewiesen. Die Vorbedingung ist jetzt eine reine Diagnose
   (`subberufInRegistry`, in die Fehlermeldung gewandert, kein `assert`
   mehr, das den Lauf abbricht) — Test-Umbau, kein Produktcode angefasst.

   Damit lief der Rot-Beweis sauber: Registry-Nachzug aus
   subKontextBetreten() entfernt, Lauf gezeigt — GENAU die Export-Zeile
   fällt („SUB-KONTEXT GEHEIMWERT" an Position 325 statt -1,
   subberufInRegistry=false in der Meldung), die Positivkontrolle blieb im
   selben Lauf korrekt abwesend (der Export selbst also nicht tot, nur
   dieser eine Bereich unerreicht). Aufruf wiederhergestellt, wieder grün.
   Protokoll im Bericht.

   Positivkontrolle im SELBEN Lauf, SELBEN Export-Aufruf (Auflage der ursprünglichen Erhebung): ein
   eingebautes sensibles Feld (`ks_erstehilfe_ort`, vivodepot.html:12551,
   sensibel:true), ebenfalls im Sub-Kontext gesetzt, muss abwesend bleiben —
   ohne sie bewiese ein grüner Test nichts (ein toter Export wäre am
   Sub-Feld ebenfalls „grün").
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
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-09-01T09:00:00Z' });
const ANKER_PW = 'export-sensibel-subkontext-anker-1!';
const SUB_PW = 'export-sensibel-subkontext-sub-1!';

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
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/export-sensibel-subkontext-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

test('[U2-ADR-188·Sicherheit] Export „ohne sensible Daten" hält ein im Sub-Kontext angedocktes sensibles Feld zurück', async () => {
  const V = kern();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Anker Person');

  const eintrag = await V.subDepotAnlegen({ bezeichnung: 'Sub Testperson', inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  V.subKontextBetreten(eintrag.depotUUID);
  V.akteurSelbstErklaeren('Verwalterin');
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: im Sub-Kontext');

  // Eigenes Bereichs-Modul, ECHTER signierter Einlassweg — derselbe wie in
  // registry-folgt-data.test.js, kein Direktaufruf einer Registry-Funktion.
  const bereichsModul = { modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'probe-subkontext', bereiche: { subberuf: { label: 'Sub-Berufsdaten' } } };
  const buendel = await signiertesBuendel(V, bereichsModul);
  const rBereich = await V.modulEinlassenGeprueft(JSON.stringify(buendel), null, OPTS);
  assert.equal(rBereich.angenommen, true, 'Vorbedingung: das Bereichs-Modul muss angenommen werden — ' + JSON.stringify(rBereich));
  V._moduleEinlassWirken(rBereich);
  assert.ok(V.bereicheAlle().some((b) => b.id === 'subberuf'), 'Vorbedingung: subberuf wirkt (Paar A, bereits in registry-folgt-data.test.js geprüft)');

  // Feld-Definition für den angedockten Bereich — dieselbe Form wie der Template-Import
  // erzeugt (tests/bereichs-module-einlass.test.js, A389), kein zweiter signierter Weg.
  const d = V.getData();
  d.feldDefinitionen = (d.feldDefinitionen || []).concat([
    { sektorId: 'subberuf', feldId: 'tpl_geheim', typ: 'text', label: 'Geheimes Sub-Feld', sensibel: true },
  ]);
  d.sektoren.subberuf = d.sektoren.subberuf || {};
  d.sektoren.subberuf.tpl_geheim = 'SUB-KONTEXT GEHEIMWERT';
  // Positivkontrolle: ein eingebautes sensibles Feld, ebenfalls im Sub-Kontext gesetzt.
  d.sektoren.emergencyPreparedness = d.sektoren.emergencyPreparedness || {};
  d.sektoren.emergencyPreparedness.firstAidKitStorageLocation = 'KONTROLLWERT MUSS VERSCHWINDEN';
  V.setData(d);

  /* Verlassen und NEU betreten, VOR dem Export: _moduleEinlassWirken() (oben, beim Andocken)
     ruft selbst schon einen Registry-Nachzug — ein Export DIREKT nach dem Andocken wäre also
     grün, ob subKontextBetreten() seine eigene Zusage hält oder nicht (Selbstheilung durchs
     Andocken selbst, keine Probe auf subKontextBetreten()). Das Risiko, das die ursprüngliche Erhebung gemessen hat,
     ist das REALISTISCHERE: eine Verwalterin dockt an, verlässt den Sub, kommt später zurück
     (neue Sitzung oder einfach Navigation) — GENAU DANN muss subKontextBetreten() selbst die
     Registry aus dem bereits im Sub stehenden Modul neu aufbauen. */
  await V.subKontextVerlassen();
  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  V.subKontextBetreten(eintrag.depotUUID);
  /* Auflage (01.09.2026): die Export-Prüfung unten muss UNABHÄNGIG von dieser
     Diagnose fallen können — sonst ist nie bewiesen, dass die Export-Zeile selbst scharf ist,
     nur dass die Registry es ist (Rot-Beweis-Kritik, zweite Runde). Darum hier bewusst KEIN
     hartes assert.ok mehr: nur eine Diagnose, die in die Fehlermeldung unten wandert. Ein
     `assert.ok` an dieser Stelle bräche den Lauf ab, bevor der Export überhaupt erreicht wird —
     genau das Risiko, das die ursprüngliche Erhebung mißt, würde dann nie an seiner eigenen Zeile geprüft. */
  const subberufInRegistry = V.bereicheAlle().some((b) => b.id === 'subberuf');

  const voll = V.vollExportJSON({ sensibel: false });
  const roh = JSON.stringify(voll);

  assert.equal(roh.indexOf('KONTROLLWERT MUSS VERSCHWINDEN'), -1,
    'Positivkontrolle: ein eingebautes sensibles Feld muss abwesend sein — sonst ist der Export selbst tot, und die Probe unten beweist nichts');
  assert.equal(roh.indexOf('SUB-KONTEXT GEHEIMWERT'), -1,
    'ohne den Registry-Fix stünde der Geheimwert im Klartext im Export — bereicheAlle() kannte subberuf nicht (subberufInRegistry=' + subberufInRegistry
    + '), die Sensibel-Rückhaltung (vivodepot.html:18729 ff.) lief für diesen Bereich nie');
});
