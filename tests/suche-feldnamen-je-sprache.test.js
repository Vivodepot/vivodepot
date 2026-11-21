'use strict';
/* Suche findet Felder über ihren Namen, in jeder Sprache (Befund EN-SUCHE-OHNE-TREFFER, HOCH, 18.11.2026; ausgeliefert v1065):
   Im englischen Sub-Depot ergab „allergy“ „No results“. Der Suchkatalog kannte Bereichs- und Abschnittsnamen, Alltagswörter und
   eingetragene Werte, aber keinen Feldnamen. Darum fand „Allergie“ auch auf Deutsch nichts, und „Reisepass“ ebenso wenig. Dazu
   kürzte der Wortstamm nur deutsche Endungen, sodass „allergy“ nicht auf „Allergies“ traf.
   Klasse: Jedes Feld eines sichtbaren Bereichs ist über seinen eigenen Namen auffindbar, auf Deutsch und auf Englisch, im
   Haupt- und im Sub-Depot. Der Treffer nennt Bereich und Feld und führt zum Bereich. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const feldTreffer = (V, wort, sektorId, feldId) => V._sucheTreffer(wort).find((e) => e.bereichId === sektorId && e.feldId === feldId);

const FAELLE = {
  'privat-en': [
    ['allergy', 'health', 'allergiesMedicationFoodOther'],
    ['allergies', 'health', 'allergiesMedicationFoodOther'],
    ['medication', 'health', 'medicationOngoing'],
    ['passport', 'mobility', 'passportNo'],
  ],
  'privat-de': [
    ['Allergie', 'health', 'allergiesMedicationFoodOther'],
    ['Allergien', 'health', 'allergiesMedicationFoodOther'],
    ['Medikament', 'health', 'medicationOngoing'],
    ['Reisepass', 'mobility', 'passportNo'],
  ],
};

function pruefeFaelle(V, produkt, wo) {
  const fehlt = [];
  for (const [wort, s, f] of FAELLE[produkt]) {
    const t = feldTreffer(V, wort, s, f);
    if (!t) { fehlt.push(produkt + ' ' + wo + ': „' + wort + '“ findet ' + s + '.' + f + ' nicht'); continue; }
    if (typeof t.ziel !== 'function') fehlt.push(produkt + ' ' + wo + ': „' + wort + '“ ohne Ziel');
    if (!String(t.pfad || '').includes(V.bereicheAlle().find((b) => b.id === s).label)) fehlt.push(produkt + ' ' + wo + ': „' + wort + '“ ohne Bereich im Pfad');
  }
  return fehlt;
}

for (const produkt of Object.keys(FAELLE)) {
  test(`[SUCHE-OHNE-FELDNAMEN·${produkt}] Allergie, Medikament und Reisepass finden ihr Feld im Hauptdepot`, async () => {
    const { V } = ladeKern({ produkt });
    await V.depotAnlegen('Suche-Feld-2026!');
    V.akteurSelbstErklaeren('Probe');
    assert.deepEqual(pruefeFaelle(V, produkt, 'Hauptdepot'), []);
  });

  test(`[SUCHE-OHNE-FELDNAMEN·${produkt}] dieselben Wörter finden ihr Feld im Sub-Depot`, async () => {
    const { V } = ladeKern({ produkt });
    await V.depotAnlegen('Suche-Feld-2026!');
    V.akteurSelbstErklaeren('Probe');
    const PW = 'Sub-Suche-Feld-2026!';
    await V.subDepotAnlegen({ bezeichnung: 'Erna', inhaberin: 'Erna', verwaltungsTyp: 'verwaltet' }, PW);
    const e = V.getData().verwalteteDepots[0];
    await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
    V.subKontextBetreten(e.depotUUID);
    assert.deepEqual(pruefeFaelle(V, produkt, 'Sub-Depot'), []);
  });

  /* Rot-Beweis: ohne die Feldeinträge im Katalog (quelle 'feld') findet kein Wort sein Feld — das war der Stand am ausgelieferten v1065.
     Die Probe nimmt die Feldeinträge aus den Treffern heraus und verlangt, dass die Fälle dann scheitern. */
  test(`[SUCHE-OHNE-FELDNAMEN·${produkt}·Rot-Beweis] ohne Feldeinträge im Katalog findet kein Wort sein Feld`, async () => {
    const { V } = ladeKern({ produkt });
    await V.depotAnlegen('Suche-Feld-2026!');
    V.akteurSelbstErklaeren('Probe');
    for (const [wort, s, f] of FAELLE[produkt]) {
      const ohneFeld = V._sucheTreffer(wort).filter((e) => e.quelle !== 'feld');
      assert.equal(ohneFeld.some((e) => e.bereichId === s && e.feldId === f), false, '„' + wort + '“ träfe ' + s + '.' + f + ' auch ohne Feldeintrag');
    }
  });

  /* Wächter gegen die Klasse: jedes Feld jedes sichtbaren Bereichs, über seinen eigenen Namen gesucht, steht unter den Treffern. */
  test(`[SUCHE-OHNE-FELDNAMEN·${produkt}·Klasse] jedes Feld ist über seinen Namen auffindbar`, () => {
    const { V } = ladeKern({ produkt });
    const fehlt = [];
    let n = 0;
    for (const s of V.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
      if (!f || !f.id || !f.label) continue;
      n++;
      if (!V._sucheAlleTreffer(f.label).some((e) => e.bereichId === s.id && e.feldId === f.id)) fehlt.push(s.id + '.' + f.id + ' „' + f.label + '“');
    }
    assert.ok(n > 300, 'Vorbedingung: die Felder der Bereiche sind da (' + n + ')');
    assert.deepEqual(fehlt.slice(0, 15), [], fehlt.length + ' von ' + n + ' Feldern nicht über ihren Namen auffindbar');
  });
}
