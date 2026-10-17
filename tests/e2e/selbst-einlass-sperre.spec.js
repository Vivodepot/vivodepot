'use strict';
/* Die Wahl statt der Sperre im Browser (Schutz-Wagen; Entscheidungen der Produktverantwortung 04.10.2026: E1 bei jedem
   Öffnen fragen, nichts außerhalb der Datei speichern; E3 Wortlaute). Beide Wege:
   Weg 1: in den Einstellungen steht der Knopf wieder; ein Modul aus einer Datei wird erst nach der Frage eingelesen,
   „Abbrechen“ liest nichts ein.
   Weg 2: eine Depot-Datei mit einem eingebetteten Modul, das nicht ab Werk ist, zeigt beim Öffnen die Wahl, nichts
   vorgewählt; „Ohne diese Erweiterungen öffnen“ lässt den Text des Moduls aus, das angekreuzte Modul wirkt.
   Die Datei entsteht wie in der Node-Probe: ein Kern legt das Depot an, legt das Modul hinein und serialisiert es. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');
const { ladeKern } = require('../load-kern.js');

const PW = 'sperre-e2e-pw-2026-10-04';
const MODUL = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fr', texte: { 'strings:fussQuellcode.text': 'FREMD-E2E' } };

async function depotMitFremdemModul() {
  const Q = ladeKern({ produkt: 'privat-de' }).V;
  await Q.depotAnlegen(PW);
  Q.akteurSelbstErklaeren('Fremd');
  const d = JSON.parse(JSON.stringify(Q.getData()));
  d.textsatzModule = (d.textsatzModule || []).concat([JSON.parse(JSON.stringify(MODUL))]);
  d.textsprache = 'fr';
  Q.setData(d);
  return JSON.parse(JSON.stringify(await Q.depotSerialisieren()));
}

async function fremdeDateiOeffnen(page) {
  const umschlag = await depotMitFremdemModul();
  await oeffneApp(page);
  await page.evaluate(async ([u, pw]) => { await window.__vdOeffentlich.depotLaden(u, pw); window.__vdOeffentlich.betreteApp(); }, [umschlag, PW]);
  await expect(page.locator('#erweiterung-wahl-liste')).toBeVisible({ timeout: 15000 });
}

test('[Sperre·E2E·Weg 1] der Knopf steht wieder; ein Modul aus einer Datei wird erst nach der Frage eingelesen', async ({ page }) => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'wahl-e2e-'));
  const datei = path.join(ordner, 'fremdes-modul.json');
  fs.writeFileSync(datei, JSON.stringify(MODUL));
  try {
    await oeffneApp(page);
    await depotAnlegen(page);
    await page.locator('#tb-einstellungen').click();
    await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
    await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
    await expect(page.locator('#einst-modul-einlassen-gesperrt')).toHaveCount(0);
    // „Abbrechen“: nichts eingelesen.
    await page.locator('#einst-modul-datei').setInputFiles(datei);
    await expect(page.locator('#erweiterung-hinzufuegen-frage')).toBeVisible();
    await page.locator('#m-zweit').click();
    await expect(page.locator('#erweiterung-hinzufuegen-frage')).toHaveCount(0);
    expect(await page.evaluate(() => window.__vdOeffentlich.ankerDaten().textsatzModule.length)).toBe(0);
    // Nach „Nein“ stehen die Einstellungen wieder da (16.10.2026, _erweiterungAusEinstellungenFragen).
    await expect(page.locator('#modal-inhalt #einst-modul-datei')).toHaveCount(1);
    // „Verwenden“: eingelesen.
    await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
    await page.locator('#einst-modul-datei').setInputFiles(datei);
    await expect(page.locator('#erweiterung-hinzufuegen-frage')).toBeVisible();
    await page.locator('#m-ok').click();
    await expect(page.locator('#toast-host .toast', { hasText: 'Erweiterung eingelesen' })).toBeVisible({ timeout: 5000 });
    expect(await page.evaluate(() => window.__vdOeffentlich.ankerDaten().textsatzModule.length)).toBe(1);
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});

test('[Sperre·E2E·Weg 2] ohne Wahl wirkt das Modul einer geöffneten Depot-Datei nicht; die Einstellungen nennen es', async ({ page }) => {
  await fremdeDateiOeffnen(page);
  const kaestchen = page.locator('input.erweiterung-wahl');
  await expect(kaestchen).toHaveCount(1);
  await expect(kaestchen).not.toBeChecked();
  await page.locator('#m-zweit').click();   // „Ohne diese Erweiterungen öffnen“
  await expect(page.locator('#erweiterung-wahl-liste')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('FREMD-E2E');
  await page.evaluate(() => window.__vdOeffentlich.flowEinstellungen());
  await expect(page.locator('body')).toContainText('nicht verwendet');
});

test('[Sperre·E2E·Weg 2·gewählt] das angekreuzte Modul wirkt nach „Auswahl übernehmen“', async ({ page }) => {
  await fremdeDateiOeffnen(page);
  await page.locator('input.erweiterung-wahl').check();
  await page.locator('#m-ok').click();   // „Auswahl übernehmen“
  await expect(page.locator('#erweiterung-wahl-liste')).toHaveCount(0);
  await expect(page.locator('body')).toContainText('FREMD-E2E');
});
