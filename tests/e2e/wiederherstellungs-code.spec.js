'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-430 · Wiederherstellungs-Code im Browser (Bau 27.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Was nur der Browser zeigt: die angezeigten Sätze (Ziffer 2 und 7, #6, #12), der Weg der
   Bürgerin durch Angebot, Anzeige, Kontrolle, Einstellungen und das Öffnen mit dem Code — und
   dass der Code nach dem Schließen des Dialogs nirgends mehr im Dokument steht (#8). Die Krypto
   und die Dateiform prüft tests/wiederherstellungs-code.test.js.
   Rot-Beweis je Test: die Gegenprobe im selben Lauf (falscher Code öffnet nicht, falsche
   Kontrolle richtet nichts ein).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, einstellungenAbschnittOeffnen, einmalDialogeSchliessen } = require('./helpers');

const PW = 'whc-e2e-passwort-2026';
const PW_NEU = 'whc-e2e-neues-passwort-2026';
// Die Sätze aus dem deutschen Sprachmodul — der Kern hält STRINGS nicht auf `window`.
const DE = require('../../tools/textsatz-de-modul.json').texte;
const T = (k) => { const t = DE['strings:' + k + '.text']; if (!t) throw new Error('Text fehlt: ' + k); return t; };
const umschlag = (bytes) => JSON.parse(bytes.slice(bytes.indexOf('{')));

async function dateiAttrappe(page) {
  await page.evaluate(() => {
    window.__whcBytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'whc.vivodepot',
        createWritable: async () => {
          let s = '';
          return { write: async (c) => { s += typeof c === 'string' ? c : await c.text(); }, close: async () => { window.__whcBytes = s; } };
        },
      }),
    });
  });
}

// Anlegen bis zum Angebot — ohne die Einmal-Dialoge abzuräumen (das Angebot IST der Prüfgegenstand).
async function anlegenBisAngebot(page) {
  // Datei-Modus: ohne IndexedDB schreibt jedes Speichern die Datei (die Attrappe fängt sie).
  await page.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {} });
  await oeffneApp(page);
  await dateiAttrappe(page);
  await page.click('#w-anfangen');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Ayse');
  await page.fill('#id-nachname', 'Beispiel');
  await page.fill('#id-pw', PW);
  await page.fill('#id-pw2', PW);
  await page.click('#m-ok');
  // Der Wiedereinstiegs-Hinweis kann davor liegen; das Angebot wartet auf den freien Host.
  const ende = Date.now() + 15000;
  while (Date.now() < ende && !(await page.locator('#whc-angebot').isVisible().catch(() => false))) {
    if (await page.locator('#wiedereinstieg-hinweis').isVisible().catch(() => false)) await page.click('#m-ok');
    await page.waitForTimeout(100);
  }
  await expect(page.locator('#whc-angebot')).toBeVisible();
}

test('[WHC·#6] nach dem Anlegen: „Code einrichten" ist der Primärknopf; Ablehnen ist ein eigener Schritt mit der Tragweite', async ({ page }) => {
  await anlegenBisAngebot(page);
  expect(await page.locator('#m-ok').textContent()).toBe(T('whcEinrichtenKnopf'));
  await page.click('#m-zweit');
  await expect(page.locator('#whc-tragweite')).toContainText(T('whcAblehnenTragweite'));
  await page.click('#m-zweit');
  await expect(page.locator('#nfb-angebot')).toBeVisible();   // danach das Notfall-Blatt, wie vorher
});

test('[WHC·#8 #12 #22] einrichten mit Kontrolle, Zustand in den Einstellungen, Code-Blatt leer, Code nach dem Schließen fort', async ({ page }) => {
  await anlegenBisAngebot(page);
  await page.click('#m-ok');
  await expect(page.locator('#whc-nicht-zum-passwort')).toHaveText(T('whcNichtZumPasswort'));
  const code = (await page.locator('#whc-code').textContent()).replace(/\s/g, '').match(/.{1,4}/g).join('-');
  expect(code).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{4}$/);

  // Code-Blatt: leer gedruckt, ohne Passwortfeld.
  await page.click('#whc-blatt');
  const blatt = await page.locator('#notfallblatt-overlay').innerText();
  expect(blatt).not.toContain(code);
  expect(blatt).not.toContain(T('nfbFeldPasswort'));
  await page.click('#nfb-schliessen');

  // Rot-Beweis: eine falsche Kontrolle richtet nichts ein.
  const falsch = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0');
  await page.fill('#whc-kontrolle', falsch);
  await page.click('#m-ok');
  await expect(page.locator('#whc-fehler')).toBeVisible();
  expect(await page.locator('#whc-fehler').textContent()).toBe(T('whcKontrolleFalsch'));

  await page.fill('#whc-kontrolle', code.toLowerCase());
  await page.click('#m-ok');
  await expect.poll(() => page.evaluate(() => !!(window.__whcBytes && window.__whcBytes.includes('"wiederherstellung"')))).toBe(true);
  // #8: nach dem Schließen steht der Code nirgends im Dokument, nirgends im lokalen Speicher.
  await expect(page.locator('#whc-code')).toHaveCount(0);
  const spuren = await page.evaluate((c) => {
    const roh = c.replace(/-/g, '');
    const html = document.documentElement.outerHTML.toUpperCase();
    let ls = ''; try { for (let i = 0; i < localStorage.length; i++) ls += localStorage.getItem(localStorage.key(i)); } catch (_) {}
    return [html.includes(c) || html.includes(roh), ls.toUpperCase().includes(roh)];
  }, code);
  expect(spuren).toEqual([false, false]);

  // #12: der Zustand steht in den Einstellungen als Satz.
  await einmalDialogeSchliessen(page);   // Wiedereinstiegs-Hinweis der ersten Sicherung, dann das Notfall-Blatt-Angebot
  await page.evaluate(() => window.__vdOeffentlich.flowEinstellungen());
  await einstellungenAbschnittOeffnen(page, '#whc-status');
  await expect(page.locator('#whc-status')).toHaveText(T('whcStatusEingerichtet'));
});

test('[WHC·Öffnen] mit dem Code und einem neuen Passwort öffnen; ein falscher Code öffnet nicht', async ({ page, browser }) => {
  await anlegenBisAngebot(page);
  await page.click('#m-ok');
  const code = (await page.locator('#whc-code').textContent()).replace(/\s/g, '').match(/.{1,4}/g).join('-');
  await page.fill('#whc-kontrolle', code);
  await page.click('#m-ok');
  await expect.poll(() => page.evaluate(() => window.__whcBytes && window.__whcBytes.includes('"wiederherstellung"'))).toBe(true);
  const datei = path.join(os.tmpdir(), 'whc-e2e-' + process.pid + '-' + Date.now() + '.vivodepot');
  fs.writeFileSync(datei, await page.evaluate(() => window.__whcBytes), 'utf8');
  try {
    const p2 = await browser.newPage();
    await p2.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {} });
    await oeffneApp(p2);
    await dateiAttrappe(p2);
    await p2.click('#w-datei');
    await p2.setInputFiles('#co-datei', datei);
    await p2.click('#co-code');
    await p2.fill('#whc-code-ein', code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'));
    await p2.fill('#whc-pw-neu', PW_NEU);
    await p2.fill('#whc-pw-neu2', PW_NEU);
    await p2.click('#whc-oeffnen');
    await expect(p2.locator('#whc-oeffnen-fehler')).toHaveText(T('whcFehlerAbgeschrieben'));
    await p2.fill('#whc-code-ein', code);
    await p2.click('#whc-oeffnen');
    await p2.waitForSelector('#app.an', { state: 'attached' });
    await expect.poll(() => p2.evaluate(() => window.__whcBytes !== null)).toBe(true);
    const neu = umschlag(await p2.evaluate(() => window.__whcBytes));
    const alt = umschlag(fs.readFileSync(datei, 'utf8'));
    expect(neu.wiederherstellung, 'die neue Datei trägt die Hülle weiter').toBeTruthy();
    expect(neu.pbkdf2.salt, 'unter dem neuen Passwort geschrieben').not.toBe(alt.pbkdf2.salt);
    expect(neu.wiederherstellung.salz, 'die Hülle ist neu gewickelt').not.toBe(alt.wiederherstellung.salz);
    await p2.close();
  } finally { fs.rmSync(datei, { force: true }); }
});
