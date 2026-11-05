'use strict';
/* ════════════════════════════════════════════════════════════════════════
   PDF-Anhang-Leser — `pdfAnhaengeLesen` in Kern und Lese-App
   ────────────────────────────────────────────────────────────────────────
   Das Gegenstück zu `_pdfAnhangEinbetten` (Kern). Beide Apps sollen aus einer PDF dieselben eingebetteten Dateien ziehen, bevor
   der bestehende Öffnen-Weg läuft. Gehalten wird:
   · der PDF-ANHANG-LESER-BLOCK steht in vivodepot.html und vivodepot-lesen.html genau einmal und zeichengleich (Muster:
     tests/stellenkennung-spiegel.test.js); er läuft für sich allein, ohne Kern und ohne Lese-App drumherum;
   · Rundlauf: was der Kern mit `pdfDatenfassungEinbetten` / `_pdfAnhangEinbetten` einbettet, liest der Leser byte-gleich zurück,
     über den Kern-Lader und über den Lese-App-Lader;
   · auch eine fremde Bauart: /FlateDecode, Namensbaum mit /Kids, Dateibeschreibung in einem Objektstrom, /Filespec ohne /Type;
   · fail closed: Fremd-PDF ohne Anhang ergibt eine leere Liste ohne Grund; keine PDF, verdorbene oder abgeschnittene PDF und
     verschlüsselte PDF ergeben eine leere Liste mit Grund; nie ein Wurf;
   · Grenzen: ein Anhang über der Größengrenze und ein Strom, der sich beim Entpacken über die Grenze bläht, werden abgewiesen;
     mehr als die Höchstzahl Anhänge ergibt eine leere Liste; Grenzen lassen sich nur senken; die Größengrenze trägt die harte
     Gesamt-Obergrenze des Depots mal Umschlag-Faktor;
   · kein Krypto-Aufruf, kein Netz, kein eval im Block.
   ROT-BEWEIS: eine Fassung des Blocks ohne die Größengrenze nimmt den übergroßen Anhang und den aufgeblähten Strom an.
   ROT-BEWEIS (Restbudget, 25.10.2026): mit der vollen Grenze je Anhang statt des Rests der Summe wird ein zweiter Anhang über die
   Summengrenze hinaus entpackt, bevor er abgewiesen wird — gemessen mit einer mitzählenden Entpackung.
   Echtes jsPDF läuft nur im Browser; das doc hier bildet jsPDFs Ereignis-Schnittstelle nach (Muster:
   tests/vereinbarung-bedingung-reist-mit.test.js) und wird zu einer vollständigen PDF mit Katalog und trailer ergänzt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const WURZEL = path.join(__dirname, '..');
const ANFANG = '/* ══ PDF-ANHANG-LESER-BLOCK';
const ENDE = '/* ══ ENDE PDF-ANHANG-LESER-BLOCK ══ */';
const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html'];
const GRENZ_ZEILE = 'function _pdfAnhangZuGross(n, max) { return n > max; }';

function block(text) {
  const a = text.indexOf(ANFANG), e = text.indexOf(ENDE);
  if (a < 0 || e < a || text.indexOf(ANFANG, a + 1) >= 0) return null;
  return text.slice(a, e + ENDE.length);
}
function ausfuehren(quelle) {
  const kontext = { TextDecoder, ReadableStream, DecompressionStream };
  vm.createContext(kontext);
  vm.runInContext(quelle + '\n;globalThis.__PA__ = { pdfAnhaengeLesen, PDF_ANHANG_MAX_BYTES, PDF_ANHANG_HOECHSTZAHL, PDF_EINGANG_MAX_BYTES, _pdfAnhangGrenzen };', kontext);
  return kontext.__PA__;
}
const lesen = () => DATEIEN.map((d) => fs.readFileSync(path.join(WURZEL, d), 'utf8'));
const alsBuffer = (u8) => Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength);

// Ein doc, das jsPDFs Ereignis-Schnittstelle nachbildet und die Ausgabe als Zeilen sammelt.
function attrappenDoc() {
  const abos = {};
  let naechsteId = 10;
  const zeilen = [];
  return {
    zeilen,
    internal: {
      events: { subscribe: (name, fn) => { (abos[name] = abos[name] || []).push(fn); } },
      newObject: () => { const id = naechsteId++; zeilen.push(id + ' 0 obj'); return id; },
      out: (z) => zeilen.push(z),
    },
    ausloesen: (name) => (abos[name] || []).forEach((fn) => fn()),
  };
}
// Ergänzt die Ausgabe zu einer vollständigen PDF: Kopf, Seitenbaum, die Anhang-Objekte, Katalog (mit dem, was putCatalog schreibt), trailer.
function kernPdf(V, anhaenge) {
  const doc = attrappenDoc();
  for (const a of anhaenge) {
    if (a.datenfassung) V.pdfDatenfassungEinbetten(doc, a.datenfassung, a.dateiname);
    else V._pdfAnhangEinbetten(doc, a.inhalt, a.dateiname, a.beziehung);
  }
  doc.zeilen.push('%PDF-1.7', '2 0 obj', '<< /Type /Pages /Kids [] /Count 0 >>', 'endobj');
  const kopf = doc.zeilen.splice(0);
  doc.ausloesen('putAdditionalObjects');
  const objekte = doc.zeilen.splice(0);
  doc.ausloesen('putCatalog');
  const katalog = doc.zeilen.splice(0);
  const text = [...kopf, ...objekte, '1 0 obj', '<<', '/Type /Catalog', '/Pages 2 0 R', ...katalog, '>>', 'endobj',
    'trailer', '<< /Size 40 /Root 1 0 R >>', 'startxref', '0', '%%EOF', ''].join('\n');
  return Buffer.from(text, 'latin1');
}
// Eine PDF aus Teilen (Strings latin1 oder Buffer), für fremde Bauarten.
const pdfAus = (...teile) => Buffer.concat(teile.map((t) => (Buffer.isBuffer(t) ? t : Buffer.from(t, 'latin1'))));
function stromObjekt(nr, kopfZusatz, daten) {
  return pdfAus(nr + ' 0 obj\n<< ' + kopfZusatz + ' /Length ' + daten.length + ' >>\nstream\r\n', daten, '\r\nendstream\nendobj\n');
}

const DATENFASSUNG = { art: 'probe', felder: [{ kennung: 'ort', wert: 'Köln, Straße 1 — geprüft' }] };
// Text wie eine Depot-Datei (Kennung + Versionsbyte 0x01 + JSON); der Inhalt ist erfunden.
const DEPOT_TEXT = 'VIVODEPOT\u0001' + JSON.stringify({ kryptoVersion: 4, probe: 'äöü ß €', einheiten: ['x', 'y'] });

async function rundlaufPruefen(lies, V) {
  const pdf = kernPdf(V, [
    { datenfassung: DATENFASSUNG, dateiname: 'Vivodepot_Auszug.json' },
    { inhalt: DEPOT_TEXT, dateiname: 'Mein-Vivodepot_2026-10-18.vivodepot', beziehung: 'Source' },
  ]);
  const liste = await lies(pdf);
  assert.equal(liste.grund, null, 'alles gelesen');
  assert.equal(liste.length, 2);
  assert.equal(liste[0].dateiname, 'Vivodepot_Auszug.json');
  assert.equal(liste[0].subtype, 'application/json');
  assert.equal(liste[0].beziehung, 'Data');
  assert.deepEqual(JSON.parse(alsBuffer(liste[0].bytes).toString('utf8')), JSON.parse(JSON.stringify(DATENFASSUNG)));
  assert.equal(liste[1].dateiname, 'Mein-Vivodepot_2026-10-18.vivodepot');
  assert.equal(liste[1].beziehung, 'Source');
  assert.ok(alsBuffer(liste[1].bytes).equals(Buffer.from(DEPOT_TEXT, 'utf8')), 'byte-gleich zum eingebetteten Inhalt');
}

test('[Spiegel] der Block steht in Kern und Lese-App genau einmal und zeichengleich', () => {
  const b = lesen().map(block);
  b.forEach((x, i) => assert.ok(x, DATEIEN[i] + ': Block fehlt oder steht mehrfach'));
  assert.equal(b[1], b[0], 'die Kopien sind nicht zeichengleich');
});

test('[Rundlauf] was der Kern einbettet, liest der Block byte-gleich zurück', async () => {
  const { V } = ladeKern();
  const pa = ausfuehren(block(lesen()[0]));
  await rundlaufPruefen((b) => pa.pdfAnhaengeLesen(b), V);
});

test('[Rundlauf] über den Kern-Lader und über den Lese-App-Lader dasselbe Ergebnis', async () => {
  const { V: K } = ladeKern();
  const { V: L } = ladeLesen();
  assert.equal(typeof K.pdfAnhaengeLesen, 'function', 'Kern exportiert den Leser für Proben');
  assert.equal(typeof L.pdfAnhaengeLesen, 'function', 'Lese-App exportiert den Leser für Proben');
  await rundlaufPruefen((b) => K.pdfAnhaengeLesen(b), K);
  await rundlaufPruefen((b) => L.pdfAnhaengeLesen(b), K);
  assert.equal(K.PDF_ANHANG_MAX_BYTES, L.PDF_ANHANG_MAX_BYTES);
});

test('[Fremde Bauart] /FlateDecode, Namensbaum mit /Kids, /Filespec ohne /Type und Dateibeschreibung im Objektstrom', async () => {
  const pa = ausfuehren(block(lesen()[1]));
  const inhaltA = Buffer.from(DEPOT_TEXT.repeat(50), 'utf8');
  const inhaltB = Buffer.from('zweiter Anhang, ungepackt', 'utf8');
  // Objektstrom mit der Dateibeschreibung 7 (ohne /Type) für den gepackten Strom 5.
  const innen = '<< /F (fremd.vivodepot) /UF <FEFF006600720065006D0064002E007600690076006F006400650070006F0074> /EF << /F 5 0 R >> /AFRelationship /Source >>';
  const kopfPaare = '7 0 ';
  const objStm = zlib.deflateSync(Buffer.from(kopfPaare + innen, 'latin1'));
  const pdf = pdfAus('%PDF-1.5\n%\xe2\xe3\xcf\xd3\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles 3 0 R >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n',
    '3 0 obj\n<< /Kids [ 4 0 R ] >>\nendobj\n',
    '4 0 obj\n<< /Limits [ (a) (z) ] /Names [ (fremd.vivodepot) 7 0 R (zwei.txt) 9 0 R ] >>\nendobj\n',
    stromObjekt(5, '/Type /EmbeddedFile /Subtype /application#2Foctet-stream /Filter /FlateDecode', zlib.deflateSync(inhaltA)),
    stromObjekt(6, '/Type /ObjStm /N 1 /First ' + kopfPaare.length + ' /Filter [ /FlateDecode ]', objStm),
    stromObjekt(8, '/Type /EmbeddedFile', inhaltB),
    '9 0 obj\n<< /Type /Filespec /F (zwei.txt) /EF << /F 8 0 R >> >>\nendobj\n',
    'trailer\n<< /Size 10 /Root 1 0 R >>\n%%EOF\n');
  const liste = await pa.pdfAnhaengeLesen(pdf);
  assert.equal(liste.grund, null);
  assert.equal(liste.length, 2);
  assert.equal(liste[0].dateiname, 'fremd.vivodepot', 'UTF-16BE-Name aus /UF');
  assert.equal(liste[0].subtype, 'application/octet-stream');
  assert.equal(liste[0].beziehung, 'Source');
  assert.ok(alsBuffer(liste[0].bytes).equals(inhaltA), 'entpackt byte-gleich');
  assert.equal(liste[1].dateiname, 'zwei.txt');
  assert.equal(liste[1].subtype, null);
  assert.equal(liste[1].beziehung, null);
  assert.ok(alsBuffer(liste[1].bytes).equals(inhaltB));
});

test('[Fail closed] Fremd-PDF ohne Anhang: leere Liste ohne Grund', async () => {
  const pa = ausfuehren(block(lesen()[0]));
  const pdf = pdfAus('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n',
    stromObjekt(3, '', Buffer.from('BT /F1 12 Tf (1 0 obj << /Type /Filespec >> endobj) Tj ET', 'latin1')),
    'trailer\n<< /Root 1 0 R >>\n%%EOF\n');
  const liste = await pa.pdfAnhaengeLesen(pdf);
  assert.ok(Array.isArray(liste));
  assert.equal(liste.length, 0);
  assert.equal(liste.grund, null);
});

test('[Fail closed] keine PDF, verdorbene, abgeschnittene und verschlüsselte PDF: leere Liste mit Grund, nie ein Wurf', async () => {
  const { V } = ladeKern();
  const pa = ausfuehren(block(lesen()[0]));
  const ganz = kernPdf(V, [{ inhalt: DEPOT_TEXT.repeat(20), dateiname: 'a.vivodepot', beziehung: 'Source' }]);
  const faelle = [
    [undefined, 'kein-pdf'], [null, 'kein-pdf'], ['%PDF-1.7 als Zeichenkette', 'kein-pdf'], [{}, 'kein-pdf'],
    [Buffer.from('PK\u0003\u0004 kein pdf', 'latin1'), 'kein-pdf'],
    [Buffer.from('%PDF-1.7\nÿþ Müll ohne Objekte <<<< ]]]] ((((', 'latin1'), 'struktur-unlesbar'],
    // Mitten im Anhang abgeschnitten: Dateibeschreibung und Katalog fehlen, aus den Resten wird nichts gelesen.
    [ganz.subarray(0, ganz.indexOf('VIVODEPOT') + 40), 'struktur-unlesbar'],
    [pdfAus('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R /Encrypt 2 0 R >>\n%%EOF\n'), 'pdf-verschluesselt'],
  ];
  for (const [eingang, grund] of faelle) {
    const liste = await pa.pdfAnhaengeLesen(eingang);
    assert.ok(Array.isArray(liste), 'immer eine Liste');
    assert.equal(liste.length, 0, 'leer bei ' + grund);
    assert.equal(liste.grund, grund);
  }
  // Ein Anhang, dessen Strom nicht stimmt (kaputte Packung, /Length zu lang, /Length zu kurz, abgeschnitten): er fällt heraus, mit Grund.
  const katalogUndBeschreibung = '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /AF [ 3 0 R ] >>\nendobj\n'
    + '3 0 obj\n<< /Type /Filespec /F (k.bin) /EF << /F 2 0 R >> >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n';
  const stroeme = [
    stromObjekt(2, '/Type /EmbeddedFile /Filter /FlateDecode', Buffer.from('kein zlib', 'latin1')),
    pdfAus('2 0 obj\n<< /Type /EmbeddedFile /Length 9999 >>\nstream\nkurz\nendstream\nendobj\n'),
    pdfAus('2 0 obj\n<< /Type /EmbeddedFile /Length 2 >>\nstream\nlänger als zwei\nendstream\nendobj\n'),
    stromObjekt(2, '/Type /EmbeddedFile', Buffer.from(DEPOT_TEXT.repeat(5), 'utf8')).subarray(0, 120),
  ];
  for (const strom of stroeme) {
    const l = await pa.pdfAnhaengeLesen(pdfAus(katalogUndBeschreibung, strom));
    assert.ok(Array.isArray(l));
    assert.equal(l.length, 0, strom.subarray(0, 60).toString('latin1'));
    assert.equal(l.grund, 'anhang-unlesbar');
  }
});

// Zwei Anhänge: einer klein, einer 4 KiB roh; dazu ein Strom, der sich auf 1 MiB entpackt.
function grenzPdf() {
  return pdfAus('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /AF [ 11 0 R 12 0 R 13 0 R ] >>\nendobj\n',
    stromObjekt(2, '/Type /EmbeddedFile', Buffer.from('klein', 'latin1')),
    stromObjekt(3, '/Type /EmbeddedFile', Buffer.alloc(4096, 0x41)),
    stromObjekt(4, '/Type /EmbeddedFile /Filter /FlateDecode', zlib.deflateSync(Buffer.alloc(1024 * 1024))),
    '11 0 obj\n<< /Type /Filespec /F (klein.txt) /EF << /F 2 0 R >> >>\nendobj\n',
    '12 0 obj\n<< /Type /Filespec /F (gross.bin) /EF << /F 3 0 R >> >>\nendobj\n',
    '13 0 obj\n<< /Type /Filespec /F (bombe.bin) /EF << /F 4 0 R >> >>\nendobj\n',
    'trailer\n<< /Root 1 0 R >>\n%%EOF\n');
}

test('[Grenze] ein Anhang über der Größengrenze und ein aufgeblähter Strom werden abgewiesen, der kleine bleibt', async () => {
  const pa = ausfuehren(block(lesen()[0]));
  const pdf = grenzPdf();
  assert.ok(pdf.length < 8192, 'die gepackte Bombe ist klein: ' + pdf.length);
  const liste = await pa.pdfAnhaengeLesen(pdf, { bytes: 2048 });
  assert.deepEqual(Array.from(liste, (a) => a.dateiname), ['klein.txt']);
  assert.equal(liste.grund, 'anhang-zu-gross');
  // Die Summe zählt: zwei Anhänge, je unter der Grenze, zusammen darüber.
  const zwei = await pa.pdfAnhaengeLesen(pdf, { bytes: 4100 });
  assert.deepEqual(Array.from(zwei, (a) => a.dateiname), ['klein.txt'], 'groß passt allein, aber nicht mehr zur Summe');
  assert.equal(zwei.grund, 'anhang-zu-gross');
});

test('[Grenze] mehr als die Höchstzahl Anhänge: leere Liste mit Grund', async () => {
  const pa = ausfuehren(block(lesen()[0]));
  const liste = await pa.pdfAnhaengeLesen(grenzPdf(), { anzahl: 2 });
  assert.equal(liste.length, 0);
  assert.equal(liste.grund, 'zu-viele-anhaenge');
});

test('[Grenze] Grenzen lassen sich nur senken; die Größengrenze trägt das größte Depot', () => {
  const { V } = ladeKern();
  const pa = ausfuehren(block(lesen()[0]));
  assert.deepEqual(JSON.parse(JSON.stringify(pa._pdfAnhangGrenzen({ bytes: pa.PDF_ANHANG_MAX_BYTES * 10, anzahl: 1e6 }))),
    { anzahl: pa.PDF_ANHANG_HOECHSTZAHL, bytes: pa.PDF_ANHANG_MAX_BYTES });
  assert.deepEqual(JSON.parse(JSON.stringify(pa._pdfAnhangGrenzen({ bytes: 10, anzahl: 1 }))), { anzahl: 1, bytes: 10 });
  assert.deepEqual(JSON.parse(JSON.stringify(pa._pdfAnhangGrenzen({ bytes: -1, anzahl: 'x' }))),
    { anzahl: pa.PDF_ANHANG_HOECHSTZAHL, bytes: pa.PDF_ANHANG_MAX_BYTES });
  // Umschlag-Faktor ~1,35 (Base64 + JSON-Hülle), s. den Kommentar an MAPPE_GESAMT_HARTE_GRENZE_BYTES im Kern.
  assert.equal(typeof V.MAPPE_GESAMT_HARTE_GRENZE_BYTES, 'number');
  assert.ok(pa.PDF_ANHANG_MAX_BYTES >= Math.ceil(V.MAPPE_GESAMT_HARTE_GRENZE_BYTES * 1.35), 'Grenze unter dem größten Depot');
  assert.ok(pa.PDF_EINGANG_MAX_BYTES > pa.PDF_ANHANG_MAX_BYTES, 'die PDF darf den größten Anhang samt Seiten tragen');
  assert.ok(pa.PDF_EINGANG_MAX_BYTES < 512 * 1024 * 1024, 'unter der Zeichenketten-Grenze des Browsers');
});

test('[Grenze·Rot-Beweis] eine Fassung ohne die Größengrenze nimmt den übergroßen Anhang und den aufgeblähten Strom an', async () => {
  const quelle = block(lesen()[0]);
  assert.equal(quelle.split(GRENZ_ZEILE).length, 2, 'Vorbedingung: die Grenzzeile steht im Block genau einmal');
  const ohne = ausfuehren(quelle.replace(GRENZ_ZEILE, 'function _pdfAnhangZuGross(n, max) { return false; }'));
  const liste = await ohne.pdfAnhaengeLesen(grenzPdf(), { bytes: 2048 });
  assert.deepEqual(Array.from(liste, (a) => a.dateiname), ['klein.txt', 'gross.bin', 'bombe.bin']);
  assert.equal(liste[2].bytes.length, 1024 * 1024, 'die Bombe ist ganz entpackt');
  assert.equal(liste.grund, null);
});

test('[Krypto und Netz] der Block ruft weder WebCrypto noch das Netz noch eval', () => {
  const { GETEILT_KRYPTO, nurCode } = require('../tools/krypto-block-propagation-pruefen.js');
  const code = nurCode(block(lesen()[0]));
  assert.equal((code.match(/\bcrypto\b|\bsubtle\b/g) || []).length, 0, 'keine crypto.subtle-Aufrufe');
  assert.equal(GETEILT_KRYPTO.test(code), false, 'fällt nicht in die Klasse der geteilten Krypto-Funktionen');
  assert.equal(/\b(?:fetch|XMLHttpRequest|WebSocket|importScripts|eval|Function)\s*\(|\bimport\s*\(|new\s+Function\b/.test(code), false);
});

/* Restbudget (25.10.2026): ein Anhang wird nur bis zu dem entpackt, was von der Summengrenze noch frei ist — nicht bis zur
   vollen Grenze und erst danach gegen die Summe geprüft. Eine mitzählende Entpackung misst, wie viel tatsächlich entpackt wird. */
const REST_ZEILE = 'await _pdfAnhangStromDaten(t, objekte, eintrag, grenze.bytes - summe)';
function mitZaehler(quelle) {
  const zaehler = { bytes: 0 };
  class ZaehlendeEntpackung {
    constructor(format) {
      const innen = new DecompressionStream(format);
      this.writable = innen.writable;
      this.readable = innen.readable.pipeThrough(new TransformStream({ transform(c, s) { zaehler.bytes += c.length; s.enqueue(c); } }));
    }
  }
  const kontext = { TextDecoder, ReadableStream, DecompressionStream: ZaehlendeEntpackung };
  vm.createContext(kontext);
  vm.runInContext(quelle + '\n;globalThis.__PA__ = { pdfAnhaengeLesen };', kontext);
  return { pa: kontext.__PA__, zaehler };
}
function summenPdf() {
  const eins = Buffer.alloc(350000, 0x61);
  const bombe = zlib.deflateSync(Buffer.alloc(10 * 1024 * 1024, 0));
  return pdfAus('%PDF-1.7\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R /Names << /EmbeddedFiles 3 0 R >> >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n',
    '3 0 obj\n<< /Names [ (eins.bin) 4 0 R (zwei.bin) 5 0 R ] >>\nendobj\n',
    '4 0 obj\n<< /Type /Filespec /F (eins.bin) /EF << /F 6 0 R >> >>\nendobj\n',
    '5 0 obj\n<< /Type /Filespec /F (zwei.bin) /EF << /F 7 0 R >> >>\nendobj\n',
    stromObjekt(6, '/Type /EmbeddedFile', eins),
    stromObjekt(7, '/Type /EmbeddedFile /Filter /FlateDecode', bombe),
    'trailer\n<< /Size 8 /Root 1 0 R >>\n%%EOF\n');
}
const SUMMEN_GRENZE = 400000;   // eins.bin lässt 50000 frei; zwei.bin bläht sich auf 10 MiB

test('[Grenze·Rest] zwei Anhänge zusammen über der Grenze: der zweite wird nur bis zum Rest entpackt und abgewiesen', async () => {
  for (const text of lesen()) {
    const quelle = block(text);
    assert.equal(quelle.split(REST_ZEILE).length, 2, 'Vorbedingung: die Rest-Zeile steht im Block genau einmal');
    const { pa, zaehler } = mitZaehler(quelle);
    const liste = await pa.pdfAnhaengeLesen(summenPdf(), { bytes: SUMMEN_GRENZE });
    assert.deepEqual(Array.from(liste, (a) => a.dateiname), ['eins.bin']);
    assert.equal(liste.grund, 'anhang-zu-gross');
    assert.ok(zaehler.bytes < SUMMEN_GRENZE - 350000 + 256 * 1024, 'entpackt nur etwa den Rest: ' + zaehler.bytes);
    assert.ok(zaehler.bytes < SUMMEN_GRENZE, 'nie bis zur vollen Grenze: ' + zaehler.bytes);
  }
});

test('[Grenze·Rest·Rot-Beweis] mit der vollen Grenze je Anhang wird der zweite über die Summengrenze hinaus entpackt', async () => {
  const quelle = block(lesen()[0]);
  const { pa, zaehler } = mitZaehler(quelle.replace(REST_ZEILE, 'await _pdfAnhangStromDaten(t, objekte, eintrag, grenze.bytes)'));
  const liste = await pa.pdfAnhaengeLesen(summenPdf(), { bytes: SUMMEN_GRENZE });
  assert.deepEqual(Array.from(liste, (a) => a.dateiname), ['eins.bin'], 'das Ergebnis allein zeigt den Unterschied nicht');
  assert.ok(zaehler.bytes > SUMMEN_GRENZE, 'erst die Menge des Entpackten: ' + zaehler.bytes);
});
