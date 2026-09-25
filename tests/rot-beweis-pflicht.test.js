'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A348 Zug 4 — eine neue Probe bringt ihren Rot-Beweis mit
   ────────────────────────────────────────────────────────────────────────────
   Proben für `tools/rot-beweis-pflicht-pruefen.js`. Der Auftrag verlangte die
   Lehre aus A336/A338/A345 als WÄCHTER, nicht als Text — und ausdrücklich die
   Meldung statt einer Attrappe, falls sie nicht durchsetzbar ist.

   SIE IST DURCHSETZBAR, und zwar als Ratsche: 295 der 542 heutigen
   Probendateien tragen keine Marke; sie stehen namentlich in der Grundlinie.
   Alles ausserhalb dieser Liste muss eine mitbringen.

   DIE GRENZE, und sie steht auch im Werkzeugkopf: geprüft wird die ANWESENHEIT
   eines Rot-Beweises, nicht seine Güte. Der gefangene Fall ist die VERGESSENE
   Rotprobe, nicht die vorgetäuschte. Die Güte misst
   `tools/klausel-proben-schaerfe-stufe2.js`, indem es den Gegenstand bricht.

   Jede Prüfung unten läuft über ein FIXTURE-Verzeichnis, nie über den echten
   `tests/`-Ordner — eine Probe, die ihre eigene Nachbarschaft mutiert, misst
   den Bestand und nicht sich selbst.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { pruefe, testDateien, MARKEN } = require('../tools/rot-beweis-pflicht-pruefen.js');

const REPO = path.join(__dirname, '..');
const ECHT = path.join(REPO, 'tests');
const GRUNDLINIE_PFAD = path.join(REPO, 'tools', 'rot-beweis-grundlinie.json');
const grundlinie = () => JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));

/* Ein Fixture-Verzeichnis mit benannten Dateien. Kein Byte davon stammt aus
   dem Bestand — sonst prüfte die Probe den Bestand mit. */
function fixture(dateien, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rot-beweis-waechterprobe-'));
  for (const [rel, inhalt] of Object.entries(dateien)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, inhalt);
  }
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

const MIT = "test('[Rot-Beleg] eine gepflanzte Verletzung wird gefunden', () => {});\n";
const OHNE = "test('etwas wird geprüft', () => {});\n";

test('[A348·Zug4] der echte Bestand ist grün — jede Probe ausserhalb der Grundlinie trägt eine Marke', () => {
  const r = pruefe(ECHT, grundlinie());
  assert.deepEqual(r.neuOhneRot, [],
    'Diese Probendatei(en) sind neu und bringen keinen Rot-Beweis mit. Eine Probe ohne Rot-Beweis '
    + 'ist eine Zusage, keine Messung — sie war in A336, A338 und A345 dreimal grün, während ihr '
    + 'Gegenstand kaputt war:\n' + r.neuOhneRot.join('\n'));
});

test('[A348·Zug4·Rot-Beweis] eine NEUE Datei ohne Marke wird gefunden', () => {
  const r = fixture({ 'neu.test.js': OHNE }, (d) => pruefe(d, { ohne_rot_beweis: [] }));
  assert.deepEqual(r.neuOhneRot, ['neu.test.js'],
    'die Prüfung findet die neue Datei ohne Rot-Beweis nicht — dann ist ihr grüner Lauf über den '
    + 'echten Bestand kein Beleg, sondern eine Behauptung');
});

test('[A348·Zug4·Gegenprobe] eine neue Datei MIT Marke wird nicht gemeldet', () => {
  const r = fixture({ 'neu.test.js': MIT }, (d) => pruefe(d, { ohne_rot_beweis: [] }));
  assert.deepEqual(r.neuOhneRot, [],
    'eine konforme Datei wird gemeldet — dann meldet die Prüfung Form statt Verstoss');
});

test('[A348·Zug4·Gegenprobe] eine ALTE Datei ohne Marke bleibt still, solange sie in der Grundlinie steht', () => {
  const r = fixture({ 'alt.test.js': OHNE }, (d) => pruefe(d, { ohne_rot_beweis: ['alt.test.js'] }));
  assert.deepEqual(r.neuOhneRot, [], 'die Grundlinie muss den Bestand tragen, sonst gatet niemand mit ihr');
});

test('[A348·Zug4·Rot-Beweis·Ratsche] eine nachgerüstete Datei muss aus der Grundlinie heraus', () => {
  /* Ohne diese Richtung wäre die Grundlinie eine Einbahnstrasse in die falsche
     Richtung: sie stünde ewig, auch wenn die Datei längst einen Rot-Beweis trägt,
     und der nächste Umbau könnte ihn stillschweigend wieder entfernen. */
  const r = fixture({ 'alt.test.js': MIT }, (d) => pruefe(d, { ohne_rot_beweis: ['alt.test.js'] }));
  assert.deepEqual(r.grundlinieZuGross, ['alt.test.js'],
    'eine nachgerüstete Datei bleibt unbemerkt in der Ausnahmemenge — die Ratsche greift nicht');
});

test('[A348·Zug4·Rot-Beweis] ein Grundlinien-Eintrag ins Leere wird gefunden', () => {
  const r = fixture({ 'da.test.js': MIT }, (d) => pruefe(d, { ohne_rot_beweis: ['weg.test.js'] }));
  assert.deepEqual(r.verschwunden, ['weg.test.js'],
    'ein toter Eintrag suggeriert Deckung für einen Fall, den es nicht gibt');
});

test('[A348·Zug4] unterordner zählen mit — der Fehler aus der Suite-Differenz wiederholt sich hier nicht', () => {
  /* A155 (11.08.2026): ein flacher Glob liess `tests/mit-modul/` und
     `tests/e2e-cross/` still aus. Wer hier flach läse, hielte 30 Dateien für
     nicht vorhanden statt für ungeprüft. */
  const r = fixture({ 'oben.test.js': MIT, 'tief/unten.test.js': OHNE },
    (d) => pruefe(d, { ohne_rot_beweis: [] }));
  assert.deepEqual(r.neuOhneRot, ['tief/unten.test.js'],
    'eine Datei im Unterordner fällt durch — die Suche ist nicht rekursiv');
});

test('[A348·Zug4] die Grundlinie trägt Stand UND Grund (kein stummer Zahlenwechsel)', () => {
  const g = grundlinie();
  assert.match(g.stand, /^\d{4}-\d{2}-\d{2}$/, 'Stand im ISO-Format');
  assert.ok(g.grund && g.grund.length > 60, 'ein nicht-trivialer Grund steht dabei');
  assert.ok(Array.isArray(g.ohne_rot_beweis) && g.ohne_rot_beweis.length > 0);
  assert.equal(g.anzahl_testdateien, testDateien(ECHT).length > 0 ? g.anzahl_testdateien : -1);
});

test('[Rot-Beleg] testDateien() übersteht eine Datei, die zwischen readdirSync und statSync verschwindet', () => {
  /* tests/pruefstand-bindung.js legt neben ihrer Zieldatei kurzzeitig eine
     `_pruefstand-tmp-<pid>-*.cjs` an und räumt sie sofort weg — lief im echten
     Suite-Lauf (Gate 15, 19.09.2026) genau in diesem Fenster ein zweiter Test
     an, der den echten Bestand scannt: ENOENT, obwohl kein Fehler im Bestand
     vorlag. Fixture statt echtem Timing-Fenster — deterministisch reproduziert. */
  fixture({ 'a.test.js': MIT, 'fluechtig.cjs': '' }, (d) => {
    const echtStat = fs.statSync;
    let geworfen = false;
    const spy = (p, ...rest) => {
      if (String(p).endsWith('fluechtig.cjs') && !geworfen) {
        geworfen = true;
        const e = new Error('ENOENT: no such file or directory, stat \'' + p + '\'');
        e.code = 'ENOENT';
        throw e;
      }
      return echtStat(p, ...rest);
    };
    fs.statSync = spy;
    try {
      assert.deepEqual(testDateien(d), ['a.test.js'], 'die verschwundene Datei wird übersprungen, kein Absturz');
    } finally { fs.statSync = echtStat; }
  });
});

test('[A348·Zug4] keine Marke ist tot — jede kommt im echten Bestand vor', () => {
  /* Dieselbe Lehre wie bei einer Positivliste, die nichts mehr trifft (A347): ein
     Eintrag, der nichts trifft, suggeriert Deckung für einen Fall, den es nicht gibt. */
  const inhalt = testDateien(ECHT).map((r) => fs.readFileSync(path.join(ECHT, r), 'utf8')).join('\n');
  const tot = MARKEN.filter((m) => !new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(inhalt));
  assert.deepEqual(tot, [], 'diese Marken treffen heute nichts:\n' + tot.join(', '));
});
