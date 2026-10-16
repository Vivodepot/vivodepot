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

   DIE LESE-APP (12.10.2026): eine Anwendung verlangt die Summe für jede Sprache, die sie eingebaut führt. Die Lese-App
   führt Deutsch und Englisch und verlangt `originaleSumme.lesen.de` und `.en` (`_originaleSummeLesen` in
   vivodepot-lesen.html). Ihre Form trägt die Anwendung in den gerechneten Bytes: { app: 'lesen', sprache, saetze }. Eine
   Summe des Kerns trifft dort nie. Die Sätze stehen in der Lese-App selbst (deutsch `_STRINGS_EINGEBAUT`, englisch
   `ZUSICHERUNG_TEXTE_EN`), die Schlüssel im erzeugten Bereich ZUSICHERUNGS-SCHLUESSEL; gelesen wird aus der Datei des
   genannten Stands, ohne die Anwendung zu starten.
   ════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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

/* ── Lese-App ─────────────────────────────────────────────────────────────── */
const LESE_APP = 'vivodepot-lesen.html';
const LESE_SPRACHEN = Object.freeze(['de', 'en']);
const LESE_SATZTABELLEN = Object.freeze({ de: 'const _STRINGS_EINGEBAUT = (', en: 'const ZUSICHERUNG_TEXTE_EN = Object.freeze(' });

// Die Zusicherungs-Schlüssel aus dem erzeugten Bereich der Lese-App.
function zusicherungsSchluesselLesen(leseText) {
  const a = leseText.indexOf('/* ZUSICHERUNGS-SCHLUESSEL:BEGIN');
  const e = leseText.indexOf('/* ZUSICHERUNGS-SCHLUESSEL:END */');
  if (a < 0 || e < a) throw new Error('originale-summe: Bereich ZUSICHERUNGS-SCHLUESSEL in der Lese-App nicht gefunden');
  const schluessel = [...leseText.slice(a, e).matchAll(/^\s*'([^']+)',?\s*$/gm)].map((m) => m[1]);
  if (!schluessel.length) throw new Error('originale-summe: der Bereich ZUSICHERUNGS-SCHLUESSEL der Lese-App nennt keinen Schlüssel');
  return schluessel;
}
// Eine Satztabelle der Lese-App als Objekt: das Literal hinter `anfang` bis zur ersten Zeile `});`, ausgewertet ohne
// Umgebung. Nennt das Literal je einen Bezeichner, wirft die Auswertung, statt etwas zu raten.
function satztabelleLesen(leseText, sprache) {
  const anfang = LESE_SATZTABELLEN[sprache];
  if (!anfang) throw new Error('originale-summe: die Lese-App führt die Sprache ' + sprache + ' nicht eingebaut');
  const a = leseText.indexOf(anfang);
  const e = a < 0 ? -1 : leseText.indexOf('\n});', a);
  if (a < 0 || e < 0) throw new Error('originale-summe: Satztabelle ' + sprache + ' in der Lese-App nicht gefunden');
  const t = vm.runInNewContext('(' + leseText.slice(a + anfang.length, e + 2) + ')', Object.create(null), { timeout: 2000 });
  if (!t || typeof t !== 'object') throw new Error('originale-summe: Satztabelle ' + sprache + ' ist kein Objekt');
  return t;
}
function summeLesen(texte, sprache, schluessel) {
  const saetze = [...schluessel].sort().map((k) => ({ k, text: typeof texte[k] === 'string' ? texte[k] : null }));
  return crypto.createHash('sha256').update(kanonischJSON({ app: 'lesen', sprache, saetze }), 'utf8').digest('hex');
}

// { kern: { de, en }, lesen: { de, en } } aus einer Lesefunktion `zeige(pfad) → Text`.
function _summenAus(zeige) {
  const schluessel = zusicherungsSchluessel(zeige('vivodepot.html'));
  const kern = {};
  for (const [sprache, pfad] of Object.entries(SPRACHMODULE)) {
    const m = JSON.parse(zeige(pfad));
    if (m.sprache !== sprache) throw new Error('originale-summe: ' + pfad + ' trägt sprache ' + m.sprache);
    kern[sprache] = summe(m.texte || {}, sprache, schluessel);
  }
  const leseText = zeige(LESE_APP);
  const leseSchluessel = zusicherungsSchluesselLesen(leseText);
  const lesen = {};
  for (const sprache of LESE_SPRACHEN) lesen[sprache] = summeLesen(satztabelleLesen(leseText, sprache), sprache, leseSchluessel);
  return { kern, lesen };
}
// { stand, kern: { de, en }, lesen: { de, en } } — alles aus dem genannten Stand, nicht aus dem Arbeitsbaum.
function originaleSummenFuerStand(repo, stand) {
  const zeige = (pfad) => execFileSync('git', ['show', stand + ':' + pfad],
    { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024 });
  return Object.assign({ stand }, _summenAus(zeige));
}
// Dieselben Summen aus den Dateien eines Baums: für den Beleg im Repository und seine Probe.
function originaleSummenAusBaum(repo) {
  return _summenAus((pfad) => fs.readFileSync(path.join(repo, pfad), 'utf8'));
}

module.exports = {
  SPRACHMODULE, LESE_APP, LESE_SPRACHEN, kanonischJSON, zusicherungsSchluessel, summe,
  zusicherungsSchluesselLesen, satztabelleLesen, summeLesen, originaleSummenFuerStand, originaleSummenAusBaum,
};
