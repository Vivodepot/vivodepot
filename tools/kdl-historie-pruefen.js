#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   kdl-historie-pruefen.js — keine KDL in irgendeinem Commit, der das Gerät verlässt (U2-ADR-468, Nachtrag 02.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Die KDL (DVMD e.V.) steht unter GPL-3.0-or-later; Vivodepot backt sie nie ein, die Person lädt sie selbst. Der Baum der
   Spitze allein reicht als Prüfung nicht: ein WIP- oder Sicherungszweig, der eine KDL-Datei in Commit n−1 trägt und sie in n
   wieder löscht, trüge sie mit dem Push trotzdem nach draußen — und eine gepushte Historie ist nicht zurückzuholen. Darum
   prüft dieses Werkzeug JEDEN Commit des Push-Bereichs (Gegenlesung, 02.10.2026).

   Je Commit, gegen seinen Vorgänger:
     1. Pfad (immer, ohne Paket): keine Datei `kdl.json` und nichts unter `code-listen/nach-lizenzentscheid/`.
     2. Inhalt (mit dem Paket dvmd.kdl.r4 im lokalen FHIR-Cache): keine hinzugefügte Zeile nennt einen KDL-Code mit seinem
        amtlichen Anzeigetext in der Nähe, und keine trägt einen mehrwortigen KDL-Text, der nicht zugleich ein IHE-D-Text ist.
        Fehlt das Paket, läuft Prüfung 2 nicht und sagt das (Prüfung 1 trägt die Einbahnstraße allein: die Dateien).

   Aufruf:
     node tools/kdl-historie-pruefen.js --refs < stdin          pre-push (git-Protokoll: jede Zeile lokalRef lokalSha remoteRef remoteSha)
     node tools/kdl-historie-pruefen.js --bereich A..B [--wurzel <pfad>]
     node tools/kdl-historie-pruefen.js --datei <pfad>          eine gebaute Auslieferung (etwa die Vorschau-HTML): genau die zwei
                                                                Codes, kein KDL-Text (Schreibregel für Prüfwerkzeuge)
     node tools/kdl-historie-pruefen.js                         (ohne Argument: der Bereich Kanon..HEAD)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const KANON = 'origin/u2-kanon';
const PFAD_VERBOTEN = /(^|\/)kdl\.json$|(^|\/)code-listen\/nach-lizenzentscheid\//;
const NAEHE = 160;
const KDL_CODE = /\b[A-Z]{2}\d{4}(?:\d{2})?\b/g;

function git(args, cwd = REPO) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
const istVorfahr = (a, b, cwd) => { try { git(['merge-base', '--is-ancestor', a, b], cwd); return true; } catch (_) { return false; } };
function basisFuer(lokalSha, remoteSha, cwd = REPO, kanon = KANON) {
  if (!/^0+$/.test(remoteSha) && istVorfahr(remoteSha, lokalSha, cwd)) return remoteSha;
  try { return git(['merge-base', lokalSha, kanon], cwd).trim(); } catch (_) { return null; }
}

// Die amtlichen Begriffe zur Laufzeit aus dem Paket-Cache — sie stehen nirgends im Repo.
function begriffeLesen(cache) {
  const p = path.join(cache, 'dvmd.kdl.r4#2025.0.1', 'package', 'codesystem-kdl.xml.json');
  if (!fs.existsSync(p)) return null;
  const aus = [];
  (function w(c) { for (const k of c || []) { if (k.display) aus.push({ code: k.code, display: k.display }); w(k.concept); } })(JSON.parse(fs.readFileSync(p, 'utf8')).concept);
  return aus;
}
function iheDTexte(cache) {
  const dir = path.join(cache, 'de.ihe-d.terminology#3.0.1', 'package');
  const s = new Set();
  if (!fs.existsSync(dir)) return s;
  for (const f of fs.readdirSync(dir).filter((x) => /^CodeSystem-.*\.json$/.test(x))) {
    (function w(c) { for (const k of c || []) { if (k.display) s.add(k.display); w(k.concept); } })(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).concept);
  }
  return s;
}

/** Prüft hinzugefügten Text gegen die Begriffe. Liefert Funde als Text. */
function textPruefen(text, kdl, iheD) {
  const funde = [];
  const nach = new Map(kdl.map((k) => [k.code, k.display]));
  let m;
  KDL_CODE.lastIndex = 0;
  while ((m = KDL_CODE.exec(text))) {
    const d = nach.get(m[0]);
    if (d && text.slice(Math.max(0, m.index - NAEHE), m.index + m[0].length + NAEHE).includes(d)) funde.push('KDL-Code ' + m[0] + ' mit seinem Text');
  }
  for (const k of kdl) if (/\s/.test(k.display) && !iheD.has(k.display) && text.includes(k.display)) funde.push('KDL-Text zu ' + k.code);
  return [...new Set(funde)];
}

/** Ein Commit gegen seinen Vorgänger. */
function commitPruefen(c, cwd, kdl, iheD) {
  const funde = [];
  const status = git(['diff-tree', '--root', '-r', '--no-commit-id', '--name-status', '-M', c], cwd).split('\n').filter(Boolean);
  for (const z of status) {
    const teile = z.split('\t');
    const art = teile[0];
    for (const p of teile.slice(1)) if (PFAD_VERBOTEN.test(p) && !/^D/.test(art)) funde.push(art.charAt(0) + ' ' + p);
  }
  if (kdl) {
    const diff = git(['show', '--format=', '--no-color', '-U0', '--no-ext-diff', c], cwd);
    const hinzu = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1)).join('\n');
    for (const f of textPruefen(hinzu, kdl, iheD)) funde.push(f);
  }
  return funde;
}

function bereichPruefen(basis, spitze, cwd = REPO, cache = process.env.FHIR_PACKAGES || path.join(os.homedir(), '.fhir', 'packages')) {
  const bereich = basis ? basis + '..' + spitze : spitze;
  const commits = git(['rev-list', '--reverse', bereich], cwd).split('\n').filter(Boolean);
  const kdl = begriffeLesen(cache);
  const iheD = kdl ? iheDTexte(cache) : new Set();
  const funde = [];
  for (const c of commits) for (const f of commitPruefen(c, cwd, kdl, iheD)) funde.push({ commit: c, text: f });
  return { commits: commits.length, mitPaket: !!kdl, funde };
}

function melden(erg, etikett) {
  const zusatz = erg.mitPaket ? '' : ' (ohne KDL-Paket im Cache: nur die Pfade geprüft, nicht die Texte)';
  if (!erg.funde.length) { console.log('[kdl-historie] grün — ' + etikett + ': ' + erg.commits + ' Commit(s)' + zusatz + '.'); return 0; }
  console.error('[kdl-historie] ROT — ' + etikett + ': ' + erg.funde.length + ' Fund(e)' + zusatz + ':');
  for (const f of erg.funde) console.error('  ' + f.commit.slice(0, 9) + '  ' + f.text);
  console.error('  Die KDL (GPL-3.0-or-later) gehört in keinen Commit, der das Gerät verlässt — auch nicht in einen Zwischenstand, der sie später löscht.');
  console.error('  Den Zweig ohne diese Commits neu aufbauen (Sicherungsref vorher), nicht pushen. U2-ADR-468, Nachtrag 02.10.2026.');
  return 1;
}

/** Eine einzelne Datei (gebaute Auslieferung): KDL-Codes nur die zwei gebrauchten, kein KDL-Text. Ohne Paket nicht messbar. */
function dateiPruefen(text, gebraucht, cache = process.env.FHIR_PACKAGES || path.join(os.homedir(), '.fhir', 'packages')) {
  const kdl = begriffeLesen(cache);
  if (!kdl) return { nichtMessbar: 'KDL-Paket nicht im Cache (' + cache + ')' };
  const codes = new Set(kdl.map((k) => k.code));
  const gefunden = new Set();
  let m;
  KDL_CODE.lastIndex = 0;
  while ((m = KDL_CODE.exec(text))) if (codes.has(m[0])) gefunden.add(m[0]);
  const funde = [...gefunden].filter((c) => !gebraucht.includes(c)).map((c) => 'dritter KDL-Code ' + c);
  return { funde: funde.concat(textPruefen(text, kdl, iheDTexte(cache))) };
}

function main(argv) {
  const arg = (n) => { const k = argv.indexOf(n); return k >= 0 ? argv[k + 1] : null; };
  const wurzel = arg('--wurzel') ? path.resolve(arg('--wurzel')) : REPO;
  if (argv.includes('--datei')) {
    const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
    const zeile = (kern.match(/const KDL_GEBRAUCHT = Object\.freeze\(\{([^}]*)\}\)/) || [])[1] || '';
    const gebraucht = [...zeile.matchAll(/'([A-Z]{2}\d{6})'/g)].map((x) => x[1]);
    const r = dateiPruefen(fs.readFileSync(path.resolve(arg('--datei')), 'utf8'), gebraucht);
    if (r.nichtMessbar) { console.error('[kdl-historie] NICHT MESSBAR: ' + r.nichtMessbar); return 1; }
    if (!r.funde.length) { console.log('[kdl-historie] grün — ' + arg('--datei') + ': nur die zwei gebrauchten Codes, kein KDL-Text.'); return 0; }
    console.error('[kdl-historie] ROT — ' + arg('--datei') + ':\n  ' + r.funde.join('\n  '));
    return 1;
  }
  if (argv.includes('--refs')) {
    const roh = fs.readFileSync(0, 'utf8').trim();
    if (!roh) { console.log('[kdl-historie] nichts zu pushen'); return 0; }
    let rot = 0;
    for (const zeile of roh.split('\n').filter(Boolean)) {
      const [lokalRef, lokalSha, , remoteSha] = zeile.split(/\s+/);
      if (/^0+$/.test(lokalSha)) continue;
      try { rot |= melden(bereichPruefen(basisFuer(lokalSha, remoteSha, wurzel), lokalSha, wurzel), lokalRef); }
      catch (e) { console.error('[kdl-historie] ROT — NICHT MESSBAR für ' + lokalRef + ': ' + e.message.split('\n')[0]); rot = 1; }
    }
    return rot;
  }
  try {
    if (argv.includes('--bereich')) {
      const [a, b] = arg('--bereich').split('..');
      return melden(bereichPruefen(a, b || 'HEAD', wurzel), arg('--bereich'));
    }
    return melden(bereichPruefen(git(['merge-base', 'HEAD', KANON], wurzel).trim(), 'HEAD', wurzel), KANON + '..HEAD');
  } catch (e) { console.error('[kdl-historie] ROT — NICHT MESSBAR: ' + e.message.split('\n')[0]); return 1; }
}

module.exports = { bereichPruefen, commitPruefen, textPruefen, dateiPruefen, PFAD_VERBOTEN };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
