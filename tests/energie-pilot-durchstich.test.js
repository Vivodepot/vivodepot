'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Block 4: Energie-Pilot end-to-end durch die volle Pipeline (Durchstich)
   ────────────────────────────────────────────────────────────────────────
   Ein realistisches Energie-Template (5 Felder, 4 Typen, Bereich „Wohnen",
   Abschnitt „Energie & Erzeugung") reist durch ALLE vier Komponenten:
     Generator signiert (Test-Anbieter-Key, Selbst-Check) → Issuer bündelt
     (Sentinel-TA) → Bürger-App teilt das Bundle auf, prüft zweistufig + 1C +
     übersetzt + rendert → Lese-App spiegelt den Energie-Abschnitt.
   Beweist u. a.: jaNein→auswahl, auswahl+codeWerte→optionen, zahl/datum durch,
   Bereich-Label „Wohnen"→sektorId über alle vier Komponenten, die Schlüssel-Kette
   (Generator-Selbst-Check ↔ Cert-publicKeyJwk ↔ Template-Signaturprüfung).
   Reiner Durchstich: kein Produktiv-Code, Test-Anbieter-Key, Sentinel als TA.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';

// Das Energie-Template im Generator-Vokabular: 5 Felder, 4 Typen.
const ENERGIE_FELDER = [
  { feldname: 'Zählpunkt', feldtyp: 'text', pflicht: false, bereich: 'housing', gruppe: 'Energie & Erzeugung' },
  { feldname: 'PV-Leistung (kWp)', feldtyp: 'zahl', pflicht: false, bereich: 'housing', gruppe: 'Energie & Erzeugung' },
  { feldname: 'Inbetriebnahme', feldtyp: 'datum', pflicht: false, bereich: 'housing', gruppe: 'Energie & Erzeugung' },
  { feldname: 'Einspeisung vorhanden', feldtyp: 'jaNein', pflicht: false, bereich: 'housing', gruppe: 'Energie & Erzeugung' },
  { feldname: 'Einspeise-Art', feldtyp: 'auswahl', pflicht: false, bereich: 'housing', gruppe: 'Energie & Erzeugung',
    codeWerte: [{ code: 'voll', anzeige: 'Volleinspeisung' }, { code: 'ueberschuss', anzeige: 'Überschusseinspeisung' }] },
];

test('Block 4 — Energie-Pilot: end-to-end durch alle vier Komponenten', async () => {
  // 0) EIN Test-Anbieter-Keypair (Generator signiert, Issuer zertifiziert denselben Public-Key).
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);

  // 1) GENERATOR signiert das Template (baueSubmissionSigniert prüft selbst gegen publicKeyJwk).
  const { V: G } = ladeGenerator();
  const anbieter = G.baueAnbieter({
    anbieterName: 'Stadtwerke Musterstadt', rechtsform: 'GmbH', ustId: 'DE123456789',
    strasse: 'Energieweg 1', plz: '12345', ort: 'Musterstadt', land: 'Deutschland',
    kontaktName: 'E. Werk', kontaktFunktion: 'Datenstelle', kontaktEmail: 'daten@stadtwerke-musterstadt.example.de',
    kontaktTelefon: '+49 30 1234567', bereich: 'housing',
    useCase: 'Energie-Stammdaten (PV/Einspeisung/Zählpunkt) zur Übernahme ins Bürger-Depot — Pilot.',
  });
  const submission = await G.baueSubmissionSigniert(
    { anbieter, publicKeyJwk: pubJwk, felder: ENERGIE_FELDER, ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false },
    privJwk
  );
  assert.ok(submission.templatesJws && submission.templatesJws[0], 'Generator: templateJws erzeugt (Selbst-Check bestanden)');
  assert.equal(submission.templates[0].felder.length, 5, 'fünf Felder im Template');

  // 2) ISSUER bündelt: Cert (Sentinel-TA-signiert) + templateJws separat, Plain-template additiv im Cert.
  const { V: I } = ladeIssuer();
  const d = I.submissionZuAnbieterDaten(submission);
  const vc = I.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, templates: d.templates,
    issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
  });
  const taSign = await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const certJws = await I.stelleProviderCredentialAus(vc, taSign);
  const bundle = I.baueAuslieferungsBundle(certJws, d.templatesJws[0]);
  assert.ok(bundle.providerCredentialJws && bundle.templateJws, 'Issuer: Bundle mit Cert + templateJws');

  // 3) BÜRGER-APP: Bundle aufteilen → zweistufig prüfen (Anker + Anbieter-Sig) + 1C + übersetzen.
  const { V: B } = ladeKern();
  const teil = B._importEingabeAufteilen(JSON.stringify(bundle));
  const plan = await B.importPlanGeprueft('provider-credential', teil.text,
    Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  assert.equal(plan.ungueltig, false, 'Bürger-App: gültige zweistufige Kette: ' + (plan.grund || ''));
  assert.equal(plan.feldDefinitionen.length, 5, 'fünf Definitionen übernommen');

  const byId = {}; for (const x of plan.feldDefinitionen) byId[x.feldId] = x;
  assert.equal(byId['tpl_einspeisung_vorhanden'].typ, 'auswahl', 'jaNein → auswahl');
  assert.equal(byId['tpl_einspeisung_vorhanden'].optionen.length, 2, 'ja/nein-Optionen');
  assert.equal(byId['tpl_einspeise_art'].typ, 'auswahl', 'auswahl bleibt auswahl');
  assert.ok(byId['tpl_einspeise_art'].optionen.some(o => o.label === 'Volleinspeisung'), 'codeWerte → optionen');
  assert.equal(byId['tpl_pv_leistung_kwp'].typ, 'zahl', 'zahl durch');
  assert.equal(byId['tpl_inbetriebnahme'].typ, 'datum', 'datum durch');
  assert.equal(byId['tpl_zaehlpunkt'].typ, 'text', 'text durch');
  assert.ok(plan.feldDefinitionen.every(x => x.sektorId === 'housing'), 'Bereich „Wohnen" → sektorId wohnen (alle vier Komponenten)');
  assert.ok(plan.feldDefinitionen.every(x => x.abschnitt === 'Energie & Erzeugung'), 'Abschnitt durchgereicht');

  // 3b) Anwenden + Werte + Bürger-App-Render (Stufe 3).
  await B.depotAnlegen('Korrekt-Pferd-Batterie-Heftklammer-9');
  B.akteurSelbstErklaeren('Pilot');
  B.importAnwenden(plan, {});
  B.sektorFeldSetzen('housing', 'tpl_zaehlpunkt', 'DE0001234567890', { eingabeArt: 'eingabe' });
  B.sektorFeldSetzen('housing', 'tpl_einspeise_art', 'voll', { eingabeArt: 'eingabe' });
  const bHtml = B.templateAbschnitteHTML(B._templateAbschnitte('housing'), 'housing', true);
  assert.ok(bHtml.includes('Energie & Erzeugung') || bHtml.includes('Energie &amp; Erzeugung'), 'Bürger-App rendert den Energie-Abschnitt');
  assert.ok(bHtml.includes('Volleinspeisung'), 'Bürger-App zeigt die auswahl-Option-Labels (hat optionen)');

  const depot = {
    schemaVersion: 23, feldDefinitionen: JSON.parse(JSON.stringify(plan.feldDefinitionen)),
    sektoren: { housing: { tpl_zaehlpunkt: 'DE0001234567890', tpl_pv_leistung_kwp: '9.8', tpl_einspeise_art: 'voll' } },
    menschen: [], urheberschaft: {}, mappe: [],
  };
  const { V: L } = ladeLesen();
  L.setData(depot);
  const lHtml = L.sektorHTML('housing');
  assert.ok(lHtml.includes('Energie & Erzeugung') || lHtml.includes('Energie &amp; Erzeugung'), 'Lese-App spiegelt den Energie-Abschnitt');
  assert.ok(lHtml.includes('Zählpunkt') && lHtml.includes('DE0001234567890'), 'Lese-App zeigt Feld + Wert aus dem geteilten Slot');
  /* GEAENDERT AM 17.08.2026, und die alte Zusicherung war der Bug: hier stand
     „Lese-App zeigt auswahl als Rohwert (keine Label-Aufloesung, bewusst)". Bewusst war
     daran nichts — `_tplDefAlsFeld` liess `optionen` und `codeSystemId` fallen, und der
     Empfaenger las die Kennung, waehrend die Buergerin die Bezeichnung sah (A276,
     Auftrag „Die Empfaengerseite", Zug 1). Beide Seiten zeigen jetzt dasselbe. */
  assert.ok(lHtml.includes('Volleinspeisung'),
    'Lese-App loest das auswahl-Label auf — dieselbe Anzeige wie in der Bürger-App');
});
