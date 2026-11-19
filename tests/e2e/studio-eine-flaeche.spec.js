'use strict';
/* Eine Arbeitsfläche im Studio, im Browser (U2-ADR-493, Nachtrag „eine Fläche“), bei 1280 und 390:
   ein Feld wird ab 761 px in seiner Karte bearbeitet, schmaler im Blatt von unten; beim Tippen bleibt der Fokus im Feld;
   die technischen Angaben sind zugeklappt; die Vorschau der Anfrage folgt Name, Zweck, Feldname und Pflicht. */
const { test, expect } = require('@playwright/test');
const path = require('node:path');

const STUDIO_URL = 'file://' + (process.env.STUDIO_DATEI || path.join(__dirname, '..', '..', 'vivodepot-studio.html'));

/* Der Weg, gleich für beide Breiten. */
async function weg(page, breite) {
    await page.setViewportSize({ width: breite, height: 900 });
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(String(e && e.message)));
    await page.goto(STUDIO_URL);
    await page.waitForSelector('#raum-start', { state: 'visible' });
    await page.evaluate(() => { zeigeSchritt('template'); });
    await page.waitForSelector('#raum-bau', { state: 'visible' });

    await page.fill('#tpl-name', 'Anmeldung Stadtbibliothek');
    await page.fill('#tpl-zweck', 'Für den Ausweis.');
    await page.evaluate(() => { feldEinfuegen(feldAusKatalog(paletteEintraege()[0].idx), null); feldEinfuegen(feldAusKatalog(paletteEintraege()[1].idx), null); });
    await expect(page.locator('#av-titel')).toHaveText('Anmeldung Stadtbibliothek');
    await expect(page.locator('#av-zweck')).toHaveText('Für den Ausweis.');
    await expect(page.locator('#av-felder .as-zeile')).toHaveCount(2);

    await page.locator('#tpl-felder .vk-bearbeiten').first().click();
    await expect(page.locator('#feld-editor')).toBeVisible();
    const inKarte = await page.evaluate(() => !!document.querySelector('#tpl-felder .vk #feld-editor'));
    expect(inKarte, 'Bearbeitung in der Karte ab 761 px, sonst im Blatt').toBe(breite >= 761);
    expect(await page.evaluate(() => document.getElementById('ed-technisches').open), 'Technische Angaben zugeklappt').toBe(false);
    await expect(page.locator('#ed-bereich')).toBeHidden();

    await page.locator('#ed-name').fill('');
    await page.locator('#ed-name').pressSequentially('Rufname');
    expect(await page.evaluate(() => document.activeElement && document.activeElement.id), 'der Fokus bleibt beim Tippen im Feld').toBe('ed-name');
    /* S-2 (N56): ein Katalogbaustein liegt als Pflicht ab; hier wird das erste Feld freiwillig gestellt, das zweite bleibt Pflicht. */
    await page.uncheck('#ed-pflicht');
    const erste = page.locator('#av-felder .as-zeile').first();
    await expect(erste.locator('span').first()).toHaveText('Rufname');
    await expect(erste.locator('.av-art')).toHaveText(/freiwillig|optional/);
    await expect(page.locator('#av-felder .as-zeile').nth(1).locator('.av-art')).toHaveText(/Pflicht|required/);

    await page.click('#ed-speichern');
    await expect(page.locator('#feld-editor')).toBeHidden();
    expect(await page.evaluate(() => document.getElementById('feld-editor').parentNode.id), 'nach dem Schließen liegt der Block wieder an seinem Platz').toBe('eigenschaften');
    expect(fehler, 'Seitenfehler').toEqual([]);
}

test('[Eine Fläche] Bearbeiten in der Karte und Vorschau der Anfrage bei 1280', async ({ page }) => { await weg(page, 1280); });
test('[Eine Fläche] Bearbeiten im Blatt von unten und Vorschau der Anfrage bei 390', async ({ page }) => { await weg(page, 390); });
