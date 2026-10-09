// @ts-check
/* pixel-kontrast.spec.js — Text-Kontrast am gerenderten Bild, neben axe (U2-ADR-473 W6, 05.10.2026)
   Klassenwächter zum Befund SUBDEPOT-LEISTE-UNTERZEILE-KONTRAST: axe legte die Leisten-Unterzeile im Sub-Depot (3,65:1) als nicht bestimmbar
   ab, nicht als Verstoß. Gemessen wird hier am Bild (tools/lib/pixel-kontrast.js, dieselbe Messart wie die Lesbarkeits-Probe der Website):
   Start und Notfall im eigenen Depot, dazu ein Sub-Depot in JEDER wählbaren Farbe (SUBDEPOT_PALETTE des Kerns), je in Tag, Nacht und
   Hochkontrast. Bekannte Unterschreitungen stehen in fixtures/pixel-kontrast-grundlinie.json, je an einen offenen Befund gebunden; die Liste
   darf nur sinken, ein Eintrag, der nicht mehr zutrifft, ist ebenfalls rot. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const h = require('./helpers.js');
const PK = require('../../tools/lib/pixel-kontrast.js');

const GRUNDLINIE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pixel-kontrast-grundlinie.json'), 'utf8'));
const PW = 'e2e-passwort-123';
// Die wählbare Palette, aus dem gebackenen Produkt gelesen, das die Probe öffnet (im laufenden Produkt ist SUBDEPOT_PALETTE keine globale
// Konstante): folgt jeder Änderung der Palette.
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');
const palette = () => JSON.parse(/const SUBDEPOT_PALETTE = Object\.freeze\((\[[^\]]*\])\)/.exec(fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8'))[1].replace(/'/g, '"'));


async function modi(page, ansicht, funde) {
  for (const [modus, knopf] of [['tag', null], ['nacht', '#tb-nacht'], ['hochkontrast', '#tb-kontrast']]) {
    if (knopf) { await page.click(knopf); await page.waitForTimeout(300); }
    // Flüchtige Hinweise (Toasts) gehören nicht zur Ansicht und blenden während der Messung aus: vorher wegräumen.
    await page.evaluate(() => document.querySelectorAll('#toast-host > *').forEach((t) => t.remove()));
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('#content, .content, main, #app').forEach((e) => { e.scrollTop = 0; }); });
    const r = await PK.messen(page);
    for (const u of r.unter) funde.push({ ansicht: ansicht + '/' + modus, ...u });
    if (knopf) { await page.click(knopf); await page.waitForTimeout(300); }
  }
}

/* Toasts sind flüchtig und werden vor den Ansichts-Messungen weggeräumt; hier eigens gemessen, sichtbar, je Art und Modus (Bedingung der Gegenlesung). */
async function toasts(page, funde) {
  for (const [modus, knopf] of [['tag', null], ['nacht', '#tb-nacht'], ['hochkontrast', '#tb-kontrast']]) {
    if (knopf) { await page.click(knopf); await page.waitForTimeout(300); }
    for (const art of ['info', 'ok', 'fehler']) {
      await page.evaluate(() => document.querySelectorAll('#toast-host > *').forEach((t) => t.remove()));
      await page.evaluate((art) => window.__vdOeffentlich.ui.toast('Probe-Hinweis zur Messung', art), art);
      await page.waitForSelector('#toast-host .toast');
      const r = await PK.messen(page);
      for (const u of r.unter) funde.push({ ansicht: 'toast:' + art + '/' + modus, ...u });
    }
    await page.evaluate(() => document.querySelectorAll('#toast-host > *').forEach((t) => t.remove()));
    if (knopf) { await page.click(knopf); await page.waitForTimeout(300); }
  }
}

test('[Pixel-Kontrast] Start, Notfall und ein Sub-Depot je wählbarer Farbe halten 4,5:1 in Tag, Nacht und Hochkontrast', async ({ page }) => {
  test.setTimeout(240000);
  await h.oeffneApp(page);
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: PW });
  const funde = [];
  await modi(page, 'start', funde);
  await toasts(page, funde);
  await page.click('#sidebar [data-notfall]'); await page.waitForTimeout(400);
  await modi(page, 'notfall', funde);
  const toene = palette();
  expect(toene.length).toBeGreaterThan(0);
  for (const ton of toene) {
    const u = await page.evaluate(async ([ton, pw]) => {
      const V = window.__vdOeffentlich;
      const e = await V.subDepotAnlegen({ bezeichnung: 'Probe ' + ton, inhaberin: 'Probe', verwaltungsTyp: 'verwaltet', akzent: ton }, pw);
      await V.subDepotVertrauenOeffnen(e.depotUUID, pw); V.subKontextBetreten(e.depotUUID); V.oeffneSektor('finance');
      return e.depotUUID;
    }, [ton, PW]);
    await page.waitForSelector('#content .bereich-kopf');
    await modi(page, 'subdepot:' + ton, funde);
    await page.evaluate((u) => { window.__vdOeffentlich.subKontextVerlassen(); return u; }, u);
  }
  if (process.env.VD_PK_FUNDE) fs.writeFileSync(process.env.VD_PK_FUNDE + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.json', JSON.stringify(funde, null, 1));
  const { neu, luft } = PK.abgleichen(funde, GRUNDLINIE.bekannt);
  expect(neu, 'Text unter 4,5:1 (große Schrift 3:1), nicht in der Ausnahmeliste:\n' + neu.map((f) => `${f.ansicht} ${f.ort} „${f.text}“ ${f.k}:1`).join('\n')).toEqual([]);
  expect(luft.map((b) => b.befund + ' ' + b.sicht + ' ' + b.ort + ' „' + b.text + '“'), 'Ausnahme trifft nicht mehr zu — Befund schließen und Eintrag entfernen').toEqual([]);
});

/* Rot-Beweise an kleinen Seiten: dieselbe Messung muss die drei Formen finden, an denen ein CSS-Rechner vorbeisieht. */
const seite = (koerper) => '<!doctype html><html lang="de"><head><meta charset="utf-8"><style>body{margin:0;font:16px/1.4 sans-serif}</style></head><body>' + koerper + '</body></html>';

test('[Pixel-Kontrast·Rot-Beweis] helle Schrift auf heller Glasfläche fällt durch', async ({ page }) => {
  await page.setContent(seite('<div style="background:linear-gradient(#e9eef0,#f6f6f2);padding:40px"><div style="background:rgba(255,255,255,.6);backdrop-filter:blur(10px);padding:16px"><p style="color:#9aa5a0">Hell auf Glas</p></div></div>'));
  const r = await PK.messen(page);
  expect(r.unter.map((u) => u.text)).toContain('Hell auf Glas');
});

test('[Pixel-Kontrast·Rot-Beweis] Text auf Verlauf: die Mittelfarbe besteht, das 1-%-Perzentil fällt', async ({ page }) => {
  // Mittelfarbe des Verlaufs ≈ #9a9a9a; Schrift #000 hält dagegen (~7,9:1), am dunklen Ende (#202020) nicht.
  await page.setContent(seite('<p style="margin:0;padding:8px;width:300px;color:#000;background:linear-gradient(90deg,#202020,#f4f4f4)">Text auf Verlauf ganz durch</p>'));
  const mitte = await page.evaluate(() => { const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const L = 0.2126 * lin(0x9a) + 0.7152 * lin(0x9a) + 0.0722 * lin(0x9a); return (L + 0.05) / 0.05; });
  expect(mitte).toBeGreaterThan(4.5);
  const r = await PK.messen(page);
  expect(r.unter.map((u) => u.text)).toContain('Text auf Verlauf ganz durch');
});

test('[Pixel-Kontrast·Rot-Beweis] aria-hidden mit lesbarem Text bleibt geprüft, ein Schmuckzeichen nicht', async ({ page }) => {
  await page.setContent(seite('<p style="background:#fff;color:#c8c8c8;padding:8px"><span aria-hidden="true">Versteckt aber lesbar</span> <span aria-hidden="true">▾</span></p>'));
  const r = await PK.messen(page);
  const texte = r.unter.map((u) => u.text);
  expect(texte).toContain('Versteckt aber lesbar');
  expect(texte).not.toContain('▾');
});

/* Rot-Beweise zu den drei Fixes der Messart (Bedingung der Gegenlesung): in jedem dieser Zustände wird ein echter Verstoß weiter gefunden. */
test('[Pixel-Kontrast·Rot-Beweis] eine Schriftfarbe aus color-mix (color(srgb …)) wird richtig gelesen und ein Verstoß gefunden', async ({ page }) => {
  await page.setContent(seite('<p style="background:#fff;padding:8px;color:color-mix(in srgb, #ffffff 75%, #808080)">Gemischte Farbe zu hell</p>'));
  const r = await PK.messen(page);
  expect(r.unter.map((u) => u.text)).toContain('Gemischte Farbe zu hell');
});

test('[Pixel-Kontrast·Rot-Beweis] ein teilweise verdeckter Text wird am sichtbaren Teil weiter gemessen', async ({ page }) => {
  await page.setContent(seite('<p style="background:#fff;padding:8px;color:#cccccc;width:400px">Halb verdeckt und zu hell</p><div style="position:fixed;left:0;top:0;width:120px;height:60px;background:#1c2a1e"></div>'));
  const r = await PK.messen(page);
  expect(r.unter.map((u) => u.text)).toContain('Halb verdeckt und zu hell');
});

test('[Pixel-Kontrast·Rot-Beweis] unter einer CSP ohne Inline-Stile wird der Text trotzdem ausgeblendet und ein Verstoß gefunden', async ({ page }) => {
  // Trennt die alte Fassung: ein blockiertes Ausblenden ließe den Text im Bild, dann stünde auch gut lesbarer Text gegen sich selbst als Verstoß da.
  await page.setContent('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="style-src \'none\'"></head><body bgcolor="#ffffff"><p><font color="#cccccc" size="4">Leise unter strenger CSP</font></p><p><font color="#111111" size="4">Deutlich unter strenger CSP</font></p></body></html>');
  const r = await PK.messen(page);
  const texte = r.unter.map((u) => u.text);
  expect(texte).toContain('Leise unter strenger CSP');
  expect(texte).not.toContain('Deutlich unter strenger CSP');
});
