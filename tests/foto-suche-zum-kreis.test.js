'use strict';
/* Suche zum Foto am Kreis (Befund FOTO-ABSCHNITT-DOPPELT, 20.11.2026).
   Seit das Deckblatt-Foto in keiner Karte mehr steht, gibt es keinen Abschnitt, in dem es läge. Die Suche kennt das Feld weiter über
   seinen Namen; ihr Treffer öffnet „Identität & Person“ und springt zum Kreis oben (Element deckblatt-foto) statt zu einem Abschnitt.
   Im Browser gezeigt am 20.11.2026 (Suche „Profilfoto“, Treffer, Kreis im Blick).
   ROT-BEWEIS: der letzte Test kippt die Sprungstelle in einer Kopie des Kerns; die Probe fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function sprungFunde(quelle) {
  const aus = [];
  if (!/const _fotoKreis = s\.deckblatt && s\.deckblatt\.fotoFeld === f\.id \? 'deckblatt-foto' : '';/.test(quelle)) aus.push('das Foto-Feld bekommt kein Sprungziel am Kreis');
  if (!/ziel: \(\) => _sucheOeffneBereich\(s\.id, sek && sek\.id, _fotoKreis\)/.test(quelle)) aus.push('der Feld-Treffer gibt das Sprungziel nicht weiter');
  if (!/const el = document\.getElementById\(elementId \|\| \('sek-' \+ sektionId\)\);/.test(quelle)) aus.push('_sucheOeffneBereich springt nicht zum Element');
  return aus;
}

for (const produkt of ['privat-de', 'privat-en']) {
  test('[Foto·Suche] ' + produkt + ': genau ein Suchziel für das Foto-Feld, im Bereich Identität', async () => {
    const { V } = ladeKern({ produkt });
    await V.depotAnlegen('pw');
    const fotoFeld = V.SEKTOR_BY_ID.identity.deckblatt.fotoFeld;
    const treffer = V._sucheKatalogAufbauen().filter((e) => e.quelle === 'feld' && e.feldId === fotoFeld);
    assert.equal(treffer.length, 1, 'genau ein Suchziel für das Foto-Feld');
    assert.equal(treffer[0].bereichId, 'identity');
  });
}

test('[Foto·Suche] der Treffer springt zum Kreis', () => {
  assert.deepEqual(sprungFunde(KERN), []);
});

test('[Foto·Suche·Rot-Beweis] ohne Sprungziel am Kreis fällt die Probe', () => {
  const gekippt = KERN.replace("? 'deckblatt-foto' : '';", "? '' : '';");
  assert.notEqual(gekippt, KERN, 'Vorbedingung: die Stelle ließ sich kippen');
  assert.deepEqual(sprungFunde(gekippt), ['das Foto-Feld bekommt kein Sprungziel am Kreis']);
});
