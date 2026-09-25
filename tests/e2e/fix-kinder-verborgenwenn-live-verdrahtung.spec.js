'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fix — Live-Sichtbarkeits-Verdrahtung im Listen-Eintrag-Modal kannte
   `verborgenWenn` nicht (U2-ADR-202)
   ────────────────────────────────────────────────────────────────────────
   Gefunden beim Bau der Betreuung-Datengestalt (U2-ADR-201, Zug 1), nichts
   mit Datengestalten zu tun — eigener Commit, eigene ADR-Nummer.

   `_listenEintragBedingungVerdrahten` (vivodepot.html) prüfte den Guard nur
   gegen `sichtbarWenn`. Die `kinder`-Liste (`meine-menschen`, U2-ADR-109)
   trägt AUSSCHLIESSLICH `verborgenWenn`-Unterfelder (gemessen gegen den
   ganzen Feldbaum: die einzige betroffene Liste im Kern) — der Guard kehrte
   darum sofort zurück, verdrahtete keinen change/input-Listener, rief
   `neuBewerten()` nicht einmal initial auf.

   ZWEI Behauptungen, nicht eine — die zweite ist der eigentliche Schaden:
   1. Sichtbarkeit: bei art='leiblich' bleibt der Vertretungs-Zweig
      (vertretung_art/aufgabenbereiche/betreuungsgericht/aktenzeichen/
      bestellt_seit) verborgen, der Sorgerecht-Zweig sichtbar — und
      umgekehrt bei art='betreuter_erwachsener'.
   2. Gespeicherte Werte: ein Wert, der in einem zum Zeitpunkt des
      Speicherns UNSICHTBAREN Feld steht, landet NICHT im Depot. Das ist
      die Zusicherung, die den echten Schaden verhindert — eine Probe, die
      nur die Sichtbarkeit prüft, deckt sie nicht.

   Rot-Beweis manuell gefahren (nicht nur behauptet): der Guard wurde auf
   die alte Form (`uf.sichtbarWenn` allein) zurückgesetzt, beide Tests
   liefen ROT — Test 1 an der Sichtbarkeits-Assertion selbst (nicht an
   einer Vorbedingung wie dem Modal-Öffnen), Test 2 daran, dass der
   verborgene Wert TROTZDEM im Depot lag. Danach exakt zurückgenommen,
   beide wieder grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers.js');

test('[U2-ADR-202 · Sichtbarkeit] die Kinder-Liste blendet den jeweils anderen Zweig live um, nicht erst nach dem Neu-Öffnen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'people');

  await page.click('[data-eintrag-hinzufuegen="childrenAndDependants"]');
  await page.waitForSelector('#modal-inhalt [data-sub-zeile="type"] select');

  // Vor jeder Auswahl (art noch leer) sind laut Schema beide Zweige sichtbar — das ist der
  // korrekte Ausgangszustand, keine Behauptung dieser Probe.
  await page.selectOption('#modal-inhalt [data-sub-zeile="type"] select', 'leiblich');
  await expect(page.locator('#modal-inhalt [data-sub-zeile="legalRepresentationParental"]')).toBeVisible();
  await expect(page.locator('#modal-inhalt [data-sub-zeile="basisOfRepresentation"]')).toBeHidden();
  await expect(page.locator('#modal-inhalt [data-sub-zeile="careCourt"]')).toBeHidden();

  // Live umschalten, OHNE das Modal zu schließen — genau der Fall, den der Guard verpasste.
  await page.selectOption('#modal-inhalt [data-sub-zeile="type"] select', 'betreuter_erwachsener');
  await expect(page.locator('#modal-inhalt [data-sub-zeile="legalRepresentationParental"]')).toBeHidden();
  await expect(page.locator('#modal-inhalt [data-sub-zeile="basisOfRepresentation"]')).toBeVisible();
  await expect(page.locator('#modal-inhalt [data-sub-zeile="careCourt"]')).toBeVisible();

  await page.click('#m-abbr');
});

test('[U2-ADR-202 · Rot-Beweis] ein Wert, der bei der Speicherung unsichtbar ist, landet NICHT im Depot', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'people');

  await page.click('[data-eintrag-hinzufuegen="childrenAndDependants"]');
  await page.waitForSelector('#modal-inhalt [data-sub-zeile="type"] select');

  // Reihenfolge ist die Probe selbst: ERST den Vertretungs-Zweig befüllen (während er sichtbar
  // ist, art='betreuter_erwachsener'), DANN auf 'leiblich' zurückschalten (Zweig wird laut
  // Schema unsichtbar) — und erst DANACH speichern. Ohne den Fix bliebe der DOM-Wert stehen und
  // würde mitgespeichert, weil `hidden` nie gesetzt wurde.
  await page.selectOption('#modal-inhalt [data-sub-zeile="type"] select', 'betreuter_erwachsener');
  await page.fill('#modal-inhalt [data-sub-zeile="person"] input[data-edit-override="person"]',
    'TEST-Rotbeweis Kind Fiktiv');
  await page.fill('#modal-inhalt [data-sub-zeile="careCourt"] input',
    'TEST-Sollte-nicht-gespeichert-werden');
  await page.fill('#modal-inhalt [data-sub-zeile="fileReferenceNumber"] input',
    'TEST-Sollte-nicht-gespeichert-werden');

  // KEINE Zwischen-Sichtbarkeitsprüfung hier — die trägt bereits die vorige Probe. Diese Probe
  // beweist NUR die Daten-Zusicherung, direkt an ihrer eigenen Zeile unten (Auflage: die zweite
  // Hälfte ist der eigentliche Schaden, eine Sichtbarkeits-Vorbedingung würde sie verdecken).
  await page.selectOption('#modal-inhalt [data-sub-zeile="type"] select', 'leiblich');

  await page.click('#m-ok');
  await page.waitForSelector('#modal-rueck.an', { state: 'hidden' });

  const gespeichert = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren['people'] && window.__vdOeffentlich.ankerDaten().sektoren['people'].childrenAndDependants) || [];
    return liste.find((z) => z.person && z.person.override === 'TEST-Rotbeweis Kind Fiktiv');
  });
  expect(gespeichert).toBeTruthy();
  expect(gespeichert.type).toBe('leiblich');
  // Das ist die eigentliche Zusicherung: kein Betreuungsgericht/Aktenzeichen im Depot, obwohl
  // im Modal kurzzeitig eingetragen — der Zweig war beim Speichern unsichtbar.
  expect(gespeichert.careCourt).toBeUndefined();
  expect(gespeichert.fileReferenceNumber).toBeUndefined();
});
