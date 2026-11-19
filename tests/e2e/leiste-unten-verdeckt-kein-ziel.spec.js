// @ts-check
/* Befund Studio 17.11.2026 (375): die feste untere Leiste (#bottom-tabs) verdeckte ein ins Bild gerolltes Ziel
   (#anfrage-antworten „Diese Angaben herausgeben“) und fing den Klick ab. Fix: scroll-padding-bottom in Höhe der Leiste
   (grundlage.css, html:has(#app.an)). Geprüft wird mit echtem Klick-Ziel: nach dem Rollen ins Bild (wie Tastatur und Vorlesen)
   liegt der Knopf frei über der Leiste und ist klickbar; am Seitenende liegt kein Knopf unter der Leiste.
   Rot-Beweis: ohne scroll-padding-bottom liegt der Knopf nach demselben Rollen unter der Leiste. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, schubfachOeffnen } = require('./helpers');

const ANFRAGE = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Praxis am Beispielweg', zweck: 'Erstaufnahme', grundlage: 'Behandlungsvertrag',
  vorgang: 'LEISTE-1', gueltigBis: '2099-12-31',
  felder: [{ kennung: 'health.chronicConditionsDiagnoses', zweck: 'Anamnese', pflicht: true }, { kennung: 'health.medicationOngoing', zweck: 'Anamnese', pflicht: false }],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@praxis.example.invalid' } };

async function anfrageOffen(page) {
  await page.setViewportSize({ width: 375, height: 812 });
  await oeffneApp(page);
  await depotAnlegen(page);
  await schubfachOeffnen(page);   // am Handy liegt die Seitenleiste hinter dem Tab „Bereiche“ (echter Klick)
  await page.click('#sidebar [data-uebergabe-protokoll]');
  await page.click('#anfrage-empfangen');
  await page.fill('#anfrage-text', JSON.stringify(ANFRAGE));
  await page.click('#m-ok');
  await page.waitForSelector('#anfrage-antworten', { state: 'attached' });
}

/* Rollt das Ziel wie ein Fokus an die Unterkante und meldet, ob an seiner Mitte die Leiste liegt. */
async function zielUnterLeiste(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    el.scrollIntoView({ block: 'end' });
    const r = el.getBoundingClientRect();
    const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const leiste = document.getElementById('bottom-tabs');
    return !!(oben && leiste && leiste.contains(oben));
  }, sel);
}

test('[Leiste·375] ein ins Bild gerollter Knopf liegt über der Leiste und nimmt den Klick an', async ({ page }) => {
  await anfrageOffen(page);
  expect(await zielUnterLeiste(page, '#anfrage-antworten')).toBe(false);
  await page.locator('#anfrage-antworten').click({ trial: true, timeout: 5000 });
});

test('[Leiste·375] am Seitenende liegt kein Knopf unter der Leiste', async ({ page }) => {
  await anfrageOffen(page);
  const verdeckt = await page.evaluate(() => {
    window.scrollTo(0, document.scrollingElement.scrollHeight);
    const leiste = document.getElementById('bottom-tabs');
    const out = [];
    for (const b of document.querySelectorAll('#content button')) {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight) continue;
      const oben = document.elementFromPoint(r.left + r.width / 2, Math.min(r.top + r.height / 2, innerHeight - 1));
      if (oben && leiste.contains(oben)) out.push(b.id || b.textContent.trim().slice(0, 30));
    }
    return out;
  });
  expect(verdeckt).toEqual([]);
});

test('[Leiste·375·Rot-Beweis] ohne scroll-padding-bottom liegt der Knopf nach dem Rollen unter der Leiste', async ({ page }) => {
  await anfrageOffen(page);
  await page.addStyleTag({ content: 'html { scroll-padding-bottom: 0 !important; }' });
  expect(await zielUnterLeiste(page, '#anfrage-antworten')).toBe(true);
});

/* Befund Reise 5 (17.11.2026, 390 px, Beispielansicht): mit der Lupe im Kopf (U-8a) lief die Kopfleiste 20 px über, weil die Pille
   in ihrem Rahmen (.depot-pille-wrap) in der Stufe tb-eng-2 nicht schrumpfte. Die Seite wurde 410 px breit, die feste Leiste unten
   ebenso, und am Handy traf ein Tippen auf die Anlass-Kachel die Leiste oder den Rahmen der Seite. Wächter an einem Handy (isMobile,
   Touch) bei 360, 375 und 390 px: mit der Lupe ist weder der Kopf noch die Seite breiter als das Gerät, und die Kachel nimmt den Klick an.
   Rot-Beweis: hält der Rahmen wieder min-width:auto, ist die Seite bei 390 px breiter als das Gerät. */
async function anlassAuswahl(page, zusatzStil) {
  await oeffneApp(page);
  if (zusatzStil) await page.addStyleTag({ content: zusatzStil });
  await page.click('#w-anfangen');   // Beispielansicht, wie Reise 5
  await schubfachOeffnen(page);
  await page.click('#sidebar [data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="todesfall"]', { state: 'visible' });
  return page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    return { lupe: !!document.querySelector('.topbar.tb-suche-lupe'), kopf: tb.scrollWidth, kopfRaum: tb.clientWidth,
      breit: document.documentElement.scrollWidth, geraet: document.documentElement.clientWidth };
  });
}

async function kopfPasst(page) {
  const m = await anlassAuswahl(page);
  expect(m.lupe).toBe(true);
  expect(m.kopf).toBeLessThanOrEqual(m.kopfRaum + 1);
  expect(m.breit).toBeLessThanOrEqual(m.geraet);
  await page.locator('[data-anlass="todesfall"]').click({ trial: true, timeout: 5000 });
}

test.describe('[Kopf·360] Lupe im Kopf', () => {
  test.use({ viewport: { width: 360, height: 844 }, hasTouch: true, isMobile: true });
  test('[Kopf·360] mit der Lupe sind Kopf und Seite nicht breiter als das Gerät, die Anlass-Kachel nimmt den Klick an', async ({ page }) => {
    await kopfPasst(page);
  });
});

test.describe('[Kopf·375] Lupe im Kopf', () => {
  test.use({ viewport: { width: 375, height: 844 }, hasTouch: true, isMobile: true });
  test('[Kopf·375] mit der Lupe sind Kopf und Seite nicht breiter als das Gerät, die Anlass-Kachel nimmt den Klick an', async ({ page }) => {
    await kopfPasst(page);
  });
});

test.describe('[Kopf·390] Lupe im Kopf', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('[Kopf·390] mit der Lupe sind Kopf und Seite nicht breiter als das Gerät, die Anlass-Kachel nimmt den Klick an', async ({ page }) => {
    await kopfPasst(page);
  });
});

test.describe('[Kopf·390·Rot-Beweis]', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('[Kopf·390·Rot-Beweis] schrumpft der Rahmen der Pille nicht, ist die Seite breiter als das Gerät', async ({ page }) => {
    // Seit der Kopfleiste nach dem Desktop-Dummy (17.11.2026) hat der Kopf am Handy Platz; der Rot-Beweis stellt den vollen Kopf von
    // vorher wieder her (Menü, Einstellungen, Schließen, Wort der Marke), damit der starre Rahmen die Seite wieder breiter macht.
    const m = await anlassAuswahl(page, '.topbar .depot-pille-wrap { min-width: auto !important; flex-shrink: 0 !important; } .topbar .tb-menue, .topbar #tb-einstellungen, .topbar #tb-schliessen, .topbar .logo-wort { display: inline-flex !important; }');
    expect(m.lupe).toBe(true);
    expect(m.breit).toBeGreaterThan(m.geraet);
  });
});
