'use strict';
/* u5-rest-blatt-fuss-knoepfe.test.js — Dummy 11.11.2026, D86 und M14 (17.11.2026)
   D86: das Fenster „Woraus herausgeben?“ steht schmal (bis 767 px) als Blatt unten statt als zentriertes Fenster. ui.modal nimmt
        dafür die Option `blatt`, die die Klasse „modal-blatt“ setzt; die Regel in grundlage.css dockt unten an, volle Breite,
        nur die oberen Ecken gerundet. Breit bleibt es mittig.
   M14: die Knöpfe der Anfrage-Ansicht heißen „Diese Angaben herausgeben“ und „Nicht beantworten“ (Schlüssel und Verhalten bleiben).
   D94 (Fuß „Abbrechen / Herausgeben“) ist hier nicht geprüft: der Dummy zeigt für dieses Fenster keine Wahl-und-weiter-Folge. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { istOeffentlich } = require('./helfer/nur-privat.js');

const WURZEL = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const CSS = fs.readFileSync(path.join(WURZEL, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
const lies = (d) => fs.readFileSync(path.join(WURZEL, 'tools', d), 'utf8');
const json = (d) => JSON.parse(lies(d)).texte;

/* Was fehlt, als benannte Liste; leer heißt: gebaut. */
function luecken(kern, css) {
  const fehlt = [];
  const a = kern.indexOf('function flowHerausgebenZentral()');
  const wo = kern.slice(a, kern.indexOf('const box = document.getElementById', a));
  if (!/titel: STRINGS\.herausgebenWoherTitel,[\s\S]*?blatt: true/.test(wo)) fehlt.push('D86: „Woraus herausgeben?“ übergibt `blatt: true` nicht');
  if (!/nebenwegHTML, abbrechenBleibt, blatt \}\) \{/.test(kern)) fehlt.push('D86: ui.modal kennt die Option `blatt` nicht');
  if (!/if \(blatt\) box\.classList\.add\('modal-blatt'\)/.test(kern)) fehlt.push('D86: ui.modal setzt die Klasse „modal-blatt“ nicht');
  const m = css.match(/@media \(max-width: 767px\) \{\s*#modal-rueck:has\(\.modal-blatt\) \{([^}]*)\}\s*#modal-rueck \.modal\.modal-blatt \{([^}]*)\}/);
  if (!m) fehlt.push('D86: die Regel für „modal-blatt“ unter max-width: 767px fehlt');
  else {
    if (!/align-items: flex-end/.test(m[1])) fehlt.push('D86: nicht unten angedockt');
    if (!/width: 100%/.test(m[2]) || !/max-width: none/.test(m[2])) fehlt.push('D86: nicht in voller Breite');
    if (!/border-radius: var\(--radius-blatt\) var\(--radius-blatt\) 0 0/.test(m[2])) fehlt.push('D86: nicht nur die oberen Ecken gerundet');
    // Wie im Dummy (schmal: max-height 88 %): oben bleibt der abgedunkelte Hintergrund sichtbar, das Blatt füllt nicht die ganze Höhe.
    if (!/max-height: 88dvh/.test(m[2])) fehlt.push('D86: das Blatt füllt die ganze Höhe');
  }
  return fehlt;
}

const TEXTE_DE = ['textsatz-de-modul.json'].concat(istOeffentlich() ? [] : ['textsatz-de-pro-modul.json']);
const TEXTE_EN = ['textsatz-en-modul.json'].concat(istOeffentlich() ? [] : ['textsatz-en-pro-modul.json']);

test('D86: das Fenster „Woraus herausgeben?“ ist ein Blatt unten, breit bleibt es mittig', () => {
  assert.deepEqual(luecken(KERN, CSS), []);
  // Breite Ansicht unverändert: die Blatt-Regel steht nur im schmalen Bereich, der Grundaufbau zentriert weiter.
  assert.match(CSS, /#modal-rueck \{ position: fixed; inset: 0;[^}]*align-items: center;/);
  // Die dritte Stelle steht im selben schmalen Bereich: in der Vorführung endet das Blatt unter ihrer Spalte (journey-demos, Handy).
  assert.equal((CSS.match(/modal-blatt/g) || []).length, 3, 'die Klasse kommt nur in den drei Regeln des schmalen Bereichs vor');
  assert.match(CSS, /max-height: 88dvh; \}\n(?:\s*\/\*[\s\S]*?\*\/\n)?\s*html\.vorfuehrung-band #modal-rueck \.modal\.modal-blatt/, 'die Regel der Vorführung folgt im schmalen Bereich direkt auf das Blatt');
});

test('M14: die Anfrage-Knöpfe tragen die neuen Texte, Schlüssel und Verhalten bleiben', () => {
  for (const d of TEXTE_DE) {
    const t = json(d);
    assert.equal(t['strings:anfrageAntwortSenden.text'], 'Diese Angaben herausgeben', d);
    assert.equal(t['strings:anfrageAblehnen.text'], 'Nicht beantworten', d);
  }
  for (const d of TEXTE_EN) {
    const t = json(d);
    assert.equal(t['strings:anfrageAntwortSenden.text'], 'Share these details', d);
    assert.equal(t['strings:anfrageAblehnen.text'], 'Do not answer', d);
  }
  // Die englische Vollabdeckung bleibt drinnen (öffentlicher Probelauf 18.11.2026, ENOENT); öffentlich prüft M14 die Module oben.
  if (!istOeffentlich()) {
    const vd = lies('textsatz-en-vollabdeckung-daten.js');
    assert.match(vd, /"strings:anfrageAntwortSenden\.text": "Share these details"/);
    assert.match(vd, /"strings:anfrageAblehnen\.text": "Do not answer"/);
  }
  assert.match(KERN, /escapeHTML\(STRINGS\.anfrageAntwortSenden\)/);
  assert.match(KERN, /id="anfrage-ablehnen">' \+ escapeHTML\(STRINGS\.anfrageAblehnen\)/);
});

test('Rot-Beweis: Fassungen ohne die Änderung fallen durch', () => {
  const ohneOption = KERN.replace('ohneAbbrechen: true, blatt: true,', 'ohneAbbrechen: true,');
  assert.notEqual(ohneOption, KERN);
  assert.ok(luecken(ohneOption, CSS).some((z) => z.includes('übergibt `blatt: true` nicht')));
  const ohneKlasse = KERN.replace("if (blatt) box.classList.add('modal-blatt')", 'void 0');
  assert.notEqual(ohneKlasse, KERN);
  assert.ok(luecken(ohneKlasse, CSS).some((z) => z.includes('setzt die Klasse')));
  const ohneRegel = CSS.replace(/#modal-rueck \.modal\.modal-blatt \{[^}]*\}/, '');
  assert.notEqual(ohneRegel, CSS);
  assert.ok(luecken(KERN, ohneRegel).some((z) => z.includes('Regel für „modal-blatt“')));
  const altText = JSON.stringify(json('textsatz-de-modul.json')).includes('"Antwort senden"');
  assert.equal(altText, false, 'der alte Wortlaut steht nicht mehr im Textsatz');
});
