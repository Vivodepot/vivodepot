'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Übergang 4/6 — versiegeln → entsiegeln → erneut versiegeln, ZWEIMAL im
   selben Umschlag, über den ECHTEN „Wieder versiegeln"-Knopf („Sechs Übergangs-Proben", 09.09.2026 — testkonzept-nach-den-funden-
   2026-09-09.md #4)
   ────────────────────────────────────────────────────────────────────────
   VORAB GEMESSEN, GEGEN DIE ERSTE ANNAHME (nicht übernommen): ein erster
   Entwurf dieses Spec hielt das Verlassen des Sub-Kontexts (`#vm-zurueck`,
   Übergang 3) selbst schon für die „erneute Versiegelung". Das ist nur
   HALB richtig — `subKontextVerlassen()` ruft zwar `subDepotNeuVersiegeln`
   und verschlüsselt den Umschlag neu, aber der Eintrag in „Verwaltete
   Depots" zeigt danach weiter „Geöffnet (nur für diese Sitzung)" mit den
   Knöpfen „Dieses Depot ansehen"/„Wieder versiegeln" — der ENTSCHLÜSSELTE
   Sitzungs-Cache bleibt offen. Der ECHTE, explizite Re-Siegel-Schritt ist
   der eigene Knopf `[data-versiegeln]` → `subDepotVertrauenSchliessen`
   (vivodepot.html:51110f) — er schließt den Cache, und erst DANACH zeigt
   der Eintrag wieder `[data-entsiegeln]`. Dieser Spec fährt genau diesen
   Knopf, zweimal.

   Geprüft: nach dem ZWEITEN vollen Zyklus (versiegeln → entsiegeln →
   „Wieder versiegeln" → versiegeln → entsiegeln → „Wieder versiegeln")
   stehen BEIDE zuvor eingetragenen Werte noch da — kein Datenverlust über
   zwei Siegel-Generationen, und der Umschlag bleibt mit demselben
   Sub-Passwort entsiegelbar (kein stiller Schlüsselwechsel).

   Positivkontrolle (Beleg im Commit-Text): mit `e.umschlag = Object.assign(...)`
   in `subDepotNeuVersiegeln()` (vivodepot.html:26774) auskommentiert (das
   frisch verschlüsselte `ct`/`iv` wird nie persistiert) wird der Test rot —
   das zweite Entsiegeln liest den alten, inzwischen inkonsistenten Umschlag
   und bricht mit einem Laufzeitfehler ab. Manuell geprüft und wieder
   hergestellt, nicht dauerhaft im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');

// Bekannt-folgenloser Browser-Hinweis (wie 00-smoke.spec.js): CSP 'frame-ancestors' via <meta>
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const ANKER_PW = 'siegel-uebergang-anker-741';
const SUB_PW = 'siegel-uebergang-sub-852';
const SUB_VORNAME = 'Siegel Übergangs-Test';
const WERT_1 = 'Erster Eintrag vor der ersten Neuversiegelung';
const WERT_2 = 'Zweiter Eintrag vor der zweiten Neuversiegelung';

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

// Die Verwaltungs-Liste öffnen — nach dem Anlegen steht sie schon offen; nach einem Verlassen
// (zurück im Anker-Sektor) muss sie über die Depot-Pille neu geöffnet werden.
async function depotListeOeffnen(page) {
  const schonOffen = await page.locator('#modal-inhalt .einst-modulliste, [data-versiegeln], [data-entsiegeln]').first().isVisible().catch(() => false);
  if (schonOffen) return;
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
}

async function entsiegelnUndBetreten(page, uuid) {
  await depotListeOeffnen(page);
  await page.waitForSelector(`[data-entsiegeln="${uuid}"]`, { state: 'visible' });
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
}

// Sub-Kontext verlassen (Banner-Knopf, versiegelt die DATEI neu — s. Übergang 3), DANN den
// entschlüsselten SITZUNGS-CACHE explizit schließen ([data-versiegeln] → subDepotVertrauenSchliessen)
// — erst danach zeigt der Eintrag wieder [data-entsiegeln] für einen echten zweiten Zyklus.
async function verlassenUndWiederVersiegeln(page, uuid) {
  await page.click('#vm-zurueck');
  await page.waitForSelector('#app.modus-vollmacht', { state: 'detached', timeout: 10000 });
  await depotListeOeffnen(page);
  await page.waitForSelector(`[data-versiegeln="${uuid}"]`, { state: 'visible' });
  await page.click(`[data-versiegeln="${uuid}"]`);
  await page.waitForSelector(`[data-entsiegeln="${uuid}"]`, { state: 'visible' });
}

test('[Übergang 4] versiegeln → entsiegeln → erneut versiegeln, ZWEIMAL — beide Werte überleben zwei Siegel-Generationen', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: ANKER_PW });

  // ── Siegel-Generation 1: anlegen (versiegelt), entsiegeln, betreten, Wert 1 eintragen ──
  const uuid = await subDepotAnlegen(page);
  await entsiegelnUndBetreten(page, uuid);
  await page.evaluate((wert) => { window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', wert); }, WERT_1);

  // ── ERSTE Neuversiegelung: verlassen + „Wieder versiegeln" ──────────────
  await verlassenUndWiederVersiegeln(page, uuid);

  // ── Siegel-Generation 2: ZWEITES Entsiegeln mit DEMSELBEN Passwort ──────
  await entsiegelnUndBetreten(page, uuid);
  // Über das gerenderte Feld gelesen, nicht über internen Zustand: `ankerDaten()` liefert
  // INNERHALB des Sub-Kontexts absichtlich den ANKER (_ankerData), nicht das aktive Sub-Depot —
  // das gerenderte Feld zeigt dagegen genau das, was die Nutzerin sieht, unabhängig davon, ob
  // gerade ein Sub-Kontext aktiv ist.
  await oeffneSektor(page, 'identity');
  const nachErstemZyklus = await page.inputValue('[data-edit="givenName"]');
  expect(nachErstemZyklus, 'Wert 1 muss die erste Siegel-Generation überleben').toBe(WERT_1);

  await page.evaluate((wert) => { window.__vdOeffentlich.sektorFeldSetzen('identity', 'postcodeCity', wert); }, WERT_2);

  // ── ZWEITE Neuversiegelung: verlassen + „Wieder versiegeln" ─────────────
  await verlassenUndWiederVersiegeln(page, uuid);

  // ── Siegel-Generation 3: DRITTES Entsiegeln — beide Werte müssen noch da sein ──
  await entsiegelnUndBetreten(page, uuid);
  await oeffneSektor(page, 'identity');
  const nachZweitemZyklus = {
    vorname: await page.inputValue('[data-edit="givenName"]'),
    plz_ort: await page.inputValue('[data-edit="postcodeCity"]'),
  };
  expect(nachZweitemZyklus.vorname, 'Wert 1 muss auch die ZWEITE Siegel-Generation überleben').toBe(WERT_1);
  expect(nachZweitemZyklus.plz_ort, 'Wert 2 aus der zweiten Generation muss beim dritten Entsiegeln stehen').toBe(WERT_2);

  expect(fehler, 'kein Absturz über zwei Siegel-Generationen').toEqual([]);
});
