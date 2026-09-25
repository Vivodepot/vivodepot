'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Übergang 3/6 — Sub-Kontext betreten → verlassen, über den ECHTEN
   Banner-Knopf („Sechs Übergangs-Proben", 09.09.2026 —
   testkonzept-nach-den-funden-2026-09-09.md #3)
   ────────────────────────────────────────────────────────────────────────
   `flowSubKontextVerlassen` (vivodepot.html:27105) ruft `subKontextVerlassen()`
   — die re-versiegelt den Sub in den Anker-Umschlag UND registriert alle vier
   Modul-Register neu gegen `data` (den Anker) — U2-ADR-188: „die Hälfte, die
   man beim Bauen vergisst". `renderContent()` verdrahtet den Rückweg über
   den Banner-Knopf `#vm-zurueck` (:42922), NICHT über einen Test-Helper —
   bisherige Sub-Specs (startseite-zwei-tueren-subdepot-messung.spec.js)
   verlassen den Sub-Kontext ausschließlich programmatisch über
   `window.subKontextVerlassen()`. Dieser Spec fährt den ECHTEN Klickweg.

   Geprüft: nach dem Verlassen zeigt die Sidebar wieder die ANKER-Bereiche
   (nicht die des Sub-Depots — U2-ADR-188 wäre sonst regressiert), der
   Vollmacht-Banner ist weg, und ein erneutes Betreten funktioniert wieder
   (kein Rest-Zustand blockiert den zweiten Einstieg).

   VORAB GEMESSEN, GEGEN DIE ERSTE FASSUNG (nicht übernommen): ein erster Assert prüfte nur
   „mindestens ein [data-sektor] steht in der Anker-Sidebar" — das ist SCHWACH, weil die
   eingebauten Sektoren in Anker UND Sub gleich heißen und der Assert darum grün geblieben
   wäre, selbst wenn die Registry auf dem Sub-Stand hängen geblieben wäre. Diese Fassung
   dockt darum einen SUB-EXKLUSIVEN Bereich an (`_moduleEinlassWirken`, derselbe „wirken"-
   Schritt wie in uebergang-sprache-bei-offenem-depot.spec.js) und prüft seine AN- bzw.
   ABWESENHEIT — ein Merkmal, das Anker und Sub wirklich unterscheidet.

   Positivkontrolle (Beleg im Commit-Text): mit `_alleModulRegisterAusDepotAnmelden(data)`
   in `subKontextVerlassen()` (vivodepot.html:26901) auskommentiert bleibt der Sub-exklusive
   Bereich auch im Anker-Kontext sichtbar — der Assert unten wird rot. Manuell geprüft (siehe
   Commit-Text), nicht dauerhaft im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');

// Bekannt-folgenloser Browser-Hinweis (wie 00-smoke.spec.js): CSP 'frame-ancestors' via <meta>
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ANKER_PW = 'sub-uebergang-anker-741';
const SUB_PW = 'sub-uebergang-sub-852';
const SUB_VORNAME = 'Sub Übergangs-Test';
const SUB_BEREICH_ID = 'nur-im-sub';

// Ein unsigniertes Bereichs-Modul NUR im Sub-Depot andocken — über den ECHTEN Datei-Einlassweg
// (derselbe wie pro-modul-einlass-durchgang.spec.js), NICHT über `_moduleEinlassWirken` direkt:
// GEMESSEN (nicht übernommen), dass ein Direktaufruf `flowEinstellungen()` unbedingt am Ende
// aufruft (vivodepot.html:38570, „ZWEITER FUND" — normalerweise ein Refresh des BEREITS offenen
// Modals) und darum ein NEUES Einstellungen-Modal öffnet, das den folgenden #vm-zurueck-Klick
// blockiert. Der echte UI-Weg hat das Modal ohnehin schon offen (der Datei-Input sitzt DARIN) —
// derselbe Aufruf ist dort korrekt und harmlos.
async function subExklusivenBereichAndocken(page) {
  const modulDatei = path.join(os.tmpdir(), 'sub-exklusiv-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(modulDatei, JSON.stringify({
    modulTyp: 'bereich', sprache: 'de', moduleVersion: 1,
    herkunft: 'uebergang3-sub-exklusiv',
    bereiche: { [SUB_BEREICH_ID]: { label: 'Nur im Sub-Depot (Übergang 3)', icon: 'folder' } },
  }), 'utf8');
  try {
    await page.locator('#tb-einstellungen').click();
    await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
    await page.locator('#einst-modul-datei').setInputFiles(modulDatei);
    await expect(page.locator('#toast-host .toast').last()).toBeVisible({ timeout: 5000 });
    // #m-ok schließt hier das Einstellungen-Modal (primaerLabel/onPrimaer, s. helpers.js-Kopf).
    await page.click('#m-ok');
    await page.waitForSelector('#modal-rueck.an', { state: 'detached' }).catch(() => {});
  } finally {
    fs.rmSync(modulDatei, { force: true });
  }
}

// Sub-Depot über die echte UI anlegen, entsiegeln, betreten — derselbe Weg wie
// startseite-zwei-tueren-subdepot-messung.spec.js (`subDepotAnlegenUndBetreten`).
async function subDepotAnlegenUndBetreten(page) {
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
  await page.waitForSelector('#sub-neu', { state: 'visible' });
  await page.click('#sub-neu');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', SUB_VORNAME);
  await page.fill('#id-pw', SUB_PW);
  await page.fill('#id-pw2', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#id-vorname', { state: 'detached' });
  await page.waitForSelector('[data-sub]');

  const uuid = await page.evaluate(() => (window.getData ? window.getData() : window.__vdOeffentlich.ankerDaten()).verwalteteDepots.slice(-1)[0].depotUUID);
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
  return uuid;
}

test('[Übergang 3] Sub-Kontext betreten → über #vm-zurueck verlassen — Anker-Sidebar kehrt zurück, erneutes Betreten geht wieder', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: ANKER_PW });

  // Anker-Bezeichnung VOR dem Sub-Betreten (Vergleichswert für nachher).
  const ankerAnzeige = await page.evaluate(() => (typeof window.__vdOeffentlich.ankerDaten === 'function' ? window.__vdOeffentlich.ankerDaten() : null) && true);
  expect(ankerAnzeige).toBe(true);

  const uuid = await subDepotAnlegenUndBetreten(page);

  // Im Sub-Kontext: Banner sichtbar, Modus 'vollmacht'.
  await expect(page.locator('#vm-zurueck'), 'Vollmacht-Banner mit Rückweg-Knopf muss im Sub-Kontext stehen').toBeVisible();
  const imSubVorVerlassen = await page.evaluate(() => (typeof window.__vdOeffentlich.imSubKontext === 'function' ? window.__vdOeffentlich.imSubKontext() : null));
  expect(imSubVorVerlassen).toBe(true);

  await subExklusivenBereichAndocken(page);
  await page.evaluate(() => { window.__vdOeffentlich.renderSidebar(); });
  await expect(page.locator(`[data-sektor="${SUB_BEREICH_ID}"]`), 'der Sub-exklusive Bereich muss IM Sub-Kontext sichtbar sein').toHaveCount(1);

  // ── DER ÜBERGANG: über den ECHTEN Banner-Knopf verlassen ────────────────
  await page.click('#vm-zurueck');
  await page.waitForSelector('#app.modus-vollmacht', { state: 'detached', timeout: 10000 });

  // Zurück im Anker-Kontext: Banner weg, imSubKontext() falsch, Sidebar zeigt Anker-Bereiche.
  await expect(page.locator('#vm-zurueck')).toHaveCount(0);
  const kontextNachVerlassen = await page.evaluate(() => ({
    imSubKontext: typeof window.__vdOeffentlich.imSubKontext === 'function' ? window.__vdOeffentlich.imSubKontext() : null,
    depotUUID: typeof window.__vdOeffentlich.aktiverSubKontext !== 'undefined' ? window.__vdOeffentlich.aktiverSubKontext : 'undefined-var',
  }));
  expect(kontextNachVerlassen.imSubKontext, 'nach #vm-zurueck ist kein Sub-Kontext mehr aktiv').toBe(false);
  expect(kontextNachVerlassen.depotUUID, 'aktiverSubKontext muss zurückgesetzt sein').toBeNull();

  // U2-ADR-188 (Regressions-Wächter für den ECHTEN Klickweg): die Modul-Registry muss auf den
  // ANKER zeigen, nicht auf dem Stand des verlassenen Sub stehen bleiben.
  const sidebarZeigtAnker = await page.evaluate(() => {
    window.__vdOeffentlich.renderSidebar();
    return document.querySelectorAll('[data-sektor]').length > 0;
  });
  expect(sidebarZeigtAnker, 'Anker-Sidebar muss nach dem Verlassen wieder rendern').toBe(true);
  // Der eigentliche Regressions-Beleg: der SUB-EXKLUSIVE Bereich darf im Anker-Kontext NIE
  // erscheinen — der Anker hat ihn nie angedockt. Bliebe die Registry auf dem Sub-Stand stehen
  // (U2-ADR-188), stünde er hier trotzdem.
  await expect(page.locator(`[data-sektor="${SUB_BEREICH_ID}"]`), 'der Sub-exklusive Bereich darf im Anker-Kontext nicht erscheinen (U2-ADR-188)').toHaveCount(0);

  // ── Erneutes Betreten muss wieder gehen (kein Rest-Zustand blockiert) ───
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
  await page.waitForSelector('[data-betreten]', { state: 'visible' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached', timeout: 10000 });
  await expect(page.locator('#vm-zurueck'), 'zweites Betreten desselben Sub-Depots muss wieder den Banner zeigen').toBeVisible();

  expect(fehler, 'kein Absturz im Übergang Sub-Kontext betreten→verlassen→erneut betreten').toEqual([]);
});
