'use strict';
/* Die Lupe im Kopf (U-8a, 17.11.2026, Desktop-Dummy D87 „ov-suche“, Handy M06 „Suche als Lupe“).
   Befund: bei schmaler Kopfleiste (Handy oder tb-eng) stand die Suche nur oben in der Seitenleiste, also hinter dem Menü; im Dummy steht
   im Kopf eine Lupe, die die Palette über der Ansicht öffnet. Jetzt: _kopfSucheOrdnen setzt tb-suche-lupe, sobald die Leiste schmal ist;
   die Lupe (id tb-lupe) holt das Feld in den Kopf (html.suche-lupe-auf) und gibt ihm den Fokus; der Fokusverlust schließt sie, das Feld
   geht zurück in die Seitenleiste. Den Ablauf im Browser bei 375 px prüft tests/e2e/suche-palette-u8a.spec.js.
   Rot-Beweis: ohne die Lupe, mit einer Lupe, die das Feld in der Seitenleiste lässt, ohne Schließen beim Fokusverlust und mit anderem
   Markup als dem Icon im Knopf (HTML-Senke _kopfLupe, html-senken-grundlinie) fällt die Probe. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');

function funktion(kern, name) {
  const a = kern.indexOf('function ' + name + '(');
  if (a < 0) return '';
  const b = kern.indexOf('\n}\n', a);
  return kern.slice(a, b < 0 ? undefined : b);
}

function maengel(kern, css) {
  const f = [];
  const ordnen = funktion(kern, '_kopfSucheOrdnen');
  if (!/_tb\.classList\.toggle\('tb-suche-lupe', schmal\)/.test(ordnen)) f.push('schmale Leiste zeigt keine Lupe');
  if (!/if \(schmal && !lupeAuf\)/.test(ordnen)) f.push('offene Lupe lässt das Feld in der Seitenleiste');
  const lupe = funktion(kern, '_kopfLupe');
  if (!/k\.id = 'tb-lupe'/.test(lupe) || !/k\.onclick = sucheLupeOeffnen/.test(lupe)) f.push('kein Lupen-Knopf im Kopf');
  if (!/aria-label', STRINGS\.sucheLabel/.test(lupe)) f.push('Lupe ohne Namen');
  // HTML-Senke des Knopfs (html-senken-grundlinie): nur das Icon aus der eingefrorenen Konstante ICONS, nie fremder Text.
  const senken = lupe.match(/\.innerHTML\s*=[^;]*;/g) || [];
  if (senken.length !== 1 || senken[0] !== '.innerHTML = svgIcon(ICONS.search, 20);') f.push('Lupe setzt anderes Markup als das Icon');
  if (!/_kopfLupe\(\);/.test(kern)) f.push('Lupe wird nicht angelegt');
  // .a11y-btn (display: inline-flex) steht im Gerüst hinter der Lupen-Regel: ohne den Kopf-Selektor wäre die Lupe auch bei breiter Leiste
  // sichtbar und nähme dem Suchfeld 44 px (gemessen 17.11.2026 bei 1440 und 1600 px).
  if (!/\n  \.topbar \.tb-lupe \{ display: none; \}/.test(kern) || !/\n  \.topbar \.tb-lupe \{ display: none; \}/.test(css)) f.push('Lupe auch bei breiter Leiste sichtbar');
  const oeffnen = funktion(kern, 'sucheLupeOeffnen');
  if (!/classList\.add\('suche-lupe-auf'\)/.test(oeffnen) || !/e\.focus\(\)/.test(oeffnen)) f.push('Lupe öffnet die Palette nicht');
  if (!/eingabe\.onblur = \(\) => \{ offen\(false\); verbergen\(\); sucheLupeSchliessen\(\); \};/.test(kern)) f.push('Fokusverlust schließt die Lupe nicht');
  if (!/\.topbar\.tb-suche-lupe \.tb-lupe \{\s*display: inline-flex;/.test(css)) f.push('Lupe nicht sichtbar gestaltet');
  if (!/html\.suche-lupe-auf \.tb-suche-platz \.suche-feld\.suche-offen \{\s*position: fixed;/.test(css)) f.push('Palette fehlt bei offener Lupe');
  return f;
}

test('[U-8a·Lupe] schmale Kopfleiste: Lupe im Kopf, sie öffnet die Palette und schließt mit dem Fokus', () => {
  assert.deepEqual(maengel(KERN, CSS), []);
});

test('[U-8a·Lupe·Rot-Beweis] ohne Lupe, mit Feld in der Seitenleiste und ohne Schließen wird es rot', () => {
  const ohne = KERN.replace("  _kopfLupe();\n", '\n');
  assert.notEqual(ohne, KERN, 'Vorbedingung: der Aufruf steht im Kern');
  assert.deepEqual(maengel(ohne, CSS), ['Lupe wird nicht angelegt']);
  const bleibt = KERN.replace('if (schmal && !lupeAuf)', 'if (schmal)');
  assert.notEqual(bleibt, KERN, 'Vorbedingung: die Stelle steht im Kern');
  assert.deepEqual(maengel(bleibt, CSS), ['offene Lupe lässt das Feld in der Seitenleiste']);
  const offenBleibt = KERN.replace('offen(false); verbergen(); sucheLupeSchliessen(); };', 'offen(false); verbergen(); };');
  assert.notEqual(offenBleibt, KERN, 'Vorbedingung: die Stelle steht im Kern');
  assert.deepEqual(maengel(offenBleibt, CSS), ['Fokusverlust schließt die Lupe nicht']);
  const unsichtbar = CSS.replace(/\.topbar\.tb-suche-lupe \.tb-lupe \{\s*display: inline-flex;/, '.topbar.tb-suche-lupe .tb-lupe { display: none;');
  assert.deepEqual(maengel(KERN, unsichtbar), ['Lupe nicht sichtbar gestaltet']);
  const fremd = KERN.replace('k.innerHTML = svgIcon(ICONS.search, 20);', 'k.innerHTML = svgIcon(ICONS.search, 20) + STRINGS.sucheLabel;');
  assert.notEqual(fremd, KERN, 'Vorbedingung: die Senke steht im Kern');
  assert.deepEqual(maengel(fremd, CSS), ['Lupe setzt anderes Markup als das Icon']);
  const immer = KERN.replace('\n  .topbar .tb-lupe { display: none; }', '\n  .tb-lupe { display: none; }');
  assert.notEqual(immer, KERN, 'Vorbedingung: die Regel steht im Gerüst');
  assert.deepEqual(maengel(immer, CSS), ['Lupe auch bei breiter Leiste sichtbar']);
});
