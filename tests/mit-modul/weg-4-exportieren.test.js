'use strict';
/* ════════════════════════════════════════════════════════════════════════
   WEG 4 — Exportieren, durch die Oberfläche (Bürgerweg 4)
   ────────────────────────────────────────────────────────────────────────
   Die Export-Formate haben Prüfungen; der Weg, auf dem eine Bürgerin
   „herausgeben" wählt, den Umfang bestimmt und die Auswahl sieht, hatte keine.

   DER GEMESSENE WEG (Erkundung 28.07., `zustand-erkunden.js --wege`):
   `flowHerausgebenZentral()` öffnet einen Auswahl-Schirm — „Ganzes Depot" und
   je einen Bereich. Der Feld-für-Feld-Umfang mit `#export-alles` und den
   Kästchen `#exwahl_<bereich>__<feld>` liegt eine Stufe dahinter.

   WAS HIER NICHT GEPRÜFT WIRD, ausdrücklich: die erzeugte Datei. Das tut die
   Kampagne (Ebene 5, Round-Trip je Format). Hier geht es um den Weg dorthin —
   ob die Bürgerin ihn findet und ob sie sieht, was sie herausgibt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seiteMitDepot, wegLaeufer, knopfSichtbar, sichtbar } = require('../weg-hilfen.js');

const PW = 'Weg4-Bürgerweg-2026!';

async function wegGehen(seite) {
  const { schritt, protokoll } = wegLaeufer(seite, 4);

  await schritt('den Herausgeben-Weg oeffnen',
    async () => { await seite.evaluate(() => window.__vdOeffentlich.flowHerausgebenZentral()); await seite.waitForTimeout(350); },
    knopfSichtbar('/Ganzes Depot/i'),
    'ein Auswahl-Schirm mit „Ganzes Depot"');

  /* GEMESSEN (28.07., `--wege` mit Klickfolge): der BEREICHS-Knopf führt nicht
     zur Umfangs-Auswahl — nach ihm steht derselbe Schirm da, Felder 21 zu 21.
     Es ist „Ganzes Depot", hinter dem die Kästchen liegen. Die erste Fassung
     dieses Tests klickte den Bereich und brach hier; der Bruch war richtig. */
  await schritt('„Ganzes Depot" zum Herausgeben waehlen',
    async () => {
      await seite.evaluate(() => {
        const k = [...document.querySelectorAll('button')]
          .filter((b) => b.getBoundingClientRect().width > 0)
          .find((b) => /^\s*Ganzes Depot\s*$/.test(b.textContent || ''));
        if (!k) throw new Error('der Knopf „Ganzes Depot" fehlt im Auswahl-Schirm');
        k.click();
      });
      await seite.waitForTimeout(450);
    },
    sichtbar('#export-alles'),
    'die Umfangs-Auswahl mit „Alles auswählen"');

  await schritt('sehen, WAS herausgegeben wird — Feld fuer Feld',
    async () => { await seite.waitForTimeout(100); },
    () => {
      const k = [...document.querySelectorAll('input[type=checkbox][id^="exwahl_"]')];
      if (!k.length) return false;
      // Jedes Kaestchen traegt einen zugaenglichen Namen — sonst waere die
      // Auswahl fuer eine Vorleserin eine Reihe namenloser Schalter.
      return k.every((e) => (e.getAttribute('aria-label') || '').trim().length > 0);
    },
    'Kästchen je Feld, jedes mit zugänglichem Namen („Mitgeben: …")');

  return protokoll;
}

test('[Weg 4] Exportieren — Bereich waehlen, Umfang sehen', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite, fehler } = await seiteMitDepot(browser, PW);
    const protokoll = await wegGehen(seite);
    assert.equal(protokoll.length, 3);
    assert.ok(protokoll.every((x) => x.erreicht));
    assert.deepEqual(fehler, [], 'kein JavaScript-Fehler auf dem Weg');
  } finally { await browser.close(); }
});

test('[Weg 4·Positivkontrolle] ohne den Auswahl-Schirm bricht der Weg mit der erwarteten Meldung', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => { window.__vdOeffentlich.flowHerausgebenZentral = () => {}; });
    await assert.rejects(() => wegGehen(seite), (e) => {
      assert.equal(e.name, 'WegBruch');
      assert.match(e.message, /WEG 4 BRICHT BEI: den Herausgeben-Weg oeffnen/);
      return true;
    });
  } finally { await browser.close(); }
});

test('[Weg 4·Negativkontrolle] eine unbeteiligte Aenderung bricht den Weg nicht', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => { const f = document.querySelector('.app-fuss'); if (f) f.remove(); });
    const protokoll = await wegGehen(seite);
    assert.ok(protokoll.every((x) => x.erreicht), 'die Fusszeile geht den Export nichts an');
  } finally { await browser.close(); }
});
