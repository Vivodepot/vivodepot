'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Marke im PDF (v896, Befund BRANDING-NICHT-IM-PDF, 02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   (1) Logo-Maße und Farbraum werden aus den Bytes gelesen (PNG-IHDR, JPEG-SOF); CMYK wird erkannt, Unlesbares ist null.
   (2) Ab Werk (Vivodepot-Standardmarke) zeichnet der Kopf-Helfer exakt die bisherige Wortmarke — Versalien, fett 16,
       Sekundärfarbe, an (RAND, y) —, und die drei Fuß-Erzeuger zeichnen KEINE Marke (byte-gleich ab Werk).
   (3) Mit einer Einrichtungsmarke: Kopf trägt Logo (addImage) bzw. Wortmarke; Notfallkarte, Dokument-PDF und Widerruf
       tragen die Marke klein im unteren Rand jeder Seite.
   (4) Wortmarke mit zu schwacher Markenfarbe nimmt die dunkle Textfarbe.
   Der Vergleich mit echtem jsPDF und veraPDF läuft über tests/konformitaet/adapter/verapdf.mjs (v908). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { ladeKern } = require('./load-kern.js');

function png(breite, hoehe, farbtyp) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(breite, 0); ihdr.writeUInt32BE(hoehe, 4); ihdr[8] = 8; ihdr[9] = farbtyp;
  const chunk = (typ, daten) => { const l = Buffer.alloc(4); l.writeUInt32BE(daten.length); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32 ? zlib.crc32(Buffer.concat([Buffer.from(typ), daten])) : 0); return Buffer.concat([l, Buffer.from(typ), daten, c]); };
  return 'data:image/png;base64,' + Buffer.concat([sig, chunk('IHDR', ihdr)]).toString('base64');
}
function jpeg(breite, hoehe, komponenten) {
  const sof = Buffer.from([0xFF, 0xC0, 0x00, 8 + 3 * komponenten, 8, hoehe >> 8, hoehe & 255, breite >> 8, breite & 255, komponenten]);
  return 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xFF, 0xD8]), Buffer.from([0xFF, 0xE0, 0x00, 0x04, 0, 0]), sof, Buffer.alloc(3 * komponenten)]).toString('base64');
}

function fakeDoc(breite = 595, hoehe = 842) {
  let seite = 1, seiten = 1;
  const log = [];
  const doc = {
    internal: { pageSize: { getWidth: () => breite, getHeight: () => hoehe }, getNumberOfPages: () => seiten },
    setFont: (n, s) => log.push(['font', s])  && doc, setFontSize: (g) => log.push(['groesse', g]) && doc,
    setTextColor: (r, g, b) => log.push(['farbe', [r, g, b]]) && doc,
    setDrawColor() { return doc; }, setLineWidth() { return doc; }, line() { return doc; },
    splitTextToSize: (s) => [String(s == null ? '' : s)], getTextWidth: (t) => String(t).length * 3,
    addPage() { seiten += 1; seite = seiten; return doc; }, setPage(p) { seite = p; return doc; },
    text: (t, x, y) => { log.push(['text', t, x, y, seite]); return doc; },
    addImage: (d, typ, x, y, w, h) => { log.push(['bild', typ, x, y, w, h, seite]); return doc; },
    setProperties() { return doc; },
  };
  return { doc, log, seiten: () => seiten };
}

async function mitMarke(V, marke) {
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const d = V.getData(); d.brandingModule = [marke]; V.setData(d);
}
const MARKE = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'test-marke-pdf', name: 'Muster Sparkasse', domain: 'muster.example',
  farbePrimaer: '#112233', farbeSekundaer: '#aa1122', schriftart: 'Inter', logo: null,
});

test('Logo-Maße: PNG mit Alpha, RGB-JPEG, CMYK-JPEG erkannt; Unlesbares ist null', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.pdfLogoMasse(png(200, 50, 6)), { typ: 'PNG', breite: 200, hoehe: 50, cmyk: false, alpha: true });
  assert.deepEqual(V.pdfLogoMasse(png(10, 10, 2)), { typ: 'PNG', breite: 10, hoehe: 10, cmyk: false, alpha: false });
  assert.deepEqual(V.pdfLogoMasse(jpeg(300, 100, 3)), { typ: 'JPEG', breite: 300, hoehe: 100, cmyk: false, alpha: false });
  assert.equal(V.pdfLogoMasse(jpeg(300, 100, 4)).cmyk, true);
  for (const kaputt of ['data:image/png;base64,QUJD', 'data:image/gif;base64,R0lGODlh', '', null]) assert.equal(V.pdfLogoMasse(kaputt), null, String(kaputt));
});

test('Ab Werk: Kopf-Helfer zeichnet exakt die bisherige Wortmarke, Standardmarke erkannt', () => {
  const { V } = ladeKern();
  assert.equal(V._pdfMarke().standard, true);
  const { doc, log } = fakeDoc();
  const vorschub = V.pdfMarkeKopfZeichnen(doc, 56, 56);
  assert.equal(vorschub, 22);
  assert.deepEqual(log, [['font', 'bold'], ['groesse', 16], ['farbe', [138, 109, 58]], ['text', 'VIVODEPOT', 56, 56, 1]]);
});

test('Ab Werk: Notfallkarte, Dokument-PDF-Fuß und Widerruf zeichnen keine Marke', () => {
  const { V } = ladeKern();
  const { doc, log } = fakeDoc(105, 148);
  V.pdfMarkeFussAufAllenSeiten(doc, 8, 2.6, 'mm');
  assert.deepEqual(log, []);
});

test('Einrichtungsmarke ohne Logo: Wortmarke im Kopf in Markenfarbe, Fuß-Marke auf jeder Seite', async () => {
  const { V } = ladeKern();
  await mitMarke(V, MARKE);
  assert.equal(V._pdfMarke().standard, false);
  const k = fakeDoc();
  V.pdfMarkeKopfZeichnen(k.doc, 56, 56);
  assert.deepEqual(k.log.find((e) => e[0] === 'text').slice(1, 4), ['MUSTER SPARKASSE', 56, 56]);
  assert.deepEqual(k.log.find((e) => e[0] === 'farbe')[1], [0xaa, 0x11, 0x22]);
  const f = fakeDoc(105, 148); f.doc.addPage(); f.doc.addPage();
  V.pdfMarkeFussAufAllenSeiten(f.doc, 8, 2.6, 'mm');
  const fuss = f.log.filter((e) => e[0] === 'text');
  assert.deepEqual(fuss.map((e) => e[4]), [1, 2, 3]);
  assert.ok(fuss.every((e) => e[1] === 'Muster Sparkasse' && e[3] === 148 - 2.6));
});

test('Einrichtungsmarke mit Logo: Kopf und Fuß zeichnen das Logo mit Höhenbegrenzung; CMYK fällt auf die Wortmarke', async () => {
  const { V } = ladeKern();
  await mitMarke(V, Object.assign({}, MARKE, { logo: png(400, 100, 6) }));
  const k = fakeDoc();
  assert.equal(V.pdfMarkeKopfZeichnen(k.doc, 56, 56), 42);
  assert.deepEqual(k.log, [['bild', 'PNG', 56, 44, 136, 34, 1]]);
  const f = fakeDoc(105, 148);
  V.pdfMarkeFussAufAllenSeiten(f.doc, 8, 2.6, 'mm');
  assert.deepEqual(f.log.map((e) => e.slice(0, 2)), [['bild', 'PNG']]);
  assert.equal(f.log[0][4], 16); assert.equal(f.log[0][5], 4);   // Breite 16 mm bei 4 mm Höhe (400×100)
  const { V: V2 } = ladeKern();
  await mitMarke(V2, Object.assign({}, MARKE, { logo: jpeg(300, 100, 4) }));
  const c = fakeDoc();
  V2.pdfMarkeKopfZeichnen(c.doc, 56, 56);
  assert.equal(c.log.some((e) => e[0] === 'bild'), false);
  assert.ok(c.log.some((e) => e[0] === 'text' && e[1] === 'MUSTER SPARKASSE'));
});

test('Wortmarke: zu schwache Markenfarbe nimmt die dunkle Textfarbe (Kontrast gegen Weiß)', async () => {
  const { V } = ladeKern();
  await mitMarke(V, Object.assign({}, MARKE, { farbeSekundaer: '#ffee88' }));
  const k = fakeDoc();
  V.pdfMarkeKopfZeichnen(k.doc, 56, 56);
  assert.deepEqual(k.log.find((e) => e[0] === 'farbe')[1], [20, 20, 20]);
});

/* Rot-Beweis zur Probe „Fuß-Marke auf jeder Seite“: Zeichnete der Fuß nur auf eine Seite (etwa weil der Seitenwechsel
   nicht greift), stünden alle Marken auf Seite 1 — genau das muss die Zusicherung oben unterscheiden. Ein Dokument, dessen
   setPage nichts tut, spielt diesen Fehler nach; die Seitenliste weicht dann ab. */
test('Rot-Beweis: eine Fuß-Marke, die nicht auf jede Seite kommt, fällt an der Seitenliste auf', async () => {
  const { V } = ladeKern();
  await mitMarke(V, MARKE);
  const f = fakeDoc(105, 148); f.doc.addPage(); f.doc.addPage();
  f.doc.setPage = function () { return f.doc; };   // Seitenwechsel greift nicht
  V.pdfMarkeFussAufAllenSeiten(f.doc, 8, 2.6, 'mm');
  const seiten = f.log.filter((e) => e[0] === 'text').map((e) => e[4]);
  assert.notDeepEqual(seiten, [1, 2, 3], 'die Probe oben würde diesen Fehler sehen');
});
