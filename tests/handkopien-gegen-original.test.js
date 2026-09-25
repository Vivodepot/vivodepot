'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Handkopien gegen ihr Original — Probe (U2-ADR-262, Auftrag, 04.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tools/handkopien-gegen-original-pruefen.js` hält jede in der REGISTRY
   geführte Handkopie einer Kern-Konstante gegen ihr Original — Anlass war
   `FORMAT_MODUL_SCHLUESSEL` in `vivodepot-template-generator.html`, die
   `rechtsraum` (U2-ADR-255) und `schreiber` (U2-ADR-257) nicht kannte, ohne
   dass irgendein Wächter das gemerkt hätte.

   Geprüft hier: (1) der echte Bestand — jede geführte Handkopie stimmt mit
   ihrem Original überein, `schreiber` als benannte, nicht stille Ausnahme;
   (2) Rotmachbarkeit für jede Vergleichsart (liste/wert/objekt/liste-von-
   objekten/werte-aus-objekt) gegen eine Fixture, nie gegen den echten
   Bestand mutiert; (3) eine nicht von git geführte Datei wird nicht
   mitgezählt, sondern benannt übersprungen.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  pruefeAlle, pruefeEintrag, REGISTRY, REPO,
} = require('../tools/handkopien-gegen-original-pruefen.js');

function fixtur(dateien) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handkopien-'));
  for (const [name, inhalt] of Object.entries(dateien)) {
    fs.writeFileSync(path.join(dir, name), inhalt);
  }
  return dir;
}
function aufraeumen(dir) { fs.rmSync(dir, { recursive: true, force: true }); }

/* ── 1 · Der echte Bestand ──────────────────────────────────────────────── */

test('[U2-ADR-262] jede geführte Handkopie stimmt mit ihrem Original überein', () => {
  const befunde = pruefeAlle(REPO);
  assert.ok(befunde.length >= 20, 'Positivkontrolle: die Registry wird wirklich durchlaufen (' + befunde.length + ' Einträge)');
  const rot = befunde.filter((b) => !b.ok);
  assert.deepEqual(rot.map((b) => b.label + ': ' + b.meldung), [],
    'jede Zeile hier benennt die abweichende Kopie und WAS fehlt/abweicht');
});

test('[U2-ADR-262 · Gegenprobe] `schreiber` ist eine benannte, keine stille Ausnahme', () => {
  const eintrag = REGISTRY.find((e) => e.label === 'FORMAT_MODUL_SCHLUESSEL');
  assert.ok(eintrag, 'die Registry führt FORMAT_MODUL_SCHLUESSEL');
  assert.deepEqual(eintrag.ausnahmen, ['schreiber']);
  const [befund] = pruefeEintrag(REPO, new Set(require('node:child_process')
    .execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean)), eintrag);
  assert.equal(befund.ok, true);
  assert.match(befund.meldung, /benannte Ausnahme.*schreiber/);
});

/* ── 2 · Rotmachbarkeit je Vergleichsart — Fixture, nie der echte Bestand ── */

test('[Negativprobe] art: liste — ein fehlender Schlüssel in der Kopie wird benannt gefunden', () => {
  const dir = fixtur({
    'original.js': "const K = Object.freeze(['a', 'b', 'c']);",
    'kopie.js': "const K = Object.freeze(['a', 'b']);",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'K', art: 'liste',
      original: { datei: 'original.js', name: 'K' },
      kopien: [{ datei: 'kopie.js', name: 'K' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /`c` fehlt in der Kopie in kopie\.js/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: liste — ein zusätzlicher Schlüssel NUR in der Kopie wird benannt gefunden', () => {
  const dir = fixtur({
    'original.js': "const K = Object.freeze(['a', 'b']);",
    'kopie.js': "const K = Object.freeze(['a', 'b', 'erfunden']);",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'K', art: 'liste',
      original: { datei: 'original.js', name: 'K' },
      kopien: [{ datei: 'kopie.js', name: 'K' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /`erfunden` steht NUR in der Kopie in kopie\.js/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: liste — eine benannte Ausnahme feuert nicht rot', () => {
  const dir = fixtur({
    'original.js': "const K = Object.freeze(['a', 'b', 'ausgenommen']);",
    'kopie.js': "const K = Object.freeze(['a', 'b']);",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'K', art: 'liste',
      original: { datei: 'original.js', name: 'K' },
      kopien: [{ datei: 'kopie.js', name: 'K' }],
      ausnahmen: ['ausgenommen'] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, true);
    assert.match(befund.meldung, /benannte Ausnahme/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: wert — ein abweichender Primitivwert wird benannt gefunden', () => {
  const dir = fixtur({
    'original.js': "const W = 'ES256';",
    'kopie.js': "const W = 'ES512';",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'W', art: 'wert',
      original: { datei: 'original.js', name: 'W' },
      kopien: [{ datei: 'kopie.js', name: 'W' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /weicht ab/);
    assert.match(befund.meldung, /ES256/);
    assert.match(befund.meldung, /ES512/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: objekt — ein abweichender Schlüsselwert wird benannt gefunden', () => {
  const dir = fixtur({
    'original.js': "const O = Object.freeze({ a: 1, b: 2 });",
    'kopie.js': "const O = Object.freeze({ a: 1, b: 9 });",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'O', art: 'objekt',
      original: { datei: 'original.js', name: 'O' },
      kopien: [{ datei: 'kopie.js', name: 'O' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /`b`: Original 2 ≠ Kopie 9/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: objekt — ein fehlender Schlüssel in der Kopie wird benannt gefunden', () => {
  const dir = fixtur({
    'original.js': "const O = Object.freeze({ a: 1, b: 2 });",
    'kopie.js': "const O = Object.freeze({ a: 1 });",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'O', art: 'objekt',
      original: { datei: 'original.js', name: 'O' },
      kopien: [{ datei: 'kopie.js', name: 'O' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /Schlüssel `b` fehlt in der Kopie in kopie\.js/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: objekt — RegExp-Werte werden über ihre Textform verglichen', () => {
  const dir = fixtur({
    'original.js': "const O = Object.freeze({ w: /^[A-Z]{3}$/ });",
    'kopie.js': "const O = Object.freeze({ w: /^[a-z]{3}$/ });",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'O', art: 'objekt',
      original: { datei: 'original.js', name: 'O' },
      kopien: [{ datei: 'kopie.js', name: 'O' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /`w`/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: liste-von-objekten — fehlende Einträge werden benannt gefunden', () => {
  const dir = fixtur({
    'original.js': "const F = Object.freeze([{ sektor: 'x', feld: 'a' }, { sektor: 'x', feld: 'b' }]);",
    'kopie.js': "const F = Object.freeze([{ sektor: 'x', feld: 'a' }]);",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'F', art: 'liste-von-objekten',
      original: { datei: 'original.js', name: 'F' },
      kopien: [{ datei: 'kopie.js', name: 'F' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /1 Eintrag\/Einträge fehlen in der Kopie in kopie\.js/);
    assert.match(befund.meldung, /"feld":"b"/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] art: werte-aus-objekt — ein fehlender Wert wird benannt gefunden', () => {
  const dir = fixtur({
    'original.js': "const E = Object.freeze({ A: 'a', B: 'b' });",
    'kopie.js': "const K = Object.freeze(['a']);",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'E→K', art: 'werte-aus-objekt',
      original: { datei: 'original.js', name: 'E' },
      kopien: [{ datei: 'kopie.js', name: 'K' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /`b` fehlt in der Kopie in kopie\.js/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] Gegenprobe: identische Kopie meldet gleich, ok', () => {
  const dir = fixtur({
    'original.js': "const K = Object.freeze(['a', 'b', 'c']);",
    'kopie.js': "const K = Object.freeze(['a', 'b', 'c']);",
  });
  try {
    const tracked = new Set(['original.js', 'kopie.js']);
    const eintrag = { label: 'K', art: 'liste',
      original: { datei: 'original.js', name: 'K' },
      kopien: [{ datei: 'kopie.js', name: 'K' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, true);
    assert.equal(befund.meldung, 'gleich');
  } finally { aufraeumen(dir); }
});

/* ── 3 · Nur git-geführte Dateien zählen ────────────────────────────────── */

test('[Negativprobe] eine nicht von git geführte Datei wird benannt übersprungen, nicht stumm ignoriert', () => {
  const dir = fixtur({
    'original.js': "const K = Object.freeze(['a']);",
    'kopie.js': "const K = Object.freeze(['a']);",
  });
  try {
    const tracked = new Set(['original.js']); // kopie.js absichtlich NICHT in tracked
    const eintrag = { label: 'K', art: 'liste',
      original: { datei: 'original.js', name: 'K' },
      kopien: [{ datei: 'kopie.js', name: 'K' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /nicht von git verfolgt/);
  } finally { aufraeumen(dir); }
});

test('[Negativprobe] ein fehlendes Original wird benannt gefunden, nicht als leere Kopie gedeutet', () => {
  const dir = fixtur({ 'kopie.js': "const K = Object.freeze(['a']);" });
  try {
    const tracked = new Set(['kopie.js']);
    const eintrag = { label: 'K', art: 'liste',
      original: { datei: 'original.js', name: 'K' },
      kopien: [{ datei: 'kopie.js', name: 'K' }] };
    const [befund] = pruefeEintrag(dir, tracked, eintrag);
    assert.equal(befund.ok, false);
    assert.match(befund.meldung, /Original `K` in original\.js/);
  } finally { aufraeumen(dir); }
});
