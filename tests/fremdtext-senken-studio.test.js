'use strict';
/* v842 (D5): die Studio-Fundstelle der Prüfung „Text aus fremden Quellen kommt nie roh als HTML in die Seite“
   (die übrigen: tests/fremdtext-senken.test.js). Eine eigene Probe, weil sie das Studio lädt. Die Quelle eines fremden Vereinbarungs-Angebots wurde ohne Prüfung des Schemas als Verweis gesetzt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeGenerator } = require('./load-generator.js');

test('[Fremdtext·Generator·Rot-Beweis] die Quelle eines fremden Angebots wird nur als http(s)-Verweis gesetzt', () => {
  const { V: G, document } = ladeGenerator();
  const erzeugt = [];
  const erzeugen = document.createElement;
  document.createElement = (...a) => { const e = erzeugen(...a); erzeugt.push(e); return e; };
  const text = G.vereinbarungAlsText({ art: 'vivodepot-vereinbarung-angebot',
    bevorzugt: { kennung: 'k1', quelle: 'javascript:alert(1)' }, ausweich: { kennung: 'k2', quelle: 'https://beispiel.invalid/q' } });
  document.getElementById('vb-angebot-text').value = text;
  const angebot = G.vereinbarungAngebotAnzeigen();
  assert.ok(angebot, 'Vorbedingung: das Angebot wird gelesen');
  const ziele = erzeugt.map((e) => e.href).filter(Boolean);
  assert.ok(ziele.includes('https://beispiel.invalid/q'), 'ein http(s)-Verweis bleibt');
  assert.ok(!ziele.some((z) => /^\s*javascript:/i.test(z)), 'kein javascript:-Verweis: ' + ziele.join(', '));
});

test('[Stub·Rot-Beweis] leeren() endet an einem Stub-Element — ein Stub hat keine Kinder', () => {
  const { V: G, document } = ladeGenerator();
  const box = document.getElementById('vb-angebot-inhalt');
  assert.equal(box.firstChild, null);
  const t0 = Date.now();
  document.getElementById('vb-angebot-text').value = '';
  G.vereinbarungAngebotAnzeigen();   // ruft leeren(box) auf
  assert.ok(Date.now() - t0 < 5000, 'endet in endlicher Zeit');
});
