// @ts-check
/* felder-gleiche-linke-kante.spec.js — in jeder Feldzeile liegen alle Teile außer Beschriftung und Hinweis auf derselben linken Kante
   (Befund FELD-GILT-BIS-NICHT-BUENDIG, 16.10.2026: im Bereich „Mobilität & Reise“ stand die „gilt …“-Zeile unter „Reisepass — ausgestellt am“
   zwölf Pixel eingerückt in der Spalte der Beschriftung, links neben allen anderen Feldern).
   Gemessen am gerenderten Produkt (privat-de), in allen Bereichen der Seitenleiste, am Desktop (1280 px) und am Handy (390 px).
   Beschriftung (`.feld-label`) und Hinweis (`.feld-hint`, ganze Zeile) zählen nicht; jedes andere Kind der Feldzeile (Wert, Gültigkeitszeile,
   Urheberschaft …) steht auf der linken Kante des Werts.
   Rot-Beweis: mit der alten Regel (Spalte der Beschriftung, zwölf Pixel eingerückt) fällt genau das Feld „passportIssuedOn“. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

async function messen(page) {
  return page.evaluate(() => {
    const funde = [];
    for (const z of document.querySelectorAll('#app .feld-zeile')) {
      if (!z.offsetParent) continue;
      const w = z.querySelector(':scope > .feld-wert');
      if (!w) continue;
      const soll = Math.round(w.getBoundingClientRect().left);
      for (const k of z.children) {
        if (k === w || k.classList.contains('feld-label') || k.classList.contains('feld-hint') || !k.offsetParent) continue;
        const ist = Math.round(k.getBoundingClientRect().left);
        if (Math.abs(ist - soll) > 1) funde.push({ feld: w.getAttribute('data-feld') || '', kind: String(k.className).split(' ')[0], soll, ist });
      }
    }
    return funde;
  });
}
// Der Klick geht über das Element selbst: Bereiche in eingeklappten Gruppen oder in der Schublade am Handy sind nicht im Bild, die Feldzeilen sind es.
async function oeffneBereich(page, id) {
  await page.evaluate((i) => {
    for (const d of document.querySelectorAll('#sidebar details')) d.open = true;
    const k = document.querySelector('#sidebar [data-sektor="' + i + '"]');
    if (k) k.click();
  }, id);
  await page.waitForSelector('#content .bereich-kopf', { timeout: 8000 }).catch(() => {});
}
async function alleBereicheMessen(page) {
  const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('#sidebar [data-sektor]')].map((e) => e.getAttribute('data-sektor')))]);
  const alle = [];
  for (const id of ids) {
    await oeffneBereich(page, id);
    await page.evaluate(() => document.querySelectorAll('#app details').forEach((d) => { d.open = true; }));
    await page.waitForTimeout(120);
    for (const f of await messen(page)) alle.push(Object.assign({ bereich: id }, f));
  }
  return { ids, alle };
}
async function oeffnen(page, breite) {
  await page.setViewportSize({ width: breite, height: 900 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
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

for (const breite of [1280, 390]) {
  test('[Feldzeile · gleiche linke Kante · ' + breite + ' px] jedes Kind außer Beschriftung und Hinweis steht auf der Kante des Werts, in allen Bereichen', async ({ page }) => {
    test.setTimeout(240000);
    await oeffnen(page, breite);
    const { ids, alle } = await alleBereicheMessen(page);
    expect(ids.length, 'Positivkontrolle: die Bereiche der Seitenleiste werden gefunden').toBeGreaterThan(8);
    expect(alle, JSON.stringify(alle.slice(0, 6))).toEqual([]);
  });
}

test('[Feldzeile · gleiche linke Kante · Rot-Beweis] die alte Regel lässt genau „Reisepass — ausgestellt am“ links stehen', async ({ page }) => {
  test.setTimeout(120000);
  await oeffnen(page, 1280);
  await page.addStyleTag({ content: '.gueltigkeit-zeile--eingebettet { grid-column: 1 !important; margin-left: var(--space-3) !important; padding-left: var(--space-2) !important; }' });
  await oeffneBereich(page, 'mobility');
  await page.evaluate(() => document.querySelectorAll('#app details').forEach((d) => { d.open = true; }));
  await page.waitForTimeout(200);
  const funde = await messen(page);
  expect(funde.map((f) => f.feld)).toContain('passportIssuedOn');
  expect(funde.every((f) => f.kind === 'gueltigkeit-zeile'), JSON.stringify(funde)).toBe(true);
});
