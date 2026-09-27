'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   lesedurchgang-aufnahme.js — Aufnahme für den Lesedurchgang (
   „Lesedurchgang", Produktentscheidung über 2, 01.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   REINE AUFNAHME, KEINE BEWERTUNG. Läuft die feste Route (docs/lesedurchgang/
   route.md) — fünf Reisen, jede mit einem eigenen, frischen Depot (ein
   Fehlschlag in einer Reise darf die anderen vier nicht mitreißen) — zweimal:
   Deutsch (kein Sprachmodul) und Englisch (tools/textsatz-en-modul.json, das
   echte, ausgelieferte Sprachmodul, direkt nach der Depot-Anlage angedockt).

   Schreibt pro Bildschirm ein Vollbild-PNG + eine .txt mit dem sichtbaren
   Text, und ein manifest.json je Sprache (jeder Schritt: erreicht oder nicht,
   mit Grund — die NICHT-erreichten Wege sind der wichtigere Teil, s. Methode).

   Die fünf Fragen (methode.md) legt eine Sitzung gegen diese Aufnahme an —
   dieses Werkzeug selbst urteilt nicht und erzeugt kein Grün/Rot.

   FUND (bei der ersten Fassung dieses Werkzeugs, 01.09.2026): Ohne das
   Pflichtfeld "Art der Vollmacht" im Vorsorgevollmacht-Formular bleibt das
   Modal bei "Speichern" hängen — die Validierung lässt es offen, und der
   Overlay-Backdrop (#modal-rueck, z-index 200) blockiert danach jeden
   weiteren Klick auf der Seite. Kein App-Fehler, ein Fund beim Nachbauen von
   tests/e2e/durchstich-buergerweg.spec.js — deren eigener Code setzt dieses
   Feld, hier zunächst übersehen.

   Aufruf:
     node tools/lesedurchgang-aufnahme.js [ausgabeverzeichnis] [--mit-assistenten]
     (Standard-Ausgabepfad: docs/lesedurchgang/aufnahme/, gitignored)

   --mit-assistenten: nimmt die Reisen F/G/H (Patientenverfügungs-Assistent,
   Geburts-Assistent, Anlass „Todesfall") mit auf. Diese drei sind am
   01.09.2026 GEBAUT, aber NOCH NIE GEFAHREN worden (Auftrag: „Bau die Route
   dafür, fahr sie aber noch nicht") — ohne dieses Flag laufen nur die fünf
   bereits geprüften Reisen A–E, wie bisher. Vor dem ersten echten Lauf mit
   diesem Flag: docs/lesedurchgang/route.md, Abschnitt „Reisen F–H" lesen.
   ════════════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const MIT_ASSISTENTEN = process.argv.includes('--mit-assistenten');
const AUSGABEPFAD_ARG = process.argv.slice(2).find((a) => !a.startsWith('--'));
const OUT = AUSGABEPFAD_ARG ? path.resolve(AUSGABEPFAD_ARG) : path.join(REPO, 'docs', 'lesedurchgang', 'aufnahme');
const { oeffneApp, oeffneSektor, einstellungenAbschnittOeffnen, einmalDialogeSchliessen, feldgruppenKartenOeffnen } = require(path.join(REPO, 'tests/e2e/helpers.js'));
const EN_MODUL = path.join(REPO, 'tools/textsatz-en-modul.json');
const VIEWPORT = { width: 1280, height: 2200 };

let manifest = [];

async function schnappschuss(page, ordner, name, notiz) {
  fs.mkdirSync(ordner, { recursive: true });
  const shotPath = path.join(ordner, name + '.png');
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
  } catch (e) {
    manifest.push({ name, notiz, fehler: 'Screenshot fehlgeschlagen: ' + e.message });
    console.log('  [!] Screenshot fehlgeschlagen: ' + name + ' — ' + e.message);
    return;
  }
  const text = await page.evaluate(() => {
    const kandidaten = ['#modal-inhalt', '#content', 'body'];
    for (const sel of kandidaten) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return (el.innerText || '').trim();
    }
    return (document.body.innerText || '').trim();
  }).catch((e) => '(Text nicht lesbar: ' + e.message + ')');
  fs.writeFileSync(path.join(ordner, name + '.txt'), text, 'utf8');
  manifest.push({ name, notiz, screenshot: name + '.png', textDatei: name + '.txt', textLaenge: text.length });
  console.log('  [x] ' + name + ' (' + text.length + ' Zeichen Text)');
}

function nichtErreicht(flow, schritt, grund) {
  manifest.push({ flow, schritt, NICHT_ERREICHT: true, grund: String(grund).slice(0, 500) });
  console.log('  [!] NICHT ERREICHT (' + flow + '/' + schritt + '): ' + String(grund).slice(0, 200));
}

async function modalSchliessenFallsOffen(page) {
  for (let i = 0; i < 3; i++) {
    const offen = await page.locator('#modal-rueck.an').count().catch(() => 0);
    if (!offen) return;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }
}

// Depot anlegen (still, ohne Screenshots) — Basis für jede Reise. `mitScreens` zeichnet
// zusätzlich Welcome/Vorschau/Identität auf (nur für Reise A gebraucht, wo diese Schirme
// selbst der Gegenstand sind — strukturell nur Deutsch erreichbar, s. route.md).
async function frischesDepot(browser, { ordner, enModulAndocken, mitScreens }) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.setDefaultTimeout(10000);

  await oeffneApp(page);
  if (mitScreens) await schnappschuss(page, ordner, 'a1-welcome', 'Erster Bildschirm, ohne jede Interaktion');

  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  if (mitScreens) await schnappschuss(page, ordner, 'a2-vorschau', 'Nach "Anfangen", vor Passwort — passwortlose Vorschau');

  await page.click('#tb-pw-hinweis');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Test');
  await page.fill('#id-nachname', 'Beispiel');
  await page.fill('#id-pw', 'lesedurchgang-pw-1');
  await page.fill('#id-pw2', 'lesedurchgang-pw-1');
  await page.click('#m-ok');
  const dateiName = page.locator('#datei-name');
  if (await dateiName.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) {
    await page.click('#m-ok');
  }
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await page.waitForSelector('#app.an', { state: 'attached' });
  await einmalDialogeSchliessen(page);
  await feldgruppenKartenOeffnen(page);

  if (enModulAndocken) {
    await page.locator('#tb-einstellungen').click();
    await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
    await page.locator('#einst-modul-datei').setInputFiles(EN_MODUL);
    await page.locator('#m-ok').waitFor({ state: 'visible' });
    await page.locator('#m-ok').click();
    await page.waitForTimeout(500);
    await modalSchliessenFallsOffen(page);
  }

  await oeffneSektor(page, 'identity');
  if (mitScreens) await schnappschuss(page, ordner, 'a3-identitaet', 'Identität, direkt nach Anlage (' + (enModulAndocken ? 'nach EN-Andocken' : 'Deutsch, kein Modul') + ')');
  return { ctx, page };
}

// ── Reise A: Erstanlage → erstes Dokument (Vorsorgevollmacht) → Datei sichern ──
async function reiseA(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: true }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await page.fill('[data-edit="birthDate"]', '1938-11-02');
    await page.keyboard.press('Tab');
    await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
    await schnappschuss(page, ordner, 'a4-identitaet-geburtsdatum', 'Nach Eintrag Geburtsdatum');
  } catch (e) { nichtErreicht(flow, 'a4-identitaet-geburtsdatum', e); }

  try {
    await oeffneSektor(page, 'advanceCare');
    await schnappschuss(page, ordner, 'a5-vorsorge-leer', 'Vorsorge-Bereich, bevor irgendein Instrument angelegt ist — Leerzustand');
  } catch (e) { nichtErreicht(flow, 'a5-vorsorge-leer', e); }

  try {
    // NUR innerhalb #content gesucht — der Topbar-Sicher-Knopf (#tb-save-knopf) trägt teils
    // ebenfalls ein Label, das /Speichern|Save/ trifft; ohne diese Eingrenzung meldet Playwright
    // "strict mode violation" (2 Treffer) statt zu klicken. Kein App-Fund, ein Skript-Fund.
    await page.locator('#content').getByRole('button', { name: /Hinzufügen|Add/ }).first().click();
    await page.waitForSelector('#modal-inhalt select');
    await schnappschuss(page, ordner, 'a6-vorsorge-typ-waehlen', 'Modal: welches Vorsorge-Instrument anlegen?');
    await page.selectOption('#modal-inhalt select', 'enduring-power-of-attorney');
    await page.locator('#modal-inhalt').getByRole('button', { name: /Speichern|Save/ }).click();
    await page.waitForSelector('#modal-inhalt input[aria-label^="Bevollmächtigte Person"], #modal-inhalt input[aria-label^="Authorized"], #modal-inhalt input[aria-label^="Attorney"]', { timeout: 5000 }).catch(() => {});
    await schnappschuss(page, ordner, 'a7-vorsorge-formular', 'Formular für die Vorsorgevollmacht, vor dem Ausfüllen — das eigentliche "Dokument erzeugen"');
  } catch (e) { nichtErreicht(flow, 'a6-a7-vorsorge-formular', e); }

  try {
    const bevKombi = page.locator('#modal-inhalt input[aria-label^="Bevollmächtigte Person"], #modal-inhalt input[aria-label^="Authorized"], #modal-inhalt input[aria-label^="Attorney"]').first();
    await bevKombi.fill('Anna Beispiel');
    const bevUebernehmen = page.locator('#modal-inhalt [data-refm-uebernehmen]:visible').first();
    await bevUebernehmen.click();
    // Pflichtfeld — s. Kopf-Kommentar dieser Datei. Ohne diesen Schritt bleibt das Modal offen
    // und der Backdrop blockiert jeden folgenden Klick auf der Seite.
    const artDerVollmacht = page.locator('#modal-inhalt select').filter({ has: page.locator('option[value="vorsorge"]') });
    if (await artDerVollmacht.count()) { await artDerVollmacht.selectOption('vorsorge'); }
    await page.locator('#modal-inhalt').getByRole('button', { name: /Speichern|Save/ }).last().click();
    await page.locator('#modal-rueck.an').waitFor({ state: 'detached', timeout: 6000 });
    await oeffneSektor(page, 'advanceCare');
    await schnappschuss(page, ordner, 'a8-vorsorge-nach-speichern', 'Vorsorge-Bereich, nachdem die Vollmacht gespeichert ist');
  } catch (e) { nichtErreicht(flow, 'a8-vorsorge-nach-speichern', e); }

  try {
    await oeffneSektor(page, 'health');
    await page.selectOption('[data-edit="bloodType"]', 'A+');
    await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
    await schnappschuss(page, ordner, 'a9-gesundheit', 'Gesundheit, mit gesetzter Blutgruppe');
  } catch (e) { nichtErreicht(flow, 'a9-gesundheit', e); }

  // Angst-Moment (Nachtrag Produktentscheidung, 01.09.): der Punkt, an dem eine Datei wirklich auf das
  // eigene Gerät gelegt wird — eigener Schirm für die fünfte Frage.
  try {
    await modalSchliessenFallsOffen(page);
    await page.click('#tb-save-status .tb-save-knopf');
    await page.waitForTimeout(600);
    await schnappschuss(page, ordner, 'a10-datei-sichern', 'Nach "Jetzt als Datei sichern" — welche Rückmeldung steht hier?');
  } catch (e) { nichtErreicht(flow, 'a10-datei-sichern', e); }

  await ctx.close();
}

// ── Reise B: Anlass → Situationsblatt ──
// Der frühere dritte Schritt (JSON-Export aus den Einstellungen) ist entfallen: U2-ADR-NNN
// (17.09.2026) entfernt den offenen JSON-Vollexport ersatzlos, s. docs/adr/…-offener-json-
// vollexport-entfernt-2026-09-17.md. Eine echte Weitergabe zeigt seither Reise E.
async function reiseB(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: false }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await page.click('[data-anlass-auswahl="1"]');
    await page.waitForSelector('[data-anlass="arzt"]', { state: 'visible' });
    await schnappschuss(page, ordner, 'b1-anlass-auswahl', 'Anlass-Auswahl-Overlay ("Für einen Anlass")');
    await page.click('[data-anlass="arzt"]');
    await schnappschuss(page, ordner, 'b2-situationsblatt', 'Situationsblatt für den gewählten Anlass');
  } catch (e) { nichtErreicht(flow, 'b1-b2-anlass-situationsblatt', e); }

  await ctx.close();
}

// ── Reise E: "Weitergeben"-Tür — Herausgeben an Dritte, mit Kontrolle über was mitgeht ──
// Angst-Moment (Nachtrag Produktentscheidung, 01.09.): der Bündelungs-Moment schlechthin — näher am
// echten "das gebe ich der Pflegeeinrichtung mit" als der technische JSON-Vollexport (Reise B).
async function reiseE(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: false }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await page.click('[data-weitergeben-zentral]');
    await page.waitForSelector('[data-hz-anlass]', { timeout: 5000 });
    const angeboteneAnlaesse = await page.locator('[data-hz-anlass]').allTextContents();
    await schnappschuss(page, ordner, 'e1-weitergeben-tuer', 'Weitergeben-Tür — angebotene Anlässe: ' + JSON.stringify(angeboteneAnlaesse));
  } catch (e) { nichtErreicht(flow, 'e1-weitergeben-tuer', e); return; }

  try {
    await page.locator('[data-hz-anlass]').first().click();
    await page.waitForSelector('#modal-inhalt', { state: 'visible' });
    await schnappschuss(page, ordner, 'e2-was-wird-herausgegeben', '"Das wird herausgegeben" — Übersicht vor der eigentlichen Weitergabe an Dritte');
  } catch (e) { nichtErreicht(flow, 'e2-was-wird-herausgegeben', e); }

  try {
    // Wortlaut driftet — durchstich-buergerweg.spec.js (23.08.2026) erwartete #exp-zurueckhalten-weg
    // mit Text "Etwas zurückhalten"; am 01.09.2026 heißt derselbe Link "Einzeln entscheiden, was
    // mitgeht". Beide Selektoren versucht, damit ein künftiger Wortlautwechsel den Fund nicht wieder
    // verdeckt.
    const zurueckhaltenLink = page.locator('#exp-zurueckhalten-weg, a:has-text("Einzeln entscheiden"), a:has-text("Decide individually")');
    if (await zurueckhaltenLink.count()) {
      await zurueckhaltenLink.first().click();
      await page.waitForTimeout(200);
      await schnappschuss(page, ordner, 'e3-zurueckhalten-aufgeklappt', '"Einzeln entscheiden, was mitgeht" aufgeklappt — zeigt das sichtbar die Kontrolle über sensible Felder?');
    } else {
      manifest.push({ name: 'e3-zurueckhalten-aufgeklappt', notiz: 'KEIN entsprechender Link an dieser Stelle sichtbar (bei diesem Anlass) — eigener Befund' });
      console.log('  [~] e3-zurueckhalten-aufgeklappt: kein Link gefunden (Befund, kein Skript-Fehler)');
    }
  } catch (e) { nichtErreicht(flow, 'e3-zurueckhalten-aufgeklappt', e); }

  await ctx.close();
}

// ── Reise C: Sub-Depot anlegen, entsiegeln, betreten ──
// Angst-Moment (Nachtrag Produktentscheidung, 01.09.): die Bündelungs-Antwort selbst — eigenes Passwort,
// unabhängig geschützt.
async function reiseC(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: false }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
    await schnappschuss(page, ordner, 'c1-depot-pille-menue', 'Depot-Pille-Menü, vor jedem Sub-Depot');
    await page.click('#tb-depot-menue-verwaltung');
    await page.waitForSelector('#sub-neu', { state: 'visible' });
    await schnappschuss(page, ordner, 'c2-depot-verwaltung', 'Depot-Verwaltung');
    await page.click('#sub-neu');
    await page.waitForSelector('#id-vorname', { state: 'visible' });
    await schnappschuss(page, ordner, 'c3-sub-depot-anlegen', 'Sub-Depot anlegen — Dialog');
    await page.fill('#id-vorname', 'Sophie');
    await page.fill('#id-pw', 'sub-lesedurchgang-pw');
    await page.fill('#id-pw2', 'sub-lesedurchgang-pw');
    await page.click('#m-ok');
    await page.waitForSelector('#id-vorname', { state: 'detached' });
    await page.waitForSelector('[data-sub]');
    await schnappschuss(page, ordner, 'c4-depot-liste-nach-anlegen', 'Depot-Liste, mit dem neuen Sub-Depot (noch versiegelt)');
  } catch (e) { nichtErreicht(flow, 'c1-c4-sub-depot-anlegen', e); return; }

  try {
    const uuid = await page.evaluate(() => (window.getData ? window.getData() : window.__vdOeffentlich.ankerDaten()).verwalteteDepots.slice(-1)[0].depotUUID);
    await page.click(`[data-entsiegeln="${uuid}"]`);
    await page.waitForSelector('#sub-auf', { state: 'visible' });
    await schnappschuss(page, ordner, 'c5-entsiegeln-dialog', 'Entsiegeln-Dialog für das Sub-Depot');
    await page.fill('#sub-auf', 'sub-lesedurchgang-pw');
    await page.click('#m-ok');
    await page.waitForSelector('#sub-auf', { state: 'detached' });
    await page.click(`[data-betreten="${uuid}"]`);
    await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
    await schnappschuss(page, ordner, 'c6-im-sub-kontext', 'App-Shell, nachdem das Sub-Depot betreten wurde');
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue-liste', { state: 'visible' });
    await page.click('#tb-depot-menue-liste');
    await schnappschuss(page, ordner, 'c7-depot-liste-im-sub-kontext', 'Depot-Liste-Dialog, AUS DEM Sub-Kontext heraus geöffnet — wer gilt hier als aktiv?');
  } catch (e) { nichtErreicht(flow, 'c5-c7-sub-depot-betreten', e); }

  await ctx.close();
}

// ── Reise D: Notfallweg ──
async function reiseD(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: false }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await oeffneSektor(page, 'health');
    await page.selectOption('[data-edit="bloodType"]', 'A+');
    await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
  } catch (e) { nichtErreicht(flow, 'd0-gesundheit-vorbereiten', e); return; }

  try {
    await page.evaluate(() => { const dl = document.querySelector('.dev-leiste'); if (dl) dl.style.display = 'inline-flex'; });
    await schnappschuss(page, ordner, 'd1-vor-notfall', 'Vor dem Moduswechsel (zeigt die Bedienleiste für den Wechsel)');
    await page.selectOption('#tb-modus-select', 'notfall');
    await page.waitForSelector('.notfall-rahmen', { state: 'visible' });
    await schnappschuss(page, ordner, 'd2-notfall-ansicht', 'Notfall-Ansicht (roter Rahmen)');
  } catch (e) { nichtErreicht(flow, 'd1-d2-notfall', e); }

  await ctx.close();
}

// ── Reise F (NEU, 01.09.2026 — GEBAUT, NOCH NICHT GEFAHREN, s. route.md) ──
// Patientenverfügungs-Assistent (pvwiz). Nachgebaut aus tests/e2e/03-wizard-pvwiz.spec.js.
// Timing bewusst über waitForTimeout statt präziser Text-Warteselektoren — ungeprüfter
// Code soll beim ersten echten Lauf eher zu lange warten als an einer Selektor-Feinheit
// brechen, die ohne Live-Lauf nicht zu verifizieren war.
async function reiseF(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: false }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await oeffneSektor(page, 'advanceCare');
    const gefuehrt = page.locator('.wizard-gruppe > summary');
    if (await gefuehrt.count()) await gefuehrt.click();
    await page.waitForSelector('[data-wizard-start="pvwiz"]', { state: 'visible' });
    await schnappschuss(page, ordner, 'f1-vorsorge-vor-start', 'Vorsorge-Bereich, Assistenten-Startknopf sichtbar');
    await page.click('[data-wizard-start="pvwiz"]');
    await page.waitForSelector('.wizard-frage', { state: 'visible' });
    await schnappschuss(page, ordner, 'f2-assistent-schritt1', 'Patientenverfügungs-Assistent, erste Frage (Angst-Moment: erste persönliche/gesundheitliche Angabe im geführten Weg)');
  } catch (e) { nichtErreicht(flow, 'f1-f2-start', e); return; }

  try {
    await page.locator('#content button[data-edit-multi="pv_situationen"]').first().click();
    await page.click('#wiz-weiter');
    await page.waitForTimeout(400);
    await schnappschuss(page, ordner, 'f3-assistent-schritt2', 'Zweite Frage, nach einer Antwort auf die erste');
  } catch (e) { nichtErreicht(flow, 'f3-schritt2', e); }

  try {
    // Q2/Q4-relevanter Moment: was passiert beim Abbrechen — geht die Antwort verloren, wird gewarnt?
    await page.click('#wiz-abbr');
    await page.waitForTimeout(400);
    await schnappschuss(page, ordner, 'f4-nach-abbrechen', 'Nach "Abbrechen" — wohin führt das, und wird gewarnt, dass Antworten verloren gehen?');
  } catch (e) { nichtErreicht(flow, 'f4-abbrechen', e); }

  await ctx.close();
}

// ── Reise G (NEU, 01.09.2026 — GEBAUT, NOCH NICHT GEFAHREN, s. route.md) ──
// Geburts-Assistent. Nachgebaut aus tests/e2e/gebwiz-subdepot-vorschlag-abnahme.spec.js —
// EINZIGE der drei neuen Reisen, die einen Sub-Depot-Vorschlag MITTEN im Ausfüllen zeigt,
// ein eigener Bündelungs-relevanter Angst-Moment (nicht nur am Ende einer Reise).
async function reiseG(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: false }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await page.click('[data-anlass-auswahl="1"]');
    await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
    await schnappschuss(page, ordner, 'g1-anlass-auswahl', 'Anlass-Auswahl, "Geburt" sichtbar');
    await page.click('[data-anlass="geburt"]');
    await page.waitForSelector('.wizard-frage', { state: 'visible' });
    await schnappschuss(page, ordner, 'g2-assistent-schritt1', 'Geburts-Assistent, erste Frage');
  } catch (e) { nichtErreicht(flow, 'g1-g2-start', e); return; }

  try {
    // Sechs Schritte laut Referenz-Spec optional/leer durchklickbar bis zum Namens-Schritt —
    // UNGEPRÜFT übernommen. Bricht die Schritt-Zahl künftig, zeigt g3 sichtbar etwas anderes
    // als den Namens-Schritt (kein stiller Fehlschlag, ein lesbarer Befund).
    for (let i = 0; i < 6; i++) {
      await page.click('#wiz-weiter');
      await page.waitForTimeout(200);
    }
    await schnappschuss(page, ordner, 'g3-assistent-namensschritt', 'Nach sechs "Weiter"-Klicks — sollte der Namens-Schritt sein');
  } catch (e) { nichtErreicht(flow, 'g3-namensschritt', e); }

  try {
    await page.fill('#content [data-edit="guidedBirthEntryChildsNameNot"]', 'Mia Musterfrau');
    await page.click('#wiz-weiter');
    await page.waitForTimeout(400);
    await schnappschuss(page, ordner, 'g4-nach-name', 'Nach Namenseingabe');
    await page.fill('#content [data-edit="guidedBirthEntryDateOfBirthNot"]', '2027-03-15');
    await page.click('#wiz-weiter');
    await page.waitForTimeout(400);
    await page.selectOption('#content select[data-edit="guidedBirthEntryRelationship"]', 'leiblich');
    await page.click('#wiz-weiter');
    await page.waitForTimeout(500);
    await schnappschuss(page, ordner, 'g5-nach-fertig', 'Nach dem letzten Schritt — Fertig-Toast bzw. Sub-Depot-Vorschlag');
  } catch (e) { nichtErreicht(flow, 'g4-g5-ausfuellen', e); }

  try {
    const titel = page.locator('#modal-titel');
    const text = (await titel.count()) ? (await titel.textContent()) || '' : '';
    if (text.includes('Depot')) {
      await schnappschuss(page, ordner, 'g6-subdepot-vorschlag', 'Sub-Depot-Vorschlag mitten im Assistenten — "Eigenes Depot für Ihr Kind?" (Angst-Moment: Bündelung wird hier aktiv vorgeschlagen)');
    } else {
      manifest.push({ name: 'g6-subdepot-vorschlag', notiz: 'Kein Sub-Depot-Vorschlag-Dialog erschienen (Ablauf evtl. geändert) — eigener Befund, kein Skript-Fehler' });
      console.log('  [~] g6-subdepot-vorschlag: kein Vorschlag-Dialog gefunden');
    }
  } catch (e) { nichtErreicht(flow, 'g6-subdepot-vorschlag', e); }

  await ctx.close();
}

// ── Reise H (NEU, 01.09.2026 — GEBAUT, NOCH NICHT GEFAHREN, s. route.md) ──
// "Todesfall" — AUSDRÜCKLICH KEIN Assistent. Der Tod-Übergangs-Wizard wurde nie gebaut
// (U2-ADR-122), am 01.08.2026 bindend durch ein Situationsblatt ersetzt
// (tests/e2e/a439-todesfall-uebernahme-reise.spec.js). Bewusst trotzdem in dieser Runde,
// mit korrigiertem Namen — sonst hielte eine spätere Sitzung die fehlende Fahrt für eine
// offene Baustelle statt für eine getroffene, dokumentierte Entscheidung.
async function reiseH(browser, { flow, ordner, enModulAndocken }) {
  let page, ctx;
  try {
    ({ page, ctx } = await frischesDepot(browser, { ordner, enModulAndocken, mitScreens: false }));
  } catch (e) { nichtErreicht(flow, 'frischesDepot', e); return; }

  try {
    await page.click('[data-anlass-auswahl="1"]');
    await page.waitForSelector('[data-anlass="todesfall"]', { state: 'visible' });
    await schnappschuss(page, ordner, 'h1-anlass-auswahl', 'Anlass-Auswahl, "Todesfall" sichtbar');
    await page.click('[data-anlass="todesfall"]');
    await page.waitForSelector('[data-zwischenfrage-anlass="todesfall-uebernahme"]', { state: 'visible' });
    await schnappschuss(page, ordner, 'h2-zwischenfrage', 'Zwischenfrage — drei Optionen, welche ist gemeint? (Q1/Q2-relevant: versteht man auf Anhieb, welche zu wählen ist?)');
    await page.click('[data-zwischenfrage-anlass="todesfall-uebernahme"]');
    await page.waitForTimeout(400);
    await schnappschuss(page, ordner, 'h3-situationsblatt', 'Situationsblatt "Nach einem Todesfall"');
  } catch (e) { nichtErreicht(flow, 'h1-h3-todesfall', e); }

  await ctx.close();
}

async function fuerSprache(browser, sprache, enModulAndocken) {
  console.log('=== ' + sprache.toUpperCase() + (enModulAndocken ? ' (EN-Sprachmodul angedockt)' : ' (kein Sprachmodul)') + ' ===');
  manifest = [];
  const basis = path.join(OUT, sprache);
  const reisen = [
    ['A-erstanlage-dokument-sichern', reiseA],
    ['B-anlass-export', reiseB],
    ['E-weitergeben-tuer', reiseE],
    ['C-sub-depot', reiseC],
    ['D-notfall', reiseD],
  ];
  if (MIT_ASSISTENTEN) {
    reisen.push(
      ['F-patientenverfuegung-assistent', reiseF],
      ['G-geburts-assistent', reiseG],
      ['H-todesfall-anlass', reiseH],
    );
  }
  for (const [flow, fn] of reisen) {
    console.log('--- Reise ' + flow + ' ---');
    await fn(browser, { flow, ordner: path.join(basis, flow), enModulAndocken });
  }
  fs.writeFileSync(path.join(basis, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  await fuerSprache(browser, 'de', false);
  await fuerSprache(browser, 'en', true);
  await browser.close();
  console.log('FERTIG. Aufnahme unter: ' + OUT);
})();
