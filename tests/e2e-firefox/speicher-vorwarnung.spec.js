'use strict';
/* Vorwarnung vor der Frage nach dauerhaftem Speicher — die Probe im echten Firefox (Gecko), dem Motor, der fragt.
   Entscheidung und Chromium-Seite: tests/speicher-vorwarnung.test.js. Die Hinweise verschwinden nach Sekunden; darum sammelt
   ein Beobachter ab dem Laden jeden Hinweis-Text, statt nach dem Anlegen nachzusehen. */
const { test, expect } = require('@playwright/test');
const { depotAnlegen, KERN_URL } = require('../e2e/helpers');

test('[Dauerspeicher·Firefox] beim ersten Sichern kommt die Vorwarnung, genau einmal', async ({ page }) => {
  await page.addInitScript(() => {
    window.__hinweise = [];
    new MutationObserver((liste) => {
      for (const m of liste) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) window.__hinweise.push(n.textContent);
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  expect(await page.evaluate(() => CSS.supports('-moz-appearance', 'none')), 'Vorbedingung: der Lauf ist Gecko').toBe(true);
  await depotAnlegen(page, { pw: 'dauerspeicher-firefox-735' });
  await expect.poll(() => page.evaluate(() => window.__hinweise.join(' | ')), { timeout: 10000 }).toContain('dauerhaften Speicher speichern darf');
  const hinweise = await page.evaluate(() => window.__hinweise);
  expect(hinweise.filter((t) => t.includes('dauerhaften Speicher speichern darf')).length, 'genau einmal, nicht in jeder Sitzung mehrfach').toBe(1);
});
