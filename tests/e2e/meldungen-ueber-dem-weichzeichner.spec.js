// @ts-check
/* meldungen-ueber-dem-weichzeichner.spec.js — jede Meldung liegt über dem Schleier eines offenen Dialogs und verdeckt dessen Knöpfe nicht
   (Befund MELDUNG-UNTER-DEM-WEICHZEICHNER, 16.10.2026: der Fehler beim Export eines Sub-Sub-Depots erschien unter dem Weichzeichner und war nicht
   lesbar). Gemessen am gerenderten Produkt (privat-de, Glas-Erscheinungsbild), bei geöffnetem Dialog, am Desktop (1280 px) und am Handy (390 px):
   je Meldungsart (Toast, Fehler-Toast, Toast mit Knopf, Banner) steht an der Mitte der Meldung das Element der Meldung selbst, nicht der Schleier;
   und keine Meldung überdeckt einen Knopf des Dialogs.
   Rot-Beweis: mit der alten Stapelreihenfolge (Toast 190 unter dem Schleier 200) fällt jede Toast-Art. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const ARTEN = [
  { name: 'toast', host: '#toast-host', html: '<div class="toast" id="probe-meldung"><span>Probe</span></div>' },
  { name: 'fehler-toast', host: '#toast-host', html: '<div class="toast fehler" id="probe-meldung"><span>Die Datei konnte nicht gesichert werden.</span></div>' },
  { name: 'toast-mit-knopf', host: '#toast-host', html: '<div class="toast toast-tipp" id="probe-meldung"><span class="toast-tipp-text">Aktion nötig</span><button type="button" class="toast-tipp-btn">Öffnen</button></div>' },
  { name: 'banner', host: '.banner-stapel', html: '<div class="banner" id="probe-meldung" style="padding:12px 16px;background:#fff;color:#111">Banner Probe</div>' },
];

async function oeffnen(page, breite) {
  await page.setViewportSize({ width: breite, height: 860 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await page.click('#w-anfangen');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');                                   // öffnet den Anlege-Dialog (#modal-rueck.an)
  await page.waitForSelector('#modal-rueck.an #id-pw', { state: 'visible' });
}
async function messen(page, art) {
  return page.evaluate(({ host, html }) => {
    const hostEl = document.querySelector(host);
    const vorher = hostEl.hasAttribute('hidden');
    hostEl.removeAttribute('hidden');
    hostEl.insertAdjacentHTML('beforeend', html);
    const m = document.getElementById('probe-meldung');
    const r = m.getBoundingClientRect();
    const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const liegtDrueber = !!oben && (oben === m || m.contains(oben));
    const knoepfe = [...document.querySelectorAll('#modal-rueck .modal button, #modal-rueck .modal input')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect());
    const ueberdeckt = knoepfe.filter((k) => !(k.right <= r.left || k.left >= r.right || k.bottom <= r.top || k.top >= r.bottom)).length;
    m.remove(); if (vorher) hostEl.setAttribute('hidden', '');
    return { liegtDrueber, ueberdeckt, oben: oben ? (oben.id || oben.className || oben.tagName) : null };
  }, { host: art.host, html: art.html });
}

// Ein Test je Breite, die Meldungsarten darin: so zählt die A423-Zählung genau die Tests, die Playwright ausführt
// (eine innere Schleife über ARTEN um ein test( sähe die Zählung nicht).
for (const breite of [1280, 390]) {
  test('[Meldung über dem Weichzeichner · ' + breite + ' px] jede Meldungsart liegt über dem Schleier und verdeckt keinen Knopf des Dialogs', async ({ page }) => {
    test.setTimeout(120000);
    await oeffnen(page, breite);
    for (const art of ARTEN) {
      const m = await messen(page, art);
      expect(m.liegtDrueber, art.name + ': an der Meldung steht ' + m.oben).toBe(true);
      expect(m.ueberdeckt, art.name + ': überdeckte Knöpfe des Dialogs').toBe(0);
    }
  });
}

test('[Meldung über dem Weichzeichner · Rot-Beweis] mit der alten Stapelreihenfolge (Toast 190 unter dem Schleier 200) fällt der Toast', async ({ page }) => {
  test.setTimeout(90000);
  await oeffnen(page, 1280);
  await page.addStyleTag({ content: '#toast-host { z-index: 190 !important; }' });
  const m = await messen(page, ARTEN[1]);
  expect(m.liegtDrueber, 'die alte Reihenfolge muss rot sein').toBe(false);
});
