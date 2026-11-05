// @ts-check
/* feldschrift-und-entsperrfeld.spec.js — Eingabefelder erben die Schrift der Anwendung, das Entsperrfeld ist ein Feld wie jedes andere
   Befunde UX-DIALOGFELD-ERBT-SCHRIFT-NICHT und UX-ENTSPERRFELD-KONTRAST (UX-Review v963, 30.10.2026). Gemessen in v963: das Dialogfeld
   „Vorname“ und das Passwortfeld beim Entsperren in Arial bzw. Systemschrift und reinem Schwarz, bei „Schrift größer“ blieb die Eingabe
   16 px, während die Beschriftung wuchs. Das Entsperrfeld trug einen Vollrahmen in --line (1,41:1 gegen die Fläche, WCAG 2.2 1.4.11
   verlangt 3:1), 36 px Höhe und einen eigenen Radius.
   Gemessen am gebackenen Produkt, in allen vier Produkten:
   1 · Jede sichtbare Eingabe im Anlege-Dialog und das Entsperrfeld: erste Schriftfamilie wie die Seite (Inter), Farbe wie die Seite.
   2 · „Schrift größer“: die Eingabe wächst im selben Verhältnis wie ihre Beschriftung; am Rechner 15 px (Rolle Wert, Zielbild),
       bei 390 px nie unter 16 px (Zoom-Schutz in iOS).
   3 · Entsperrfeld: Unterkante ≥ 3:1 gegen die Fläche darunter, am Bild gemessen, tags und nachts; mindestens 44 px hoch; derselbe
       Radius wie das Feld im Anlege-Dialog.
   4 · Rangfolge (UX-ABSCHNITT-KLEINER-ALS-LABEL; gemessen in v963: Abschnitt 11,52 px in Versalien, Gruppe und Label je 14,08 px, in
       Pro der Titel eines Listenfelds als Label): in jedem Bereich ist der kleinste Abschnitt größer als die größte Gruppe, die
       kleinste Gruppe größer als das größte Label; kein Abschnitt in Versalien; ein Listenfeld trägt seinen Titel mindestens halbfett;
       das Label ist leiser als der Wert (Gewicht höchstens 500, nicht in der Farbe des Werts); Platzhalter nicht kursiv, so groß wie der
       Wert; Inhaltsfelder mindestens 44 px hoch.
   5 · Fokus (Entscheidung 29.10.2026, bestätigt 30.10.2026): ein fokussiertes Dialogfeld trägt keinen Ring und keinen Hof, nur
       seine Unterkante wird 2 px dick, in --salbei-dunkel, nachts in --salbei-nacht.
   Rot-Beweis: mit der Stilregel von v963 (Arial, Schwarz, Vollrahmen in --line, Abschnitt 0,72 rem in Versalien, Listentitel als
   Label) schlägt jede der vier Messungen an. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['privat-en', h.KERN_URL_PRIVAT_EN], ['pro-de', h.KERN_URL_PRO_DE], ['pro-en', h.KERN_URL_PRO_EN]].filter(([slug]) => h.baubar(slug));
const PW = 'e2e-passwort-123';

/* Der Stand von v963 an den drei Stellen, für den Rot-Beweis als letztes Blatt eingesetzt. */
const ALTSTAND_CSS = '.modal input, #overlay-inhalt input { font-family: Arial, sans-serif !important; color: #000 !important; }'
  + ' input, select, textarea { font-size: 16px !important; }'
  + ' #overlay-inhalt input[type="password"] { border: 1px solid var(--line) !important; border-radius: 4px !important; min-height: 0 !important; height: 36px !important; background: var(--white) !important; }';
const ALTSTAND_RANG_CSS = '.sektion-titel { font-size: 0.72rem !important; text-transform: uppercase !important; }'
  + ' .feld-zeile > .feld-label { font-size: var(--fs-sm) !important; font-weight: 550 !important; }'
  + ' .feld-zeile input::placeholder { font-style: italic !important; font-size: 0.75rem !important; }'
  + ' .feld-zeile input { min-height: 0 !important; height: 36px !important; }'
  + ' .feldgruppen-karte-titel, .feld-zeile:has(> .feld-wert > .feld-liste-editor) > .feld-label { font-size: var(--fs-sm) !important; }'
  + ' .feld-zeile:has(> .feld-wert > .feld-liste-editor) > .feld-label { font-weight: 550 !important; }';

async function anlegeDialog(page, url) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await h.oeffneApp(page, { url });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.click(h.ANLEGE_WEG_KANON + ':visible');
  await page.waitForSelector('#id-pw', { state: 'visible' });
}

async function entsperren(page, url) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await h.oeffneApp(page, { url });
  await h.depotAnlegen(page, { pw: PW });
  await page.reload();
  await page.locator('#co-pw').waitFor({ state: 'visible', timeout: 10000 });
}

/* Im Browser: Schrift und Farbe jeder sichtbaren Eingabe gegen die Seite. */
function SCHRIFT(sel) {
  const erste = (f) => String(f).split(',')[0].trim().replace(/^["']|["']$/g, '');
  const seite = getComputedStyle(document.body);
  return [...document.querySelectorAll(sel)].filter((el) => el.checkVisibility()).map((el) => {
    const cs = getComputedStyle(el);
    return { id: el.id || el.name || el.type, schrift: erste(cs.fontFamily), seiteSchrift: erste(seite.fontFamily), farbe: cs.color, seiteFarbe: seite.color };
  });
}

function schriftFehler(felder) {
  return felder.filter((f) => !/^Inter\b/.test(f.schrift) || f.schrift !== f.seiteSchrift || f.farbe !== f.seiteFarbe || f.farbe === 'rgb(0, 0, 0)')
    .map((f) => f.id + ': ' + f.schrift + ' ' + f.farbe + ' (Seite ' + f.seiteSchrift + ' ' + f.seiteFarbe + ')');
}

/* Schriftgröße von Eingabe und Beschriftung, bei der Skala `klasse` (leer = Standard). */
async function groessen(page, feld, label, klasse) {
  return page.evaluate(([f, l, k]) => {
    document.documentElement.classList.remove('fs-medium', 'fs-large');
    if (k) document.documentElement.classList.add(k);
    const px = (s) => parseFloat(getComputedStyle(document.querySelector(s)).fontSize);
    return { eingabe: px(f), label: px(l) };
  }, [feld, label, klasse]);
}

/* Unterkante am fokussierten Feld, hell und nachts, gegen die Akzentfarbe der Ebene. */
async function fokusMessen(page, sel) {
  const r = {};
  for (const modus of ['hell', 'nacht']) {
    await page.evaluate((m) => document.documentElement.classList.toggle('dark-mode', m === 'nacht'), modus);
    await page.locator(sel).focus();
    await page.waitForTimeout(150);
    r[modus] = await page.evaluate((s) => {
      const el = document.querySelector(s); const cs = getComputedStyle(el);
      const probe = document.createElement('span'); document.body.appendChild(probe);
      const farbe = (v) => { probe.style.color = 'var(' + v + ')'; return getComputedStyle(probe).color; };
      const soll = document.documentElement.classList.contains('dark-mode') ? farbe('--salbei-nacht') : farbe('--salbei-dunkel');
      probe.remove();
      return { ring: cs.outlineStyle, unterkante: cs.borderBottomColor, unterkanteBreite: cs.borderBottomWidth, schatten: cs.boxShadow, soll };
    }, sel);
  }
  await page.evaluate(() => document.documentElement.classList.remove('dark-mode'));
  return r;
}

function fokusFehler(r) {
  const f = [];
  for (const [modus, m] of Object.entries(r)) {
    if (m.ring !== 'none') f.push(modus + ': Ring um das Feld (' + m.ring + ')');
    if (m.unterkante !== m.soll) f.push(modus + ': Unterkante ' + m.unterkante + ' statt Akzent ' + m.soll);
    const innen = m.schatten.includes('inset') && m.schatten.includes(m.soll) && /0px -1px 0px/.test(m.schatten);
    if (m.unterkanteBreite !== '1px' || !innen) f.push(modus + ': Unterkante nicht 2 px (' + m.unterkanteBreite + ', ' + m.schatten + ')');
    if (/0px 0px 0px [1-9]/.test(m.schatten)) f.push(modus + ': Hof um das Feld');
  }
  return f;
}

/* Unterkante gegen die Fläche 3 px darunter, am Bild: je Spalte die stärkste der letzten Pixelzeilen, das 1-%-Quantil zählt. */
async function unterkante(page, sel) {
  const r = await page.locator(sel).boundingBox();
  if (!r) return 0;
  const bild = (await page.screenshot()).toString('base64');
  return page.evaluate(async ([b64, f]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const sx = img.width / innerWidth; const y = f.y + f.height;
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
    const unten = g.getImageData(0, Math.round((y + 3) * sx), img.width, 1).data;
    const zeilen = [3, 2, 1, 0].map((d) => g.getImageData(0, Math.max(0, Math.floor(y * sx) - d), img.width, 1).data);
    const werte = [];
    for (let x = Math.round((f.x + 6) * sx); x < Math.round((f.x + f.width - 6) * sx); x += 3) {
      const b = L(unten, x * 4);
      werte.push(Math.max(...zeilen.map((z) => { const a = L(z, x * 4); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); })));
    }
    werte.sort((p, q) => p - q);
    return werte.length ? Math.round(werte[Math.floor(werte.length * 0.01)] * 100) / 100 : 0;
  }, [bild, r]);
}

async function entsperrfeldMessen(page) {
  const k = {};
  for (const modus of ['tag', 'nacht']) {
    if (modus === 'nacht') await page.evaluate(() => document.documentElement.classList.add('dark-mode'));
    await page.locator('#co-pw').blur();
    await page.waitForTimeout(200);
    k[modus] = await unterkante(page, '#co-pw');
  }
  await page.evaluate(() => document.documentElement.classList.remove('dark-mode'));
  const form = await page.evaluate(() => { const cs = getComputedStyle(document.getElementById('co-pw')); return { hoehe: document.getElementById('co-pw').getBoundingClientRect().height, radius: cs.borderTopLeftRadius }; });
  return { k, ...form };
}

/* Im Browser, auf der offenen Bereichsseite: Abschnitt, Gruppe und Label nach Größe; Versalien; Gewicht der Listentitel. */
function RANG() {
  const sicht = (sel) => [...document.querySelectorAll('#content ' + sel)].filter((el) => el.checkVisibility() && (el.tagName === 'INPUT' || el.textContent.trim()));
  const px = (el) => parseFloat(getComputedStyle(el).fontSize);
  const abschnitt = sicht('.sektion-titel');
  const listen = sicht('.feld-zeile:has(> .feld-wert > .feld-liste-editor) > .feld-label');
  const gruppe = sicht('.feldgruppen-karte-titel').concat(listen);
  const label = sicht('.feld-label').filter((el) => !el.parentElement.matches('.feld-zeile:has(> .feld-wert > .feld-liste-editor)'));
  return {
    abschnitt: abschnitt.length ? Math.min(...abschnitt.map(px)) : null,
    gruppeMin: gruppe.length ? Math.min(...gruppe.map(px)) : null,
    gruppeMax: gruppe.length ? Math.max(...gruppe.map(px)) : null,
    label: label.length ? Math.max(...label.map(px)) : null,
    versalien: abschnitt.filter((el) => getComputedStyle(el).textTransform === 'uppercase').map((el) => el.textContent.trim()),
    listeLeicht: listen.filter((el) => parseInt(getComputedStyle(el).fontWeight, 10) < 600).map((el) => el.textContent.trim()),
    labelLaut: label.filter((el) => { const c = getComputedStyle(el); const wert = el.parentElement.querySelector('input[type="text"]');
      return parseInt(c.fontWeight, 10) > 500 || (wert && getComputedStyle(wert).color === c.color); }).slice(0, 3).map((el) => el.textContent.trim()),
    platzhalter: sicht('.feld-zeile input[placeholder]').filter((el) => { const p = getComputedStyle(el, '::placeholder');
      return p.fontStyle === 'italic' || p.fontSize !== getComputedStyle(el).fontSize; }).slice(0, 3).map((el) => el.placeholder),
    niedrig: sicht('.feld-zeile input[type="text"]').filter((el) => el.getBoundingClientRect().height < 44).slice(0, 3).map((el) => el.id || el.name),
  };
}

function rangFehler(bereich, r) {
  const f = [];
  if (r.abschnitt !== null && r.gruppeMax !== null && !(r.abschnitt > r.gruppeMax)) f.push(bereich + ': Abschnitt ' + r.abschnitt + ' ≤ Gruppe ' + r.gruppeMax);
  if (r.abschnitt !== null && r.label !== null && !(r.abschnitt > r.label)) f.push(bereich + ': Abschnitt ' + r.abschnitt + ' ≤ Label ' + r.label);
  if (r.gruppeMin !== null && r.label !== null && !(r.gruppeMin > r.label)) f.push(bereich + ': Gruppe ' + r.gruppeMin + ' ≤ Label ' + r.label);
  for (const t of r.versalien) f.push(bereich + ': Abschnitt in Versalien „' + t + '“');
  for (const t of r.listeLeicht) f.push(bereich + ': Listentitel als Label „' + t + '“');
  for (const t of r.labelLaut) f.push(bereich + ': Label lauter als der Wert „' + t + '“');
  for (const t of r.platzhalter) f.push(bereich + ': Platzhalter kursiv oder kleiner als der Wert „' + t + '“');
  for (const t of r.niedrig) f.push(bereich + ': Feld unter 44 px „' + t + '“');
  return f;
}

/* Jede Bereichsseite der Seitenleiste nacheinander öffnen und messen. */
async function rangAlleBereiche(page, zusatzCss) {
  const ids = await page.evaluate(() => [...document.querySelectorAll('.nav-item[data-sektor]')].map((e) => e.getAttribute('data-sektor')));
  const fehler = []; let gemessen = 0;
  for (const id of ids) {
    await page.evaluate((s) => { const el = document.querySelector('.nav-item[data-sektor="' + s + '"]'); if (el) el.click(); }, id);
    await page.waitForTimeout(150);
    if (zusatzCss) await page.addStyleTag({ content: zusatzCss });
    const r = await page.evaluate(RANG);
    if (r.abschnitt !== null) gemessen++;
    fehler.push(...rangFehler(id, r));
  }
  return { ids, gemessen, fehler };
}

test.describe('Feldschrift und Entsperrfeld', () => {
  /* Ein Test je Messung, die Produkte innen: so bleibt die Zahl der Tests gleich der Zahl der test()-Aufrufe (A423). Jedes Produkt in
     einem frischen Kontext, sonst fände das zweite das Depot des ersten im Speicher und zeigte den Entsperr-Schirm statt des Starts. */
  test('[Feldschrift·Dialog] alle Produkte: Eingaben im Anlege-Dialog in der Schrift und Farbe der Seite, wachsen mit „Schrift größer“', async ({ browser }) => {
    test.setTimeout(120000);
    expect(PRODUKTE.length, 'Voraussetzung: gebackene Produkte').toBeGreaterThan(0);
    for (const [slug, url] of PRODUKTE) {
      const kontext = await browser.newContext();
      const page = await kontext.newPage();
      await anlegeDialog(page, url);
      const felder = await page.evaluate(SCHRIFT, '.modal input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), .modal select, .modal textarea');
      expect(felder.length, slug + ': Voraussetzung, im Dialog stehen Felder').toBeGreaterThan(1);
      expect(schriftFehler(felder), slug + ': Dialogfelder').toEqual([]);
      const normal = await groessen(page, '#id-vorname', 'label[for="id-vorname"]', '');
      const gross = await groessen(page, '#id-vorname', 'label[for="id-vorname"]', 'fs-large');
      expect(normal.eingabe, slug + ': Eingabe am Rechner 15 px (Rolle Wert)').toBe(15);
      expect(gross.eingabe / normal.eingabe, slug + ': Eingabe wächst wie die Beschriftung (' + JSON.stringify({ normal, gross }) + ')').toBeCloseTo(gross.label / normal.label, 2);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => document.documentElement.classList.remove('fs-medium', 'fs-large'));
      expect(fokusFehler(await fokusMessen(page, '#id-vorname')), slug + ': Fokusring').toEqual([]);
      const schmal = await groessen(page, '#id-vorname', 'label[for="id-vorname"]', '');
      expect(schmal.eingabe, slug + ': Eingabe bei 390 px nie unter 16 px').toBeGreaterThanOrEqual(16);
      await kontext.close();
    }
  });

  test('[Feldschrift·Entsperrfeld] alle Produkte: Entsperrfeld in der Schrift der Seite, Unterkante ≥ 3:1 tags und nachts, 44 px, Radius wie im Dialog', async ({ browser }) => {
    test.setTimeout(300000);
    expect(PRODUKTE.length, 'Voraussetzung: gebackene Produkte').toBeGreaterThan(0);
    for (const [slug, url] of PRODUKTE) {
      const kontext = await browser.newContext();
      const page = await kontext.newPage();
      await anlegeDialog(page, url);
      const dialogRadius = await page.evaluate(() => getComputedStyle(document.getElementById('id-vorname')).borderTopLeftRadius);
      await entsperren(page, url);
      expect(schriftFehler(await page.evaluate(SCHRIFT, '#co-pw')), slug + ': Entsperrfeld').toEqual([]);
      const m = await entsperrfeldMessen(page);
      expect(m.k.tag, slug + ': Unterkante tags').toBeGreaterThanOrEqual(3);
      expect(m.k.nacht, slug + ': Unterkante nachts').toBeGreaterThanOrEqual(3);
      expect(m.hoehe, slug + ': Höhe').toBeGreaterThanOrEqual(44);
      expect(m.radius, slug + ': Radius wie das Feld im Anlege-Dialog').toBe(dialogRadius);
      await kontext.close();
    }
  });

  test('[Feldschrift·Rangfolge] alle Produkte: in jedem Bereich Abschnitt > Gruppe > Label, keine Versalien, Listentitel halbfett', async ({ browser }) => {
    test.setTimeout(300000);
    expect(PRODUKTE.length, 'Voraussetzung: gebackene Produkte').toBeGreaterThan(0);
    for (const [slug, url] of PRODUKTE) {
      const kontext = await browser.newContext();
      const page = await kontext.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      await h.oeffneApp(page, { url });
      await h.depotAnlegen(page, { pw: PW });
      const m = await rangAlleBereiche(page, '');
      expect(m.gemessen, slug + ': Voraussetzung, Bereiche mit Abschnitten gemessen (' + m.ids.length + ' Bereiche)').toBeGreaterThan(3);
      expect(m.fehler, slug + ': Rangfolge').toEqual([]);
      await kontext.close();
    }
  });

  test('[Feldschrift·Rot-Beweis] mit der Stilregel von v963 schlagen Schrift, Wachsen und Entsperrfeld an', async ({ page }) => {
    test.setTimeout(90000);
    await anlegeDialog(page, h.KERN_URL_PRIVAT_DE);
    await page.addStyleTag({ content: ALTSTAND_CSS });
    expect(schriftFehler(await page.evaluate(SCHRIFT, '#id-vorname')).length, 'Arial und Schwarz im Dialog erkannt').toBe(1);
    const normal = await groessen(page, '#id-vorname', 'label[for="id-vorname"]', '');
    const gross = await groessen(page, '#id-vorname', 'label[for="id-vorname"]', 'fs-large');
    expect(gross.eingabe, 'feste 16 px erkannt').toBe(normal.eingabe);
    expect(gross.label).toBeGreaterThan(normal.label);
    await page.evaluate(() => document.documentElement.classList.remove('fs-medium', 'fs-large'));
    await page.addStyleTag({ content: '#id-vorname:focus-visible { outline: 2px solid var(--ink) !important; outline-offset: 2px !important; border-bottom-color: var(--line) !important; box-shadow: 0 0 0 2px var(--white) !important; }' });
    const altFokus = fokusFehler(await fokusMessen(page, '#id-vorname'));
    expect(altFokus.some((x) => /Ring um das Feld/.test(x)), 'Ring erkannt').toBe(true);
    expect(altFokus.some((x) => /statt Akzent/.test(x)), 'Unterkante ohne Akzent erkannt').toBe(true);
    expect(altFokus.some((x) => /Hof um das Feld/.test(x)), 'Hof erkannt').toBe(true);
    await entsperren(page, h.KERN_URL_PRIVAT_DE);
    await page.addStyleTag({ content: ALTSTAND_CSS });
    expect(schriftFehler(await page.evaluate(SCHRIFT, '#co-pw')).length, 'Arial im Entsperrfeld erkannt').toBe(1);
    const m = await entsperrfeldMessen(page);
    expect(m.k.tag, 'Vollrahmen in --line unter 3:1 erkannt').toBeLessThan(3);
    expect(m.hoehe, '36 px erkannt').toBeLessThan(44);
    await page.reload();
    await page.locator('#co-pw').fill(PW);
    await page.locator('#co-pw').press('Enter');
    await page.waitForSelector('.nav-item[data-sektor]', { state: 'attached', timeout: 15000 });
    const alt = await rangAlleBereiche(page, ALTSTAND_RANG_CSS);
    expect(alt.fehler.some((f) => /Abschnitt .* ≤ Label/.test(f)), 'Abschnitt kleiner als Label erkannt').toBe(true);
    expect(alt.fehler.some((f) => /Versalien/.test(f)), 'Versalien erkannt').toBe(true);
    expect(alt.fehler.some((f) => /Gruppe .* ≤ Label/.test(f)), 'Gruppe so groß wie Label erkannt').toBe(true);
    expect(alt.fehler.some((f) => /Label lauter/.test(f)), 'Label in 550 erkannt').toBe(true);
    expect(alt.fehler.some((f) => /Platzhalter/.test(f)), 'kursiver Platzhalter erkannt').toBe(true);
    expect(alt.fehler.some((f) => /unter 44 px/.test(f)), '36-px-Feld erkannt').toBe(true);
  });
});
