#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   platzhalter-pruefen.js — kein ausgeliefertes HTML trägt einen Platzhalter (26.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS. Der Vorlagen-Generator auf register.vivodepot.de zeigte im eingebauten Impressum „Vertretungsberechtigt: die
   Geschäftsführung (Name vor der Freigabe einsetzen)" — eine Pflichtangabe, live unvollständig. Der Text war als
   „nicht Entwurf" markiert, kein Wächter las ihn. Das Impressum steht seitdem nur noch auf vivodepot.de; dieses Werkzeug hält
   die ganze Klasse: kein Platzhalter in einer Datei, die jemand öffnet.

   WAS ALS PLATZHALTER GILT: feste Wendungen, die nur in einem unfertigen Text stehen (PLATZHALTER unten). „TODO" und „XXX"
   zählen nur außerhalb von Kommentaren und eingebetteten Daten: im Code des Kerns stehen sie in Kommentaren (U2-ADR-XXX als
   Verweis, ein TODO an einer bewusst offenen Schnittstelle) und in Base64-Schriften — beides sieht niemand.

   GEPRÜFT WIRD: jede versionierte HTML-Datei außerhalb von tests/ und die Seite, die tools/feldregister-bauen.js für
   register.vivodepot.de baut.

   Aufruf:
     node tools/platzhalter-pruefen.js                   # der Bestand
     node tools/platzhalter-pruefen.js --datei <pfad>    # eine Datei (Rot-Beweis, Website-Pakete)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const PLATZHALTER = [
  /vor der Freigabe einsetzen/i,
  /before release\)/i,
  /\bName einsetzen\b/i,
  /\[\s*BITTE\b/,
  /\[\s*PLEASE\b/,
  /\bLorem ipsum\b/i,
  /\bTODO\b/,
  /\bXXX\b/,
  /\bFIXME\b/,
];

// Was niemand sieht, fällt heraus: HTML- und JS-Blockkommentare, Zeilenkommentare, eingebettete data:-URIs.
function sichtbarerText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:"'\\])\/\/[^\n]*/g, '$1 ')
    .replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, ' ');
}

function pruefen(html, name) {
  const text = sichtbarerText(html);
  const funde = [];
  for (const muster of PLATZHALTER) {
    const m = muster.exec(text);
    if (m) {
      const um = text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40).replace(/\s+/g, ' ').trim();
      funde.push(name + ': „' + m[0] + '" — …' + um + '…');
    }
  }
  return funde;
}

function ausgelieferteDateien() {
  const aus = execFileSync('git', ['ls-files', '*.html'], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8' });
  return aus.split('\n').filter((d) => d && !d.startsWith('tests/'));
}

function bestandPruefen() {
  const funde = [];
  const dateien = ausgelieferteDateien();
  for (const d of dateien) funde.push(...pruefen(fs.readFileSync(path.join(REPO, d), 'utf8'), d));
  const register = require('./feldregister-bauen.js').bauen({});
  funde.push(...pruefen(register.html, 'register.vivodepot.de (tools/feldregister-bauen.js)'));
  return { dateien: dateien.length + 1, funde };
}

module.exports = { pruefen, sichtbarerText, bestandPruefen, ausgelieferteDateien, PLATZHALTER };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--datei');
  const { dateien, funde } = i >= 0
    ? { dateien: 1, funde: pruefen(fs.readFileSync(path.resolve(argv[i + 1]), 'utf8'), argv[i + 1]) }
    : bestandPruefen();
  if (funde.length) {
    console.log('[platzhalter] ROT — ' + funde.length + ' Platzhalter in ' + dateien + ' Dateien:');
    for (const f of funde) console.log('  - ' + f);
    process.exit(1);
  }
  console.log('[platzhalter] grün — ' + dateien + ' ausgelieferte Dateien ohne Platzhalter.');
}
