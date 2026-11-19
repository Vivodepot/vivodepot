'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 5 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026, Entscheidung A+C) — Browser-Abnahme des Depot-Pillen-Menüs.
   ────────────────────────────────────────────────────────────────────────
   Node-Tests (tests/zug5-depot-pille-menue.test.js) belegen Struktur +
   Klick-Verdrahtung bereits; hier zusätzlich, was nur ein echter Browser
   zeigt (U2-ADR-091 Event-Blindzone): Tastatur + Fokusführung.

   GEMESSEN beim Bau (Browser-Probe im eingebetteten Browser): der erste Entwurf
   behandelte Enter/Leertaste NICHT im eigenen keydown-Handler ("nur
   ArrowDown, der native Klick reicht") — auf einem <button> lösen Enter/
   Leertaste aber selbst einen synthetischen Klick aus (WHATWG-Standard).
   Ohne eigenes preventDefault() lief das scheinbar unbeobachtbar durch (die
   Browser-Pane konnte den nativen Klick nicht zuverlässig nachstellen,
   Playwright schon) — dieser Test ist der rote Beleg dafür, dass Enter das
   Menü öffnet und NICHT sofort wieder schließt. */
const { test, expect } = require('@playwright/test');
const { inLeisteKlicken, oeffneApp, depotAnlegen } = require('./helpers');

async function menueOeffnenPerKlick(page) {
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue', { state: 'visible' });
}

test('[Zug5] Klick auf die Depot-Pille öffnet das Menü mit zwei Einträgen, fokussiert den ersten', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await expect(page.locator('#tb-depot-menue-liste')).toBeVisible();
  await expect(page.locator('#tb-depot-menue-verwaltung')).toBeVisible();
  // D05 (Desktop-Dummy): oben steht der Wechsler, der erste Eintrag ist das eigene Depot.
  await expect(page.locator('#tb-depot-menue-eigen')).toBeFocused();
});

test('[Zug5] ArrowDown/ArrowUp bewegen den Fokus zwischen den Einträgen (wrap-around)', async ({ page }) => {
  // U2-ADR-237-Nachzug (04.09.2026): ein dritter Eintrag „Sicherungskopie erstellen" kam dazu
  // (#tb-depot-menue-sicherungskopie) — verwaltung ist nicht mehr der letzte Eintrag, der
  // Wrap-Zyklus geht jetzt über alle drei.
  await oeffneApp(page);
  await depotAnlegen(page);
  // D04–D07: der Wechsler (eigenes Depot, „Sub-Depot anlegen“) steht vor den drei bisherigen Einträgen, die Reihe geht über alle.
  await menueOeffnenPerKlick(page);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#tb-depot-menue-anlegen')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#tb-depot-menue-liste')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#tb-depot-menue-verwaltung')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#tb-depot-menue-sicherungskopie')).toBeFocused('letzter Eintrag');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#tb-depot-menue-eigen')).toBeFocused('wrap-around zurück zum ersten Eintrag');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#tb-depot-menue-sicherungskopie')).toBeFocused('wrap-around rückwärts zum letzten Eintrag');
});

test('[Zug5] Escape schließt das Menü und gibt den Fokus an die Pille zurück', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#tb-depot-menue')).toBeHidden();
  await expect(page.locator('#tb-depot-pille')).toBeFocused();
});

test('[Zug5] Enter auf der fokussierten Pille öffnet das Menü — bleibt offen, schließt NICHT sofort wieder', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.locator('#tb-depot-pille').focus();
  await page.keyboard.press('Enter');
  // Der rote Fund: ohne preventDefault() auf dem eigenen Enter-Handler löste der Browser NACH
  // depotMenueOeffnen() zusätzlich seinen eigenen synthetischen Klick aus — depotMenueToggle()
  // sah das Menü bereits offen und schloss es im selben Augenblick wieder.
  await expect(page.locator('#tb-depot-menue')).toBeVisible();
  await expect(page.locator('#tb-depot-menue-eigen')).toBeFocused();   // erster Eintrag seit D04–D07
});

test('[Zug5] Klick außerhalb schließt das Menü (focusout)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await page.click('#suche-eingabe');
  await expect(page.locator('#tb-depot-menue')).toBeHidden();
});

test('[Zug5] "Mein Depot" öffnet den Info-Dialog (flowDepotListe) — der bislang tote Aufrufer', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await page.click('#tb-depot-menue-liste');
  await expect(page.locator('#modal-titel')).toHaveText('Depot');
  await expect(page.locator('#tb-depot-menue')).toBeHidden('das Menü selbst schließt beim Auswählen');
});

test('[Zug5] "Depots, die ich aufbewahre" öffnet weiterhin die Verwaltete-Depots-Sicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await page.click('#tb-depot-menue-verwaltung');
  await expect(page.locator('#content')).toContainText('Sub-Depots');
});

test('[Zug5·A] Sidebar-Eintrag „Sub-Depots" führt zum selben Ziel und wird als aktiv markiert', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await inLeisteKlicken(page, '[data-verwaltete-depots="1"]');
  await expect(page.locator('#content')).toContainText('Sub-Depots');
  await expect(page.locator('[data-verwaltete-depots="1"]')).toHaveClass(/\baktiv\b/);
});

/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-238 (03.09.2026) — Meldung: in Safari auf dem Mac
   reagierte der ZWEITE Eintrag nicht auf einen Klick, der erste ging.
   macOS Safari gibt einem <button> beim Klick standardmässig KEINEN Fokus
   (Systemvoreinstellung, anders als Chrome/Firefox). depotMenueOeffnen()
   fokussiert beim Öffnen den ERSTEN Eintrag programmatisch — verlor dieser
   seinen Fokus beim Klick auf den zweiten, OHNE dass der zweite dafür einen
   bekam, schloss der alte Weg (focusout + requestAnimationFrame) das Menü
   schon, BEVOR der eigentliche click (kommt erst nach mouseup) ankam.

   REPRODUZIERT WIRD DER MECHANISMUS, NICHT DER BROWSER: kein Zugriff auf
   echtes Safari.app in dieser Kette (computer-use sperrt Browser auf Stufe
   „read", Playwright-WebKit ist nicht Safari.app, der iOS-Simulator ist iOS
   statt macOS). Die erste Probe stellt den Fokus-Verlust ins Leere direkt
   nach — genau das, was ein Button-Klick ohne Fokus-Übertragung erzeugt —
   statt einen echten Klick zu simulieren. */

test('[U2-ADR-238·Rot-Beweis] Fokus-Verlust ins Leere (kein neues Fokus-Ziel, wie macOS Safari es beim Klick erzeugt) darf das Menü NICHT schließen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await expect(page.locator('#tb-depot-menue-eigen')).toBeFocused();

  const aktivesElementTag = await page.evaluate(async () => {
    document.getElementById('tb-depot-menue-eigen').blur();
    document.body.focus && document.body.focus();
    await new Promise(requestAnimationFrame);
    return document.activeElement ? document.activeElement.tagName : null;
  });

  const hidden = await page.locator('#tb-depot-menue').isHidden();
  expect(aktivesElementTag).not.toBe('BUTTON');   // Vorbedingung: der Fokus ging wirklich ins Leere, nicht auf einen Knopf
  expect(hidden).toBe(false, 'das Menü schloss sich allein durch Fokus-Verlust — genau der Wettlauf, den macOS Safari verliert');
});

test('[U2-ADR-238] "Depots, die ich aufbewahre" öffnet die Verwaltete-Depots-Sicht auch NACHDEM der Fokus zuvor ins Leere ging', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await page.evaluate(async () => {
    document.getElementById('tb-depot-menue-liste').blur();
    document.body.focus && document.body.focus();
    await new Promise(requestAnimationFrame);
  });
  await page.click('#tb-depot-menue-verwaltung');
  await expect(page.locator('#content')).toContainText('Sub-Depots');
});

test('[U2-ADR-238] Klick ausserhalb schliesst das Menü weiterhin (Maus/Touch, jetzt über pointerdown statt Fokus)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await page.click('#suche-eingabe');
  await expect(page.locator('#tb-depot-menue')).toBeHidden();
});

test('[U2-ADR-238] Tab aus dem letzten Eintrag heraus schliesst das Menü weiterhin (Tastatur, jetzt über focusin statt focusout)', async ({ page }) => {
  // U2-ADR-237-Nachzug (04.09.2026): „Sicherungskopie erstellen" ist jetzt der letzte Eintrag,
  // nicht mehr „verwaltung"; seit D04–D07 erreicht ArrowUp vom ersten Eintrag den letzten direkt.
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  await page.keyboard.press('ArrowUp');   // D04–D07: rückwärts vom ersten Eintrag auf „sicherungskopie“, den letzten
  await expect(page.locator('#tb-depot-menue-sicherungskopie')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#tb-depot-menue')).toBeHidden();
});

/* Trenner unter dem Depot-Wechsler (D05–D07): die Linie läuft über die Breite des Menüs. Im Bildlauf stand sie als Punkt da
   (hr mit seitlichem margin:auto in der Flex-Spalte). Rot-Beweis: mit margin:auto schrumpft sie wieder. */
test('[Depot-Wechsler·Trenner] die Linie unter „Sub-Depot anlegen“ läuft über die Menübreite, mit Rot-Beweis', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await menueOeffnenPerKlick(page);
  const breite = () => page.evaluate(() => {
    const m = document.getElementById('tb-depot-menue'); const hr = m && m.querySelector('hr');
    return hr ? [Math.round(hr.getBoundingClientRect().width), Math.round(m.clientWidth)] : [0, 0];
  });
  const [linie, menue] = await breite();
  expect(linie, 'Trenner ' + linie + ' px bei Menübreite ' + menue + ' px').toBeGreaterThan(menue * 0.9);
  await page.addStyleTag({ content: '#tb-depot-menue hr { margin: 0 auto !important; width: auto !important; align-self: auto !important; }' });
  const [rot] = await breite();
  expect(rot, 'Rot-Beweis: mit margin:auto schrumpft die Linie').toBeLessThan(menue * 0.5);
});
