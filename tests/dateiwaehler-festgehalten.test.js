'use strict';
// Ein Dateiwähler, der nicht im Dokument hängt, muss bis zur Antwort festgehalten sein. Ohne Bezug darf die Speicherbereinigung ihn
// entfernen, während der Dialog offen ist. Darum öffnet der Kern jeden solchen Wähler über _dateiwaehlerOeffnen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/** Die Stellen, an denen ein losgelöster Dateiwähler direkt geklickt wird (ohne Kommentare und ohne den Helfer selbst). */
function direkteKlicks(kern) {
  const code = kern.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const helfer = code.indexOf('function _dateiwaehlerOeffnen(');
  const ohneHelfer = helfer < 0 ? code : code.slice(0, helfer) + code.slice(code.indexOf('input.click();', helfer) + 'input.click();'.length);
  const treffer = [];
  for (const m of ohneHelfer.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.createElement\('input'\);([\s\S]{0,900}?)\b\1\.click\(\)/g)) {
    if (!/\.type\s*=\s*'file'/.test(m[2])) continue;
    if (new RegExp('appendChild\\(' + m[1] + '\\)').test(m[2])) continue;
    treffer.push(m[1]);
  }
  return treffer;
}

test('[Dateiwähler] der Helfer hält das Element fest und löst es bei Antwort oder Abbruch', () => {
  const m = /let _dateiwaehlerOffen = null;\s*function _dateiwaehlerOeffnen\(input\) \{([\s\S]*?)\n\}/.exec(KERN);
  assert.ok(m, 'der Helfer steht im Kern');
  assert.match(m[1], /_dateiwaehlerOffen = input;/);
  assert.match(m[1], /addEventListener\('change', loesen, \{ once: true \}\)/);
  assert.match(m[1], /addEventListener\('cancel', loesen, \{ once: true \}\)/);
  assert.ok(m[1].indexOf('_dateiwaehlerOffen = input;') < m[1].indexOf('input.click();'), 'festhalten vor dem Klick');
});

test('[Dateiwähler·Klasse] kein losgelöster Dateiwähler wird direkt geklickt', () => {
  assert.deepEqual(direkteKlicks(KERN), []);
  assert.ok((KERN.match(/_dateiwaehlerOeffnen\(input\);/g) || []).length >= 4, 'Positivkontrolle: die vier Stellen gehen über den Helfer');
});

test('[Dateiwähler·Rot-Beweis] ein direkter Klick auf einen losgelösten Wähler fällt, ein Wähler im Dokument nicht', () => {
  const direkt = "const input = document.createElement('input');\n input.type = 'file';\n input.click();\n";
  assert.deepEqual(direkteKlicks(direkt), ['input']);
  const imDokument = "const datei = document.createElement('input');\n datei.type = 'file';\n b.appendChild(datei);\n datei.click();\n";
  assert.deepEqual(direkteKlicks(imDokument), []);
});
