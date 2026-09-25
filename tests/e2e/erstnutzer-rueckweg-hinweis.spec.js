'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Erstnutzer erfährt den Rückweg — der Hinweis nennt den Knopf, den es gibt (19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Beim ersten bewussten Datei-Sichern zeigt das Depot einmal „So kommen Sie später wieder hinein“ und nennt den Knopf, mit dem man die Sicherungsdatei
   wieder öffnet. Fund aus der A/B-Abnahme der Sichten: der Satz trug die Beschriftung als KOPIE („Schon ein Vivodepot? Datei öffnen“), der Startknopf
   heißt seit der Umbenennung „Schon ein Depot? Datei öffnen“ — der Hinweis nannte einen Knopf, den es nicht gab. Jetzt setzt das Modal die Beschriftung des
   echten Knopfs ein. Diese Probe geht den Weg eines Erstnutzers: Depot anlegen, Depot-Menü → „Sicherungskopie erstellen“, der Hinweis erscheint, und der Knopf,
   den er nennt, steht auf dem Startbildschirm wortgleich da (frische Seite, kein Depot). Deutsch und englisch. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, KERN_URL_PRIVAT_DE, KERN_URL_PRIVAT_EN } = require('./helpers');

async function hinweisTextNachErstemSichern(page) {
  await page.click('#tb-depot-pille');
  await page.click('#tb-depot-menue-sicherungskopie');
  const hinweis = page.locator('#wiedereinstieg-hinweis');
  await expect(hinweis, 'der einmalige Rückweg-Hinweis erscheint beim ersten bewussten Datei-Sichern').toBeVisible();
  return (await hinweis.textContent()).replace(/\s+/g, ' ').trim();
}

async function startknopfText(browser, url) {
  const ctx = await browser.newContext();
  const seite = await ctx.newPage();
  try {
    await oeffneApp(seite, { url });
    return (await seite.locator('#w-datei').textContent()).replace(/\s+/g, ' ').trim();
  } finally { await ctx.close(); }
}

for (const [name, url] of [['de', KERN_URL_PRIVAT_DE], ['en', KERN_URL_PRIVAT_EN]]) {
  test('[Erstnutzer·Rückweg·' + name + '] der Hinweis nennt den Startknopf wortgleich', async ({ page, browser }) => {
    await oeffneApp(page, { url });
    await depotAnlegen(page);
    const hinweis = await hinweisTextNachErstemSichern(page);
    const knopf = await startknopfText(browser, url);
    expect(knopf.length, 'der Startknopf trägt eine Beschriftung (sonst prüfte die Probe nichts)').toBeGreaterThan(8);
    expect(hinweis, 'der Hinweis nennt den Knopf „' + knopf + '“, den es auf dem Startbildschirm wirklich gibt').toContain(knopf);
    expect(hinweis, 'kein unaufgelöster Platzhalter im Satz').not.toMatch(/\{knopf\}|\{marke\}/);
  });
}
