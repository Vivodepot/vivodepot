'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Aussagetext-Wächter — „Die Prüfebene reparieren" (12.08.2026), Zug 4
   ────────────────────────────────────────────────────────────────────────────
   Vorlage: A165 („Wächter für Aussagetexte", 11.08.2026) — Zug 0 dort maß
   ~16-18 echte Zustands-Behauptungen unter 896 STRINGS-Einträgen (Toasts/generische
   Fehlermeldungen/Fragen/Feldbeschriftungen ausgenommen — die sind tautologisch wahr oder gar
   keine Behauptung) und empfahl die enge Bindungsform zuerst: ein `// ZUSTAND: <Ausdruck>`-
   Kommentar an jeder betroffenen STRINGS-Zeile, geprüft von genau diesem Werkzeug.

   WAS DIESES WERKZEUG PRÜFT, UND WAS NICHT (Zug 3 desselben Auftrags entscheidet die Grenze):
   `tests/load-kern.js`s DOM-Stub kann kein reales `querySelector`/`querySelectorAll` — jede
   Prüfung, die wüsste, WELCHER Text tatsächlich gerendert wird, bräuchte einen Browser. Dieses
   Werkzeug bleibt darum bewusst QUELLTEXT GEGEN QUELLTEXT: es prüft nur, ob der im `// ZUSTAND:`-
   Kommentar genannte Ausdruck (eine Funktion oder eine Konstante) im Kern WIRKLICH EXISTIERT —
   nicht, ob er tatsächlich das SAGT, was der STRINGS-Text behauptet, und nicht, ob JEDER
   Aufrufer denselben Ausdruck liest (das wäre die generischere Prüfung, die A165 als Zug-1-
   Alternative (b) vorschlug — komplexer, hier NICHT gebaut, s. Bericht).

   DAS IST EIN SCHWÄCHERER NACHWEIS ALS EIN ECHTER RENDER-VERGLEICH — und das steht hier, damit
   niemand mehr daraus liest, als er trägt: ein Kommentar, der auf eine tote Funktion zeigt (weil
   sie umbenannt/entfernt wurde, ohne den Kommentar nachzuziehen), IST der Fund, den dieses
   Werkzeug fängt. Ein Kommentar, der auf eine FALSCHE, aber existierende Funktion zeigt, fängt
   es NICHT — das bräuchte den Browser-Vergleich, den Zug 3 als (noch) nicht gebaut auswies.

   Aufruf: node tools/w-aussagetext-pruefen.js [--datei <pfad>]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

function arg(argv, name, fallback) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

/* Findet jedes `// ZUSTAND: <Ausdruck>`, das direkt (ohne Leerzeile dazwischen) VOR einer
   STRINGS-Schlüsselzeile steht (`  schluessel: "…",` oder `  schluessel: "…"` ohne Komma am
   Zeilenende) ODER vor einer AB_WERK_TEXTSATZ_DE-Kennungszeile (`  'strings:schluessel.text':
   "…",`, U2-ADR-363, Zug 2, 07.09.2026 — die 21 Bindungen wohnten bis dahin an der jetzt
   dauerhaft leeren `_STRINGS_EINGEBAUT`-Tabelle und wanderten mit ihrem Wortlaut an die neue
   Stelle, s. Kommentar an AB_WERK_TEXTSATZ_DE). Ein Ausdruck ist ein Bezeichner — Funktions-
   oder Konstantenname, keine Aufruf-Klammern/Argumente (bewusst bare name, s. Kopf: das
   Werkzeug prüft Existenz, nicht Aufrufform). */
function findeBindungen(quelltext) {
  const zeilen = quelltext.split('\n');
  const bindungen = [];
  for (let i = 0; i < zeilen.length - 1; i++) {
    const m = /^\s*\/\/\s*ZUSTAND:\s*([A-Za-z_][A-Za-z0-9_.]*)/.exec(zeilen[i]);
    if (!m) continue;
    const schluesselZeile = zeilen[i + 1];
    const skm = /^\s*'strings:([^']+)\.text'\s*:/.exec(schluesselZeile);
    if (skm) { bindungen.push({ schluessel: skm[1], ausdruck: m[1], zeile: i + 1 }); continue; }
    const sm = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(schluesselZeile);
    if (!sm) continue;   // Kommentar steht nicht direkt vor einem Schlüssel — kein Fund, kein Bindungsversprechen
    bindungen.push({ schluessel: sm[1], ausdruck: m[1], zeile: i + 1 });
  }
  return bindungen;
}

/* Existiert der Ausdruck als Funktion (`function <name>(`) oder Konstante (`const <name>` /
   `let <name>`) im Kern? Punktnotation (z. B. `Modus._setzeIntern`) wird auf den ersten
   Bezeichner vor dem Punkt reduziert — der Kern deklariert Objekte, keine Pfade. */
function existiertImKern(quelltext, ausdruck) {
  const basisname = ausdruck.split('.')[0];
  const alsFunktion = new RegExp('\\bfunction\\s+' + basisname + '\\s*\\(');
  const alsKonstante = new RegExp('\\b(?:const|let)\\s+' + basisname + '\\b');
  return alsFunktion.test(quelltext) || alsKonstante.test(quelltext);
}

/* Seit S8 (U2-ADR-428) trägt das deutsche Sprachmodul (JSON) keine Zeilenkommentare: die Bindungen stehen in
   tools/w-aussagetext-bindungen.json (Kennung → Ausdruck). Auch die Kennung selbst muss im Modul stehen. */
const BINDUNGEN_PFAD = path.join(__dirname, 'w-aussagetext-bindungen.json');
function tabellenBindungen() {
  const tabelle = JSON.parse(fs.readFileSync(BINDUNGEN_PFAD, 'utf8')).bindungen;
  const { deTexte } = require('./lib/textsatz-de-quelle.js');
  const texte = deTexte();
  return Object.entries(tabelle).map(([kennung, ausdruck]) => ({
    schluessel: kennung.replace(/^strings:/, '').replace(/\.text$/, ''), ausdruck, zeile: 0,
    kennungFehlt: !Object.prototype.hasOwnProperty.call(texte, kennung),
  }));
}

function pruefen(kernPfad) {
  const quelltext = fs.readFileSync(kernPfad, 'utf8');
  const bindungen = findeBindungen(quelltext).concat(tabellenBindungen());
  const funde = [];
  for (const b of bindungen) {
    if (b.kennungFehlt) funde.push(`Tabelle: STRINGS.${b.schluessel} steht nicht mehr im deutschen Sprachmodul — Bindung ${b.ausdruck} zeigt ins Leere.`);
  }
  for (const b of bindungen) {
    if (!existiertImKern(quelltext, b.ausdruck)) {
      funde.push(`${b.zeile ? 'Zeile ' + b.zeile : 'Tabelle'}: STRINGS.${b.schluessel} — // ZUSTAND: ${b.ausdruck} existiert ` +
        'nicht (mehr) als Funktion oder Konstante im Kern.');
    }
  }
  return { gebunden: bindungen.length, funde };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  // Dieselbe Umlenkung wie tests/load-kern.js (KERN_HTML_PATH) — der Selbsttest pflanzt seine
  // Mutation auf eine Kopie, nie auf den Arbeitsbaum.
  const kernPfad = path.resolve(arg(argv, 'datei', process.env.KERN_HTML_PATH || path.join(REPO, 'vivodepot.html')));
  const { gebunden, funde } = pruefen(kernPfad);
  if (funde.length) {
    console.error(`[w-aussagetext] ${funde.length} von ${gebunden} Bindungen zeigen auf einen Ausdruck, den es nicht (mehr) gibt:`);
    funde.forEach((f) => console.error('  ' + f));
    process.exit(1);
  }
  console.log(`[w-aussagetext] ${gebunden} Bindungen, alle referenzierten Ausdrücke existieren im Kern.`);
}

module.exports = { findeBindungen, existiertImKern, pruefen };
