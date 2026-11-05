'use strict';
/* Das offene Menü am schmalen Bildschirm darf geschützte Anzeigen überdecken (30.10.2026)
   Befund UX-MOBIL-ERSCHEINUNGSBILD-WAECHTER: Seitenleiste und Hintergrund des Menüs standen nicht in ueberdeckenErlaubt; beim
   Öffnen des Menüs über der Notfall-Ansicht fiel die ganze Anwendung auf ungestaltetes HTML zurück. Diese Probe hält die zwei
   Einträge in den Regeln des Kerns fest, dass sie nur bei offenem Menü gelten (html.menue-auf) und dass eine
   Stelle die Klasse setzt und entfernt; den Ablauf im Browser prüft
   tests/e2e/erscheinungsbild-mobil-menue.spec.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const MENUE = ['html.menue-auf>body>#app>.menue-backdrop', 'html.menue-auf>body>#app>.sidebar'];

function regeln(kern) {
  const a = kern.indexOf('const ERSCHEINUNGSBILD_REGELN = Object.freeze(');
  const b = kern.indexOf(');\n/* Ende ERSCHEINUNGSBILD_REGELN */', a);
  return JSON.parse(kern.slice(kern.indexOf('(', a) + 1, b));
}

function maengel(kern) {
  const f = [];
  const erlaubt = regeln(kern).ueberdeckenErlaubt;
  for (const s of MENUE) if (!erlaubt.includes(s)) f.push('fehlt in ueberdeckenErlaubt: ' + s);
  if (erlaubt.some((s) => /(^|[\s,>])[.#](sidebar|menue-backdrop)\b/.test(s) && !/^html\.menue-auf>body>#app>/.test(s))) f.push('Menü darf auch geschlossen überdecken');
  if (!/<div id="app">[\s\S]*?\n  <nav class="sidebar" id="sidebar">[\s\S]*?\n  <div class="menue-backdrop" id="menue-backdrop"/.test(kern)) f.push('Seitenleiste und Hintergrund nicht direkt in #app');
  // Eine Stelle setzt und entfernt die Klasse, an #app und an <html>; Öffnen und Schließen gehen nur über sie.
  const zustand = /function menueZustand\(offen\) \{\n  for \(const el of \[document\.getElementById\('app'\), document\.documentElement\]\) \{\n    if \(el && el\.classList\) el\.classList\.toggle\('menue-auf', offen\);/;
  if (!zustand.test(kern)) f.push('menue-auf nicht an einer Stelle an #app und <html>');
  if ((kern.match(/classList\.(add|remove|toggle)\('menue-auf'/g) || []).length !== 1) f.push('menue-auf wird außerhalb von menueZustand gesetzt');
  if (!/function oeffneMenue\(\) \{ menueZustand\(true\); \}\nfunction schliesseMenue\(\) \{ menueZustand\(false\); \}/.test(kern)) f.push('Öffnen oder Schließen umgeht menueZustand');
  return f;
}

test('Menü: Seitenleiste und Hintergrund dürfen überdecken, nur solange das Menü offen ist', () => {
  assert.deepEqual(maengel(KERN), []);
});

test('Rot-Beweis: ohne die zwei Einträge und mit einem Eintrag ohne menue-auf wird es rot', () => {
  let alt = KERN;
  for (const s of MENUE) alt = alt.replace('"' + s + '",', '');
  assert.deepEqual(maengel(alt), MENUE.map((s) => 'fehlt in ueberdeckenErlaubt: ' + s));
  const offen = KERN.replace('"html.menue-auf>body>#app>.sidebar",', '"html.menue-auf>body>#app>.sidebar","#sidebar",');
  assert.deepEqual(maengel(offen), ['Menü darf auch geschlossen überdecken']);
  const nebenweg = KERN.replace("function schliesseMenue() { menueZustand(false); }", "function schliesseMenue() { document.getElementById('app').classList.remove('menue-auf'); }");
  assert.deepEqual(maengel(nebenweg), ['menue-auf wird außerhalb von menueZustand gesetzt', 'Öffnen oder Schließen umgeht menueZustand']);
});
