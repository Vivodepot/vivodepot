'use strict';
/* ════════════════════════════════════════════════════════════════════════
   export-luecken-topf-a.test.js — „57 Export-Lücken in drei Töpfe" (12.08.2026)
   ────────────────────────────────────────────────────────────────────────
   W-10 fand 57 Felder, die im Herausgabedialog ankreuzbar sind, aber nie im erzeugten
   Export landen (Sperren-Bericht 11.08.2026, „ohne Vorlage"). Drei parallele
   Recherche-Durchgänge (FIM-Portal-API für XÖV/FIM, ELM.ttl für EDCI, Struktur-Vergleich
   für SD-JWT-VC-Finanzen — Quellen im Bericht) klassifizierten jedes Feld in Topf A
   (Zielformat hat ein Element), Topf B (hat keins) oder ungeprüft. 15 Felder fielen auf
   Topf A — diese Probe hält fest, dass sie jetzt tatsächlich im Export landen.

   Sensibilitäts-Gate bleibt unangetastet: baueAusMapping() liest feldIstSensibel() aus der
   FELD-Definition, nicht aus dem Mapping-Eintrag — email_haupt/bav_nr/private_av_nr tragen
   bereits sensibel:true am Feld selbst (unverändert durch diesen Auftrag), W-13 muss also
   automatisch weiter greifen. Explizit mitgeprüft, nicht nur angenommen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('XÖV-Verwaltung — vier neu gemappte Topf-A-Felder landen im Export', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('administration', 'bundidVerificationLevelEarlier', 'substanziell');
  V.sektorFeldSetzen('administration', 'furtherEmailAddress', 'alt@example.de');
  const e = V.kernAPI.exportiere('xoev-verwaltung');
  assert.equal(e.datensatz.verifizierungsstufeFrueher, 'substanziell');
  assert.equal(e.datensatz.emailWeitere, 'alt@example.de');
});

test('XÖV-Verwaltung — sensible E-Mail-Felder (proton_email nicht sensibel, email_haupt sensibel) respektieren W-13', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('administration', 'protonMailEncryptedEmail', 'maria@example.de');
  V.sektorFeldSetzen('administration', 'mainEmailAddress', 'maria@example.de');
  const ohneOptIn = V.kernAPI.exportiere('xoev-verwaltung');
  assert.equal(ohneOptIn.datensatz.emailVerschluesselt, 'maria@example.de', 'proton_email trägt kein sensibel:true — landet ohne Opt-in im Export');
  assert.equal(ohneOptIn.datensatz.email, undefined, 'email_haupt (sensibel:true) bleibt ohne Opt-in draußen — W-13 unangetastet');
  const mitOptIn = V.kernAPI.exportiere('xoev-verwaltung', { sensibel: true });
  assert.equal(mitOptIn.datensatz.email, 'maria@example.de', 'mit explizitem Opt-in erscheint das sensible Feld');
});

test('EDCI-Bildung — sechs neu gemappte Topf-A-Felder landen im Export', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('education', 'schoolLeavingQualificationYear', '1985');
  V.sektorFeldSetzen('education', 'universitySubject', 'Volkswirtschaftslehre');
  V.sektorFeldSetzen('education', 'universityInstitution', 'LMU München');
  V.sektorFeldSetzen('education', 'universityYear', '1995');
  V.sektorFeldSetzen('education', 'employerAddress', 'Brienner Str. 18, 80333 München');
  V.sektorFeldSetzen('education', 'lastEmployer', 'Bayerische Landesbank');
  const e = V.kernAPI.exportiere('edci-bildung');
  assert.equal(e.learningAchievements.schoolQualificationYear, '1985');
  assert.equal(e.learningAchievements.academicQualificationField, 'Volkswirtschaftslehre');
  assert.equal(e.learningAchievements.academicQualificationAwardingBody, 'LMU München');
  assert.equal(e.learningAchievements.academicQualificationYear, '1995');
  assert.equal(e.learningAchievements.employerAddress, 'Brienner Str. 18, 80333 München');
  assert.equal(e.learningAchievements.previousEmployer, 'Bayerische Landesbank');
});

test('SD-JWT-VC-Finanzen — fünf neu gemappte Topf-A-Felder landen im Export', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('finance', 'companyPensionScheme', 'Pensionskasse');
  V.sektorFeldSetzen('finance', 'companyPensionPolicyNumber', 'BAV-2018-987654');
  V.sektorFeldSetzen('finance', 'companyPensionAgreedStartDate', '2035-01-01');
  V.sektorFeldSetzen('finance', 'policyContractNumber', 'POL-4711-0815');
  V.sektorFeldSetzen('finance', 'privatePensionProvisionAgreed', '2040-06-01');
  const e = V.kernAPI.exportiere('sd-jwt-vc-finanzen', { sensibel: true });
  assert.equal(e.claims.occupational_pension_scheme, 'Pensionskasse');
  assert.equal(e.claims.occupational_pension_number, 'BAV-2018-987654');
  assert.equal(e.claims.occupational_pension_start_date, '2035-01-01');
  assert.equal(e.claims.pension_provider_contract_number, 'POL-4711-0815');
  assert.equal(e.claims.pension_provider_end_date, '2040-06-01');
});

test('SD-JWT-VC-Finanzen — bav_nr/private_av_nr sind sensibel und bleiben ohne Opt-in draußen (W-13)', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('finance', 'companyPensionPolicyNumber', 'BAV-2018-987654');
  V.sektorFeldSetzen('finance', 'policyContractNumber', 'POL-4711-0815');
  const ohneOptIn = V.kernAPI.exportiere('sd-jwt-vc-finanzen');
  assert.equal(ohneOptIn.claims.occupational_pension_number, undefined);
  assert.equal(ohneOptIn.claims.pension_provider_contract_number, undefined);
});
