'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „zugang-zum-recht" Lücke 2 — die Ab-Werk-Vorlagen wandern
   ins eingebettete Bündel
   ────────────────────────────────────────────────────────────────────────
   Gemessen (06.09.2026), nicht angenommen: `ERBSCHEIN_VORBEREITUNG_BUNDLE_
   TEXT_EINGEBAUT` und `ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT`
   sind zwei hartkodierte JS-Strings direkt in vivodepot.html — beide
   Templates der Familie `zugang-zum-recht` (U2-ADR-288/326), aber KEIN
   Bestandteil von `BUERGERMODUL_BUENDEL`. Damit sind sie „im Kern
   eingebaut", nicht „ein Template unter vielen". Dieses Werkzeug schließt
   die Lücke, nach derselben Bauform wie `situationen-ins-buendel-
   schreiben.js` (U2-ADR-341): Erzeuger schreibt den Inhalt ins Bündel,
   Kern baut die alten Bindungen daraus zurück, Abnahme bleibt grün.

   DER UNTERSCHIED ZUR SITUATIONEN-ACHSE, UND ER IST ABSICHTLICH: dort wird
   die NATIVE Variable am Boot aus dem Bündel wieder AUFGEFÜLLT
   (`SITUATIONEN = Object.freeze(SITUATIONEN.concat([neu]))`), weil sie
   laufend von Rendering-Code gelesen wird. Hier gibt es zwei externe
   Verträge, die erhalten bleiben müssen, ohne dass ein Renderweg sie
   direkt braucht:
     1. `AB_WERK_AUSZUG_BUNDLE_TEXTE` — die Liste, die `_abWerkAuszuege
        Einlassen()` beim Depot-Anlegen/-Migrieren durchläuft. Bleibt in
        Form UND Verhalten unverändert (Array von JSON-Text-Strings),
        wird aber aus `BUERGERMODUL_BUENDEL.logikModule` ABGELEITET statt
        zwei Namen aufzuzählen.
     2. `ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT` /
        `ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT` — von
        `tests/erbschein-ab-werk-einlass.test.js` und `tests/zugang-zum-
        recht-ab-werk-einlass.test.js` direkt gelesen (Vergleich gegen die
        Fixture-Datei). Beide bleiben als NAMEN bestehen, werden aber
        ebenfalls aus dem Bündel abgeleitet (`.find(id).map(JSON.stringify)`)
        — kein Testumbau nötig, derselbe „externer Vertrag bleibt" wie bei
        `V.SITUATIONEN`.

   WARUM EIN ARRAY, KEIN OBJEKT-NACH-ID (anders als `situationenAlsObjekt`):
   ein logikModul trägt seine `id` bereits ALS EIGENES FELD (Register 7,
   `kennung: (m) => m.id`) — eine zweite, äußere Schlüsselung wäre eine
   Doppelform derselben Kennung, ohne Nutzen.

   KORREKTUR (07.09.2026, Hinweis): meine ursprüngliche Fassung dieser
   Datei behauptete, `situationen-ins-buendel-schreiben.js`s naiver
   `indexOf("');")`-Anker sei selbst der Fehler, und baute einen eigenen
   escape-bewussten Scanner dagegen. Das war die falsche Diagnose — inzwischen
   in `tools/lib/js-string-literal.js` richtiggestellt (dort „KORRIGIERTE
   ANNAHME"): der Anker trifft IMMER dieselbe Stelle wie ein escape-bewusster
   Scan, weil `jsStringSicher` jeden Apostroph unbedingt escaped. Der reale
   Fehler war die FEHLENDE ENTSCHÄRFUNG vor `JSON.parse` — ein escapter
   Apostroph blieb als `\'` im gelesenen Text stehen, `JSON.parse` brach
   irgendwo in der Mitte ab. Dieses Werkzeug nutzt jetzt dieselbe, EINE
   Bibliothek statt einer zweiten eigenen Fassung desselben Scanners.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { jsStringSicher, jsStringEntsichern, stringLiteralEndeFinden } = require('./lib/js-string-literal.js');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');
const NUR_PRUEFEN = process.argv.includes('--check');

function buendelLesenUndSchreiben(html, veraendern) {
  const startMarker = "const BUERGERMODUL_BUENDEL = JSON.parse('";
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error('Anker BUERGERMODUL_BUENDEL nicht gefunden');
  const inhaltStart = i + startMarker.length;
  const ende = stringLiteralEndeFinden(html, inhaltStart);
  if (ende < 0) throw new Error('kein unmaskiertes Stringende gefunden');
  const jsonText = jsStringEntsichern(html.slice(inhaltStart, ende));
  const bestehend = JSON.parse(jsonText);
  veraendern(bestehend);
  const neuJson = JSON.stringify(bestehend);
  return html.slice(0, inhaltStart) + jsStringSicher(neuJson) + html.slice(ende);
}

function logikModuleAlsArray(V) {
  const erbschein = JSON.parse(V.ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT);
  const zugangRecht = JSON.parse(V.ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT);
  return [erbschein, zugangRecht];
}

function buendelMitLogikModuleSchreiben(html, logikModuleArray) {
  return buendelLesenUndSchreiben(html, (bestehend) => {
    if (bestehend.logikModule) {
      throw new Error('BUERGERMODUL_BUENDEL trägt bereits einen logikModule-Schlüssel — nicht überschreiben, sondern prüfen, was da ist');
    }
    bestehend.logikModule = logikModuleArray;
  });
}

// Ersetzt die drei nativen Konstanten durch aus dem Bündel ABGELEITETE Bindungen mit
// GENAU DENSELBEN Namen — die beiden Templates-Tests und `_abWerkAuszuegeEinlassen` lesen
// unverändert weiter, wie bei `V.SITUATIONEN` nach dem Umzug der Situationen-Achse.
function nativeBloeckeDurchAbleitungErsetzen(html) {
  const startAnker = "const ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT = '";
  const start = html.indexOf(startAnker);
  if (start < 0) throw new Error('Anker ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT nicht gefunden');
  const endeBlock = "const AB_WERK_AUSZUG_BUNDLE_TEXTE = Object.freeze([\n"
    + '  ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT,\n'
    + '  ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT,\n'
    + ']);';
  const endeStart = html.indexOf(endeBlock, start);
  if (endeStart < 0) throw new Error('Anker AB_WERK_AUSZUG_BUNDLE_TEXTE-Block nicht gefunden — Wortlaut geändert?');
  const endeEnde = endeStart + endeBlock.length;

  const ersatz =
    "// U2-ADR-Nachtrag (Auftrag, 06.09.2026): die beiden Ab-Werk-Vorlagen liegen nicht mehr\n"
    + '// hartkodiert hier, sondern im eingebetteten Bündel (`tools/zugang-recht-vorlagen-ins-buendel-\n'
    + "// schreiben.js`) — abgeleitet, damit `_abWerkAuszuegeEinlassen` und die beiden Ab-Werk-Tests\n"
    + '// unveraendert bleiben, derselbe Vertrag wie `V.SITUATIONEN` nach der Situationen-Achse.\n'
    + "// `BUERGERMODUL_BUENDEL &&` bewusst geprueft — U2-ADR-310s Varianten-Proben laden Quelltext-\n"
    + '// Fassungen, die die Konstante selbst auf `null` setzen (kein-buendel-Weg); ohne den Schutz\n'
    + '// wirft der Ab-Werk-Weg dort, wo er vorher (ganz ohne diese Achse) nicht einmal existierte.\n'
    + 'const _ZUGANG_RECHT_LOGIK_MODULE = (typeof BUERGERMODUL_BUENDEL !== \'undefined\' && BUERGERMODUL_BUENDEL\n'
    + '  && Array.isArray(BUERGERMODUL_BUENDEL.logikModule)) ? BUERGERMODUL_BUENDEL.logikModule : [];\n'
    + 'const ERBSCHEIN_VORBEREITUNG_BUNDLE_TEXT_EINGEBAUT = JSON.stringify(\n'
    + "  _ZUGANG_RECHT_LOGIK_MODULE.find((m) => m && m.id === 'erbschein-vorbereitung'));\n"
    + 'const ZUGANG_RECHT_BERATUNGSHILFE_BUNDLE_TEXT_EINGEBAUT = JSON.stringify(\n'
    + "  _ZUGANG_RECHT_LOGIK_MODULE.find((m) => m && m.id === 'zugang-zum-recht-beratungshilfe'));\n"
    + '// Die ab Werk eingelassenen Auszuege — abgeleitet aus dem Bündel, kein zweiter Aufruf je Vorlage.\n'
    + 'const AB_WERK_AUSZUG_BUNDLE_TEXTE = Object.freeze(\n'
    + '  _ZUGANG_RECHT_LOGIK_MODULE.map((m) => JSON.stringify(m)));';

  return html.slice(0, start) + ersatz + html.slice(endeEnde);
}

async function main() {
  const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const logikModuleArray = logikModuleAlsArray(V);
  console.log('zugang-recht-vorlagen-ins-buendel-schreiben: ' + logikModuleArray.length + ' Vorlagen aus dem '
    + 'nativen Bestand gelesen: ' + logikModuleArray.map((m) => m.id).join(', '));

  if (logikModuleArray.length !== 2) {
    throw new Error('Erwartet genau 2 native Ab-Werk-Vorlagen (erbschein-vorbereitung, '
      + 'zugang-zum-recht-beratungshilfe), gefunden: ' + logikModuleArray.length);
  }

  if (NUR_PRUEFEN) {
    console.log('--check: nur gemessen, nichts geschrieben.');
    return;
  }

  let html = fs.readFileSync(HTML_PFAD, 'utf8');
  html = buendelMitLogikModuleSchreiben(html, logikModuleArray);
  html = nativeBloeckeDurchAbleitungErsetzen(html);
  fs.writeFileSync(HTML_PFAD, html);
  console.log('geschrieben: logikModule im Bündel, native Konstanten durch Ableitung ersetzt.');
}

if (require.main === module) require('./lib/buendel-migration-schranke.js').starten('zugang-recht-vorlagen-ins-buendel-schreiben', HTML_PFAD, () => main().catch((e) => { console.error(e); process.exitCode = 1; }));
module.exports = {
  logikModuleAlsArray, buendelMitLogikModuleSchreiben, nativeBloeckeDurchAbleitungErsetzen,
};
