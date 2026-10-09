'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Eine Suite-Zahl erscheint nur gemessen, mit Datum — sonst entfällt sie (06.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund FAKTENBASIS-SUITE-ZAHL-FORTGESCHRIEBEN: „Suite (Node-Tests, echter Lauf `node --test`, …): 12034“ stand vom
   27.09.2026 (c30128b6a) an unverändert in docs/faktenbasis.md und DOCS.md; `faktenbasis-erzeugen --ohne-suite` übernahm
   die Zeile wörtlich. Beide Dateien gehen öffentlich hinaus. REGEL (Wort TOP, weglassen statt einschränken): gemessen steht
   die Zahl mit Datum; nicht neu gemessen steht in der Faktenbasis „nicht neu gemessen (letzte Messung <Datum>, <Stand>)“
   OHNE Zahl, und DOCS.md lässt „Suite: … ·“ weg. KLASSE: keine getrackte Markdown-Datei außerhalb der Fixtures trägt
   „echter Lauf `node --test`“ ohne Datum, eine nackte „Suite: N“, eine Zahl in einer „nicht neu gemessen“-Zeile, oder
   nennt eine gezählte Zahl in derselben Zeile „ausgeführte“.
   ROT-BEWEIS: `--ohne-suite` auf der alten Zeile schreibt keine Zahl; die alten Zeilen fallen in der Klassenprobe.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const F = require('../tools/faktenbasis-erzeugen.js');

const REPO = path.join(__dirname, '..');
const ALT = '- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): 12034';

test('[Suite-Herkunft] gemessen mit Datum; fortgeschrieben ohne Zahl, mit letzter Messung', () => {
  const gemessen = F.suiteZeileGemessen(12100, '2026-10-06', 'abc12345 (Stand Kanon)');
  assert.equal(gemessen, '- Suite (Node-Tests, echter Lauf `node --test` am 2026-10-06, abc12345 Stand Kanon, TAP-Summenzeile): 12100');
  const fort = F.suiteZeileFortschreiben(gemessen, { herkunftSuchen: () => assert.fail('nicht gefragt') });
  assert.equal(fort, '- Suite (Node-Tests, `node --test`): nicht neu gemessen (letzte Messung 2026-10-06, abc12345 Stand Kanon)');
  assert.doesNotMatch(fort, /\d{4,}\)?$/, 'keine Zahl am Ende');
  assert.equal(F.suiteZeileFortschreiben(fort), fort, 'zweimal fortgeschrieben ändert nichts');
  assert.equal(F.suiteZeileFortschreiben(ALT, { herkunftSuchen: (n) => (n === '12034' ? { datum: '2026-09-27', hash: 'c30128b6a' } : null) }),
    '- Suite (Node-Tests, `node --test`): nicht neu gemessen (letzte Messung 2026-09-27, c30128b6a)');
  assert.equal(F.suiteZeileFortschreiben(ALT, { herkunftSuchen: () => null }),
    '- Suite (Node-Tests, `node --test`): nicht neu gemessen (letzte Messung unbekannt)');
  assert.equal(F.suiteZeileFortschreiben('- Suite (Node-Tests, `node --test`): nicht angegeben'),
    '- Suite (Node-Tests, `node --test`): nicht neu gemessen (letzte Messung unbekannt)');
  assert.equal(F.suiteZeileFortschreiben('- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): in --check nicht ermittelt'), null);
  for (const z of [fort]) assert.match(F.normalisiertFuerVergleich(z), /^- Suite: ZAHL$/, '--check vergleicht die Zeile normalisiert');
});

test('[Suite-Herkunft·Rot-Beweis] --ohne-suite auf der alten Zeile schreibt keine Zahl, sondern die letzte Messung', () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-faktenbasis-herkunft-'));
  try {
    const ziel = path.join(ordner, 'faktenbasis.md');
    fs.writeFileSync(ziel, '# Faktenbasis\n\n## Prüfebene\n\n' + ALT + '\n');
    execFileSync(process.execPath, [path.join(REPO, 'tools', 'faktenbasis-erzeugen.js'), '--ohne-suite', '--ausgabe', ziel],
      { cwd: REPO, env: ohneGitUmgebung(), stdio: 'pipe' });
    const zeile = fs.readFileSync(ziel, 'utf8').match(/^- Suite \(Node-Tests,.*$/m)[0];
    assert.match(zeile, F.SUITE_NICHT_GEMESSEN);
    assert.doesNotMatch(zeile, /12034|echter Lauf/);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

const OHNE_DATUM = /echter Lauf `node --test`(?! am \d{4}-\d{2}-\d{2})/;
const NACKT = /\bSuite: \d+(?!\d)(?! \(echter Lauf am \d{4}-\d{2}-\d{2}\))/;   // (?!\d): sonst weicht das Muster in die Zahl zurück
const ZAHL_OHNE_MESSUNG = (z) => /nicht neu gemessen/.test(z) && /\):\s*\d/.test(z);
const ART_WIDERSPRUCH = (z) => /\bausgeführte\b/.test(z) && /gezählt|nicht ausgeführt/.test(z);
function klassenFunde(rel, text) {
  return text.split('\n').map((z, i) => [i + 1, z])
    .filter(([, z]) => OHNE_DATUM.test(z) || NACKT.test(z) || ZAHL_OHNE_MESSUNG(z) || ART_WIDERSPRUCH(z))
    .map(([n, z]) => rel + ':' + n + ': ' + z.trim().slice(0, 120));
}

test('[Suite-Herkunft·Klasse] keine getrackte Markdown-Datei außerhalb der Fixtures trägt eine Suite-Zahl ohne Messung', () => {
  const md = execFileSync('git', ['ls-files', '*.md'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() })
    .split('\n').filter((f) => f && !f.startsWith('tests/fixtures/') && !f.startsWith('docs/adr/'));
  assert.ok(md.includes('docs/faktenbasis.md') && md.includes('DOCS.md'), 'Vorbedingung: die beiden Träger werden gelesen');
  const funde = [];
  for (const rel of md) {
    let text; try { text = fs.readFileSync(path.join(REPO, rel), 'utf8'); } catch (_) { continue; }
    funde.push(...klassenFunde(rel, text));
  }
  assert.deepEqual(funde, []);
});

test('[Suite-Herkunft·Klasse·Rot-Beweis] die Zeilen vom 06.10.2026 fallen, die neuen Formen nicht', () => {
  assert.equal(klassenFunde('docs/faktenbasis.md', ALT).length, 1);
  assert.equal(klassenFunde('DOCS.md', '- Suite: 12034 · E2E: 582 · Wächter-Register: 142').length, 1);
  assert.equal(klassenFunde('DOCS.md', '- Suite: 12034 (zuletzt gemessen 2026-09-27, fortgeschrieben) · E2E: 582').length, 1, 'Etikett reicht nicht');
  assert.equal(klassenFunde('x', '- Suite (Node-Tests, `node --test`): nicht neu gemessen (letzte Messung 2026-09-27, c30128b6a): 12034').length, 1);
  const e2eAlt = '- E2E (Playwright): 554 `test(`-Aufrufe + 28 aus Schleifen = **582 ausgeführte Tests** (mechanisch gezählt, nicht ausgeführt)';
  assert.equal(klassenFunde('docs/faktenbasis.md', e2eAlt).length, 1);
  assert.deepEqual(klassenFunde('docs/faktenbasis.md', '- Suite (Node-Tests, `node --test`): nicht neu gemessen (letzte Messung 2026-09-27, c30128b6a)'), []);
  assert.deepEqual(klassenFunde('docs/faktenbasis.md', F.suiteZeileGemessen(12100, '2026-10-06', 'abc12345 (Stand Kanon)')), []);
  assert.deepEqual(klassenFunde('DOCS.md', '- Suite: 12100 (echter Lauf am 2026-10-06) · E2E: 582 (gezählt, nicht ausgeführt) · Wächter-Register: 142'), []);
  assert.deepEqual(klassenFunde('DOCS.md', '- E2E: 582 (gezählt, nicht ausgeführt) · Wächter-Register: 142'), []);
});
