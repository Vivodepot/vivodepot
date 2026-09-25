'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin. Teil des Template-/Trust-Authority-Mechanismus - Lizenz siehe LICENSE, Teil 1.
/* ════════════════════════════════════════════════════════════════════════
   zertifikat-slot-messen.js — Zug 2a: die Form des Belegs
   ────────────────────────────────────────────────────────────────────────
   ANLASS: Entscheidung A337 (19.08.2026) — der signierte Beleg reist im Depot
   mit, damit ein Empfänger ihn nachprüfen kann. **Nicht mitentschieden ist,
   WAS genau mitreist.** Das ist zu messen, BEVOR die Migrationsstufe
   geschrieben wird: ein nachgereichtes Stück wäre eine zweite Stufe, und
   genau die soll die Entscheidung verhindern.

   DREI FRAGEN, in der Reihenfolge des Auftrags:
     1 · Reicht `templateJws` allein, damit gegen den Anker geprüft werden kann
         — oder braucht es das Anbieter-Zertifikat als eigenes Stück?
     2 · Was kostet der Beleg an Dateigröße, je Vorlage und hochgerechnet?
     3 · Gibt es eine kürzere Form, die dieselbe Prüfung trägt — was liesse
         sie weg?

   Diese Datei MISST und ändert keine Zeile Produktcode.

   Aufruf:
     node tools/zertifikat-slot-messen.js
     node tools/zertifikat-slot-messen.js --json
   ════════════════════════════════════════════════════════════════════════ */
const { webcrypto } = require('node:crypto');
const path = require('node:path');

const ALS_JSON = process.argv.includes('--json');
const REPO = path.join(__dirname, '..');
const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
const { ladeGenerator } = require(path.join(REPO, 'tests', 'load-generator.js'));
const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-19T00:00:00Z';

const bytes = (s) => Buffer.byteLength(typeof s === 'string' ? s : JSON.stringify(s), 'utf8');
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

/* Eine Vorlage in realistischer Grösse. Der Wortlaut ist das, was ein
   Dokumentgenerator später setzt — er treibt die Grösse mit. */
function felderBauen(anzahl, praefix) {
  const f = [];
  for (let i = 1; i <= anzahl; i++) {
    f.push({ feldname: praefix + ' Angabe ' + i, feldtyp: (i % 4 === 0 ? 'datum' : 'text'),
      bereich: 'bildung', gruppe: praefix + '-Abschnitt' });
  }
  return f;
}

(async () => {
  const r = { frage1: {}, frage2: {}, frage3: {} };
  const { V: G } = ladeGenerator();
  const { V: I } = ladeIssuer();
  const { V: B } = ladeKern();

  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);

  const anbieter = G.baueAnbieter({
    anbieterName: 'Rechtsanwaltskammer Musterstadt', rechtsform: 'KdöR', ustId: 'DE987654321',
    strasse: 'Kammerweg 1', plz: '54321', ort: 'Musterstadt', land: 'Deutschland',
    kontaktName: 'K. Ammer', kontaktFunktion: 'Geschaeftsstelle', kontaktEmail: 'stelle@rak-musterstadt.example',
    kontaktTelefon: '+49 30 7654321', bereich: 'bildung',
    useCase: 'Messung Zug 2a — Form des Belegs. Kein Feldsatz, keine Anforderung.',
  });

  /* MIT `wortlaut`, und das ist kein Beiwerk: `importierteVorlagen[]` entsteht nur,
     wenn `plan.wortlaut && plan.wortlautQuelle` gesetzt sind (`vivodepot.html:18451`).
     Eine reine FELD-Vorlage legt gar keinen Eintrag an — der Zertifikat-Slot hätte
     dort keinen Träger. Der erste Messversuch ohne Wortlaut meldete darum `null`
     statt einer Grösse; das war kein Befund, sondern ein Messfehler. */
  const WORTLAUT = 'Muster-Wortlaut einer Fortbildungsbescheinigung. '.repeat(20);
  const WORTLAUT_QUELLE = Object.freeze({
    behoerde: 'Rechtsanwaltskammer Musterstadt',
    titel: 'Muster-Fortbildungsbescheinigung',
    lizenz: '§ 5 UrhG',
  });
  async function bundelFuer(felder, mitWortlaut) {
    const sub = await G.baueSubmissionSigniert(
      Object.assign({ anbieter, publicKeyJwk: pubJwk, felder },
        mitWortlaut === false ? {} : { wortlaut: WORTLAUT, wortlautQuelle: WORTLAUT_QUELLE }),
      privJwk);
    const d = I.submissionZuAnbieterDaten(sub);
    const vc = I.baueProviderVC({
      anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
      publicKeyJwk: d.publicKeyJwk, templates: d.templates,
      issuanceDate: '2026-08-01T12:00:00Z', expirationDate: '2027-08-01T12:00:00Z',
    });
    const taSign = await I._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
    const certJws = await I.stelleProviderCredentialAus(vc, taSign);
    return { bundle: I.baueAuslieferungsBundle(certJws, d.templatesJws[0]), certJws, templateJws: d.templatesJws[0] };
  }

  /* ── Frage 1 · Reicht `templateJws` allein? ───────────────────────────── */
  const fuenf = await bundelFuer(felderBauen(5, 'Qualifikation'));

  // (a) volles Bündel gegen den Anker — der Anker-Fall, ohne den nichts zählt.
  const teilVoll = B._importEingabeAufteilen(JSON.stringify(fuenf.bundle));
  const planVoll = await B.importPlanGeprueft('provider-credential', teilVoll.text,
    Object.assign({}, teilVoll.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  r.frage1.vollesBuendelGueltig = !planVoll.ungueltig;
  r.frage1.vollesBuendelGrund = planVoll.grund || null;

  // (b) NUR templateJws, ohne das Zertifikat.
  let nurTemplate = null;
  try {
    const teil = B._importEingabeAufteilen(JSON.stringify({ templateJws: fuenf.templateJws }));
    const p = await B.importPlanGeprueft('provider-credential', teil.text,
      Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
    nurTemplate = { gueltig: !p.ungueltig, grund: p.grund || null,
      definitionen: (p.feldDefinitionen || []).length, wortlaut: !!p.wortlaut };
  } catch (e) { nurTemplate = { gueltig: false, grund: e.name + ': ' + String(e.message).slice(0, 90) }; }
  r.frage1.nurTemplateJws = nurTemplate;

  // (c) NUR das Zertifikat, ohne templateJws.
  let nurCert = null;
  try {
    const teil = B._importEingabeAufteilen(JSON.stringify({ providerCredentialJws: fuenf.certJws }));
    const p = await B.importPlanGeprueft('provider-credential', teil.text,
      Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
    nurCert = { gueltig: !p.ungueltig, grund: p.grund || null,
      definitionen: (p.feldDefinitionen || []).length, wortlaut: !!p.wortlaut };
  } catch (e) { nurCert = { gueltig: false, grund: e.name + ': ' + String(e.message).slice(0, 90) }; }
  r.frage1.nurCertJws = nurCert;

  /* Wo steckt der öffentliche Anbieter-Schlüssel? Das ist die Sachfrage hinter
     Frage 1: ohne ihn ist `templateJws` nicht prüfbar, und er steht im Cert. */
  const certPayload = JSON.parse(Buffer.from(fuenf.certJws.split('.')[1], 'base64url').toString('utf8'));
  const tplPayload = JSON.parse(Buffer.from(fuenf.templateJws.split('.')[1], 'base64url').toString('utf8'));
  const certText = JSON.stringify(certPayload);
  r.frage1.pubKeyImCert = certText.includes(pubJwk.x);
  r.frage1.pubKeyImTemplateJws = JSON.stringify(tplPayload).includes(pubJwk.x);

  /* ── Frage 2 · Was kostet der Beleg? ──────────────────────────────────── */
  r.frage2.proVorlage = {
    templateJws: bytes(fuenf.templateJws),
    providerCredentialJws: bytes(fuenf.certJws),
    beide: bytes(fuenf.templateJws) + bytes(fuenf.certJws),
  };
  // Der heutige Eintrag ohne Beleg — der Vergleichsmassstab.
  await B.depotAnlegen('Zug2a-Messung-Passwort-2026!');
  B.akteurSelbstErklaeren('Messung');
  B.importAnwenden(planVoll, {});
  const eintrag = (B.getData().importierteVorlagen || [])[0] || null;
  r.frage2.eintragHeuteOhneBeleg = eintrag ? bytes(eintrag) : null;
  r.frage2.eintragFelder = eintrag ? Object.keys(eintrag) : [];

  /* Die Gegenprobe, die den Slot in Frage stellt: eine reine FELD-Vorlage ohne
     Wortlaut — genau die Sorte, die ein Berufsmodul mitbringt (A344). */
  const ohneWortlaut = await bundelFuer(felderBauen(5, 'NurFelder'), false);
  const tO = B._importEingabeAufteilen(JSON.stringify(ohneWortlaut.bundle));
  const pO = await B.importPlanGeprueft('provider-credential', tO.text,
    Object.assign({}, tO.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
  const vorher = (B.getData().importierteVorlagen || []).length;
  B.importAnwenden(pO, {});
  const nachher = (B.getData().importierteVorlagen || []).length;
  r.frage2.feldVorlageOhneWortlaut = {
    planGueltig: !pO.ungueltig, definitionen: (pO.feldDefinitionen || []).length,
    eintragEntstanden: nachher > vorher,
  };

  // Grössenabhängigkeit: wie stark wächst der Beleg mit der Zahl der Felder?
  r.frage2.reihe = [];
  for (const n of [5, 20, 50]) {
    const b = await bundelFuer(felderBauen(n, 'Q' + n));
    r.frage2.reihe.push({ felder: n, templateJws: bytes(b.templateJws), certJws: bytes(b.certJws),
      beide: bytes(b.templateJws) + bytes(b.certJws) });
  }

  // Hochrechnung gegen ein echtes Depot.
  const umschlag = await B.depotSerialisieren();
  const depotBytes = bytes(JSON.stringify(umschlag));
  r.frage2.depotHeute = depotBytes;
  r.frage2.hochrechnung = [1, 3, 6].map(n => ({
    vorlagen: n,
    belegBytes: n * r.frage2.proVorlage.beide,
    anteilAmDepot: ((n * r.frage2.proVorlage.beide) / depotBytes * 100).toFixed(0) + ' %',
  }));

  /* ── Frage 3 · Gibt es eine kürzere Form? ─────────────────────────────── */
  /* Der Beleg ist eine SIGNATUR über einen Inhalt. Wegzulassen ist nur, was
     nicht signiert wurde — alles andere bricht die Prüfung. Gemessen wird
     darum, WAS im signierten Inhalt steht und wieviel davon das Depot ohnehin
     schon trägt. */
  r.frage3.templatePayloadSchluessel = Object.keys(tplPayload);
  r.frage3.certPayloadSchluessel = Object.keys(certPayload);
  const tplInnen = tplPayload.template || tplPayload.vc || tplPayload;
  r.frage3.templateInnenSchluessel = (tplInnen && typeof tplInnen === 'object') ? Object.keys(tplInnen) : [];
  r.frage3.certTraegtTemplate = certText.includes('"felder"') || certText.includes('"template"');
  r.frage3.felderDoppelt = r.frage3.certTraegtTemplate;

  // Rot-Beleg zur Unkürzbarkeit: ein um EIN Zeichen gekürzter JWS darf nicht prüfen.
  let gekuerztPrueft = null;
  try {
    const kaputt = fuenf.templateJws.slice(0, -1);
    const teil = B._importEingabeAufteilen(JSON.stringify(
      I.baueAuslieferungsBundle(fuenf.certJws, kaputt)));
    const p = await B.importPlanGeprueft('provider-credential', teil.text,
      Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK }));
    gekuerztPrueft = { gueltig: !p.ungueltig, grund: p.grund || null };
  } catch (e) { gekuerztPrueft = { gueltig: false, grund: e.name }; }
  r.frage3.umEinZeichenGekuerzt = gekuerztPrueft;

  if (ALS_JSON) { console.log(JSON.stringify(r, null, 2)); return; }

  const ja = (x) => x === true ? 'JA' : (x === false ? 'NEIN' : 'unklar');
  console.log('Zug 2a — die Form des Belegs, gemessen\n');

  console.log('FRAGE 1 · Reicht `templateJws` allein?');
  console.log('  volles Bündel (Anker-Fall):      ' + ja(r.frage1.vollesBuendelGueltig)
    + (r.frage1.vollesBuendelGrund ? '  (' + r.frage1.vollesBuendelGrund + ')' : ''));
  console.log('  NUR templateJws:                 ' + ja(r.frage1.nurTemplateJws.gueltig)
    + ', ' + r.frage1.nurTemplateJws.definitionen + ' Definitionen'
    + '  (' + (r.frage1.nurTemplateJws.grund || '—') + ')');
  console.log('  NUR providerCredentialJws:       ' + ja(r.frage1.nurCertJws.gueltig)
    + ', ' + r.frage1.nurCertJws.definitionen + ' Definitionen, Wortlaut: ' + ja(r.frage1.nurCertJws.wortlaut)
    + '  (' + (r.frage1.nurCertJws.grund || '—') + ')');
  console.log('  Anbieter-Public-Key steckt im Zertifikat: ' + ja(r.frage1.pubKeyImCert)
    + ' · im templateJws: ' + ja(r.frage1.pubKeyImTemplateJws));

  console.log('\nFRAGE 2 · Was kostet er?');
  console.log('  heutiger Eintrag OHNE Beleg:     ' + r.frage2.eintragHeuteOhneBeleg + ' B'
    + '  (Felder: ' + r.frage2.eintragFelder.join(', ') + ')');
  console.log('  Beleg je Vorlage (5 Felder):     templateJws ' + r.frage2.proVorlage.templateJws
    + ' B · Zertifikat ' + r.frage2.proVorlage.providerCredentialJws
    + ' B · zusammen ' + r.frage2.proVorlage.beide + ' B (' + kb(r.frage2.proVorlage.beide) + ')');
  const fv = r.frage2.feldVorlageOhneWortlaut;
  console.log('  reine FELD-Vorlage ohne Wortlaut: Plan gültig ' + ja(fv.planGueltig)
    + ', ' + fv.definitionen + ' Definitionen — Eintrag entstanden: ' + ja(fv.eintragEntstanden));
  console.log('  Wachstum mit der Feldzahl:');
  for (const z of r.frage2.reihe) {
    console.log('        ' + String(z.felder).padStart(3) + ' Felder: templateJws ' + String(z.templateJws).padStart(6)
      + ' B · Zertifikat ' + String(z.certJws).padStart(6) + ' B · zusammen ' + String(z.beide).padStart(6) + ' B');
  }
  console.log('  Depot heute (v3-Umschlag):       ' + depotBytes + ' B (' + kb(depotBytes) + ')');
  for (const h of r.frage2.hochrechnung) {
    console.log('        ' + h.vorlagen + ' Vorlage(n): ' + h.belegBytes + ' B = ' + h.anteilAmDepot + ' des heutigen Depots');
  }

  console.log('\nFRAGE 3 · Gibt es eine kürzere Form?');
  console.log('  templateJws-Payload-Schlüssel:   ' + r.frage3.templatePayloadSchluessel.join(', '));
  console.log('  darin (template/vc):             ' + r.frage3.templateInnenSchluessel.join(', '));
  console.log('  Zertifikat-Payload-Schlüssel:    ' + r.frage3.certPayloadSchluessel.join(', '));
  console.log('  Zertifikat trägt die Vorlage nochmals: ' + ja(r.frage3.certTraegtTemplate));
  console.log('  um EIN Zeichen gekürzter JWS prüft: ' + ja(r.frage3.umEinZeichenGekuerzt.gueltig)
    + '  (' + (r.frage3.umEinZeichenGekuerzt.grund || '—') + ')');
})().catch((e) => { console.error('MESSUNG ABGEBROCHEN:', e); process.exit(2); });
