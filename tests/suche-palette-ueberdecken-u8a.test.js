'use strict';
/* Die Suche als Palette darf geschützte Anzeigen überdecken, nur solange das Feld den Fokus hat (U-8a, 17.11.2026).
   Befund: ab 768 px legte die Palette (.suche-feld.suche-offen mit Schleier) sich über die Ansicht; der Container stand nicht in
   ueberdeckenErlaubt, die Laufzeitprobe fiel beim ersten Fokus in der Kopf-Suche auf ungestaltetes HTML zurück. Nach dem Vorbild
   des offenen Menüs (tests/erscheinungsbild-mobil-menue-liste.test.js) steht genau ein Eintrag in den Regeln, gebunden an die Klasse
   suche-offen, und genau eine Stelle setzt und entfernt sie. Den Ablauf im Browser prüft tests/e2e/suche-palette-u8a.spec.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const EINTRAG = '.suche-feld.suche-offen';

function regeln(kern) {
  const a = kern.indexOf('const ERSCHEINUNGSBILD_REGELN = Object.freeze(');
  const b = kern.indexOf(');\n/* Ende ERSCHEINUNGSBILD_REGELN */', a);
  return JSON.parse(kern.slice(kern.indexOf('(', a) + 1, b));
}

function maengel(kern) {
  const f = [];
  const erlaubt = regeln(kern).ueberdeckenErlaubt;
  if (erlaubt.filter((s) => s === EINTRAG).length !== 1) f.push('Palette fehlt in ueberdeckenErlaubt');
  if (erlaubt.some((s) => /suche-feld|tb-suche-platz|suche-eingabe/.test(s) && s !== EINTRAG)) f.push('Suchfeld darf ohne Fokus überdecken');
  if ((kern.match(/classList\.(add|remove|toggle)\('suche-offen'/g) || []).length !== 1) f.push('suche-offen wird an mehr als einer Stelle gesetzt');
  if (!/eingabe\.onfocus = \(\) => \{ offen\(true\);/.test(kern) || !/eingabe\.onblur = \(\) => \{ offen\(false\);/.test(kern)) f.push('suche-offen folgt nicht dem Fokus');
  return f;
}

test('[U-8a·Überdecken] die Palette darf überdecken, nur solange das Suchfeld den Fokus hat', () => {
  assert.deepEqual(maengel(KERN), []);
});

test('[U-8a·Überdecken·Rot-Beweis] ohne den Eintrag, mit einem Eintrag ohne suche-offen und mit einem Nebenweg wird es rot', () => {
  const ohne = KERN.replace('"' + EINTRAG + '",', '');
  assert.deepEqual(maengel(ohne), ['Palette fehlt in ueberdeckenErlaubt']);
  const immer = KERN.replace('"' + EINTRAG + '",', '"' + EINTRAG + '",".suche-feld",');
  assert.deepEqual(maengel(immer), ['Suchfeld darf ohne Fokus überdecken']);
  const nebenweg = KERN.replace("eingabe.onblur = () => { offen(false);", "eingabe.onblur = () => { feld.classList.add('suche-offen');");
  assert.deepEqual(maengel(nebenweg), ['suche-offen wird an mehr als einer Stelle gesetzt', 'suche-offen folgt nicht dem Fokus']);
});
