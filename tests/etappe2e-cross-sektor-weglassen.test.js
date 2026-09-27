'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Etappe 2e (Schnitt Glied 2, A286) — „Weglassen, nicht Umbelegen",
   CROSS_SEKTOR_FELDER (U2-ADR-008 Cross-Sektor-Sichtbarkeit)
   ────────────────────────────────────────────────────────────────────────
   Spiegel von Etappe 2c (SITUATIONEN/_ANG_SITUATIONEN) und 2b
   (`_b16ZielExistiert`) — diesmal für die neun `{quelle, feld, ziel}`-
   Einträge, die ein Sektor-Feld als reine Lese-Sicht in einem ANDEREN
   Sektor mit anzeigt (`renderSektor`, der `sektion-fremd`-Block). Vor
   diesem Bau hatte `CROSS_SEKTOR_FELDER` KEINE Existenzprüfung — anders
   als `SITUATIONEN` (W-9), `WIZARDS` (tests/wizard-schreibziele.test.js)
   oder `ERKENNUNG_LEITFELDER` (tests/m1-erkennung-ablauf-leitfelder.test.js)
   gab es hier noch nicht einmal einen CI-Wächter. Alle neun heutigen
   Einträge lösen auf (geprüft) — der Wächter ist rein vorbeugend, wie 2c.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'etappe2e-cross-sektor-pw!';

test('[2e] kein heutiger CROSS_SEKTOR_FELDER-Eintrag ist tot', () => {
  const { V } = ladeKern();
  const tote = V.CROSS_SEKTOR_FELDER.filter((e) => !V.feldDefFuer(e.quelle, e.feld));
  assert.deepEqual(tote, [], 'ein neuer toter Zeiger — benennen (mit Grund) oder korrigieren, wie bei B16');
});

test('[2e] Rot-Beleg: ein angemeldetes totes Ziel entfällt aus der Cross-Sektor-Ansicht, statt roh zu erscheinen', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.crossSektorAnmelden({ quelle: 'erfundener-sektor-xyz', feld: 'ein_erfundenes_feld_xyz', ziel: 'finance' });
  V.renderSektor('finance');
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('ein_erfundenes_feld_xyz'), 'kein roher feldId als Beschriftung');
});

test('[2e · Gegenprobe] ein echtes Cross-Sektor-Ziel bleibt sichtbar (education.grossMonthlyIncome → finanzen)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('education', 'grossMonthlyIncome', '3500');
  V.renderSektor('finance');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('3500'), 'der aus Bildung gezogene Wert erscheint weiter in Finanzen');
});
