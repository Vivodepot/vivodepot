'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS): diese Probe startet git und liest hooks/
/* ════════════════════════════════════════════════════════════════════════
   Keine Sperre erkennt eine Agentensitzung an einer Umgebungsvariable des
   Sitzungswerkzeugs (07.10.2026, Befund AGENTENSPERRE-FAIL-OPEN, HOCH)
   ────────────────────────────────────────────────────────────────────────
   Vier Werkzeuge (Schlüsselbund, Release, Auslieferungslauf, Sprachmodule)
   sperrten nur, wenn das Werkzeug der Sitzung seine Variable setzte. Fehlte
   sie — ein anderes Werkzeug, eine neue Fassung, ein Hintergrundlauf —, war
   die Sperre offen. Seitdem entscheidet allein der Menschen-Nachweis
   (tools/lib/live-sperre.js: menschNachweis, fail-closed).

   Dieser Wächter hält die ganze Klasse: keine versionierte Datei unter tools/
   oder hooks/ (git ls-files) liest diese Variable — weder als `env.<NAME>`,
   `env['<NAME>']`, `process.env.<NAME>`, `umgebung.<NAME>`, per Zerlegung aus
   der Umgebung, noch in einem Hook als `$<NAME>`/`${<NAME>}`. Erwartet: 0.

   Der Name wird aus tools/lib/ki-nennung-muster.js zusammengesetzt, wie in
   tests/repo-ohne-ki-nennung.test.js entschieden, damit diese Probe beim
   Nachsehen sich selbst nicht findet.
   ROT-BEWEIS: erfundene Zeilen in jeder gesuchten Form fallen; die neue
   Form (menschNachweis) und bloße Prosa bleiben.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { WOERTER } = require('../tools/lib/ki-nennung-muster.js');

const REPO = path.join(__dirname, '..');
const NAME = WOERTER.WERKZEUG.toUpperCase() + 'CODE';
const Q = '[\'"`]';
const FORMEN = [
  new RegExp('\\benv\\s*\\.\\s*' + NAME + '\\b'),                                     // env.X, process.env.X
  new RegExp('\\benv\\s*\\[\\s*' + Q + NAME + Q + '\\s*\\]'),                         // env['X'], process.env["X"]
  new RegExp('\\bumgebung\\s*\\.\\s*' + NAME + '\\b'),                                // umgebung.X, w.umgebung.X
  new RegExp('\\bumgebung\\s*\\[\\s*' + Q + NAME + Q + '\\s*\\]'),                    // umgebung['X']
  new RegExp('\\{[^}]*\\b' + NAME + '\\b[^}]*\\}\\s*=\\s*(?:process\\.)?(?:env|umgebung)\\b'), // const { X } = process.env
  new RegExp('\\$\\{?' + NAME + '\\b'),                                               // Hook: $X, ${X}, ${X:-}
];

function befund(zeilen) {
  // zeilen: [{ ort, text }]
  return zeilen.filter(({ text }) => FORMEN.some((m) => m.test(text))).map(({ ort, text }) => ort + '  ' + text.trim().slice(0, 120));
}

function bestand() {
  const dateien = execFileSync('git', ['ls-files', '--', 'tools', 'hooks'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() })
    .split('\n').filter(Boolean);
  const zeilen = [];
  for (const datei of dateien) {
    let text;
    try { text = fs.readFileSync(path.join(REPO, datei), 'utf8'); } catch (_) { continue; }   // gelöscht, aber noch im Index
    if (text.includes('\u0000')) continue;                                                    // binär
    text.split('\n').forEach((z, i) => zeilen.push({ ort: datei + ':' + (i + 1), text: z }));
  }
  return { dateien, zeilen };
}

test('[Agentensperre·Klasse] keine Datei unter tools/ oder hooks/ liest die Umgebungsvariable des Sitzungswerkzeugs', () => {
  const { dateien, zeilen } = bestand();
  assert.ok(dateien.some((d) => d.startsWith('hooks/')) && dateien.includes('tools/lib/live-sperre.js'), 'Vorbedingung: tools/ und hooks/ sind da');
  assert.deepEqual(befund(zeilen), []);
});

test('[Agentensperre·Klasse·Rot-Beweis] jede gesuchte Form fällt; der Menschen-Nachweis und Prosa bleiben', () => {
  const rot = [
    "  if (process.env." + NAME + ") return 'gesperrt';",
    "  if (env." + NAME + ") return null;",
    "  if (env['" + NAME + "']) halt('x');",
    '  const s = process.env["' + NAME + '"];',
    "  if (w.umgebung." + NAME + ") halt('in einer Agentensitzung gestartet');",
    "  if (umgebung['" + NAME + "']) rot(0, 'x');",
    '  const { ' + NAME + ', HOME } = process.env;',
    'if [ -n "${' + NAME + ':-}" ]; then exit 1; fi',
    'test -n "$' + NAME + '" && exit 1',
  ].map((text, i) => ({ ort: 'tools/erfunden.js:' + (i + 1), text }));
  assert.equal(befund(rot).length, rot.length, 'jede erfundene Zeile muß fallen');

  const bleibt = [
    "  const grund = menschNachweis(w.umgebung, w.terminal, { werkzeug: 'release:teil1' });",
    "  if (env.VD_LIVE_MENSCH === '1') return null;",
    '  // Bis 07.10.2026 hing die Sperre an einer Umgebungsvariable des Sitzungswerkzeugs.',
  ].map((text, i) => ({ ort: 'tools/erfunden.js:' + (i + 1), text }));
  assert.deepEqual(befund(bleibt), []);
});
