'use strict';
/* umschau-knopftext-eindeutig.test.js — die Feld-Schaltfläche der Umschau nennt ihr Feld im zugänglichen Namen (Befund
   UMSCHAU-KNOPFTEXT-NICHT-EINDEUTIG, 08.10.2026; WCAG 2.4.6, 2.5.3). Vorher trugen alle denselben Text „nicht hinterlegt Eintragen“,
   der Feldname stand nur im aria-label; wer per Sprache steuert, sagt, was er sieht, und traf fünf gleiche Knöpfe.
   Seit der Abnahme v998 (Mängel M01–M03 der Gestaltungsleitung) steht sichtbar nur „Eintragen“ — „Wer übernimmt die Hauptpflege?
   eintragen“ war kein Satz —, die Beschriftung steht als Vorlesetext davor. Geprüft wird darum am gerenderten Knopf JEDES Felds
   jedes Bereichs, DE und EN: kein aria-label, der zugängliche Name enthält die Beschriftung und das sichtbare Wort (2.5.3).
   Die Schaltfläche steht nur in der leeren Vorschau (Rückfall eines Produkts ohne Beispielwerte); das erfundene Beispiel ist
   schreibgeschützt (tests/e2e/umschau-eintragen-fuehrt-zum-einrichten.spec.js, „Umschau·Schreibgeschützt“). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ent = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const text = (h) => ent(h.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const ohneVorlesen = (h) => h.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, ' ');

/* Rein: die Funde eines gerenderten Knopfs (innerHTML + öffnendes Tag) zu seiner Beschriftung. */
function knopfFunde(tag, innen, label) {
  const aus = [];
  if (/aria-label=/.test(tag)) aus.push('aria-label an der Schaltfläche');
  const name = text(innen.replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')).toLowerCase();
  const sichtbar = text(ohneVorlesen(innen)).toLowerCase();
  if (!name.includes(String(label).replace(/\s+/g, ' ').trim().toLowerCase())) aus.push('Name nennt die Beschriftung nicht');
  if (sichtbar && !name.includes(sichtbar)) aus.push('sichtbares Wort fehlt im Namen');
  return aus;
}

function alleKnoepfe(produkt) {
  const { V } = ladeKern({ produkt });
  V.vorschauDepotErzeugen();
  const aus = [];
  for (const s of V.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
    const html = V.feldZeileHTML(f, undefined, s.id, false);
    const m = /(<button type="button" class="feld-umschau-eintragen[^"]*"[^>]*>)([\s\S]*?)<\/button>/.exec(html);
    if (m) aus.push({ wo: s.id + '.' + f.id, tag: m[1], innen: m[2], label: f.label });
  }
  return aus;
}

for (const produkt of ['privat-de', 'privat-en']) {
  test('[Umschau·Knopftext] ' + produkt + ': jeder Feld-Knopf nennt im zugänglichen Namen seine Beschriftung und das sichtbare Wort, ohne aria-label', () => {
    const k = alleKnoepfe(produkt);
    assert.ok(k.length > 40, 'Voraussetzung: die Umschau rendert Feld-Knöpfe (' + k.length + ')');
    const funde = k.flatMap((x) => knopfFunde(x.tag, x.innen, x.label).map((f) => x.wo + ': ' + f));
    assert.deepEqual(funde, []);
  });
}

test('[Umschau·Knopftext·Rot-Beweis] ein Knopf ohne Beschriftung im Namen, mit aria-label oder mit einem Wort außerhalb des Namens fällt auf', () => {
  const tag = '<button type="button" class="feld-umschau-eintragen">';
  assert.deepEqual(knopfFunde(tag, '<span class="sr-only">Vorname </span><span class="feld-umschau-eintragen-hinweis">Eintragen</span>', 'Vorname'), []);
  assert.ok(knopfFunde(tag, '<span class="feld-umschau-eintragen-hinweis">Eintragen</span>', 'Vorname').includes('Name nennt die Beschriftung nicht'));
  assert.ok(knopfFunde('<button type="button" class="feld-umschau-eintragen" aria-label="Vorname">', 'Eintragen', 'Vorname').includes('aria-label an der Schaltfläche'));
  assert.ok(knopfFunde(tag, '<span class="sr-only">Vorname </span><span aria-hidden="true">Eintragen</span>', 'Vorname').includes('sichtbares Wort fehlt im Namen'));
});
