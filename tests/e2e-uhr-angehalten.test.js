'use strict';
/* Uhr angehalten, bevor eine E2E-Spec sie vorstellt (03.10.2026, erster Lauf der E2E-Strecke auf dem eigenen Runner).
   Nach page.clock.install() läuft die Uhr in Echtzeit weiter (Playwright, clock.install). Wer danach mit runFor oder
   fastForward vorstellt, addiert die echte Laufzeit der Prüfungen dazu: auf einem belasteten Rechner schaltete die
   Vorführung vor der Prüfung weiter (vorfuehrung-notiz-axe, Station 6 zeigte den Text von Station 7). Grün war das bis
   dahin nur, weil der Arbeitsrechner schnell genug war.
   Regel je Test: wer install() und runFor/fastForward benutzt, hält die Uhr VOR dem ersten Vorstellen an — pauseAt oder
   setFixedTime. Statisch über den Text; ein Test ist der Abschnitt ab einem test(-Aufruf bis zum nächsten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ORDNER = path.join(__dirname, 'e2e');

function testAbschnitte(text) {
  const starts = [...text.matchAll(/\btest(?:\.(?:only|skip|fixme))?\(\s*['"`]/g)].map((m) => m.index);
  if (!starts.length) return [text];
  return starts.map((s, i) => text.slice(s, starts[i + 1] === undefined ? text.length : starts[i + 1]));
}

function uhrVerstoesse(text, datei) {
  const fehler = [];
  for (const abschnitt of testAbschnitte(text)) {
    if (!/\.clock\.install\(/.test(abschnitt)) continue;
    const vor = abschnitt.search(/\.clock\.(runFor|fastForward)\(/);
    if (vor < 0) continue;
    const halt = abschnitt.search(/\.clock\.(pauseAt|setFixedTime)\(/);
    if (halt < 0 || halt > vor) {
      const name = (abschnitt.match(/test(?:\.\w+)?\(\s*(['"`])(.*?)\1/) || [])[2] || '?';
      fehler.push(datei + ': „' + name.slice(0, 80) + '“ stellt die Uhr vor, ohne sie vorher anzuhalten (pauseAt/setFixedTime)');
    }
  }
  return fehler;
}

test('[E2E·Uhr] jede Spec, die die Uhr vorstellt, hält sie vorher an', () => {
  const fehler = [];
  for (const f of fs.readdirSync(ORDNER).filter((n) => n.endsWith('.spec.js')).sort()) {
    fehler.push(...uhrVerstoesse(fs.readFileSync(path.join(ORDNER, f), 'utf8'), 'tests/e2e/' + f));
  }
  assert.deepEqual(fehler, []);
});

test('[E2E·Uhr·Rot-Beweis] ohne Anhalten und mit Anhalten erst nach dem Vorstellen: rot; angehalten oder ohne Vorstellen: grün', () => {
  const ohne = "test('a', async ({ page }) => { await page.clock.install(); await page.goto(u); await page.clock.runFor(8000); });";
  const spaet = "test('b', async ({ page }) => { await page.clock.install(); await page.clock.fastForward(10); await page.clock.pauseAt(1); });";
  const gut = "test('c', async ({ page }) => { await page.clock.install(); await page.clock.pauseAt(1); await page.clock.runFor(8000); });";
  const fest = "test('d', async ({ page }) => { await page.clock.install(); await page.clock.setFixedTime(1); await page.clock.runFor(1); });";
  const still = "test('e', async ({ page }) => { await page.clock.install(); await page.goto(u); });";
  assert.equal(uhrVerstoesse(ohne, 'x').length, 1);
  assert.equal(uhrVerstoesse(spaet, 'x').length, 1);
  assert.deepEqual(uhrVerstoesse(gut + fest + still, 'x'), []);
  // Je Test, nicht je Datei: ein angehaltener Test deckt den Nachbarn nicht.
  assert.equal(uhrVerstoesse(gut + '\n' + ohne, 'x').length, 1);
});
