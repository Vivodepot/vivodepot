#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   dateisatz-parst-pruefen.js — ist jede ausgelieferte Datei überhaupt gültig?
   ────────────────────────────────────────────────────────────────────────────
   Anlass (05.09.2026, Nacht): Beim Rebase einer Landung geriet eine erklärende
   Notiz unmittelbar vor die CACHE-Zeile in `sw.js`, ohne die beiden Schräg-
   striche davor. Damit war die ausgelieferte Schale kein gültiges JavaScript
   mehr — der Service Worker registriert sich nicht, und die Offline-Fähigkeit
   hängt an ihm.

   SIE STAND EINE STUNDE SO IM KANON. In dieser Stunde haben drei Sitzungen
   darauf rebast, und ein vollständiger `pre-push`-Durchlauf einer weiteren lief
   darüber hinweg und meldete 51 Proben grün — einschließlich der Probe, die
   wörtlich die Service-Worker-Registrierung prüft. Sie liest die Datei als Text.

   GEMESSEN, warum das passieren musste:
     elf Testdateien lesen `sw.js` — null wenden `vm.Script` oder `node --check`
     darauf an. Deckung wurde von der Reichweite der Prüfer behauptet, nicht von
     der des Gegenstands.

   WAS DIESER PRÜFER TUT: er PARST, er sucht nicht. `vm.Script` für JavaScript,
   `JSON.parse` für JSON. Ein Textmuster kann nicht feststellen, ob eine Datei
   Code ist; nur ein Parser kann das.

   ── WO SEINE DECKUNG ENDET, und das gehört hierher und nicht in eine Fußnote ──

   Die beiden HTML-Träger prüft er NICHT, und das ist Absicht:

     vivodepot.html        wird von `tests/load-kern.js`  (ladeKern) in einer
                           vm AUSGEFÜHRT — die stärkere Deckung.
     vivodepot-lesen.html  wird von `tests/load-lesen.js` (vm.runInContext)
                           AUSGEFÜHRT — ebenso.

   Ein eigener HTML-Parser hier wäre genau die Fehlerklasse, gegen die dieser
   Prüfer gebaut ist: ein selbstgebautes Werkzeug, das etwas anderes misst als
   sein Name verspricht. Wer die HTML-Träger deckt, sind die beiden Lader.

   ── DIE RATSCHE ──

   Eine Endung, die hier nicht behandelt ist, gilt NICHT als geprüft, sondern
   als BEFUND. Sonst wächst der DATEISATZ um eine fünfte Datei, dieser Prüfer
   überspringt sie schweigend und behauptet weiter, den Satz zu decken — dieselbe
   Lücke eine Ebene tiefer.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DATEISATZ } = require('../scripts/ausgeliefertes-dateiset.js');

/* Endung -> Art. Wer hier etwas hinzufügt, muss auch `parsfehler` erweitern. */
const ARTEN = {
  '.js': 'js', '.mjs': 'js', '.cjs': 'js',
  '.json': 'json', '.webmanifest': 'json',
};
/* Endungen, die ANDERSWO durch Ausführung gedeckt sind — mit Fundstelle, damit
   die Behauptung nachprüfbar ist und nicht geglaubt werden muss. */
const ANDERSWO_GEDECKT = {
  '.html': 'tests/load-kern.js (ladeKern) bzw. tests/load-lesen.js — beide fuehren AUS',
};

function art(datei) {
  const e = path.extname(datei).toLowerCase();
  if (ARTEN[e]) return { art: ARTEN[e], endung: e };
  if (ANDERSWO_GEDECKT[e]) return { art: 'anderswo', endung: e, wo: ANDERSWO_GEDECKT[e] };
  return { art: 'unbekannt', endung: e };
}

/* Gibt die Fehlermeldung zurück oder null. Eigene Funktion, damit die Rot-Probe
   SIE prüfen kann und nicht nur ihre Anwendung auf den echten Dateisatz. */
function parsfehler(datei, quelle) {
  const a = art(datei).art;
  try {
    if (a === 'js') { new vm.Script(quelle, { filename: datei }); return null; }
    if (a === 'json') { JSON.parse(quelle); return null; }
    return null;
  } catch (e) { return e.message; }
}

function pruefe(wurzel) {
  const kaputt = [], unbekannt = [], geparst = [], anderswo = [];
  for (const d of DATEISATZ) {
    const k = art(d);
    if (k.art === 'unbekannt') { unbekannt.push({ datei: d, endung: k.endung }); continue; }
    if (k.art === 'anderswo') { anderswo.push({ datei: d, wo: k.wo }); continue; }
    const p = path.join(wurzel, d);
    if (!fs.existsSync(p)) { kaputt.push({ datei: d, meldung: 'Datei fehlt' }); continue; }
    const m = parsfehler(d, fs.readFileSync(p, 'utf8'));
    if (m) kaputt.push({ datei: d, meldung: m }); else geparst.push(d);
  }
  return { kaputt, unbekannt, geparst, anderswo };
}

module.exports = { pruefe, parsfehler, art, ARTEN, ANDERSWO_GEDECKT };

if (require.main === module) {
  const e = pruefe(path.join(__dirname, '..'));
  for (const g of e.geparst)  console.log(`  geparst:  ${g}`);
  for (const a of e.anderswo) console.log(`  anderswo: ${a.datei} — ${a.wo}`);
  for (const u of e.unbekannt) console.log(`  UNBEKANNTE ENDUNG: ${u.datei} (${u.endung})`);
  for (const k of e.kaputt)    console.log(`  KAPUTT: ${k.datei} — ${k.meldung}`);
  const schlimm = e.kaputt.length + e.unbekannt.length;
  console.log(`dateisatz-parst: ${e.geparst.length} geparst, ${e.anderswo.length} anderswo gedeckt, ${schlimm} Befund(e).`);
  process.exit(schlimm ? 1 : 0);
}
