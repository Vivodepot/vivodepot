#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   originale-summen-beleg.js — der Beleg der Summen der Originalsätze im Repository (12.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Ein Sprachmodul einer Prüfstelle nennt die Summe der Zusicherungssätze, die die Stelle vor sich hatte. Ändert jemand
   einen dieser Sätze, gilt keine Bescheinigung mehr, bis die Stelle neu gerechnet hat. Ohne Beleg wäre das der stille
   Nebeneffekt einer Textkorrektur. Mit Beleg steht es im Diff: die Probe ist rot, bis dieser Lauf die neue Summe schreibt.

   Aufruf:  node tools/originale-summen-beleg.js              → Beleg gegen den Baum, Exit 1 bei Abweichung
            node tools/originale-summen-beleg.js --schreiben  → Beleg aus dem Baum schreiben
   Probe:   tests/lese-app-pruefer-geltung.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const OS = require('./lib/originale-summe.js');

const REPO = path.join(__dirname, '..');
const BELEG = 'tools/originale-summen-stand.json';

function belegText(repo) {
  const s = OS.originaleSummenAusBaum(repo || REPO);
  return JSON.stringify({
    _zweck: 'Summen der Zusicherungssätze je Anwendung und Sprache. Eine Änderung entwertet die Bescheinigungen der Prüfstellen für diese Anwendung und Sprache, bis neu gerechnet ist. Schreibt nur tools/originale-summen-beleg.js --schreiben.',
    kern: s.kern, lesen: s.lesen,
    // Dieselben Werte als Liste: daran misst das Gegenlesungs-Register jede Änderung (ein geänderter Wert ist ein
    // entfernter und ein neuer Eintrag). Eine Änderung entwertet Bescheinigungen Dritter und wird im Commit benannt.
    werte: [].concat(...['kern', 'lesen'].map((app) => Object.keys(s[app]).sort().map((sprache) => app + '.' + sprache + ':' + s[app][sprache]))),
  }, null, 1) + '\n';
}
// → { gleich, soll, ist }
function belegPruefen(repo) {
  const r = repo || REPO;
  const soll = belegText(r);
  let ist = null;
  try { ist = fs.readFileSync(path.join(r, BELEG), 'utf8'); } catch (_) { ist = null; }
  return { gleich: ist === soll, soll, ist };
}

if (require.main === module) {
  if (process.argv.includes('--schreiben')) {
    fs.writeFileSync(path.join(REPO, BELEG), belegText(REPO));
    console.log('[originale-summen] ' + BELEG + ' geschrieben.');
  } else {
    const p = belegPruefen(REPO);
    if (p.gleich) console.log('[originale-summen] OK — der Beleg nennt die Summen dieses Baums.');
    else {
      console.error('[originale-summen] ABWEICHUNG: ' + BELEG + (p.ist === null ? ' fehlt.' : ' nennt andere Summen als dieser Baum.')
        + ' Ein Zusicherungssatz oder ein Schlüssel hat sich geändert: das entwertet Bescheinigungen. Mit Absicht: --schreiben.');
      process.exitCode = 1;
    }
  }
}

module.exports = { BELEG, belegText, belegPruefen };
