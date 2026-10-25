#!/usr/bin/env node
'use strict';
require('./lib/schalter-pruefen.js').schalterPruefen(module);   // --help und unbekannte Schalter halten an, bevor etwas läuft (22.10.2026)
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

   Seit 17.10.2026: die Ausschlüsse für node_modules und Ausgaben schreibt das Werkzeug selbst in .git/info/exclude des Klons,
   und die Ausgaben von npm test und E2E liegen neben dem Beleg (<baum>.unit.log, <baum>.e2e.log). Wer es mit gehaltenem
   Suite-Platz aufruft, vererbt ihn (VD_SUITE_PLATZ_GEHALTEN) — sonst wartet npm test auf einen zweiten und bricht ab.
   Ebenfalls seit 17.10.2026: der Lauf hält vor dem Start an, wenn eine Spec einen Browser startet, den der öffentliche Job
   e2e-reisen nicht installiert (tools/lib/e2e-workflow-browser.js), und der Beleg nennt Plattform und CI-Runner. Das
   Betriebssystem bildet er nicht ab: was nur unter Linux anders ist, zeigt erst die CI am öffentlichen main.
   Aufruf:  node tools/oeffentlicher-lauf-beleg.js --klon <öffentlicher Klon>
   Probe:   tests/oeffentlich-tag-signieren.test.js
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');
const WB = require('./lib/e2e-workflow-browser.js');
const { abgleich } = WB;

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

/* Rein: der Abschnitt „failing tests“ der Ausgabe von `node --test` (leer, wenn nichts rot ist). */
function unitFehlerAbschnitt(ausgabe) {
  const t = String(ausgabe || '');
  const ab = t.indexOf('✖ failing tests:');
  return ab < 0 ? '' : t.slice(ab);
}

/* Rein: die Repo-Pfade (relativ zum Klon), auf die der Lauf mit ENOENT stieß. Eine Probe, die eine Datei liest, die der öffentliche
   Zuschnitt nicht trägt, endet mit „ENOENT … '<Klon>/<Pfad>'“; die statische Achse des Zuschnitts sieht zusammengesetzte Pfade nicht
   (so fielen sieben Proben erst im Lauf-Beleg auf), diese Zeilen sind der Schiedsrichter. Gelesen wird nur, was in einer ROTEN Probe
   steht (Abschnitt „failing tests“ bzw. die Fehlermeldungen des Playwright-Berichts), nie die Ausgabe grüner Proben. */
function enoentPfade(texte, klon) {
  const wurzel = String(klon).replace(/\/+$/, '') + '/';
  const raus = new Set();
  for (const t of [].concat(texte || [])) {
    for (const m of String(t || '').matchAll(/ENOENT[^\n'"`]*['"`]([^'"`\n]+)['"`]/g)) {
      const roh = m[1];
      const rel = roh.startsWith(wurzel) ? roh.slice(wurzel.length) : (roh.startsWith('/') ? null : roh.replace(/^\.\//, ''));
      if (rel && !rel.startsWith('..') && !/(^|\/)node_modules(\/|$)/.test(rel)) raus.add(rel);
    }
  }
  return [...raus].sort();
}

/* Rein: die Fehlermeldungen aller Spezifikationen aus dem Playwright-Bericht. */
function fehlerTexteAusBericht(bericht) {
  const aus = [];
  const gehen = (suite) => {
    for (const s of suite.specs || []) for (const t of s.tests || []) for (const r of t.results || []) {
      for (const e of r.errors || []) aus.push((e.message || '') + '\n' + (e.stack || ''));
      if (r.error) aus.push((r.error.message || '') + '\n' + (r.error.stack || ''));
    }
    for (const u of suite.suites || []) gehen(u);
  };
  for (const s of (bericht && bericht.suites) || []) gehen(s);
  return aus;
}

/* Rein: { ok } oder { ok:false, grund }. Ohne Grundliste gilt nur grün; mit Grundliste hält jede rote Probe an, die
   nicht darin steht, und ein Abbruch ohne benannte rote Probe hält immer an. */
function laufBelegPruefen(beleg, { baum, grundliste = null } = {}) {
  if (!beleg) return { ok: false, grund: 'kein Beleg des öffentlichen Laufs für den Baum ' + baum + ' — vorher im Klon: node tools/oeffentlicher-lauf-beleg.js --klon <klon>' };
  if (beleg.baum !== baum) return { ok: false, grund: 'der Beleg gilt für den Baum ' + beleg.baum + ', nicht für ' + baum };
  const rot = [...(beleg.unit && beleg.unit.rot) || [], ...(beleg.e2e && beleg.e2e.rot) || []];
  const abbruch = ['unit', 'e2e'].some((k) => !beleg[k] || (beleg[k].exit !== 0 && !(beleg[k].rot || []).length));
  if (abbruch) {
    const g = ['unit', 'e2e'].map((k) => beleg[k] && beleg[k].abbruch).filter(Boolean)[0];
    return { ok: false, grund: 'der öffentliche Lauf brach ab, ohne eine rote Probe zu nennen' + (g ? ': ' + g : '') };
  }
  // Eine rote Probe, die an einer fehlenden Repo-Datei scheitert, hält immer an — auch mit Grundliste: sie zeigt ein Loch im Zuschnitt, keinen bekannten Fall.
  const fehlend = [...(beleg.unit && beleg.unit.enoent) || [], ...(beleg.e2e && beleg.e2e.enoent) || []];
  if (fehlend.length) return { ok: false, grund: 'der öffentliche Lauf stieß auf fehlende Dateien (ENOENT): ' + [...new Set(fehlend)].slice(0, 5).join(' · ') + (new Set(fehlend).size > 5 ? ' …' : '') };
  if (!rot.length) return { ok: true };
  if (!grundliste) return { ok: false, grund: 'der öffentliche Lauf ist rot: ' + rot.slice(0, 5).join(' · ') + (rot.length > 5 ? ' …' : '') };
  const neu = rot.filter((r) => !grundliste.includes(r));
  if (neu.length) return { ok: false, grund: 'neue rote Probe im öffentlichen Lauf, nicht in der Grundliste: ' + neu.slice(0, 5).join(' · ') };
  return { ok: true };
}

/* KLON-AUSSCHLÜSSE (17.10.2026, zweimal vergessen: v929, v930). `npm ci` und die Läufe legen node_modules und Ausgaben im Klon
   an; ohne Ausschluss ist der Klon danach „nicht sauber“, und der Lauf endet rot, bevor er prüft. Der öffentliche Stand trägt
   keine .gitignore dafür — darum schreibt dieses Werkzeug die Zeilen selbst in .git/info/exclude des Klons (nie in den Baum,
   nie committet) und ergänzt nur, was fehlt. Liefert die ergänzten Zeilen. */
const KLON_AUSSCHLUESSE = Object.freeze(['node_modules', 'test-results', 'playwright-report', 'tests/e2e/.artifacts']);
function ausschluesseSichern(klon) {
  const datei = path.join(klon, '.git', 'info', 'exclude');
  let alt = '';
  try { alt = fs.readFileSync(datei, 'utf8'); } catch { /* fehlt */ }
  const da = new Set(alt.split('\n').map((z) => z.trim()));
  const neu = KLON_AUSSCHLUESSE.filter((z) => !da.has(z));
  if (neu.length) {
    fs.mkdirSync(path.dirname(datei), { recursive: true });
    fs.writeFileSync(datei, alt + (alt && !alt.endsWith('\n') ? '\n' : '') + neu.join('\n') + '\n');
  }
  return neu;
}
/* PLATZ (17.10.2026): `npm test` holt in der Wache selbst einen Suite-Platz. Hält der Aufrufer schon einen, ohne
   VD_SUITE_PLATZ_GEHALTEN zu vererben, wartet npm test auf einen zweiten und bricht ab, ohne eine Probe zu fahren — Exit 1
   ohne rote Probe. Das Urteil nennt dann diese Ursache statt eines namenlosen Abbruchs. */
function platzAbbruch(ausgabe) {
  return /\[suite-platz\] ABBRUCH/.test(String(ausgabe || ''))
    ? 'npm test bekam keinen Suite-Platz — hält der Aufrufer schon einen, VD_SUITE_PLATZ_GEHALTEN vererben' : null;
}

function laufen(klon, schreiben = (t) => process.stdout.write(t), d = {}) {
  const spawn = d.spawn || spawnSync;
  const rot = (satz) => { schreiben('[oeffentlicher-lauf] ROT — ' + satz + '\n'); return 1; };
  let st;
  try { st = fs.statSync(path.join(klon, '.git')); } catch { return rot('kein Git-Klon: ' + klon); }
  if (!st.isDirectory()) return rot('ein Worktree, kein eigenständiger Klon: ' + klon);
  const ergaenzt = ausschluesseSichern(klon);
  if (ergaenzt.length) schreiben('[oeffentlicher-lauf] .git/info/exclude ergänzt: ' + ergaenzt.join(', ') + '\n');
  if (git(klon, ['status', '--porcelain']).stdout.trim()) return rot('der Klon ist nicht sauber');
  if (/u2-kanon/.test(git(klon, ['for-each-ref', '--format=%(refname)']).stdout)) return rot('der Klon trägt Refs des privaten Repos');
  const baum = git(klon, ['rev-parse', 'HEAD^{tree}']).stdout.trim();
  const commit = git(klon, ['rev-parse', 'HEAD']).stdout.trim();
  // DIESELBEN BROWSER WIE DIE CI (17.10.2026): lokal liegen im Playwright-Cache alle Browser, die CI installiert nur, was ihr
  // Workflow nennt. Startet eine Spec einen Browser, den der Job e2e-reisen nicht installiert, wäre der Lauf hier grün und
  // dort rot (v928 bis v931, WebKit). Darum hält der Lauf vorher an. Gelesen am Klon selbst, nicht am eigenen Repo.
  let ci;
  try { ci = abgleich(klon); } catch (e) { return rot('Browser der CI nicht lesbar (' + WB.WORKFLOW + ', playwright.config.js): ' + e.message); }
  if (ci.fehlend === null) return rot('der Job ' + WB.JOB + ' steht nicht in ' + WB.WORKFLOW + ' des Klons');
  if (ci.fehlend.length) return rot('der Job ' + WB.JOB + ' installiert ' + ci.fehlend.join(', ') + ' nicht, die Specs starten ihn aber — '
    + 'hier liefe es, weil der Browser im Cache liegt, in der CI nicht');
  const env = ohneGitUmgebung();
  const unit = spawn('npm', ['test'], { cwd: klon, encoding: 'utf8', env, maxBuffer: 1 << 30 });
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'oeffentlicher-lauf-'));
  let e2e, bericht = null;
  try {
    const json = path.join(ordner, 'bericht.json');
    e2e = spawn('npx', ['playwright', 'test', '--reporter=list,json'], { cwd: klon, encoding: 'utf8', env: { ...env, PLAYWRIGHT_JSON_OUTPUT_NAME: json }, maxBuffer: 1 << 30 });
    try { bericht = JSON.parse(fs.readFileSync(json, 'utf8')); } catch { bericht = null; }
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  const beleg = {
    baum, commit, datum: new Date().toISOString(),
    unit: { exit: unit.status, rot: roteUnitProben(unit.stdout), enoent: enoentPfade(unitFehlerAbschnitt(unit.stdout), klon), ...(platzAbbruch((unit.stdout || '') + (unit.stderr || '')) ? { abbruch: platzAbbruch((unit.stdout || '') + (unit.stderr || '')) } : {}) },
    e2e: { exit: e2e.status, rot: roteReisen(bericht), enoent: enoentPfade(fehlerTexteAusBericht(bericht), klon) },
    // Was dieser Beleg von der CI abbildet und was nicht: Browser und Exit-Regel ja, das Betriebssystem nicht.
    umgebung: { plattform: process.platform, ciRunner: ci.runner, browser: ci.installiert },
  };
  belegSchreiben(klon, beleg);
  // AUSGABE NEBEN DEN BELEG (17.10.2026): bis hierher fiel sie weg, und ein Exit 1 ohne rote Probe ließ sich nicht deuten.
  for (const [k, r] of [['unit', unit], ['e2e', e2e]]) fs.writeFileSync(path.join(klon, '.git', ORDNER, baum + '.' + k + '.log'), (r.stdout || '') + (r.stderr || ''));
  const urteil = laufBelegPruefen(beleg, { baum });
  schreiben('[oeffentlicher-lauf] Beleg für Baum ' + baum + ': npm test Exit ' + unit.status + ' (' + beleg.unit.rot.length + ' rot), '
    + 'E2E Exit ' + e2e.status + ' (' + beleg.e2e.rot.length + ' rot)\n');
  if (ci.runner && !/macos/i.test(ci.runner) && process.platform === 'darwin') {
    schreiben('[oeffentlicher-lauf] Grenze: gelaufen auf ' + process.platform + ', die CI läuft auf ' + ci.runner + '. Was nur unter Linux '
      + 'anders ist, zeigt erst der CI-Lauf des öffentlichen main nach dem Push.\n');
  }
  return urteil.ok ? 0 : rot(urteil.grund);
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--klon');
  process.exitCode = i >= 0 && argv[i + 1] ? laufen(path.resolve(argv[i + 1])) : (console.error('Aufruf: --klon <öffentlicher Klon>'), 2);
}

module.exports = { KLON_AUSSCHLUESSE, ausschluesseSichern, platzAbbruch, laufen, belegPfad, belegSchreiben, belegLesen, roteUnitProben, roteReisen, laufBelegPruefen, enoentPfade, fehlerTexteAusBericht, unitFehlerAbschnitt, ORDNER };
