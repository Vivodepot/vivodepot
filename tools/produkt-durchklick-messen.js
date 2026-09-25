#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   produkt-durchklick-messen.js — ein konfektioniertes Produkt headless durchklicken und
   jede Sicht als Text und Bildschirmfoto festhalten (v1-Abnahme, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Frisches Depot, dann jede Sicht, die die Seitenleiste anbietet (Anlass-Auswahl, Notfall, jede
   Navigationsgruppe mit jedem Bereich, Weitere Bereiche, Nachsehen), jedes Situationsblatt
   (situationenAlle), jedes Dokument mit Generator (moduleMitGenerator → dokumentOeffnen) und die
   Einstellungen mit allen Abschnitten aufgeklappt. Headless, nichts auf dem Bildschirm.

   Das Werkzeug MISST nur: es schreibt je Sicht den sichtbaren Text, die Überschriften und die
   Kandidaten der mechanischen Klassen (deutsche Wörter im englischen Produkt, doppelte
   Überschriften, interne Nummerierung, Kennungen und Platzhalter im Text, leere Überschriften,
   leere Icons). Ob ein Kandidat ein Fund ist, entscheidet der Bericht.

   Aufruf:
     node tools/produkt-durchklick-messen.js --produkt <pfad/zur/vivodepot.html> --sprache de|en --ausgabe <ordner>
   Ohne --produkt läuft es gegen den Kern im Repo (Sprache de).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const REPO = path.join(__dirname, '..');
const { kandidaten } = require('./lib/produkt-durchklick-kandidaten.js');

function argWert(name) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; }
function sauberName(s) { return String(s).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sicht'; }

async function sichtAufnehmen(page, name, ausgabe, liste, bereich) {
  const wurzel = bereich || '#content';
  const daten = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const sichtbar = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const ueber = [...el.querySelectorAll('h1,h2,h3,h4,summary,.sektion-titel,.bereich-kopf h2,.karte-titel')]
      .filter(sichtbar).map((h) => ({ tag: h.tagName.toLowerCase(), text: (h.innerText || '').trim() }));
    const leereIcons = [...el.querySelectorAll('.ico')].filter((i) => sichtbar(i) && !i.querySelector('svg,img') && !(i.textContent || '').trim()).length;
    return { text: el.innerText || '', ueberschriften: ueber, leereIcons };
  }, wurzel);
  if (!daten) return;
  const datei = String(liste.length + 1).padStart(3, '0') + '-' + sauberName(name) + '.png';
  try { await page.screenshot({ path: path.join(ausgabe, datei), fullPage: true }); } catch (e) { /* Foto ist Beleg, kein Muss */ }
  liste.push(Object.assign({ sicht: name, foto: datei }, daten));
}

// Alles schließen, was eine Sicht verdeckt: Anlass-Auswahl (Overlay), Dokument-Overlay, Dialog.
async function aufraeumen(page) {
  const zurueck = await page.$('#a-zurueck');
  if (zurueck && await zurueck.isVisible().catch(() => false)) { await zurueck.click().catch(() => {}); await page.waitForTimeout(150); }
  await page.evaluate(() => { const o = document.getElementById('pv-dok-overlay'); if (o) o.remove(); });
  await modalSchliessen(page);
}
async function overlaySelektor(page) {
  return page.evaluate(() => {
    const dok = document.getElementById('pv-dok-overlay');
    if (dok) return '#pv-dok-overlay';
    const ov = document.getElementById('overlay-inhalt');
    if (ov && ov.offsetParent !== null && (ov.innerText || '').trim()) return '#overlay-inhalt';
    const h = document.getElementById('modal-rueck');
    if (h && h.classList.contains('an')) return '#modal-inhalt';
    return null;
  });
}
async function modalSchliessen(page) {
  for (let i = 0; i < 3; i++) {
    const offen = await page.evaluate(() => { const h = document.getElementById('modal-rueck'); return !!(h && h.classList.contains('an')); });
    if (!offen) return;
    const knopf = await page.$('#m-abbr') || await page.$('#m-ok');
    if (knopf) await knopf.click().catch(() => {}); else break;
    await page.waitForTimeout(150);
  }
}

async function durchklicken({ produkt, sprache, ausgabe }) {
  fs.mkdirSync(ausgabe, { recursive: true });
  const { depotAnlegen, fsaStandardAttrappeEinrichten, einmalDialogeSchliessen } = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e && e.message || e)));
  const sichten = [];
  try {
    await fsaStandardAttrappeEinrichten(page);
    await page.goto('file://' + path.resolve(produkt));
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await sichtAufnehmen(page, 'start', ausgabe, sichten, 'body');
    await depotAnlegen(page, { name: sprache === 'en' ? 'Mary Example' : 'Maria Mustermann' });
    if (typeof einmalDialogeSchliessen === 'function') await einmalDialogeSchliessen(page).catch(() => {});
    await modalSchliessen(page);
    await sichtAufnehmen(page, 'uebersicht', ausgabe, sichten, 'body');

    // Seitenleiste: jede Schaltfläche, die eine Sicht öffnet.
    await page.evaluate(() => document.querySelectorAll('#sidebar details').forEach((d) => { d.open = true; }));
    const ziele = await page.evaluate(() => [...document.querySelectorAll('#sidebar button.nav-item')].map((b, i) => {
      const attr = [...b.attributes].filter((a) => a.name.startsWith('data-')).map((a) => '[' + a.name + '="' + a.value + '"]').join('');
      return { sel: attr ? '#sidebar button.nav-item' + attr : null, label: (b.innerText || '').replace(/\s+/g, ' ').trim(), i };
    }));
    for (const z of ziele) {
      if (!z.sel || /data-(verlassen|abmelden|schliessen|sperren|einlesen|herausgeben|depot-verlassen)/.test(z.sel)) continue;
      await page.evaluate(() => document.querySelectorAll('#sidebar details').forEach((d) => { d.open = true; }));
      const b = await page.$(z.sel);
      if (!b) continue;
      await b.click().catch(() => {});
      await page.waitForTimeout(250);
      await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
      await sichtAufnehmen(page, 'nav: ' + z.label, ausgabe, sichten, (await overlaySelektor(page)) || '#content');
      await aufraeumen(page);
    }
    await sichtAufnehmen(page, 'seitenleiste', ausgabe, sichten, '#sidebar');

    // Situationsblätter
    const situationen = await page.evaluate(() => (typeof window.__vdOeffentlich.situationenAlle === 'function' ? window.__vdOeffentlich.situationenAlle() : []).map((s) => s.id));
    for (const id of situationen) {
      await aufraeumen(page);
      const fehlerS = await page.evaluate((i) => { try { window.__vdOeffentlich.oeffneSituation(i); return null; } catch (e) { return String(e && e.message || e); } }, id);
      await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
      await sichtAufnehmen(page, 'situation: ' + id + (fehlerS ? ' (Fehler: ' + fehlerS + ')' : ''), ausgabe, sichten, (await overlaySelektor(page)) || '#content');
    }
    // Dokumente mit Generator (Vorsorge-Regal und Weitere Bereiche)
    // Ohne Geburtsdatum verweigern die Vorsorgedokumente die Erzeugung (Kern-Gate) — das Tor ist nicht Gegenstand.
    await page.evaluate(() => { try { window.__vdOeffentlich.ankerDaten().sektoren.identity = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.identity, { birthDate: '1961-03-11' }); } catch (e) {} });
    const dokumente = await page.evaluate(() => (typeof window.__vdOeffentlich.moduleMitGenerator === 'function' ? window.__vdOeffentlich.moduleMitGenerator() : []).map((m) => m.id));
    for (const id of dokumente) {
      await aufraeumen(page);
      const fehlerD = await page.evaluate((i) => { try { window.__vdOeffentlich.dokumentOeffnen(i); return null; } catch (e) { return String(e && e.message || e); } }, id);
      await page.waitForTimeout(250);
      await sichtAufnehmen(page, 'dokument: ' + id + (fehlerD ? ' (Fehler: ' + fehlerD + ')' : ''), ausgabe, sichten, (await overlaySelektor(page)) || '#content');
      await aufraeumen(page);
    }
    // Einstellungen
    await aufraeumen(page);
    await page.evaluate(() => { try { window.__vdOeffentlich.flowEinstellungen(); } catch (e) {} });
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelectorAll('#modal-inhalt details').forEach((d) => { d.open = true; }));
    await sichtAufnehmen(page, 'einstellungen', ausgabe, sichten, '#modal-inhalt');
    await modalSchliessen(page);
  } finally {
    await browser.close();
  }
  return { produkt, sprache, sichten, seitenfehler: fehler };
}

async function main() {
  const produkt = argWert('--produkt') || path.join(REPO, 'vivodepot.html');
  const sprache = argWert('--sprache') || 'de';
  const ausgabe = path.resolve(argWert('--ausgabe') || path.join(REPO, '.durchklick'));
  const aufnahme = await durchklicken({ produkt, sprache, ausgabe });
  const k = kandidaten(aufnahme);
  fs.writeFileSync(path.join(ausgabe, 'aufnahme.json'), JSON.stringify(aufnahme, null, 1));
  fs.writeFileSync(path.join(ausgabe, 'kandidaten.json'), JSON.stringify(k, null, 1));
  process.stdout.write('durchklick: ' + aufnahme.sichten.length + ' Sichten, ' + k.length + ' Kandidaten, ' + aufnahme.seitenfehler.length + ' Seitenfehler → ' + ausgabe + '\n');
}

module.exports = { durchklicken };
if (require.main === module) main().catch((e) => { process.stderr.write('durchklick: ABBRUCH — ' + (e && e.stack || e) + '\n'); process.exitCode = 1; });
