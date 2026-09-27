'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — A210: eine Institution ansehen UND ändern (Auftragskette
   14.08.2026, Glied 9). Echter Klickweg: der „Ansehen/Ändern"-Knopf neben
   dem Institutions-Picker (feldInputHTML) → Dialog mit Vorbefüllung +
   Verwendungs-Satz → ändern → speichern → die Änderung steht an ZWEI
   unabhängigen Fundstellen, ohne Neuladen.

   NICHT im Ansehen-Modus (feldWertHTML) — der Knopf sitzt bewusst im
   Picker (nur bei darf===true gerendert), nicht im Notfall-/Angehörigen-
   Lesepfad (s. Kommentar in feldInputHTML/feldWertHTML im Kern). Diese
   App kennt seit „Lesemodus abschaffen" ohnehin kein separates Ansehen für
   normale Sektorfelder mehr — der Picker IST die Ansicht.

   Die Institution wird per page.evaluate() angelegt/verknüpft (Arrange) —
   der Aufbau über die Inline-„+ Neue Institution anlegen"-Maske ist ein
   eigener, bereits bestehender Weg (K6) und nicht Gegenstand dieses Tests;
   hier geht es um den NEUEN Teil: Ansehen/Ändern einer schon bestehenden
   Institution.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('Klick auf den Institutionsnamen öffnet Ansehen/Ändern, zeigt den Verwendungs-Satz, und eine Änderung schlägt an zwei Fundstellen durch', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Arrange: eine Institution, an ZWEI Sektor-Feldern verknüpft.
  const institutionId = await page.evaluate(() => {
    const id = window.__vdOeffentlich.institutionHinzufuegen({ name: 'Alte Sparkasse', tel: '089 111' });
    window.__vdOeffentlich.sektorFeldSetzen('mobility', 'carInsurance', { ref: id, override: '' });
    window.__vdOeffentlich.sektorFeldSetzen('education', 'employer', { ref: id, override: '' });
    window.__vdOeffentlich.renderContent();
    return id;
  });
  expect(institutionId).toBeTruthy();

  await oeffneSektor(page, 'mobility');
  const knopf = page.locator('[data-institution-oeffnen="' + institutionId + '"]');
  await expect(knopf).toBeVisible();
  await expect(knopf).toHaveText('Ansehen/Ändern');

  await knopf.click();
  await page.waitForSelector('#modal-inhalt');
  const modalHtml = await page.locator('#modal-inhalt').innerHTML();
  // Zug 3 (Nachtrag 14.08.2026): dieselbe anklickbare Fundstellen-Liste wie bei Personen —
  // steht VOR dem Speichern im Dialog, zwei Einträge (mobilitaet + bildung).
  expect(modalHtml).toContain('Wird verwendet in');
  expect((modalHtml.match(/data-referenz-sektor="/g) || []).length).toBe(2);
  expect(modalHtml).toContain('data-referenz-sektor="mobility"');
  expect(modalHtml).toContain('data-referenz-sektor="education"');
  // Zug 2: die Bausteine tragen wirklich — vorbefüllt, nicht leer.
  await expect(page.locator('[data-edit="name"]')).toHaveValue('Alte Sparkasse');
  await expect(page.locator('[data-edit="tel"]')).toHaveValue('089 111');

  await page.fill('[data-edit="name"]', 'Neue Bank AG');
  await page.click('#m-ok');
  await page.waitForTimeout(200);

  // Zug 4a — Rot sehen, im echten Browser: BEIDE Fundstellen zeigen den neuen Namen, ohne Neuladen.
  const mobilitaetHtml = await page.locator('#content').innerHTML();
  expect(mobilitaetHtml).toContain('Neue Bank AG');
  expect(mobilitaetHtml).not.toContain('Alte Sparkasse');

  await oeffneSektor(page, 'education');
  const bildungHtml = await page.locator('#content').innerHTML();
  expect(bildungHtml).toContain('Neue Bank AG');
  expect(bildungHtml).not.toContain('Alte Sparkasse');
});

test('eine Institution mit genau einer Verwendung zeigt die Fundstellen-Liste mit einem Eintrag, anklickbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  const institutionId = await page.evaluate(() => {
    const id = window.__vdOeffentlich.institutionHinzufuegen({ name: 'Botschaft Beispielland' });
    window.__vdOeffentlich.sektorFeldSetzen('mobility', 'embassyContact', { ref: id, override: '' });
    window.__vdOeffentlich.renderContent();
    return id;
  });

  await oeffneSektor(page, 'mobility');
  await page.locator('[data-institution-oeffnen="' + institutionId + '"]').click();
  await page.waitForSelector('#modal-inhalt');
  const modalHtml = await page.locator('#modal-inhalt').innerHTML();
  expect(modalHtml).toContain('Wird verwendet in');
  expect((modalHtml.match(/data-referenz-sektor="/g) || []).length).toBe(1);

  // Echter Klick auf die Fundstelle springt zum Sektor (M4-Adressierbarkeit, dasselbe Muster wie
  // bei Personen) UND schließt den Institutions-Dialog dabei.
  await page.locator('[data-referenz-sektor="mobility"]').click();
  await page.waitForTimeout(150);
  await expect(page.locator('#modal-rueck')).not.toHaveClass(/an/);
});

test('ein reiner Freitext-Override ohne Registereintrag ist NICHT klickbar (Gegenprobe)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'mobility');
  await page.fill('[data-edit-override="carInsurance"]', 'Irgendeine Versicherung, nie angelegt');
  await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
  const html = await page.locator('#content').innerHTML();
  expect(html).toContain('Irgendeine Versicherung, nie angelegt');
  expect(html).not.toContain('data-institution-oeffnen');
});

test('die achte Fundstelle (Menschen-Register „Wo arbeitet diese Person?") funktioniert IM MODAL — der zweite Klick-Delegations-Host', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  const institutionId = await page.evaluate(() => window.__vdOeffentlich.institutionHinzufuegen({ name: 'Praxis Dr. Beispiel' }));

  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb');
  if (await bearb.count()) await bearb.click();
  await page.waitForTimeout(150);
  await page.click('[data-person-hinzufuegen="1"]');
  await page.waitForSelector('#modal-inhalt');
  await page.fill('[data-sub-zeile="name"] input', 'Anna Schmidt');
  // Institution im Register-Modal auswählen (bestehenden Eintrag, kein Inline-Anlegen).
  await page.locator('[data-sub-zeile="institution"] select').selectOption({ label: 'Praxis Dr. Beispiel' });
  await page.click('#m-ok');
  await page.waitForTimeout(200);

  // Der Knopf erscheint erst bei erneutem Öffnen — feldInputHTML ist nicht reaktiv, `ref` kommt
  // aus dem gespeicherten Stand, nicht aus einer Live-Auswahl im selben Formular-Durchlauf.
  const personId = await page.evaluate(() => (window.__vdOeffentlich.ankerDaten().menschen.find(m => m.name === 'Anna Schmidt') || {}).id);
  expect(personId).toBeTruthy();
  await page.click('[data-person-bearbeiten="' + personId + '"]');
  await page.waitForSelector('#modal-inhalt');

  // Der „Ansehen/Ändern"-Knopf steht JETZT im Modal — der zweite Delegations-Host
  // (#modal-inhalt), nicht #content, muss ihn fangen.
  const knopf = page.locator('[data-institution-oeffnen="' + institutionId + '"]');
  await expect(knopf).toBeVisible();
  await knopf.click();

  // ui.modal ersetzt #modal-inhalt (kein Stapeln) — jetzt der Institutions-Dialog, nicht mehr die Person.
  await expect(page.locator('#modal-titel')).toHaveText('Institution ansehen und ändern');
  await expect(page.locator('[data-edit="name"]')).toHaveValue('Praxis Dr. Beispiel');
});
