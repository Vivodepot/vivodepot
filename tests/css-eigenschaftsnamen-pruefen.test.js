'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Wächter gegen ungültige CSS-Eigenschaftsnamen (K4 Zug 3, 10.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Anlass: `grid-template- columns` (Leerzeichen im Property-Namen) stand
   jahrelang unbemerkt im Kern — ungültige, wirkungslose CSS-Regel, kein
   Linter deckte das <style>-Element ab. Der Wächter
   (`tools/css-eigenschaftsnamen-pruefen.js`) sucht Deklarationsanfänge mit
   einem mehrwortigen Property-Namen — das ist in gültigem CSS nie der Fall.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { styleOhneKommentare, ungueltigeEigenschaftsnamen } = require('../tools/css-eigenschaftsnamen-pruefen.js');

test('[K4 Zug 3] echter Kern: kein mehrwortiger CSS-Eigenschaftsname', () => {
  const { html } = ladeKern();
  assert.deepEqual(ungueltigeEigenschaftsnamen(html), []);
});

test('[K4 Zug 3] Positivkontrolle: das reale Muster (Leerzeichen nach Bindestrich) wird gefunden', () => {
  const quelle = '<style>.a { grid-template- columns: 1fr 1fr; color: red; }</style>';
  const funde = ungueltigeEigenschaftsnamen(quelle);
  assert.equal(funde.length, 1);
  assert.equal(funde[0].name, 'grid-template- columns');
});

test('[K4 Zug 3] Positivkontrolle: funktioniert auch innerhalb von @media (keine echte Klammertiefe nötig)', () => {
  const quelle = '<style>@media (max-width: 720px) { .a { background- color: blue; } }</style>';
  const funde = ungueltigeEigenschaftsnamen(quelle);
  assert.equal(funde.length, 1);
  assert.equal(funde[0].name, 'background- color');
});

test('[K4 Zug 3] Negativkontrolle: derselbe Selektor korrekt geschrieben bleibt grün', () => {
  const quelle = '<style>.a { grid-template-columns: 1fr 1fr; color: red; }</style>';
  assert.deepEqual(ungueltigeEigenschaftsnamen(quelle), []);
});

test('[K4 Zug 3] Negativkontrolle: Custom Properties (--irgendwas) bleiben grün', () => {
  const quelle = '<style>:root { --fokus-breite: 2px; --flaeche-warnung: var(--gold-soft); }</style>';
  assert.deepEqual(ungueltigeEigenschaftsnamen(quelle), []);
});

test('[K4 Zug 3] Negativkontrolle: Kommentare zählen nicht (Abgrenzung)', () => {
  // Deutsche Prosa in Kommentaren enthält reichlich "Wort Wort:" — darf nicht zählen.
  const quelle = '<style>/* Eine Regel: kaputte Eigenschaft hier */ .a { color: red; }</style>';
  assert.deepEqual(ungueltigeEigenschaftsnamen(quelle), []);
});

test('[K4 Zug 3] Negativkontrolle: nur der <style>-Block wird gescannt, nicht <script>', () => {
  const quelle = '<style>.a { color: red; }</style><script>let h = "text: text mit doppelpunkt";</script>';
  assert.deepEqual(ungueltigeEigenschaftsnamen(quelle), []);
});

test('[K4 Zug 3] styleOhneKommentare erreicht echtes CSS (Plausibilität, kein Leerlauf)', () => {
  const { html } = ladeKern();
  const css = styleOhneKommentare(html);
  assert.ok(css.length > 5000, 'genug CSS extrahiert, kein leerer Lauf');
  assert.ok(css.includes('--fokus:'), 'trifft echte Token-Definitionen');
});
