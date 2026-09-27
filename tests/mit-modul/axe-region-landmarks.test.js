'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fixliste Nr. 7 — kein Seiteninhalt ausserhalb von Landmarks (axe `region`)
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND, DER DAZU FUEHRTE (27.07.2026): axe meldete `region` mit 20
   Knoten ueber zehn Bereichs-Sichten. Die Vermutung war, die Bereichsinhalte
   laegen ausserhalb von <main>. Gemessen war es etwas anderes: es waren
   ZWEIMAL ZEHN Meldungen ueber DENSELBEN Dialog — das Notfall-Blatt-Angebot,
   das nach dem Anlegen stehenbleibt und ueber allen zehn Messungen offen war.
   Der Bereichsinhalt selbst lag schon immer in <main id="content">.

   Der echte Mangel dahinter: #modal-inhalt war ein namenloses <div>. Nichts
   sagte einer Vorleserin „Dialog", und axe zaehlte Ueberschrift und Text
   folgerichtig als landmark-losen Seiteninhalt.

   WARUM DIESE PRUEFUNG AM LAUFENDEN CODE MISST UND NICHT AM QUELLTEXT:
   `role="dialog"` im Markup ist eine Deklaration. Ob sie im gerenderten
   Zustand greift — ob der Dialog also wirklich als Dialog dasteht, mit Namen,
   ueber allen zehn Bereichen —, sagt nur eine Messung. Ein grep waere hier
   wertlos: er stuende auch dann gruen da, wenn ui.modal die Ueberschrift
   (und damit den Namen) eines Tages woanders hinschriebe.

   DREI KONTROLLEN, damit ein gruener Lauf etwas heisst:
     · Positivkontrolle    — `role="dialog"` entfernt → der Dialog wird gemeldet
     · Vakuum-Kontrolle    — ein landmark-loser Absatz an <body> → wird gemeldet
     · Negativkontrolle    — derselbe Absatz IN <main> → wird NICHT gemeldet
   Ohne die dritte waere die Pruefung von „meldet alles" nicht zu unterscheiden.

   MELDEPFLICHT: jeder Zustand belegt, dass er erreicht wurde (Depot angelegt,
   Bereich gezeichnet, Dialog tatsaechlich offen bzw. tatsaechlich zu). Ein
   Lauf auf dem Eingangsschirm haette sonst zehnmal dasselbe leere Bild
   gemessen und waere gruen gewesen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// S8 (U2-ADR-428): das rohe Gerüst trägt keinen deutschen Satz mehr — auf ihm rendert der Eingangsschirm kein `#w-anfangen`, und die Messung liefe ins Leere.
// Gemessen wird darum am konfektionierten deutschen Produkt (dasselbe Depot-Einrichten wie zuvor, nur am Produkt statt am Gerüst).
const { produktHtml } = require('../produkt-html-erzeugen.js');
const HTML_PATH = produktHtml('privat-de');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const AXE = require.resolve('axe-core');
const SEKTOREN = ['identitaet', 'gesundheit', 'finanzen', 'wohnen', 'mobilitaet',
  'vorsorge', 'verwaltung', 'meine-menschen', 'bildung', 'sozialversicherung'];
const PW = 'Landmark-2026!';

/* Depot einrichten — derselbe Weg wie tools/axe-lauf.js. Schlaegt er fehl, ist der
   Lauf ABGEBROCHEN, nicht gruen: eine Messung am Eingangsschirm ist kein Ergebnis. */
async function depotEinrichten(seite) {
  await seite.waitForSelector('#w-anfangen', { timeout: 15000 });
  await seite.click('#w-anfangen', { timeout: 5000 });
  await seite.waitForTimeout(400);
  await seite.click('#tb-pw-hinweis', { timeout: 5000 });
  await seite.waitForTimeout(400);
  for (const [sel, wert] of [['#id-vorname', 'Marlies'], ['#id-nachname', 'Beispiel'],
    ['#id-pw', PW], ['#id-pw2', PW]]) await seite.fill(sel, wert, { timeout: 5000 });
  await seite.evaluate(() => {
    // U2-ADR-288-Nachtrag: 'div' entfernt, s. tests/weg-hilfen.js — sonst stoppt closest() am
    // neuen '.modal-koerper'-Wrapper, bevor es '.modal' erreicht.
    const raum = document.querySelector('#id-pw').closest('form, .modal, #overlay-inhalt, section');
    const k = [...(raum || document).querySelectorAll('button')]
      .find((b) => /anleg|einricht|erstell|speicher|weiter|fertig|ok/i.test(b.textContent || ''));
    if (k) k.click();
  });
  await seite.waitForTimeout(1200);
  const lage = await seite.evaluate(() => ({
    pwFeldWeg: !document.querySelector('#id-pw') || document.querySelector('#id-pw').getBoundingClientRect().width === 0,
    appAn: !!document.querySelector('#app.an'),
  }));
  assert.ok(lage.pwFeldWeg && lage.appAn,
    'ABBRUCH: Depot nicht eingerichtet (' + JSON.stringify(lage) + ') — gemessen waere der ' +
    'Eingangsschirm gewesen, nicht die Bereichs-Sichten. Ein Fehler beim Messen ist kein Messergebnis.');
}

/* Der offene Dialog nach dem Anlegen („Notfall-Blatt zum Ausfuellen") wird ueber
   seinen Zweitknopf geschlossen. Gemeldet wird, was vorgefunden wurde. */
async function dialogSchliessen(seite) {
  const vorher = await seite.evaluate(() => ({
    offen: !!document.querySelector('#modal-rueck.an'),
    titel: ((document.querySelector('#modal-inhalt h3') || {}).textContent || '').trim(),
  }));
  for (let i = 0; i < 6; i++) {
    if (!(await seite.evaluate(() => !!document.querySelector('#modal-rueck.an')))) break;
    await seite.evaluate(() => {
      const b = document.querySelector('#modal-inhalt #m-zweit')
        || document.querySelector('#modal-inhalt #m-abbr')
        || document.querySelector('#modal-inhalt #m-ok');
      if (b) b.click();
    });
    await seite.waitForTimeout(400);
  }
  const nochOffen = await seite.evaluate(() => !!document.querySelector('#modal-rueck.an'));
  assert.equal(nochOffen, false, 'ABBRUCH: der Dialog liess sich nicht schliessen — ' +
    'der Zustand „Bereich ohne Dialog" wurde nie erreicht (vorgefunden: ' + JSON.stringify(vorher) + ')');
  return vorher;
}

/* Ein Durchgang ueber alle zehn Bereiche. Gibt je Bereich die gemeldeten
   `region`-Ziele zurueck — und belegt, dass der Bereich gezeichnet war. */
async function regionUeberBereiche(seite, erwarteterDialog) {
  const funde = [];
  for (const sid of SEKTOREN) {
    const lage = await seite.evaluate((s) => {
      try { window.__vdOeffentlich.oeffneSektor(s); } catch (_) {}
      return {
        gezeichnet: (document.querySelector('#content') || {}).childElementCount || 0,
        dialogOffen: !!document.querySelector('#modal-rueck.an'),
      };
    }, sid);
    await seite.waitForTimeout(80);
    assert.ok(lage.gezeichnet > 0, 'ABBRUCH: Bereich „' + sid + '" wurde nicht gezeichnet (#content leer)');
    assert.equal(lage.dialogOffen, erwarteterDialog,
      'ABBRUCH: Bereich „' + sid + '" stand nicht im erwarteten Dialog-Zustand ' +
      '(erwartet offen=' + erwarteterDialog + ', vorgefunden=' + lage.dialogOffen + ')');
    const ziele = await seite.evaluate(async () => {
      const res = await window.axe.run(document, { runOnly: ['region'], resultTypes: ['violations'] });
      const v = res.violations.find((x) => x.id === 'region');
      return v ? v.nodes.map((n) => n.target.join(' ')) : [];
    });
    for (const z of ziele) funde.push(sid + ' → ' + z);
  }
  return funde;
}

/* Eine Browser-Sitzung auf einer (ggf. veraenderten) Fassung der Datei.
   `eingriff` laeuft NACH dem Einrichten im Browser und darf das DOM veraendern. */
async function messen(html, { dialogSchliessen: zu = false, eingriff = null } = {}) {
  const { chromium } = require('playwright');
  let datei = HTML_PATH;
  let tempDatei = null;
  if (html !== HTML) {
    // Neben der Originaldatei ablegen: die App laedt relative Nachbarn (Manifest,
    // Service-Worker) und darf nicht in einem fremden Verzeichnis anders laufen.
    tempDatei = path.join(path.dirname(HTML_PATH), '.axe-region-probe-' + process.pid + '.html');
    fs.writeFileSync(tempDatei, html);
    datei = tempDatei;
  }
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage({ viewport: { width: 390, height: 900 } });
    // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation registrieren
    // — der Anlege-Weg holt jetzt ein Dateiziel, headless Chromium kann keinen nativen Dialog zeigen.
    await seite.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async () => ({
          name: 'landmarks-messung.vivodepot',
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        }),
      });
    });
    await seite.goto('file://' + datei);
    await depotEinrichten(seite);
    let dialogTitel = null;
    if (zu) dialogTitel = (await dialogSchliessen(seite)).titel;
    await seite.addScriptTag({ path: AXE });
    if (eingriff) await seite.evaluate(eingriff);
    return { funde: await regionUeberBereiche(seite, !zu), dialogTitel };
  } finally {
    await browser.close();
    if (tempDatei) { try { fs.unlinkSync(tempDatei); } catch (_) {} }
  }
}

/* ── 1 · Die Sache selbst ─────────────────────────────────────────────── */

test('[Landmarks] kein landmark-loser Seiteninhalt in den zehn Bereichen — mit offenem Dialog',
  { timeout: 180000 }, async () => {
    const { funde } = await messen(HTML);
    assert.deepEqual(funde, [],
      'axe meldet Seiteninhalt ausserhalb jedes Landmarks. Wer per Landmark springt, ' +
      'kommt an diese Stellen nur linear heran:\n  ' + funde.join('\n  '));
  });

test('[Landmarks] kein landmark-loser Seiteninhalt in den zehn Bereichen — ohne Dialog',
  { timeout: 180000 }, async () => {
    // Der zweite Zustand ist der wichtigere: solange der Dialog offen steht, sieht
    // axe die Bereichs-Sicht nur durch ihn hindurch. Erst hier wird gemessen, was
    // die Buergerin im Normalbetrieb vor sich hat.
    const { funde, dialogTitel } = await messen(HTML, { dialogSchliessen: true });
    assert.ok(dialogTitel, 'ABBRUCH: es stand gar kein Dialog offen — dann hat dieser Lauf ' +
      'nicht den Zustand geprueft, den er zu pruefen behauptet');
    assert.deepEqual(funde, [],
      'axe meldet Seiteninhalt ausserhalb jedes Landmarks:\n  ' + funde.join('\n  '));
  });

/* ── 2 · Die Kontrollen ───────────────────────────────────────────────── */

test('[Landmarks·Positivkontrolle] ohne role="dialog" wird der Dialog wieder gemeldet',
  { timeout: 180000 }, async () => {
    // Genau der Zustand, der bis zum 27.07.2026 im Baum stand.
    const ohne = HTML.replace('id="modal-inhalt" role="dialog" aria-labelledby="modal-titel"', 'id="modal-inhalt"');
    assert.notEqual(ohne, HTML, 'die Positivkontrolle greift ins Leere — der Eingriff passt nicht mehr auf das Markup');
    const { funde } = await messen(ohne);
    assert.ok(funde.length > 0, 'der entfernte Dialog-Griff MUSS auffallen — sonst misst diese Pruefung nichts');
    // Gemeldet werden Ueberschrift (#modal-titel) und Text — seit U2-ADR-288 (05.09.2026,
    // Kopf/Körper/Fuß-Layout) meldet axe den Textteil am neuen Wrapper (.modal-koerper), der
    // #nfb-angebot jetzt umschließt, nicht mehr am inneren #nfb-angebot selbst.
    assert.ok(funde.every((f) => /modal-titel|modal-inhalt|modal-koerper|nfb-angebot/.test(f)),
      'gemeldet werden muss der DIALOG, nicht irgendetwas:\n  ' + funde.join('\n  '));
    assert.equal(funde.length, SEKTOREN.length * 2,
      'je Bereich die Ueberschrift und der Text des Dialogs — das sind die 20 Knoten aus dem Befund');
  });

test('[Landmarks·Vakuumkontrolle] landmark-loser Absatz an <body> wird gemeldet',
  { timeout: 180000 }, async () => {
    // Ohne diese Kontrolle bliebe offen, ob der gruene Lauf oben etwas gesehen hat.
    const { funde } = await messen(HTML, {
      eingriff: () => {
        const p = document.createElement('p');
        p.id = 'vakuum-probe';
        p.textContent = 'Absichtlich ausserhalb jedes Landmarks';
        document.body.appendChild(p);
      },
    });
    assert.ok(funde.length > 0 && funde.every((f) => /vakuum-probe/.test(f)),
      'der absichtlich landmark-lose Absatz MUSS gemeldet werden, sonst ist ein gruener ' +
      'Lauf nur die Abwesenheit einer Messung:\n  ' + funde.join('\n  '));
  });

test('[Landmarks·Negativkontrolle] derselbe Absatz INNERHALB <main> ist still',
  { timeout: 180000 }, async () => {
    // Sie unterscheidet „meldet landmark-losen Inhalt" von „meldet jeden Absatz".
    const { funde } = await messen(HTML, {
      eingriff: () => {
        const p = document.createElement('p');
        p.id = 'vakuum-probe';
        p.textContent = 'Absichtlich ausserhalb jedes Landmarks';
        document.querySelector('#content').appendChild(p);
      },
    });
    assert.deepEqual(funde, [],
      'Inhalt IN <main> liegt in einem Landmark und darf nicht gemeldet werden:\n  ' + funde.join('\n  '));
  });
