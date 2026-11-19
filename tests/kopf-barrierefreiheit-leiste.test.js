'use strict';
/* Wächter: Die Leiste der Barrierefreiheit (A+, Kontrast, Nacht, Vorlesen) steht im Kopf der Startseite.
   Entscheidung 17.11.2026: Die Einstellungsmöglichkeiten bleiben direkt auf der Startseite; man erreicht sie dort ohne Umweg über die Einstellungen.
   Die Kennungen stehen genau einmal im Kopf (die Einstellungen führen eigene Kennungen `einst-…`).
   Rot-Beweis: dieselbe Prüfung auf einen Kopf ohne die Leiste, und auf einen Kopf mit einem Knopf außerhalb des Kopfes, schlägt fehl. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const KNOEPFE = ['tb-schrift', 'tb-kontrast', 'tb-nacht', 'tb-vorlesen'];

/* Liefert die Mängel der Leiste im Kopf (leer = in Ordnung). */
function maengel(html) {
  const raus = [];
  const von = html.indexOf('<header class="topbar"');
  const bis = von < 0 ? -1 : html.indexOf('</header>', von);
  if (von < 0 || bis < 0) return ['kein Kopf (header.topbar)'];
  const kopf = html.slice(von, bis);
  const zaehle = (text, id) => (text.match(new RegExp('\\bid="' + id + '"', 'g')) || []).length;
  if (zaehle(kopf, 'tb-a11y') !== 1) raus.push('tb-a11y steht nicht genau einmal im Kopf');
  for (const id of KNOEPFE) {
    if (zaehle(kopf, id) !== 1) raus.push(id + ' steht nicht genau einmal im Kopf');
    if (zaehle(html, id) !== 1) raus.push(id + ' steht nicht genau einmal im Dokument');
  }
  const leiste = kopf.slice(kopf.indexOf('id="tb-a11y"'));
  const ende = leiste.indexOf('</div>');
  const inLeiste = ende < 0 ? '' : leiste.slice(0, ende);
  for (const id of KNOEPFE) if (!inLeiste.includes('id="' + id + '"')) raus.push(id + ' steht nicht in der Leiste tb-a11y');
  return raus;
}

test('die vier Knöpfe der Barrierefreiheit stehen im Kopf der Startseite, je einmal', () => {
  assert.deepEqual(maengel(KERN), []);
});

test('Rot-Beweis: ohne die Leiste im Kopf schlägt die Prüfung an', () => {
  const ohne = KERN.replace(/<div class="a11y-leiste"[\s\S]*?<\/div>\n/, '');
  assert.notEqual(ohne, KERN, 'die Leiste wurde für den Beweis entfernt');
  assert.ok(maengel(ohne).length >= 5, 'fünf Mängel erwartet: ' + maengel(ohne).join('; '));
});

test('Rot-Beweis: ein Knopf in den Einstellungen statt im Kopf genügt nicht', () => {
  const ausserhalb = KERN.replace('id="tb-nacht"', 'id="x-nacht"') + '<button id="tb-nacht"></button>';
  assert.ok(maengel(ausserhalb).some((m) => /tb-nacht/.test(m)), 'ein Knopf hinter dem Kopf wird erkannt');
});
