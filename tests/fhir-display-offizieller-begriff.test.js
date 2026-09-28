'use strict';
/* ════════════════════════════════════════════════════════════════════════
   FHIR-Export: display ist der offizielle Begriff des Systems oder fehlt —
   für jedes Code-System (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund: bis v809 trug nur die SNOMED-Liste `anzeigeNameEigen`; für LOINC,
   ICD-10-GM und ATC ging der eigene deutsche Anzeigename als coding.display
   hinaus (Lizenzbedingungen: SNOMED-Freigabe, LOINC-Lizenz, BfArM § 62 UrhG).
   Regel, ohne Systemnamen im Kern: jede Code-Liste mit Daten trägt
   `anzeigeNameEigen`; im erzeugten IPS-Bundle ist display eines codierten
   Elements genau der `quellBegriff` der Liste oder fehlt, und `text` trägt
   den eigenen Namen. LOINC trägt seit v810 den LONG_COMMON_NAME als
   quellBegriff (display = dieser); ATC hat bis zur Rechtsklärung keinen
   (display fehlt); ICD-10-GM ebenso, bis der Gerüst-Wächter die
   amtlichen Titel als Terminologie-Daten einordnen kann (endständige Codes
   hält tests/icd10gm-endstaendig.test.js).
   ROT-BEWEIS: die LOINC-Liste von c30128b6a (ohne Kennzeichen); ein Bundle,
   das den eigenen Namen als display trägt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const LISTEN = fs.readdirSync(path.join(REPO, 'code-listen')).filter((d) => d.endsWith('.json'))
  .map((d) => JSON.parse(fs.readFileSync(path.join(REPO, 'code-listen', d), 'utf8')));

function listenBefund(listen) {
  return listen.filter((l) => (l.daten || []).length && l.anzeigeNameEigen !== true).map((l) => l.systemId + ': Liste mit Daten ohne anzeigeNameEigen');
}

function codings(bundle) {
  const aus = [];
  const gehe = (o, weg) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o.coding) && typeof o.text === 'string') for (const c of o.coding) aus.push({ c, text: o.text, weg });
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') gehe(v, weg + '.' + k);
  };
  for (const e of bundle.entry || []) gehe(e.resource, e.resource.resourceType);
  return aus;
}

function bundleBefund(bundle, listen) {
  const funde = [];
  for (const { c, text, weg } of codings(bundle)) {
    const liste = listen.find((l) => l.uri === c.system);
    if (!liste) continue;
    const eintrag = (liste.daten || []).find((d) => d.code === c.code);
    const soll = eintrag && eintrag.quellBegriff;
    if (c.display !== undefined && c.display !== soll) funde.push(weg + ' ' + c.system + '|' + c.code + ': display „' + c.display + '" ist nicht der offizielle Begriff' + (soll ? ' „' + soll + '"' : ' (keiner hinterlegt)'));
    if (!text) funde.push(weg + ' ' + c.code + ': text fehlt');
  }
  return funde;
}

async function bundleMitAllenSystemen() {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria'); V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [V.chipAusEingabe('snomedAllergen', 'Allergie gegen Penicillin')]);
  V.sektorFeldSetzen('health', 'medicationOngoing', [V.chipAusEingabe('atc', 'Ramipril')]);
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [V.chipAusEingabe('icd10', 'Essentielle (primäre) Hypertonie')]);
  return V.fhirIpsBundle(undefined, { sensibel: true });
}

test('[FHIR·display] jede Liste mit Daten trägt anzeigeNameEigen; im IPS-Bundle ist display offizieller Begriff oder fehlt', async () => {
  assert.deepEqual(listenBefund(LISTEN), []);
  const b = await bundleMitAllenSystemen();
  const cs = codings(b).map((x) => x.c.system);
  for (const s of ['http://snomed.info/sct', 'http://www.whocc.no/atc', 'http://hl7.org/fhir/sid/icd-10-gm']) assert.ok(cs.includes(s), 'Vorbedingung: ' + s + ' im Bundle');
  assert.deepEqual(bundleBefund(b, LISTEN), []);
  const icd = codings(b).find((x) => x.c.system === 'http://hl7.org/fhir/sid/icd-10-gm');
  assert.equal(icd.c.display, undefined, 'ICD bis zur Einordnung der amtlichen Titel ohne display');
  assert.equal(icd.c.code, 'I10.90');
  assert.equal(codings(b).find((x) => x.c.system === 'http://www.whocc.no/atc').c.display, undefined);
});

test('[FHIR·display·Rot-Beweis] die LOINC-Liste von c30128b6a und der eigene Name als display fallen', () => {
  const alt = JSON.parse(execFileSync('git', ['show', 'c30128b6a:code-listen/loinc.json'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() }));
  assert.deepEqual(listenBefund([alt]), ['loinc: Liste mit Daten ohne anzeigeNameEigen']);
  const falsch = { entry: [{ resource: { resourceType: 'Condition', code: { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-gm', code: 'I10.90', display: 'Essentielle (primäre) Hypertonie' }], text: 'Essentielle (primäre) Hypertonie' } } }] };
  assert.equal(bundleBefund(falsch, LISTEN).length, 1);
});
