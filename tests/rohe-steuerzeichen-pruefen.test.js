'use strict';
/* ════════════════════════════════════════════════════════════════════════
   tools/rohe-steuerzeichen-pruefen.js — Rot-Beweis der Ratsche (17.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Auflagen aus dem Auftrag (Folgeauftrag zur Messung
   rohe-steuerzeichen-getrackte-dateien-2026-09-17.md):
   1. Wächter prüft Codepunkte, nicht git's Binärflagge — roter Beweis: ein
      rohes 0x1f in einer neuen Zeile wird abgewiesen, \x1f geht durch, UND
      eine Datei, die git wegen eines rohen NUL als „binär" unterdrückt,
      bleibt trotzdem geprüft (`git diff -a`).
   2. Die namentlichen Ausnahmen (3 .vivodepot-Fixtures, 10 BMJ-Fixtures,
      1 Fuzzing-Payload) bleiben grün — Gegenprobe: dieselbe Zeile in einer
      NICHT ausgenommenen Datei bleibt rot.
   3. Bestand bleibt grün: unberührt, verschoben oder nur eingerückt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { execFileSync } = require('node:child_process');
const {
  neueFunde, treffer, istRohesSteuerzeichen, istAusgenommen, basisFuer, AUSNAHMEN, FIXTURE,
} = require('../tools/rohe-steuerzeichen-pruefen.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'rohe-steuerzeichen-pruefen.js');
const US = String.fromCharCode(0x1f);
const NUL = String.fromCharCode(0x00);
const diff = (datei, zeilen) => `diff --git a/${datei} b/${datei}\n--- a/${datei}\n+++ b/${datei}\n@@ -1,0 +1,${zeilen.length} @@\n` + zeilen.join('\n') + '\n';

/* ── Auflage 1: Codepunkte, nicht git's Binärflagge ─────────────────────── */

test('[Steuerzeichen-Ratsche·Rot-Beweis] Fixture: genau die gepflanzte neue Zeile mit rohem Byte ist rot', () => {
  const f = neueFunde(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(f.map((x) => `${x.datei}:${x.zeile}`), ['tools/beispiel-werkzeug.js:11']);
  assert.deepEqual(f[0].treffer, ['U+001F']);
  assert.throws(() => execFileSync('node', [WERKZEUG], { stdio: 'pipe' }), (e) => e.status === 1);
});

test('[Steuerzeichen-Ratsche·Rot-Beweis] eine NEUE Zeile mit rohem 0x1f wird abgewiesen, dieselbe Zeile mit \\x1f geht durch', () => {
  assert.equal(neueFunde(diff('tools/probe.js', ['+const k = a + \'' + US + '\' + b;'])).length, 1);
  assert.deepEqual(neueFunde(diff('tools/probe.js', ["+const k = a + '\\x1f' + b;"])), []);
});

test('[Steuerzeichen-Ratsche] die Erkennung arbeitet auf DEKODIERTEN CODEPUNKTEN, nicht auf rohen Bytes — '
  + 'ein UTF-8-Mehrbyte-Zeichen (Umlaut/Gedankenstrich) ist KEIN Fund (die erste, verworfene Messung selbst '
  + 'prüfte rohe Bytes und verwechselte UTF-8-Folgebytes 0x80–0xBF mit C1-Steuerzeichen)', () => {
  assert.deepEqual(treffer('ä ö ü ß — „Anführung"'), []);
  assert.deepEqual(neueFunde(diff('docs/probe.md', ['+Ein Satz mit Umlauten äöü und einem Gedankenstrich —.'])), []);
});

test('[Steuerzeichen-Ratsche] Tab, LF, CR sind KEIN Fund — gewöhnlicher Zeilenumbruch/Einzug, kein Steuerzeichen-Fund', () => {
  assert.equal(istRohesSteuerzeichen(0x09), false);
  assert.equal(istRohesSteuerzeichen(0x0a), false);
  assert.equal(istRohesSteuerzeichen(0x0d), false);
  assert.deepEqual(treffer('\teingerückt'), []);
});

test('[Steuerzeichen-Ratsche] C0 (außer Tab/LF/CR) und C1 sind ein Fund — derselbe Bereich wie die Messung; '
  + 'DEL (0x7f) ist ausdrücklich NICHT Teil der Messung und darum auch nicht hier', () => {
  assert.equal(istRohesSteuerzeichen(0x00), true);
  assert.equal(istRohesSteuerzeichen(0x1f), true);
  assert.equal(istRohesSteuerzeichen(0x80), true);
  assert.equal(istRohesSteuerzeichen(0x9f), true);
  assert.equal(istRohesSteuerzeichen(0x7f), false, 'DEL: nicht Teil des gemessenen Bereichs, kein Fund');
  assert.equal(istRohesSteuerzeichen(0x20), false, 'Leerzeichen: kein Steuerzeichen');
});

test('[Steuerzeichen-Ratsche] eine Datei, die git wegen eines rohen NUL als binär unterdrückt, bleibt trotzdem '
  + 'geprüft — `git diff -a` erzwingt den Text-Diff, den git sonst wegschweigt', () => {
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'steuerzeichen-binaer-'));
  const g = (...a) => execFileSync('git', a, { cwd: tmp, env: ohneGitUmgebung(), encoding: 'utf8' }).trim();
  const lauf = (...a) => { try { execFileSync('node', [WERKZEUG, ...a], { cwd: tmp, env: ohneGitUmgebung(), stdio: 'pipe' }); return { rc: 0, aus: '' }; } catch (e) { return { rc: e.status, aus: (e.stdout || '') + (e.stderr || '') }; } };
  try {
    g('init', '-q'); g('config', 'user.email', 'probe@example.invalid'); g('config', 'user.name', 'Probe');
    fs.mkdirSync(path.join(tmp, 'tools'));
    fs.writeFileSync(path.join(tmp, 'tools/a.js'), '// sauber\n');
    g('add', '-A'); g('commit', '-q', '-m', 'a');
    g('update-ref', 'refs/remotes/origin/u2-kanon', 'HEAD');
    // Ein rohes NUL in einer neuen Zeile — genau der Fund, den git-eigene Binär-Erkennung sonst
    // verdeckt (kein Diff, „Binary files … differ"). Committet, nicht nur gestaged — sonst
    // zeigt HEAD noch den alten Stand, und die Vorbedingung unten prüfte gar nichts.
    fs.writeFileSync(path.join(tmp, 'tools/a.js'), '// sauber\nconst k = a + \'' + NUL + '\' + b;\n');
    g('add', '-A'); g('commit', '-q', '-m', 'b');
    // Vorbedingung: git selbst würde diese Datei ohne -a als binär melden (Positivkontrolle,
    // daß der Testaufbau die reale Falle nachbildet, nicht nur behauptet).
    const echterGitDiff = execFileSync('git', ['diff', '--no-color', 'origin/u2-kanon', 'HEAD'], { cwd: tmp, env: ohneGitUmgebung(), encoding: 'utf8' });
    assert.match(echterGitDiff, /Binary files? .* differ/, 'Vorbedingung: git selbst hält die Datei ohne -a für binär');
    // Und jetzt der eigentliche Beweis: DER WÄCHTER sieht die Zeile trotzdem, dank `-a`.
    const bereich = lauf('--bereich', 'origin/u2-kanon..HEAD', '--wurzel', tmp);
    assert.equal(bereich.rc, 1, 'der Wächter muss die von git verdeckte Zeile trotzdem finden: ' + bereich.aus);
    assert.match(bereich.aus, /U\+0000/, 'der gefundene Codepunkt muss das NUL sein');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

/* ── Auflage 2: namentliche Ausnahmen, mit eigenem Grund je Eintrag ──────── */

test('[Steuerzeichen-Ratsche] alle namentlichen Ausnahmen sind einzeln benannt, mit eigenem Grund — '
  + 'keine Endungs- oder Ordner-Pauschale (14 aus dem Meßbericht + die eigene Fixture dieses Wächters)', () => {
  assert.equal(AUSNAHMEN.size, 15);
  for (const [datei, grund] of AUSNAHMEN) {
    assert.equal(typeof grund, 'string', datei + ': Grund fehlt');
    assert.ok(grund.trim().length > 10, datei + ': Grund zu kurz, um ein echter Grund zu sein');
  }
});

test('[Steuerzeichen-Ratsche] die drei .vivodepot-Fixtures (Magic-Byte-Header, U2-ADR-043) bleiben grün', () => {
  for (const datei of [
    'tests/fixtures/v515-ohne-auszuege/depot-v515-ohne-auszuege.vivodepot',
    'tests/fixtures/vorfuehrung-zugang-zum-recht/demo-de.vivodepot',
    'tests/fixtures/vorfuehrung-zugang-zum-recht/demo-en.vivodepot',
  ]) {
    assert.equal(istAusgenommen(datei), true, datei);
  }
});

test('[Steuerzeichen-Ratsche] die zehn BMJ/PDF-Extraktions-Fixtures bleiben grün — UND ihr Grund nennt '
  + 'die Unsicherheit ausdrücklich („NICHT gegen die Original-PDF geprüft"), nicht als geklärt geführt', () => {
  const bmjDateien = [
    'docs/template-generator/basistemplate-inhalte.json',
    'tests/fixtures/vor-umzug-a4-standard-vorlagen.json',
    'tests/fixtures/render-aufnahme/befuellt__advanceCare.html',
    'tests/fixtures/render-aufnahme/leer__advanceCare.html',
    'tests/fixtures/v515-grundlinie/befuellt__vorsorge.html',
    'tests/fixtures/v515-grundlinie/leer__vorsorge.html',
    'tests/fixtures/bmj/betreuungsverfuegung-deutsch-englisch.txt',
    'tests/fixtures/bmj/organspendeausweis-bzga-stream.txt',
    'tests/fixtures/bmj/patientenverfuegung-textbausteine.txt',
    'tests/fixtures/bmj/vorsorgevollmacht-deutsch-englisch.txt',
  ];
  assert.equal(bmjDateien.length, 10);
  for (const datei of bmjDateien) {
    assert.equal(istAusgenommen(datei), true, datei);
    assert.match(AUSNAHMEN.get(datei), /NICHT gegen die Original-PDF geprüft/, datei + ': Unsicherheit muss im Grund stehen');
  }
});

test('[Steuerzeichen-Ratsche] der Fuzzing-Payload bleibt grün, dieselbe Zeile in einer ANDEREN Datei bleibt rot', () => {
  assert.equal(istAusgenommen('tests/g3-fuzzing-importparser.test.js'), true);
  assert.deepEqual(neueFunde(diff('tests/g3-fuzzing-importparser.test.js', ["+const x = '" + NUL + "binärmüll';"])), []);
  assert.equal(neueFunde(diff('tests/irgendein-anderer-test.test.js', ["+const x = '" + NUL + "binärmüll';"])).length, 1,
    'dieselbe Zeile anderswo bleibt rot — die Ausnahme ist an den Dateinamen gebunden, nicht an den Inhalt');
});

/* ── Auflage 3: Bestand bleibt grün ──────────────────────────────────────── */

test('[Steuerzeichen-Ratsche] Bestand bleibt grün: unberührt, verschoben oder nur eingerückt', () => {
  const alt = 'Erfunden: Altstelle mit rohem Byte: x.' + US + 'y, alte Fundstelle.';
  const verschoben = `diff --git a/docs/adr/x.md b/docs/adr/x.md\n--- a/docs/adr/x.md\n+++ b/docs/adr/x.md\n@@ -3 +3 @@\n-${alt}\n+  ${alt}\n`;
  assert.deepEqual(neueFunde(verschoben), [], 'nur eingerückt: kein Zuwachs');
  assert.deepEqual(neueFunde(diff('docs/adr/x.md', ['+Erfunden: eine saubere neue Zeile ohne jedes Steuerzeichen.'])), []);
});

test('[Steuerzeichen-Ratsche] geänderte Zeile mit Altstelle bleibt grün; ein ZUSÄTZLICHES rohes Byte darin wird rot', () => {
  const alt = 'Bezug: x.' + US + 'y, s. tests/alt-name.test.js';
  const umbenannt = 'Bezug: x.' + US + 'y, s. tests/neuer-name.test.js';
  const zusaetzlich = 'Bezug: x.' + US + 'y, s. tests/neuer-name.test.js' + US;
  const d = (plus) => `diff --git a/tools/p.js b/tools/p.js\n--- a/tools/p.js\n+++ b/tools/p.js\n@@ -3 +3 @@\n-${alt}\n+${plus}\n`;
  assert.deepEqual(neueFunde(d(umbenannt)), [], 'Altstelle nur umbenannt: grün');
  assert.equal(neueFunde(d(zusaetzlich)).length, 1, 'zusätzliches rohes Byte: rot');
});

/* ── Wie bei den Vorbildern: --arbeitsstand als Teil der Suite (indirekte pre-commit-Deckung) ── */

test('[Steuerzeichen-Ratsche] --arbeitsstand: der Arbeitsbaum fügt gegen den Vorfahren mit origin/u2-kanon '
  + 'keine neue Zeile mit rohem Steuerzeichen hinzu', () => {
  const aus = execFileSync('node', [WERKZEUG, '--arbeitsstand'], { encoding: 'utf8' });
  assert.match(aus, /grün/);
});

test('[Steuerzeichen-Ratsche] Basis nach einem Rebase: alter Remote-Stand kein Vorfahr → Vorfahr mit dem Kanon', () => {
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8', cwd: path.join(__dirname, '..'), env: ohneGitUmgebung() }).trim();
  const kopf = git('rev-parse', 'HEAD');
  const vorfahr = git('merge-base', 'HEAD', 'origin/u2-kanon');
  assert.equal(basisFuer(kopf, vorfahr), vorfahr, 'normaler Push: Remote-Stand ist Vorfahr und bleibt Basis');
  const fremd = 'f'.repeat(40);
  assert.equal(basisFuer(kopf, fremd), vorfahr, 'Rebase: fremder Remote-Stand wird durch den Vorfahr mit dem Kanon ersetzt');
});
