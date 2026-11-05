'use strict';
/* feldschrift-entsperrfeld-css.test.js — Textprobe zu den Befunden UX-DIALOGFELD-ERBT-SCHRIFT-NICHT und UX-ENTSPERRFELD-KONTRAST
   (UX-Review v963, 30.10.2026). Die Messung am Bild steht in tests/e2e/feldschrift-und-entsperrfeld.spec.js; diese Probe hält die
   drei Regeln in der Stilquelle und in beiden gebauten Erscheinungsbild-Modulen fest, ohne Browser:
   1 · jedes Feld erbt Schrift und Farbe (`input, select, textarea { font-family: inherit; color: var(--ink); }`);
   2 · die Eingabe steht in der Rolle --fs-role-wert (rem, wächst mit der Skala am Wurzelelement); schmal und auf Touch-Geräten
       nie unter 16 px (max(16px, var(--fs-role-wert)), Zoom-Schutz in iOS);
   3 · das Entsperrfeld (#overlay-inhalt) trägt die Feld-Tokens, keinen Rahmen in --line, und mindestens 44 px Höhe.
   Rot-Beweis: dieselben Prüfungen gegen den Stand von v963 schlagen an. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GRUNDLAGE = fs.readFileSync(path.join(ROOT, 'tools/erscheinung/stil/grundlage.css'), 'utf8');
const MODULE = ['heute', 'salbei-glas'].map((id) => [id, JSON.stringify(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/erscheinung/erscheinungsbild-' + id + '-modul.json'), 'utf8')))]);

/* Der Block nach einem Selektor bis zur schließenden Klammer. */
function block(css, selektor) {
  const i = css.indexOf(selektor);
  if (i < 0) return null;
  const a = css.indexOf('{', i); const b = css.indexOf('}', a);
  return css.slice(a + 1, b);
}

function fehler(css) {
  const f = [];
  if (!/(^|\n)\s*input, select, textarea \{ font-family: inherit; color: var\(--ink\); \}/.test(css)) f.push('Felder erben Schrift und Farbe nicht');
  const zoom = block(css, '.modal select,\n  .modal textarea,\n  .wizard-eingabe input');
  if (!zoom || !/font-size:\s*var\(--fs-role-wert\)/.test(zoom)) f.push('Eingabe nicht in der Rolle Wert');
  if (!/@media \(max-width: 767px\), \(pointer: coarse\) \{[^@]*font-size:\s*max\(16px,\s*var\(--fs-role-wert\)\)/.test(css)) f.push('kein Zoom-Schutz schmal und auf Touch-Geräten');
  const ents = block(css, '#overlay-inhalt input[type="password"], #overlay-inhalt input[type="file"], #overlay-inhalt input[type="text"] {');
  if (!ents) f.push('Regel des Entsperrfelds fehlt');
  else {
    if (/var\(--line\)/.test(ents)) f.push('Entsperrfeld-Rahmen in --line');
    if (!/var\(--feld-rahmen-dialog\)/.test(ents)) f.push('Entsperrfeld ohne Feldrahmen-Token');
    if (!/border-radius:\s*var\(--radius-feld\)/.test(ents)) f.push('Entsperrfeld ohne Feldradius');
    if (!/min-height:\s*44px/.test(ents)) f.push('Entsperrfeld unter 44 px');
  }
  return f;
}

test('Stilquelle: Felder erben Schrift und Farbe, wachsen mit der Skala, Entsperrfeld trägt die Feld-Tokens', () => {
  assert.deepEqual(fehler(GRUNDLAGE), []);
});

test('beide Erscheinungsbild-Module tragen die drei Regeln (gebaut aus der Stilquelle)', () => {
  for (const [id, json] of MODULE) {
    for (const s of ['input, select, textarea { font-family: inherit; color: var(--ink); }', 'font-size: max(16px, var(--fs-role-wert));', 'border: var(--feld-rahmen-dialog); border-radius: var(--radius-feld); min-height: 44px;']) {
      assert.ok(json.includes(s), id + ': ' + s);
    }
  }
  assert.ok(MODULE.find(([id]) => id === 'salbei-glas')[1].includes('html:not(.high-contrast) #overlay-inhalt :is(input[type=\\"password\\"], input[type=\\"text\\"]) { border: 0; border-bottom: var(--feld-rahmen);'),
    'salbei-glas: Entsperrfeld als Fläche mit Unterkante');
});

test('Rot-Beweis: der Stand von v963 schlägt an jeder der drei Regeln an', () => {
  const alt = GRUNDLAGE
    .replace('input, select, textarea { font-family: inherit; color: var(--ink); }', 'textarea, select, input[type="date"] { font-family: inherit; }')
    .replace('font-size: var(--fs-role-wert);\n  }', 'font-size: 16px;\n  }')
    .replace('font-size: max(16px, var(--fs-role-wert));', 'font-size: 16px;')
    .replace('border: var(--feld-rahmen-dialog); border-radius: var(--radius-feld); min-height: 44px;', 'border: 1px solid var(--line); border-radius: var(--radius-sm);');
  assert.deepEqual(fehler(alt), ['Felder erben Schrift und Farbe nicht', 'Eingabe nicht in der Rolle Wert', 'kein Zoom-Schutz schmal und auf Touch-Geräten', 'Entsperrfeld-Rahmen in --line',
    'Entsperrfeld ohne Feldrahmen-Token', 'Entsperrfeld ohne Feldradius', 'Entsperrfeld unter 44 px']);
});

/* Rangfolge (UX-ABSCHNITT-KLEINER-ALS-LABEL) und die Rollen aus dem Zielbild 30.10.2026, Abschnitt 3: im Erscheinungsbild ab Werk
   Abschnitt 20, Gruppe 17, Label 14 in 500 und --ink2, Wert 15 px; Platzhalter wie der Wert, nicht kursiv; Abschnitt in normaler
   Schreibung, Versalien ab Werk aus; Feldhöhe 44 px, schmal 48 px. Ein Listenfeld trägt seinen Titel in der Gruppen-Rolle; der Kern
   markiert Listenfelder dafür mit einer Klasse. */
const SALBEI = fs.readFileSync(path.join(ROOT, 'tools/erscheinung/stil/salbei-glas.css'), 'utf8');
const KERN = fs.readFileSync(path.join(ROOT, 'vivodepot.html'), 'utf8');

function rangFehler(salbei, grundlage, kern) {
  const f = [];
  if (!/:root \{ --fs-role-abschnitt: 1\.25rem; --fs-role-gruppe: 1\.0625rem; --fs-role-label: 0\.875rem; --fs-role-wert: 0\.9375rem; \}/.test(salbei)) f.push('Rollen nicht nach dem Zielbild');
  if (!/\n\.feld-label \{ color: var\(--ink2\); font-weight: 500; \}/.test(salbei)) f.push('Label nicht leiser als der Wert');
  if (!/input::placeholder, textarea::placeholder \{ color: var\(--ink3\); font-style: normal; font-size: inherit; opacity: 1; \}/.test(grundlage)) f.push('Platzhalter kursiv oder klein');
  const st = block(salbei, '\n.sektion-titel {');
  if (!st || !/font-size:\s*var\(--fs-role-abschnitt\)/.test(st)) f.push('Abschnitt nicht in seiner Rolle');
  if (!st || !/text-transform:\s*none/.test(st)) f.push('Abschnitt in Versalien');
  const li = block(grundlage, '.feld-zeile:has(> .feld-wert > .feld-liste-editor) > .feld-label {');
  if (!li || !/font-size:\s*var\(--fs-role-gruppe\)/.test(li) || !/font-weight:\s*var\(--fw-semibold\)/.test(li)) f.push('Listentitel als Label');
  return f;
}

test('Rangfolge: Abschnitt über Gruppe über Label, keine Versalien, Listentitel in der Gruppen-Rolle (Quelle, Modul, Kern)', () => {
  assert.deepEqual(rangFehler(SALBEI, GRUNDLAGE, KERN), []);
  const salbeiModul = MODULE.find(([id]) => id === 'salbei-glas')[1];
  assert.ok(salbeiModul.includes(':root { --fs-role-abschnitt: 1.25rem; --fs-role-gruppe: 1.0625rem; --fs-role-label: 0.875rem; --fs-role-wert: 0.9375rem; }'), 'salbei-glas-Modul trägt die Rollen');
  const T = fs.readFileSync(path.join(ROOT, 'tools/erscheinung/salbei-glas.css'), 'utf8');
  assert.match(T, /\n  --label-schreibung: none;/, 'Versalien ab Werk aus');
  assert.match(T, /\n  --feld-hoehe: 44px;/, 'Feldhöhe 44 px ab Werk');
  assert.match(SALBEI, /--feld-hoehe: 48px;/, 'Feldhöhe 48 px schmal');
});

test('Rot-Beweis Rangfolge: der Stand von v963 schlägt an', () => {
  const salbeiAlt = SALBEI.replace(/:root \{ --fs-role-abschnitt[^}]*\}\n/, '')
    .replace(/\n\.feld-label \{[^}]*\}/, '\n.feld-label { color: var(--ink2); font-weight: var(--fw-medium); }')
    .replace(/\n\.sektion-titel \{[^}]*\}/, '\n.sektion-titel { margin: 0 0 var(--space-4); color: var(--ink3); font-size: 0.72rem; font-weight: var(--fw-semibold); letter-spacing: 0.08em; }');
  const grundAlt = GRUNDLAGE.replace(/\.feld-zeile:has\(> \.feld-wert > \.feld-liste-editor\) > \.feld-label \{[^}]*\}/, '')
    .replace(/input::placeholder, textarea::placeholder \{[^}]*\}/, 'input::placeholder, textarea::placeholder { color: var(--ink3); font-style: italic; font-size: var(--fs-xs); opacity: 0.65; }');
  assert.deepEqual(rangFehler(salbeiAlt, grundAlt, KERN), ['Rollen nicht nach dem Zielbild', 'Label nicht leiser als der Wert', 'Platzhalter kursiv oder klein', 'Abschnitt nicht in seiner Rolle',
    'Abschnitt in Versalien', 'Listentitel als Label']);
});
