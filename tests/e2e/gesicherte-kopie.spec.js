// @ts-check
/* gesicherte-kopie.spec.js — eine vom Browser gesicherte Kopie der laufenden Anwendung zeigt nichts (12.10.2026,
   Befunde GESICHERTE-KOPIE-TRAEGT-KLARTEXT und RAHMENSCHUTZ-FAELLT-IN-GESICHERTER-KOPIE)

   „Seite speichern“ im Browser schreibt den Stand NACH dem Skriptlauf. Bei geöffnetem Depot standen darin die gezeigten
   Angaben, und die Datei zeigte beim Öffnen ohne Passwort ein offenes Depot mit „Auf diesem Gerät aktuell ✓“.
   GEMESSEN vor der Änderung (11./12.10.2026, Chromium, privat-de wie ausgeliefert): Name zweimal im HTML und einmal auf dem
   Bildschirm der Kopie, `#app.an` vorhanden, kein Startschirm, ein Seitenfehler des Rahmenschutz-Blocks.

   Jetzt erkennt der Kopf-Block die Kopie an der Marke `data-vd-lauf`, sperrt die folgenden Skripte, entfernt den Inhalt und
   zeigt den Hinweis, der als verborgenes Element im Dokument steht (im normalen Lauf bleibt er verborgen). Diese Probe geht den Weg eines Menschen: Depot anlegen, die Seite so sichern, wie der Browser es mit
   dem laufenden Stand tut (`page.content()`), die Datei in einem frischen Browser öffnen.

   Seit 15.10.2026 (zweiter Schritt) stehen Feldwerte nicht mehr als Attribut in der Datei: der Kern übernimmt sie gleich
   nach dem Einfügen in die Eigenschaft des Elements (`feldWerteAusAttributenLoesen`). Die letzten Fälle prüfen das am
   gesicherten Stand, über alle Feld-Bauer und am Speicherweg von Chromium (MHTML, derselbe Serialisierer wie „Seite
   speichern“). Gezeichneter Text (Deckblatt, Listen) bleibt in der Datei; das ist die benannte Grenze in SECURITY.md 6.9. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const h = require('./helpers.js');

const VORNAME = 'Zwetschgenkern';
const NACHNAME = 'Quittenmus';
const PW = 'gesicherte-kopie-2026';

/* Legt ein Depot an, zeigt den Bereich mit dem Namen und gibt den serialisierten Stand der Seite zurück. */
async function offeneSeiteSichern(page, url) {
  await h.oeffneApp(page, { url });
  await h.depotAnlegen(page, { name: VORNAME + ' ' + NACHNAME, pw: PW });
  await h.oeffneSektor(page, 'identity');
  await expect(page.locator('#app.an'), 'Vorbedingung: das Depot ist offen').toHaveCount(1);
  const html = await page.content();
  expect(html.includes(VORNAME), 'Vorbedingung: der gesicherte Stand trägt den Namen (sonst prüft die Probe nichts)').toBe(true);
  return html;
}
async function kopieOeffnen(browser, html, fn) {
  const datei = path.join(os.tmpdir(), 'gesicherte-kopie-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(datei, html, 'utf8');
  const kontext = await browser.newContext({ locale: 'de-DE' });
  try {
    const seite = await kontext.newPage();
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(e.message));
    await seite.goto('file://' + datei);
    await seite.waitForLoadState('domcontentloaded');
    await fn(seite, fehler);
  } finally { await kontext.close(); fs.rmSync(datei, { force: true }); }
}

// Im öffentlichen Zuschnitt nur die baubaren Produkte (helpers.js, baubar); im Kanon beide.
for (const [slug, url] of [['privat-de', h.KERN_URL_PRIVAT_DE], ['pro-de', h.KERN_URL_PRO_DE]].filter(([s]) => h.baubar(s))) {
  test(`[Gesicherte Kopie] ${slug} · bei offenem Depot gesichert: die Kopie zeigt nur den Hinweis, kein Depot, keinen Wert, kein Eingabefeld`, async ({ page, browser }) => {
    test.setTimeout(120000);
    const html = await offeneSeiteSichern(page, url);
    await kopieOeffnen(browser, html, async (kopie, fehler) => {
      await expect(kopie.locator('#vd-gesicherte-kopie'), 'der Hinweis steht da').toBeVisible({ timeout: 15000 });
      await expect(kopie.locator('#vd-gesicherte-kopie p[lang="de"]')).toContainText('Bitte löschen Sie diese Datei.');
      await expect(kopie.locator('#vd-gesicherte-kopie p[lang="en"]')).toContainText('Please delete this file.');
      await kopie.waitForTimeout(1500);   // ein Skript, das trotz Sperre liefe, hätte jetzt gezeichnet
      expect(await kopie.locator('#app').count(), 'die Oberfläche der Anwendung ist nicht mehr im Dokument').toBe(0);
      expect(await kopie.locator('input, textarea, select, button').count(), 'kein Eingabe- oder Bedienelement').toBe(0);
      const text = await kopie.evaluate(() => document.body.innerText);
      expect(text.includes(VORNAME) || text.includes(NACHNAME), 'kein Wert aus dem Depot auf dem Bildschirm').toBe(false);
      expect(text.includes('aktuell'), 'kein Speicherstatus').toBe(false);
      expect(await kopie.evaluate(() => document.body.children.length), 'im body steht nur der Hinweis').toBe(1);
      expect(fehler, 'kein Seitenfehler: ' + fehler.join(' | ')).toEqual([]);
    });
  });
}

test('[Gesicherte Kopie·Rot-Beweis] ein normaler Start wird nie als Kopie erkannt: frisch geladen, neu geladen, nach „Zurück“', async ({ page }) => {
  test.setTimeout(90000);
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await expect(page.locator('#vd-gesicherte-kopie'), 'frisch geladen').toBeHidden();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-vd-lauf')), 'der Start setzt die Marke').toBe('1');
  await page.reload();
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await expect(page.locator('#vd-gesicherte-kopie'), 'neu geladen').toBeHidden();
  await page.goto('about:blank');
  await page.goBack();
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await expect(page.locator('#vd-gesicherte-kopie'), 'nach „Zurück“').toBeHidden();
});

test('[Gesicherte Kopie·Rot-Beweis] ohne die Marke zeigt dieselbe gesicherte Seite wieder ein offenes Depot', async ({ page, browser }) => {
  test.setTimeout(120000);
  const html = await offeneSeiteSichern(page, h.KERN_URL_PRIVAT_DE);
  const ohneMarke = html.replace(' data-vd-lauf="1"', '');
  expect(ohneMarke, 'Vorbedingung: die Marke stand im gesicherten Stand').not.toBe(html);
  await kopieOeffnen(browser, ohneMarke, async (kopie) => {
    await kopie.waitForTimeout(2500);
    await expect(kopie.locator('#vd-gesicherte-kopie'), 'ohne Marke kein Hinweis').toBeHidden();
    expect(await kopie.locator('#app.an').count(), 'und die Kopie zeigt das offene Depot: das ist die Lage vor der Änderung').toBe(1);
  });
});

test('[Gesicherte Kopie·Datei] in der gesicherten Datei steht kein Wert des Depots in einem Attribut', async ({ page }) => {
  test.setTimeout(120000);
  const html = await offeneSeiteSichern(page, h.KERN_URL_PRIVAT_DE);
  const inAttributen = (html.match(/="[^"]*"/g) || []).filter((a) => a.includes(VORNAME) || a.includes(NACHNAME));
  expect(inAttributen, 'Werte in Attributen').toEqual([]);
  expect(await page.locator('[data-edit="givenName"]').inputValue(), 'und das Feld zeigt den Wert weiter').toBe(VORNAME);
});

/* Klassenprobe über alle Feld-Bauer: jedes Feld jedes Bereichs (auch die Unterfelder von Listen) wird mit einem Prüfwert
   gezeichnet und eingefügt. Danach steht kein Prüfwert in einem Attribut oder als Textarea-Inhalt, kein `checked`/`selected`
   im Markup, und jedes Feld trägt seinen Wert weiter als Eigenschaft (sonst ginge beim Speichern etwas verloren). */
async function alleFeldBauerZeichnen(page, { beobachterAus }) {
  return page.evaluate(async (aus) => {
    const V = window.__vdOeffentlich;
    if (aus && V._FELDWERTE_BEOBACHTER) V._FELDWERTE_BEOBACHTER.disconnect();
    const TEXT = 'Wertprobe7Q', ZAHL = '7351.25', DATUM = '1931-07-13';
    const felder = [];
    const sammeln = (f) => { felder.push(f); for (const u of (Array.isArray(f.felder) ? f.felder : [])) sammeln(u); };
    for (const s of window.__vdOeffentlich.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) sammeln(f);   // Felder stehen je Sektion
    const typen = {};
    const fehler = [];
    let html = '';
    for (const f of felder) {
      let roh;
      if (f.codeListe) roh = [{ text: TEXT }];
      else if (f.typ === 'textarea' || f.typ === 'text' || !f.typ) roh = TEXT;
      else if (f.typ === 'zahl') roh = ZAHL;
      else if (f.typ === 'datum') roh = DATUM;
      else if (f.typ === 'checkbox') roh = true;
      else if (f.typ === 'auswahl' && Array.isArray(f.optionen) && f.optionen.length) roh = f.optionen[0].wert;
      else continue;
      let teil;
      try { teil = V.feldInputHTML(f, roh); } catch (e) { fehler.push(f.id + ': ' + (e && e.message)); continue; }
      typen[f.codeListe ? 'chips' : (f.typ || 'text')] = (typen[f.codeListe ? 'chips' : (f.typ || 'text')] || 0) + 1;
      const a = (x) => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      html += '<div data-probe-feld="' + a(f.id) + '" data-probe-typ="' + a(f.codeListe ? 'chips' : (f.typ || 'text')) + '" data-probe-wert="' + (f.typ === 'auswahl' ? a(roh) : '') + '">' + teil + '</div>';
    }
    const behaelter = document.createElement('div');
    behaelter.hidden = true;
    document.body.appendChild(behaelter);
    behaelter.innerHTML = html;
    await new Promise((r) => setTimeout(r, 0));
    const markup = behaelter.outerHTML;
    const attribute = (markup.match(/="[^"]*"/g) || []).filter((a) => a.includes(TEXT) || a.includes(ZAHL) || a.includes(DATUM));
    const textarea = [...behaelter.querySelectorAll('textarea')].filter((t) => t.textContent.includes(TEXT)).length;
    const zustandImMarkup = behaelter.querySelectorAll('input[checked], option[selected]').length;
    const verloren = [];
    let erster = null;
    for (const z of behaelter.querySelectorAll('[data-probe-feld]')) {
      const typ = z.getAttribute('data-probe-typ');
      const el = z.querySelector('input:not([type=hidden]):not([type=button]), textarea, select');
      if (typ === 'chips') { const c = z.querySelector('.chip[data-chip]'); if (!c || !V.chipDaten(c) || V.chipDaten(c).text !== TEXT) verloren.push(z.getAttribute('data-probe-feld')); continue; }
      if (!el) continue;
      const soll = { text: TEXT, textarea: TEXT, zahl: ZAHL, datum: DATUM, auswahl: z.getAttribute('data-probe-wert') }[typ];
      if (typ === 'checkbox' ? !el.checked : String(el.value) !== String(soll)) {
        verloren.push(z.getAttribute('data-probe-feld'));
        if (!erster) erster = { feld: z.getAttribute('data-probe-feld'), typ, tag: el.tagName, wert: el.value, soll, optionen: el.tagName === 'SELECT' ? [...el.options].slice(0, 3).map((o) => [o.value, o.selected]) : null };
      }
    }
    behaelter.remove();
    return { felder: felder.length, fehler: fehler.slice(0, 3), bauer: typeof V.feldInputHTML, erster, typen, attribute: attribute.length, beispiel: attribute.slice(0, 3), textarea, zustandImMarkup, verloren };
  }, beobachterAus);
}

test('[Gesicherte Kopie·Klasse] kein Feld-Bauer hinterlässt einen Wert im Markup, und jeder Wert bleibt am Feld', async ({ page }) => {
  test.setTimeout(90000);
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: VORNAME + ' ' + NACHNAME, pw: PW });
  const r = await alleFeldBauerZeichnen(page, { beobachterAus: false });
  // Vorbedingung: die Typen, die der Bestand ab Werk trägt (am 15.10.2026 gemessen: 321 Felder, kein Feld vom Typ zahl;
  // der Bauer für zahl ist derselbe Weg wie text). Fehlt einer, prüft die Probe weniger, als sie sagt.
  expect(r.felder, 'Vorbedingung: der Bestand wird gelesen').toBeGreaterThan(100);
  for (const typ of ['text', 'textarea', 'datum', 'auswahl', 'checkbox']) expect(r.typen[typ] || 0, 'Vorbedingung: Feldtyp ' + typ + ' gezeichnet · ' + JSON.stringify({ felder: r.felder, bauer: r.bauer, fehler: r.fehler })).toBeGreaterThan(0);
  expect(r.attribute, 'Prüfwerte in Attributen: ' + JSON.stringify(r.beispiel)).toBe(0);
  expect(r.textarea, 'Prüfwert als Textarea-Inhalt').toBe(0);
  expect(r.zustandImMarkup, 'checked/selected im Markup').toBe(0);
  expect(r.verloren, 'Felder ohne ihren Wert · erster: ' + JSON.stringify(r.erster)).toEqual([]);
});

/* Zwei Ränder der Übernahme (15.10.2026, Gegenlesung): eine Liste mit Mehrfachauswahl behält beide Wahlen, und ein zweiter
   Durchlauf des Beobachters (dasselbe Element wird erneut eingefügt) ändert nichts mehr, auch nicht an den Chip-Daten. */
test('[Gesicherte Kopie·Klasse·Ränder] Mehrfachauswahl behält beide Wahlen, und ein zweiter Durchlauf ändert nichts', async ({ page }) => {
  test.setTimeout(90000);
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: VORNAME + ' ' + NACHNAME, pw: PW });
  const r = await page.evaluate(async () => {
    const V = window.__vdOeffentlich;
    const warten = () => new Promise((x) => setTimeout(x, 0));
    const b = document.createElement('div');
    b.hidden = true;
    document.body.appendChild(b);
    b.innerHTML = '<select multiple id="rp-m"><option value="a" selected>a</option><option value="b">b</option><option value="c" selected>c</option></select>'
      + '<input type="text" id="rp-t" value="RandTextQz"><textarea id="rp-a">RandFlaecheQz</textarea><input type="checkbox" id="rp-c" checked>'
      + '<span class="chip" id="rp-chip" data-chip="{&quot;text&quot;:&quot;RandChipQz&quot;}">x</span>'
      + '<input type="hidden" class="refm-ref" id="rp-ref" value="k1" data-refm-bestand-ref="k1" data-refm-bestand-override="RandOverrideQz">';
    await warten();
    const lesen = () => ({
      mehrfach: [...document.getElementById('rp-m').selectedOptions].map((o) => o.value),
      text: document.getElementById('rp-t').value, flaeche: document.getElementById('rp-a').value,
      kaestchen: document.getElementById('rp-c').checked, chip: (V.chipDaten(document.getElementById('rp-chip')) || {}).text,
      markup: b.innerHTML.includes('Qz') || / selected| checked/.test(b.innerHTML),
    });
    const erst = lesen();
    document.body.appendChild(b);   // erneut eingefügt: der Beobachter läuft ein zweites Mal über dieselben Elemente
    await warten();
    const zweit = lesen();
    b.remove();
    return { erst, zweit };
  });
  expect(r.erst.mehrfach, 'beide Wahlen der Mehrfachauswahl').toEqual(['a', 'c']);
  expect(r.erst, 'Werte nach dem ersten Durchlauf').toEqual({ mehrfach: ['a', 'c'], text: 'RandTextQz', flaeche: 'RandFlaecheQz', kaestchen: true, chip: 'RandChipQz', markup: false });
  expect(r.zweit, 'der zweite Durchlauf ändert nichts').toEqual(r.erst);
});

test('[Gesicherte Kopie·Klasse·Rot-Beweis] ohne die Übernahme in die Eigenschaft stehen die Werte wieder im Markup', async ({ page }) => {
  test.setTimeout(90000);
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: VORNAME + ' ' + NACHNAME, pw: PW });
  const r = await alleFeldBauerZeichnen(page, { beobachterAus: true });
  expect(r.attribute, 'ohne Übernahme: Prüfwerte in Attributen').toBeGreaterThan(0);
  expect(r.textarea + r.zustandImMarkup, 'ohne Übernahme: Textarea-Inhalt und checked/selected').toBeGreaterThan(0);
});

/* Der Speicherweg von Chromium selbst: Page.captureSnapshot serialisiert die Seite wie „Seite speichern“ (MHTML). Ein Wert,
   den die Person eintippt und der nie neu gezeichnet wurde, darf darin nicht stehen. Gemessen nur in Chromium; WebKit und
   Firefox benennt SECURITY.md 6.9 als ungemessen. */
test('[Gesicherte Kopie·Chromium] im MHTML-Stand der Seite steht kein eingetippter und kein gezeichneter Feldwert', async ({ page, browserName }) => {
  // Page.captureSnapshot gibt es nur in Chromium; in anderen Browsern steht der Fall als Anmerkung, nicht als Auslassung.
  if (browserName !== 'chromium') { test.info().annotations.push({ type: 'nur-chromium', description: 'Page.captureSnapshot' }); return; }
  test.setTimeout(120000);
  await offeneSeiteSichern(page, h.KERN_URL_PRIVAT_DE);
  const GETIPPT = 'Holunder' + 'Getippt';
  await page.fill('[data-edit="givenName"]', GETIPPT);
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' });
  const flach = data.replace(/=\r?\n/g, '');   // quoted-printable: weiche Zeilenumbrüche zusammenziehen
  expect(flach.includes(GETIPPT), 'eingetippter Wert im MHTML').toBe(false);
  const attribut = (flach.match(/value=3D"[^"]*"|value="[^"]*"/g) || []).filter((a) => a.includes(NACHNAME));
  expect(attribut, 'gezeichneter Feldwert als value im MHTML').toEqual([]);
});

/* Leistung (15.10.2026): was kostet die Übernahme in die Eigenschaft? Gemessen wird dasselbe Zeichnen zweimal, mit und ohne
   Beobachter: alle Feld-Bauer zwanzigfach in einem Bereich (ein großes Depot hat höchstens so viele Felder auf einmal im
   Bild) und das Neuzeichnen des Bereichs Identität. Die Zahlen stehen als Anmerkung am Testlauf; die Grenze ist großzügig,
   sie fängt nur eine Größenordnung. */
test('[Gesicherte Kopie·Leistung] die Übernahme in die Eigenschaft kostet beim Zeichnen keine Größenordnung', async ({ page }) => {
  test.setTimeout(120000);
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: VORNAME + ' ' + NACHNAME, pw: PW });
  await h.oeffneSektor(page, 'identity');
  const r = await page.evaluate(async () => {
    const V = window.__vdOeffentlich;
    const felder = [];
    const sammeln = (f) => { felder.push(f); for (const u of (Array.isArray(f.felder) ? f.felder : [])) sammeln(u); };
    for (const s of window.__vdOeffentlich.bereicheAlle()) for (const sek of (s.sektionen || [])) for (const f of (sek.felder || [])) sammeln(f);   // Felder stehen je Sektion
    let einmal = '';
    for (const f of felder) { try { einmal += V.feldInputHTML(f, f.typ === 'checkbox' ? true : 'Wertprobe7Q'); } catch (_) { /* Feld ohne Bauer für diesen Wert */ } }
    const html = einmal.repeat(20);
    const runde = async () => {
      const b = document.createElement('div'); b.hidden = true; document.body.appendChild(b);
      const t0 = performance.now(); b.innerHTML = html; await Promise.resolve(); await new Promise((x) => setTimeout(x, 0));
      const t = performance.now() - t0; b.remove(); return t;
    };
    const bereich = async () => { const t0 = performance.now(); window.__vdOeffentlich.renderContent(); await new Promise((x) => setTimeout(x, 0)); return performance.now() - t0; };
    const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const messen = async (fn) => { const a = []; for (let i = 0; i < 7; i++) a.push(await fn()); return median(a); };
    const mit = { felder: await messen(runde), bereich: await messen(bereich) };
    V._FELDWERTE_BEOBACHTER.disconnect();
    const ohne = { felder: await messen(runde), bereich: await messen(bereich) };
    V._FELDWERTE_BEOBACHTER.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-chip', 'data-refm-bestand-override'] });
    return { elemente: (html.match(/<(input|textarea|select)\b/g) || []).length, mit, ohne };
  });
  test.info().annotations.push({ type: 'leistung', description: JSON.stringify(r) });
  console.log('[Gesicherte Kopie·Leistung] ' + JSON.stringify(r));
  expect(r.elemente, 'Vorbedingung: es wurde viel gezeichnet').toBeGreaterThan(200);
  expect(r.mit.felder, 'Feld-Bauer zwanzigfach: mit Beobachter').toBeLessThan(r.ohne.felder * 3 + 50);
  expect(r.mit.bereich, 'Bereich neu zeichnen: mit Beobachter').toBeLessThan(r.ohne.bereich * 3 + 50);
});

/* Klassenprobe am ganzen Dokument (15.10.2026, Gegenlesung): Statt einzelne Bauer aufzuzählen, wird ein Depot in allen Bereichen
   mit Prüfwerten gefüllt, gespeichert und neu gezeichnet. Danach steht in keinem Attribut irgendeines Elements des Dokuments ein
   Prüfwert, und keine Textarea trägt ihn als Inhalt. Gezeichneter Text (Textknoten) ist die benannte Grenze und wird nicht geprüft. */
test('[Gesicherte Kopie·Dokument] nach dem Zeichnen aller Bereiche mit Prüfwerten steht keiner in einem Attribut', async ({ page }) => {
  test.setTimeout(240000);
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: VORNAME + ' ' + NACHNAME, pw: PW });
  const bereiche = await page.evaluate(() => window.__vdOeffentlich.bereicheAlle().map((s) => s.id));
  let gesetzt = 0;
  const gewaehlt = {};   // Bereich → { Feld: gewählter Wert } für die Auswahlfelder
  for (const sid of bereiche) {
    await h.oeffneSektor(page, sid);
    const r = await page.evaluate((start) => {
      let n = 0;
      const wahl = {};
      for (const el of document.querySelectorAll('[data-edit][data-typ="text"], [data-edit][data-typ="textarea"], [data-edit-override]')) {
        if (el.disabled || el.readOnly) continue;
        el.value = 'Pw' + (start + n) + 'Qz'; n++;
      }
      for (const el of document.querySelectorAll('select[data-edit][data-typ="auswahl"]')) {
        if (el.disabled || el.options.length < 2) continue;
        el.value = el.options[el.options.length - 1].value;
        wahl[el.getAttribute('data-edit')] = el.value;
      }
      window.__vdOeffentlich.bearbeitungSpeichern();
      window.__vdOeffentlich.renderContent();
      return { n, wahl };
    }, gesetzt);
    gesetzt += r.n;
    gewaehlt[sid] = r.wahl;
  }
  expect(gesetzt, 'Vorbedingung: viele Felder gefüllt').toBeGreaterThan(30);
  expect(Object.values(gewaehlt).reduce((n, w) => n + Object.keys(w).length, 0), 'Vorbedingung: Auswahlfelder gewählt').toBeGreaterThan(5);
  const funde = [];
  for (const sid of bereiche) {
    await h.oeffneSektor(page, sid);
    funde.push(...await page.evaluate(([s, wahl]) => {
      const raus = [];
      // Nach Speichern und Neuzeichnen steht die Wahl weiter im Feld (sonst gingen Angaben beim nächsten Speichern verloren).
      for (const [fid, w] of Object.entries(wahl)) {
        const el = document.querySelector('select[data-edit="' + fid + '"]');
        if (el && el.value !== w) raus.push(s + ' · Auswahl verloren: ' + fid);
      }
      for (const el of document.querySelectorAll('*')) {
        for (const a of el.attributes) if (/Pw\d+Qz/.test(a.value)) raus.push(s + ' · ' + el.tagName.toLowerCase() + '[' + a.name + ']');
        if (el.tagName === 'TEXTAREA' && /Pw\d+Qz/.test(el.textContent)) raus.push(s + ' · textarea(Inhalt)');
      }
      return raus;
    }, [sid, gewaehlt[sid] || {}]));
  }
  expect([...new Set(funde)], 'Prüfwerte in Attributen').toEqual([]);
});
