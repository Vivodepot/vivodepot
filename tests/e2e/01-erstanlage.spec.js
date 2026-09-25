'use strict';
/* Reise — Erstanlage: Depot anlegen → Bereich öffnen → Feld eintragen → es bleibt stehen. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

test('Erstanlage: anlegen, Identität ausfüllen, Wert erscheint in der Lese-Sicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Maria Mustermann' });

  // App ist offen, die Bereiche stehen in der Sidebar.
  await expect(page.locator('#app')).toHaveClass(/\ban\b/);
  // U2-ADR-171 (25.08.2026): identitaet ist SICHTBAR (depotAnlegen landet dort, sein Cluster
  // "Ich & Mensch" ist darum offen) — vorsorge steckt in einem anderen, standardmäßig
  // GESCHLOSSENEN Cluster ("Geld & Absicherung") und ist darum nur im DOM vorhanden, nicht
  // sichtbar. Beide Proben zusammen belegen: der Bereich ist gerendert, kein leerer Rest.
  // `betreteApp()` ruft selbst `oeffneSektor(aktiverSektorId)` — der Umschalter „Alle Bereiche
  // zeigen" UND der Cluster „Ich & Mensch" sind darum sofort offen, „identitaet" ist als einziger
  // Treffer sichtbar (kein zweites Vorkommen mehr — „Weitermachen" ist 28.08.2026 ersatzlos
  // entfallen, Entscheidung, s. renderSidebar() im Kern). `.first()` bleibt stehen,
  // schadet bei einem einzigen Treffer nicht.
  await expect(page.locator('[data-sektor="identity"]').first()).toBeVisible();
  await expect(page.locator('[data-sektor="advanceCare"]')).toHaveCount(1);

  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'givenName', 'Maria');

  // Wert bleibt stehen: im Inline-Edit-Modell (immer editierbar, kein #b-bearb/#b-fertig-Zyklus)
  // trägt das Feld-Input selbst den gespeicherten Wert nach dem Re-Render.
  await expect(page.locator('[data-edit="givenName"]')).toHaveValue('Maria');
});
