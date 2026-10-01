#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   QR-Decoder am Korpus messen (Einrichtungsseite, Messung M1b, 28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Welcher eingebettete Decoder liest die QR-Größen der Einrichtungsseite unter
   Tresen-Bedingungen, und wie schnell? Die Codes erzeugt der im Kern eingebettete
   Encoder; jedes Bild wird in einer Seite ohne Netz (CSP connect-src 'none')
   gezeichnet und verschlechtert:
     · Auflösung: Kamerapixel je QR-Modul (eine 720p-Webcam sieht einen 5-cm-Code
       aus 30 cm mit etwa 300 px, also rund 3 px je Modul bei Version 19)
     · Unschärfe (Fokus), schwacher Kontrast (schlechtes Licht), Rauschen
   Gemessen je Decoder: gelesen ja/nein (der Inhalt muss byte-gleich sein), Zeit
   je Bild; und jeder Netzaufruf der Seite (muss leer bleiben).

   Die Decoder liegen NICHT im Repo (Aufnahme nur über die Lieferkette,
   U2-ADR-434); das Werkzeug bekommt sie als Pfad:
     node tools/qr-decoder-korpus-messen.js --jsqr <pfad/jsQR.js>
        [--zxing <pfad/zxing-wasm/dist/iife/reader/index.js> --zxing-wasm <pfad/zxing_reader.wasm>]
        [--fall alle|kern-zettel] [--ausgabe <datei.json>]
     node tools/qr-decoder-korpus-messen.js --nur-geruest [--fall …]
        baut das Korpus ohne Decoder (Fixture-Lauf der Suite): Bilder, QR-Versionen, Netzaufrufe.
   Synthetisch, kein Ersatz für Fotos echter Zettel und Bildschirme.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const pw = require('playwright');

const REPO = path.join(__dirname, '..');
const NUTZLASTEN = [
  { name: 'serienteil-600', zeichen: 600, wofuer: 'ein Teil der Antwort-Serie (qrTeilePacken, 600 Zeichen)' },
  { name: 'vorlagen-verweis-1100', zeichen: 1100, wofuer: 'versiegelte Anfrage als Verweis auf eine Vorlage ab Werk' },
  { name: 'antwort-komprimiert-1900', zeichen: 1900, wofuer: 'ganze Antwort komprimiert in EINEM Code' },
];
/* Zwei Fälle. „alle“: das breite Raster. „kern-zettel“: der Fall der Bürger-App — ein gedruckter Verweis-Code
   (Version 27), mit dem Handy aus der Hand fotografiert: mindestens 3 Kamerapixel je Modul, dazu Drehung und Schräge. */
const FAELLE = {
  alle: { nutzlasten: null, px: [1.5, 2, 2.5, 3, 4], blur: [0, 1, 1.5], rauschen: [0, 25], lage: [{ name: 'gerade', grad: 0, schraeg: 0 }] },
  'kern-zettel': { nutzlasten: ['vorlagen-verweis-1100'], px: [3, 3.5, 4, 5, 6], blur: [0, 0.7, 1, 1.5], rauschen: [0, 15, 25],
    lage: [{ name: 'gerade', grad: 0, schraeg: 0 }, { name: 'gedreht-12', grad: 12, schraeg: 0 }, { name: 'schraeg', grad: 5, schraeg: 0.12 }] },
};
const LICHT = [{ name: 'gut', kontrast: 1, hell: 0 }, { name: 'schwach', kontrast: 0.35, hell: -40 }];

function qrBlock() {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const b = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => /QR Code Generator/.test(x.slice(0, 300)));
  if (!b) throw new Error('eingebetteter QR-Generator im Kern nicht gefunden');
  return b;
}

const SEITE = `<!doctype html><meta charset="utf-8"><title>korpus</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval'; connect-src 'none'; img-src 'none'">
<canvas id="a"></canvas><canvas id="b"></canvas>`;

/* läuft in der Seite */
function seitenCode() {
  let saat = 42;
  const zufall = () => { saat = (saat * 1103515245 + 12345) & 0x7fffffff; return saat / 0x7fffffff; };
  const text = (n) => { const z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; let s = 'VDQR|g1|1/1|'; while (s.length < n) s += z[Math.floor(zufall() * 64)]; return s; };
  window.bildBauen = (inhalt, px, blur, licht, rauschen, lage) => {
    const q = window.qrcode(0, 'M'); q.addData(inhalt, 'Byte'); q.make();
    const n = q.getModuleCount(); const rand = 4; const w = Math.ceil((n + 2 * rand) * px);
    const a = document.getElementById('a'); a.width = w; a.height = w; const c = a.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, w); c.fillStyle = '#000';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) c.fillRect((x + rand) * px, (y + rand) * px, px, px);
    const b = document.getElementById('b'); b.width = w; b.height = w; const d = b.getContext('2d');
    d.fillStyle = '#fff'; d.fillRect(0, 0, w, w);
    d.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    d.save(); d.translate(w / 2, w / 2); d.rotate((lage.grad || 0) * Math.PI / 180); d.transform(1, lage.schraeg || 0, 0, 1 - (lage.schraeg || 0) / 2, 0, 0);
    d.scale(0.82, 0.82); d.drawImage(a, -w / 2, -w / 2); d.restore();
    const img = d.getImageData(0, 0, w, w); const p = img.data;
    for (let i = 0; i < p.length; i += 4) {
      const r = (zufall() - 0.5) * 2 * rauschen;
      for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, Math.min(255, 128 + (p[i + k] - 128) * licht.kontrast + licht.hell + r));
    }
    return { img, version: (n - 17) / 4, breite: w };
  };
  window.lesen = async (decoder, img) => {
    const t0 = performance.now(); let gelesen = null;
    if (decoder === 'jsqr') { const r = window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' }); gelesen = r ? r.data : null; }
    if (decoder === 'zxing') { const r = await window.ZXingWASM.readBarcodes(img, { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 1 }); gelesen = r.length && r[0].isValid ? r[0].text : null; }
    return { gelesen, ms: performance.now() - t0 };
  };
  window.korpus = async (nutzlasten, pxListe, blurListe, lichtListe, rauschListe, lagen, decoder) => {
    const erg = [];
    for (const nl of nutzlasten) {
      const inhalt = text(nl.zeichen);
      for (const px of pxListe) for (const blur of blurListe) for (const licht of lichtListe) for (const rauschen of rauschListe) for (const lage of lagen) {
        const b = window.bildBauen(inhalt, px / 0.82, blur, licht, rauschen, lage);
        const z = { nutzlast: nl.name, version: b.version, px, blur, licht: licht.name, rauschen, lage: lage.name, breite: b.breite };
        for (const d of decoder) { const r = await window.lesen(d, b.img); z[d] = { ok: r.gelesen === inhalt, ms: Math.round(r.ms * 10) / 10 }; }
        erg.push(z);
      }
    }
    return erg;
  };
}

function _arg(argv, name) { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; }

async function main(argv, opt = {}) {   // opt nur für Proben: ohneCsp, zusatzSkript (Rot-Beweis des Netzmitschnitts)
  const bekannt = new Set(['--jsqr', '--zxing', '--zxing-wasm', '--ausgabe', '--fall', '--nur-geruest']);
  const nurGeruest = argv.includes('--nur-geruest');
  argv = argv.filter((a) => a !== '--nur-geruest');
  const fall = FAELLE[_arg(argv, '--fall') || 'alle'];
  if (!fall) throw new Error('--fall alle|kern-zettel');
  const nutzlasten = fall.nutzlasten ? NUTZLASTEN.filter((n) => fall.nutzlasten.includes(n.name)) : NUTZLASTEN;
  for (let i = 0; i < argv.length; i += 2) if (!bekannt.has(argv[i])) throw new Error('unbekanntes Flag ' + argv[i]);
  const jsqr = _arg(argv, '--jsqr'); const zx = _arg(argv, '--zxing'); const zxw = _arg(argv, '--zxing-wasm');
  if (!jsqr && !zx && !nurGeruest) throw new Error('mindestens --jsqr oder --zxing angeben (Pfade zu den Decodern, außerhalb des Repos) — oder --nur-geruest');
  const decoder = [];
  const browser = await pw.chromium.launch();
  const netz = [];
  try {
    const page = await browser.newPage();
    page.on('request', (q) => { if (!q.url().startsWith('data:') && q.url() !== 'about:blank') netz.push(q.url()); });
    await page.setContent(opt.ohneCsp ? SEITE.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '') : SEITE);
    await page.addScriptTag({ content: qrBlock() });
    if (jsqr) { await page.addScriptTag({ content: fs.readFileSync(jsqr, 'utf8') }); decoder.push('jsqr'); }
    if (zx) {
      if (!zxw) throw new Error('--zxing braucht --zxing-wasm (die .wasm wird eingebettet übergeben, nie nachgeladen)');
      await page.addScriptTag({ content: fs.readFileSync(zx, 'utf8') });
      await page.evaluate(async (b64) => {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        await window.ZXingWASM.prepareZXingModule({ overrides: { wasmBinary: bin.buffer }, fireImmediately: true });
      }, fs.readFileSync(zxw).toString('base64'));
      decoder.push('zxing');
    }
    await page.addScriptTag({ content: '(' + seitenCode.toString() + ')()' });
    if (opt.zusatzSkript) await page.addScriptTag({ content: opt.zusatzSkript });
    if (opt.zusatzSkript) await page.waitForTimeout(300);
    const zeilen = await page.evaluate(([a, b, c, d, e, f, g]) => window.korpus(a, b, c, d, e, f, g), [nutzlasten, fall.px, fall.blur, LICHT, fall.rauschen, fall.lage, decoder]);
    const summe = {};
    for (const d of decoder) {
      const je = {};
      for (const z of zeilen) { const k = z.nutzlast + ' @' + z.px + 'px'; je[k] = je[k] || { gelesen: 0, von: 0, msMax: 0 }; je[k].von++; if (z[d].ok) je[k].gelesen++; je[k].msMax = Math.max(je[k].msMax, z[d].ms); }
      summe[d] = { gelesen: zeilen.filter((z) => z[d].ok).length, von: zeilen.length, msMedian: median(zeilen.map((z) => z[d].ms)), jeNutzlastUndAufloesung: je };
    }
    const ergebnis = { werkzeug: 'tools/qr-decoder-korpus-messen.js', fall: _arg(argv, '--fall') || 'alle', chromium: browser.version(), decoder, netzaufrufe: netz, summe, nutzlasten: NUTZLASTEN, zeilen };
    const text = JSON.stringify(ergebnis, null, 1) + '\n';
    const aus = _arg(argv, '--ausgabe');
    if (aus) fs.writeFileSync(aus, text); else process.stdout.write(text);
    return ergebnis;
  } finally { await browser.close(); }
}
function median(a) { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; }

module.exports = { main, NUTZLASTEN };
if (require.main === module) main(process.argv.slice(2)).catch((e) => { console.error('FEHLER:', e.message); process.exitCode = 1; });
