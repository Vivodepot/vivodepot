'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fehlerpfad 2/5 — Wizard abbrechen MIT sichtbarer Fehlermeldung + Abbrechen
   vom LETZTEN Schritt aus („Fehlerpfade und Einlass-Register",
   10.09.2026, Teil 1 — Bericht sechs-uebergangsproben-bericht-2026-09-09.md,
   „Übergang 6 … NICHT gefahren: Abbrechen mit sichtbarer Validierungs-
   Fehlermeldung (wizardFehlerGrund gesetzt) im Moment des Abbruchs,
   Abbrechen von der Abschluss-Sicht aus").
   ────────────────────────────────────────────────────────────────────────
   „Abschluss-Sicht" ist KEIN eigener Bildschirm (nachgesehen, nicht
   angenommen: `wizardAbschluss()`, vivodepot.html:40048, schließt den
   Wizard sofort — es gibt keine Zwischen-/Review-Ansicht). Es ist der
   LETZTE sichtbare Schritt, an dem `renderWizardSchritt` (vivodepot.html
   ~42194) den „Weiter"-Knopf durch „Fertig" ersetzt (`istLetzter`) — `#wiz-
   abbr` bleibt an dieser Stelle UNVERÄNDERT gerendert. Die Probe fährt genau
   diesen: den letzten Schritt erreichen, dann ABBRECHEN statt „Fertig".

   Fall A prüft `wizardWeiter()`s Block-Zweig (vivodepot.html:39617,
   `wizardFehlerGrund = r.grund`) gefolgt von `wizardAbbrechen()` — eine
   Kombination, die keine bestehende Probe fuhr (weder 03-wizard-pvwiz noch
   11-wizard-fremder-ausstieg verlassen den Wizard über den ECHTEN Abbrechen-
   Knopf, während ein `.feld-fehler[role=alert]` sichtbar ist).

   Vehikel Fall A: `gebwiz`, Schritt `gebwiz_kind_geburtsdatum` (`typ:'datum'`,
   vivodepot.html — Schritt-Liste per `WIZARD_BY_ID.gebwiz.schritte`
   gemessen, nicht geraten). Klickweg bis dorthin wörtlich aus
   `ereignis-achse-geburt-browser-beweis.spec.js` (`gebwizStarten`+sechs
   `#wiz-weiter`-Klicks bis `gebwiz_kind_name`, ein siebter bis zum
   Datums-Schritt).

   Vehikel Fall B: `pvwiz` (kürzester bekannter, bereits belegter Wizard),
   letzter SICHTBARER Schritt über `wizardSichtbareIndizes` direkt ermittelt
   (kein geratener Index) — derselbe Direkt-Sprung-Kniff wie
   `uebergang-wizard-betreten-abbrechen-wieder.spec.js`.

   Positivkontrolle Fall A (Beleg im Commit-Text): mit
   `wizardFehlerGrund = null;` — dem ERSTEN der drei Reset-Aufrufe in
   `wizardAbbrechen()` (vivodepot.html:39652) — auskommentiert überlebt der
   Fehler-Banner den Abbruch und erscheint beim NÄCHSTEN Wizard-Einstieg
   sofort wieder (Assert unten auf `null` nach Wiedereinstieg wird rot).
   Manuell geprüft und wieder hergestellt, nicht dauerhaft im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');

const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, oeffneSektor, wizardStarten } = require('./helpers');

test('[Fehlerpfad 2/5·A] Wizard abbrechen WÄHREND eine Validierungs-Fehlermeldung sichtbar ist — kein überlebender Banner', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);

  // ── bis zum Datums-Schritt (Klickweg wörtlich übernommen, s. Kopf) ──────
  await page.click('[data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
  await page.click('[data-anlass="geburt"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();
  for (let i = 0; i < 6; i++) await page.click('#wiz-weiter');
  await expect(page.locator('#content [data-edit="guidedBirthEntryChildsNameNot"]')).toBeVisible();
  await page.fill('#content [data-edit="guidedBirthEntryChildsNameNot"]', 'E2E Fehlerpfad Kind');
  await page.click('#wiz-weiter');
  await expect(page.locator('#content [data-edit="guidedBirthEntryDateOfBirthNot"]')).toBeVisible();

  // ── DER FEHLERPFAD: ein Datum, das das Format erfüllt, aber unplausibel ist
  // (Jahr weit vor DATUM_JAHR_MIN_WEIT) — feldValidieren liefert grund:'datum'. ──
  await page.fill('#content [data-edit="guidedBirthEntryDateOfBirthNot"]', '0100-01-01');
  await page.click('#wiz-weiter');
  await expect(page.locator('.feld-fehler[role="alert"]'), 'Fehler-Banner muss erscheinen (grund:"datum")').toBeVisible();
  const grundVorAbbruch = await page.evaluate(() => window.__vdOeffentlich.wizardFehlerGrund);
  expect(grundVorAbbruch, 'wizardWeiter muss am Schritt blockieren').toBe('datum');
  // Der Schritt-Index darf sich NICHT bewegt haben — geblockt heißt geblockt.
  const indexVorAbbruch = await page.evaluate(() => window.__vdOeffentlich.wizardSchrittIndex);
  expect(indexVorAbbruch).toBe(7);

  // ── DER ÜBERGANG: abbrechen, WÄHREND der Banner steht ───────────────────
  await page.click('#wiz-abbr');
  await expect(page.locator('.wizard-frage')).toHaveCount(0);
  const nachAbbruch = await page.evaluate(() => ({
    aktiverWizardId: typeof window.__vdOeffentlich.aktiverWizardId !== 'undefined' ? window.__vdOeffentlich.aktiverWizardId : 'undefined-var',
    wizardFehlerGrund: typeof window.__vdOeffentlich.wizardFehlerGrund !== 'undefined' ? window.__vdOeffentlich.wizardFehlerGrund : 'undefined-var',
  }));
  expect(nachAbbruch.aktiverWizardId, 'Wizard muss nach Abbruch geschlossen sein').toBeNull();
  expect(nachAbbruch.wizardFehlerGrund, 'wizardAbbrechen muss den Banner-Zustand zurücksetzen').toBeNull();

  // ── Wiedereinstieg: KEIN Fehler-Banner aus dem abgebrochenen Versuch überlebt ──
  await page.click('[data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
  await page.click('[data-anlass="geburt"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();
  await expect(page.locator('.feld-fehler[role="alert"]'), 'kein Banner beim Wiedereinstieg').toHaveCount(0);

  expect(fehler, 'kein Absturz im Fehlerpfad Wizard-Abbruch mit sichtbarer Fehlermeldung').toEqual([]);
});

test('[Fehlerpfad 2/5·B] Wizard abbrechen VOM LETZTEN Schritt aus („Abschluss-Sicht") — kein Abschluss läuft an', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
  await wizardStarten(page, 'pvwiz');
  await expect(page.locator('.wizard-frage')).toBeVisible();

  // Letzten SICHTBAREN Schritt direkt ermitteln (kein geratener Index).
  const letzterIndex = await page.evaluate(() => {
    const def = window.__vdOeffentlich.WIZARD_BY_ID.pvwiz;
    const sichtbar = window.__vdOeffentlich.wizardSichtbareIndizes(def);
    return sichtbar[sichtbar.length - 1];
  });
  await page.evaluate((i) => { window.__vdOeffentlich.wizardSchrittIndex = i; window.__vdOeffentlich.renderContent(); }, letzterIndex);
  await expect(page.locator('#content'), 'letzter Schritt zeigt "Fertig" statt "Weiter" (Abschluss-Sicht)').toContainText('Fertig');
  await expect(page.locator('#wiz-abbr'), 'Abbrechen bleibt auch im letzten Schritt verfügbar').toBeVisible();

  const vorAbbruch = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().dokumente.length);

  // ── DER ÜBERGANG: abbrechen statt „Fertig" ──────────────────────────────
  await page.click('#wiz-abbr');
  await expect(page.locator('.wizard-frage')).toHaveCount(0);

  const nachAbbruch = await page.evaluate(() => ({
    aktiverWizardId: typeof window.__vdOeffentlich.aktiverWizardId !== 'undefined' ? window.__vdOeffentlich.aktiverWizardId : 'undefined-var',
    dokumente: window.__vdOeffentlich.ankerDaten().dokumente.length,
  }));
  expect(nachAbbruch.aktiverWizardId, 'Wizard muss geschlossen sein').toBeNull();
  // KEIN Abschluss-Seiteneffekt (Dokument-Registrierung/Ereignis-Achse) — Abbrechen ist Abbrechen,
  // auch vom letzten Schritt aus, nicht ein zweiter Weg zu wizardAbschluss().
  expect(nachAbbruch.dokumente, 'wizardAbbrechen darf wizardAbschluss()s Seiteneffekt (Dokument-Registrierung) nicht auslösen').toBe(vorAbbruch);

  // Zurück im Ausgangs-Bereich, kein Abschluss-Toast ist aufgeploppt.
  await expect(page.locator('[data-sektor="advanceCare"]')).toBeVisible();

  expect(fehler, 'kein Absturz im Fehlerpfad Abbruch vom letzten Wizard-Schritt aus').toEqual([]);
});
