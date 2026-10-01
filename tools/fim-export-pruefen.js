#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   fim-export-pruefen.js — ein FIM-Export gegen die gepinnten Bezüge (U2-ADR-456, 30.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Jede Angabe `felder[].fimFeld` eines fim-json-Exports muss GENAU einer Zeile in bereiche/bezuege.json (datensatz fim-baukasten)
   entsprechen: gleiche Depot-Kennung, gleiche FIM-Kennung, gleiche Fassung, gleicher Freigabestatus (Code der FIM-Codeliste),
   `fest` passend zum Status. Die Zeilen
   selbst sind gegen die gepinnten XDF-Fassungen geprüft (tools/bezuege-erheben.js --quelle). Ein Name darf nur stehen, wenn die
   Tabelle eine belegte fimNamenFreigabe trägt. Der Export muss den Stand der Tabelle nennen (bezugsstand).

   Aufruf:  node tools/fim-export-pruefen.js <export.json> [--tabelle <pfad>] [--lock <pfad>]
   Exit 0 ohne Befund, 1 mit Befund. Probe: tests/fim-bezuege.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { nichtFest, freigabestatusCode, FREIGABESTATUS_LISTE } = require('./bezuege-erheben.js');

const REPO = path.join(__dirname, '..');

function exportPruefen(exp, tabelle, lock) {
  const befunde = [];
  const zeilen = (tabelle.zeilen || []).filter((z) => z.datensatz === 'fim-baukasten');
  const freigabe = !!(tabelle.fimNamenFreigabe && tabelle.fimNamenFreigabe.beleg);
  const quelle = (lock.quellen || []).find((q) => q.datensatz === 'fim-baukasten');
  if (!exp || exp.bezugsdatensatz !== 'fim-baukasten') befunde.push('bezugsdatensatz fehlt oder ist nicht fim-baukasten');
  if (quelle && exp && exp.bezugsstand !== quelle.fassung) befunde.push('bezugsstand „' + (exp && exp.bezugsstand) + '" ≠ gepinnter Stand „' + quelle.fassung + '"');
  if (exp && exp.fimSchema !== undefined) befunde.push('erfundene Schema-Kennung fimSchema steht noch im Export');
  if (exp && exp.freigabestatusListe !== FREIGABESTATUS_LISTE) befunde.push('freigabestatusListe fehlt oder ist nicht die FIM-Codeliste');
  for (const f of ((exp && exp.felder) || [])) {
    const b = f && f.fimFeld;
    const ort = (f && f.kennung) + ' → ' + (b && b.id);
    if (!b) { befunde.push(ort + ': fimFeld fehlt'); continue; }
    const z = zeilen.find((r) => r.kennung === f.kennung && r.ziel === b.id);
    if (!z) { befunde.push(ort + ': keine gepinnte Zeile'); continue; }
    if (String(b.fassung) !== String(z.fassung)) befunde.push(ort + ': Fassung ' + b.fassung + ', gepinnt ' + z.fassung);
    if (String(b.freigabestatus) !== String(freigabestatusCode(z.status))) befunde.push(ort + ': Freigabestatus ' + b.freigabestatus + ', gepinnt ' + freigabestatusCode(z.status) + ' („' + z.status + '")');
    if (b.fest !== !nichtFest(z.status)) befunde.push(ort + ': fest=' + b.fest + ' passt nicht zum Status „' + z.status + '"');
    if (b.name !== undefined && !freigabe) befunde.push(ort + ': Name ohne belegte fimNamenFreigabe');
  }
  return befunde;
}

module.exports = { exportPruefen };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : d; };
  const datei = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
  if (!datei) { console.error('Aufruf: node tools/fim-export-pruefen.js <export.json>'); process.exit(2); }
  const befunde = exportPruefen(JSON.parse(fs.readFileSync(datei, 'utf8')),
    JSON.parse(fs.readFileSync(opt('--tabelle', path.join(REPO, 'bereiche', 'bezuege.json')), 'utf8')),
    JSON.parse(fs.readFileSync(opt('--lock', path.join(REPO, 'bereiche', 'bezuege-quellen.json')), 'utf8')));
  for (const b of befunde) console.log('BEFUND ' + b);
  console.log(befunde.length ? '[fim-export-pruefen] ' + befunde.length + ' Befund(e)' : '[fim-export-pruefen] stimmig');
  process.exitCode = befunde.length ? 1 : 0;
}
