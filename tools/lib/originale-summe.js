'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   originale-summe.js — die Summe der Originalsätze je Basissprache, für das Werkzeug der Prüfstelle
   (U2-ADR-441 §4, 28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Ein Sprachmodul einer Prüfstelle trägt `originaleSumme: { kern: { de, en } }`: je Basissprache die Prüfsumme der
   Zusicherungssätze, die die Stelle vor sich hatte. Seit U2-ADR-428 trägt ein Produkt nur seine Basissprache; der Kern
   (`_originaleSummeKern` in vivodepot.html) prüft darum gegen die Summe SEINER Sprache. Dieses Modul rechnet dieselbe
   Summe außerhalb des Kerns, aus genau den zwei Sprachmoduldateien eines genannten Stands (`git show <stand>:…`),
   damit die Stelle nicht gegen den Arbeitsbaum rechnet. Gleichheit mit dem Kern hält
   eine Probe der Suite je Sprache.

   DIE FORM MUSS DIE DES KERNS SEIN: kanonisches JSON { sprache, saetze: [{ k, text }] }, Schlüssel sortiert, fehlender
   Satz als null, SHA-256 hex. Ändert sich eine Seite, fällt die Gleichheitsprobe.
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./ohne-git-umgebung.js');

const SPRACHMODULE = Object.freeze({ de: 'tools/textsatz-de-modul.json', en: 'tools/textsatz-en-modul.json' });

function kanonischJSON(x) {
  if (Array.isArray(x)) return '[' + x.map(kanonischJSON).join(',') + ']';
  if (x && typeof x === 'object') {
    return '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + kanonischJSON(x[k])).join(',') + '}';
  }
  return JSON.stringify(x === undefined ? null : x);
}

// Die Zusicherungs-Schlüssel aus dem generierten Bereich des Kerns.
function zusicherungsSchluessel(kernText) {
  const a = kernText.indexOf('/* ZUSICHERUNGS-SCHLUESSEL-KERN:BEGIN');
  const e = kernText.indexOf('/* ZUSICHERUNGS-SCHLUESSEL-KERN:END */');
  if (a < 0 || e < a) throw new Error('originale-summe: Bereich ZUSICHERUNGS-SCHLUESSEL-KERN im Kern nicht gefunden');
  return [...kernText.slice(a, e).matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);
}

function summe(texte, sprache, schluessel) {
  const saetze = [...schluessel].sort().map((k) => {
    const kennung = 'strings:' + k + '.text';
    return { k, text: texte[kennung] === undefined ? null : texte[kennung] };
  });
  return crypto.createHash('sha256').update(kanonischJSON({ sprache, saetze }), 'utf8').digest('hex');
}

// { stand, kern: { de, en } } — alles aus dem genannten Stand, nicht aus dem Arbeitsbaum.
function originaleSummenFuerStand(repo, stand) {
  const zeige = (pfad) => execFileSync('git', ['show', stand + ':' + pfad],
    { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 });
  const schluessel = zusicherungsSchluessel(zeige('vivodepot.html'));
  const kern = {};
  for (const [sprache, pfad] of Object.entries(SPRACHMODULE)) {
    const m = JSON.parse(zeige(pfad));
    if (m.sprache !== sprache) throw new Error('originale-summe: ' + pfad + ' trägt sprache ' + m.sprache);
    kern[sprache] = summe(m.texte || {}, sprache, schluessel);
  }
  return { stand, kern };
}

module.exports = { SPRACHMODULE, kanonischJSON, zusicherungsSchluessel, summe, originaleSummenFuerStand };
