'use strict';
/* erscheinungsbild-waechter.test.js — das Gerüst bleibt leer von Gestaltung (v894, 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Drei Zusicherungen, je mit Rot-Beweis:
   1. Kein Profilname im Gerüst (Selektor oder Skript-Literal) — tools/erscheinungsbild-waechter-pruefen.js.
   2. Gestaltung außerhalb der Region nur aus der Positivliste, die nur sinkt und ab leerBis (Grundlinie) leer ist — dasselbe Werkzeug.
   3. Das Kopf-Skript <script id="erscheinungsbild"> trägt außerhalb seiner Region nur NAMEN: jede Zeichenkette ist ein
      Token-Name, ein Kurzschlüssel oder einer der drei Ebenen-Selektoren — kein #hex, kein px/rem, kein rgb(, keine
      Zahl als Text. Bedingung von Gegenlesung zum Wort über die W0-Anhebung (struktur +3757, 02.10.2026): der Zuwachs ist
      Vokabular, kein versteckter Wert. Die Zahlen im Regelblock (Kontrast 4,5, Mindestgrößen) sind keine
      Zeichenketten, sondern Schutzregeln — sie gehören zur Mechanik, die im Gerüst bleibt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/erscheinungsbild-waechter-pruefen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const GRUNDLINIE = JSON.parse(fs.readFileSync(W.GRUNDLINIE, 'utf8'));

test('[Erscheinungsbild·Wächter] der Kern ist grün: kein Profilname, Gestaltung außerhalb genau die Positivliste', () => {
  const e = W.pruefen({ html: KERN, grundlinie: GRUNDLINIE });
  assert.deepEqual(e.fehler, []);
  assert.deepEqual(e.verschwunden, [], 'gesunken — Grundlinie nachziehen (--grundlinie-schreiben)');
});

test('[Erscheinungsbild·Wächter·Rot-Beweis] ein Profilname im Selektor und im Skript wird gefunden, im Kommentar nicht', () => {
  const namen = W.profilNamen();
  const sel = KERN.replace('<style id="design-system">', '<style id="design-system">\n  .profil-leinen .topbar { color: red; }');
  assert.ok(W.profilNamenFunde(sel, namen).some((f) => f.wo === 'selektor' && f.name === 'leinen'));
  const skript = KERN.replace('<script id="erscheinungsbild">', '<script id="erscheinungsbild">\nif (window.x === \'klar\') {}');
  assert.ok(W.profilNamenFunde(skript, namen).some((f) => f.wo === 'skript' && f.name === 'klar'));
  const kommentar = KERN.replace('<script id="erscheinungsbild">', '<script id="erscheinungsbild">\n/* früher: if (p === \'warm\') */');
  assert.deepEqual(W.profilNamenFunde(kommentar, namen), []);
});

test('[Erscheinungsbild·Ratsche·Rot-Beweis] eine neue Modus-Regel ist rot; eine verschwundene senkt nur', () => {
  const mehr = KERN.replace('<style id="design-system">', '<style id="design-system">\n  html.dark-mode .neu { color: var(--ink); }');
  assert.ok(W.pruefen({ html: mehr, grundlinie: GRUNDLINIE }).fehler.some((f) => /html\.dark-mode \.neu/.test(f)));
  const weniger = W.pruefen({ html: KERN, grundlinie: { ...GRUNDLINIE, stellen: [...GRUNDLINIE.stellen, 'modus: html.dark-mode .gab-es'] } });
  assert.deepEqual(weniger.fehler, []);
  assert.deepEqual(weniger.verschwunden, ['modus: html.dark-mode .gab-es']);
});

test('[Erscheinungsbild·Ratsche·Rot-Beweis] ab dem Stand leerBis ist jede verbliebene Stelle rot', () => {
  // Seit W4 ist die Liste leer (die Schriften sind im Modul) — die Stelle wird darum eingeschmuggelt, statt auf eine verbliebene zu bauen.
  // Die Schwelle kommt aus der Grundlinie (leerBis), nicht aus dem Test: am 04.10.2026 einmalig von v899 auf v919 verschoben.
  const leer = GRUNDLINIE.leerBis;
  const mitStelle = KERN.replace('<style id="design-system">\n', '<style id="design-system">\n  @font-face { font-family: "Probe"; font-weight: 400; src: url("data:font/woff2;base64,d09GMg=="); }\n');
  assert.notEqual(mitStelle, KERN, 'Vorbedingung: Anker für die eingeschmuggelte Stelle');
  const amStand = mitStelle.replace(/const SCHALEN_STAND = 'v\d+'/, `const SCHALEN_STAND = '${leer}'`);
  assert.equal(W.schalenStand(amStand), Number(leer.slice(1)));
  assert.ok(W.pruefen({ html: amStand, grundlinie: GRUNDLINIE }).fehler.some((f) => f.includes('≥ ' + leer)));
});

/* ── 3. Das Kopf-Skript trägt nur Namen ── */
function kopfSkriptOhneRegion(html) {
  const a = html.indexOf('<script id="erscheinungsbild">');
  const e = html.indexOf('</script>', a);
  const t = html.slice(a, e);
  const r0 = t.indexOf('/* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:BEGIN */');
  const r1 = t.indexOf('/* AB_WERK_ERSCHEINUNGSBILD_PRODUKT:END */');
  return (t.slice(0, r0) + t.slice(r1)).replace(/\/\*[\s\S]*?\*\//g, ' ');
}
/* Zeichenketten-Literale ' " ` — Regex-Literale werden vorher ausgeblendet (sie tragen Muster, keine Werte). */
function zeichenketten(code) {
  const ohneRegex = code.replace(/(^|[=(,:!&|?{};\s])\/(?![/*])(?:\\.|\[(?:\\.|[^\]])*\]|[^/\\\n])+\/[a-z]*/g, '$1 /re/ ');
  return [...ohneRegex.matchAll(/(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2]);
}
// Erlaubt: Token-Namen, Kurzschlüssel, die drei Ebenen-Selektoren und die CSS-Syntaxzeichen, aus denen erscheinungsbildCss
// den Stylesheet-Text zusammensetzt (`:`, `;`, `{`, `}`, `#` für _ebHex, `/` in Regex-Ersatz, die leere Kette).
// Seit Lesart B (v894) dazu, als Regeldaten: Selektoren geschützter Elemente (#id, .klasse, [attr], [attr=wert]), die erlaubten
// url(-Anfänge (data:image/…), die Symbolzeichen für content: (als \\uXXXX), das Schutzmuster (Alternativen mit |), Syntaxzeichen
// und der Ereignisname DOMContentLoaded. Keines davon ist ein Gestaltungswert; WERTFORM fängt Hex, Maße und Farben weiter.
const NAMENSGRAMMATIK = new RegExp('^(--[a-z0-9-]+|[a-z][a-zA-Z0-9-]*|:root|html\\.(high-contrast|dark-mode)|[:;{}#/@,. ]?|\\\\n'
  + '|[#.][a-z][a-z0-9-]*|\\[[a-z-]+(=[a-z]+)?\\]|data:image/(svg\\+xml|png)|(\\\\u[0-9a-f]{4})|[a-z0-9|\\\\.()^$:-]*\\|[a-z0-9|\\\\.()^$:-]*'
  + '|[a-z#.][a-z0-9.#:()\\[\\]=-]*'   // zusammengesetzte Selektoren der Mechanik (#app.an, details:not([open]))
  // Lockerung mit Wort der Gegenlesung (04.10.2026): der Kind-Kombinator, NUR hinter einer Klasse am Wurzelelement
  // (html.vorfuehrung>body>#vorfuehrung-schleife). Folge der Selektoren ohne Leerzeichen; entfällt womöglich, sobald
  // der Gerüst-Wächter CSS-Selektoren nicht mehr als Satz zählt.
  + '|html\\.[a-z-]+(>[a-z#.][a-z0-9.#:()\\[\\]=-]*)+'
  + '|\\*'   // der Universalselektor (alle Nachfahren einer geschützten Anzeige)
  + '|DOMContentLoaded)$');
const WERTFORM = /#[0-9a-fA-F]{3}|\d\s*(px|rem|em|%)|rgba?\(|hsla?\(|^\s*-?\d/;

function nichtNamen(html) {
  return zeichenketten(kopfSkriptOhneRegion(html)).filter((s) => !NAMENSGRAMMATIK.test(s) || WERTFORM.test(s));
}

test('[Erscheinungsbild·Kopf-Skript] außerhalb der Region nur Namen — kein Wert als Zeichenkette (Bedingung Gegenlesung zur W0-Anhebung)', () => {
  const alle = zeichenketten(kopfSkriptOhneRegion(KERN));
  assert.ok(alle.length > 200, 'Testvoraussetzung: die Token-Namen werden als Zeichenketten gesehen (' + alle.length + ')');
  assert.deepEqual(nichtNamen(KERN), []);
});

test('[Erscheinungsbild·Kopf-Skript·Rot-Beweis] ein eingeschmuggelter Wert wird gefunden', () => {
  for (const [name, schmuggel] of [['hex', '"#4F6539"'], ['px', '"12px"'], ['rgb', '"rgb(0,0,0)"'], ['Zahl als Text', '"4.5"'], ['Satz', '"ein Wert"']]) {
    const t = KERN.replace('"pflicht": []', '"pflicht": [' + schmuggel + ']');
    assert.notEqual(t, KERN, 'Testvoraussetzung: Anker für ' + name);
    assert.deepEqual(nichtNamen(t), [schmuggel.slice(1, -1)], name);
  }
});

test('[Erscheinungsbild·Kopf-Skript·Rot-Beweis] der Kind-Kombinator gilt nur hinter html.<klasse> — in einem gewöhnlichen Namen bleibt er rot', () => {
  const gut = '"html.vorfuehrung>body>#vorfuehrung-schleife"';
  assert.deepEqual(nichtNamen(KERN.replace('"pflicht": []', '"pflicht": [' + gut + ']')), [], 'Gegenprobe: der Selektor der Vorführungsebene ist ein Name');
  for (const schmuggel of ['"a>b"', '"--farbe>x"', '"#app>.x"', '":root>x"']) {
    const t = KERN.replace('"pflicht": []', '"pflicht": [' + schmuggel + ']');
    assert.notEqual(t, KERN, 'Testvoraussetzung: Anker');
    assert.deepEqual(nichtNamen(t), [schmuggel.slice(1, -1)], schmuggel);
  }
});

test('[Erscheinungsbild·Kopf-Skript·Rot-Beweis] ein Selektor mit Kind-Kombinator, der einen Wert trägt, wird gefunden', () => {
  for (const schmuggel of ['"html.vorfuehrung>body>#x{color:#fff}"', '"html.vorfuehrung>#x:#fff"', '"html.vorfuehrung>#x12px"']) {
    const t = KERN.replace('"pflicht": []', '"pflicht": [' + schmuggel + ']');
    assert.notEqual(t, KERN, 'Testvoraussetzung: Anker');
    assert.deepEqual(nichtNamen(t), [schmuggel.slice(1, -1)], schmuggel);
  }
});
