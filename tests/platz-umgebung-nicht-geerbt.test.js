'use strict';
/* Proben der Platz-Werkzeuge erben die Umgebung des Laufs nicht (08.10.2026, Befund PLATZ-UMGEBUNG-LECKT-IN-PROBEN).

   Eine Probe, die die Platz-Bibliothek lädt oder das Platz-Werkzeug startet, reicht process.env nicht weiter —
   weder als { ...process.env }, noch als Object.assign({}, process.env), noch als env: process.env. Sie baut ihre
   Umgebung aus ohnePlatzUmgebung() (tools/lib/ohne-platz-umgebung.js) oder von Grund auf. Sonst prüft eine Probe
   „zwei Plätze“ unter der Platzzahl, dem Kettenwagen-Schalter oder der Lastgrenze des Laufs, der sie startete.
   Diese Datei selbst ist ausgenommen: ihr Rot-Beweis trägt die verbotenen Formen als Text. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { ohnePlatzUmgebung } = require('../tools/lib/ohne-platz-umgebung.js');

const REPO = path.join(__dirname, '..');
const SELBST = 'tests/platz-umgebung-nicht-geerbt.test.js';

// Wer gehört dazu: lädt die Platz-Bibliothek oder startet das Platz-Werkzeug über einen Pfad.
const RUFT_PLATZ = /require\([^)]*suite-platz\.js['"]\)|path\.join\([^)]*['"]suite-platz\.js['"]\)/;
const FORMEN = [
  { name: 'Ausbreitung', muster: /\.\.\.\s*process\.env\b/ },
  { name: 'Object.assign', muster: /Object\.assign\(\s*\{\s*\}\s*,\s*process\.env\b/ },
  { name: 'Weitergabe', muster: /\benv\s*:\s*process\.env\b(?!\s*\.|\s*\[)/ },
];

function funde(dateien) {
  const aus = [];
  for (const [datei, text] of Object.entries(dateien)) {
    if (datei === SELBST || !RUFT_PLATZ.test(text)) continue;
    text.split('\n').forEach((zeile, i) => {
      const code = zeile.replace(/\/\/.*$/, '');
      for (const { name, muster } of FORMEN) if (muster.test(code)) aus.push(datei + ':' + (i + 1) + '  [' + name + ']  ' + zeile.trim().slice(0, 120));
    });
  }
  return aus;
}

test('[Platz·Umgebung] keine Probe der Platz-Werkzeuge reicht die Umgebung des Laufs weiter', () => {
  const dateien = execFileSync('git', ['ls-files', 'tests'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() })
    .split('\n').filter((d) => /\.(?:c|m)?js$/.test(d));
  const inhalte = {};
  for (const d of dateien) { try { inhalte[d] = fs.readFileSync(path.join(REPO, d), 'utf8'); } catch (_) { /* gelöscht */ } }
  const dabei = Object.keys(inhalte).filter((d) => d !== SELBST && RUFT_PLATZ.test(inhalte[d]));
  // Vorbedingung: liegen Platz-Proben im Bestand, erkennt die Probe sie auch (ein kaputtes Erkennungsmuster prüfte sonst nichts).
  assert.ok(dabei.length > 0 || !dateien.some((d) => /suite-platz/.test(d)), 'Vorbedingung: die Platz-Proben sind erkannt');
  assert.deepEqual(funde(inhalte), []);
});

test('[Platz·Umgebung·Rot-Beweis] jede Form der Weitergabe fällt; ohne Platz-Aufruf und mit der Bereinigung nicht', () => {
  const kopf = "const sp = require('../tools/lib/suite-platz.js');\n";
  const werkzeug = "const W = path.join(BASIS, 'suite-platz.js');\n";
  const gepflanzt = {
    'tests/a.test.js': kopf + "const ohneErbe = { ...process.env, VD_SUITE_PLATZ_GEHALTEN: '' };",
    'tests/b.test.js': kopf + "const e = Object.assign({}, process.env, { X: '1' });",
    'tests/c.test.js': werkzeug + "spawnSync(process.execPath, [W, '--holen'], { env: process.env });",
  };
  assert.deepEqual(funde(gepflanzt).map((f) => f.split(':')[0]).sort(), Object.keys(gepflanzt).sort(), funde(gepflanzt).join('\n'));
  const erlaubt = {
    'tests/d.test.js': kopf + "const ohneErbe = { ...ohnePlatzUmgebung(), VD_SUITE_PLATZ_GEHALTEN: '' };\nconst d = process.env.HOME;\nconst x = { env: process.env.PATH };",
    'tests/e.test.js': "const e = { ...process.env, VD_PRUEFZWEIG: '1' };   // ruft kein Platz-Werkzeug",
    'tests/f.test.js': kopf + "// früher: { ...process.env }",
  };
  assert.deepEqual(funde(erlaubt), []);
});

test('[Platz·Umgebung·Bereinigung] die Muster nehmen die ganze Familie heraus, nichts sonst', () => {
  const lauf = {
    VD_SUITE_PLAETZE: '1', VD_AIR_PLAETZE: '3', VD_KETTEN_ZUG: '1', VD_SUITE_PLATZ_GEHALTEN: 'pre-commit:1',
    VD_SUITE_PLATZ_DIR: '/x', VD_SUITE_PLATZ_WARTEN_S: '5', VD_LAST_GRENZE: '20', VD_PROBE_LAST_GRENZE: '30',
    VD_AIR: 'aus', VD_AIR_E2E_GEFAHREN: '1', VD_NEU_PLAETZE: '9', VD_VORRANG_MARKE: 'a', VD_REIHE: 'b',
    PATH: '/bin', HOME: '/h', NODE_TEST_CONTEXT: 'child-v8', VD_PRUEFZWEIG: '1', GIT_DIR: '/g',
  };
  assert.deepEqual(ohnePlatzUmgebung(lauf), { PATH: '/bin', HOME: '/h', NODE_TEST_CONTEXT: 'child-v8', VD_PRUEFZWEIG: '1', GIT_DIR: '/g' });
  // Rot-Beweis des Befunds: die alte Form trägt die Platzzahl des Laufs in die Probe.
  assert.equal({ ...lauf, VD_SUITE_PLATZ_GEHALTEN: '' }.VD_SUITE_PLAETZE, '1');
  assert.equal({ ...ohnePlatzUmgebung(lauf), VD_SUITE_PLATZ_GEHALTEN: '' }.VD_SUITE_PLAETZE, undefined);
});
