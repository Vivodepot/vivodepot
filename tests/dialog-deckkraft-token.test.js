'use strict';
/* Die Deckkraft der Dialogfläche (Glas) ist ein Token des Erscheinungsbild-Moduls, kein fester Wert in App oder Studio:
   Profil „Salbei mit Glas“ führt --dialog-deckkraft in der Basis, App-Dialog und Studio-Dialog lesen es mit var(). Ein
   fest eingetragener rgba(255,255,255,.nn) in einer der beiden Dialogflächen ist rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const modul = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/erscheinung/erscheinungsbild-salbei-glas-modul.json'), 'utf8'));
const studio = fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8');

const liestToken = (text, regel) => { const m = text.match(regel); return !!m && /var\(--dialog-deckkraft\)/.test(m[1]); };
test('das Modul trägt --dialog-deckkraft als Zahl zwischen 0 und 1', () => {
  const w = Number(modul.basis['--dialog-deckkraft']);
  assert.ok(w > 0 && w <= 1, 'Wert: ' + modul.basis['--dialog-deckkraft']);
});
test('die Dialogfläche der App im Modul liest das Token, kein fester Wert', () => {
  assert.ok(liestToken(modul.stil['salbei-glas'], /#modal-rueck \.modal \{ background: ([^;]+);/), 'App-Dialog');
});
test('die Dialogfläche des Studios liest das Token, kein fester Wert', () => {
  assert.ok(liestToken(studio, /^dialog\.dlg \{ background: ([^;]+);/m), 'Studio-Dialog');
  assert.match(studio, /:root \{[^}]*--dialog-deckkraft: /);
});

test('[Rot-Beweis] eine fest eingetragene Deckkraft in einer Dialogfläche fällt', () => {
  assert.equal(liestToken('#modal-rueck .modal { background: rgba(255,255,255,.72); }', /#modal-rueck \.modal \{ background: ([^;]+);/), false);
  assert.equal(liestToken('dialog.dlg { background: rgba(255,255,255,.72); }', /^dialog\.dlg \{ background: ([^;]+);/m), false);
  assert.equal(liestToken('', /^dialog\.dlg \{ background: ([^;]+);/m), false, 'eine fehlende Regel ist kein Grün');
});
