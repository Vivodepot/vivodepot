'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — F8s nachgeholte Browser-Abnahme („Nachlese F8/M1", Zug 3b,
   11.08.2026)
   ────────────────────────────────────────────────────────────────────────
   F8 Zug 5 selbst: kein interaktiver Klickweg gefahren, die drei kernGate-
   tragenden *DokumentOeffnen()-Funktionen (pv/vollmacht/betreuung) nie
   geklickt. Das Kern-Gate ist VERHALTEN, kein Textfluss: fehlt Name oder
   Geburtsdatum der eigenen Partei, entsteht KEIN Dokument, sondern ein
   Toast (ui.toast → #toast-host .toast). Fehlt nur eine „Neben"-Angabe
   (Geburtsort/Adresse/Kontakt), entsteht das Dokument trotzdem, mit
   sichtbarem .pv-dok-hinweis. KI-Verfügung trägt bewusst weder kernGate
   noch lueckenFelder — bleibt hier außen vor (nicht F8s Umfang).

   Setup über page.evaluate() direkt an `data` (wie tests/e2e/s9-dokument-
   datei.spec.js) — dokumentOeffnen() ist derselbe Code-Pfad, ob per Klick
   auf einen echten Knopf oder direkt gerufen; der PV-Wizard-Weg selbst ist
   an anderer Stelle geprüft (03-wizard-pvwiz.spec.js). Was hier fehlte, war
   NICHT der Wizard-Weg, sondern das Kern-Gate + der Lücken-Hinweis im
   echten Browser — genau das prüft diese Datei.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const VOLLSTAENDIGE_IDENTITAET = {
  givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14',
  birthPlace: 'München', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München', telephone: '089 1234567',
};

async function setzeIdentitaet(page, teilangaben) {
  await page.evaluate((id) => {
    window.__vdOeffentlich.ankerDaten().sektoren.identity = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.identity, id);
  }, teilangaben);
}

async function fuegeVollmachtZeileHinzu(page) {
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.advanceCare, {
      provisionInstruments: [
        { id: 'e2e-vm-1', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ override: 'Max Mustermann' }] },
      ],
    });
  });
}

async function fuegeBetreuungZeileHinzu(page) {
  await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.advanceCare, {
      provisionInstruments: liste.concat([
        { id: 'e2e-bv-1', instrument: 'custodianship-declaration', proposedPerson: { override: 'Erika Beispiel' } },
      ]),
    });
  });
}

test.describe('F8-Nachlese: Patientenverfügung (kernGate + lueckenFelder=["adresse"])', () => {
  test('vollständige Identität → das Blatt entsteht', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, VOLLSTAENDIGE_IDENTITAET);
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
    await expect(page.locator('#pv-dok-overlay')).toBeVisible();
    await expect(page.locator('.pv-dok-blatt')).toContainText('Elisabeth');
    await expect(page.locator('.pv-dok-hinweis', { hasText: 'Unvollständige Angaben' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/f8-abnahme-pv-vollstaendig.png' });
  });

  test('Geburtsdatum fehlt → kein Blatt, Toast sichtbar und lesbar', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, Object.assign({}, VOLLSTAENDIGE_IDENTITAET, { birthDate: '' }));
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
    await expect(page.locator('#pv-dok-overlay')).toHaveCount(0);
    // GEÄNDERT (Auftrag, 12.09.2026): Autosave-Toasts (ADR-237) stapeln sich neben
    // dem generischen Locator (s. einlass-register-institutionsart-bei-offenem-depot.spec.js).
    const toast = page.locator('#toast-host .toast', { hasText: 'fehlen' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/Geburtsdatum|unvollständig|Identität/i);
    await page.screenshot({ path: 'test-results/f8-abnahme-pv-kein-geburtsdatum-toast.png' });
  });

  test('Adresse (Nebenangabe) fehlt → Blatt entsteht trotzdem, Lücken-Hinweis sichtbar', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, Object.assign({}, VOLLSTAENDIGE_IDENTITAET, { streetAddress: '', postcodeCity: '' }));
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
    await expect(page.locator('#pv-dok-overlay')).toBeVisible();
    const hinweis = page.locator('.pv-dok-hinweis', { hasText: 'Unvollständige Angaben' });
    await expect(hinweis).toBeVisible();
    await expect(hinweis).toContainText('Adresse');
    await page.screenshot({ path: 'test-results/f8-abnahme-pv-luecken-hinweis.png' });
  });
});

test.describe('F8-Nachlese: Vollmacht (kernGate + lueckenFelder=["geburtsort","adresse","kontakt"])', () => {
  test('vollständige Identität → das Blatt entsteht', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, VOLLSTAENDIGE_IDENTITAET);
    await fuegeVollmachtZeileHinzu(page);
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('vorsorgevollmacht', 'e2e-vm-1'));
    await expect(page.locator('#pv-dok-overlay')).toBeVisible();
    await expect(page.locator('.pv-dok-blatt')).toContainText('Max Mustermann');
    await expect(page.locator('.pv-dok-hinweis', { hasText: 'Unvollständige Angaben' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/f8-abnahme-vm-vollstaendig.png' });
  });

  test('Geburtsdatum fehlt → kein Blatt, Toast sichtbar und lesbar', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, Object.assign({}, VOLLSTAENDIGE_IDENTITAET, { birthDate: '' }));
    await fuegeVollmachtZeileHinzu(page);
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('vorsorgevollmacht', 'e2e-vm-1'));
    await expect(page.locator('#pv-dok-overlay')).toHaveCount(0);
    // GEÄNDERT (Auftrag, 12.09.2026): Autosave-Toasts (ADR-237) stapeln sich neben
    // dem generischen Locator (s. einlass-register-institutionsart-bei-offenem-depot.spec.js).
    const toast = page.locator('#toast-host .toast', { hasText: 'fehlen' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/Geburtsdatum|unvollständig|Identität/i);
    await page.screenshot({ path: 'test-results/f8-abnahme-vm-kein-geburtsdatum-toast.png' });
  });

  test('Geburtsort (Nebenangabe) fehlt → Blatt entsteht trotzdem, Lücken-Hinweis sichtbar', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, Object.assign({}, VOLLSTAENDIGE_IDENTITAET, { birthPlace: '' }));
    await fuegeVollmachtZeileHinzu(page);
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('vorsorgevollmacht', 'e2e-vm-1'));
    await expect(page.locator('#pv-dok-overlay')).toBeVisible();
    const hinweis = page.locator('.pv-dok-hinweis', { hasText: 'Unvollständige Angaben' });
    await expect(hinweis).toBeVisible();
    await expect(hinweis).toContainText('Geburtsort');
    await page.screenshot({ path: 'test-results/f8-abnahme-vm-luecken-hinweis.png' });
  });
});

test.describe('F8-Nachlese: Betreuungsverfügung (kernGate + lueckenFelder=["geburtsort","adresse","kontakt"])', () => {
  test('vollständige Identität → das Blatt entsteht', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, VOLLSTAENDIGE_IDENTITAET);
    await fuegeBetreuungZeileHinzu(page);
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('betreuungsverfuegung'));
    await expect(page.locator('#pv-dok-overlay')).toBeVisible();
    await expect(page.locator('.pv-dok-blatt')).toContainText('Erika Beispiel');
    await expect(page.locator('.pv-dok-hinweis', { hasText: 'Unvollständige Angaben' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/f8-abnahme-bv-vollstaendig.png' });
  });

  test('Geburtsdatum fehlt → kein Blatt, Toast sichtbar und lesbar', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, Object.assign({}, VOLLSTAENDIGE_IDENTITAET, { birthDate: '' }));
    await fuegeBetreuungZeileHinzu(page);
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('betreuungsverfuegung'));
    await expect(page.locator('#pv-dok-overlay')).toHaveCount(0);
    // GEÄNDERT (Auftrag, 12.09.2026): Autosave-Toasts (ADR-237) stapeln sich neben
    // dem generischen Locator (s. einlass-register-institutionsart-bei-offenem-depot.spec.js).
    const toast = page.locator('#toast-host .toast', { hasText: 'fehlen' });
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/Geburtsdatum|unvollständig|Identität/i);
    await page.screenshot({ path: 'test-results/f8-abnahme-bv-kein-geburtsdatum-toast.png' });
  });

  test('Kontakt (Nebenangabe) fehlt → Blatt entsteht trotzdem, Lücken-Hinweis sichtbar', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await setzeIdentitaet(page, Object.assign({}, VOLLSTAENDIGE_IDENTITAET, { telephone: '', email: '' }));
    await fuegeBetreuungZeileHinzu(page);
    await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('betreuungsverfuegung'));
    await expect(page.locator('#pv-dok-overlay')).toBeVisible();
    const hinweis = page.locator('.pv-dok-hinweis', { hasText: 'Unvollständige Angaben' });
    await expect(hinweis).toBeVisible();
    await expect(hinweis).toContainText('Telefon oder E-Mail');
    await page.screenshot({ path: 'test-results/f8-abnahme-bv-luecken-hinweis.png' });
  });
});
