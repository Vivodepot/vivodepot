'use strict';
/* Klartext in der Anfrage, aus drei Kalt-Lesetests der Klinikaufnahme-Demo (26.09.2026). Ein Leser ohne Vorkontext stolperte über:
   - Katalognamen im Freigabe-Dialog („Gesundheitssorge — allgemein entscheiden", zweimal „Ablageort") — die Person, die freigibt,
     soll dieselben Worte sehen wie die Stelle, die empfängt (ANTWORT_BESCHRIFTUNG der Lese-App);
   - eine Aktenzeile im Kopf der Anfrage („Vorgang: … · Gilt bis: 2027-12-31 · offen");
   - einen dezenten Link für die wichtigste Wahl im Dialog („Einzeln entscheiden, was mitgeht").
   Die Texte stehen in den Sprachmodulen; geprüft wird darum am gebackenen Produkt, nicht am blanken Kern. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { _standardProduktBaken } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const S = require('../tools/vorfuehrung-showcase-erzeugen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
let _V = null;
const produkt = () => (_V || (_V = S._kernAusProdukt(_standardProduktBaken(KERN))));
const MODUL = (sprache) => JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textsatz-' + sprache + '-modul.json'), 'utf8')).texte;

test('[Anfrage·Beschriftung] der Freigabe-Dialog beschriftet wie die Lese-App; die zwei Ablageorte heißen verschieden', () => {
  const V = produkt();
  const L = ladeLesen().V;
  const kennungen = Object.keys(V.ANFRAGE_BESCHRIFTUNG);
  assert.deepEqual(kennungen.sort(), Object.keys(L.ANTWORT_BESCHRIFTUNG).sort(), 'dieselben Kennungen wie beim Empfänger');
  for (const k of kennungen) assert.equal(V._anfrageBeschriftung({ kennung: k }), L.STRINGS[L.ANTWORT_BESCHRIFTUNG[k]], k);
  const orte = ['advanceCare.provisionInstruments[enduring-power-of-attorney].storageLocation', 'advanceCare.provisionInstruments[custodianship-declaration].storageLocation']
    .map((k) => V._anfrageBeschriftung({ kennung: k }));
  assert.notEqual(orte[0], orte[1], 'nicht zweimal „Ablageort"');
  assert.equal(V._anfrageBeschriftung({ kennung: 'health.bloodType' }), null, 'Rot-Beweis: ohne Zuordnung bleibt der Katalogname');
  for (const sprache of ['de', 'en']) {
    const t = MODUL(sprache);
    for (const k of Object.values(V.ANFRAGE_BESCHRIFTUNG)) assert.ok(t['strings:' + k + '.text'], sprache + ' fehlt: ' + k);
  }
});

test('[Anfrage·Kopf] „Anfrage vom … · gilt bis …" mit deutschem Datum; „offen" steht nicht als Wort da', () => {
  const de = MODUL('de'), en = MODUL('en');
  assert.equal(de['strings:anfrageVomLabel.text'], 'Anfrage vom');
  assert.equal(de['strings:anfrageGueltigBisLabel.text'], 'gilt bis');
  assert.equal(en['strings:anfrageVomLabel.text'], 'Request of');
  const zeile = (KERN.match(/'<p class="fs-sm" id="anfrage-meta">'[\s\S]*?'<\/p><\/div>';/) || [])[0] || '';
  assert.ok(zeile, 'die Kopfzeile der Anfrage gefunden');
  assert.match(zeile, /_datumDeutsch\(a\.gestelltAm\)/);
  assert.match(zeile, /_datumDeutsch\(a\.gueltigBis\)/);
  assert.match(zeile, /zustand !== 'offen'/, 'der Zustand nur, wenn er etwas sagt');
  assert.equal(produkt()._datumDeutsch('2027-12-31'), '31.12.2027');
});

test('[Anfrage·Einzeln] „Einzeln entscheiden, was mitgeht" ist ein Knopf, kein dezenter Link', () => {
  assert.match(KERN, /<button type="button" class="btn btn-sek" id="exp-zurueckhalten-weg">/);
  assert.doesNotMatch(KERN, /class="btn-dezent" id="exp-zurueckhalten-weg"/);
});
