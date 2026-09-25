'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-375 (08.09.2026, nach Produktentscheidung)
   ────────────────────────────────────────────────────────────────────────
   Der zweite Einlass desselben Moduls, mit anderem pruefIntervallMonate — die
   Lücke, die keine bestehende Probe deckte: der reine Dedup-by-typ (U2-ADR-370)
   liess einen bestehenden Termin unangetastet, auch wenn die neuere Fassung ein
   anderes Intervall mitbrachte. „Das Modul bestimmt das WAS, die Bürgerin das OB":
     aktiver Termin (>0) + neuere Fassung  -> Intervall wird ÜBERNOMMEN
     abgeschalteter Termin (0) + neuere Fassung -> bleibt 0, IMMER
     ältere Fassung -> ändert nichts (bestehender Fall, hier auch fürs Intervall)
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function modulBundle(overrides) {
  const modul = Object.assign({
    modulTyp: 'logikModul', id: 'test-zweiter-einlass-modul', titel: 'Test-Zweiter-Einlass',
    sektor: 'identity', moduleVersion: 1, herkunft: 'radiologie-praxis-test',
    datenSchema: {
      familienstand: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' },
    },
    abschnitte: [{ bloecke: [] }],
    dokAusgabe: { h1: 'Test-Zweiter-Einlass' },
  }, overrides || {});
  return JSON.stringify(modul);
}

async function frischerKern() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw-zweiter-einlass-test');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

function termin(V) {
  return V.getData().dokumente.find((d) => d && d.typ === 'modul:test-zweiter-einlass-modul');
}

test('[U2-ADR-375·Rot-Beweis 1/2] ABGESCHALTET (0) + neuere Fassung mit Intervall 6 → bleibt 0', async () => {
  const { V } = await frischerKern();
  V.modulEinlassen(modulBundle({ moduleVersion: 1, pruefIntervallMonate: 12 }));
  const doc = termin(V);
  assert.ok(doc);
  V.dokumentSetzen(doc.id, 'pruefIntervallMonate', 0);
  assert.equal(termin(V).pruefIntervallMonate, undefined, 'Vorbedingung: wirklich abgeschaltet');

  const raus = V.modulEinlassen(modulBundle({ moduleVersion: 2, pruefIntervallMonate: 6 }));
  assert.equal(raus.angenommen, true, 'die neuere Fassung selbst wird angenommen');
  assert.equal(termin(V).pruefIntervallMonate, undefined,
    'die Abschaltung der Bürgerin gewinnt gegen JEDE neuere Modulfassung, ausnahmslos');
  assert.equal(V.getData().dokumente.filter((d) => d && d.typ === 'modul:test-zweiter-einlass-modul').length, 1,
    'kein zweiter Datensatz entsteht');
});

test('[U2-ADR-375·Rot-Beweis 2/2] AKTIV (12) + neuere Fassung mit Intervall 6 → steht danach auf 6', async () => {
  const { V } = await frischerKern();
  V.modulEinlassen(modulBundle({ moduleVersion: 1, pruefIntervallMonate: 12 }));
  assert.equal(termin(V).pruefIntervallMonate, 12);

  const raus = V.modulEinlassen(modulBundle({ moduleVersion: 2, pruefIntervallMonate: 6 }));
  assert.equal(raus.angenommen, true);
  assert.equal(termin(V).pruefIntervallMonate, 6, 'das Modul bestimmt das WAS — Intervall wird übernommen');
  assert.equal(V.getData().dokumente.filter((d) => d && d.typ === 'modul:test-zweiter-einlass-modul').length, 1);
});

test('[U2-ADR-375·Gegenprobe] eine ÄLTERE Fassung ändert auch das Intervall nicht', async () => {
  const { V } = await frischerKern();
  V.modulEinlassen(modulBundle({ moduleVersion: 5, pruefIntervallMonate: 12 }));
  assert.equal(termin(V).pruefIntervallMonate, 12);

  const raus = V.modulEinlassen(modulBundle({ moduleVersion: 1, pruefIntervallMonate: 6 }));
  assert.equal(raus.angenommen, false);
  assert.equal(raus.grund, 'aeltere-fassung');
  assert.equal(termin(V).pruefIntervallMonate, 12, 'eine verworfene ältere Fassung rührt das Intervall nicht an');
});

test('[U2-ADR-375] gleiches Intervall in der neueren Fassung — kein Fehler, bleibt beim Wert', async () => {
  const { V } = await frischerKern();
  V.modulEinlassen(modulBundle({ moduleVersion: 1, pruefIntervallMonate: 12 }));
  const raus = V.modulEinlassen(modulBundle({ moduleVersion: 2, pruefIntervallMonate: 12 }));
  assert.equal(raus.angenommen, true);
  assert.equal(termin(V).pruefIntervallMonate, 12);
});
