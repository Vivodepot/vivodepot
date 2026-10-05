'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Notiz der Vorführung, barrierefrei (30.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Erklärtext der Vorführung ist eine kleine gelbe Notiz ohne sichtbare Überschrift, angeheftet an das Element, von dem sie
   spricht. Probe an der Demo „Patientin“ (tools/vorfuehrung/patientin/): in jeder Station scannt axe die Notiz (WCAG 2.2 AA) —
   hier auch color-contrast hart, denn die Farben der Notiz sind neu und fest. Dazu: jede Station mit Anker hängt ihre Notiz
   wirklich an diesem Anker (der Block direkt nach ihr ist der Anker oder seine Zeile), nicht an der Ausweich-Überschrift.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WERKZEUG = require('../../tools/vorfuehrung-showcase-erzeugen.js');
const { unterDerNotiz } = require('./helpers.js');

const ORDNER = path.join(__dirname, '..', '..', 'tools', 'vorfuehrung', 'patientin');
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

function patientinDatei() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vorfuehrung-notiz-'));
  const produktText = fs.readFileSync(require('../produkt-html-erzeugen.js').produktHtml('privat-de'), 'utf8');
  const daten = JSON.parse(fs.readFileSync(path.join(ORDNER, 'showcase-depot.json'), 'utf8'));
  const szenen = JSON.parse(fs.readFileSync(path.join(ORDNER, 'showcase-szenen.json'), 'utf8'));
  const { text } = WERKZEUG.vorfuehrungDateiErzeugen({ sprache: 'de', produktText, daten, szenen, dokumentOrdner: ORDNER });
  const datei = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(datei, text, 'utf8');
  return { datei, dir, szenen };
}

for (const [name, viewport] of [['Desktop', { width: 1180, height: 820 }], ['Handy', { width: 390, height: 844 }]]) {
  test('[Vorführung·Notiz·axe] ' + name + ': in jeder Station der Demo „Patientin“ ist die Notiz ohne Verstoß, verdeckt nichts und hängt an ihrem Anker', async ({ browser }) => {
    const { datei, dir, szenen } = patientinDatei();
    const kontext = await browser.newContext({ viewport, hasTouch: name === 'Handy' });
    try {
      const seite = await kontext.newPage();
      // Die Uhr läuft nach install() in Echtzeit weiter (Playwright, clock.install). Auf einem belasteten Rechner summierten
      // sich die Sekunden der axe-Läufe zu einem festen runFor dazu, und die Vorführung sprang vor der Prüfung weiter (Air,
      // 03.10.2026: Station 6 zeigte schon den Text von Station 7). Darum steht die Uhr; sie läuft nur, solange axe prüft
      // (axe braucht setTimeout der Seite), und vorgestellt wird in kleinen Schritten bis zur nächsten Station, nicht um
      // feste 8,1 s — verlorene Zeit summiert sich so nicht über die Stationen.
      const notizText = seite.locator('.vorfuehrung-notiz .vorfuehrung-notiz-text');
      await seite.clock.install();
      await seite.goto('file://' + datei);
      await expect(notizText).toContainText(szenen.stationen[0].text.de.slice(0, 30));
      await seite.clock.pauseAt(await seite.evaluate(() => Date.now() + 50));
      for (let i = 0; i < szenen.stationen.length; i++) {
        const st = szenen.stationen[i];
        const soll = st.text.de.slice(0, 30);
        await expect(notizText, 'Station ' + (i + 1)).toContainText(soll);
        expect(await unterDerNotiz(seite), 'Station ' + (i + 1) + ': die Notiz verdeckt keinen Text').toEqual([]);
        if (st.anker && st.anker.indexOf('feld:') !== 0) {
          const amAnker = await seite.evaluate((sel) => {
            const n = document.querySelector('.vorfuehrung-notiz');
            // Die Notiz steht unmittelbar vor dem Block, der den Anker trägt (der Anker selbst oder die Zeile, in der er steht).
            const nach = n && n.nextElementSibling;
            return !!(nach && (nach.matches(sel) || nach.querySelector(sel)));
          }, st.anker);
          expect(amAnker, 'Station ' + (i + 1) + ': die Notiz hängt an ' + st.anker).toBe(true);
        }
        await seite.clock.resume();
        const ergebnis = await new AxeBuilder({ page: seite }).withTags(WCAG).include('.vorfuehrung-notiz').analyze();
        await seite.clock.pauseAt(await seite.evaluate(() => Date.now() + 200));
        expect(await notizText.textContent(), 'Station ' + (i + 1) + ': axe hat die Notiz dieser Station geprüft').toContain(soll);
        const hart = ergebnis.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(hart, 'Station ' + (i + 1) + ': ' + hart.map((v) => v.id + ': ' + v.help).join(' | ')).toEqual([]);
        if (i === szenen.stationen.length - 1) break;
        for (let t = 0; t < 40 && (await notizText.textContent()).includes(soll); t++) await seite.clock.runFor(250);
      }
    } finally { await kontext.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
