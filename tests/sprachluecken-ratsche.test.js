'use strict';
/* Ratsche der Sprachlücken: was eine Person in einer anderen Sprache als Deutsch deutsch sieht, wird nicht mehr.

   Gemessen mit tools/sprachluecken-messen.js am Kern (Teil B: feste deutsche Anzeige `.<name>De` in die
   Oberfläche; Teil C: Text-Träger, die keine Kennung des Textsatzes erreicht; C2: Abschnittstitel der Dokument-Module ohne
   Kennung `dok:<id>#<i>.titel`). Die Zahlen stehen in
   tools/sprachluecken-grundlinie.json GENAU auf dem Bestand:
     · gezählt über der Grundlinie — ein neuer Text läuft am Textsatz vorbei: Kennung geben, nicht die Zahl heben;
     · gezählt unter der Grundlinie — eine Lücke ist geschlossen: die Grundlinie im selben Commit senken (kein Wort nötig).
   Teil A (Textsatz je Sprachmodul) hält der Erzeuger der Sprachmodule; er ist hier nicht gedeckelt.
   Teil C lädt den Kern; die Probe gehört in den Volllauf. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');
const { messen } = require('../tools/sprachluecken-messen.js');
const GRUNDLINIE = require('../tools/sprachluecken-grundlinie.json');

function abweichungen(ist, soll) {
  const aus = [];
  for (const k of ['teilBOberflaeche', 'teilC', 'dokTitelOhneKennung']) {
    if (ist[k] > soll[k]) aus.push(k + ': ' + ist[k] + ' gezählt, Grundlinie ' + soll[k] + ' — neuer Text ohne Kennung');
    else if (ist[k] < soll[k]) aus.push(k + ': ' + ist[k] + ' gezählt, Grundlinie ' + soll[k] + ' — Lücke geschlossen, Grundlinie senken');
  }
  return aus;
}

function zaehlen(e) {
  return { teilBOberflaeche: e.teilB.filter((s) => s.art === 'oberflaeche').length, teilC: e.teilC.ungedeckt, dokTitelOhneKennung: e.teilC.dokTitelOhneKennung.length };
}

test('[Sprachlücken·Ratsche] Teil B und Teil C stehen genau auf der Grundlinie', () => {
  const e = messen(path.join(__dirname, '..'), { mitKern: true });
  const ist = zaehlen(e);
  const aus = abweichungen(ist, GRUNDLINIE);
  if (aus.length) {
    aus.push('Fundstellen: node tools/sprachluecken-messen.js --wurzel . --mit-kern');
    for (const t of e.teilC.fundstellen) aus.push('  C ' + t.pfad);
    for (const t of e.teilC.dokTitelOhneKennung) aus.push('  C2 ' + t.kennung);
  }
  assert.deepEqual(aus, []);
});

test('[Sprachlücken·Ratsche·Rot-Beweis] ein Träger mehr meldet die Probe, einer weniger verlangt das Senken', () => {
  const soll = { teilBOberflaeche: 2, teilC: 26, dokTitelOhneKennung: 6 };
  assert.deepEqual(abweichungen({ teilBOberflaeche: 2, teilC: 26, dokTitelOhneKennung: 6 }, soll), []);
  assert.match(abweichungen({ teilBOberflaeche: 2, teilC: 27, dokTitelOhneKennung: 6 }, soll)[0], /neuer Text ohne Kennung/);
  assert.match(abweichungen({ teilBOberflaeche: 1, teilC: 26, dokTitelOhneKennung: 6 }, soll)[0], /Grundlinie senken/);
  assert.match(abweichungen({ teilBOberflaeche: 2, teilC: 26, dokTitelOhneKennung: 7 }, soll)[0], /^dokTitelOhneKennung/);
});
