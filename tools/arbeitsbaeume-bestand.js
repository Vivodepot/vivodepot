#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   arbeitsbaeume-bestand.js — Bestandsliste aller Arbeitsbäume eines Repos, nur lesend (06.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   WOZU. Die Platte läuft voll. Wer entscheidet, welche Bäume weg können, braucht erst die Liste: je Arbeitsbaum Pfad,
   Zweig, Kopf, Datum des letzten Commits, Größe, ob der Kopf im Ziel (origin/u2-kanon) enthalten ist, ob der Baum
   sauber ist, und eine Kennung aus dem Namen. Das Werkzeug ÄNDERT NICHTS: kein Entfernen, kein Prune, kein Fetch.
   Ob ein Baum entfernt werden darf, entscheidet ein eigener Schritt mit eigenen Bedingungen, nicht diese Liste.

   AUFRUF
     node tools/arbeitsbaeume-bestand.js [--wurzel <hauptbaum> …] [--ziel <ref>] [--aus <datei.tsv>] [--ohne-groesse]
   --wurzel (mehrfach) nennt den Hauptbaum eines Repos; gelesen wird `git worktree list --porcelain`, also jede Zeile
   dieser Liste, der Hauptbaum eingeschlossen. Ohne --wurzel läuft es gegen ein erfundenes Repo mit drei Arbeitsbäumen,
   das es im Temp-Ordner anlegt und danach wieder entfernt (Fixture-Lauf, so prüft die Suite es auch ohne echte Bäume).
   --ziel überschreibt das Ziel (Vorgabe: origin/u2-kanon, sonst origin/main, sonst u2-kanon bzw. main).

   SPALTEN (TSV mit Kopfzeile, eine Zeile je Arbeitsbaum)
     pfad · zweig (leer bei losgelöstem Kopf) · kopf (volle SHA) · letzter_commit (Commit-Datum, ISO) · kb (du -sk; leer
     mit --ohne-groesse) · im_ziel (ja/nein: merge-base --is-ancestor <kopf> <ziel>) · patch_im_ziel (ja/nein: `git cherry
     <ziel> <kopf>` ohne Zeile mit „+“ — die Commits stehen inhaltsgleich im Ziel, etwa als Cherry-Pick eines Zugs) · sauber (ja/nein: `git status
     --porcelain` ohne Zeile; Bau-Ausgaben wie node_modules sind ignoriert und zählen nicht) · kennung (aus dem Zweig, sonst
     dem Ordnernamen: ohne Vorsilbe „wagen-“, das erste Wortstück) · hauptbaum (ja/nein) · abraeumbar (ja/nein).
   „abraeumbar" heißt hier nur: kein Hauptbaum, sauber und im Ziel (is-ancestor). patch_im_ziel zählt nicht hinein, die
   Spalte zeigt nur, was zusätzlich inhaltsgleich gelandet ist. Beides ist eine Obergrenze für die Summe; ob ein Baum
   wirklich weg darf (Prozess darin, Nennung, Alter), entscheidet der eigene Schritt zum Entfernen.

   EXIT. 0 = Liste geschrieben; 2 = falscher Aufruf oder Wurzel ist kein Git-Repo.
   PROBE: tests/arbeitsbaeume-bestand.test.js (mit Rot-Beweis).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const SPALTEN = ['pfad', 'zweig', 'kopf', 'letzter_commit', 'kb', 'im_ziel', 'patch_im_ziel', 'sauber', 'kennung', 'hauptbaum', 'abraeumbar'];

function git(cwd, args) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: ohneGitUmgebung() });
  return { ok: r.status === 0, out: r.stdout || '', err: (r.stderr || '').trim() };
}

function worktreesLesen(haupt) {
  const r = git(haupt, ['worktree', 'list', '--porcelain']);
  if (!r.ok) throw new Error('keine Arbeitsbaum-Liste in ' + haupt + ': ' + r.err);
  const raus = [];
  let cur = null;
  for (const z of r.out.split('\n')) {
    if (z.startsWith('worktree ')) { cur = { pfad: z.slice(9), zweig: '', kopf: '' }; raus.push(cur); }
    else if (cur && z.startsWith('HEAD ')) cur.kopf = z.slice(5);
    else if (cur && z.startsWith('branch ')) cur.zweig = z.slice(7).replace(/^refs\/heads\//, '');
  }
  return raus;
}

function zielFinden(haupt, vorgabe) {
  if (vorgabe) return vorgabe;
  for (const ref of ['origin/u2-kanon', 'origin/main', 'u2-kanon', 'main']) if (git(haupt, ['rev-parse', '--verify', '-q', ref]).ok) return ref;
  return null;
}

/* Kennung aus dem Namen: erst der Zweig, sonst der Ordner; Vorsilbe „wagen-" fällt weg, dann das erste Wortstück. */
function kennungAusName(zweig, pfad) {
  const n = String(zweig || path.basename(pfad || '')).replace(/^wagen-/, '');
  const m = n.match(/^[A-Za-z]+[0-9]*/);
  return m ? m[0].toLowerCase() : '';
}

function groesseKb(pfad) {
  const r = spawnSync('du', ['-sk', pfad], { encoding: 'utf8' });
  const m = (r.stdout || '').match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

function baumLesen(wt, haupt, ziel, opt) {
  const da = fs.existsSync(wt.pfad);
  const datum = da && wt.kopf ? git(wt.pfad, ['log', '-1', '--format=%cI', wt.kopf]) : { ok: false };
  const status = da ? git(wt.pfad, ['status', '--porcelain']) : { ok: false };
  const imZiel = ziel && wt.kopf ? git(haupt, ['merge-base', '--is-ancestor', wt.kopf, ziel]).ok : false;
  const cherry = !imZiel && ziel && wt.kopf ? git(haupt, ['cherry', ziel, wt.kopf]) : null;
  const patchImZiel = imZiel || Boolean(cherry && cherry.ok && !/^\+/m.test(cherry.out));
  const sauber = status.ok && status.out.trim() === '';
  const hauptbaum = path.resolve(wt.pfad) === path.resolve(haupt);
  return {
    pfad: wt.pfad,
    zweig: wt.zweig,
    kopf: wt.kopf,
    letzter_commit: datum.ok ? datum.out.trim() : '',
    kb: opt.ohneGroesse || !da ? null : groesseKb(wt.pfad),
    im_ziel: imZiel,
    patch_im_ziel: patchImZiel,
    sauber,
    kennung: kennungAusName(wt.zweig, wt.pfad),
    hauptbaum,
    abraeumbar: !hauptbaum && sauber && imZiel,
  };
}

function bestandLesen(haupt, opt = {}) {
  const ziel = zielFinden(haupt, opt.ziel);
  return worktreesLesen(haupt).map((wt) => baumLesen(wt, haupt, ziel, opt));
}

const jaNein = (b) => (b ? 'ja' : 'nein');
function alsTsv(zeilen) {
  return [SPALTEN.join('\t'), ...zeilen.map((z) => [z.pfad, z.zweig, z.kopf, z.letzter_commit, z.kb == null ? '' : z.kb,
    jaNein(z.im_ziel), jaNein(z.patch_im_ziel), jaNein(z.sauber), z.kennung, jaNein(z.hauptbaum), jaNein(z.abraeumbar)].join('\t'))].join('\n') + '\n';
}

function summe(zeilen) {
  const ab = zeilen.filter((z) => z.abraeumbar);
  const kb = (l) => l.reduce((s, z) => s + (z.kb || 0), 0);
  const patch = zeilen.filter((z) => !z.hauptbaum && z.sauber && z.patch_im_ziel && !z.im_ziel);
  return { baeume: zeilen.length, abraeumbar: ab.length, kbAlle: kb(zeilen), kbAbraeumbar: kb(ab), patchNurInhalt: patch.length, kbPatchNurInhalt: kb(patch) };
}

/* Fixture: ein erfundenes Repo mit Ursprung, Hauptbaum und drei Arbeitsbäumen — gelandet, ungelandet, unsauber. */
function fixtureAnlegen() {
  const wurzel = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-bestand-')));
  const env = { ...ohneGitUmgebung(), GIT_AUTHOR_NAME: 'f', GIT_AUTHOR_EMAIL: 'f@f', GIT_COMMITTER_NAME: 'f', GIT_COMMITTER_EMAIL: 'f@f' };
  const g = (cwd, ...a) => { const r = spawnSync('git', ['-C', cwd, '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8', env }); if (r.status !== 0) throw new Error('fixture: git ' + a.join(' ') + ': ' + r.stderr); };
  const haupt = path.join(wurzel, 'haupt');
  g(wurzel, 'init', '-q', '--bare', path.join(wurzel, 'origin.git'));
  g(wurzel, 'init', '-q', '-b', 'u2-kanon', haupt);
  fs.writeFileSync(path.join(haupt, 'a.txt'), 'a\n');
  g(haupt, 'add', '.'); g(haupt, 'commit', '-q', '-m', 'basis');
  g(haupt, 'remote', 'add', 'origin', path.join(wurzel, 'origin.git'));
  g(haupt, 'push', '-q', 'origin', 'u2-kanon');
  g(haupt, 'fetch', '-q', 'origin');
  const baeume = path.join(haupt, '_arbeitsbaeume');
  g(haupt, 'worktree', 'add', '-q', '-b', 'wagen-design-gelandet-l4', path.join(baeume, 'design-gelandet'), 'u2-kanon');
  g(haupt, 'worktree', 'add', '-q', '-b', 'wagen-folge-offen-l4', path.join(baeume, 'folge-offen'), 'u2-kanon');
  fs.writeFileSync(path.join(baeume, 'folge-offen', 'b.txt'), 'b\n');
  g(path.join(baeume, 'folge-offen'), 'add', '.'); g(path.join(baeume, 'folge-offen'), 'commit', '-q', '-m', 'offen');
  g(haupt, 'worktree', 'add', '-q', '--detach', path.join(baeume, 'messung-unsauber'), 'u2-kanon');
  fs.writeFileSync(path.join(baeume, 'messung-unsauber', 'c.txt'), 'c\n');
  return { wurzel, haupt };
}

function fixtureEntfernen(fx) { if (fx) fs.rmSync(fx.wurzel, { recursive: true, force: true }); }

function argsLesen(argv) {
  const o = { wurzeln: [], ziel: null, aus: null, ohneGroesse: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--wurzel' && argv[i + 1]) o.wurzeln.push(argv[++i]);
    else if (a === '--ziel' && argv[i + 1]) o.ziel = argv[++i];
    else if (a === '--aus' && argv[i + 1]) o.aus = argv[++i];
    else if (a === '--ohne-groesse') o.ohneGroesse = true;
    else return null;
  }
  return o;
}

function main(argv) {
  const o = argsLesen(argv);
  if (!o) {
    process.stderr.write('Aufruf: node tools/arbeitsbaeume-bestand.js [--wurzel <hauptbaum> …] [--ziel <ref>] [--aus <datei.tsv>] [--ohne-groesse]\n');
    return 2;
  }
  let fx = null;
  try {
    if (!o.wurzeln.length) { fx = fixtureAnlegen(); o.wurzeln = [fx.haupt]; }
    const zeilen = [];
    for (const w of o.wurzeln) {
      if (!git(w, ['rev-parse', '--git-dir']).ok) { process.stderr.write(`kein Git-Repo: ${w}\n`); return 2; }
      zeilen.push(...bestandLesen(w, o));
    }
    const tsv = alsTsv(zeilen);
    if (o.aus) fs.writeFileSync(o.aus, tsv);
    else process.stdout.write(tsv);
    const s = summe(zeilen);
    process.stderr.write(`arbeitsbaeume: ${s.baeume}, abraeumbar (sauber, im Ziel, kein Hauptbaum): ${s.abraeumbar}, `
      + `GB gesamt ${(s.kbAlle / 1048576).toFixed(2)}, GB abraeumbar ${(s.kbAbraeumbar / 1048576).toFixed(2)}; zusätzlich sauber und nur inhaltsgleich im Ziel: `
      + `${s.patchNurInhalt}, GB ${(s.kbPatchNurInhalt / 1048576).toFixed(2)}${fx ? ' (Fixture)' : ''}\n`);
    return 0;
  } finally {
    fixtureEntfernen(fx);
  }
}

module.exports = { SPALTEN, worktreesLesen, zielFinden, kennungAusName, bestandLesen, alsTsv, summe, fixtureAnlegen, fixtureEntfernen, argsLesen, main };

if (require.main === module) process.exit(main(process.argv.slice(2)));
