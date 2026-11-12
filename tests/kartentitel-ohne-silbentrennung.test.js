'use strict';
/* Kartentitel neben einem Status-Chip trennen keine Silben (Gestaltungsleitung, 04.11.2026, MITTEL KARTENTITEL-SILBENBRUCH).
   Bei 390 px brach „Krankenkasse & Hausarzt“ in der Notfall-Sicht silbenweise um („Kran-kenkas-se & Haus-arzt“), weil der Chip
   „noch nichts eingetragen“ in derselben Zeile stand und der Titel nur die schmale erste Spalte bekam. So soll es sein: der Titel
   bekommt die Zeile, der Chip bricht darunter um; Silbentrennung im Kartentitel gibt es nicht.
   Die Klasse: jede Kopfzeile (`<summary>`) im Kern, die einen Status-Chip trägt (`…-status`), nennt ihren Titel über eine Klasse
   `…-titel`. Für jede solche Titelklasse gilt im Stylesheet: kein `hyphens: auto`; und unter 760 px liegt der Titel über beiden
   Spalten, der Chip in der Zeile darunter, wo der Status eine Pille ist (Chip). Neue Karten mit Chip fallen unter dieselbe Prüfung.
   Rot-Beweis: der Prüfer meldet das frühere Stylesheet (hyphens: auto, keine Regel für schmale Bildschirme).
   Abnahme am Bild: dieselbe Karte DE und EN bei 390 (Gestaltungsleitung). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const STILE = ['tools/erscheinung/stil/grundlage.css', 'tools/erscheinung/stil/salbei-glas.css']
  .map((p) => fs.readFileSync(path.join(REPO, p), 'utf8'));

/* Titelklassen aller Kopfzeilen mit Status-Chip im Markup des Kerns. */
function titelKlassenMitChip(kern) {
  const klassen = new Set();
  const re = /<summary[^>]*>'?\s*\+?\s*'?<span class="([a-z-]+-titel)">[\s\S]{0,400}?<span class="([a-z-]+-status)">/g;
  let m;
  while ((m = re.exec(kern))) klassen.add(m[1]);
  return [...klassen];
}
/* Verstöße einer Titelklasse in den Stylesheets. */
function verstoesse(stile, klasse) {
  const v = [];
  const css = stile.join('\n');
  const regeln = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((r) => r[1].split(',').some((s) => new RegExp('\\.' + klasse + '\\b(?![-\\w])').test(s)));
  if (regeln.some((r) => /hyphens\s*:\s*auto/.test(r[2]))) v.push(klasse + ': hyphens: auto');
  // Die Zeilenregel gilt, wo der Status eine Pille ist (Chip: border-radius 999px oder --radius-pill); grauer Statustext läuft mit.
  const chip = klasse.replace(/-titel$/, '-status');
  const pille = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some((r) => r[1].includes('.' + chip) && /border-radius:\s*(999px|var\(--radius-pill\))/.test(r[2]));
  if (!pille) return v;
  const schmal = [...css.matchAll(/@media \(max-width: 7[0-9]{2}px\) \{([\s\S]*?)\n  \}/g)].map((m) => m[1]).join('\n');
  const inSchmal = (re) => [...schmal.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some((r) => r[1].includes('.' + klasse) && re.test(r[2]));
  if (!inSchmal(/grid-column:\s*1\s*\/\s*span 2/)) v.push(klasse + ': schmal nicht über beide Spalten');
  const chipSchmal = [...schmal.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some((r) => r[1].includes('.' + chip) && /grid-row:\s*2/.test(r[2]));
  if (!chipSchmal) v.push(chip + ': schmal nicht in der zweiten Zeile');
  return v;
}

test('[Kartentitel] jede Kopfzeile mit Status-Chip: Titel ohne Silbentrennung, schmal über beiden Spalten, Chip darunter', () => {
  const klassen = titelKlassenMitChip(KERN);
  assert.ok(klassen.includes('feldgruppen-karte-titel'), 'Vorbedingung: die Gruppenkarte (auch in der Notfall-Sicht) ist erkannt');
  assert.deepEqual(klassen.flatMap((k) => verstoesse(STILE, k)), []);
});

test('[Kartentitel·Rot-Beweis] das frühere Stylesheet (hyphens: auto, keine Regel für schmale Bildschirme) wird gemeldet', () => {
  const frueher = ['  .feldgruppen-karte-titel { grid-column: 1; grid-row: 1; }\n  .feldgruppen-karte-status { grid-column: 2; grid-row: 1; border-radius: 999px; }\n'
    + '  .feldgruppen-karte-titel { font-size: 17px; min-width: 0; hyphens: auto; overflow-wrap: break-word; }\n'];
  assert.deepEqual(verstoesse(frueher, 'feldgruppen-karte-titel'), [
    'feldgruppen-karte-titel: hyphens: auto',
    'feldgruppen-karte-titel: schmal nicht über beide Spalten',
    'feldgruppen-karte-status: schmal nicht in der zweiten Zeile',
  ]);
});
