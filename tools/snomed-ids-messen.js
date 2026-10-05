'use strict';
/* ════════════════════════════════════════════════════════════════════════
   snomed-ids-messen.js — welche SNOMED-CT-Konzepte stehen im Bestand (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   SNOMED International hat die Nutzung von neun Konzepten aus dem Global Patient
   Set freigegeben (CC BY-ND 4.0) und verlangt, VOR jeder Ausweitung gefragt zu
   werden — weitere Konzepte, Hierarchien, Beziehungen. Dieses Werkzeug misst,
   was im Bestand steht; tools/snomed-freigabe.json hält, was freigegeben ist.

   Erkannt wird eine SCTID an ihrer Form, nicht an einer Liste: 6 bis 18 Ziffern,
   gültige Verhoeff-Prüfziffer, Partition 00 oder 10 (Konzept). Gesucht wird in
   jeder getrackten Datei im Umkreis von ±600 Zeichen um „snomed“ — so bleibt
   eine Zahl, die zufällig die Form hat, aber nichts mit SNOMED zu tun hat, außen vor.
   Dazu: Hierarchie- und ECL-Nutzung im Code ($subsumes, $expand, descendantOf,
   ECL-Ausdrücke), die das GPS allein nicht deckt.

   Aufruf:  node tools/snomed-ids-messen.js [--repo <pfad>] [--json]
   Ohne --repo: dieses Repo.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];

function verhoeffGueltig(ziffern) {
  let c = 0;
  ziffern.split('').reverse().forEach((z, i) => { c = D[c][P[i % 8][Number(z)]]; });
  return c === 0;
}

function istKonzeptId(s) {
  return /^[1-9]\d{5,17}$/.test(s) && verhoeffGueltig(s) && ['00', '10'].includes(s.slice(-3, -1));
}

const UMKREIS = 600;
const ZAHL = /(?<![\w.])\d{6,18}(?![\w.])/g;
/* Nutzungsmuster (SNOMED International, Ticket #61950, 28.09.2026): unveränderter Begriff, keine Hierarchie, keine
   Beziehungen, keine Subsumption, kein ECL. Erkannt werden die Terminologie-Operationen ($subsumes, $expand), die
   ECL-Operatoren vor einer Konzept-ID (<<, <, ^ Mitglied von; „>" nicht — es träfe gewöhnliche Zahlenvergleiche), memberOf, is-a/subsumes und die IS-A-Kennung,
   mit der Beziehungen ausgewertet würden. */
// Die IS-A-Kennung zur Laufzeit gefügt: als Literal fände der SNOMED-Erkenner sie in diesem Werkzeug selbst.
const IS_A = ['1166', '80003'].join('');
const HIERARCHIE = new RegExp(String.raw`\$subsumes|\$expand|subsumedBy|\bsubsumes\b|descendantOf|descendant-of|ancestorOf|memberOf|\bECL\b|['"]is-a['"]|\bis-a\b|(?:<<?|\^)\s*\d{6,18}\b|\b` + IS_A + String.raw`\b`);

/* Die Modul-Kennung in einer Editions-URI (`http://snomed.info/sct/<Modul>/version/<Datum>`, RF2-Konvention) ist die Angabe,
   aus welcher Edition ein Code stammt — kein genutztes Konzept. Profile fixieren sie in `coding.version` (KBV-PKA, U2-ADR-471).
   Gezählt wird sie nur dort nicht; dieselbe Zahl außerhalb einer Editions-URI zählt wie jede andere. */
const EDITIONS_URI = /snomed\.info\/sct\/(\d{6,18})\/version\//g;
function idsInText(text) {
  const ids = new Set();
  const ohneEdition = text.replace(EDITIONS_URI, (m, modul) => m.replace(modul, '#'.repeat(modul.length)));
  for (const m of ohneEdition.matchAll(/snomed/gi)) {
    const fenster = ohneEdition.slice(Math.max(0, m.index - UMKREIS), m.index + UMKREIS);
    for (const n of fenster.matchAll(ZAHL)) if (istKonzeptId(n[0])) ids.add(n[0]);
  }
  return ids;
}

function ohneKommentare(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
}

function erheben(repo, dateien) {
  const liste = dateien || execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung() }).split('\n').filter(Boolean);
  const ids = {};
  const hierarchie = [];
  for (const d of liste) {
    let text;
    try { text = fs.readFileSync(path.join(repo, d), 'utf8'); } catch (_) { continue; }
    if (/snomed/i.test(text)) for (const id of idsInText(text)) (ids[id] = ids[id] || []).push(d);
    if (/^(vivodepot[^/]*\.html|tools\/.*\.js)$/.test(d) && d !== 'tools/snomed-ids-messen.js') {
      const m = ohneKommentare(text).match(HIERARCHIE);
      if (m) hierarchie.push(d + ': ' + m[0]);
    }
  }
  return { ids, hierarchie };
}

module.exports = { verhoeffGueltig, istKonzeptId, idsInText, erheben, HIERARCHIE };

if (require.main === module) {
  const i = process.argv.indexOf('--repo');
  const repo = i >= 0 ? path.resolve(process.argv[i + 1]) : path.join(__dirname, '..');
  const r = erheben(repo);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  for (const [id, wo] of Object.entries(r.ids).sort()) console.log(id + '  ' + wo.join(', '));
  // Die Summe geht auf: jede gefundene Kennung ist genau eins von freigegeben, offen, sonstige (tools/snomed-freigabe.json samt interner Ergänzung).
  let fr = { freigegeben: {}, offen: {} };
  // Die angefragten Kennungen liegen in der internen Ergänzung; im Zuschnitt fehlt sie, dann gibt es kein „offen".
  try { fr = require('./lib/mit-interner-ergaenzung.js').lesenMitErgaenzung(path.join(repo, 'tools', 'snomed-freigabe.json')); } catch (_) { /* fremdes Repo */ }
  fr = { freigegeben: fr.freigegeben || {}, offen: fr.offen || {} };
  const ids = Object.keys(r.ids);
  const f = ids.filter((id) => fr.freigegeben[id]).length;
  const o = ids.filter((id) => !fr.freigegeben[id] && fr.offen[id]).length;
  const s = ids.length - f - o;
  console.log(ids.length + ' Konzept-IDs = ' + f + ' freigegeben + ' + o + ' offen + ' + s + ' sonstige' + (s ? ' (' + ids.filter((id) => !fr.freigegeben[id] && !fr.offen[id]).join(', ') + ')' : '') + ' · Hierarchie/ECL: ' + (r.hierarchie.length ? r.hierarchie.join('; ') : 'keine'));
}
