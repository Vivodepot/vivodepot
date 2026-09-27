'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-17 · Keine Bereichszahl im Text, die nicht der gemessenen entspricht
   ────────────────────────────────────────────────────────────────────────
   Der Anlass steht im Werkzeug: `krisenvorsorge` ist seit dem 10.08.2026 der
   zwölfte Bereich, und die Zahl elf stand danach in einem Glossar, das eine
   Institution liest, und in drei Schema-Beschreibungen.

   Was hier NICHT geprüft wird: dass die Bereichs-LISTEN übereinstimmen —
   das ist W-16 (`tests/bereichsliste-eine-quelle.test.js`). Dieser Wächter
   liegt eine Ebene tiefer: nicht die Daten, sondern das, was über sie
   behauptet wird.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dateiPruefen, lauf, GEGENSTAND } = require('../tools/bereichszahl-pruefen.js');
const { echteSektorenListe } = require('../tools/lib/sektoren.js');

const ECHT = echteSektorenListe().length;

test('[W-17·Vorbedingung] der Lauf findet überhaupt Bereichszahlen — sonst prüft er nichts', () => {
  const { nennungen } = lauf(GEGENSTAND, ECHT);
  assert.ok(nennungen.length > 0, 'keine einzige Nennung gefunden — der Wächter liefe blind grün');
});

test('[W-17] im echten Bestand nennt keine Stelle eine andere Zahl als die gemessene', () => {
  const { funde } = lauf(GEGENSTAND, ECHT);
  assert.deepEqual(funde.map(f => f.datei + ':' + f.zeile + ' nennt ' + f.zahl), [],
    'eine Bereichszahl im Text weicht ab');
});

test('[W-17·Rot] eine gepflanzte falsche Zahl wird gefunden', () => {
  const text = 'Bereich\n<dd>Eine der elf Vivodepot-Kategorien (z. B. Gesundheit).</dd>\n';
  const { funde } = dateiPruefen(text, 'gepflanzt.html', ECHT);
  assert.equal(funde.length, 1, 'die gepflanzte elf blieb unentdeckt');
  assert.equal(funde[0].zahl, 11);
  assert.equal(funde[0].zeile, 2);
});

test('[W-17·Gegenprobe] eine TEILMENGE ist kein Fund — „über drei Bereiche" bleibt stehen', () => {
  const text = 'Ein Blatt trägt Felder aus bis zu drei Bereichen.\n'
    + 'Lebenssituation, die über DREI Bereiche schreibt.\n'
    + 'Die Lage streut über zwei Bereiche.\n';
  const { funde, nennungen } = dateiPruefen(text, 'gegenprobe.html', ECHT);
  assert.deepEqual(funde, [], 'ein Satz über einen Ausschnitt wurde als Bestandsaussage gelesen');
  assert.equal(nennungen.length, 0, 'Teilmengen zählen gar nicht erst als Nennung');
});

test('[W-17·Gegenprobe] eine DATIERTE Messung darf die alte Zahl nennen', () => {
  const text = 'GEMESSEN 29.07.: 178 leere Feldzeilen über die damals elf Bereiche.\n'
    + 'axe: damals zehn Sektoren ohne Top-Überschrift.\n';
  const { funde, nennungen } = dateiPruefen(text, 'datiert.html', ECHT);
  assert.deepEqual(funde, [], 'eine datierte Messung wurde als Falschaussage gelesen');
  assert.equal(nennungen.length, 2, 'beide datierten Nennungen zählen als Nennung');
  assert.ok(nennungen.every(n => n.datiert), 'beide tragen den Zeitbezug „damals" unmittelbar vor der Zahl');
});

test('[W-17·Rot] eine Zahl OHNE „damals" schlägt an, dieselbe Zeile MIT „damals" nicht', () => {
  const ohne = dateiPruefen('Die App zeigt zehn Bereiche.\n', 'x.html', ECHT);
  const mit = dateiPruefen('Die App zeigte damals zehn Bereiche.\n', 'x.html', ECHT);
  assert.equal(ohne.funde.length, 1, 'Positivkontrolle: ohne Zeitbezug muss es ein Fund sein');
  assert.equal(mit.funde.length, 0, 'mit Zeitbezug darf die alte Zahl stehen bleiben');
});
