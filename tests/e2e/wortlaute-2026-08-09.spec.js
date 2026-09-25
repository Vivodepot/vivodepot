'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 3+5 (Auftrag „Das Stick-Versprechen halten", 09.08.2026) — Browser-
   Abnahme der freigegebenen Wortlaute. Node-Tests (tests/wortlaute-freigabe-
   2026-08-09.test.js) belegen Text + Struktur bereits; hier zusätzlich, was
   nur ein echter Browser zeigt: den längeren Schließen-Dialog (Nr. 2) auf
   einem kleinen Gerät, und den echten Toast-Ausbleib (Nr. 6).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, setzeFeld } = require('./helpers');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

test('[Nr.1] Anlege-Dialog zeigt den Speicherort-Hinweis vor dem Datei-Dialog', async ({ page }) => {
  // GEÄNDERT (Auftrag, 12.09.2026): dieser Wortlaut gehört zum DATEI-Weg (die Kopie
  // existiert weiterhin im Produkt, nur nicht mehr im Default-Zweig unter file://, seit
  // internerSpeicherModus() dort echt greifen kann) — Datei-Modus erzwungen, um genau diesen
  // Zweig zu sehen (Topf A des Sortierungs-Berichts, nicht Topf C: kein Toast-Locator-Problem).
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await oeffneApp(page);
  await page.click('#w-anfangen');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await expect(page.locator('#modal-inhalt')).toContainText('Wir empfehlen Ihren Stick');
});

test('[Nr.2] Schließen-Dialog: drei Wege mit Folgen sichtbar, auf 375px OHNE Scrollen bedienbar', async ({ page }) => {
  // GEÄNDERT (Auftrag, 12.09.2026): s. Nr.1 — der Datei-Weg-Dreiwege-Dialog ist hier der
  // Prüfgegenstand, Datei-Modus erzwungen.
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await page.setViewportSize({ width: 375, height: 812 });   // kleines Gerät (Auftrag: "kleines Gerät" pruefen)
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Mobil Testerin' });
  // Identität ist der Landing-Sektor nach dem Anlegen (kein Sidebar-Klick nötig — bei 375px
  // liegt die Sidebar off-canvas hinter dem Hamburger-Menü, s. tb-menue).
  await setzeFeld(page, 'streetAddress', 'Mobilweg 1');
  await page.click('#tb-schliessen');
  await page.waitForSelector('#m-ok', { state: 'visible' });

  const body = page.locator('#modal-inhalt');
  await expect(body).toContainText('Sie haben Änderungen, die noch nicht in Ihrer Datei stehen.');
  await expect(body).toContainText('Ihre Änderungen kommen in Ihre Datei.');
  await expect(body).toContainText('Ihre Änderungen sind weg.');

  // Auftrag: "prüfe, ob er auf einem kleinen Gerät noch ohne Scrollen bedienbar ist, und berichte,
  // wenn nicht." Alle drei Knöpfe müssen ohne Scrollen im sichtbaren Viewport klickbar sein.
  const primaer = page.locator('#m-ok');
  const dritt = page.locator('#m-dritt');
  await expect(primaer).toBeVisible();
  await expect(dritt).toBeVisible();
  const box = await dritt.boundingBox();
  expect(box, 'letzter Knopf hat eine reale Bounding-Box').not.toBeNull();
  expect(box.y + box.height, 'letzter Knopf liegt innerhalb der 812px Viewport-Höhe, kein Scrollen nötig')
    .toBeLessThanOrEqual(812);

  await page.click('#m-abbr');   // Dialog wieder schließen, App bleibt offen (kein weiterer Fortschritt nötig)
});

test('[Nr.6] interner Modus: die U2-ADR-211-Erinnerung erscheint über den stillen Auto-Save, nicht mehr über den Schließen-Dialog (U2-ADR-222/237)', async ({ page }) => {
  const http = require('node:http');
  const path = require('node:path');
  const fs = require('node:fs');
  const REPO_ROOT = path.join(__dirname, '..', '..');
  const MIME = { '.html': 'text/html', '.js': 'application/javascript' };
  const srv = http.createServer((req, res) => {
    // Klasse-B-Fund 19.09.2026 (e2e-37-rote-klassen-2026-09-19.md): gebackener privat-de statt
    // der rohen Datei, s. Kopf-Kommentar tests/e2e/helpers.js.
    const istNav = req.url === '/' || req.url === '/vivodepot.html';
    const fp = istNav ? GEBACKENE_PRODUKT_PFADE['privat-de'] : path.join(REPO_ROOT, req.url.split('?')[0]);
    fs.readFile(fp, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((resolve) => srv.listen(0, resolve));
  try {
    // FSA-Attrappe VOR dem goto registrieren (wie zug5-persistenz-rauchtest.spec.js) — depotAnlegen()
    // holt das Dateiziel bereits beim Anlegen (_dateizielFuerAnlegenSichern), ohne Attrappe hinge
    // showSaveFilePicker() auf einen native Dialog, den Playwright headless nicht bedienen kann.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async () => ({
          name: 'nr6-toast-test.vivodepot',
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        }),
      });
    });
    const port = srv.address().port;
    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    const modus = await page.evaluate(() => window.__vdOeffentlich.internerSpeicherModus());
    expect(modus, 'Vorbedingung: interner Modus').toBe(true);
    // U2-ADR-237-Nachzug (04.09.2026): der bisherige Weg über den Schließen-Dialog (#tb-schliessen
    // → #m-zweit, „Auf diesem Gerät merken") erreicht diesen Toast nicht mehr — seit U2-ADR-237
    // läuft schon depotAnlegen() selbst über den stillen internen Auto-Save
    // (exportErinnerungVielleichtZeigen() sitzt in depotInternSichern(), „einmal pro Sitzung").
    // GEMESSEN (dieser Zweig): der Zähler ist nach dem Anlegen bereits 0, der Schließen-Dialog
    // zeigt darum gar nicht mehr den alten DIRTY-Dreiwege-Zweig mit #m-zweit, sondern
    // d40KeineDateiText (nur #m-abbr/#m-dritt/#m-ok) — der Toast selbst ist zu diesem Zeitpunkt
    // längst erschienen und (einmal pro Sitzung) bereits verbraucht.
    await depotAnlegen(page, { name: 'Toast Testerin' });

    // Bis U2-ADR-222 (02.09.2026) stand hier die umgekehrte Erwartung: kein Toast. Das stimmte nur,
    // weil der Anlege-Schreibversuch fälschlich einen bestätigten Sicherungsstand setzte —
    // erhoehtesVerlustRisiko() sah darum kein Risiko. Nach dem Fix ist sicherungsStand nach
    // depotAnlegen() ehrlich null, das Risiko ist real (nur interner Speicher, keine bestätigte
    // Datei), und die U2-ADR-211-Erinnerung zeigt darum zu Recht ihre Risiko-Fassung
    // (exportErinnerungRisiko). Kein Rückfall auf einen bloßen `.toast`-Locator — Text-Filter, s.
    // dieselbe Begründung in tests/e2e/u2-adr-212-sichern-intern.spec.js.
    await expect(page.locator('#toast-host').getByText('Dieses Gerät kann den internen Speicher jederzeit freiräumen')).toBeVisible();
  } finally {
    srv.close();
  }
});

// Nr. 7 (der Bestandsfund von oben, jetzt behoben): Zug 5 des Auftrags „Speicherweg ohne
// Datei-Picker" (09.08.2026) macht die Depot-Pille zu einem echten Menü — „Mein Depot" ruft
// flowDepotListe() (den Info-Dialog, in dem Nr. 7 steht) wieder auf, „Depots, die ich aufbewahre"
// bleibt der bisherige Weg zu oeffneVerwaltung(). Test folgt.
test('Nr.7 über den echten Klickweg: Depot-Pille → Menü → "Mein Depot" zeigt die Fassung B (kein Picker)', async ({ page }) => {
  // GEÄNDERT (Auftrag, 12.09.2026): „Fassung B" ist ausdrücklich die Datei-Weg-Fassung
  // des Depot-Menüs — Datei-Modus erzwungen (Topf A), s. Nr.1.
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await oeffneApp(page);
  await page.evaluate(() => { delete window.showSaveFilePicker; });   // FSA aus → Fassung B
  await depotAnlegen(page);
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-liste', { state: 'visible' });
  await page.click('#tb-depot-menue-liste');
  await expect(page.locator('#modal-inhalt')).toContainText('Vivodepot legt bei jedem Sichern eine neue Datei an');
});
