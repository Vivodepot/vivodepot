'use strict';
/* ════════════════════════════════════════════════════════════════════════
   feldregister-adressen.js — eine feste Adresse je Kennung, Lizenz, Begriffsschema
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-NNN (06.10.2026; Entscheidung der Produktverantwortung vom 03.10.2026: CC0 für das Eigene,
   Adresse `register.vivodepot.de/feld/<kennung>`, HTML für Menschen, JSON-LD/SKOS für Maschinen).

   DIE ADRESSE IST EINE EINBAHNSTRASSE. Wer sie einmal in eine Vorlage, ein Formularschema oder eine
   Abbildungstabelle schreibt, verlässt sich darauf, dass sie für immer dieselbe Angabe bezeichnet.
   Darum steht ihre Form an genau einer Stelle (ADRESS_BASIS) und wird nie aus Daten zusammengesetzt,
   die sich ändern dürfen (keine Fassung, kein Datum, keine Sprache in der Adresse).

   STATISCH, OHNE SKRIPT, OHNE ANNAHME ÜBER DEN SERVER. Je Kennung ein Ordner `feld/<kennung>/` mit
   `index.html` und `index.jsonld`. Ein Unterfeld `a.b/c` liegt als `feld/a.b/c/` — der Pfad IST die
   Kennung. Die Aushandlung nach `Accept` steht in `feld/.htaccess`, aber nur innerhalb von
   `<IfModule mod_rewrite.c>`: fehlt das Modul, liefert die Adresse HTML, und die Seite verweist per
   `<link rel="alternate">` auf das JSON-LD. Nichts bricht, wenn der Host weniger kann.

   EINBUCHSTABIGE PFADSEGMENTE SIND VERBOTEN (gemessen 06.10.2026): der Webspace von register.vivodepot.de
   und vivodepot.de leitet jede Adresse mit einem Pfadsegment aus genau einem Zeichen per 301 auf die
   Adresse OHNE dieses Segment um, auf jeder Tiefe (`/k/x` → `/x`, `/v919/k/x` → `/v919/x`,
   `/kk/x` 404). Eine Kennung `a.b/c` wäre unter ihrer Adresse nie erreichbar. `adressenPruefen` wirft.

   DIE SEITE TRÄGT KEINE FASSUNG. Sie nennt Kennung, Bereich, Status, Nachfolger und Beschriftungen —
   nichts, was sich mit jeder Kern-Fassung ändert. So bleibt eine Seite byte-gleich, solange sich die
   Kennung nicht ändert, und eine Auslieferung schreibt nur, was wirklich neu ist. Die Fassungen stehen
   in `feldregister.json` und unter `v<stand>/feldregister.json`, das die Auslieferung des Registers unveränderlich ablegt.
   ════════════════════════════════════════════════════════════════════════ */

const ADRESS_BASIS = 'https://register.vivodepot.de/feld/';
const ORDNER = 'feld';
const SEITE = 'index.html';
const JSONLD = 'index.jsonld';
const HTACCESS = '.htaccess';
const SCHEMA_JSONLD_DATEI = 'feldregister.jsonld';

/* CC0 für das Eigene (vdresearch-Bericht 03.10.2026, Entscheidung 03.10.2026). Fremde Codelisten
   (SNOMED, LOINC, ATC, ICD-10-GM) liegen in code-listen/ und gehen nicht in diese Datei. */
const LIZENZ = Object.freeze({
  spdx: 'CC0-1.0',
  url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  gilt_fuer: 'Kennungen, Beschriftungen, Status, Nachfolger und Adressen in dieser Datei',
  nicht_fuer: 'Codelisten Dritter; sie stehen nicht in dieser Datei',
});
const HERAUSGEBER = 'Vivodepot GmbH';
/* Ein Quellenhinweis, keine Lizenzbedingung (abgestimmt 06.10.2026): der Abgleich der Beschriftungen
   gegen die BMJ-Formulare fand nur Sach-Überschriften und Gesetzesangaben, keinen Fließtext. */
const QUELLENHINWEIS = 'Die Beschriftungen im Bereich advanceCare folgen den Gliederungen der Formulare des '
  + 'Bundesministeriums der Justiz (Patientenverfügung, Vorsorgevollmacht, Betreuungsverfügung).';

const SKOS_KONTEXT = Object.freeze({
  skos: 'http://www.w3.org/2004/02/skos/core#',
  dct: 'http://purl.org/dc/terms/',
  owl: 'http://www.w3.org/2002/07/owl#',
});

function adresse(kennung) { return ADRESS_BASIS + kennung; }

/** Wirft, wenn eine Kennung unter ihrer Adresse nicht erreichbar wäre. */
function adressenPruefen(felder) {
  for (const f of felder) {
    if (!/^[A-Za-z0-9._/-]+$/.test(f.kennung)) {
      throw new Error('feldregister-adressen: Kennung "' + f.kennung + '" enthält ein Zeichen, das in der Adresse '
        + 'kodiert werden müsste — eine Kennungs-Adresse wird nie kodiert.');
    }
    const kurz = f.kennung.split('/').find((s) => s.length < 2);
    if (kurz !== undefined) {
      throw new Error('feldregister-adressen: Kennung "' + f.kennung + '" hat das Pfadsegment "' + kurz + '" — '
        + 'der Webspace leitet einbuchstabige Segmente um (gemessen 06.10.2026), die Adresse wäre nie erreichbar.');
    }
  }
}

function htmlText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function traeger(kennung, kennungen) {
  const i = kennung.indexOf('/');
  if (i < 0) return null;
  const t = kennung.slice(0, i);
  return kennungen.has(t) ? t : null;
}

/** Ein Begriff als JSON-LD-Knoten (SKOS), ohne @context. */
function begriff(f, kennungen) {
  const k = {
    '@id': adresse(f.kennung),
    '@type': 'skos:Concept',
    'skos:notation': f.kennung,
    'skos:prefLabel': [{ '@value': f.label.de, '@language': 'de' }, { '@value': f.label.en, '@language': 'en' }],
    'skos:inScheme': { '@id': ADRESS_BASIS },
  };
  const t = traeger(f.kennung, kennungen);
  if (t) k['skos:broader'] = { '@id': adresse(t) };
  if (f.status !== 'permanent') k['owl:deprecated'] = true;
  if (f.nachfolger) k['dct:isReplacedBy'] = { '@id': adresse(f.nachfolger) };
  return k;
}

function begriffJsonld(f, kennungen) {
  return JSON.stringify({ '@context': SKOS_KONTEXT, ...begriff(f, kennungen), 'dct:license': { '@id': LIZENZ.url } }, null, 2) + '\n';
}

/** Das ganze Begriffsschema in einer Datei — dieselben Knoten wie je Kennung. */
function schemaJsonld(felder, fassung) {
  const kennungen = new Set(felder.map((f) => f.kennung));
  return JSON.stringify({
    '@context': SKOS_KONTEXT,
    '@graph': [
      { ...schemaKopf(), 'owl:versionInfo': fassung.kern + ' (' + fassung.datum + ')' },
      ...felder.map((f) => begriff(f, kennungen)),
    ],
  }, null, 2) + '\n';
}

function begriffSeite(f) {
  const z = [];
  z.push('<!doctype html>');
  z.push('<html lang="de">');
  z.push('<head>');
  z.push('<meta charset="utf-8">');
  z.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  z.push('<title>' + htmlText(f.kennung) + ' — Feldregister — Vivodepot</title>');
  z.push('<link rel="canonical" href="' + htmlText(adresse(f.kennung)) + '">');
  z.push('<link rel="alternate" type="application/ld+json" href="' + JSONLD + '">');
  z.push('<link rel="license" href="' + LIZENZ.url + '">');
  z.push('<style>');
  z.push('  :root { --salbei: #4F6539; --cream: #FAF8F3; --ink: #21261F; --ink2: #5A6154; --line: #DDD9CE; }');
  z.push('  body { margin: 0; background: var(--cream); color: var(--ink); line-height: 1.6;');
  z.push('         font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }');
  z.push('  main { max-width: 34rem; margin: 0 auto; padding: 4rem 1.5rem; }');
  z.push('  h1 { font-size: 1.1rem; font-weight: 600; color: var(--salbei); margin: 0 0 1.5rem; word-break: break-all; }');
  z.push('  code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }');
  z.push('  dl { margin: 0; } dt { font-size: 0.8rem; color: var(--ink2); margin-top: 1rem; } dd { margin: 0; }');
  z.push('  .lang-en { color: var(--ink2); }');
  z.push('  footer { border-top: 1px solid var(--line); margin-top: 3rem; padding-top: 1rem; font-size: 0.85rem; color: var(--ink2); }');
  z.push('  a { color: var(--salbei); }');
  z.push('</style>');
  z.push('</head>');
  z.push('<body>');
  z.push('<main>');
  z.push('  <h1><code>' + htmlText(f.kennung) + '</code></h1>');
  z.push('  <dl>');
  z.push('    <dt>Beschriftung</dt><dd>' + htmlText(f.label.de) + '</dd>');
  z.push('    <dt lang="en">Label</dt><dd class="lang-en" lang="en">' + htmlText(f.label.en) + '</dd>');
  z.push('    <dt>Bereich · Area</dt><dd><code>' + htmlText(f.bereich) + '</code></dd>');
  z.push('    <dt>Status</dt><dd>' + htmlText(f.status)
    + (f.nachfolger ? ' → <a href="' + htmlText(adresse(f.nachfolger)) + '"><code>' + htmlText(f.nachfolger) + '</code></a>' : '')
    + '</dd>');
  z.push('    <dt>Adresse · Address</dt><dd><code>' + htmlText(adresse(f.kennung)) + '</code></dd>');
  z.push('    <dt>Maschinenlesbar · Machine-readable</dt><dd><a href="' + JSONLD + '">JSON-LD (SKOS)</a></dd>');
  z.push('  </dl>');
  z.push('  <footer>');
  z.push('    <p>Eine Kennung bezeichnet dauerhaft dieselbe Angabe. Freigegeben unter');
  z.push('    <a href="' + LIZENZ.url + '">CC0 1.0</a>.');
  z.push('    <span class="lang-en" lang="en">An identifier always denotes the same item. Dedicated to the public domain under CC0 1.0.</span></p>');
  z.push('    <p><a href="/">Feldregister</a> · ' + HERAUSGEBER + '</p>');
  z.push('  </footer>');
  z.push('</main>');
  z.push('</body>');
  z.push('</html>');
  return z.join('\n') + '\n';
}

/* Inhaltsaushandlung: nur, wenn mod_rewrite da ist. DirectoryIndex und AddType sind Kern bzw. mod_mime. */
const HTACCESS_INHALT = [
  '# ERZEUGT von tools/feldregister-bauen.js (tools/lib/feldregister-adressen.js). Nicht von Hand bearbeiten.',
  'DirectoryIndex index.html',
  'AddType application/ld+json .jsonld',
  '<IfModule mod_rewrite.c>',
  '  RewriteEngine On',
  '  RewriteCond %{HTTP_ACCEPT} application/(ld\\+)?json',
  '  RewriteCond %{REQUEST_FILENAME} -d',
  '  RewriteRule ^(.+?)/?$ $1/index.jsonld [L]',
  '</IfModule>',
  '<IfModule mod_headers.c>',
  '  Header append Vary Accept',
  '</IfModule>',
  '',
].join('\n');

/* Die Adresse des Begriffsschemas selbst (`feld/`) löst ebenfalls auf: eine kurze Seite, die auf das Register zeigt,
   und das Schema als JSON-LD — ohne Fassungsangabe, damit auch diese beiden Dateien byte-gleich bleiben. */
function schemaKopf() {
  return {
    '@id': ADRESS_BASIS,
    '@type': 'skos:ConceptScheme',
    'dct:title': [{ '@value': 'Feldregister', '@language': 'de' }, { '@value': 'Field register', '@language': 'en' }],
    'dct:publisher': HERAUSGEBER,
    'dct:license': { '@id': LIZENZ.url },
  };
}
function schemaSeite() {
  return ['<!doctype html>', '<html lang="de">', '<head>', '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Feldregister — Vivodepot</title>',
    '<link rel="canonical" href="' + ADRESS_BASIS + '">',
    '<link rel="alternate" type="application/ld+json" href="/' + SCHEMA_JSONLD_DATEI + '">',
    '</head>', '<body>',
    '<p>Unter dieser Adresse liegt je Kennung des <a href="/">Feldregisters</a> eine eigene Seite: <code>'
      + ADRESS_BASIS + '&lt;kennung&gt;</code>. Das ganze Verzeichnis: <a href="/' + SCHEMA_JSONLD_DATEI + '">'
      + SCHEMA_JSONLD_DATEI + '</a>.</p>',
    '<p lang="en">Every identifier of the <a href="/">field register</a> has its own page under this address.</p>',
    '</body>', '</html>', ''].join('\n');
}

/** Alle Dateien unter feld/, als [relativer Pfad, Inhalt] — sortiert. */
function adressDateien(felder) {
  adressenPruefen(felder);
  const kennungen = new Set(felder.map((f) => f.kennung));
  const aus = [
    [ORDNER + '/' + HTACCESS, HTACCESS_INHALT],
    [ORDNER + '/' + SEITE, schemaSeite()],
    [ORDNER + '/' + JSONLD, JSON.stringify({ '@context': SKOS_KONTEXT, ...schemaKopf() }, null, 2) + '\n'],
  ];
  for (const f of felder) {
    aus.push([ORDNER + '/' + f.kennung + '/' + SEITE, begriffSeite(f)]);
    aus.push([ORDNER + '/' + f.kennung + '/' + JSONLD, begriffJsonld(f, kennungen)]);
  }
  return aus.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

module.exports = {
  ADRESS_BASIS, ORDNER, SEITE, JSONLD, HTACCESS, HTACCESS_INHALT, SCHEMA_JSONLD_DATEI,
  LIZENZ, HERAUSGEBER, QUELLENHINWEIS, SKOS_KONTEXT,
  adresse, adressenPruefen, schemaKopf, schemaSeite, begriff, begriffJsonld, schemaJsonld, begriffSeite, adressDateien,
};
