#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   nur-vom-test-erreicht-pruefen.js — Bilanz-Posten 14 (16.08.2026), A253.
   ────────────────────────────────────────────────────────────────────────────
   DER POSTEN, seit dem 26.07.2026 offen und nie beauftragt: „23 Funktionen nur
   vom Test erreicht — Kandidaten für ‚gebaut, nie verdrahtet'." Die Zahl war
   nie mit einem Werkzeug erhoben, und es gab keines.

   WAS GEMESSEN WIRD: eine im Kern deklarierte Funktion, deren Name im GANZEN
   Kern kein zweites Mal vorkommt — also weder aufgerufen, noch in einem
   `onclick`, noch in einer Tabelle, noch in zusammengebautem HTML. Erreichbar
   ist sie dann nur über den Export-Haken, den `tests/load-kern.js` setzt.

   DREI MESSMODELLE, ZWEI DAVON FALSCH — die Reihenfolge gehört in den Kopf,
   weil sie der eigentliche Ertrag dieser Messung ist:

     (1) Nur die `<script>`-Blöcke durchsuchen → **72**. Falsch: Handler in
         `onclick`-Attributen und in per String gebautem HTML sind echte
         Aufrufer und stehen ausserhalb der Blöcke.
     (2) Die ganze Datei, aber nur `name(` als Aufruf zählen → immer noch zu
         hoch. Falsch: `onclick="x()"` steht im Attribut, eine Verweis-Tabelle
         schreibt `{ handler: x }` ohne Klammer.
     (3) Die ganze Datei, JEDE Erwähnung des Namens ausserhalb der eigenen
         Deklaration → **47**. Das ist das Modell, das hier läuft.

   Dieselbe Lehre wie bei den blinden Proben am selben Tag (A248): eine Zahl aus
   einem Modell ist keine Messung, solange das Modell nicht geprüft ist.

   ZWEI KLASSEN, und die Unterscheidung trägt: sieben der 47 werden von einer
   GESCHWISTERDATEI benutzt (`vivodepot-lesen.html`, der VC-Issuer, der
   Template-Generator, die wörtlich portierte Krypto-Schicht). Sie sind nicht
   tot, sondern geteilt — der Kern ist ihre Heimat, der Gebrauch liegt nebenan.
   Die übrigen 40 sind die eigentlichen Kandidaten.

   WAS DIESES WERKZEUG NICHT TUT: löschen, und auch nicht empfehlen. „Kandidat"
   heisst Kandidat. Manche dieser Funktionen sind bewusst gebaute Bausteine, die
   auf ihren Anschluss warten; andere sind Reste. Das ist Fall für Fall zu
   entscheiden, und jede pauschale Behandlung wäre falsch. Das Werkzeug hält
   nur fest, dass die Menge nicht STILL wächst.

   GRUNDLINIE STATT NULLTOLERANZ — wie `tools/tote-strings-pruefen.js`: rot wird
   es erst bei einem NEUEN Namen, nicht beim Bestand.

   Aufruf:
     node tools/nur-vom-test-erreicht-pruefen.js               → volle Liste
     node tools/nur-vom-test-erreicht-pruefen.js --gate        → nur Neuzugänge
     node tools/nur-vom-test-erreicht-pruefen.js --json
     node tools/nur-vom-test-erreicht-pruefen.js --grundlinie-schreiben
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH) : path.join(REPO, 'vivodepot.html');
const GRUNDLINIE = path.join(REPO, 'tools', 'nur-vom-test-erreicht-grundlinie.json');
const GESCHWISTER = ['vivodepot-lesen.html', 'vivodepot-vc-issuer.html',
  'vivodepot-template-generator.html', 'vivodepot-krypto-kern-PORT-VERBATIM.js'];

const argv = process.argv.slice(2);

/* Kommentare fliegen raus: ein Name, der nur in einem Kommentar steht, ist
   keine Verdrahtung — er ist genau die Behauptung, die der Zusagen-Wächter
   an anderer Stelle prüft. */
function entkommentiert(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/* Der Kern-Verschluss-Export-Block fliegt ebenfalls raus (Fund 18.09.2026,
   am Beispiel depotSerialisierenV3 — A345s bewusst NIE aus dem Kern
   heraus aufgerufener v3-Rückweg-Schreibpfad): `window.__vdOeffentlich = {…}`
   ist ein REGISTER, keine Aufrufstelle. Jeder der (Stand 18.09.2026: 170)
   dort geführten Namen bekäme sonst eine zweite Textfundstelle allein durch
   die Aufnahme in den Export — unabhängig davon, ob ihn ein einziges
   Produktions-Codepfad je aufruft. Das Werkzeug würde dann JEDEN exportierten
   Namen für „verdrahtet" halten, nicht nur den einen, an dem es zufällig
   eine Grundlinie gab, die dagegen hielt — eine Blindheit, die aussieht wie
   grün. Derselbe Anker wie in tools/lib/fenster-flaeche-diff.js
   (`erlaubteFensterNamen`), hier zum Ausschließen statt zum Auslesen benutzt. */
const VD_OEFFENTLICH_ANKER = 'window.__vdOeffentlich = {';
function ohneExportRegister(text) {
  const start = text.indexOf(VD_OEFFENTLICH_ANKER);
  if (start < 0) return text;
  const bodyStart = text.indexOf('{', start) + 1;
  const bodyEnd = text.indexOf('\n};', bodyStart);
  if (bodyEnd < 0) return text;
  return text.slice(0, bodyStart) + text.slice(bodyEnd);
}

function nameMuster(name) {
  const roh = name.replace(/[$]/g, '\\$');
  /* Kein Punkt davor (`obj.name` ist eine andere Sache) und kein Wortzeichen
     dahinter (`nameLang` ist ein anderer Bezeichner).

     ABER: der Spread ist KEIN Eigenschaftszugriff (Fund 16.08.2026, Zug 1 des
     Produkt-Reste-Auftrags). Die erste Fassung schrieb `(?<![\w$.])` und
     verwarf damit auch `...name(` — drei echte Aufrufstellen von
     `_ereignisZeileMarkieren` (21251/21275/21312) blieben unsichtbar, und die
     Funktion stand faelschlich auf der Liste „nur vom Test erreicht". Ein
     Werkzeug, das Aufrufe uebersieht, meldet gesunden Code als tot — die
     gefaehrlichere Richtung, weil am Ende eine Loeschliste steht.

     Der Ausschluss gilt jetzt nur fuer einen EINZELNEN Punkt, nicht fuer den
     dritten eines Spreads: `obj.name` faellt weiter raus, `...name` zaehlt. */
  return new RegExp('(?<![\\w$])(?<!(?<!\\.\\.)\\.)' + roh + '(?![\\w$])', 'g');
}

function ermittle(kernPfad = KERN) {
  const html = fs.readFileSync(kernPfad, 'utf8');
  const ohne = ohneExportRegister(entkommentiert(html));
  const skripte = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).join('\n');
  const deklariert = [...new Set(
    [...entkommentiert(skripte).matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)]
      .map((m) => m[1]))];

  const nachbarn = GESCHWISTER
    .map((f) => ({ datei: f, pfad: path.join(REPO, f) }))
    .filter((x) => fs.existsSync(x.pfad))
    .map((x) => ({ datei: x.datei, text: entkommentiert(fs.readFileSync(x.pfad, 'utf8')) }));

  const geteilt = [], nurTest = [];
  for (const name of deklariert) {
    const erwaehnungen = (ohne.match(nameMuster(name)) || []).length;
    const deklarationen = (ohne.match(new RegExp('function\\s+' + name.replace(/[$]/g, '\\$') + '(?![\\w$])', 'g')) || []).length;
    if (erwaehnungen - deklarationen !== 0) continue;
    const wo = nachbarn.filter((n) => nameMuster(name).test(n.text)).map((n) => n.datei);
    if (wo.length) geteilt.push({ name, dateien: wo }); else nurTest.push(name);
  }
  return { deklariert: deklariert.length, geteilt, nurTest: nurTest.sort() };
}

function ladeGrundlinie() {
  if (!fs.existsSync(GRUNDLINIE)) return null;
  return JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
}

function main() {
  const e = ermittle();

  if (argv.includes('--grundlinie-schreiben')) {
    fs.writeFileSync(GRUNDLINIE, JSON.stringify({
      stichtag: 'gemessen mit tools/nur-vom-test-erreicht-pruefen.js',
      hinweis: 'Kandidaten fuer „gebaut, nie verdrahtet". KEINE Loeschliste — jeder Fall einzeln.',
      namen: e.nurTest,
    }, null, 1) + '\n');
    console.log('[nur-vom-test] Grundlinie geschrieben: ' + e.nurTest.length + ' Namen.');
    return;
  }

  if (argv.includes('--json')) { console.log(JSON.stringify(e, null, 1)); return; }

  const grundlinie = ladeGrundlinie();

  if (argv.includes('--gate')) {
    if (!grundlinie) { console.error('GATE: keine Grundlinie — erst `--grundlinie-schreiben`.'); process.exit(2); }
    const bekannt = new Set(grundlinie.namen);
    const neu = e.nurTest.filter((n) => !bekannt.has(n));
    if (!neu.length) {
      console.log('[nur-vom-test] GATE grün — kein neuer unverdrahteter Name gegen die Grundlinie ('
        + grundlinie.namen.length + ' bekannt).');
      return;
    }
    console.error('[nur-vom-test] GATE ROT — neu ohne Verdrahtung im Kern:');
    neu.forEach((n) => console.error('  ' + n));
    console.error('Entweder verdrahten, oder — wenn er bewusst nur ueber den Test erreichbar ist —');
    console.error('mit `--grundlinie-schreiben` aufnehmen und im Commit begruenden.');
    process.exit(1);
  }

  console.log(`[nur-vom-test] ${e.deklariert} Funktions-Deklarationen im Kern.`);
  console.log(`  ohne Erwaehnung im Kern: ${e.geteilt.length + e.nurTest.length}`);
  console.log(`  davon in einer Geschwisterdatei benutzt (NICHT tot, geteilt): ${e.geteilt.length}`);
  for (const g of e.geteilt) console.log(`    ${g.name.padEnd(32)} ${g.dateien.join(', ')}`);
  console.log(`  davon nur ueber den Test-Export erreichbar: ${e.nurTest.length}`);
  for (const n of e.nurTest) console.log('    ' + n);
  console.log('\n  ZAEHLGEGENSTAND: Funktions-DEKLARATIONEN im Kern-Skript, gemessen gegen jede');
  console.log('  Erwaehnung des Namens in der GANZEN Datei ohne Kommentare — Attribut-Handler und');
  console.log('  zusammengebautes HTML zaehlen als Verdrahtung. Kein Urteil ueber Toten Code.');
}

if (require.main === module) main();
module.exports = { ermittle, entkommentiert, ohneExportRegister, nameMuster, GRUNDLINIE };
