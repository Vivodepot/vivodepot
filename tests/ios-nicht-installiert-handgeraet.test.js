'use strict';
/* iosNichtInstalliert trennt Handgerät und Schreibtisch (Befund SAFARI-ERKENNUNG-TRIFFT-SCHREIBTISCH-WEBKIT, 13.10.2026).
   navigator.standalone trägt auch Safari am Mac (gemessen 12.10.2026, Safari 27.0: Feld vorhanden und false, maxTouchPoints 0) und
   Playwright-WebKit am Schreibtisch; als iPhone/iPad gilt nur, wer zusätzlich Berührungspunkte hat. iPadOS im Desktop-Modus meldet einen
   Mac-Browser und trägt trotzdem Berührungspunkte: es bleibt ein iPad. Die Probe im echten WebKit steht in
   tests/e2e/safari-tab-anlegen-webkit.spec.js (Schreibtisch-Fall). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const grob = (matches) => (q) => ({ matches: matches && /pointer:\s*coarse/.test(q) });

function ios(navigator, matchMedia) {
  const { V } = ladeKern({ indexedDB: {}, navigator, matchMedia });
  return V.iosNichtInstalliert();
}

test('[Handgerät] iPhone im Tab: standalone false und Berührungspunkte: ja', () => {
  assert.equal(ios({ standalone: false, maxTouchPoints: 5 }), true);
});

test('[Handgerät] iPadOS im Desktop-Modus (Mac-Browser, Berührungspunkte): bleibt ein iPad', () => {
  assert.equal(ios({ standalone: false, maxTouchPoints: 5, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' }), true);
});

test('[Handgerät·Rot-Beweis] Safari am Mac (standalone false, keine Berührungspunkte): nein', () => {
  assert.equal(ios({ standalone: false, maxTouchPoints: 0 }), false);
  assert.equal(ios({ standalone: false }), false, 'ohne maxTouchPoints dasselbe');
});

test('[Handgerät] ohne Berührungspunkte, aber mit grobem Zeiger: ja; mit feinem Zeiger: nein', () => {
  assert.equal(ios({ standalone: false, maxTouchPoints: 0 }, grob(true)), true);
  assert.equal(ios({ standalone: false, maxTouchPoints: 0 }, grob(false)), false);
});

test('[Handgerät] vom Home-Bildschirm geöffnet oder ohne das Feld: nein', () => {
  assert.equal(ios({ standalone: true, maxTouchPoints: 5 }), false, 'installiert');
  assert.equal(ios({ maxTouchPoints: 5 }), false, 'kein navigator.standalone: nicht iOS-Safari');
});

test('[Handgerät] der Schreibtisch bekommt weder das App-Angebot noch den Home-Bildschirm-Hinweis, bleibt aber unter WebKit-Frist', () => {
  const { V } = ladeKern({ indexedDB: {}, navigator: { standalone: false, maxTouchPoints: 0, storage: { persist: async () => false } }, CSS: { supports: (a, b) => a === 'font' && b === '-apple-system-body' } });
  assert.equal(V.iosNichtInstalliert(), false);
  assert.equal(V.iosInstallHinweisNoetig(), false, 'der Handgriff „Zum Home-Bildschirm“ gilt am Mac nicht');
  assert.equal(V.webkitTabMitFrist(), true, 'die Räumungsfrist von WebKit gilt am Schreibtisch weiter (Engine-Erkennung)');
});
