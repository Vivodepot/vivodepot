#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   fim-bezuege-region.js — die FIM-Bezüge im Kern, erzeugt aus bereiche/bezuege.json (U2-ADR-456, 30.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   EINE Quelle: die Zeilen `datensatz: "fim-baukasten"` in bereiche/bezuege.json (geprüft von tools/bezuege-erheben.js gegen die
   gepinnten XDF-Fassungen). Der Kern trägt dieselben Zeilen in der Region `FIM-BEZUEGE:BEGIN/END`, damit Feldanzeige und Export
   sie ohne Nachladen kennen. Die Region wird NUR von diesem Werkzeug geschrieben; die Probe hält sie gleich der Tabelle.

   Was in die Region kommt: Kennung, FIM-Kennung, Fassung, Freigabestatus als Code der FIM-Codeliste (kein Text — der Kern trägt
   keine Sätze), fest ja/nein, Grad, Name. Der Name ist `null`, solange
   bereiche/bezuege.json keine belegte `fimNamenFreigabe` trägt (Zustimmung der FITKO) — dann kommt er ohne Umbau dazu.

   Aufruf:
     node tools/fim-bezuege-region.js              prüft: Region im Kern == Tabelle (Exit 1 bei Abweichung)
     node tools/fim-bezuege-region.js --schreiben  schreibt die Region neu
     [--kern <pfad>] [--tabelle <pfad>] [--lock <pfad>]
   Probe: tests/fim-bezuege.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { nichtFest, freigabestatusCode } = require('./bezuege-erheben.js');

const REPO = path.join(__dirname, '..');
const BEGIN = '/* FIM-BEZUEGE:BEGIN */';
const ENDE = '/* FIM-BEZUEGE:END */';
const DATENSATZ = 'fim-baukasten';

function zeilenAusTabelle(tabelle, lock) {
  const freigabe = !!(tabelle.fimNamenFreigabe && tabelle.fimNamenFreigabe.beleg);
  const quelle = (lock.quellen || []).find((q) => q.datensatz === DATENSATZ);
  const zeilen = (tabelle.zeilen || []).filter((z) => z.datensatz === DATENSATZ).map((z) => ({
    kennung: z.kennung, id: z.ziel, fassung: String(z.fassung), freigabestatus: freigabestatusCode(z.status), fest: !nichtFest(z.status),
    grad: z.grad, name: (freigabe && z.name) ? String(z.name) : null,
  }));
  zeilen.sort((a, b) => a.kennung.localeCompare(b.kennung) || a.id.localeCompare(b.id));
  return { stand: quelle ? String(quelle.fassung) : null, zeilen };
}

function regionText({ stand, zeilen }) {
  const z = zeilen.map((r) => '  Object.freeze(' + JSON.stringify(r) + '),').join('\n');
  return BEGIN + '\n'
    + '// Erzeugt aus bereiche/bezuege.json von tools/fim-bezuege-region.js --schreiben — nicht von Hand ändern (U2-ADR-456).\n'
    + 'const FIM_BEZUEGE_STAND = ' + JSON.stringify(stand) + ';\n'
    + 'const FIM_BEZUEGE = Object.freeze([\n' + z + '\n]);\n'
    + ENDE;
}

function regionAusKern(kern) {
  const a = kern.indexOf(BEGIN);
  const b = kern.indexOf(ENDE);
  if (a < 0 || b < a || kern.indexOf(BEGIN, a + 1) >= 0) return null;
  return { a, b: b + ENDE.length, text: kern.slice(a, b + ENDE.length) };
}

function lesen(argv) {
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : d; };
  const kernPfad = opt('--kern', path.join(REPO, 'vivodepot.html'));
  const tabelle = JSON.parse(fs.readFileSync(opt('--tabelle', path.join(REPO, 'bereiche', 'bezuege.json')), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(opt('--lock', path.join(REPO, 'bereiche', 'bezuege-quellen.json')), 'utf8'));
  return { kernPfad, tabelle, lock };
}

module.exports = { BEGIN, ENDE, DATENSATZ, zeilenAusTabelle, regionText, regionAusKern };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const { kernPfad, tabelle, lock } = lesen(argv);
  const kern = fs.readFileSync(kernPfad, 'utf8');
  const soll = regionText(zeilenAusTabelle(tabelle, lock));
  const ist = regionAusKern(kern);
  if (!ist) { console.error('[fim-bezuege-region] Region FIM-BEZUEGE fehlt oder ist doppelt in ' + kernPfad); process.exit(1); }
  if (argv.includes('--schreiben')) {
    if (ist.text !== soll) fs.writeFileSync(kernPfad, kern.slice(0, ist.a) + soll + kern.slice(ist.b));
    console.log('[fim-bezuege-region] geschrieben: ' + zeilenAusTabelle(tabelle, lock).zeilen.length + ' Zeilen');
  } else if (ist.text !== soll) {
    console.error('[fim-bezuege-region] ABWEICHUNG: Region im Kern ≠ bereiche/bezuege.json — node tools/fim-bezuege-region.js --schreiben');
    process.exit(1);
  } else {
    console.log('[fim-bezuege-region] stimmig');
  }
}
