'use strict';
/* ═════════════════════════════════════════════════════════════════
   D86/H06 (Desktop-Dummy Z. 252–255, 17.11.2026): schmal (bis 767 px) steht jedes Fenster als Blatt von unten, auch „Herausgeben“.
   Vorher trug nur „Woraus herausgeben?“ die Option `blatt` (die Probe der U-5-Reste, Fall D86); das Fenster „Herausgeben“
   stand am Telefon oben als Karte. Die Regel für „modal-blatt“ in grundlage.css bleibt dieselbe; breit bleibt das Fenster mittig.
   Die Lage im Browser (375 unten angedockt, 1280 mittig) prüft tests/e2e/d86-herausgeben-blatt.spec.js.

   [D86·Anlass]     flowAnlassExport öffnet „Herausgeben“ mit `blatt: true`.
   [D86·Wahl]       die Wahl „Was mitgeht“ ohne Anlass (flowExportUebersicht) ebenso.
   [D86·Stellen]    alle drei Herausgeben-Fenster übergeben `blatt: true`: die Wahl, ihre Auswahl-Fassung und „Herausgeben — Bereich“.
   [D86·Rot-Beweis] ein Kern, dem an einer der drei Stellen `blatt: true` fehlt, fällt durch.
   [D86·Glas]       das Glas-Stilblatt lässt das Blatt unten eckig (sonst gewinnt seine Rundung).
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const PW = 'd86-herausgeben-blatt-2026';

function fenster(V, fn) {
  const modale = [];
  const echt = V.ui.modal;
  V.ui.modal = (o) => { modale.push(o); return () => {}; };
  try { fn(); } finally { V.ui.modal = echt; }
  assert.ok(modale.length >= 1, 'ein Fenster öffnet sich');
  return modale[modale.length - 1];
}

/* Was fehlt, als benannte Liste; leer heißt: gebaut. */
function luecken(kern) {
  const fehlt = [];
  const stueck = (anfang, ende) => { const a = kern.indexOf(anfang); return a < 0 ? '' : kern.slice(a, kern.indexOf(ende, a)); };
  const wahl = stueck('ui.modal(Object.assign({\n      titel,', '}, knoepfe));');
  if (!/\bblatt: true,/.test(wahl)) fehlt.push('Wahl „Herausgeben“ (flowExportUebersicht) ohne `blatt: true`');
  const auswahl = stueck('titel: (opt && opt.titel) || STRINGS.exportAuswahlTitel,', 'onPrimaer:');
  if (!/\bblatt: true,/.test(auswahl)) fehlt.push('Auswahl-Fassung (flowExportUebersicht) ohne `blatt: true`');
  const bereich = stueck("ui.modal({\n    titel: STRINGS.herausgebenTitel + ' — ' + s.label,", '});');
  if (!/\bblatt: true,/.test(bereich)) fehlt.push('„Herausgeben — Bereich“ (flowHerausgabeUebergabe) ohne `blatt: true`');
  return fehlt;
}

test('[D86·Anlass] „Herausgeben“ am Anlass öffnet als Blatt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const f = fenster(V, () => V.flowAnlassExport('arzt'));
  assert.equal(f.titel, V.STRINGS.herausgebenTitel, 'Voraussetzung: es ist das Fenster „Herausgeben“');
  assert.equal(f.blatt, true, 'blatt: true');
});

test('[D86·Wahl] die Wahl ohne Anlass öffnet als Blatt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const f = fenster(V, () => V.flowExportUebersicht({ titel: 'Herausgeben', kennungen: V.anlassKennungen('arzt'), aufFortfahren: () => {} }));
  assert.equal(f.blatt, true, 'blatt: true');
});

test('[D86·Stellen] alle drei Herausgeben-Fenster tragen `blatt: true`', () => {
  assert.deepEqual(luecken(KERN), []);
});

test('[D86·Rot-Beweis] fehlt `blatt: true` an einer Stelle, fällt der Kern durch', () => {
  const ohneWahl = KERN.replace(/(koerperHTML: \(\(opt && typeof opt\.kopfHTML[^\n]*\n[^\n]*\n)\s*blatt: true,\n/, '$1');
  assert.notEqual(ohneWahl, KERN, 'Voraussetzung: die Stelle der Wahl ist gefunden');
  assert.ok(luecken(ohneWahl).some((z) => z.startsWith('Wahl')));
  const ohneAuswahl = KERN.replace('      blatt: true,   // D86/H06: wie „Herausgeben“ schmal als Blatt von unten\n', '');
  assert.notEqual(ohneAuswahl, KERN);
  assert.ok(luecken(ohneAuswahl).some((z) => z.startsWith('Auswahl')));
  const ohneBereich = KERN.replace('    blatt: true,   // D86/H06: „Herausgeben“ eines Bereichs schmal als Blatt von unten\n', '');
  assert.notEqual(ohneBereich, KERN);
  assert.ok(luecken(ohneBereich).some((z) => z.startsWith('„Herausgeben — Bereich“')));
});

/* [D86·Glas] Das Glas (salbei-glas.css, auch im Ab-Werk-Profil) rundet jedes Fenster mit höherer Spezifität als die Blatt-Regel in
   grundlage.css; ohne eigene Blatt-Regel dort wäre das Blatt unten rund (Befund im 375er-Lauf, 17.11.2026). */
const GLAS = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'salbei-glas.css'), 'utf8');
const glasLuecke = (css) => /@media \(max-width: 767px\) \{ html:not\(\.high-contrast\) #modal-rueck \.modal\.modal-blatt \{ border-radius: var\(--radius-blatt\) var\(--radius-blatt\) 0 0; \} \}/.test(css) ? [] : ['Glas ohne Blatt-Regel'];

test('[D86·Glas] das Glas lässt das Blatt unten eckig', () => {
  assert.deepEqual(glasLuecke(GLAS), []);
  // Rot-Beweis: ohne die Regel fällt es durch.
  assert.deepEqual(glasLuecke(GLAS.replace(/@media \(max-width: 767px\) \{ html:not\(\.high-contrast\) #modal-rueck \.modal\.modal-blatt[^\n]*\n/, '')), ['Glas ohne Blatt-Regel']);
});
