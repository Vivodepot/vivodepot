'use strict';
/* Befund F2 (23.09.2026): exportAuswahlEphemerAnwenden stellte die Sensibel-Markierung nach `await aufFortfahren(...)` im
   globalen `data` wieder her. War während der Wartezeit ein anderes Depot offen, verlor dieses seine Markierung; war der
   Speicher geleert (Hintergrund-Wipe über visibilitychange → hidden, auf Android während navigator.share), warf der Export. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KANDIDATEN = [{ sektor: 'health', feld: 'bloodType' }, { sektor: 'health', feld: 'allergiesMedicationFoodOther' }];

async function depotB(V) {
  await V.depotAnlegen('Depot-B-2026!');
  const d = V.getData();
  d.sektoren.health = { bloodType: 'MARKER-B' };
  d.sensibelFelder = { 'health/bloodType': true };
  V.setData(d);
  return JSON.parse(JSON.stringify(await V.depotSerialisierenV4()));
}

test('[F2·Rot-Beweis] öffnet sich während der Wartezeit ein anderes Depot, behält es seine Sensibel-Markierung', async () => {
  const { V } = ladeKern();
  const umschlagB = await depotB(V);
  await V.depotAnlegen('Depot-A-2026!');
  const a = V.getData();
  a.sensibelFelder = { 'health/allergiesMedicationFoodOther': true };
  V.setData(a);
  await V.exportAuswahlEphemerAnwenden(KANDIDATEN, new Set(), async () => { await V.depotLaden(umschlagB, 'Depot-B-2026!'); });
  assert.equal(V.getData().sektoren.health.bloodType, 'MARKER-B', 'Kontrolle: jetzt ist B offen');
  assert.deepEqual(V.getData().sensibelFelder, { 'health/bloodType': true }, 'B behält seine Markierung');
  assert.deepEqual(a.sensibelFelder, { 'health/allergiesMedicationFoodOther': true }, 'A ist exakt wiederhergestellt');
});

test('[F2·Rot-Beweis] wird der Speicher während der Wartezeit geleert (Hintergrund-Wipe), wirft der Export nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Depot-A-2026!');
  await V.exportAuswahlEphemerAnwenden(KANDIDATEN, new Set(), async () => { V._depotSpeicherZuruecksetzen(); });
  assert.equal(V.getData(), null, 'Kontrolle: der Speicher ist geleert');
});

test('[F2·Gegenprobe] ohne Wechsel ist die Markierung nach dem Export exakt die vorige', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Depot-A-2026!');
  const a = V.getData();
  a.sensibelFelder = { 'health/bloodType': true };
  V.setData(a);
  let waehrend = null;
  await V.exportAuswahlEphemerAnwenden(KANDIDATEN, new Set(['health/bloodType']), async () => { waehrend = JSON.parse(JSON.stringify(V.getData().sensibelFelder)); });
  assert.notDeepEqual(waehrend, { 'health/bloodType': true }, 'Kontrolle: während des Exports war die Auswahl transient gesetzt');
  assert.deepEqual(V.getData().sensibelFelder, { 'health/bloodType': true });
});

test('[F2·Klasse] exportAuswahlEphemerAnwenden schreibt nach dem Warten nicht in das globale data', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const a = kern.indexOf('async function exportAuswahlEphemerAnwenden(');
  const rumpf = kern.slice(a, kern.indexOf('\n}\n', a));
  const nachAwait = rumpf.slice(rumpf.indexOf('await '));
  assert.doesNotMatch(nachAwait, /\bdata\.[A-Za-z_]+\s*=(?!=)/, 'nach dem ersten await weist die Funktion nichts an data.* zu');
});
