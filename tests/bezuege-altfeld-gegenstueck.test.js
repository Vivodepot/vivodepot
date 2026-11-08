'use strict';
/* Bezüge auf Altfelder (Befund FIM-ANSCHRIFT-ALTFELD, 04.11.2026).
   Ein Altfeld hält eine Angabe in alter Form: „Bisherige …“ (die einzeilige Anschrift, die Stufe 91 in Teile zerlegt,
   U2-ADR-467) oder „… — frühere Angabe“. Trägt ein Altfeld einen Bezug, dann tragen auch die heutigen Felder für dieselbe
   Angabe einen Bezug im selben Datensatz — sonst führen Feldanzeige und Export die Kennung nur für die alte Form.
   Ein Altfeld ohne bekanntes Gegenstück trägt keinen Bezug. Ein neues Altfeld im Katalog verlangt einen Eintrag in
   GEGENSTUECKE oder in OHNE_GEGENSTUECK, damit die Regel es nicht still übergeht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const lesen = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));

// Altfeld → die heutigen Felder für dieselbe Angabe.
const GEGENSTUECKE = {
  'identity.streetAddress': ['identity.street', 'identity.houseNumber'],
  'identity.postcodeCity': ['identity.postalCode', 'identity.city'],
  'education.vocationalTrainingEarlierEntry': ['education.vocationalTraining'],
  'education.typeOfIncomeEarlierEntry': ['education.typeOfIncome'],
  'identity.taxClassEarlierEntry': ['identity.taxClass'],
};
// Altfelder, für die der Katalog kein einzelnes heutiges Feld führt: sie tragen keinen Bezug.
const OHNE_GEGENSTUECK = [
  'administration.bundidVerificationLevelEarlier',
  'education.schoolLeavingQualification2',
  'education.universityEarlierEntry',
  'emergencyPreparedness.drinkingWaterSupplyEarlierNote',
  'emergencyPreparedness.foodSuppliesEarlierNoteOnShelf',
  'identity.choiceOfNameAfterMarriage2',
  'mobility.drivingLicenceEarlierEntry',
  'socialInsurance.longTermCareAllowanceEarlier',
];

const istAltfeld = (f) => /^Bisherige /.test(f.label || '') || /frühere Angabe/.test(f.label || '');

function altfeldBezuegePruefen(tabelle, katalog) {
  const befunde = [];
  const bekannt = new Set(katalog.map((f) => f.kennung));
  const alt = katalog.filter(istAltfeld).map((f) => f.kennung);
  for (const k of alt) {
    if (!(k in GEGENSTUECKE) && !OHNE_GEGENSTUECK.includes(k)) befunde.push(`${k}: Altfeld ohne Eintrag in GEGENSTUECKE oder OHNE_GEGENSTUECK`);
  }
  for (const [k, teile] of Object.entries(GEGENSTUECKE)) for (const t of teile) if (!bekannt.has(t)) befunde.push(`${k}: Gegenstück ${t} steht nicht im Katalog`);
  const saetze = (k) => new Set(tabelle.zeilen.filter((z) => z.kennung === k).map((z) => z.datensatz));
  for (const k of alt) {
    for (const ds of saetze(k)) {
      if (OHNE_GEGENSTUECK.includes(k)) { befunde.push(`${k}: Altfeld ohne Gegenstück trägt einen Bezug (${ds})`); continue; }
      for (const t of (GEGENSTUECKE[k] || [])) if (!saetze(t).has(ds)) befunde.push(`${k} trägt ${ds}, das heutige Feld ${t} nicht`);
    }
  }
  return befunde;
}

const TABELLE = lesen('bereiche/bezuege.json');
const KATALOG = lesen('bereiche/feldkatalog.json').felder;

test('[Altfeld·Bezug] trägt ein Altfeld einen Bezug, tragen ihn auch die heutigen Felder', () => {
  assert.deepEqual(altfeldBezuegePruefen(TABELLE, KATALOG), []);
});

test('[Altfeld·Bezug·Rot-Beweis] FIM-Bezug nur auf der alten Anschriftzeile wird gefunden', () => {
  const t = JSON.parse(JSON.stringify(TABELLE));
  t.zeilen = t.zeilen.filter((z) => !(z.datensatz === 'fim-baukasten' && ['identity.street', 'identity.houseNumber'].includes(z.kennung)));
  t.zeilen.push({ kennung: 'identity.streetAddress', datensatz: 'fim-baukasten', ziel: 'G00000587', fassung: '2.0', status: 'x', grad: 'naeherung' });
  const b = altfeldBezuegePruefen(t, KATALOG);
  assert.ok(b.some((s) => s.includes('identity.street ')), b.join('\n'));
  assert.ok(b.some((s) => s.includes('identity.houseNumber')), b.join('\n'));
});

test('[Altfeld·Bezug·Rot-Beweis] ein Altfeld ohne Gegenstück mit Bezug wird gefunden', () => {
  const t = JSON.parse(JSON.stringify(TABELLE));
  t.zeilen.push({ kennung: 'mobility.drivingLicenceEarlierEntry', datensatz: 'semic-core-vocabularies', ziel: 'http://purl.org/dc/terms/identifier', grad: 'weit' });
  assert.ok(altfeldBezuegePruefen(t, KATALOG).some((s) => s.startsWith('mobility.drivingLicenceEarlierEntry')));
});

test('[Altfeld·Bezug·Rot-Beweis] ein neues Altfeld im Katalog ohne Eintrag wird gefunden', () => {
  const k = KATALOG.concat([{ kennung: 'identity.probeEarlierEntry', bereich: 'identity', label: 'Probe — frühere Angabe' }]);
  assert.ok(altfeldBezuegePruefen(TABELLE, k).some((s) => s.startsWith('identity.probeEarlierEntry')));
});
