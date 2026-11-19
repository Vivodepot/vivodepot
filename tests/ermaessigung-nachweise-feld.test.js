'use strict';
/* U2-ADR-527 — Nachweise für eine Ermäßigung im Bereich Soziales.
   Die Probe liest das Feld aus dem Kern, dazu die Textsätze und den Feldkatalog des Studios. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const lies = (rel) => JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));

function feldSuchen() {
  const { V } = ladeKern();
  const bereich = V.bereicheAlle().find((b) => b.id === 'socialInsurance');
  assert.ok(bereich, 'der Bereich socialInsurance fehlt im Kern');
  for (const sek of bereich.sektionen || []) {
    for (const f of sek.felder || []) if (f.id === 'reducedRateProofs') return f;
  }
  return null;
}

test('[U2-ADR-527·a] das Listenfeld steht im Bereich Soziales mit drei Unterfeldern', () => {
  const f = feldSuchen();
  assert.ok(f, 'socialInsurance.reducedRateProofs fehlt in der Feldquelle');
  assert.equal(f.typ, 'liste');
  assert.deepEqual(f.unterFelder.map((u) => u.id), ['reductionPurpose', 'reductionValidUntil', 'document']);
  const u = Object.fromEntries(f.unterFelder.map((x) => [x.id, x]));
  assert.equal(u.reductionValidUntil.typ, 'datum');
  assert.equal(u.document.typ, 'ref');
  assert.equal(u.document.entitaet, 'mappe');
});

test('[U2-ADR-527·b] Datum und Datei sind sensibel, der Zweck nicht', () => {
  const u = Object.fromEntries(feldSuchen().unterFelder.map((x) => [x.id, x]));
  assert.equal(u.reductionValidUntil.sensibel, true);
  assert.equal(u.document.sensibel, true);
  assert.notEqual(u.reductionPurpose.sensibel, true);
  const liste = lies('tools/w3-sensibel-grundlinie.json')
    .filter((e) => e.feld === 'reducedRateProofs').map((e) => e.unterfeld).sort();
  assert.deepEqual(liste, ['document', 'reductionValidUntil']);
});

function alteKennungen(ids) {
  return ['kind', 'validUntil'].filter((alt) => ids.includes(alt));
}

test('[U2-ADR-527·c] die Unterfelder heißen nicht kind und validUntil', () => {
  const ids = feldSuchen().unterFelder.map((u) => u.id);
  assert.deepEqual(alteKennungen(ids), [], 'eine alte Kennung steht wieder in der Liste');
});

test('[U2-ADR-527·Rot-Beweis] mit den alten Kennungen schlägt die Prüfung an', () => {
  assert.deepEqual(alteKennungen(['kind', 'validUntil', 'document']), ['kind', 'validUntil']);
});

test('[U2-ADR-527·d] Beschriftungen auf Deutsch und Englisch', () => {
  const de = lies('tools/textsatz-de-modul.json').texte;
  const en = lies('tools/textsatz-en-modul.json').texte;
  const schluessel = ['socialInsurance.reducedRateProofs.label']
    .concat(['reductionPurpose', 'reductionValidUntil', 'document']
      .map((u) => 'socialInsurance.reducedRateProofs/' + u + '.label'));
  for (const s of schluessel) {
    assert.ok(typeof de[s] === 'string' && de[s].length > 0, 'deutscher Text fehlt: ' + s);
    assert.ok(typeof en[s] === 'string' && en[s].length > 0, 'englischer Text fehlt: ' + s);
  }
  assert.equal(de['socialInsurance.reducedRateProofs/reductionValidUntil.label'], 'Nachweis gilt bis');
});

test('[U2-ADR-527·e] der Feldkatalog des Studios führt das Feld', () => {
  const k = lies('bereiche/feldkatalog.json');
  const e = k.felder.find((x) => x.kennung === 'socialInsurance.reducedRateProofs');
  assert.ok(e, 'socialInsurance.reducedRateProofs fehlt im Feldkatalog');
  assert.equal(e.label, 'Nachweise für eine Ermäßigung');
});
