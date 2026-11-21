#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   test-teil.js — einen Teil der vollen Node-Suite fahren (19.11.2026, Befund OPENCODE-PIPELINE-ROT, Rückfall)
   ─────────────────────────────────────────────────────────────────
   Auf dem geteilten Runner von openCoDE endet ein Job nach einer Stunde. Die volle Suite braucht schon auf einem
   GitHub-Läufer weit über eine Stunde (19.11.2026: 76 bis 137 Minuten), und jede Pipeline endete rot an der Zeitgrenze.
   Gekürzt wird nicht: die CI-Datei fährt die Suite in TEILE Teilen nebeneinander, jede Probe genau einmal.

   Der Befehl ist der von `npm test` (package.json), mit denselben Vorladern und Reportern; eingefügt wird nur
   `--test-shard=<i>/<n>`, und zwar VOR den Mustern: hinter den Mustern liest Node den Schalter als weiteres Muster und
   fährt alles (geprüft mit Node 24).
   Node verteilt die sortierte Dateiliste reihum (Datei k in Teil (k mod n) + 1).

   Aufruf: node tools/test-teil.js --teil <i>/<n>     (ohne --teil: CI_NODE_INDEX und CI_NODE_TOTAL von GitLab `parallel`)
           node tools/test-teil.js --plan [--teil i/n]  nur den Befehl ausgeben
   TEILE ist die Zahl, die die CI-Datei fährt (`parallel:`); die Probe hält beide gleich.
   Wahl der Zahl: aus den gemessenen Laufzeiten je Datei (19.11.2026) ergibt sich bei 8 Teilen ein längster Teil von
   rund 32 Minuten Prozesszeit, bei 10 Teilen rund 29 — die größten Einzeldateien begrenzen den Gewinn darüber.
   Probe: tests/test-teil.test.js; die CI-Datei: tests/pflichtdateien-oeffentliches-repo.test.js.
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TEILE = 10;
const REPO = path.join(__dirname, '..');
const MUSTER = /^'.*\*.*'$/;

function teilLesen(argv, env) {
  const i = argv.indexOf('--teil');
  const roh = i >= 0 ? argv[i + 1] : (env.CI_NODE_INDEX && env.CI_NODE_TOTAL ? env.CI_NODE_INDEX + '/' + env.CI_NODE_TOTAL : null);
  const m = /^([1-9]\d*)\/([1-9]\d*)$/.exec(roh || '');
  if (!m || Number(m[1]) > Number(m[2])) throw new Error('[test-teil] Teil fehlt oder ist ungültig (' + (roh || 'leer') + '): --teil <i>/<n> oder CI_NODE_INDEX/CI_NODE_TOTAL');
  return { index: Number(m[1]), gesamt: Number(m[2]) };
}

/* befehl(skript, teil) → [programm, argumente]: das Skript von `npm test`, der Schalter vor dem ersten Muster, Muster ohne
   Anführungszeichen (kein Shell-Aufruf: Node löst die Muster selbst auf). */
function befehl(skript, { index, gesamt }) {
  const teile = skript.split(/\s+/).filter(Boolean);
  const erstes = teile.findIndex((t) => MUSTER.test(t));
  if (erstes < 0) throw new Error('[test-teil] das Skript von npm test nennt keine Muster');
  const args = [...teile.slice(1, erstes), '--test-shard=' + index + '/' + gesamt, ...teile.slice(erstes).map((t) => (MUSTER.test(t) ? t.slice(1, -1) : t))];
  return [teile[0], args];
}

function main(argv = process.argv.slice(2), env = process.env) {
  const skript = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).scripts.test;
  const [prog, args] = befehl(skript, teilLesen(argv, env));
  if (argv.includes('--plan')) { process.stdout.write([prog, ...args].join(' ') + '\n'); return 0; }
  const r = spawnSync(prog, args, { cwd: REPO, stdio: 'inherit' });
  return r.status === null ? 1 : r.status;
}

if (require.main === module) {
  try { process.exitCode = main(); } catch (e) { process.stderr.write(e.message + '\n'); process.exitCode = 2; }
}
module.exports = { TEILE, teilLesen, befehl };
