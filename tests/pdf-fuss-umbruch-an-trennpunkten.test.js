'use strict';
/* PDF-Fuß (02.11.2026): der Fuß bricht nur an den Trennpunkten um, jede Angabe bleibt in einer Zeile beisammen. Vorher brach
   splitTextToSize über den ganzen Fuß und trennte etwa „Entwurf | — kein Ersatz …“ und „Erweiterungen: | keine“.
   Gemessen am echten Fuß eines Depots, mit einer Breite je Zeichen wie bei 8 pt, in mehreren Spaltenbreiten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const TRENNER = '   ·   ';
function messDoc() {
  const w = (t) => String(t).length * 3.6;
  return {
    getTextWidth: w,
    splitTextToSize: (t, b) => {
      const woerter = String(t).split(' '); const z = []; let a = '';
      for (const x of woerter) { const p = a ? a + ' ' + x : x; if (w(p) <= b || !a) a = p; else { z.push(a); a = x; } }
      if (a) z.push(a); return z;
    },
  };
}

async function fussTeile() {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  const akteur = V.akteurSelbstErklaeren('Elisabeth Wredenhagen-Sonnenschein');
  V.getData().inhaberPersonId = akteur.personId;
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  V.sektorFeldSetzen('identity', 'familyName', 'Wredenhagen-Sonnenschein');
  const meta = V.vollDepotPdfMeta();
  meta.anlass = 'Verwaltung & Behörden';
  return { V, teile: V.pdfFussText(meta, true), ganz: V.pdfFussText(meta) };
}

test('[PDF-Fuß] als Teile ergibt der Fuß genau den bisherigen Fußtext', async () => {
  const { teile, ganz } = await fussTeile();
  assert.ok(teile.length >= 5, 'Positivkontrolle: mehrere Angaben, ' + teile.length);
  assert.equal(teile.join(TRENNER), ganz);
});

for (const breite of [200, 320, 415, 520]) {
  test('[PDF-Fuß] Spalte ' + breite + ' pt: Umbruch nur an Trennpunkten, keine Angabe zerrissen', async () => {
    const { V, teile } = await fussTeile();
    const doc = messDoc();
    const zeilen = V.pdfFussZeilen(doc, teile, breite);
    assert.ok(zeilen.length >= 1);
    for (const z of zeilen) {
      assert.ok(!z.startsWith(TRENNER.trim()) && !z.trimEnd().endsWith('·'), 'Trennpunkt am Zeilenrand: „' + z + '“');
      assert.ok(doc.getTextWidth(z) <= breite || !z.includes(TRENNER), 'zu breit trotz Trennpunkt: „' + z + '“');
    }
    const gelesen = zeilen.flatMap((z) => z.split(TRENNER));
    for (const t of teile) {
      if (doc.getTextWidth(t) > breite) continue;   // nur eine Angabe, die allein breiter ist als die Spalte, darf in sich brechen
      assert.ok(gelesen.includes(t), 'Angabe zerrissen: „' + t + '“');
    }
  });
}

test('[PDF-Fuß·Rot-Beweis] der frühere Umbruch über den ganzen Fuß zerreißt bei 415 pt eine Angabe', async () => {
  const { teile, ganz } = await fussTeile();
  const gelesen = messDoc().splitTextToSize(ganz, 415).flatMap((z) => z.split(TRENNER));
  assert.ok(teile.some((t) => !gelesen.includes(t)), 'der alte Weg muss hier rot sein, sonst misst diese Probe nichts');
});

// Nachtrag U2-ADR-259 vom 02.11.2026 (keine doppelte Angabe, kein „Fassung“) und Nachtrag U2-ADR-258 vom 25.11.2026:
// ohne Erweiterung nennt der Fuß Erweiterungen gar nicht.
function erweiterungenVerstoesse(strings, teile, ganz) {
  const v = [];
  const n = teile.filter((t) => /Erweiterung/.test(t)).length;
  if (n !== 0) v.push('ohne Erweiterung nennt der Fuß Erweiterungen ' + n + '-mal: ' + ganz);
  if (/Fassung/.test(ganz)) v.push('„Fassung“ steht im Fuß: ' + ganz);
  return v;
}
test('[PDF-Fuß·Erweiterungen] ohne Erweiterung steht „Erweiterungen“ nicht im Fuß', async () => {
  const { V, teile, ganz } = await fussTeile();
  assert.deepEqual(erweiterungenVerstoesse(V.STRINGS, teile, ganz), []);
});

test('[PDF-Fuß·Erweiterungen·Rot-Beweis] „Erweiterungen: keine“ oder „Fassung“ im Fuß wird gemeldet', async () => {
  const { V, teile } = await fussTeile();
  const mitKeine = [...teile, 'Erweiterungen: keine'];
  assert.equal(erweiterungenVerstoesse(V.STRINGS, mitKeine, mitKeine.join(TRENNER)).length, 1);
  const mitAlt = [...teile, 'Fassung: Grundfassung'];
  assert.equal(erweiterungenVerstoesse(V.STRINGS, mitAlt, mitAlt.join(TRENNER)).length, 1);
});

module.exports = {
  PROBEN: [
    { fuer: '[PDF-Fuß·Erweiterungen] ohne Erweiterung steht „Erweiterungen“ nicht im Fuß', diskriminante: erweiterungenVerstoesse },
  ],
};
