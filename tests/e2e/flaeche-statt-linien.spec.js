// @ts-check
/* flaeche-statt-linien.spec.js — Gliederung über Fläche und Abstand, Linien nur für Fokus und Fehler (Entscheidung 07.10.2026)
   Gemessen am gerenderten Produkt, in allen vier Produkten:
   1 · Rand- und Linienelemente je Ansicht im Inhalt: genau die Zahl im Deckel (tests/e2e/fixtures/linien-deckel.json). Die Unterkante
       eines Eingabefelds zählt nicht, sie ist die Feldgrenze (WCAG 1.4.11); Fokus und Fehler zählen nicht. Mit LINIEN_DECKEL_MESSEN=1
       schreibt der Lauf die gemessenen Zahlen (Lockerung braucht ein Wort der Gegenlesung).
   2 · Feldgrenze ≥ 3:1 am Bild: die Unterkante jedes Feldes gegen die Fläche direkt darunter, tags und nachts, auf Glas (WCAG 1.4.11).
   3 · Fokusrand der Bereichsüberschrift: bei Mausbedienung keiner, bei Tastaturbedienung sichtbar (WCAG 2.4.7), in Chromium und WebKit.
   4 · Jeder Knopf ohne sichtbaren Text hat einen zugänglichen Namen, in den vier Produkten und der Lese-App (Icons sind ab Werk aus).
   Jede Messung mit Rot-Beweis. */
const { test, expect, webkit } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./helpers.js');

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['privat-en', h.KERN_URL_PRIVAT_EN], ['pro-de', h.KERN_URL_PRO_DE], ['pro-en', h.KERN_URL_PRO_EN]];
const ANSICHTEN = { privat: ['finance', 'advanceCare', 'people'], pro: ['pro-gesellschaft-nachfolge', 'pro-vertretung-vollmachten', 'pro-kontakte-vertretungsplan'] };
const DECKEL_PFAD = path.join(__dirname, 'fixtures', 'linien-deckel.json');
const LESE_APP = 'file://' + path.resolve(__dirname, '../../vivodepot-lesen.html');

async function oeffnen(page, url) {
  await page.setViewportSize({ width: 1280, height: 860 });
  await h.oeffneApp(page, { url });
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
  for (let i = 0; i < 40; i++) {
    if (await page.locator('#whc-angebot').isVisible().catch(() => false)) await page.click('#m-zweit');
    else if (await page.locator('#whc-tragweite').isVisible().catch(() => false)) await page.click('#m-zweit');
    else if (await page.locator('#nfb-angebot').isVisible().catch(() => false)) await page.click('#m-zweit');
    else if (await page.locator('#modal-rueck.an #m-ok').isVisible().catch(() => false)) await page.click('#m-ok');
    else if (i > 5) break;
    await page.waitForTimeout(150);
  }
}

async function bereich(page, id) {
  await page.evaluate((s) => { window.__vdOeffentlich.oeffneSektor(s); document.querySelectorAll('#content details').forEach((d) => { d.open = true; }); }, id);
  await page.waitForTimeout(150);
}

/* Im Browser: jede sichtbare Randseite im Inhalt, außer Feldunterkante, Fokus und Fehler. */
function LINIEN() {
  const aus = [];
  for (const el of document.querySelectorAll('#content *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.closest('[hidden]') || !el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) continue;
    const cs = getComputedStyle(el);
    if (el.matches(':focus, [aria-invalid="true"], input[type="checkbox"], input[type="radio"]')) continue;
    const feld = el.matches('input, select, textarea');
    for (const seite of ['Top', 'Right', 'Bottom', 'Left']) {
      const w = parseFloat(cs['border' + seite + 'Width']); const st = cs['border' + seite + 'Style']; const col = cs['border' + seite + 'Color'];
      if (!w || st === 'none' || st === 'hidden') continue;
      const m = col.match(/[\d.]+/g) || []; const alpha = m.length >= 4 ? Number(m[3]) : (col === 'transparent' ? 0 : 1);
      if (!alpha) continue;
      if (feld && seite === 'Bottom') continue;
      aus.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + ':' + seite);
    }
  }
  return aus;
}

/* Feldgrenze am Bild: Unterkante gegen die Fläche darunter, 1-%-Perzentil über die Breite. */
async function feldgrenzen(page) {
  const felder = await page.evaluate(() => [...document.querySelectorAll('#content input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]), #content select, #content textarea')]
    .filter((el) => el.checkVisibility({ visibilityProperty: true }))
    .map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 40 && r.top > 0 && r.bottom < innerHeight - 6)
    // nur Felder, deren Unterkante wirklich zu sehen ist (nicht unter Kopf- oder Fußleiste)
    .filter(({ el, r }) => { const o = document.elementFromPoint(r.left + r.width / 2, r.bottom - 2); return !!o && (o === el || el.contains(o)); })
    .map(({ el, r }) => { const cs = getComputedStyle(el); return { x: r.left, y: r.bottom, w: r.width, name: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + (el.getAttribute('data-edit') ? '[' + el.getAttribute('data-edit') + ']' : '') + ' {' + cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor + ' · ' + cs.backgroundColor + ' · y ' + r.bottom.toFixed(1) + '}' }; }));
  const bild = (await page.screenshot()).toString('base64');
  return page.evaluate(async ([b64, felder]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const sx = img.width / innerWidth;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    return felder.map((f) => {
      // Die Linie liegt je nach Bruchteil-Position in einer der letzten drei Pixelzeilen über der Unterkante: je Spalte die stärkste.
      const yu = Math.round((f.y + 3) * sx), unten = g.getImageData(0, yu, img.width, 1).data;
      const zeilen = [3, 2, 1, 0].map((d) => g.getImageData(0, Math.max(0, Math.floor(f.y * sx) - d), img.width, 1).data);
      const werte = [];
      for (let x = Math.round((f.x + 6) * sx); x < Math.round((f.x + f.w - 6) * sx); x += 3) {
        const b = L(unten, x * 4);
        werte.push(Math.max(...zeilen.map((z) => { const a = L(z, x * 4); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); })));
      }
      werte.sort((p, q) => p - q);
      return { k: werte.length ? Math.round(werte[Math.floor(werte.length * 0.01)] * 100) / 100 : 21, name: f.name };
    });
  }, [bild, felder]);
}

test.describe('Fläche statt Linien', () => {
  const deckel = fs.existsSync(DECKEL_PFAD) ? JSON.parse(fs.readFileSync(DECKEL_PFAD, 'utf8')) : {};
  const gemessen = {};

  for (const [slug, url] of PRODUKTE) {
    test(`[Linien·Deckel·Feldgrenze] ${slug}: Rand- und Linienelemente je Ansicht genau im Deckel, Feldgrenzen ≥ 3:1 tags und nachts`, async ({ page }) => {
      test.setTimeout(120000);
      await oeffnen(page, url);
      let felderGesamt = 0;
      for (const id of ANSICHTEN[slug.startsWith('pro') ? 'pro' : 'privat']) {
        await bereich(page, id);
        const linien = await page.evaluate(LINIEN);
        gemessen[slug + '/' + id] = linien.length;
        if (process.env.LINIEN_LISTE) fs.appendFileSync(process.env.LINIEN_LISTE, slug + '/' + id + '\t' + linien.join(', ') + '\n');
        if (!process.env.LINIEN_DECKEL_MESSEN) expect(linien.length, slug + '/' + id + ': ' + linien.join(', ')).toBe(deckel[slug + '/' + id]);
        for (const modus of ['tag', 'nacht']) {
          if (modus === 'nacht') await page.evaluate(() => document.getElementById('tb-nacht').click());
          await page.waitForTimeout(250);
          const k = await feldgrenzen(page);
          felderGesamt += k.length;
          expect(Math.min(...k.map((x) => x.k)), slug + '/' + id + ' ' + modus + ': Feldgrenze ' + k.filter((x) => x.k < 3).map((x) => x.name + ' ' + x.k).join(', ')).toBeGreaterThanOrEqual(3);
          if (modus === 'nacht') await page.evaluate(() => document.getElementById('tb-nacht').click());
        }
      }
      expect(felderGesamt, slug + ': Voraussetzung, in den Ansichten stehen Felder im Bild').toBeGreaterThan(0);
      if (process.env.LINIEN_DECKEL_MESSEN) {
        const alt = fs.existsSync(DECKEL_PFAD) ? JSON.parse(fs.readFileSync(DECKEL_PFAD, 'utf8')) : {};
        fs.writeFileSync(DECKEL_PFAD, JSON.stringify(Object.assign(alt, gemessen), Object.keys(Object.assign(alt, gemessen)).sort(), 1) + '\n');
      }
    });
  }

  test('[Linien·Rot-Beweis] eine Zierlinie über dem Abschnitt und ein umrandetes Feld werden gezählt bzw. als Feldgrenze unter 3:1 erkannt', async ({ page }) => {
    await oeffnen(page, h.KERN_URL_PRIVAT_DE);
    await bereich(page, 'finance');
    const vorher = (await page.evaluate(LINIEN)).length;
    await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('.sektion { border-top: 1px solid #222 !important; } #content input, #content select { border-bottom: 1px solid rgba(0,0,0,.05) !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
    await page.waitForTimeout(150);
    expect((await page.evaluate(LINIEN)).length, 'die Linie über dem Abschnitt wird gezählt').toBeGreaterThan(vorher);
    expect(Math.min(...(await feldgrenzen(page)).map((x) => x.k)), 'eine blasse Unterkante fällt unter 3:1').toBeLessThan(3);
  });

  /* Fokus über die Umschau: dort gibt es keine Dialogkette nach dem Anlegen, und die Navigation der offenen Gruppe ist sichtbar. */
  async function umschau(page) {
    await page.setViewportSize({ width: 1280, height: 860 });
    await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
    await page.click('#w-anfangen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    const ziele = await page.evaluate(() => [...document.querySelectorAll('#sidebar .nav-item[data-sektor]')].filter((b) => b.checkVisibility({ visibilityProperty: true }) && b.getBoundingClientRect().height > 0).map((b) => b.getAttribute('data-sektor')));
    return ziele.slice(0, 2);
  }
  const rand = (page) => page.evaluate(() => { const h1 = document.querySelector('#content .bereich-kopf h1'); return { fokus: document.activeElement === h1, w: parseFloat(getComputedStyle(h1).borderLeftWidth) }; });

  test('[Fokus·Überschrift] Maus: kein Rand an der Bereichsüberschrift; Tastatur: Rand sichtbar (Chromium), mit Rot-Beweis', async ({ page }) => {
    const [a, b] = await umschau(page);
    expect(b, 'Voraussetzung: zwei sichtbare Bereiche in der Leiste').toBeTruthy();
    await page.locator('#sidebar .nav-item[data-sektor="' + b + '"]').click();
    await page.waitForTimeout(200);
    expect((await rand(page)).w, 'Mausbedienung: kein Rand').toBe(0);
    await page.locator('#sidebar .nav-item[data-sektor="' + a + '"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const taste = await rand(page);
    expect(taste.fokus, 'Voraussetzung: die Überschrift hat den Fokus').toBe(true);
    expect(taste.w, 'Tastatur: Rand sichtbar').toBeGreaterThan(0);
    // Rot-Beweis: mit der Regel auf :focus (wie bis 07.10.2026) zeigte sich der Rand auch nach dem Mausklick.
    await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('.bereich-kopf h1:focus { border-left: 3px solid #456 !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
    await page.locator('#sidebar .nav-item[data-sektor="' + b + '"]').click();
    await page.waitForTimeout(200);
    expect((await rand(page)).w, 'Rot-Beweis: :focus zeigt den Rand auch bei der Maus').toBeGreaterThan(0);
  });

  test('[Fokus·Überschrift·WebKit] dieselbe Regel in WebKit: Maus kein Rand, Tastatur Rand', async () => {
    const browser = await webkit.launch();
    try {
      const page = await browser.newPage();
      const [a, b] = await umschau(page);
      await page.locator('#sidebar .nav-item[data-sektor="' + b + '"]').click();
      await page.waitForTimeout(200);
      expect((await rand(page)).w, 'WebKit, Maus: kein Rand').toBe(0);
      await page.locator('#sidebar .nav-item[data-sektor="' + a + '"]').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
      expect((await rand(page)).w, 'WebKit, Tastatur: Rand sichtbar').toBeGreaterThan(0);
    } finally { await browser.close(); }
  });

  /* Im Browser: sichtbare Knöpfe ohne sichtbaren Text und ohne zugänglichen Namen. */
  function OHNE_NAMEN() {
    return [...document.querySelectorAll('button, [role="button"]')].filter((b) => {
      const r = b.getBoundingClientRect(); if (!r.width || !r.height || b.closest('[hidden], [aria-hidden="true"]')) return false;
      if (!b.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) return false;
      if ((b.innerText || '').trim()) return false;
      const lb = b.getAttribute('aria-labelledby'); const lbText = lb ? lb.split(/\s+/).map((i) => (document.getElementById(i) || {}).textContent || '').join('').trim() : '';
      return !((b.getAttribute('aria-label') || '').trim() || lbText || (b.getAttribute('title') || '').trim());
    }).map((b) => b.id || b.className || b.outerHTML.slice(0, 60));
  }

  for (const [slug, url] of PRODUKTE) {
    test(`[Icon-Knöpfe] ${slug}: jeder Knopf ohne sichtbaren Text hat einen zugänglichen Namen`, async ({ page }) => {
      await oeffnen(page, url);
      for (const id of ANSICHTEN[slug.startsWith('pro') ? 'pro' : 'privat']) {
        await bereich(page, id);
        expect(await page.evaluate(OHNE_NAMEN), slug + '/' + id).toEqual([]);
      }
    });
  }

  test('[Icon-Knöpfe] Lese-App: jeder Knopf ohne sichtbaren Text hat einen zugänglichen Namen', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto(LESE_APP);
    await page.waitForLoadState('load');
    expect(await page.evaluate(OHNE_NAMEN)).toEqual([]);
  });

  test('[Icon-Knöpfe·Rot-Beweis] ein Knopf nur mit Icon und ohne Namen wird gefunden', async ({ page }) => {
    await oeffnen(page, h.KERN_URL_PRIVAT_DE);
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'probe-nur-icon'; b.innerHTML = '<svg width="16" height="16"><circle cx="8" cy="8" r="6"/></svg>'; document.querySelector('.topbar').appendChild(b); });
    expect(await page.evaluate(OHNE_NAMEN)).toContain('probe-nur-icon');
  });
});
