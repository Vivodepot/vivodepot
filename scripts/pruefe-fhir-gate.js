#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   pre-push-Gate — der HL7-FHIR-Extern-Validator, nur bei Anlass
   ────────────────────────────────────────────────────────────────────────
   WARUM ES DIESES GATE GIBT (A1b, 19.09.2026-Nachtblatt §10).
   tests/konformitaet/externe-validatoren.mjs prüft FHIR-IPS-Exporte gegen den
   offiziellen HL7-Validator — bisher lief das NUR in
   .github/workflows/konformitaet.yml, und GitHub Actions sind seit dem
   07.08.2026 aus. Der Gate fuhr seither vor KEINER Landung.

   DER ANLASS WIRD ABGELEITET, NICHT GEPFLEGT — dieselbe Quelle wie beim
   E2E-Gate (scripts/pruefe-e2e-bereich.js): Trägerdateien aus
   `scripts/ausgeliefertes-dateiset.js` (`DATEISATZ`, enthält vivodepot.html —
   dort lebt der FHIR-Generator), dazu die Gate-eigenen Dateien selbst
   (FHIR_EIGENE_DATEIEN unten) — wer eine Probe oder den Validator-Beschaffer
   ändert, muss sie fahren.

   KEIN STILLES „UNGEMESSEN" MEHR (-Korrektur, 19.09.2026, nach A1b).
   Der ursprüngliche Entwurf ließ fehlendes Java/Netz als tolerantes
   „ungemessen" durch — richtig für CI (dort ist Netz die einzige Quelle),
   falsch für einen lokalen Push-Gate: mit `--cache-dir` braucht ein Rechner,
   der den JAR schon einmal geladen hat, gar kein Netz mehr. Fehlt Java oder
   der Cache trotzdem, ist das ein Zustand, den der Rechner beheben kann —
   und „ungemessen ist nicht grün" (dieselbe Regel wie beim E2E-Gate) heißt
   hier: der Push wird verhindert, laut, mit Anleitung — nicht durchgewinkt.
   Nur eine echte Regelverletzung im FHIR-Bundle selbst zählt als das
   eigentliche, andere Rot dieses Gates.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { DATEISATZ } = require('./ausgeliefertes-dateiset.js');

// Dieselben Dateien, die den Gate selbst tragen — wer sie ändert, muss den Gate fahren.
// Bewusst eine zweite, kleine Liste (nicht aus DATEISATZ ableitbar, andere Domäne): der
// Validator-Beschaffer und die Test-Registry sind keine ausgelieferten Dateien.
const FHIR_EIGENE_DATEIEN = [
  'tests/konformitaet/externe-validatoren.mjs',
  'tools/hl7-validator-beschaffen.js',
  'tools/hl7-validator-alarm-waechter.js',
];

const HL7_CACHE_DIR = process.env.XDG_CACHE_HOME
  ? path.join(process.env.XDG_CACHE_HOME, 'vivodepot-hl7-validator')
  : path.join(require('node:os').homedir(), '.cache', 'vivodepot-hl7-validator');

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function geaenderteDateien(lokalSha, remoteSha) {
  if (/^0+$/.test(remoteSha)) return null;          // null = ganzer Zweig, Anlass gegeben
  try {
    return git('diff', '--name-only', remoteSha, lokalSha).split('\n').filter(Boolean);
  } catch (_) {
    return null;                                     // kein Bereich messbar -> fahren
  }
}

function anlassGegeben(dateien) {
  if (dateien === null) return { ja: true, grund: 'neuer Zweig oder kein messbarer Bereich' };
  const traeger = dateien.filter((d) => DATEISATZ.includes(d));
  if (traeger.length) return { ja: true, grund: 'Trägerdatei geändert: ' + traeger.join(', ') };
  const eigene = dateien.filter((d) => FHIR_EIGENE_DATEIEN.includes(d));
  if (eigene.length) return { ja: true, grund: 'FHIR-Gate-Datei geändert: ' + eigene.join(', ') };
  return { ja: false, grund: 'weder Trägerdatei noch FHIR-Gate-Datei im Bereich' };
}

/* Dieselbe Suche wie javaPfad() in tests/konformitaet/externe-validatoren.mjs — bewusst
   dupliziert (CJS hier, ESM dort), klein genug, dass eine zweite Landkarte hier nicht ins
   Gewicht fällt. Ändert sich die Kandidatenliste dort, hier nachziehen. */
function javaPfad() {
  const kandidaten = [
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    'java',
    '/opt/homebrew/opt/openjdk@21/bin/java',
    '/opt/homebrew/opt/openjdk/bin/java',
    '/usr/local/opt/openjdk@21/bin/java',
  ].filter(Boolean);
  for (const k of kandidaten) {
    try { execFileSync(k, ['-version'], { stdio: 'ignore' }); return k; } catch (_) { /* weiter */ }
  }
  return null;
}

function main() {
  const roh = fs.readFileSync(0, 'utf8').trim();
  if (!roh) { console.log('[fhir-gate] nichts zu pushen'); return 0; }

  let anlass = { ja: false, grund: 'kein Ref mit Inhalt — der Hook bekam keine prüfbare Zeile' };
  for (const zeile of roh.split('\n').filter(Boolean)) {
    const [, lokalSha, , remoteSha] = zeile.split(/\s+/);
    if (/^0+$/.test(lokalSha)) continue;                     // Löschung eines Refs
    anlass = anlassGegeben(geaenderteDateien(lokalSha, remoteSha));
    if (anlass.ja) break;
  }

  if (!anlass.ja) {
    console.log('[fhir-gate] kein Anlass — ' + anlass.grund + '. Nicht gefahren.');
    return 0;
  }
  console.log('[fhir-gate] Anlass: ' + anlass.grund);

  const java = javaPfad();
  if (!java) {
    console.error('[fhir-gate] UNGEMESSEN: kein Java gefunden (PATH, JAVA_HOME, Homebrew-Orte).');
    console.error('            Ungemessen ist nicht grün — ABBRUCH.');
    console.error('            Beheben: brew install openjdk@21 (oder JAVA_HOME setzen).');
    return 1;
  }

  fs.mkdirSync(HL7_CACHE_DIR, { recursive: true });
  const besch = spawnSync('node', ['tools/hl7-validator-beschaffen.js', '--cache-dir=' + HL7_CACHE_DIR],
    { encoding: 'utf8' });
  const beschAusgabe = (besch.stdout || '') + (besch.stderr || '');
  console.log(beschAusgabe.trim());
  if (besch.status !== 0) {
    console.error('[fhir-gate] ABBRUCH: HL7-Validator-Beschaffung meldet einen Integritätsfehler (falsche Prüfsumme).');
    console.error('            Das ist kein Netzfehler — nicht mit --no-verify umgehen, sondern melden.');
    return 1;
  }
  if (/UNGEMESSEN/.test(beschAusgabe)) {
    console.error('[fhir-gate] UNGEMESSEN: der Validator-JAR ist weder im Cache noch übers Netz erreichbar.');
    console.error('            Ungemessen ist nicht grün — ABBRUCH.');
    console.error('            Beheben: einmal mit Netzzugang laufen lassen, um den Cache unter');
    console.error('            ' + HL7_CACHE_DIR + ' zu füllen — danach braucht kein weiterer Push mehr Netz.');
    return 1;
  }
  const jarMatch = beschAusgabe.match(/^FHIR_VALIDATOR_JAR=(.+)$/m);
  const jar = jarMatch && jarMatch[1].trim();
  if (!jar || !fs.existsSync(jar)) {
    console.error('[fhir-gate] UNGEMESSEN: kein FHIR_VALIDATOR_JAR-Pfad aus der Beschaffung lesbar.');
    console.error('            Ungemessen ist nicht grün — ABBRUCH.');
    return 1;
  }

  console.log('[fhir-gate] Java + Validator-JAR vorhanden — Lauf beginnt (npm run test:konformitaet:extern) …');
  // `node --test` innerhalb eines `node --test`-Laufs erbt sonst NODE_TEST_CONTEXT (derselbe
  // Grund wie bei den anderen `env -u NODE_TEST_CONTEXT`-Aufrufen in hooks/pre-push).
  const laufEnv = Object.assign({}, process.env, { FHIR_VALIDATOR_JAR: jar });
  delete laufEnv.NODE_TEST_CONTEXT;
  const lauf = spawnSync('npm', ['run', 'test:konformitaet:extern'], {
    stdio: 'inherit',
    timeout: 240000,
    env: laufEnv,
  });
  if (lauf.error && lauf.error.code === 'ETIMEDOUT') {
    console.error('[fhir-gate] ABBRUCH: der Lauf hing (>240 s) und wurde abgebrochen.');
    console.error('            Ein Hänger ist kein Grün — nicht mit --no-verify umgehen, sondern messen.');
    return 1;
  }
  if (lauf.status !== 0) {
    console.error('[fhir-gate] ABBRUCH: der HL7-FHIR-Extern-Gate ist rot.');
    return 1;
  }
  console.log('[fhir-gate] OK — HL7-FHIR-Extern-Gate grün.');
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { anlassGegeben, javaPfad, FHIR_EIGENE_DATEIEN };
