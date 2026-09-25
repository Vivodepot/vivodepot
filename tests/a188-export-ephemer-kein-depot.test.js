'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — exportAuswahlEphemerAnwenden ohne offenes Depot wirft, statt zu
   schlucken (A188 Messung 1, Auftrag „Drei Abnahmen und vier Messungen",
   12.08.2026, gebaut 14./15.08.2026 im Auftrag „Belegkette und Lücken")
   ────────────────────────────────────────────────────────────────────────
   Vorher (real gesehen, ROT): `if (!data) return;` — die Funktion beendete
   sich still, kein Toast, kein Fehler, der Export-Knopf im Modal blieb
   ohne jede Rückmeldung tot. Einzige von 27 Schreibschutz-Stellen ohne den
   sonst durchgehenden `throw new Error('Kein offenes Depot.')`-Wächter, der
   vom Modal-Sicherheitsnetz (`onPrimaer`-try/catch → `zeigeKernFehler` →
   `fehlermeldungFuer`) aufgefangen und als Toast gezeigt wird.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[A188·M1] exportAuswahlEphemerAnwenden ohne offenes Depot wirft "Kein offenes Depot."', async () => {
  const { V } = ladeKern();   // KEIN depotAnlegen — data bleibt null, genau der gemeldete Fall
  await assert.rejects(
    () => V.exportAuswahlEphemerAnwenden([{ sektor: 'identity', feld: 'givenName' }], new Set(), () => {}),
    (e) => e instanceof Error && e.message === 'Kein offenes Depot.',
    'muss denselben Wächter wie die anderen 26 Schreibschutz-Stellen werfen, nicht still zurückkehren'
  );
});

test('[A188·M1] geworfener Fehler wird vom zentralen Übersetzer erkannt (Modal-Sicherheitsnetz-Pfad)', async () => {
  const { V } = ladeKern();
  let gefangen = null;
  try {
    await V.exportAuswahlEphemerAnwenden([], new Set(), () => {});
  } catch (e) {
    gefangen = e;
  }
  assert.ok(gefangen, 'muss überhaupt werfen');
  assert.equal(V.fehlermeldungFuer(gefangen), V.STRINGS.keinOffenesDepotFehlerUnbekannt);
});

test('[A188·M1] mit offenem Depot funktioniert der Export weiterhin unverändert (keine Regression)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  let captured = null;
  await V.exportAuswahlEphemerAnwenden(
    [{ sektor: 'identity', feld: 'givenName' }],
    new Set(['identity/givenName']),
    (opt) => { captured = V.vollExportJSON(opt); }
  );
  assert.equal(captured.depot.sektoren.identity.givenName, 'Maria');
});
