'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STANDARDS-Funktionsnamen-Wächter rotmachbar — Auftrag „Belegkette und
   Lücken", Spur B2 (A200), 14./15.08.2026
   ────────────────────────────────────────────────────────────────────────────
   `tools/standards-funktionsnamen-pruefen.js` sammelt jeden Backtick-lower-
   camelCase-Bezeichner in `STANDARDS.md` und hält ihn gegen `function NAME(`
   im Kern. Geprüft hier: die Sammelfunktion selbst, die Ausnahmeliste, und
   Rotmachbarkeit — an einer Kopie im Temp-Ordner, nie am echten Arbeitsbaum.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { funktionsBezeichnerAusMarkdown, funktionExistiertImKern, EXCLUDE } = require('../tools/standards-funktionsnamen-pruefen.js');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const TOOL = path.join(REPO, 'tools', 'standards-funktionsnamen-pruefen.js');

test('[STANDARDS-Funktionsnamen] echter Funktionsname in Backticks wird als Beleg gesammelt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'standards-fn-waechter-'));
  const datei = path.join(tmp, 'probe.md');
  fs.writeFileSync(datei, 'Import: `camt053` → `parseCamt053`, Sektor `finanzen`.\n');
  try {
    const belege = funktionsBezeichnerAusMarkdown(datei);
    assert.deepEqual(belege.map((b) => b.name), ['parseCamt053']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[STANDARDS-Funktionsnamen] Format-/Sektor-/Flag-Wörter auf der Ausschlussliste zählen nicht', () => {
  assert.ok(EXCLUDE.has('camt053'));
  assert.ok(EXCLUDE.has('finanzen'));
  assert.ok(EXCLUDE.has('nurImport'));
});

test('[STANDARDS-Funktionsnamen] funktionExistiertImKern erkennt eine echte Kern-Funktion', () => {
  const kern = 'function parseCamt053(text) { return text; }';
  assert.equal(funktionExistiertImKern('parseCamt053', kern), true);
  assert.equal(funktionExistiertImKern('startCamtImport', kern), false);
});

test('[STANDARDS-Funktionsnamen] echter STANDARDS.md-Lauf gegen den echten Kern ist grün', () => {
  const out = execFileSync('node', [TOOL, '--json'], { cwd: REPO }).toString();
  const ergebnis = JSON.parse(out);
  assert.equal(ergebnis.falsch, 0, 'kein im Kern nicht auffindbarer Funktionsname in STANDARDS.md: ' + JSON.stringify(ergebnis.falschListe));
});

test('[STANDARDS-Funktionsnamen] Rot-Beleg — gepflanzter Fantasiename lässt den Lauf mit Exit 1 scheitern', () => {
  let exitCode = 0;
  let out = '';
  try {
    out = execFileSync('node', [TOOL, '--json', '--pflanze-fantasienamen'], { cwd: REPO }).toString();
  } catch (e) {
    exitCode = e.status;
    out = e.stdout.toString();
  }
  assert.equal(exitCode, 1, 'gepflanzter Fantasiename muss den Wächter rot machen');
  const ergebnis = JSON.parse(out);
  assert.ok(ergebnis.falschListe.some((b) => b.name === 'parseFantasieKanalNichtVorhanden'));
});
