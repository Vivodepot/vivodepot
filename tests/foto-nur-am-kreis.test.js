'use strict';
/* Foto nur am Kreis (Befund FOTO-ABSCHNITT-DOPPELT, 20.11.2026; Entscheidung gegen Desktop-Dummy Z. 458).
   In der ausgelieferten Fassung stand das Foto zweimal: oben im Kreis neben dem Namen und als eigener Abschnitt „Foto“ in der
   Abschnittsliste von „Identität & Person“. Entschieden: das Foto steht nur oben am Kreis, der Kreis öffnet das Hochladen; danach
   folgen die persönlichen Angaben. Das Feld bleibt über den Kreis und über die Suche erreichbar.
   Diese Probe hält fest, je Bereich mit Deckblatt und je Sprache: keine Listenzeile „Foto“ und keine mit dem Feldnamen, das Foto-Feld
   in keiner Karte, der Kreis da; der Kreis verdrahtet den Upload und setzt das Foto-Feld. Die Suche: tests/foto-suche-zum-kreis.test.js.
   ROT-BEWEIS: der letzte Test legt eine Liste mit der Zeile „Foto“ und eine Karte mit dem Foto-Feld vor; beide werden rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const entitaeten = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/* Rein: Funde zum Foto in der Sicht eines Bereichs mit Deckblatt. */
function fotoFunde(html, titel, feldId, feldLabel) {
  const aus = [];
  const zeilen = [...html.matchAll(/<button[^>]*class="bereich-liste-zeile"[^>]*>\s*<span class="bereich-liste-titel">([^<]*)<\/span>/g)].map((m) => entitaeten(m[1]));
  for (const t of zeilen) if (t === titel || t === feldLabel) aus.push('Listenzeile „' + t + '“ in der Abschnittsliste');
  const karten = html.split('<details class="feldgruppen-karte"').slice(1).filter((b) => b.split('</details>')[0].includes('data-feld="' + feldId + '"'));
  if (karten.length) aus.push('das Foto-Feld steht in ' + karten.length + ' Karte(n)');
  if (!html.includes('id="deckblatt-foto"')) aus.push('der Kreis oben fehlt');
  return aus;
}

async function sicht(produkt) {
  const { V, document } = ladeKern({ produkt });
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  return { V, html: (id) => { V.renderSektor(id); return String(document.getElementById('content').innerHTML); } };
}

for (const produkt of ['privat-de', 'privat-en']) {
  test('[Foto·Kreis] ' + produkt + ': keine Listenzeile Foto, Foto-Feld in keiner Karte, Kreis oben', async () => {
    const { V, html } = await sicht(produkt);
    const mitDeckblatt = V.bereicheAlle().filter((b) => b.deckblatt);
    assert.ok(mitDeckblatt.length >= 1, 'Vorbedingung: ein Bereich mit Deckblatt');
    for (const b of mitDeckblatt) {
      const def = b.sektionen.flatMap((x) => x.felder || []).find((f) => f.id === b.deckblatt.fotoFeld);
      assert.ok(def && def.label, b.id + ': Vorbedingung, das Foto-Feld ist deklariert');
      assert.deepEqual(fotoFunde(html(b.id), V.STRINGS.deckblattFotoHinzufuegen, b.deckblatt.fotoFeld, def.label), [], b.id);
    }
  });
}

test('[Foto·Kreis] der Kreis öffnet das Hochladen und setzt das Foto-Feld', () => {
  const a = KERN.indexOf("const _dbBtn = document.getElementById('deckblatt-foto');");
  assert.ok(a > 0, 'Vorbedingung: Verdrahtung des Kreises');
  const block = KERN.slice(a, KERN.indexOf('});', a) + 3);
  assert.match(block, /_dbBtn\.onclick = \(\) => flowMappeUpload\(sektorId,/);
  assert.match(block, /sektorFeldSetzen\(sektorId, s\.deckblatt\.fotoFeld, \{ ref: neuId \}\)/);
});

test('[Foto·Kreis·Rot-Beweis] eine Listenzeile „Foto“ oder eine Karte mit dem Foto-Feld wird rot', () => {
  const zeile = (t) => '<button type="button" class="bereich-liste-zeile" data-rubrik="x|' + t + '"><span class="bereich-liste-titel">' + t + '</span></button>';
  const kreis = '<button id="deckblatt-foto"></button>';
  assert.deepEqual(fotoFunde(kreis + zeile('A') + zeile('B'), 'Foto', 'foto', 'Profilfoto'), []);
  assert.deepEqual(fotoFunde(kreis + zeile('A') + zeile('Foto'), 'Foto', 'foto', 'Profilfoto'), ['Listenzeile „Foto“ in der Abschnittsliste']);
  assert.deepEqual(fotoFunde(kreis + '<details class="feldgruppen-karte" data-karte="x|F"><span data-feld="foto"></span></details>', 'Foto', 'foto', 'Profilfoto'),
    ['das Foto-Feld steht in 1 Karte(n)']);
  assert.deepEqual(fotoFunde(zeile('A'), 'Foto', 'foto', 'Profilfoto'), ['der Kreis oben fehlt']);
});
