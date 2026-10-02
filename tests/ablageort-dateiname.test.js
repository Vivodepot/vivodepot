'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Der Dateiname eines gemerkten Speicherorts kommt von außen (U2-ADR-463)
   ───────────────────────────────────────────────────────────────────────────
   Wer eine Datei ablegt, wählt ihren Namen frei. Der Name steht auf dem Startschirm (ein Knopf je gemerktem Ort), in den
   Einstellungen und im Angebot nach dem ersten Sichern. Zwei Klassen stehen dagegen:
   - ein Name, der als HTML in die Seite gerät (Markup im Dateinamen);
   - ein Name, der den Satz verfälscht, weil `String.replace` in einer Ersatz-ZEICHENKETTE `$&`, `$'` und `$1` auswertet.
   Geprüft wird die Zeichenkette, die in innerHTML geht: steht darin kein `<img`, entsteht beim Parsen kein img-Element.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const NAME = '<img src=x onerror=alert(1)>$&.vd';
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const V = ladeKern().V;
const tags = (html) => (html.match(/<[a-z]+/gi) || []).map((t) => t.slice(1).toLowerCase());

test('[Ablageort·Dateiname·Startschirm] ein Name mit Markup und $& erscheint wörtlich als Text, es entsteht kein Element', () => {
  const html = V._ablageortKnoepfeHTML([{ name: NAME }], '{datei} öffnen');
  const eigene = new Set(['button', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g']);
  assert.deepEqual(tags(html).filter((t) => !eigene.has(t)), [], 'nur die eigenen Tags');
  assert.ok(!tags(html).includes('img'), 'kein img-Element');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;$&amp;.vd öffnen'), 'der Name steht wörtlich, $& unverändert');
  // Rot-Beweis: ohne escapeHTML entstünde das Element.
  const roh = V._ablageortSatz('{datei} öffnen', NAME);
  assert.equal(tags(roh).filter((t) => t === 'img').length, 1, 'Rot-Beweis im Test: unmaskiert entstünde ein img');
});

test('[Ablageort·Dateiname·Einstellungen] derselbe Name im Hinweis der Einstellungen: wörtlich, kein Element', () => {
  const html = V._ablageortGemerktHTML(NAME);
  assert.ok(!tags(html).includes('img'), 'kein img-Element');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;$&amp;.vd'), 'der Name steht wörtlich');
  assert.ok(KERN.includes('escapeHTML(_ablageortSatz(STRINGS.ablageortGemerktHinweis, name))'), 'der Kern maskiert genau hier');
  // Rot-Beweis: derselbe Satz ohne escapeHTML erzeugte das Element.
  const roh = '<p class="einst-hint">' + V._ablageortSatz('Gemerkt: {datei}', NAME) + '</p>';
  assert.equal(tags(roh).filter((t) => t === 'img').length, 1, 'Rot-Beweis im Test: unmaskiert entstünde ein img');
});

test('[Ablageort·Dateiname·Ersatzmuster] $&, $\' und $1 im Namen werden nicht ausgewertet', () => {
  for (const n of ['a$&b.vd', "a$'b.vd", 'a$1b.vd', 'a$$b.vd']) {
    assert.equal(V._ablageortSatz('X {datei} Y', n), 'X ' + n + ' Y', n);
  }
  // Rot-Beweis: als Zeichenkette eingesetzt, verfälscht $& den Satz.
  const falsch = 'X {datei} Y'.replace('{datei}', 'a$&b.vd');
  assert.notEqual(falsch, 'X a$&b.vd Y', 'Rot-Beweis im Test: die Zeichenketten-Form deutet $& aus');
});

test('[Ablageort·Dateiname·Wächter] kein Dateiname geht als Ersatz-Zeichenkette in einen Satz', () => {
  const muster = /\.replace\('\{datei\}',\s*(?!\(\)\s*=>)[^)]*\.name\b/g;
  assert.deepEqual(KERN.match(muster) || [], []);
  const rot = "x.replace('{datei}', handle.name || '')";
  assert.equal((rot.match(muster) || []).length, 1, 'Rot-Beweis im Test: die alte Form würde gefunden');
});
