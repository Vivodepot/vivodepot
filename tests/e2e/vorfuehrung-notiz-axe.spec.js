'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Notiz der Vorführung, barrierefrei (30.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Erklärtext der Vorführung ist eine kleine gelbe Notiz ohne sichtbare Überschrift, angeheftet an das Element, von dem sie
   spricht. Probe an der Demo „Patientin“ (tools/vorfuehrung/patientin/): in jeder Station scannt axe die Notiz (WCAG 2.2 AA) —
   hier auch color-contrast hart, denn die Farben der Notiz sind neu und fest. Dazu: jede Station mit Anker hängt ihre Notiz
   wirklich an diesem Anker (das Element davor im Fluss ist der Anker), nicht an der Ausweich-Überschrift.
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
      await seite.clock.install();
      await seite.goto('file://' + datei);
      for (let i = 0; i < szenen.stationen.length; i++) {
        const st = szenen.stationen[i];
        await expect(seite.locator('.vorfuehrung-notiz .vorfuehrung-notiz-text'), 'Station ' + (i + 1)).toContainText(st.text.de.slice(0, 30));
        const ergebnis = await new AxeBuilder({ page: seite }).withTags(WCAG).include('.vorfuehrung-notiz').analyze();
        const hart = ergebnis.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(hart, 'Station ' + (i + 1) + ': ' + hart.map((v) => v.id + ': ' + v.help).join(' | ')).toEqual([]);
        expect(await unterDerNotiz(seite), 'Station ' + (i + 1) + ': die Notiz verdeckt keinen Text').toEqual([]);
        if (st.anker && st.anker.indexOf('feld:') !== 0) {
          const amAnker = await seite.evaluate((sel) => {
            const n = document.querySelector('.vorfuehrung-notiz');
            const vor = n && n.previousElementSibling;
            return !!(vor && vor.matches(sel));
          }, st.anker);
          expect(amAnker, 'Station ' + (i + 1) + ': die Notiz hängt an ' + st.anker).toBe(true);
        }
        await seite.clock.runFor(8100);
      }
    } finally { await kontext.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  });
}
