'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-370 (08.09.2026, Produktentscheidung "modul prüftermin ja")
   ────────────────────────────────────────────────────────────────────────
   'modul' als DOKUMENT_QUELLE — ein logikModul kann eine periodische Prüfpflicht
   MITBRINGEN (pruefIntervallMonate am Modul-Schema). Der rote Beweis in beide
   Richtungen: ein Modul MIT pruefIntervallMonate erzeugt einen Dokument-Datensatz,
   eines OHNE erzeugt keinen. Kein automatischer Trigger — logikModulPruefterminAnlegen
   ist eine reine, aufrufbare Funktion (Orchestrierung bleibt U2-ADR-366 Teil 2, Entwurf).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-09-08T09:00:00Z');

function testModul(overrides) {
  return Object.assign({
    modulTyp: 'logikModul', id: 'test-nachkontrolle-modul', titel: 'Test-Nachkontrolle',
    sektor: 'identity', moduleVersion: 1, herkunft: 'radiologie-praxis-test',
    datenSchema: {
      familienstand: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' },
    },
  }, overrides || {});
}

async function frischerKern() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('[U2-ADR-370] DOKUMENT_QUELLEN kennt \'modul\'', async () => {
  const { V } = await frischerKern();
  assert.ok(V.DOKUMENT_QUELLEN.includes('modul'));
});

test('[U2-ADR-370·Rot-Beweis 1/2] ein Modul MIT pruefIntervallMonate erzeugt einen Prüftermin', async () => {
  const { V } = await frischerKern();
  const modul = testModul({ pruefIntervallMonate: 12 });
  const doc = V.logikModulPruefterminAnlegen(modul, JETZT);
  assert.ok(doc, 'ein Datensatz muss entstehen');
  assert.equal(doc.quelle, 'modul');
  assert.equal(doc.typ, 'modul:test-nachkontrolle-modul');
  assert.equal(doc.pruefIntervallMonate, 12);
  assert.deepEqual(doc.felder, [{ sektorId: 'identity', feldId: 'maritalStatus' }]);
  assert.ok(V.getData().dokumente.some((d) => d.id === doc.id), 'landet im echten Register');
});

test('[U2-ADR-370·Rot-Beweis 2/2] ein Modul OHNE pruefIntervallMonate erzeugt keinen Prüftermin', async () => {
  const { V } = await frischerKern();
  const vorAnzahl = V.getData().dokumente ? V.getData().dokumente.length : 0;
  assert.equal(V.logikModulPruefterminAnlegen(testModul(), JETZT), null, 'fehlendes Feld');
  assert.equal(V.logikModulPruefterminAnlegen(testModul({ pruefIntervallMonate: 0 }), JETZT), null, 'null/0');
  assert.equal(V.logikModulPruefterminAnlegen(testModul({ pruefIntervallMonate: -3 }), JETZT), null, 'negativ');
  assert.equal(V.logikModulPruefterminAnlegen(testModul({ pruefIntervallMonate: 'bald' }), JETZT), null, 'kein Zahlwert');
  const nachAnzahl = (V.getData().dokumente || []).length;
  assert.equal(nachAnzahl, vorAnzahl, 'kein Datensatz entstand');
});

test('[U2-ADR-370] Dedup by typ: ein zweiter Aufruf desselben Moduls legt nichts doppelt an', async () => {
  const { V } = await frischerKern();
  const modul = testModul({ pruefIntervallMonate: 6 });
  const erster = V.logikModulPruefterminAnlegen(modul, JETZT);
  assert.ok(erster);
  const zweiter = V.logikModulPruefterminAnlegen(modul, JETZT);
  assert.equal(zweiter, null);
  assert.equal(V.getData().dokumente.filter((d) => d.typ === 'modul:test-nachkontrolle-modul').length, 1);
});

test('[U2-ADR-370] logikModulPruefen übernimmt pruefIntervallMonate/bezugsquelle strukturell geprüft', async () => {
  const { V } = await frischerKern();
  const roh = Object.assign(testModul({ pruefIntervallMonate: 24, bezugsquelle: 'Leitlinie XY, jährliche Kontrolle' }), {
    abschnitte: [{ bloecke: [] }],
    dokAusgabe: { h1: 'Test' },
  });
  const { gueltig, logik } = V.logikModulPruefen(roh);
  assert.ok(gueltig);
  assert.equal(logik.pruefIntervallMonate, 24);
  assert.equal(logik.bezugsquelle, 'Leitlinie XY, jährliche Kontrolle');
});

test('[U2-ADR-370] logikModulPruefen: ungültiges pruefIntervallMonate wird zu null, kein Bundle-Fehler', async () => {
  const { V } = await frischerKern();
  const roh = Object.assign(testModul({ pruefIntervallMonate: -1 }), {
    abschnitte: [{ bloecke: [] }],
    dokAusgabe: { h1: 'Test' },
  });
  const { gueltig, logik } = V.logikModulPruefen(roh);
  assert.ok(gueltig, 'ein ungültiger optionaler Wert verwirft nicht das ganze Bundle');
  assert.equal(logik.pruefIntervallMonate, null);
  assert.equal(logik.bezugsquelle, '');
});
