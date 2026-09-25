#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   baum-pruefsumme.js — hat die Suite eine getrackte Datei verändert?

   Der Hook schreibt VOR der Suite die Prüfsummen aller getrackten Dateien und vergleicht NACH der Suite.
   Eine Probe, die in eine Datei des Repos schreibt (und sie „wieder herstellt" oder nicht), fällt hier auf —
   auch dort, wo die statische Prüfung tools/tests-schreiben-in-baum-pruefen.js über eine Zwischenvariable
   nichts sieht. Nur getrackte Dateien: untrackte Scratch-Dateien der Proben stören nicht.

   Aufruf:
     node tools/baum-pruefsumme.js --schreiben <datei>     schreibt { pfad: sha256 } der getrackten Dateien
     node tools/baum-pruefsumme.js --vergleichen <datei>   Exit 1, nennt jede veränderte, gelöschte Datei
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

/* Ohne cwd: läuft im Baum, in dem der Hook läuft; `ls-files` liest den Index, den der Hook sieht. */
function getrackteDateien() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).split('\0').filter(Boolean);
}

function pruefsummen(dateien, wurzel = process.cwd()) {
  const je = {};
  for (const d of dateien) {
    try { je[d] = crypto.createHash('sha256').update(fs.readFileSync(path.join(wurzel, d))).digest('hex'); } catch (_) { je[d] = null; }
  }
  return je;
}

/** @returns {string[]} Beschreibung jeder Abweichung */
function abweichungen(vorher, nachher) {
  const raus = [];
  for (const [d, h] of Object.entries(vorher)) {
    if (!(d in nachher)) continue;   // nicht mehr getrackt: kein Schreibzugriff der Suite
    if (nachher[d] === null && h !== null) raus.push('GELÖSCHT  ' + d);
    else if (nachher[d] !== h) raus.push('VERÄNDERT ' + d);
  }
  return raus;
}

function main() {
  const argv = process.argv.slice(2);
  const datei = argv[1];
  if (argv[0] === '--schreiben' && datei) {
    fs.writeFileSync(datei, JSON.stringify(pruefsummen(getrackteDateien())));
    return 0;
  }
  if (argv[0] === '--vergleichen' && datei) {
    const vorher = JSON.parse(fs.readFileSync(datei, 'utf8'));
    const nachher = pruefsummen(Object.keys(vorher));
    const a = abweichungen(vorher, nachher);
    if (!a.length) { console.log('[baum-pruefsumme] die Suite hat keine getrackte Datei verändert.'); return 0; }
    console.error(`[baum-pruefsumme] ROT — die Suite hat ${a.length} getrackte Datei(en) verändert:`);
    for (const z of a.slice(0, 30)) console.error('  ' + z);
    console.error('  Eine Probe schreibt in den Baum. Sie gehört auf eine Kopie im Wegwerf-Verzeichnis (tools/tests-schreiben-in-baum-pruefen.js findet die Stelle, wenn sie direkt schreibt).');
    return 1;
  }
  console.error('Aufruf: baum-pruefsumme.js --schreiben <datei> | --vergleichen <datei>');
  return 2;
}

if (require.main === module) process.exitCode = main();

module.exports = { pruefsummen, abweichungen };
