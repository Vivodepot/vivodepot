'use strict';
/* Hinweis unter „Weitere Briefe“ (personal.personalLettersWordsToPeople.hint), 08.11.2026:
   genau ein Satz. Der frühere zweite Satz über die getrennten Briefe darüber entfällt ersatzlos, DE und EN,
   in Privat und Pro, und in der Lese-App, die die Bereichsdefinition mitführt.
   Rot-Beweis: die Prüffunktion meldet den früheren Wortlaut. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const WURZEL = path.join(__dirname, '..');
const KENNUNG = 'personal.personalLettersWordsToPeople.hint';
const SOLL = {
  de: 'Worte an einzelne Personen — je Person ein Eintrag.',
  en: 'Words for individual people — one entry per person.',
};
/* Alle Sprachmodule, die im Baum liegen (Privat und, wo vorhanden, Pro); die Sprache steht im Dateinamen.
   Im öffentlichen Zuschnitt fehlen die Pro-Module — dann prüft die Probe die übrigen. */
const MODULE = Object.fromEntries(fs.readdirSync(path.join(WURZEL, 'tools'))
  .map((n) => n.match(/^textsatz-(de|en)(?:-[a-z]+)?-modul\.json$/))
  .filter(Boolean)
  .map((m) => ['tools/' + m[0], m[1]]));

function hinweisAusModul(text) {
  const j = JSON.parse(text);
  const satz = j.strings || j.texte || j;
  if (satz && typeof satz === 'object' && KENNUNG in satz) return satz[KENNUNG];
  const m = text.match(/"personal\.personalLettersWordsToPeople\.hint":\s*"([^"]*)"/);
  return m ? m[1] : undefined;
}

/* Befunde für einen Text, der den Hinweis führt: falscher Wortlaut oder ein zweiter Satz. */
function befunde(name, hinweis, sprache) {
  if (hinweis === undefined) return [name + ': Hinweis fehlt'];
  return hinweis === SOLL[sprache] ? [] : [name + ': Hinweis lautet „' + hinweis + '“ statt „' + SOLL[sprache] + '“'];
}

test('[Weitere Briefe] Hinweis in den vier Sprachmodulen ist genau der eine Satz', () => {
  assert.ok(Object.values(MODULE).includes('de') && Object.values(MODULE).includes('en'), 'DE- und EN-Sprachmodul fehlen');
  const alle = [];
  for (const [datei, sprache] of Object.entries(MODULE)) {
    alle.push(...befunde(datei, hinweisAusModul(fs.readFileSync(path.join(WURZEL, datei), 'utf8')), sprache));
  }
  assert.deepEqual(alle, []);
});

test('[Weitere Briefe] die Lese-App führt den Hinweis ebenso, ohne den früheren zweiten Satz', () => {
  const html = fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8');
  assert.ok(html.includes('"hint": "' + SOLL.de + '"'), 'Lese-App: neuer DE-Hinweis fehlt');
  assert.ok(!/je Person ein Eintrag\. Die (?:Szenario-)?Briefe darüber/.test(html), 'Lese-App: früherer zweiter Satz steht noch');
});

test('[Weitere Briefe·Rot-Beweis] der frühere Wortlaut wird gemeldet, DE und EN', () => {
  assert.equal(befunde('x', SOLL.de + ' Die Briefe darüber (Notarzt/Krankenhaus/Pflegeheim/Todesfall) bleiben getrennt.', 'de').length, 1);
  assert.equal(befunde('x', SOLL.en + ' The letters above (emergency doctor / hospital / care home / death) stay separate.', 'en').length, 1);
  assert.equal(befunde('x', undefined, 'de').length, 1);
  assert.deepEqual(befunde('x', SOLL.de, 'de'), []);
});
