'use strict';
/* ════════════════════════════════════════════════════════════════════════
   KI-Andockpunkt (U2-ADR-516 Punkt 4) — sichtbar, nicht ausführbar.
   ────────────────────────────────────────────────────────────────────────
   Ein Verweis auf ein lokales Modell steht in den Einstellungen als eigene
   Zeile mit Anzeigename, Prüfstufe, Herkunftsangabe und dem Satz, dass
   Vivodepot das Modell nicht mitliefert und nicht startet. Die Zeile trägt
   keinen Knopf; ein Klick darauf öffnet keine Dateiwahl, und während der
   Anzeige geht keine Anfrage hinaus.

   Der Einlass selbst ist nur signiert möglich und wird in
   tests/ki-andockpunkt-einlass.test.js über den echten Weg
   (modulEinlassenGeprueft, Wegwerf-Schlüssel) geprüft. Hier legt die Probe
   den Verweis darum direkt in das offene Depot — geprüft wird die Anzeige,
   nicht der Einlass. Die Prüfstufe steht dann als „Herkunft unbekannt“, weil
   für diesen Verweis kein nachgeprüfter Beleg vorliegt.

   Rot-Beweis: die Liste `einst-lokale-modelle` im Kern entfernt → die
   Erwartung an die Zeile wird rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');

const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));

const PW = 'ki-andockpunkt-anzeige-pw-516';
const VERWEIS = {
  modulTyp: 'lokalesModell', moduleVersion: 1, id: 'zz-probe', label: 'Probe-Modell E2E', sprache: 'de',
  modellHash: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', herkunft: 'Probe-Herkunft',
  eingelassenAm: '2026-10-30T09:00:00Z',
};

test('[KI-Andock·Anzeige] ein Verweis auf ein lokales Modell steht schreibgeschützt in den Einstellungen, ohne Dateiwahl und ohne Anfrage', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await page.evaluate((v) => { window.__vdOeffentlich.ankerDaten().lokaleModelle = [v]; }, VERWEIS);

  const anfragen = [];
  page.on('request', (r) => { if (!/^(data|blob|about):/.test(r.url())) anfragen.push(r.url()); });
  const vorher = anfragen.length;

  await page.locator('#tb-einstellungen').click();
  await einstellungenAbschnittOeffnen(page, '#einst-lokale-modelle');
  const zeile = page.locator('#einst-lokale-modelle li', { hasText: 'Probe-Modell E2E' });
  await expect(zeile).toBeVisible();
  await expect(zeile).toContainText('Probe-Herkunft');
  await expect(zeile).toContainText('nicht mit');
  await expect(page.locator('#einst-lokale-modelle button')).toHaveCount(0);

  let dateiwahl = false;
  page.on('filechooser', () => { dateiwahl = true; });
  await zeile.click();
  await page.waitForTimeout(500);
  expect(dateiwahl, 'ein Klick auf die Zeile öffnet keine Dateiwahl').toBe(false);

  expect(anfragen.slice(vorher), 'die Anzeige schickt keine Anfrage').toEqual([]);
  expect(fehler, 'kein Absturz beim Anzeigen').toEqual([]);
});
