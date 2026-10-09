'use strict';
/* liste-weiterer-eintrag-vollstaendig.test.js — jede Liste nennt ihren Zweitknopf (Konvention „Hinzufügen“, 07.10.2026).
   Ab einem Eintrag steht unter einer Liste „Weitere(s) <Einzelname> hinzufügen“; der ganze Satz kommt aus dem Textsatz
   (`<bereich>.<feld>.weitererEintrag`), weil das Deutsche das Beiwort nach dem Geschlecht beugt. Fehlt er, stünde nur der
   Rückfall „Weiteren Eintrag hinzufügen“. Diese Probe verlangt den Text für jede Liste mit Unterfeldern in allen vier
   Produkten, deutsch und englisch, mit Rot-Beweis. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const DE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-de-modul.json'), 'utf8')).texte;
const EN = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;

let _listen = null;
async function listen() {
  if (_listen) return _listen;
  const menge = new Set();
  for (const produkt of ['privat-de', 'pro-de', 'privat-en', 'pro-en']) {
    const K = await ladeKern({ produkt });
    const V = K.V || K;
    for (const s of (V.SEKTOREN || (V.__vdOeffentlich && V.__vdOeffentlich.SEKTOREN) || K.SEKTOREN || [])) for (const sek of s.sektionen || []) for (const f of sek.felder || []) {
      if (f.typ === 'liste' && Array.isArray(f.unterFelder) && f.unterFelder.length) menge.add(s.id + '.' + f.id);
    }
  }
  _listen = [...menge].sort();
  return _listen;
}
function fehlende(liste, de, en) {
  const aus = [];
  for (const k of liste) for (const [name, t] of [['de', de], ['en', en]]) {
    const w = t[k + '.weitererEintrag'];
    if (typeof w !== 'string' || !w.trim()) aus.push(name + ': ' + k);
  }
  return aus;
}

test('[Hinzufügen·Einzelname] jede Liste trägt ihren Zweitknopf-Text, deutsch und englisch, in allen vier Produkten', async () => {
  const l = await listen();
  assert.ok(l.length > 80, 'Voraussetzung: die Listen der vier Produkte sind erfasst (' + l.length + ')');
  assert.deepEqual(fehlende(l, DE, EN), []);
});

test('[Hinzufügen·Einzelname·Rot-Beweis] ein fehlender Text fällt auf', async () => {
  const l = await listen();
  const ohne = Object.assign({}, EN); delete ohne[l[0] + '.weitererEintrag'];
  assert.deepEqual(fehlende(l, DE, ohne), ['en: ' + l[0]]);
});
