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
    const kopf = await page.evaluate(() => ({
      hinweisImDom: !!document.getElementById('tb-sub-hinweis'), subPunktImDom: !!document.querySelector('.tb-sub-punkt'),
      wechsler: document.getElementById('tb-depot-name').textContent,
      zurueckImMenue: !!document.getElementById('tb-depot-menue-zurueck'),
      kontextzeile: (document.getElementById('sub-kontext-text') || {}).textContent || '',
    }));
    expect(kopf.hinweisImDom, 'die Zeile „Geöffnet: <Name>“ neben dem Wechsler gibt es nicht mehr (Kopfleiste, U-2)').toBe(false);
    expect(kopf.subPunktImDom, 'kein zweiter Tonpunkt neben dem Wechsler').toBe(false);
    expect(kopf.wechsler, 'der Wechsler nennt die Person, auch bei schmaler Kopfzeile (die Kürzung leistet die Darstellung, nicht der Text)').toBe('Sophie Beispiel');
    expect(kopf.kontextzeile, 'die Kontextzeile sagt, wessen Depot offen ist').toContain('Sophie Beispiel');
    expect(kopf.zurueckImMenue, 'der Rückweg steht als Eintrag im Wechsler-Menü').toBe(true);
  });
}

/* Sub-Depot ohne Umfärbung (Umbau nach dem Desktop-Dummy, Wagen 1, Leitfaden 5.24): Im geöffneten Sub-Depot bleibt die Oberfläche Salbei.
   Die Person zeigt sich an drei Stellen: Farbkreis am Depot-Wechsler (Pille nennt ihren Namen), 3-px-Streifen oben an der Kopfzeile,
   Kontextzeile unter der Kopfzeile mit „Zurück zu Ihrem Depot“. Rot-Beweis: der Stand vor dem Wagen färbt Kopfzeile und Akzent um
   (`--vm-chrome` ≠ Salbei) und hat keine Kontextzeile. Bilder: Umgebungsvariable UMBAU_BILDER (Ordner), sonst keine. */
for (const [breite, hoehe] of [[1280, 800], [375, 812]]) {
  test(`Sub-Depot bei ${breite} px: Oberfläche bleibt Salbei, Person zeigt sich an Pille, Streifen und Kontextzeile`, async ({ page }) => {
    test.setTimeout(240000);
    await page.setViewportSize({ width: breite, height: hoehe });
    await oeffneApp(page);
    await depotAnlegen(page, { pw: PW });
    const farben = () => page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { chrome: cs.getPropertyValue('--vm-chrome').trim(), akzent: cs.getPropertyValue('--akzent').trim(),
        topbar: getComputedStyle(document.querySelector('.topbar')).backgroundColor };
    });
    const eigen = await farben();
    await page.evaluate(async (pw) => {
      const e = await window.__vdOeffentlich.subDepotAnlegen({ bezeichnung: 'Mama', inhaberin: 'Sophie Beispiel', verwaltungsTyp: 'verwaltet', akzent: 'malve' }, pw);
      await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
      window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
    }, PW);
    await page.waitForTimeout(500);
    const sub = await farben();
    expect(sub, 'keine Umfärbung: Kopfzeile, Akzent und Chrome-Variable bleiben wie im eigenen Depot').toEqual(eigen);
    const kopf = await page.evaluate(() => {
      const zeile = document.getElementById('sub-kontextzeile');
      const sichtbar = (el) => !!(el && el.offsetParent && el.getBoundingClientRect().width > 0);
      const kopfBox = document.querySelector('.topbar').getBoundingClientRect();
      const zeileBox = zeile.getBoundingClientRect();
      const person = getComputedStyle(document.documentElement).getPropertyValue('--person').trim();
      return { klasse: document.documentElement.classList.contains('sub-kontext'), person, zeileSichtbar: sichtbar(zeile),
        zeileText: zeile.textContent.replace(/\s+/g, ' ').trim(), kreis: document.getElementById('sub-kontext-kreis').textContent,
        unterKopf: Math.round(zeileBox.top - kopfBox.bottom), pille: document.getElementById('tb-depot-name').textContent,
        streifen: getComputedStyle(document.querySelector('.topbar')).boxShadow,
        punkt: getComputedStyle(document.querySelector('.dp-punkt')).backgroundColor,
        ueberlauf: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(kopf.klasse, 'html trägt sub-kontext').toBe(true);
    expect(kopf.person, '--person ist gesetzt').not.toBe('');
    expect(kopf.zeileSichtbar, 'Kontextzeile steht unter der Kopfzeile').toBe(true);
    expect(kopf.zeileText).toContain('Sophie Beispiel');
    expect(kopf.zeileText).toContain('Zurück zu Ihrem Depot');
    expect(kopf.kreis, 'Kreis zeigt die Initiale').toBe('S');
    expect(Math.abs(kopf.unterKopf), 'Kontextzeile schließt an die Kopfzeile an').toBeLessThanOrEqual(1);
    expect(kopf.pille, 'der Depot-Wechsler nennt die Person, nicht „Mein Depot“').toBe('Sophie Beispiel');
    expect(kopf.streifen, 'Streifen oben an der Kopfzeile').toContain('inset');
    expect(kopf.punkt, 'Farbkreis am Wechsler in der Personenfarbe').not.toBe(eigen.akzent);
    expect(kopf.ueberlauf, 'kein waagerechter Überlauf').toBeLessThanOrEqual(0);
    if (process.env.UMBAU_BILDER) await page.screenshot({ path: `${process.env.UMBAU_BILDER}/sub-depot-kontext-${breite}.png` });
    await page.click('#vm-zurueck');
    await page.waitForTimeout(600);
    const danach = await page.evaluate(() => ({ klasse: document.documentElement.classList.contains('sub-kontext'),
      zeileVersteckt: document.getElementById('sub-kontextzeile').hidden, text: document.getElementById('sub-kontext-text').textContent,
      pille: document.getElementById('tb-depot-name').textContent, person: getComputedStyle(document.documentElement).getPropertyValue('--person').trim() }));
    expect(danach, 'zurück im eigenen Depot: keine Person, keine Zeile, kein Name als Spur').toEqual({ klasse: false, zeileVersteckt: true, text: '', pille: 'Mein Depot', person: '' });
  });
}
