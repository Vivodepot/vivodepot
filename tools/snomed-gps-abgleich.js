#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   snomed-gps-abgleich.js — die Freigabeliste gegen einen GPS-Release (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Jede Kennung in tools/snomed-freigabe.json („freigegeben") muss im Global
   Patient Set stehen, dort AKTIV sein, ihr `begriff` muss der US Preferred
   Term sein — oder, mit `begriffArt: "fsn"`, der Fully Specified Name, wo ein
   Profil ihn als display fixiert —, und ihr Feld `gps` muss den geprüften Release nennen
   (`gps: { release, aktiv: true }`). Eine inaktive Kennung darf in keiner
   Auslieferung stehen — der Register-Generator trug bis v806 eine.
   Die angefragten Kennungen (interne Ergänzung der Freigabeliste) werden mitgemeldet,
   nicht bewertet.

   Der Release selbst kommt NICHT ins Repo (Lizenz CC BY-ND, 40 MB). Er liegt
   in der internen Ablage; bei jedem neuen Release ist der Abgleich ein Befehl
   (Teil der internen Release-Checkliste).

   Aufruf:
     node tools/snomed-gps-abgleich.js --gps <release.zip|release.txt> [--freigabe <json>]
   Ohne --gps: gegen die erfundene Fixture tests/fixtures/snomed-gps-abgleich/,
   damit die Suite das Werkzeug fährt.
   Ausgang 0 = stimmt, 1 = Befund, 2 = Aufruf/Datei nicht lesbar (nie still grün).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'snomed-gps-abgleich');

function releaseLesen(pfad) {
  if (/\.zip$/i.test(pfad)) {
    const liste = execFileSync('unzip', ['-Z1', pfad], { encoding: 'utf8' }).split('\n');
    const eintrag = liste.find((n) => /GPSRelease.*\.txt$/.test(n));
    if (!eintrag) throw new Error(pfad + ': keine GPSRelease-*.txt im Archiv');
    return { text: execFileSync('unzip', ['-p', pfad, eintrag], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }), name: eintrag };
  }
  return { text: fs.readFileSync(pfad, 'utf8'), name: path.basename(pfad) };
}

// Release-Kennung aus dem Dateinamen: …_20260101T120000Z.txt → "20260101".
function releaseAusName(name) {
  const m = /_(\d{8})T\d{6}Z/.exec(name);
  return m ? m[1] : null;
}

function releaseTabelle(text) {
  const zeilen = text.split(/\r?\n/).filter(Boolean);
  const kopf = zeilen[0].split('\t');
  if (kopf[0] !== 'ConceptID' || kopf[1] !== 'Active') throw new Error('unerwarteter Kopf: ' + zeilen[0]);
  const t = new Map();
  for (const z of zeilen.slice(1)) {
    const [id, aktiv, fsn, pt] = z.split('\t');
    t.set(id, { aktiv: aktiv === '1', fsn, pt });
  }
  return t;
}

function abgleich({ freigabe, offen, tabelle, release }) {
  const befund = [];
  for (const [id, e] of Object.entries(freigabe.freigegeben || {})) {
    const g = tabelle.get(id);
    if (!g) { befund.push(id + ': nicht im GPS ' + release); continue; }
    if (!g.aktiv) befund.push(id + ': im GPS ' + release + ' INAKTIV');
    // `begriffArt: "fsn"`: der Fully Specified Name, wo ein Profil ihn als display fixiert (KBV-PKA, U2-ADR-471); sonst der US Preferred Term.
    if (e.begriffArt === 'fsn') { if (e.begriff !== g.fsn) befund.push(id + ': begriff „' + e.begriff + '" ist nicht der FSN „' + g.fsn + '"'); }
    else if (e.begriff !== g.pt) befund.push(id + ': begriff „' + e.begriff + '" ist nicht der US Preferred Term „' + g.pt + '"');
    if (!e.gps || e.gps.release !== release || e.gps.aktiv !== true) {
      befund.push(id + ': Feld gps nennt nicht { release: "' + release + '", aktiv: true }');
    }
  }
  const hinweise = Object.keys((offen && offen.offen) || {}).map((id) => {
    const g = tabelle.get(id);
    return id + ' (angefragt): ' + (g ? (g.aktiv ? 'aktiv' : 'INAKTIV') + ' im GPS ' + release + ', ' + g.pt : 'nicht im GPS ' + release);
  });
  return { befund, hinweise };
}

function argWert(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main(argv) {
  const gps = argWert(argv, '--gps') || path.join(FIXTURE, 'SnomedINTL_GPSRelease_PRODUCTION_20990101T120000Z.txt');
  const freigabePfad = argWert(argv, '--freigabe') || (argWert(argv, '--gps') ? path.join(REPO, 'tools', 'snomed-freigabe.json') : path.join(FIXTURE, 'freigabe.json'));
  let r;
  try {
    const { text, name } = releaseLesen(gps);
    const release = releaseAusName(name);
    if (!release) throw new Error(name + ': Release-Datum nicht im Dateinamen');
    // Mit interner Ergänzung, wenn es sie gibt: dann stehen die angefragten Kennungen unter `offen` (nur gemeldet, nicht bewertet).
    const freigabe = require('./lib/mit-interner-ergaenzung.js').lesenMitErgaenzung(freigabePfad);
    const offen = freigabe.offen ? { offen: freigabe.offen } : null;
    r = { ...abgleich({ freigabe, offen, tabelle: releaseTabelle(text), release }), release, n: Object.keys(freigabe.freigegeben || {}).length };
  } catch (e) {
    console.error('snomed-gps-abgleich: ' + e.message);
    return 2;
  }
  for (const h of r.hinweise) console.log('  ' + h);
  if (r.befund.length) {
    console.error('snomed-gps-abgleich: ' + r.befund.length + ' Befund(e) gegen GPS ' + r.release + ':\n  ' + r.befund.join('\n  '));
    return 1;
  }
  console.log('snomed-gps-abgleich: ' + r.n + ' freigegebene Konzepte, alle aktiv im GPS ' + r.release + ', Begriffe = US Preferred Term bzw. FSN, wo so vermerkt.');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { releaseTabelle, releaseAusName, abgleich, main };
