'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Datei-Ausgabe: Teilen-Blatt nur auf Touch/Standalone (U2-ADR-061)
   ────────────────────────────────────────────────────────────────────────
   `_teilenBevorzugt()` entscheidet, ob dateiAusgeben() das System-Teilen-Blatt
   (Web Share) nimmt oder den klassischen Download. Web Share NUR wo <a download>
   unzuverlässig ist: installierte Web-App ODER Touch-Gerät (pointer: coarse).
   Regressions-Wächter: Desktop-WebKit (Safari/DuckDuckGo) meldet canShare=true,
   MUSS aber den Download-Pfad nehmen — sonst hängt die Datei im Teilen-Blatt
   ohne „In Dateien sichern".
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

test('[Klausel] Bindung an U2-ADR-061 über das Fundament', () => {
  bindungPruefen('U2-ADR-061', 'entscheidung', [
    'Desktop-WebKit (pointer: fine) → Download-Pfad — der DuckDuckGo/Safari-Regressions-Wächter',
    'Touch-Gerät (pointer: coarse) → Teilen-Blatt (teilen=true)',
  ], __filename);
});

test('Desktop (kein matchMedia, kein standalone) → Download-Pfad (teilen=false)', () => {
  const { V } = ladeKern();
  assert.equal(V._teilenBevorzugt(), false);
});

test('Desktop-WebKit (pointer: fine) → Download-Pfad — der DuckDuckGo/Safari-Regressions-Wächter', () => {
  const { V } = ladeKern({ matchMedia: (q) => ({ matches: /fine/.test(q) }) });
  assert.equal(V.istStandaloneWebApp(), false, 'nicht standalone');
  assert.equal(V._teilenBevorzugt(), false, 'fine pointer → Download, NICHT Teilen-Blatt');
});

test('Touch-Gerät (pointer: coarse) → Teilen-Blatt (teilen=true)', () => {
  const { V } = ladeKern({ matchMedia: (q) => ({ matches: /coarse/.test(q) }) });
  assert.equal(V._teilenBevorzugt(), true);
});

test('Installierte Web-App (iOS navigator.standalone) → Teilen-Blatt', () => {
  const { V } = ladeKern({ windowNavigator: { standalone: true } });
  assert.equal(V.istStandaloneWebApp(), true);
  assert.equal(V._teilenBevorzugt(), true);
});

test('Installierte Web-App (display-mode: standalone) → Teilen-Blatt, auch bei fine pointer', () => {
  const { V } = ladeKern({ matchMedia: (q) => ({ matches: /standalone/.test(q) }) });
  assert.equal(V._teilenBevorzugt(), true);
});
