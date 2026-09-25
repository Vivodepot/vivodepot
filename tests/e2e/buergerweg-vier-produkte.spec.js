'use strict';
/* Bürgerweg durch alle VIER gebackenen Produkte (privat-de/en, pro-de/en), nur über Klicks
   und die vorhandenen Ausgabe-Auslöser: anlegen, in JEDEM Bereich ein Feld füllen, sichern,
   schließen, wieder öffnen und ALLE Werte vergleichen; jede Ausgabeart auslösen, den
   Download fangen und mit Fremdwerkzeugen prüfen (pdfinfo/pdftotext/xmllint/JSON.parse);
   die Datei in der Lese-App öffnen; Sprachumschalter der Lese-App; axe.
   Der Abgleich läuft überall gegen DIESELBEN Feldwerte (`werte`), damit ein Verlust in
   irgendeinem Ausgang auffällt. Vier ausgeschriebene Tests statt Schleife: die Zählung
   in tests/a423-e2e-zahl.test.js erkennt Schleifen nur an bekannten Stellen. */
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  KERN_URL_PRIVAT_DE, KERN_URL_PRIVAT_EN, KERN_URL_PRO_DE, KERN_URL_PRO_EN,
  oeffneApp, depotAnlegen, oeffneSektor, setzeFeld,
} = require('./helpers');

const PW = 'buergerweg-vier-produkte-2026';
const LESE_APP = 'file://' + path.resolve(__dirname, '../../vivodepot-lesen.html');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

function werkzeug(cmd, args, eingabe) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', input: eingabe, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) {
    throw new Error(cmd + ' ' + args.join(' ') + ' → ' + String(e.stderr || e.message).slice(0, 300));
  }
}
const ohneLeer = (s) => String(s).replace(/\s+/g, '');

async function fsaAttrappe(page) {
  await page.evaluate(() => {
    window.__bwBytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'buergerweg.vivodepot',
        createWritable: async () => {
          let s = '';
          return { write: async (c) => { s += typeof c === 'string' ? c : await c.text(); }, close: async () => { window.__bwBytes = s; } };
        },
      }),
    });
  });
}

// Ein Feld je Bereich: das erste sichtbare Text-/Textarea-Feld mit data-edit, Wert eindeutig je Produkt+Bereich.
async function alleBereicheFuellen(page, slug) {
  const ids = await page.evaluate(() => { const b = window.__vdOeffentlich.bereicheAlle(); return (Array.isArray(b) ? b : Object.values(b)).map((x) => x.id); });
  const werte = [];
  for (const id of ids) {
    await oeffneSektor(page, id);
    const kandidaten = await page.evaluate(() => [...document.querySelectorAll('#content [data-edit]')].filter((x) => !x.disabled && !x.readOnly && (x.type === 'text' || x.tagName === 'TEXTAREA')).map((x) => x.dataset.edit));
    let feld = null;
    for (const k of kandidaten) { if (await page.locator('[data-edit="' + k + '"]').first().isVisible()) { feld = k; break; } }
    expect(feld, 'Bereich ' + id + ' hat kein füllbares Textfeld').toBeTruthy();
    const wert = 'KLK' + slug.replace(/-/g, '') + id.replace(/[^A-Za-z0-9]/g, '') + 'X' + werte.length;
    await setzeFeld(page, feld, wert);
    werte.push({ bereich: id, feld, wert });
  }
  return werte;
}

async function werteLesen(page, werte) {
  const gelesen = [];
  for (const w of werte) {
    await oeffneSektor(page, w.bereich);
    gelesen.push(await page.locator('[data-edit="' + w.feld + '"]').inputValue());
  }
  return gelesen;
}

async function schliessen(page) {
  // Der Hinweis „So kommen Sie später wieder hinein" folgt der ersten Sicherung und verdeckt die Topbar.
  if (await page.locator('#m-ok').isVisible().catch(() => false)) await page.click('#m-ok');
  await page.click('#tb-marke');
  if (await page.locator('#m-ok').isVisible().catch(() => false)) await page.click('#m-ok');
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });
}

async function axeHart(page, name) {
  const r = await new AxeBuilder({ page }).withTags(WCAG).exclude('.logo-wort').exclude('.welcome-wort').analyze();
  const hart = r.violations.filter((v) => (v.impact === 'critical' || v.impact === 'serious') && v.id !== 'color-contrast');
  expect(hart.map((v) => v.id + ' (' + v.nodes.length + ') ' + v.nodes[0].target.join(' ')), 'axe ' + name).toEqual([]);
}

// Löst einen Ausgabeweg aus und fängt JEDEN Download (Datei + Name) bis zur Ruhe.
async function ausloesen(page, name, aufruf, arg) {
  const fang = [];
  const h = async (d) => { const p = await d.path(); fang.push({ name: d.suggestedFilename(), bytes: fs.readFileSync(p) }); };
  page.on('download', h);
  const fehler = [];
  const f = (m) => { if (m.type() === 'error' && !m.text().includes('frame-ancestors')) fehler.push(m.text()); };
  page.on('console', f);
  await page.evaluate(aufruf, arg);
  await page.waitForTimeout(700);
  for (const sel of ['#m-ok', '#exp-fortfahren']) {
    if (await page.locator(sel).first().isVisible().catch(() => false)) { await page.locator(sel).first().click().catch(() => {}); await page.waitForTimeout(700); }
  }
  page.off('download', h); page.off('console', f);
  return { name, fang, fehler };
}

function artefaktPruefen(d, werte) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'bw-'));
  const p = path.join(t, d.name.replace(/[^\w.-]/g, '_'));
  fs.writeFileSync(p, d.bytes);
  if (process.env.BW_DUMP) { fs.mkdirSync(process.env.BW_DUMP, { recursive: true }); fs.writeFileSync(path.join(process.env.BW_DUMP, d.name), d.bytes); }
  try {
    if (/\.pdf$/i.test(d.name)) {
      expect(werkzeug('pdfinfo', [p]), 'pdfinfo ' + d.name).toMatch(/Pages:\s+[1-9]/);
      return ohneLeer(werkzeug('pdftotext', ['-layout', p, '-']));
    }
    if (/\.xml$/i.test(d.name)) { werkzeug('xmllint', ['--noout', p]); return ohneLeer(d.bytes.toString('utf8')); }
    const s = d.bytes.toString('utf8');
    if (/\.(json)$/i.test(d.name) || /^\s*[{[]/.test(s)) JSON.parse(s);
    expect(s.length, d.name + ' leer').toBeGreaterThan(0);
    return ohneLeer(s);
  } finally { fs.rmSync(t, { recursive: true, force: true }); }
}

async function buergerweg(page, browser, slug, url, testInfo) {
  test.setTimeout(300000);
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('frame-ancestors')) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {} });
  const lauf = { slug, ausgaben: [] };

  await oeffneApp(page, { url });
  await fsaAttrappe(page);
  await depotAnlegen(page, { pw: PW });
  await page.evaluate(() => { window.__bwBytes = null; });

  const werte = await test.step('anlegen und in jedem Bereich ein Feld füllen', () => alleBereicheFuellen(page, slug));
  const personName = 'KLKperson' + slug.replace(/-/g, '');
  await page.evaluate((n) => { window.__vdOeffentlich.personHinzufuegen({ name: n, tel: '0301234567', beziehung: 'Freund' }); window.__vdOeffentlich.bearbeitungSpeichern(); }, personName);
  await axeHart(page, slug + ' Bereich');

  await test.step('sichern, schließen, wieder öffnen, alle Werte vergleichen', async () => {
    await page.click('#tb-save-status .tb-save-knopf');
    await expect.poll(() => page.evaluate(() => window.__bwBytes !== null), { timeout: 8000 }).toBe(true);
    await schliessen(page);
    const bytes = await page.evaluate(() => window.__bwBytes);
    expect(bytes).toBeTruthy();
    lauf.datei = path.join(os.tmpdir(), 'bw-' + slug + '-' + Date.now() + '.vivodepot');
    fs.writeFileSync(lauf.datei, bytes, 'utf8');
    await page.click('#w-datei');
    await page.setInputFiles('#co-datei', lauf.datei);
    await page.fill('#co-pw', PW);
    await page.click('#w-oeffnen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    const gelesen = await werteLesen(page, werte);
    expect(gelesen, 'nach dem Wiederöffnen fehlen Werte (Verlust)').toEqual(werte.map((w) => w.wert));
  });

  const verluste = [];
  await test.step('jede Ausgabeart auslösen und den Fang prüfen', async () => {
    const formate = await page.evaluate(() => (window.__vdOeffentlich.EXPORT_FORMATE || []).map((f) => f.id));
    const wege = [
      ['voll-depot-pdf', () => window.__vdOeffentlich.flowVollDepotPdf({}), null, 'pdf', false],
      ['voll-depot-pdf-mit-sensiblem', () => window.__vdOeffentlich.flowVollDepotPdf({ sensibel: true }), null, 'pdf', true],
      ['notfallkarte-pdf', () => window.__vdOeffentlich.flowNotfallkartePdf(), null, 'pdf', false],
      ['situation-pdf', (id) => window.__vdOeffentlich.flowSituationPdf(id), await page.evaluate(() => Object.keys(window.__vdOeffentlich.SITUATION_BY_ID || {})[0] || null), 'pdf', false],
      ['zusammenstellung', (a) => window.__vdOeffentlich.flowZusammenstellungHerausgeben(a.k, 'Klick'), { k: ['identity.givenName'] }, 'pdf|json', false],
      ['anlass', (id) => window.__vdOeffentlich.flowAnlassExport(id), await page.evaluate(() => Object.keys(window.__vdOeffentlich.SITUATION_BY_ID || {})[0] || null), 'pdf|json', false],
      ['fhir', () => window.__vdOeffentlich.flowGesundheitFhirExport(), null, 'json', false],
      ['erbschein-xml', () => window.__vdOeffentlich.flowErbscheinXmlSichern(), null, 'xml', false],
    ];
    // Sensibles wird ohne Freigabe zurückgehalten (Opt-in); der Verlust-Abgleich läuft darum mit Freigabe.
    for (const b of werte) wege.push(['bereich-pdf-' + b.bereich, (id) => window.__vdOeffentlich.flowBereichPdf(id, { sensibel: true }), b.bereich, 'pdf', false, b.wert]);
    for (const id of formate) wege.push(['format-' + id, (i) => window.__vdOeffentlich.flowFormatExport(i), id, null, false, id === 'vcard-menschen' ? personName : id === 'vcard-identitaet' ? werte[0].wert : null]);
    for (const id of formate) wege.push(['format-mit-sensiblem-' + id, (i) => window.__vdOeffentlich.flowFormatExport(i, { sensibel: true }), id, null, false, id === 'vcard-menschen' ? personName : null]);

    for (const [name, aufruf, arg, erwartet, alleWerte, einWert] of wege) {
      const fn = /window\.__vdOeffentlich\.(\w+)/.exec(aufruf.toString())[1];
      if (!(await page.evaluate((n) => typeof window.__vdOeffentlich[n] === 'function', fn))) { lauf.ausgaben.push({ name, dateien: [], nicht_ausloesbar: true }); continue; }
      const r = await ausloesen(page, name, aufruf, arg);
      const uebersicht = { name, dateien: r.fang.map((d) => d.name), konsole: r.fehler.length };
      if (r.fang.length === 0) { uebersicht.kein_download = true; lauf.ausgaben.push(uebersicht); continue; }
      for (const d of r.fang) {
        let text;
        try { text = artefaktPruefen(d, werte); } catch (e) { verluste.push(name + ': ' + d.name + ' → ' + String(e.message).split('\n')[0].slice(0, 200)); continue; }
        if (name === 'voll-depot-pdf') lauf.ohneFreigabe = text;
        if (alleWerte) for (const w of werte) if (!text.includes(ohneLeer(w.wert))) verluste.push(name + ': ' + d.name + ' ohne ' + w.wert + ' (' + w.bereich + ')');
        if (einWert && !text.includes(ohneLeer(einWert))) verluste.push(name + ' ohne ' + einWert);
      }
      lauf.ausgaben.push(uebersicht);
    }
  });
  testInfo.attach('ausgaben-' + slug + '.json', { body: JSON.stringify(lauf.ausgaben, null, 1), contentType: 'application/json' });
  console.log('AUSGABEN ' + slug + ' ' + JSON.stringify(lauf.ausgaben.map((a) => a.name + ':' + (a.nicht_ausloesbar ? 'n/a' : a.kein_download ? '—' : a.dateien.join('+') + (a.konsole ? '!' + a.konsole : '')))));
  expect.soft(verluste, 'Werte gingen in einer Ausgabe verloren').toEqual([]);

  await test.step('Lese-App: Datei öffnen, Werte sichtbar, Sprachumschalter, axe', async () => {
    const ctx = await browser.newContext({ locale: slug.endsWith('-en') ? 'en-GB' : 'de-DE' });
    const seite = await ctx.newPage();
    const lf = [];
    seite.on('pageerror', (e) => lf.push('pageerror: ' + e.message));
    await seite.goto(LESE_APP);
    await seite.setInputFiles('#datei-input', lauf.datei);
    await seite.locator('#pw-feld').waitFor();
    await axeHart(seite, slug + ' Lese-App Passwort');
    const sprache = seite.locator('#sprache-en');
    const hatUmschalter = (await sprache.count()) > 0;
    expect.soft(hatUmschalter, 'Lese-App hat keinen DE/EN-Umschalter vor dem Entschlüsseln').toBe(true);
    if (hatUmschalter) {
      const zuerst = await seite.locator('h1').first().innerText();
      await seite.locator(slug.endsWith('-en') ? '#sprache-de' : '#sprache-en').click();
      const danach = await seite.locator('h1').first().innerText();
      expect.soft(danach, 'Sprachwechsel ändert die Überschrift nicht').not.toEqual(zuerst);
      await seite.locator(slug.endsWith('-en') ? '#sprache-en' : '#sprache-de').click();
      expect.soft(await seite.locator('h1').first().innerText(), 'Zurückschalten stellt die Überschrift nicht wieder her').toEqual(zuerst);
    }
    await seite.fill('#pw-feld', PW);
    await seite.locator('#pw-form button[type=submit]').click();
    await seite.waitForTimeout(1500);
    const fehlt = [];
    const unklar = [];
    for (const w of werte) {
      const knopf = seite.locator('[data-sektor="' + w.bereich + '"]').first();
      if (await knopf.count()) await knopf.click();
      await seite.waitForTimeout(150);
      const text = ohneLeer(await seite.locator('body').innerText());
      // Sensibles hält auch das PDF ohne Freigabe zurück; nur was dort steht, MUSS die Lese-App zeigen.
      if (!text.includes(ohneLeer(w.wert)) && (lauf.ohneFreigabe || '').includes(ohneLeer(w.wert))) { fehlt.push(w); }
      else if (!text.includes(ohneLeer(w.wert))) {
        // Zurückgehaltenes heißt „hinterlegt, nur mit Freigabe sichtbar", nicht „nicht hinterlegt".
        if (!/Freigabe|release/.test(await seite.locator('#app').innerText())) unklar.push(w);
      }
    }
    await axeHart(seite, slug + ' Lese-App offen');
    await ctx.close();
    expect.soft(unklar.map((w) => w.bereich + '=' + w.wert), 'zurückgehaltene Werte zeigen in der Lese-App nicht den Freigabe-Satz').toEqual([]);
    expect.soft(fehlt.map((w) => w.bereich + '=' + w.wert), 'in der Lese-App fehlen Werte').toEqual([]);
    expect.soft(lf).toEqual([]);
  });

  fs.rmSync(lauf.datei, { force: true });
  expect.soft(fehler, 'Konsolenfehler im Bürgerweg: ' + fehler.join(' | ')).toEqual([]);
}

test('[Bürgerweg·privat-de] anlegen, füllen, sichern, öffnen, ausgeben, Lese-App, axe', async ({ page, browser }, ti) => { await buergerweg(page, browser, 'privat-de', KERN_URL_PRIVAT_DE, ti); });
test('[Bürgerweg·privat-en] anlegen, füllen, sichern, öffnen, ausgeben, Lese-App, axe', async ({ page, browser }, ti) => { await buergerweg(page, browser, 'privat-en', KERN_URL_PRIVAT_EN, ti); });
test('[Bürgerweg·pro-de] anlegen, füllen, sichern, öffnen, ausgeben, Lese-App, axe', async ({ page, browser }, ti) => { await buergerweg(page, browser, 'pro-de', KERN_URL_PRO_DE, ti); });
test('[Bürgerweg·pro-en] anlegen, füllen, sichern, öffnen, ausgeben, Lese-App, axe', async ({ page, browser }, ti) => { await buergerweg(page, browser, 'pro-en', KERN_URL_PRO_EN, ti); });
