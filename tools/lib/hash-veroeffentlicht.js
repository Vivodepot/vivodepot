'use strict';
/* Proben dürfen nur an veröffentlichten Commits hängen (03.10.2026, Befund PROBEN-LOKALE-HASHES).
   Der erste echte Lauf auf dem eigenen Runner war rot, weil Proben `git show <hash>:…` oder einen echten Hash als
   Beleg nutzten, der nur auf einem Arbeitsrechner lag. Auf jedem anderen Klon ist so eine Probe rot — oder sie ist nur
   grün, solange niemand die lokalen Zweige aufräumt.
   unveroeffentlichteHashes() sucht in den gegebenen Dateien jeden Hex-Wert in Anführungszeichen (7 bis 40 Zeichen), der
   in diesem Klon ein Commit IST, und meldet ihn, wenn kein Zweig auf origin ihn enthält. Werte, die kein Commit sind
   (erfundene Hashes wie 'deadbeef' oder 'a'.repeat(40)), sind keine Abhängigkeit und bleiben unbeachtet.
   Probe: tests/proben-hashes-veroeffentlicht.test.js. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./ohne-git-umgebung.js');

const HEX_IN_ANFUEHRUNG = /['"]([0-9a-f]{7,40})(?::[^'"]*)?['"]/g;   // Code-Anführungszeichen; Backticks in Kommentaren zählen nicht

function standardGit(repo) {
  return (args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function unveroeffentlichteHashes(dateien, { repo, git = standardGit(repo) } = {}) {
  const istCommit = new Map();
  const aufOrigin = new Map();
  const commit = (h) => {
    if (!istCommit.has(h)) { try { git(['cat-file', '-e', h + '^{commit}']); istCommit.set(h, true); } catch (_) { istCommit.set(h, false); } }
    return istCommit.get(h);
  };
  const veroeffentlicht = (h) => {
    if (!aufOrigin.has(h)) {
      let aus = '';
      // Veröffentlicht = in einem Zweig auf origin oder unter einem Tag (Quell-Tags wie quelle-v1.0.857 machen ihren Commit
      // per Tag abrufbar). Ein nur lokaler Tag würde hier mitzählen — Tags entstehen bei uns nur über den Release-Weg.
      try { aus = git(['branch', '-r', '--contains', h, '--list', 'origin/*']) || git(['tag', '--contains', h]); } catch (_) { aus = ''; }
      aufOrigin.set(h, aus !== '');
    }
    return aufOrigin.get(h);
  };
  const funde = [];
  for (const datei of dateien) {
    const text = fs.readFileSync(path.join(repo, datei), 'utf8');
    text.split('\n').forEach((zeile, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(zeile)) return;   // Kommentarzeilen nennen Hashes als Geschichte, nicht als Abhängigkeit
      for (const m of zeile.matchAll(HEX_IN_ANFUEHRUNG)) {
        const h = m[1];
        if (/^(.)\1+$/.test(h)) continue;   // '0000000', 'aaaaaaa': Platzhalter
        if (commit(h) && !veroeffentlicht(h)) funde.push(`Hash nicht veröffentlicht: ${h} in ${datei}:${i + 1}`);
      }
    });
  }
  return funde;
}

/* Erzeugte Dokumente (04.10.2026, Befund ERZEUGNIS-STEMPEL-ARBEITSSTAND): Erzeuger stempelten „Commit `<hash> (Arbeitsstand,
   noch nicht gepusht)`“. Das Etikett beschreibt den Zustand zur Erzeugungszeit und wird mit dem Push falsch, steht aber
   weiter da (DOCS.md, docs/faktenbasis.md trugen 08fd371cf so, als er längst auf u2-kanon lag). Für Erzeugnisse gilt
   strenger als für Proben: ein gestempelter Hash dieses Repos muss von origin/u2-kanon aus erreichbar sein — ein
   Prüfzweig (vorpruefung/*) wird gelöscht, dann wäre der Hash tot. Und das Etikett „noch nicht gepusht“ darf nicht
   stehen: entweder „Stand Kanon“ mit erreichbarem Hash oder kein Hash. Hashes eines anderen Repos (z. B. das Ziel in
   vivodepot-ios-test) sind hier keine Commits und werden nur am Etikett gemessen.
   Die Probe dazu (Erzeugnis-Stempel) läuft drinnen, neben den Stand-Dokumenten. */
const HEX_IN_BACKTICK = /`([0-9a-f]{7,40})(?: \(([^)`]*)\))?`([^`\n]{0,40})/g;
const ETIKETT_UNGEPUSHT = /noch nicht gepusht|nicht gepusht|Arbeitsstand/i;

function erzeugnisStempelBefunde(dateien, { repo, git = standardGit(repo), ref = 'origin/u2-kanon', lesen } = {}) {
  const lies = lesen || ((d) => fs.readFileSync(path.join(repo, d), 'utf8'));
  const istCommit = new Map();
  const erreichbar = new Map();
  const commit = (h) => {
    if (!istCommit.has(h)) { try { git(['cat-file', '-e', h + '^{commit}']); istCommit.set(h, true); } catch (_) { istCommit.set(h, false); } }
    return istCommit.get(h);
  };
  const vonRef = (h) => {
    if (!erreichbar.has(h)) { try { git(['merge-base', '--is-ancestor', h, ref]); erreichbar.set(h, true); } catch (_) { erreichbar.set(h, false); } }
    return erreichbar.get(h);
  };
  const funde = [];
  for (const datei of dateien) {
    let text;
    try { text = lies(datei); } catch (_) { continue; }
    text.split('\n').forEach((zeile, i) => {
      for (const m of zeile.matchAll(HEX_IN_BACKTICK)) {
        const [, h, inKlammer = '', danach = ''] = m;
        if (ETIKETT_UNGEPUSHT.test(inKlammer) || ETIKETT_UNGEPUSHT.test(danach)) {
          funde.push(`Etikett „noch nicht gepusht“ im Erzeugnis: ${h} in ${datei}:${i + 1}`);
        } else if (commit(h) && !vonRef(h)) {
          funde.push(`Hash nicht von ${ref} erreichbar: ${h} in ${datei}:${i + 1}`);
        }
      }
    });
  }
  return funde;
}

module.exports = { unveroeffentlichteHashes, HEX_IN_ANFUEHRUNG, erzeugnisStempelBefunde };
