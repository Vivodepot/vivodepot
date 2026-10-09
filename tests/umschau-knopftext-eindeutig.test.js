'use strict';
/* umschau-knopftext-eindeutig.test.js — die Feld-Schaltfläche der Umschau nennt ihr Feld im sichtbaren Text (Befund
   UMSCHAU-KNOPFTEXT-NICHT-EINDEUTIG, 08.10.2026; WCAG 2.4.6, 2.5.3). Vorher trugen alle denselben Text „nicht hinterlegt Eintragen“,
   der Feldname stand nur im aria-label; wer per Sprache steuert, sagt, was er sieht, und traf fünf gleiche Knöpfe.
   Diese Probe hält den Wortlaut: kein aria-label an der Schaltfläche (der sichtbare Text ist der zugängliche Name), der Hinweis
   setzt die Feldbeschriftung ein, und beide Sprachmodule tragen den Platzhalter. Die Laufzeit hält
   tests/e2e/umschau-eintragen-fuehrt-zum-einrichten.spec.js („Umschau·Knopftext“). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const DE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
const EN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
const KENNUNG = 'strings:umschauFeldEintragenFuer.text';

function knopfQuelle(kern) {
  const a = kern.indexOf('class="feld-umschau-eintragen"');
  if (a < 0) return '';
  return kern.slice(a, kern.indexOf('</button>', a));
}
function funde(kern, de, en) {
  const q = knopfQuelle(kern); const aus = [];
  if (!q) aus.push('Schaltfläche nicht gefunden');
  if (/aria-label/.test(q)) aus.push('aria-label an der Schaltfläche');
  if (!/STRINGS\.umschauFeldEintragenFuer\.replace\('\{feld\}', feld\.label\)/.test(q)) aus.push('Hinweis nennt das Feld nicht');
  for (const [name, t] of [['de', de], ['en', en]]) if (!String(t[KENNUNG] || '').includes('{feld}')) aus.push(name + ': Text ohne {feld}');
  return aus;
}

test('[Umschau·Knopftext] die Schaltfläche nennt ihr Feld im sichtbaren Text, ohne abweichendes aria-label', () => {
  assert.deepEqual(funde(KERN, DE, EN), []);
});

test('[Umschau·Knopftext·Rot-Beweis] der frühere Wortlaut fällt auf', () => {
  const alt = KERN.replace(/'" data-umschau-feld="' \+ escapeHTML\(feld\.id\) \+ '">'/, `'" data-umschau-feld="' + escapeHTML(feld.id) + '" aria-label="' + escapeAttr(feld.label) + '">'`)
    .replace("STRINGS.umschauFeldEintragenFuer.replace('{feld}', feld.label)", 'STRINGS.umschauFeldEintragen');
  const f = funde(alt, DE, EN);
  assert.ok(f.includes('aria-label an der Schaltfläche'));
  assert.ok(f.includes('Hinweis nennt das Feld nicht'));
  assert.ok(funde(KERN, Object.assign({}, DE, { [KENNUNG]: 'Eintragen' }), EN).includes('de: Text ohne {feld}'));
});
