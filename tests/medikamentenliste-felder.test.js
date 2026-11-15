'use strict';
/* Probe: Ein Medikament trägt die Angaben des Medikationsplans in eigenen Feldern (Medikamentenliste, Schritt M1).
   Auf den Feldern name, dosis, instruction, reason, note (Schema 98) kommen hinzu: pzn, ingredients [{substance, strength}],
   doseForm, unit, startDate, endDate, prescriber. Die Felder folgen dem, was der bundeseinheitliche Medikationsplan (Spezifikation 2.8,
   Element M mit p, f, du und W mit w, s), die Medikationsprofile der ePA und das europäische MPD gemeinsam führen.
   Belegt:
     • [M1·a] Einlesen eines Plans füllt pzn, ingredients, doseForm und unit am Chip; der Text bleibt, wie die Person ihn liest;
     • [M1·b] ein Eintrag ohne diese Angaben bekommt kein leeres Feld;
     • [M1·c] Rundweg: gespeichert und wieder geöffnet ist jedes Feld unverändert;
     • [M1·d] die Schema-Stufe ändert keinen vorhandenen Wert (Stufen-Fixture, eigene Zeile);
     • [M1·e] zweites Einlesen trägt fehlende Felder nach, überschreibt keine vorhandenen und legt nichts doppelt an;
     • [M1·f] ein selbst eingetragenes Medikament trägt dieselben Felder, gleichrangig mit dem eingelesenen;
     • [M1·Rot-Beweis] ohne die Felder in der Chip-Übernahme fehlen pzn und ingredients am Chip. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { STUFEN } = require('./fixtures/migrations-stufen.js');

const PW = 'pw';
// Erfunden: Namen, PZN und Instanz-ID stammen aus keinem echten Plan.
const PLAN = '<MP v="026" U="00112233445566778899AABBCCDDEEFF" l="de-DE">'
  + '<P g="Erika" f="Musterfrau" b="19600101"/>'
  + '<A n="Praxis Beispielweg"/>'
  + '<S>'
  + '<M p="1234567" a="Beispielol 5 mg" f="TAB" du="1" m="1" v="1" i="nüchtern" r="Blutdruck"><W w="Beispielwirkstoff" s="5 mg"/></M>'
  + '<M a="Mustersalbe ohne Angabe"/>'
  + '</S></MP>';
const NEUE_FELDER = ['pzn', 'ingredients', 'doseForm', 'unit', 'startDate', 'endDate', 'prescriber'];

const KERN = path.join(__dirname, '..', 'vivodepot.html');
async function frisch(optionen) {
  const k = ladeKern(optionen);
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
async function mitPlan(xml = PLAN, optionen) {
  const k = await frisch(optionen);
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(xml).plan);
  return k;
}
const klar = (w) => JSON.parse(JSON.stringify(w));
const chips = (k) => klar(k.V.getData().sektoren.health.medicationOngoing);
const beispielol = (k) => chips(k).find((c) => c.name === 'Beispielol 5 mg');

test('[M1·a] Einlesen füllt pzn, ingredients, doseForm und unit; der Text bleibt', async () => {
  const k = await mitPlan();
  const c = beispielol(k);
  assert.equal(c.pzn, '01234567');
  assert.deepEqual(c.ingredients, [{ substance: 'Beispielwirkstoff', strength: '5 mg' }]);
  assert.equal(c.doseForm, 'TAB');
  assert.equal(c.unit, '1');
  assert.equal(c.text, 'Beispielol 5 mg · 1-0-1-0 · nüchtern · Blutdruck', 'die Person liest den Eintrag wie bisher');
});

test('[M1·b] ohne Angabe kein leeres Feld', async () => {
  const c = chips(await mitPlan()).find((x) => x.name === 'Mustersalbe ohne Angabe');
  for (const f of NEUE_FELDER) assert.equal(Object.prototype.hasOwnProperty.call(c, f), false, f);
});

test('[M1·c] Rundweg: gespeichert und wieder geöffnet ist jedes Feld unverändert', async () => {
  const k = await mitPlan();
  const vorher = beispielol(k);
  const umschlag = await k.V.depotSerialisieren();
  await k.V.depotLaden(umschlag, PW);
  assert.deepEqual(beispielol(k), vorher);
});

test('[M1·d] die Schema-Stufe der neuen Felder steht in der Stufen-Fixture und ändert keinen Wert', () => {
  const stufe = STUFEN.find((s) => /Medikamentenliste/.test(s.was));
  assert.ok(stufe, 'eigene Zeile in tests/fixtures/migrations-stufen.js');
  const k = ladeKern();
  const d = stufe.baue();
  assert.ok(stufe.vorher(d));
  assert.ok(stufe.nachher(k.V.depotNormalisieren(d)));
});

test('[M1·e] zweites Einlesen trägt nach, überschreibt nichts und legt nichts doppelt an', async () => {
  const ohne = PLAN.replace(' p="1234567"', '').replace(' f="TAB"', '');
  const k = await mitPlan(ohne);
  const liste = klar(k.V.getData().sektoren.health.medicationOngoing);
  const i = liste.findIndex((c) => c.name === 'Beispielol 5 mg');
  assert.equal(liste[i].pzn, undefined);
  liste[i].ingredients = [{ substance: 'Eigener Eintrag', strength: '5 mg' }];
  k.V.sektorFeldSetzen('health', 'medicationOngoing', liste);
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  const danach = chips(k);
  assert.equal(danach.filter((c) => c.name === 'Beispielol 5 mg').length, 1, 'nichts doppelt');
  const c = beispielol(k);
  assert.equal(c.pzn, '01234567', 'fehlende PZN nachgetragen');
  assert.equal(c.doseForm, 'TAB', 'fehlende Form nachgetragen');
  assert.deepEqual(c.ingredients, [{ substance: 'Eigener Eintrag', strength: '5 mg' }], 'vorhandener Wert bleibt');
});

test('[M1·f] ein selbst eingetragenes Medikament trägt dieselben Felder', async () => {
  const k = await frisch();
  const eigen = {
    text: 'Eigenes Mittel', name: 'Eigenes Mittel', pzn: '07654321',
    ingredients: [{ substance: 'Beispielstoff', strength: '10 mg' }], doseForm: 'Tablette', unit: 'Stück',
    startDate: '2026-01-15', endDate: '2026-12-31', prescriber: 'Praxis Beispielweg',
  };
  const liste = k.V.chipListeMitNeuem([], eigen);
  k.V.sektorFeldSetzen('health', 'medicationOngoing', liste);
  const c = chips(k)[0];
  for (const f of NEUE_FELDER) assert.deepEqual(c[f], eigen[f], f);
});

test('[M1·Rot-Beweis] ohne die Felder in der Chip-Übernahme fehlen pzn und ingredients', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  const stellen = [
    { stelle: "['name'].concat(CHIP_MEDIKATION_ANGABEN, CHIP_MEDIKATION_LISTENFELDER)", neu: "['name'].concat(CHIP_MEDIKATION_ANGABEN)", feld: 'pzn' },
    { stelle: 'if (ingredients.length) neuerChip.ingredients = ingredients;', neu: '', feld: 'ingredients' },
  ];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-medliste-'));
  try {
    for (const s of stellen) {
      assert.equal(quelle.split(s.stelle).length, 2, s.feld + ': die Stelle steht genau einmal im Kern');
      const kopie = path.join(dir, 'kern.html');
      fs.writeFileSync(kopie, quelle.replace(s.stelle, s.neu));
      const c = beispielol(await mitPlan(PLAN, { htmlPfad: kopie, backen: true }));
      assert.equal(c[s.feld], undefined, s.feld + ' fehlt ohne die Stelle');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
