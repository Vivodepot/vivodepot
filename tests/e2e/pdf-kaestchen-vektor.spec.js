'use strict';
/* ════════════════════════════════════════════════════════════════════════
   PDF-Kästchen als Vektor — im echten jsPDF, mit der echten Schrift (25.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund VOLLMACHT-PDF-KAESTCHEN: das Vorsorgevollmacht-PDF brach ab, sobald die Gesundheitssorge beantwortet war —
   der Generator schreibt ☒/☐, die PDF-Schrift trägt sie nicht. Jetzt zeichnet die Engstelle jedes PDFs die Kästchen als
   Rahmen (angekreuzt mit Kreuz), Maße aus der Metrik der AKTIVEN Schrift. Hier im Browser, mit dem gebündelten jsPDF:
   · das echte Vollmacht-Modul (die eine Datei unter tools/dokument-module/ mit „dokumentmodul-vorsorge…“), alle Paar-Bausteine über den echten
     Generator (MODUL_BLOCK_HANDLER), ja und nein im Wechsel, über denselben Zeilen-Weg wie die Dokument-PDFs:
     keine Schriftlücke; jeder Rahmen hat die Versalhöhe von Inter und steht auf einer Textgrundlinie;
   · Bildvergleich: die erste Seite, mit pdftoppm gerastert (Graustufen, 36 dpi), gegen tests/fixtures/
     pdf-kaestchen-vollmacht-referenz.pgm (neu aufnehmen: PDF_KAESTCHEN_REFERENZ_NEU=1);
   · dieselbe Messung mit einer Fixture-Schrift mit kleinem Zeichensatz und ANDERER Versalhöhe
     (tests/fixtures/pdf-schrift-probe-klein.ttf, aus Inter 4.1 abgeleitet, OFL-1.1): die Rahmen folgen IHRER Metrik.
   Braucht pdftoppm (poppler); fehlt es, scheitert die Probe laut statt still zu überspringen.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { oeffneApp } = require('./helpers');

const REPO = path.join(__dirname, '..', '..');
const MODUL = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'dokument-module', 'vivodepot-dokumentmodul-vorsorgevollmacht.json'), 'utf8'));
const REFERENZ = path.join(REPO, 'tests', 'fixtures', 'pdf-kaestchen-vollmacht-referenz.pgm');
const PROBE_SCHRIFT = fs.readFileSync(path.join(REPO, 'tests', 'fixtures', 'pdf-schrift-probe-klein.ttf')).toString('base64');

// Rechtecke aus dem (unkomprimierten) Inhaltsstrom: „x y b h re". jsPDF schreibt die OBERKANTE (PDF-Koordinaten, von
// unten gezählt) und eine negative Höhe; `oben` ist hier in jsPDF-Koordinaten (von oben gezählt) zurückgerechnet.
function rahmenAusPdf(pdf, seitenhoehe) {
  return [...pdf.matchAll(/(-?[\d.]+) (-?[\d.]+) (-?[\d.]+) (-?[\d.]+) re/g)].map((m) => ({ x: +m[1], oben: seitenhoehe - +m[2], b: Math.abs(+m[3]), h: Math.abs(+m[4]) }));
}
function pgmLesen(puffer) {
  const kopf = puffer.toString('latin1', 0, 64).split(/\s+/);
  const breite = +kopf[1], hoehe = +kopf[2];
  const start = puffer.length - breite * hoehe;
  return { breite, hoehe, pixel: puffer.subarray(start) };
}

async function vollmachtPdf(page, { schrift }) {
  return page.evaluate(({ modul, schrift, probeB64 }) => {
    const V = window.__vdOeffentlich;
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    if (schrift === 'VivodepotProbeKlein') { doc.addFileToVFS('probe-klein.ttf', probeB64); doc.addFont('probe-klein.ttf', 'VivodepotProbeKlein', 'normal'); }
    V._pdfSchriftPruefungInstallieren(doc);
    const dm = Object.values(modul.dokumentModule)[0];   // die Datei trägt genau ein Dokument-Modul
    let y = 50, n = 0;
    const grundlinien = [];
    const zeile = (text, stil, groesse) => {
      doc.setFont(schrift, schrift === 'Inter' ? stil : 'normal'); doc.setFontSize(groesse);
      const zeilen = doc.splitTextToSize(text, 495);
      zeilen.forEach((_, i) => grundlinien.push(y + i * groesse * 1.4));
      y = V.pdfZeilenZeichnen(doc, zeilen, 50, y, groesse * 1.4, 800, 50) + 6;
    };
    for (const a of dm.abschnitte) {
      const paare = (a.bloecke || []).filter((b) => b.typ === 'auswahlPaar' || b.typ === 'auswahlPaarGruppe');
      if (!paare.length) continue;
      if (a.titel) zeile(a.titel, 'bold', 11);
      for (const blk of paare) {
        const felder = blk.typ === 'auswahlPaar' ? [blk.feldId] : blk.punkte.map((p) => p.feldId);
        const d = Object.fromEntries(felder.map((id) => [id, (n++ % 2) ? 'nein' : 'ja']));
        for (const t of V.MODUL_BLOCK_HANDLER[blk.typ](blk, { d })) zeile(t, 'normal', 10);
      }
      if (y > 700) break;   // eine Seite reicht für Bild und Geometrie
    }
    const metrik = doc.getFont().metadata;
    return { pdf: doc.output(), luecken: doc._pdfSchriftLuecken || [], seiten: doc.internal.getNumberOfPages(),
      versal: metrik.capHeight / metrik.head.unitsPerEm, hoehe: doc.internal.pageSize.getHeight(), grundlinien };
  }, { modul: MODUL, schrift, probeB64: PROBE_SCHRIFT });
}

test('[PDF-Kästchen·Inter] das echte Vollmacht-Modul, alle Paare: keine Lücke, Rahmen in Versalhöhe auf der Grundlinie, Bild wie Referenz', async ({ page }) => {
  await oeffneApp(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');
  const r = await vollmachtPdf(page, { schrift: 'Inter' });
  expect(r.luecken, 'keine Schriftlücke').toEqual([]);
  const rahmen = rahmenAusPdf(r.pdf, r.hoehe);
  expect(rahmen.length, 'Kontrolle: Kästchen gezeichnet').toBeGreaterThan(20);
  for (const k of rahmen) {
    expect(Math.abs(k.b - k.h)).toBeLessThan(0.01);
    expect(Math.abs(k.h - r.versal * 10)).toBeLessThan(0.02);                          // Versalhöhe bei 10 pt
    const unten = k.oben + k.h;                                                          // Unterkante in jsPDF-Koordinaten
    expect(r.grundlinien.some((g) => Math.abs(g - unten) < 0.02), 'Rahmen steht auf einer Grundlinie').toBe(true);
  }
  // Bildvergleich
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-kaestchen-'));
  try {
    fs.writeFileSync(path.join(ordner, 'v.pdf'), Buffer.from(r.pdf, 'latin1'));
    try { execFileSync('pdftoppm', ['-gray', '-r', '36', '-f', '1', '-l', '1', path.join(ordner, 'v.pdf'), path.join(ordner, 'seite')]); }
    catch (e) { throw new Error('pdftoppm (poppler) fehlt oder scheiterte — der Bildvergleich braucht es: ' + e.message); }
    const bild = fs.readFileSync(path.join(ordner, fs.readdirSync(ordner).find((f) => f.endsWith('.pgm'))));
    if (process.env.PDF_KAESTCHEN_REFERENZ_NEU === '1') fs.writeFileSync(REFERENZ, bild);
    const ist = pgmLesen(bild), soll = pgmLesen(fs.readFileSync(REFERENZ));
    expect([ist.breite, ist.hoehe]).toEqual([soll.breite, soll.hoehe]);
    let anders = 0;
    for (let i = 0; i < ist.pixel.length; i++) if (Math.abs(ist.pixel[i] - soll.pixel[i]) > 64) anders++;
    expect(anders / ist.pixel.length, 'Anteil deutlich abweichender Pixel').toBeLessThan(0.002);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[PDF-Kästchen·Fixture-Schrift] eine Schrift mit anderer Versalhöhe: die Rahmen folgen IHRER Metrik, keine Lücke', async ({ page }) => {
  await oeffneApp(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');
  const inter = await vollmachtPdf(page, { schrift: 'Inter' });
  const klein = await vollmachtPdf(page, { schrift: 'VivodepotProbeKlein' });
  expect(klein.luecken, 'keine Schriftlücke (die Kästchen sind Vektor)').toEqual([]);
  expect(Math.abs(klein.versal - inter.versal), 'Kontrolle: die Fixture hat eine andere Versalhöhe').toBeGreaterThan(0.1);
  const rahmen = rahmenAusPdf(klein.pdf, klein.hoehe);
  expect(rahmen.length).toBeGreaterThan(20);
  for (const k of rahmen) expect(Math.abs(k.h - klein.versal * 10)).toBeLessThan(0.02);
});
