'use strict';
/* Befund HAFTUNG-SPRACHGRENZE (HOCH, 06.10.2026). Ein Depot trägt das Sprachmodul seines Produkts als Mitschrift
   (`abWerkMitschrift.sprache`). Wird es im Produkt der ANDEREN Sprache geöffnet und gilt die Sprache der Datei, kommen die
   Schutz-Kennungen (Haftungshinweis im Dokumentfuß u. a.) aus dieser Mitschrift — das Produkt selbst trägt für die fremde
   Sprache keine. Solange die Mitschrift-Fassung die laufende war (Rezept-Fingerabdruck), galt sie als vertrauenswürdig und der
   Hinweis stand da. Seit eine spätere Fassung den Textsatz ändert, ist sie nur noch eine FRÜHER ausgelieferte Fassung
   (ABWERK_FRUEHERE_FASSUNGEN_KERN): ab Werk für die Herkunft, nicht für den Schutz — der Hinweis ist leer.

   Gemessen in beiden Richtungen, mit dem Kern der Fassung v918 angelegt und mit dem heutigen geöffnet: DE-Depot (textsprache
   de) in privat-en/pro-en und EN-Depot (textsprache en) in privat-de/pro-de, je `strings:dokFussHaftung.text` → null; mit dem
   Kern v918 geöffnet war er da. Die Fixtures sind byte-gleiche Kopien der in v918 ausgelieferten Textsatz-Module
   (`git show b772855d2:tools/textsatz-de-modul.json`, ebenso -en); nur deren Abdruck steht in den früheren Fassungen, eine
   gekürzte Form prüfte die Sperre statt der Sprachgrenze.

   Abnahme: der Hinweis ist über die Sprachgrenze vorhanden — in der Sprache des Depots, oder als sichtbarer Rückfall mit
   Sprachangabe —, in beiden Richtungen, und dasselbe für jede Schutz-Kennung der Mitschrift (Klassenprobe). Bis zum Fix standen
   die Proben als todo; mit dem Fix (Weg B, tests/haftung-sprachgrenze-weg-b.test.js) sind sie test, der Lauf davor war der Rot-Beweis. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const PW = 'haftung-sprachgrenze-pw-2026';
const HAFTUNG = 'strings:dokFussHaftung.text';
const FIXTURE = (sprache) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'mitschrift-fruehere-fassung-v918-textsatz-' + sprache + '.json'), 'utf8'));

/* [anlegendes Produkt, öffnendes Produkt, Sprache der Datei] — nur die gemessenen Richtungen. */
const RICHTUNGEN = [
  ['privat-de', 'privat-en', 'de'],
  ['pro-de', 'pro-en', 'de'],
  ['privat-en', 'privat-de', 'en'],
  ['pro-en', 'pro-de', 'en'],
];

/* Ein Depot, wie es die Fassung v918 im anlegenden Produkt geschrieben hat: dessen Sprach-Mitschrift, dessen Sprache. */
async function v918DepotOeffnen(anlege, oeffne, sprache) {
  const Q = ladeKern({ produkt: anlege }).V;
  await Q.depotAnlegen(PW);
  const d = JSON.parse(JSON.stringify(Q.getData()));
  d.abWerkMitschrift = Object.assign({}, d.abWerkMitschrift || {}, { sprache: FIXTURE(sprache) });
  d.textsprache = sprache;
  Q.setData(d);
  const umschlag = await Q.depotSerialisieren();
  const V = ladeKern({ produkt: oeffne }).V;
  await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), PW);
  return V;
}

/* Was als „steht da“ zählt: der Text der Mitschrift, oder der Text, den das heutige Produkt DERSELBEN Sprache für die Kennung trägt.
   Ein Text in der anderen Sprache zählt nicht (TOP, 06.10.2026); ein sichtbarer Rückfall mit Sprachangabe muss der Fix hier benennen. */
const _gleicheSprache = {};
async function zulaessig(sprache, kennung) {
  if (!_gleicheSprache[sprache]) {
    const { V } = ladeKern({ produkt: 'privat-' + sprache });
    await V.depotAnlegen(PW);
    _gleicheSprache[sprache] = V;
  }
  return [FIXTURE(sprache).texte[kennung], _gleicheSprache[sprache].textLesen(kennung)].filter((w) => typeof w === 'string' && w.trim());
}

/* Die Kennungen, die die Rücknahme-Tabelle des Kerns für den Abdruck `m` zurückzieht (leer, wenn er nicht darauf steht). */
async function zurueckgezogen(V, m) {
  const fp = await V._modulRezeptFingerabdruck(m);
  return (V.ABWERK_SCHUTZ_ZURUECKGEZOGEN_KERN.get(fp) || []).slice();
}

/* Eingefroren (Wort der Gegenlesung, 06.10.2026): die Fixtures sind die ausgelieferten v918-Bytes. Ein Nachziehen auf eine spätere
   Fassung macht die Probe sinnlos — sie prüfte dann die laufende Fassung, nicht die frühere. */
const V918_SHA256 = Object.freeze({
  de: 'c8931f174fe41ff9fa5d028ae890fd8044f61df553a595ff6475b042848df953',
  en: 'd37f350c9f70b2cdc8b995bb7b972326e4cbf0a2385607e0c45c0031413af76a',
});
test('[Haftung·Sprachgrenze·eingefroren] die Fixtures sind byte-gleich mit den v918-Blobs', () => {
  const crypto = require('node:crypto');
  for (const sprache of ['de', 'en']) {
    const datei = path.join(__dirname, 'fixtures', 'mitschrift-fruehere-fassung-v918-textsatz-' + sprache + '.json');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(datei)).digest('hex'), V918_SHA256[sprache], sprache + ': nicht nachziehen');
  }
});

test('[Haftung·Sprachgrenze·Vorbedingung] die Fixtures sind die v918-Fassungen: früher ausgeliefert, nicht mehr laufend', async () => {
  const { V } = ladeKern({ produkt: 'privat-de' });
  for (const sprache of ['de', 'en']) {
    const fp = await V._modulRezeptFingerabdruck(FIXTURE(sprache));
    assert.ok(V.ABWERK_FRUEHERE_FASSUNGEN_KERN.has(fp), sprache + ': Abdruck in den früheren Fassungen — sonst prüfte die Probe die Sperre');
    assert.ok(!V.REZEPT_FINGERABDRUECKE_KERN.has(fp), sprache + ': nicht die laufende Fassung — sonst prüfte die Probe nichts');
    assert.ok(FIXTURE(sprache).texte[HAFTUNG], sprache + ': die Mitschrift trägt den Haftungshinweis');
  }
});

for (const [anlege, oeffne, sprache] of RICHTUNGEN) {
  test('[Haftung·Sprachgrenze] ' + anlege + '-Depot (Sprache ' + sprache + ') in ' + oeffne + ': nicht gesperrt, Sprache bleibt', async () => {
    const V = await v918DepotOeffnen(anlege, oeffne, sprache);
    assert.equal(V.gesperrteDepotModule().length, 0, 'eine früher ausgelieferte Mitschrift ist nicht gesperrt');
    assert.equal(V.textsatzSpracheAktiv(), sprache);
  });

  test('[Haftung·Sprachgrenze] ' + anlege + '-Depot (Sprache ' + sprache + ') in ' + oeffne + ': der Haftungshinweis steht da', async () => {
    const V = await v918DepotOeffnen(anlege, oeffne, sprache);
    const wert = V.textLesen(HAFTUNG);
    assert.ok((await zulaessig(sprache, HAFTUNG)).includes(wert), 'in der Sprache des Depots; gemessen vor dem Fix: ' + JSON.stringify(wert));
  });

  test('[Haftung·Sprachgrenze·Klasse] ' + anlege + '-Depot (Sprache ' + sprache + ') in ' + oeffne + ': jede Schutz-Kennung der Mitschrift steht da, in ihrer Sprache', async () => {
    const V = await v918DepotOeffnen(anlege, oeffne, sprache);
    const schutz = Object.keys(FIXTURE(sprache).texte).filter((k) => V._istZusicherungsKennung(k));
    assert.ok(schutz.length >= 1, 'Vorbedingung: die Mitschrift trägt Schutz-Kennungen');
    /* Benannt (Weg A je Kennung, Einzelwort der Gegenlesung 08.10.2026): die Kennungen, die die Rücknahme-Liste für diesen Abdruck
       zurückzieht, stehen nicht aus der Mitschrift, sondern im Rückfall mit Sprachangabe. Der Haftungshinweis ist nie darunter. */
    const zurueck = await zurueckgezogen(V, FIXTURE(sprache));
    assert.ok(!zurueck.includes(HAFTUNG), 'der Haftungshinweis ist nicht zurückgezogen');
    const fehlt = [];
    for (const k of schutz) {
      if (zurueck.includes(k)) { if (V.textLesen(k) !== null) fehlt.push(k + ' (zurückgezogen, steht aber)'); continue; }
      if (!(await zulaessig(sprache, k)).includes(V.textLesen(k))) fehlt.push(k);
    }
    assert.deepEqual(fehlt, [], fehlt.length + ' von ' + schutz.length + ' Schutz-Kennungen fehlen oder stehen in der anderen Sprache');
  });
}
