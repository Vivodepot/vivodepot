'use strict';
/* Die untere Tableiste gibt es genau einmal, und nur in #app (06.11.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Die Laufzeitprobe des Erscheinungsbilds lässt `#bottom-tabs` eine geschützte Anzeige überdecken, solange die Leiste
   Leistenform hat (ERSCHEINUNGSBILD_REGELN.ueberdeckenErlaubt und .leistenform; Befund NOTFALL-TABLEISTE-RUECKFALL,
   tests/e2e/notfall-mobil-tableiste-rueckfall.spec.js). Der Selektor ist eine bloße id. Damit er nicht mehr zulässt als die
   Tableiste der App, verlangt diese Probe: im Kern steht `id="bottom-tabs"` genau einmal, im statischen Markup innerhalb von
   <div id="app">; kein Skript erzeugt ein zweites Element mit dieser id.

   Rot-Beweis an erfundenen Mini-Dokumenten (FIXTURES unten, in dieser Datei): zwei Vorkommen, eines außerhalb von #app, eines im
   Skript. Gegenprobe: das gute Dokument mit einer Nennung im Kommentar ist grün. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURES = Object.freeze({
 "ausserhalb": "<!DOCTYPE html><html><body>\n<div id=\"app\"><div class=\"kopf\"></div></div>\n<nav class=\"bottom-tabs\" id=\"bottom-tabs\"><button>Eins</button></nav>\n</body></html>\n",
 "gut": "<!DOCTYPE html><html><body>\n<!-- <nav id=\"bottom-tabs\"> im Kommentar zählt nicht -->\n<div id=\"app\"><div class=\"kopf\"></div>\n  <nav class=\"bottom-tabs\" id=\"bottom-tabs\"><button>Eins</button></nav>\n</div>\n<div id=\"overlay\"></div>\n</body></html>\n",
 "im-skript": "<!DOCTYPE html><html><body>\n<div id=\"app\"><nav class=\"bottom-tabs\" id=\"bottom-tabs\"></nav></div>\n<script>document.body.insertAdjacentHTML('beforeend', '<div id=\"bottom-tabs\"></div>');</script>\n</body></html>\n",
 "zwei": "<!DOCTYPE html><html><body>\n<div id=\"app\"><div class=\"kopf\"></div>\n  <nav class=\"bottom-tabs\" id=\"bottom-tabs\"><button>Eins</button></nav>\n  <div id=\"bottom-tabs\"></div>\n</div>\n</body></html>\n"
});
const ID = 'bottom-tabs';

/* HTML-Kommentare längentreu ausblenden (Positionen bleiben gültig). */
const ohneKommentare = (html) => html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));

/* Bereich [start, ende) des Elements <div id="app"> im statischen Markup: div-Tiefe zählen, Skript- und Stilblöcke ausgeblendet. */
function appBereich(html) {
  const t = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, ' '));
  const start = t.search(/<div\s+id="app"[\s>]/);
  if (start < 0) return null;
  let tiefe = 0;
  const re = /<div\b|<\/div\s*>/gi;
  re.lastIndex = start;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    tiefe += m[0][1] === '/' ? -1 : 1;
    if (tiefe === 0) return [start, m.index + m[0].length];
  }
  return null;
}

function maengel(html) {
  const t = ohneKommentare(html);
  const f = [];
  const nennungen = [...t.matchAll(/\bid\s*=\s*(["'])bottom-tabs\1|\.id\s*=\s*(["'])bottom-tabs\2|setAttribute\(\s*(["'])id\3\s*,\s*(["'])bottom-tabs\4/g)];
  if (nennungen.length !== 1) f.push('id="' + ID + '" steht ' + nennungen.length + '-mal im Kern, erwartet genau einmal');
  const app = appBereich(t);
  if (!app) f.push('kein <div id="app"> im Markup');
  else for (const n of nennungen) if (n.index < app[0] || n.index >= app[1]) f.push('id="' + ID + '" steht außerhalb von #app (Stelle ' + n.index + ')');
  return f;
}

test('[Tableiste·einmalig] im Kern steht id="bottom-tabs" genau einmal und nur in #app', () => {
  assert.deepEqual(maengel(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8')), []);
});

test('[Tableiste·einmalig·Gegenprobe] das gute Fixture ist grün, eine Nennung im Kommentar zählt nicht', () => {
  assert.deepEqual(maengel(FIXTURES.gut), []);
});

test('[Tableiste·einmalig·Rot-Beweis] zwei Vorkommen, eines außerhalb von #app, eines im Skript — jedes wird gefunden', () => {
  const lies = (n) => maengel(FIXTURES[n.replace(/\.html$/, '')]);
  assert.deepEqual(lies('zwei.html'), ['id="bottom-tabs" steht 2-mal im Kern, erwartet genau einmal']);
  assert.equal(lies('ausserhalb.html').length, 1);
  assert.match(lies('ausserhalb.html')[0], /außerhalb von #app/);
  const skript = lies('im-skript.html');
  assert.ok(skript.some((x) => /2-mal/.test(x)), 'zweites Element aus dem Skript: ' + skript.join(' | '));
  assert.ok(skript.some((x) => /außerhalb von #app/.test(x)), 'das Skript steht außerhalb von #app: ' + skript.join(' | '));
});
