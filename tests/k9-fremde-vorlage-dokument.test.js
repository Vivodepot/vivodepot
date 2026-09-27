'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — K9: eine fremde Vorlage darf ein Dokument erzeugen („K9 — fremde Vorlagen, Weg C", 10.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Kern der Entscheidung (Weg C): eine externe, zweistufig signierte
   Vorlage mit `wortlaut` erfüllt den dokAusgabe-Datenvertrag (U2-ADR-131)
   und läuft durch dieselbe Ausgabeschicht wie PV/Vollmacht/Betreuung/KI —
   ABER nur wenn die Signaturkette bestanden hat, und das erzeugte Blatt
   nennt die Quelle (Herkunftszeile, nicht Vivodepot).

   Regel 18, drei Proben: ohne gültige Signatur kein Dokument · mit gültiger
   Signatur eines · das Blatt trägt die Herkunftszeile, ohne sie wird die
   Probe rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';

function probeTemplate() {
  return {
    felder: [{ feldname: 'Ablageort', feldtyp: 'text', bereich: 'advanceCare' }],
    wortlaut: 'Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest. Punkt eins. Punkt zwei.',
    wortlautQuelle: { behoerde: 'Musterversicherung AG', titel: 'Vorsorge-Erklärung Muster', lizenz: 'mit Zustimmung der Musterversicherung AG' },
  };
}
async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueCert(publicKeyJwk) {
  const cs = { anbieterId: 'institution/musterversicherung', anbieterName: 'Musterversicherung AG', anbieterTyp: 'institution/versicherung', publicKeyJwk };
  return { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'], issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z', credentialSubject: cs };
}
async function importPlanMitVorlage(V, opts) {
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(probeTemplate(), anbieterSign, {});
  const importOpts = Object.assign({ jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws }, opts || {});
  return V.importPlanGeprueft('provider-credential', certJws, importOpts);
}

test('[K9] eine gültig signierte externe Vorlage mit wortlaut trägt wortlaut+wortlautQuelle+anbieterName im Plan', async () => {
  const { V } = ladeKern();
  const plan = await importPlanMitVorlage(V);
  assert.equal(plan.ungueltig, false);
  assert.equal(plan.wortlaut, probeTemplate().wortlaut);
  assert.deepEqual(plan.wortlautQuelle, probeTemplate().wortlautQuelle);
  assert.equal(plan.anbieterName, 'Musterversicherung AG');
});

test('[K9] importAnwenden legt bei wortlaut einen Eintrag in data.importierteVorlagen an', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const plan = await importPlanMitVorlage(V);
  const ergebnis = V.importAnwenden(plan, {});
  assert.equal(ergebnis.vorlageAngelegt, true);
  const liste = V.getData().importierteVorlagen;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].wortlaut, probeTemplate().wortlaut);
  assert.equal(liste[0].anbieterName, 'Musterversicherung AG');
  assert.ok(liste[0].id);
  assert.ok(liste[0].sektorId, 'sektorId aus dem ersten importierten Feld abgeleitet');
});

/* ── U2-ADR-404-Nachtrag (12.09.2026): `_planAusRoh` reichte bis heute vorlageId/vorlageVersion/
   gueltigBis/widerruf/dokument/anbieterId NICHT durch, obwohl felderAusClaims sie liefert (Kette,
   Auftrag 6, 20.08.2026) — gefunden beim Bau der Provisionierungs-Verdrahtung, nicht gesucht.
   Jeder ECHT signierte Import verlor damit seine Identität+Widerrufsfähigkeit; nur handgebaute
   Pläne (Kette-06-Suite) waren davon nie betroffen, weil sie _planAusRoh nie durchlaufen. */
test('[K9·U2-ADR-404] vorlageId/vorlageVersion/anbieterId/gueltigBis/widerruf/dokument überstehen jetzt auch den ECHTEN, signierten Pfad (importPlanGeprueft), nicht nur handgebaute Pläne', async () => {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const tplMitIdentitaet = Object.assign({}, probeTemplate(), {
    vorlageId: 'muster-vorsorge-erklaerung', version: 3, gueltigBis: '2030-01-01',
    dokument: { h1: 'Vorsorge-Erklärung' },
  });
  const templateJws = await V._signJWS(tplMitIdentitaet, anbieterSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws,
    { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(plan.ungueltig, false);
  assert.equal(plan.vorlageId, 'muster-vorsorge-erklaerung', 'vorher: still null — Identität kam nie an');
  assert.equal(plan.vorlageVersion, 3);
  assert.equal(plan.gueltigBis, '2030-01-01');
  assert.equal(plan.anbieterId, 'institution/musterversicherung');
  assert.deepEqual(plan.dokument, { h1: 'Vorsorge-Erklärung' });
});

test('[K9·U2-ADR-404·Rot-Beweis] ein über den echten Pfad importierter, versionierter Nachkauf AKTUALISIERT (nicht dupliziert) — vorher fiel das lautlos auf Wortlaut-Dedup zurück', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);

  const tplV1 = Object.assign({}, probeTemplate(), { vorlageId: 'muster-vorsorge-erklaerung', version: 1 });
  const templateJwsV1 = await V._signJWS(tplV1, anbieterSign, {});
  const plan1 = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws: templateJwsV1 });
  const erg1 = V.importAnwenden(plan1, {});
  assert.equal(erg1.vorlageAngelegt, true);

  const tplV2 = Object.assign({}, probeTemplate(), {
    wortlaut: 'Geänderter Wortlaut, Fassung 2.', vorlageId: 'muster-vorsorge-erklaerung', version: 2,
    widerruf: { grund: 'Fassung 1 enthielt einen Fehler in Punkt zwei.' },
  });
  const templateJwsV2 = await V._signJWS(tplV2, anbieterSign, {});
  const plan2 = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws: templateJwsV2 });
  const erg2 = V.importAnwenden(plan2, {});

  assert.equal(erg2.vorlageAktualisiert, true, 'vorher: vorlageAngelegt (ein zweiter, fälschlich neuer Eintrag)');
  assert.equal(erg2.vorlageWiderrufen, true, 'vorher: der mitgesendete Widerruf erreichte importAnwenden nie');
  assert.equal(V.getData().importierteVorlagen.length, 1, 'kein zweiter Eintrag');
  assert.equal(V.getData().importierteVorlagen[0].wortlaut, 'Geänderter Wortlaut, Fassung 2.');
  assert.ok(V.getData().importierteVorlagen[0].widerrufen.grund);
});

test('[K9] zweiter Import derselben Vorlage legt KEINEN zweiten Eintrag an (Dedup über Inhalt)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const plan1 = await importPlanMitVorlage(V);
  V.importAnwenden(plan1, {});
  const plan2 = await importPlanMitVorlage(V);
  const ergebnis2 = V.importAnwenden(plan2, {});
  assert.equal(ergebnis2.vorlageAngelegt, false);
  assert.equal(V.getData().importierteVorlagen.length, 1);
});

/* ── Regel 18, Probe 1: OHNE gültige Signatur entsteht KEIN Eintrag, kein Dokument ── */
test('[K9·Regel18] Vorlage OHNE gültige Signatur (falscher Anbieter-Key auf dem Cert) → kein importierteVorlagen-Eintrag', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await anbieterKeypair();
  const { privJwk: falscherPriv } = await anbieterKeypair();   // ANDERER Key als im Cert
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const falschSign = await V._jwsImportSignKey(falscherPriv);
  const templateJws = await V._signJWS(probeTemplate(), falschSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(plan.wortlaut, undefined, 'ohne gueltige Template-Signatur kein wortlaut im Plan');
  const ergebnis = V.importAnwenden(plan, {});
  assert.equal(ergebnis.vorlageAngelegt, false);
  assert.equal((V.getData().importierteVorlagen || []).length, 0);
});

/* ── Regel 18, Probe 2: MIT gültiger Signatur entsteht ein Dokument ── */
test('[K9·Regel18] Vorlage MIT gültiger Signatur → dokumentHTML erzeugt ein Blatt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1980-01-01');
  const plan = await importPlanMitVorlage(V);
  V.importAnwenden(plan, {});
  const vorlage = V.getData().importierteVorlagen[0];
  const html = V.dokumentHTML(vorlage.id, null);
  assert.match(html, /Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest/, 'der Wortlaut steht im erzeugten Blatt');
});

/* ── Regel 18, Probe 3: das Blatt trägt die Herkunftszeile, ohne sie wird die Probe rot ── */
test('[K9·Regel18] das erzeugte Blatt nennt die Quelle — Herkunftszeile trägt anbieterName UND "nicht von Vivodepot"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1980-01-01');
  const plan = await importPlanMitVorlage(V);
  V.importAnwenden(plan, {});
  const vorlage = V.getData().importierteVorlagen[0];
  const html = V.dokumentHTML(vorlage.id, null);
  assert.match(html, /Musterversicherung AG/, 'Herkunftszeile nennt die Stelle');
  assert.match(html, /nicht von Vivodepot/, 'Herkunftszeile sagt ausdrücklich: nicht von Vivodepot');
});

test('[K9] das PDF trägt denselben Wortlaut wie das Blatt (nicht nur die HTML-Ansicht)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1980-01-01');
  const plan = await importPlanMitVorlage(V);
  V.importAnwenden(plan, {});
  const vorlage = V.getData().importierteVorlagen[0];
  const zeilen = [];
  const fakeDoc = {
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
    setFont: () => {}, setFontSize: () => {}, addPage: () => {},
    splitTextToSize: (t) => [String(t)],
    text: (z) => { zeilen.push(Array.isArray(z) ? z.join(' ') : z); },
  };
  V.zeichneDokumentPdf(fakeDoc, vorlage.id, null);
  const ganzerText = zeilen.join(' | ');
  assert.match(ganzerText, /Ich, Name Vorname, lege hiermit meine Vorsorge-Erklärung fest/, 'der Wortlaut steht auch im PDF-Text');
});

test('[K9] „Dokument erzeugen"-Knopf rendert im Ziel-Sektor der Vorlage und öffnet über denselben Weg wie PV/Vollmacht', async () => {
  const { V, document: dok } = ladeKern();
  await V.depotAnlegen('K9-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1980-01-01');
  const plan = await importPlanMitVorlage(V);
  V.importAnwenden(plan, {});
  const vorlage = V.getData().importierteVorlagen[0];
  V.oeffneSektor(vorlage.sektorId);
  const knopf = dok.getElementById('content').innerHTML;
  assert.match(knopf, new RegExp('data-k9-vorlage-dokument="' + vorlage.id + '"'), 'der Knopf ist im Ziel-Sektor gerendert');
});
