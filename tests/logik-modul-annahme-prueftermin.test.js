'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-373 (08.09.2026, nach Produktentscheidung)
   ────────────────────────────────────────────────────────────────────────
   Teil 2 zu U2-ADR-366/370: „Annahme" IST der Einlass — es gibt keinen zweiten,
   späteren Zustimmungsschritt für ein logikModul in diesem Kern. Drei rote
   Beweise, wörtlich aus der Produktentscheidung:
     1) VOR der Annahme kein Prüftermin (das Modul existiert im Depot noch nicht).
     2) MIT der Annahme entsteht der Prüftermin, wie jeder andere.
     3) NACH der Annahme ist er abschaltbar, OHNE das Modul anzufassen — und die
        Abschaltung überlebt einen vollen Depot-Rundlauf (Krypto-Serialisierung).
   "Abschalten heisst abschalten, nicht loeschen" — die Herkunft (quelle:'modul',
   typ:'modul:'+id) bleibt am Datensatz stehen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function modulBundle(overrides) {
  const modul = Object.assign({
    modulTyp: 'logikModul', id: 'test-annahme-modul', titel: 'Test-Annahme-Modul',
    sektor: 'identity', moduleVersion: 1, herkunft: 'radiologie-praxis-test',
    datenSchema: {
      familienstand: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' },
    },
    abschnitte: [{ bloecke: [] }],
    dokAusgabe: { h1: 'Test-Annahme-Modul' },
  }, overrides || {});
  return JSON.stringify(modul);
}

async function frischerKern() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw-annahme-test');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('[U2-ADR-373·Rot-Beweis 1/3] VOR der Annahme existiert kein Prüftermin — das Modul ist noch nicht im Depot', async () => {
  const { V } = await frischerKern();
  assert.equal((V.getData().logikModule || []).some((m) => m && m.id === 'test-annahme-modul'), false);
  assert.equal((V.getData().dokumente || []).some((d) => d && d.typ === 'modul:test-annahme-modul'), false);
});

test('[U2-ADR-373·Rot-Beweis 2/3] MIT der Annahme (Einlass) entsteht der Prüftermin', async () => {
  const { V } = await frischerKern();
  const raus = V.modulEinlassen(modulBundle({ pruefIntervallMonate: 12 }));
  assert.equal(raus.angenommen, true, 'der Einlass selbst muss gelingen');
  const doc = (V.getData().dokumente || []).find((d) => d && d.typ === 'modul:test-annahme-modul');
  assert.ok(doc, 'der Prüftermin entsteht IM SELBEN Einlass, kein zweiter Schritt');
  assert.equal(doc.quelle, 'modul');
  assert.equal(doc.pruefIntervallMonate, 12);
});

test('[U2-ADR-373] ein Modul ohne pruefIntervallMonate wird trotzdem angenommen — nur eben ohne Prüftermin', async () => {
  const { V } = await frischerKern();
  const raus = V.modulEinlassen(modulBundle());
  assert.equal(raus.angenommen, true);
  assert.equal((V.getData().dokumente || []).some((d) => d && d.typ === 'modul:test-annahme-modul'), false);
});

test('[U2-ADR-373·Rot-Beweis 3/3] NACH der Annahme ist der Termin abschaltbar, ohne das Modul anzufassen — und übersteht einen Depot-Rundlauf abgeschaltet', async () => {
  const { V } = await frischerKern();
  const raus = V.modulEinlassen(modulBundle({ pruefIntervallMonate: 6 }));
  assert.equal(raus.angenommen, true);
  const vorherModul = JSON.parse(JSON.stringify(
    V.getData().logikModule.find((m) => m && m.id === 'test-annahme-modul')));
  const doc = V.getData().dokumente.find((d) => d && d.typ === 'modul:test-annahme-modul');
  assert.ok(doc);

  // Abschalten — dieselbe generische Funktion wie für jeden anderen Dokument-Datensatz.
  V.dokumentSetzen(doc.id, 'pruefIntervallMonate', 0);
  const abgeschaltet = V.dokumentLesen(doc.id);
  assert.equal(abgeschaltet.pruefIntervallMonate, undefined, 'der Rhythmus ist weg');
  assert.equal(abgeschaltet.quelle, 'modul', 'die Herkunft bleibt stehen');
  assert.equal(abgeschaltet.typ, 'modul:test-annahme-modul', 'die Herkunft bleibt stehen');

  // Das Modul selbst ist unangetastet.
  const nachherModul = V.getData().logikModule.find((m) => m && m.id === 'test-annahme-modul');
  assert.deepEqual(JSON.parse(JSON.stringify(nachherModul)), vorherModul);

  // Voller Krypto-Rundlauf — die Abschaltung ist kein Bildschirm-Artefakt.
  const umschlag = await V.depotSerialisieren();
  const geladen = await V.depotLaden(umschlag, 'pw-annahme-test');
  assert.ok(geladen, 'der Rundlauf selbst muss gelingen');
  const nachRundlauf = V.getData().dokumente.find((d) => d && d.typ === 'modul:test-annahme-modul');
  assert.ok(nachRundlauf, 'der Datensatz überlebt — abschalten heisst nicht löschen');
  assert.equal(nachRundlauf.pruefIntervallMonate, undefined, 'weiterhin abgeschaltet nach dem Rundlauf');
  assert.equal(nachRundlauf.quelle, 'modul');
  assert.equal(nachRundlauf.typ, 'modul:test-annahme-modul');
});

test('[U2-ADR-373] eine ÄLTERE Fassung zählt nicht als Annahme — kein Prüftermin aus einem verworfenen Einlass', async () => {
  const { V } = await frischerKern();
  V.modulEinlassen(modulBundle({ moduleVersion: 5, pruefIntervallMonate: 3 }));
  // Ein zweiter Prüftermin für dasselbe typ entstünde ohnehin nie (Dedup) — hier zählt, dass
  // der VERWORFENE Einlass (ältere Fassung) selbst keinen eigenen Aufruf auslöst.
  const vorAnzahl = V.getData().dokumente.length;
  const raus = V.modulEinlassen(modulBundle({ moduleVersion: 1, pruefIntervallMonate: 3 }));
  assert.equal(raus.angenommen, false);
  assert.equal(raus.grund, 'aeltere-fassung');
  assert.equal(V.getData().dokumente.length, vorAnzahl);
});
