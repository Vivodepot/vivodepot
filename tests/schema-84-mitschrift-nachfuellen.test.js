'use strict';
/* Alt-Depots ohne Mitschrift-Fächer (Schema 84, DoD-Punkt 2): „verlieren nie" gilt auch für die Anzeige.
   Die Mitschrift entsteht nur beim Anlegen; ein älteres Depot trägt die Fächer `situationen` und `angehoerigen`
   nicht, und die Lese-App zeigt ihm dann keine Situation und kein Blatt. `_abWerkMitschriftAusLebendemTemplateFuellen`
   füllt ein fehlendes oder leeres Fach aus dem lebenden Template des öffnenden Produkts nach — idempotent, ohne je ein
   vorhandenes Fach zu überschreiben. Die Stufe 84 ruft die Funktion auf; hier steht ihre Probe. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const altDepot = (mitschrift) => ({ schemaVersion: 83, menschen: [], urheberschaft: {}, mappe: [], feldDefinitionen: [], sensibelFelder: {}, sektoren: {},
  abWerkMitschrift: mitschrift });
const ALT_MITSCHRIFT = () => ({ bereich: [], sprache: null, logikModul: [] });   // die drei Schlüssel der ersten Fassung
function leseAnsicht(depot) {
  const { V } = ladeLesen({ ohneSaat: true });
  V._foldVollmachtenLesen(depot);
  V.setData(depot);
  return V;
}
const zaehle = (html, attr) => (html.match(new RegExp(attr + '="', 'g')) || []).length;

test('[Rot-Beweis] ohne den Schritt zeigt die Lese-App einem Alt-Depot keine Situation und kein Blatt', () => {
  const V = leseAnsicht(altDepot(ALT_MITSCHRIFT()));
  const html = V.sidebarHTML();
  assert.equal(zaehle(html, 'data-situation'), 0);
  assert.equal(zaehle(html, 'data-angblatt'), 0);
});

test('[Migration] mit dem Schritt zeigt dieselbe Datei alle zehn Situationen und die fünf Blätter des Produkts', () => {
  const { V: K } = ladeKern();
  const depot = altDepot(ALT_MITSCHRIFT());
  assert.deepEqual(Array.from(K._abWerkMitschriftAusLebendemTemplateFuellen(depot)), ['situationen', 'angehoerigen']);
  const html = leseAnsicht(depot).sidebarHTML();
  assert.equal(zaehle(html, 'data-situation'), 10);
  assert.equal(zaehle(html, 'data-angblatt'), 5);
  assert.deepEqual(Object.keys(depot.abWerkMitschrift).sort(), ['angehoerigen', 'bereich', 'logikModul', 'situationen', 'sprache'], 'bestehende Fächer bleiben');
});

test('[Migration] idempotent: ein zweiter Lauf füllt nichts und ändert nichts', () => {
  const { V: K } = ladeKern();
  const depot = altDepot(ALT_MITSCHRIFT());
  K._abWerkMitschriftAusLebendemTemplateFuellen(depot);
  const nach1 = JSON.stringify(depot);
  assert.deepEqual(Array.from(K._abWerkMitschriftAusLebendemTemplateFuellen(depot)), []);
  assert.equal(JSON.stringify(depot), nach1);
});

test('[Migration] ein vorhandenes Fach wird nie überschrieben — auch nicht mit dem Template des öffnenden Produkts', () => {
  const { V: K } = ladeKern();
  const eigene = [{ modulTyp: 'situation', herkunft: 'anderes-produkt', moduleVersion: 1, situationen: { 'nur-hier': { icon: 'star', titel: 'Nur hier', bloecke: [] } } }];
  const depot = altDepot(Object.assign(ALT_MITSCHRIFT(), { situationen: eigene }));
  assert.deepEqual(Array.from(K._abWerkMitschriftAusLebendemTemplateFuellen(depot)), ['angehoerigen'], 'nur das fehlende Fach');
  assert.equal(JSON.stringify(depot.abWerkMitschrift.situationen), JSON.stringify(eigene));
});

test('[Migration] fehlt die Mitschrift ganz, wird sie angelegt; ein leeres Fach gilt als fehlend', () => {
  const { V: K } = ladeKern();
  const ohne = { schemaVersion: 83 };
  assert.deepEqual(Array.from(K._abWerkMitschriftAusLebendemTemplateFuellen(ohne)), ['situationen', 'angehoerigen']);
  assert.ok(ohne.abWerkMitschrift.situationen.length > 0);
  const leer = altDepot(Object.assign(ALT_MITSCHRIFT(), { situationen: [], angehoerigen: null }));
  assert.deepEqual(Array.from(K._abWerkMitschriftAusLebendemTemplateFuellen(leer)), ['situationen', 'angehoerigen']);
});

test('[Gerüst] ohne lebendes Template (nacktes Gerüst) füllt der Schritt nichts und wirft nicht; kein Objekt bleibt unberührt', () => {
  const { V: B } = ladeKern({ blank: true });
  const depot = altDepot(ALT_MITSCHRIFT());
  assert.deepEqual(Array.from(B._abWerkMitschriftAusLebendemTemplateFuellen(depot)), []);
  assert.equal(depot.abWerkMitschrift.situationen, undefined);
  assert.deepEqual(Array.from(B._abWerkMitschriftAusLebendemTemplateFuellen(null)), []);
});
