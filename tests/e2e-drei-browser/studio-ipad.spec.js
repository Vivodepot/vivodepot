'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Das Studio am iPad (iPad-Prüfung 14.10.2026): WebKit, iPad quer und hoch, über file:// wie die ausgelieferte Datei
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Die Wege, die eine Einrichtung am Tablet geht, jeder Bildschirm gemessen:
     Eingang · Anfrage an Personen, Schritte 1 bis 6 bis „Anfrage erstellen“ · Aufnahmebogen bis „Fertigstellen und
     einreichen“ mit „Vorab prüfen“ · Fachebene: ein Entwurf (erfunden, mit Datum, Auswahl, Ja/Nein und einer Liste mit
     Unterfeldern) über „Entwurf fortsetzen“, Arbeitsfläche, „Vorschau“, „Vorab prüfen“.
   Je Bildschirm gilt:
     (1) kein waagerechter Überlauf (scrollWidth ≤ Fensterbreite);
     (2) kein Konsolenfehler und kein Seitenfehler;
     (3) keine Netzanfrage: jede Anfrage außer file:, data: und blob: wird abgebrochen UND gezählt, die Zahl muss 0 sein;
     (4) bei grobem Zeiger mindestens 44 px Trefferfläche, gemessen mit tools/lib/trefferflaechen.js (dieselbe Regel wie
         für die App, hier mit der Grenze 44 der Fingerbedienung statt 24).
   Positivkontrollen: Der Kontext meldet `pointer: coarse` (sonst misst (4) einen Desktop), und je Bildschirm wurden
   Bedienelemente gemessen (null Funde ohne Nenner hieße nichts).
   Rot-Beweise im Lauf: Eine Stilregel nimmt den Umbruch des Anfrage-Links zurück, (1) fällt; eine andere setzt das
   Paletten-„+“ auf 26 px zurück, (4) fällt.
   Keine Schlüsselerzeugung: Das Schlüsselpaar und die Einreichungsdatei prüft tests/e2e-cross/T-CROSS-40.
   Nur WebKit (das Gerät „iPad“ ist WebKit): Chromium und Firefox nehmen die Spec per testIgnore in der Konfiguration aus.
   Konfiguration: playwright.config.drei-browser.js (mit Suite-Platz, wie jede E2E-Reise).
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test, expect, devices } = require('@playwright/test');
const path = require('node:path');
const { erheben } = require('../../tools/lib/trefferflaechen.js');

const STUDIO_URL = 'file://' + path.join(__dirname, '..', '..', 'vivodepot-studio.html');
const FINGER_PX = 44;

/* Ein erfundener Entwurf im Format, das das Studio selbst beim Sichern schreibt. Keine echten Personen, nur .example. */
const ENTWURF = {
  format: 'vivodepot-generator-entwurf', version: 1, sprache: 'de',
  felder: [
    { feldname: 'Vorname', feldtyp: 'text', pflicht: true, bereich: 'identity', provenienzPflichtig: true },
    { feldname: 'Nachname', feldtyp: 'text', pflicht: true, bereich: 'identity', provenienzPflichtig: true },
    { feldname: 'Geburtsdatum', feldtyp: 'datum', pflicht: true, bereich: 'identity', provenienzPflichtig: true },
    { feldname: 'E-Mail', feldtyp: 'text', pflicht: false, bereich: 'identity', provenienzPflichtig: true },
    { feldname: 'Art des Ausweises', feldtyp: 'auswahl', pflicht: true, bereich: 'administration', gruppe: 'Leseausweis', provenienzPflichtig: true,
      codeWerte: [{ code: 'erwachsene', anzeige: 'Erwachsene' }, { code: 'ermaessigt', anzeige: 'Ermäßigt' }, { code: 'familie', anzeige: 'Familie' }] },
    { feldname: 'Erinnerung vor Ablauf der Leihfrist', feldtyp: 'jaNein', pflicht: false, bereich: 'administration', gruppe: 'Leseausweis', provenienzPflichtig: true },
    { feldname: 'Weitere Personen im Familienausweis', feldtyp: 'liste', pflicht: false, bereich: 'administration', gruppe: 'Leseausweis', provenienzPflichtig: true,
      unterFelder: [{ feldname: 'Vorname', feldtyp: 'text' }, { feldname: 'Geburtsdatum', feldtyp: 'datum' }] },
  ],
  anbieter: {
    anbieterName: 'Gemeindebücherei Beispielstadt',
    adresse: { strasse: 'Am Markt 2', plz: '99999', ort: 'Beispielstadt', land: 'Deutschland' },
    kontakt: { name: 'Ausleihe', email: 'ausleihe@beispielstadt.example' },
  },
};

async function oeffnen(browser, geraet) {
  // Deutsch fest: das Gerät bringt sonst seine Sprache mit (en-US), und das Studio folgte ihr.
  const ctx = await browser.newContext({ ...devices[geraet], locale: 'de-DE', acceptDownloads: true });
  const gesperrt = [];
  await ctx.route('**', (r) => {
    const u = r.request().url();
    if (/^(file|data|blob):/.test(u)) return r.continue();
    gesperrt.push(u);
    return r.abort();
  });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  await page.goto(STUDIO_URL);
  await page.waitForSelector('#ein-anfrage', { state: 'visible' });
  await page.tap('#sp-de');
  await expect(page.locator('#sp-de')).toHaveAttribute('aria-pressed', 'true');
  return { ctx, page, gesperrt, fehler };
}

/* Ein Bildschirm, vier Bedingungen. `raum` nimmt nur .vis-hidden heraus: das sind die Dateifelder in den Kacheln „Aus einer
   CSV-Datei“ und „Entwurf fortsetzen“, deren Trefferfläche die ganze Kachel ist (ihr <label>); das prüft `versteckteDateifelder`. */
async function bildschirm(page, name, s) {
  const breite = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, fenster: window.innerWidth }));
  expect(breite.scroll, name + ': waagerechter Überlauf').toBeLessThanOrEqual(breite.fenster + 1);
  expect(s.fehler, name + ': Konsolen- oder Seitenfehler').toEqual([]);
  expect(s.gesperrt, name + ': Netzanfrage').toEqual([]);
  const e = await page.evaluate(erheben, { mindest: FINGER_PX, raum: 'body *:not(.vis-hidden)' });
  expect(e.bedienelemente, name + ': Positivkontrolle, es wurden Bedienelemente gemessen').toBeGreaterThan(0);
  expect(e.zuKlein.map((z) => z.stelle + ' «' + z.text + '» ' + z.breite + '×' + z.hoehe), name + ': Trefferflächen unter ' + FINGER_PX + ' px').toEqual([]);
}
async function versteckteDateifelder(page) {
  return page.evaluate((mindest) => [...document.querySelectorAll('input.vis-hidden')].map((i) => {
    const l = [...(i.labels || [])].map((x) => x.getBoundingClientRect()).find((b) => Math.min(b.width, b.height) >= mindest);
    return i.id + (l ? ':ok' : ':ohne-grosses-label');
  }), FINGER_PX);
}

for (const geraet of ['iPad Pro 11 landscape', 'iPad Pro 11']) {
  test.describe('Studio am iPad · ' + geraet, () => {

    test('Eingang und Anfrage an Personen bis „Anfrage erstellen“', async ({ browser }) => {
      test.setTimeout(120000);
      const s = await oeffnen(browser, geraet);
      const p = s.page;
      expect(await p.evaluate(() => window.matchMedia('(pointer: coarse)').matches), 'Positivkontrolle: grober Zeiger').toBe(true);
      await bildschirm(p, 'Eingang', s);

      await p.tap('#ein-anfrage');
      await p.locator('#aa-von').tap();
      await p.keyboard.type('Bürgerservice Beispielstadt');
      await bildschirm(p, 'Anfrage 1', s);
      await p.tap('#aa-weiter-1');
      await p.locator('#aa-beispiele button', { hasText: 'Terminanfrage' }).tap();
      await bildschirm(p, 'Anfrage 2', s);
      await p.tap('#aa-weiter-2');
      await p.locator('#aa-grundlage').tap();
      await p.keyboard.type('Ihre Einwilligung');
      await bildschirm(p, 'Anfrage 3', s);
      await p.tap('#aa-weiter-3');
      await p.locator('#aa-an').tap();
      await p.keyboard.type('termine@beispielstadt.example');
      await bildschirm(p, 'Anfrage 4', s);
      await p.tap('#aa-weiter-4');
      await expect(p.locator('#aa-pruefung')).toContainText('vollständig');
      await bildschirm(p, 'Anfrage 5', s);
      await p.tap('#aa-weiter-5');
      await p.tap('#aa-erzeugen');
      await expect(p.locator('#aa-link')).toBeVisible();
      await p.locator('#aa-link').scrollIntoViewIfNeeded();
      await bildschirm(p, 'Anfrage 6 mit Link', s);

      // Rot-Beweis (1): ohne den Umbruch wird die Seite breiter als das Fenster, und die Messung sieht es.
      await p.addStyleTag({ content: 'code.sub-id { max-width: none !important; overflow-wrap: normal !important; word-break: normal !important; }' });
      const ohne = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(ohne, 'Rot-Beweis: ohne Umbruch läuft der Link über').toBeGreaterThan(100);
      await s.ctx.close();
    });

    test('Aufnahmebogen bis „Vorab prüfen“', async ({ browser }) => {
      test.setTimeout(120000);
      const s = await oeffnen(browser, geraet);
      const p = s.page;
      await p.tap('#ein-aufnahme');
      await p.locator('#as-name').tap();
      await p.keyboard.type('Sportverein Beispielstadt');
      await p.locator('#as-art [data-art="verein"]').tap();
      await bildschirm(p, 'Bogen 1', s);
      await p.tap('#as-weiter-1');
      await expect(p.locator('#as-felder li').first()).toBeVisible();
      const vorher = await p.locator('#as-felder li').count();
      await p.locator('#as-hinzu button', { hasText: 'Geburtsdatum' }).tap();   // steht im Beispiel schon: kein Doppel
      await expect(p.locator('#as-felder li')).toHaveCount(vorher);
      await bildschirm(p, 'Bogen 2', s);
      await p.tap('#as-weiter-2');
      await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
      await p.tap('#vorab-pruefen');
      await expect(p.locator('#vorab-ergebnis')).toBeVisible();
      await bildschirm(p, 'Fertigstellen, Vorab prüfen', s);
      await s.ctx.close();
    });

    test('Fachebene: Entwurf fortsetzen, Arbeitsfläche, Vorschau, Vorab prüfen', async ({ browser }) => {
      test.setTimeout(120000);
      const s = await oeffnen(browser, geraet);
      const p = s.page;
      await p.tap('#kopf-fachebene');
      await expect(p.locator('#start-leer')).toBeVisible();
      await bildschirm(p, 'Fachebene Start', s);
      expect(await versteckteDateifelder(p)).toEqual(['tpl-csv:ok', 'ent-datei:ok']);
      await p.setInputFiles('#ent-datei', { name: 'entwurf.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(ENTWURF), 'utf8') });
      await expect(p.locator('.vk')).toHaveCount(ENTWURF.felder.length);
      await bildschirm(p, 'Arbeitsfläche', s);
      await p.tap('#ansicht-probieren');
      await expect(p.locator('#tpl-felder input[type="date"]').first()).toBeVisible();
      await bildschirm(p, 'Vorschau', s);
      await p.tap('#ansicht-bauen');
      await p.tap('#fertig-oeffnen');
      await expect(p.locator('#sd-name')).toHaveValue(ENTWURF.anbieter.anbieterName);
      await p.tap('#vorab-pruefen');
      await expect(p.locator('#vorab-ergebnis')).toBeVisible();
      await bildschirm(p, 'Fachebene, Vorab prüfen', s);

      // Rot-Beweis (4): das Paletten-„+“ in seiner früheren Größe fällt auf.
      await p.tap('#dlg-fertig .dlg-zu');
      await p.addStyleTag({ content: '.pal-eintrag .pal-plus { min-width: 0 !important; min-height: 0 !important; }' });
      const e = await p.evaluate(erheben, { mindest: FINGER_PX, raum: 'body *:not(.vis-hidden)' });
      expect(e.zuKlein.some((z) => z.stelle === 'button.pal-plus'), 'Rot-Beweis: 26 px fällt auf').toBe(true);
      await s.ctx.close();
    });
  });
}
