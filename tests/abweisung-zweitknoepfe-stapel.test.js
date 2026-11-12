'use strict';
/* Die Zweitknöpfe nach einer Abweisung beim Öffnen stehen je über die volle Breite untereinander, wie „Schon ein Depot?
   Datei öffnen“ auf dem Startschirm, und keiner ist ein zweiter dunkler Hauptknopf.

   Gemeint sind die Blöcke, die erst mit einer Abweisung sichtbar werden (id „…-fehler-weiter“ und „…-fehler-misch“): nach
   einer gescheiterten Migration „Andere Datei wählen“ und „Fehlerbeschreibung speichern“, bei der Mischmeldung zu mehreren
   Depots „Sicherungsdatei öffnen“. Die Gestaltung hat festgelegt: nicht rechtsbündig in einer Knopfleiste (modal-aktionen),
   die je nach Textlänge und Sprache nebeneinander oder untereinander bricht, sondern jeder Knopf in einem eigenen
   welcome-sekundaer, bei jeder Breite gleich. Darunter steht der eine Hauptknopf zum Öffnen; ein zweiter dunkler
   Knopf darüber („Erneut versuchen“) ist entfallen. Die Probe liest jeden solchen Block im Kern, auch einen neuen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const BLOCK_ANFANG = /'<div id="([a-z-]*-fehler-(?:weiter|misch))"([^>]*)>' \+/g;

// Ein Block reicht bis zur ersten Zeile, die nur sein schließendes '</div>' trägt.
function bloecke(quelle) {
  const aus = [];
  for (const m of quelle.matchAll(BLOCK_ANFANG)) {
    const rest = quelle.slice(m.index + m[0].length);
    const ende = rest.search(/\n\s*'<\/div>' \+/);
    aus.push({ id: m[1], attribute: m[2], inhalt: ende < 0 ? rest.slice(0, 2000) : rest.slice(0, ende) });
  }
  return aus;
}
function befunde(quelle) {
  const out = [];
  for (const b of bloecke(quelle)) {
    if (/class="[^"]*modal-aktionen/.test(b.attribute)) out.push(b.id + ': Knopfleiste (modal-aktionen) statt Knöpfe untereinander');
    const knoepfe = [...b.inhalt.matchAll(/<button\b[^>]*>/g)].map((k) => k[0]);
    if (!knoepfe.length) out.push(b.id + ': kein Knopf gefunden');
    const gestapelt = (b.inhalt.match(/'<div class="welcome-sekundaer"><button\b[^>]*>[^\n]*<\/button><\/div>' \+/g) || []).length;
    if (gestapelt !== knoepfe.length) out.push(b.id + ': ' + (knoepfe.length - gestapelt) + ' Knopf/Knöpfe nicht je in einem eigenen welcome-sekundaer');
    for (const k of knoepfe) if (!/class="btn btn-sek"/.test(k)) out.push(b.id + ': Hauptknopf über dem Öffnen: ' + k);
  }
  return out;
}

test('[Abweisung·Zweitknöpfe] jeder Zweitknopf nach einer Abweisung steht allein in voller Breite, keiner ist ein Hauptknopf', () => {
  const ids = bloecke(KERN).map((b) => b.id).sort();
  assert.deepEqual(ids, ['crypto-fehler-misch'], 'Vorbedingung: die bekannten Blöcke werden gefunden');
  assert.deepEqual(befunde(KERN), []);
  assert.doesNotMatch(KERN, /id="co-erneut"/, '„Erneut versuchen“ ist entfallen');
});

test('[Abweisung·Zweitknöpfe·Rot-Beweis] die frühere Knopfleiste mit „Erneut versuchen“ fällt auf', () => {
  const alt = "    '<div id=\"crypto-fehler-misch\" class=\"modal-aktionen\" hidden>' +\n" +
    "      '<button type=\"button\" class=\"btn\" id=\"co-erneut\">' + escapeHTML(vorDepotText('btnErneutVersuchen')) + '</button>' +\n" +
    "      '<button type=\"button\" class=\"btn btn-sek\" id=\"co-sicherungsdatei\">' + escapeHTML(vorDepotText('sicherungsdateiOeffnen')) + '</button>' +\n" +
    "    '</div>' +\n";
  const b = befunde(alt);
  assert.ok(b.some((x) => /modal-aktionen/.test(x)), 'Knopfleiste');
  assert.ok(b.some((x) => /nicht je in einem eigenen welcome-sekundaer/.test(x)), 'nebeneinander');
  assert.ok(b.some((x) => /Hauptknopf/.test(x)), 'zweiter dunkler Knopf');
});
