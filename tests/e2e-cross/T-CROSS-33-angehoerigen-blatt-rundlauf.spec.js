'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-33 — GEN3: der Rundlauf eines Angehörigen-Blatts
   ─────────────────────────────────────────────────
   Generator (Blatt bauen, signieren, Datei) → Kern (Modul einlassen, Depot als Datei sichern) → Lese-App (Depot öffnen, das
   Blatt in der Sidebar, Titel, „Gilt für“, die Werte der Felder). Drei Komponenten, drei Kontexte, die Datei als einziger Träger.
   Der Einlass des Kerns (ANG1 Stufe e, `modulEinlassen` über die öffentliche Fläche) ist der Weg der Datei in das Depot — kein
   Ersatzweg mehr. Rot-Beweise am selben Lauf: ohne Einlass steht das Blatt nicht in der Lese-App; ohne die Werte im Depot steht das
   Blatt da, aber mit den Werten dieses Depots (sie kommen aus dem Depot, nicht aus der Vorlage).
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

const BLATT = { titel: 'Musterklinik-Aufnahme', icon: 'heartPulse', einfuehrung: 'Aufnahme und Aufenthalt.', block1: 'Aus Identität', block2: 'Weitere Angaben', rechtsraum: 'DE', rechtsraumName: 'Deutschland', sprache: 'de' };


/* Die Reise. `einlassen: false` — die Datei des Generators wird dem Kern NICHT gegeben; `werte: false` — das Depot trägt andere Namen (Xaver Zorn statt Marlies Muster). */
async function reise(browser, tmp, { einlassen = true, werte = true } = {}) {
  // ── 1 · Generator ────────────────────────────────────────────────────────
  const gctx = await browser.newContext({ acceptDownloads: true });
  const g = await gctx.newPage();
  await H.generator.oeffnen(g, 'de');
  const { umschlag } = await H.generator.blattBauenUndErzeugen(g, tmp, BLATT, FIX.stammdaten);
  expect(umschlag.modul.modulTyp).toBe('angehoerigenVorlage');
  expect(umschlag.modulSignaturJws.split('.').length).toBe(3);
  await gctx.close();

  // ── 2 · Kern: Depot (mit Werten), das Blatt eingelassen, als Datei gesichert ──
  const actx = await browser.newContext({ acceptDownloads: true });
  const a = await actx.newPage();
  await H.kern.oeffnen(a);
  await H.kern.depotAnlegen(a, { name: werte ? 'Marlies Muster' : 'Xaver Zorn', pw: 'cross-e2e-pw-123' });
  await H.kern.oeffneSektor(a, 'identity');
  if (werte) {
    await H.kern.setzeFeld(a, 'givenName', 'Marlies');
    await H.kern.setzeFeld(a, 'familyName', 'Muster');
  }
  if (einlassen) {
    const r = await a.evaluate((t) => { try { return window.__vdOeffentlich.modulEinlassen(t); } catch (e) { return { angenommen: false, fehler: String(e) }; } }, JSON.stringify(umschlag.modul));
    expect(r && r.angenommen, 'der Einlass des Kerns nimmt das Blatt des Generators an: ' + JSON.stringify(r)).toBe(true);
  }
  const dateiPfad = await H.kern.speichernNachTmp(a, tmp);
  await actx.close();

  // ── 3 · Lese-App ─────────────────────────────────────────────────────────
  const bctx = await browser.newContext();
  const b = await bctx.newPage();
  await H.lesen.oeffnen(b);
  await H.lesen.dateiOeffnen(b, dateiPfad, 'cross-e2e-pw-123');
  return { b, bctx, alle: b.locator('[data-angblatt]'), blatt: b.locator('[data-angblatt]').filter({ hasText: BLATT.titel }) };
}

test.describe('T-CROSS-33 Angehörigen-Blatt: Generator → Kern → Lese-App', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('gen3-rundlauf'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('das im Generator gebaute Blatt steht in der Lese-App, mit den Werten der Depot-Eigentümerin', async ({ browser }) => {
    test.setTimeout(180000);
    // Rebase-Nachtrag (19.09.2026, L2-im-Kanon-Landung): fdfdbfcf trug hier noch die
    // manuelle Ausweich-Injektion für „Kern kennt die Art noch nicht" (ANG1 Stufe e) — die
    // Stufe ist inzwischen real (angehoerigenVorlage steht in EINLASS_REGISTER, gemessen an
    // diesem Baum), der echte Einlassweg reicht, darum die refaktorierte reise()-Fassung mit
    // ihren zwei Rot-Beweisen übernommen. Die frühere Zusatzprüfung auf „Krankenhaus" (Text
    // eines per Position aus der Palette gezogenen Feldes) blieb draußen — nicht nachprüfbar
    // ohne einen echten Lauf, und keine der beiden Zusicherungen hängt an ihr.
    const { b, bctx, alle, blatt } = await reise(browser, tmp);
    // Die Lese-App zeigt neben den Blättern ab Werk auch das mitgebrachte: das eigene wird am Titel gefunden, und es steht genau einmal da.
    await expect(blatt).toHaveCount(1);
    expect(await alle.count(), 'das mitgebrachte Blatt kommt zu denen ab Werk dazu, es ersetzt sie nicht').toBeGreaterThan(1);
    await blatt.click();
    await expect(b.locator('#content')).toContainText(BLATT.titel);
    await expect(b.locator('#content')).toContainText('Deutschland');             // „Gilt für: Deutschland“ steht in der Vorlage
    await expect(b.locator('#content')).toContainText('Aufnahme und Aufenthalt.');
    await expect(b.locator('#content')).toContainText('Marlies');                 // die Werte der Eigentümerin, über den Zeiger aufgelöst
    await expect(b.locator('#content')).toContainText('Muster');
    await bctx.close();
  });

  test('[Rot-Beweis] ohne den Einlass des Kerns steht das Blatt nicht in der Lese-App', async ({ browser }) => {
    test.setTimeout(180000);
    const { b, bctx, alle, blatt } = await reise(browser, tmp, { einlassen: false });
    await expect(alle.first()).toBeVisible();          // die Blätter ab Werk sind da — die Probe misst also etwas
    await expect(blatt).toHaveCount(0);
    await bctx.close();
  });

  test('[Rot-Beweis] mit anderen Namen im Depot zeigt dasselbe Blatt diese Namen — die Werte kommen aus dem Depot', async ({ browser }) => {
    test.setTimeout(180000);
    const { b, bctx, blatt } = await reise(browser, tmp, { werte: false });
    await expect(blatt).toHaveCount(1);
    await blatt.click();
    await expect(b.locator('#content')).toContainText(BLATT.titel);
    await expect(b.locator('#content')).toContainText('Xaver');
    await expect(b.locator('#content')).not.toContainText('Marlies');
    await bctx.close();
  });
});
