#!/usr/bin/env node
'use strict';
/* lese-app-depot-speicher-messen.js — welche Speicher eines Depots liest die Lese-App, und welche Depots tragen ein gesperrtes
   Bereichsmodul? (Befund DATEI-BEREICH-AUSGEBLENDET, 11.10.2026)

   Der Befund: die Lese-App zeigt eine Stelle des Depots (`institutionen`), auf die kein Feld verweist, in keiner Ansicht. Das ist
   ein Fall einer Klasse: ein Speicher des Depots, den die Lese-App nicht oder nur über einen Verweis liest. Dieses Werkzeug misst
   die Klasse, statt den einen Fall zu beschreiben. Es misst nur und schreibt nichts in den Baum.

   SPEICHER: die Schlüssel der obersten Ebene eines frisch angelegten Depots (Kern des Arbeitsstands). Je Schlüssel die Zahl der
   Stellen im Code der Lese-App (ohne Kommentare und Zeichenketten), an denen er als Eigenschaft gelesen wird (`.schluessel` oder
   `['schluessel']`). 0 heißt: die Lese-App liest ihn nirgends. Eine Zahl über 0 heißt nur „gelesen“, nicht „angezeigt“; ob eine
   Ansicht daraus wird, steht an den genannten Zeilen.

   DEPOTS: `--depot <datei>=<passwort>` (beliebig oft) öffnet die Datei im Kern des Arbeitsstands und zählt die gesperrten Module
   je Typ (gesperrteDepotModule).

   Aufruf:  node tools/lese-app-depot-speicher-messen.js [--depot <datei>=<passwort>]… [--aus <datei>]
   Ohne --depot läuft es gegen den Arbeitsstand allein (so prüft es die Suite: tests/lese-app-depot-speicher-messen.test.js). */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const arg = (a, n, s) => { const i = a.indexOf('--' + n); return i >= 0 && a[i + 1] ? a[i + 1] : s; };

/* Der Code ohne Kommentare und ohne den Inhalt von Zeichenketten: ein Schlüssel, der nur in einem Kommentar oder einem Satz
   steht, ist keine Lesestelle. Grob und für eine Zählung genau genug; Regex-Literale bleiben stehen. */
function nurCode(text) {
  let raus = ''; let i = 0; const n = text.length;
  while (i < n) {
    const c = text[i]; const d = text[i + 1];
    if (c === '/' && d === '*') { const e = text.indexOf('*/', i + 2); const ende = e < 0 ? n : e + 2; raus += text.slice(i, ende).replace(/[^\n]/g, ' '); i = ende; continue; }
    if (c === '/' && d === '/' && text[i - 1] !== ':' && text[i - 1] !== '\\') { const e = text.indexOf('\n', i); const ende = e < 0 ? n : e; raus += ' '.repeat(ende - i); i = ende; continue; }
    if (c === '\'' || c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== c && text[j] !== '\n') { if (text[j] === '\\') j++; j++; }
      /* Länge und Zeilen bleiben erhalten: endet die Zeichenkette nicht in ihrer Zeile (Apostroph in einem Regex oder Text), bleibt
         der Zeilenumbruch stehen. */
      const zu = text[j] === c;
      raus += c + text.slice(i + 1, j).replace(/[^\n]/g, '_') + (zu ? c : ''); i = zu ? j + 1 : j; continue;
    }
    raus += c; i++;
  }
  if (raus.length !== text.length) throw new Error('nurCode: die Länge hat sich geändert (' + text.length + ' → ' + raus.length + '); Zeilennummern wären falsch.');
  return raus;
}
/* Die Lesestellen EINES Schlüssels im Code der Lese-App: Zeilennummern. Die Klammerform wird am Original gesucht (im bereinigten
   Text ist der Inhalt der Zeichenkette ersetzt), aber nur an Stellen, die im bereinigten Text Code sind. */
function lesestellen(original, code, schluessel) {
  const zeilen = new Set();
  const zeileVon = (pos) => original.slice(0, pos).split('\n').length;
  const punkt = new RegExp('\\.' + schluessel.replace(/[$]/g, '\\$') + '\\b(?!\\s*:)', 'g');
  for (let m = punkt.exec(code); m; m = punkt.exec(code)) zeilen.add(zeileVon(m.index));
  const klammer = new RegExp('\\[\\s*([\'"])' + schluessel.replace(/[$]/g, '\\$') + '\\1\\s*\\]', 'g');
  for (let m = klammer.exec(original); m; m = klammer.exec(original)) if (code[m.index] === '[') zeilen.add(zeileVon(m.index));
  return [...zeilen].sort((a, b) => a - b);
}
function speicherMessen(leseHtml, schluesselListe) {
  const code = nurCode(leseHtml);
  return schluesselListe.map((k) => { const z = lesestellen(leseHtml, code, k); return { schluessel: k, lesestellen: z.length, zeilen: z.slice(0, 12) }; });
}

async function depotSchluessel() {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  await V.depotAnlegen('messung-lese-app-depot-speicher');
  const d = V.getData();
  return Object.keys(d).sort().map((k) => ({ schluessel: k, art: Array.isArray(d[k]) ? 'liste' : (d[k] && typeof d[k] === 'object' ? 'objekt' : typeof d[k]) }));
}
async function gesperrtIn(datei, passwort) {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const t = fs.readFileSync(path.resolve(datei), 'utf8');
  await V.depotLaden(JSON.parse(t.slice(t.indexOf('{'))), passwort);
  const je = {};
  for (const m of V.gesperrteDepotModule()) je[m.typ] = (je[m.typ] || 0) + 1;
  return je;
}

async function main() {
  const a = process.argv.slice(2);
  const leseHtml = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  const schluessel = await depotSchluessel();
  const gemessen = speicherMessen(leseHtml, schluessel.map((s) => s.schluessel));
  const speicher = schluessel.map((s, i) => Object.assign({}, s, gemessen[i]));
  const depots = [];
  for (let i = 0; i < a.length; i++) if (a[i] === '--depot' && a[i + 1]) {
    const k = a[i + 1].indexOf('=');
    const datei = a[i + 1].slice(0, k);
    try { depots.push({ datei, gesperrt: await gesperrtIn(datei, a[i + 1].slice(k + 1)) }); } catch (e) { depots.push({ datei, fehler: String((e && e.message) || e).slice(0, 160) }); }
  }
  const ergebnis = { speicher, nichtGelesen: speicher.filter((s) => !s.lesestellen).map((s) => s.schluessel), depots };
  const aus = arg(a, 'aus', null);
  if (aus) fs.writeFileSync(path.resolve(aus), JSON.stringify(ergebnis, null, 1) + '\n');
  console.log('lese-app-depot-speicher: ' + speicher.length + ' Speicher eines frischen Depots; die Lese-App liest ' + (speicher.length - ergebnis.nichtGelesen.length) + ', nirgends gelesen: ' + ergebnis.nichtGelesen.length + '.');
  for (const s of speicher) console.log('  ' + (s.lesestellen ? String(s.lesestellen).padStart(3) : '  0') + '  ' + s.schluessel + ' (' + s.art + ')' + (s.lesestellen && s.lesestellen <= 3 ? '  Zeilen ' + s.zeilen.join(', ') : ''));
  for (const d of depots) console.log('  Depot ' + d.datei + ': ' + (d.fehler ? 'nicht geöffnet (' + d.fehler + ')' : 'gesperrte Module ' + (JSON.stringify(d.gesperrt))));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(2); });
module.exports = { nurCode, lesestellen, speicherMessen };
