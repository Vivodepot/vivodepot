'use strict';
/* Klassen-Wächter EN-BEZIEHUNGSLISTE-DEUTSCH (19.11.2026): keine Auswahlliste zeigt in Englisch einen Eintrag, der wie in Deutsch
   lautet. Anlass war die Beziehung zur Person (tests/en-beziehungsliste.test.js); die Klasse sind alle Auswahllisten des Kerns.
   Gemessen mit tools/sprachluecken-messen.js, Teil D: jeder Bauer einer Auswahl wird in Deutsch und in Englisch gelesen.
   Vor dem Fix fand Teil D „ja“/„nein“ einer Bereichsdefinition mit feldtyp 'jaNein' und den Rückfall „Bankvollmacht“.
   Ausnahmen nur in tools/sprachluecken-auswahl-ausnahmen.json, je Eintrag mit Wort.
   Die Zählprobe hält die Zahl der Stellen fest, die im Kern Auswahl-Einträge bauen: ein neuer Bauer hebt sie, und dann gehört er
   in `sammeln` (Teil D), damit seine Einträge mitgemessen werden. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { istOeffentlich } = require('./helfer/nur-privat.js');
const { teilDAmKern, teilDVergleichen, auswahlBaustellen, optionenAusHtml, AUSWAHL_BAUER } = require('../tools/sprachluecken-messen.js');

const WURZEL = path.join(__dirname, '..');
const BAUSTELLEN = 40;

test('[Auswahl·Englisch] keine Auswahl zeigt in Englisch einen Eintrag wie in Deutsch', async () => {
  const d = await teilDAmKern(WURZEL);
  assert.ok(d.stellen >= AUSWAHL_BAUER.length, 'Teil D liest die Auswahlen: ' + d.stellen);
  assert.ok(d.eintraege >= 100, 'Teil D liest Einträge: ' + d.eintraege);
  assert.deepEqual(AUSWAHL_BAUER.filter((b) => !d.bauer.includes(b)), [], 'jeder benannte Bauer liefert Einträge');
  assert.deepEqual(d.funde, [], 'Einträge, die in Englisch deutsch bleiben');
  assert.deepEqual(d.fehlt, [], 'Einträge, die es in Englisch nicht gibt');
});

test('[Auswahl·Rot-Beweis] mit dem festen „ja“/„nein“ (Stand vor dem Fix) findet der Vergleich genau diese Einträge', () => {
  const de = [{ stelle: 'jaNein', optionen: [{ wert: 'ja', text: 'ja' }, { wert: 'nein', text: 'nein' }] },
    { stelle: 'bankvollmacht', optionen: [{ wert: 'bv', text: 'Bankvollmacht' }] }];
  const vorher = teilDVergleichen(de, de, new Set());
  assert.deepEqual(vorher.funde.map((f) => f.stelle + '|' + f.wert), ['jaNein|nein', 'bankvollmacht|bv'],
    '„ja“ hat zwei Buchstaben und zählt nicht als Wort; „nein“ und „Bankvollmacht“ sind Funde');
  const en = [{ stelle: 'jaNein', optionen: [{ wert: 'ja', text: 'yes' }, { wert: 'nein', text: 'no' }] },
    { stelle: 'bankvollmacht', optionen: [{ wert: 'bv', text: 'Bank power of attorney' }] }];
  assert.deepEqual(teilDVergleichen(de, en, new Set()).funde, [], 'nach dem Fix keiner');
  assert.deepEqual(teilDVergleichen(de, de, new Set(['jaNein|nein', 'bankvollmacht|bv'])).funde, [], 'ausgenommen heißt nicht gefunden');
  const codes = [{ stelle: 'feld:waehrung', optionen: [{ wert: 'EUR', text: 'EUR' }, { wert: 'III', text: 'III' }, { wert: 'SD-BASE-DP', text: 'SD-BASE-DP' }, { wert: 'x', text: 'Nein' }] }];
  assert.deepEqual(teilDVergleichen(codes, codes, new Set()).funde.map((f) => f.wert), ['x'], 'Codes in Großbuchstaben sind kein Wort, „Nein“ schon');
});

test('[Auswahl·Fix] ja und nein einer Bereichsdefinition und der Rückfall der Bankvollmacht lesen den Satz', () => {
  const kern = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const tfzm = kern.slice(kern.indexOf('function _templateFeldZuModell('), kern.indexOf('function _templateFeldZuModell(') + 12000);
  assert.ok(!/label: 'ja'|label: 'nein'/.test(tfzm), 'kein festes ja/nein in _templateFeldZuModell');
  assert.ok(!/\|\| 'Bankvollmacht'/.test(kern), 'kein fester Rückfall „Bankvollmacht“');
  // Die Pro-Textsätze bleiben im öffentlichen Zuschnitt zurück; dort werden nur die zwei Privat-Sätze gelesen.
  const saetze = ['textsatz-de-modul.json', 'textsatz-en-modul.json'];
  if (!istOeffentlich(WURZEL)) saetze.push('textsatz-de-pro-modul.json', 'textsatz-en-pro-modul.json');
  for (const f of saetze) {
    const t = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', f), 'utf8')).texte;
    assert.ok(t['strings:jaNeinJa.text'] && t['strings:jaNeinNein.text'], f);
  }
});

test('[Auswahl·Zählprobe] die Zahl der Stellen, die im Kern Auswahl-Einträge bauen, steht fest', () => {
  const n = auswahlBaustellen(fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8'));
  assert.equal(n, BAUSTELLEN, 'ein neuer Bauer einer Auswahl: in sammeln (tools/sprachluecken-messen.js, Teil D) aufnehmen, dann hier die Zahl');
});

test('[Auswahl·Ausnahmen] die Positivliste hat höchstens drei Einträge (Deckel nur sinkend), jeder mit Grund und Wort', () => {
  const liste = JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', 'sprachluecken-auswahl-ausnahmen.json'), 'utf8')).eintraege;
  assert.ok(liste.length <= 3, 'Deckel 3: ' + liste.length);
  for (const e of liste) assert.ok(e.stelle && e.wert && e.text && e.grund && /^Gegenlesung \d{4}-\d{2}-\d{2}$/.test(e.wort || ''), JSON.stringify(e));
});

test('[Auswahl·Leser] optionenAusHtml liest Wert und Text einer Option', () => {
  assert.deepEqual(optionenAusHtml('<option value="a" selected>A &amp; B</option><option value="">—</option>'),
    [{ wert: 'a', text: 'A & B' }, { wert: '', text: '—' }]);
});
