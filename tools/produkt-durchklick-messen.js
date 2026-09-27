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

   NACHTRAG 23.09.2026 (Durchklick-Abnahme über alle vier Produkte, Auftrag) — DREI
   ZUSÄTZLICHE, OPT-IN ACHSEN, EIN WERKZEUG statt einer zweiten Baustelle daneben
   (die ausdrückliche Auflage: „kein zweiter Ort neben produkt-durchklick-messen.js"):
     --persona <ID>              füllt das Depot vor dem bestehenden Sichten-Spaziergang mit
                                  einer persona-p*.js-Fixture (echt im Browser ausgeführt, s.
                                  tests/e2e/durchklick-abnahme-helpers.js#personaDepotAufbauen)
                                  statt es leer zu lassen — schließt genau die Lücke, die der
                                  17.09.-Bericht selbst benennt („Nächster Durchgang mit einem
                                  Referenzdepot"), jetzt generisch über alle 20 Personas statt
                                  nur des einen festen Referenzdepots.
     --sichten-achse              zusätzlich ein ZAHLEN-Maß X von Y (nicht Text/Screenshot):
                                  `sichten-erfassen.js#sichtenErmitteln/sichtOeffnen` öffnet
                                  JEDE Sicht einzeln (auch Angehörigen-Blätter und interne
                                  `fn:`-Kandidaten, die der Sidebar-Spaziergang oben NICHT
                                  einzeln anfährt) und zählt, wie viele wirklich öffnen. Mit
                                  --persona zusammen: Y/X für DIESES befüllte Depot.
     --geburtsdatum-schreibwege    echter UI-Klick durch die beiden Schreibwege, die zuletzt
                                  (14.09.) ein Geburtsdatum verloren haben — Register-Formular
                                  und Geburts-Assistent (gebwiz) — mit Meldung, unter welchem
                                  Feldnamen (alt `geburtsdatum` / neu `birthDate`) das Ergebnis
                                  in `data.menschen[]` landet, und ob der Weg in diesem Produkt
                                  überhaupt erreichbar ist (Pro trägt keinen Sektor `people`).
     --angehoerigen-quellen        Befund der Förder-Bereich (23.09.2026): prüft, ob die beiden
                                  Todesfall-Angehörigen-Blätter „Beerdigung und Nachlass"
                                  (`beerdigung`) und „Behörden und Nachlass"
                                  (`behoerden_nachlass`) nicht nur ALS SICHT existieren, sondern
                                  wirklich TEXT-INHALT tragen (Mindestlänge, kein leerer/fast
                                  leerer Rumpf) — eine bloß vorhandene, aber leere Region zählt
                                  NICHT als grün. Harter Befund-Kandidat, blockiert laut Auftrag
                                  das Einschalten von VD Privat, wenn leer.
     --notfallkarte-qr             23.09.2026: Notfallkarte als PDF erzeugen, Inhalt UND
                                  Struktur des QR prüfen — AUSDRÜCKLICH NICHT DECODIERT (kein
                                  QR-Decoder im Werkzeugkasten; echtes Decodieren ist ein eigener
                                  Posten nach dem Einschalten, entschieden). (a) Quellebene:
                                  notfallKontakteVcard() liefert eine gültige vCard (genau das,
                                  was flowNotfallkartePdf() in den QR codiert). (c) Struktur:
                                  pdfimages -list zeigt ein eingebettetes Bild in plausibler
                                  QR-Größe (annähernd quadratisch, nicht winzig).
   Jede Achse schreibt ihre eigene Datei neben `aufnahme.json`/`kandidaten.json` im selben
   `--ausgabe`-Ordner — kein neuer Ausgabe-Ort, keine zweite Namenskonvention.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const REPO = path.join(__dirname, '..');
const { kandidaten } = require('./lib/produkt-durchklick-kandidaten.js');
const { personaDepotAufbauen } = require(path.join(REPO, 'tests', 'e2e', 'durchklick-abnahme-helpers.js'));
const { sichtenErmitteln, sichtOeffnen } = require(path.join(REPO, 'tests', 'e2e', 'sichten-erfassen.js'));

function argWert(name) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; }
function sauberName(s) { return String(s).replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sicht'; }

// SCREENSHOT_MODUS (Profiling-Fund 23.09.2026): ein Screenshot je Sicht kostete beim
// P1/privat-de-Dry-Run den Großteil der 596s (volle Seite, headless, Diskschreiben × ~39). 'immer'
// bleibt für gezielte Einzelläufe erhalten; der große Lauf nutzt 'befund' — Foto nur, wenn diese
// Sicht selbst einen mechanischen Kandidaten trägt (Sprachmix, Kennung, doppelte Überschrift, …),
// alle TEXT-Prüfungen bleiben für JEDE Sicht erhalten (a, „ohne Prüfverlust").
async function sichtAufnehmen(page, name, ausgabe, liste, bereich, screenshotModus, sprache) {
  const wurzel = bereich || '#content';
  const tEvalStart = Date.now();
  const daten = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const sichtbar = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    const ueber = [...el.querySelectorAll('h1,h2,h3,h4,summary,.sektion-titel,.bereich-kopf h2,.karte-titel')]
      .filter(sichtbar).map((h) => ({ tag: h.tagName.toLowerCase(), text: (h.innerText || '').trim() }));
    const leereIcons = [...el.querySelectorAll('.ico')].filter((i) => sichtbar(i) && !i.querySelector('svg,img') && !(i.textContent || '').trim()).length;
    return { text: el.innerText || '', ueberschriften: ueber, leereIcons };
  }, wurzel);
  const evalMs = Date.now() - tEvalStart;
  if (!daten) return;
  const modus = screenshotModus || 'immer';
  let foto = null;
  let screenshotMs = 0;
  const brauchtFoto = modus === 'immer' || (modus === 'befund' && kandidaten({ sprache: sprache || 'de', sichten: [Object.assign({ sicht: name }, daten)] }).length > 0);
  if (brauchtFoto) {
    const datei = String(liste.length + 1).padStart(3, '0') + '-' + sauberName(name) + '.png';
    const tFotoStart = Date.now();
    try { await page.screenshot({ path: path.join(ausgabe, datei), fullPage: true }); foto = datei; } catch (e) { /* Foto ist Beleg, kein Muss */ }
    screenshotMs = Date.now() - tFotoStart;
  }
  liste.push(Object.assign({ sicht: name, foto, evalMs, screenshotMs }, daten));
}

// Alles schließen, was eine Sicht verdeckt: Anlass-Auswahl (Overlay), Dokument-Overlay, Dialog.
async function aufraeumen(page) {
  const zurueck = await page.$('#a-zurueck');
  if (zurueck && await zurueck.isVisible().catch(() => false)) { await zurueck.click().catch(() => {}); await page.waitForTimeout(150); }
  await page.evaluate(() => { const o = document.getElementById('pv-dok-overlay'); if (o) o.remove(); });
  // Werkzeug-Fund 23.09.2026 (Auftrag, Diagnose der 16 Klick-Fehlschläge): der Sidebar-Nav
  // `[data-hilfe="1"]` öffnet ein Vollbild-`#hilfe-overlay` (vivodepot.html:8254-8262) — dieselbe
  // Klasse Overlay wie `#pv-dok-overlay`, aber `aufraeumen()` kannte es nicht. Der Klick-Spaziergang
  // besucht „Hilfe" wie jeden anderen Sidebar-Eintrag, das Overlay blieb offen und deckte JEDEN
  // folgenden Klick ab (`elementFromPoint` zeigte `#hilfe-overlay` über BODY) — 16 von 39 Sichten
  // wurden dadurch NIE besucht, ein Werkzeugfehler (Auslassung in aufraeumen()), kein Produktfehler:
  // eine echte Bürgerin hätte „Schließen" im Overlay geklickt, dieses Werkzeug tat es nicht.
  await page.evaluate(() => { const o = document.getElementById('hilfe-overlay'); if (o) o.remove(); });
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

async function durchklicken({ produkt, sprache, ausgabe, personaId, screenshotModus }) {
  fs.mkdirSync(ausgabe, { recursive: true });
  const modus = screenshotModus || 'immer';
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
    await sichtAufnehmen(page, 'start', ausgabe, sichten, 'body', modus, sprache);
    await depotAnlegen(page, { name: sprache === 'en' ? 'Mary Example' : 'Maria Mustermann' });
    if (typeof einmalDialogeSchliessen === 'function') await einmalDialogeSchliessen(page).catch(() => {});
    await modalSchliessen(page);
    // --persona (Nachtrag 23.09.2026): das Depot VOR dem Spaziergang befüllen, statt leer zu
    // lassen — schließt die 17.09.-Lücke „Nächster Durchgang mit einem Referenzdepot", jetzt
    // mit jeder der 20 persona-p*.js-Fixturen, nicht nur dem einen festen Referenzdepot.
    if (personaId) await personaDepotAufbauen(page, personaId);
    await sichtAufnehmen(page, 'uebersicht', ausgabe, sichten, 'body', modus, sprache);

    // Seitenleiste: jede Schaltfläche, die eine Sicht öffnet.
    await page.evaluate(() => document.querySelectorAll('#sidebar details').forEach((d) => { d.open = true; }));
    const ziele = await page.evaluate(() => [...document.querySelectorAll('#sidebar button.nav-item')].map((b, i) => {
      const attr = [...b.attributes].filter((a) => a.name.startsWith('data-')).map((a) => '[' + a.name + '="' + a.value + '"]').join('');
      return { sel: attr ? '#sidebar button.nav-item' + attr : null, label: (b.innerText || '').replace(/\s+/g, ' ').trim(), i };
    }));
    for (const z of ziele) {
      if (!z.sel || /data-(verlassen|abmelden|schliessen|sperren|einlesen|herausgeben|depot-verlassen)/.test(z.sel)) continue;
      const tSchritt = Date.now();
      await page.evaluate(() => document.querySelectorAll('#sidebar details').forEach((d) => { d.open = true; }));
      const b = await page.$(z.sel);
      if (!b) continue;
      // KURZE Frist (Profiling-Fund 23.09.2026): ohne eigene Frist wartet Playwrights
      // `.click()` bis zu 30s auf Anklickbarkeit, bevor `.catch()` den Fehlschlag schluckt — bei
      // einem befüllten Persona-Depot schlugen ~16 von 39 Klicks so fehl, macht allein ~485s der
      // gemessenen 596s aus screenshots waren mit 1,2s Gesamtsumme nie der Engpass. 3s reicht für
      // einen echten Klick; ein Fehlschlag wird jetzt SCHNELL UND SICHTBAR (klickFehlgeschlagen),
      // nicht still verschluckt.
      let klickFehlgeschlagen = false;
      let klickFehlerText = null;
      try {
        await b.click({ timeout: 3000 });
      } catch (e) {
        klickFehlgeschlagen = true;
        klickFehlerText = String((e && e.message) || e).slice(0, 500);
        // Diagnose am Fehlschlag selbst (Auftrag 23.09.2026): Screenshot, `elementFromPoint`
        // an der Klickstelle — klärt, ob etwas die Seitenleiste VERDECKT (Produktfehler, Nutzerin
        // wäre genauso blockiert) oder der Selektor/Zustand nur diesem Werkzeug fehlschlägt.
        try {
          const box = await b.boundingBox();
          if (box) {
            const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
            const kette = await page.evaluate(([x, y]) => {
              const el = document.elementFromPoint(x, y);
              if (!el) return null;
              const c = []; let cur = el;
              for (let i = 0; i < 4 && cur; i++) { c.push({ tag: cur.tagName, id: cur.id || null, cls: cur.className ? String(cur.className).slice(0, 120) : null }); cur = cur.parentElement; }
              return c;
            }, [cx, cy]);
            const diagnoseDatei = String(sichten.length + 1).padStart(3, '0') + '-' + sauberName('klick-fehlschlag-' + z.label) + '.png';
            await page.screenshot({ path: path.join(ausgabe, diagnoseDatei) }).catch(() => {});
            sichten.__klickDiagnosen = sichten.__klickDiagnosen || [];
            sichten.__klickDiagnosen.push({ label: z.label, sel: z.sel, fehler: klickFehlerText, elementFromPointKette: kette, screenshot: diagnoseDatei });
          }
        } catch (_) { /* Diagnose ist Beleg, kein Muss */ }
      }
      await page.waitForTimeout(250);
      await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
      const klickWartenMs = Date.now() - tSchritt;
      await sichtAufnehmen(page, 'nav: ' + z.label, ausgabe, sichten, (await overlaySelektor(page)) || '#content', modus, sprache);
      sichten[sichten.length - 1].klickWartenMs = klickWartenMs;
      sichten[sichten.length - 1].klickFehlerText = klickFehlerText;
      sichten[sichten.length - 1].klickFehlgeschlagen = klickFehlgeschlagen;
      await aufraeumen(page);
    }
    await sichtAufnehmen(page, 'seitenleiste', ausgabe, sichten, '#sidebar', modus, sprache);

    // Situationsblätter
    const situationen = await page.evaluate(() => (typeof window.__vdOeffentlich.situationenAlle === 'function' ? window.__vdOeffentlich.situationenAlle() : []).map((s) => s.id));
    for (const id of situationen) {
      await aufraeumen(page);
      const fehlerS = await page.evaluate((i) => { try { window.__vdOeffentlich.oeffneSituation(i); return null; } catch (e) { return String(e && e.message || e); } }, id);
      await page.waitForTimeout(200);
      await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
      await sichtAufnehmen(page, 'situation: ' + id + (fehlerS ? ' (Fehler: ' + fehlerS + ')' : ''), ausgabe, sichten, (await overlaySelektor(page)) || '#content', modus, sprache);
    }
    // Dokumente mit Generator (Vorsorge-Regal und Weitere Bereiche)
    // Ohne Geburtsdatum verweigern die Vorsorgedokumente die Erzeugung (Kern-Gate) — das Tor ist nicht Gegenstand.
    await page.evaluate(() => { try { window.__vdOeffentlich.ankerDaten().sektoren.identity = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.identity, { birthDate: '1961-03-11' }); } catch (e) {} });
    const dokumente = await page.evaluate(() => (typeof window.__vdOeffentlich.moduleMitGenerator === 'function' ? window.__vdOeffentlich.moduleMitGenerator() : []).map((m) => m.id));
    for (const id of dokumente) {
      await aufraeumen(page);
      const fehlerD = await page.evaluate((i) => { try { window.__vdOeffentlich.dokumentOeffnen(i); return null; } catch (e) { return String(e && e.message || e); } }, id);
      await page.waitForTimeout(250);
      await sichtAufnehmen(page, 'dokument: ' + id + (fehlerD ? ' (Fehler: ' + fehlerD + ')' : ''), ausgabe, sichten, (await overlaySelektor(page)) || '#content', modus, sprache);
      await aufraeumen(page);
    }
    // Einstellungen
    await aufraeumen(page);
    await page.evaluate(() => { try { window.__vdOeffentlich.flowEinstellungen(); } catch (e) {} });
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelectorAll('#modal-inhalt details').forEach((d) => { d.open = true; }));
    await sichtAufnehmen(page, 'einstellungen', ausgabe, sichten, '#modal-inhalt', modus, sprache);
    await modalSchliessen(page);
  } finally {
    await browser.close();
  }
  const klickFehlgeschlagenAnzahl = sichten.filter((s) => s.klickFehlgeschlagen).length;
  // ROT, NICHT GRÜN MIT FUSSNOTE (23.09.2026): schlägt ein Sektor-Nav-Klick fehl, besucht
  // der Durchklick den Bereich GAR NICHT — ein Lauf, der trotzdem als „gelaufen" durchgeht, wäre
  // grün, weil der Gegenstand fehlt, nicht weil er in Ordnung war.
  return {
    produkt, sprache, persona: personaId || null, sichten, seitenfehler: fehler,
    klickFehlgeschlagenAnzahl, klickDiagnosen: sichten.__klickDiagnosen || [],
    rot: klickFehlgeschlagenAnzahl > 0 || fehler.length > 0,
  };
}

// --sichten-achse: Zahlen-Maß X von Y über JEDE Sicht einzeln (sektor:/situation:/angSituation:/
// fn:), nicht nur die, die der Sidebar-Spaziergang oben anfährt. Eigener Browser/eigene Page —
// unabhängig von durchklicken(), damit ein Fehlschlag hier den Screenshot-Spaziergang nicht mitreißt.
async function sichtenAchseMessen({ produkt, sprache, personaId }) {
  const { depotAnlegen, fsaStandardAttrappeEinrichten } = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await fsaStandardAttrappeEinrichten(page);
    await page.goto('file://' + path.resolve(produkt));
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await depotAnlegen(page, { name: sprache === 'en' ? 'Mary Example' : 'Maria Mustermann' });
    if (personaId) await personaDepotAufbauen(page, personaId);
    const { alle, nichtErreichbar, anzahl } = await sichtenErmitteln(page, { alleInternen: true });
    const ergebnisse = [];
    for (const kennung of alle) ergebnisse.push({ kennung, ...(await sichtOeffnen(page, kennung)) });
    const offen = ergebnisse.filter((r) => r.geoeffnet);
    return {
      produkt, sprache, persona: personaId || null,
      y: alle.length, x: offen.length, nichtErreichbarAnzahl: nichtErreichbar.length, anzahlJeKlasse: anzahl,
      fehlgeschlagen: ergebnisse.filter((r) => !r.geoeffnet).map((r) => ({ kennung: r.kennung, grund: r.grund })),
    };
  } finally {
    await browser.close();
  }
}

// --geburtsdatum-schreibwege: echter Klick durch Register-Formular und Geburts-Assistent (gebwiz),
// s. Kopfkommentar. Ein Produkt je Aufruf, wie der Rest dieses Werkzeugs auch — der Aufrufer
// iteriert über die vier Produkte, keine eigene Vier-Produkte-Schleife hier.
async function geburtsdatumSchreibwegeMessen({ produkt, sprache }) {
  const { oeffneApp, depotAnlegen } = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
  const { registerFormularGeburtsdatumWeg, gebwizGeburtsdatumWeg } = require(path.join(REPO, 'tests', 'e2e', 'durchklick-abnahme-helpers.js'));
  const browser = await chromium.launch({ headless: true });
  // ZWEI eigene Pages, nicht eine wiederverwendete (Fund bei der ersten Konsolidierungs-Probe,
  // 23.09.2026): ein zweiter `page.goto()` auf DERSELBEN Page nach einem ungespeicherten,
  // befüllten Depot hängt — vermutlich `beforeunload`, das Headless-Chromium hier nicht wie im
  // Playwright-Test-Runner automatisch wegklickt. Zwei Pages umgehen das Problem strukturell,
  // statt einen Dialog-Handler zu erraten.
  const ergebnisse = [];
  try {
    const pageF = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await oeffneApp(pageF, { url: 'file://' + path.resolve(produkt) });
    await depotAnlegen(pageF, { name: sprache === 'en' ? 'Mary Example' : 'Maria Mustermann' });
    ergebnisse.push(await registerFormularGeburtsdatumWeg(pageF));
    await pageF.close();

    const pageW = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await oeffneApp(pageW, { url: 'file://' + path.resolve(produkt) });
    await depotAnlegen(pageW, { name: sprache === 'en' ? 'Mary Example' : 'Maria Mustermann' });
    ergebnisse.push(await gebwizGeburtsdatumWeg(pageW));
  } finally {
    await browser.close();
  }
  return { produkt, sprache, ergebnisse };
}

// --angehoerigen-quellen: Beerdigung/Behörden-und-Nachlass-Blätter müssen ECHTEN Inhalt tragen,
// nicht nur als Sicht existieren. Ids aus den Vorlagen (tools/angehoerigen-vorlagen/*.json):
// `beerdigung` ("Beerdigung und Nachlass"), `behoerden_nachlass` ("Behörden und Nachlass").
// MINDESTLAENGE ist ein grobes Sieb (kein Textsatz-Vergleich): die Vorlagen tragen mehrere
// Absätze Anleitungstext je Blatt — ein leeres/fast leeres Ergebnis (Object.freeze([]) im rohen
// Gerüst, s. Kopfkommentar) fällt weit darunter.
const ANGEHOERIGEN_BLAETTER_TODESFALL = [
  { id: 'beerdigung', titel: 'Beerdigung und Nachlass' },
  { id: 'behoerden_nachlass', titel: 'Behörden und Nachlass' },
];
const ANGEHOERIGEN_MINDESTLAENGE = 200;

async function angehoerigenQuellenPruefen({ produkt, sprache }) {
  const { depotAnlegen, fsaStandardAttrappeEinrichten } = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const ergebnisse = [];
  try {
    await fsaStandardAttrappeEinrichten(page);
    await page.goto('file://' + path.resolve(produkt));
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await depotAnlegen(page, { name: sprache === 'en' ? 'Mary Example' : 'Maria Mustermann' });
    for (const { id, titel } of ANGEHOERIGEN_BLAETTER_TODESFALL) {
      const r = await sichtOeffnen(page, 'angSituation:' + id);
      if (!r.geoeffnet) {
        ergebnisse.push({ id, titel, geoeffnet: false, grund: r.grund, textLaenge: null, inhaltGenug: false });
        continue;
      }
      const text = await page.evaluate(() => {
        const el = document.getElementById('overlay-inhalt') || document.getElementById('modal-inhalt') || document.getElementById('content');
        return el ? (el.innerText || '') : '';
      });
      const laenge = text.trim().length;
      ergebnisse.push({ id, titel, geoeffnet: true, textLaenge: laenge, inhaltGenug: laenge >= ANGEHOERIGEN_MINDESTLAENGE });
    }
  } finally {
    await browser.close();
  }
  return { produkt, sprache, ergebnisse, alleGenug: ergebnisse.every((r) => r.inhaltGenug) };
}

// --notfallkarte-qr: s. Kopfkommentar. (a) Quellebene + (c) Struktur, AUSDRÜCKLICH kein Decodieren.
async function notfallkartePdfQrPruefen({ produkt, sprache, personaId }) {
  const os = require('node:os');
  const { execFileSync } = require('node:child_process');
  const { depotAnlegen, fsaStandardAttrappeEinrichten } = require(path.join(REPO, 'tests', 'e2e', 'helpers.js'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const ergebnis = { produkt, sprache, persona: personaId || null };
  try {
    await fsaStandardAttrappeEinrichten(page);
    await page.goto('file://' + path.resolve(produkt));
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await depotAnlegen(page, { name: sprache === 'en' ? 'Mary Example' : 'Maria Mustermann' });
    if (personaId) await personaDepotAufbauen(page, personaId);

    // notfallKontakteVcard() liest AUSSCHLIESSLICH health.emergencyContacts (Refs auf
    // data.menschen[] MIT Telefonnummer) — nicht irgendeine Person im Register. Keine der
    // Persona-Fixturen setzt dieses Feld (eigener Befund, nicht Teil dieser Probe). Ohne
    // mindestens einen anrufbaren Notfallkontakt bliebe die vCard IMMER leer, egal welche
    // Persona — das prüfte dann nichts. Darum: fehlt das Feld, wird hier EINE vorhandene
    // Person mit Telefonnummer als Notfallkontakt gesetzt (kein neuer Mensch erfunden).
    ergebnis.emergencyContactsAutoGesetzt = await page.evaluate(() => {
      const V = window.__vdOeffentlich;
      const bestehende = (V.ankerDaten().sektoren.health || {}).emergencyContacts;
      if (Array.isArray(bestehende) && bestehende.length) return false;
      const kandidat = (V.ankerDaten().menschen || []).find((m) => m && m.tel);
      if (!kandidat) return null;   // kein Mensch mit Telefonnummer im Depot — nichts zu setzen
      V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: kandidat.id }]);
      V.renderContent();
      return true;
    });

    // (a) Quellebene: dieselbe Funktion, die flowNotfallkartePdf() selbst für den QR-Inhalt liest.
    const vcard = await page.evaluate(() => window.__vdOeffentlich.notfallKontakteVcard());
    ergebnis.vcardVorhanden = typeof vcard === 'string' && vcard.length > 0;
    ergebnis.vcardGueltig = ergebnis.vcardVorhanden && vcard.startsWith('BEGIN:VCARD') && vcard.includes('END:VCARD');
    ergebnis.vcardLaenge = vcard ? vcard.length : 0;

    // (c) Struktur: PDF erzeugen, herunterladen, mit pdfimages nach einem plausibel-quadratischen
    // eingebetteten Bild suchen (die QR-Grafik) — kein Decodieren des Inhalts.
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    const wurfFehler = await page.evaluate(() => {
      try { window.__vdOeffentlich.flowNotfallkartePdf(); return null; } catch (e) { return String((e && e.message) || e); }
    });
    ergebnis.aufrufFehler = wurfFehler;
    let download = await downloadPromise;
    if (!download) {
      // `_unstimmigWarnenMitFundenDannFortfahren` zeigt bei unstimmigen Feldern einen
      // Bestätigungs-Dialog VOR dem eigentlichen Erzeugen — „trotzdem fortfahren" klicken,
      // falls er offen ist, statt das als Fehlschlag zu werten.
      const bestaetigung = page.locator('#m-ok');
      if (await bestaetigung.isVisible({ timeout: 1000 }).catch(() => false)) {
        // 23.09.2026: der Unstimmigkeits-Dialog ist SELBST ein Befund — im Depot passt
        // etwas nicht zusammen (Produkt- oder Fixture-Seite). „Trotzdem fortfahren" klicken, damit
        // der Weg weiterläuft, aber Titel+Fundtext werden festgehalten, nicht still weggeklickt.
        const dialogText = await page.evaluate(() => {
          const t = document.getElementById('modal-titel');
          const k = document.querySelector('.export-unstimmig-hinweis');
          return { titel: t ? t.textContent : null, text: k ? k.textContent : null };
        });
        ergebnis.unstimmigkeitsDialog = { aufgetreten: true, ...dialogText };
        const zweiterDownload = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await bestaetigung.click().catch(() => {});
        download = await zweiterDownload;
      }
    }
    if (!ergebnis.unstimmigkeitsDialog) ergebnis.unstimmigkeitsDialog = { aufgetreten: false };
    if (!download) {
      ergebnis.pdfErzeugt = false;
      ergebnis.grund = wurfFehler || 'kein Download-Ereignis (Toast „leer" oder Bibliothek fehlt?)';
    } else {
      ergebnis.pdfErzeugt = true;
      const pdfPfad = await download.path();
      const bilder = execFileSync('pdfimages', ['-list', pdfPfad], { encoding: 'utf8' });
      // Kopfzeilen von `pdfimages -list` überspringen (zwei Zeilen), Spalten: page num type width height ...
      const zeilen = bilder.trim().split('\n').slice(2).filter(Boolean);
      const bildKandidaten = zeilen.map((z) => {
        const teile = z.trim().split(/\s+/);
        return { breite: Number(teile[3]), hoehe: Number(teile[4]) };
      });
      const qrKandidat = bildKandidaten.find((b) => b.breite > 20 && b.hoehe > 20 && Math.abs(b.breite - b.hoehe) / Math.max(b.breite, b.hoehe) < 0.15);
      ergebnis.eingebetteteBilderAnzahl = bildKandidaten.length;
      ergebnis.qrBildGefunden = !!qrKandidat;
      ergebnis.qrBildMasse = qrKandidat || null;
    }
  } finally {
    await browser.close();
  }
  ergebnis.grün = !!(ergebnis.vcardGueltig && ergebnis.pdfErzeugt && ergebnis.qrBildGefunden);
  ergebnis.hinweis = 'QR NICHT decodiert — nur Inhalt (vCard-Quelle) und Struktur (eingebettetes Bild, plausible Größe) geprüft.';
  return ergebnis;
}

async function main() {
  const produkt = argWert('--produkt') || path.join(REPO, 'vivodepot.html');
  const sprache = argWert('--sprache') || 'de';
  const ausgabe = path.resolve(argWert('--ausgabe') || path.join(REPO, '.durchklick'));
  const personaId = argWert('--persona');
  const screenshotModus = argWert('--screenshot-modus') || 'immer';   // 'immer' | 'befund'
  fs.mkdirSync(ausgabe, { recursive: true });

  const aufnahme = await durchklicken({ produkt, sprache, ausgabe, personaId, screenshotModus });
  const k = kandidaten(aufnahme);
  fs.writeFileSync(path.join(ausgabe, 'aufnahme.json'), JSON.stringify(aufnahme, null, 1));
  fs.writeFileSync(path.join(ausgabe, 'kandidaten.json'), JSON.stringify(k, null, 1));
  process.stdout.write('durchklick: ' + aufnahme.sichten.length + ' Sichten, ' + k.length + ' Kandidaten, ' + aufnahme.seitenfehler.length + ' Seitenfehler'
    + (personaId ? ' (Persona ' + personaId + ')' : '') + ' → ' + ausgabe + '\n');
  if (aufnahme.rot) {
    process.stdout.write('durchklick: *** ROT *** ' + aufnahme.klickFehlgeschlagenAnzahl + ' Klick(s) fehlgeschlagen — '
      + 'diese Sicht(en) wurden NICHT besucht, ein grüner Lauf wäre grün gewesen, weil der Gegenstand fehlt. Diagnosen in aufnahme.json/klickDiagnosen.\n');
    process.exitCode = 1;
  }

  if (process.argv.includes('--sichten-achse')) {
    const s = await sichtenAchseMessen({ produkt, sprache, personaId });
    fs.writeFileSync(path.join(ausgabe, 'sichten-achse.json'), JSON.stringify(s, null, 1));
    process.stdout.write('sichten-achse: ' + s.x + ' von ' + s.y + ' Sichten geöffnet'
      + (personaId ? ' (Persona ' + personaId + ')' : '') + ' → ' + path.join(ausgabe, 'sichten-achse.json') + '\n');
  }
  if (process.argv.includes('--geburtsdatum-schreibwege')) {
    const g = await geburtsdatumSchreibwegeMessen({ produkt, sprache });
    fs.writeFileSync(path.join(ausgabe, 'geburtsdatum-schreibwege.json'), JSON.stringify(g, null, 1));
    process.stdout.write('geburtsdatum-schreibwege: ' + g.ergebnisse.map((r) => r.weg + '=' + (r.erreichbar ? (r.schluessel || []).join('/') || 'leer' : 'nicht erreichbar')).join(', ')
      + ' → ' + path.join(ausgabe, 'geburtsdatum-schreibwege.json') + '\n');
  }
  if (process.argv.includes('--angehoerigen-quellen')) {
    const a = await angehoerigenQuellenPruefen({ produkt, sprache });
    fs.writeFileSync(path.join(ausgabe, 'angehoerigen-quellen.json'), JSON.stringify(a, null, 1));
    process.stdout.write('angehoerigen-quellen: ' + a.ergebnisse.map((r) => r.titel + '=' + (r.geoeffnet ? r.textLaenge + 'Z' + (r.inhaltGenug ? '' : ' ZU KURZ') : 'NICHT ERREICHBAR')).join(', ')
      + (a.alleGenug ? '' : ' — HARTER BEFUND') + ' → ' + path.join(ausgabe, 'angehoerigen-quellen.json') + '\n');
  }
  if (process.argv.includes('--notfallkarte-qr')) {
    const q = await notfallkartePdfQrPruefen({ produkt, sprache, personaId });
    fs.writeFileSync(path.join(ausgabe, 'notfallkarte-qr.json'), JSON.stringify(q, null, 1));
    process.stdout.write('notfallkarte-qr: vcard=' + q.vcardGueltig + ', pdf=' + q.pdfErzeugt + ', qrBild=' + q.qrBildGefunden
      + (q.emergencyContactsAutoGesetzt ? ' [Notfallkontakt: EINGRIFF DER PROBE gesetzt, keine Persona trägt einen]' : '')
      + (q.unstimmigkeitsDialog && q.unstimmigkeitsDialog.aufgetreten ? ' [UNSTIMMIGKEITS-DIALOG: ' + q.unstimmigkeitsDialog.titel + ' — ' + q.unstimmigkeitsDialog.text + ']' : '')
      + (q.grün ? '' : ' — HARTER BEFUND (' + (q.grund || q.aufrufFehler || 'siehe Datei') + ')')
      + ' → ' + path.join(ausgabe, 'notfallkarte-qr.json') + '\n');
  }
}

module.exports = {
  durchklicken, sichtenAchseMessen, geburtsdatumSchreibwegeMessen, angehoerigenQuellenPruefen,
  notfallkartePdfQrPruefen,
};
if (require.main === module) main().catch((e) => { process.stderr.write('durchklick: ABBRUCH — ' + (e && e.stack || e) + '\n'); process.exitCode = 1; });
