'use strict';
/* ════════════════════════════════════════════════════════════════════════
   tools/adr-praefix-ratsche-pruefen.js — Rot-Beweis der Ratsche (17.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Drei Auflagen aus dem Auftrag (Folgeauftrag zur Messung
   `adr-nummern-ohne-praefix-messung-2026-09-17.md`, VDM2/-89):
   1. VDM2s Muster übernehmen, NICHT neu erfinden — samt ihrer eigenen,
      bereits gefundenen Case-Falle als eigene Probe hier unten, nicht nur
      gelesen.
   2. Roter Beweis in beide Richtungen: „ADR-039" abgewiesen, „U2-ADR-039"
      durchgelassen — UND der bestehende Bestand macht den Wächter nicht rot.
   3. Ein echter Alt-Bezug bleibt schreibbar: `B16-ADR-NNN` (U2-ADR-090 §2,
      bereits bestehende Form) geht durch, ohne Sonderweg.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { neueFunde, treffer, musterNeu, basisFuer, istAusgenommen, FIXTURE } = require('../tools/adr-praefix-ratsche-pruefen.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'adr-praefix-ratsche-pruefen.js');
const diff = (datei, zeilen) => `diff --git a/${datei} b/${datei}\n--- a/${datei}\n+++ b/${datei}\n@@ -1,0 +1,${zeilen.length} @@\n` + zeilen.join('\n') + '\n';

/* ── Auflage 1: VDM2s Muster, samt ihrer eigenen Case-Falle ─────────────── */

test('[ADR-Ratsche·Rot-Beweis] Fixture: genau die gepflanzte neue präfixlose Zeile ist rot', () => {
  const f = neueFunde(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(f.map((x) => `${x.datei}:${x.zeile}`), ['tools/beispiel-werkzeug.js:11']);
  assert.deepEqual(f[0].treffer, ['ADR-39']);
  assert.throws(() => execFileSync('node', [WERKZEUG], { stdio: 'pipe' }), (e) => e.status === 1);
});

test('[ADR-Ratsche] die Case-Falle aus VDM2s erstem Anlauf: eine NEUE Zeile mit `u2-adr-333` '
  + '(Dateinamens-Kleinschreibung) bleibt grün — eine case-sensitive Fassung ohne `i`-Flag hätte '
  + 'hier fälschlich rot gemeldet', () => {
  // Genau der reale Fall, der VDM2 zuerst täuschte: tests/textsatz-dokumentmodule-u2-adr-333.test.js.
  assert.deepEqual(treffer('s. tests/textsatz-dokumentmodule-u2-adr-333.test.js'), []);
  assert.deepEqual(neueFunde(diff('tests/beispiel.test.js',
    ['+// Bezug: tests/textsatz-dokumentmodule-u2-adr-333.test.js'])), []);
  // Gegenprobe, damit dieser Test nicht nur „nichts gefunden" durch einen anderen Fehler zeigt:
  // das GLEICHE Muster erkennt eine wirkliche Großschreibung an derselben Stelle als Präfix.
  assert.deepEqual(treffer('s. U2-ADR-333 im Fließtext'), []);
  assert.deepEqual(treffer('s. u2-Adr-333 gemischt geschrieben'), []);
});

test('[ADR-Ratsche] das Muster selbst trägt das `i`-Flag auf dem GANZEN Ausdruck, nicht nur auf '
  + 'einem Teil — sonst deckt es die Lookbehinds nicht mit ab (JS-Semantik)', () => {
  const m = musterNeu();
  assert.ok(m.flags.includes('i'), 'i-Flag muss gesetzt sein, sonst schlägt die Case-Falle wieder zu');
  assert.ok(m.global, 'g-Flag für wiederholtes exec() in derselben Zeile');
});

/* ── Auflage 2: rot/grün in beide Richtungen, Bestand bleibt unberührt ──── */

test('[ADR-Ratsche·Rot-Beweis] eine NEUE Zeile mit „ADR-039" wird abgewiesen, dieselbe Zeile mit '
  + '„U2-ADR-039" geht durch', () => {
  assert.equal(neueFunde(diff('tools/probe.js', ['+// s. ADR-039 für den Hintergrund.'])).length, 1);
  assert.deepEqual(neueFunde(diff('tools/probe.js', ['+// s. U2-ADR-039 für den Hintergrund.'])), []);
});

test('[ADR-Ratsche] Bestand bleibt grün: unberührt, verschoben oder nur eingerückt', () => {
  const alt = 'Erfunden: Bezug s. ADR-070, alte Fundstelle.';
  const verschoben = `diff --git a/docs/adr/x.md b/docs/adr/x.md\n--- a/docs/adr/x.md\n+++ b/docs/adr/x.md\n@@ -3 +3 @@\n-${alt}\n+  ${alt}\n`;
  assert.deepEqual(neueFunde(verschoben), [], 'nur eingerückt: kein Zuwachs');
  assert.deepEqual(neueFunde(diff('docs/adr/x.md', ['+Erfunden: eine saubere neue Zeile ohne jede ADR-Nummer.'])), []);
});

test('[ADR-Ratsche] geänderte Zeile mit Altstelle bleibt grün; eine ZUSÄTZLICHE präfixlose '
  + 'Nummer darin wird rot', () => {
  const alt = 'Bezug: ADR-070, s. tests/alt-name.test.js';
  const umbenannt = 'Bezug: ADR-070, s. tests/neuer-name.test.js';
  const zusaetzlich = 'Bezug: ADR-070, s. tests/neuer-name.test.js — und dazu ADR-071.';
  const d = (plus) => `diff --git a/tools/p.js b/tools/p.js\n--- a/tools/p.js\n+++ b/tools/p.js\n@@ -3 +3 @@\n-${alt}\n+${plus}\n`;
  assert.deepEqual(neueFunde(d(umbenannt)), [], 'Altstelle nur umbenannt: grün');
  assert.equal(neueFunde(d(zusaetzlich)).length, 1, 'zusätzliche präfixlose Nummer: rot');
});

/* ── Auflage 3: ein echter Alt-Bezug bleibt schreibbar, ohne Sonderweg ──── */

test('[ADR-Ratsche] `B16-ADR-NNN` (U2-ADR-090 §2, bereits bestehende Form für einen echten '
  + 'Alt-Bezug) geht als NEUE Zeile durch das Muster — nichts Zusätzliches nötig', () => {
  assert.deepEqual(treffer('B16-ADR-015'), []);
  assert.deepEqual(treffer('s. b16-adr-015, kleingeschrieben'), []);
  assert.deepEqual(neueFunde(diff('tests/beispiel.test.js',
    ['+// echter Alt-Bezug, benannt: s. B16-ADR-015.'])), []);
  // Gegenprobe direkt daneben: dieselbe Zeile OHNE das B16-Präfix ist rot — der Unterschied
  // liegt am Präfix, nicht an einer zufälligen Eigenschaft dieser einen Zeile.
  assert.equal(neueFunde(diff('tests/beispiel.test.js',
    ['+// Alt-Bezug ohne Präfix geschrieben: s. ADR-015.'])).length, 1);
});

/* ── Der Wächter selbst, seine Rot-Beweise und sein Fixture bleiben von sich selbst
   ausgenommen (GEMESSEN, nicht vermutet: ohne diese Ausnahme meldete der eigene
   --arbeitsstand-Lauf sich selbst rot, sobald diese drei Pfade committet sind — ihre
   Beispielzeilen SCHREIBEN absichtlich "ADR-039" & Co. als Zeichenkette). Wörtlicher
   Spiegel der Ausnahmeliste des Vorbilds für dessen eigenen Wächter/Test/Fixture. ── */

test('[ADR-Ratsche] der Wächter selbst, sein Test und sein Fixture sind ausgenommen — '
  + 'eine andere Datei mit demselben Inhalt bleibt geprüft', () => {
  assert.equal(istAusgenommen('tools/adr-praefix-ratsche-pruefen.js'), true);
  assert.equal(istAusgenommen('tests/adr-praefix-ratsche-pruefen.test.js'), true);
  assert.equal(istAusgenommen('tests/fixtures/adr-praefix-ratsche/push.diff'), true);
  assert.equal(istAusgenommen('tools/irgendein-anderes-werkzeug.js'), false);
  assert.deepEqual(neueFunde(diff('tools/adr-praefix-ratsche-pruefen.js',
    ['+// Beispiel im Kopfkommentar: s. ADR-039.'])), [], 'der Wächter selbst bleibt grün');
  assert.equal(neueFunde(diff('tools/irgendein-anderes-werkzeug.js',
    ['+// Beispiel: s. ADR-039.'])).length, 1, 'dieselbe Zeile anderswo bleibt rot');
});

test('[ADR-Ratsche·Rot-Beweis] ein Dateipfad ist kein ADR-Verweis — „ADR-263" ohne Präfix in einem Ratschen-Eintrag bleibt rot, derselbe Name als Pfad nicht', () => {
  const eintrag = 'tools/befund-ratsche-eintraege/probe.json';
  assert.equal(neueFunde(diff(eintrag, ['+ "notiz": "s. ADR-263",'])).length, 1, 'eine präfixlose Nummer außerhalb eines Pfads bleibt rot, auch im Ratschen-Eintrag');
  assert.deepEqual(neueFunde(diff(eintrag, ['+ "probe": "tests/adr-263-pdf-schriftdeckung.test.js",'])), [], 'der Pfad einer bestehenden Testdatei ist kein Verweis');
  assert.deepEqual(neueFunde(diff('docs/irgendwas.md', ['+Probe: `tests/adr-263-pdf-schriftdeckung.test.js`, s. auch docs/adr-alt/adr-12.md.'])), [], 'überall, nicht nur im Eintrag');
  assert.equal(neueFunde(diff('docs/irgendwas.md', ['+Datei adr-263-notiz.test.js ohne Schrägstrich'])).length, 1, 'ohne „/" ist es kein Pfad — bleibt rot');
});

/* ── Wie beim Vorbild: --arbeitsstand als Teil der Suite (indirekte pre-commit-Deckung) ── */

test('[ADR-Ratsche] --arbeitsstand: der Arbeitsbaum fügt gegen den Vorfahren mit origin/u2-kanon '
  + 'keine neue präfixlose ADR-Nummer hinzu', () => {
  const aus = execFileSync('node', [WERKZEUG, '--arbeitsstand'], { encoding: 'utf8' });
  assert.match(aus, /grün/);
});

test('[ADR-Ratsche·Rot-Beweis] --arbeitsstand sieht eine neue präfixlose Nummer im Index (Lage '
  + 'wie im pre-commit)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-ratsche-arbeitsstand-'));
  // GIT_* gestrippt (19.09.2026, Fund HOCH): ohne diese Bereinigung committet
  // dieser Aufruf im Hook-Lauf nicht in `tmp`, sondern ins echte Repo — genau der Fund,
  // der einen Commit „a" von diesem Test ins gemeinsame Repo brachte.
  const g = (...a) => execFileSync('git', a, { cwd: tmp, encoding: 'utf8', env: ohneGitUmgebung() }).trim();
  const lauf = (...a) => { try { execFileSync('node', [WERKZEUG, ...a], { cwd: tmp, stdio: 'pipe' }); return 0; } catch (e) { return e.status; } };
  try {
    g('init', '-q'); g('config', 'user.email', 'probe@example.invalid'); g('config', 'user.name', 'Probe');
    fs.mkdirSync(path.join(tmp, 'tools'));
    fs.writeFileSync(path.join(tmp, 'tools/a.js'), '// sauber\n');
    g('add', '-A'); g('commit', '-q', '-m', 'a');
    g('update-ref', 'refs/remotes/origin/u2-kanon', 'HEAD');
    fs.writeFileSync(path.join(tmp, 'tools/b.js'), '// neu, präfixlos: s. ADR-041\n');
    g('add', '-A');
    assert.equal(lauf('--arbeitsstand', '--wurzel', tmp), 1, 'neue präfixlose Nummer im Index: rot');
    fs.writeFileSync(path.join(tmp, 'tools/b.js'), '// neu, sauber: s. U2-ADR-041\n');
    g('add', '-A');
    assert.equal(lauf('--arbeitsstand', '--wurzel', tmp), 0, 'Fix im Index: grün');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[ADR-Ratsche] Basis nach einem Rebase: alter Remote-Stand kein Vorfahr → Vorfahr mit dem Kanon', () => {
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8', cwd: path.join(__dirname, '..') }).trim();
  const kopf = git('rev-parse', 'HEAD');
  const vorfahr = git('merge-base', 'HEAD', 'origin/u2-kanon');
  assert.equal(basisFuer(kopf, vorfahr), vorfahr, 'normaler Push: Remote-Stand ist Vorfahr und bleibt Basis');
  const fremd = 'f'.repeat(40);
  assert.equal(basisFuer(kopf, fremd), vorfahr, 'Rebase: fremder Remote-Stand wird durch den Vorfahr mit dem Kanon ersetzt');
});
