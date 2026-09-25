'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-232 — jede git-Risiko-Aufrufstelle streift GIT_* ab
   ────────────────────────────────────────────────────────────────────────────
   Proben für `tools/git-umgebung-pruefen.js`. Rot-Beweis in der Form „schlägt
   die Probe an, wenn die bewachte Bedingung verletzt wird" — nicht „gab es
   einen Fehler": jede Rot-Probe unten legt selbst eine verletzende Fixture-
   Datei an und zeigt, dass der Wächter sie findet.

   Jede Prüfung läuft über ein FIXTURE-Verzeichnis, nie über die echten
   `tests/`/`tools/`/`scripts/`-Ordner — eine Probe, die ihre eigene
   Nachbarschaft mutiert, misst den Bestand und nicht sich selbst (dieselbe
   Regel wie `tests/rot-beweis-pflicht.test.js`).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  pruefe, jsDateien, ungeschuetzteAufrufstellenInDatei, istGitAufruf, arbeitsVerzeichnis, traegtEnvOption,
  roherEnvSpreadMitGitInDatei, repoAufrufeOhneEnvInDatei,
} = require('../tools/git-umgebung-pruefen.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE_PFAD = path.join(REPO, 'tools', 'git-umgebung-grundlinie.json');
const grundlinie = () => JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));

/* Ein Fixture-Verzeichnis mit einer benannten Datei unter einem `wurzel`-
   Unterordner (`pruefe()` erwartet ein ARRAY von Wurzeln, wie der echte
   Aufruf gegen tests/tools/scripts). */
function fixture(dateiInhalt, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-umgebung-waechterprobe-'));
  const wurzel = path.join(dir, 'tools');
  fs.mkdirSync(wurzel, { recursive: true });
  fs.writeFileSync(path.join(wurzel, 'probe.js'), dateiInhalt);
  try { return fn([wurzel], dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// `execFileSync(` als EIN zusammenhaengendes Literal wuerde diese eigene Datei
// (sie liegt selbst unter tests/) beim naechsten echten Bestandslauf treffen —
// deshalb hier ueber Konkatenation zusammengesetzt, nicht als ein Stueck.
const RISIKO_OHNE_ENV =
  "const { " + 'execFileSync' + " } = require('node:child_process');\n"
  + "function lies(wo) { return " + 'execFileSync' + "('git', ['show', 'HEAD:x'], { cwd: wo }); }\n";

const RISIKO_MIT_ENV =
  "const { execFileSync } = require('node:child_process');\n"
  + "function ohneGit() { const e = { ...process.env }; for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k]; return e; }\n"
  + "function lies(wo) { return execFileSync('git', ['show', 'HEAD:x'], { cwd: wo, env: ohneGit() }); }\n";

const RISIKO_MIT_ENV_SHORTHAND =
  "const { execFileSync } = require('node:child_process');\n"
  + "function lies(wo) { const env = {}; return execFileSync('git', ['show', 'HEAD:x'], { cwd: wo, env }); }\n";

const CWD_REPO_UNGESCHUETZT =
  "const path = require('node:path');\n"
  + "const { execFileSync } = require('node:child_process');\n"
  + "const REPO = path.join(__dirname, '..');\n"
  + "function lies() { return " + 'execFileSync' + "('git', ['rev-parse', 'HEAD'], { cwd: REPO }); }\n";

const CWD_REPO_MIT_ENV =
  "const path = require('node:path');\n"
  + "const { execFileSync } = require('node:child_process');\n"
  + "const REPO = path.join(__dirname, '..');\n"
  + "function lies() { return " + 'execFileSync' + "('git', ['rev-parse', 'HEAD'], { cwd: REPO, env: {} }); }\n";

const OHNE_CWD_UNGESCHUETZT =
  "const { execFileSync } = require('node:child_process');\n"
  + "function lies() { return execFileSync('git', ['rev-parse', 'HEAD']); }\n";

const KEIN_GIT_AUFRUF =
  "const { execFileSync } = require('node:child_process');\n"
  + "function bau(wo) { return execFileSync('npm', ['ci'], { cwd: wo }); }\n";

/* 19.09.2026 — die zweite, vom cwd/env-Muster oben UNABHAENGIGE Ratsche: ein
   Objektliteral, das die ROHE Prozessumgebung per Spread uebernimmt und im selben Literal
   einen GIT-Schluessel setzt. Ueber Konkatenation zusammengesetzt (nicht als ein Stueck),
   sonst waere DIESE Testdatei selbst der erste Fund, sobald sie unter tests/ liegt. */
const ENV_SPREAD_MIT_GIT_SCHADEN =
  "const hookUmgebung = { ..." + 'process.env' + ", GIT_" + "DIR: '/irgendwo/.git' };\n"
  + 'module.exports = hookUmgebung;\n';

const ENV_SPREAD_MIT_GIT_GEGENPROBE =
  "function ohneGitUmgebung(basis) { const e = { ...basis }; for (const k of Object.keys(e)) "
  + "if (k.startsWith('GIT_')) delete e[k]; return e; }\n"
  + "const hookUmgebung = { ...ohneGitUmgebung(process.env), GIT_" + "DIR: '/irgendwo/.git' };\n"
  + 'module.exports = hookUmgebung;\n';

test('[U2-ADR-232] der echte Bestand ist gruen — jede Risiko-Aufrufstelle ausserhalb der Grundlinie streift GIT_* ab', () => {
  const r = pruefe([path.join(REPO, 'tests'), path.join(REPO, 'tools'), path.join(REPO, 'scripts')], grundlinie());
  assert.deepEqual(r.neu, [],
    'Diese Datei(en) tragen eine NEUE, ungeschuetzte git-Risiko-Aufrufstelle. Im pre-commit-Hook sind '
    + 'GIT_DIR und GIT_INDEX_FILE gesetzt — ohne Stripping arbeitet der Aufruf dann im echten Repository '
    + 'statt in seiner Fixture:\n' + r.neu.join('\n'));
});

test('[U2-ADR-232·Rot-Beweis] ein git-Aufruf mit veraenderlichem cwd und OHNE env-Option wird gefunden', () => {
  fixture(RISIKO_OHNE_ENV, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [] });
    assert.deepEqual(r.neu, ['tools/probe.js'],
      'die Probe findet die verletzende Fixture-Datei nicht — dann ist ihr gruener Lauf ueber den echten '
      + 'Bestand kein Beleg, sondern eine Behauptung');
  });
});

test('[U2-ADR-232·Gegenprobe] derselbe Aufruf MIT env-Option (explizit) wird nicht gemeldet', () => {
  fixture(RISIKO_MIT_ENV, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [] });
    assert.deepEqual(r.neu, [], 'eine geschuetzte Aufrufstelle wird gemeldet — dann meldet die Probe Form statt Verstoss');
  });
});

test('[U2-ADR-232·Gegenprobe] env als ES6-Shorthand-Property zaehlt ebenfalls als geschuetzt', () => {
  fixture(RISIKO_MIT_ENV_SHORTHAND, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [] });
    assert.deepEqual(r.neu, [],
      '`{ cwd: wo, env }` ist dieselbe Absicherung wie `{ cwd: wo, env: env }` — nur die Schreibweise unterscheidet sich');
  });
});

test('[U2-ADR-232·Gegenprobe] cwd: REPO gilt als sicher, auch ohne env-Option', () => {
  fixture(CWD_REPO_UNGESCHUETZT, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [] });
    assert.deepEqual(r.neu, [],
      'dieselbe GIT_DIR beantwortet dieselbe Frage richtig, ob gesetzt oder nicht, solange cwd das eigene Repo ist');
  });
});

test('[U2-ADR-232·Gegenprobe] ein Aufruf ganz ohne cwd/-C gilt als sicher', () => {
  fixture(OHNE_CWD_UNGESCHUETZT, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [] });
    assert.deepEqual(r.neu, [], 'ohne cwd/-C arbeitet der Aufruf im Prozess-Arbeitsverzeichnis — bei jedem Testlauf das Repo selbst');
  });
});

test('[U2-ADR-232·Gegenprobe] ein Nicht-git-Unterprozessaufruf wird nicht gemeldet', () => {
  fixture(KEIN_GIT_AUFRUF, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [] });
    assert.deepEqual(r.neu, [], 'der Waechter prueft git-Aufrufe, keine beliebigen Unterprozesse');
  });
});

test('[U2-ADR-232·Gegenprobe] eine ALTE Datei mit Verstoss bleibt still, solange sie in der Grundlinie steht', () => {
  fixture(RISIKO_OHNE_ENV, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: ['tools/probe.js'] });
    assert.deepEqual(r.neu, [], 'die Grundlinie muss den Bestand tragen, sonst gatet niemand mit ihr');
  });
});

test('[U2-ADR-232·Ratsche] eine nachgeruestete Datei muss aus der Grundlinie heraus', () => {
  fixture(RISIKO_MIT_ENV, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: ['tools/probe.js'] });
    assert.deepEqual(r.grundlinieZuGross, ['tools/probe.js'],
      'eine nachgeruestete Datei bleibt unbemerkt in der Ausnahmemenge — die Ratsche greift nicht');
  });
});

test('[U2-ADR-232] ein Grundlinien-Eintrag ins Leere wird gefunden', () => {
  fixture(RISIKO_MIT_ENV, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: ['tools/verschwunden.js'] });
    assert.deepEqual(r.verschwunden, ['tools/verschwunden.js'],
      'ein toter Eintrag suggeriert Deckung fuer einen Fall, den es nicht gibt');
  });
});

test('[U2-ADR-232] unterordner zaehlen mit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-umgebung-waechterprobe-tief-'));
  try {
    const wurzel = path.join(dir, 'tools');
    fs.mkdirSync(path.join(wurzel, 'tief'), { recursive: true });
    fs.writeFileSync(path.join(wurzel, 'tief', 'probe.js'), RISIKO_OHNE_ENV);
    const r = pruefe([wurzel], { ungeschuetzt: [] });
    assert.deepEqual(r.neu, ['tools/tief/probe.js'], 'eine Datei im Unterordner faellt durch — die Suche ist nicht rekursiv');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[U2-ADR-232] die Grundlinie traegt Stand UND Grund (kein stummer Zahlenwechsel)', () => {
  const g = grundlinie();
  assert.match(g.stand, /^\d{4}-\d{2}-\d{2}$/, 'Stand im ISO-Format');
  assert.ok(g.grund && g.grund.length > 60, 'ein nicht-trivialer Grund steht dabei');
  assert.ok(Array.isArray(g.ungeschuetzt));
});

test('[U2-ADR-232] die Grundlinie zeigt auf keine toten Eintraege im echten Bestand', () => {
  const r = pruefe([path.join(REPO, 'tests'), path.join(REPO, 'tools'), path.join(REPO, 'scripts')], grundlinie());
  assert.deepEqual(r.verschwunden, [], 'diese Grundlinien-Eintraege zeigen ins Leere:\n' + r.verschwunden.join('\n'));
  assert.deepEqual(r.grundlinieZuGross, [],
    'diese Grundlinien-Eintraege sind nachgeruestet und gehoeren heraus:\n' + r.grundlinieZuGross.join('\n'));
});

test('[U2-ADR-232·zweite-Pruefung] der echte Bestand traegt kein rohes process.env-Spread+GIT-Muster', () => {
  const r = pruefe([path.join(REPO, 'tests'), path.join(REPO, 'tools'), path.join(REPO, 'scripts')], grundlinie());
  assert.deepEqual(r.spreadNeu, [],
    'diese Datei(en) uebernehmen die rohe Prozessumgebung per Spread und setzen im selben Literal einen '
    + 'GIT-Schluessel — genau das Muster, das am 19.09.2026 die mehrfach reproduzierte Index-Korruption '
    + 'verursachte:\n' + r.spreadNeu.join('\n'));
  assert.deepEqual(r.spreadGrundlinieZuGross, [], 'nachgeruestete Grundlinien-Eintraege (roherEnvSpreadMitGit) gehoeren heraus');
  assert.deepEqual(r.spreadVerschwunden, [], 'tote Grundlinien-Eintraege (roherEnvSpreadMitGit) zeigen ins Leere');
});

test('[U2-ADR-232·zweite-Pruefung·Rot-Beweis] roher Spread von process.env plus direkte GIT-Zuweisung im selben Literal wird gefunden', () => {
  fixture(ENV_SPREAD_MIT_GIT_SCHADEN, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [], roherEnvSpreadMitGit: [] });
    assert.deepEqual(r.spreadNeu, ['tools/probe.js'],
      'die Probe findet das verletzende Muster nicht — die zweite Pruefung ist dann Behauptung statt Beleg');
  });
});

test('[U2-ADR-232·zweite-Pruefung·Gegenprobe] ein Spread aus bereits bereinigter Quelle wird NICHT gemeldet', () => {
  fixture(ENV_SPREAD_MIT_GIT_GEGENPROBE, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [], roherEnvSpreadMitGit: [] });
    assert.deepEqual(r.spreadNeu, [],
      'ein Spread aus dem Rueckgabewert einer bereinigenden Funktion ist sicher — die Probe darf hier nicht rot gehen');
  });
});

test('[U2-ADR-232·zweite-Pruefung] roherEnvSpreadMitGitInDatei einzeln', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-umgebung-spread-probe-'));
  try {
    const datei = path.join(dir, 'probe.js');
    fs.writeFileSync(datei, ENV_SPREAD_MIT_GIT_SCHADEN);
    assert.deepEqual(roherEnvSpreadMitGitInDatei(datei), [1]);
    fs.writeFileSync(datei, ENV_SPREAD_MIT_GIT_GEGENPROBE);
    assert.deepEqual(roherEnvSpreadMitGitInDatei(datei), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[U2-ADR-232] Hilfsfunktionen einzeln: istGitAufruf/arbeitsVerzeichnis/traegtEnvOption', () => {
  assert.equal(istGitAufruf("'git', ['show']"), true);
  assert.equal(istGitAufruf("'npm', ['ci']"), false);
  assert.equal(istGitAufruf("'git rev-parse --short HEAD'"), true);
  assert.equal(arbeitsVerzeichnis("'git', ['show'], { cwd: wo }"), 'wo');
  assert.equal(arbeitsVerzeichnis("'git', ['show'], { cwd: REPO }"), 'REPO');
  assert.equal(arbeitsVerzeichnis("'git', ['show']"), null);
  assert.equal(arbeitsVerzeichnis("'-C', repo, ['ls-files']"), 'repo');
  assert.equal(traegtEnvOption("{ cwd: wo, env: ohneGit() }"), true);
  assert.equal(traegtEnvOption("{ cwd: wo, env }"), true);
  assert.equal(traegtEnvOption("{ cwd: wo }"), false);
});

/* DRITTE PRÜFUNG (19.09.2026, GITW): `cwd: REPO` ohne env-Option erbt die Hook-Umgebung. */
test('[U2-ADR-232·dritte-Pruefung] der echte Bestand traegt keine NEUE git-Aufrufstelle cwd: REPO ohne env-Option', () => {
  const r = pruefe([path.join(REPO, 'tests'), path.join(REPO, 'tools'), path.join(REPO, 'scripts')], grundlinie());
  assert.deepEqual(r.repoNeu, [],
    'Diese Datei(en) rufen git mit cwd: REPO ohne env-Option auf und erben unter einem Hook GIT_DIR/GIT_INDEX_FILE '
    + '(bei commit -a einen temporaeren Index). Nachruesten mit env: ohneGitUmgebung():\n' + r.repoNeu.join('\n'));
  assert.deepEqual(r.repoGrundlinieZuGross, [], 'nachgeruestete Dateien gehoeren aus repoOhneEnv heraus');
  assert.deepEqual(r.repoVerschwunden, [], 'repoOhneEnv zeigt auf tote Dateien');
});

test('[U2-ADR-232·dritte-Pruefung·Rot-Beweis] cwd: REPO ohne env-Option wird gefunden — obwohl die erste Pruefung es durchwinkt', () => {
  fixture(CWD_REPO_UNGESCHUETZT, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [], repoOhneEnv: [] });
    assert.deepEqual(r.neu, [], 'die erste Pruefung winkt cwd: REPO weiter durch — das ist der Anlass');
    assert.deepEqual(r.repoNeu, ['tools/probe.js'], 'die dritte Pruefung findet die Fixture nicht');
  });
});

test('[U2-ADR-232·dritte-Pruefung·Gegenprobe] cwd: REPO MIT env-Option wird nicht gemeldet, eine Datei in der Grundlinie bleibt still', () => {
  fixture(CWD_REPO_MIT_ENV, (wurzeln) => {
    assert.deepEqual(pruefe(wurzeln, { ungeschuetzt: [], repoOhneEnv: [] }).repoNeu, []);
  });
  fixture(CWD_REPO_UNGESCHUETZT, (wurzeln) => {
    assert.deepEqual(pruefe(wurzeln, { ungeschuetzt: [], repoOhneEnv: ['tools/probe.js'] }).repoNeu, []);
  });
});

test('[U2-ADR-232·dritte-Pruefung·Ratsche] eine nachgeruestete Datei muss aus repoOhneEnv heraus, ein toter Eintrag wird gefunden', () => {
  fixture(CWD_REPO_MIT_ENV, (wurzeln) => {
    const r = pruefe(wurzeln, { ungeschuetzt: [], repoOhneEnv: ['tools/probe.js', 'tools/weg.js'] });
    assert.deepEqual(r.repoGrundlinieZuGross, ['tools/probe.js']);
    assert.deepEqual(r.repoVerschwunden, ['tools/weg.js']);
  });
});

test('[U2-ADR-232·dritte-Pruefung] repoAufrufeOhneEnvInDatei liefert die Zeile der Aufrufstelle', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-ohne-env-'));
  try {
    const f = path.join(dir, 'x.js');
    fs.writeFileSync(f, CWD_REPO_UNGESCHUETZT);
    assert.deepEqual(repoAufrufeOhneEnvInDatei(f), [4]);
    fs.writeFileSync(f, CWD_REPO_MIT_ENV);
    assert.deepEqual(repoAufrufeOhneEnvInDatei(f), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
