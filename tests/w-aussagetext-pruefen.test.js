'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Aussagetext-Wächter („Die Prüfebene reparieren", 12.08.2026, Zug 4)
   ────────────────────────────────────────────────────────────────────────
   Regel 18: rot am kaputten Beispiel (ein gebundener Ausdruck existiert nicht mehr — z. B.
   nach einer Umbenennung, deren Kommentar niemand nachzog), grün am erlaubten (der echte Kern).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { findeBindungen, existiertImKern, pruefen } = require('../tools/w-aussagetext-pruefen.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

test('[w-aussagetext] findeBindungen liest // ZUSTAND: nur, wenn es direkt vor einem STRINGS-Schlüssel steht', () => {
  const quelle = [
    '  // ZUSTAND: istOffen',
    '  einTitel: "Offen",',
    '  // ZUSTAND: verwaist — kein Schluessel direkt danach',
    '  // noch ein Kommentar dazwischen',
    '  anderesFeld: "x",',
  ].join('\n');
  const b = findeBindungen(quelle);
  assert.deepEqual(b.map((x) => x.schluessel), ['einTitel'],
    'nur die Bindung mit direkt folgendem Schlüssel wird erkannt — die zweite (Kommentar dazwischen) bleibt aus, kein Bindungsversprechen ohne Ziel');
});

test('[w-aussagetext] existiertImKern findet Funktionen und Konstanten, reduziert Punktnotation auf den Objektnamen', () => {
  const quelle = 'function meineFunktion(a, b) { return a; }\nconst MEINE_KONSTANTE = 1;\n';
  assert.equal(existiertImKern(quelle, 'meineFunktion'), true);
  assert.equal(existiertImKern(quelle, 'MEINE_KONSTANTE'), true);
  assert.equal(existiertImKern(quelle, 'MEINE_KONSTANTE.eigenschaft'), true, 'Punktnotation wird auf den Objektnamen reduziert');
  assert.equal(existiertImKern(quelle, 'gibtEsNicht'), false);
});

test('[Rotmachbarkeit] echter Kern: alle gebundenen Ausdrücke existieren — und die Probe würde eine Umbenennung fangen', () => {
  const { gebunden, funde } = pruefen(KERN);
  assert.ok(gebunden >= 15, 'Vorbedingung: der Suchraum trägt die Aussage — mindestens 15 Bindungen erwartet, gefunden ' + gebunden);
  assert.deepEqual(funde, [],
    'Diese Bindungen zeigen auf einen Ausdruck, den es nicht (mehr) gibt:\n  ' + funde.join('\n  '));
});

test('[Rotmachbarkeit] eine Umbenennung der gebundenen Funktion wird real gefunden (Kopie, Original unberührt)', () => {
  const original = fs.readFileSync(KERN, 'utf8');
  assert.equal(original.split('function saveStatusModell(').length - 1, 1,
    'Vorbedingung der Probe: die Zielzeile kommt genau einmal vor — sonst pflanzt sie nichts Eindeutiges');
  const mutiert = original.replace('function saveStatusModell(', 'function saveStatusModellUMBENANNT(');
  const tmp = path.join(os.tmpdir(), 'w-aussagetext-probe-' + process.pid + '.html');
  fs.writeFileSync(tmp, mutiert);
  try {
    const { funde } = pruefen(tmp);
    assert.ok(funde.length > 0, 'eine Umbenennung MUSS als Fund auffallen — sonst zeigt der Kommentar ins Leere, ohne dass es jemand merkt');
    assert.ok(funde.every((f) => f.includes('saveStatusModell')), 'jeder Fund muss den betroffenen Ausdruck nennen');
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  // Original unberührt — dieselbe Disziplin wie beim Selbsttest (pruefeUnberuehrt).
  assert.equal(fs.readFileSync(KERN, 'utf8'), original, 'die Probe darf den echten Kern nicht verändert haben');
});
