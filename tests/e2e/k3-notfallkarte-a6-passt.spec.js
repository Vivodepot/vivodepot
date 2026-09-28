'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   K3 · die Notfallkarte passt auf A6 (U2-ADR-438, 27.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Entscheidung (27.09.2026): die zwei Freitexte der Notfallvorsorge stehen auf der Karte, gekürzt auf 160
   Zeichen. Abnahme an der Karte selbst: alle neuen Felder maximal gefüllt (beide Freitexte über der
   Grenze, alle drei Unterstützungs-Optionen), dazu die Blutgruppe —
   die Karte bleibt EINE Seite. Passt sie nicht, sinkt die Zahl, nicht die Schrift.
   Gemessen beim Bau (27.09.2026): auch UNGEKÜRZT (zwei Freitexte à ~330 Zeichen) passt diese Karte noch auf eine
   Seite — die 160 sind eine Entscheidung über den Inhalt der Karte, nicht über ihren Platz.
   Rot-Beweis: dieselbe Messung schlägt an, sobald der Inhalt die Seite wirklich sprengt (die Freitexte vierfach).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const LANG = 'Ich habe eine seltene Stoffwechselerkrankung und darf bei Bewusstlosigkeit keine Glukose-Infusion bekommen, '
  + 'bitte zuerst den Notfallausweis in der Brieftasche lesen und die Ärztin in der Uniklinik anrufen, sie kennt mich seit '
  + 'Jahren und hat alle Befunde, auch die aus der Kinderklinik, und sie weiß, welche Medikamente ich nicht vertrage.';

async function vollBefuellt(page) {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');
  await page.evaluate((lang) => {
    const O = window.__vdOeffentlich;
    const deniz = O.personHinzufuegen({ name: 'Deniz Beispielname-Langform' });
    O.sektorFeldSetzen('advanceCare', 'communicationLanguage', 'Türkisch; Deutsch nur einfach, bitte langsam');
    O.sektorFeldSetzen('advanceCare', 'communicationSupport', ['dolmetschen', 'gebaerdensprache', 'leichte-sprache']);
    O.sektorFeldSetzen('advanceCare', 'supportPerson', { ref: deniz });
    O.sektorFeldSetzen('advanceCare', 'whatHelpsMe', lang);
    O.sektorFeldSetzen('advanceCare', 'doNotInform', lang);
    O.sektorFeldSetzen('emergencyPreparedness', 'specialSituation', lang);
    O.sektorFeldSetzen('emergencyPreparedness', 'noteForEmergencyResponders', lang);
    O.sektorFeldSetzen('health', 'bloodType', 'A+');
  }, LANG);
}

test('[K3·A6] alle neuen Felder maximal gefüllt: die Notfallkarte bleibt eine Seite', async ({ page }) => {
  await vollBefuellt(page);
  const r = await page.evaluate(() => {
    const O = window.__vdOeffentlich;
    const zeilen = O.notfallKernModell();
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a6' });
    O.zeichneNotfallkarte(doc, zeilen, O.notfallKartenMeta(), null);
    return { seiten: doc.internal.getNumberOfPages(), zeilen: zeilen.length,
      gekuerzt: zeilen.filter((z) => /vollständig in der Datei/.test(String(z.wert))).length };
  });
  expect(r.gekuerzt, 'beide Freitexte stehen gekürzt auf der Karte').toBe(2);
  expect(r.seiten, 'die Karte passt auf eine A6-Seite (' + r.zeilen + ' Zeilen)').toBe(1);
});

test('[K3·A6·Rot-Beweis] dieselbe Messung erkennt den Umbruch, wenn der Inhalt die Seite sprengt', async ({ page }) => {
  await vollBefuellt(page);
  const seiten = await page.evaluate((lang) => {
    const O = window.__vdOeffentlich;
    const zeilen = O.notfallKernModell().map((z) => (/vollständig in der Datei/.test(String(z.wert)) ? Object.assign({}, z, { wert: [lang, lang, lang, lang].join(' ') }) : z));
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a6' });
    O.zeichneNotfallkarte(doc, zeilen, O.notfallKartenMeta(), null);
    return doc.internal.getNumberOfPages();
  }, LANG);
  expect(seiten).toBeGreaterThan(1);
});
