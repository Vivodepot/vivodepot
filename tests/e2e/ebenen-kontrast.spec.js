'use strict';
/* Kontrast in Hell, Nacht und Hochkontrast, in Ruhe und in jedem Zustand — der Finder (Befund 04.10.2026)
   ─────────────────────────────────────────────────────────────────
   Der Fund: Schrift unter 4,5:1 außerhalb der Hell-Ebene und in Zuständen — Notfall in der Nacht (1,08:1), Fehlermeldung nachts,
   Knopf-Hover (3,15:1 schon in Hell), Kopfzeile in Hover und Nacht, Verweise ohne eigene Regel (Nacht 1,65:1), „Einrichten →".
   Der Wächter misst im Browser, in jeder Ansicht, in allen drei Ebenen, in Ruhe und in :hover, :focus-visible, :active, [aria-invalid]
   (Einzelheiten und Regel: tests/e2e/lib/ebenen-kontrast.js). Eine neue Ansicht oder ein neuer Zustand ist ein weiterer Test in der Reihe unten.
   Rot-Beweise unten: ein Textpaar unter 4,5:1 macht ihn rot (Fläche UND Zustand), ein Element ohne Text wird nicht geprüft, ein
   Element mit Text fällt nie heraus. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers.js');
const { ansichtPruefen, messenImBrowser } = require('./lib/ebenen-kontrast.js');

const klick = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const mitDepot = async (page) => { await oeffneApp(page); await depotAnlegen(page, { name: 'Maria Mustermann' }); };

// Eine Ansicht je Test (kein Schleifenbau: die Zählung der E2E-Proben liest die test(-Aufrufe).
// Eine neue Ansicht oder ein neuer Zustand ist ein weiterer Test in dieser Reihe.
test('[Ebenen-Kontrast] Willkommen: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await oeffneApp(page); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Vorschau (Kopfzeile mit „Einrichten →"): Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await oeffneApp(page); await page.click('#w-anfangen'); await page.waitForSelector('#tb-pw-hinweis'); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Depot anlegen, Fehlermeldung am Feld: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => {
    await oeffneApp(page); await page.click('#w-anfangen'); await page.waitForSelector('#tb-pw-hinweis'); await page.click('#tb-pw-hinweis');
    await page.waitForSelector('#id-pw'); await page.fill('#id-vorname', 'A'); await page.fill('#id-nachname', 'B');
    await page.fill('#id-pw', 'x'); await page.fill('#id-pw2', 'y'); await page.click('#m-ok'); await page.waitForTimeout(300);
  })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Übersicht: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Bereich Finanzen: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await oeffneSektor(page, 'finance'); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Notfall: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-notfall]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Hilfe: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-hilfe]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Einstellungen: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '#tb-einstellungen'); await page.waitForSelector('#modal-inhalt', { state: 'visible' }); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Depot-Menü der Kopfzeile: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '#tb-depot-pille'); await page.waitForTimeout(200); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Sub-Depot, Bereich Finanzen: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => {
    await mitDepot(page);
    await page.evaluate(async (pw) => {
      const e = await window.__vdOeffentlich.subDepotAnlegen({ bezeichnung: 'Mama', inhaberin: 'Mama Muster', verwaltungsTyp: 'verwaltet', akzent: 'flieder' }, pw);
      await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
      window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
    }, 'e2e-passwort-123');
    await oeffneSektor(page, 'finance');
  })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Anlass-Auswahl: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-anlass-auswahl]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Meine Dokumente: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-mappe]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Prüftermine: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-prueftermine]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Herausgegeben: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-uebergabe-protokoll]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Daten einlesen: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-einlesen-zentral]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Daten herausgeben: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-weitergeben-zentral]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

test('[Ebenen-Kontrast] Verwaltete Depots: Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => { await mitDepot(page); await klick(page, '[data-verwaltete-depots]'); await page.waitForTimeout(300); })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

  /* Zustände, die nur ein Ablauf zeigt: die echten Elemente, wo das Dokument sie trägt, sonst der Aufbau aus der Regel selbst. */
test('[Ebenen-Kontrast] Zustandsflächen (Fehler, Hinweis, Warnung, Sicherung fehlgeschlagen): Schrift ≥ 4,5:1 und Feldrand ≥ 3:1 in Hell, Nacht, Hochkontrast, in Ruhe und allen Zuständen', async ({ page }) => {
  test.setTimeout(240000);
  await (async (page) => {
    await mitDepot(page);
    await page.evaluate(() => {
      const stelle = document.querySelector('#content') || document.body;
      const h = document.createElement('div');
      h.id = 'ebenen-kontrast-zustaende';
      h.innerHTML = '<div class="modal-fehler">Das ist eine Fehlermeldung mit Text.</div>'
        + '<div class="vorschau-banner"><span class="vorschau-banner-text">Hinweis in der Vorschau</span><button class="btn" type="button">Sichern</button></div>'
        + '<span class="chip-uebernehmen">Übernehmen</span>'
        + '<button class="btn btn-sek" type="button" disabled>Deaktiviert sekundär</button> <button class="btn" type="button" disabled>Deaktiviert</button>'
        + '<input class="feld-fehler" value="Text im Feld" aria-label="Feld mit Fehler"><div class="feld-fehler">Meldung zum Feld</div>';
      stelle.prepend(h);
      const w = document.querySelector('.wiedereinstieg-banner'); if (w) w.hidden = false;
      const s = document.querySelector('#tb-save-status'); if (s) { s.hidden = false; s.classList.add('ist-fehlgeschlagen'); }
    });
    await page.waitForTimeout(200);
  })(page);
  expect(await ansichtPruefen(page)).toEqual([]);
});

/* ── Rot-Beweise des Finders selbst ─────────────────────────────────────────────────────────────────────────────── */
const mitStil = async (page, css) => { await mitDepot(page); await page.addStyleTag({ content: css }); await page.waitForTimeout(150); };

test('[Ebenen-Kontrast·Rot-Beweis·Fläche] ein zu heller Nacht-Wert macht den Finder rot', async ({ page }) => {
  // Kein geschütztes Element: bei diesen fällt der Kern von selbst zurück (erscheinungsbild-schutz.spec.js), der Finder sieht dann nur den Rückfall.
  await mitStil(page, 'html.dark-mode .sektion-titel { color: #1b221b !important; }');
  await oeffneSektor(page, 'finance'); await klick(page, '#tb-nacht'); await page.waitForTimeout(300);
  const f = await page.evaluate(messenImBrowser, null);
  expect(f.some((x) => x.art === 'schrift' && /sektion-titel/.test(x.sel))).toBe(true);
});

test('[Ebenen-Kontrast·Rot-Beweis·Zustand] ein Hover unter 4,5:1 macht den Finder rot', async ({ page }) => {
  await mitStil(page, '.btn:hover { background: #7b9a6a !important; }');
  const f = await (async () => { const r = require('./lib/ebenen-kontrast.js'); return r.zustaende(page); })();
  expect(f.some((x) => x.z === 'hover' && x.art === 'schrift' && /\.btn/.test(x.sel))).toBe(true);
});

test('[Ebenen-Kontrast·Regel] ein Element ohne Text wird nicht geprüft, ein Element mit Text fällt nicht heraus', async ({ page }) => {
  await mitDepot(page);
  await page.evaluate(() => {
    const h = document.createElement('div'); h.id = 'regel-probe';
    h.innerHTML = '<div id="ohne" style="width:12px;height:12px;background:#cccccc;color:#cccccc"></div>'
      + '<div id="mit" style="background:#cccccc;color:#cccccc">Text auf gleichem Grund</div>';
    document.body.prepend(h);
  });
  const f = await page.evaluate(messenImBrowser, null);
  expect(f.some((x) => /#ohne/.test(x.sel))).toBe(false);
  expect(f.some((x) => /#mit/.test(x.sel))).toBe(true);
});
