#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════════
   pbkdf2-staerke-pruefen.js — bindet die unbenannten Krypto-Stärkegrößen an den EINEN
   gepinnten Wert (Invariante 18.9)
   ─────────────────────────────────────────────────────────────────────
   BEFUND. `PBKDF2_ITERATIONS = 600000` ist Teil des gepinnten VdCrypto-Blocks (Script 1;
   `tools/krypto-block-propagation-pruefen.js` hält ihn byte-identisch in allen Trägern). Drei
   Stellen führen DENSELBEN Wert als eigene Konstante oder eigenes Literal, statt den Block zu
   lesen: `ANG_PBKDF2_ITERATIONEN` (Kern), `ANTWORT_PBKDF2_ITERATIONEN` (Lese-App) und drei
   hartcodierte `iterationen: 600000` in `tools/schluesseluebergabe-messen.js`. Jede davon
   KÖNNTE unbemerkt vom Block abweichen — nichts prüfte es. Dieselbe Fehlerklasse wie 34.7/34.9
   (eine Angabe an mehreren Stellen, nur eine gepflegt), hier für eine Krypto-Stärkegröße statt
   eine Urheberangabe.

   NUR BINDEN, NICHTS ÄNDERN (Entscheidung, 22.09.2026): der Wert, das Salz und
   der Ableitungsweg bleiben unangetastet. Eine heruntergeladene .vdkey-/Depot-Datei ist eine
   Einbahnstraße — sie muss mit den Parametern aufgehen, mit denen sie verschlüsselt wurde.
   `ANG_PBKDF2_ITERATIONEN`/`ANTWORT_PBKDF2_ITERATIONEN` werden beim LESEN benutzt, nicht aus
   einer Datei übernommen (Kommentar an `_fachTuerSchluessel` im Kern, U2-ADR-230:
   `kdf.iterationen` aus einer Datei wird bewusst NICHT gelesen — unter der laufenden
   `kryptoVersion` kann er nie von `PBKDF2_ITERATIONS` abweichen). Eine Änderung der Krypto-
   Stärke geht darum nur über einen Sprung der `kryptoVersion`, nicht über diese Probe — sie
   bindet den heutigen Wert, sie erlaubt keinen künftigen.

   WAS DIESE PROBE NICHT FÄNGT. Sie sucht Konstanten, deren NAME „ITERATION" enthält, und
   Objekt-Literale mit dem Schlüssel `iterationen`/`iterations` und einem ZAHL-Literal als Wert
   (kein Identifier) — außerhalb von Block-Kommentaren. Eine Krypto-Stärkegröße mit einem
   ANDEREN Namen (Salzlänge, Schlüssellänge, ein künftiger Parameter eines anderen KDF) geht
   durch; das ist keine Behauptung über die Datei, sondern eine benannte Grenze. `docs/` und
   `tests/fixtures/` sind Historie/Prosa bzw. Testmaterial und ausgenommen (dieselbe Ausnahme
   wie beim Krypto-Block-Propagations-Prüfer).

   Aufruf:
     node tools/pbkdf2-staerke-pruefen.js            (prüft dieses Repo)
     node tools/pbkdf2-staerke-pruefen.js --repo <pfad>
     node tools/pbkdf2-staerke-pruefen.js --json
   Exit 0 = jede gefundene Stelle stimmt mit dem gepinnten Wert überein, 1 = Fund/e oder Pin
   nicht lesbar.
   ═════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const PIN_QUELLE = 'vivodepot.html';
const PIN_MUSTER = /const PBKDF2_ITERATIONS = (\d+);/;
const RELEVANT = /\.(html|js|mjs|cjs)$/;
// `tests/` GANZ ausgenommen (nicht nur `tests/fixtures/`): eine Testdatei darf mit Absicht einen FALSCHEN Wert setzen
// (Manipulations-/Rot-Beweis, z. B. tests/vc-issuer-schluessel-schutz.test.js: `iterationen: 700000` prüft, dass die
// AAD-Bindung eine veränderte Angabe erkennt) — das ist kein Fund, sondern der Zweck der Zeile. Die drei realen
// Stellen dieses Befunds liegen alle außerhalb von tests/.
const AUSGENOMMEN = [/^docs\//, /^tests\//];
// SELBSTBEZUG (wie beim Krypto-Block-Propagations-Prüfer): dieser Prüfer und seine Probe
// nennen die Muster und Beispielwerte im Klartext — das ist ihr Gegenstand, kein Fund.
const SELBSTBEZUG = new Set(['tools/pbkdf2-staerke-pruefen.js', 'tests/pbkdf2-staerke-pruefen.test.js']);

function dateienListen(repo) {
  try {
    // env: ohneGitUmgebung() (U2-ADR-232) — ohne sie erbt der Kindprozess GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE aus
    // einem laufenden pre-commit-Hook und arbeitet dann im ECHTEN Repository statt in `repo`.
    execFileSync('git', ['-C', repo, 'rev-parse', '--is-inside-work-tree'], { stdio: 'ignore', env: ohneGitUmgebung() });
    const aus = execFileSync('git', ['-C', repo, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { maxBuffer: 64 * 1024 * 1024, env: ohneGitUmgebung() });
    return [...new Set(aus.toString('utf8').split('\0').filter(Boolean))];
  } catch {
    const raus = [];
    const skip = new Set(['node_modules', '.git', 'test-results', 'playwright-report']);
    (function walk(d, praefix) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const rel = praefix ? praefix + '/' + e.name : e.name;
        if (e.isDirectory()) walk(path.join(d, e.name), rel);
        else raus.push(rel);
      }
    })(repo, '');
    return raus;
  }
}

// Block-Kommentare entfernen (jedes Nicht-Zeilenumbruch-Zeichen wird durch ein Leerzeichen ersetzt, damit Positionen
// erhalten bleiben) — sonst träfe die Suche ein Dokumentations-Beispiel wie das FORMAT-Beispiel im VC-Issuer-
// Kommentar (`iterationen: 600000` als Prosa, keine Definition). ZEICHENWEISE, NICHT PER REGEX über den ganzen
// Text: ein naiver `/\*…\*\//`-Regex hielt `/*` innerhalb eines String-Literals (z. B. ein Playwright-Routenmuster
// `'**/*'` in tools/schluesseluebergabe-messen.js) für den Beginn eines Kommentars und blankte bis zum NÄCHSTEN
// `*/` im Text — real ~500 Zeichen, inklusive einer echten Fundstelle, die dadurch STILL verschwand. Das ist die
// gefährlichere Richtung (eine Fundstelle wird unsichtbar, nicht fälschlich gemeldet); der Stripper verfolgt
// darum String-Grenzen (', ", `, mit Escape) und öffnet einen Kommentar nur AUSSERHALB eines Strings.
function ohneBlockKommentare(text) {
  let out = '';
  let inString = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === '\\' && i + 1 < text.length) { i++; out += text[i]; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inString = c; out += c; continue; }
    if (c === '/' && text[i + 1] === '*') {
      const ende = text.indexOf('*/', i + 2);
      const bis = ende === -1 ? text.length : ende + 2;
      for (let j = i; j < bis; j++) out += text[j] === '\n' ? '\n' : ' ';
      i = bis - 1;
      continue;
    }
    out += c;
  }
  return out;
}

// Findet Stellen im (bereits kommentarbereinigten) Text: eigene ITERATION-Konstanten (außer der
// Pin-Konstante selbst) und iterationen:/iterations:-Literale in Objekten.
function stellenFinden(text) {
  const gesaeubert = ohneBlockKommentare(text);
  const stellen = [];
  for (const m of gesaeubert.matchAll(/const\s+([A-Za-z0-9_]*ITERATION[A-Za-z0-9_]*)\s*=\s*(\d+)\s*;/g)) {
    if (m[1] === 'PBKDF2_ITERATIONS') continue; // die Quelle selbst, kein Fund
    stellen.push({ name: m[1], wert: Number(m[2]) });
  }
  for (const m of gesaeubert.matchAll(/\b(iterationen|iterations)\s*:\s*(\d+)\b/g)) {
    stellen.push({ name: m[1], wert: Number(m[2]) });
  }
  return stellen;
}

function pruefen(repo) {
  const kernPfad = path.join(repo, PIN_QUELLE);
  let kernText;
  try { kernText = fs.readFileSync(kernPfad, 'utf8'); } catch (e) { return { pin: null, funde: [{ datei: PIN_QUELLE, grund: 'nicht-lesbar' }], dateien: 0, stellen: 0 }; }
  const pinM = PIN_MUSTER.exec(kernText);
  if (!pinM) return { pin: null, funde: [{ datei: PIN_QUELLE, grund: 'gepinnter-wert-nicht-gefunden' }], dateien: 0, stellen: 0 };
  const pin = Number(pinM[1]);

  const funde = [];
  let dateien = 0, stellenGesamt = 0;
  for (const rel of dateienListen(repo)) {
    if (!RELEVANT.test(rel)) continue;
    if (SELBSTBEZUG.has(rel)) continue;
    if (AUSGENOMMEN.some((m) => m.test(rel))) continue;
    let text;
    try { text = fs.readFileSync(path.join(repo, rel), 'utf8'); } catch (e) { continue; }
    const stellen = stellenFinden(text);
    if (!stellen.length) continue;
    dateien++;
    for (const s of stellen) {
      stellenGesamt++;
      if (s.wert !== pin) funde.push({ datei: rel, stelle: s.name, gepinnt: pin, gefunden: s.wert, grund: 'abweichung' });
    }
  }
  return { pin, funde, dateien, stellen: stellenGesamt };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
  const repo = path.resolve(arg('repo', path.join(__dirname, '..')));
  const r = pruefen(repo);
  if (argv.includes('--json')) { process.stdout.write(JSON.stringify(r, null, 1) + '\n'); process.exitCode = r.pin == null || r.funde.length ? 1 : 0; return; }
  if (r.pin == null) {
    console.error('[pbkdf2-staerke] ROT — ' + r.funde.map((f) => f.datei + ': ' + f.grund).join(', '));
    process.exitCode = 1; return;
  }
  console.log('[pbkdf2-staerke] Gepinnter Wert ' + r.pin + ' (aus ' + PIN_QUELLE + '); ' + r.stellen + ' gebundene Stelle(n) in ' + r.dateien + ' Datei(en) geprüft.');
  if (r.funde.length) {
    for (const f of r.funde) console.error('  ✗ ' + f.datei + ' · ' + f.stelle + ': gefunden ' + f.gefunden + ', gepinnt ' + f.gepinnt);
    console.error('[pbkdf2-staerke] ROT — ' + r.funde.length + ' Abweichung(en)');
    process.exitCode = 1;
  } else {
    console.log('[pbkdf2-staerke] OK — keine Abweichung');
    process.exitCode = 0;
  }
}

if (require.main === module) main();

module.exports = { pruefen, stellenFinden, ohneBlockKommentare, PIN_MUSTER, PIN_QUELLE, dateienListen };
