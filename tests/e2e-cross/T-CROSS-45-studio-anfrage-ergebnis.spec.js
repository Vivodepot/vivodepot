'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-45 — Studio, Wagen S-H (10.11.2026): die fertige Anfrage als drei Karten (S2), Grundlage mit Chips, Land unbelegt (S4)
   ─────────────────────────────────────────────────
   S2: Anfrage-Weg bis „fertig“: Karten Brief, Passwort, Link sichtbar; keine zwei Boxen im Ergebnis schneiden sich (Überdeckung = 0,
       gemessen mit getBoundingClientRect, bei 390 und 1280 px); „Kopieren“ setzt die Zwischenablage (Passwort, voller Link);
       „Neue Anfrage“ führt auf einen leeren Schritt 1.
   S4: Schritt 3: Chips für übliche Grundlagen tragen den Text ein; das Land bleibt leer bis zum Klick auf den Chip aus der Browsersprache.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Kopie von 57cdb52c4:vivodepot-studio.html> → alle Tests rot.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers');

const URL = process.env.GENERATOR_HTML_PATH ? 'file://' + path.resolve(process.env.GENERATOR_HTML_PATH) : H.URLS.generator;

async function oeffnen(browser, breite) {
  const ctx = await browser.newContext({ locale: 'de-DE', viewport: { width: breite || 1280, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.click('#sp-de');
  return { ctx, p };
}
async function bisSchritt3(p) {
  await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
  await p.click('#ein-anfrage');
  await p.fill('#aa-von', 'Bürgerservice Musterstadt');
  await p.click('#aa-weiter-1');
  await p.click('[data-beispiel="termin"]');
  await p.click('#aa-weiter-2');
}
async function bisFertig(p) {
  await bisSchritt3(p);
  await p.click('[data-grundlage="Ihre Einwilligung"]');
  await p.click('#aa-weiter-3');
  await p.fill('#aa-an', 'termine@musterstadt.example');
  await p.click('#aa-weiter-4');
  await p.click('#aa-weiter-5');
  await p.click('#aa-erzeugen');
  await expect(p.locator('#aa-karte-link')).toBeVisible();
}
/* Alle sichtbaren Boxen im Ergebnis; zwei, die keine Eltern-Kind-Paare sind und sich schneiden, zählen als Überdeckung. */
async function ueberdeckungen(p) {
  return p.evaluate(() => {
    const boxen = [...document.querySelectorAll('#aa-ergebnis button, #aa-ergebnis textarea, #aa-ergebnis code, #aa-ergebnis summary, #aa-ergebnis p, #aa-ergebnis h2, #aa-ergebnis h3, #aa-ergebnis section')]
      .filter((e) => e.checkVisibility() && e.getBoundingClientRect().height > 0);
    const treffer = [];
    for (let i = 0; i < boxen.length; i++) for (let j = i + 1; j < boxen.length; j++) {
      if (boxen[i].contains(boxen[j]) || boxen[j].contains(boxen[i])) continue;
      const a = boxen[i].getBoundingClientRect(), c = boxen[j].getBoundingClientRect();
      const w = Math.min(a.right, c.right) - Math.max(a.left, c.left), h = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
      if (w > 0.5 && h > 0.5) treffer.push((boxen[i].id || boxen[i].tagName) + ' x ' + (boxen[j].id || boxen[j].tagName));
    }
    return { n: boxen.length, treffer };
  });
}

test.describe('T-CROSS-45 Studio · Ergebnis der Anfrage', () => {
  for (const breite of [1280, 390]) {
    test('drei Karten, keine Überdeckung bei ' + breite + ' px, Link ohne Seitenüberlauf', async ({ browser }) => {
      const { ctx, p } = await oeffnen(browser, breite);
      await bisFertig(p);
      for (const k of ['brief', 'passwort', 'link']) {
        await expect(p.locator('#aa-karte-' + k)).toBeVisible();
        await expect(p.locator('#aa-kopieren-' + k)).toBeVisible();
      }
      await expect(p.locator('#aa-brief-laden')).toHaveText('Speichern');
      await expect(p.locator('#aa-zettel-laden')).toHaveText('Speichern');
      await expect(p.locator('#aa-karte-link button')).toHaveCount(1);   // der Link nur Kopieren
      const m = await ueberdeckungen(p);
      expect(m.n, 'es wurden Boxen gemessen').toBeGreaterThan(10);
      expect(m.treffer, 'Überdeckung = 0').toEqual([]);
      const breit = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(breit, 'kein Seitenüberlauf').toBeLessThanOrEqual(0);
      // aufgeklappt bleibt es ohne Überdeckung
      await p.click('#aa-link-aufklapper summary');
      await expect(p.locator('#aa-link-voll')).toBeVisible();
      expect((await ueberdeckungen(p)).treffer).toEqual([]);
      await ctx.close();
    });
  }

  test('„Kopieren“ setzt die Zwischenablage: Passwort und voller Link; der Knopf sagt „Kopiert“', async ({ browser }) => {
    const { ctx, p } = await oeffnen(browser);
    await bisFertig(p);
    const pw = (await p.locator('#aa-passwort').textContent()).trim();
    await p.click('#aa-kopieren-passwort');
    await expect(p.locator('#aa-kopieren-passwort')).toHaveText('Kopiert');
    expect(await p.evaluate(() => navigator.clipboard.readText())).toBe(pw);
    await expect(p.locator('#aa-kopieren-passwort')).toHaveText('Kopieren', { timeout: 5000 });
    const kurz = await p.locator('#aa-link').textContent();
    expect(kurz.length).toBeLessThanOrEqual(44);
    await p.click('#aa-kopieren-link');
    const voll = await p.evaluate(() => navigator.clipboard.readText());
    expect(voll.length).toBeGreaterThan(100);
    expect(voll).toMatch(/^https:\/\//);
    expect(await p.locator('#aa-link').getAttribute('title')).toBe(voll);
    expect(await p.locator('#aa-link-voll').textContent()).toBe(voll);
    await p.click('#aa-kopieren-brief');
    expect(await p.evaluate(() => navigator.clipboard.readText())).toContain(voll);
    await ctx.close();
  });

  test('„Neue Anfrage“ ersetzt „Anfrage erstellen“ und führt zu leerem Schritt 1', async ({ browser }) => {
    const { ctx, p } = await oeffnen(browser);
    await bisFertig(p);
    await expect(p.locator('#aa-erzeugen')).toBeHidden();
    await expect(p.locator('#aa-neu')).toBeVisible();
    await p.click('#aa-neu');
    await expect(p.locator('#aa-schritt-1')).toBeVisible();
    await expect(p.locator('#aa-von')).toHaveValue('');
    await expect(p.locator('#aa-ergebnis')).toBeHidden();
    await p.click('#aa-weiter-1');   // ohne Name geht es nicht weiter: der Weg ist wirklich leer
    await expect(p.locator('#aa-schritt-1')).toBeVisible();
    await ctx.close();
  });

  test('Schritt 3: Grundlage per Chip, Land leer bis zum Klick', async ({ browser }) => {
    const { ctx, p } = await oeffnen(browser);
    await bisSchritt3(p);
    await expect(p.locator('#aa-grundlagen .as-chip')).toHaveCount(4);
    await expect(p.locator('#aa-grundlage')).toHaveValue('');
    await p.click('#aa-grundlagen [data-grundlage="Eine gesetzliche Pflicht"]');
    await expect(p.locator('#aa-grundlage')).toHaveValue('Eine gesetzliche Pflicht');
    await expect(p.locator('#aa-rechtsraum')).toHaveValue('');   // nicht vorbelegt (U2-ADR-495)
    await expect(p.locator('#aa-land-chip')).toHaveText('Deutschland?');
    await p.click('#aa-land-chip');
    await expect(p.locator('#aa-rechtsraum')).toHaveValue('DE');
    await expect(p.locator('#aa-land-vorschlag')).toBeHidden();
    await ctx.close();
  });
});
