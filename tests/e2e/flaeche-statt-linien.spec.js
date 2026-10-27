// @ts-check
/* flaeche-statt-linien.spec.js — Gliederung über Fläche und Abstand, Linien nur für Fokus und Fehler (Entscheidung 07.10.2026)
   Gemessen am gerenderten Produkt, in allen vier Produkten:
   1 · Rand- und Linienelemente je Ansicht im Inhalt: genau die Zahl im Deckel (tests/e2e/fixtures/linien-deckel.json). Die Unterkante
       eines Eingabefelds zählt nicht, sie ist die Feldgrenze (WCAG 1.4.11); Fokus und Fehler zählen nicht. Mit LINIEN_DECKEL_MESSEN=1
       schreibt der Lauf die gemessenen Zahlen (Lockerung braucht ein Wort der Gegenlesung).
   2 · Feldgrenze ≥ 3:1 am Bild: die Unterkante jedes Feldes gegen die Fläche direkt darunter, tags und nachts, auf Glas (WCAG 1.4.11).
   3 · Fokusrand der Bereichsüberschrift: bei Mausbedienung keiner, bei Tastaturbedienung sichtbar (WCAG 2.4.7), in Chromium und WebKit.
   4 · Jeder Knopf ohne sichtbaren Text hat einen zugänglichen Namen, in den vier Produkten und der Lese-App (Icons sind ab Werk aus).
   5 · Außerhalb des Inhalts (bestätigt 08.10.2026): Start, Anlege-Dialog, Kopfleiste, Seitenleiste und Fuß tags und nachts, dazu das
       geöffnete Sub-Depot, je genau die Zahl im selben Deckel. Bedeutung tragen dort nur Fokus, Fehler und die Warnung im Dialog.
   Jede Messung mit Rot-Beweis. */
const { test, expect, webkit } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./helpers.js');

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['privat-en', h.KERN_URL_PRIVAT_EN], ['pro-de', h.KERN_URL_PRO_DE], ['pro-en', h.KERN_URL_PRO_EN]].filter(([slug]) => h.baubar(slug));
const ANSICHTEN = { privat: ['finance', 'advanceCare', 'people'], pro: ['pro-gesellschaft-nachfolge', 'pro-vertretung-vollmachten', 'pro-kontakte-vertretungsplan'] };
const DECKEL_PFAD = path.join(__dirname, 'fixtures', 'linien-deckel.json');
const LESE_APP = 'file://' + path.resolve(__dirname, '../../vivodepot-lesen.html');
/* Die Feldregel, an EINER Stelle. WCAG 2.2 Understanding 1.4.11: ein Feld ist an einer Unterkante mit 3:1 zu erkennen (Abb. 31) oder,
   ohne Rand, an einer Fläche mit 3:1 gegen die Umgebung (Abb. 34). `unterkante`: die Unterkante ist die Feldgrenze und zählt nicht als
   Linie, sie muss 3:1 halten. `flaeche`: kein Rand, die Fläche selbst muss 3:1 halten. `flaeche-mit-beschriftung`: kein Rand, die
   Fläche muss sich nur abheben, das Feld erkennt man an seiner sichtbaren Beschriftung. */
const FELDREGELN = {
  unterkante: { unterkanteIstGrenze: true, mindestKontrast: 3 },
  flaeche: { unterkanteIstGrenze: false, mindestKontrast: 3 },
  'flaeche-mit-beschriftung': { unterkanteIstGrenze: false, mindestKontrast: 1.05 },
};
const FELDREGEL = FELDREGELN.unterkante;
/* Im geöffneten Sub-Depot trägt die ganze Oberfläche die Farbe des Depots (Entscheidung 05.10.2026, U2-ADR-236 Nachtrag): keine
   Linie mehr, auch nicht an der Seitenleiste. Bis 09.10.2026 stand hier die Farblinie der Seitenleiste als einzige erlaubte Linie. */
const SUB_DEPOT_FARBLINIE = [];
/* Bedeutung außerhalb von Fokus und Fehler: die Warnung im Anlege-Dialog (ein vergessenes Passwort ist nicht wiederherstellbar). */
const BEDEUTUNG = '.modal-warnung';

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

/* Im Browser: jede sichtbare Randseite im Inhalt (oder, mit `ausserhalb`, überall außer im Inhalt), außer Feldgrenze, Fokus, Fehler
   und Bedeutung. */
function LINIEN(opt) {
  const { ausserhalb = false, unterkanteIstGrenze = true, bedeutung = '' } = opt || {};
  const aus = [];
  for (const el of document.querySelectorAll(ausserhalb ? 'body *' : '#content *')) {
    if (ausserhalb && el.closest('#content')) continue;
    if (bedeutung && el.closest(bedeutung)) continue;
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
      if (feld && seite === 'Bottom' && unterkanteIstGrenze) continue;
      aus.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + ':' + seite);
    }
  }
  return aus;
}

/* Feldgrenze am Bild: Unterkante gegen die Fläche darunter, 1-%-Perzentil über die Breite.
   FUSSLEISTE (26.10.2026, Wort der Gegenlesung): Bis dahin galt jedes Feld als messbar, dessen Unterkante kurz über dem Fensterrand lag
   und an dessen Unterkante −2 px das Feld selbst stand. Ein Feld, das mit seiner Linie unter der festen Fußleiste lag
   (pro-en/pro-vertretung-vollmachten, select[tpl_vertretungsregelung], y 787,2), wurde so an der Fußleiste gemessen: 1,1 statt seines
   Kontrasts. Jetzt muss für die Messung die ganze Linie samt der Fläche 3 px darunter im Inhalt liegen. Ein Feld im Bild, bei dem das
   nicht zutrifft, wird nicht übersprungen. Die Probe scrollt es einzeln in die Mitte, misst es dort und stellt die Scrollstellung danach
   wieder her. Liegt es auch dann nicht frei, meldet sie es mit 0 als nicht messbar.
   `{ alterFilter: true }` misst wie bis zum 25.10.2026, nur für den Rot-Beweis [Linien·Feldgrenze·Fußleiste]. */
function FELDER_IM_BILD(alterFilter) {
  const imInhalt = (x, y) => { const o = document.elementFromPoint(x, y); return !!o && !!o.closest('#content'); };
  const name = (el, r) => { const cs = getComputedStyle(el); return el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + (el.getAttribute('data-edit') ? '[' + el.getAttribute('data-edit') + ']' : '') + ' {' + cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor + ' · ' + cs.backgroundColor + ' · y ' + r.bottom.toFixed(1) + '}'; };
  const frei = (el, r) => { const x = r.left + r.width / 2; const o = document.elementFromPoint(x, r.bottom - 2); return !!o && (o === el || el.contains(o)) && imInhalt(x, r.bottom - 4) && r.bottom + 4 < innerHeight && imInhalt(x, r.bottom + 3); };
  const alle = [...document.querySelectorAll('#content input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]), #content select, #content textarea')]
    .filter((el) => el.checkVisibility({ visibilityProperty: true }))
    .map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 40);
  if (alterFilter) {
    return { frei: alle.filter(({ r }) => r.top > 0 && r.bottom < innerHeight - 6)
      .filter(({ el, r }) => { const o = document.elementFromPoint(r.left + r.width / 2, r.bottom - 2); return !!o && (o === el || el.contains(o)); })
      .map(({ el, r }) => ({ x: r.left, y: r.bottom, w: r.width, name: name(el, r) })), verdeckt: [] };
  }
  // Im Bild heißt: das Feld schneidet das Fenster, auch wo Kopf- oder Fußleiste es ganz verdecken.
  const imBild = alle.filter(({ r }) => r.bottom > 0 && r.top < innerHeight);
  document.querySelectorAll('[data-fg-verdeckt]').forEach((el) => el.removeAttribute('data-fg-verdeckt'));
  const verdeckt = [];
  const freiListe = [];
  for (const { el, r } of imBild) {
    if (frei(el, r)) freiListe.push({ x: r.left, y: r.bottom, w: r.width, name: name(el, r) });
    else { el.setAttribute('data-fg-verdeckt', String(verdeckt.length)); verdeckt.push(verdeckt.length); }
  }
  return { frei: freiListe, verdeckt };
}

async function feldgrenzen(page, opt) {
  const { alterFilter = false } = opt || {};
  const { frei, verdeckt } = await page.evaluate(FELDER_IM_BILD, alterFilter);
  const ergebnis = await feldgrenzenMessen(page, frei);
  for (const i of verdeckt) {
    // Einzeln in die Mitte scrollen, messen, Scrollstellung aller Vorfahren zurück.
    await page.evaluate((n) => {
      const el = document.querySelector('[data-fg-verdeckt="' + n + '"]');
      const stand = []; for (let e = el.parentElement; e; e = e.parentElement) stand.push([e, e.scrollTop]);
      window.__fgStand = { stand, y: window.scrollY };
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, i);
    await page.waitForTimeout(100);
    const g = await page.evaluate((n) => {
      const el = document.querySelector('[data-fg-verdeckt="' + n + '"]'); const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2; const o = document.elementFromPoint(x, r.bottom - 2); const u = document.elementFromPoint(x, r.bottom + 3);
      const cs = getComputedStyle(el);
      const nm = el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + (el.getAttribute('data-edit') ? '[' + el.getAttribute('data-edit') + ']' : '') + ' {' + cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor + ' · ' + cs.backgroundColor + ' · gescrollt}';
      const ok = !!o && (o === el || el.contains(o)) && !!u && !!u.closest('#content') && r.bottom + 4 < innerHeight;
      return { ok, f: { x: r.left, y: r.bottom, w: r.width, name: nm } };
    }, i);
    if (g.ok) ergebnis.push(...(await feldgrenzenMessen(page, [g.f])));
    else ergebnis.push({ k: 0, name: g.f.name + ' nicht messbar: auch gescrollt nicht frei im Inhalt' });
    await page.evaluate(() => { const s = window.__fgStand; for (const [e, t] of s.stand) e.scrollTop = t; window.scrollTo(0, s.y); delete window.__fgStand; });
    await page.waitForTimeout(50);
  }
  return ergebnis;
}

async function feldgrenzenMessen(page, felder) {
  if (!felder.length) return [];
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
        const linien = await page.evaluate(LINIEN, { unterkanteIstGrenze: FELDREGEL.unterkanteIstGrenze });
        gemessen[slug + '/' + id] = linien.length;
        if (process.env.LINIEN_LISTE) fs.appendFileSync(process.env.LINIEN_LISTE, slug + '/' + id + '\t' + linien.join(', ') + '\n');
        if (!process.env.LINIEN_DECKEL_MESSEN) expect(linien.length, slug + '/' + id + ': ' + linien.join(', ')).toBe(deckel[slug + '/' + id]);
        for (const modus of ['tag', 'nacht']) {
          if (modus === 'nacht') await page.evaluate(() => document.getElementById('tb-nacht').click());
          await page.waitForTimeout(250);
          const k = await feldgrenzen(page);
          felderGesamt += k.length;
          expect(Math.min(...k.map((x) => x.k)), slug + '/' + id + ' ' + modus + ': Feldgrenze ' + k.filter((x) => x.k < FELDREGEL.mindestKontrast).map((x) => x.name + ' ' + x.k).join(', ')).toBeGreaterThanOrEqual(FELDREGEL.mindestKontrast);
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

  /* Fußleiste: das Feld, dessen Linie unter der festen Fußleiste liegt, wird gescrollt gemessen, nicht an der Fußleiste. */
  const unterDieFussleiste = (page, kennung) => page.evaluate((k) => {
    const el = document.querySelector('#content [data-edit="' + k + '"]');
    let leiste = document.elementFromPoint(innerWidth / 2, innerHeight - 3);
    for (let e = leiste; e; e = e.parentElement) if (getComputedStyle(e).position === 'fixed') leiste = e;
    const oben = leiste.getBoundingClientRect().top;
    window.scrollBy({ top: el.getBoundingClientRect().bottom - (oben + 4), behavior: 'instant' });
    return { leisteOben: oben, unterkante: el.getBoundingClientRect().bottom, inhalt: !!leiste.closest('#content') };
  }, kennung);
  const FUSSFELD = 'tpl_vertretungsregelung';

  (h.baubar('pro-en') ? test : test.skip)('[Linien·Feldgrenze·Fußleiste] Rot-Beweis: der alte Filter misst unter der Fußleiste die Leiste, der neue das gescrollte Feld', async ({ page }) => {
    test.setTimeout(120000);
    await oeffnen(page, h.KERN_URL_PRO_EN);
    await bereich(page, 'pro-vertretung-vollmachten');
    const lage = await unterDieFussleiste(page, FUSSFELD);
    expect(lage.inhalt, 'Voraussetzung: unten steht eine feste Leiste außerhalb des Inhalts').toBe(false);
    expect(lage.unterkante, 'Voraussetzung: die Feldlinie liegt unter der Oberkante der Fußleiste').toBeGreaterThan(lage.leisteOben);
    await page.waitForTimeout(150);
    const alt = (await feldgrenzen(page, { alterFilter: true })).filter((x) => x.name.includes(FUSSFELD));
    expect(alt.length, 'der alte Filter nimmt das Feld unter der Leiste als messbar').toBe(1);
    expect(alt[0].k, 'und misst dabei die Fußleiste: ' + alt[0].name).toBeLessThan(FELDREGEL.mindestKontrast);
    const neu = (await feldgrenzen(page)).filter((x) => x.name.includes(FUSSFELD));
    expect(neu.length, 'der neue Filter misst das Feld genau einmal').toBe(1);
    expect(neu[0].name, 'gescrollt, nicht an der Leiste').toContain('gescrollt');
    expect(neu[0].k, 'die Feldlinie selbst hält 3:1: ' + neu[0].name).toBeGreaterThanOrEqual(FELDREGEL.mindestKontrast);
  });

  (h.baubar('pro-en') ? test : test.skip)('[Linien·Feldgrenze·Fußleiste] Gegenprobe: ein blasses Feld unter der Fußleiste bleibt rot', async ({ page }) => {
    test.setTimeout(120000);
    await oeffnen(page, h.KERN_URL_PRO_EN);
    await bereich(page, 'pro-vertretung-vollmachten');
    await page.evaluate((k) => { const s = new CSSStyleSheet(); s.replaceSync('#content [data-edit="' + k + '"] { border-bottom: 1px solid rgba(0,0,0,.05) !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; }, FUSSFELD);
    const lage = await unterDieFussleiste(page, FUSSFELD);
    expect(lage.unterkante, 'Voraussetzung: die Feldlinie liegt unter der Oberkante der Fußleiste').toBeGreaterThan(lage.leisteOben);
    await page.waitForTimeout(150);
    const neu = (await feldgrenzen(page)).filter((x) => x.name.includes(FUSSFELD));
    expect(neu.length, 'das Feld wird gemessen, nicht übersprungen').toBe(1);
    expect(neu[0].k, 'die blasse Linie fällt unter 3:1: ' + neu[0].name).toBeLessThan(FELDREGEL.mindestKontrast);
  });

  /* 5 · Außerhalb des Inhalts. Gezählt wird, was die Bürgerin sieht, bevor und während sie im Inhalt arbeitet. */
  const ausserhalb = (page) => page.evaluate(LINIEN, { ausserhalb: true, unterkanteIstGrenze: FELDREGEL.unterkanteIstGrenze, bedeutung: BEDEUTUNG });
  const nacht = (page) => page.evaluate(() => document.getElementById('tb-nacht').click()).then(() => page.waitForTimeout(250));
  const pruefe = (schluessel, linien) => {
    gemessen[schluessel] = linien.length;
    if (process.env.LINIEN_LISTE) fs.appendFileSync(process.env.LINIEN_LISTE, schluessel + '\t' + linien.join(', ') + '\n');
    if (!process.env.LINIEN_DECKEL_MESSEN) expect(linien.length, schluessel + ': ' + linien.join(', ')).toBe(deckel[schluessel]);
  };
  const messenSchreiben = () => {
    if (!process.env.LINIEN_DECKEL_MESSEN) return;
    const alt = fs.existsSync(DECKEL_PFAD) ? JSON.parse(fs.readFileSync(DECKEL_PFAD, 'utf8')) : {};
    fs.writeFileSync(DECKEL_PFAD, JSON.stringify(Object.assign(alt, gemessen), Object.keys(Object.assign(alt, gemessen)).sort(), 1) + '\n');
  };

  for (const [slug, url] of PRODUKTE) {
    test(`[Linien·Rahmen] ${slug}: Start, Anlege-Dialog, Kopfleiste, Seitenleiste und Fuß tags und nachts genau im Deckel`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width: 1280, height: 860 });
      await h.oeffneApp(page, { url });
      pruefe(slug + '/start', await ausserhalb(page));
      await page.click('#w-anfangen');
      await page.waitForSelector(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible', { state: 'attached' });
      await page.click(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible');
      await page.waitForSelector('#id-pw', { state: 'visible' });
      pruefe(slug + '/anlegen-dialog', await ausserhalb(page));
      messenSchreiben();
    });

    test(`[Linien·Rahmen·Depot] ${slug}: Kopfleiste, Seitenleiste und Fuß im angelegten Depot tags und nachts genau im Deckel`, async ({ page }) => {
      test.setTimeout(120000);
      await oeffnen(page, url);
      await bereich(page, ANSICHTEN[slug.startsWith('pro') ? 'pro' : 'privat'][0]);
      pruefe(slug + '/rahmen-tag', await ausserhalb(page));
      await nacht(page);
      pruefe(slug + '/rahmen-nacht', await ausserhalb(page));
      messenSchreiben();
    });
  }

  async function subDepotBetreten(page, akzent) {
    const pw = 'linien-sub-depot-482';
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
    await page.click('#tb-depot-menue-verwaltung');
    await page.waitForSelector('#sub-neu', { state: 'visible' });
    await page.click('#sub-neu');
    await page.waitForSelector('#id-vorname', { state: 'visible' });
    await page.fill('#id-vorname', 'Ida Beispiel');
    await page.click(`.farb-kreis[data-akzent="${akzent}"]`);
    await page.fill('#id-pw', pw);
    await page.fill('#id-pw2', pw);
    await page.click('#m-ok');
    await page.waitForSelector('#id-vorname', { state: 'detached' });
    const uuid = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().verwalteteDepots.slice(-1)[0].depotUUID);
    await page.click(`[data-entsiegeln="${uuid}"]`);
    await page.waitForSelector('#sub-auf', { state: 'visible' });
    await page.fill('#sub-auf', pw);
    await page.click('#m-ok');
    await page.waitForSelector('#sub-auf', { state: 'detached' });
    await page.click(`[data-betreten="${uuid}"]`);
    await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
    for (let i = 0; i < 6; i++) {
      if (!(await page.locator('#modal-rueck.an').count())) break;
      await page.locator('#modal-rueck.an').locator('#m-abbr, #m-zweit, #m-ok').first().click().catch(() => {});
      await page.waitForTimeout(250);
    }
  }

  // Als Literal (dieselben zwei Einträge wie PRODUKTE.filter(-de)): die E2E-Zählung (A423) liest die Länge aus der Liste selbst.
  // Im öffentlichen Zuschnitt nur die baubaren Produkte (helpers.js, baubar); im Kanon beide.
  const SUB_PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['pro-de', h.KERN_URL_PRO_DE]].filter(([s]) => h.baubar(s));
  for (const [slug, url] of SUB_PRODUKTE) {
    test(`[Linien·Sub-Depot] ${slug}: das geöffnete Sub-Depot trägt seine Farbe als Fläche, ohne Balken und Rand, tags und nachts genau im Deckel`, async ({ page }) => {
      test.setTimeout(120000);
      await oeffnen(page, url);
      await subDepotBetreten(page, 'malve');
      const ansicht = ANSICHTEN[slug.startsWith('pro') ? 'pro' : 'privat'][0];
      await bereich(page, ansicht);
      for (const modus of ['tag', 'nacht']) {
        if (modus === 'nacht') await nacht(page);
        const innen = await page.evaluate(LINIEN, { unterkanteIstGrenze: FELDREGEL.unterkanteIstGrenze, bedeutung: BEDEUTUNG });
        const alle = innen.concat(await ausserhalb(page));
        pruefe(slug + '/sub-depot-' + modus, alle);
        if (!process.env.LINIEN_DECKEL_MESSEN) expect(alle, slug + '/sub-depot-' + modus + ': genau die Farblinie der Seitenleiste').toEqual(SUB_DEPOT_FARBLINIE);
      }
      messenSchreiben();
    });
  }

  test('[Linien·Rahmen·Rot-Beweis] eine Linie unter der Kopfleiste, ein Rand an der Seitenleiste und ein Balken am Sub-Depot-Banner werden gezählt', async ({ page }) => {
    await oeffnen(page, h.KERN_URL_PRIVAT_DE);
    await subDepotBetreten(page, 'malve');
    const alle = async () => (await page.evaluate(LINIEN, { unterkanteIstGrenze: FELDREGEL.unterkanteIstGrenze, bedeutung: BEDEUTUNG })).concat(await ausserhalb(page));
    const vorher = await alle();
    // Die Form vor dem 08.10.2026: Kopfleiste mit Unterkante, Seitenleiste mit Rand, Sub-Depot mit farbigem Balken.
    await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('.topbar { border-bottom: 1px solid #ccd5c4 !important; } #sidebar { border-right: 1px solid #ccd5c4 !important; } .vollmacht-banner { border-left: 4px solid #B8AECB !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
    await page.waitForTimeout(150);
    const nachher = await alle();
    for (const teil of ['topbar', 'sidebar', 'vollmacht-banner']) {
      expect(nachher.filter((l) => l.includes(teil)).length, teil + ' wird gezählt').toBeGreaterThan(vorher.filter((l) => l.includes(teil)).length);
    }
  });

  test('[Linien·Sub-Depot·Rot-Beweis] eine Linie im Sub-Depot fällt auf, auch die frühere Farblinie der Seitenleiste', async ({ page }) => {
    await oeffnen(page, h.KERN_URL_PRIVAT_DE);
    await subDepotBetreten(page, 'malve');
    const alle = async () => (await page.evaluate(LINIEN, { unterkanteIstGrenze: FELDREGEL.unterkanteIstGrenze, bedeutung: BEDEUTUNG })).concat(await ausserhalb(page));
    expect(await alle(), 'Voraussetzung: keine Linie').toEqual(SUB_DEPOT_FARBLINIE);
    // Die Form bis 09.10.2026: die Farbe des Sub-Depots als Linie an der Seitenleiste.
    await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('#sidebar { border-left: 8px solid #7b7076 !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
    await page.waitForTimeout(150);
    expect(await alle(), 'die Linie der Seitenleiste wird erkannt').toContain('nav.sidebar:Left');
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
    const browser = await webkit.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
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
