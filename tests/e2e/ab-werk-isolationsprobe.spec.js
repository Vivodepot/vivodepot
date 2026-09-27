'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Isolationsprobe (08.09.2026) — die eine Produktdatei, ALLEIN
   in einem leeren Ordner, per Doppelklick geöffnet, kein Netz.
   ────────────────────────────────────────────────────────────────────────
   Der Auftrag, wörtlich: "nimm die eine HTML-Datei, leg sie ALLEIN in einen
   leeren Ordner, öffne sie per Doppelklick ohne Netz. Was du dann siehst,
   ist das Produkt. Ist es deutsch statt englisch, fehlt das Pro-Merkmal,
   oder fällt irgendetwas auf einen Ab-Werk-Zustand zurück, dann liegt noch
   etwas draußen, das drin gehört."

   ANDERS ALS U2-ADR-378 (Sichtbarkeitsbehauptungen gegen den vollen,
   ausgelieferten Ordner): diese Probe prüft die ISOLATION selbst — die
   Datei bekommt NICHT ihren vollen Begleitsatz (sw.js/manifest.webmanifest/
   vorabkonfiguration.js/Modul-Begleitdateien), nur sich SELBST, in einem
   frischen, sonst leeren Ordner. Das testet die Zielform von U2-ADR-387s
   Backen: am Ende soll EIN Produkt EINE Datei sein, vollständig allein
   lauffähig.

   HEUTE ABSICHTLICH ROT (privat-en/pro-de/pro-en) — AB_WERK_LOGIK_MODUL_
   QUELLEN ist im nativen Gerüst leer, produkt-konfektionieren.js backt
   noch nichts ein. Wird grün, sobald das Backen selbst gebaut ist — diese
   Probe sagt während des Bauens, wann fertig ist.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');
const { oeffneApp, depotAnlegen } = require('./helpers');

const REPO = path.join(__dirname, '..', '..');

/* Konfektioniert ein Produkt (voller Ordner, wie heute), kopiert DANN NUR
   vivodepot.html — allein, ohne jede Begleitdatei — in einen frischen,
   sonst leeren Ordner. Liefert die file://-URL der isolierten Kopie. */
function isolierteProduktDatei(slug, produktauswahl) {
  const { ladeIssuer } = require('../load-issuer.js');
  const ISSUER = ladeIssuer().V;
  const voll = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-werk-isolationsprobe-voll-'));
  const r = konfektionieren({
    ziel: voll, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
    unsignierteModulDateien: modulDateienFuer(produktauswahl),
  });
  const isoliert = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-werk-isolationsprobe-isoliert-'));
  fs.copyFileSync(path.join(r.ordner, 'vivodepot.html'), path.join(isoliert, 'vivodepot.html'));
  // Die Probe der Probe: NUR vivodepot.html liegt im Ordner, sonst nichts.
  const inhalt = fs.readdirSync(isoliert);
  if (inhalt.length !== 1 || inhalt[0] !== 'vivodepot.html') {
    throw new Error('Isolationsprobe selbst fehlerhaft — der Ordner trägt mehr/anderes als nur vivodepot.html: ' + inhalt.join(', '));
  }
  return 'file://' + path.join(isoliert, 'vivodepot.html');
}

test('[Isolationsprobe] privat-de: die isolierte Datei öffnet und funktioniert allein (Gegenprobe — muss GRÜN sein)', async ({ page }) => {
  const p = PRODUKTE.find((x) => x.slug === 'privat-de');
  const url = isolierteProduktDatei('privat-de', p);
  await oeffneApp(page, { url });
  await expect(page.locator('.welcome-brand')).toBeVisible();
  await depotAnlegen(page);
  await expect(page.locator('#app.an')).toHaveClass(/an/);
});

test('[Isolationsprobe] privat-en: die isolierte Datei startet NICHT englisch (heute rot — kein Ab-Werk-Backen)', async ({ page }) => {
  const p = PRODUKTE.find((x) => x.slug === 'privat-en');
  const url = isolierteProduktDatei('privat-en', p);
  await oeffneApp(page, { url });
  const marke = await page.locator('.welcome-brand').textContent();
  await depotAnlegen(page);
  const sidebarText = await page.locator('#sidebar').innerText();
  // Erwartung, sobald das Backen steht: ein englisches Wort wie "Identity" statt "Identität"
  // in der Sidebar. Heute (rot): die Sidebar bleibt deutsch, weil nichts eingebacken ist.
  expect(sidebarText, 'die isolierte privat-en-Datei zeigt englischen Text in der Sidebar — Ab-Werk-Backen wirkt bereits').toMatch(/Identity|Mobility|Finances/);
});

test('[Isolationsprobe] pro-de: die isolierte Datei trägt das Pro-Modul NICHT (heute rot — kein Ab-Werk-Backen)', async ({ page }) => {
  const p = PRODUKTE.find((x) => x.slug === 'pro-de');
  const url = isolierteProduktDatei('pro-de', p);
  await oeffneApp(page, { url });
  await depotAnlegen(page);
  const hatProModul = await page.evaluate(() => {
    // `data` selbst ist im echten Browser NICHT über window erreichbar (`let data`, anders als
    // im Node-Testharness). _logikModuleAlle(null) prüft trotzdem genau das Richtige: ohne
    // Depot-Anteil liefert sie ausschließlich die Ab-Werk-Liste — exakt das, was ab Werk da ist.
    try {
      const alle = typeof window.__vdOeffentlich._logikModuleAlle === 'function' ? window.__vdOeffentlich._logikModuleAlle(null) : [];
      return alle.some((m) => m && m.id === 'pro-geschaeftsfuehrerin-notfallmappe');
    } catch (e) { return false; }
  });
  expect(hatProModul, 'die isolierte pro-de-Datei trägt das Pro-Modul ab Werk — Backen wirkt bereits').toBe(true);
});

test('[Isolationsprobe] pro-en: die isolierte Datei trägt WEDER das Pro-Modul NOCH Englisch (heute rot — kein Ab-Werk-Backen)', async ({ page }) => {
  const p = PRODUKTE.find((x) => x.slug === 'pro-en');
  const url = isolierteProduktDatei('pro-en', p);
  await oeffneApp(page, { url });
  await depotAnlegen(page);
  const zustand = await page.evaluate(() => {
    let hatProModul = false;
    try {
      const alle = typeof window.__vdOeffentlich._logikModuleAlle === 'function' ? window.__vdOeffentlich._logikModuleAlle(null) : [];
      hatProModul = alle.some((m) => m && m.id === 'pro-geschaeftsfuehrerin-notfallmappe');
    } catch (e) { /* bleibt false */ }
    return { hatProModul };
  });
  const sidebarText = await page.locator('#sidebar').innerText();
  expect(zustand.hatProModul, 'Pro-Modul fehlt ab Werk').toBe(true);
  expect(sidebarText, 'Sidebar ist nicht englisch').toMatch(/Identity|Mobility|Finances/);
});
