// @ts-check
/* Meldungen, die beunruhigen (Abnahme der Privatversion am Telefon, 12.11.2026) — die Browser-Probe bei 390 px.
   Nach dem Anlegen eines Depots erscheint keine Meldung, die „nicht aktuell“ sagt, und der Speicherstatus im Kopf steht nicht auf
   Fehler. Der Zustand steht hinter dem ⓘ im Kopf: „Sicherungskopie: noch keine“ mit dem Knopf „Sicherungskopie erstellen“.
   Nachtrag U2-ADR-211 (12.11.2026): auf der Übersicht steht, sobald das Depot Angaben trägt, ohne Tippen die Zeile „Sicherungskopie: noch keine“
   mit dem Knopf. Der Name aus dem Anlegen zählt als Angabe (vorschauHatDaten), die Zeile steht also gleich nach dem Anlegen.
   Gegenprobe: nach der Sicherungskopie ist nichts mehr zu tun, das ⓘ und die Zeile verschwinden.
   Die Meldung nach dem Öffnen prüft die Unit-Probe (tests/meldungen-zustand-naechster-schritt.test.js, Wortlaut und Stelle).
   Das Produkt kommt über eine https-Adresse (page.route, kein Netz): nur dort gilt der interne Speicher wie auf dem Telefon. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const h = require('./helpers.js');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

const ADRESSE = 'https://probe.invalid/vivodepot.html';

async function ueberWebAdresse(page) {
  const html = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de']);
  await page.route('https://probe.invalid/**', (route) => (route.request().url() === ADRESSE
    ? route.fulfill({ status: 200, contentType: 'text/html', body: html }) : route.fulfill({ status: 404, body: '' })));
}

/* Jede Meldung, die je im Bild stand, auch wenn sie nach drei Sekunden wieder weg ist. */
async function meldungenMitschneiden(page) {
  await page.addInitScript(() => {
    window.__meldungen = [];
    new MutationObserver((liste) => {
      for (const m of liste) for (const n of m.addedNodes) {
        if (n && n.nodeType === 1 && n.classList && n.classList.contains('toast')) window.__meldungen.push(String(n.textContent || ''));
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

async function uebersichtOeffnen(page) {
  const nav = page.locator('[data-anlass-auswahl="1"]').first();
  // Am Telefon liegt die Seitenleiste neben dem Bild, bis das Menü sie hereinholt.
  const imBild = await nav.evaluate((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.left < window.innerWidth; });
  if (!imBild) await h.schubfachOeffnen(page);
  await nav.click();
  await expect(page.locator('[data-ansicht="erledigen"]')).toBeVisible();
}

test('[Meldungen·390] nach dem Anlegen: keine Meldung „nicht aktuell“, kein Fehler-Status; das ⓘ nennt den Zustand mit dem nächsten Schritt', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await meldungenMitschneiden(page);
  await ueberWebAdresse(page);
  await h.oeffneApp(page, { url: ADRESSE });
  // Interner Speicher ist hier Vorbedingung (Web-Adresse); ohne ihn stünde weiter unten kein ⓘ mit „noch keine“, die Probe fiele dort.
  await h.depotAnlegen(page, { name: 'Erika Probe' });
  await page.waitForTimeout(1000);   // eine verspätete Meldung (Reihe der Einmal-Dialoge) hätte hier Zeit zu erscheinen

  const meldungen = await page.evaluate(() => window.__meldungen);
  expect(meldungen.filter((t) => /nicht aktuell/i.test(t)), 'Meldungen seit dem Laden: ' + JSON.stringify(meldungen)).toEqual([]);
  await expect(page.locator('#toast-host')).not.toContainText('nicht aktuell');
  await expect(page.locator('#tb-save-status')).not.toHaveClass(/ist-fehlgeschlagen/);

  // (b) Übersicht: die Zeile steht ohne Tippen im Bild.
  await uebersichtOeffnen(page);
  const zeile = page.locator('[data-erledigen-sicherung="1"]');
  await expect(zeile).toBeInViewport();
  await expect(zeile).toContainText('Sicherungskopie: noch keine');
  await expect(zeile.getByRole('button', { name: 'Sicherungskopie erstellen' })).toBeVisible();

  // (a) Blatt am Speicherstatus.
  const info = page.locator('#tb-save-info');
  await expect(info).toBeVisible();
  await info.click();
  const blatt = page.locator('#tb-save-info-blatt');
  await expect(blatt).toBeVisible();
  await expect(blatt.getByText('Sicherungskopie: noch keine')).toBeVisible();
  const knopf = blatt.getByRole('button', { name: 'Sicherungskopie erstellen' });
  await expect(knopf).toBeVisible();
  const kasten = await blatt.boundingBox();
  expect(kasten && kasten.x >= 0 && kasten.x + kasten.width <= 390, 'das Blatt steht ganz im Bild: ' + JSON.stringify(kasten)).toBe(true);

  // Gegenprobe: der nächste Schritt ist getan, danach ist nichts mehr zu tun.
  await knopf.click();
  await expect(blatt).toBeHidden();
  // Mit der ersten Sicherungskopie kommt einmal der Hinweis zum Wiedereinstieg; er wird bestätigt wie von der Person.
  await expect(page.locator('#wiedereinstieg-hinweis')).toBeVisible({ timeout: 10000 });
  await page.click('#m-ok');
  await expect(info).toBeHidden({ timeout: 10000 });
  await uebersichtOeffnen(page);
  await expect(page.locator('[data-erledigen-sicherung]')).toHaveCount(0);
  const danach = await page.evaluate(() => window.__meldungen);
  expect(danach.filter((t) => /nicht aktuell/i.test(t))).toEqual([]);
});
