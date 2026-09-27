'use strict';
/* F3 Zug 3 — die `art`-Options-Liste selbst (nicht die Migration): "gesundheit"/"general"
   entfallen als wählbare Werte (sind Umfang, kein Instrument, s. f3-art-migration.test.js).
   "betreuung" bleibt in der Liste (ein migriertes/unmigriertes Bestandsinstrument darf nicht
   blank rendern — der DOM-Select zeigt nur, was in `optionen` steht), bekommt aber einen
   sichtbaren, bedingten Prüfhinweis direkt darunter (dasselbe `hinweis`-Muster wie
   `ueberlappung_hinweis` in derselben Liste). Die Options-WERTE selbst (`vorsorge`/`bank`/
   `betreuung`) sind Auswahl-Codes, keine Kennungen — vom Englisch-Umbau unberührt; nur die
   Unterfeld-ID (`art` → `typeOfPowerOfAttorney`) und die Sektor-/Feld-IDs wurden umbenannt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function instrumenteFeld(V) {
  return V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder).find(f => f.id === 'provisionInstruments');
}

test('[F3] art-Feld: nur noch vorsorge/bank/betreuung wählbar — gesundheit/general entfallen', () => {
  const { V } = ladeKern();
  const feld = instrumenteFeld(V);
  const art = feld.unterFelder.find(u => u.id === 'typeOfPowerOfAttorney');
  const werte = art.optionen.map(o => o.wert);
  assert.deepEqual(werte, ['vorsorge', 'bank', 'betreuung']);
});

test('[F3] art-Feld: "betreuung" trägt weiterhin sein ursprüngliches Label (Bestandswerte bleiben lesbar)', () => {
  const { V } = ladeKern();
  const feld = instrumenteFeld(V);
  const art = feld.unterFelder.find(u => u.id === 'typeOfPowerOfAttorney');
  const betreuung = art.optionen.find(o => o.wert === 'betreuung');
  assert.equal(betreuung.label, 'Betreuungsvollmacht');
});

test('[F3] art-Feld: neuer Prüfhinweis erscheint NUR bei typeOfPowerOfAttorney="betreuung"', () => {
  const { V } = ladeKern();
  const feld = instrumenteFeld(V);
  const hinweis = feld.unterFelder.find(u => u.id === 'note');
  assert.ok(hinweis, 'Hinweisfeld existiert');
  assert.equal(hinweis.typ, 'hinweis');
  assert.deepEqual(hinweis.sichtbarWenn, { feld: 'typeOfPowerOfAttorney', wert: 'betreuung' });
  assert.match(hinweis.hint, /kein Rechtsbegriff|nicht wörtlich/i);
});

test('[F3] ueberlappung_hinweis: sichtbarWenn nennt nur noch "bank" (general/gesundheit sind keine art-Werte mehr)', () => {
  const { V } = ladeKern();
  const feld = instrumenteFeld(V);
  const hinweis = feld.unterFelder.find(u => u.id === 'note2');
  assert.deepEqual(hinweis.sichtbarWenn, { feld: 'typeOfPowerOfAttorney', wert: ['bank'] });
});
