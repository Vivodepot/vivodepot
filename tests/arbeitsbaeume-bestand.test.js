'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS)
/* ═════════════════════════════════════════════════════════════════
   tools/arbeitsbaeume-bestand.js gegen das erfundene Repo des Werkzeugs (06.11.2026): Hauptbaum und drei Arbeitsbäume
   im Temp-Ordner — gelandet und sauber, mit eigenem Commit (nicht im Ziel), unsauber.
   Je Spalte ein Fall; abraeumbar nur der gelandete, saubere Baum, nie der Hauptbaum.
   ROT-BEWEIS (letzte Probe): ein Bestand, der die Prüfung auf das Ziel oder auf Sauberkeit wegließe, machte den
   ungelandeten bzw. den unsauberen Baum abräumbar; die Probe prüft genau diese beiden Zeilen.
   Das Werkzeug ändert nichts: nach dem Lauf sind Liste, Köpfe und Status unverändert, und im Quelltext steht kein
   Entfernen.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const WERKZEUG = path.join(__dirname, '..', 'tools', 'arbeitsbaeume-bestand.js');
const B = require(WERKZEUG);

const git = (cwd, ...a) => spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8', env: ohneGitUmgebung() }).stdout;
const zeile = (zeilen, name) => zeilen.find((z) => path.basename(z.pfad) === name);

function mitFixture(fn) {
  const fx = B.fixtureAnlegen();
  try { return fn(fx); } finally { fs.rmSync(fx.wurzel, { recursive: true, force: true }); }
}

test('Bestand: jede Zeile von git worktree list, der Hauptbaum eingeschlossen, mit allen Spalten', () => mitFixture(({ haupt }) => {
  const zeilen = B.bestandLesen(haupt, {});
  const liste = git(haupt, 'worktree', 'list').split('\n').filter(Boolean);
  assert.equal(zeilen.length, liste.length);
  assert.equal(zeilen.length, 4);
  const tsv = B.alsTsv(zeilen).trimEnd().split('\n');
  assert.equal(tsv[0], B.SPALTEN.join('\t'));
  assert.equal(tsv.length, 1 + liste.length, 'eine TSV-Zeile je Arbeitsbaum');
  for (const z of tsv.slice(1)) assert.equal(z.split('\t').length, B.SPALTEN.length);
  for (const z of zeilen) {
    assert.match(z.kopf, /^[0-9a-f]{40}$/);
    assert.match(z.letzter_commit, /^\d{4}-\d\d-\d\dT/);
    assert.ok(z.kb > 0, 'du -sk gemessen');
  }
}));

test('Bestand: im_ziel, sauber, hauptbaum und abraeumbar je Baum', () => mitFixture(({ haupt }) => {
  const zeilen = B.bestandLesen(haupt, {});
  const h = zeilen.find((z) => z.hauptbaum);
  assert.equal(h.pfad, haupt);
  assert.equal(h.abraeumbar, false, 'der Hauptbaum ist nie abraeumbar');
  const gel = zeile(zeilen, 'design-gelandet');
  assert.deepEqual([gel.im_ziel, gel.sauber, gel.abraeumbar, gel.zweig], [true, true, true, 'wagen-design-gelandet-l4']);
  const off = zeile(zeilen, 'folge-offen');
  assert.deepEqual([off.im_ziel, off.sauber, off.abraeumbar], [false, true, false]);
  const uns = zeile(zeilen, 'messung-unsauber');
  assert.deepEqual([uns.im_ziel, uns.sauber, uns.abraeumbar, uns.zweig], [true, false, false, '']);
  assert.deepEqual([gel.patch_im_ziel, off.patch_im_ziel, uns.patch_im_ziel], [true, false, true]);
  const s = B.summe(zeilen);
  assert.equal(s.baeume, 4);
  assert.equal(s.patchNurInhalt, 0);
  assert.equal(s.abraeumbar, 1);
  assert.equal(s.kbAbraeumbar, gel.kb);
}));

test('Kennung aus dem Namen: Zweig vor Ordner, ohne „wagen-“, erstes Wortstück', () => {
  assert.equal(B.kennungAusName('wagen-design-g1-l4', '/x/egal'), 'design');
  assert.equal(B.kennungAusName('zug-2026-11-02-l4-B2', '/x/egal'), 'zug');
  assert.equal(B.kennungAusName('', '/x/subdepot-l4-v1042'), 'subdepot');
  assert.equal(B.kennungAusName('wagen-w6b-herkunft-l4', ''), 'w6');
  assert.equal(B.kennungAusName('', ''), '');
});

test('Aufruf: ohne Argument Fixture-Lauf mit Exit 0 und vier Zeilen, falscher Aufruf und fremde Wurzel Exit 2', () => {
  const r = spawnSync(process.execPath, [WERKZEUG], { encoding: 'utf8', env: ohneGitUmgebung() });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trimEnd().split('\n').length, 5);
  assert.match(r.stderr, /arbeitsbaeume: 4, abraeumbar \(sauber, im Ziel, kein Hauptbaum\): 1, .*\(Fixture\)/);
  assert.equal(spawnSync(process.execPath, [WERKZEUG, '--unbekannt'], { encoding: 'utf8' }).status, 2);
  const leer = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'vd-bestand-leer-'));
  try {
    assert.equal(spawnSync(process.execPath, [WERKZEUG, '--wurzel', leer, '--ohne-groesse'], { encoding: 'utf8', env: ohneGitUmgebung() }).status, 2);
  } finally { fs.rmSync(leer, { recursive: true, force: true }); }
});

test('Das Werkzeug ändert nichts: Liste, Köpfe und Status bleiben; kein Entfernen im Quelltext', () => mitFixture(({ haupt }) => {
  const vorher = git(haupt, 'worktree', 'list', '--porcelain');
  const status = B.bestandLesen(haupt, { ohneGroesse: true }).map((z) => git(z.pfad, 'status', '--porcelain'));
  const r = spawnSync(process.execPath, [WERKZEUG, '--wurzel', haupt], { encoding: 'utf8', env: ohneGitUmgebung() });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(haupt, 'worktree', 'list', '--porcelain'), vorher);
  assert.deepEqual(B.bestandLesen(haupt, { ohneGroesse: true }).map((z) => git(z.pfad, 'status', '--porcelain')), status);
  const code = fs.readFileSync(WERKZEUG, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const fixtureTeil = code.slice(code.indexOf('function fixtureAnlegen'), code.indexOf('function argsLesen'));
  const ohneFixture = code.replace(fixtureTeil, '');
  assert.doesNotMatch(ohneFixture, /'remove'|'prune'|'fetch'|'push'|rmSync|unlinkSync|rmdirSync/, 'nur das Fixture schreibt; der Bestand liest nur');
}));

test('Rot-Beweis: ohne Ziel- oder Sauberkeitsprüfung würden der ungelandete und der unsaubere Baum abräumbar', () => mitFixture(({ haupt }) => {
  const zeilen = B.bestandLesen(haupt, { ohneGroesse: true });
  const ohneZiel = zeilen.map((z) => ({ ...z, abraeumbar: !z.hauptbaum && z.sauber }));
  const ohneSauber = zeilen.map((z) => ({ ...z, abraeumbar: !z.hauptbaum && z.im_ziel }));
  assert.equal(zeile(ohneZiel, 'folge-offen').abraeumbar, true, 'die verkürzte Regel fiele auf');
  assert.equal(zeile(ohneSauber, 'messung-unsauber').abraeumbar, true, 'die verkürzte Regel fiele auf');
  assert.equal(zeile(zeilen, 'folge-offen').abraeumbar, false);
  assert.equal(zeile(zeilen, 'messung-unsauber').abraeumbar, false);
}));

test('patch_im_ziel: ein per Cherry-Pick gelandeter Commit ist inhaltsgleich im Ziel, aber nicht is-ancestor', () => mitFixture(({ haupt }) => {
  const off = zeile(B.bestandLesen(haupt, { ohneGroesse: true }), 'folge-offen');
  const env = { ...ohneGitUmgebung(), GIT_AUTHOR_NAME: 'f', GIT_AUTHOR_EMAIL: 'f@f', GIT_COMMITTER_NAME: 'f', GIT_COMMITTER_EMAIL: 'f@f' };
  fs.writeFileSync(path.join(haupt, 'z.txt'), 'z\n');   // das Ziel rückt vor, sonst ergäbe der Cherry-Pick denselben Hash
  spawnSync('git', ['-C', haupt, 'add', 'z.txt'], { env });
  spawnSync('git', ['-C', haupt, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'vor'], { env });
  const r = spawnSync('git', ['-C', haupt, '-c', 'commit.gpgsign=false', 'cherry-pick', off.kopf], { encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  spawnSync('git', ['-C', haupt, 'push', '-q', 'origin', 'u2-kanon'], { env });
  spawnSync('git', ['-C', haupt, 'fetch', '-q', 'origin'], { env });
  const nach = zeile(B.bestandLesen(haupt, { ohneGroesse: true }), 'folge-offen');
  assert.deepEqual([nach.im_ziel, nach.patch_im_ziel, nach.abraeumbar], [false, true, false], 'abraeumbar bleibt bei is-ancestor');
  assert.equal(B.summe(B.bestandLesen(haupt, { ohneGroesse: true })).patchNurInhalt, 1);
}));
