'use strict';
/* Das Ziel-Repo eines Auslieferungs-Werkzeugs gegen sein origin/main halten (04.10.2026, Befund ZIELREPO-ABGEZWEIGT).
   tools/testfassung-legen.js und tools/modul-app-packen.js schreiben in das lokale main von vivodepot-ios-test. Am
   04.10. war es seit dem 02.09. abgezweigt: drei nie gepushte Commits lokal, sieben andere auf origin. Der nächste Lauf
   hätte still auf dem überholten Stand gebaut, und die Vermerke im Kanon belegten Stände, die es öffentlich nicht gab.

   Vier Lagen nach `git fetch origin main`:
     gleich      → in Ordnung
     dahinter    → mit `--ff-only` nachziehen (nur wenn der Aufrufer schreiben darf, also nicht bei --dry-run); scheitert
                   das, Abbruch. Nie still auf dem alten Stand bauen.
     voraus      → rot. Die Prüfung läuft am Laufbeginn, vor den eigenen Commits des Werkzeugs; wer dort schon voraus
                   ist, trägt Commits aus einem FRÜHEREN Lauf oder von Hand. Ein Betreff-Präfix belegt den Lauf nicht —
                   genau so lagen „harness: v487“ und „modul-apps: …“ vom 11.09. drei Wochen nur lokal.
     abgezweigt  → rot
   Ein origin, das sich nicht holen lässt, ist ebenfalls rot: ohne frischen Stand ist keine Lage bestimmbar.
   Probe: tests/zielrepo-stand.test.js */
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./ohne-git-umgebung.js');

function standardGit(cwd) {
  return (args) => execFileSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function istVorfahr(git, a, b) {
  try { git(['merge-base', '--is-ancestor', a, b]); return true; } catch (_) { return false; }
}

/* → { lage, funde, nachgezogen } — funde leer heißt: das Werkzeug darf schreiben. */
function zielStandPruefen(ziel, { git = standardGit(ziel), nachziehen = false, holen = true } = {}) {
  const funde = [];
  if (holen) {
    try { git(['fetch', '-q', 'origin', 'main']); }
    catch (e) { return { lage: 'unbekannt', funde: ['Zielrepo: origin/main lässt sich nicht holen (' + ziel + ') — ohne frischen Stand keine Lage, NICHT geschrieben.'], nachgezogen: false }; }
  }
  const lokal = git(['rev-parse', 'HEAD']);
  const fern = git(['rev-parse', 'origin/main']);
  if (lokal === fern) return { lage: 'gleich', funde, nachgezogen: false };
  if (istVorfahr(git, lokal, fern)) {
    if (!nachziehen) return { lage: 'dahinter', funde, nachgezogen: false };
    try { git(['merge', '--ff-only', '-q', 'origin/main']); }
    catch (e) { return { lage: 'dahinter', funde: ['Zielrepo liegt hinter origin/main und lässt sich nicht vorspulen (' + ziel + ') — NICHT geschrieben.'], nachgezogen: false }; }
    return { lage: 'dahinter', funde, nachgezogen: true };
  }
  if (istVorfahr(git, fern, lokal)) {
    const betreffe = git(['log', '--format=%h %s', 'origin/main..HEAD']).split('\n').filter(Boolean);
    funde.push('Zielrepo ist origin/main voraus, mit Commits, die nicht aus diesem Lauf stammen (' + ziel + '): ' + betreffe.join('; ')
      + ' — erst pushen oder Sicherungsref setzen und zurückstellen, NICHT geschrieben.');
    return { lage: 'voraus', funde, nachgezogen: false };
  }
  const basis = git(['merge-base', lokal, fern]);
  funde.push('Zielrepo ist von origin/main abgezweigt (' + ziel + '): lokal ' + lokal.slice(0, 9) + ', origin ' + fern.slice(0, 9)
    + ', Basis ' + basis.slice(0, 9) + ' — erst Sicherungsref setzen und zurückstellen, NICHT geschrieben.');
  return { lage: 'abgezweigt', funde, nachgezogen: false };
}

module.exports = { zielStandPruefen };
