'use strict';
/* Probe zu tools/sprachluecken-messen.js: die Zahlen der erfundenen Vorlage tests/fixtures/sprachluecken-messen.
   Teil A: fehlend, deutsch geblieben, amtlicher Wortlaut getrennt. Teil B: feste deutsche Anzeige (.displayDe).
   Teil C: Text-Träger ohne Kennung, ungelesene Wurzeln getrennt. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { messen, art, teilC, VORLAGE } = require('../tools/sprachluecken-messen.js');

test('[Sprachlücken·Art] die Form der Kennung entscheidet', () => {
  assert.strictEqual(art('strings:x.text'), 'dialog');
  assert.strictEqual(art('people.f/kind.label'), 'auswahl');
  assert.strictEqual(art('people.f.label'), 'feld');
  assert.strictEqual(art('cluster:x.titel'), 'sonstige');
});

test('[Sprachlücken·A] fehlend und deutsch je Modul, amtlicher Wortlaut nicht als Lücke', () => {
  const e = messen(VORLAGE);
  const xx = e.teilA.find((m) => m.sprache === 'xx');
  assert.deepStrictEqual([xx.soll, xx.fehlt, xx.deutsch, xx.deutschMitUmlaut, xx.amtlichDeutsch], [8, 2, 3, 1, 1]);
  assert.deepStrictEqual(xx.jeArt.fehlt, { auswahl: 1, sonstige: 1 });
  const yy = e.teilA.find((m) => m.sprache === 'yy');
  assert.strictEqual(yy.fehlt, 6, 'eine Sprache nur aus Daten: amtlicher Wortlaut fehlt nicht');
  assert.match(yy.quelle, /Daten/);
});

test('[Sprachlücken·B] .displayDe in die Oberfläche, Kommentarzeilen zählen nicht', () => {
  const e = messen(VORLAGE);
  assert.deepStrictEqual(e.teilB.map((s) => [s.zeile, s.art]), [[4, 'oberflaeche'], [5, 'pruefen']]);
});

test('[Sprachlücken·C] Träger ohne Kennung, ungelesene Wurzel getrennt', () => {
  const quelltext = fs.readFileSync(path.join(VORLAGE, 'vivodepot.html'), 'utf8');
  const wurzeln = {
    KATALOG: { A: { displayEn: 'a', displayDe: 'Ich bin A' } },
    ALTREGISTER: [{ feld: { label: 'Früheres Feld im Bestand' } }],
    GEDECKT: { feld: { label: 'Beziehung zur Person' } },
  };
  const c = teilC(wurzeln, new Set(['Beziehung zur Person']), ['label', 'displayDe'], quelltext);
  assert.strictEqual(c.ungedeckt, 1);
  assert.deepStrictEqual(c.fundstellen.map((t) => [t.pfad, t.art]), [['KATALOG.A.displayDe', 'feld']]);
  assert.deepStrictEqual(c.ungelesen, { ALTREGISTER: 1 });
});

test('[Sprachlücken·C·Rot-Beweis] steht der Wert nicht im Satz, zählt derselbe Träger als Lücke', () => {
  const quelltext = fs.readFileSync(path.join(VORLAGE, 'vivodepot.html'), 'utf8');
  const wurzeln = { KATALOG: { A: { displayDe: 'Ich bin A' } } };
  assert.strictEqual(teilC(wurzeln, new Set(['Ich bin A']), ['displayDe'], quelltext).ungedeckt, 0);
  assert.strictEqual(teilC(wurzeln, new Set(), ['displayDe'], quelltext).ungedeckt, 1);
});

test('[Sprachlücken·C] ein Füll-Platzhalter ist kein Träger, ein Eingabe-Platzhalter schon', () => {
  const quelltext = fs.readFileSync(path.join(VORLAGE, 'vivodepot.html'), 'utf8');
  const wurzeln = { KATALOG: { bloecke: [{ fuellByWert: { b: { platzhalter: '(Zeitangabe)' } } }], feld: { platzhalter: 'z. B. Anna' } } };
  const c = teilC(wurzeln, new Set(), ['platzhalter'], quelltext);
  assert.deepStrictEqual(c.fundstellen.map((t) => t.pfad), ['KATALOG.feld.platzhalter']);
});

test('[Sprachlücken·C2] ein Abschnittstitel ohne Kennung dok:<id>#<i>.titel wird gemeldet, mit Kennung nicht', () => {
  const { dokTitelOhneKennung } = require('../tools/sprachluecken-messen.js');
  const V = { VORSORGE_MODULE: [{ generator: { id: 'probe', abschnitte: [{ eingangsformel: 'x' }, { titel: 'Erster Teil' }, { titel: 'Schluss' }] } }] };
  const de = { 'dok:probe#1.titel': 'Erster Teil' };
  assert.deepStrictEqual(dokTitelOhneKennung(V, de, new Set()).map((t) => t.kennung), ['dok:probe#2.titel']);
  // Rot-Beweis: mit der Kennung ist der Titel gedeckt; ohne die erste fehlen beide.
  assert.strictEqual(dokTitelOhneKennung(V, Object.assign({ 'dok:probe#2.titel': 'Schluss' }, de), new Set()).length, 0);
  assert.strictEqual(dokTitelOhneKennung(V, {}, new Set()).length, 2);
  assert.strictEqual(dokTitelOhneKennung(V, de, new Set(['dok:probe#1.titel']))[0].modulAmtlich, true);
});
