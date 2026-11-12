// @ts-check
/* sicherung-pruefen-dateiwahl.spec.js — der Dateiwähler „Sicherung prüfen“ übersteht die Speicherbereinigung (09.11.2026)

   Ein Wähler, der nur als lose Variable lebt, kann der Speicherbereinigung zum Opfer fallen, bevor der Dialog aufgeht:
   Dann kommt keine Dateiwahl, und der Knopf tut scheinbar nichts. Die Probe erzwingt die Bereinigung gleich nach dem Klick.
   Der Rot-Beweis nimmt dem Wähler das Festhalten im Dokument und zeigt, dass die Dateiwahl dann ausbleibt. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');

test.use({ launchOptions: { args: ['--js-flags=--expose-gc'] } });

async function knopfBereit(page) {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.locator('#tb-einstellungen').click();
  const knopf = page.locator('#einst-sicherung-pruefen');
  await expect(knopf).toBeAttached({ timeout: 10000 });
  await einstellungenAbschnittOeffnen(page, '#einst-sicherung-pruefen');
  await expect(knopf).toBeVisible();
}

test('[Sicherung·Dateiwahl] die Dateiwahl kommt auch nach erzwungener Speicherbereinigung', async ({ page }) => {
  await knopfBereit(page);
  const warte = page.waitForEvent('filechooser', { timeout: 15000 });
  await page.evaluate(() => { document.getElementById('einst-sicherung-pruefen').click(); gc(); gc(); });
  const wahl = await warte;
  expect(wahl.isMultiple()).toBe(false);
});

test('[Sicherung·Dateiwahl·Rot-Beweis] ohne Festhalten im Dokument bleibt die Dateiwahl aus', async ({ page }) => {
  await knopfBereit(page);
  const ausgeblieben = page.waitForEvent('filechooser', { timeout: 15000 }).then(() => false, () => true);
  await page.evaluate(() => {
    const original = Node.prototype.appendChild;
    Node.prototype.appendChild = function (kind) {
      return kind instanceof HTMLInputElement && kind.type === 'file' ? kind : original.call(this, kind);
    };
    document.getElementById('einst-sicherung-pruefen').click();
    gc(); gc();
  });
  expect(await ausgeblieben).toBe(true);
});
