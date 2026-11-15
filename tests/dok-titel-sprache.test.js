'use strict';
/* Jeder Abschnittstitel eines Dokument-Moduls hat eine Kennung und erscheint in der Anzeigesprache.

   Befund SPRACHE-DOK-TITEL-OHNE-KENNUNG: Sechs Titel aus einem einzigen Wort hatten keine Kennung
   `dok:<id>#<i>.titel` und blieben im englischen Dokument deutsch („Schlussformel“, „Ersatzperson“,
   „Ausschluss“, dazu drei in der Patientenverfügung). Gefunden mit
   `node tools/sprachluecken-messen.js --wurzel . --mit-kern` (Teil C2).

   Die drei PV-Titel stehen in einem Dokument mit amtlichem deutschem Wortlaut. Eine englische Fassung des BMJ
   gibt es nicht; die Übersetzung nennt sich als die von Vivodepot und trägt das Deutsche daneben.
   Den Klassenwächter über alle Dokument-Module hält tests/sprachluecken-ratsche.test.js (Zahl C2). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { deTexte } = require('../tools/lib/textsatz-de-quelle.js');
const { TEXTSATZ_EN_TEXTE } = require('../tools/textsatz-en-daten.js');
const { dokTitelOhneKennung } = require('../tools/sprachluecken-messen.js');

const TITEL = [
  ['PV_MODUL', 'patientenverfuegung', 8], ['PV_MODUL', 'patientenverfuegung', 9], ['PV_MODUL', 'patientenverfuegung', 10],
  ['KI_MODUL', 'ki-verfuegung', 6], ['BETREUUNG_MODUL', 'betreuungsverfuegung', 2], ['BETREUUNG_MODUL', 'betreuungsverfuegung', 3],
];

async function frisch(produkt, sprache) {
  const { V } = ladeKern({ produkt });
  await V.depotAnlegen('dok-titel-pw');
  V.akteurSelbstErklaeren('Prüfung');
  if (sprache) V.getData().textsprache = sprache;
  V.textsatzNeuAnwenden();
  return V;
}

test('[Dokument·Titel] die sechs Titel haben eine Kennung und erscheinen im englischen Produkt englisch', async () => {
  const de = deTexte();
  const V = await frisch('privat-en', 'en');
  for (const [modul, id, i] of TITEL) {
    const k = 'dok:' + id + '#' + i + '.titel';
    assert.equal(typeof de[k], 'string', k + ' fehlt im deutschen Satz');
    // {marke} setzt der Kern beim Lesen ein (Name aus dem Branding); die Wortmarke steht nie blank im Textsatz.
    const roh = TEXTSATZ_EN_TEXTE[k].split(/\{marke\}/).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    assert.match(V[modul].abschnitte[i].titel, new RegExp('^' + roh.join('.+?') + '$'), k + ': im englischen Produkt nicht englisch');
  }
  assert.deepEqual(dokTitelOhneKennung(V, de, new Set()).map((t) => t.kennung), []);
});

test('[Dokument·Titel] die PV-Titel nennen das Deutsche und die Übersetzung durch die Marke (Platzhalter, nie blank)', async () => {
  const de = deTexte();
  const V = await frisch('privat-en', 'en');
  for (const i of [8, 9, 10]) {
    const k = 'dok:patientenverfuegung#' + i + '.titel';
    assert.match(TEXTSATZ_EN_TEXTE[k], new RegExp('German: ' + de[k] + '; translated by \\{marke\\}\\)$'), k);
    assert.ok(!/\{marke\}/.test(V.PV_MODUL.abschnitte[i].titel), k + ': der Platzhalter ist im Dokument nicht aufgelöst');
  }
});

test('[Dokument·Titel] im deutschen Produkt bleiben die Titel deutsch', async () => {
  const de = deTexte();
  const V = await frisch('privat-de');
  for (const [modul, id, i] of TITEL) assert.equal(V[modul].abschnitte[i].titel, de['dok:' + id + '#' + i + '.titel']);
});

test('[Dokument·Titel·Rot-Beweis] fehlt eine Kennung, meldet der Wächter genau sie', async () => {
  const V = await frisch('privat-en', 'en');
  const ohne = Object.assign({}, deTexte());
  delete ohne['dok:ki-verfuegung#6.titel'];
  assert.deepEqual(dokTitelOhneKennung(V, ohne, new Set()).map((t) => t.kennung), ['dok:ki-verfuegung#6.titel']);
});
