'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Marke-Achse-Plan §2b/§6 Schritt 3 (14.09.2026) — Probe für das generalisierte
   Font-Vendoring-Werkzeug. Zwei Dinge werden geprüft, nicht eines:

   1) Erste Probe (Plan-Wortlaut): Inter selbst noch einmal durch das NEUE,
      generische Werkzeug laufen lassen — muss dieselben Bytes/dieselbe
      Registrierungsform liefern wie der heutige, handgebaute Block. Geprüft
      OHNE den echten Kern zu schreiben (reiner Textvergleich über blockBauen),
      damit die bereits getestete, produktiv laufende Inter-Einbettung
      (tests/pdf-inter-einbetten.test.js) unangetastet bleibt.
   2) Rot-Beweis + Behälter-Mechanik: eine ANDERE Font-Datei erzeugt einen
      ANDEREN Block, und der additive VD-PDF-PARTNER-FONTS-Behälter nimmt einen
      neuen Slug auf, ohne den nativen Inter-Block zu berühren — gegen eine
      Scratch-Kopie des echten Kerns, nicht gegen die Datei selbst.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  blockBauen, slugPruefen, ttfSignaturPruefen, BEHAELTER_BEGIN, BEHAELTER_END,
} = require('../tools/build-pdf-marke-schrift-einbetten.js');
const { REGULAR_PFAD, BOLD_PFAD, ITALIC_PFAD } = require('../tools/build-pdf-inter-einbetten.js');
const { ladeKern } = require('./load-kern.js');

test('[Font-Vendoring·Reproduktion] Inter durch das neue, generische Werkzeug ergibt dieselben Base64-Bytes wie die drei committeten Schnitte', () => {
  const { text, groessen, stile } = blockBauen({
    slug: 'interprobe', familie: 'Inter',
    regularPfad: REGULAR_PFAD, boldPfad: BOLD_PFAD, italicPfad: ITALIC_PFAD,
    version: 'pdf-subset-2026-09-13', lizenz: 'OFL-1.1', spdx: 'OFL-1.1', hinweis: 'Reproduktionsprobe',
  });
  assert.deepEqual(stile.sort(), ['bold', 'italic', 'normal'], 'alle drei Stile müssen erzeugt werden, wie beim nativen Block');
  // Die BYTES selbst müssen exakt den drei committeten Quelldateien entsprechen — das ist die
  // eigentliche Zusage, unabhängig vom drumherum gebauten Registrierungscode.
  for (const [pfad] of groessen) {
    const roh = fs.readFileSync(pfad);
    assert.ok(text.includes(roh.toString('base64')), path.basename(pfad) + ': dessen Base64-Inhalt fehlt im erzeugten Block');
  }
  // Strukturell: dieselbe Registrierungsform wie der native Block (addFileToVFS + addFont je
  // Stil, Eintrag über jsPDFs addFonts-Ereignis) — Familienname 'Inter', wie im Original.
  assert.match(text, /jsPDFAPI\.events\.push\(\s*\[\s*'addFonts'/);
  const stilTreffer = [...text.matchAll(/addFont\('[^']+',\s*'Inter',\s*'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(stilTreffer, ['bold', 'italic', 'normal']);
});

test('[Font-Vendoring·Rot-Beweis] eine ANDERE Font-Datei erzeugt einen ANDEREN Block', () => {
  const a = blockBauen({
    slug: 'sonde', familie: 'Sonde', regularPfad: REGULAR_PFAD,
    version: '1', lizenz: 'OFL-1.1', spdx: 'OFL-1.1', hinweis: 'Rot-Beweis A',
  });
  const b = blockBauen({
    slug: 'sonde', familie: 'Sonde', regularPfad: BOLD_PFAD,
    version: '1', lizenz: 'OFL-1.1', spdx: 'OFL-1.1', hinweis: 'Rot-Beweis A',
  });
  assert.notEqual(a.text, b.text, 'zwei verschiedene Font-Dateien dürfen nicht denselben Block erzeugen');
});

test('[Font-Vendoring] --slug "inter" wird abgewiesen — dieses Werkzeug fasst den nativen Block nie an', () => {
  assert.throws(() => slugPruefen('inter'), /nativer Block/);
});

test('[Font-Vendoring] eine zu kleine/kaputte Datei besteht die TrueType-Signaturprüfung nicht', () => {
  const tmp = path.join(os.tmpdir(), 'vd-rotbeweis-kaputte-schrift-' + process.pid + '.ttf');
  fs.writeFileSync(tmp, Buffer.from('kein-font'));
  try {
    assert.throws(() => ttfSignaturPruefen(tmp), /TrueType-Signatur|zu klein/);
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('[Font-Vendoring·Behälter] ein neuer Partner-Slug landet additiv im Behälter, der native Inter-Block bleibt Byte-für-Byte unverändert', () => {
  const { html: originalHtml } = ladeKern();
  const originalInterBlock = originalHtml.match(/<script id="inter_pdf_font_VivodepotInline">[\s\S]*?<\/script>/)[0];
  assert.ok(originalHtml.includes(BEHAELTER_BEGIN) && originalHtml.includes(BEHAELTER_END),
    'der additive Behälter fehlt im Kern — Marke-Achse-Plan §2b/Schritt 3 legt ihn einmalig an');

  const scratch = path.join(os.tmpdir(), 'vd-font-vendoring-behaelter-probe-' + process.pid + '.html');
  fs.writeFileSync(scratch, originalHtml, 'utf8');
  try {
    execFontEinbettenCLI(scratch, {
      slug: 'testpartner', familie: 'Testpartner', regular: REGULAR_PFAD,
      version: '1', lizenz: 'OFL-1.1', spdx: 'OFL-1.1', hinweis: 'Behälter-Probe',
    });
    const neuesHtml = fs.readFileSync(scratch, 'utf8');
    assert.ok(neuesHtml.includes('<!-- VD-PDF-FONT:testpartner:BEGIN -->'), 'der neue Slug-Block fehlt nach dem Lauf');
    assert.ok(neuesHtml.includes('@vd-lib name="testpartner-pdf-font"'), 'der @vd-lib-Marker für den neuen Slug fehlt');
    const nachherInterBlock = neuesHtml.match(/<script id="inter_pdf_font_VivodepotInline">[\s\S]*?<\/script>/)[0];
    assert.equal(nachherInterBlock, originalInterBlock, 'der native Inter-Block darf durch einen Partner-Font-Lauf NIE verändert werden');
  } finally {
    fs.unlinkSync(scratch);
  }
});

function execFontEinbettenCLI(zielPfad, opts) {
  const { execFileSync } = require('node:child_process');
  const werkzeug = path.join(__dirname, '..', 'tools', 'build-pdf-marke-schrift-einbetten.js');
  const args = [werkzeug];
  for (const [k, v] of Object.entries(opts)) { args.push('--' + k, String(v)); }
  args.push('--ziel', zielPfad);
  execFileSync(process.execPath, args, { stdio: 'pipe' });
}
