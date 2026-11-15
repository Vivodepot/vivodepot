'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ratsche: Streuung der Dialoge (Stufe 4, UX-Bewertung 11.11.2026, Abschnitt 10)
   Je Dialog-Bauteil (Titel, Text, Knopfzeile, Schließen-Knopf, Abstand, Breite, Radius) darf die Zahl der verschiedenen Werte
   und die Zahl der freien Werte (feste Länge statt Token) nur sinken. Grundlinie: tools/dialog-streuung-grundlinie.json.
   Messwerkzeug: tools/dialog-streuung-messen.js. Ein neuer freier Wert ist ein Fund; wer ihn braucht, nimmt ein Token oder
   hebt die Grundlinie mit ausdrücklicher Freigabe an.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../tools/dialog-streuung-messen.js');
const GRUND = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'dialog-streuung-grundlinie.json'), 'utf8'));

test('[Dialog-Streuung] kein Bauteil streut mehr als die Grundlinie, kein neuer freier Wert', () => {
  const e = M.messen(M.quellenLaden(null));
  const funde = [];
  for (const b of M.BAUTEILE) {
    const g = GRUND.bauteile[b]; const m = e.bauteile[b];
    assert.ok(g, 'Grundlinie fehlt für ' + b);
    if (m.verschieden > g.verschieden) funde.push(`${b}: ${m.verschieden} verschiedene Werte, Grundlinie ${g.verschieden}`);
    if (m.frei > g.frei) funde.push(`${b}: ${m.frei} freie Werte, Grundlinie ${g.frei}`);
    if (m.freiDeklarationen > g.freiDeklarationen) funde.push(`${b}: ${m.freiDeklarationen} freie Deklarationen, Grundlinie ${g.freiDeklarationen}`);
  }
  if (e.inlineAttribute > GRUND.inlineAttribute) funde.push(`Inline-Stil in Dialognähe: ${e.inlineAttribute}, Grundlinie ${GRUND.inlineAttribute}`);
  assert.deepEqual(funde, [], 'Dialog-Streuung gestiegen:\n' + funde.join('\n'));
});

test('[Dialog-Streuung] Rot-Beweis: ein neuer freier Wert und ein neues Inline-Stil-Attribut werden gefunden', () => {
  const css = '.modal { padding: var(--space-5) var(--space-4); border-radius: var(--radius-fenster); max-width: var(--dialog-breite); }';
  const sauber = M.messen([{ name: 'f.css', art: 'css', text: css }]);
  assert.equal(sauber.bauteile.abstand.frei, 0);
  const frei = M.messen([{ name: 'f.css', art: 'css', text: css + ' .modal-aktionen { padding: 13px 21px; } .modal { border-radius: 19px; max-width: 433px; }' }]);
  assert.ok(frei.bauteile.abstand.frei > sauber.bauteile.abstand.frei, 'freier Abstand wird gezählt');
  assert.ok(frei.bauteile.radius.frei > sauber.bauteile.radius.frei, 'freier Radius wird gezählt');
  assert.ok(frei.bauteile.breite.frei > sauber.bauteile.breite.frei, 'freie Breite wird gezählt');
  assert.ok(frei.bauteile.knopfzeile.frei > sauber.bauteile.knopfzeile.frei, 'freier Wert der Knopfzeile wird gezählt');
  const inl = M.messen([{ name: 'f.html', art: 'markup', text: 'x = { koerperHTML: \'<p style="margin:7px 0">a</p>\' };' }]);
  assert.equal(inl.inlineAttribute, 1);
  assert.equal(inl.bauteile.abstand.frei, 1);
  // Token-Werte sind nicht frei
  const tok = M.messen([{ name: 'f.css', art: 'css', text: '.modal-aktionen { gap: var(--space-3); min-height: var(--ziel); }' }]);
  assert.equal(tok.bauteile.knopfzeile.frei, 0);
});

test('[Dialog-Streuung] Grundlinie nennt alle Bauteile und nur Zahlen', () => {
  for (const b of M.BAUTEILE) for (const k of ['verschieden', 'frei', 'freiDeklarationen']) assert.ok(Number.isInteger(GRUND.bauteile[b][k]) && GRUND.bauteile[b][k] >= 0, b + '.' + k);
});
