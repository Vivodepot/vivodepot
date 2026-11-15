'use strict';
/* Befund A3 (11.11.2026): Beispieltexte (Platzhalter) sahen aus wie Einträge. Gehalten wird im Dialog „Neue Person“:
   (1) der Platzhalter ist deutlich heller als die Eingabe (Kontrast zwischen beiden mindestens 2,5 : 1),
   (2) er bleibt auf dem Feld lesbar (mindestens 4,5 : 1),
   (3) der Kanon unterscheidet zusätzlich durch Kursivschrift (PLATZHALTER-WIE-WERT), die Probe hält sie fest. Rot-Beweis: derselbe Messweg am alten Wert (rgb(74, 93, 74)) liegt unter 2,5 : 1. */
const { test, expect } = require('@playwright/test');
test.use({ viewport: { width: Number(process.env.VD_VP_B) || 1280, height: Number(process.env.VD_VP_H) || 800 } });   // Bildbreite für den Bericht (390 / 1024)
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

function lum(c) { let z = c.match(/\d+(\.\d+)?/g).map(Number); if (/^color\(srgb/.test(c)) z = z.map((v, i) => (i < 3 ? v * 255 : v));   /* color-mix liefert srgb 0–1 */ const a = z.length > 3 ? z[3] : 1; const [r, g, b] = z.slice(0, 3).map((v) => v * a + 255 * (1 - a))   /* halbdurchsichtige Fläche auf weißem Grund */.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function kontrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

test('[Beispieltext·A3] im Dialog „Neue Person“ ist das Beispiel hell genug abgesetzt und bleibt lesbar', async ({ page }) => {
  test.setTimeout(90000);
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb'); if (await bearb.count()) await bearb.click();
  await page.click('[data-person-hinzufuegen="1"]');
  await page.waitForSelector('#modal-inhalt');
  const m = await page.evaluate(() => {
    const f = [...document.querySelectorAll('#modal-inhalt input[placeholder]')].find((i) => i.placeholder && i.offsetParent);
    const ph = getComputedStyle(f, '::placeholder'); const cs = getComputedStyle(f);
    f.value = 'x'; const ein = getComputedStyle(f).color; f.value = '';
    let bg = cs.backgroundColor; let n = f; while (/rgba\(.*, 0\)|transparent/.test(bg) && n.parentElement) { n = n.parentElement; bg = getComputedStyle(n).backgroundColor; }
    return { platzhalter: ph.color, stil: ph.fontStyle, eingabe: ein, grund: bg, text: f.placeholder };
  });
  expect(m.stil).toBe('italic');
  expect(kontrast(m.platzhalter, m.eingabe), 'Beispiel gegen Eingabe: ' + JSON.stringify(m)).toBeGreaterThanOrEqual(2.5);
  expect(kontrast(m.platzhalter, m.grund), 'Beispiel auf dem Feld lesbar: ' + JSON.stringify(m)).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: process.env.A3_BILD || '/tmp/a3-dialog.png' });
});

test('[Beispieltext·A3·Rot-Beweis] der alte Wert liegt unter der Schwelle', () => {
  expect(kontrast('rgb(74, 93, 74)', 'rgb(22, 37, 23)')).toBeLessThan(2.5);
});
