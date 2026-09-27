#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   PDF-Titel-Pflicht — jede jsPDF-Erzeugung bekommt einen Dokumenttitel (18.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Sieben `new window.jspdf.jsPDF(…)`-Stellen im Kern, keine einzige
   setzte je `/Title` — kein Einzelversehen an einer Stelle, sondern eine ganze
   Gattung: der Seiteninhalt zeigt eine Überschrift, das Dokument selbst (Fenster-
   titel, Tab, „Zuletzt geöffnet", macOS-Finder-Spalte „Titel") bleibt leer.
   Syntaktisch ein gültiges PDF — für die Empfängerin trotzdem ein Dokument ohne
   Namen. Gefunden bei der Messung der drei Ausgänge PDF/vCard/ICS (Auftrag,
   18.09.2026 abends).

   WAS DIESER WÄCHTER PRÜFT, und die Grenze steht hier, nicht im Bericht: JEDE
   `new window.jspdf.jsPDF(…)`-Fundstelle in `vivodepot.html` (bislang der einzige
   Träger mit jsPDF — die anderen fünf HTML-Carrier binden es nicht ein, gemessen
   per `grep -c`, nicht angenommen) muss INNERHALB ihrer eigenen umschließenden
   Funktion eine `<variable>.setProperties(`- oder `<variable>.setTitle(`-Zeile
   auf DERSELBEN Variable tragen, an die das `new jsPDF(…)`-Ergebnis gebunden
   wurde. KEINE feste Zahl (nicht „sieben") — die Bedingung ist „je Erzeugung ein
   Titel-Aufruf", trägt also unverändert weiter, wenn eine achte Stelle entsteht.
   Geprüft wird die ANWESENHEIT eines Titel-Aufrufs, nicht sein Inhalt (kein
   Textvergleich, keine Sprachprüfung) — derselbe Schnitt wie
   `tools/rot-beweis-pflicht-pruefen.js`/`tools/git-umgebung-pruefen.js`.

   Die umschließende Funktion wird über Klammertiefe ab dem `function …( … ) {`
   VOR der Fundstelle ermittelt (dieselbe Technik wie `klammerSpanneAb` in
   `tools/w15-eine-quelle-statt-kopien-pruefen.js`, hier für `{`/`}` statt `[`/`]`)
   — kein fester Zeilenabstand, der bei einer längeren/kürzeren Funktion reißen
   würde.

   Aufruf:
     node tools/pdf-titel-pflicht-pruefen.js
     node tools/pdf-titel-pflicht-pruefen.js --datei <pfad-zu-vivodepot.html>
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : s; };
const DATEI = arg('datei', path.join(REPO, 'vivodepot.html'));
const CHECK = argv.includes('--check');

// Klammertiefe rückwärts/vorwärts, wie klammerSpanneAb in w15-eine-quelle-statt-kopien-pruefen.js,
// hier für geschweifte statt eckige Klammern — findet die '{', die am Ende von
// `function …(…) {` VOR `ab` als nächstes NACH VORNE liegende, unmatched '{' steht,
// dann ihr passendes '}' nach vorn.
function umschliessendeFunktionsSpanne(text, ab) {
  // Rückwärts zur öffnenden Klammer der umschließenden Funktion: Tiefenzählung von `ab` aus
  // nach hinten — jede '}' erhöht die gesuchte Tiefe, jede '{' senkt sie; bei Tiefe 0 auf eine
  // '{' zu treffen ist die gesuchte Funktionsöffnung.
  let tiefe = 0, start = -1;
  for (let j = ab; j >= 0; j--) {
    if (text[j] === '}') tiefe++;
    else if (text[j] === '{') { if (tiefe === 0) { start = j; break; } tiefe--; }
  }
  if (start < 0) return null;
  let t2 = 0, ende = -1;
  for (let j = start; j < text.length; j++) {
    if (text[j] === '{') t2++;
    else if (text[j] === '}') { t2--; if (t2 === 0) { ende = j; break; } }
  }
  if (ende < 0) return null;
  return { start, ende };
}

const ERZEUGUNG_RE = /(?:const|let|var)\s+(\w+)\s*=\s*new\s+window\.jspdf\.jsPDF\(/g;

function pruefeDatei(pfad) {
  const text = fs.readFileSync(pfad, 'utf8');
  const funde = [];
  let m;
  while ((m = ERZEUGUNG_RE.exec(text))) {
    const varName = m[1];
    const stelle = m.index;
    const zeile = text.slice(0, stelle).split('\n').length;
    const spanne = umschliessendeFunktionsSpanne(text, stelle);
    if (!spanne) {
      funde.push({ zeile, varName, grund: 'keine umschließende Funktion gefunden — Anker/Klammerzählung nachsehen, nicht raten' });
      continue;
    }
    const koerper = text.slice(stelle, spanne.ende);
    const titelRe = new RegExp('\\b' + varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\.\\s*(setProperties|setTitle)\\s*\\(');
    if (!titelRe.test(koerper)) {
      funde.push({ zeile, varName, grund: 'kein `' + varName + '.setProperties(`/`' + varName + '.setTitle(` innerhalb der umschließenden Funktion' });
    }
  }
  return funde;
}

function main() {
  if (!fs.existsSync(DATEI)) {
    throw new Error('pdf-titel-pflicht-pruefen: Datei nicht gefunden — ' + DATEI);
  }
  const funde = pruefeDatei(DATEI);
  const rel = path.relative(REPO, DATEI);
  if (!funde.length) {
    console.log('[PDF-Titel-Pflicht] Grün — jede jsPDF-Erzeugung in ' + rel + ' trägt einen Titel-Aufruf.');
    process.exit(0);
  }
  console.log('[PDF-Titel-Pflicht] ROT — ' + funde.length + ' Fund(e) ohne Dokumenttitel in ' + rel + ':');
  for (const f of funde) console.log('  ' + rel + ':' + f.zeile + '  (Variable `' + f.varName + '`)  ' + f.grund);
  if (CHECK) process.exit(1);
  process.exit(0);
}

if (require.main === module) main();
module.exports = { pruefeDatei, umschliessendeFunktionsSpanne };
