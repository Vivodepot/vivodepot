'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Die Patientenverfügung widerspricht sich bei der Wiederbelebung nicht (31.10.2026)
   ────────────────────────────────────────────────────────────────────────
   BMJ-Baustein 2.3.4: unter A wählt man „Versuche der Wiederbelebung“ ODER „die Unterlassung …“. Der Zusatz zum Notarzt
   („… über meine Ablehnung von Wiederbelebungsmaßnahmen informiert wird“) und B („… in allen Fällen … lehne ich
   Wiederbelebungsmaßnahmen ab“) setzen eine Ablehnung voraus (Textbausteine des BMJ, S. 3). Ohne Tor fragte der Assistent
   beide auch nach „Versuche der Wiederbelebung“, und das Dokument trug dann beides. Das Tor steht als `verborgenWenn` am Feld
   im Bauplan des Rechtsraum-Moduls und gilt damit im Assistenten, im Bereich und im Dokument.
   Wächter für die Klasse: jedes Feld der Patientenverfügung, dessen Option eine Ablehnung voraussetzt, trägt ein Tor.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const TEXTE_DE = path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json');
const SETZT_ABLEHNUNG_VORAUS = /\bAblehnung\b|\blehne ich\b/;
const ABLEHNUNG_IM_DOKUMENT = ['über meine Ablehnung von Wiederbelebungsmaßnahmen', 'lehne ich Wiederbelebungsmaßnahmen ab'];

// Felder der Patientenverfügung, deren Option eine Ablehnung voraussetzt, und ob sie ein Tor tragen.
function ablehnungOhneTor(bauplan, texte) {
  return bauplan.filter((s) => s && s.feld && Array.isArray(s.feld.optionen))
    .filter((s) => s.feld.optionen.some((o) => SETZT_ABLEHNUNG_VORAUS.test(String(texte['wizard:pvwiz.' + s.feld.id + '/' + o.wert + '.label'] || ''))))
    .filter((s) => !(s.feld.verborgenWenn && typeof s.feld.verborgenWenn === 'object'))
    .map((s) => s.feld.id);
}

async function mitWiederbelebung(wert) {
  const k = ladeKern();
  const V = k.V;
  await V.depotAnlegen('PV-Wiederbelebung-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.advanceCare = { applicableSituations: ['sterbeprozess'], resuscitationInDescribedSituations: wert,
    emergencyDoctorNotified: 'ja', resuscitationInAllCases: 'ab' };
  V.setData(d);
  return V;
}

function sichtbareFelder(V) {
  const def = V.WIZARD_BY_ID.pvwiz;
  V.wizardLauf('pvwiz');
  return V.wizardSichtbareIndizes(def).map((i) => def.schritte[i].feld && def.schritte[i].feld.id);
}

test('[PV·Wiederbelebung] nach „Versuche der Wiederbelebung“ fragt der Assistent weder den Notarzt-Zusatz noch B', async () => {
  const V = await mitWiederbelebung('ja');
  const felder = sichtbareFelder(V);
  assert.ok(felder.includes('resuscitationInDescribedSituations'), 'die Frage A selbst bleibt');
  assert.ok(!felder.includes('emergencyDoctorNotified'), 'Notarzt-Zusatz trotz gewünschter Wiederbelebung');
  assert.ok(!felder.includes('resuscitationInAllCases'), 'B (Ablehnung in allen Fällen) trotz gewünschter Wiederbelebung');
});

test('[PV·Wiederbelebung] nach „die Unterlassung“ stehen Notarzt-Zusatz und B zur Wahl', async () => {
  const V = await mitWiederbelebung('nein');
  const felder = sichtbareFelder(V);
  assert.ok(felder.includes('emergencyDoctorNotified'));
  assert.ok(felder.includes('resuscitationInAllCases'));
});

test('[PV·Wiederbelebung] das Dokument trägt neben „Versuche der Wiederbelebung“ keine Ablehnung', async () => {
  const V = await mitWiederbelebung('ja');
  const text = JSON.stringify(V.pvDokumentAbschnitte());
  assert.ok(text.includes('Versuche der Wiederbelebung'), 'Vorbedingung: A steht im Dokument');
  for (const satz of ABLEHNUNG_IM_DOKUMENT) assert.ok(!text.includes(satz), 'Widerspruch im Dokument: „' + satz + '“');
});

test('[PV·Wiederbelebung] bei „die Unterlassung“ trägt das Dokument Notarzt-Zusatz und B', async () => {
  const V = await mitWiederbelebung('nein');
  const text = JSON.stringify(V.pvDokumentAbschnitte());
  for (const satz of ABLEHNUNG_IM_DOKUMENT) assert.ok(text.includes(satz), 'fehlt: „' + satz + '“');
});

test('[PV·Wiederbelebung·Klasse] jedes Feld, dessen Option eine Ablehnung voraussetzt, trägt ein Tor', () => {
  // Die Schritte, wie der Motor sie aus dem Bauplan des Rechtsraum-Moduls trägt.
  const bauplan = ladeKern().V.PV_BMJ.steps;
  const { texte } = JSON.parse(fs.readFileSync(TEXTE_DE, 'utf8'));
  const gefunden = bauplan.filter((s) => s && s.feld && (s.feld.optionen || []).some((o) => SETZT_ABLEHNUNG_VORAUS.test(String(texte['wizard:pvwiz.' + s.feld.id + '/' + o.wert + '.label'] || ''))));
  assert.ok(gefunden.length >= 2, 'der Wächter sieht die Felder nicht, die er bewachen soll');
  assert.deepEqual(ablehnungOhneTor(bauplan, texte), []);
});

test('[Negativprobe] [PV·Wiederbelebung·Rot-Beweis] ein Ablehnungs-Zusatz ohne Tor fällt auf, einer mit Tor nicht', () => {
  const texte = { 'wizard:pvwiz.x/ja.label': 'über meine Ablehnung informiert', 'wizard:pvwiz.y/ab.label': 'lehne ich ab', 'wizard:pvwiz.z/ja.label': 'Dialyse' };
  const bauplan = [
    { feld: { id: 'x', optionen: [{ wert: 'ja' }] } },
    { feld: { id: 'y', optionen: [{ wert: 'ab' }], verborgenWenn: { feld: 'a', wert: 'ja' } } },
    { feld: { id: 'z', optionen: [{ wert: 'ja' }] } },
  ];
  assert.deepEqual(ablehnungOhneTor(bauplan, texte), ['x']);
});
