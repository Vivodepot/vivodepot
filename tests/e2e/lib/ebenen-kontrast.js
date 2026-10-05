'use strict';
/* Ebenen-Finder: Schrift und Feldrand in Hell, Nacht und Hochkontrast, in Ruhe und in jedem Zustand (Befund 04.10.2026)
   ─────────────────────────────────────────────────────────────────
   Gemessen wird im Browser, am berechneten Stil — nicht aus dem Quelltext: nur so zählt die Kaskade (ein Nacht-Wert, der eine
   Grundregel überstimmt, ein Hover, der die Fläche heller macht, ein Verweis ohne eigene Regel).
   REGEL: Schrift ≥ 4,5:1 gegen den zusammengesetzten Grund; ein Eingabefeld braucht Rand oder Fläche ≥ 3:1 gegen seinen Grund
   (WCAG 1.4.11). Ein Element ohne Text und ohne Feldrolle wird nicht geprüft (Punkte, Balken, Schleier tragen keine Schrift) —
   ein Element MIT Text fällt nie heraus (Rot-Beweis: tests/e2e/ebenen-kontrast.spec.js).
   ZUSTÄNDE: Ruhe; :hover, :focus-visible, :active je Bedienelement über das Entwicklerprotokoll des Browsers erzwungen
   (CSS.forcePseudoState); [aria-invalid]; :disabled steht, wo es im Dokument vorkommt, in der Ruhe-Messung. */
const INTERAKTIV = 'button,a[href],input,select,textarea,summary,[role=button],[role=menuitem],[role=tab],[tabindex]:not([tabindex="-1"])';

/* Läuft IM Browser. Liefert die Funde der Seite im aktuellen Zustand; `nurIndex` misst ein markiertes Bedienelement. */
function messenImBrowser(nurIndex) {
  const roh = (s) => {
    const m = String(s).match(/^rgba?\(([^)]+)\)$/);
    if (m) { const a = m[1].split(/[ ,/]+/).map(Number); return { r: a[0], g: a[1], b: a[2], a: a[3] == null ? 1 : a[3] }; }
    const c = String(s).match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
    if (c) return { r: c[1] * 255, g: c[2] * 255, b: c[3] * 255, a: c[4] == null ? 1 : +c[4] };
    // jede andere Form (oklch, lab, …): die Zeichenfläche des Browsers rechnet nach sRGB
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const x = cv.getContext('2d', { willReadFrequently: true });
    x.clearRect(0, 0, 1, 1); x.fillStyle = s; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ueber = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const grund = (e0) => {
    const kette = [];
    for (let x = e0; x; x = x.parentElement) { const c = roh(getComputedStyle(x).backgroundColor); if (c.a > 0) { kette.push(c); if (c.a >= 0.99) break; } }
    let b = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = kette.length - 1; i >= 0; i--) b = ueber(kette[i], b);
    return b;
  };
  const verh = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const sichtbar = (e) => {
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
    for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.1) return false; }
    return true;
  };
  const name = (e) => (e.id ? '#' + e.id : '') + '.' + [...e.classList].join('.') + ' ' + e.tagName.toLowerCase();
  // Schwellen: ohne Vorgabe 4,5 (Schrift) und 3 (Feld); window.__ebenenSchwelle (Berichtslauf) hebt beide, um jeden Wert auszugeben.
  const schwelle = typeof window.__ebenenSchwelle === 'number' ? window.__ebenenSchwelle : null;
  const funde = [];
  const pruefe = (e) => {
    const cs = getComputedStyle(e);
    const feld = /^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !['checkbox', 'radio', 'hidden', 'file', 'range', 'color'].includes(e.type);
    const text = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const g = grund(e);
    if (text || feld) {
      const f = ueber(roh(cs.color), g);
      const r = verh(f, g);
      if (r < (schwelle || 4.5)) funde.push({ art: 'schrift', sel: name(e), r: Math.round(r * 100) / 100, t: (e.textContent || e.value || '').trim().slice(0, 24) });
    }
    if (feld) {
      // Rand oder Fläche des Felds gegen seinen Grund (der Grund OHNE die eigene Fläche)
      const eltern = e.parentElement ? grund(e.parentElement) : g;
      const flaeche = ueber(roh(cs.backgroundColor), eltern);
      const rand = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' ? ueber(roh(cs.borderTopColor), eltern) : null;
      const best = Math.max(verh(flaeche, eltern), rand ? verh(rand, eltern) : 0);
      if (best < (schwelle || 3)) funde.push({ art: 'rand', sel: name(e), r: Math.round(best * 100) / 100, t: (e.placeholder || e.type || '').slice(0, 24) });
    }
  };
  if (nurIndex != null) { const e = document.querySelector('[data-vdf="' + nurIndex + '"]'); if (e) pruefe(e); return funde; }
  for (const e of document.querySelectorAll('body *')) if (sichtbar(e)) pruefe(e);
  return funde;
}

/* Alle Zustände der Bedienelemente der aktuellen Seite. Rückgabe: Funde mit `z` (Ruhe wird von messenImBrowser gedeckt). */
async function zustaende(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const n = await page.evaluate((sel) => {
    document.querySelectorAll('[data-vdf]').forEach((e) => e.removeAttribute('data-vdf'));
    let i = 0;
    for (const e of document.querySelectorAll(sel)) {
      const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      let ok = true; for (let x = e; x; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === 'none' || s.visibility === 'hidden') ok = false; }
      if (ok) e.setAttribute('data-vdf', String(i++));
    }
    return i;
  }, INTERAKTIV);
  const funde = [];
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  for (let i = 0; i < n; i++) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-vdf="' + i + '"]' });
    if (!nodeId) continue;
    for (const z of ['hover', 'focus-visible', 'active']) {
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: z === 'focus-visible' ? ['focus', 'focus-visible'] : [z] });
      for (const f of await page.evaluate(messenImBrowser, i)) funde.push({ ...f, z });
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    }
    // [aria-invalid] an Feldern
    const feldInvalid = await page.evaluate((k) => {
      const e = document.querySelector('[data-vdf="' + k + '"]');
      if (!e || !/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) || e.getAttribute('aria-invalid')) return false;
      e.setAttribute('aria-invalid', 'true'); return true;
    }, i);
    if (feldInvalid) {
      for (const f of await page.evaluate(messenImBrowser, i)) funde.push({ ...f, z: 'aria-invalid' });
      await page.evaluate((k) => document.querySelector('[data-vdf="' + k + '"]').removeAttribute('aria-invalid'), i);
    }
  }
  await cdp.detach();
  return funde;
}

/* Die Ebenen wie die Bürgerin sie schaltet: Knopf Nacht (#tb-nacht), Knopf Kontrast (#tb-kontrast). */
const EBENEN = [
  { name: 'hell', an: null },
  { name: 'nacht', an: '#tb-nacht' },
  { name: 'hochkontrast', an: '#tb-kontrast' },
];
async function ebeneSchalten(page, e, an) {
  if (e.an) await page.evaluate((s) => document.querySelector(s).click(), e.an);
  await page.waitForTimeout(250);
  const r = await an();
  if (e.an) await page.evaluate((s) => document.querySelector(s).click(), e.an);
  return r;
}

/* Eine Ansicht in allen drei Ebenen: Ruhe + Zustände. Ergebnis: eindeutige Funde „ebene · zustand · art · selektor · wert". */
async function ansichtPruefen(page, { mitZustaenden = true } = {}) {
  // Berichtslauf (nicht in der Suite): EBENEN_SCHWELLE=99 gibt jeden gemessenen Wert aus, EBENEN_AUSGABE=<Datei> sammelt sie.
  if (process.env.EBENEN_SCHWELLE) await page.evaluate((v) => { window.__ebenenSchwelle = v; }, Number(process.env.EBENEN_SCHWELLE));
  const alle = new Map();
  for (const e of EBENEN) {
    await ebeneSchalten(page, e, async () => {
      const ruhe = await page.evaluate(messenImBrowser, null);
      const z = mitZustaenden ? await zustaende(page) : [];
      for (const f of [...ruhe.map((x) => ({ ...x, z: 'ruhe' })), ...z]) {
        const k = [e.name, f.z, f.art, f.sel].join(' · ');
        if (!alle.has(k)) alle.set(k, k + ' · ' + f.r + ' · „' + f.t + '"');
      }
    });
  }
  if (process.env.EBENEN_AUSGABE) require('node:fs').appendFileSync(process.env.EBENEN_AUSGABE, [...alle.values()].join('\n') + '\n');
  return [...alle.values()];
}

module.exports = { INTERAKTIV, messenImBrowser, zustaende, ansichtPruefen, EBENEN, ebeneSchalten };
