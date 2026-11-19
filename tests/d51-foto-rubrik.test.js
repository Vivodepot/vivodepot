'use strict';
/* D51 (Desktop-Dummy, Liste des Bereichs „Person“): das Foto steht als eigene Zeile „Foto“ in der Liste, gleich nach der ersten.
   Ihr Detail zeigt das Foto-Feld; das Deckblatt oben bleibt als Anzeige. Ein Bereich ohne Deckblatt bekommt keine Foto-Zeile.
   ROT-BEWEIS: der letzte Test liest eine Liste ohne Foto-Zeile und eine mit der Foto-Zeile an dritter Stelle; beide werden rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const entitaeten = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function zeilen(html) {
  return [...html.matchAll(/<button[^>]*class="bereich-liste-zeile"[^>]*data-rubrik="([^"]*)"[^>]*>\s*<span class="bereich-liste-titel">([^<]*)<\/span>/g)]
    .map((m) => ({ rubrik: entitaeten(m[1]), titel: entitaeten(m[2]) }));
}

/* Rein: Funde zur Foto-Zeile eines Bereichs mit Deckblatt. */
function fotoFunde(html, fotoTitel, fotoFeld) {
  const z = zeilen(html), aus = [];
  const i = z.findIndex((x) => x.titel === fotoTitel);
  if (i < 0) return ['keine Zeile „' + fotoTitel + '“ in der Liste'];
  if (i !== 1) aus.push('die Zeile „' + fotoTitel + '“ steht an Stelle ' + (i + 1) + ' statt 2');
  const karte = new RegExp('<details class="feldgruppen-karte" data-karte="' + z[i].rubrik.replace(/[|]/g, '\\|') + '"[\\s\\S]*?</details>').exec(entitaeten(html));
  if (!karte || !karte[0].includes('data-feld="' + fotoFeld + '"')) aus.push('das Detail der Zeile „' + fotoTitel + '“ zeigt das Foto-Feld nicht');
  if (!html.includes('class="deckblatt"')) aus.push('das Deckblatt oben fehlt');
  return aus;
}

async function rendern() {
  const { V, document } = ladeKern({ produkt: 'privat-de' });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  return { V, html: (id) => { V.renderSektor(id); return String(document.getElementById('content').innerHTML); } };
}

test('[D51] privat-de: Bereiche mit Deckblatt zeigen „Foto“ als zweite Zeile, ihr Detail trägt das Foto-Feld; andere Bereiche keine Foto-Zeile', async () => {
  const { V, html } = await rendern();
  const titel = V.STRINGS.deckblattFotoHinzufuegen;
  const mitDeckblatt = V.bereicheAlle().filter((b) => b.deckblatt);
  assert.ok(mitDeckblatt.length >= 1, 'Vorbedingung: ein Bereich mit Deckblatt');
  for (const b of mitDeckblatt) assert.deepEqual(fotoFunde(html(b.id), titel, b.deckblatt.fotoFeld), [], b.id);
  for (const b of V.bereicheAlle().filter((x) => !x.deckblatt)) {
    assert.ok(!zeilen(html(b.id)).some((z) => z.rubrik === b.id + '|' + titel), b.id + ': Foto-Zeile ohne Deckblatt');
  }
});

test('[D51·Rot-Beweis] eine Liste ohne Foto-Zeile oder mit der Foto-Zeile an dritter Stelle wird rot', () => {
  const zeile = (r, t) => '<button type="button" class="bereich-liste-zeile" data-rubrik="' + r + '"><span class="bereich-liste-titel">' + t + '</span></button>';
  const karte = '<details class="feldgruppen-karte" data-karte="x|Foto"><input data-feld="foto"></details>';
  const ohne = zeile('x|A', 'A') + zeile('x|B', 'B') + '<div class="deckblatt"></div>';
  assert.deepEqual(fotoFunde(ohne, 'Foto', 'foto'), ['keine Zeile „Foto“ in der Liste']);
  const dritte = zeile('x|A', 'A') + zeile('x|B', 'B') + zeile('x|Foto', 'Foto') + '<div class="deckblatt"></div>' + karte;
  assert.deepEqual(fotoFunde(dritte, 'Foto', 'foto'), ['die Zeile „Foto“ steht an Stelle 3 statt 2']);
  const richtig = zeile('x|A', 'A') + zeile('x|Foto', 'Foto') + '<div class="deckblatt"></div>' + karte;
  assert.deepEqual(fotoFunde(richtig, 'Foto', 'foto'), []);
});
