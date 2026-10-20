#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   navicon-einsetzen.js — setzt das Icon des Kerns in jede eigenständige Seite im Wurzelverzeichnis (09.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Seiten bleiben eigenständig (eine Datei, offline lauffähig); das Icon steht darum als data-URI in jeder, in einem
   markierten Bereich NAVICON:BEGIN … END. Diesen Bereich füllt nur dieses Werkzeug, aus dem Kopf des Kerns
   (tools/lib/navicon.js). Eine Kopie von Hand gibt es nicht.

     node tools/navicon-einsetzen.js --check                 Exit 1, wenn eine Seite keinen oder einen abweichenden Bereich hat
     node tools/navicon-einsetzen.js --schreiben             füllt die Bereiche; fehlt einer, steht er nach </title>
     node tools/navicon-einsetzen.js --quelle <kern> …       anderer Kern, etwa der eines Partnerprodukts (White Label)
     node tools/navicon-einsetzen.js --wurzel <dir> …        anderes Verzeichnis mit Seiten (Vorgabe: das Repo)

   Probe: eine nicht öffentliche Probe
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const N = require('./lib/navicon.js');

const REPO = path.join(__dirname, '..');
const KERN_DATEI = 'vivodepot.html';

// Jede HTML-Datei im Wurzelverzeichnis außer dem Kern selbst.
function seitenIn(wurzel) {
  return fs.readdirSync(wurzel).filter((d) => d.endsWith('.html') && d !== KERN_DATEI && fs.statSync(path.join(wurzel, d)).isFile()).sort();
}

function seiteSetzen(html, bereich) {
  const ist = N.seitenBereichIn(html);
  if (ist) return html.slice(0, ist.anfang) + bereich + html.slice(ist.ende);
  if (html.includes(N.SEITE_BEGIN) || html.includes(N.SEITE_END)) throw new Error('Bereich NAVICON unvollständig oder doppelt');
  const m = /<\/title>[^\n]*\n/i.exec(html);
  if (!m) throw new Error('kein </title> im Kopf, der Bereich hat keinen festen Ort');
  const nach = m.index + m[0].length;
  return html.slice(0, nach) + bereich + '\n' + html.slice(nach);
}

function pruefen({ wurzel = REPO, quelle = path.join(wurzel, KERN_DATEI) } = {}) {
  const bereich = N.seitenBereich(N.naviconLinks({ quelle }));
  return seitenIn(wurzel).map((datei) => {
    const html = fs.readFileSync(path.join(wurzel, datei), 'utf8');
    const ist = N.seitenBereichIn(html);
    const grund = !ist ? 'kein Bereich NAVICON' : (ist.text !== bereich ? 'Bereich weicht vom Kern ab' : null);
    return { datei, ok: !grund, grund };
  });
}

function schreiben({ wurzel = REPO, quelle = path.join(wurzel, KERN_DATEI) } = {}) {
  const bereich = N.seitenBereich(N.naviconLinks({ quelle }));
  return seitenIn(wurzel).map((datei) => {
    const p = path.join(wurzel, datei);
    const alt = fs.readFileSync(p, 'utf8');
    let neu;
    try { neu = seiteSetzen(alt, bereich); } catch (e) { throw new Error(datei + ': ' + e.message); }
    if (neu !== alt) fs.writeFileSync(p, neu, 'utf8');
    return { datei, geaendert: neu !== alt };
  });
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf(n); return (i >= 0 && argv[i + 1]) ? path.resolve(argv[i + 1]) : null; };
  const wurzel = wert('--wurzel') || REPO;
  const quelle = wert('--quelle') || path.join(wurzel, KERN_DATEI);
  if (argv.includes('--schreiben')) {
    for (const r of schreiben({ wurzel, quelle })) process.stdout.write((r.geaendert ? 'gesetzt     ' : 'unverändert ') + r.datei + '\n');
    return;
  }
  if (!argv.includes('--check')) { process.stderr.write('navicon-einsetzen: --check oder --schreiben\n'); process.exitCode = 2; return; }
  const rot = pruefen({ wurzel, quelle }).filter((r) => !r.ok);
  for (const r of rot) process.stdout.write('ROT ' + r.datei + ': ' + r.grund + '\n');
  if (rot.length) { process.stdout.write('Beheben: node tools/navicon-einsetzen.js --schreiben\n'); process.exitCode = 1; }
  else process.stdout.write('navicon-einsetzen: alle Seiten tragen das Icon des Kerns.\n');
}

if (require.main === module) {
  try { main(); } catch (e) { process.stderr.write('navicon-einsetzen: ABBRUCH — ' + e.message + '\n'); process.exitCode = 1; }
}

module.exports = { seitenIn, seiteSetzen, pruefen, schreiben, KERN_DATEI };
