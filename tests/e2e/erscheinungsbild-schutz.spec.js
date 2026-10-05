'use strict';
/* Schutz gewinnt — im Browser (Auflagen der Gegenlesung, 02.10.2026, U2-ADR-473 Nachtrag v894)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Ein Erscheinungsbild-Modul mit `stil` kann täuschen und verstecken. Die Grammatik verbietet Selektoren auf geschützte Elemente,
   aber ein breiter Selektor nennt sie nicht. Darum zwei Linien, hier je mit Rot-Beweis:
     1. Schutz-CSS: jedes geschützte Element trägt data-schutz und bleibt, solange es nicht hidden ist, sichtbar und deckend.
     2. Laufzeitprobe: ist die Seite oder eine geschützte Anzeige trotzdem fort, fällt der Kern auf Browser-Standard plus Schutz
        zurück — auch beim SPÄTEN Einblenden (Auflage der Gegenlesung: „Modul laden, später die Sicherungsanzeige einblenden, sie ist sichtbar").
   Gegenprobe: das Erscheinungsbild „heute" fällt nirgends zurück. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, depotAnlegen } = require('./helpers.js');

const REPO = path.join(__dirname, '..', '..');

/* Ein konfektioniertes privat-de, dessen Erscheinungsbild-Modul einen zusätzlichen `stil`-Teil trägt.
   GERÜST-TEST (Klasse-B-Wächter, 03.10.2026): der rohe Kern ist hier Eingang des Backens mit einem veränderten Modul, nicht die
   geöffnete Seite — der Browser öffnet nur das gebackene Erzeugnis. */
function produktMit(zusatzStil) {
  const { produktTextErzeugen } = require(path.join(REPO, 'tools', 'lib', 'produkt-text-erzeugen.js'));
  const { PRODUKTE, modulDateienFuer } = require(path.join(REPO, 'tools', 'lib', 'vier-produkte.js'));
  const p = PRODUKTE.find((x) => x.slug === 'privat-de');
  const module = modulDateienFuer(p).map((f) => ({ roh: JSON.parse(fs.readFileSync(f, 'utf8')), basisname: path.basename(f) }));
  if (zusatzStil) {
    const eb = module.find((m) => m.roh.modulTyp === 'erscheinungsbild');
    eb.roh = { ...eb.roh, stil: { ...eb.roh.stil, boese: zusatzStil } };
  }
  const text = produktTextErzeugen(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'), {
    modulauswahl: [], unsignierteModule: module, serviceWorkerVorhanden: false,
    vorDepotKonfigurationInhaltFn: require(path.join(REPO, 'tests', 'load-issuer.js')).ladeIssuer().V.vorDepotKonfigurationDateiInhalt,
  }).text;
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-schutz-'));
  TEMP.push(ordner);
  const datei = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(datei, text);
  return 'file://' + datei;
}
const TEMP = [];
test.afterEach(() => {
  while (TEMP.length) { const ordner = TEMP.pop(); fs.rmSync(ordner, { recursive: true, force: true }); }
});

const zustand = (page) => page.evaluate(() => ({
  attr: document.documentElement.getAttribute('data-erscheinungsbild'),
  gruende: (ERSCHEINUNGSBILD_RUECKFALL || []).map((v) => v.element + ':' + v.grund),
}));

test('[Schutz·Gegenprobe] „heute" fällt nicht zurück — nach dem Anlegen, in Notfall und Hilfe', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(null) });
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  for (const sel of ['[data-notfall]', '[data-hilfe]']) {
    await page.evaluate((x) => document.querySelector(x).click(), sel);
    await page.waitForTimeout(500);
  }
  expect(await zustand(page)).toEqual({ attr: null, gruende: [] });
});

test('[Schutz·Rot-Beweis] `* { display: none }` → Rückfall; die Sicherungsanzeige ist sichtbar, sobald sie eingeblendet wird', async ({ page }) => {
  await page.goto(produktMit('* { display: none }'));
  await expect.poll(async () => (await zustand(page)).attr, { timeout: 5000 }).toBe('rueckfall');
  expect((await zustand(page)).gruende).toContain('html:seite-versteckt');
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  await expect(page.locator('#tb-save-status')).toBeVisible();
});

test('[Schutz·Rot-Beweis] ein breiter Selektor auf die Kopfzeile → die geschützten Anzeigen bleiben, die Probe fällt zurück', async ({ page }) => {
  await oeffneApp(page, { url: produktMit('.topbar * { visibility: hidden; opacity: 0 } .sidebar nav * { display: none }') });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  // Schutz-CSS: der Passwort-Hinweis (data-schutz) bleibt sichtbar und deckend trotz `visibility: hidden; opacity: 0` am Selektor.
  await expect(page.locator('#tb-pw-hinweis')).toBeVisible();
  expect(await page.locator('#tb-pw-hinweis').evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  // Sein Text war durchsichtig, der Notfall-Eintrag nicht gerendert — die Probe fällt zurück, und alles ist wieder da.
  await expect.poll(async () => (await zustand(page)).attr, { timeout: 5000 }).toBe('rueckfall');
  await page.click('#tb-pw-hinweis');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Maria');
  await page.fill('#id-nachname', 'Mustermann');
  await page.fill('#id-pw', 'e2e-passwort-123');
  await page.fill('#id-pw2', 'e2e-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await expect(page.locator('#tb-save-status')).toBeVisible();
  await expect(page.locator('[data-notfall]').first()).toBeVisible();
});

/* Abgeschnitten ist nicht überdeckt (Befund 03.10.2026, Abnahme Gestalt A am Desktop): der Notfall-Eintrag stand unten in einer
   Seitenleiste, die länger war als ihr sichtbarer Ausschnitt; elementFromPoint lieferte an seiner Stelle, was im Fenster zu
   sehen war, und die Probe fiel mit „ueberdeckt" auf den Browser-Standard zurück. */
async function probeAmRand(page, { randHoehe, ueberdecken }) {
  return page.evaluate(([h, decken]) => {
    const rand = document.createElement('div');
    Object.assign(rand.style, { position: 'fixed', top: '0', left: '0', width: '220px', height: h + 'px', overflowY: 'auto', background: '#fff', zIndex: '2147483000' });
    const fuell = document.createElement('div'); fuell.style.height = '600px'; rand.appendChild(fuell);
    const knopf = document.createElement('button'); knopf.type = 'button'; knopf.id = 'probe-notfall'; knopf.textContent = 'Notfall';
    knopf.setAttribute('data-schutz', ''); rand.appendChild(knopf);
    document.body.appendChild(rand);
    if (decken) {
      const r = knopf.getBoundingClientRect();
      const ebene = document.createElement('div');
      Object.assign(ebene.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', background: '#fff', zIndex: '2147483001' });
      document.body.appendChild(ebene);
      // Vorbedingung (wie bei den Ebenen der Vorführung): am Knopf liegt genau die Testebene, sonst wäre „ueberdeckt" Zufall
      const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (oben !== ebene) return ['Vorbedingung: die Ebene liegt nicht über dem Knopf (' + (oben && oben.id) + ')'];
    }
    return erscheinungsbildSchutzProbe(document).filter((v) => v.element === '#probe-notfall').map((v) => v.grund);
  }, [randHoehe, ueberdecken]);
}

test('[Schutz·Laufzeitprobe·Rot-Beweis] ein geschütztes Element unterhalb des Ausschnitts eines scrollenden Vorfahren gilt nicht als überdeckt', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(null) });
  // In der geöffneten App: auf der Willkommensseite liegt #overlay über allem, und das darf überdecken (ueberdeckenErlaubt).
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  expect(await probeAmRand(page, { randHoehe: 120, ueberdecken: false })).toEqual([]);
});

test('[Schutz·Laufzeitprobe·Gegenprobe] im Ausschnitt und von einer Ebene verdeckt wird es weiter gefunden', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(null) });
  // In der geöffneten App: auf der Willkommensseite liegt #overlay über allem, und das darf überdecken (ueberdeckenErlaubt).
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  expect(await probeAmRand(page, { randHoehe: 800, ueberdecken: true })).toEqual(['ueberdeckt']);
});

/* Die Ebenen der Vorführung (Einzelworte der Gegenlesung, 04.10.2026): #vorfuehrung-schleife, -wechsel und -warnung sind
   Kern-Container wie #overlay und #hilfe-overlay und dürfen ein geschütztes Element überdecken — aber nur unter html.vorfuehrung.
   Ohne diese Erlaubnis fiel jede Vorführungsdatei beim Start mit „ueberdeckt" auf den Browser-Standard zurück. Im Normalmodus
   bleibt dieselbe Ebene ein Verstoß, und ein fremder Container ist es auch in der Vorführung. */
async function ebeneUeberSchutz(page, { id, vorfuehrung }) {
  return page.evaluate(([ebenenId, an]) => {
    const knopf = document.createElement('button'); knopf.type = 'button'; knopf.id = 'probe-schutz-ebene'; knopf.textContent = 'Notfall';
    knopf.setAttribute('data-schutz', '');
    // unter jeder Ebene: der Kern legt #vorfuehrung-warnung mit !important auf z-index 350 und volle Fläche
    Object.assign(knopf.style, { position: 'fixed', left: '300px', top: '200px', width: '120px', height: '40px', zIndex: '100' });
    document.body.appendChild(knopf);
    const ebene = document.createElement('div'); ebene.id = ebenenId;
    // das ganze Fenster: eine kleinere Ebene verschöbe der Kern (inset: 0 !important), und sie deckte den Knopf dann nicht
    Object.assign(ebene.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', background: '#fff', zIndex: '2147483001' });
    document.body.appendChild(ebene);
    if (an) document.documentElement.classList.add('vorfuehrung');
    try {
      const r = knopf.getBoundingClientRect();
      const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (oben !== ebene) return ['Vorbedingung: die Ebene liegt nicht über dem Knopf (' + (oben && oben.id) + ')'];
      return erscheinungsbildSchutzProbe(document).filter((v) => v.element === '#probe-schutz-ebene').map((v) => v.grund);
    } finally {
      if (an) document.documentElement.classList.remove('vorfuehrung');
      knopf.remove(); ebene.remove();
    }
  }, [id, vorfuehrung]);
}

for (const id of ['vorfuehrung-schleife', 'vorfuehrung-wechsel', 'vorfuehrung-warnung']) {
  test('[Schutz·Vorführung·Gegenprobe] #' + id + ' darf unter html.vorfuehrung ein geschütztes Element überdecken', async ({ page }) => {
    await oeffneApp(page, { url: produktMit(null) });
    await depotAnlegen(page, { name: 'Maria Mustermann' });
    expect(await ebeneUeberSchutz(page, { id, vorfuehrung: true })).toEqual([]);
  });
  test('[Schutz·Vorführung·Rot-Beweis] #' + id + ' im Normalmodus überdeckt — die Probe meldet es', async ({ page }) => {
    await oeffneApp(page, { url: produktMit(null) });
    await depotAnlegen(page, { name: 'Maria Mustermann' });
    expect(await ebeneUeberSchutz(page, { id, vorfuehrung: false })).toEqual(['ueberdeckt']);
  });
}

test('[Schutz·Vorführung·Rot-Beweis] ein fremder Container überdeckt auch unter html.vorfuehrung — die Probe meldet es', async ({ page }) => {
  await oeffneApp(page, { url: produktMit(null) });
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  expect(await ebeneUeberSchutz(page, { id: 'fremde-ebene', vorfuehrung: true })).toEqual(['ueberdeckt']);
});
