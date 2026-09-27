'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Keine neue rohe Attribut-Verkettung im Kern — Ratsche (16.09.2026, v1-Blocker Sicherheit)
   ────────────────────────────────────────────────────────────────────────
   Review des XSS-Fixes (X2): ein Textsatz-Wert aus einer fremden Datei stand roh im
   `aria-label` des Inhaltsverzeichnisses; ein Anführungszeichen darin wurde zum lebenden
   Ereignis-Attribut. Der Fix maskiert jede Attribut-Verkettung, deren Ausdruck ein Bezeichner ist,
   mit `escapeAttr`. Übrig bleiben Konstanten, Ternäre mit festen Werten, Zahlen, `esc(…)` (dort
   `const esc = escapeHTML`) und Variablen, die in ihrer Funktion schon mit escapeHTML maskiert sind —
   festgehalten und begründet in tools/attribut-verkettung-grundlinie.json.

   Diese Probe hält den Bestand: eine neue rohe Verkettung ist rot, eine verschwundene ebenfalls (die
   Grundlinie darf nur schrumpfen und wird dann nachgezogen).

   ROT-BEWEIS: im Test selbst — eine gepflanzte rohe Verkettung in einer Kopie des Kerns wird gefunden,
   eine maskierte nicht. Gegen den Kern von f92483fd (vor diesem Zug) meldet `--check` die über hundert
   Stellen, die dieser Zug maskiert hat.

   WAS DIESE PROBE NICHT TRIFFT: Attribute, die über zwei Zeichenketten-Literale verteilt oder per
   Template-Literal gebaut werden, und `setAttribute` (das maskiert der Browser selbst).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const A = require('../tools/attribut-verkettung-pruefen.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'attribut-verkettung-pruefen.js');

test('[Attribut-Ratsche] der Kern trägt keine rohe Attribut-Verkettung über die Grundlinie hinaus', () => {
  const aus = execFileSync(process.execPath, [WERKZEUG, '--check'], { encoding: 'utf8' });
  assert.match(aus, /kein Zuwachs/);
});

test('[Attribut-Ratsche·Rot-Beweis] eine gepflanzte rohe Verkettung wird gefunden, eine maskierte nicht', () => {
  const roh = A.rohStellen("h += '<nav class=\"toc\" aria-label=\"' + STRINGS.tocTitel + '\">';\n"
    + "h += '<nav aria-label=\"' + escapeAttr(STRINGS.tocTitel) + '\">';\n"
    + "h += '<i title=\"' + escapeHTML(x) + '\" data-a=\"' + wert.id + '\">';\n");
  assert.deepEqual(roh.map((s) => s.attribut + '|' + s.ausdruck), ['aria-label|STRINGS.tocTitel', 'data-a|wert.id']);
  const v = A.vergleichen(A.zaehlen(roh), { 'data-a|wert.id': 1, 'alt|weg': 1 });
  assert.deepEqual(v.neu, ['aria-label|STRINGS.tocTitel (0 → 1)']);
  assert.deepEqual(v.verschwunden, ['alt|weg (1 → 0)']);
});

test('[Attribut-Ratsche·Rot-Beweis] --check wird rot, wenn in einer Kopie des Kerns eine Maskierung fehlt', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const anker = "'<nav class=\"toc\" aria-label=\"' + escapeAttr(STRINGS.tocTitel) + '\">'";
  assert.equal(kern.split(anker).length - 1, 1, 'Vorbedingung: der Anker steht genau einmal im Kern');
  const kopie = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-attribut-ratsche-')), 'vivodepot.html');
  fs.writeFileSync(kopie, kern.replace(anker, "'<nav class=\"toc\" aria-label=\"' + STRINGS.tocTitel + '\">'"));
  let rc = 0, fehler = '';
  try { execFileSync(process.execPath, [WERKZEUG, '--check', '--kern', kopie], { encoding: 'utf8', stdio: 'pipe' }); }
  catch (e) { rc = e.status; fehler = String(e.stderr); }
  fs.rmSync(path.dirname(kopie), { recursive: true, force: true });
  assert.equal(rc, 1);
  assert.match(fehler, /aria-label\|STRINGS\.tocTitel/);
});

test('[Attribut] escapeAttr maskiert beide Anführungszeichen und verträgt Nicht-Zeichenketten', () => {
  const { V } = require('./load-kern.js').ladeKern();
  assert.equal(V.escapeAttr('Inhalt" onmouseover="x'), 'Inhalt&quot; onmouseover=&quot;x');
  assert.equal(V.escapeAttr("it's"), 'it&#39;s');
  assert.equal(V.escapeAttr(7), '7');
  assert.equal(V.escapeAttr(null), '');
});

/* Doppelt maskiert ist so falsch wie roh (16.09.2026): beim Umbau stand ein Feldwert, der schon mit
   `&quot;` vormaskiert war, zusätzlich in escapeAttr — im Eingabefeld hätte die Bürgerin `&quot;` gelesen.
   Gemessen an der Render-Aufnahme (Ordner „Bildung&amp;quot;). Die Aufnahme deckt jeden Bereich leer und
   befüllt; eine doppelte Maskierung zeigt sich dort als `&amp;` vor einer Entität. */
test('[Attribut] kein Wert ist doppelt maskiert — die Render-Aufnahme trägt kein &amp; vor einer Entität', () => {
  const dir = path.join(REPO, 'tests', 'fixtures', 'render-aufnahme');
  const funde = [];
  for (const datei of fs.readdirSync(dir).filter((d) => d.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, datei), 'utf8');
    const m = html.match(/&amp;(?:quot|amp|lt|gt|#39);/g);
    if (m) funde.push(datei + ': ' + m.length);
  }
  assert.deepEqual(funde, []);
  assert.ok(fs.readdirSync(dir).filter((d) => d.endsWith('.html')).length >= 20, 'Vorbedingung: die Aufnahme ist da');
});
