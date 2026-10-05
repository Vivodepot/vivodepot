'use strict';
/* erscheinungsbild-farbleser.test.js — die Laufzeitprobe liest jede CSS-Farbform richtig (Befund 04.10.2026)
   ─────────────────────────────────────────────────────────────────
   Der Fund: `_ebFarbe` zog aus dem berechneten Wert nur die Zahlen und nahm sie als 0–255. `color-mix(…)` kommt vom Browser als
   `color(srgb 0.85 0.83 0.89)` zurück — die Probe las fast Schwarz. Folge: falscher Rückfall (dunkler Text auf hellem
   color-mix-Grund gemeldet mit 1,3:1; in der Auslieferung „heute": Nacht + Sub-Depot + Notfall, Textfarbe --vm-akzent-stark) UND
   falscher Durchlauf (heller Text auf hellem color-mix-Grund gilt als gelesen, weil der Grund als Schwarz gerechnet wird).
   Hier: die reine Zahlenlesung (alles, was ohne Browser lesbar ist) und der Wächter gegen die Klasse. Die Formen, die nur der
   Browser umrechnen kann (oklch, lab, hsl, display-p3, Namen), prüft tests/e2e/erscheinungsbild-schutz-farbformen.spec.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const A = KERN.indexOf('function _ebAlpha(');
const E = KERN.indexOf('function _ebRueckfall(');
assert.ok(A > 0 && E > A, 'Probe-Bereich im Kern nicht gefunden (function _ebAlpha … function _ebRueckfall)');
const BEREICH = KERN.slice(A, E);
const lade = () => vm.runInNewContext(BEREICH + '\n;({ farbe: _ebFarbe })', {});
const runde = (f) => (f ? Array.from(f, (x) => Math.round(x * 100) / 100) : f);

test('[Farbleser] rgb/rgba, kommagetrennt und leerzeichengetrennt, mit und ohne Alpha', () => {
  const { farbe } = lade();
  assert.deepEqual(runde(farbe('rgb(22, 37, 23)')), [22, 37, 23, 1]);
  assert.deepEqual(runde(farbe('rgba(22, 37, 23, 0.5)')), [22, 37, 23, 0.5]);
  assert.deepEqual(runde(farbe('rgb(22 37 23)')), [22, 37, 23, 1]);
  assert.deepEqual(runde(farbe('rgb(22 37 23 / 50%)')), [22, 37, 23, 0.5]);
  assert.deepEqual(runde(farbe('rgba(0, 0, 0, 0)')), [0, 0, 0, 0]);
});

test('[Farbleser] color(srgb …) — so liefert der Browser color-mix — wird auf 0–255 hochgerechnet, nicht als 0–255 gelesen', () => {
  const { farbe } = lade();
  assert.deepEqual(runde(farbe('color(srgb 0.846863 0.825294 0.887843)')), [215.95, 210.45, 226.4, 1]);
  assert.deepEqual(runde(farbe('color(srgb 1 1 1 / 0.14)')), [255, 255, 255, 0.14]);
  assert.deepEqual(runde(farbe('color(srgb 0 0 0 / 50%)')), [0, 0, 0, 0.5]);
});

test('[Farbleser] eine Form, die ohne Browser nicht lesbar ist, liefert null — nie geratene Zahlen', () => {
  const { farbe } = lade();
  for (const f of ['oklch(0.7 0.1 300)', 'lab(60 10 -20)', 'hsl(120 30% 40%)', 'color(display-p3 0.9 0.8 0.9)', 'rebeccapurple', 'color-mix(in srgb, red 50%, white)', '']) {
    assert.equal(farbe(f), null, f);
  }
});

/* WÄCHTER GEGEN DIE KLASSE: Jede Stelle der Probe, die eine berechnete Farbe liest, geht durch `_ebFarbe`; ein zweiter Leser neben
   ihr (Zahlenziehen per Regex an einem Farbwert) fällt hier auf. `_ebFarbe` selbst trägt den Weg über den Browser für jede Form,
   die sie nicht selbst rechnen kann — sonst gälte eine neue CSS-Farbform wieder als geratene Zahlen. */
const FARB_LESUNG = '\\.(backgroundColor|color|borderColor|outlineColor|fill|stroke)\\b';
const FARBE_FN = BEREICH.slice(0, BEREICH.indexOf('function _ebGrund('));   // _ebFarbe steht vor _ebGrund
const OHNE_FARBE_FN = BEREICH.slice(FARBE_FN.length);

test('[Wächter] jede Farb-Lesestelle der Probe geht durch _ebFarbe', () => {
  const gelesen = OHNE_FARBE_FN.match(new RegExp(FARB_LESUNG, 'g')) || [];
  assert.ok(gelesen.length >= 2, 'die Probe liest weniger Farben als erwartet — der Wächter prüft nichts (' + gelesen.length + ')');
  const durch = OHNE_FARBE_FN.match(new RegExp('_ebFarbe\\((?:[^()]|\\([^()]*\\))*' + FARB_LESUNG, 'g')) || [];
  assert.equal(durch.length, gelesen.length, 'eine Farbe wird an _ebFarbe vorbei gelesen: ' + gelesen.length + ' Lesestellen, ' + durch.length + ' über _ebFarbe');
});

test('[Wächter] kein Zahlenziehen per Regex an Farbwerten neben _ebFarbe', () => {
  assert.ok(!/match\(\/\[\\d\.\]\+\/g\)/.test(OHNE_FARBE_FN), 'ein zweiter Zahlenzieher steht neben _ebFarbe');
});

test('[Wächter] _ebFarbe rechnet unbekannte Formen über den Browser (Canvas) um', () => {
  assert.match(FARBE_FN, /createElement\(['"]canvas['"]\)/, '_ebFarbe hat keinen Browser-Umrechnungsweg');
});

test('[Farbleser·Rot-Beweis] der alte Zahlenzug liest color(srgb …) als fast Schwarz — _ebFarbe nicht', () => {
  /* Der Leser vor dem Fix zog die ersten drei Zahlen per Regex und nahm sie als 0–255. Für die Form, die der Browser bei
     color-mix liefert, ergibt das fast Schwarz (Werte unter 1) und damit einen falschen Rückfall bzw. Durchlauf der
     Schutzprobe. Die Probe hält, dass _ebFarbe denselben Wert richtig liest. */
  const alterZahlenzug = (s) => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const wert = 'color(srgb 0.846863 0.825294 0.887843)';
  assert.ok(alterZahlenzug(wert).every((x) => x < 1), 'Vorbedingung: der alte Leser sieht fast Schwarz');
  const { farbe } = lade();
  assert.ok(runde(farbe(wert)).slice(0, 3).every((x) => x > 200), 'der Fix liest den hellen Wert');
});
