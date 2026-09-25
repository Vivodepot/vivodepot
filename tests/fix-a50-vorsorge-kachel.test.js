'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A50 (U2-ADR-117) — die zwölfte Anlass-Kachel „Vorsorge treffen"
   ────────────────────────────────────────────────────────────────────────────
   Der Einstieg zum Lage-Blatt (A58/A68), KEIN eigener Assistent. `waehleAnlass` löst
   `ziel.lage` über `oeffneLebenslage` auf. Die sieben Felder der Lage `eigene-vorsorge`
   hatten null geführte Deckung (A50-Befund); über diese Kachel sind sie erreichbar.

   Regel 13: geprüft wird der PRODUKTWEG — `waehleAnlass(anlassId)` bei offenem Depot, wie
   es der Klick auf die Kachel auslöst — nicht `oeffneLebenslage` direkt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[A50] die zwölfte Kachel existiert und zielt per {lage} auf eigene-vorsorge', () => {
  const { V } = ladeKern();
  const k = (V.ANLAESSE || []).find((a) => a.id === 'eigene-vorsorge');
  assert.ok(k, 'die Kachel eigene-vorsorge existiert');
  assert.equal(k.label, 'Vorsorge treffen', 'Bürger-Label');
  assert.deepEqual(k.ziel, { lage: 'eigene-vorsorge' }, 'Ziel = die Lage, kein Wizard/Blatt');
  assert.ok(V.BAUSTEIN_BY_ID['eigene-vorsorge'], 'und die Lage existiert im Katalog');
});

test('[A50] der Klick auf die Kachel öffnet das Lage-Blatt — der Produktweg', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('a50-pw-2026!');
  V.akteurSelbstErklaeren('Tester');
  V.betreteApp();
  V.waehleAnlass('eigene-vorsorge');                 // wie der Kachel-Klick (Depot offen → weiter())
  assert.equal(V.aktiveLageId, 'eigene-vorsorge', 'die Lage ist aktiv');
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /data-lage-sektor="advanceCare"/, 'das Blatt ist gerendert');
  assert.match(html, /data-lage-sektor="personal"/, 'mit beiden Heimat-Bereichen');
});

test('[A50] eine unbekannte Lage im Ziel führt NICHT ins Leere — die Zusage-Grenze', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('a50-pw-2026!');
  V.akteurSelbstErklaeren('Tester');
  V.betreteApp();
  // oeffneLebenslage lehnt eine unbekannte Lage ab (kein toter Einstieg) — die Ansicht bleibt,
  // was sie war. Belegt die Disziplin „nur wenn es die Definition gibt" (wie beim Wizard-Ziel).
  const vorher = V.aktiveLageId;
  V.oeffneLebenslage('gibt-es-nicht');
  assert.equal(V.aktiveLageId, vorher, 'eine unbekannte Lage ändert den Zustand nicht');
});
