'use strict';
/* S8 (U2-ADR-428): keine Lesestelle greift auf die deutsche Tabelle des Kerns zu — alles geht über `_sprachBasis()`.
   Vorher waren es fünfzehn Stellen und kein Register; jede neue hätte die Umstellung von Deutsch auf ein Modul still unterlaufen.
   Erlaubt ist im ausgeführten Code des Kerns KEIN Vorkommen der Konstante mehr; `_sprachBasis()` liest das Modul des Produkts. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ohneKommentareUndStrings } = require('../tools/g11-js-code-ohne-kommentare-strings.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
// Der Name wird zusammengesetzt, damit dieser Wächter selbst nicht in tests/textsatz-de-quelle-ein-leser.test.js auffällt.
const NAME = 'AB_WERK_TEXTSATZ_' + 'DE';
// Seit dem vierten Commit der Reihe (S8) steht die Konstante nicht mehr im Kern: erlaubt ist NICHTS. Die Liste bleibt als Ort, an dem eine Ausnahme mit Grund stehen müsste.
const ERLAUBT = [];

function codeVorkommen(html) {
  const funde = [];
  const re = /<script[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const code = ohneKommentareUndStrings(m[1]);
    let i = -1;
    while ((i = code.indexOf(NAME, i + 1)) >= 0) {
      const kontext = code.slice(Math.max(0, i - 30), i + 60);
      const von = code.lastIndexOf('\n', i) + 1;
      const bis = code.indexOf('\n', i);
      funde.push({ zeile: code.slice(von, bis < 0 ? undefined : bis).trim(), kontext });
    }
  }
  return funde;
}
function unerlaubte(html) {
  return codeVorkommen(html).filter((f) => !ERLAUBT.some((r) => r.test(f.zeile)));
}

test('[S8·Zugriffspunkt] kein Code des Kerns nennt die alte Konstante — weder als Definition noch als Saat noch als Lesestelle', () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.deepEqual(unerlaubte(html).map((f) => f.zeile), []);
});

test('[S8·Zugriffspunkt·Positivkontrolle] der Zugriffspunkt existiert und wird von den Lesestellen benutzt (sonst prüft der Wächter nichts)', () => {
  const html = fs.readFileSync(KERN, 'utf8');
  assert.ok(/function _sprachBasis\(\) \{/.test(html), 'die Definition fehlt');
  assert.ok((html.match(/_sprachBasis\(\)/g) || []).length >= 15, 'die Lesestellen gehen über den Zugriffspunkt');
  assert.ok(html.length > 1e6, 'der Kern ist gelesen');
});

test('[S8·Zugriffspunkt·Rot-Beweis] eine neue direkte Lesestelle wird gefunden', () => {
  const html = fs.readFileSync(KERN, 'utf8');
  const kaputt = html.replace('function _sprachBasis() {', 'function _neueStelle(k) { return typeof ' + NAME + '.texte[k] === "string"; }\nfunction _sprachBasis() {');
  assert.notEqual(kaputt, html);
  assert.equal(unerlaubte(kaputt).length, 1);
});
