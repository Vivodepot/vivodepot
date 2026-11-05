'use strict';
/* Wortliste der Sub-Depot-Texte (31.10.2026, Befund P04 aus dem Rundgang Pro, HOCH)
   ────────────────────────────────────────────────────────────────────────
   „einhängen“ heißt „als Sub-Depot hinzufügen“, „versiegelt“ heißt „verschlossen“ — in Privat und Pro, deutsch und
   englisch („mount“, „seal“). Die Texte mit den alten Wörtern standen nach dem Texte-Wagen noch, weil keiner sie
   anfasste. Diese Probe liest jeden Text der vier Textsatz-Module, nicht nur die bekannten Schlüssel: ein neuer
   Text mit dem alten Wort fällt hier, gleich wo er steht.
   BLEIBT: ein Text, in dem das Wort keine Depot-Sache meint, steht namentlich mit Grund in der Liste.
   ROT-BEWEIS: im selben Test fällt ein gepflanzter Text „Depot einhängen“. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');

const MODULE = {
  de: ['textsatz-de-modul.json', 'textsatz-de-pro-modul.json'],
  en: ['textsatz-en-modul.json', 'textsatz-en-pro-modul.json'],
};
const ALT = {
  de: /einhäng|eingehängt|versiegel|entsiegel/i,
  en: /\bmount|\bunseal|\breseal|\bseal(?:ed|s)?\b/i,
};
const BLEIBT = {
  'strings:vpOrtPlaceholder.text': 'ein Umschlag aus Papier im Tresor, kein Depot',
  'strings:mappeEdcHinweis.text': 'das Siegel der ausstellenden Stelle an einem Nachweis (EN „seal“), kein Depot',
  'strings:passwortWortliste.text': 'Wortliste für Passwörter, ein Wort unter vielen',
};

function funde(texte, sprache) {
  return Object.entries(texte).filter(([k, v]) => typeof v === 'string' && ALT[sprache].test(v) && !Object.prototype.hasOwnProperty.call(BLEIBT, k))
    .map(([k, v]) => k + ' | ' + v.slice(0, 80));
}

test('[Sub-Depot·Wortliste] kein Text in Privat oder Pro sagt noch „einhängen“ oder „versiegeln“ (EN „mount“, „seal“)', () => {
  for (const [sprache, dateien] of Object.entries(MODULE)) {
    for (const d of dateien) {
      const texte = require(path.join(__dirname, '..', 'tools', d)).texte;
      assert.deepEqual(funde(texte, sprache), [], d);
    }
  }
});

test('[Sub-Depot·Wortliste] jede Ausnahme nennt ihren Grund und trifft einen echten Text', () => {
  const de = require(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json')).texte;
  for (const [k, grund] of Object.entries(BLEIBT)) {
    assert.ok(grund.length > 10, k);
    assert.ok(Object.prototype.hasOwnProperty.call(de, k), 'Ausnahme ohne Text: ' + k);
  }
});

test('[Sub-Depot·Wortliste·Rot-Beweis] ein gepflanzter Text mit dem alten Wort fällt', () => {
  assert.equal(funde({ 'strings:probe.text': 'Depot einhängen' }, 'de').length, 1);
  assert.equal(funde({ 'strings:probe.text': 'Depot wieder versiegelt.' }, 'de').length, 1);
  assert.equal(funde({ 'strings:probe.text': 'Mount depot' }, 'en').length, 1);
  assert.equal(funde({ 'strings:probe.text': 'Als Sub-Depot hinzufügen' }, 'de').length, 0);
});
