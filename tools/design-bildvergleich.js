#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   design-bildvergleich.js — Bildvergleich zweier Kern-Fassungen, Ansicht für
   Ansicht (U2-ADR-473: „v894–v896 lassen Vivodepot ab Werk pixelgleich").
   ────────────────────────────────────────────────────────────────────────────
   Keine gespeicherten Grundbilder: die werden plattformabhängig (macOS ≠ Linux)
   und veralten mit jeder gewollten Änderung. Stattdessen rendert das Werkzeug
   die alte Fassung (aus einem Git-Ref) und die neue (Arbeitsbaum) im selben
   Browser, mit derselben Klickfolge und eingefrorener Uhr, und vergleicht die
   Pixel im Browser-Canvas. Gleiche Umgebung, gleicher Zeitpunkt — was abweicht,
   kommt aus dem Kern.

   Je Sprache (privat-de, privat-en) und Gerät (Desktop 1280, Handy 390):
     start · uebersicht · navigation · bereich · bereich-nacht · bereich-kontrast ·
     einstellungen · einstellungen-offen · einstellungen-nacht · und die
     Hauptansichten der Seitenleiste (anlass, mappe, prueftermine, herausgegeben,
     herausgeben, einlesen, verwaltete-depots, hilfe, notfall).
   Jede Hauptansicht in einer eigenen frischen Seite mit eigenem Depot — ein
   Overlay der vorigen Ansicht kann die nächste nicht verdecken.

   Die Rückrechnung (tools/design-gleichstand.js) sieht jede Deklaration; dieses
   Werkzeug sieht das Ergebnis. Beide zusammen sind der Beleg.

   AUFRUFE (Browserlauf: nur mit geholtem Suite-Platz)
     node tools/design-bildvergleich.js --basis <git-ref> [--aus <verz>] [--gate]
            [--erlaubt <szenen-teil>]… [--nur <szenen-teil>] [--sprachen de,en] [--geraete desktop,handy]
     node tools/design-bildvergleich.js --basis-datei <kern.html> [--nachher <kern.html>] …   wie --basis, Vorher aus einer Datei
     node tools/design-bildvergleich.js --vorher <a.html> --nachher <b.html>   (eine Szene „seite", ohne Depot)
     node tools/design-bildvergleich.js --gegenprobe <git-ref|arbeitsbaum> [--gate]   eine Fassung gegen sich selbst (Werkzeug-Ruhe)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');

const GERAETE = {
  desktop: { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  handy: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};
const UHR = new Date('2026-10-02T10:00:00+02:00');

const HAUPTANSICHTEN = [
  ['anlass', '[data-anlass-auswahl]'], ['mappe', '[data-mappe]'], ['prueftermine', '[data-prueftermine]'],
  ['herausgegeben', '[data-uebergabe-protokoll]'], ['herausgeben', '[data-weitergeben-zentral]'],
  ['einlesen', '[data-einlesen-zentral]'], ['verwaltete-depots', '[data-verwaltete-depots]'],
  ['hilfe', '[data-hilfe]'], ['notfall', '[data-notfall]'],
];

/* ── Vergleich zweier PNG im Browser: Zahl der abweichenden Pixel, Rahmen, Differenzbild ── */
async function pixelVergleich(seite, a, b) {
  return seite.evaluate(async ({ a, b }) => {
    const lade = (src) => new Promise((ok, f) => { const i = new Image(); i.onload = () => ok(i); i.onerror = f; i.src = src; });
    const [ia, ib] = await Promise.all([lade('data:image/png;base64,' + a), lade('data:image/png;base64,' + b)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const leinwand = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = leinwand(ia), db = leinwand(ib);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    const aus = x.createImageData(w, h);
    let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0; i < da.length; i += 4) {
      const gleich = da[i] === db[i] && da[i + 1] === db[i + 1] && da[i + 2] === db[i + 2] && da[i + 3] === db[i + 3];
      const p = i / 4, px = p % w, py = (p / w) | 0;
      if (gleich) { aus.data[i] = da[i]; aus.data[i + 1] = da[i + 1]; aus.data[i + 2] = da[i + 2]; aus.data[i + 3] = 60; continue; }
      n++; aus.data[i] = 255; aus.data[i + 3] = 255;
      if (px < x0) x0 = px; if (py < y0) y0 = py; if (px > x1) x1 = px; if (py > y1) y1 = py;
    }
    x.putImageData(aus, 0, 0);
    return { pixel: n, groesseA: [ia.width, ia.height], groesseB: [ib.width, ib.height],
      rahmen: n ? [x0, y0, x1, y1] : null, diff: n ? c.toDataURL('image/png').split(',')[1] : null };
  }, { a, b });
}

/* Eine STABILE Aufnahme (Befund aus v898, 02.10.2026: Abweichungen wechselten zwischen den Läufen). Vor dem Bild: Schriften
   geladen (document.fonts.ready), Transitions und Animationen aus (auch die, die `animations: 'disabled'` nicht fängt), zwei
   Bildschirm-Takte Ruhe. Dann so lange aufnehmen, bis zwei Bilder hintereinander byte-gleich sind (höchstens fünfmal) — ein
   Bild, das sich noch bewegt, ist kein Beleg. Gelingt das nicht, wirft es: „instabil" ist ein Befund, keine Zahl. */
// Der Toast-Host (#toast-host) trägt flüchtige Meldungen („gesichert" …), deren Erscheinen vom Zeitpunkt abhängt — in BEIDEN
// Fassungen gleich, aber je Lauf verschieden; er gehört nicht zur Gestalt einer Ansicht und wird für das Bild ausgeblendet.
const RUHE_CSS = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'
  + '#toast-host{visibility:hidden!important}';
async function bild(seite, { ganzeSeite = true } = {}) {
  await seite.addStyleTag({ content: RUHE_CSS }).catch(() => {});
  // Die Maus vom letzten Klick wegnehmen: sonst trifft sie je nach Lage ein Element im Hover-Zustand (Gegenprobe 02.10.2026:
  // dieselbe Fassung gegen sich selbst wich in der Handy-Navigation um 87 px am Suchfeld ab).
  await seite.mouse.move(0, 0).catch(() => {});
  await seite.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  });
  /* KEINE Größenänderung WÄHREND der Aufnahme (Gegenprobe v898, 02.10.2026: Fassung gegen sich selbst wich in Einstellungen,
     Handy-Bereich, Kopfzeile und Einlesen-Dialog ab). Playwrights `fullPage` zieht das Fenster für jedes Bild auf die
     Seitenhöhe und wieder zurück; der Kern reagiert auf Größenänderungen per JS (Kopfzeilen-Anpassung, Hinweis-Platz,
     Schublade), und ob ein Bild vor oder nach dieser Reaktion fiel, entschied der Zeitpunkt. Darum setzt das Werkzeug die
     Fensterhöhe SELBST auf die Inhaltshöhe, wartet, bis Höhe und Bild ruhen, und nimmt dann den sichtbaren Ausschnitt auf.
     Danach zurück auf die Gerätegröße — beide Fassungen erleben dieselbe Folge. */
  const ruhe = () => seite.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
  const geraeteGroesse = seite.viewportSize();
  if (ganzeSeite) {
    let hoehe = 0;
    for (let i = 0; i < 6; i++) {
      const h = await seite.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0));
      if (h === hoehe) break;
      hoehe = h;
      await seite.setViewportSize({ width: geraeteGroesse.width, height: Math.max(geraeteGroesse.height, hoehe) });
      await ruhe();
      await seite.waitForTimeout(100);
    }
  }
  await seite.evaluate(() => window.scrollTo(0, 0));
  await ruhe();
  const aufnahme = async () => (await seite.screenshot({ fullPage: false, animations: 'disabled', caret: 'hide' })).toString('base64');
  try {
    let vorher = await aufnahme();
    for (let i = 0; i < 5; i++) {
      await seite.waitForTimeout(100);
      const jetzt = await aufnahme();
      if (jetzt === vorher) return jetzt;
      vorher = jetzt;
    }
    throw new Error('design-bildvergleich: die Seite kommt nicht zur Ruhe (fünf Aufnahmen, keine zwei gleich) — instabil, kein Beleg.');
  } finally {
    if (ganzeSeite) { await seite.setViewportSize(geraeteGroesse); await ruhe(); }
  }
}

/* ── Die Klickfolge, für beide Fassungen dieselbe ── */
async function neueSeite(browser, geraet, url) {
  const helfer = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
  const kontext = await browser.newContext({ ...GERAETE[geraet], reducedMotion: 'reduce' });
  const seite = await kontext.newPage();
  await seite.clock.install({ time: UHR });
  await helfer.oeffneApp(seite, { url });
  return { kontext, seite, helfer };
}

async function mitDepot(browser, geraet, url) {
  const s = await neueSeite(browser, geraet, url);
  await s.helfer.depotAnlegen(s.seite, { name: 'Maria Mustermann' });
  return s;
}

async function jsKlick(seite, selektor) {
  return seite.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; }, selektor);
}

/* Liefert [[szene, png-base64 | 'fehlt']] für eine Fassung. */
async function szenenAufnehmen(browser, geraet, url, filter) {
  const raus = [];
  const will = (n) => !filter || filter.some((f) => n.includes(f));
  {
    const { kontext, seite, helfer } = await neueSeite(browser, geraet, url);
    if (will('start')) raus.push(['start', await bild(seite)]);
    await helfer.depotAnlegen(seite, { name: 'Maria Mustermann' });
    if (will('uebersicht')) raus.push(['uebersicht', await bild(seite)]);
    if (will('navigation')) {
      if (geraet === 'handy') await jsKlick(seite, '#tb-menue');
      await seite.evaluate(() => { const d = document.querySelector('details.bereiche-umschalter'); if (d) d.open = true; });
      // Nur der sichtbare Ausschnitt: die Schublade ist auf dem Handy fensterhoch. Für ein Ganzseitenbild zieht Playwright das
      // Fenster auf die Seitenhöhe (rund 5000 px), und das Suchfeld darin fiel je Lauf auf eine andere Subpixel-Lage — 87 px
      // Kantenglättung an seinen Rundungen, in beiden Fassungen gleich (Gegenprobe Fassung gegen sich selbst, 02.10.2026).
      raus.push(['navigation', await bild(seite, { ganzeSeite: geraet !== 'handy' })]);
      await seite.evaluate(() => { const d = document.querySelector('details.bereiche-umschalter'); if (d) d.open = false; });
      if (geraet === 'handy') await jsKlick(seite, '#tb-menue');
    }
    if (will('bereich')) {
      // Handy: der Seitenrand liegt in der Schublade, und die ist nach „navigation" wieder zu — für den Klick öffnen
      // (Befund v898, 02.10.2026: sonst „element is outside of the viewport", TimeoutError).
      if (geraet === 'handy') await jsKlick(seite, '#tb-menue');
      await helfer.oeffneSektor(seite, 'identity');
      if (geraet === 'handy') await seite.keyboard.press('Escape');
      raus.push(['bereich', await bild(seite)]);
      await jsKlick(seite, '#tb-nacht'); raus.push(['bereich-nacht', await bild(seite)]); await jsKlick(seite, '#tb-nacht');
      await jsKlick(seite, '#tb-kontrast'); raus.push(['bereich-kontrast', await bild(seite)]); await jsKlick(seite, '#tb-kontrast');
    }
    if (will('einstellungen')) {
      await jsKlick(seite, '#tb-einstellungen');
      await seite.waitForSelector('#modal-inhalt', { state: 'visible' });
      raus.push(['einstellungen', await bild(seite)]);
      await seite.evaluate(() => document.querySelectorAll('#modal-inhalt details.einst-abschnitt').forEach((d) => { d.open = true; }));
      raus.push(['einstellungen-offen', await bild(seite)]);
      await seite.evaluate(() => document.querySelectorAll('#modal-inhalt details.einst-abschnitt').forEach((d) => { d.open = false; }));
      await jsKlick(seite, '#tb-nacht'); raus.push(['einstellungen-nacht', await bild(seite)]); await jsKlick(seite, '#tb-nacht');
    }
    await kontext.close();
  }
  for (const [name, sel] of HAUPTANSICHTEN) {
    if (!will(name)) continue;
    const { kontext, seite } = await mitDepot(browser, geraet, url);
    const da = await jsKlick(seite, sel);
    raus.push([name, da ? await bild(seite) : 'fehlt']);
    await kontext.close();
  }
  return raus;
}

async function backen(html, slug, ziel) {
  const { testProduktText } = require(path.join(REPO, 'tests', 'produkt-test-backen.js'));
  fs.writeFileSync(ziel, testProduktText(html, { slug }));
  return 'file://' + ziel;
}

async function vergleichen({ vorherHtml, nachherHtml, aus, sprachen = ['de', 'en'], geraete = ['desktop', 'handy'], nur = null, roh = false }) {
  const { chromium } = require('playwright');
  fs.mkdirSync(aus, { recursive: true });
  // Deterministisch rastern (Befund 02.10.2026): mit GPU-Rasterung schwankte die Kantenglättung runder Ecken zwischen Läufen
  // (immer dieselbe Stelle, das Suchfeld in der Handy-Schublade, 87 px, in jedem zweiten Lauf) — Rauschen, kein Unterschied
  // der Fassungen. Software-Rasterung ohne GPU und ohne LCD-Glättung malt beide Fassungen gleich.
  const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-gpu-rasterization', '--disable-lcd-text', '--font-render-hinting=none'] });
  const ergebnis = [];
  try {
    const vergleichsSeite = await (await browser.newContext()).newPage();
    for (const sprache of roh ? ['-'] : sprachen) {
      let urlA, urlB;
      if (roh) {
        urlA = 'file://' + path.join(aus, 'vorher.html'); fs.writeFileSync(urlA.slice(7), vorherHtml);
        urlB = 'file://' + path.join(aus, 'nachher.html'); fs.writeFileSync(urlB.slice(7), nachherHtml);
      } else {
        urlA = await backen(vorherHtml, 'privat-' + sprache, path.join(aus, `vorher-privat-${sprache}.html`));
        urlB = await backen(nachherHtml, 'privat-' + sprache, path.join(aus, `nachher-privat-${sprache}.html`));
      }
      for (const geraet of geraete) {
        let a, b;
        if (roh) {
          const auf = async (url) => { const k = await browser.newContext(GERAETE[geraet]); const s = await k.newPage(); await s.goto(url); const p = await bild(s); await k.close(); return [['seite', p]]; };
          a = await auf(urlA); b = await auf(urlB);
        } else {
          a = await szenenAufnehmen(browser, geraet, urlA, nur);
          b = await szenenAufnehmen(browser, geraet, urlB, nur);
        }
        const bMap = new Map(b);
        for (const [szene, pa] of a) {
          const pb = bMap.get(szene);
          const kennung = `${sprache}-${geraet}-${szene}`;
          if (pa === 'fehlt' || pb === 'fehlt' || pb == null) {
            ergebnis.push({ kennung, pixel: pa === pb ? 0 : -1, hinweis: `vorher ${pa === 'fehlt' ? 'fehlt' : 'da'}, nachher ${pb === 'fehlt' || pb == null ? 'fehlt' : 'da'}` });
            continue;
          }
          let v = pa === pb ? { pixel: 0 } : await pixelVergleich(vergleichsSeite, pa, pb);
          /* WIEDERHOLUNG BEI ABWEICHUNG (02.10.2026). Die Gegenprobe — eine Fassung gegen sich selbst — zeigte nach allen
             Beruhigungen (s. bild) noch vereinzelte Abweichungen an gerundeten Kanten (Logo-Kreis, Pillen-Ecken, Suchfeld): die
             Kantenglättung schwankt beim Rastern, in jeder Fassung, je Lauf an anderer Szene. Ein echter Unterschied ist
             deterministisch, Rauschen nicht. Darum: weicht eine Szene ab, wird sie für BEIDE Fassungen frisch aufgenommen,
             höchstens zweimal; zählt, was in jeder Wiederholung bleibt (das Minimum). Der Rot-Beweis „1 px Radius" bleibt scharf,
             weil er in jeder Wiederholung abweicht. */
          if (!roh && v.pixel > 0) {
            const block = szene.startsWith('bereich') ? 'bereich' : (szene.startsWith('einstellungen') ? 'einstellungen' : szene);
            for (let w = 1; w <= 2 && v.pixel > 0; w++) {
              const na = new Map(await szenenAufnehmen(browser, geraet, urlA, [block])).get(szene);
              const nb = new Map(await szenenAufnehmen(browser, geraet, urlB, [block])).get(szene);
              if (na == null || nb == null || na === 'fehlt' || nb === 'fehlt') break;
              const nv = na === nb ? { pixel: 0 } : await pixelVergleich(vergleichsSeite, na, nb);
              if (nv.pixel < v.pixel) v = { ...nv, wiederholt: w, zuerst: v.pixel };
            }
          }
          const eintrag = { kennung, pixel: v.pixel };
          if (v.wiederholt) eintrag.wiederholt = { zuerst: v.zuerst, wiederholung: v.wiederholt };   // sichtbar, nie still geglättet
          if (v.pixel) {
            eintrag.rahmen = v.rahmen; eintrag.groessen = [v.groesseA, v.groesseB];
            for (const [n, d] of [['vorher', pa], ['nachher', pb], ['diff', v.diff]]) {
              fs.writeFileSync(path.join(aus, `${kennung}-${n}.png`), Buffer.from(d, 'base64'));
            }
          }
          ergebnis.push(eintrag);
        }
      }
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(aus, 'ergebnis.json'), JSON.stringify(ergebnis, null, 1) + '\n');
  return ergebnis;
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const viele = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));
  const eigenerOrdner = !arg('--aus');   // ohne --aus ein Temp-Ordner, den das Werkzeug selbst wieder räumt, wenn alles gleich ist
  const aus = path.resolve(arg('--aus') || fs.mkdtempSync(path.join(os.tmpdir(), 'design-bildvergleich-')));
  let vorherHtml, nachherHtml, roh = false;
  if (arg('--gegenprobe')) {
    // Die Gegenprobe: eine Fassung gegen SICH SELBST. Alles über 0 px ist Unruhe des Werkzeugs, kein Unterschied —
    // ohne grüne Gegenprobe ist ein 0-px-Beleg nicht führbar.
    vorherHtml = nachherHtml = arg('--gegenprobe') === 'arbeitsbaum' ? fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8')
      : execFileSync('git', ['show', arg('--gegenprobe') + ':vivodepot.html'], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 << 20 });
  } else if (arg('--basis-datei')) {
    // Wie --basis, die Vorher-Seite aber aus einer Datei — etwa ein Kern in einer anderen Bauform desselben Stands; beide
    // Seiten werden gebacken und szenenweise verglichen (nicht roh).
    vorherHtml = fs.readFileSync(arg('--basis-datei'), 'utf8');
    nachherHtml = fs.readFileSync(arg('--nachher') || path.join(REPO, 'vivodepot.html'), 'utf8');
  } else if (arg('--basis')) {
    vorherHtml = execFileSync('git', ['show', arg('--basis') + ':vivodepot.html'], { cwd: REPO, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 << 20 });
    nachherHtml = fs.readFileSync(arg('--nachher') || path.join(REPO, 'vivodepot.html'), 'utf8');
  } else {
    vorherHtml = fs.readFileSync(arg('--vorher'), 'utf8');
    nachherHtml = fs.readFileSync(arg('--nachher'), 'utf8');
    roh = true;
  }
  const ergebnis = await vergleichen({
    vorherHtml, nachherHtml, aus, roh,
    sprachen: (arg('--sprachen') || 'de,en').split(','), geraete: (arg('--geraete') || 'desktop,handy').split(','),
    nur: viele('--nur').length ? viele('--nur') : null,
  });
  const erlaubt = viele('--erlaubt');
  let rot = 0;
  for (const e of ergebnis) {
    const frei = erlaubt.some((x) => e.kennung.includes(x));
    const marke = e.pixel === 0 ? 'gleich ' : (frei ? 'erlaubt' : 'ANDERS ');
    if (e.pixel !== 0 && !frei) rot++;
    console.log(`  ${marke} ${e.kennung}${e.pixel ? ` — ${e.pixel} px${e.rahmen ? ' in ' + e.rahmen.join(',') : ''}${e.hinweis ? ' (' + e.hinweis + ')' : ''}` : ''}`);
  }
  // Bei Abweichungen bleiben die Bilder zur Einsicht liegen; sonst räumt das Werkzeug seinen eigenen Temp-Ordner.
  const raeumen = eigenerOrdner && !rot;
  console.log(`[design-bildvergleich] ${ergebnis.length} Aufnahmen, ${ergebnis.filter((e) => e.pixel === 0).length} gleich, ${rot} unerlaubt anders. Bilder: ${raeumen ? '(geräumt)' : aus}`);
  if (raeumen) fs.rmSync(aus, { recursive: true, force: true });
  if (rot && argv.includes('--gate')) process.exit(1);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(2); });
module.exports = { vergleichen, pixelVergleich };
