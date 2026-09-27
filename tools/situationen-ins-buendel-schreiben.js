'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-341 (A1b) — SITUATIONEN wandern ins eingebettete Bündel
   ────────────────────────────────────────────────────────────────────────
   NACHTRAG (06.09.2026, frühere Erhebung): der Lesepfad in `buendelMitSituationenSchreiben` rief
   `JSON.parse(html.slice(start,j))` OHNE Entschärfung auf — trägt nur, solange kein Bündel-Wert
   ein escapetes `"` enthält. A4 (Dokumentmodul-Umzug) traf real: `JSON.parse` brach bei ~7 % der
   echten Länge ab, weil ein Wortlaut ein eingebettetes `"` trug (`\"` wird durch `jsStringSicher`
   zu `\\"` — ein escapter Backslash, gefolgt von einem BLOSSEN, string-beendenden `"`). Der
   Ende-Anker selbst war NICHT betroffen (nachgemessen: `indexOf("');")` findet, weil
   `jsStringSicher` jeden Apostroph escaped, immer dieselbe Stelle wie ein escape-bewusster
   Scanner). Auf `tools/lib/js-string-literal.js` umgestellt (trägt den Scanner trotzdem, als
   robustere, vom genauen Escape-Schema unabhängige Grenze) — s. dort für den vollen Befund.
   Verhalten für den heutigen Situationen-Bestand unverändert (kein Situations-Wortlaut trägt
   ein eingebettetes `"`), die Korrektur ist reine Absicherung gegen künftige Inhalte.

   Gemessen, nicht angenommen (06.09.2026): es gab KEIN wiederverwendbares
   Werkzeug, das `BUERGERMODUL_BUENDEL`s eingebettetes JSON tatsächlich
   SCHREIBT — `tools/buergermodul-erzeugen.js` baut nur einen DIAGNOSE-
   Bericht (`baueBuergermodul()`), keinen Bündel-Inhalt. Dieses Werkzeug
   schließt die Lücke, für genau diese eine Achse.

   Der Ablauf, in der Reihenfolge, in der er läuft:
     1. Kern laden, V.SITUATIONEN lesen — die native Quelle, VOR jeder
        Änderung. Die Form ist ein Array; das Bündel braucht ein Objekt,
        Kennung → Situation (dieselbe Übersetzung wie in
        tools/buergermodul-erzeugen.js `uebersetzen('situation', …)`,
        hier nicht importiert, sondern absichtlich noch einmal
        hingeschrieben — zwei unabhängige Stellen, die dieselbe Form
        erwarten, sind der Beleg, dass die Form stimmt, nicht nur behauptet
        wird).
     2. `JSON.parse(JSON.stringify(situation))` je Eintrag — GETTER
        (gemessen: `todesfall-uebernahme.bloecke` ist einer, U2-ADR-308)
        werden dabei aufgelöst, nicht mitgeschleppt. Das ist gewollt: das
        Bündel trägt einen WERT, keinen Mechanismus.
     3. In die REALE, im Kern eingebettete `BUERGERMODUL_BUENDEL`-Konstante
        schreiben — als zusätzlicher Schlüssel `situationen` neben
        `bereiche`. Zwei Zeichenketten-Ebenen hintereinander (JSON, dann
        JS-Single-Quote): Backslash verdoppeln, dann Apostroph escapen —
        sonst frisst die JS-Ebene ein Escape, das die JSON-Ebene für ein
        eingebettetes Anführungszeichen braucht (der reale Fund aus
        U2-ADR-341, Rot-Beweis 1, erste Runde: SyntaxError mitten im
        Wortlaut, weil genau dieser zweite Schritt fehlte).
     4. Den nativen SITUATIONEN-Block auf `[]` leeren — `let` statt `const`
        ist seit U2-ADR-341 vorbereitet.
     5. NICHTS wird geschrieben, wenn Schritt 1-2 nicht zu genau der
        Situationszahl führen, die vorher gemessen wurde (`--check`
        erlaubt eine reine Messung ohne Schreiben).

   Was dieses Werkzeug NICHT prüft: ob der native Bestand nach dem
   Umzug byte-gleich bleibt (A==B gegen 37038011). Das ist eine eigene,
   unabhängige Probe — der Zweck genau dieser Trennung ist, dass ein
   Fehler in DIESEM Werkzeug nicht sich selbst beweisen kann.

   NACHTRAG (U2-ADR-341c, 06.09.2026) — BEDINGTE BLÖCKE: `todesfall-uebernahme` trägt EINEN
   Block, der nativ nur erscheint, wenn `_kiHatDaten()` zur Lese-Zeit wahr ist (der Kern legt
   dafür seit U2-ADR-341c eine generische Erlaubnisliste an, s. `SITUATION_BEDINGUNGEN_ERLAUBT`
   in vivodepot.html). Ein Schnappschuss an einem LEEREN Depot sieht diesen Block nie — die
   Bedingung ist im JS-Code des Getters verankert, nicht als introspizierbare Metadaten,
   AUTOMATISCHES Erkennen ist darum nicht möglich. Dieses Werkzeug legt darum VOR dem Lesen ein
   Depot MIT KI-Verfügungs-Daten an (`KI_BEDINGUNG_DEPOT`), damit der Block im Schnappschuss
   überhaupt vorkommt, und trägt eine kleine, EXPLIZITE Tabelle (`BEDINGTE_BLOECKE`) der
   bekannten Fälle nach — bewusst nicht generisch: eine Bedingung im Quelltext lässt sich nicht
   zuverlässig automatisch benennen, das ist echtes Wissen über den Bestand, kein Algorithmus.
   Gemessen (06.09.2026): GENAU EIN bedingter Block im gesamten nativen Bestand aller zehn
   Situationen (grep `if (typeof _.*HatDaten`). Die Tabelle unten ist damit vollständig für
   heute — ein zweiter Fall bräuchte einen zweiten Tabelleneintrag hier, keine Kernzeile im
   Gerüst (das ist der ganze Punkt der Erlaubnisliste).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { jsStringSicher, jsStringEntsichern, stringLiteralEndeFinden } = require('./lib/js-string-literal.js');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');
const NUR_PRUEFEN = process.argv.includes('--check');

/* Die bekannten bedingten Blöcke, von Hand benannt — s. Kopfkommentar. Jeder Eintrag markiert
   GENAU EINEN Block mit dem Namen der Bedingung, gegen die `SITUATION_BEDINGUNGEN_ERLAUBT`
   ihn im Kern zur Lese-Zeit auswertet. */
const BEDINGTE_BLOECKE = Object.freeze([
  { situationId: 'todesfall-uebernahme', blockId: 'digitale-nachbildung-ki-verfuegung', bedingung: 'ki-hat-daten' },
]);

/* U2-ADR-341b-Nachtrag (06.09.2026) — ALLERLISTE, NICHT STREICHLISTE, genau wie
   `ERLAUBTE_BEREICH_SCHLUESSEL` in tools/vd-privat-struktur-bundle-erzeugen.js (U2-ADR-320):
   ein Modul WÄHLT namentlich, es LIEFERT nicht (U2-ADR-146). `V.SITUATIONEN` ist zum Zeitpunkt
   dieses Lesens bereits durch `_textsatzAufSituationenAnwenden` gelaufen — `titel` und
   `einfuehrung` sind darum keine nativen Struktur-Felder mehr, sondern RESOLVED deutsche
   Texte, live auf das Objekt geschrieben. Ungefiltert mitgeschrieben, landen sie als
   Doppelzustand im Bündel: derselbe Text UNTER SEINEM KATALOG-SCHLÜSSEL im Satz, UND
   wörtlich hier — genau der Fund, den `tools/inline-texte-messen.js`s Doppelzustands-Wächter
   melden soll (real getroffen: alle zehn `situation:*.einfuehrung`, U2-ADR-341b §9).
   `_situationAusBuendelErzeugen` ruft `_textsatzAufSituationenAnwenden([neu])` ohnehin erneut
   auf jede Bündel-Situation an — `titel`/`einfuehrung` entstehen beim Boot frisch aus
   GENAU DERSELBEN Katalog-Kennung, eine mitgeschleppte Kopie hier ist damit nicht nur
   doppelt, sondern auch tot. */
const ERLAUBTE_SITUATION_SCHLUESSEL = Object.freeze(['icon', 'modus', 'bloecke']);

function situationenAlsObjekt(SITUATIONEN) {
  const o = {};
  for (const s of SITUATIONEN) {
    if (!s || !s.id) continue;
    const voll = JSON.parse(JSON.stringify(s));
    const eintrag = {};
    for (const k of ERLAUBTE_SITUATION_SCHLUESSEL) {
      if (voll[k] !== undefined) eintrag[k] = voll[k];
    }
    o[s.id] = eintrag;
  }
  let markiert = 0;
  for (const eintrag of BEDINGTE_BLOECKE) {
    const sit = o[eintrag.situationId];
    if (!sit) throw new Error('BEDINGTE_BLOECKE: Situation "' + eintrag.situationId + '" nicht im Schnappschuss — '
      + 'falsch geschrieben, oder die Situation existiert nicht mehr');
    const blk = (Array.isArray(sit.bloecke) ? sit.bloecke : []).find((b) => b && b.id === eintrag.blockId);
    if (!blk) throw new Error('BEDINGTE_BLOECKE: Block "' + eintrag.blockId + '" in "' + eintrag.situationId + '" '
      + 'nicht im Schnappschuss gefunden — die Bedingung war beim Erzeugen nicht erfüllt, das Depot deckt sie nicht '
      + '(s. KI_BEDINGUNG_DEPOT), oder der Block wurde umbenannt');
    blk.bedingung = eintrag.bedingung;
    markiert++;
  }
  if (markiert !== BEDINGTE_BLOECKE.length) {
    throw new Error('BEDINGTE_BLOECKE: ' + markiert + ' von ' + BEDINGTE_BLOECKE.length + ' markiert — '
      + 'ein Durchlauf, der nicht alle bekannten Fälle trifft, darf nicht grün aussehen.');
  }
  return o;
}

function buendelMitSituationenSchreiben(html, situationenObjekt) {
  const startMarker = "const BUERGERMODUL_BUENDEL = JSON.parse('";
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error('Anker BUERGERMODUL_BUENDEL nicht gefunden');
  const start = i + startMarker.length;
  const j = stringLiteralEndeFinden(html, start);
  if (j < start) throw new Error('Ende des Bündel-Literals nicht gefunden (escape-bewusste Suche lief ins Leere)');
  if (html.slice(j, j + 3) !== "');") throw new Error('Gefundenes Ende ist kein "\');" — Anker unsicher, Abbruch statt Rateversuch');
  const jsonText = jsStringEntsichern(html.slice(start, j));
  const bestehend = JSON.parse(jsonText);
  if (bestehend.situationen) throw new Error('BUERGERMODUL_BUENDEL trägt bereits einen situationen-Schlüssel — nicht überschreiben, sondern prüfen, was da ist');
  bestehend.situationen = situationenObjekt;
  const neuJson = JSON.stringify(bestehend);
  return html.slice(0, start) + jsStringSicher(neuJson) + html.slice(j);
}

function nativenSituationenBlockLeeren(html) {
  const anker = 'let SITUATIONEN = Object.freeze(_textsatzAufSituationenAnwenden([';
  const start = html.indexOf(anker);
  if (start < 0) throw new Error('Anker SITUATIONEN-Deklaration nicht gefunden');
  const inhaltStart = start + anker.length;
  const endeMarker = 'let SITUATION_BY_ID';
  const endeIdx = html.indexOf(endeMarker, inhaltStart);
  if (endeIdx < 0) throw new Error('Anker SITUATION_BY_ID nicht gefunden');
  const listenEnde = html.lastIndexOf(']));', endeIdx);
  if (listenEnde <= inhaltStart) throw new Error('schließende Listenklammer nicht gefunden');
  return html.slice(0, inhaltStart) + html.slice(listenEnde);
}

/* Ein Depot, das JEDE bekannte Bedingung aus BEDINGTE_BLOECKE wahr macht — sonst sieht der
   Schnappschuss den bedingten Block nie, und `situationenAlsObjekt` wirft (s. dort). Minimal:
   nur die Felder, die die jeweilige `_xyzHatDaten()`-Funktion selbst prüft, kein vollständiges
   Referenzdepot. */
async function kiBedingungDepotAnlegen(V) {
  await V.depotAnlegen('u2-adr-341c-situationen-buendel-2026!');
  const d = V.getData();
  d.sektoren = d.sektoren || {};
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  d.sektoren.advanceCare.provisionInstruments = [
    { instrument: 'ki-verfuegung', basicDecision: 'erlaubnis' },
  ];
}

async function main() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();
  await kiBedingungDepotAnlegen(V);

  const situationen = situationenAlsObjekt(V.SITUATIONEN);
  const anzahl = Object.keys(situationen).length;
  console.log('situationen-ins-buendel-schreiben: ' + anzahl + ' Situationen aus dem nativen Bestand gelesen: '
    + Object.keys(situationen).join(', '));

  if (anzahl !== V.SITUATIONEN.length) {
    throw new Error('Kollision: zwei Situationen teilen sich eine ID, ' + V.SITUATIONEN.length
      + ' im Bestand, ' + anzahl + ' eindeutige Schlüssel');
  }

  if (NUR_PRUEFEN) {
    console.log('--check: nur gemessen, nichts geschrieben.');
    return;
  }

  let html = fs.readFileSync(HTML_PFAD, 'utf8');
  html = buendelMitSituationenSchreiben(html, situationen);
  html = nativenSituationenBlockLeeren(html);
  fs.writeFileSync(HTML_PFAD, html);
  console.log('geschrieben: situationen im Bündel, nativer Block auf [] geleert.');
}

if (require.main === module) require('./lib/buendel-migration-schranke.js').starten('situationen-ins-buendel-schreiben', HTML_PFAD, () => main().catch((e) => { console.error(e); process.exitCode = 1; }));
module.exports = { situationenAlsObjekt, buendelMitSituationenSchreiben, nativenSituationenBlockLeeren, jsStringSicher, kiBedingungDepotAnlegen, BEDINGTE_BLOECKE };
