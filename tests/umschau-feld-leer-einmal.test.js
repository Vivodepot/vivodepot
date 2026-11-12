'use strict';
/* Umschau ohne Depot: ein leeres Feld sagt einmal, was zu tun ist, und ordnet sich seiner Beschriftung unter (Abnahme v998, Mängel
   M01–M04 der Gestaltungsleitung, Gruppenkarte „Name & Geburt“: die Größenverhältnisse stimmten nicht). Vorher stand in
   jedem leeren Feld „nicht hinterlegt“ und daneben, größer und fetter, „Vorname eintragen“; an Fragen wurde daraus „Wer übernimmt die
   Hauptpflege? eintragen“, an einer Einstellung „Familienname zuerst anzeigen eintragen“.
   Geprüft wird am gerenderten Leerzustand JEDES Felds aller Bereiche (privat-de, privat-en, pro-de): kein Leer-Zustand im Knopf, kein
   sichtbarer Text, der die Beschriftung wiederholt, keiner mit „? eintragen“/„? Add“; ein Ja/Nein-Feld als Kästchen, eine kleine
   Auswahl als Wahl; der Hinweis nicht größer und nicht fetter als die Beschriftung.
   Rot-Beweis: der frühere Knopfinhalt (Leer-Zustand + „<Beschriftung> eintragen“) fällt in derselben Prüfung durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
// Öffentlich gehen nur die zwei Privat-Produkte hinaus; dort springt der Pro-Fall sichtbar auf skip.
const baubar = (slug) => require('../tools/lib/vier-produkte.js').PRODUKTE.some((p) => p.slug === slug);
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const STIL = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
const ent = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const sichtbar = (h) => ent(h.replace(/<span class="sr-only">[\s\S]*?<\/span>/g, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const knopf = (html) => { const m = /<button type="button" class="feld-umschau-eintragen[^"]*"[^>]*>([\s\S]*?)<\/button>/.exec(html); return m ? m[1] : null; };

/* Rein: Funde eines leeren Knopfinhalts zu seiner Beschriftung. */
function leerFunde(innen, label, leerZustand) {
  const aus = [];
  const t = sichtbar(innen);
  if (leerZustand && t.includes(leerZustand)) aus.push('Leer-Zustand im Knopf');
  if (/\?\s*(eintragen|add)\b/i.test(t)) aus.push('„? eintragen“');
  // Die Möglichkeiten einer Wahl dürfen das Wort der Beschriftung tragen („Alkohol“ → „kein Alkohol“); wiederholen darf sie nur kein Hinweis.
  const ohneWahl = sichtbar(innen.replace(/<span class="feld-umschau-option[^"]*">[^<]*<\/span>/g, ' '));
  const l = String(label).replace(/\s+/g, ' ').trim();
  if (l && ohneWahl.toLowerCase().includes(l.toLowerCase())) aus.push('wiederholt die Beschriftung');
  return aus;
}

function umschau(produkt) {
  const { V } = ladeKern(produkt ? { produkt } : undefined);
  V.vorschauDepotErzeugen();
  assert.equal(V.imVorschau(), true, 'Vorbedingung: Umschau');
  return V;
}

for (const produkt of ['privat-de', 'privat-en', 'pro-de']) {
  const skip = baubar(produkt) ? false : 'öffentlich kein Pro-Produkt (' + produkt + ' wird nicht gebaut)';
  test('[Umschau·Leer] ' + produkt + ': im Leerzustand aller Bereiche sagt jedes Feld es einmal, ohne „? eintragen“ und ohne seine Beschriftung zu wiederholen', { skip }, () => {
    const V = umschau(produkt);
    let n = 0; const funde = [];
    for (const s of V.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) {
      const innen = knopf(V.feldZeileHTML(f, undefined, s.id, false));
      if (innen === null) continue;
      n++;
      for (const x of leerFunde(innen, f.label, V.STRINGS.leerZustand)) funde.push(s.id + '.' + f.id + ': ' + x);
    }
    assert.ok(n > 40, 'Voraussetzung: Feld-Knöpfe gerendert (' + n + ')');
    assert.deepEqual(funde, []);
  });
}

test('[Umschau·Leer·Rot-Beweis] der frühere Knopfinhalt fällt durch', () => {
  const V = umschau();
  const frueher = (label) => V.feldWertHTML({ id: 'x', typ: 'text', label }, '') + ' <span class="feld-umschau-eintragen-hinweis">' + label + ' eintragen</span>';
  const f = leerFunde(frueher('Wer übernimmt die Hauptpflege?'), 'Wer übernimmt die Hauptpflege?', V.STRINGS.leerZustand);
  assert.ok(f.includes('Leer-Zustand im Knopf'));
  assert.ok(f.includes('„? eintragen“'));
  assert.ok(f.includes('wiederholt die Beschriftung'));
});

test('[Umschau·Leer] ein gefülltes Feld zeigt seinen Wert, dazu „Eintragen“; der Name nennt das Feld', () => {
  const V = umschau();
  const innen = knopf(V.feldZeileHTML({ id: 'givenName', typ: 'text', label: 'Vorname' }, 'Erika', 'identity', false));
  assert.match(innen, /Erika/);
  assert.match(innen, /<span class="sr-only">Vorname <\/span><span class="feld-umschau-eintragen-hinweis">Eintragen<\/span>$/);
});

test('[Umschau·Kästchen] ein Ja/Nein-Feld steht als Kästchen, mit dem Feldnamen als Vorlesetext', () => {
  const V = umschau();
  const feld = { id: 'displayFamilyNameFirst', typ: 'checkbox', label: 'Familienname zuerst anzeigen' };
  const html = V.feldZeileHTML(feld, undefined, 'identity', false);
  assert.match(html, /class="feld-umschau-eintragen feld-umschau-eintragen--kaestchen"/);
  assert.equal(knopf(html), '<span class="sr-only">Familienname zuerst anzeigen </span><span class="feld-umschau-kaestchen" aria-hidden="true"></span>');
  assert.match(knopf(V.feldZeileHTML(feld, true, 'identity', false)), /feld-umschau-kaestchen feld-umschau-kaestchen--an/);
});

test('[Umschau·Wahl] eine Auswahl mit wenigen Möglichkeiten zeigt sie als Wahl („ja · nein“), eine lange bleibt „Eintragen“', () => {
  const V = umschau();
  const jaNein = { id: 'emergencyBackpackInPlace', typ: 'auswahl', label: 'Notfallrucksack vorhanden?', optionen: [{ wert: 'ja', label: 'ja' }, { wert: 'nein', label: 'nein' }] };
  assert.equal(knopf(V.feldZeileHTML(jaNein, undefined, 'emergencyPreparedness', false)),
    '<span class="sr-only">Notfallrucksack vorhanden? </span><span class="feld-umschau-wahl"><span class="feld-umschau-option">ja</span><span class="feld-umschau-option">nein</span></span>');
  assert.match(knopf(V.feldZeileHTML(jaNein, 'ja', 'emergencyPreparedness', false)), /<span class="feld-umschau-option feld-umschau-option--an">ja<\/span>/);
  const lang = Object.assign({}, jaNein, { optionen: ['a', 'b', 'c', 'd', 'e'].map((w) => ({ wert: w, label: w })) });
  assert.match(knopf(V.feldZeileHTML(lang, undefined, 'emergencyPreparedness', false)), /<span class="feld-umschau-eintragen-hinweis">Eintragen<\/span>$/);
});

test('[Umschau·Hinweis] der Hinweis ist nicht größer als die Feldbeschriftung und nicht fetter', () => {
  const regel = /\.feld-umschau-eintragen-hinweis \{([^}]*)\}/.exec(STIL)[1];
  assert.match(regel, /font-size: var\(--fs-role-label\)/, 'dieselbe Rolle wie die Beschriftung, nicht die Wertgröße des Knopfs');
  assert.match(regel, /font-weight: var\(--fw-regular\)/);
  assert.match(STIL, /\.feld-label \{ color: var\(--ink2\); font-size: var\(--fs-role-label\); \}/);
});
