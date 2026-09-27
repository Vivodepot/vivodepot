'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fehlerpfad 3/5 — Sub-Kontext verlassen: ANDERER Weg als #vm-zurueck, und
   Verlassen WÄHREND ein Wizard mit offener Validierungs-Fehlermeldung läuft
   („Fehlerpfade und Einlass-Register", 10.09.2026, Teil 1 —
   Bericht sechs-uebergangsproben-bericht-2026-09-09.md, „Übergang 3 …
   NICHT gefahren: Verlassen über einen ANDEREN Weg als #vm-zurueck …,
   Verlassen mit einer offenen Validierungs-Fehlermeldung").
   ────────────────────────────────────────────────────────────────────────
   Fall A — der andere Weg: `flowSubKontextVerlassen()` hat ZWEI Aufrufer
   (vivodepot.html, nachgesehen): der Banner-Knopf `#vm-zurueck`
   (renderContent, ~42979) UND eine zweite Aktion „Zurück zu meinem Depot"
   im Depot-Pillen-Dialog (~32474, Screenshot-Befund 
   26.08.2026 — derselbe Dialog zeigte vorher fälschlich „Mein Depot —
   aktiv"). Übergang 3 fuhr bisher AUSSCHLIESSLICH den Banner-Knopf. Fall A
   prüft den zweiten, strukturell selben Aufrufer.

   Fall B — der zusammengesetzte Übergang, den der Bericht selbst schon
   benennt („ein zusammengesetzter Übergang aus 3+5"): ein Wizard läuft
   INNERHALB des Sub-Kontexts mit sichtbarer Fehlermeldung
   (`wizardFehlerGrund` gesetzt, wie in Fehlerpfad 2/5·A) — GEMESSEN
   (nicht angenommen, s. `renderContent()`, vivodepot.html:42968ff): der
   Vollmacht-Banner wird IMMER eingefügt, sobald `imSubKontext()` wahr ist,
   UNABHÄNGIG von `aktiveAnsicht` — `#vm-zurueck` liegt also während eines
   laufenden Wizards direkt NEBEN `#wiz-abbr` auf demselben Bildschirm.

   `subKontextVerlassen()` (vivodepot.html:26923) versiegelt den Sub neu,
   tauscht `data` zurück auf den Anker und meldet die Modul-Register neu an
   — es rührt aber `aktiverWizardId`/`wizardSchrittIndex`/`wizardFehlerGrund`
   NICHT an, anders als `wizardAbbrechen()`. Diese Probe prüft, ob der
   Wizard nach `#vm-zurueck` wirklich geschlossen ist — geschieht das NICHT,
   bleibt der Wizard-Bildschirm stehen, während `data` bereits auf dem
   ANKER steht: ein „Weiter" im nächsten Schritt schriebe die Antwort in den
   FALSCHEN Umschlag (Anker statt Sub) — genau der „beiläufig ausgelöste
   Übergang, der etwas Schwerwiegendes tut", vor dem der Bericht warnt.

   Das ist ein BEFUND, kein Fehlschlag dieser Probe (Auflage des Auftrags):
   wird dieser Test rot, zeigt er die Lücke, die er finden soll — nicht,
   dass er falsch geschrieben ist. Nicht am Produkt reparieren.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');

const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, oeffneSektor, wizardStarten } = require('./helpers');

const ANKER_PW = 'fehlerpfad-sub-anker-536';
const SUB_PW = 'fehlerpfad-sub-sub-647';
const SUB_VORNAME = 'Fehlerpfad Sub-Test';

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
  const uuid = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().verwalteteDepots.slice(-1)[0].depotUUID);
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
  return uuid;
}

test('[Fehlerpfad 3/5·A] Sub-Kontext verlassen über die Depot-Pille ("Zurück zu meinem Depot"), NICHT über #vm-zurueck', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: ANKER_PW });
  await subDepotAnlegenUndBetreten(page);
  await expect(page.locator('#vm-zurueck')).toBeVisible();

  // ── DER ANDERE WEG: Depot-Pille → "Depot"-Liste (#tb-depot-menue-liste, flowDepotListe) →
  // zweite Aktion "Zurück zu meinem Depot" ────────────────────────────────
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-liste', { state: 'visible' });
  await page.click('#tb-depot-menue-liste');
  await page.waitForSelector('.depot-liste-eintrag.aktiv', { state: 'visible' });
  // zweitAktion rendert als #m-zweit (ui.modal-Konvention, wie das Notfallblatt-Angebot in
  // helpers.js) — NICHT der Banner-Knopf #vm-zurueck, der denselben Text trägt.
  await page.click('#m-zweit');
  await page.waitForSelector('#app.modus-vollmacht', { state: 'detached', timeout: 10000 });

  const nach = await page.evaluate(() => ({
    imSubKontext: window.__vdOeffentlich.imSubKontext(),
    depotUUID: typeof window.__vdOeffentlich.aktiverSubKontext !== 'undefined' ? window.__vdOeffentlich.aktiverSubKontext : 'undefined-var',
  }));
  expect(nach.imSubKontext, 'der zweite Aufrufer muss denselben Übergang wie #vm-zurueck vollständig durchführen').toBe(false);
  expect(nach.depotUUID, 'aktiverSubKontext muss zurückgesetzt sein').toBeNull();
  await expect(page.locator('#vm-zurueck')).toHaveCount(0);

  expect(fehler, 'kein Absturz beim Verlassen über den anderen Weg').toEqual([]);
});

// Fall B war ein ECHTER BEFUND (subKontextVerlassen() liess Wizard-Zustand stehen) und ist behoben:
// subKontextVerlassen() räumt aktiverWizardId/wizardSchrittIndex/wizardFehlerGrund und die Wizard-Ansicht.
test('[Fehlerpfad 3/5·B] Sub-Kontext über #vm-zurueck verlassen, WÄHREND ein Wizard mit sichtbarer Fehlermeldung läuft', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: ANKER_PW });
  await subDepotAnlegenUndBetreten(page);

  // ── Im Sub-Kontext einen Wizard starten und in den Fehler-Zustand bringen ──
  await oeffneSektor(page, 'advanceCare');
  await wizardStarten(page, 'pvwiz');
  await expect(page.locator('.wizard-frage')).toBeVisible();
  // Banner UND Wizard gleichzeitig sichtbar — der Ausgangszustand für den zusammengesetzten Übergang.
  await expect(page.locator('#vm-zurueck'), 'Banner liegt neben dem Wizard, nicht dahinter').toBeVisible();

  await page.evaluate(() => {
    const def = window.__vdOeffentlich.WIZARD_BY_ID.pvwiz;
    window.__vdOeffentlich.wizardSchrittIndex = def.schritte.findIndex(s => s.feld && s.feld.id === 'supportFromChurchOrCommunity');
    window.__vdOeffentlich.renderContent();
  });
  // Eine Pflichtverletzung ist am Textfeld nicht erzwingbar (nicht pflicht) — die schärfere,
  // bereits im Kern belegte Form aus 11-wizard-fremder-ausstieg.spec.js: eine `auswahl`-Option
  // einschmuggeln, die die Registry nicht kennt (grund:'auswahl'), am Schritt `pv_m_lebenserhalt`.
  await page.evaluate(() => {
    const def = window.__vdOeffentlich.WIZARD_BY_ID.pvwiz;
    window.__vdOeffentlich.wizardSchrittIndex = def.schritte.findIndex(s => s.feld && s.feld.id === 'lifeSustainingMeasures');
    window.__vdOeffentlich.renderContent();
  });
  await page.evaluate(() => {
    const sel = document.querySelector('#content [data-edit="lifeSustainingMeasures"]');
    const o = document.createElement('option');
    o.value = 'gibt-es-nicht'; o.textContent = 'Attrappe';
    sel.appendChild(o); sel.value = 'gibt-es-nicht';
  });
  await page.click('#wiz-weiter');
  await expect(page.locator('.feld-fehler[role="alert"]'), 'Fehler-Banner muss stehen, bevor der Sub-Kontext verlassen wird').toBeVisible();
  const grundVorVerlassen = await page.evaluate(() => window.__vdOeffentlich.wizardFehlerGrund);
  expect(grundVorVerlassen).toBe('auswahl');

  // ── DER ZUSAMMENGESETZTE ÜBERGANG: #vm-zurueck statt #wiz-abbr ──────────
  await page.click('#vm-zurueck');
  await page.waitForTimeout(300);   // subKontextVerlassen ist async — kurz nachlaufen lassen

  const nach = await page.evaluate(() => ({
    imSubKontext: window.__vdOeffentlich.imSubKontext(),
    aktiveAnsicht: typeof window.__vdOeffentlich.aktiveAnsicht !== 'undefined' ? window.__vdOeffentlich.aktiveAnsicht : 'undefined-var',
    aktiverWizardId: typeof window.__vdOeffentlich.aktiverWizardId !== 'undefined' ? window.__vdOeffentlich.aktiverWizardId : 'undefined-var',
    wizardFehlerGrund: typeof window.__vdOeffentlich.wizardFehlerGrund !== 'undefined' ? window.__vdOeffentlich.wizardFehlerGrund : 'undefined-var',
    wizardFrageSteht: !!document.querySelector('.wizard-frage'),
  }));

  // Der Sub-Kontext IST verlassen — das leistet subKontextVerlassen() korrekt.
  expect(nach.imSubKontext, 'data muss auf den Anker zurückgeschwenkt sein').toBe(false);

  // BEFUND-ASSERTS: der erwartete, korrekte Zustand nach JEDEM Verlassen des Sub-Kontexts ist ein
  // GESCHLOSSENER Wizard — wie wizardAbbrechen()/wizardAbschluss() ihn herstellen. Bleibt der
  // Wizard-Bildschirm stehen, während data bereits der ANKER ist, schriebe ein nachfolgendes
  // "Weiter" die Antwort der Sub-Depot-Inhaberin in den ANKER-Umschlag — falscher Umschlag.
  expect(nach.aktiverWizardId, 'BEFUND: aktiverWizardId muss nach dem Verlassen null sein (subKontextVerlassen setzt es nicht zurück)').toBeNull();
  expect(nach.aktiveAnsicht, 'BEFUND: aktiveAnsicht darf nach dem Verlassen nicht mehr "wizard" sein').not.toBe('wizard');
  expect(nach.wizardFrageSteht, 'BEFUND: der Wizard-Bildschirm darf nach dem Verlassen nicht mehr stehen').toBe(false);
  expect(nach.wizardFehlerGrund, 'BEFUND: der Fehler-Banner darf den Kontext-Wechsel nicht überleben').toBeNull();

  expect(fehler, 'kein Absturz im zusammengesetzten Übergang').toEqual([]);
});
