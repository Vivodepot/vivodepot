'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   T-CROSS-34 — Kein Geheimnis bleibt nach dem Eintritt im Dokument (Befund 28.09.2026, HOCH)
   ───────────────────────────────────────────────────────────────────────────
   Gefunden beim Durchklicken der Abnahme-Vorschau v818: nach dem Öffnen stand das eingetippte
   Passwort weiter im versteckten Öffnen-Schirm (#co-pw, 16 Zeichen im value), beim Öffnen mit dem
   Wiederherstellungs-Code dort zusätzlich Code und neues Passwort. Der Schirm ist nur ausgeblendet,
   nicht geleert — jedes Skript auf der Seite, jede Erweiterung, jeder Blick in die Entwicklertools
   liest das Geheimnis der offenen Sitzung.

   DIE KLASSE, nicht der Einzelfall: jedes Eingabefeld, das ein Geheimnis trägt (type="password" oder
   data-geheimnis), ist nach dem Eintritt leer — im Kern (Passwort-Weg; der Code-Weg steht in
   tests/e2e/wiederherstellungs-code.spec.js) und in der Lese-App. Geprüft wird zusätzlich, dass
   KEIN Eingabefeld im Dokument das Geheimnis als Wert trägt, gleich welchen Typs.
   Rot-Beweis: diese Probe lief vor dem Fix gegen den unveränderten Kern und war rot (Bau-Bericht).
   ═══════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');

const PW = 'cross-geheimnis-pw-2026';

// Alle Eingabefelder, die nach dem Eintritt noch ein Geheimnis tragen (Typ, Markierung oder Wert).
async function geheimnisReste(page, geheimnisse) {
  return page.evaluate((gs) => [...document.querySelectorAll('input, textarea')]
    .filter((el) => el.value && (el.type === 'password' || el.hasAttribute('data-geheimnis') || gs.some((g) => el.value.includes(g))))
    .map((el) => (el.id || el.name || el.tagName) + ':' + el.value.length), geheimnisse);
}

test.describe('T-CROSS-34 kein Geheimnis im Dokument nach dem Eintritt', () => {
  let tmp;
  let datei;
  test.beforeAll(async ({ browser }) => {
    tmp = H.frischerTmp('geheimnis');
    const ctx = await browser.newContext({ acceptDownloads: true });
    const a = await ctx.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: 'Erika Probe', pw: PW });
    datei = await H.kern.speichernNachTmp(a, tmp);
    await ctx.close();
  });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('[Geheimnis·Kern] nach dem Öffnen mit dem Passwort trägt kein Feld im Dokument das Passwort', async ({ browser }) => {
    const ctx = await browser.newContext();
    const b = await ctx.newPage();
    await H.kern.oeffnen(b);
    await b.click('#w-datei');
    await b.setInputFiles('#co-datei', datei);
    await b.fill('#co-pw', PW);
    await b.click('#w-oeffnen');
    await b.waitForSelector('#app.an', { state: 'attached' });
    await H.kern.einmalDialogeSchliessen(b).catch(() => {});
    expect(await geheimnisReste(b, [PW])).toEqual([]);
    await ctx.close();
  });

  test('[Geheimnis·Lese-App] nach dem Öffnen in der Lese-App trägt kein Feld das Passwort', async ({ browser }) => {
    const ctx = await browser.newContext();
    const c = await ctx.newPage();
    await H.lesen.oeffnen(c);
    await H.lesen.dateiOeffnen(c, datei, PW);
    expect(await geheimnisReste(c, [PW])).toEqual([]);
    await ctx.close();
  });
});
