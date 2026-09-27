'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-257 (Auftrag, 04.09.2026) — FORMAT_SCHREIBER, die Schreibseite
   ────────────────────────────────────────────────────────────────────────────
   BEFUND: `FORMAT_LESER` trug vier Leseformen, `formatModulZuExportKanal` endete
   fest auf `application/json` + `JSON.stringify`. Vier Leser, ein Schreiber —
   ein angedocktes Format-Modul konnte jedes der vier Formate LESEN und nur JSON
   SCHREIBEN. Das Gerüst wird vor v1 eingefroren; danach wäre die Ausgabeseite
   für immer JSON.

   DER TEUERSTE TEIL DIESER PRÜFUNG IST GRUPPE A, und sie ist der Grund, warum
   die Datei mit ihr anfängt: die Auflage lautet „rückwärtskompatibel ohne
   Ausnahme". Das wird hier NICHT gegen einen festgenagelten Erwartungswert
   gemessen (der wäre eine dritte Fassung derselben Wahrheit), sondern gegen den
   KERN VOM 4e3d7348 — dem Stand vor diesem Zug. Derselbe Weg wie in
   tests/docx-streichung-gegenprobe.test.js: zwei Kerne, dasselbe Depot,
   derselbe erzeugte Text, Byte für Byte.

   ZWEI SCHREIBER, NICHT VIER — und das ist eine Aussage, keine Auslassung:
   `csv@1` und `vcard-erste@1` haben keine Schreibseite, weil ihre Konventionen
   sich nicht UMKEHREN, sondern nur ERFINDEN liessen (Trennzeichen, Zeilenende,
   vCard-VERSION, das Pflichtfeld FN). Gruppe E hält fest, dass die Lücke im Code
   BENANNT ist und nicht bloss fehlt.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('./load-kern.js');

const VOR_DEM_SCHREIBER = '4e3d7348';   // der Stand, auf dem dieser Zweig aufsetzt

/* Ein Bestandsmodul im Wortsinn: KEIN `schreiber`-Schlüssel. Genau so sieht jedes heute
   gültige Ausgabe-Modul aus, und genau dieses Modul muss in beiden Kernen denselben Text
   erzeugen. Zwei Ziele mit Punkt (verschachtelt) und ein `alsListe` — die drei Formen, die
   `baueAusMapping` erzeugen kann, damit der Vergleich nicht nur den flachen Fall trifft. */
const BESTANDSMODUL = Object.freeze({
  modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'kammer-bestand', richtung: 'export',
  sektor: 'identity', label: 'Kammer Bestand', quelle: 'datensatz',
  zuordnung: [
    { feld: 'givenName', ziel: 'person.given_name' },
    { feld: 'familyName', ziel: 'person.family_name' },
    { feld: 'birthPlace', ziel: 'orte', alsListe: true },
  ],
});

/* Der Kern von VOR_DEM_SCHREIBER liegt vor dem Kennungs-Umbau und kennt nur die deutschen
   Kennungen (docs/umbau-englisch-vor-v1/kennung-mapping.json: identitaet.vorname → identity.givenName,
   identitaet.nachname → identity.familyName, identitaet.geburtsort → identity.birthPlace). Verglichen
   wird der erzeugte TEXT — die Zielnamen (person.given_name …) sind in beiden Fassungen gleich. */
const KENNUNGEN_HEUTE = Object.freeze({ sektor: 'identity', vorname: 'givenName', nachname: 'familyName', geburtsort: 'birthPlace' });
const KENNUNGEN_VOR_UMBAU = Object.freeze({ sektor: 'identitaet', vorname: 'vorname', nachname: 'nachname', geburtsort: 'geburtsort' });
function bestandsmodulFuer(k) {
  return Object.assign({}, BESTANDSMODUL, {
    sektor: k.sektor,
    zuordnung: [
      { feld: k.vorname, ziel: 'person.given_name' },
      { feld: k.nachname, ziel: 'person.family_name' },
      { feld: k.geburtsort, ziel: 'orte', alsListe: true },
    ],
  });
}

async function depotMitDaten(V, k = KENNUNGEN_HEUTE) {
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.betreteApp();
  V.sektorFeldSetzen(k.sektor, k.vorname, 'Ann & Bö');
  V.sektorFeldSetzen(k.sektor, k.nachname, '<Muster>');
  V.sektorFeldSetzen(k.sektor, k.geburtsort, 'Köln');
  return V;
}

function frisch() {
  const { V } = ladeKern();
  V.setData(V.leeresDepot());
  return V;
}

// ══ Gruppe A — Rückwärtskompatibilität, gemessen gegen den Kern von vorher ═══════════════

function kernVonCommit(commit) {
  const ziel = path.join(os.tmpdir(), 'vivodepot-vor-schreiber-' + process.pid + '.html');
  const inhalt = execFileSync('git', ['show', commit + ':vivodepot.html'],
    { cwd: path.join(__dirname, '..'), maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(ziel, inhalt);
  return ziel;
}
/* Beide Kerne frisch laden — der Cache muss dazwischen fallen, sonst misst der zweite Lauf
   den ersten. Wörtlich der Weg aus tests/docx-streichung-gegenprobe.test.js. */
function ladeMit(pfad) {
  const zuvor = process.env.KERN_HTML_PATH;
  if (pfad) process.env.KERN_HTML_PATH = pfad; else delete process.env.KERN_HTML_PATH;
  delete require.cache[require.resolve('./load-kern.js')];
  const { V } = require('./load-kern.js').ladeKern();
  if (zuvor === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = zuvor;
  return V;
}
async function bestandsAusgabe(V, k = KENNUNGEN_HEUTE) {
  await depotMitDaten(V, k);
  const kanal = V.formatModulZuExportKanal(bestandsmodulFuer(k));
  assert.ok(kanal, 'das Bestandsmodul muss in BEIDEN Kernen einen Ausgabe-Kanal ergeben');
  return { text: kanal.baue({}), mime: kanal.mime, endung: kanal.endung, id: kanal.id };
}

test('[U2-ADR-257·A] ein Bestandsmodul OHNE schreiber erzeugt byte-identisch denselben Text wie vor dem Zug', async () => {
  const alt = await bestandsAusgabe(ladeMit(kernVonCommit(VOR_DEM_SCHREIBER)), KENNUNGEN_VOR_UMBAU);
  const neu = await bestandsAusgabe(ladeMit(null));
  assert.equal(neu.text, alt.text, 'der erzeugte Text darf sich um kein Byte unterscheiden');
  assert.equal(neu.mime, alt.mime, 'mime folgt jetzt dem Schreiber — json@1 trägt denselben Wert wie die feste Zeile vorher');
  assert.equal(neu.endung, alt.endung);
  // Und die Aussage nicht nur als Gleichheit zweier Unbekannter: es IST der alte JSON-Text.
  assert.match(neu.text, /^\{\n  "datensatz": \{\n/, 'zwei Leerzeichen Einrückung, wie JSON.stringify(…, null, 2)');
  assert.ok(neu.text.includes('"given_name": "Ann & Bö"'), 'JSON escapt kaufmännisches Und nicht');
});

test('[U2-ADR-257·A] der Kern von vorher kennt den Schlüssel `schreiber` NICHT — sonst misst Gruppe A nichts', () => {
  const alt = ladeMit(kernVonCommit(VOR_DEM_SCHREIBER));
  assert.equal(alt.FORMAT_SCHREIBER, undefined, 'gäbe es die Tabelle schon, wäre der Vergleich oben leer');
  const neu = ladeMit(null);
  assert.ok(neu.FORMAT_SCHREIBER, 'und im heutigen Kern gibt es sie');
});

test('[U2-ADR-257·A] ohne `schreiber` steht im Kanal trotzdem eine Kennung — die Ersetzungsregel wohnt an EINER Stelle', () => {
  const V = frisch();
  const g = V.formatModulPruefen(BESTANDSMODUL);
  assert.equal(g.gueltig, true, 'Grund: ' + g.grund);
  assert.equal(g.kanal.schreiber, 'json@1');
  assert.equal(V.FORMAT_SCHREIBER_STANDARD, 'json@1');
});

// ══ Gruppe B — die Kennungstabelle, wörtlicher Spiegel von FORMAT_LESER ═══════════════════

test('[U2-ADR-257·B] die Schreiber tragen eine Version — dieselbe Form wie die Leser', () => {
  const V = frisch();
  const namen = Object.keys(V.FORMAT_SCHREIBER).sort();
  assert.deepEqual(namen, ['json@1', 'xml@1']);
  for (const n of namen) assert.match(n, /@\d+$/, n + ' trägt keine Version');
  for (const n of namen) {
    const e = V.FORMAT_SCHREIBER[n];
    assert.equal(typeof e.schreib, 'function', n + ' braucht eine Schreibfunktion');
    assert.equal(typeof e.mime, 'string', n + ' braucht ein mime');
    assert.equal(typeof e.endung, 'string', n + ' braucht eine endung');
    assert.ok(Array.isArray(e.fruehereKennungen), n + ' braucht die Rückweg-Liste, auch leer');
  }
});

test('[U2-ADR-257·B] jeder Schreiber-Name ist auch ein Leser-Name — kein zweiter Kennungsraum', () => {
  const V = frisch();
  for (const n of Object.keys(V.FORMAT_SCHREIBER)) {
    assert.ok(Object.prototype.hasOwnProperty.call(V.FORMAT_LESER, n),
      n + ' steht nicht in FORMAT_LESER — die beiden Tabellen sollen dieselben Formen benennen');
  }
});

test('[U2-ADR-257·B·Rot] aufgelöst wird EXAKT — kein Fallback auf den Stamm, keine erfundene Vorgeschichte', () => {
  const V = frisch();
  assert.equal(V.schreiberAufloesen('json@1'), V.FORMAT_SCHREIBER['json@1']);
  assert.equal(V.schreiberAufloesen('xml@1'), V.FORMAT_SCHREIBER['xml@1']);
  for (const k of ['json', 'xml', 'json@9', 'xml@2', 'csv@1', 'vcard-erste@1', 'quatsch', '', null, 42, 'constructor']) {
    assert.equal(V.schreiberAufloesen(k), null, JSON.stringify(k) + ' darf nichts auflösen');
  }
  /* `json` (unversioniert) ist hier ABSICHTLICH kein Rückweg, anders als beim Leser: es gab nie
     einen unversionierten `schreiber`-Namen, den ein Bürgerdepot mit sich trüge. Eine gefüllte
     `fruehereKennungen`-Liste gäbe eine Geschichte vor, die es nicht gibt. */
  assert.deepEqual(Array.from(V.FORMAT_SCHREIBER['json@1'].fruehereKennungen), []);
  assert.equal(V.schreiberKennungHeute('json@1'), 'json@1');
  assert.equal(V.schreiberKennungHeute('json'), null);
});

// ══ Gruppe C — Rot: eine unbekannte Kennung weist das Bundle zurück ══════════════════════

test('[U2-ADR-257·C·Rot] eine unbekannte schreiber-Kennung verwirft das Modul — wie bei leser', () => {
  const V = frisch();
  for (const k of ['json', 'quatsch@1', 'xml@9', 'csv@1', '', 42, { }]) {
    const g = V.formatModulPruefen(Object.assign({}, BESTANDSMODUL, { schreiber: k }));
    assert.equal(g.gueltig, false, JSON.stringify(k) + ' hätte abgewiesen werden müssen');
    assert.equal(g.grund, 'schreiber');
  }
});

test('[U2-ADR-257·C·Rot] am ECHTEN Einlassweg: ein Bundle mit unbekanntem Schreiber wird nicht angenommen', () => {
  const V = frisch();
  const d = V.leeresDepot();
  const schlecht = V.modulEinlassen(JSON.stringify(Object.assign({}, BESTANDSMODUL, { schreiber: 'quatsch@1' })), d);
  assert.equal(schlecht.angenommen, false, 'Grund war: ' + schlecht.grund);
  const gut = V.modulEinlassen(JSON.stringify(Object.assign({}, BESTANDSMODUL, { schreiber: 'json@1' })), d);
  assert.equal(gut.angenommen, true, 'Grund: ' + gut.grund);
});

test('[U2-ADR-257·C] `schreiber` ist in FORMAT_MODUL_SCHLUESSEL — sonst wäre er ein unbekannter Schlüssel', () => {
  const V = frisch();
  assert.ok(V.FORMAT_MODUL_SCHLUESSEL.indexOf('schreiber') >= 0);
  const g = V.formatModulPruefen(Object.assign({}, BESTANDSMODUL, { schreiber: 'json@1' }));
  assert.equal(g.verworfene.some(v => v.schluessel === 'schreiber'), false,
    'der Schlüssel darf nicht mehr als `unbekannt` in die Verwurf-Liste laufen');
});

test('[U2-ADR-257·C] ein `schreiber` am IMPORT-Modul bleibt zulässig und folgenlos — die Prüfung wird weiter, nicht enger', () => {
  const V = frisch();
  const importModul = {
    modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'kammer-rein', richtung: 'import',
    sektor: 'identity', label: 'Kammer rein', leser: 'json@1',
    schreiber: 'xml@1',                       // ohne `quelle` — bei richtung 'export' würde das abgewiesen
    zuordnung: [{ feld: 'givenName', ziel: 'given_name' }],
  };
  const g = V.formatModulPruefen(importModul);
  assert.equal(g.gueltig, true, 'Grund: ' + g.grund);
  assert.ok(V.formatModulZuImportKanal(importModul), 'und der Import-Kanal entsteht wie immer');
});

// ══ Gruppe D — xml@1: die Umkehrung der Lesekonvention ═══════════════════════════════════

const XML_GEMEINSAM = Object.freeze({
  modulTyp: 'format', moduleVersion: 1, sprache: 'de', sektor: 'identity',
  quelle: 'Document', quelleWurzelFallback: true,
  zuordnung: [
    { feld: 'givenName', ziel: 'Person.Vorname' },
    { feld: 'familyName', ziel: 'Person.Nachname' },
  ],
});
const XML_RAUS = Object.freeze(Object.assign({}, XML_GEMEINSAM,
  { format: 'kammer-xml-raus', richtung: 'export', label: 'Kammer XML raus', schreiber: 'xml@1' }));
const XML_REIN = Object.freeze(Object.assign({}, XML_GEMEINSAM,
  { format: 'kammer-xml-rein', richtung: 'import', label: 'Kammer XML rein', leser: 'xml@1' }));

test('[U2-ADR-257·D] mime und endung folgen dem Schreiber, nicht mehr fest JSON', async () => {
  const V = await depotMitDaten(ladeKern().V);
  const kanal = V.formatModulZuExportKanal(XML_RAUS);
  assert.equal(kanal.mime, 'application/xml');
  assert.equal(kanal.endung, 'xml');
  assert.match(V.exportDateiname(kanal), /\.xml$/, 'der Dateiname zieht die Endung nach');
});

test('[U2-ADR-257·D] der geschriebene Text ist XML — Deklaration, eine Wurzel aus `quelle`, Pfad als Verschachtelung', async () => {
  const V = await depotMitDaten(ladeKern().V);
  const text = V.formatModulZuExportKanal(XML_RAUS).baue({});
  assert.equal(text.slice(0, 39), '<?xml version="1.0" encoding="UTF-8"?>\n');
  assert.ok(text.includes('<Document><Person><Vorname>'), 'jede Pfadstufe ist eine Verschachtelungsstufe');
  assert.ok(text.endsWith('</Person></Document>'));
  assert.ok(text.includes('Ann &amp; B'), 'kaufmännisches Und wird maskiert');
  assert.ok(text.includes('&lt;Muster&gt;'), 'spitze Klammern werden maskiert');
  assert.equal(text.indexOf('xmlns'), -1, 'der Schreiber setzt KEIN xmlns — er würde damit über ein fremdes Schema behaupten');
  // Und kein Präfix: gemessen an den Element-NAMEN, nicht am ganzen Text (ein Feldwert dürfte
  // sehr wohl einen Doppelpunkt tragen).
  const namen = (text.slice(39).match(/<\/?([^\s/>]+)/g) || []).map(t => t.replace(/^<\/?/, ''));
  assert.ok(namen.length >= 6, 'die Probe muss überhaupt Elemente gesehen haben');
  for (const n of namen) assert.equal(n.indexOf(':'), -1, 'Elementname mit Präfix: ' + n);
});

test('[U2-ADR-257·D·Rundlauf] dasselbe Modul in beide Richtungen: was der Schreiber schreibt, liest der Leser zurück', async () => {
  const V = await depotMitDaten(ladeKern().V);
  const text = V.formatModulZuExportKanal(XML_RAUS).baue({});
  const zurueck = V.formatModulZuImportKanal(XML_REIN).parse(text);
  assert.ok(zurueck && Array.isArray(zurueck.felder), 'der eigene Text muss wieder lesbar sein');
  const alsPaare = {};
  for (const f of zurueck.felder) alsPaare[f.feldId] = f.wert;
  assert.equal(alsPaare.givenName, 'Ann & Bö', 'die Maskierung wird beim Lesen aufgelöst');
  assert.equal(alsPaare.familyName, '<Muster>');
});

test('[U2-ADR-257·D] die vier Regeln der Lesekonvention, von hinten: Array, Attribut, #text, Wurzel aus #name', () => {
  const V = frisch();
  const mit = V._objektAlsXmlDokument({ W: { a: ['x', 'y'], b: { '@t': 'q"1', '#text': 'inhalt' }, leer: [] } });
  assert.ok(mit.includes('<a>x</a><a>y</a>'), 'Wiederholung: ein Array schreibt dasselbe Element mehrfach');
  assert.ok(mit.includes('<b t="q&quot;1">inhalt</b>'), 'Attribut aus `@name`, Text aus `#text`');
  assert.equal(mit.indexOf('<leer'), -1, 'ein leeres Array schreibt gar nichts, nicht ein leeres Element');
  assert.ok(V._objektAlsXmlDokument({ '#name': 'Wurzel', kind: '1' }).endsWith('<Wurzel><kind>1</kind></Wurzel>'),
    '`#name` ist der Wurzelname — die wörtliche Umkehrung dessen, was der Leser an der Wurzel setzt');
});

test('[U2-ADR-257·D·Rot] ohne bestimmbare Wurzel entsteht kein Dokument — es wird keine erfunden', () => {
  const V = frisch();
  for (const o of [{ a: '1', b: '2' }, { a: 'nur-text' }, [], null, 'text', { '1ungueltig': { } }]) {
    assert.equal(V._objektAlsXmlDokument(o), null, JSON.stringify(o) + ' hat keine Wurzel');
  }
});

test('[U2-ADR-257·D·Rot] ein Ausgabe-Modul mit xml@1 OHNE quelle wird beim Andocken abgewiesen, nicht beim Klick', () => {
  const V = frisch();
  const ohneWurzel = Object.assign({}, XML_RAUS);
  delete ohneWurzel.quelle;
  const g = V.formatModulPruefen(ohneWurzel);
  assert.equal(g.gueltig, false);
  assert.equal(g.grund, 'schreiber-xml-ohne-wurzel');
  // Und derselbe Fall am echten Einlassweg — nicht nur an der reinen Funktion.
  const d = V.leeresDepot();
  assert.equal(V.modulEinlassen(JSON.stringify(ohneWurzel), d).angenommen, false);
});

test('[U2-ADR-257·D·Rot] Namen, die kein Parser liest, verwerfen das Modul — Wurzel wie Ziel', () => {
  const V = frisch();
  const wurzel = V.formatModulPruefen(Object.assign({}, XML_RAUS, { quelle: '1Document' }));
  assert.equal(wurzel.grund, 'schreiber-xml-wurzelname');
  const mitDoppelpunkt = V.formatModulPruefen(Object.assign({}, XML_RAUS, { quelle: 'ns:Document' }));
  assert.equal(mitDoppelpunkt.grund, 'schreiber-xml-wurzelname', 'kein Präfix: der Leser kennt nur lokale Namen');
  const ziel = V.formatModulPruefen(Object.assign({}, XML_RAUS,
    { zuordnung: [{ feld: 'givenName', ziel: 'Person.2Vorname' }] }));
  assert.equal(ziel.grund, 'schreiber-xml-zielname');
  /* `@attribut` und `#text` sind erlaubt — aber nur als LETZTE Stufe, genau wie der Leser den
     Baum aufbaut (ein Attribut hat keine Kinder). */
  assert.equal(V.formatModulPruefen(Object.assign({}, XML_RAUS,
    { zuordnung: [{ feld: 'givenName', ziel: 'Person.@art' }] })).gueltig, true);
  assert.equal(V.formatModulPruefen(Object.assign({}, XML_RAUS,
    { zuordnung: [{ feld: 'givenName', ziel: 'Person.@art.tief' }] })).grund, 'schreiber-xml-zielname');
});

test('[U2-ADR-257·D] json@1 stellt KEINE dieser Namensbedingungen — die Regel gehört dem Schreiber, nicht der Prüfung', () => {
  const V = frisch();
  const g = V.formatModulPruefen(Object.assign({}, XML_RAUS,
    { schreiber: 'json@1', quelle: undefined, zuordnung: [{ feld: 'givenName', ziel: '2beliebig' }] }));
  assert.equal(g.gueltig, true, 'Grund: ' + g.grund);
});

// ══ Gruppe E — die benannten Lücken ══════════════════════════════════════════════════════

test('[U2-ADR-257·E] jede Leseform hat entweder einen Schreiber oder eine BENANNTE Lücke — keine schweigt', () => {
  const V = frisch();
  for (const n of Object.keys(V.FORMAT_LESER)) {
    const hatSchreiber = Object.prototype.hasOwnProperty.call(V.FORMAT_SCHREIBER, n);
    const hatLuecke = Object.prototype.hasOwnProperty.call(V._FORMAT_SCHREIBER_LUECKEN, n);
    assert.ok(hatSchreiber !== hatLuecke,
      n + ': genau eines von beidem — ein Schreiber ODER eine begründete Lücke, nie beides und nie keines');
    if (hatLuecke) assert.ok(V._FORMAT_SCHREIBER_LUECKEN[n].length > 40,
      n + ': die Lücke braucht einen Grund, nicht nur einen Eintrag');
  }
});

// 17.09.2026: sd-jwt@1 kam als dritte Lücke dazu — der Digest je Offenlegung ist asynchron, die Schreib-Schnittstelle nicht.
test('[U2-ADR-257·E] csv@1, sd-jwt@1 und vcard-erste@1 sind die offenen — ein Modul, das sie zum Schreiben nennt, wird abgewiesen', () => {
  const V = frisch();
  assert.deepEqual(Object.keys(V._FORMAT_SCHREIBER_LUECKEN).sort(), ['csv@1', 'sd-jwt@1', 'vcard-erste@1']);
  for (const k of ['csv@1', 'sd-jwt@1', 'vcard-erste@1']) {
    const g = V.formatModulPruefen(Object.assign({}, BESTANDSMODUL, { schreiber: k }));
    assert.equal(g.gueltig, false, k + ' darf nicht als Schreiber durchgehen, solange die Konvention offen ist');
    assert.equal(g.grund, 'schreiber');
  }
});
