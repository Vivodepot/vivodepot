'use strict';
/* Die Laufzeitprobe liest jede CSS-Farbform richtig — im Browser (Befund 04.10.2026)
   ─────────────────────────────────────────────────────────────────
   Der Fund: `_ebFarbe` nahm die Zahlen eines berechneten `color(srgb 0.85 0.83 0.89)` (so liefert der Browser `color-mix`) als
   0–255 und las den Grund als fast Schwarz. Beide Richtungen, je mit Rot-Beweis auf dem Stand davor:
     · falscher RÜCKFALL: dunkler Text auf hellem color-mix-Grund fiel mit „kontrast 1,3" zurück;
     · falscher DURCHLAUF: heller Text auf hellem color-mix-Grund (nicht lesbar) galt als gelesen.
   Dazu die Gegenprobe mit dem ausgelieferten Standard-Erscheinungsbild in der Nacht-Ebene mit Sub-Depot (Textfarbe --vm-akzent-stark ist
   ein color-mix) und die Formtabelle: jede CSS-Farbform, die ein Erscheinungsbild schreiben kann, wird richtig gelesen.
   Nicht hier: „Notfall" in der Nacht-Ebene — das Panel hat dort einen festen hellen Grund (eigener Befund, eigener Commit). */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers.js');

const REPO = path.join(__dirname, '..', '..');
const TEMP = [];
// Der Kern, der gebacken wird: der Arbeitsbaum, für den Rot-Beweis auf dem Stand davor eine Datei per VD_KERN_ROH.
const KERN_PFAD = process.env.VD_KERN_ROH || path.join(REPO, 'vivodepot.html');
test.afterEach(() => { while (TEMP.length) { const ordner = TEMP.pop(); fs.rmSync(ordner, { recursive: true, force: true }); } });

/* Ein konfektioniertes privat-de mit zusätzlichem `stil`-Teil (wie erscheinungsbild-schutz.spec.js; GERÜST-TEST). */
function produktMit(zusatzStil) {
  const { produktTextErzeugen } = require(path.join(REPO, 'tools', 'lib', 'produkt-text-erzeugen.js'));
  const { PRODUKTE, modulDateienFuer } = require(path.join(REPO, 'tools', 'lib', 'vier-produkte.js'));
  const p = PRODUKTE.find((x) => x.slug === 'privat-de');
  const module = modulDateienFuer(p).map((f) => ({ roh: JSON.parse(fs.readFileSync(f, 'utf8')), basisname: path.basename(f) }));
  if (zusatzStil) {
    const eb = module.find((m) => m.roh.modulTyp === 'erscheinungsbild');
    eb.roh = { ...eb.roh, stil: { ...eb.roh.stil, farbprobe: zusatzStil } };
  }
  const text = produktTextErzeugen(fs.readFileSync(KERN_PFAD, 'utf8'), {
    modulauswahl: [], unsignierteModule: module, serviceWorkerVorhanden: false,
    vorDepotKonfigurationInhaltFn: require(path.join(REPO, 'tests', 'load-issuer.js')).ladeIssuer().V.vorDepotKonfigurationDateiInhalt,
  }).text;
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-farbformen-'));
  TEMP.push(ordner);
  fs.writeFileSync(path.join(ordner, 'vivodepot.html'), text);
  return 'file://' + path.join(ordner, 'vivodepot.html');
}

/* Der Selektor der Proben ist der des Erscheinungsbilds ab Werk („Salbei mit Glas“: html:not(.dark-mode):not(.high-contrast) .topbar),
   damit die angehängte Farbprobe ihn bei gleicher Spezifität als spätere Regel überstimmt. Mit nur `.topbar` überstimmte das Glas die Probe,
   und der Rot-Beweis pflanzte nichts (Air-Lauf am 07.10.2026). */
const KOPF = 'html:not(.dark-mode):not(.high-contrast) .topbar';
/* Der geschützte Speicherstatus malt mit --auf-akzent der Kopfzeile (nicht mit `color` der Kopfzeile); der Rot-Beweis setzt darum auch
   --auf-akzent hell, sonst trifft die helle Schrift nur Elemente, die die Laufzeitprobe nicht prüft (07.10.2026, Wort der Gegenlesung). */
const zustand = (page) => page.evaluate(() => ({
  attr: document.documentElement.getAttribute('data-erscheinungsbild'),
  gruende: (ERSCHEINUNGSBILD_RUECKFALL || []).map((v) => v.element + ':' + v.grund),
}));
const warten = async (page) => { await page.waitForTimeout(700); };

test('[Farbformen·Rot-Beweis·falscher Rückfall] dunkler Text auf hellem color-mix-Grund bleibt stehen', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(KOPF + ' { --auf-akzent: #162517; background: color-mix(in srgb, #b8aecb 55%, #ffffff); color: #162517; }') });
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  await warten(page);
  expect(await zustand(page)).toEqual({ attr: null, gruende: [] });
});

test('[Farbformen·Rot-Beweis·falscher Durchlauf] heller Text auf hellem color-mix-Grund fällt zurück', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(KOPF + ' { --auf-akzent: #ffffff; background: color-mix(in srgb, #ffffff 90%, #f0f0f0); color: #ffffff; }') });
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  await warten(page);
  const z = await zustand(page);
  expect(z.attr).toBe('rueckfall');
  expect(z.gruende.some((g) => /:kontrast$/.test(g))).toBe(true);
});

test('[Farbformen·Gegenprobe] Standard-Erscheinungsbild in der Nacht-Ebene mit Sub-Depot: Bereich und Hilfe fallen nicht zurück', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(null) });
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  await page.evaluate(async (pw) => {
    const e = await window.__vdOeffentlich.subDepotAnlegen({ bezeichnung: 'Mama', inhaberin: 'Mama Muster', verwaltungsTyp: 'verwaltet', akzent: 'flieder' }, pw);
    await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
    window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
  }, 'e2e-passwort-123');
  await oeffneSektor(page, 'finance');
  await page.evaluate(() => document.querySelector('#tb-nacht').click());
  for (const sel of ['[data-hilfe]']) {
    await page.evaluate((x) => document.querySelector(x).click(), sel);
    await warten(page);
    expect(await zustand(page), sel).toEqual({ attr: null, gruende: [] });
  }
});

/* Die Formtabelle: jede Form, die ein Erscheinungsbild schreiben kann, in sRGB. Erwartet wird, was die Zeichenfläche des Browsers
   selbst als sRGB liefert (±1 je Kanal), und nie null. Alpha: ein Viertel-Wert wird als solcher gelesen. */
const FORMEN = [
  '#162517', '#fff', 'rgb(22, 37, 23)', 'rgb(22 37 23 / 50%)', 'rgba(22, 37, 23, 0.5)', 'hsl(120 30% 40%)', 'rebeccapurple',
  'color(srgb 0.85 0.83 0.89)', 'color(srgb-linear 0.5 0.5 0.5)', 'color(display-p3 0.9 0.8 0.9)', 'oklch(0.7 0.1 300)', 'oklab(0.7 0.05 -0.05)',
  'lab(60 10 -20)', 'lch(60 20 300)', 'color-mix(in srgb, #b8aecb 55%, #ffffff)', 'color-mix(in oklch, #4f6539 40%, white)',
];
test('[Farbformen] jede CSS-Farbform wird in sRGB gelesen, eine unlesbare Form liefert null', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(null) });
  const ergebnis = await page.evaluate((formen) => formen.map((f) => {
    // Die Form so, wie der Browser sie berechnet zurückgibt (das liest die Probe), und der Wert, den die Zeichenfläche selbst meldet.
    const el = document.createElement('div'); el.style.backgroundColor = f; document.body.appendChild(el);
    const berechnet = getComputedStyle(el).backgroundColor; el.remove();
    const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = f; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data;
    return { f, berechnet, probe: _ebFarbe(berechnet, document), soll: [d[0], d[1], d[2], d[3] / 255] };
  }), FORMEN);
  for (const e of ergebnis) {
    expect(e.probe, e.f + ' → ' + e.berechnet).not.toBeNull();
    for (let i = 0; i < 3; i++) expect(Math.abs(e.probe[i] - e.soll[i]), e.f + ' → ' + e.berechnet + ' Kanal ' + i).toBeLessThanOrEqual(1.5);
    expect(Math.abs(e.probe[3] - e.soll[3]), e.f + ' Alpha').toBeLessThanOrEqual(0.01);
  }
  expect(await page.evaluate(() => _ebFarbe('keine-farbe', document))).toBeNull();
});
