'use strict';
/* ═════════════════════════════════════════════════════════════════
   Schema 92 (02.10.2026, U2-ADR-471): die Anschrift des Ablageorts einer Vorsorgevollmacht in vier Unterfeldern
   (storageStreet, storageHouseNumber, storagePostalCode, storageCity) — für die KBV-Patientenkurzakte.

   Geprüft, mit Rot-Beweis:
     (a) Die Stufe schreibt nichts: der Freitext `storageLocation` bleibt byte-gleich, die vier Unterfelder fehlen, auch
         wenn der Freitext wie eine Anschrift aussieht. Kein Vorschlag (anders als Stufe 91).
     (b) Ein Depot, das schon auf 92 steht, bleibt unverändert (Idempotenz).
   Rot-Beweis: dieselbe Prüfung schlägt an einem Depot an, in dem eine Stufe die Teile aus dem Freitext geraten hätte.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const FREITEXT = 'beim Notar Dr. Beispiel, Hauptstraße 5, 80331 München';
const altDepot = (schemaVersion) => ({
  schemaVersion,
  sektoren: { advanceCare: { provisionInstruments: [
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', storageLocation: FREITEXT },
    { instrument: 'living-will', storageLocation: 'Hausarztpraxis' },
  ] } },
});

// Die Prüfung: der Freitext steht unverändert, kein Anschriftteil ist entstanden.
function nichtsGeraten(V, d, freitexte) {
  const zeilen = d.sektoren.advanceCare.provisionInstruments;
  const funde = [];
  zeilen.forEach((z, i) => {
    if (z.storageLocation !== freitexte[i]) funde.push('Zeile ' + i + ': Freitext verändert');
    for (const k of V.KBV_PKA_ANSCHRIFT) if (k in z) funde.push('Zeile ' + i + ': ' + k + ' gesetzt');
  });
  return funde;
}

test('[Stufe 92·a] die Stufe schreibt nichts: Freitext byte-gleich, keine Anschriftteile', () => {
  const { V } = ladeKern({ blank: true });
  assert.deepEqual([...V.KBV_PKA_ANSCHRIFT], ['storageStreet', 'storageHouseNumber', 'storagePostalCode', 'storageCity']);
  const d = altDepot(91);
  V.depotNormalisieren(d);
  assert.ok(d.schemaVersion >= 92, 'Stufe 92 erreicht');
  assert.equal(d.sektoren.advanceCare.provisionInstruments.length, 2, 'die Prüfung läuft über beide Zeilen');
  assert.deepEqual(nichtsGeraten(V, d, [FREITEXT, 'Hausarztpraxis']), []);
  assert.equal(JSON.stringify(d).includes('Hauptstraße"'), false, 'kein Teil des Freitexts als eigener Wert');
});

test('[Stufe 92·b] ein Depot auf 92 mit eingetragener Anschrift bleibt unverändert', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(92);
  Object.assign(d.sektoren.advanceCare.provisionInstruments[0], { storageStreet: 'Rennweg', storageHouseNumber: '35', storagePostalCode: '56626', storageCity: 'Andernach' });
  const teile = () => d.sektoren.advanceCare.provisionInstruments.map((z) => JSON.stringify([z.storageLocation, ...V.KBV_PKA_ANSCHRIFT.map((k) => z[k])]));
  const vorher = teile();
  V.depotNormalisieren(d);
  // Mindestens 92: spätere Stufen (93 ff.) heben weiter; was diese Probe hält, sind die 92-Felder darunter.
  assert.ok(d.schemaVersion >= 92, 'Stufe 92 erreicht oder überschritten');
  assert.deepEqual(teile(), vorher, 'Freitext und Anschriftteile unverändert (andere Stufen stempeln z. B. den Rechtsraum)');
});

test('[Stufe 92·Rot] die Prüfung schlägt an, wenn eine Stufe die Anschrift aus dem Freitext rät', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(91);
  V.depotNormalisieren(d);
  Object.assign(d.sektoren.advanceCare.provisionInstruments[0], { storageStreet: 'Hauptstraße', storageHouseNumber: '5', storagePostalCode: '80331', storageCity: 'München' });
  assert.deepEqual(nichtsGeraten(V, d, [FREITEXT, 'Hausarztpraxis']),
    ['Zeile 0: storageStreet gesetzt', 'Zeile 0: storageHouseNumber gesetzt', 'Zeile 0: storagePostalCode gesetzt', 'Zeile 0: storageCity gesetzt']);
});
