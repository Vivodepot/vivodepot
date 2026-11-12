'use strict';
/* BEZUG-NAME-ALS-TITEL (04.11.2026). Drei Pro-Felder „Name" (wer von diesem Depot weiß, Administration intern/extern, wem eine
   Vollmacht mitgeteilt wurde) zeigten in bereiche/bezuege.json auf dct:title. Das ist der Titel einer Ressource, nicht der Name
   eines Menschen oder einer Organisation; die übrigen Namensfelder zeigen auf foaf:name. Die Zeilen stehen im öffentlichen
   Feldregister. Diese Probe gilt für die ganze Klasse: Ein Namensfeld (Label „Name" im Feldkatalog oder Kennung, deren letztes
   Glied auf „name" endet) zeigt nie auf dct:title.
   ROT-BEWEIS: [Bezug·Name·Rot-Beweis] fährt dieselbe Regel gegen erfundene Zeilen; mit BEZUEGE_DATEI auf die Fassung davor
   (git show <davor>:bereiche/bezuege.json) findet die Klassenprobe die drei Zeilen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const DCT_TITLE = 'http://purl.org/dc/terms/title';
const lesen = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function namensfelder(katalog) {
  const labels = new Map((katalog.felder || katalog.zeilen || katalog).map((f) => [f.kennung, f.label]));
  return (kennung) => labels.get(kennung) === 'Name' || /name$/i.test(kennung.split(/[./]/).pop());
}
function titelFuerNamen(zeilen, istName) {
  return zeilen.filter((z) => z.ziel === DCT_TITLE && istName(z.kennung)).map((z) => z.kennung);
}

test('[Bezug·Name] kein Namensfeld zeigt auf dct:title', () => {
  const bezuege = lesen(process.env.BEZUEGE_DATEI || path.join(WURZEL, 'bereiche', 'bezuege.json'));
  const katalog = lesen(path.join(WURZEL, 'bereiche', 'feldkatalog.json'));
  assert.deepEqual(titelFuerNamen(bezuege.zeilen, namensfelder(katalog)), [],
    'Ein Name ist kein Ressourcentitel: Ziel http://xmlns.com/foaf/0.1/name (Grad naeherung, wenn Menschen und Organisationen gemischt sind).');
});

test('[Bezug·Name·Rot-Beweis] die Regel findet ein Namensfeld auf dct:title, über das Label und über die Kennung', () => {
  const katalog = [{ kennung: 'x.tpl_liste/tpl_wer', label: 'Name' }, { kennung: 'x.tpl_liste/tpl_titel', label: 'Titel' }];
  const zeilen = [
    { kennung: 'x.tpl_liste/tpl_wer', ziel: DCT_TITLE },
    { kennung: 'x.tpl_liste/tpl_name', ziel: DCT_TITLE },
    { kennung: 'x.tpl_liste/tpl_titel', ziel: DCT_TITLE },
    { kennung: 'x.familyName', ziel: 'http://xmlns.com/foaf/0.1/familyName' },
  ];
  assert.deepEqual(titelFuerNamen(zeilen, namensfelder(katalog)), ['x.tpl_liste/tpl_wer', 'x.tpl_liste/tpl_name']);
});

test('[Bezug·Name] die Klassenprobe sieht Namensfelder im echten Register (sonst prüfte sie leer)', () => {
  const bezuege = lesen(path.join(WURZEL, 'bereiche', 'bezuege.json'));
  const istName = namensfelder(lesen(path.join(WURZEL, 'bereiche', 'feldkatalog.json')));
  assert.ok(bezuege.zeilen.filter((z) => istName(z.kennung)).length >= 9, 'mindestens die neun tpl_name-Zeilen');
});
