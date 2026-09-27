'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-345 (A4) — Die vier
   Dokumentmodule (PV/KI/VOLLMACHT/BETREUUNG) + STANDARD_VORLAGEN wandern
   ins eingebettete Bündel
   ────────────────────────────────────────────────────────────────────────
   Wörtlicher Spiegel von `tools/situationen-ins-buendel-schreiben.js`
   (U2-ADR-341), auf die fünfte Achse übertragen — mit einer strukturellen
   Abweichung: die vier Module tragen einen KONTRAKT (sieben Eigenschaften,
   sechs davon Funktionswerte). U2-ADR-146: das Modul WÄHLT einen Motor
   NAMENTLICH aus einer im Kern eingebauten Tabelle (s.
   `DOKUMENT_MODUL_MOTOREN_ERLAUBT` in vivodepot.html) — dieses Werkzeug
   schreibt darum je Modul `{ motor: '<name>', abschnitte: [...] }`, NIE
   eine Funktion.

   NICHT AUS DEM LAUFENDEN KERN ZIEHEN (Absprache vom 06.09.2026,
   dreimal heute real getroffen: SEKTOREN, SITUATIONEN, PV_BMJ): ein
   normal geladener Kern hat `textsatzNeuAnwenden()` bereits einmal
   durchlaufen — bei den vier Modulen betrifft das `abschnitte[].einleitung`/
   `.texte`/`.satz`-Felder, die `_textsatzAufDokumentModulAnwenden` in-place
   überschreibt. Ein Schnappschuss danach friert den TEXTSATZ-ZUSTAND ein,
   nicht die Struktur — ein künftiges Sprachmodul könnte diese Felder dann
   nie wieder erreichen. Weg: `KERN_HTML_PATH` auf einen TEMPORÄREN Klon von
   `vivodepot.html`, in dem kein deutscher Satz steht (seit S8 das rohe Gerüst; früher `AB_WERK_TEXTSATZ_DE` durch `Object.freeze({})`
   ersetzt) — jeder Textsatz-Lauf greift dann ins Leere und lässt die
   Struktur-Felder unverändert.

   REIHENFOLGE, BEVOR DIESES WERKZEUG WIRKLICH SCHREIBT: `da`s U2-ADR-343
   (Vollmacht-Wortlaut, „Formulartext 1:1") muss im Arbeitsbaum stehen —
   sonst friert ein überholter Wortlaut ins Bündel ein, während der geleerte
   native Block den Fix bereits trägt. Diese Datei prüft das nicht
   automatisch (der Wortlaut-Text selbst trägt kein Versions-Merkmal) —
   Bedingung wird vor dem Lauf bestätigt, nicht hier erzwungen.

   Der Ablauf:
     1. Kern aus einem TEXTSATZ-NEUTRALEN Klon laden (s. o.).
     2. Für jedes der vier Module: `motor` (fest zugeordnet, s.
        `MODUL_ZU_MOTOR`) + `abschnitte` (JSON-Rundreise, Getter/Funktionen
        werden dabei aufgelöst — es gibt heute keine in `abschnitte`,
        NACHDEM die drei `pruef`-Funktionswerte durch `bedingung`-Schemas
        ersetzt sind, s. Kommentar bei den drei crossRef-Blöcken in
        vivodepot.html).
     3. STANDARD_VORLAGEN als Objekt, Kennung → Eintrag (inkl. `templateJws`
        — vertrauenswürdig, weil aus dem EINGEBETTETEN, signierten Bündel).
     4. In die reale `BUERGERMODUL_BUENDEL`-Konstante schreiben, zwei neue
        Schlüssel `dokumentModule`/`standardVorlagen` neben `bereiche`/
        `situationen`(/ggf. `dokumente`, cbs A3) — Kollisions-Guard wie bei
        `situationen-ins-buendel-schreiben.js`.
     5. Die fünf nativen Blöcke leeren: `let X = null;` für die vier Module,
        `let STANDARD_VORLAGEN = [];` — UND den Materialisierungs-Aufruf in
        vivodepot.html von seinem Kommentar befreien (der Anker-Text steht
        fest, s. `MATERIALISIERUNGS_AUFRUF_KOMMENTIERT`/`_UNKOMMENTIERT`
        unten).

   Was dieses Werkzeug NICHT prüft: A==B gegen einen eingefrorenen Commit.
   Das ist eine eigene, unabhängige Probe (dieselbe Trennung wie bei
   SITUATIONEN) — Fehler in diesem Werkzeug sollen sich nicht selbst
   beweisen können.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { jsStringSicher, jsStringEntsichern, stringLiteralEndeFinden } = require('./lib/js-string-literal.js');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');
const NUR_PRUEFEN = process.argv.includes('--check');

const MODUL_ZU_MOTOR = Object.freeze({
  patientenverfuegung: 'pv',
  'ki-verfuegung': 'ki',
  vorsorgevollmacht: 'vm',
  betreuungsverfuegung: 'bv',
});
const MOTOR_ZU_KERNNAME = Object.freeze({ pv: 'PV_MODUL', ki: 'KI_MODUL', vm: 'VOLLMACHT_MODUL', bv: 'BETREUUNG_MODUL' });

/* Textsatz-neutraler Klon — s. Kopfkommentar. Schreibt eine temporäre Datei neben der echten
   vivodepot.html (nicht ins System-/tmp, damit relative Pfade im Kern unverändert auflösen). */
function textsatzNeutralenKlonSchreiben() {
  // Seit S8 (U2-ADR-428) trägt das rohe Gerüst keinen deutschen Satz — der Klon mit geleerter Konstante ist ein Byte-Abbild der echten Datei.
  const html = fs.readFileSync(HTML_PFAD, 'utf8');
  const klonPfad = path.join(REPO, '.tmp-textsatz-neutraler-klon-a4.html');
  fs.writeFileSync(klonPfad, html);
  return klonPfad;
}

const ERLAUBTE_ABSCHNITT_SCHLUESSEL_HINWEIS = 'abschnitte reisen vollständig (keine Teilliste wie bei '
  + 'SITUATIONEN nötig) — anders als situation.titel/.einfuehrung gibt es hier keine parallele, aus '
  + 'demselben Katalog erneut ableitbare Textsatz-Kopie: `abschnitte` IST der Inhalt, es existiert '
  + 'unter keinem zweiten Namen im Textsatz-Katalog.';

function dokumentModuleAlsObjekt(V) {
  const o = {};
  for (const [id, motor] of Object.entries(MODUL_ZU_MOTOR)) {
    const kernname = MOTOR_ZU_KERNNAME[motor];
    const modul = V[kernname];
    if (!modul || !Array.isArray(modul.abschnitte)) {
      throw new Error('dokumentModuleAlsObjekt: ' + kernname + ' fehlt oder trägt kein abschnitte-Array');
    }
    o[id] = { motor, abschnitte: JSON.parse(JSON.stringify(modul.abschnitte)) };
  }
  return o;
}

function standardVorlagenAlsObjekt(STANDARD_VORLAGEN) {
  const o = {};
  for (const v of STANDARD_VORLAGEN) {
    if (!v || !v.id) continue;
    o[v.id] = JSON.parse(JSON.stringify(v));
  }
  if (Object.keys(o).length !== STANDARD_VORLAGEN.length) {
    throw new Error('standardVorlagenAlsObjekt: Kollision — zwei Vorlagen teilen sich eine ID');
  }
  return o;
}

function buendelSchreiben(html, dokumentModuleObj, standardVorlagenObj) {
  const startMarker = "const BUERGERMODUL_BUENDEL = JSON.parse('";
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error('Anker BUERGERMODUL_BUENDEL nicht gefunden');
  const start = i + startMarker.length;
  const j = stringLiteralEndeFinden(html, start);
  if (j < start) throw new Error('Ende des Bündel-Literals nicht gefunden (escape-bewusste Suche lief ins Leere)');
  if (html.slice(j, j + 3) !== "');") throw new Error('Gefundenes Ende ist kein "\');" — Anker unsicher, Abbruch statt Rateversuch');
  const jsonText = jsStringEntsichern(html.slice(start, j));
  const bestehend = JSON.parse(jsonText);
  if (bestehend.dokumentModule) throw new Error('BUERGERMODUL_BUENDEL trägt bereits einen dokumentModule-Schlüssel — nicht überschreiben, sondern prüfen, was da ist');
  if (bestehend.standardVorlagen) throw new Error('BUERGERMODUL_BUENDEL trägt bereits einen standardVorlagen-Schlüssel — nicht überschreiben, sondern prüfen, was da ist');
  bestehend.dokumentModule = dokumentModuleObj;
  bestehend.standardVorlagen = standardVorlagenObj;
  const neuJson = JSON.stringify(bestehend);
  return html.slice(0, start) + jsStringSicher(neuJson) + html.slice(j);
}

/* Leert einen der vier Modul-Konstanten (`const X = Object.freeze({...});`) auf `let X = null;` —
   klammerbalanciert ab dem öffnenden `Object.freeze({`, damit eingebettete `});`-Teilstrings in
   Wortlaut-Strings die Grenze nicht vortäuschen. */
function modulKonstanteLeeren(html, kernname) {
  const anker = 'const ' + kernname + ' = Object.freeze({';
  const start = html.indexOf(anker);
  if (start < 0) throw new Error('Anker "' + anker + '" nicht gefunden');
  let depth = 0, i = start + ('const ' + kernname + ' = Object.freeze(').length - 1, ende = -1;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { ende = i + 1; break; } }
  }
  if (ende < 0) throw new Error('schließende Klammer von ' + kernname + ' nicht gefunden');
  // nach der schließenden Objekt-Klammer folgt noch `);` (Object.freeze-Aufruf)
  const nachKlammer = html.slice(ende, ende + 2);
  if (nachKlammer !== ');') throw new Error(kernname + ': erwartetes ");" nach der Objekt-Klammer nicht gefunden — Anker unsicher');
  const platzhalter = 'let ' + kernname + ' = null; // U2-ADR-345: materialisiert aus BUERGERMODUL_BUENDEL, '
    + 's. _dokumentModuleUndVorlagenAusBuendelMaterialisieren() weiter unten';
  return html.slice(0, start) + platzhalter + html.slice(ende + 2);
}

function standardVorlagenKonstanteLeeren(html) {
  const anker = 'const STANDARD_VORLAGEN = Object.freeze([';
  const start = html.indexOf(anker);
  if (start < 0) throw new Error('Anker STANDARD_VORLAGEN-Deklaration nicht gefunden');
  let depth = 0, i = start + 'const STANDARD_VORLAGEN = Object.freeze('.length - 1, ende = -1;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) { ende = i + 1; break; } }
  }
  if (ende < 0) throw new Error('schließende Klammer von STANDARD_VORLAGEN nicht gefunden');
  if (html.slice(ende, ende + 2) !== ');') throw new Error('STANDARD_VORLAGEN: erwartetes ");" nicht gefunden');
  return html.slice(0, start) + 'let STANDARD_VORLAGEN = []; // U2-ADR-345: materialisiert aus BUERGERMODUL_BUENDEL' + html.slice(ende + 2);
}

function materialisierungsAufrufFreischalten(html) {
  const kommentiert = "const _DOKUMENT_MODULE_MATERIALISIERT = _dokumentModuleUndVorlagenAusBuendelMaterialisieren(); */";
  const i = html.indexOf(kommentiert);
  if (i < 0) throw new Error('kommentierter Materialisierungs-Aufruf nicht gefunden — schon freigeschaltet, oder der Anker-Text hat sich geändert');
  // Der gesamte "NOCH NICHT VERDRAHTET"-Kommentarblock (inkl. dieser Zeile) wird durch den echten Aufruf ersetzt.
  const blockStart = html.lastIndexOf('/* NOCH NICHT VERDRAHTET', i);
  if (blockStart < 0) throw new Error('Anfang des "NOCH NICHT VERDRAHTET"-Kommentarblocks nicht gefunden');
  const blockEnde = i + kommentiert.length;
  return html.slice(0, blockStart)
    + 'const _DOKUMENT_MODULE_MATERIALISIERT = _dokumentModuleUndVorlagenAusBuendelMaterialisieren();'
    + html.slice(blockEnde);
}

async function main() {
  const klonPfad = textsatzNeutralenKlonSchreiben();
  const vorherigerOverride = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = klonPfad;
  let V;
  try {
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
    ({ V } = require(path.join(REPO, 'tests', 'load-kern.js')).ladeKern());
  } finally {
    if (vorherigerOverride === undefined) delete process.env.KERN_HTML_PATH;
    else process.env.KERN_HTML_PATH = vorherigerOverride;
    fs.unlinkSync(klonPfad);
  }

  const dokumentModuleObj = dokumentModuleAlsObjekt(V);
  const standardVorlagenObj = standardVorlagenAlsObjekt(V.STANDARD_VORLAGEN);

  console.log('dokumentmodule-ins-buendel-schreiben: ' + Object.keys(dokumentModuleObj).length
    + ' Dokumentmodule (' + Object.keys(dokumentModuleObj).join(', ') + '), '
    + Object.keys(standardVorlagenObj).length + ' Standardvorlagen ('
    + Object.keys(standardVorlagenObj).join(', ') + ') aus dem nativen Bestand gelesen.');

  if (Object.keys(dokumentModuleObj).length !== 4) {
    throw new Error('erwartet genau vier Dokumentmodule, gefunden: ' + Object.keys(dokumentModuleObj).length);
  }

  if (NUR_PRUEFEN) {
    console.log('--check: nur gemessen, nichts geschrieben.');
    return;
  }

  let html = fs.readFileSync(HTML_PFAD, 'utf8');
  html = buendelSchreiben(html, dokumentModuleObj, standardVorlagenObj);
  for (const kernname of Object.values(MOTOR_ZU_KERNNAME)) {
    html = modulKonstanteLeeren(html, kernname);
  }
  html = standardVorlagenKonstanteLeeren(html);
  html = materialisierungsAufrufFreischalten(html);
  fs.writeFileSync(HTML_PFAD, html);
  console.log('geschrieben: dokumentModule/standardVorlagen im Bündel, fünf native Blöcke geleert, '
    + 'Materialisierungs-Aufruf freigeschaltet.');
}

if (require.main === module) require('./lib/buendel-migration-schranke.js').starten('dokumentmodule-ins-buendel-schreiben', HTML_PFAD, () => main().catch((e) => { console.error(e); process.exitCode = 1; }));
module.exports = {
  MODUL_ZU_MOTOR, MOTOR_ZU_KERNNAME, dokumentModuleAlsObjekt, standardVorlagenAlsObjekt,
  buendelSchreiben, modulKonstanteLeeren, standardVorlagenKonstanteLeeren,
  materialisierungsAufrufFreischalten, textsatzNeutralenKlonSchreiben, jsStringSicher,
  jsStringEntsichern, stringLiteralEndeFinden,
};
