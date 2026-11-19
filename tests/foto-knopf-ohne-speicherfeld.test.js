'use strict';
/* Foto-Knopf der Rubrik „Foto“ (Klasse FOTO-RUNDLAUF, 18.11.2026).
   Die Foto-Zeile ist nur lesend; damit man von der Umschau zum Foto kommt, trägt sie einen Knopf, der den Upload des
   Deckblatt-Fotos öffnet. Er darf nie ein Speicherfeld werden: trüge er data-edit, data-edit-ref oder data-edit-multi,
   läse bearbeitungSpeichern ihn zurück und schriebe beim nächsten Sichern über das gespeicherte Foto — derselbe Verlust
   wie beim Befund. Diese Probe hält am Quelltext fest: nur mit Bearbeiten-Recht, kein data-edit*, derselbe Upload wie das
   Deckblatt, beschriftet mit „Hinzufügen“ bzw. „Bearbeiten“. Browser-Beleg: tests/e2e/umschau-eintragen-fuehrt-zum-einrichten.spec.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// Der Block von der Wächter-Bedingung bis zum Anhängen des Knopfs.
function knopfBlock(quelle) {
  const a = quelle.indexOf("b.setAttribute('data-foto-waehlen', '')");
  if (a < 0) return null;
  const start = quelle.lastIndexOf('if (', quelle.lastIndexOf('c.querySelectorAll(\'[data-feld="\' + s.deckblatt.fotoFeld', a));
  const ende = quelle.indexOf('z.appendChild(b);', a);
  return start >= 0 && ende > a ? quelle.slice(start, ende + 'z.appendChild(b);'.length) : null;
}
function befunde(block) {
  const aus = [];
  if (!block) return ['Knopf data-foto-waehlen nicht gefunden'];
  if (!/^if \(darf && s\.deckblatt\)/.test(block)) aus.push('nicht an darf gebunden');
  if (/data-edit/.test(block)) aus.push('trägt data-edit*');
  if (!/flowMappeUpload\(sektorId/.test(block)) aus.push('öffnet nicht den Upload des Deckblatt-Fotos');
  if (!/STRINGS\.btnBearbeiten : STRINGS\.btnHinzufuegen/.test(block)) aus.push('Beschriftung nicht Hinzufügen/Bearbeiten');
  return aus;
}

test('[Foto-Knopf] nur mit Bearbeiten-Recht, kein data-edit*, derselbe Upload wie das Deckblatt', () => {
  const block = knopfBlock(KERN);
  assert.ok(block, 'Vorbedingung: der Knopf steht genau einmal im Kern');
  assert.equal(KERN.split("b.setAttribute('data-foto-waehlen', '')").length - 1, 1, 'genau ein Knopf data-foto-waehlen');
  assert.deepEqual(befunde(block), []);
});

test('[Foto-Knopf·Rot-Beweis] ein data-edit-ref am Knopf oder ein Knopf ohne darf fällt auf', () => {
  const block = knopfBlock(KERN);
  const mitRef = block.replace("b.setAttribute('data-foto-waehlen', '');", "b.setAttribute('data-foto-waehlen', ''); b.setAttribute('data-edit-ref', 'x');");
  assert.notEqual(mitRef, block);
  assert.ok(befunde(mitRef).includes('trägt data-edit*'));
  const ohneDarf = block.replace(/^if \(darf && s\.deckblatt\)/, 'if (s.deckblatt)');
  assert.notEqual(ohneDarf, block);
  assert.ok(befunde(ohneDarf).includes('nicht an darf gebunden'));
});
