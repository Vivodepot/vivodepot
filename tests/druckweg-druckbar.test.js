'use strict';
/* Druckweg über ein Merkmal statt über eine Namensliste (31.10.2026, Befund DRUCKWEG-NAMENSLISTE): die Druckregel blendete
   alles unter body aus außer drei namentlich genannten Overlays. Ein neues Blatt mit eigenem Druckknopf, das nicht in dieser
   Liste steht, druckt eine leere Seite — beim Notfallblatt eine Einbahnstraße, denn das leere Blatt merkt man erst im Notfall.
   Jetzt trägt jedes druckbare Overlay data-druckbar, und die Druckregel fragt nur das Merkmal ab. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const stil = (src) => (src.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');

// Die Regel, die im Druck die Kinder von body ausblendet (Selektor beginnt mit „body > *“).
function ausblendRegeln(src) {
  const out = [];
  const re = /@media print\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(stil(src)))) {
    for (const z of m[1].split('\n')) if (/^\s*body\s*>\s*\*/.test(z)) out.push(z.trim());
  }
  return out;
}

// Jeder Druckknopf (id="…-drucken") samt dem Funktionskörper, in dem er gebaut wird.
function druckknoepfe(src) {
  const out = [];
  const re = /id=\\?"([a-z0-9-]+-drucken)\\?"/g;
  let m;
  while ((m = re.exec(src))) {
    const anfang = src.lastIndexOf('\nfunction ', m.index);
    const ende = src.indexOf('\n}', m.index);
    out.push({ id: m[1], koerper: src.slice(anfang, ende) });
  }
  return out;
}

test('[Druckweg·Regel] die Druckregel blendet nach dem Merkmal data-druckbar aus, nicht nach einer Liste von Kennungen', () => {
  const r = ausblendRegeln(KERN);
  assert.equal(r.length, 1, 'genau eine Ausblend-Regel im Druck: ' + JSON.stringify(r));
  assert.match(r[0], /^body\s*>\s*\*:not\(\[data-druckbar\]\)\s*\{\s*display:\s*none\s*!important;\s*\}$/);
});

test('[Druckweg·Overlays] jedes Overlay mit Druckknopf trägt data-druckbar — auch das Notfallblatt', () => {
  const k = druckknoepfe(KERN);
  assert.ok(k.length >= 3, 'Vorbedingung: Notfallblatt, Hilfe und erzeugtes Dokument haben je einen Druckknopf, gefunden: ' + k.map((x) => x.id));
  assert.ok(k.some((x) => x.id === 'nfb-drucken'), 'Vorbedingung: der Druckknopf des Notfallblatts wird gefunden');
  for (const { id, koerper } of druckknoepfe(KERN)) {
    assert.match(koerper, /data-druckbar/, 'der Knopf ' + id + ' sitzt in einem Overlay ohne data-druckbar — im Druck bliebe die Seite leer');
  }
});

test('[Druckweg·Rot-Beweis] ein neues Overlay mit Druckknopf ohne Merkmal fällt auf, und die alte Namensliste auch', () => {
  const neu = KERN.replace('\nfunction renderBlattOverlay(', '\nfunction probeBlatt() {\n  const ov = document.createElement(\'div\');\n'
    + '  ov.innerHTML = \'<button class="btn" id="probe-drucken">x</button>\';\n}\nfunction renderBlattOverlay(');
  const ohne = druckknoepfe(neu).find((x) => x.id === 'probe-drucken');
  assert.ok(ohne && !/data-druckbar/.test(ohne.koerper));
  const alt = KERN.replace(/body\s*>\s*\*:not\(\[data-druckbar\]\)/, 'body > *:not(#pv-dok-overlay):not(#notfallblatt-overlay)');
  assert.doesNotMatch(ausblendRegeln(alt)[0] || '', /^body\s*>\s*\*:not\(\[data-druckbar\]\)\s*\{/);
});

test('[Druckweg·Lage] keine Bildschirm-Regel mit !important hält ein druckbares Overlay im Druck fest (fixed statt static)', () => {
  const s = stil(KERN);
  for (const id of ['notfallblatt-overlay', 'pv-dok-overlay', 'hilfe-overlay']) {
    const re = new RegExp('(^|\\n)#' + id + '\\s*\\{[^}]*position:\\s*fixed\\s*!important', 'g');
    assert.doesNotMatch(s, re, '#' + id + ' außerhalb einer Medienabfrage mit position: fixed !important schlägt die Druckregel');
  }
});
