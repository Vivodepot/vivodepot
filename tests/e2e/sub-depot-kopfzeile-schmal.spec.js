'use strict';
/* Sub-Depot-Kopfzeile bei 390 px (Befund SUBDEPOT-KOPF-390, MITTEL, 05.11.2026): Im geöffneten Sub-Depot brach der Hinweis
   „Geöffnet: <Name>“ in der Kopfzeile auf drei Zeilen um, statt über die Engstufen (tb-eng-1/-2) zu kürzen. Die Engstufen messen
   Überlauf; ein umbrechender Text läuft nicht über, darum griffen sie nicht.
   So soll es sein: die Kopfzeile ist im Sub-Depot so hoch wie im eigenen Depot, und kein Element darin steht über mehr als eine Zeile.
   Klasse: jedes Kind der Kopfzeile, nicht nur der Sub-Hinweis — ein neuer Text in der Kopfzeile fällt unter dieselbe Prüfung.
   Rot-Beweis: der Stand vor dem Fix (Wagen-Basis) meldet den Sub-Hinweis mit drei Zeilen.
   Nachtrag GL 05.11.2026: bei 390 px fehlte danach der Name ganz, im Kopf standen zwei gleiche Tonpunkte ohne Wort. Soll: die Pille
   „Mein Depot“ behält ihren eigenen Punkt; daneben einzeilig „● <Name>“ im Ton, nur „Geöffnet:“ entfällt, ein langer Name endet auf „…“.
   Nachtrag GL 05.11.2026 (2): Bleibt vom Namen nur ein Rest wie „So…“ (360 px), steht nur der Tonpunkt; der volle Name als title. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const PW = 'e2e-passwort-123';

/* Kinder der Kopfzeile, deren sichtbarer Text über mehr als eine Zeile läuft (Höhe > 1,5 Zeilenhöhen). */
const mehrzeilig = () => [...document.querySelectorAll('.topbar *')].filter((el) => {
  if (!el.offsetParent || !el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return false;
  const cs = getComputedStyle(el); const zeile = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
  return el.getBoundingClientRect().height > zeile * 1.5;
}).map((el) => (el.id || el.className || el.tagName) + ': ' + el.textContent.trim());

for (const breite of [390, 360, 320]) {
  test(`Sub-Depot-Kopfzeile bei ${breite} px: einzeilig und so hoch wie im eigenen Depot`, async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: breite, height: 844 });
    await oeffneApp(page);
    await depotAnlegen(page, { pw: PW });
    const hoeheEigen = await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height);
    await page.evaluate(async (pw) => {
      const e = await window.__vdOeffentlich.subDepotAnlegen({ bezeichnung: 'Mama', inhaberin: 'Sophie Beispiel', verwaltungsTyp: 'verwaltet', akzent: 'malve' }, pw);
      await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
      window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
    }, PW);
    await page.waitForTimeout(400);
    expect(await page.evaluate(mehrzeilig), 'kein Text der Kopfzeile bricht um').toEqual([]);
    const hoeheSub = await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height);
    expect(Math.abs(hoeheSub - hoeheEigen), 'die Kopfzeile ist im Sub-Depot so hoch wie im eigenen Depot').toBeLessThanOrEqual(1);
    const kopf = await page.evaluate(() => {
      const name = document.getElementById('tb-sub-name');
      const sichtbar = (el) => !!(el && el.offsetParent && el.getBoundingClientRect().width > 0);
      const praefix = document.getElementById('tb-sub-praefix');
      const farbe = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor;
      return { nameSichtbar: sichtbar(name), nameBreite: name ? Math.round(name.getBoundingClientRect().width) : 0,
        praefixSichtbar: sichtbar(praefix), innerText: name ? name.innerText : '',
        eigenerPunkt: farbe('.dp-punkt'), subPunkt: farbe('.tb-sub-punkt'),
        punktSichtbar: sichtbar(document.querySelector('.tb-sub-punkt')), titel: document.querySelector('.tb-sub-hinweis').getAttribute('title') || '',
        meinDepot: document.getElementById('tb-depot-name').innerText,
        nameSchrift: name ? parseFloat(getComputedStyle(name).fontSize) : 0, nurPunkt: document.querySelector('.topbar').classList.contains('tb-eng-nur-punkt') };
    });
    expect(kopf.punktSichtbar, 'der Tonpunkt des geöffneten Depots steht im Kopf').toBe(true);
    expect(kopf.titel, 'der volle Name steht am Hinweis als title').toContain('Sophie Beispiel');
    expect(kopf.meinDepot, '„Mein Depot“ bleibt voll, es ist das Ziel des Rückwegs').toBe('Mein Depot');
    // GL 05.11.2026: entweder steht der Name lesbar (mindestens 3 em, sonst bliebe nur ein Rest wie „So…“), oder nur der Tonpunkt.
    if (kopf.nameSichtbar) {
      expect(kopf.nameBreite, 'kein Namensrest wie „So…“ neben dem Tonpunkt').toBeGreaterThanOrEqual(3 * kopf.nameSchrift - 1);
      expect(kopf.innerText, 'nur der Name, ohne „Geöffnet:“').toBe('Sophie Beispiel');
    } else {
      expect(kopf.nurPunkt, 'ohne Namen steht die Kopfzeile in der Stufe „nur der Tonpunkt“').toBe(true);
    }
    expect(kopf.praefixSichtbar, '„Geöffnet:“ entfällt eng').toBe(false);
    expect(kopf.eigenerPunkt, 'die Pille „Mein Depot“ behält ihren eigenen Punkt, nicht den Ton des fremden Depots').not.toBe(kopf.subPunkt);
    const gewicht = await page.evaluate(() => { const g = () => getComputedStyle(document.querySelector('.tb-sub-hinweis')).fontWeight;
      const hell = g(); document.documentElement.classList.add('dark-mode'); const nacht = g(); document.documentElement.classList.remove('dark-mode'); return { hell, nacht }; });
    expect(gewicht.nacht, 'der Name steht in Nacht so stark wie in Hell (GL 05.11.2026)').toBe(gewicht.hell);
  });
}
