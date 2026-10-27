'use strict';
/* tools/abschnittsverweise-pruefen.js: ein Verweis auf einen Abschnitt einer Markdown-Datei — als Anker oder beim Namen —
   trifft eine Überschrift, die es gibt. Anlass: ein Verweis in SECURITY.md auf einen entfallenen Abschnitt von DEVELOPING.md
   (Fassung v933); beim ersten Lauf fand das Werkzeug außerdem einen Verweis auf einen umbenannten Abschnitt des README. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const A = require('../tools/abschnittsverweise-pruefen.js');

const lauf = (dateien) => A.abschnittsverweisePruefen(Object.keys(dateien), (rel) => (rel in dateien ? dateien[rel] : null));

test('[Abschnittsverweise] das Repo hat keinen Verweis auf einen fehlenden Abschnitt', () => {
  assert.deepEqual(A.repoLauf(path.join(__dirname, '..')), []);
});

test('[Abschnittsverweise] Anker wie auf GitHub: Satzzeichen weg, Umlaute bleiben, Dubletten gezählt', () => {
  assert.equal(A.slug('8 · Fingerabdruck je Fassung'), '8--fingerabdruck-je-fassung');
  assert.equal(A.slug('2.2 Prüfsummen je Fassung'), '22-prüfsummen-je-fassung');
  assert.equal(A.slug('Dateien in `docs/`'), 'dateien-in-docs');
  const a = A.anker('# A\n## Teil\n```\n## im Code\n```\n## Teil\n<a id="frei"></a>\n');
  assert.deepEqual([...a].sort(), ['a', 'frei', 'teil', 'teil-1']);
});

test('[Abschnittsverweise] gültige Verweise gehen durch', () => {
  assert.deepEqual(lauf({
    'SECURITY.md': '# Sicherheit\n## 8 · Fingerabdruck je Fassung\nSiehe [Abschnitt 8](#8--fingerabdruck-je-fassung).\n',
    'DEVELOPING.md': '# Developing\n## The scaffold and the product\n',
    'docs/a.md': '[x](../SECURITY.md#8--fingerabdruck-je-fassung), [y](../DEVELOPING.md), „The scaffold and the product“, [z](https://e.org/a.md#q), [w](bild.png#x)\n',
  }), []);
});

test('[Abschnittsverweise·Rot-Beweis] umbenannter Abschnitt beim Namen, toter Anker in fremder und eigener Datei', () => {
  const funde = lauf({
    'README.md': '# Vivodepot\n## Einstieg\n',
    'SECURITY.md': '# Sicherheit\n## 5 · Cyber Resilience Act\nSiehe [5](#5--cyber-resilience-act-bezug).\n',
    'docs/x/README.md': 'unter einer Web-Adresse ([README.md](../../README.md), „Wie man anfängt“).\n[s](../../SECURITY.md#5--cyber-resilience-act-bezug)\n',
  });
  assert.deepEqual(funde, [
    'SECURITY.md:3  [Anker fehlt]  #5--cyber-resilience-act-bezug',
    'docs/x/README.md:1  [Abschnitt fehlt]  ../../README.md „Wie man anfängt“',
    'docs/x/README.md:2  [Anker fehlt]  ../../SECURITY.md#5--cyber-resilience-act-bezug',
  ]);
});

test('[Abschnittsverweise] fehlt die Zieldatei, ist das Sache der Achse „tote Verweise", nicht dieser', () => {
  assert.deepEqual(lauf({ 'a.md': '[x](FEHLT.md#abschnitt), [y](FEHLT.md), „Titel“\n' }), []);
});
