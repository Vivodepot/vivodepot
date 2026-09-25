'use strict';
/* ════════════════════════════════════════════════════════════════════════
   WEG 7 — Ein vorhandenes Depot wiederfinden (Bürgerweg 7)
   ────────────────────────────────────────────────────────────────────────
   Der häufigste Weg überhaupt: eine Bürgerin kommt zum zweiten Mal. Sie hat
   eine Datei und ein Passwort, und sie muss beides zusammenbringen, bevor
   irgendetwas anderes geht. Bricht dieser Weg, ist das Depot fort — es gibt
   keine Kopie auf einem Server, keine Wiederherstellung über eine E-Mail.

   DER GEMESSENE EINSTIEG (Erkundung 28.07.): kein Flow, ein KNOPF —
   `#w-datei` auf dem Startbildschirm, „Schon ein Vivodepot? Datei öffnen".
   Meine erste Annahme suchte nach einer `flow*`-Funktion und lag falsch;
   die Erkundung hat es entschieden.

   DIE PROBE-DATEI IST EIN ECHTES DEPOT, über den Kern erzeugt und
   verschlüsselt. Eine erfundene Datei prüfte den Erkenner, nicht den Weg.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { seiteAmStart, wegLaeufer, sichtbar } = require('../weg-hilfen.js');

const DEPOT_PW = 'Weg7-Wiederfinden-2026!';
const MARKER = 'Wiederfinden-4711';

/** Ein echtes, verschlüsseltes Depot als Datei — über den Kern, nicht erfunden. */
async function depotDatei() {
  const { ladeKern } = require('../load-kern.js');
  const { V } = ladeKern();
  await V.depotAnlegen(DEPOT_PW);
  V.akteurSelbstErklaeren('Marlies');
  V.sektorFeldSetzen('identity', 'givenName', 'Marlies');
  V.sektorFeldSetzen('identity', 'familyName', MARKER);
  const umschlag = await V.depotSerialisieren(DEPOT_PW);
  const datei = path.join(os.tmpdir(), 'vd-weg7-' + process.pid + '.vivodepot.json');
  fs.writeFileSync(datei, JSON.stringify(umschlag));
  return datei;
}

async function wegGehen(seite, dateipfad) {
  const { schritt, protokoll } = wegLaeufer(seite, 7);

  await schritt('„Schon ein Vivodepot? Datei oeffnen" finden und druecken',
    async () => { await seite.click('#w-datei'); await seite.waitForTimeout(400); },
    () => [...document.querySelectorAll('input[type=file]')]
      .some((f) => f.getBoundingClientRect().width > 0 || f.offsetParent !== null)
      || !!document.querySelector('input[type=file]'),
    'ein Datei-Feld, über das die Bürgerin ihr Depot übergeben kann');

  await schritt('die Depot-Datei uebergeben',
    async () => {
      const f = await seite.$('input[type=file]');
      if (!f) throw new Error('kein Datei-Feld auf der Seite');
      await f.setInputFiles(dateipfad);
      await seite.waitForTimeout(600);
    },
    () => {
      const f = document.querySelector('input[type=file]');
      return !!f && f.files && f.files.length === 1;
    },
    'die Datei hängt am Feld');

  await schritt('nach dem Passwort gefragt werden',
    async () => { await seite.waitForTimeout(400); },
    () => [...document.querySelectorAll('input[type=password]')]
      .some((e) => e.getBoundingClientRect().width > 0),
    'ein sichtbares Passwortfeld — ohne Passwort geht das Depot nicht auf');

  return protokoll;
}

test('[Weg 7] Wiederfinden — Datei oeffnen, nach dem Passwort gefragt werden', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let datei = null;
  try {
    datei = await depotDatei();
    const { seite, fehler } = await seiteAmStart(browser);
    const protokoll = await wegGehen(seite, datei);
    assert.equal(protokoll.length, 3);
    assert.ok(protokoll.every((x) => x.erreicht));
    assert.deepEqual(fehler, [], 'kein JavaScript-Fehler auf dem Weg');
  } finally {
    await browser.close();
    if (datei && fs.existsSync(datei)) fs.unlinkSync(datei);
  }
});

test('[Weg 7·Positivkontrolle] ohne den Knopf bricht der Weg mit der erwarteten Meldung', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let datei = null;
  try {
    datei = await depotDatei();
    const { seite } = await seiteAmStart(browser);
    await seite.evaluate(() => { const k = document.querySelector('#w-datei'); if (k) k.remove(); });
    await assert.rejects(() => wegGehen(seite, datei), (e) => {
      assert.equal(e.name, 'WegBruch');
      assert.match(e.message, /WEG 7 BRICHT BEI: „Schon ein Vivodepot\? Datei oeffnen" finden/);
      return true;
    });
  } finally {
    await browser.close();
    if (datei && fs.existsSync(datei)) fs.unlinkSync(datei);
  }
});

test('[Weg 7·Positivkontrolle] ein Depot ohne Passwortfrage waere ein Bruch', async () => {
  /* Der Fall, der still passieren könnte: die Datei wird angenommen und das
     Depot geht ohne Passwort auf. Die Prüfung muss ihn sehen — sonst wäre sie
     von einer, die nur „Datei angekommen" misst, nicht zu unterscheiden. */
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let datei = null;
  try {
    datei = await depotDatei();
    const { seite } = await seiteAmStart(browser);
    await seite.evaluate(() => {
      const beobachter = new MutationObserver(() => {
        for (const e of document.querySelectorAll('input[type=password]')) e.style.display = 'none';
      });
      beobachter.observe(document.body, { childList: true, subtree: true, attributes: true });
    });
    await assert.rejects(() => wegGehen(seite, datei), (e) => {
      assert.match(e.message, /WEG 7 BRICHT BEI: nach dem Passwort gefragt werden/);
      return true;
    });
  } finally {
    await browser.close();
    if (datei && fs.existsSync(datei)) fs.unlinkSync(datei);
  }
});

test('[Weg 7·Negativkontrolle] eine unbeteiligte Aenderung bricht den Weg nicht', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let datei = null;
  try {
    datei = await depotDatei();
    const { seite } = await seiteAmStart(browser);
    await seite.evaluate(() => { const f = document.querySelector('.app-fuss'); if (f) f.remove(); });
    const protokoll = await wegGehen(seite, datei);
    assert.ok(protokoll.every((x) => x.erreicht), 'die Fusszeile geht das Wiederfinden nichts an');
  } finally {
    await browser.close();
    if (datei && fs.existsSync(datei)) fs.unlinkSync(datei);
  }
});
