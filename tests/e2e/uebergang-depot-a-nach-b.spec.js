'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Übergang 1/6 — Depot A schließen → Depot B öffnen, DERSELBE Tab, KEIN Reload
   („Sechs Übergangs-Proben", 09.09.2026 — testkonzept-nach-den-
   funden-2026-09-09.md #1)
   ────────────────────────────────────────────────────────────────────────
   Fund 9 (09.09.2026): die Anwendung bootete im Browser nicht mehr — die
   vm-Sandbox war grün, weil sie beim Booten nur den FÜLL-Lauf des Textsatzes
   fährt (`_textsatzAufSektorenAnwenden`). Im Browser läuft beim Depot-
   Übergang `textsatzNeuAnwenden`, und DAS nimmt zuerst ZURÜCK, mit `delete`
   — ein `delete` auf einer gefrorenen Sektion wirft, der Lauf bricht ab, die
   Sidebar bleibt leer (Konsole: „Cannot delete property …",
   „bereiche-umschalter im DOM: 0").

   Von 118 bestehenden e2e-Specs wechselt KEINE das Depot — jede öffnet genau
   eine Datei pro Testlauf (frisches Anlegen ODER ein einzelnes Öffnen nach
   `page.reload()`). Der Übergang selbst, im selben Tab, ohne Reload,
   zwischen zwei ECHTEN Dateien, ist ungeprüft. Dieser Spec fährt genau ihn:
   Depot A anlegen+schließen, Depot B anlegen+schließen, dann A öffnen,
   OHNE Reload A schließen und B öffnen — der Weg, den eine Bürgerin am
   eigenen Rechner tatsächlich geht (zwei Dateien, ein Tab), und derselbe
   Weg, an dem Fund 9 brach.

   Positivkontrolle (Beleg im Commit-Text, nicht hier): der Kommentar an
   `_templateSektionenPruefen` (vivodepot.html) hält fest, dass EINGEBAUTE
   Bereiche ihre Sektionen seit Stufe 2 (dd7cdada) nicht mehr einfrieren —
   vor diesem Commit war exakt der hier geprüfte Übergang rot.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

// Bekannt-folgenloser Browser-Hinweis (wie 00-smoke.spec.js): CSP 'frame-ancestors' via <meta>
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

const DEPOT_A = { pw: 'uebergang-a-pw-741', name: 'Anna Übergang', wert: 'Rosenweg 3, Depot A' };
const DEPOT_B = { pw: 'uebergang-b-pw-852', name: 'Bruno Übergang', wert: 'Lindenallee 9, Depot B' };

// Echter Schreibweg (createWritable/write/close), kein OS-Dialog — wie in den
// bestehenden Mehrfach-Depot-Specs (persona-berufsbetreuerin-mehrfach-depot.spec.js).
async function fsaAttrappeEinrichten(page) {
  await page.evaluate(() => {
    window.__uebergangBytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'uebergang-depot.vivodepot',
        createWritable: async () => {
          let stueck = '';
          return {
            write: async (chunk) => {
              if (typeof chunk === 'string') stueck += chunk;
              else if (chunk && typeof chunk.text === 'function') stueck += await chunk.text();
            },
            close: async () => { window.__uebergangBytes = stueck; },
          };
        },
      }),
    });
  });
}

async function depotSchliessenUndBytesHolen(page) {
  await page.click('#tb-marke');
  const bestaetigen = page.locator('#m-ok');
  const kamModal = await bestaetigen.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
  if (kamModal) await bestaetigen.click();
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });
  const bytes = await page.evaluate(() => window.__uebergangBytes);
  expect(bytes, 'FSA-Attrappe muss beim Schließen geschrieben haben').toBeTruthy();
  return bytes;
}

function alsTmpDatei(bytes, name) {
  const tmp = path.join(os.tmpdir(), name + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.vivodepot');
  fs.writeFileSync(tmp, bytes, 'utf8');
  return tmp;
}

// Öffnen über den gewöhnlichen Datei-Einstieg — OHNE Reload, derselbe Tab.
// GEÄNDERT (Auftrag, 12.09.2026): seit internerSpeicherModus() unter file:// echt greift,
// liegt im selben Tab oft noch ein interner Stand (aus dem VORHERIGEN Depot dieses Tests) in der
// IndexedDB, wenn jetzt eine ANDERE Datei geöffnet wird — der Kern fragt dafür jetzt den
// Konflikt-Dialog „Welchen Stand möchten Sie verwenden?" (flowStandKonfliktDialog,
// vivodepot.html:16710) ab, GEMESSEN per Debug-Lauf (Playwright, Screenshot am Timeout). Dieser
// Test will ausdrücklich den Inhalt der GEÖFFNETEN DATEI sehen — darum „Aus der Datei" (#m-zweit),
// falls der Dialog erscheint. Kein Konflikt (frischer interner Speicher), geht #app.an direkt an.
async function depotOeffnenOhneReload(page, dateiPfad, pw) {
  await page.click('#w-datei');
  await page.setInputFiles('#co-datei', dateiPfad);
  await page.fill('#co-pw', pw);
  await page.click('#w-oeffnen');
  const konfliktDatei = page.locator('#m-zweit');
  const kamKonflikt = await konfliktDatei.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  if (kamKonflikt) await konfliktDatei.click();
  await page.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
}

test('[Übergang 1] Depot A schließen → Depot B öffnen, derselbe Tab, kein Reload — Sidebar bleibt intakt', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await fsaAttrappeEinrichten(page);

  // ── Depot A anlegen, Feld eintragen, sichern+schließen ──────────────────
  await depotAnlegen(page, { name: DEPOT_A.name, pw: DEPOT_A.pw });
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'streetAddress', DEPOT_A.wert);
  const bytesA = await depotSchliessenUndBytesHolen(page);
  const dateiA = alsTmpDatei(bytesA, 'uebergang-a');

  // ── Depot B anlegen, ANDERES Feld, sichern+schließen ────────────────────
  await depotAnlegen(page, { name: DEPOT_B.name, pw: DEPOT_B.pw });
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'streetAddress', DEPOT_B.wert);
  const bytesB = await depotSchliessenUndBytesHolen(page);
  const dateiB = alsTmpDatei(bytesB, 'uebergang-b');

  try {
    // ── Depot A öffnen (erster echter Datei-Öffnen-Weg dieses Tabs) ─────
    await depotOeffnenOhneReload(page, dateiA, DEPOT_A.pw);
    await oeffneSektor(page, 'identity');
    await expect(page.locator('[data-edit="streetAddress"]')).toHaveValue(DEPOT_A.wert);
    await expect(page.locator('.bereiche-umschalter, [data-sektor]').first(), 'Sidebar muss nach dem Öffnen von A rendern').toBeVisible();

    // ── DER ÜBERGANG: A schließen, DANN B öffnen — ohne Reload dazwischen ──
    await page.click('#tb-marke');
    const modalA = page.locator('#m-ok');
    if (await modalA.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) await modalA.click();
    await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });

    await depotOeffnenOhneReload(page, dateiB, DEPOT_B.pw);

    // Der Fund-9-Beleg: die Sidebar MUSS rendern — genau das brach beim `delete` auf der
    // gefrorenen Sektion (Konsole: „bereiche-umschalter im DOM: 0").
    await expect(page.locator('.bereiche-umschalter, [data-sektor]').first(), 'Sidebar muss nach dem Übergang A→B rendern (Fund 9)').toBeVisible();
    expect(await page.locator('[data-sektor]').count(), 'mindestens ein Bereich muss in der Sidebar stehen').toBeGreaterThan(0);

    await oeffneSektor(page, 'identity');
    await expect(page.locator('[data-edit="streetAddress"]'), 'Depot B zeigt SEINEN Wert, keine Spur von A').toHaveValue(DEPOT_B.wert);

    expect(fehler, 'kein Absturz im Übergang A→B (Konsole/pageerror leer)').toEqual([]);
  } finally {
    fs.rmSync(dateiA, { force: true });
    fs.rmSync(dateiB, { force: true });
  }
});
