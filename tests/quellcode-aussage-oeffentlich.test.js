'use strict';
/* Befund QUELLCODE-AUF-ANFRAGE (24.09.2026): die Fußzeile sagte „Quellcode auf Anfrage" / „Source code on request", während der
   Quellcode seit der Veröffentlichung öffentlich unter QUELLCODE_LINK liegt. Klassenwächter: keine Aussage in Kern, Lese-App und den
   Produkt-Sprachmodulen, der Quellcode sei nur auf Anfrage, privat oder nicht öffentlich — solange ein öffentliches Repo verlinkt ist.
   Gemessen wird über die Texte (Werte der Sprachmodule, Zeichenketten im Kern), nicht über eine Handliste einzelner Schlüssel. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const UEBERHOLT = /(quellcode|quelltext|source code)[^.\n"']{0,40}(auf anfrage|on request|upon request|nicht öffentlich|not public|nicht veröffentlicht|not yet published|privat\b|private\b)/i;

function texte() {
  const raus = [];
  for (const datei of ['tools/textsatz-de-modul.json', 'tools/textsatz-en-modul.json']) {
    const m = JSON.parse(fs.readFileSync(path.join(REPO, datei), 'utf8'));
    for (const [k, v] of Object.entries(m.texte || {})) if (typeof v === 'string') raus.push({ wo: datei + ' ' + k, text: v });
  }
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const q = fs.readFileSync(path.join(REPO, datei), 'utf8');
    for (const m of q.matchAll(/'([^'\n]{8,300})'|"([^"\n]{8,300})"/g)) raus.push({ wo: datei, text: m[1] || m[2] });
  }
  return raus;
}
const funde = (liste) => liste.filter((t) => UEBERHOLT.test(t.text)).map((t) => t.wo + ': ' + t.text.slice(0, 80));

test('[Quellcode·öffentlich·Klasse] kein Text sagt, der Quellcode sei nur auf Anfrage oder nicht öffentlich — das Repo ist verlinkt', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.match(kern, /const QUELLCODE_LINK = 'https:\/\/github\.com\/vivodepot\/vivodepot';/, 'Kontrolle: das öffentliche Repo ist verlinkt');
  const alle = texte();
  assert.ok(alle.length > 1000, 'Kontrolle: die Texte werden gelesen (' + alle.length + ')');
  assert.deepEqual(funde(alle), []);
});

test('[Quellcode·öffentlich·Klasse·Rot-Beweis] die früheren Fußzeilen-Texte werden gefunden, die heutigen nicht', () => {
  assert.equal(funde([{ wo: 'x', text: 'Quellcode auf Anfrage' }, { wo: 'x', text: 'Source code on request' }]).length, 2);
  assert.deepEqual(funde([{ wo: 'x', text: 'Quellcode auf GitHub' }, { wo: 'x', text: 'Source code on GitHub' }]), []);
});
