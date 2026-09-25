'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-096 · Import eines FREMDEN Depots mit gesetztem „vorhanden?"-Gate.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, absichtlich VOR dem Alias-Umbau geschrieben und rot.

   Warum test-first ausgerechnet hier: Das Fehlschlag-Gate ist gegen diese
   Klasse BLIND. Es meldet Fehlschläge in bestehenden Tests — und für
   „importiertes ‚vorhanden' kommt nicht an" existiert kein Test, der fallen
   könnte. Das Gate meldete grün, während fremde Daten still verschluckt
   werden. Ein Nachweis, der nach der Änderung geschrieben wird, ist ein
   Nachgedanke; an diesem Tag haben Nachgedanken mehrfach nicht gehalten.

   Der Sachverhalt: Ein fremdes Depot oder ein Export trägt
   `testament_vorhanden = ja`. Die Gates sind mit U2-ADR-096 entfallen — der
   Alias darf deshalb NICHT gelöscht werden, sonst fällt die Information beim
   Import lautlos auf den Boden. Er wird UMGEBAUT: ein importiertes
   „vorhanden" legt einen Instrument-Record an, genau wie der E1-Umzug es für
   den eigenen Altbestand tut.

   Die eine Ausnahme: importiertes `plant` („in Vorbereitung") entfällt, weil
   der Zustand selbst entfallen ist. Das ist ein bewusster Verlust, kein
   stiller — und er ist unten ausdrücklich festgehalten, damit niemand ihn
   später für einen Defekt hält.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

const instrumente = (V) =>
  ((V.getData().sektoren.advanceCare || {}).provisionInstruments) || [];
const vomTyp = (V, typ) => instrumente(V).filter(r => r && r.instrument === typ);

// Ein fremdes Depot, wie es aus einer älteren Fassung oder einem Fremd-Export kommt:
// die vier Gates gesetzt, dazu Detailangaben, die zum jeweiligen Instrument gehören.
const alsB16 = (o) => JSON.stringify(Object.assign({ __fokus__: 'family' }, o));

const FREMD = {
  vollmacht_vorhanden: 'ja',
  patientenverf_vorhanden: 'ja',
  testament_vorhanden: 'ja',
  betreuungsverfuegung: 'ja',   // Gate-Feld des alten b16-Formats, nicht der Typ-Code
  testament_ort: 'beim Notar Dr. Sommer',
  testament_datum: '2024-03-01',
  patientenverf_ort: 'beim Hausarzt',
};

test('[ImpGate] importiertes „vorhanden" legt einen Instrument-Record an — je Gate einen', async () => {
  const { V } = await frischMitDepot();
  const plan = V.kernAPI.importVorschau('vivodepot-beta', alsB16(FREMD));
  V.importAnwenden(plan, { alleKonflikte: true });

  for (const typ of ['enduring-power-of-attorney', 'living-will', 'will', 'custodianship-declaration']) {
    assert.equal(vomTyp(V, typ).length, 1,
      'importiertes „vorhanden" muss GENAU EINEN ' + typ + '-Record anlegen — sonst faellt die '
      + 'Information eines fremden Depots lautlos auf den Boden (Datenverlust-Klasse)');
  }
});

test('[ImpGate] die Detailangaben landen an DERSELBEN Zeile, nicht in einem zweiten Record', async () => {
  const { V } = await frischMitDepot();
  const plan = V.kernAPI.importVorschau('vivodepot-beta', alsB16(FREMD));
  V.importAnwenden(plan, { alleKonflikte: true });

  const t = vomTyp(V, 'will');
  assert.equal(t.length, 1, 'genau eine Testament-Zeile');
  assert.equal(t[0].storageLocation, 'beim Notar Dr. Sommer', 'Ablageort an der Testament-Zeile');
  assert.equal(String(t[0].dateOfLastChange).slice(0, 10), '2024-03-01', 'Datum an derselben Zeile');

  const pv = vomTyp(V, 'living-will');
  assert.equal(pv.length, 1, 'genau eine PV-Zeile');
  assert.equal(pv[0].storageLocation, 'beim Hausarzt', 'PV-Ablageort an der PV-Zeile');
});

test('[ImpGate] Detail OHNE Gate legt trotzdem an — sonst geht der Wert verloren', async () => {
  const { V } = await frischMitDepot();
  // Fremd-Depot, das nur den Ablageort trägt (das Gate fehlt oder steht auf „nein"):
  // Der Ort ist eine echte Angabe der Bürgerin und darf nicht verschwinden, nur weil
  // das Gate-Feld nicht mitgeliefert wurde.
  const plan = V.kernAPI.importVorschau('vivodepot-beta', alsB16({ testament_ort: 'im Bankschliessfach' }));
  V.importAnwenden(plan, { alleKonflikte: true });
  const t = vomTyp(V, 'will');
  assert.equal(t.length, 1, 'auch ohne Gate entsteht die Zeile, sonst ist der Ablageort weg');
  assert.equal(t[0].storageLocation, 'im Bankschliessfach');
});

test('[ImpGate] importiertes „nein" legt KEINEN Record an', async () => {
  const { V } = await frischMitDepot();
  const plan = V.kernAPI.importVorschau('vivodepot-beta', alsB16({ testament_vorhanden: 'nein' }));
  V.importAnwenden(plan, { alleKonflikte: true });
  assert.equal(vomTyp(V, 'will').length, 0,
    '„nein" ist die Aussage „es gibt keins" — daraus darf kein Instrument entstehen');
});

test('[ImpGate] importiertes „plant" entfaellt BEWUSST — dokumentierter Verlust, kein stiller', async () => {
  const { V } = await frischMitDepot();
  const plan = V.kernAPI.importVorschau('vivodepot-beta', alsB16({ testament_vorhanden: 'plant' }));
  V.importAnwenden(plan, { alleKonflikte: true });
  // Der Zwischenzustand „in Vorbereitung" ist mit den Gates entfallen (U2-ADR-096, E2) und
  // kehrt spaeter ueber die Merkliste zurueck. Ein Record daraus waere FALSCH: er behauptete
  // ein vorhandenes Instrument, das es nicht gibt. Hier steht der Verlust ausdruecklich, damit
  // ihn niemand spaeter fuer einen Defekt haelt und „repariert".
  assert.equal(vomTyp(V, 'will').length, 0,
    '„in Vorbereitung" darf KEIN vorhandenes Instrument vortaeuschen');
});

test('[ImpGate] zweimal importieren erzeugt keine Dubletten', async () => {
  const { V } = await frischMitDepot();
  for (let i = 0; i < 2; i++) {
    const plan = V.kernAPI.importVorschau('vivodepot-beta', alsB16(FREMD));
    V.importAnwenden(plan, { alleKonflikte: true });
  }
  for (const typ of ['enduring-power-of-attorney', 'living-will', 'will', 'custodianship-declaration']) {
    assert.equal(vomTyp(V, typ).length, 1, typ + ': kein zweiter Record beim erneuten Import');
  }
});

/* ── Die Grenze des Dedup: er gehoert in den ALIAS-Pfad, nicht in den Listen-Pfad ──────── */

test('[ImpGate] fremde Instrument-LISTE behaelt zwei Vollmachten als zwei', async () => {
  const { V } = await frischMitDepot();
  // Ein fremdes Depot, das eine ECHTE Instrument-Liste mitbringt (kein Gate): zwei gueltige
  // Vollmachten nebeneinander — Gesundheit und Bank. Genau der Fall, fuer den U2-ADR-096 die
  // Auswahl-Form „alle" gewaehlt hat. Sie duerfen NICHT auf eine Zeile gemergt werden; die
  // zweite waere sonst spurlos weg (art + ort fallen beim Merge unter den Tisch, weil der
  // Merge nur LEERE Felder fuellt).
  const plan = { quelleLabel: 'test', zeilen: [], register: [], listen: [{
    sektorId: 'advanceCare', feldId: 'provisionInstruments', eintraege: [
      { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'gesundheit', storageLocation: 'Hausarzt' },
      { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank',       storageLocation: 'Sparkasse' },
    ] }] };
  V.importAnwenden(plan, { alleKonflikte: true });
  const vm = vomTyp(V, 'enduring-power-of-attorney');
  assert.equal(vm.length, 2,
    'zwei gueltige Vollmachten muessen zwei bleiben — Dedup by typ gehoert in den Alias-Pfad, '
    + 'nicht in den allgemeinen Listen-Pfad (sonst verschwindet eine gueltige Vollmacht spurlos)');
  assert.equal(vm.map(r => r.typeOfPowerOfAttorney).sort().join(','), 'bank,gesundheit', 'beide Arten erhalten');
  assert.equal(vm.map(r => r.storageLocation).sort().join(','), 'Hausarzt,Sparkasse', 'beide Ablageorte erhalten');
});

test('[ImpGate] dasselbe fuer Sorgerechtsverfuegung (Form „alle")', async () => {
  const { V } = await frischMitDepot();
  const plan = { quelleLabel: 'test', zeilen: [], register: [], listen: [{
    sektorId: 'advanceCare', feldId: 'provisionInstruments', eintraege: [
      { instrument: 'guardian-nomination', storageLocation: 'Ordner A' },
      { instrument: 'guardian-nomination', storageLocation: 'Ordner B' },
    ] }] };
  V.importAnwenden(plan, { alleKonflikte: true });
  assert.equal(vomTyp(V, 'guardian-nomination').length, 2, 'kann je Kind getrennt bestehen');
});
