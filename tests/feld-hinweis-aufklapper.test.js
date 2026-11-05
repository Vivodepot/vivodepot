'use strict';
/* Hinweis mit Aufklapper (Gestaltungsleitung zu U2-ADR-518, 02.11.2026).
   Ein Feld mit `hinweisAufklapper: true` zeigt von seinem Hinweis nur den ersten Satz; der Rest steht hinter dem Aufklapper
   „Mehr zur Rechtslage“ (EN „More on the legal position“, dieselbe Übersetzung von „Rechtslage“ wie strings:lebenslageRechtslage).
   Der Wortlaut bleibt EIN Text unter `.hint`; geteilt wird erst beim Zeichnen (feldHinweisTeilen, feldHinweisHTML).
   Geprüft:
     1. die Teilung: Satzende nur vor einem Großbuchstaben, „Abs. 3“ und „z. B. etwas“ trennen nicht, ohne Satzende keine Teilung;
     2. der Helfer: mit Aufklapper erster Satz im verknüpften Element, Rest im <details class="feld-hint feld-hint-mehr">, ohne Aufklapper wie bisher;
     3. jedes Feld und Unterfeld mit der Eigenschaft, in allen vier Produkten: es teilt sich, beide Teile zusammen ergeben den Hinweis
        zeichengleich, und die Zeile zeichnet den Aufklapper mit der Beschriftung der Sprache.
   Rot-Beweis: der Prüfer `aufklapperVerstoesse` findet die Zeichnung ohne Aufklapper (der volle Hinweis im Element, kein <details>). */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const BESCHRIFTUNG = { de: 'Mehr zur Rechtslage', en: 'More on the legal position' };
const PRODUKTE = [['privat-de', 'de'], ['privat-en', 'en'], ['pro-de', 'de'], ['pro-en', 'en']];

const kerne = new Map();
function kern(produkt) {
  if (!kerne.has(produkt)) { const K = ladeKern({ produkt }); kerne.set(produkt, K.V || K); }
  return kerne.get(produkt);
}

/* Alle Felder und Unterfelder mit der Eigenschaft, als [Kennung, Feld, Trägerfeld oder null, Bereich]. */
function mitAufklapper(V) {
  const raus = [];
  for (const b of V.bereicheAlle()) for (const s of b.sektionen || []) for (const f of s.felder || []) {
    if (f.hinweisAufklapper === true) raus.push([b.id + '.' + f.id, f, null, b.id]);
    for (const u of f.unterFelder || []) if (u.hinweisAufklapper === true) raus.push([b.id + '.' + f.id + '/' + u.id, u, f, b.id]);
  }
  return raus;
}

/* Der Prüfer: im gezeichneten HTML steht der erste Satz im Hinweis-Element, der Rest im Aufklapper mit der Beschriftung. */
function aufklapperVerstoesse(html, hint, beschriftung, escapeHTML) {
  const v = [];
  const m = /<div class="feld-hint" id="[^"]+">([^<]*)<\/div><details class="feld-hint feld-hint-mehr"><summary>([^<]*)<\/summary><p>([^<]*)<\/p><\/details>/.exec(html);
  if (!m) return ['kein Aufklapper hinter dem Hinweis'];
  if (m[2] !== escapeHTML(beschriftung)) v.push('Beschriftung: ' + m[2]);
  if (!/[.!?]$/.test(m[1])) v.push('der sichtbare Teil endet nicht mit einem Satzende: ' + m[1]);
  if (!(escapeHTML(hint).startsWith(m[1]) && escapeHTML(hint).endsWith(m[3]) && m[3].length > 0)) v.push('die Teile ergeben den Hinweis nicht');
  if (escapeHTML(hint).slice(m[1].length, escapeHTML(hint).length - m[3].length).trim() !== '') v.push('zwischen den Teilen fehlt Text');
  return v;
}

test('[Hinweis·Aufklapper·Teilung] Satzende vor Großbuchstaben, nicht in „Abs. 3“ oder „z. B. etwas“, ohne Satzende keine Teilung', () => {
  const V = kern('privat-de');
  assert.deepEqual(V.feldHinweisTeilen('Erster Satz. Zweiter Satz.'), { sichtbar: 'Erster Satz.', trenner: ' ', mehr: 'Zweiter Satz.' });
  assert.equal(V.feldHinweisTeilen('nach § 630g Abs. 3 BGB. Dafür mehr.').sichtbar, 'nach § 630g Abs. 3 BGB.');
  assert.equal(V.feldHinweisTeilen('Das gilt z. B. für Kliniken. Ärzte auch.').sichtbar, 'Das gilt z. B. für Kliniken.');
  assert.equal(V.feldHinweisTeilen('Das gilt z. B. Kliniken. Ärzte auch.').sichtbar, 'Das gilt z. B. Kliniken.');
  assert.equal(V.feldHinweisTeilen('A. Muster sagt das. Mehr.').sichtbar, 'A. Muster sagt das.');
  assert.equal(V.feldHinweisTeilen('(section 630g (3) of the Code, BGB). For this.').sichtbar, '(section 630g (3) of the Code, BGB).');
  assert.equal(V.feldHinweisTeilen('Ein einziger Satz.'), null);
  assert.equal(V.feldHinweisTeilen(''), null);
});

test('[Hinweis·Aufklapper·Helfer] mit Aufklapper: erster Satz verknüpft, Rest im Aufklapper; ohne: wie bisher', () => {
  const V = kern('privat-de');
  const mit = V.feldHinweisHTML('Erster Satz. Zweiter Satz.', { aufklapper: true });
  assert.deepEqual(aufklapperVerstoesse(mit.html, 'Erster Satz. Zweiter Satz.', BESCHRIFTUNG.de, V.escapeHTML), []);
  assert.ok(mit.html.startsWith('<div class="feld-hint" id="' + mit.id + '">Erster Satz.</div>'), mit.html);
  const ohne = V.feldHinweisHTML('Erster Satz. Zweiter Satz.');
  assert.equal(ohne.html, '<div class="feld-hint" id="' + ohne.id + '">Erster Satz. Zweiter Satz.</div>');
  // Ein Hinweis ohne Satzende bleibt auch mit der Eigenschaft ganz stehen.
  const eins = V.feldHinweisHTML('Ein einziger Satz.', { aufklapper: true });
  assert.equal(eins.html, '<div class="feld-hint" id="' + eins.id + '">Ein einziger Satz.</div>');
});

for (const [produkt, sprache] of PRODUKTE) {
  test('[Hinweis·Aufklapper·' + produkt + '] jedes Feld mit der Eigenschaft teilt sich zeichengleich und zeichnet den Aufklapper', () => {
    const V = kern(produkt);
    assert.equal(V.STRINGS.feldHinweisMehr, BESCHRIFTUNG[sprache]);
    const felder = mitAufklapper(V);
    // Pro führt die Vorsorge-Liste nicht; dort zählt die Beschriftung und jedes Feld, das die Eigenschaft doch trägt.
    if (produkt.startsWith('privat-')) assert.ok(felder.length >= 2, 'Vorbedingung: Felder mit der Eigenschaft gefunden (' + felder.length + ')');
    for (const [kennung, f, traeger, bereich] of felder) {
      assert.ok(typeof f.hint === 'string' && f.hint.trim(), kennung + ': ohne Hinweis');
      const t = V.feldHinweisTeilen(f.hint);
      assert.ok(t, kennung + ': der Hinweis teilt sich nicht');
      assert.equal(t.sichtbar + t.trenner + t.mehr, f.hint, kennung + ': die Teile ergeben den Hinweis nicht zeichengleich');
      const eintrag = {};
      const html = traeger ? V.listenEintragInputsHTML(traeger, eintrag) : V.feldZeileHTML(f, undefined, bereich, true, true);
      const zeile = traeger
        ? new RegExp('<div class="feld-zeile feld-zeile-sub" data-sub-zeile="' + f.id + '"[^>]*>([\\s\\S]*?)(?=<div class="feld-zeile feld-zeile-sub"|$)').exec(html)[1]
        : html;
      assert.deepEqual(aufklapperVerstoesse(zeile, f.hint, BESCHRIFTUNG[sprache], V.escapeHTML), [], kennung);
    }
  });
}

test('[Hinweis·Aufklapper·Rot-Beweis] die Zeichnung ohne Aufklapper fällt auf', () => {
  const V = kern('privat-de');
  const hint = 'Erster Satz. Zweiter Satz.';
  assert.ok(aufklapperVerstoesse(V.feldHinweisHTML(hint).html, hint, BESCHRIFTUNG.de, V.escapeHTML).length > 0);
  // Falsche Beschriftung und ein verlorener Rest fallen ebenso auf.
  const html = V.feldHinweisHTML(hint, { aufklapper: true }).html;
  assert.ok(aufklapperVerstoesse(html, hint, 'Mehr', V.escapeHTML).length > 0);
  assert.ok(aufklapperVerstoesse(html.replace('Zweiter Satz.', 'Zweiter'), hint, BESCHRIFTUNG.de, V.escapeHTML).length > 0);
});
