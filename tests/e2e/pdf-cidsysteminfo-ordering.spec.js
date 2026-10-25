/* ════════════════════════════════════════════════════════════════════════
   Ein echtes PDF mit eingebetteter Schrift: /Ordering (Identity), und poppler meldet nichts (05.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund PDF-CIDSYSTEMINFO-ORDERING. Das PDF entsteht über die Oberfläche, wie eine Person es erzeugt: Anlass-Kachel
   „Arzttermin“, Situationsblatt, Knopf „Als PDF“; geprüft wird die heruntergeladene Datei (eingebettetes jsPDF, Schrift Inter):
     · die CIDFont trägt /Registry (Adobe) /Ordering (Identity), nirgends /Ordering (Identity-H);
     · pdffonts und pdftoppm schreiben keine Fehlerzeile nach stderr (vorher: „Unknown character collection“).
   ROT-BEWEIS: dasselbe PDF mit dem alten Wert an jeder Fundstelle (gleiche Länge ist nicht nötig, poppler liest nach Objekt) erzeugt die
   Fehlerzeile — die Probe sieht also, was sie verhindern soll. Braucht poppler; fehlt es, scheitert sie laut.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { oeffneApp, depotAnlegen } = require('./helpers');

function popplerStderr(pdfText) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-ordering-'));
  try {
    const datei = path.join(ordner, 'p.pdf');
    fs.writeFileSync(datei, Buffer.from(pdfText, 'latin1'));
    const fonts = spawnSync('pdffonts', [datei], { encoding: 'utf8' });
    const raster = spawnSync('pdftoppm', ['-gray', '-r', '36', '-f', '1', '-l', '1', datei, path.join(ordner, 's')], { encoding: 'utf8' });
    if (fonts.error || raster.error) throw new Error('poppler (pdffonts/pdftoppm) fehlt — die Probe braucht es: ' + (fonts.error || raster.error).message);
    return { stderr: (fonts.stderr || '') + (raster.stderr || ''), fonts: fonts.stdout || '' };
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
}

test('[PDF·Ordering] ein Kern-PDF mit Inter trägt /Ordering (Identity), poppler meldet nichts; der alte Wert fällt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('[data-anlass-auswahl="1"]');
  await page.waitForSelector('[data-anlass="arzt"]', { state: 'visible' });
  await page.click('[data-anlass="arzt"]');
  await page.waitForSelector('#b-pdf', { state: 'visible' });
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#b-pdf')]);
  const pdf = fs.readFileSync(await download.path()).toString('latin1');
  expect(pdf).toMatch(/\/Subtype \/CIDFontType2/);
  expect(pdf).toMatch(/\/Registry \(Adobe\)\s*\/Ordering \(Identity\)/);
  expect(pdf).not.toMatch(/\/Ordering \(Identity-H\)/);
  const jetzt = popplerStderr(pdf);
  expect(jetzt.fonts).toMatch(/CID TrueType/);
  expect(jetzt.stderr).not.toMatch(/Unknown character collection|Syntax Error/);
  // JEDE Fundstelle: das PDF trägt mehrere CIDFonts, und poppler meldet die Sammlung nicht für jede (gemessen 19.10.2026: nur die
  // dritte von drei ergab die Fehlerzeile). Ein Ersetzen nur der ersten ließ den Rot-Beweis leer.
  const alt = popplerStderr(pdf.split('/Ordering (Identity)').join('/Ordering (Identity-H)'));
  expect(alt.stderr).toMatch(/Unknown character collection 'Adobe-Identity-H'/);
});
