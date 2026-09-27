'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Messauftrag (19.09.2026) — echter Klick-Test des Kern-Verschlusses
   (U2-ADR-NNN, 18.09.2026) auf L1-HEAD 6c17a7b0.

   DIESE DATEI IST DIE ABNAHME FÜR PRO1 (DoD-Punkt 1, 19.09.2026):
   der Fund hier (pro-de/pro-en stürzen beim Wiederöffnen mit TypeError in
   `_TEXTSATZ_ZURUECK` ab) UND der Beweis, dass der Fix (Commit 62635179,
   Branch cf-textsatz-frozen-getter-fix-2026-09-19) ihn behebt (3/3 grün),
   stehen beide hier — keine zusätzliche `node:test`-Probe (s. dortiger
   Bericht klicktest-textsatz-frozen-fix-cf-2026-09-19.md: `ladeKern()`
   erzwingt nicht denselben Strict-Mode-Kontext wie ein echter Browser,
   eine Probe dort wäre immer grün gewesen, mit oder ohne Fix).

   NUR DIE LÜCKE, NICHT DAS SCHON GEDECKTE (Nachtrag): das L1-pre-push
   E2E-Gate (scripts/pruefe-e2e-bereich.js) fährt bei einer Änderung an
   vivodepot.html den GANZEN `tests/e2e/`-Baum (`npm run test:e2e`) — die
   Frage ist darum nicht „läuft irgendein Klick-Test", sondern „welche
   Produkt×Weg-Kombination hat noch KEINE Probe". Gemessen (grep über alle
   Specs):
     - Bereich öffnen (echter Sidebar-Klick) läuft bereits gegen ALLE VIER
       Produkte: u2-adr-378-vier-produkte-sichtbarkeit.spec.js.
     - Feld setzen, Speichern, Datei neu öffnen, PDF erzeugen, Sub-Depot
       betreten laufen alle bereits — aber NUR gegen privat-de (Default von
       `oeffneApp(page)` ohne `url`): durchstich-buergerweg.spec.js (Feld,
       Speichern, Neu-öffnen, PDF), uebergang-sub-kontext-betreten-
       verlassen.spec.js (Sub-Depot). KEIN bestehender Spec übergibt
       `KERN_URL_PRIVAT_EN`/`_PRO_DE`/`_PRO_EN` an einen dieser fünf Wege
       (grep-Treffer: 0 vor dieser Datei).
   DIE LÜCKE: genau diese fünf Wege für privat-en/pro-de/pro-en. Diese Datei
   schließt NUR sie, mit denselben Helfern und demselben Klickpfad wie die
   oben genannten, geprüften Specs.

   VIER GEGENPROBEN, DIE DER ERSTE ANLAUF (19.09.2026) NOCH FALSCH ANNAHM —
   jede einzeln gemessen, nicht vermutet, s. Kommentare an Ort und Stelle:
   (1) Der Sichern-Knopf ist seit U2-ADR-237 fast nie aktiv (jede Änderung
       speichert still intern) — Datei-Modus muss über ein deaktiviertes
       `window.indexedDB` erzwungen werden, wie durchstich-buergerweg.spec.js
       es tut, sonst bleibt der Knopf `hidden` (produktunabhängig — auch bei
       privat-de).
   (2) Die eigene FSA-Attrappe muss VOR depotAnlegen() stehen: depotAnlegen()
       holt selbst schon einen Datei-Handle über die Attrappe, die zu diesem
       Zeitpunkt aktiv ist — kommt die eigene erst danach, schreibt jeder
       spätere Sichern-Klick weiter in den alten Handle.
   (3) `#bt-herausgeben` ist Teil von `nav.bottom-tabs`, CSS-verborgen auf
       Desktop-Breite — der Desktop-Weg zum selben Ziel ist
       `[data-weitergeben-zentral]`, und `flowVollDepotPdf()` läuft ohne
       Argument IMMER über eine zweite, generische Bestätigung (`#m-ok`,
       „Das wird herausgegeben"-Übersicht) — ein Klick zu wenig ließ die
       Probe auf eine PDF warten, die nie gebaut wurde.
   (4) `dateiAusgeben()` nutzt für PDF/Anlass-Export nie showSaveFilePicker,
       sondern navigator.share oder einen `<a download>`-Blob-Link — dieselbe
       Falle, die durchstich-buergerweg.spec.js schon einmal traf und dort
       mit einem appendChild-Fang löste (hier übernommen).

   EIN ECHTER FUND, KEIN Testfehler (rote Probe, s. Zeile ~145): bei pro-de
   UND pro-en bricht das Wiederanwenden des Textsatzes beim Neu-Öffnen mit
   `TypeError: Cannot delete property 'label' of #<Object>` — vermutlich, weil
   „der Schnitt" (18.09.2026) Bereichs-Templates einbackt, die dabei
   eingefroren werden, und `_TEXTSATZ_ZURUECK`s `delete knoten[art]` das nicht
   mehr darf. Sichtbare Folge: eine Sidebar-Gruppe zeigt „undefined" statt
   ihres Labels, der Sektor rendert nach dem Wiederöffnen keinen Inhalt mehr.
   privat-en bleibt DAVON unberührt (grün, ganzer Weg) — die Probe selbst ist
   damit als Methode bestätigt, nicht nur als Vermutung.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const {
  KERN_URL_PRIVAT_EN, KERN_URL_PRO_DE, KERN_URL_PRO_EN,
  oeffneApp, depotAnlegen, oeffneSektor, setzeFeld, einmalDialogeSchliessen,
} = require('./helpers');

const PW = 'klicktest-kern-verschluss-2026';

function konsoleFehlerSammeln(page) {
  const funde = [];
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('frame-ancestors')) funde.push(m.text()); });
  page.on('pageerror', (e) => funde.push('pageerror: ' + e.message));
  return funde;
}

// Wörtlich derselbe Klickpfad wie uebergang-sub-kontext-betreten-verlassen.spec.js
// (subDepotAnlegenUndBetreten) — kein eigener Aufbau.
async function subDepotAnlegenUndBetreten(page, { vorname, pw }) {
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
  await page.waitForSelector('#sub-neu', { state: 'visible' });
  await page.click('#sub-neu');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', vorname);
  await page.fill('#id-pw', pw);
  await page.fill('#id-pw2', pw);
  await page.click('#m-ok');
  await page.waitForSelector('#id-vorname', { state: 'detached' });
  await page.waitForSelector('[data-sub]');
  const uuid = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().verwalteteDepots.slice(-1)[0].depotUUID);
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', pw);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
  return uuid;
}

for (const [slug, url] of Object.entries({ 'privat-en': KERN_URL_PRIVAT_EN, 'pro-de': KERN_URL_PRO_DE, 'pro-en': KERN_URL_PRO_EN })) {
  test('[Klicktest·Lücke·' + slug + '] Feld, Speichern, Neu öffnen, PDF, Sub-Depot — dieselben Klickpfade wie privat-de, hier zum ersten Mal', async ({ page }) => {
    const konsoleFehler = konsoleFehlerSammeln(page);
    // Datei-Modus erzwungen (wie durchstich-buergerweg.spec.js Zeile 181f.) — seit U2-ADR-237
    // speichert jede Änderung still intern (IndexedDB), der Sichern-Knopf ist dann inaktiv;
    // ohne diesen Schritt wäre `#tb-save-status .tb-save-knopf` dauerhaft `hidden` und der Klick
    // in Schritt 2 liefe in einen Timeout, unabhängig vom Produkt (eigene Gegenprobe, 19.09.2026:
    // dasselbe passiert auch bei privat-de ohne diesen Schritt).
    await page.addInitScript(() => {
      try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
    });
    await oeffneApp(page, { url });

    // Die eigene, aufzeichnende FSA-Attrappe VOR depotAnlegen() registrieren (per page.evaluate()
    // auf der bereits geladenen Seite — genau das Muster, das helpers.js' eigener Kommentar an
    // fsaStandardAttrappeEinrichten() vorschreibt: „ein Test, der ein ANDERES Verhalten braucht,
    // überschreibt sie NACH oeffneApp() per page.evaluate()"). oeffneApp() registriert selbst
    // schon eine No-op-Attrappe (addInitScript, damit depotAnlegen() den bei U2-ADR-„Depot ist
    // Datei" eingebauten showSaveFilePicker-Aufruf früh bekommt, statt im echten Browser auf
    // einen Dialog zu warten, der nie kommt) — depotAnlegen() holt darüber bereits EIN Dateiziel
    // (den FSA-Handle) und hält ihn für JEDEN künftigen Klick auf `.tb-save-knopf` fest. Wird die
    // eigene Attrappe erst NACH depotAnlegen() gesetzt (erster Anlauf, 19.09.2026), schreibt der
    // spätere Klick weiter in den alten, No-op-Handle aus oeffneApp() — window.__vdKlicktestBytes
    // bleibt für immer null, kein App-Fehler, nur eine zu spät gesetzte Attrappe.
    await page.evaluate(() => {
      window.__vdKlicktestBytes = null;
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async () => ({
          name: 'klicktest.vivodepot',
          createWritable: async () => {
            let stueck = '';
            return {
              write: async (c) => { stueck += typeof c === 'string' ? c : await c.text(); },
              close: async () => { window.__vdKlicktestBytes = stueck; },
            };
          },
        }),
      });
    });
    await depotAnlegen(page, { pw: PW });
    // depotAnlegen() selbst kann bereits EIN erstes Sichern anstoßen (der beim Anlegen geholte
    // FSA-Handle) — zurücksetzen, damit die folgende Probe wirklich DIESEN Klick misst, nicht
    // einen früheren.
    await page.evaluate(() => { window.__vdKlicktestBytes = null; });

    // 1) Feld setzen — echter Sidebar-Klick + echte Eingabe (helpers.js, wie durchstich-buergerweg Schritt 4a)
    await oeffneSektor(page, 'identity');
    await setzeFeld(page, 'givenName', 'KlicktestVorname');
    await expect(page.locator('[data-edit="givenName"]')).toHaveValue('KlicktestVorname');

    // 2) Speichern — derselbe Knopf wie durchstich-buergerweg.spec.js Schritt 5 (kein Menü-Umweg)
    await page.click('#tb-save-status .tb-save-knopf');
    await expect.poll(() => page.evaluate(() => window.__vdKlicktestBytes !== null), { timeout: 5000 }).toBe(true);
    const bytes = await page.evaluate(() => window.__vdKlicktestBytes);
    expect(bytes, 'die Sicherung muss echte Bytes liefern').toBeTruthy();

    // 3) Datei neu öffnen — page.reload() + echter Datei-Input, wie durchstich-buergerweg Schritt 6/7

    const tmp = path.join(os.tmpdir(), 'klicktest-luecke-' + slug + '-' + Date.now() + '.vivodepot');
    fs.writeFileSync(tmp, bytes, 'utf8');
    try {
      await page.reload();
      await page.waitForSelector('#w-anlass', { state: 'visible' });
      await page.click('#w-datei');
      await page.setInputFiles('#co-datei', tmp);
      await page.fill('#co-pw', PW);
      await page.click('#w-oeffnen');
      await page.waitForSelector('#app.an', { state: 'attached' });
      await einmalDialogeSchliessen(page).catch(() => {});   // wie durchstich-buergerweg Zeile 307 — kein Zwang, kein eigener Aufbau

      // Fund (19.09.2026, dieser Klicktest): bei pro-de/pro-en bricht das Wiederanwenden des
      // Textsatzes beim Neu-Öffnen mit `TypeError: Cannot delete property 'label' of #<Object>`
      // (_TEXTSATZ_ZURUECK, gefangen und nur gewarnt) — Folge: eine Sidebar-Gruppe zeigt
      // „undefined" statt ihres Labels, der betroffene Sektor rendert danach keinen Inhalt mehr.
      // Named-Assertion HIER, statt eines stummen Timeouts auf `.bereich-kopf` weiter unten —
      // der eigentliche Fund soll benannt sein, nicht als Symptom eines Timeouts erscheinen.
      expect(konsoleFehler, 'kein Konsolenfehler nach dem Wiederöffnen: ' + konsoleFehler.join(' | ')).toEqual([]);
      await oeffneSektor(page, 'identity');
      await expect(page.locator('[data-edit="givenName"]')).toHaveValue('KlicktestVorname');

      // 4) PDF erzeugen — echter Weitergeben-Klick -> echter Chooser-Klick ([data-hz-ganzes]).
      // `#bt-herausgeben` (ursprünglicher Entwurf) ist Teil von `nav.bottom-tabs` — CSS-verborgen
      // auf Desktop-Breite (eigene Gegenprobe, 19.09.2026: Timeout „element is not visible" auf
      // Desktop-Viewport). `[data-weitergeben-zentral]` ruft dieselbe `flowHerausgebenZentral()`
      // (vivodepot.html, sidebar-Verdrahtung) — der Desktop-Weg zum selben Ziel.
      // `dateiAusgeben()` (PDF/Anlass-Export) nutzt NIE showSaveFilePicker, sondern navigator.share
      // (Touch) oder einen klassischen `<a download>`-Blob-Link (Desktop) — GEMESSEN im Kopfkommentar
      // von durchstich-buergerweg.spec.js, dort auch der Grund für dessen eigenen appendChild-Fang
      // (Playwrights `page.on('download', …)` allein blieb hier leer: eigene Gegenprobe, 19.09.2026,
      // 0 Downloads trotz sichtbarem Klick). Derselbe Blob-Fang wird hier übernommen.
      const downloads = [];
      page.on('download', (d) => downloads.push(d));
      await page.evaluate(() => {
        window.__vdKlicktestPdfNamen = [];
        const blobFuerUrl = new Map();
        const origCreateObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (blob) => { const u = origCreateObjectURL(blob); blobFuerUrl.set(u, blob); return u; };
        const origAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function (kind) {
          if (kind && kind.tagName === 'A' && kind.download && kind.href && blobFuerUrl.has(kind.href)) {
            window.__vdKlicktestPdfNamen.push(kind.download);
          }
          return origAppendChild.call(this, kind);
        };
      });
      await page.click('[data-weitergeben-zentral]');
      await page.waitForSelector('[data-hz-ganzes]', { state: 'visible' });
      await page.click('[data-hz-ganzes]');
      // `flowVollDepotPdf()` ohne Argument (echter Klickweg) geht IMMER über die „Das wird
      // herausgegeben"-Übersicht (flowExportUebersicht, Transparenz-Pflicht vor jedem Export,
      // s. Kopfkommentar oben) — ein zweiter, generischer Modal-Bestätigungs-Klick, wie bei
      // depotAnlegen()/subDepotAnlegenUndBetreten() (`#m-ok`). Der erste Anlauf (19.09.2026)
      // übersprang diesen Schritt und wartete auf eine PDF, die nie erzeugt wurde, weil der
      // Bau selbst nie anlief.
      await page.waitForSelector('#m-ok', { state: 'visible' });
      await page.click('#m-ok');
      const alleNamen = async () => {
        const namen = await page.evaluate(() => window.__vdKlicktestPdfNamen || []);
        return namen.concat(downloads.map((d) => d.suggestedFilename()));
      };
      await expect.poll(alleNamen, { timeout: 5000 }).toEqual(expect.arrayContaining([expect.stringMatching(/\.pdf$/)]));
      const namen = await alleNamen();
      expect(namen.some((n) => n.endsWith('.pdf')), 'Volldepot-PDF muss als Datei ankommen: ' + namen.join(',')).toBe(true);

      // 5) Sub-Depot betreten — wörtlich derselbe Klickpfad wie uebergang-sub-kontext-betreten-verlassen.spec.js
      await subDepotAnlegenUndBetreten(page, { vorname: 'KlicktestKind', pw: 'klicktest-sub-pw-2026' });
    } finally {
      fs.rmSync(tmp, { force: true });
    }

    expect(konsoleFehler, 'keine Konsolenfehler über den ganzen Weg').toEqual([]);
  });
}
