#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   icd-alphabet-begriffe.js — die genutzten Begriffe aus dem Alphabetischen
   Verzeichnis zur ICD-10-GM gegen die Klassifikationsdatei (06.10.2026,
   ICD-Anzeige, Befund ICD-TITEL-LIVE-VERAENDERT)
   ────────────────────────────────────────────────────────────────────────
   code-listen/icd10.json führt unter `alphabet.eintraege` nur die Einträge,
   die die Anzeige nutzt (Alltagsbegriff, Suchbegriffe), je mit der
   BfArM-internen laufenden Nummer (Feld 2). Dieses Werkzeug prüft, dass jeder
   davon zeichengleich so in der Datei steht (§ 62 UrhG: unverändert) und in
   der Buchfassung erscheint (Druckkennzeichen 1), und listet auf Wunsch die
   Kandidaten je Code. Die Datei selbst liegt nie im Repo — nur der Auszug.
   Format laut Liesmich des BfArM: acht Felder, getrennt durch „|“ (Art der
   Kodierung | Nummer | Druckkennzeichen | Primärschlüssel 1 | Stern | Zusatz |
   Primärschlüssel 2 | Text).
   Aufruf:
     node tools/icd-alphabet-begriffe.js --alphabet <icd10gm…alpha_edvtxt_….txt> [--liste <icd10.json>] [--kandidaten]
   Ohne --alphabet läuft es gegen die erfundene Fixture tests/fixtures/icd-alphabet/.
   Gehalten von tests/icd-anzeige-amtlich.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'icd-alphabet');

function zeilen(text) {
  return String(text).split(/\r?\n/).filter(Boolean).map((z) => {
    const f = z.split('|');
    return { art: f[0], nr: f[1], druck: f[2], code1: f[3], code2: f[6], text: f[7] };
  }).filter((z) => z.text !== undefined);
}

// Befund: jeder Eintrag des Auszugs steht zeichengleich, mit seiner Nummer und seinem Code, in der Buchfassung.
function befund(alphabetText, liste) {
  const idx = new Map(zeilen(alphabetText).map((z) => [z.nr, z]));
  const funde = [];
  for (const e of ((liste.alphabet || {}).eintraege || [])) {
    const z = idx.get(String(e.nr));
    if (!z) { funde.push(e.nr + ': Nummer nicht im Verzeichnis'); continue; }
    if (z.code1 !== e.code && z.code2 !== e.code) funde.push(e.nr + ': Code ' + e.code + ' statt ' + [z.code1, z.code2].filter(Boolean).join('/'));
    if (z.text !== e.text) funde.push(e.nr + ': „' + e.text + '“ statt „' + z.text + '“');
    if (z.druck !== '1') funde.push(e.nr + ': nicht in der Buchfassung (Druckkennzeichen ' + z.druck + ')');
  }
  return funde;
}

function kandidaten(alphabetText, code) {
  return zeilen(alphabetText).filter((z) => (z.code1 === code || z.code2 === code) && z.druck === '1').map((z) => z.nr + '  ' + z.text);
}

function argWert(argv, n) { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; }

if (require.main === module) {
  const argv = process.argv.slice(2);
  const alphabet = argWert(argv, '--alphabet') || path.join(FIXTURE, 'alphabet.txt');
  const listePfad = argWert(argv, '--liste') || (argWert(argv, '--alphabet') ? path.join(REPO, 'code-listen', 'icd10.json') : path.join(FIXTURE, 'liste.json'));
  const text = fs.readFileSync(alphabet, 'utf8');
  const liste = JSON.parse(fs.readFileSync(listePfad, 'utf8'));
  if (argv.includes('--kandidaten')) for (const d of liste.daten || []) console.log(d.code + '\n  ' + kandidaten(text, d.code).join('\n  '));
  const f = befund(text, liste);
  if (f.length) { console.error('icd-alphabet-begriffe: ' + f.length + ' Abweichung(en)\n  ' + f.join('\n  ')); process.exit(1); }
  console.log('icd-alphabet-begriffe: ' + ((liste.alphabet || {}).eintraege || []).length + ' Einträge zeichengleich im Verzeichnis.');
}

module.exports = { zeilen, befund, kandidaten };
