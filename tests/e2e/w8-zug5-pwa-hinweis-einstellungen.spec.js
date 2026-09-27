'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 5 („W-8 Doppelerfassung", 09.08.2026) — Browser-Abnahme des
   zweiten PWA-Installations-Platzes in den Einstellungen.
   ────────────────────────────────────────────────────────────────────────
   Node-Tests (tests/w8-zug5-pwa-hinweis-einstellungen.test.js) belegen
   Struktur/Zustand bereits; hier zusätzlich, was nur ein echter Browser
   zeigt (U2-ADR-091 Event-Blindzone: kein `window.addEventListener` im
   Node-DOM-Stub).

   GEMESSEN beim Bau (Playwright, Rotmachbarkeits-Probe dieser Datei): die
   erste Fassung von `_installBlockAktualisieren()` leerte bei `appinstalled`
   nur den inneren Host-`<div>`, ließ aber die umschließende `<section>` samt
   Überschrift „Installation" stehen — sichtbar leer, sobald `appinstalled`
   FÄHRT, WÄHREND die Einstellungen offen sind (der naheliegendste Fall: der
   Knopf, der die Installation auslöst, steht selbst dort). Der Node-Kern
   sieht das nicht (kein echtes DOM-Event, keine `.closest()`-Navigation) —
   erst dieser Test macht ihn sichtbar. Fix: `_installBlockAktualisieren()`
   versteckt jetzt zusätzlich den umschließenden `.einst-abschnitt` über
   `.hidden`, wenn der Block leer wird. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');

test('Installations-Abschnitt in Einstellungen erscheint/verschwindet wie die Startseite, beide Container bleiben gleichzeitig aktuell', async ({ page }) => {
  await oeffneApp(page);

  const startseitePassivVorher = await page.locator('#vd-install-block').innerHTML();
  expect(startseitePassivVorher).toContain('webapp-hinweis');

  // Ein beforeinstallprompt simulieren (Playwright/Chromium feuert es nie von selbst) — dieselbe
  // Reaktion wie im echten Browser: _installEreignisseBinden()s Listener haelt das Event, dann
  // aktualisiert _installBlockAktualisieren() JEDEN Host per Klasse (der eigentliche Fund dieses Zugs).
  await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true })));

  const startseiteAktivNachher = await page.locator('#vd-install-block').innerHTML();
  expect(startseiteAktivNachher).toContain('webapp-install-knopf');

  await depotAnlegen(page);
  await page.click('#tb-einstellungen');
  // D.4 (Rest-Sichten, 26.08.2026): „Installation" liegt jetzt hinter <details>, kollabiert per
  // Default — erst aufklappen, dann ist der Installations-Host sichtbar.
  await einstellungenAbschnittOeffnen(page, '#einst-install-block');
  await page.waitForSelector('#einst-install-block', { state: 'visible' });

  // Der ZWEITE Container entsteht jetzt zusaetzlich im DOM, waehrend die Startseite (hinter .weg)
  // ihren aktiven Zustand behaelt — genau die Situation, die eine feste id (statt Klasse) durch
  // getElementById nur einmal getroffen haette.
  const einstellungenAktiv = await page.locator('#einst-install-block').innerHTML();
  expect(einstellungenAktiv).toContain('webapp-install-knopf');
  expect(einstellungenAktiv).toContain('Vivodepot auf dem Startbildschirm ablegen');

  // Klick im Einstellungen-Block loest wirklich den Installations-Fluss aus (Verkabelung ueber
  // die Klasse traf den RICHTIGEN, sichtbaren Knopf — nicht den verborgenen der Startseite).
  // Kern-Verschluss-Nachtrag (19.09.2026): kein direkter Zugriff auf `_deferredInstallPrompt`
  // mehr (der Verschluss hat das Schreiben von aussen bewusst geschlossen) — stattdessen ein
  // ZWEITES echtes beforeinstallprompt-Event, diesmal mit gestubbtem prompt()/userChoice am
  // Event selbst. Derselbe Listener wie bei der ersten Simulation (Zeile 33) haelt es, genau
  // wie im echten Browser.
  await page.evaluate(() => {
    window.__w8InstallPromptAufgerufen = false;
    const ev = new Event('beforeinstallprompt', { cancelable: true });
    ev.prompt = () => { window.__w8InstallPromptAufgerufen = true; };
    ev.userChoice = undefined;
    window.dispatchEvent(ev);
  });
  await page.locator('#einst-install-block .webapp-install-knopf').click();
  const aufgerufen = await page.evaluate(() => window.__w8InstallPromptAufgerufen);
  expect(aufgerufen).toBe(true);

  // appinstalled simulieren, WAEHREND die Einstellungen noch offen sind (der naheliegendste
  // Fall: der Knopf, der appinstalled ausloest, steht selbst dort) — der GANZE Abschnitt (inkl.
  // Ueberschrift) muss verschwinden, nicht nur der Knopf, sonst bliebe eine leere Ueberschrift
  // stehen. Die Startseite hat keinen Ueberschrift-Wrapper, dort genuegt der leere Host.
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));

  // D.4 (Rest-Sichten, 26.08.2026): der umschließende Abschnitt ist jetzt ein <details>
  // (Abschnitte hinter <details>, .einst-abschnitt bleibt die Klasse) statt eines <section> —
  // das xpath sucht darum beide Tag-Namen, statt am alten Tag zu kleben.
  const abschnitt = page.locator('#einst-install-block').locator('xpath=ancestor::*[self::section or self::details][1]');
  await expect(abschnitt).toBeHidden();

  const startseiteNachInstall = await page.locator('#vd-install-block').innerHTML();
  expect(startseiteNachInstall.trim()).toBe('');
});
