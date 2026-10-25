#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Beleg „volle Node-Suite grün" je Baum-Hash (HOOKS2, 19.09.2026).
   Anlass: Der pre-push fuhr die volle Node-Suite nicht und verließ sich darauf, dass jeder Commit
   unter einem intakten pre-commit entstand. Mit `--no-verify`-Commits in Landungen kamen so 13
   Rote aus dem Schnitt unbemerkt bis vor den Kanon. Ein Push ist nur so gut wie die Suite, die
   für GENAU den Stand lief, der gepusht wird.

   DER BELEG ist eine Datei je Baum-Hash im gemeinsamen Git-Verzeichnis (vd-suite-belege/<hash>).
   Er wird nur geschrieben, wenn die volle Suite für genau diesen Baum grün war:
     - pre-commit nach grüner Suite, und nur wenn der Arbeitsbaum dem Index entspricht (sonst lief
       die Suite über andere Dateien als die, die der Commit trägt);
     - pre-push nach eigener grüner Suite, und nur für den Baum, den HEAD trägt, bei sauberem
       Arbeitsbaum.
   Ein Baum-Hash ist inhaltsgleich in jedem Arbeitsbaum — ein Beleg gilt darum baumübergreifend.

   `--push-pruefen` (stdin: die Ref-Zeilen des pre-push) prüft je gepushter Ref-Spitze, ob ein
   Beleg für ihren Baum-Hash existiert. Exit 0: alle belegt. Exit 3: für den Baum in HEAD fehlt er,
   der Hook muss die Suite fahren. Exit 1: es fehlt ein Beleg und HEAD trägt diesen Stand nicht —
   die Suite lässt sich hier nicht für ihn fahren, der Push ist abzubrechen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/* Alle git-Aufrufe laufen im Prozess-Arbeitsverzeichnis (bei einem Hook die Wurzel des Baums) und
   erben die Umgebung des Hooks BEWUSST: im pre-commit zeigt GIT_INDEX_FILE bei `commit -a` oder
   `commit <pfad>` auf den Index, den der Commit wirklich trägt — ein abgestreifter Index ergäbe
   einen Beleg für einen Baum, der nie committet wird. */
function git(args) {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function belegVerzeichnis() {
  return path.join(path.resolve(git(['rev-parse', '--git-common-dir'])), 'vd-suite-belege');
}

/* Ein Beleg zählt nur, wenn er von einer VOLLEN Suite stammt (28.09.2026, Schnellstufe im pre-commit): ein Eintrag mit
   `stufe` ungleich „voll" wird nicht anerkannt — die Schnellstufe schreibt keinen, und schriebe sie einen, fährt der
   pre-push trotzdem voll. Ältere Belege ohne `stufe` stammen aus der Zeit, als der pre-commit immer voll fuhr. */
function belegVorhanden(tree, belegDir = belegVerzeichnis()) {
  if (!/^[0-9a-f]{40,64}$/.test(tree)) return false;
  const pfad = path.join(belegDir, tree);
  if (!fs.existsSync(pfad)) return false;
  try { const b = JSON.parse(fs.readFileSync(pfad, 'utf8')); return !b.stufe || b.stufe === 'voll'; }
  catch (_) { return false; }
}

// `extra` (02.10.2026): ein Beleg vom eigenen Runner (Vorprüfung vor dem Push) trägt SHA, Lauf-ID, Adresse und Label.
function belegSchreiben(tree, hook, belegDir = belegVerzeichnis(), extra = {}) {
  if (!/^[0-9a-f]{40,64}$/.test(tree)) throw new Error('kein Baum-Hash: ' + tree);
  const dir = belegDir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, tree), JSON.stringify({ ...extra, tree, hook, stufe: 'voll', geschriebenAm: new Date().toISOString() }) + '\n');
}

/* HERKUNFT UND TEILE (24.10.2026, Befunde LV-OHNE-NODE-SUITE und AIR-BELEG-LAUF-UNGEPRUEFT): die Vorbereitung einer Landung
   fährt für den Zugkopf genau einen Volllauf — auf dem eigenen Runner (hook `air`, Lauf bei GitHub) oder, fällt er aus, hier
   (hook `landung`, `herkunft: 'mac'`). Der Beleg nennt, was lief (`teile`): `node-suite`, `e2e-haupt` und, nach eigenem grünen
   Lauf, die Lücken des Runners (`luecke-hauptkonfiguration`). Ein Beleg vom Runner gilt beim Push nur, wenn GitHub den Lauf
   JETZT bestätigt: grün, für eine SHA genau dieses Baums, auf dem eingetragenen Runner. Ist die Abfrage nicht möglich, gilt er
   nicht, und der pre-push fährt selbst. Ein Beleg von hier gilt nur mit seinen zwei Protokollen daneben, deren Prüfsumme in
   der Lauf-ID steht und die je ihr grünes Schlusswort tragen. Die Bestätigung beim Runner reicht der Aufrufer herein
   (`--lauf-pruefer <modul>`, das `airBelegLaufPruefen` exportiert); ohne sie gilt kein Beleg vom Runner. Probe: die Probe zum
   Volllauf je Zug (sie bleibt mit dem Runner drinnen). */
const TEILE_VOLLLAUF = Object.freeze(['node-suite', 'e2e-haupt']);
const LANDUNG_PROTOKOLLE = 'vd-landung-protokolle';

function belegLesen(tree, belegDir = belegVerzeichnis()) {
  if (!/^[0-9a-f]{40,64}$/.test(tree)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(belegDir, tree), 'utf8')); } catch (_) { return null; }
}

function protokollVerzeichnis(belegDir = belegVerzeichnis()) {
  return path.join(path.dirname(belegDir), LANDUNG_PROTOKOLLE);
}

// Die Lauf-ID eines Volllaufs hier: Zeit und die ersten zwölf Zeichen der sha256 über beide Protokolle, in fester Reihenfolge.
function macLaufId(protokolle, jetzt = new Date()) {
  const h = require('node:crypto').createHash('sha256');
  for (const t of protokolle) h.update(String(t)).update('\0');
  return 'mac-' + jetzt.toISOString().replace(/[-:.]/g, '').slice(0, 15) + '-' + h.digest('hex').slice(0, 12);
}

// Grünes Schlusswort je Protokoll: die letzte Zeile, die die Vorbereitung nur nach Exit 0 des Teils anhängt.
const schlusswort = (teil) => '[volllauf] ' + teil + ' grün (Exit 0)';
const SCHLUSSWORT = Object.freeze(Object.fromEntries(TEILE_VOLLLAUF.map((t) => [t, new RegExp('^' + schlusswort(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$')])));

function macBelegPruefen(b, tree, belegDir = belegVerzeichnis()) {
  if (!b || b.herkunft !== 'mac' || b.hook !== 'landung') return { ok: false, grund: 'kein Beleg eines Volllaufs hier' };
  if (b.tree !== tree) return { ok: false, grund: 'der Beleg nennt den Baum ' + String(b.tree || '(keinen)').slice(0, 12) + ', geprüft wird ' + String(tree).slice(0, 12) };
  const teile = Array.isArray(b.teile) ? b.teile : [];
  const fehlt = TEILE_VOLLLAUF.filter((t) => !teile.includes(t));
  if (fehlt.length) return { ok: false, grund: 'dem Beleg fehlt ' + fehlt.join(', ') };
  const m = /^mac-\d{8}T\d{6}-([0-9a-f]{12})$/.exec(String(b.laufId || ''));
  if (!m) return { ok: false, grund: 'der Beleg nennt keine Lauf-ID dieses Rechners' };
  const texte = [];
  for (const t of TEILE_VOLLLAUF) {
    let text;
    try { text = fs.readFileSync(path.join(protokollVerzeichnis(belegDir), tree + '.' + t + '.log'), 'utf8'); } catch (_) { return { ok: false, grund: 'Protokoll ' + t + ' fehlt' }; }
    if (!SCHLUSSWORT[t].test(text.trimEnd().split('\n').pop() || '')) return { ok: false, grund: 'Protokoll ' + t + ' endet nicht grün' };
    texte.push(text);
  }
  if (macLaufId(texte).slice(-12) !== m[1]) return { ok: false, grund: 'die Protokolle passen nicht zur Lauf-ID' };
  return { ok: true };
}

function macBelegSchreiben(tree, { protokolle, teile = TEILE_VOLLLAUF, sha = null }, belegDir = belegVerzeichnis()) {
  const dir = protokollVerzeichnis(belegDir);
  fs.mkdirSync(dir, { recursive: true });
  const texte = TEILE_VOLLLAUF.map((t) => String(protokolle[t] || ''));
  TEILE_VOLLLAUF.forEach((t, i) => fs.writeFileSync(path.join(dir, tree + '.' + t + '.log'), texte[i]));
  const laufId = macLaufId(texte);
  belegSchreiben(tree, 'landung', belegDir, { herkunft: 'mac', laufId, teile: [...teile], ...(sha ? { sha } : {}) });
  return { laufId };
}

// Ein Teil, den die Vorbereitung nach dem Lauf selbst grün fuhr (die Lücken des Runners), wird dem Beleg nachgetragen.
function teilNachtragen(tree, teil, belegDir = belegVerzeichnis()) {
  const b = belegLesen(tree, belegDir);
  if (!b) throw new Error('kein Beleg für ' + tree);
  const teile = Array.isArray(b.teile) ? b.teile : [];
  if (!teile.includes(teil)) teile.push(teil);
  fs.writeFileSync(path.join(belegDir, tree), JSON.stringify({ ...b, teile }) + '\n');
}

/* Beim Push: ein Beleg zählt, wenn er voll ist UND — vom Runner — GitHub ihn jetzt bestätigt, — von hier — seine Protokolle
   stimmen. Lokale Belege aus pre-commit und pre-push bleiben, wie sie sind. `laufPruefen(b, tree)` → { ok, grund }. */
function belegAnerkannt(tree, { belegDir = belegVerzeichnis(), laufPruefen = ohneLaufPruefer } = {}) {
  if (!belegVorhanden(tree, belegDir)) return { ok: false, grund: 'kein Beleg' };
  const b = belegLesen(tree, belegDir) || {};
  if (b.hook === 'air') {
    let r;
    try { r = laufPruefen(b, tree); } catch (e) { r = { ok: false, grund: 'ungemessen (' + String(e.message || e).split('\n')[0] + ')' }; }
    return r && r.ok ? { ok: true } : { ok: false, grund: 'Lauf des Runners nicht bestätigt: ' + ((r && r.grund) || 'ohne Grund') };
  }
  if (b.hook === 'landung') return macBelegPruefen(b, tree, belegDir);
  return { ok: true };
}
function ohneLaufPruefer() { return { ok: false, grund: 'kein Prüfer für Läufe des Runners genannt' }; }

function arbeitsbaumSauber() {
  return git(['status', '--porcelain', '--untracked-files=no']) === '';
}

/* Reine Entscheidung, ohne Seiteneffekt — für die Probe. */
function pushEntscheidung({ baeume, headTree, sauber, belegt }) {
  const fehlend = baeume.filter((t) => !belegt(t));
  if (!fehlend.length) return { code: 0, grund: 'alle gepushten Bäume tragen einen Suite-Beleg' };
  if (fehlend.length > 1 || fehlend[0] !== headTree) {
    return { code: 1, grund: 'für ' + fehlend.join(', ') + ' gibt es keinen Suite-Beleg, und HEAD trägt diesen Stand nicht — die volle Suite lässt sich hier nicht für ihn fahren. Aus dem Baum pushen, der den Stand trägt (Zweig auschecken, dann pushen).' };
  }
  if (!sauber) return { code: 1, grund: 'Der Arbeitsbaum hat Änderungen an verfolgten Dateien — die Suite liefe über etwas anderes als den Stand, der gepusht wird. Erst committen oder verwerfen.' };
  return { code: 3, grund: 'für den gepushten Baum ' + fehlend[0] + ' fehlt der Beleg — die volle Suite läuft jetzt', tree: fehlend[0] };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--schreiben') {
    const hook = argv[1] || 'unbekannt';
    const iTree = argv.indexOf('--tree');
    let tree;
    if (iTree >= 0) {
      tree = argv[iTree + 1];
    } else {
      // pre-commit: nur wenn der Arbeitsbaum dem Index entspricht.
      try { git(['diff', '--quiet']); } catch (e) {
        process.stdout.write('[suite-beleg] kein Beleg: der Arbeitsbaum weicht vom Index ab — die Suite lief über andere Dateien als die, die der Commit trägt.\n');
        return;
      }
      tree = git(['write-tree']);
    }
    belegSchreiben(tree, hook);
    process.stdout.write('[suite-beleg] Beleg für Baum ' + tree + ' geschrieben (' + hook + ').\n');
    return;
  }
  if (argv[0] === '--push-pruefen') {
    const zeilen = fs.readFileSync(0, 'utf8').split('\n').map((z) => z.trim()).filter(Boolean);
    const baeume = [];
    for (const z of zeilen) {
      const [, lokal] = z.split(/\s+/);
      if (!lokal || /^0+$/.test(lokal)) continue;
      const tree = git(['rev-parse', lokal + '^{tree}']);
      if (!baeume.includes(tree)) baeume.push(tree);
    }
    const headTree = git(['rev-parse', 'HEAD^{tree}']);
    const iP = argv.indexOf('--lauf-pruefer');
    let laufPruefen = ohneLaufPruefer;
    if (iP >= 0) {
      try { laufPruefen = require(path.resolve(argv[iP + 1])).airBelegLaufPruefen; } catch (e) { laufPruefen = () => ({ ok: false, grund: 'Prüfer nicht ladbar (' + String(e.message || e).split('\n')[0] + ')' }); }
    }
    const abgelehnt = [];
    const belegt = (t) => {
      const a = belegAnerkannt(t, { laufPruefen });
      if (!a.ok && a.grund !== 'kein Beleg') abgelehnt.push(t.slice(0, 12) + ': ' + a.grund);
      return a.ok;
    };
    const e = pushEntscheidung({ baeume, headTree, sauber: arbeitsbaumSauber(), belegt });
    for (const z of abgelehnt) process.stdout.write('[suite-beleg] Beleg nicht angenommen — ' + z + '\n');
    (e.code === 1 ? process.stderr : process.stdout).write('[suite-beleg] ' + e.grund + '\n');
    if (e.tree) process.stdout.write('TREE ' + e.tree + '\n');
    process.exitCode = e.code;
    return;
  }
  process.stderr.write('Aufruf: suite-beleg.js --schreiben <hook> [--tree <hash>] | --push-pruefen [--lauf-pruefer <modul>] < ref-zeilen\n');
  process.exitCode = 2;
}

if (require.main === module) main();

module.exports = { belegVerzeichnis, belegVorhanden, belegSchreiben, pushEntscheidung, arbeitsbaumSauber, belegLesen, belegAnerkannt,
  macBelegPruefen, macBelegSchreiben, macLaufId, teilNachtragen, protokollVerzeichnis, TEILE_VOLLLAUF, SCHLUSSWORT, schlusswort };
