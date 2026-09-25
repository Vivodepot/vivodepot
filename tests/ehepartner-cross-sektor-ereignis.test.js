'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Ehepartner-Cross-Sektor-Bug" (14.09.2026) — Rot-Beweis.
   ────────────────────────────────────────────────────────────────────────
   Vorbestehender Bug (schon in git HEAD, nicht durch den Kennungs-Umbau
   verursacht): der Familienstand-Wechsel-Trigger in `sektorFeldSetzen` las
   den referenzierten Ehepartner aus `data.sektoren.identity.ehepartner` —
   das Feld liegt aber im Sektor `people` (`spouseOrCivilPartner`), nicht in
   `identity`. Der Lookup lieferte darum IMMER `undefined`, `ereignisMarkieren`
   feuerte nie, egal wie oft der Familienstand wechselte.

   Diese Probe fährt den ECHTEN Trigger-Pfad (sektorFeldSetzen auf das
   `familienstandFeld`, zweimal mit unterschiedlichem Wert — nur ein WECHSEL
   löst aus), nicht `ereignisMarkieren` direkt (das prüft
   tests/ereignis-achse-zug2.test.js bereits). Ohne den Fix bleibt
   `ereignisAnlaesse` leer, weil der Ehepartner nie gefunden wird. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function depotMitEhepartnerUndVollmacht() {
  const { V } = ladeKern();
  await V.depotAnlegen('ehepartner-ereignis-pw');
  V.akteurSelbstErklaeren('Tester');
  const partnerId = V.personHinzufuegen({ name: 'Jonas Partner' });
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { ref: partnerId });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: partnerId }] });
  // Erst-Setzen legt nur `_familienstandVorher` fest — ein echter WECHSEL braucht einen zweiten,
  // abweichenden Wert (s. Kommentar am Trigger: „_familienstandVorher !== wert").
  V.sektorFeldSetzen('identity', 'maritalStatus', 'ledig');
  return { V, partnerId };
}

test('[Ehepartner-Cross-Sektor] ein Familienstand-Wechsel markiert das Dokument der Vollmacht des referenzierten Ehepartners', async () => {
  const { V } = await depotMitEhepartnerUndVollmacht();
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  const dokumente = V.getData().dokumente || [];
  assert.equal(dokumente.length, 1, 'das Standard-Dokument zur Vollmacht-Zeile muss existieren');
  assert.equal(dokumente[0].ereignisAnlaesse.length, 1,
    'ROT ERWARTET, wenn der Ehepartner-Lookup wieder aus dem falschen Sektor liest: kein Anlass entsteht');
  assert.equal(dokumente[0].ereignisAnlaesse[0].typ, 'familienstand');
});

test('[Ehepartner-Cross-Sektor·Gegenprobe] ohne referenzierten Ehepartner (nur Freitext) entsteht kein Anlass', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('ehepartner-ereignis-pw-2');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { override: 'Nur Freitext, keine Person' });
  V.sektorFeldSetzen('identity', 'maritalStatus', 'ledig');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  const dokumente = V.getData().dokumente || [];
  const mitAnlass = dokumente.filter(d => Array.isArray(d.ereignisAnlaesse) && d.ereignisAnlaesse.length);
  assert.equal(mitAnlass.length, 0, 'ein Freitext-Ehepartner ohne Person-Referenz darf keinen Anlass erzeugen');
});
