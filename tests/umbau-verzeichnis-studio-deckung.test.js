'use strict';
/* Deckungs-Probe des Studio-Verzeichnisses: tests/fixtures/umbau-verzeichnis-studio.json nennt jeden Knopf und jedes Feld
   des festen HTML von vivodepot-studio.html, und jede Funktion der Fachebene hat darin einen Platz.
   Nachmessen: node tools/funktionsverzeichnis-erheben.js --quelle vivodepot-studio.html --html studio
   ROT-BEWEIS: die gepflanzten Fälle unten (ein Element ohne Eintrag; eine Fachebenen-Funktion ohne Platz). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { messeHtml, zusammenfuehren } = require('../tools/funktionsverzeichnis-erheben.js');

const WURZEL = path.join(__dirname, '..');
const lies = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'umbau-verzeichnis-studio.json'), 'utf8'));

/* Funktionen der Fachebene, die beim Umbau auf eine Arbeitsfläche einen Platz behalten: Kennung, Codesystem, CSV, Schlüssel. */
const FACHEBENE = [
  'pal-kennungen', 'ed-codesystem', 'ed-codesystem-frei', 'ed-codewert-hinzu', 'ed-provenienz', 'tpl-csv',
  'sk-pw1', 'sk-pw2', 'sk-priv', 'sk-antrag', 'sk-pruef-datei', 'sk-pruef-pw', 'sk-pruefen-knopf', 'sk-erneut-laden', 'sk-verwerfen',
  'pr-privkey', 'pr-privkey-pw', 'pr-privkey-laden', 'pr-neu-pw1', 'pr-neu-pw2', 'pr-neu-speichern', 'pr-submit',
];

/* Liefert, was dem Verzeichnis gegenüber der Messung fehlt oder zu viel ist. */
function abweichung(verz, messung) {
  const z = zusammenfuehren(verz, messung);
  /* Ein Eintrag „entfällt mit Befund“ darf im Studio fehlen: er ist mit dem Umbau gegangen, der Befund nennt den Grund. */
  const mitBefund = new Set((verz.eintraege || []).filter((e) => e.zustand === 'entfällt mit Befund' && e.befund).map((e) => e.kennung));
  return { neu: z.neu, entfallen: z.entfallen.filter((k) => !mitBefund.has(k)) };
}

/* Liefert die Fachebenen-Funktionen ohne Platz: nicht im Verzeichnis, entfallen oder ohne Ort. */
function ohnePlatz(verz) {
  const nach = new Map(verz.eintraege.map((e) => [e.kennung, e]));
  return FACHEBENE.filter((k) => {
    const e = nach.get(k);
    return !e || e.zustand === 'entfällt mit Befund' || !e.neuer_platz || !String(e.neuer_platz.ort || '').trim();
  });
}

test('[Umbau-Studio] das Verzeichnis deckt das feste HTML des Studios: kein Element ohne Eintrag, kein Eintrag ohne Element oder Befund', () => {
  const messung = messeHtml(fs.readFileSync(path.join(WURZEL, 'vivodepot-studio.html'), 'utf8'), 'studio');
  assert.equal(messung.hinweis, undefined, 'Elemente ohne id und ohne data-Attribut');
  assert.deepEqual(abweichung(lies(), messung), { neu: [], entfallen: [] });
});

test('[Umbau-Studio] jede Funktion der Fachebene hat einen Platz', () => {
  assert.deepEqual(ohnePlatz(lies()), []);
});

test('[Umbau-Studio] gepflanzt: ein neues Element ohne Eintrag und ein gestrichener Eintrag werden gemeldet', () => {
  const verz = { eintraege: [{ kennung: 'alt', zustand: 'gemessen', neuer_platz: { ort: 'Start', weg: { alle: ['#alt'] } } }] };
  const messung = messeHtml('<body><main id="raum-x"><button id="neu">Neu</button></main></body>', 'x');
  assert.deepEqual(abweichung(verz, messung), { neu: ['neu'], entfallen: ['alt'] });
  verz.eintraege[0] = { kennung: 'alt', zustand: 'entfällt mit Befund', befund: 'gepflanzt' };
  assert.deepEqual(abweichung(verz, messung), { neu: ['neu'], entfallen: [] });
});

test('[Umbau-Studio] gepflanzt: eine Fachebenen-Funktion ohne Platz wird gemeldet', () => {
  const verz = lies();
  for (const e of verz.eintraege) {
    if (e.kennung === 'tpl-csv') { e.zustand = 'entfällt mit Befund'; e.befund = 'gepflanzt'; }
    if (e.kennung === 'ed-codesystem') e.neuer_platz.ort = '';
  }
  assert.deepEqual(ohnePlatz(verz), ['ed-codesystem', 'tpl-csv']);
});
