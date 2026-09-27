'use strict';
/* cross-20 (15.09.2026, Entscheidung) — Ab-Werk-Module zählen NICHT als „ungeprüft".
   Grundsatz 08.09.2026 („Die Datei bringt alles mit"): eingebacken ist ausgeliefert, nicht
   angedockt. Die Erkennung hängt an der MARKE `abWerk`, die der Kern aus der Liste der eingebackenen Kennungen
   des Produkts setzt (`_abWerkMerkmalNeuSetzen`) — nie am Modulinhalt. Seit Schema 87 stehen die Auszüge nicht mehr im Kern,
   sondern als Template im Rezept des Produkts; sie liegen als Saat bereit und nicht im Depot. Der Rot-Beweis
   unten hält fest, dass ein Fremdmodul, das `herkunft: 'vivodepot'` und sogar `abWerk: true`
   selbst behauptet, ungeprüft bleibt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { kernAus, produktHtml } = require('./produkt-html-erzeugen.js');
const { ladeLesen } = require('./load-lesen.js');

const AUSZUG_TEXT = fs.readFileSync(path.join(__dirname, 'fixtures', 'erbschein-vorbereitung-logikmodul.json'), 'utf8');

async function neuesDepot() {
  const { V } = kernAus(produktHtml('privat-de'));
  await V.depotAnlegen('Herkunft-AbWerk-Marke-2026!');
  V.akteurSelbstErklaeren('Testerin');
  return V;
}

test('[cross-20] ein neues Depot im Privat-Produkt trägt die Ab-Werk-Auszüge als Saat — und zählt sie in keiner Spalte', async () => {
  const V = await neuesDepot();
  const ids = ['erbschein-vorbereitung', 'zugang-zum-recht-beratungshilfe'];
  for (const id of ids) {
    assert.ok(V._logikModuleAlle(V.getData()).some((x) => x && x.id === id), 'Ab-Werk-Auszug ' + id + ' steht als Saat des Produkts bereit');
    assert.ok(!(V.getData().logikModule || []).some((x) => x && x.id === id), 'und nicht als Kopie im Depot');
  }
  const h = V.modulHerkunftBerechnen();
  assert.deepEqual([h.geprueft, h.ungeprueft, h.unbekannt], [0, 0, 0]);
  assert.equal(V.modulHerkunftSatz(h), V.STRINGS.herkunftSatzKeine, '„ganz aus Vivodepot selbst"');
});

test('[cross-20 · Rot-Beweis] ein Fremdmodul mit behaupteter Herkunft vivodepot (und behaupteter Marke) bleibt ungeprüft', async () => {
  const V = await neuesDepot();
  const fremd = JSON.parse(AUSZUG_TEXT);
  fremd.id = 'fremd-behauptet-ab-werk';
  fremd.herkunft = 'vivodepot';
  fremd.abWerk = true;
  const r = V.modulEinlassen(JSON.stringify(fremd));
  assert.equal(r.angenommen, true, 'eingelassen (' + (r.grund || '') + ')');
  const m = V.getData().logikModule.find((x) => x && x.id === 'fremd-behauptet-ab-werk');
  assert.equal(m.abWerk, undefined, 'die selbst mitgebrachte Marke ist beim Einlass entfernt');
  assert.equal(V.modulHerkunftBerechnen().ungeprueft, 1, 'das Fremdmodul zählt als ungeprüft');
});

test('[cross-20 · Spiegel] die Lese-App zählt dieselbe Datei gleich — markiert raus, Fremdmodul drin', async () => {
  const V = await neuesDepot();
  const fremd = JSON.parse(AUSZUG_TEXT);
  fremd.id = 'fremd-behauptet-ab-werk';
  fremd.herkunft = 'vivodepot';
  V.modulEinlassen(JSON.stringify(fremd));
  const { V: L } = ladeLesen();
  const kern = V.modulHerkunftBerechnen(V.getData());
  const lesen = L.modulHerkunftBerechnen(V.getData());
  assert.deepEqual([lesen.geprueft, lesen.ungeprueft, lesen.unbekannt], [kern.geprueft, kern.ungeprueft, kern.unbekannt]);
  assert.equal(lesen.ungeprueft, 1);
});
