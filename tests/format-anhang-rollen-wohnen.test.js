'use strict';
/* Anhang-Rollen für Nachweise eines Antrags zum Wohnen (U2-ADR-465 Nachtrag, 05.11.2026).
   Ein Format-Modul nennt die Rolle, die Person wählt die Datei. Die Probe hält fest: jede neue Rolle steht im Kern, im
   Schema des Format-Moduls und trägt einen eigenen Wortlaut in Deutsch und Englisch; sie nimmt jede Dateiart und verlangt
   keine Urschrift. Ein Rot-Beweis zeigt, dass eine Rolle ohne Wortlaut als rohe Kennung erscheinen würde. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));
const NEU = ['betreuungsurkunde', 'aufenthaltstitel-nachweis', 'mietnachweis', 'nachweis-kinderbetreuung', 'nachweis'];

test('[Anhang·Wohnen] jede neue Rolle steht im Kern, nimmt jede Dateiart und verlangt keine Urschrift', () => {
  const { V } = ladeKern();
  for (const r of NEU) {
    const d = V.FORMAT_ANHANG_ROLLEN[r];
    assert.ok(d, r + ' fehlt im Kern');
    assert.equal(d.mime, null, r);
    assert.equal(d.urschrift, false, r);
  }
});

test('[Anhang·Wohnen] jede neue Rolle steht im Schema des Format-Moduls', () => {
  const s = JSON.stringify(lies('docs/format-modul/format-modul-schema.json'));
  const m = s.match(/"anhang":\{"description":"[^"]*FORMAT_ANHANG_ROLLEN\.","enum":(\[[^\]]*\])/);
  assert.ok(m, 'enum der Rollen fehlt');
  const liste = JSON.parse(m[1]);
  for (const r of NEU) assert.ok(liste.includes(r), r + ' fehlt im Schema');
});

test('[Anhang·Wohnen] jede neue Rolle hat einen eigenen Wortlaut in Deutsch und Englisch', () => {
  const { V } = ladeKern();
  const de = lies('tools/textsatz-de-modul.json').texte;
  const en = lies('tools/textsatz-en-modul.json').texte;
  for (const r of NEU) {
    const text = V._formatAnhangRolleText(r);
    assert.ok(typeof text === 'string' && text.length > 0 && text !== r, r + ': kein eigener Wortlaut');
    const k = Object.keys(de).find((x) => x.startsWith('strings:formatAnhangRolle') && de[x] === text);
    assert.ok(k, r + ': Wortlaut steht nicht im deutschen Satz');
    assert.ok(typeof en[k] === 'string' && en[k] !== de[k], r + ': englischer Wortlaut fehlt');
  }
});

test('[Anhang·Wohnen·Rot-Beweis] eine Rolle ohne eigenen Wortlaut erscheint als rohe Kennung', () => {
  const { V } = ladeKern();
  assert.equal(V._formatAnhangRolleText('gibt-es-nicht'), 'gibt-es-nicht');
});
