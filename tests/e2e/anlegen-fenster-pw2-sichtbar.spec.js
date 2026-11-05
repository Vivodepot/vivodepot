// @ts-check
/* anlegen-fenster-pw2-sichtbar.spec.js — „Passwort bestätigen“ steht frei, nicht unter der Knopfleiste (01.11.2026)

   Befund der Produktverantwortung: im Anlegen-Fenster verdeckte die Knopfleiste das Feld „Passwort bestätigen“ (#id-pw2).
   GEMESSEN (elementFromPoint an drei Punkten des Feldes): beim Öffnen stand nur die Beschriftung über den Knöpfen, das Feld
   lag darunter (Unterkante 50–80 px unter dem sichtbaren Körper, bei 390 und 1440 px). Nach einem Fokus holt Chromium das Feld
   ganz in Sicht, WebKit nur bis an die Kante: die Unterlinie blieb darunter (bei 390 px dreimal in drei Läufen). Dafür holt
   ui.modal ein fokussiertes Feld mit Rand in Sicht (modalFeldInSicht); ohne das ist der WebKit-Fall bei 390 px rot.
   Eigenes Depot (Weg über die Umschau, mit Grund): bei 1440 px steht das Feld schon beim Öffnen ganz frei, in Chromium und WebKit.
   Rot vor dem Fix, grün, seit Vor- und Nachname unter „Ihr Name“ nebeneinander stehen (52 px Abstand, auch wenn die sechs Wörter
   in zwei Zeilen stehen). Bei 390 px entscheidet die Länge der zufälligen Wörter: in einer Zeile 21 px frei, in zwei Zeilen 7 px zu
   wenig. Dort hält die Probe den Fokus fest, nach dem das Feld frei stehen muss.
   Sub-Depot: das Fenster trägt mehr Felder (Grundlage, Farbe, Anweisung), dort steht das Feld nach dem Fokus frei (Wächter).
   WebKit wird selbst gestartet, weil die Hauptkonfiguration nur Chromium als Projekt führt; geladen wird das gebackene Produkt
   über file:// wie ein heruntergeladenes Produkt (dort kommt kein Angebot „In der App anlegen“ dazwischen). */
const { test, expect, webkit } = require('@playwright/test');
const h = require('./helpers.js');

const BREITEN = [[390, 844], [1440, 900]];

/* Liegt das Feld an drei Punkten (oben links, Mitte, unten links) zuoberst? Sonst: was liegt dort. */
async function pw2Treffer(page) {
  return page.evaluate(() => {
    const f = document.getElementById('id-pw2');
    if (!f) return ['fehlt'];
    const b = f.getBoundingClientRect();
    return [[b.left + 10, b.top + 4], [b.left + b.width / 2, b.top + b.height / 2], [b.left + 10, b.bottom - 3]].map(([x, y]) => {
      const e = document.elementFromPoint(x, y);
      return e === f ? 'frei' : (e ? (e.id || e.className || e.tagName) : 'ausserhalb');
    });
  });
}

async function beimOeffnenPruefen(page, wo) {
  await expect(page.locator('#modal-rueck.an #id-pw2')).toBeAttached();
  await expect.poll(() => pw2Treffer(page), { message: wo + ': „Passwort bestätigen“ steht beim Öffnen frei', timeout: 3000 })
    .toEqual(['frei', 'frei', 'frei']);
}

async function fokusUndPruefen(page, wo) {
  await expect(page.locator('#modal-rueck.an #id-pw2')).toBeAttached();
  await page.evaluate(() => { const k = document.querySelector('#modal-rueck .modal-koerper'); if (k) k.scrollTop = 0; });
  // Fokus im Browser, wie ihn Tab oder ein Skript setzt; page.focus holt das Feld vorher selbst in Sicht und prüfte so nichts.
  await page.evaluate(() => document.getElementById('id-pw2').focus());
  await expect.poll(() => pw2Treffer(page), { message: wo + ': „Passwort bestätigen“ liegt nach dem Fokus frei', timeout: 3000 })
    .toEqual(['frei', 'frei', 'frei']);
}

async function ankerFenster(page) {
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  const karte = page.locator('#content details summary').first();
  if (await karte.count()) await karte.click();
  await page.locator('#content [data-umschau-eintragen][data-umschau-feld]').first().click();
  await expect(page.locator('#modal-rueck [data-anlegen-grund]')).toBeVisible();
}

async function subFenster(page) {
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page);
  await page.click('#tb-depot-pille');
  await page.click('#tb-depot-menue-verwaltung');
  await page.click('#sub-neu');
  await expect(page.locator('#modal-rueck.an #sub-grundlage')).toBeAttached();
}

async function inWebkit(breite, hoehe, fn) {
  const browser = await webkit.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
  try {
    const k = await browser.newContext({ locale: 'de-DE', viewport: { width: breite, height: hoehe } });
    await fn(await k.newPage());
  } finally { await browser.close(); }
}

for (const [breite, hoehe] of BREITEN) {
  test(`[Anlegen·pw2] Chromium ${breite} px: eigenes Depot`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: hoehe });
    await ankerFenster(page);
    await (breite >= 1440 ? beimOeffnenPruefen : fokusUndPruefen)(page, 'Chromium ' + breite + ' Anker');
  });
  test(`[Anlegen·pw2] WebKit ${breite} px: eigenes Depot`, async () => {
    await inWebkit(breite, hoehe, async (page) => { await ankerFenster(page); await (breite >= 1440 ? beimOeffnenPruefen : fokusUndPruefen)(page, 'WebKit ' + breite + ' Anker'); });
  });
  test(`[Anlegen·pw2] Chromium ${breite} px: Sub-Depot`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: hoehe });
    await subFenster(page);
    await fokusUndPruefen(page, 'Chromium ' + breite + ' Sub');
  });
  test(`[Anlegen·pw2] WebKit ${breite} px: Sub-Depot`, async () => {
    await inWebkit(breite, hoehe, async (page) => { await subFenster(page); await fokusUndPruefen(page, 'WebKit ' + breite + ' Sub'); });
  });
}
