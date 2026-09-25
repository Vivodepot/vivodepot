'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A462 · Ein Anlass für eine Transkription
   ────────────────────────────────────────────────────────────────────────────
   `identity.formerNames` kennt sieben Anlässe für einen früheren Namen —
   keiner davon beschreibt zwei Umschriften desselben Namens (belegt an Amina
   Cheikh/Amine Shaikh, Stresstest 3). Wer eine zweite Schreibweise einträgt,
   wählte bisher `sonstiges` — und das bedeutet dann zweierlei: ein echter
   anderer Name oder nur eine andere Transkription desselben.

   Additiv, kein neuer Wächter nötig: `listenEintragHinzufuegen` nimmt jeden
   Auswahlwert klaglos an (Regel 23) — bestehende `sonstiges`-Einträge bleiben
   unverändert, nur die Liste wächst um eine Option.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'pw-a462';

function anlassFeld(V) {
  const sek = V.SEKTOR_BY_ID.identity.sektionen.find((k) => k.id === 'fruehere-namen');
  const fn = sek.felder.find((f) => f.id === 'formerNames');
  return fn.unterFelder.find((u) => u.id === 'reason');
}

test('[A462] transkription ist eine eigene Anlass-Option, nicht sonstiges', () => {
  const { V } = ladeKern();
  const anlass = anlassFeld(V);
  const werte = anlass.optionen.map((o) => o.wert);
  assert.ok(werte.includes('transkription'), werte.join(', '));
  assert.ok(werte.includes('sonstiges'), 'sonstiges bleibt bestehen');
});

test('[A462] Parität: dieselbe Option steht auch in der Lese-App', () => {
  // Seit Teil 3 (SEKTOREN-Generator, 17.09.2026) ist dieser Block generiertes JSON
  // (`JSON.stringify`, wie schon SITUATIONEN) statt handgetippter JS-Literale — ein
  // Quelltext-Stringvergleich auf `wert: 'transkription'` griffe nicht mehr. Die Struktur
  // selbst prüfen, wie schon die Kern-Probe oben (anlassFeld).
  const { V } = ladeLesen();
  const anlass = anlassFeld(V);
  const werte = anlass.optionen.map((o) => o.wert);
  assert.ok(werte.includes('transkription'), 'Lese-App kennt transkription nicht: ' + werte.join(', '));
});

test('[A462·Rot-Beweis] ein Eintrag mit anlass:transkription lässt sich schreiben und lesen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  V.sektorFeldSetzen('identity', 'familyName', 'Cheikh');
  V.listenEintragHinzufuegen('identity', 'formerNames',
    { name: 'Amine Shaikh', reason: 'transkription', proofStorageLocation: 'Zeugnis aus dem Herkunftsland' });
  const zeile = (V.getData().sektoren.identity.formerNames || []).find((z) => z.name === 'Amine Shaikh');
  assert.ok(zeile, 'Eintrag nicht gefunden');
  assert.equal(zeile.reason, 'transkription');
});

test('[A462·Gegenprobe] bestehende sonstiges-Eintraege bleiben unveraendert (additiv)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  V.listenEintragHinzufuegen('identity', 'formerNames', { name: 'Alt-Schreibweise', reason: 'sonstiges' });
  const zeile = (V.getData().sektoren.identity.formerNames || []).find((z) => z.name === 'Alt-Schreibweise');
  assert.equal(zeile.reason, 'sonstiges');
});
