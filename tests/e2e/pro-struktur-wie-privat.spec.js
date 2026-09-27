'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Pro hat die Struktur von Privat — im echten Browser (17.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Dieselben Zusicherungen wie tests/pro-struktur-wie-privat.test.js, am
   konfektionierten Produkt in Chromium statt im Node-Harnisch:
   - die Seitenleiste gliedert Pro in Themen-Cluster, keine einzige Gruppe
     „Bereiche“/„Areas“, kein Ordner-Icon;
   - der Bereich identity trägt Name und Geburtsdatum;
   - „Weitere Bereiche“ fehlt im frischen Depot und erscheint erst, wenn die
     Person selbst ein Template einlässt.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');
const { oeffneApp, depotAnlegen } = require('./helpers');

const gebaut = new Map();
function produktUrl(slug) {
  if (!gebaut.has(slug)) {
    const { ladeIssuer } = require('../load-issuer.js');
    const ISSUER = ladeIssuer().V;
    const r = konfektionieren({
      ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'pro-struktur-e2e-')), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
      unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((x) => x.slug === slug)),
    });
    gebaut.set(slug, 'file://' + path.join(r.ordner, 'vivodepot.html'));
  }
  return gebaut.get(slug);
}

function seitenleisteLesen(page) {
  return page.evaluate(() => {
    window.__vdOeffentlich.renderSidebar();
    const sb = document.getElementById('sidebar');
    const ordner = window.__vdOeffentlich.svgIcon(window.__vdOeffentlich.ICONS.folder);
    return {
      gruppen: [...sb.querySelectorAll('details.nav-gruppe > summary')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()),
      ordnerIcons: [...sb.querySelectorAll('.ico')].filter((i) => i.innerHTML === ordner).length,
      weitere: [...sb.querySelectorAll('[data-modul-verzeichnis]')].map((b) => b.getAttribute('data-modul-verzeichnis')),
      fremdeGruppe: !!sb.querySelector('.nav-gruppe-fremd'),
      anlassEinstieg: !!sb.querySelector('[data-anlass-auswahl]'),
    };
  });
}

/* Der Anlass-Einstieg bleibt in jedem Produkt: Willkommen („Was möchten Sie erledigen?“) und
   Seitenleiste. Welche Anlässe Pro zeigt, ist nicht entschieden; bis dahin gilt der heutige Stand. */
async function anlassEinstiegPruefen(page, slug) {
  await oeffneApp(page, { url: produktUrl(slug) });
  await expect(page.locator('#w-anlass'), slug + ': Willkommen').toBeVisible();
  await depotAnlegen(page);
  const sb = await seitenleisteLesen(page);
  expect(sb.anlassEinstieg, slug + ': Seitenleiste').toBe(true);
  return sb;
}

async function strukturPruefen(page, slug) {
  const sb = await anlassEinstiegPruefen(page, slug);
  const bereichsGruppen = sb.gruppen.filter((g) => !/^(Bereiche|Areas)\b/.test(g));
  expect(sb.gruppen.some((g) => /^(Bereiche|Areas)\s*(\(\d+\))?$/.test(g)), 'keine Auffanggruppe: ' + sb.gruppen.join(' | ')).toBe(false);
  expect(bereichsGruppen.length, sb.gruppen.join(' | ')).toBeGreaterThanOrEqual(3);
  expect(sb.ordnerIcons).toBe(0);
  expect(sb.fremdeGruppe).toBe(false);
  expect(sb.weitere).toEqual([]);

  const felder = await page.evaluate(() => {
    window.__vdOeffentlich.oeffneSektor('identity');
    return [...document.querySelectorAll('#content [data-feld]')].map((e) => e.getAttribute('data-feld'));
  });
  for (const f of ['givenName', 'familyName', 'birthDate']) expect(felder, f).toContain(f);
}

test('[Pro-Struktur·Browser·pro-de] Themen-Cluster, kein Ordner-Icon, identity mit Name und Geburtsdatum, keine „Weitere Bereiche“', ({ page }) => strukturPruefen(page, 'pro-de'));
test('[Pro-Struktur·Browser·pro-en] Themen-Cluster, kein Ordner-Icon, identity mit Name und Geburtsdatum, keine „Weitere Bereiche“', ({ page }) => strukturPruefen(page, 'pro-en'));

test('[Pro-Struktur·Browser·privat-de] der Anlass-Einstieg steht auf Willkommen und in der Seitenleiste (Gegenprobe zu Pro)', ({ page }) => anlassEinstiegPruefen(page, 'privat-de'));

test('[Pro-Struktur·Browser·pro-de] ein selbst eingelassenes Template öffnet „Weitere Bereiche“', async ({ page }) => {
  // Seit U2-ADR-427 ist die Notar-Kennung ab Werk in pro-de belegt; ein SELBST geladenes Template braucht eine eigene Kennung.
  const EIGENE_ID = 'pro-testschablone-selbst-geladen';
  const schablone = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'pro-logikmodul-testschablone-zwei-de.json'), 'utf8'));
  schablone.id = EIGENE_ID;
  const modul = JSON.stringify(schablone);
  await oeffneApp(page, { url: produktUrl('pro-de') });
  await depotAnlegen(page);
  expect((await seitenleisteLesen(page)).fremdeGruppe).toBe(false);
  const r = await page.evaluate((text) => window.__vdOeffentlich.modulEinlassen(text), modul);
  expect(r.angenommen, r.grund).toBe(true);
  const sb = await seitenleisteLesen(page);
  expect(sb.fremdeGruppe).toBe(true);
  expect(sb.weitere).toEqual([EIGENE_ID]);
});
