#!/usr/bin/env node
'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   laenderannahme-pruefen.js — Wächter zu U2-ADR-495: keine feste Länderannahme im Studio und im VC-Issuer (09.10.2026),
   seit R1 auch im Kern und in den Pro-Modulen (17.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────
   Grundsatz: Gerüst plus Templates, nichts fest verdrahtet; es gibt keine „deutsche Ausgabe“. Land, Rechtsraum und
   Rechtsform kommen aus dem Rechtsraum-Modul, nicht aus dem Code.

   WAS GEZÄHLT WIRD (je Datei, nur Code, Kommentare ausgenommen):
     · land-vorgabe       ein Ländername als Rückfall- oder Vorgabewert: `|| 'Deutschland'`, `land: 'Deutschland'`,
                          `rechtsraumName: L('Deutschland', …)`, `value="Deutschland"` an einem Eingabefeld
     · rechtsraum-vorgabe ein Rechtsraum-Kürzel als Vorgabewert: `rechtsraum: 'DE'`, `|| 'DE'`
     · rechtsform-liste   eine Rechtsform als feste Aufzählung im Code oder Schema („GmbH“, „e.V.“, „AG“ in einer
                          Liste oder einem `enum`), statt aus dem Modul

   WAS NICHT GEZÄHLT WIRD, mit Absicht (keine Doppelzählung):
     · Normzitate (§, Art.) in Texten und Platzhaltern — dafür gilt eine eigene Prüfung
     · `address.country_code` der SD-JWT-Identität — eigene Prüfung am Ausgabeweg
     · eine feste Währung — eigene Prüfung
     · der generierte Bereich RECHTSRAUM_BEKANNT (Kollisionsschutz, kein Gate)
     · die Region STUDIO-RECHTSRAEUME: sie IST Modulinhalt, gebacken aus tools/rechtsraum-*-modul.json; dass sie den Modulen
       gleicht, prüft tools/studio-rechtsraeume-backen.js --check
     · die Copyright-Zeile („Vivodepot GmbH, Berlin“) und Sätze über die Vivodepot GmbH

   GEZÄHLT WIRD JE ZEILE: zwei Treffer in einer Zeile sind eine Stelle, ein mehrzeiliges `enum` ist so viele Stellen, wie es
   Rechtsformen-Zeilen hat.

   GRUNDLINIE (tools/laenderannahme-grundlinie.json) wie bei den anderen Grundlinien-Wächtern, je Datei und Art:
     mehr Funde als die Grundlinie ist rot; weniger ist DRIFT und ebenfalls rot, bis die Grundlinie bewusst mit
     --grundlinie-schreiben nachgezogen ist. Die Zahl kann so nur sinken.
   GETEILT (18.10.2026, Wort der Gegenlesung einzeln): die Grundlinie ist eine geteilte Datenliste (tools/lib/mit-interner-ergaenzung.js).
     Die öffentliche Datei trägt nur Dateien, die hinausgehen; Dateien, die der öffentliche Zuschnitt zurückhält, stehen in der
     internen Ergänzung. Gelesen werden beide zusammen, verglichen wird gegen die Summe; ein Schlüssel in beiden ist ein Fehler.
     --grundlinie-schreiben teilt: die Pro-Module (Vorlagen der zweiten Schicht) intern, der Rest öffentlich.

   Aufruf:
     node tools/laenderannahme-pruefen.js                       → die geführten Dateien gegen die Grundlinie, Exit 0/1
     node tools/laenderannahme-pruefen.js --datei <pfad> --zaehlen → nur zählen und ausgeben (z. B. für ein Fixture)
     node tools/laenderannahme-pruefen.js --grundlinie-schreiben → Grundlinie auf den Messwert (nie automatisch)
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const { lesenMitErgaenzung, ergaenzungPfad } = require('./lib/mit-interner-ergaenzung.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE_PFAD = path.join(__dirname, 'laenderannahme-grundlinie.json');
const GEGENSTAND = 'U2-ADR-495: Land, Rechtsraum und Rechtsform als feste Vorgabe im Code statt aus dem Rechtsraum-Modul';
/* Die Grundlinie, öffentlicher Teil und interne Ergänzung zusammen (je Datei und Art). */
function grundlinieLesen(pfad = GRUNDLINIE_PFAD, optionen = {}) {
  return lesenMitErgaenzung(pfad, optionen).jeDatei || {};
}
/* Teilt einen Messwert je Datei: was der Zuschnitt zurückhält, geht in die interne Ergänzung. */
function teilen(jeDatei, istZurueck) {
  const oeffentlich = {}, intern = {};
  for (const [rel, w] of Object.entries(jeDatei)) (istZurueck(rel) ? intern : oeffentlich)[rel] = w;
  return { oeffentlich, intern };
}
/* Rein: die Dateien im öffentlichen Teil, die zurückgehalten werden (jede ist ein Fund). */
function teilungPruefen(oeffentlich, istZurueck) {
  return Object.keys(oeffentlich).filter((rel) => istZurueck(rel)).map((rel) => rel + ': steht in der öffentlichen Grundlinie, wird aber zurückgehalten');
}
/* R1 „Rechtsraum als Modul im Kern“ (17.10.2026): dazu der Kern und jedes Pro-Modul der vier Produkte (Abnahme von
   RECHTSRAUM-FEST-IM-KERN). Die Pro-Module kommen aus tools/lib/vier-produkte.js, nicht aus einer Liste hier — ein neues Pro-Modul
   wird so ohne Zutun mitgezählt. Gezählt wird der Moduldatei-Text; Grundlinie 0 je Datei. */
function _proModulPfade() {
  const { PRODUKTE } = require('./lib/vier-produkte.js');
  const raus = new Set();
  for (const p of PRODUKTE) {
    if (p.proModulPfad) raus.add(path.relative(REPO, p.proModulPfad));
    for (const f of p.modulPfade) if (/(^|[/-])pro-/.test(path.basename(f))) raus.add(path.relative(REPO, f));
  }
  return [...raus].sort();
}
const PRO_MODULE = Object.freeze(_proModulPfade());
const GEFUEHRT = Object.freeze(['vivodepot-studio.html', 'vivodepot-vc-issuer.html', 'vivodepot.html'].concat(PRO_MODULE));
/* Die Teilung der Grundlinie: die Pro-Module sind Vorlagen der zweiten Schicht und gehen nicht hinaus (im öffentlichen Zuschnitt
   führt PRODUKTE sie gar nicht); sie stehen in der internen Ergänzung, alles andere öffentlich. Dass diese Regel mit der
   Entscheidung des Zuschnitts übereinstimmt, hält eine Probe, die selbst drinnen bleibt. */
const intern = (rel) => PRO_MODULE.includes(rel);

const LAENDER = ['Deutschland', 'Germany', 'Österreich', 'Austria', 'Schweiz', 'Switzerland'];
const RECHTSFORMEN = ['GmbH', 'e\\.V\\.', 'AG', 'gGmbH', 'UG', 'KG', 'OHG', 'GbR'];
const L_ALT = LAENDER.join('|');
const R_ALT = RECHTSFORMEN.join('|');
const ARTEN = Object.freeze({
  'land-vorgabe': [
    new RegExp("\\|\\|\\s*['\"](?:" + L_ALT + ")['\"]", 'g'),
    new RegExp("\\b(?:land|rechtsraumName)\\s*:\\s*(?:L\\()?['\"](?:" + L_ALT + ")['\"]", 'g'),
    new RegExp("\\bvalue=\"(?:" + L_ALT + ")\"", 'g'),
  ],
  'rechtsraum-vorgabe': [
    /\brechtsraum\s*:\s*['"][A-Z]{2}['"]/g,
    /\|\|\s*['"](?:DE|AT|CH)['"]/g,
  ],
  'rechtsform-liste': [
    new RegExp("['\"](?:" + R_ALT + ")['\"]\\s*,\\s*['\"](?:" + R_ALT + ")['\"]", 'g'),
    new RegExp("^\\s*\"(?:" + R_ALT + ")\",?\\s*$", 'gm'),
    new RegExp("['\"](?:" + R_ALT + ")['\"]\\s*:\\s*['\"]", 'g'),
  ],
});

/* Kommentare und der generierte Bereich werden vor dem Zählen durch Leerraum gleicher Länge ersetzt (Zeilen bleiben). */
function bereinigen(text) {
  const leer = (m) => m.replace(/[^\n]/g, ' ');
  return String(text)
    .replace(/\/\* RECHTSRAUM_BEKANNT:BEGIN[\s\S]*?RECHTSRAUM_BEKANNT:END \*\//g, leer)
    .replace(/\/\* STUDIO-RECHTSRAEUME:BEGIN[\s\S]*?STUDIO-RECHTSRAEUME:END \*\//g, leer)
    .replace(/<!--[\s\S]*?-->/g, leer)
    .replace(/\/\*[\s\S]*?\*\//g, leer)
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (m, a) => a + leer(m.slice(a.length)));
}
function zaehlen(text) {
  const t = bereinigen(text);
  const raus = {};
  for (const [art, muster] of Object.entries(ARTEN)) {
    const stellen = new Set();
    for (const re of muster) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(t))) { const lead = m[0].length - m[0].trimStart().length; stellen.add(t.slice(0, m.index + lead).split('\n').length); }
    }
    raus[art] = stellen.size;
  }
  return raus;
}
function messen() {
  const jeDatei = {};
  for (const rel of GEFUEHRT) jeDatei[rel] = zaehlen(fs.readFileSync(path.join(REPO, rel), 'utf8'));
  return jeDatei;
}
function vergleichen(ist, soll) {
  const befunde = [];
  for (const rel of Object.keys(ist)) for (const art of Object.keys(ARTEN)) {
    const a = ist[rel][art], s = (soll[rel] && soll[rel][art]) || 0;
    if (a > s) befunde.push(rel + ' · ' + art + ': ' + a + ' statt höchstens ' + s + ' (neue Länderannahme)');
    else if (a < s) befunde.push(rel + ' · ' + art + ': ' + a + ' statt ' + s + ' (DRIFT, Grundlinie mit --grundlinie-schreiben nachziehen)');
  }
  return befunde;
}
module.exports = { zaehlen, messen, vergleichen, bereinigen, grundlinieLesen, teilen, teilungPruefen, intern, GEFUEHRT, PRO_MODULE, ARTEN, GRUNDLINIE_PFAD };

if (require.main === module) {
  const arg = process.argv.slice(2);
  const i = arg.indexOf('--datei');
  if (i >= 0) { console.log(JSON.stringify(zaehlen(fs.readFileSync(path.resolve(arg[i + 1]), 'utf8')))); process.exit(0); }
  const ist = messen();
  const istZurueck = intern;
  if (arg.includes('--grundlinie-schreiben')) {
    const { oeffentlich, intern } = teilen(ist, istZurueck);
    fs.writeFileSync(GRUNDLINIE_PFAD, JSON.stringify({ gegenstand: GEGENSTAND, jeDatei: oeffentlich }, null, 1) + '\n');
    if (Object.keys(intern).length || fs.existsSync(ergaenzungPfad(GRUNDLINIE_PFAD))) {
      fs.writeFileSync(ergaenzungPfad(GRUNDLINIE_PFAD), JSON.stringify({ jeDatei: intern }, null, 1) + '\n');
    }
    console.log('[laenderannahme] Grundlinie geschrieben: ' + Object.keys(oeffentlich).length + ' öffentlich, ' + Object.keys(intern).length + ' intern');
    process.exit(0);
  }
  const soll = grundlinieLesen();
  const b = vergleichen(ist, soll).concat(teilungPruefen(JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8')).jeDatei, istZurueck));
  if (b.length) { console.error('[laenderannahme] ROT\n  ' + b.join('\n  ')); process.exit(1); }
  console.log('[laenderannahme] grün: ' + JSON.stringify(ist));
}
