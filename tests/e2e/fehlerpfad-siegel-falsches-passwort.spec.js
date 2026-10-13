'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fehlerpfad 1/5 — Entsiegeln mit FALSCHEM Passwort („Fehlerpfade und Einlass-Register", 10.09.2026, Teil 1 — Bericht
   sechs-uebergangsproben-bericht-2026-09-09.md, „Übergang 4 … NICHT
   gefahren: Entsiegeln mit FALSCHEM Passwort (Fehlerpfad)").
   ────────────────────────────────────────────────────────────────────────
   `flowSubDepotEntsiegeln` (vivodepot.html:51247) ruft `subDepotVertrauen-
   Oeffnen`, die bei Falschpasswort wirft (GCM/AAD) — der `catch`-Zweig zeigt
   NUR einen Toast (`STRINGS.subFalsch`) und ruft `schliessen()` NICHT: das
   Modal (`#sub-auf`) muss offen bleiben, der Eintrag darf NICHT als betreten
   gelten. Das ist genau der „zur Hälfte durchläuft"-Schaden, für den dieser
   Auftrag steht — bislang fuhr keine e2e-Probe den falschen Zweig.

   Zusätzlich geprüft: der Umschlag bleibt NACH dem Fehlversuch unversehrt —
   das RICHTIGE Passwort öffnet ihn im selben Anlauf, kein Seiteneffekt aus
   dem gescheiterten `subDepotVertrauenOeffnen`-Aufruf (kein halb
   aufgebauter Sitzungsschlüssel, keine Sperre).

   Positivkontrolle (Beleg im Commit-Text): mit einem zusätzlichen
   `schliessen();`-Aufruf im `catch`-Zweig von `flowSubDepotEntsiegeln`
   (vivodepot.html:51260ff, direkt vor `ui.toast(STRINGS.subFalsch, 'fehler')`)
   schließt sich das Modal auch bei falschem Passwort — der Assert auf
   `#sub-auf` bleibt-sichtbar wird dann rot. Manuell geprüft und wieder
   hergestellt, nicht dauerhaft im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');

const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen } = require('./helpers');

const ANKER_PW = 'fehlerpfad-siegel-anker-193';
const SUB_PW = 'fehlerpfad-siegel-sub-284';
const SUB_VORNAME = 'Fehlerpfad Siegel-Test';

async function subDepotAnlegen(page) {
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
  return page.evaluate(() => (window.getData ? window.getData() : window.__vdOeffentlich.ankerDaten()).verwalteteDepots.slice(-1)[0].depotUUID);
}

test('[Fehlerpfad 1/5] Entsiegeln mit falschem Passwort — Modal bleibt offen, Depot bleibt versiegelt, richtiges Passwort öffnet danach trotzdem', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: ANKER_PW });
  const uuid = await subDepotAnlegen(page);

  // ── DER FEHLERPFAD: falsches Passwort ───────────────────────────────────
  await page.waitForSelector(`[data-entsiegeln="${uuid}"]`, { state: 'visible' });
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', SUB_PW + '-FALSCH');
  await page.click('#m-ok');

  // Der Toast mit dem echten Fehlertext (STRINGS.subFalsch) — gesucht an seinem TEXT, nicht an einer Zählung.
  // Befund E2E-TOAST-RELATIV-GEZAEHLT (08.10.2026): hier stand toHaveCount(vorher + 1). Das falsche Passwort wird
  // per PBKDF2 langsam abgeleitet; währenddessen laufen die älteren Toasts ab (3200 ms), und „vorher + 1“ wird nie
  // erreicht. Wächter: tests/e2e-relative-zaehlung-verboten.test.js.
  await expect(page.locator('#toast-host .toast', { hasText: 'Passwort stimmt nicht' })).toHaveCount(1, { timeout: 15000 });
  // … das Modal bleibt offen — KEIN halb durchgelaufener Übergang.
  await expect(page.locator('#sub-auf'), 'Modal darf bei falschem Passwort NICHT schließen').toBeVisible();
  // Der Eintrag gilt weiterhin als versiegelt, nicht als betreten.
  await expect(page.locator(`[data-entsiegeln="${uuid}"]`), 'Eintrag bleibt im entsiegelbaren Zustand').toBeVisible();
  // Oberflächen-Prüfung statt internem Zustand: `sessionSubKeys` ist bewusst nicht auf
  // window.__vdOeffentlich exportiert (Entscheidung 18.09.2026, Kopf-Kommentar an dessen
  // Definition) — dieselbe Zeile, die dort istEntsiegelt()/sessionSubKeys.has() rendert
  // (`data-betreten`, sonst `data-entsiegeln`), zeigt denselben Zustand am DOM: kein
  // Sitzungsschlüssel heißt, der Eintrag gilt nicht als betreten.
  await expect(page.locator(`[data-betreten="${uuid}"]`), 'kein Sitzungsschlüssel nach einem Fehlversuch — der Eintrag gilt nicht als betreten')
    .toHaveCount(0);

  // ── Umschlag bleibt unversehrt: das RICHTIGE Passwort öffnet danach trotzdem ─
  await page.fill('#sub-auf', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await expect(page.locator(`[data-betreten="${uuid}"]`), 'nach dem Fehlversuch öffnet das richtige Passwort trotzdem').toBeVisible();

  expect(fehler, 'kein Absturz im Fehlerpfad Entsiegeln mit falschem Passwort').toEqual([]);
});
