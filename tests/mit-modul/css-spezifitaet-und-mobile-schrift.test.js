'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zwei Lehren aus dem toten Token-Satz (27.07.2026, Posten 36)
   ────────────────────────────────────────────────────────────────────────
   Ein `@media (max-width: 760px)`-Block setzte sieben Token an `html`. Sie
   haben NIE gewirkt: `:root` ist eine Pseudoklasse (0-1-0), `html` ein
   Typselektor (0-0-1), und `@media` addiert nichts zur Spezifität. Die
   `:root`-Werte gewannen unabhängig von der Reihenfolge.

   Es fiel weder beim Lesen noch beim Testen auf — die Deklaration stand da
   und sah wirksam aus. Gefunden wurde es erst, als eine Messung über eine
   ECHTE Eigenschaft in px andere Zahlen lieferte als der Quelltext versprach.

   Dieser Test hält zweierlei:
     1. die Klasse — keine `html`-Regel, die `:root` schon setzt;
     2. die ENTSCHEIDUNG, die daraus folgte — mobile Schrift wird nicht
        verkleinert. Sie steht als Prüfung da, nicht als Kommentar.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { funde } = require('../../tools/css-tote-html-regeln.js');

const HTML_PATH = path.join(__dirname, '..', '..', 'vivodepot.html');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');

/* ── 1 · Die Klasse: tote html-Regeln ─────────────────────────────────── */
test('[Spezifitaet] keine Eigenschaft an `html`, die `:root` schon setzt', () => {
  assert.deepEqual(funde(HTML), [],
    'Diese Zeilen wirken NICHT — `:root` (0-1-0) ueberstimmt `html` (0-0-1), und eine\n' +
    '@media-Query addiert keine Spezifitaet. Sie sehen wirksam aus und sind es nicht.');
});

test('[Spezifitaet·Positivkontrolle] eine eingefuegte tote Regel wird gemeldet', () => {
  // Genau der Zustand, der bis zum 27.07. im 760er-Block stand.
  const mit = HTML.replace('@media (max-width: 760px) {',
    '@media (max-width: 760px) { html { --space-5: 1.1rem; }');
  const g = funde(mit);
  assert.equal(g.length, 1, 'die eingebaute tote Regel MUSS gemeldet werden');
  assert.match(g[0], /--space-5/, 'und zwar namentlich');
  assert.match(g[0], /0-1-0 gegen 0-0-1/, 'mit dem Grund, nicht nur mit dem Fund');
});

test('[Spezifitaet·Negativkontrolle] dieselbe Eigenschaft an `html` OHNE :root-Gegenstueck ist still', () => {
  // Ohne sie belegte die Positivkontrolle nur, dass der Detektor feuert — nicht,
  // dass er unterscheidet. Eine Pruefung, die jede `html`-Regel meldet, waere dort
  // ebenso gruen und hier unbrauchbar (§3.5d).
  const mit = HTML.replace('@media (max-width: 760px) {',
    '@media (max-width: 760px) { html { --gibt-es-nur-hier-4711: 1rem; }');
  assert.deepEqual(funde(mit), [],
    'eine Eigenschaft, die `:root` NICHT setzt, wird von `html` sehr wohl gesetzt — ' +
    'sie darf nicht als tot gemeldet werden');
});

/* ── 2 · Die Entscheidung: mobile Schrift wird nicht verkleinert ───────── */
const GRUND = 'Zielgruppe liest am Handy; mobile Schrift wird nicht verkleinert.';
const SCHRIFT_TOKEN = ['--fs-base', '--fs-lg', '--fs-xl', '--fs-2xl'];

async function schriftGroessen(html, breite) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: breite, height: 800 } });
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'vd-schrift-'));
  const tmp = path.join(tmpDir, `${breite}-${html.length}.html`);
  fs.writeFileSync(tmp, html);
  await seite.goto('file://' + tmp);
  const werte = await seite.evaluate((toks) => {
    const q = document.createElement('div');
    document.body.appendChild(q);
    const o = {};
    for (const t of toks) { q.style.fontSize = 'var(' + t + ')'; o[t] = parseFloat(getComputedStyle(q).fontSize); }
    q.remove(); return o;
  }, SCHRIFT_TOKEN);
  await browser.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return werte;
}

function kleinerAmHandy(mobil, breit) {
  return SCHRIFT_TOKEN.filter((t) => mobil[t] < breit[t])
    .map((t) => `${t}: ${mobil[t]}px bei 390 px gegen ${breit[t]}px bei 1200 px`);
}

test('[Mobile Schrift] keine Schriftgroesse ist am Handy kleiner als am Desktop', async () => {
  const kleiner = kleinerAmHandy(await schriftGroessen(HTML, 390), await schriftGroessen(HTML, 1200));
  assert.deepEqual(kleiner, [], GRUND + '\n  ' + kleiner.join('\n  '));
});

test('[Mobile Schrift·Positivkontrolle] eine eingebaute Verkleinerung faellt auf', async () => {
  const mit = HTML.replace('@media (max-width: 760px) {',
    '@media (max-width: 760px) { :root { --fs-base: 0.8rem; }');
  const kleiner = kleinerAmHandy(await schriftGroessen(mit, 390), await schriftGroessen(mit, 1200));
  assert.equal(kleiner.length, 1, 'die eingebaute Verkleinerung MUSS auffallen');
  assert.match(kleiner[0], /--fs-base/);
});

test('[Mobile Schrift·Negativkontrolle] am Handy GROESSER gesetzt ist erlaubt', async () => {
  // Die Regel verbietet Verkleinerung, nicht Abweichung. Ohne diese Kontrolle
  // waere sie von „mobil muss gleich sein" nicht zu unterscheiden.
  const mit = HTML.replace('@media (max-width: 760px) {',
    '@media (max-width: 760px) { :root { --fs-base: 1.3rem; }');
  assert.deepEqual(kleinerAmHandy(await schriftGroessen(mit, 390), await schriftGroessen(mit, 1200)), []);
});
