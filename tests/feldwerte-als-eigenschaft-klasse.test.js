'use strict';
/* Feldwerte stehen nicht als Attribut im Dokument: die Klasse am Quelltext (15.10.2026, Befund GESICHERTE-KOPIE-TRAEGT-KLARTEXT).
   Das Verhalten im Browser prüft tests/e2e/gesicherte-kopie.spec.js (Dokument, Klasse mit Rot-Beweis, Chromium-MHTML). Diese
   Probe hält am Kern, was die e2e-Probe voraussetzt und was ein späterer Umbau still brechen könnte:
     1. der Beobachter wird beim Laden eingehängt;
     2. die zwei data-Attribute, die Werte der Person tragen, stehen in seiner Liste;
     3. kein Code liest oder schreibt sie am Helfer vorbei (getAttribute/dataset/setAttribute mit Inhalt). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const WERT_ATTRIBUTE = ['data-chip', 'data-refm-bestand-override'];
const HELFER = ['wertDaten', 'wertDatenSetzen', 'chipDaten', 'feldWerteAusAttributenLoesen', 'feldWerteAusAttributenBeobachten'];

/* Zeilen außerhalb der Helfer, die ein wertführendes Attribut direkt lesen oder mit Inhalt schreiben. */
function vorbeiAmHelfer(text) {
  const zeilen = text.split('\n');
  const raus = [];
  let inHelfer = null, tiefe = 0;
  zeilen.forEach((z, i) => {
    const kopf = /^function (\w+)\(/.exec(z);
    if (kopf) { inHelfer = HELFER.includes(kopf[1]) ? kopf[1] : null; tiefe = 0; }
    if (/^\s*(\/\/|\*|\/\*)/.test(z)) return;
    if (!inHelfer) {
      for (const a of WERT_ATTRIBUTE) {
        const camel = a.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (z.includes("getAttribute('" + a + "')") || new RegExp('dataset\\.' + camel + '\\b').test(z)
          || new RegExp("setAttribute\\('" + a + "',\\s*(?!\\s|'')").test(z)) raus.push((i + 1) + ': ' + z.trim().slice(0, 80));
      }
    }
  });
  return raus;
}

test('[Feldwerte·Klasse] der Beobachter wird beim Laden eingehängt', () => {
  assert.match(KERN, /\n\s*try \{ _FELDWERTE_BEOBACHTER = feldWerteAusAttributenBeobachten\(/);
  assert.match(KERN, /mo\.observe\(doc\.documentElement, \{ childList: true, subtree: true, attributes: true, attributeFilter: _WERT_DATEN_ATTRIBUTE \}\)/);
});

test('[Feldwerte·Klasse] die wertführenden data-Attribute stehen in der Liste des Beobachters', () => {
  const m = /const _WERT_DATEN_ATTRIBUTE = \[([^\]]*)\]/.exec(KERN);
  assert.ok(m, 'Vorbedingung: die Liste wird gefunden');
  for (const a of WERT_ATTRIBUTE) assert.ok(m[1].includes("'" + a + "'"), a + ' fehlt');
  const t = /const _WERT_TRAEGER = \[(.*)\]\.join\(/.exec(KERN);
  for (const s of ['input', 'textarea', 'option[selected]', '[data-chip]', '[data-refm-bestand-override]']) assert.ok(t && t[1].includes(s), s + ' fehlt im Träger-Selektor');
});

test('[Feldwerte·Klasse] kein Code liest oder schreibt ein wertführendes Attribut am Helfer vorbei', () => {
  assert.deepEqual(vorbeiAmHelfer(KERN), []);
});

/* Die Schleife über die Elemente überspringt keines (Gegenlesung 15.10.2026): ein `continue` im Zweig für Eingabefelder ließ
   versteckte Felder mit `data-refm-bestand-override` aus, der Override blieb im Attribut. */
function loesenRumpf(text) {
  const i = text.indexOf('function feldWerteAusAttributenLoesen(');
  if (i < 0) return null;
  const ende = text.indexOf('\n}\n', i);
  return text.slice(i, ende);
}
test('[Feldwerte·Klasse] feldWerteAusAttributenLoesen überspringt kein Element (kein continue, kein break)', () => {
  const rumpf = loesenRumpf(KERN);
  assert.ok(rumpf && rumpf.includes('_WERT_DATEN_ATTRIBUTE'), 'Vorbedingung: der Rumpf wird gefunden');
  const code = rumpf.split('\n').filter((z) => !/^\s*(\/\/|\*|\/\*)/.test(z)).join('\n');
  assert.doesNotMatch(code, /\b(continue|break)\b/);
});
test('[Feldwerte·Klasse·Rot-Beweis] ein continue im Rumpf fällt auf', () => {
  const kaputt = "function feldWerteAusAttributenLoesen(w) {\n  for (const el of k) {\n    if (x) continue;\n    for (const attr of _WERT_DATEN_ATTRIBUTE) {}\n  }\n}\n";
  assert.match(loesenRumpf(kaputt).split('\n').join('\n'), /\bcontinue\b/);
});

test('[Feldwerte·Klasse·Rot-Beweis] ein direkter Leser, ein dataset-Schreiber und ein setAttribute mit Inhalt fallen auf', () => {
  const f = "function irgendwas() {\n  const c = JSON.parse(el.getAttribute('data-chip'));\n  feld.dataset.refmBestandOverride = name;\n  span.setAttribute('data-chip', JSON.stringify(x));\n  span.setAttribute('data-chip', '');\n}\n";
  assert.equal(vorbeiAmHelfer(f).length, 3);
  assert.deepEqual(vorbeiAmHelfer("function chipDaten(el) {\n  return el.getAttribute('data-chip');\n}\n"), []);
});
