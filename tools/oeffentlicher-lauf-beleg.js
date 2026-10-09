#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   oeffentlicher-lauf-beleg.js — die öffentliche CI, vorher im öffentlichen Klon gefahren, als Beleg je Baum (05.10.2026)
   ─────────────────────────────────────────────────────────────────
   Am 05.10.2026 war die öffentliche CI (E2E-Reisen) an drei veröffentlichten Ständen rot. Die Proben hingen an Dateien
   und an einer Geschichte, die der öffentliche Stand nicht trägt; vor dem Übertrag hatte niemand sie dort gefahren.

   Dieses Werkzeug fährt im öffentlichen Klon dasselbe wie .github/workflows/e2e.yml — `npm test` und `npm run test:e2e`
   — und schreibt das Ergebnis als Beleg für den Baum von HEAD nach `.git/vd-oeffentlicher-lauf/<baum>.json`, mit den
   Namen der roten Proben. tools/oeffentlich-tag-signieren.js signiert den Tag nur, wenn für genau den Baum des
   Release-Commits ein Beleg vorliegt und er grün ist. Bis ein bekannter roter Stand abgearbeitet ist, kann der Aufrufer
   eine Grundliste bekannter roter Proben übergeben: dann hält jede NEUE rote Probe an.

   Vorbedingungen, sonst rot und kein Beleg: ein eigenständiger Klon (eigenes .git, kein Worktree), sauber, ohne Refs des
   privaten Repos. Der Lauf braucht `npm ci` und `npx playwright install chromium` vorher; Fremdwerkzeuge wie in der CI
   (poppler, xmllint).

   Aufruf:  node tools/oeffentlicher-lauf-beleg.js --klon <öffentlicher Klon>
   Probe:   tests/oeffentlich-tag-signieren.test.js
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const ORDNER = 'vd-oeffentlicher-lauf';

function git(klon, args, env) {
  return spawnSync('git', ['-C', klon, ...args], { encoding: 'utf8', env: env || ohneGitUmgebung() });
}

function belegPfad(klon, baum) { return path.join(klon, '.git', ORDNER, baum + '.json'); }

function belegSchreiben(klon, beleg) {
  fs.mkdirSync(path.join(klon, '.git', ORDNER), { recursive: true });
  fs.writeFileSync(belegPfad(klon, beleg.baum), JSON.stringify(beleg, null, 1) + '\n');
}

function belegLesen(klon, baum) {
  try { return JSON.parse(fs.readFileSync(belegPfad(klon, baum), 'utf8')); } catch { return null; }
}

/* Rein: die Namen der roten Proben aus der Ausgabe von `node --test` (Abschnitt „failing tests“). */
function roteUnitProben(ausgabe) {
  const t = String(ausgabe || '');
  const ab = t.indexOf('✖ failing tests:');
  if (ab < 0) return [];
  const namen = new Set();
  for (const m of t.slice(ab).matchAll(/^✖ (.+?) \([0-9.]+ms\)$/gm)) namen.add(m[1]);
  return [...namen].sort();
}

/* Rein: die roten Reisen aus dem JSON-Bericht von Playwright, als „<datei> › <titel>“. */
function roteReisen(bericht) {
  const raus = new Set();
  const gehen = (suite, datei) => {
    const d = suite.file || datei;
    for (const s of suite.specs || []) if (s.ok === false) raus.add((s.file || d) + ' › ' + s.title);
    for (const u of suite.suites || []) gehen(u, d);
  };
  for (const s of (bericht && bericht.suites) || []) gehen(s, s.file);
  return [...raus].sort();
}

/* Rein: { ok } oder { ok:false, grund }. Ohne Grundliste gilt nur grün; mit Grundliste hält jede rote Probe an, die
   nicht darin steht, und ein Abbruch ohne benannte rote Probe hält immer an. */
function laufBelegPruefen(beleg, { baum, grundliste = null } = {}) {
  if (!beleg) return { ok: false, grund: 'kein Beleg des öffentlichen Laufs für den Baum ' + baum + ' — vorher im Klon: node tools/oeffentlicher-lauf-beleg.js --klon <klon>' };
  if (beleg.baum !== baum) return { ok: false, grund: 'der Beleg gilt für den Baum ' + beleg.baum + ', nicht für ' + baum };
  const rot = [...(beleg.unit && beleg.unit.rot) || [], ...(beleg.e2e && beleg.e2e.rot) || []];
  const abbruch = ['unit', 'e2e'].some((k) => !beleg[k] || (beleg[k].exit !== 0 && !(beleg[k].rot || []).length));
  if (abbruch) return { ok: false, grund: 'der öffentliche Lauf brach ab, ohne eine rote Probe zu nennen' };
  if (!rot.length) return { ok: true };
  if (!grundliste) return { ok: false, grund: 'der öffentliche Lauf ist rot: ' + rot.slice(0, 5).join(' · ') + (rot.length > 5 ? ' …' : '') };
  const neu = rot.filter((r) => !grundliste.includes(r));
  if (neu.length) return { ok: false, grund: 'neue rote Probe im öffentlichen Lauf, nicht in der Grundliste: ' + neu.slice(0, 5).join(' · ') };
  return { ok: true };
}

function laufen(klon, schreiben = (t) => process.stdout.write(t)) {
  const rot = (satz) => { schreiben('[oeffentlicher-lauf] ROT — ' + satz + '\n'); return 1; };
  let st;
  try { st = fs.statSync(path.join(klon, '.git')); } catch { return rot('kein Git-Klon: ' + klon); }
  if (!st.isDirectory()) return rot('ein Worktree, kein eigenständiger Klon: ' + klon);
  if (git(klon, ['status', '--porcelain']).stdout.trim()) return rot('der Klon ist nicht sauber');
  if (/u2-kanon/.test(git(klon, ['for-each-ref', '--format=%(refname)']).stdout)) return rot('der Klon trägt Refs des privaten Repos');
  const baum = git(klon, ['rev-parse', 'HEAD^{tree}']).stdout.trim();
  const commit = git(klon, ['rev-parse', 'HEAD']).stdout.trim();
  const env = ohneGitUmgebung();
  const unit = spawnSync('npm', ['test'], { cwd: klon, encoding: 'utf8', env, maxBuffer: 1 << 30 });
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'oeffentlicher-lauf-'));
  let e2e, bericht = null;
  try {
    const json = path.join(ordner, 'bericht.json');
    e2e = spawnSync('npx', ['playwright', 'test', '--reporter=list,json'], { cwd: klon, encoding: 'utf8', env: { ...env, PLAYWRIGHT_JSON_OUTPUT_NAME: json }, maxBuffer: 1 << 30 });
    try { bericht = JSON.parse(fs.readFileSync(json, 'utf8')); } catch { bericht = null; }
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  const beleg = {
    baum, commit, datum: new Date().toISOString(),
    unit: { exit: unit.status, rot: roteUnitProben(unit.stdout) },
    e2e: { exit: e2e.status, rot: roteReisen(bericht) },
  };
  belegSchreiben(klon, beleg);
  const urteil = laufBelegPruefen(beleg, { baum });
  schreiben('[oeffentlicher-lauf] Beleg für Baum ' + baum + ': npm test Exit ' + unit.status + ' (' + beleg.unit.rot.length + ' rot), '
    + 'E2E Exit ' + e2e.status + ' (' + beleg.e2e.rot.length + ' rot)\n');
  return urteil.ok ? 0 : rot(urteil.grund);
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--klon');
  process.exitCode = i >= 0 && argv[i + 1] ? laufen(path.resolve(argv[i + 1])) : (console.error('Aufruf: --klon <öffentlicher Klon>'), 2);
}

module.exports = { belegPfad, belegSchreiben, belegLesen, roteUnitProben, roteReisen, laufBelegPruefen, ORDNER };
