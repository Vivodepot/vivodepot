'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A439 (Laufzettel Nacht 22./23.08.2026, Posten 7) — die sechste Reise
   ────────────────────────────────────────────────────────────────────────────
   Der Registerbefund vom 22.08. hatte die ursprüngliche A439-Einstufung „es
   fehlt eine ganze Reise" widerlegt: der Gegenstand (Tod-Übergangs-Wizard) ist
   nicht ungebaut, sondern am 01.08.2026 bindend durch ein Situationsblatt
   ersetzt worden (`tests/situationsblatt-todesfall-uebernahme.test.js`, 10
   Proben, grün). Was WIRKLICH offen blieb, und kleiner war: **null Treffer
   „todesfall" in tests/e2e/** — ein Durchgang „Übernehmer nach Todesfall" war
   nie gefahren worden, obwohl die fünf anderen Reisen (Marlies, Petra, Anja,
   Thomas, Renate) alle eine haben. Diese Datei schließt genau diese Lücke —
   im echten Browser, über den echten Klickweg, nicht nur über load-kern.js.

   GEPRÜFT: Erreichbarkeit über die Anlass-Kachel „Todesfall" (kein Wizard,
   kein Lage-Blatt — direkt das Situationsblatt), der Titel, Weg 2 + Weg 3 im
   Text, und dass Weg 1/„Verselbstständigung"/Posten 103 NIRGENDS erscheint
   (dieselben drei Zusagen wie in situationsblatt-todesfall-uebernahme.test.js,
   Proben 5+6 — hier am echten DOM, nicht am jsdom-Stub).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('Anlass „Todesfall" öffnet direkt das Situationsblatt „Nach einem Todesfall"', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await page.click('[data-anlass-auswahl="1"]');
  // CW-1 (24.08.2026): `todesfall-uebernahme` ist keine eigene Kachel mehr im Raster —
  // die zusammengelegte Kachel „todesfall" öffnet eine Zwischenfrage, eine ihrer drei Optionen
  // führt weiterhin genau hierher (`data-zwischenfrage-anlass="todesfall-uebernahme"`).
  await page.waitForSelector('[data-anlass="todesfall"]', { state: 'visible' });
  await page.click('[data-anlass="todesfall"]');
  await page.waitForSelector('[data-zwischenfrage-anlass="todesfall-uebernahme"]', { state: 'visible' });
  await page.click('[data-zwischenfrage-anlass="todesfall-uebernahme"]');

  await expect(page.locator('#content')).toContainText('Nach einem Todesfall');
});

test('das Blatt nennt Weg 2 („Verwaltete Depots") und Weg 3 („Datei öffnen"), aber nie Weg 1', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await page.click('[data-anlass-auswahl="1"]');
  // CW-1 (24.08.2026): `todesfall-uebernahme` ist keine eigene Kachel mehr im Raster —
  // die zusammengelegte Kachel „todesfall" öffnet eine Zwischenfrage, eine ihrer drei Optionen
  // führt weiterhin genau hierher (`data-zwischenfrage-anlass="todesfall-uebernahme"`).
  await page.waitForSelector('[data-anlass="todesfall"]', { state: 'visible' });
  await page.click('[data-anlass="todesfall"]');
  await page.waitForSelector('[data-zwischenfrage-anlass="todesfall-uebernahme"]', { state: 'visible' });
  await page.click('[data-zwischenfrage-anlass="todesfall-uebernahme"]');

  const text = await page.locator('#content').innerText();
  expect(text).toMatch(/Verwaltete Depots/);
  expect(text).toMatch(/Datei öffnen/);
  expect(text).not.toMatch(/Als Angehörige öffnen/);
  expect(text).not.toMatch(/Verselbstständig/i);
  expect(text).not.toMatch(/Posten 103/);
});

test('ohne hinterlegte KI-Verfügungs-Daten erscheint der Block „Digitale Nachbildung" nicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await page.click('[data-anlass-auswahl="1"]');
  // CW-1 (24.08.2026): `todesfall-uebernahme` ist keine eigene Kachel mehr im Raster —
  // die zusammengelegte Kachel „todesfall" öffnet eine Zwischenfrage, eine ihrer drei Optionen
  // führt weiterhin genau hierher (`data-zwischenfrage-anlass="todesfall-uebernahme"`).
  await page.waitForSelector('[data-anlass="todesfall"]', { state: 'visible' });
  await page.click('[data-anlass="todesfall"]');
  await page.waitForSelector('[data-zwischenfrage-anlass="todesfall-uebernahme"]', { state: 'visible' });
  await page.click('[data-zwischenfrage-anlass="todesfall-uebernahme"]');

  await expect(page.locator('#content')).not.toContainText('Digitale Nachbildung');
});

test('das Blatt ist auch über die direkte Sidebar-Navigation ohne vorheriges Ausfüllen ansehbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Zweiter unabhängiger Zugriff, kein Ausfüllen dazwischen: derselbe Gegenstand
  // muss auch nach dem Verlassen wieder klaglos rendern (Proben 4/2 aus dem Unit-Test,
  // hier über zwei Klicks statt eines Kern-Aufrufs).
  await page.click('[data-anlass-auswahl="1"]');
  // CW-1 (24.08.2026): `todesfall-uebernahme` ist keine eigene Kachel mehr im Raster —
  // die zusammengelegte Kachel „todesfall" öffnet eine Zwischenfrage, eine ihrer drei Optionen
  // führt weiterhin genau hierher (`data-zwischenfrage-anlass="todesfall-uebernahme"`).
  await page.waitForSelector('[data-anlass="todesfall"]', { state: 'visible' });
  await page.click('[data-anlass="todesfall"]');
  await page.waitForSelector('[data-zwischenfrage-anlass="todesfall-uebernahme"]', { state: 'visible' });
  await page.click('[data-zwischenfrage-anlass="todesfall-uebernahme"]');
  await expect(page.locator('#content')).toContainText('Nach einem Todesfall');

  await page.click('[data-anlass-auswahl="1"]');
  // CW-1 (24.08.2026): `todesfall-uebernahme` ist keine eigene Kachel mehr im Raster —
  // die zusammengelegte Kachel „todesfall" öffnet eine Zwischenfrage, eine ihrer drei Optionen
  // führt weiterhin genau hierher (`data-zwischenfrage-anlass="todesfall-uebernahme"`).
  await page.waitForSelector('[data-anlass="todesfall"]', { state: 'visible' });
  await page.click('[data-anlass="todesfall"]');
  await page.waitForSelector('[data-zwischenfrage-anlass="todesfall-uebernahme"]', { state: 'visible' });
  await page.click('[data-zwischenfrage-anlass="todesfall-uebernahme"]');
  await expect(page.locator('#content')).toContainText('Nach einem Todesfall');
});
