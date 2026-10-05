#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ruhe-messen.js — wie voll ist ein Bildschirm? Sechs Zahlen statt eines Eindrucks (03.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   WOZU. Ob eine Design-Fassung ruhiger ist als die vorige, soll eine Zahl sagen, nicht ein Eindruck
   („zu voll“, „unruhig“). Das Werkzeug zählt im
   SICHTBAREN Bereich (Viewport), je Bildschirm und Breite:

     1 flaechen        Elemente mit eigener deckender Hintergrundfarbe (Alpha ≥ 0,1), die von der
                       des nächsten gefüllten Vorfahren abweicht — eine Fläche, die man sieht
     2 rahmen          Elemente mit sichtbarer Kontur: eine Seite border ≥ 1px (Stil nicht none/hidden,
                       Farbe nicht durchsichtig) oder ein box-shadow
     3 schriftgroessen verschiedene font-size über alle sichtbaren Textknoten (auf 0,5px gerundet)
     4 schriftstaerken verschiedene font-weight darüber
     5 textfarben      verschiedene color darüber
     6 akzentflaechen  Flächen aus 1 in der Akzentfarbe (--vd-branding-primaer am <html>, Alpha ≥ 0,5;
                       eine blasse Tönung ist keine Akzentfläche). Fehlt die Variable: null, nicht 0.
     7 hintergrundfarben verschiedene Farben der Flächen aus 1 (mit Deckkraft) — Farbvielfalt statt Zahl
     8 eckenradien     verschiedene Eckenradien an Flächen und Rahmen, außer 0; ein Radius ab der halben
                       kürzeren Kante zählt als „rund“ (Pille), egal wie viele px
     9 kleineflaechen  Flächen oder Rahmen unter 48 px Höhe — viele kleine, abgesetzte Teile
    10 knopfartig      was wie ein Knopf aussieht: Fläche oder Rahmen, unter 48 px hoch, höchstens 240 px
                       breit, mit Eckenradius und mit Text darin (Pillen, Chips, kleine Knöpfe)
   Die Maße 7–10 kamen am 03.10.2026 dazu: die ersten sechs fanden eine Fassung ruhiger, die als
   „zu voll, wie Bausteine“ empfunden wurde. Gezählt wird Vielfalt und Kleinteiligkeit, nicht nur Menge.

   KEIN GRENZWERT, KEIN GATE (Entscheidung 03.10.2026): das Werkzeug urteilt nicht, Exit 0 bei jeder Zahl.
   Es gehört in den Messbericht einer Design-Runde, „heute gegen A“ über --vergleich.

   ZWEI TEILE, damit die Zählung ohne Browser prüfbar ist:
     sammeln()   läuft IN der Seite und liefert nur Rohwerte (Stile als Zeichenketten), keine Zählung
     auswerten() zählt in Node aus diesen Datensätzen — rein, Probe tests/ruhe-messen.test.js
   Die Seitenfunktion prüft tests/e2e/ruhe-messen.spec.js an zwei HTML-Fixtures im echten Chromium.

   Aufruf:
     node tools/ruhe-messen.js --datei <html> [--vergleich <html>] [--json]
     node tools/ruhe-messen.js                       → gegen die Fixtures tests/fixtures/ruhe-messen/
   Bildschirme: „start“ (Willkommen) und „depot“ (frisch angelegt, Identität & Person), je 390×844
   und 1280×800. Ohne Chromium: Meldung und Exit 2 — kein stilles Weiterlaufen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const REPO = path.join(__dirname, '..');
const FIXTURES = path.join(REPO, 'tests', 'fixtures', 'ruhe-messen');
const BREITEN = [{ name: '390', width: 390, height: 844 }, { name: '1280', width: 1280, height: 800 }];
const MASSE = ['flaechen', 'rahmen', 'schriftgroessen', 'schriftstaerken', 'textfarben', 'akzentflaechen',
  'hintergrundfarben', 'eckenradien', 'kleineflaechen', 'knopfartig'];
const PW = 'ruhe-messen-2026';

/* ── IN DER SEITE ──────────────────────────────────────────────────────────
   Muss für sich stehen (Playwright serialisiert die Funktion): keine Bezüge nach außen. */
function sammeln() {
  const vh = window.innerHeight, vw = window.innerWidth;
  const sichtbar = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.right <= 0 || r.top >= vh || r.left >= vw) return false;
    if (typeof el.checkVisibility === 'function') return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0;
  };
  const alpha = (farbe) => {
    const m = /rgba?\(([^)]+)\)/.exec(farbe);
    if (m) { const t = m[1].split(/[,\s/]+/).filter(Boolean); return t.length > 3 ? parseFloat(t[3]) : 1; }
    const c = /color\([^)]*\/\s*([\d.]+)\)/.exec(farbe);
    if (c) return parseFloat(c[1]);
    return farbe === 'transparent' ? 0 : 1;
  };
  const elemente = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!sichtbar(el)) continue;
    const cs = getComputedStyle(el);
    let v = el.parentElement, hgVorfahr = null;
    while (v) { const h = getComputedStyle(v).backgroundColor; if (alpha(h) >= 0.1) { hgVorfahr = h; break; } v = v.parentElement; }
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const r = el.getBoundingClientRect();
    elemente.push({
      breite: Math.round(r.width), hoehe: Math.round(r.height), radius: cs.borderTopLeftRadius,
      innenText: !!(el.innerText && el.innerText.trim()),
      tag: el.tagName.toLowerCase(),
      hg: cs.backgroundColor, hgVorfahr,
      rahmen: ['Top', 'Right', 'Bottom', 'Left'].map((s) => [cs['border' + s + 'Width'], cs['border' + s + 'Style'], cs['border' + s + 'Color']]),
      schatten: cs.boxShadow,
      text, fs: text ? cs.fontSize : null, fw: text ? cs.fontWeight : null, farbe: text ? cs.color : null,
    });
  }
  const akzent = getComputedStyle(document.documentElement).getPropertyValue('--vd-branding-primaer').trim() || null;
  return { akzent, breite: vw, hoehe: vh, elemente };
}

/* ── IN NODE ─────────────────────────────────────────────────────────────── */
// Farbe → [r, g, b, a] mit r,g,b in 0..255; null, wenn unlesbar.
function farbeLesen(s) {
  if (s == null) return null;
  const t = String(s).trim().toLowerCase();
  if (t === 'transparent') return [0, 0, 0, 0];
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1);
  }
  m = /^rgba?\(([^)]+)\)$/.exec(t);
  if (m) {
    const z = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    return [z[0], z[1], z[2], z.length > 3 ? z[3] : 1];
  }
  m = /^color\(srgb\s+([^)]+)\)$/.exec(t);
  if (m) {
    const z = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
    return [z[0] * 255, z[1] * 255, z[2] * 255, z.length > 3 ? z[3] : 1];
  }
  return null;
}
const gleichRgb = (a, b) => !!a && !!b && [0, 1, 2].every((i) => Math.abs(a[i] - b[i]) < 1);
const schluessel = (f) => (f ? f.slice(0, 3).map(Math.round).join(',') + '/' + Math.round(f[3] * 100) : 'unlesbar');

// Eckenradius → Schlüssel: null bei 0, „rund“ ab der halben kürzeren Kante, sonst die gerundeten px.
function radiusSchluessel(e) {
  const px = parseFloat(e.radius);
  if (!(px > 0)) return null;
  const kante = Math.min(e.breite || Infinity, e.hoehe || Infinity);
  return px >= kante / 2 ? 'rund' : Math.round(px) + 'px';
}
function istFlaeche(e) {
  const hg = farbeLesen(e.hg);
  if (!hg || hg[3] < 0.1) return false;
  const vorfahr = farbeLesen(e.hgVorfahr);
  return !(vorfahr && gleichRgb(hg, vorfahr) && Math.abs(hg[3] - vorfahr[3]) < 0.05);
}
function hatRahmen(e) {
  const seite = ([breite, stil, farbe]) => parseFloat(breite) >= 1 && stil !== 'none' && stil !== 'hidden'
    && (farbeLesen(farbe) || [0, 0, 0, 1])[3] > 0;
  return (e.rahmen || []).some(seite) || (e.schatten != null && e.schatten !== 'none' && e.schatten !== '');
}

function auswerten(daten, { akzent = daten && daten.akzent } = {}) {
  const elemente = (daten && daten.elemente) || [];
  const akz = farbeLesen(akzent);
  const groessen = new Set(), staerken = new Set(), farben = new Set();
  const hgFarben = new Set(), radien = new Set();
  let flaechen = 0, rahmen = 0, akzentflaechen = 0, kleineflaechen = 0, knopfartig = 0;
  for (const e of elemente) {
    const fl = istFlaeche(e), ra = hatRahmen(e);
    if (fl) {
      flaechen++;
      const hg = farbeLesen(e.hg);
      hgFarben.add(schluessel(hg));
      if (akz && hg[3] >= 0.5 && gleichRgb(hg, akz)) akzentflaechen++;
    }
    if (ra) rahmen++;
    if (fl || ra) {
      const rad = radiusSchluessel(e);
      if (rad) radien.add(rad);
      const klein = typeof e.hoehe === 'number' && e.hoehe < 48;
      if (klein) kleineflaechen++;
      if (klein && e.breite <= 240 && rad && e.innenText) knopfartig++;
    }
    if (e.text) {
      if (e.fs) groessen.add(Math.round(parseFloat(e.fs) * 2) / 2);
      if (e.fw) staerken.add(String(e.fw));
      if (e.farbe) farben.add(schluessel(farbeLesen(e.farbe)));
    }
  }
  return {
    flaechen, rahmen,
    schriftgroessen: groessen.size, schriftstaerken: staerken.size, textfarben: farben.size,
    akzentflaechen: akz ? akzentflaechen : null,
    hintergrundfarben: hgFarben.size, eckenradien: radien.size, kleineflaechen, knopfartig,
  };
}

/* ── IM BROWSER MESSEN ───────────────────────────────────────────────────── */
function chromiumLaden() {
  try { return require(path.join(REPO, 'node_modules', 'playwright')).chromium; } catch { return null; }
}

async function bildschirmMessen(browser, datei, bildschirm, breite) {
  const helpers = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
  const ctx = await browser.newContext({ viewport: { width: breite.width, height: breite.height } });
  const page = await ctx.newPage();
  try {
    await helpers.oeffneApp(page, { url: pathToFileURL(datei).href });
    if (bildschirm === 'depot') {
      await helpers.depotAnlegen(page, { name: 'Erna Probe', pw: PW });
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.waitForTimeout(300);
    return { ...auswerten(await page.evaluate(sammeln)), fehler: null };
  } catch (e) {
    return { fehler: String(e && e.message || e).split('\n')[0] };
  } finally {
    await ctx.close();
  }
}

// Eine Datei ohne App (#w-anlass) wird nur als Seite gemessen: ein Bildschirm „seite“.
async function dateiMessen(browser, datei) {
  const istApp = /id=["']w-anlass["']/.test(fs.readFileSync(datei, 'utf8'));
  const ergebnis = {};
  for (const breite of BREITEN) {
    if (!istApp) {
      const ctx = await browser.newContext({ viewport: { width: breite.width, height: breite.height } });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(datei).href);
      ergebnis['seite@' + breite.name] = { ...auswerten(await page.evaluate(sammeln)), fehler: null };
      await ctx.close();
      continue;
    }
    for (const b of ['start', 'depot']) ergebnis[b + '@' + breite.name] = await bildschirmMessen(browser, datei, b, breite);
  }
  return ergebnis;
}

function tabelle(a, b, namen) {
  const zeilen = [];
  const kopf = ['Bildschirm', ...MASSE];
  zeilen.push('| ' + kopf.join(' | ') + ' |', '|' + kopf.map(() => '---').join('|') + '|');
  for (const k of Object.keys(a)) {
    const z = (m) => {
      const x = a[k][m], y = b && b[k] ? b[k][m] : undefined;
      const f = (v) => (v === null || v === undefined ? '—' : String(v));
      return b ? f(x) + ' → ' + f(y) : f(x);
    };
    if (a[k].fehler || (b && b[k] && b[k].fehler)) { zeilen.push('| ' + k + ' | Fehler: ' + (a[k].fehler || b[k].fehler) + ' |'); continue; }
    zeilen.push('| ' + k + ' | ' + MASSE.map(z).join(' | ') + ' |');
  }
  return (b ? namen[0] + ' → ' + namen[1] + '\n' : namen[0] + '\n') + zeilen.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  const wert = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  let datei = wert('datei') && path.resolve(wert('datei'));
  let vergleich = wert('vergleich') && path.resolve(wert('vergleich'));
  if (!datei) { datei = path.join(FIXTURES, 'ruhig.html'); vergleich = path.join(FIXTURES, 'voll.html'); }
  for (const d of [datei, vergleich].filter(Boolean)) {
    if (!fs.existsSync(d)) { console.error('[ruhe-messen] Datei fehlt: ' + d); process.exitCode = 2; return; }
  }
  const chromium = chromiumLaden();
  if (!chromium) { console.error('[ruhe-messen] Chromium fehlt (node_modules/playwright) — nichts gemessen.'); process.exitCode = 2; return; }
  const browser = await chromium.launch();
  try {
    const a = await dateiMessen(browser, datei);
    const b = vergleich ? await dateiMessen(browser, vergleich) : null;
    if (argv.includes('--json')) console.log(JSON.stringify({ datei, vergleich: vergleich || null, a, b }, null, 2));
    else console.log(tabelle(a, b, [path.basename(datei), vergleich ? path.basename(vergleich) : '']));
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 2; });
module.exports = { sammeln, auswerten, farbeLesen, istFlaeche, hatRahmen, radiusSchluessel, MASSE, BREITEN };
