'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS); in derselben Zeile, damit keine Zeilennummer wandert
/* ════════════════════════════════════════════════════════════════════════
   Das Repo nennt kein KI-Werkzeug (26.09.2026, Entscheidung der Produktverantwortung)
   ────────────────────────────────────────────────────────────────────────
   Dieselbe Regel wie tests/adr-ohne-ki-nennung.test.js, ausgedehnt auf jede
   versionierte Datei: Code, Tests, Hooks, Dokumentation, Style Guide. Wer
   etwas ausführt, heißt in Prosa „Agentensitzung"; ein Verweis auf eine
   Regeldatei des Werkzeugs wird sachlich gefasst („stehende Regel …"), ohne
   ihren Dateinamen.

   AUSNAHMEN — nur technische Bezeichner, die das Werkzeug selbst vorgibt und
   die ein Code-Pfad lesen muss (abgestimmt 26.09.2026):
     · die Umgebungsvariable, an der eine Agentensitzung erkannt wird,
     · der Prozessname (in Backticks oder Anführungszeichen),
     · das Konfigurationsverzeichnis mit führendem Punkt,
     · Temp-Pfad-Erkenner: das Temp-Verzeichnis des Prozesses (`…-<uid>`),
       nur in tools/oeffentlicher-zuschnitt-bauen.js (:303 Kommentar, :321
       Muster) und seinem Test (:387) — dort wird es erkannt, nicht genannt,
     · die .gitignore-Zeile, die die Regeldatei des Werkzeugs aus dem Repo
       hält (technische Kennung).
   Die Liste ist geschlossen; eine neue Ausnahme ist eine neue Entscheidung.

   Das Muster kommt aus der einen Quelle tools/lib/ki-nennung-muster.js, die
   auch die ADR-Probe liest. Die ADRs (docs/adr/) prüft allein
   tests/adr-ohne-ki-nennung.test.js; diese Probe prüft alles andere.
   Die Wörter stehen zusammengesetzt, damit keine Probe beim Nachsehen
   (`git grep -i -E`) sich selbst findet und eine Selbst-Ausnahme braucht.
   ROT-BEWEIS an den Formen, die bis 26.09.2026 dastanden.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const { KI_NENNUNG_MUSTER: MUSTER, KI_NENNUNG_GREP, WOERTER } = require('../tools/lib/ki-nennung-muster.js');

const REPO = path.join(__dirname, '..');
const W = WOERTER.WERKZEUG;
const S = WOERTER.GESPRAECH;
const Z = WOERTER.ZWEITES;

// Abschließend. `dateien` fehlt = überall erlaubt; sonst nur in diesen Dateien.
const AUSNAHMEN = [
  { name: 'Umgebungsvariable', muster: new RegExp(W.toUpperCase() + 'CODE', 'g') },
  { name: 'Konfigurationsverzeichnis', muster: new RegExp('\\.' + W + '\\b', 'g') },
  { name: 'Prozessname', muster: new RegExp('[`"\']' + W + '[`"\']', 'g') },
  { name: 'Temp-Pfad-Erkenner', muster: new RegExp(W + '-(?:\\d|…|\\[0-9\\])', 'g'),
    dateien: ['tools/oeffentlicher-zuschnitt-bauen.js', 'tests/oeffentlicher-zuschnitt-bauen.test.js'] },
  { name: 'Regeldatei-Sperre', muster: new RegExp('^/' + W.toUpperCase() + '\\.md$', 'g'), dateien: ['.gitignore'] },
];

function befund(zeilen) {
  // zeilen: [{ ort: 'datei:nr', datei, text }]
  return zeilen.filter(({ datei, text }) => {
    let rest = text.trim();
    for (const a of AUSNAHMEN) if (!a.dateien || a.dateien.includes(datei)) rest = rest.replace(a.muster, '');
    return MUSTER.test(rest);
  }).map(({ ort, text }) => ort + '  ' + text.trim().slice(0, 120));
}

function repoZeilen() {
  let aus = '';
  try {
    aus = execFileSync('git', ['grep', '-n', '-I', '-i', '-E', KI_NENNUNG_GREP, '--', '.', ':!docs/adr'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    if (e.status !== 1) throw e;   // 1 = kein Treffer
  }
  return aus.split('\n').filter(Boolean).map((z) => {
    const m = /^([^:]+):(\d+):(.*)$/.exec(z);
    return { ort: m[1] + ':' + m[2], datei: m[1], text: m[3] };
  });
}

test('[Repo·ohne KI-Nennung] keine versionierte Datei nennt das Werkzeug außerhalb der Ausnahmen', () => {
  const dateien = execFileSync('git', ['ls-files'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() }).split('\n').filter(Boolean);
  assert.ok(dateien.length > 1000, 'Vorbedingung: der Repo-Bestand ist da');
  assert.deepEqual(befund(repoZeilen()), []);
});

test('[Repo·ohne KI-Nennung·Rot-Beweis] die Formen vom 26.09.2026 fallen, die Ausnahmen bleiben', () => {
  const U = W.toUpperCase();
  const G = W[0].toUpperCase() + W.slice(1);
  const alt = [
    ['tools/lib/live-sperre.js', "  if (env." + U + "CODE) return 'in einer " + G + "-Code-Sitzung gestartet (" + U + "CODE gesetzt)';"],
    ['tools/baeume-aufraeumen-erheben.js', '      den nichts außer einer ' + G + '-Sitzung anlegt oder betritt.'],
    ['tools/notierte-befunde-sammeln.js', '   (NICHT ins Repo — dieselbe Regel wie jedes Meßartefakt, s. ' + U + '.md).'],
    ['vivodepot-style-guide.html', '    <h2>8 · Markenfarben-Regel (aus ' + U + '.md)</h2>'],
    ['hooks/pre-push', '# Siehe: ' + W + '/vivodepot-codeberg-sperre-bis-launch-2026-07-30.md'],
    ['docs/lesedurchgang/methode.md', '`~/.' + W + '/' + U + '.md`), nur die Route, die Fragen und das Aufnahme-Werkzeug sind'],
    ['docs/plans/x.md', '> **For ' + G + ':** REQUIRED SUB-SKILL: Use superpowers:executing-plans'],
    ['tests/e2e/zug5-depot-pille-menue.spec.js', '   GEMESSEN beim Bau (Browser-Probe, ' + G + '-Browser-Pane): der erste Entwurf'],
    ['docs/x.md', '**Klärungs-Sitzung:** ' + S[0].toUpperCase() + S.slice(1) + ' vom 22.05.2026'],
    ['docs/x.md', Z[0].toUpperCase() + Z.slice(1) + 's-Feedback empfahl CI/CD-Härtung'],
  ].map(([datei, text], i) => ({ ort: datei + ':' + (i + 1), datei, text }));
  assert.equal(befund(alt).length, alt.length, 'jede alte Form muß fallen');

  const bleibt = [
    ['tools/lib/live-sperre.js', "  if (env." + U + "CODE) return 'in einer Agentensitzung gestartet (" + U + "CODE gesetzt)';"],
    ['tools/baeume-aufraeumen-erheben.js', '   2. „Läuft da was" filtert auf `' + W + '`, nicht auf `node`: der `' + W + '`-Prozess'],
    ['tools/worktree-belegung-pruefen.js', '   an der cwd erkannt, nicht am Namen "node"/"' + W + '":'],
    ['tools/paragraphen-schnitt-messen.js', "const NIE = new Set(['.git', '." + W + "']);"],
    ['.gitignore', '.' + W + '/'],
    ['.gitignore', '/' + U + '.md'],
    ['tools/oeffentlicher-zuschnitt-bauen.js', "  { name: 'Temp-Pfad', muster: /\\/tmp\\/" + W + "-[0-9]+/ },"],
    ['tests/oeffentlicher-zuschnitt-bauen.test.js', "    const pfad = ['/private', 'tmp', '" + W + "-501', 'x'].join('/');"],
    ['docs/fremdquellen.md', '  `stmas.bayern.de` (Nachfolge' + 'ministerium) — kein Treffer.'],
  ].map(([datei, text], i) => ({ ort: datei + ':' + (i + 1), datei, text }));
  assert.deepEqual(befund(bleibt), []);

  // Dateigebundene Ausnahmen gelten nur an ihrem Ort: dieselbe Form woanders fällt.
  assert.equal(befund([{ ort: 'README.md:1', datei: 'README.md', text: '/' + U + '.md' }]).length, 1);
  assert.equal(befund([{ ort: 'tools/x.js:1', datei: 'tools/x.js', text: 'const tmp = "/tmp/' + W + '-501";' }]).length, 1);
});
