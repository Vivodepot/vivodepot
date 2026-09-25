'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A68 (U2-ADR-117) — der Schreibweg des Lage-Blatts, am echten DOM
   ────────────────────────────────────────────────────────────────────────────
   Das Lage-Blatt trägt Felder aus mehreren Bereichen. Der A68-Streufehler war: alles
   floss in EINEN Namensraum (den aktiven Bereich). Hier wird am echten Browser bewiesen,
   dass jedes Feld in seinem HEIMAT-Bereich landet — und die Rotmachbarkeit (Regel 18) zeigt
   an einer gepflanzten Verletzung, dass die Prüfung den Streufehler wirklich fängt.

   WARUM E2E: `bearbeitungSpeichern` LIEST die Eingaben aus dem DOM. Der node-Stub liefert
   `querySelectorAll` unbedingt `[]` — headless schriebe der Fold nichts. Die Aussage über den
   Schreibweg gehört darum an den echten DOM.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, KERN_URL_PRIVAT_DE } = require('./helpers.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Schnitt-Nachtrag (19.09.2026): war die rohe vivodepot.html — seit BUERGERMODUL_BUENDEL
// entfernt ist, hat die keine nativen Bereiche mehr, depotAnlegen()/fuelleLageDrei() liefen
// darum ins Leere. Jetzt dieselbe gebackene privat-de wie oeffneApp()'s eigener Default.
const KERN = KERN_URL_PRIVAT_DE.replace(/^file:\/\//, '');

// Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): diese Datei navigiert für die Rotmachbarkeits-
// Proben direkt auf eine gepflanzte Kopie (page.goto, kein oeffneApp()) — die dortige Default-
// FSA-Attrappe (tests/e2e/helpers.js) greift für diese Navigation darum nicht, selbst registrieren.
async function fsaAttrappeVorMutantNavigation(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'a68-mutant-test.vivodepot',
        createWritable: async () => ({ write: async () => {}, close: async () => {} }),
      }),
    });
  });
}

/* Öffnet die 3-Bereich-Lage `pflegebeduerftigkeit` und tippt in je EIN Textfeld pro
   Heimat-Bereich. Vorher wird der aktive Bereich deterministisch auf `identitaet` gesetzt —
   ein Bereich, der NICHT zur Lage gehört, damit ein Streufehler sichtbar dort landet und nicht
   zufällig in einer der drei Heimaten. Speichern über den echten DOM-Lese-Fold. */
async function fuelleLageDrei(page) {
  await page.evaluate(() => window.__vdOeffentlich.oeffneSektor('identity'));          // aktiverSektorId = identitaet (lage-fremd)
  await page.evaluate(() => window.__vdOeffentlich.oeffneLebenslage('pflegebeduerftigkeit'));
  await page.waitForSelector('[data-lage-sektor="people"]');
  await page.fill('[data-lage-sektor="socialInsurance"] [data-edit="careContractStorageLocation"]', 'Ordner Pflege, Fach 2');
  await page.fill('[data-lage-sektor="advanceCare"] [data-edit="aidsEGWalkerHearingAid"]', 'Rollator, Pflegebett');
  await page.fill('[data-lage-sektor="people"] [data-edit="careLeaveFamilyCareLeave"]', 'Tochter, zwei Tage die Woche');
  await page.evaluate(() => window.__vdOeffentlich.bearbeitungSpeichern());
  return page.evaluate(() => ({
    soz: (window.__vdOeffentlich.ankerDaten().sektoren['socialInsurance'] || {}).careContractStorageLocation,
    vor: (window.__vdOeffentlich.ankerDaten().sektoren['advanceCare'] || {}).aidsEGWalkerHearingAid,
    men: (window.__vdOeffentlich.ankerDaten().sektoren['people'] || {}).careLeaveFamilyCareLeave,
    aktiv: window.__vdOeffentlich.aktiverSektorId,
    aktivStreu: (window.__vdOeffentlich.ankerDaten().sektoren[window.__vdOeffentlich.aktiverSektorId] || {}).careContractStorageLocation,   // Streu-Kontrolle
  }));
}

test('[A68] jedes Feld einer 3-Bereich-Lage landet in seinem HEIMAT-Bereich, nicht im aktiven', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  const r = await fuelleLageDrei(page);
  expect(r.soz, 'socialInsurance.careContractStorageLocation in seiner Heimat').toBe('Ordner Pflege, Fach 2');
  expect(r.vor, 'advanceCare.aidsEGWalkerHearingAid in seiner Heimat').toBe('Rollator, Pflegebett');
  expect(r.men, 'people.careLeaveFamilyCareLeave in seiner Heimat').toBe('Tochter, zwei Tage die Woche');
  expect(r.aktiv, 'der aktive Bereich ist lage-fremd (identitaet)').toBe('identity');
  expect(r.aktivStreu, 'KEINE Streu-Kopie im aktiven Bereich').toBeUndefined();
});

test('[A68·Rotmachbarkeit] ohne die Lage-Weiche landet alles im aktiven Bereich — der exakte Streufehler', async ({ page }) => {
  // Auf einer KOPIE gepflanzt (nie im Arbeitsbaum, Regel 18): die Routing-Weiche in
  // `bearbeitungSpeichern` entfernt. Dann fällt der Fold auf den `else`-Zweig (aktiverSektorId)
  // zurück — genau der A68-Streufehler, den der Fix beseitigt.
  const mutantDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-a68-streufehler-'));
  const mutant = path.join(mutantDir, 'kern-a68-streufehler.html');
  const src = fs.readFileSync(KERN, 'utf8');
  const weiche = "  if (aktiveAnsicht === 'lebenslage') return _lageBlattSpeichern();";
  expect(src.includes(weiche), 'Anker der Lage-Weiche gefunden (sonst umbenannt)').toBe(true);
  fs.writeFileSync(mutant, src.replace(weiche, "  // GEPFLANZT (Regel 18): Lage-Weiche entfernt → Streufehler"), 'utf8');
  try {
    await fsaAttrappeVorMutantNavigation(page);
    await page.goto('file://' + mutant);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await depotAnlegen(page);
    const r = await fuelleLageDrei(page);
    // Der Streufehler: die Heimat-Bereiche bleiben LEER, der Wert landet im aktiven Bereich.
    expect(r.men, 'Streufehler: people.careLeaveFamilyCareLeave erreicht seine Heimat NICHT').toBeUndefined();
    expect(r.soz, 'Streufehler: socialInsurance.careContractStorageLocation erreicht seine Heimat NICHT').toBeUndefined();
    expect(r.aktivStreu, 'Streufehler: der Wert landet stattdessen im aktiven Bereich').toBe('Ordner Pflege, Fach 2');
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
});

/* ── Listenfelder: der ZWEITE Schreibweg, den der Fold NICHT deckt ─────────────────────────
   Ein Listen-Eintrag läuft NICHT über `_faltContainer`, sondern über die je-Block verdrahteten
   `listenEintrag*(sek)`-Aufrufe (`verdrahteSektorEingaben(blk, sek, …)`). Die Tests oben decken
   nur den Fold; hier steht der Nachweis für Listen — dieselbe A64-Klasse (der Konsument bekommt
   sonst den falschen Namensraum). `eigene-vorsorge` (A50, ausgeliefert) trägt eine Liste in
   `vorsorge`, also ist es der echte Fall, nicht ein konstruierter. */
async function legeInstrumentAn(page) {
  await page.evaluate(() => window.__vdOeffentlich.oeffneSektor('identity'));         // aktiver Bereich lage-fremd
  await page.evaluate(() => window.__vdOeffentlich.oeffneLebenslage('eigene-vorsorge'));
  await page.waitForSelector('[data-lage-sektor="advanceCare"]');
  await page.click('[data-lage-sektor="advanceCare"] [data-eintrag-hinzufuegen="provisionInstruments"]');
  await page.waitForSelector('#modal-inhalt [data-edit="instrument"]');
  await page.selectOption('#modal-inhalt [data-edit="instrument"]', 'will');   // Typ wählen (löst die Gates)
  await page.fill('#modal-inhalt [data-edit="storageLocation"]', 'Ordner Vorsorge, Fach 1');
  await page.click('#m-ok');
  await page.waitForFunction(() => !document.querySelector('#modal-rueck.an')).catch(() => {});   // Modal-Host geschlossen
  return page.evaluate(() => ({
    heimat: ((window.__vdOeffentlich.ankerDaten().sektoren['advanceCare'] || {}).provisionInstruments || []).map((e) => e.instrument + '/' + (e.storageLocation || '')),
    aktiv: window.__vdOeffentlich.aktiverSektorId,
    aktivListe: ((window.__vdOeffentlich.ankerDaten().sektoren[window.__vdOeffentlich.aktiverSektorId] || {}).provisionInstruments || []).length,
  }));
}

test('[A68·Liste] ein Listen-Eintrag landet im HEIMAT-Bereich der Liste, nicht im aktiven', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  const r = await legeInstrumentAn(page);
  expect(r.heimat, 'das Instrument liegt in data.sektoren.advanceCare.provisionInstruments').toEqual(['will/Ordner Vorsorge, Fach 1']);
  expect(r.aktiv, 'der aktive Bereich ist lage-fremd (identitaet)').toBe('identity');
  expect(r.aktivListe, 'KEINE Liste im aktiven Bereich').toBe(0);
});

test('[A68·Liste·Rotmachbarkeit] wird die Liste mit dem aktiven statt dem Heimat-Bereich verdrahtet, landet der Eintrag falsch', async ({ page }) => {
  // Auf einer KOPIE gepflanzt (Regel 18): die Listen-Verdrahtung des Lage-Blatts bekommt statt des
  // Block-Bereichs (`sek`) den aktiven Bereich (`aktiverSektorId`). `sdef` bleibt korrekt, das Feld
  // wird also gefunden — nur `listenEintragHinzufuegen` bekommt den falschen Namensraum. Genau die
  // Klasse, die der Fold-Test NICHT sieht.
  const mutantDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-a68-liste-streu-'));
  const mutant = path.join(mutantDir, 'kern-a68-liste-streu.html');
  const src = fs.readFileSync(KERN, 'utf8');
  const echt = 'verdrahteSektorEingaben(blk, sek, sdef, darf);';
  expect(src.includes(echt), 'Anker der Lage-Listen-Verdrahtung gefunden (sonst umbenannt)').toBe(true);
  fs.writeFileSync(mutant, src.replace(echt, 'verdrahteSektorEingaben(blk, aktiverSektorId, sdef, darf);'), 'utf8');
  try {
    await fsaAttrappeVorMutantNavigation(page);
    await page.goto('file://' + mutant);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await depotAnlegen(page);
    const r = await legeInstrumentAn(page);
    expect(r.heimat, 'Streufehler: die Heimat-Liste (vorsorge) bleibt leer').toEqual([]);
    expect(r.aktivListe, 'Streufehler: der Eintrag landet im aktiven Bereich (identitaet)').toBe(1);
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
});
