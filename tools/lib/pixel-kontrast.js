'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   pixel-kontrast.js — Text-Kontrast am gerenderten Bild (U2-ADR-473 W6, 05.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   axe rechnet den Kontrast aus dem CSS und legt Stellen, deren Hintergrund es nicht bestimmen kann (Glas, Verlauf, halb durchsichtige
   Flächen), als „incomplete“ ab, nicht als Verstoß. So blieb in v918 die Leisten-Unterzeile im Sub-Depot mit 3,65:1 unbemerkt
   (Befund SUBDEPOT-LEISTE-UNTERZEILE-KONTRAST). Diese Messung rechnet gegen das Bild.

   MESSART (dieselbe wie die Lesbarkeits-Probe der Website): alle Texte unsichtbar machen, das Bild aufnehmen, je Textrechteck die
   Schriftfarbe gegen jedes Pixel dahinter rechnen; maßgeblich ist das 1-%-Perzentil der Werte (gegen Kantenglättung robust, gegen
   ungünstige Stellen eines Verlaufs nicht blind). Grenze 4,5:1, große Schrift (ab 24 px oder ab 18,66 px fett) 3:1 (WCAG 1.4.3).

   AUSNAHME, nur diese: ein Text unter aria-hidden OHNE Buchstabe oder Ziffer (Schmuckzeichen wie ▾); für ihn gilt 1.4.11, nicht 1.4.3.
   Ein aria-hidden-Element mit lesbarem Text bleibt geprüft.

   Die beiden Funktionen SAMMELN und AUSWERTEN laufen im Browser (page.evaluate), der Rest in Node.
   ═══════════════════════════════════════════════════════════════════════════════════════════════ */

const GRENZE = Object.freeze({ normal: 4.5, gross: 3 });

// Im Browser: je sichtbarem Textknoten im Bildausschnitt Farbe, Größe, Rechteck und Ort.
function SAMMELN() {
  const lesbar = /[\p{L}\p{N}]/u;
  // Jede Farbschreibweise (rgb(), color(srgb 0–1) aus color-mix, oklch …) über eine 1×1-Fläche in 0–255 umrechnen.
  const fl = document.createElement('canvas'); fl.width = fl.height = 1; const fx = fl.getContext('2d', { willReadFrequently: true });
  const rgba = (farbe) => { fx.clearRect(0, 0, 1, 1); fx.fillStyle = '#000'; fx.fillStyle = farbe; fx.fillRect(0, 0, 1, 1); const d = fx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const aus = [];
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (tw.nextNode()) {
    const n = tw.currentNode; const text = n.textContent.trim(); if (!text) continue;
    const el = n.parentElement; if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    if (el.closest('[aria-hidden="true"]') && !lesbar.test(text)) continue;   // Schmuckzeichen: 1.4.11, nicht 1.4.3
    const r = document.createRange(); r.selectNodeContents(n);
    for (const b of r.getClientRects()) {
      if (b.width < 2 || b.height < 2 || b.bottom <= 0 || b.top >= innerHeight || b.right <= 0 || b.left >= innerWidth) continue;
      // Nur die Punkte, an denen der Text oben liegt (ein Hinweis, eine feste Leiste kann einen Teil verdecken): Raster alle 2 px.
      const punkte = [];
      for (let y = Math.max(0, b.top) + 1; y < Math.min(innerHeight, b.bottom); y += 2) {
        for (let x = Math.max(0, b.left) + 1; x < Math.min(innerWidth, b.right); x += 2) {
          const oben = document.elementFromPoint(x, y);
          if (oben && (el === oben || el.contains(oben) || oben.contains(el))) punkte.push(Math.round(x), Math.round(y));
        }
      }
      if (punkte.length < 8) continue;   // praktisch ganz verdeckt: nicht sichtbar, nicht gemessen
      const m = rgba(cs.color);
      let alpha = m[3];
      for (let v = el; v; v = v.parentElement) alpha *= Number(getComputedStyle(v).opacity);
      const groesse = parseFloat(cs.fontSize), gewicht = Number(cs.fontWeight) || 400;
      const ort = (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : el.tagName.toLowerCase());
      aus.push({ text: text.slice(0, 40), ort, x: Math.max(0, b.left), y: Math.max(0, b.top), w: Math.min(b.width, innerWidth - b.left), h: Math.min(b.height, innerHeight - b.top),
        punkte, farbe: m.slice(0, 3), alpha, gross: groesse >= 24 || (groesse >= 18.66 && gewicht >= 700) });
    }
  }
  return aus;
}

// Im Browser: [bildBase64, stellen, grenze] → je Stelle das 1-%-Perzentil des Kontrasts gegen die Pixel hinter dem Text.
async function AUSWERTEN([bild, stellen, grenze]) {
  const img = new Image(); img.src = 'data:image/png;base64,' + bild; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const sx = img.width / innerWidth, sy = img.height / innerHeight;
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  const aus = [];
  for (const s of stellen) {
    const x = Math.round(s.x * sx), y = Math.round(s.y * sy), w = Math.max(1, Math.round(s.w * sx)), h = Math.max(1, Math.round(s.h * sy));
    const bw = Math.min(w, img.width - x), bh = Math.min(h, img.height - y);
    const d = g.getImageData(x, y, bw, bh).data;
    const werte = [];
    for (let j = 0; j < s.punkte.length; j += 2) {
      const px = Math.round(s.punkte[j] * sx) - x, py = Math.round(s.punkte[j + 1] * sy) - y;
      if (px < 0 || py < 0 || px >= bw || py >= bh) continue;
      const i = (py * bw + px) * 4;
      const p = [d[i], d[i + 1], d[i + 2]];
      const t = s.farbe.map((f, j) => s.alpha * f + (1 - s.alpha) * p[j]);
      const a = L(...t), b = L(...p);
      werte.push((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
    }
    werte.sort((p, q) => p - q);
    const k = werte.length ? werte[Math.floor(werte.length * 0.01)] : 21;
    const soll = s.gross ? grenze.gross : grenze.normal;
    aus.push({ text: s.text, ort: s.ort, k: Math.round(k * 100) / 100, soll, unter: k < soll });
  }
  return aus;
}

/* In Node, mit einer Playwright-Seite: misst den aktuellen Bildausschnitt. Ergebnis { stellen, unter: [...] }. */
async function messen(page) {
  // Erst messen, wenn kein Übergang mehr läuft: mitten im Farbwechsel (Nacht, Hochkontrast, Sub-Depot) stünde Schrift und Grund noch halb.
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))), new Promise((r) => setTimeout(r, 3000))]));
  await page.waitForTimeout(150);
  const stellen = await page.evaluate(SAMMELN);
  // Texte unsichtbar über ein konstruiertes Stylesheet (CSSOM): ein eingefügtes <style> würde die CSP des Produkts still verwerfen,
  // dann bliebe der Text im Bild und die Messung verglich die Schrift mit sich selbst.
  await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}::placeholder{color:transparent!important}'); window.__pkBlatt = s; document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
  await page.waitForTimeout(120);
  const bild = (await page.screenshot()).toString('base64');
  if (process.env.VD_PK_DEBUG) { const fs = require('node:fs'); const n = Date.now(); fs.writeFileSync(require('node:path').join(process.env.VD_PK_DEBUG, n + '.png'), Buffer.from(bild, 'base64')); fs.writeFileSync(require('node:path').join(process.env.VD_PK_DEBUG, n + '.json'), JSON.stringify(stellen.slice(0, 400))); }
  await page.evaluate(() => { document.adoptedStyleSheets = document.adoptedStyleSheets.filter((x) => x !== window.__pkBlatt); });
  const werte = await page.evaluate(AUSWERTEN, [bild, stellen, GRENZE]);
  return { stellen: werte.length, unter: werte.filter((w) => w.unter), min: werte.reduce((m, w) => Math.min(m, w.k), 21) };
}


/* Abgleich mit der Ausnahmeliste (tests/e2e/fixtures/pixel-kontrast-grundlinie.json): je Eintrag Befund, Sicht (Ansicht:Farbe/Modus), Element (ort) und
   Text, konkret, kein Muster. Ergebnis { neu: Funde ohne Eintrag, luft: Einträge ohne Fund } — beide machen die Probe rot. */
function abgleichen(funde, bekannt) {
  const passt = (f, b) => f.ansicht === b.sicht && f.ort === b.ort && f.text === b.text;
  return { neu: funde.filter((f) => !bekannt.some((b) => passt(f, b))), luft: bekannt.filter((b) => !funde.some((f) => passt(f, b))) };
}

module.exports = { GRENZE, SAMMELN, AUSWERTEN, messen, abgleichen };
