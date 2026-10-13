'use strict';
/* Kein eingebetteter Selbst-Hash (Befund BUILD-SHA256-LEERVERSPRECHEN, 10.10.2026).
   Eine Datei kann ihren eigenen SHA-256 nicht tragen: der eingetragene Wert veränderte die Datei und damit den Hash. Der Kern
   trug trotzdem eine leere Konstante mit dem Kommentar „beim Release setzen“, und die Einstellungen zeigten „SHA-256: wird beim
   Release gesetzt“ — gesetzt wurde nie etwas. Die Prüfsumme je Fassung steht außerhalb der Datei, in SECURITY.md (Abschnitt
   „Fingerabdruck je Fassung“), und die Einstellungen nennen diesen Ort.
   Diese Probe hält die Klasse fest: kein ausgelieferter Text und kein Kommentar verspricht, die Datei trage oder bekomme ihren
   eigenen Hash. Geprüft wird, was ausgeliefert wird oder hineingebacken wird: Kern, Lese-App, Service Worker, Sprachmodule. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html', 'sw.js', 'tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json'];
const lesen = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');

// Ein Versprechen: der Bezeichner der früheren Konstante, der frühere Schlüssel des Platzhalters, oder eine Prüfsumme/ein Hash,
// die „beim Release gesetzt“ werde, in einer Zeile (beide Reihenfolgen, Deutsch und Englisch).
const VERSPRECHEN = [
  /\bBUILD_SHA256\b/,
  /\bfussHashPlatzhalter\b/,
  /(sha-?256|prüfsumme|checksum|hash)[^\n]{0,80}(beim release (setzen|gesetzt)|wird beim release|set at release|set on release)/i,
  /(beim release (setzen|gesetzt)|wird beim release|set at release|set on release)[^\n]{0,80}(sha-?256|prüfsumme|checksum|hash)/i,
];
function versprechen(text) {
  return text.split('\n').map((z, i) => [i + 1, z]).filter(([, z]) => VERSPRECHEN.some((r) => r.test(z))).map(([n, z]) => n + ': ' + z.trim().slice(0, 100));
}

test('[Selbst-Hash] kein ausgelieferter Text und kein Kommentar verspricht einen eingebetteten Selbst-Hash', () => {
  for (const d of DATEIEN) assert.deepEqual(versprechen(lesen(d)), [], d);
});

test('[Selbst-Hash] die Einstellungen nennen den Ort der Prüfsumme je Fassung, und SECURITY.md trägt diesen Abschnitt', () => {
  for (const d of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json']) {
    const t = JSON.parse(lesen(d)).texte['strings:fussPruefsummeOrt.text'];
    assert.ok(typeof t === 'string' && t.includes('SECURITY.md') && t.includes('Fingerabdruck je Fassung'), d);
  }
  assert.match(lesen('SECURITY.md'), /^## \d+ · Fingerabdruck je Fassung$/m, 'der genannte Abschnitt steht in SECURITY.md');
  assert.ok(lesen('vivodepot.html').includes('escapeHTML(STRINGS.fussPruefsummeOrt)'), 'die Einstellungen zeigen den Ort');
  assert.match(lesen('vivodepot.html'), /\(_markeIstEingebaut\(_markeName\(\)\)\n\s+\? '<div class="einst-zeile"><span class="einst-label">' \+ STRINGS\.fussHashLabel/, 'nur unter der eigenen Marke: das Register kennt kein Partnerprodukt');
});

test('[Selbst-Hash·Rot-Beweis] die alte Konstante, der alte Platzhalter und ein Release-Versprechen werden gefunden', () => {
  assert.equal(versprechen("const BUILD_SHA256 = '';").length, 1);
  assert.equal(versprechen('"strings:fussHashPlatzhalter.text": "x",').length, 1);
  assert.equal(versprechen('"strings:x.text": "SHA-256: wird beim Release gesetzt",').length, 1);
  assert.equal(versprechen('"strings:x.text": "checksum: set at release",').length, 1);
  assert.equal(versprechen('// beim Release setzen: SHA-256 der finalen Datei').length, 1);
  assert.equal(versprechen('// Version wird beim Release gezählt').length, 0, 'Gegenprobe: ein Release-Satz ohne Hash ist kein Versprechen');
});
