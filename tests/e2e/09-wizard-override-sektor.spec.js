'use strict';
/* ════════════════════════════════════════════════════════════════════════
   1b-Fix (U2-ADR-089-Nachtrag, Weg A) — Wizard-Feld mit ziel-Override landet
   am RICHTIGEN Ort, nicht im Startsektor.
   ────────────────────────────────────────────────────────────────────────
   Der Fehler lag in der Event-Blindzone: ein Feld-Blur im Wizard löste
   bearbeitungSpeichern() aus, das keinen Wizard-Fall kannte und über den
   else-Zweig nach `aktiverSektorId` (Startsektor) schrieb — OHNE den
   Schritt-eigenen `ziel`-Override.

   VEHIKEL-WECHSEL 23.07. (U2-ADR-096): Der Spec fuhr auf erbwiz, der ersatzlos
   entfallen ist. Geprüft wird der Override-MECHANISMUS, nicht dieser eine Wizard —
   jeder Schritt mit eigenem `ziel` tut dasselbe. Neues Vehikel: pflwiz' Schritt
   `pflegezeit` mit `ziel:{sektor:'people'}`, Start-Sektor sozialversicherung.
   Der Wert darf NICHT als Streu-Kopie im Startsektor liegen — das war der Fehler von 1b.
   Zweiter Pfad: wizardAbschluss → oeffneSektor(ziel.sektor) ruft
   bearbeitungSpeichern() DIREKT, während das Wizard-Feld noch gerendert ist.
   Weg A gated deshalb am Chokepoint bearbeitungSpeichern() selbst.

   Nachweis über den ENTSCHLÜSSELTEN Datensatz (depotSerialisieren+depotLaden),
   nicht über die Anzeige. Muss im Browser laufen — Node erreicht den Event-
   Pfad nicht (document.addEventListener ist im Stub ein No-Op). Gegenprobe:
   ohne den Guard schlägt der Test fehl (vorsorge trägt die Streu-Kopie).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('1b: pflwiz-Override-Schritt (pflegezeit) landet in meine-menschen, NICHT im Startsektor sozialversicherung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'socialInsurance');

  // Wizard starten (pflwiz, ziel sozialversicherung; Schritt 4 hat den meine-menschen-Override).
  const gefuehrt = page.locator('.wizard-gruppe > summary');
  if (await gefuehrt.count()) await gefuehrt.click();
  await page.click('[data-wizard-start="pflwiz"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();

  // Zum Override-Schritt springen. Nur die Sicht-Navigation über die
  // Kern-Funktion; das Ausfüllen + „Fertig" laufen danach als ECHTE UI-Events.
  await page.evaluate(() => {
    const def = window.__vdOeffentlich.WIZARD_BY_ID.pflwiz;
    window.__vdOeffentlich.wizardSchrittIndex = def.schritte.findIndex(s => s.feld && s.feld.id === 'careLeaveFamilyCareLeave');
    window.__vdOeffentlich.renderContent();
  });
  // Sicherstellen, dass wir wirklich auf pflegezeit (Override meine-menschen) stehen.
  await expect(page.locator('#content [data-edit="careLeaveFamilyCareLeave"]')).toBeVisible();
  await page.evaluate(() => {
    const s = window.__vdOeffentlich.WIZARD_BY_ID.pflwiz.schritte[window.__vdOeffentlich.wizardSchrittIndex];
    if (!s.ziel || s.ziel.sektor !== 'people') throw new Error('Testannahme kaputt: Override-Ziel ist nicht meine-menschen');
  });

  // Feld ausfüllen und „Fertig" als ECHTEN Klick — löst focusout (Autosave) UND
  // wizardAbschluss→oeffneSektor(bearbeitungSpeichern) aus, genau die zwei Pfade.
  await page.fill('#content [data-edit="careLeaveFamilyCareLeave"]', 'seit Maerz 2025, drei Tage die Woche');
  await page.click('#wiz-weiter');

  // Prüfung über den ENTSCHLÜSSELTEN Datensatz.
  const r = await page.evaluate(async () => {
    const u = await window.__vdOeffentlich.depotSerialisieren();
    const frisch = await window.__vdOeffentlich.depotLaden(u, 'e2e-passwort-123');   // == helpers.js Default-PW
    return {
      ziel:  (frisch.sektoren['people'] || {}).careLeaveFamilyCareLeave || null,
      start: (frisch.sektoren.socialInsurance || {}).careLeaveFamilyCareLeave || null,
    };
  });

  // Der Wert gehört nach meine-menschen (Override-Ziel) …
  expect(r.ziel).toBe('seit Maerz 2025, drei Tage die Woche');
  // … und darf NICHT als Streu-Kopie im Startsektor sozialversicherung liegen (Fehler von 1b).
  expect(r.start).toBeNull();
});
