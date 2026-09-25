'use strict';
/* Git-Umgebung-Wächter (U2-ADR-232, 03.09.2026) als Gate in der Suite — bisher lief er nie automatisch
   ───────────────────────────────────────────────────────────────────────────────────────────
   BEFUND (22.09.2026, „Muster Ort/Name täuscht über die Rolle"): `tools/git-umgebung-pruefen.js`
   existiert seit dem 03.09.2026, erkennt die Fehlerklasse „git-Unterprozessaufruf mit fremdem/fabriziertem
   cwd, aber ohne env-Bereinigung (GIT_DIR/GIT_INDEX_FILE/…)" quer über tests/, tools/, scripts/ und trägt eine
   schrumpfende Grundlinie (`tools/git-umgebung-grundlinie.json`) — war aber weder in `hooks/pre-commit`
   verdrahtet noch von einer Testdatei erfasst, lief also NIE automatisch. Am 22.09.2026 hat genau diese Klasse
   zugeschlagen (Marketing, ein Marken-Wächter-Testfall, nie committet, vor Ort behoben, kein Pfad in diesem
   Baum): ein
   git-Unterprozessaufruf mit fremdem cwd und ohne env-Option gewann unter einem echten `pre-commit`-Lauf
   gegen das geerbte `GIT_DIR` und schrieb einen Commit „x" in den geteilten Arbeitsbaum. Vierte Begegnung mit
   dieser Klasse (19.09., zweimal in derselben Nacht, dieser Vorfall).

   HINWEIS ZUM QUELLTEXT DIESER DATEI: die Rot-Beweise unten bauen ihre Fixture-Strings aus zusammengesetzten
   Teilen (`'exec' + 'FileSync'`, `'cwd' + ': fremd'`), NICHT weil der Wortlaut sonst falsch wäre, sondern weil
   dieselbe Musterprüfung, die diese Datei testet, JEDE `.js`-Datei unter `tests/` liest — also auch sich
   selbst. Ein Fixture-String, der das gesuchte Muster ZUSAMMENHÄNGEND im eigenen Quelltext trägt, würde vom
   echten Lauf gegen den echten Bestand als eigener Fund gemeldet (geprüft, s. Git-Log dieser Zeile).

   GEMESSEN, BEVOR VERDRAHTET WURDE (dieselbe Reihenfolge wie beim Kampagne-Gate): `node
   tools/git-umgebung-pruefen.js` läuft gegen die eingecheckte Grundlinie grün (Exit 0) — aber die Grundlinie
   selbst führt 35 benannte, akzeptierte Stellen in drei Schweregraden (keine Summe, zwei Achsen wie beim
   Invarianten-Register): `ungeschuetzt` (3, fremdes/fabriziertes cwd ohne env — die gefährliche Klasse),
   `roherEnvSpreadMitGit` (0), `repoOhneEnv` (32, laut Kopfkommentar des Wächters selbst ungefährlich, `cwd:
   REPO` beantwortet dieselbe Frage ob env gesetzt ist oder nicht). Diese Datei verdrahtet NUR den bereits
   grünen, bereits begründeten Zustand als Gate — sie repariert nichts an der Grundlinie selbst.

   NACHMESSUNG DER ANNAHME „LATENT" (22.09.2026, derselbe Auftrag): die Grundlinie begründet alle drei
   `ungeschuetzt`-Einträge mit „latent, nicht über die Suite erreichbar". Das stimmt heute nicht mehr für
   mindestens zwei der drei — `tests/gitignoriert-pruefen.test.js` ist selbst eine vom `npm test`-Glob erfasste
   Datei, und `tools/krypto-block-propagation-pruefen.js`s `dateienListen()` wird aus
   `tests/krypto-block-propagation.test.js` dutzendfach mit einem fabrizierten `fs.mkdtempSync`-Verzeichnis
   aufgerufen (`pruefe(fixture())`). Beide laufen also in JEDEM `npm test` — nur ungefährlich, WEIL `GIT_DIR`
   am Terminal leer ist; erst unter einem echten Hook-Lauf wird es scharf, exakt wie beim Marketing-Vorfall.
   Diese Datei ändert daran nichts (das ist ein eigener Fund, kein Bau-Auftrag an sich selbst) — sie hält nur
   fest, dass eine NEUE, vierte Stelle dieser Klasse ab sofort auffällt, bevor sie schadet.
   ═════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/git-umgebung-pruefen.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE_PFAD = path.join(REPO, 'tools', 'git-umgebung-grundlinie.json');
const echteGrundlinie = () => JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));

/* ── 1 · das GATE selbst: der echte Bestand hält die Grundlinie ─────────────────────────────── */

test('[Git-Umgebung·Gate] der echte Bestand (tests/, tools/, scripts/) weicht nicht von der Grundlinie ab', () => {
  const wurzeln = ['tests', 'tools', 'scripts'].map((n) => path.join(REPO, n)).filter((p) => fs.existsSync(p));
  const r = W.pruefe(wurzeln, echteGrundlinie());
  const rot = r.neu.length + r.grundlinieZuGross.length + r.verschwunden.length
    + r.spreadNeu.length + r.spreadGrundlinieZuGross.length + r.spreadVerschwunden.length
    + r.repoNeu.length + r.repoGrundlinieZuGross.length + r.repoVerschwunden.length;
  const bericht = () => JSON.stringify({
    neu: r.neu, grundlinieZuGross: r.grundlinieZuGross, verschwunden: r.verschwunden,
    spreadNeu: r.spreadNeu, spreadGrundlinieZuGross: r.spreadGrundlinieZuGross, spreadVerschwunden: r.spreadVerschwunden,
    repoNeu: r.repoNeu, repoGrundlinieZuGross: r.repoGrundlinieZuGross, repoVerschwunden: r.repoVerschwunden,
  }, null, 1);
  assert.equal(rot, 0, 'eine neue oder veraltete git-Umgebungs-Fundstelle — Nachziehen: node tools/git-umgebung-pruefen.js, dann Grundlinie anpassen. ' + bericht());
});

test('[Git-Umgebung·Nachgemessen] `ungeschuetzt` ist auf 0 repariert (22.09.2026) — die drei Stellen von Anfang 09. waren nicht mehr latent und trugen env: ohneGitUmgebung()', () => {
  assert.deepEqual(echteGrundlinie().ungeschuetzt, [], 'Rückfall: die Kategorie darf nur bei einem NEUEN, benannten Fund wieder wachsen, nie durch Vergessen der Reparatur');
});

test('[Git-Umgebung·Positivkontrolle] die 32 `repoOhneEnv`-Dateien tragen wirklich eine Fundstelle — die Grundlinie ist kein Leerlauf', () => {
  const g = echteGrundlinie();
  assert.ok(g.repoOhneEnv.length >= 1, 'Vorbedingung: die Grundlinie führt mindestens eine akzeptierte Stelle');
  for (const rel of g.repoOhneEnv) {
    const abs = path.join(REPO, rel);
    assert.ok(fs.existsSync(abs), rel + ' aus der Grundlinie existiert nicht mehr — Eintrag gehört heraus');
    assert.ok(W.repoAufrufeOhneEnvInDatei(abs).length > 0, rel + ' trägt heute KEINE cwd:REPO-ohne-env-Stelle mehr — Eintrag gehört heraus (repoGrundlinieZuGross)');
  }
});

/* ── 2 · der WÄCHTER selbst: Rot-Beweis an einer erfundenen Fixture, unabhängig vom echten Bestand ─── */

function tmpWurzel() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'git-umgebung-pruefen-'));
  fs.mkdirSync(path.join(d, 'tests'), { recursive: true });
  return d;
}

/* Zusammengesetzt aus Teilstrings (s. Kopfkommentar): der echte Lauf dieses Wächters gegen den echten Bestand
   darf im QUELLTEXT dieser Datei kein Muster finden — nur in den Dateien, die die Tests selbst erzeugen. */
const AUFRUF = 'exec' + 'FileSync';
const CWD_FREMD = 'cwd' + ': fremderOrdner';
const ENV_OK = 'env: ' + 'ohneGitUmgebung()';

test('[Git-Umgebung·Rot-Beweis] eine neue, nicht in der Grundlinie stehende Datei mit fremdem cwd ohne env wird gefunden', () => {
  const wurzel = tmpWurzel();
  try {
    fs.writeFileSync(path.join(wurzel, 'tests', 'erfunden.test.js'),
      `const { ${AUFRUF} } = require('node:child_process');\n`
      + `${AUFRUF}('git', ['commit', '-m', 'x'], { ${CWD_FREMD} });\n`);
    const r = W.pruefe([path.join(wurzel, 'tests')], { ungeschuetzt: [], roherEnvSpreadMitGit: [], repoOhneEnv: [] });
    assert.deepEqual(r.neu, ['tests/erfunden.test.js']);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[Git-Umgebung·Rot-Beweis] dieselbe Datei MIT env-Option ist kein Fund — Gegenprobe, damit „findet den Fehler" von „findet alles" zu unterscheiden ist', () => {
  const wurzel = tmpWurzel();
  try {
    fs.writeFileSync(path.join(wurzel, 'tests', 'sauber.test.js'),
      `const { ${AUFRUF} } = require('node:child_process');\n`
      + `${AUFRUF}('git', ['commit', '-m', 'x'], { ${CWD_FREMD}, ${ENV_OK} });\n`);
    const r = W.pruefe([path.join(wurzel, 'tests')], { ungeschuetzt: [], roherEnvSpreadMitGit: [], repoOhneEnv: [] });
    assert.deepEqual(r.neu, []);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[Git-Umgebung·Rot-Beweis] eine Grundlinien-Zeile, deren Datei die Fundstelle verloren hat, wird als `grundlinieZuGross` gemeldet — kein stilles Weiterführen', () => {
  const wurzel = tmpWurzel();
  try {
    fs.writeFileSync(path.join(wurzel, 'tests', 'behoben.test.js'),
      `const { ${AUFRUF} } = require('node:child_process');\n`
      + `${AUFRUF}('git', ['status'], { ${CWD_FREMD}, ${ENV_OK} });\n`);
    const r = W.pruefe([path.join(wurzel, 'tests')], { ungeschuetzt: ['tests/behoben.test.js'], roherEnvSpreadMitGit: [], repoOhneEnv: [] });
    assert.deepEqual(r.grundlinieZuGross, ['tests/behoben.test.js']);
    assert.deepEqual(r.neu, []);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[Git-Umgebung·Rot-Beweis] eine Grundlinien-Zeile ohne zugehörige Datei zeigt ins Leere', () => {
  const wurzel = tmpWurzel();
  try {
    const r = W.pruefe([path.join(wurzel, 'tests')], { ungeschuetzt: ['tests/gibt-es-nicht.test.js'], roherEnvSpreadMitGit: [], repoOhneEnv: [] });
    assert.deepEqual(r.verschwunden, ['tests/gibt-es-nicht.test.js']);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[Git-Umgebung·Rot-Beweis] ein roher `{ ...process.env, GIT_…: … }`-Spread wird unabhängig von der cwd/-C-Form erkannt', () => {
  const wurzel = tmpWurzel();
  try {
    const spread = '{ ...' + 'process' + ".env, " + 'GIT_' + "DIR: '/tmp/x' }";
    fs.writeFileSync(path.join(wurzel, 'tests', 'spread.test.js'), `const hookUmgebung = ${spread};\n`);
    const r = W.pruefe([path.join(wurzel, 'tests')], { ungeschuetzt: [], roherEnvSpreadMitGit: [], repoOhneEnv: [] });
    assert.deepEqual(r.spreadNeu, ['tests/spread.test.js']);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});

test('[Git-Umgebung·Rot-Beweis] `cwd: REPO` ohne env-Option wird als dritte, eigene Ratsche erkannt (repoOhneEnv)', () => {
  const wurzel = tmpWurzel();
  try {
    const cwdRepo = 'cwd' + ": path.join(__dirname, '..')";
    fs.writeFileSync(path.join(wurzel, 'tests', 'repo-ohne-env.test.js'),
      `const { ${AUFRUF} } = require('node:child_process');\n`
      + "const path = require('node:path');\n"
      + `${AUFRUF}('git', ['status'], { ${cwdRepo} });\n`);
    const r = W.pruefe([path.join(wurzel, 'tests')], { ungeschuetzt: [], roherEnvSpreadMitGit: [], repoOhneEnv: [] });
    assert.deepEqual(r.repoNeu, ['tests/repo-ohne-env.test.js']);
  } finally { fs.rmSync(wurzel, { recursive: true, force: true }); }
});
