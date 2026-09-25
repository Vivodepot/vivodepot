'use strict';
/* ════════════════════════════════════════════════════════════════════════
   WEG 5 — Jemandem Zugang für den Ernstfall geben (Bürgerweg 5)
   ────────────────────────────────────────────────────────────────────────
   Der Weg, auf dem eine Bürgerin jemandem Zugang für den Ernstfall gibt.
   Der Kern dazu ist geprüft; die Bedienung war es nicht.

   UMGESCHRIEBEN AM 21.08.2026 (F5 Zug 2). Bis dahin lief er über
   `flowVertrauenspersonEinrichten()` und die Angehörigen-Abschrift. Die ist
   entfallen; derselbe Weg läuft heute über das FACH eines Empfängerkreises
   (`flowEmpfaengerkreisFach`, U2-ADR-156) — dieselben drei Felder, dasselbe
   Ortsfeld, dieselbe Bestätigung mit `#m-ok`.

   DAS ORTSFELD IST DER GRUND, WARUM DIESER WEG WICHTIG IST. Ein zweites
   Passwort, das nirgends physisch liegt, ist im Ernstfall keins —
   und niemand ausser der Bürgerin kann es wiederherstellen. Der Weg prüft
   deshalb, dass das Feld auf dem Weg auch WIRKLICH DASTEHT, nicht nur, dass
   der Dialog aufgeht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seiteMitDepot, wegLaeufer, sichtbar } = require('../weg-hilfen.js');

const PW = 'Weg5-Bürgerweg-2026!';
const FACH_PW = 'Fach-Wort-2026!';
const ORT = 'Umschlag im Ordner „Wichtiges", Regal links';

async function wegGehen(seite) {
  const { schritt, protokoll } = wegLaeufer(seite, 5);

  await schritt('den Weg zum Fach oeffnen',
    async () => {
      await seite.evaluate(() => { try { window.__vdOeffentlich.oeffneSektor('meine-menschen'); } catch (_) { /* Bereich fehlt */ } });
      await seite.waitForTimeout(150);
      /* Ein Empfängerkreis muss stehen, bevor er ein Fach bekommen kann — das ist die Bedienung,
         kein Umweg: das Fach gehört einem benannten Menschen, nicht dem Depot. */
      await seite.evaluate(async () => {
        await window.__vdOeffentlich.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: ['notfall'] });
        window.__vdOeffentlich.flowEmpfaengerkreisFach(window.__vdOeffentlich.empfaengerkreiseListe()[0].id);
      });
      await seite.waitForTimeout(400);
    },
    sichtbar('#kreis-fach-pw'),
    'das Feld für das Fach-Passwort');

  await schritt('nach dem AUFBEWAHRUNGSORT gefragt werden',
    async () => { await seite.waitForTimeout(50); },
    () => {
      /* DER ZUGAENGLICHE NAME, wie eine Vorleserin ihn bildet — nicht nur
         `aria-label`. Die erste Fassung fragte allein danach und brach: der
         Name kommt hier aus einem <label for>. Ein Test, der nur eine der
         beiden Quellen kennt, meldet einen Mangel, den es nicht gibt. */
      const e = document.querySelector('#kreis-fach-ort');
      if (!e || e.getBoundingClientRect().width === 0) return false;
      const beschriftung = document.querySelector('label[for="kreis-fach-ort"]');
      const name = (e.getAttribute('aria-label') || '') + ' ' +
                   (beschriftung ? beschriftung.textContent : '');
      return /physisch|hinterlegt|aufbewahr|wo ist/i.test(name);
    },
    'ein Feld, das nach dem physischen Aufbewahrungsort fragt');

  await schritt('Passwort und Ort eintragen',
    async () => {
      await seite.fill('#kreis-fach-pw', FACH_PW);
      await seite.fill('#kreis-fach-pw2', FACH_PW);
      await seite.fill('#kreis-fach-ort', ORT);
      await seite.waitForTimeout(120);
    },
    () => {
      const pw = document.querySelector('#kreis-fach-pw'), ort = document.querySelector('#kreis-fach-ort');
      return !!pw && !!ort && pw.value.length > 0 && ort.value.length > 0;
    },
    'die Eingaben stehen in den Feldern');

  await schritt('die Einrichtung bestaetigen',
    async () => {
      await seite.evaluate(() => {
        const k = document.querySelector('#m-ok');
        if (!k) throw new Error('kein Bestätigungsknopf #m-ok');
        k.click();
      });
      await seite.waitForTimeout(600);
    },
    () => {
      const e = document.querySelector('#kreis-fach-pw');
      return !e || e.getBoundingClientRect().width === 0;
    },
    'der Dialog ist zu — die Einrichtung wurde angenommen');

  return protokoll;
}

test('[Weg 5] ein Fach einrichten — Passwort, Ort, Bestaetigung', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite, fehler } = await seiteMitDepot(browser, PW);
    const protokoll = await wegGehen(seite);
    assert.equal(protokoll.length, 4);
    assert.ok(protokoll.every((x) => x.erreicht));
    assert.deepEqual(fehler, [], 'kein JavaScript-Fehler auf dem Weg');
  } finally { await browser.close(); }
});

test('[Weg 5·Positivkontrolle] ohne den Dialog bricht der Weg mit der erwarteten Meldung', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => { window.__vdOeffentlich.flowEmpfaengerkreisFach = () => {}; });
    await assert.rejects(() => wegGehen(seite), (e) => {
      assert.equal(e.name, 'WegBruch');
      assert.match(e.message, /WEG 5 BRICHT BEI: den Weg zum Fach oeffnen/);
      return true;
    });
  } finally { await browser.close(); }
});

test('[Weg 5·Positivkontrolle] ein Ortsfeld OHNE zugaenglichen Namen wird gemeldet', async () => {
  /* Nicht die Abwesenheit des Feldes, sondern der Verlust seines Namens: für
     eine Vorleserin ist ein namenloses Textfeld dasselbe wie kein Feld. */
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => {
      const echt = window.__vdOeffentlich.flowEmpfaengerkreisFach;
      window.__vdOeffentlich.flowEmpfaengerkreisFach = (id) => {
        echt(id);
        const e = document.querySelector('#kreis-fach-ort');
        if (e) e.removeAttribute('aria-label');
        const b = document.querySelector('label[for="kreis-fach-ort"]');
        if (b) b.textContent = '';
      };
    });
    await assert.rejects(() => wegGehen(seite), (e) => {
      assert.match(e.message, /WEG 5 BRICHT BEI: nach dem AUFBEWAHRUNGSORT gefragt werden/);
      return true;
    });
  } finally { await browser.close(); }
});

test('[Weg 5·Negativkontrolle] eine unbeteiligte Aenderung bricht den Weg nicht', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => { const f = document.querySelector('.app-fuss'); if (f) f.remove(); });
    const protokoll = await wegGehen(seite);
    assert.ok(protokoll.every((x) => x.erreicht), 'die Fusszeile geht die Vertrauensperson nichts an');
  } finally { await browser.close(); }
});
