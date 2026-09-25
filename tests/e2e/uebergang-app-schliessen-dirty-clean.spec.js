'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Übergang 5/6 — App schließen (`#tb-schliessen` → `flowAppSchliessen`),
   EINMAL mit offenen Änderungen, EINMAL ohne („Sechs
   Übergangs-Proben", 09.09.2026 — testkonzept-nach-den-funden-2026-09-09.md #5)
   ────────────────────────────────────────────────────────────────────────
   Zwei bestehende e2e-Specs (wortlaute-2026-08-09.spec.js,
   nativ-sichten-a-b-abnahme.spec.js) prüfen bereits WORTLAUTE am
   Schließen-Dialog — keiner prüft den tatsächlichen ZUSTANDS-ÜBERGANG:
   landet die Anwendung nach jedem der drei Wege (sauber ohne Dialog,
   „Trotzdem schließen" bei offenen Änderungen) wirklich in der ruhigen
   Schluss-Sicht (`zeigeSchlussSicht`, :32263), oder bleibt sie in einem
   halben Zustand hängen (Dialog offen, `#app.an` noch da, kein
   `overlay-titel`)?

   `flowAppSchliessen` (:32368) entscheidet über `schliessenWarnungNoetig()`:
   OHNE offene Änderungen UND mit aktueller Sicherungsdatei geht der Weg
   direkt zu `flowTrotzdemSchliessen()` — KEIN Dialog. MIT offenen Änderungen
   erscheint der D40-Dialog (`#m-ok`/`#m-dritt`, `#m-zweit` nur im gehosteten
   Speicher-Modus — hier `file://`, also nicht sichtbar).

   Positivkontrolle (Beleg im Commit-Text): mit `zeigeSchlussSicht()` in
   `flowTrotzdemSchliessen()` (vivodepot.html:32275) auskommentiert bleibt
   `#app` auf `.an` stehen und `#overlay-titel` erscheint nie — beide Asserts
   unten werden dann rot. Manuell geprüft, nicht dauerhaft im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');

// Bekannt-folgenloser Browser-Hinweis (wie 00-smoke.spec.js): CSP 'frame-ancestors' via <meta>
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

const PW = 'schliessen-uebergang-pw-159';

test('[Übergang 5a] App schließen OHNE offene Änderungen — direkt in die Schluss-Sicht, kein Dialog', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  // Sauberer Stand ERZWINGEN statt angenommen: `depotAnlegen()` holt zwar beim Anlegen ein
  // Dateiziel, das allein macht `_aktuelleDateiSicherung` aber noch nicht `true` (gemessen —
  // ein Klick auf #tb-schliessen direkt nach depotAnlegen() zeigte den Dialog trotzdem). Ein
  // expliziter, echter Speicher-Durchlauf über den App-eigenen Weg VOR der Prüfung, dann die
  // Vorbedingung selbst lesen statt sie zu vermuten.
  await page.evaluate(async () => { await window.__vdOeffentlich.depotInDateiSichern(); });
  // Der erste ECHTE Sicherungs-Durchlauf zeigt einmalig den Wiedereinstiegs-Hinweis
  // (derselbe Einmal-Dialog wie nach dem Anlegen, hier durch den erzwungenen Save erneut
  // ausgelöst) — abräumen, sonst blockiert er den folgenden #tb-schliessen-Klick.
  const wiedereinstieg = page.locator('#wiedereinstieg-hinweis');
  if (await wiedereinstieg.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
    await page.click('#m-ok');
    await wiedereinstieg.waitFor({ state: 'hidden' });
  }
  const dialogNoetigVorKlick = await page.evaluate(() => (typeof window.__vdOeffentlich.schliessenWarnungNoetig === 'function' ? window.__vdOeffentlich.schliessenWarnungNoetig() : null));
  expect(dialogNoetigVorKlick, 'Vorbedingung: nach einem echten Speichern-Durchlauf muss schliessenWarnungNoetig() falsch sein').toBe(false);

  await page.click('#tb-schliessen');

  // KEIN Dialog: #m-ok darf hier nicht auftauchen (anders als im dirty-Fall unten).
  const kamDialog = await page.locator('#m-ok').waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
  expect(kamDialog, 'ohne offene Änderungen darf #tb-schliessen keinen Warn-Dialog zeigen').toBe(false);

  await expect(page.locator('#overlay-titel'), 'die Schluss-Sicht muss stehen').toBeVisible({ timeout: 5000 });
  const appAn = await page.evaluate(() => document.getElementById('app').classList.contains('an'));
  expect(appAn, '#app darf die Klasse .an nach dem Schließen nicht mehr tragen').toBe(false);

  expect(fehler, 'kein Absturz im sauberen Schließen-Übergang').toEqual([]);
});

test('[Übergang 5b] App schließen MIT offenen Änderungen — Dialog, „Trotzdem schließen" führt in dieselbe Schluss-Sicht', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  /* GEÄNDERT (Auftrag, 12.09.2026) — ENTSCHIEDEN, nicht geflickt (eigene
     Auflage): der Fall „ungesichert" existiert weiterhin, ist aber kein stabiler Zustand mehr,
     wenn interner Speicher greift — `markiereUngespeichert()` (vivodepot.html:37922) setzt
     `_ungespeicherteAenderungen` zwar synchron, aber `_internAutoSpeichern()` (ADR-237) räumt
     ihn über `markiereGespeichert()` (Zeile 37970) oft schon ab, bevor der nächste
     `page.evaluate()`-Roundtrip die Vorbedingung liest — ein Wettlauf, kein struktureller
     Wegfall. Diese Probe will ausdrücklich den D40-Warn-Dialog bei UNGESICHERTEN Änderungen
     prüfen (Übergang 5b) — dafür braucht sie ein STABILES Zeitfenster, keinen Wettlauf. Erzwingt
     darum den reinen Datei-Weg (kein internerSpeicherModus), denselben Griff wie überall sonst
     in Topf A des Sortierungs-Berichts. Alternative, hier verworfen: den Wettlauf hinnehmen und
     mit expliziten Warte-Rennen gegen die Auto-Save-Kette abfangen — fragiler, und deckt nicht
     mehr den echten file://-Fall ab, den diese Test-Familie (Übergang 5a/5b) sonst durchgehend prüft. */
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'streetAddress', 'Ungesichert vor dem Schließen 42');

  const dirtyVorKlick = await page.evaluate(() => (typeof window.__vdOeffentlich.istUngespeichert === 'function' ? window.__vdOeffentlich.istUngespeichert() : null));
  expect(dirtyVorKlick, 'Vorbedingung: das Feld muss als ungesichert gelten, sonst prüft dieser Fall nichts').toBe(true);

  await page.click('#tb-schliessen');

  // Dirty-Fall: Dialog MUSS erscheinen, mit #m-ok (sichern+schließen) und #m-dritt (trotzdem).
  await expect(page.locator('#m-ok'), 'bei offenen Änderungen muss der Warn-Dialog erscheinen').toBeVisible({ timeout: 5000 });
  await expect(page.locator('#m-dritt'), '„Trotzdem schließen" muss als dritter Weg angeboten werden').toBeVisible();
  // file://-Modus: kein gehosteter Speicher, also KEIN „Nur auf diesem Gerät merken".
  expect(await page.locator('#m-zweit').count(), 'im file://-Modus gibt es keinen internen Speicher-Zwischenweg').toBe(0);

  // ── DER ÜBERGANG: „Trotzdem schließen" — Daten verwerfen, in die Schluss-Sicht ──
  await page.click('#m-dritt');

  await expect(page.locator('#overlay-titel'), 'auch der dirty-Weg muss in der Schluss-Sicht landen').toBeVisible({ timeout: 5000 });
  const appAn = await page.evaluate(() => document.getElementById('app').classList.contains('an'));
  expect(appAn, '#app darf nach „Trotzdem schließen" die Klasse .an nicht mehr tragen').toBe(false);

  expect(fehler, 'kein Absturz im dirty Schließen-Übergang').toEqual([]);
});
