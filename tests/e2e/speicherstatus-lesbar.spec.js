'use strict';
/* Der Speicherstatus in der Kopfzeile bleibt lesbar, in jedem Erscheinungsbild — Befund ERSCHEINUNGSBILD-RUECKFALL-SPEICHERSTATUS (07.10.2026)
   ─────────────────────────────────────────────────────────────────
   Der Fund: Das Glas-Erscheinungsbild deutet --auf-akzent in der Kopfzeile auf dunkle Tinte um (helle Glasfläche). Der geschützte
   Speicherstatus malte beide Zustände mit --auf-akzent: „Sicherung fehlgeschlagen“ stand dunkel auf --error (2,95:1), „gespeichert“ auf
   einer Marken-Kopfzeile dunkel auf der Markenfarbe (1,76 bzw. 2,28:1). Die Laufzeitprobe des Kerns fiel darum aufs nackte Gerüst zurück:
   genau dann, wenn das Speichern fehlschlägt, verschwand das ganze Erscheinungsbild.
   Die Abhilfe: Die Fehler-Plakette malt mit --auf-fehler-kern, das der Schutz-Stil an :root aus --auf-akzent ableitet (dort hält die
   Paarprüfung [--auf-akzent, --error]); in der Kopfzeile folgt --auf-akzent einer Marke (--vd-branding-topbar-text).
   Gehalten je Zustand (fehlgeschlagen, gespeichert) in Hell, Nacht und mit Fremdmarke: kein Rückfall und Schrift ≥ 4,5:1 gegen die
   Fläche hinter ihr. Dazu: die Tinte der Fehler-Plakette ist das --auf-akzent der Wurzel, und ein Wurzel-Token zu schwach gegen --error
   führt zum Rückfall (Rot-Beweis). */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers.js');

const FREMDMARKE = '#8b1a2b';

async function vorbereiten(page, { zustand, ebene, marke }) {
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  if (marke) await page.evaluate((f) => window.__vdOeffentlich._brandingProduktTopbarAnwenden({ farbePrimaer: f }, document.documentElement, 'branding'), marke);
  if (ebene === 'nacht') await page.evaluate(() => document.querySelector('#tb-nacht').click());
  await page.evaluate((z) => {
    const s = document.querySelector('#tb-save-status');
    for (const k of ['ist-fehlgeschlagen', 'ist-ungespeichert', 'ist-unbestaetigt', 'ist-keine-datei', 'ist-gespeichert']) s.classList.remove(k);
    s.hidden = false; s.classList.add(z === 'fehlgeschlagen' ? 'ist-fehlgeschlagen' : 'ist-gespeichert');
  }, zustand);
  await page.waitForTimeout(700);
}

/* Schrift gegen die zusammengesetzte Fläche hinter ihr, wie der Ebenen-Finder rechnet; dazu der Zustand des Erscheinungsbilds. */
const messen = (page) => page.evaluate(() => {
  const roh = (s) => { const m = String(s).match(/^rgba?\(([^)]+)\)$/); const a = m[1].split(/[ ,/]+/).map(Number); return { r: a[0], g: a[1], b: a[2], a: a[3] == null ? 1 : a[3] }; };
  const ueber = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const grund = (e0) => { const k = []; for (let x = e0; x; x = x.parentElement) { const c = roh(getComputedStyle(x).backgroundColor); if (c.a > 0) { k.push(c); if (c.a >= 0.99) break; } }
    let b = { r: 255, g: 255, b: 255, a: 1 }; for (let i = k.length - 1; i >= 0; i--) b = ueber(k[i], b); return b; };
  const s = document.querySelector('#tb-save-status'); const g = grund(s); const f = ueber(roh(getComputedStyle(s).color), g);
  const x = lum(f), y = lum(g);
  return { rueckfall: document.documentElement.getAttribute('data-erscheinungsbild'), kontrast: (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05),
    farbe: getComputedStyle(s).color };
});

async function haelt(page, art) {
  const m = await messen(page);
  expect(m.rueckfall, art + ': kein Rückfall aufs nackte Gerüst').toBeNull();
  expect(m.kontrast, art + ': Schrift des Speicherstatus ≥ 4,5:1').toBeGreaterThanOrEqual(4.5);
}

test('[Speicherstatus] fehlgeschlagen, Hell: lesbar, kein Rückfall', async ({ page }) => {
  await vorbereiten(page, { zustand: 'fehlgeschlagen', ebene: 'hell' }); await haelt(page, 'fehlgeschlagen · hell');
});
test('[Speicherstatus] fehlgeschlagen, Nacht: lesbar, kein Rückfall', async ({ page }) => {
  await vorbereiten(page, { zustand: 'fehlgeschlagen', ebene: 'nacht' }); await haelt(page, 'fehlgeschlagen · nacht');
});
test('[Speicherstatus] fehlgeschlagen, Fremdmarke: lesbar, kein Rückfall', async ({ page }) => {
  await vorbereiten(page, { zustand: 'fehlgeschlagen', ebene: 'hell', marke: FREMDMARKE }); await haelt(page, 'fehlgeschlagen · fremdmarke');
});
test('[Speicherstatus] gespeichert, Hell: lesbar, kein Rückfall', async ({ page }) => {
  await vorbereiten(page, { zustand: 'gespeichert', ebene: 'hell' }); await haelt(page, 'gespeichert · hell');
});
test('[Speicherstatus] gespeichert, Nacht: lesbar, kein Rückfall', async ({ page }) => {
  await vorbereiten(page, { zustand: 'gespeichert', ebene: 'nacht' }); await haelt(page, 'gespeichert · nacht');
});
test('[Speicherstatus] gespeichert, Fremdmarke: lesbar, kein Rückfall', async ({ page }) => {
  await vorbereiten(page, { zustand: 'gespeichert', ebene: 'hell', marke: FREMDMARKE }); await haelt(page, 'gespeichert · fremdmarke');
});

test('[Speicherstatus] die Tinte der Fehler-Plakette ist --auf-akzent der Wurzel, nicht das der Kopfzeile', async ({ page }) => {
  await vorbereiten(page, { zustand: 'fehlgeschlagen', ebene: 'hell' });
  const w = await page.evaluate(() => {
    const probe = document.createElement('span'); probe.style.color = 'var(--auf-akzent)'; document.body.appendChild(probe);
    const wurzel = getComputedStyle(probe).color; probe.remove();
    const kopf = document.createElement('span'); kopf.style.color = 'var(--auf-akzent)'; document.querySelector('.topbar').appendChild(kopf);
    const inKopf = getComputedStyle(kopf).color; kopf.remove();
    return { plakette: getComputedStyle(document.querySelector('#tb-save-status')).color, wurzel, inKopf };
  });
  expect(w.plakette).toBe(w.wurzel);
  expect(w.inKopf, 'Voraussetzung: das Glas deutet --auf-akzent in der Kopfzeile um').not.toBe(w.wurzel);
});

test('[Speicherstatus·Rot-Beweis] ein Wurzel-Token --auf-akzent, zu schwach gegen --error, führt zum Rückfall', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  await page.addStyleTag({ content: 'html { --auf-akzent: #c0392b !important; }' });
  await page.evaluate(() => { const s = document.querySelector('#tb-save-status'); s.classList.remove('ist-gespeichert'); s.hidden = false; s.classList.add('ist-fehlgeschlagen'); });
  await page.waitForTimeout(700);
  const m = await messen(page);
  expect(m.rueckfall).toBe('rueckfall');
});
