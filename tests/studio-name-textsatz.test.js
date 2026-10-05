'use strict';
/* studio-name-textsatz.test.js — das Werkzeug der Institutionen heißt in sichtbaren Texten Studio (Befund 04.10.2026)
   ─────────────────────────────────────────────────────────────────
   Der Fund: `strings:vereinbarungAngebotText` sagte in der Bürger-App „im Template-Generator“ / „in the template generator“. Das Werkzeug heißt seit v847
   Studio. Hier: kein Text im Textsatz (Deutsch, Englisch) nennt es noch mit dem alten Namen; Rot-Beweis auf den alten Sätzen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const DE = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
const EN = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;
const ALTER_NAME = /Template-Generator|Vorlagen-Generator|template[- ]generator/i;

test('[Studio-Name] kein Text im Textsatz nennt das Werkzeug noch Template-Generator', () => {
  const funde = [];
  for (const [k, t] of Object.entries(DE)) if (typeof t === 'string' && ALTER_NAME.test(t)) funde.push('DE ' + k);
  for (const [k, t] of Object.entries(EN)) if (typeof t === 'string' && ALTER_NAME.test(t)) funde.push('EN ' + k);
  assert.deepEqual(funde, []);
});

test('[Studio-Name] das Angebot nennt das Studio, Deutsch und Englisch', () => {
  assert.match(DE['strings:vereinbarungAngebotText.text'], /im Studio/);
  assert.match(EN['strings:vereinbarungAngebotText.text'], /in the Studio/);
});

test('[Studio-Name·Rot-Beweis] die alten Sätze werden gefunden, die neuen nicht', () => {
  assert.ok(ALTER_NAME.test('Die Stelle liest dieses Angebot im Template-Generator und nimmt eine Bedingung an.'));
  assert.ok(ALTER_NAME.test('The organisation reads this offer in the template generator and accepts a condition.'));
  assert.ok(!ALTER_NAME.test(DE['strings:vereinbarungAngebotText.text']) && !ALTER_NAME.test(EN['strings:vereinbarungAngebotText.text']));
});
