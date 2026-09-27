'use strict';
/* ════════════════════════════════════════════════════════════════════════
   WEG 6 — Ein Depot für jemand anderen anlegen und abgeben (Bürgerweg 6)
   ────────────────────────────────────────────────────────────────────────
   Der Kern dieses Wegs ist über Ebene 13b der Kampagne geprüft: exportieren,
   aushängen, gesperrte Wiederaufnahme, Datei danach weiterhin lesbar. Was
   nicht geprüft war, ist der Weg dorthin — ob eine Bürgerin ihn findet und
   ob sie beim Anlegen erfährt, WORAUF sich die Vertretung stützt.

   DER GEMESSENE WEG (Erkundung 28.07. mit Klickfolge): `flowSubDepotNachAnker()`
   fragt zuerst zurück („Ja, anlegen"), und erst danach steht das Formular da —
   `#id-vorname`, `#sub-grundlage` („Grundlage der Vertretung"), `#id-pw`,
   `#id-pw2`.

   DIE RÜCKFRAGE IST TEIL DES WEGS, nicht davor. Ein Depot für eine andere
   Person entsteht nicht versehentlich; der Test prüft, dass gefragt wird.

   BENANNTE GRENZE: geprüft wird bis zum ausgefüllten Formular. Das Abgeben
   selbst — Aushängen, Sperre, Datei — liegt bei Ebene 13b und wird hier nicht
   doppelt gefahren. Zwei Prüfungen derselben Sache laufen auseinander.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seiteMitDepot, wegLaeufer, knopfSichtbar, sichtbar } = require('../weg-hilfen.js');

const PW = 'Weg6-Bürgerweg-2026!';
const SUB_PW = 'Heinrichs-Wort-2026!';

async function wegGehen(seite) {
  const { schritt, protokoll } = wegLaeufer(seite, 6);

  await schritt('den Weg zum Depot fuer jemand anderen oeffnen',
    async () => { await seite.evaluate(() => window.__vdOeffentlich.flowSubDepotNachAnker()); await seite.waitForTimeout(400); },
    knopfSichtbar('/Ja, anlegen/i'),
    'eine Rückfrage mit „Ja, anlegen"');

  await schritt('die Rueckfrage bejahen',
    async () => {
      await seite.evaluate(() => {
        const k = [...document.querySelectorAll('button')]
          .filter((b) => b.getBoundingClientRect().width > 0)
          .find((b) => /Ja, anlegen/i.test(b.textContent || ''));
        if (!k) throw new Error('der Knopf „Ja, anlegen" ist fort');
        k.click();
      });
      await seite.waitForTimeout(500);
    },
    sichtbar('#sub-grundlage'),
    'das Formular mit der „Grundlage der Vertretung"');

  await schritt('erfahren, WORAUF sich die Vertretung stuetzt',
    async () => { await seite.waitForTimeout(50); },
    () => {
      const s = document.querySelector('#sub-grundlage');
      if (!s || !s.options) return false;
      // Nicht nur „das Feld ist da": es muss echte Grundlagen zur Wahl stellen,
      // nicht bloss einen Platzhalter.
      const echte = [...s.options].filter((o) => o.value && !/bitte wählen/i.test(o.textContent || ''));
      return echte.length >= 2;
    },
    'eine Auswahl mit mindestens zwei benannten Grundlagen');

  await schritt('das Formular ausfuellen',
    async () => {
      await seite.fill('#id-vorname', 'Heinrich');
      await seite.fill('#id-pw', SUB_PW);
      await seite.fill('#id-pw2', SUB_PW);
      await seite.evaluate(() => {
        const s = document.querySelector('#sub-grundlage');
        const o = [...s.options].find((x) => x.value && !/bitte wählen/i.test(x.textContent || ''));
        s.value = o.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await seite.waitForTimeout(150);
    },
    () => {
      const v = document.querySelector('#id-vorname'), g = document.querySelector('#sub-grundlage');
      return !!v && !!g && v.value === 'Heinrich' && !!g.value;
    },
    'Name, Passwort und Grundlage stehen im Formular');

  return protokoll;
}

test('[Weg 6] Depot fuer jemand anderen — Rueckfrage, Grundlage, Formular', async () => {
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

test('[Weg 6·Positivkontrolle] ohne die Rueckfrage bricht der Weg mit der erwarteten Meldung', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => { window.__vdOeffentlich.flowSubDepotNachAnker = () => {}; });
    await assert.rejects(() => wegGehen(seite), (e) => {
      assert.equal(e.name, 'WegBruch');
      assert.match(e.message, /WEG 6 BRICHT BEI: den Weg zum Depot fuer jemand anderen oeffnen/);
      return true;
    });
  } finally { await browser.close(); }
});

test('[Weg 6·Positivkontrolle] eine Grundlagen-Auswahl OHNE Grundlagen wird gemeldet', async () => {
  /* Der Fall, den ein blosses „das Feld ist da" durchliesse: eine Auswahl, in
     der nur noch der Platzhalter steht. Die Bürgerin sähe ein Pflichtfeld ohne
     wählbaren Inhalt. */
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => {
      const beobachter = new MutationObserver(() => {
        const s = document.querySelector('#sub-grundlage');
        if (s && s.options.length > 1) { while (s.options.length > 1) s.remove(1); }
      });
      beobachter.observe(document.body, { childList: true, subtree: true });
    });
    await assert.rejects(() => wegGehen(seite), (e) => {
      assert.match(e.message, /WEG 6 BRICHT BEI: erfahren, WORAUF sich die Vertretung stuetzt/);
      return true;
    });
  } finally { await browser.close(); }
});

test('[Weg 6·Negativkontrolle] eine unbeteiligte Aenderung bricht den Weg nicht', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteMitDepot(browser, PW);
    await seite.evaluate(() => { const f = document.querySelector('.app-fuss'); if (f) f.remove(); });
    const protokoll = await wegGehen(seite);
    assert.ok(protokoll.every((x) => x.erreicht), 'die Fusszeile geht das Abgeben nichts an');
  } finally { await browser.close(); }
});
