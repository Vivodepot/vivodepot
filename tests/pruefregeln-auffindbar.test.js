'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die veröffentlichten Prüfregeln sind aus den Leitfäden auffindbar (U2-ADR-496 Klausel (a), 18.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Veröffentlicht waren die Prüfregeln seit dem 11.10.2026, aber kein Leitfaden führte hin. Gehalten wird: der englische
   und der deutsche Integratoren-Leitfaden und der Wegweiser DOCS.md verlinken beide Fassungen der Prüfregeln, die lesbare
   (docs/pruefregeln/pruefregeln.md) und die maschinenlesbare (docs/pruefregeln/pruefregeln.json), und jeder dieser
   Links löst vom Ort der Datei aus auf. Dazu nennt jede der drei Stellen den Aufruf des Werkzeugs, und das Werkzeug gibt es.
   DOCS.md wird erzeugt, der Link steht darum in dessen Rahmentext; gelesen wird hier das Erzeugnis, weil DOCS.md die
   Fassung ist, die Leserinnen und Leser sehen.

   ROT-BEWEIS: ein Text ohne den Link, mit einem Link ins Leere oder ohne den Aufruf fällt auf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const ZIELE = ['docs/pruefregeln/pruefregeln.md', 'docs/pruefregeln/pruefregeln.json'];
const AUFRUF = 'node tools/vorlage-pruefen.js --dokument ';
const STELLEN = ['docs/INTEGRATION.md', 'docs/integrieren.md', 'DOCS.md'];

/* Relative Markdown-Links einer Datei, aufgelöst vom Ort der Datei aus, als Repo-Pfad (posix). */
function links(rel, text) {
  const ordner = path.posix.dirname(rel);
  return [...text.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)]
    .map((m) => m[1]).filter((ziel) => !/^[a-z]+:/i.test(ziel))
    .map((ziel) => path.posix.normalize(path.posix.join(ordner, ziel)));
}

/* Was an einer Stelle fehlt. */
function maengel(rel, text) {
  const da = links(rel, text);
  const raus = [];
  for (const ziel of ZIELE) if (!da.includes(ziel)) raus.push(rel + ': kein Link auf ' + ziel);
  for (const ziel of da.filter((z) => ZIELE.includes(z) || z.startsWith('docs/pruefregeln/'))) {
    if (!fs.existsSync(path.join(WURZEL, ziel))) raus.push(rel + ': Link ins Leere ' + ziel);
  }
  if (!text.includes(AUFRUF)) raus.push(rel + ': kein Aufruf ' + AUFRUF.trim());
  return raus;
}

test('[Prüfregeln·Auffindbar] INTEGRATION.md, integrieren.md und DOCS.md verlinken Regeldatei und lesbare Fassung, und die Links lösen auf', () => {
  for (const ziel of ZIELE) assert.ok(fs.existsSync(path.join(WURZEL, ziel)), 'Vorbedingung: ' + ziel + ' existiert');
  const werkzeug = AUFRUF.split(' ')[1];
  assert.ok(fs.existsSync(path.join(WURZEL, werkzeug)), 'Vorbedingung: ' + werkzeug + ' existiert');
  assert.match(fs.readFileSync(path.join(WURZEL, werkzeug), 'utf8'), /--dokument <datei\.json>/, 'der Aufruf steht so im Werkzeug');
  const funde = [];
  for (const rel of STELLEN) funde.push(...maengel(rel, fs.readFileSync(path.join(WURZEL, rel), 'utf8')));
  assert.deepEqual(funde, []);
});

test('[Prüfregeln·Auffindbar·Rot-Beweis] ein fehlender oder ins Leere zeigender Link fällt auf', () => {
  const gut = '[a](pruefregeln/pruefregeln.md) [b](pruefregeln/pruefregeln.json) `' + AUFRUF + '<datei.json>`';
  assert.deepEqual(maengel('docs/integrieren.md', gut), [], 'Gegenprobe: der vollständige Text ist ohne Mangel');
  assert.deepEqual(maengel('docs/integrieren.md', gut.replace('[b](pruefregeln/pruefregeln.json) ', '')),
    ['docs/integrieren.md: kein Link auf docs/pruefregeln/pruefregeln.json']);
  assert.deepEqual(maengel('docs/integrieren.md', gut + ' [c](pruefregeln/gibt-es-nicht.md)'),
    ['docs/integrieren.md: Link ins Leere docs/pruefregeln/gibt-es-nicht.md']);
  /* Derselbe Link, von der Wurzel aus geschrieben, zeigt aus docs/ heraus ins Leere: der Ort zählt. */
  assert.deepEqual(maengel('docs/integrieren.md', gut.replace('(pruefregeln/pruefregeln.md)', '(docs/pruefregeln/pruefregeln.md)')),
    ['docs/integrieren.md: kein Link auf docs/pruefregeln/pruefregeln.md']);
  assert.deepEqual(maengel('DOCS.md', gut.replace(/\]\(pruefregeln\//g, '](docs/pruefregeln/').replace(AUFRUF, 'node tools/x.js ')),
    ['DOCS.md: kein Aufruf node tools/vorlage-pruefen.js --dokument']);
});
