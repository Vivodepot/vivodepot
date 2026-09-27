#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   build-pdf-marke-schrift-einbetten.js — EINE beliebige Marken-Schrift als
   jsPDF-Font offline eingebettet (Marke-Achse-Plan §2b, 14.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Verallgemeinerung von `tools/build-pdf-inter-einbetten.js`: dort war „Inter"
   ein Literal, hier ist der Font ein Parameter. Das Muster selbst (Base64
   zwischen Markern, ein `@vd-lib`-Skript-Block, Registrierung über jsPDFs
   eigenes `addFonts`-Ereignis) ist UNVERÄNDERT — U2-ADR-097 §1 zieht die
   eigener-Code/vendort-Grenze über die `@vd-lib`-Marker, nicht über den Namen.

   MEHRERE BLÖCKE GLEICHZEITIG, Inter bleibt IMMER drin: Vivodepots eigener
   Inter-Block (`tools/build-pdf-inter-einbetten.js`, Marker `PDF-INTER-B64:*`,
   `id="inter_pdf_font_VivodepotInline"`) wird von diesem Werkzeug NIE
   angefasst — er ist das native Ab-Werk-Gerüst, nicht ein Partner-Font. Ein
   Partner-Font kommt ZUSÄTZLICH dazu, ersetzt nichts: dieses Werkzeug schreibt
   ausschließlich in den additiven Behälter `VD-PDF-PARTNER-FONTS:BEGIN/END`
   (liegt direkt nach dem Inter-Block, vor den INLINE-BIBLIOTHEKEN), einen
   eigenen, mit `--slug` benannten Unterblock je Font — mehrere Slugs koexistieren
   nebeneinander im selben Behälter, jeder mit eigenen Markern.

   NAME-TABLE-FEHLER FEST EINGEBAUT, NICHT ALS DOKU DANEBEN (Marke-Achse-Plan
   §2b, „derselbe Fehler wie heute mit --name-IDs='' droht bei jeder neuen
   Schrift neu"): dieses Werkzeug schneidet selbst nichts zu (das bleibt ein
   Python/fontTools-Rezept, s. `build-pdf-inter-einbetten.js` für das Vorbild) —
   es PRÜFT nur, dass die übergebene Datei eine echte TrueType-Signatur trägt
   (0x00010000) und mehr als 1 KB groß ist, sonst bricht der Lauf. Eine mit
   `--name-IDs=''` leergeschnittene Datei besteht diese Prüfung zwar noch (die
   Signatur bleibt), aber JEDE künftige Zuschnitt-Anleitung, die dieses
   Werkzeug referenziert, muss denselben Hinweis wie dort tragen: KEIN
   `--name-IDs=''`, fontTools' Default (nameIDs 0-6) reicht jsPDFs eigenem
   TTF-Parser.

   BYTE-VERIFIKATION (Identity-H/CID, Marke-Achse-Plan §3): dieses Werkzeug
   automatisiert sie NICHT (dieselbe Grenze wie beim fontTools-Zuschnitt selbst
   — ein echter jsPDF-Renderlauf braucht einen echten Browser, s.
   `tests/e2e/u2-adr-263-pdf-schriftdeckung.spec.js` für die bestehende
   Methodik). Sie ist VOR der ersten Auslieferung eines neuen Partner-Fonts
   einmal von Hand gegen den frisch eingebetteten Block zu fahren — derselbe
   Rezept-Charakter wie der fontTools-Zuschnitt.

   Aufruf:
     node tools/build-pdf-marke-schrift-einbetten.js \
       --slug <kurzname> --familie "<Anzeigename>" \
       --regular <pfad.ttf> [--bold <pfad.ttf>] [--italic <pfad.ttf>] \
       --version <fassung> --lizenz <lizenzname> --spdx <spdx-kennung> \
       --hinweis "<ein Satz Herkunft/Zuschnitt>" [--ziel <html-datei>] [--check]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN_PFAD_STANDARD = path.join(REPO, 'vivodepot.html');
const BEHAELTER_BEGIN = '<!-- VD-PDF-PARTNER-FONTS:BEGIN -->';
const BEHAELTER_END = '<!-- VD-PDF-PARTNER-FONTS:END -->';
const VENDORT_ZUSAETZLICH_BEGIN = '/* AB_WERK_PDF_SCHRIFTEN_PRODUKT:BEGIN */';
const VENDORT_ZUSAETZLICH_END = '/* AB_WERK_PDF_SCHRIFTEN_PRODUKT:END */';

function slugPruefen(slug) {
  if (typeof slug !== 'string' || !/^[a-z][a-z0-9]*$/.test(slug)) {
    throw new Error('--slug muss klein, ASCII, mit Buchstabe beginnend sein (kollidiert sonst mit "inter" oder erzeugt keine gültige Kennung): "' + slug + '"');
  }
  if (slug === 'inter') throw new Error('--slug "inter" ist Vivodepots eigener, nativer Block — dieses Werkzeug fasst ihn nie an, s. tools/build-pdf-inter-einbetten.js');
}

function grossschreiben(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function ttfSignaturPruefen(pfad) {
  const buf = fs.readFileSync(pfad);
  if (buf.length < 1024) throw new Error(pfad + ' ist zu klein (' + buf.length + ' Byte) für einen echten Font-Schnitt.');
  if (buf[0] !== 0x00 || buf[1] !== 0x01 || buf[2] !== 0x00 || buf[3] !== 0x00) {
    throw new Error(pfad + ' trägt nicht die TrueType-Signatur (0x00010000) — kein gültiger Font. '
      + 'Falls frisch mit fontTools geschnitten: --name-IDs=\'\' NICHT verwenden (leert die name-Tabelle, '
      + 'an der jsPDFs eigener Parser bricht — s. Kopf-Kommentar).');
  }
  return buf;
}

/* Baut EINEN vollständigen Vendor-Block (Kommentar + <script>) für einen Font.
   Reiner Textbauer, kein Dateizugriff auf den Kern — main() liest/schreibt. */
function blockBauen(opts) {
  slugPruefen(opts.slug);
  if (!opts.familie || typeof opts.familie !== 'string') throw new Error('--familie ist Pflicht (Name, unter dem jsPDF die Schrift registriert).');
  if (!opts.regularPfad) throw new Error('--regular ist Pflicht — mindestens EIN Schnitt nötig.');
  const SLUG_UPPER = opts.slug.toUpperCase();

  const stilQuellen = [
    ['regular', 'normal', opts.regularPfad],
    ['bold', 'bold', opts.boldPfad],
    ['italic', 'italic', opts.italicPfad],
  ].filter(([, , pfad]) => !!pfad);

  const b64Zeilen = [];
  const vfsZeilen = [];
  const groessen = [];
  for (const [schluessel, stil, pfad] of stilQuellen) {
    const buf = ttfSignaturPruefen(pfad);
    groessen.push([pfad, buf.length]);
    const konstName = '_PDF_' + SLUG_UPPER + '_' + schluessel.toUpperCase() + '_B64';
    b64Zeilen.push("const " + konstName + " = '" + buf.toString('base64') + "';");
    const dateiName = grossschreiben(opts.slug) + '-' + grossschreiben(schluessel) + '.ttf';
    vfsZeilen.push("    this.addFileToVFS('" + dateiName + "', " + konstName + ");");
    vfsZeilen.push("    this.addFont('" + dateiName + "', '" + opts.familie + "', '" + stil + "');");
  }

  const BEGIN = '/* PDF-' + SLUG_UPPER + '-B64:BEGIN */';
  const END = '/* PDF-' + SLUG_UPPER + '-B64:END */';
  const scriptId = opts.slug + '_pdf_font_VivodepotInline';
  const registrierFn = 'vd' + grossschreiben(opts.slug) + 'FontsRegistrieren';

  const kommentar = '<!-- @vd-lib name="' + opts.slug + '-pdf-font" version="' + (opts.version || '') + '" '
    + 'license="' + (opts.lizenz || '') + '" spdx="' + (opts.spdx || '') + '" status="inline"\n'
    + '     ' + (opts.hinweis || '') + '\n'
    + '     Nach demselben Muster vendort wie der native Inter-Block (U2-ADR-097-Nachtrag,\n'
    + '     Marke-Achse-Plan §2b) — ein schmales, generiertes Modul, das sich über jsPDFs\n'
    + '     eigenen `addFonts`-Event selbst registriert. KEIN eigener Code ruft\n'
    + '     addFileToVFS/addFont auf — nur dieser vendorte Block.\n'
    + '     Rezept/Quelle: tools/build-pdf-marke-schrift-einbetten.js.\n'
    + '     Lizenz-Volltext: THIRD_PARTY_LICENSES, SBOM-Eintrag: vivodepot.sbom.cdx.json. -->';

  const skript = '<script id="' + scriptId + '">\n'
    + BEGIN + '\n' + b64Zeilen.join('\n') + '\n' + END + '\n'
    + '(function (jsPDFAPI) {\n'
    + '  "use strict";\n'
    + '  // Registriert bei JEDER neuen jsPDF()-Instanz automatisch — kein Aufruf aus eigenem Code nötig.\n'
    + '  var ' + registrierFn + ' = function () {\n'
    + vfsZeilen.join('\n') + '\n'
    + '  };\n'
    + "  jsPDFAPI.events.push(['addFonts', " + registrierFn + ']);\n'
    + '})(window.jspdf.jsPDF.API);\n'
    + '</script>';

  return { text: kommentar + '\n' + skript, groessen, stile: stilQuellen.map(([, stil]) => stil) };
}

function argument(name, argv) {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/* Setzt/aktualisiert EINEN Slug-Block additiv im VD-PDF-PARTNER-FONTS-Behälter einer HTML-Datei
   — die eigentliche Schreiblogik, aus main() gezogen, damit `tools/produkt-konfektionieren.js`
   (Marke-Achse-Plan §6 Schritt 5) sie direkt aufrufen kann, ohne einen Kindprozess zu starten.
   Wirft bei fehlendem Behälter oder Pflichtfeldern — kein stilles Nichtstun. */
function fontInDateiEinbetten(zielPfad, opts) {
  const { text: neuerBlock, groessen } = blockBauen(opts);
  const html = fs.readFileSync(zielPfad, 'utf8');
  const behaelterAnfang = html.indexOf(BEHAELTER_BEGIN);
  const behaelterEnde = html.indexOf(BEHAELTER_END);
  if (behaelterAnfang < 0 || behaelterEnde < behaelterAnfang) {
    throw new Error('Behälter ' + BEHAELTER_BEGIN + ' / ' + BEHAELTER_END + ' fehlt in ' + zielPfad + ' — dieses Werkzeug schreibt nur additiv hinein, legt ihn nicht selbst an.');
  }
  const behaelterInhalt = html.slice(behaelterAnfang + BEHAELTER_BEGIN.length, behaelterEnde);

  const slugBegin = '<!-- VD-PDF-FONT:' + opts.slug + ':BEGIN -->';
  const slugEnd = '<!-- VD-PDF-FONT:' + opts.slug + ':END -->';
  const neuerSlugBlock = slugBegin + '\n' + neuerBlock + '\n' + slugEnd;

  const slugAnfang = behaelterInhalt.indexOf(slugBegin);
  const slugEndeIdx = behaelterInhalt.indexOf(slugEnd);
  let neuerBehaelterInhalt;
  let aenderung;
  if (slugAnfang >= 0 && slugEndeIdx > slugAnfang) {
    const vorher = behaelterInhalt.slice(slugAnfang, slugEndeIdx + slugEnd.length);
    if (vorher === neuerSlugBlock) return { geaendert: false, aenderung: 'bereits aktuell', groessen };
    neuerBehaelterInhalt = behaelterInhalt.slice(0, slugAnfang) + neuerSlugBlock + behaelterInhalt.slice(slugEndeIdx + slugEnd.length);
    aenderung = 'aktualisiert';
  } else {
    neuerBehaelterInhalt = behaelterInhalt + (behaelterInhalt.trim() ? '\n' : '') + neuerSlugBlock + '\n';
    aenderung = 'neu eingesetzt';
  }

  const neu = html.slice(0, behaelterAnfang + BEHAELTER_BEGIN.length) + neuerBehaelterInhalt + html.slice(behaelterEnde);
  fs.writeFileSync(zielPfad, neu, 'utf8');
  return { geaendert: true, aenderung, groessen };
}

/* Trägt `familie` additiv in `_PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH` ein (Marke-Achse-Plan §6
   Schritt 5) — der zweite, nötige Schritt neben `fontInDateiEinbetten`: der Vendor-Block allein
   macht jsPDF eine Schrift bekannt, aber `_markeSchriftPdf()` gibt einen Namen erst zurück, wenn
   er hier steht. Zwei getrennte Funktionen für zwei getrennte Dinge (Bytes vs. Vertrauensliste),
   kein gemeinsamer Aufruf — ein Aufrufer könnte sonst nicht das eine ohne das andere tun wollen. */
function familieAlsVendortRegistrieren(zielPfad, familie) {
  if (typeof familie !== 'string' || !familie.trim()) throw new Error('familie ist Pflicht.');
  if (/['\\]/.test(familie)) throw new Error('familie darf kein Anführungszeichen/Backslash tragen: ' + familie);
  const html = fs.readFileSync(zielPfad, 'utf8');
  const anfang = html.indexOf(VENDORT_ZUSAETZLICH_BEGIN);
  const ende = html.indexOf(VENDORT_ZUSAETZLICH_END);
  if (anfang < 0 || ende < anfang) throw new Error('AB_WERK_PDF_SCHRIFTEN_PRODUKT-Marker fehlt in ' + zielPfad);
  const innenStart = anfang + VENDORT_ZUSAETZLICH_BEGIN.length;
  const abschnitt = html.slice(innenStart, ende);
  const m = abschnitt.match(/const _PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH = Object\.freeze\(\[([^\]]*)\]\);/);
  if (!m) throw new Error('_PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH-Zeile nicht zwischen den Markern gefunden — die Region hat sich verschoben.');
  const bestehend = m[1].trim() ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')) : [];
  if (bestehend.indexOf(familie) >= 0) return { geaendert: false };
  const neu = [...bestehend, familie];
  const neueZeile = "const _PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH = Object.freeze([" + neu.map((f) => "'" + f + "'").join(', ') + "]);";
  const neuerAbschnitt = abschnitt.replace(m[0], neueZeile);
  fs.writeFileSync(zielPfad, html.slice(0, innenStart) + neuerAbschnitt + html.slice(ende), 'utf8');
  return { geaendert: true, schriften: neu };
}

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const opts = {
    slug: argument('slug', argv),
    familie: argument('familie', argv),
    regularPfad: argument('regular', argv),
    boldPfad: argument('bold', argv),
    italicPfad: argument('italic', argv),
    version: argument('version', argv),
    lizenz: argument('lizenz', argv),
    spdx: argument('spdx', argv),
    hinweis: argument('hinweis', argv),
  };
  const zielPfad = argument('ziel', argv) || KERN_PFAD_STANDARD;

  if (!opts.slug || !opts.familie || !opts.regularPfad) {
    console.error('Pflicht: --slug <name> --familie "<Anzeigename>" --regular <pfad.ttf> [--bold …] [--italic …] --version … --lizenz … --spdx … --hinweis "…" [--ziel <html>] [--check]');
    process.exit(1);
  }

  if (check) {
    const { text: neuerBlock } = blockBauen(opts);
    const html = fs.readFileSync(zielPfad, 'utf8');
    const slugBegin = '<!-- VD-PDF-FONT:' + opts.slug + ':BEGIN -->';
    const slugEnd = '<!-- VD-PDF-FONT:' + opts.slug + ':END -->';
    const erwartet = slugBegin + '\n' + neuerBlock + '\n' + slugEnd;
    if (html.includes(erwartet)) { console.log('build-pdf-marke-schrift-einbetten --check [' + opts.slug + ']: kein Drift.'); return; }
    console.error('build-pdf-marke-schrift-einbetten --check [' + opts.slug + ']: DRIFT — node tools/build-pdf-marke-schrift-einbetten.js mit denselben Argumenten erneut ausführen.');
    process.exit(1);
  }

  const { aenderung, groessen } = fontInDateiEinbetten(zielPfad, opts);
  const groessenText = groessen.map(([p, n]) => path.basename(p) + ' ' + n + ' Byte').join(', ');
  console.log('build-pdf-marke-schrift-einbetten [' + opts.slug + ']: ' + aenderung + ' — ' + groessenText + ' (roh).');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('build-pdf-marke-schrift-einbetten: ' + e.message); process.exit(1); }
}
module.exports = {
  blockBauen, fontInDateiEinbetten, familieAlsVendortRegistrieren, ttfSignaturPruefen, slugPruefen,
  BEHAELTER_BEGIN, BEHAELTER_END, VENDORT_ZUSAETZLICH_BEGIN, VENDORT_ZUSAETZLICH_END,
};
