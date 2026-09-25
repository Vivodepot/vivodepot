'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Dreischnitt der Formate — „Die Formate in ihre drei Teile
   zerlegen" (17.08.2026).
   ────────────────────────────────────────────────────────────────────────────
   WARUM DIE MESSUNG EINE PROBE BRAUCHT: sie beantwortet die Frage, ob ein
   Import-Kanal ohne fremden Code andocken könnte — und die Antwort hängt an
   einer Einordnung („ist dieser Erkenner als Daten schreibbar?"), die still
   kippen kann, wenn jemand die Regel anfasst. Eine Erhebung, deren Regel
   niemand prüft, ist eine Meinung mit Tabelle.

   `tools/formate-dreischnitt.js` läuft damit im Kreislauf statt nur auf Zuruf.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messen, erkennerKlasse, regexSchreibbar } = require('../tools/formate-dreischnitt.js');

test('[Dreischnitt] der Erkenner-Klassierer trennt Regex, Funktionsaufruf und Rumpf', () => {
  assert.equal(erkennerKlasse((t) => /BEGIN:VCARD/i.test(t)).klasse, 'regex');
  assert.equal(erkennerKlasse((t) => _istAutoritativesMedDokument(t)).klasse, 'funktion');   // eslint-disable-line no-undef
  assert.equal(erkennerKlasse(function (t) { let n = 0; for (const c of t) n++; return n > 0; }).klasse, 'rumpf');
  assert.equal(erkennerKlasse(undefined).klasse, 'keiner');
});

test('[Dreischnitt] ein Muster mit Rückwärtsreferenz oder Zustand ist KEINE Zeichenkette', () => {
  // Die Frage des Auftrags wörtlich: „ließe er sich als Zeichenkette schreiben, ohne
  // Bedeutung zu verlieren?" Rückwärtsreferenz und `g`/`y` beantworten das mit nein —
  // beides trägt Zustand, den eine Zeichenkette nicht mitbringt.
  assert.equal(regexSchreibbar('(t) => /BEGIN:VCARD/i.test(t)'), true);
  assert.equal(regexSchreibbar('(t) => /(a)\\1/.test(t)'), false, 'Rückwärtsreferenz');
  assert.equal(regexSchreibbar('(t) => /x/g.test(t)'), false, 'lastIndex ist Zustand');
});

test('[Dreischnitt·Rot-Beweis] DIE REGEL, DIE DAS ERGEBNIS VERSCHIEBT: ein Feldvergleich nach _jsonParse zählt als Daten', () => {
  // Ohne diese Regel meldet die Messung 0 von 17; mit ihr 4. Sie gehört deshalb
  // geprüft und nicht nur beschrieben.
  const jaFeldvergleich = erkennerKlasse((t) => { const o = _jsonParse(t); return !!(o && o.vct === 'x'); });   // eslint-disable-line no-undef
  assert.equal(jaFeldvergleich.klasse, 'rumpf');
  assert.equal(jaFeldvergleich.alsDatenAusdrueckbar, true);

  const neinEigeneLogik = erkennerKlasse((t) => { const o = _jsonParse(t); return !!(o && pruefeTief(o)); });   // eslint-disable-line no-undef
  assert.equal(neinEigeneLogik.alsDatenAusdrueckbar, false, 'ein zweiter Funktionsaufruf ist Ablauf');
});

test('[Dreischnitt] die Messung am echten Kern liefert für jeden Kanal alle drei Teile', () => {
  const { importe, exporte } = messen();
  assert.ok(importe.length >= 17, 'alle Import-Kanäle gemessen');
  for (const i of importe) {
    assert.ok(['regex', 'funktion', 'rumpf', 'keiner'].includes(i.erkenner.klasse), i.id);
    assert.ok(['tabelle', 'code'].includes(i.zuordnung), i.id);
    assert.ok(Array.isArray(i.geteilt), i.id);
  }
  // Der Export wird eine Ebene tiefer gemessen; ein Erzeuger mit einer Zeile wäre
  // der Beweis, dass die Delegation nicht aufgelöst wurde.
  assert.ok(exporte.every((e) => e.zeilen > 1), 'kein Erzeuger darf als Einzeiler durchgehen');
});
