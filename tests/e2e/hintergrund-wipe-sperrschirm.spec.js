'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-185 — der Sperrschirm nach dem Hintergrund-Wipe, ECHT geprüft
   ────────────────────────────────────────────────────────────────────────
   Die ausdrückliche Auflage: "genau das hat kein Test je getan — deshalb
   hat der ursprüngliche Fehler so lange gelebt." Dieser Test ruft NICHT
   `_hintergrundWipeVielleicht()` direkt (das würde exakt den Trichter
   umgehen, dessen Verdrahtung 2026 den ADR-184-Fehler jahrelang verdeckt
   hielt). Stattdessen: `page.clock` (Playwright ≥1.45, s. package.json)
   virtualisiert `setTimeout`, und `document.visibilityState`/`hidden` werden
   per `Object.defineProperty` überschrieben und ein ECHTES `visibilitychange`
   dispatcht — derselbe Listener läuft, der auch im echten Browser lauscht
   (vivodepot.html, `document.addEventListener('visibilitychange', ...)`).

   `depotAnlegen()` (helpers.js) läuft in diesem Datei-Modus (file://, FSA-
   Attrappe aus `oeffneApp`) bereits durch einen ECHTEN Speicherweg
   (`flowDepotAnlegen`s `onFertig` → `speichernOderFehlschlagMarkieren()` →
   `depotInDateiSichern()` → `depotHerunterladen()`) — der gehaltene Umschlag
   (U2-ADR-185) ist damit ohne einen zusätzlichen manuellen Save-Aufruf
   bereits gesetzt, genau der Datei-Weg, für den Stück 3 gebaut wurde.

   Marken-Methode identisch zu `hintergrund-wipe-bildschirm.spec.js`
   (U2-ADR-184): eingepflanzte, unverwechselbare Werte, dann das GANZE
   Dokument absuchen (outerHTML + jeder input/textarea-Wert + title).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

const MARK_VORNAME = 'Sperrqq3Vorname';
const MARK_BAV_NR = 'DE99SPERRMARK123';
// NICHT 'identity': der Anlege-Weg landet dort bereits (s. Kommentar an depotAnlegen() in
// helpers.js) — als Standard-Sektor taugt er nicht, um "abseits des Standards" zu belegen.
const ZIEL_SEKTOR = 'finance';
const ZIEL_FELD = 'companyPensionPolicyNumber';

async function sichtbarkeitSetzen(page, zustand) {
  await page.evaluate((z) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => z });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => z === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, zustand);
}

async function dokumentScan(page) {
  return page.evaluate(() => {
    const w = [];
    document.querySelectorAll('input, textarea').forEach((el) => { if (el.value) w.push(el.value); });
    return { outerHTML: document.documentElement.outerHTML, title: document.title, feldwerte: w };
  });
}
function alsText(scan) { return scan.outerHTML + '\n' + scan.title + '\n' + scan.feldwerte.join('\n'); }

test('[U2-ADR-185] echtes visibilitychange über die Frist hinaus zeigt den Sperrschirm mit Erklärung, statt der Startseite', async ({ page }) => {
  await page.clock.install();   // VOR dem Verstecken installieren — der Wipe-Timer entsteht erst danach
  await oeffneApp(page);
  await depotAnlegen(page, { name: MARK_VORNAME + ' Nachname', pw: 'sperrschirm-e2e-pw-1' });

  await oeffneSektor(page, ZIEL_SEKTOR);   // Stück 2: eine Stelle abseits des Standards
  await setzeFeld(page, ZIEL_FELD, MARK_BAV_NR);
  // setzeFeld markiert ungespeichert (Politik A ließe den Wipe unten sonst gar nicht erst zu,
  // s. Bericht zum selben Fund im Node-Test) — ein ECHTER Speicherweg, nicht nur
  // markiereGespeichert(): der soll auch den gehaltenen Umschlag (Stück 3) auf DIESEN Stand
  // nachziehen, nicht auf den von depotAnlegen() vor dem Feld-Setzen.
  await page.evaluate(() => window.__vdOeffentlich.depotInDateiSichern());
  await page.waitForTimeout(50);

  // NUR die Finanzen-Marke, nicht der Vorname: der ist am Identitäts-Sektor eingetragen, von
  // dem wir per oeffneSektor() bewusst weggenavigiert sind (Stück 2 verlangt "abseits des
  // Standards") — er steht darum aktuell nicht im DOM, unabhängig vom Wipe. Die vollständige
  // "nirgends im Dokument"-Zusicherung über Name/Foto/Telefon bleibt bei
  // hintergrund-wipe-bildschirm.spec.js (U2-ADR-184), die bewusst auf `identitaet` bleibt.
  const vor = await dokumentScan(page);
  const vorText = alsText(vor);
  expect(vorText, `Vorbedingung: "${MARK_BAV_NR}" muss VOR dem Wipe im Dokument stehen`).toContain(MARK_BAV_NR);

  await sichtbarkeitSetzen(page, 'hidden');           // echtes visibilitychange → _hintergrundBeginnen()
  await page.clock.runFor(31 * 60 * 1000);            // virtuelle 31 Minuten → der echte Timer feuert
  await page.waitForTimeout(50);

  // Sperrschirm, nicht Startseite: das Passwortfeld muss da sein, der Erstbesucher-Knopf nicht.
  await expect(page.locator('#co-pw')).toBeVisible();
  await expect(page.locator('#w-anlass')).not.toBeVisible();
  await expect(page.locator('#co-wipe-hinweis')).toBeVisible();

  const nach = await dokumentScan(page);
  const nachText = alsText(nach);
  expect(nachText, `"${MARK_BAV_NR}" darf NACH dem Wipe NIRGENDS im Dokument mehr stehen`).not.toContain(MARK_BAV_NR);

  // Richtiges Passwort → zurück an derselbe Stelle (Stück 2), nicht am Standard-Sektor.
  await page.fill('#co-pw', 'sperrschirm-e2e-pw-1');
  await page.click('#w-oeffnen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await expect(page.locator(`.nav-item.aktiv[data-sektor="${ZIEL_SEKTOR}"]`)).toBeVisible();
});

test('[U2-ADR-185] Rückkehr INNERHALB der Frist über echtes visibilitychange: kein Wipe, kein Sperrschirm', async ({ page }) => {
  await page.clock.install();
  await oeffneApp(page);
  await depotAnlegen(page, { name: MARK_VORNAME + ' Nachname', pw: 'sperrschirm-e2e-pw-2' });

  await sichtbarkeitSetzen(page, 'hidden');
  await page.clock.runFor(5 * 60 * 1000);   // weit innerhalb der 30 Minuten
  await sichtbarkeitSetzen(page, 'visible');
  await page.waitForTimeout(50);

  // #app bleibt die aktive Sitzung — kein Overlay, kein Sperrschirm, nichts geräumt.
  await expect(page.locator('#app')).toHaveClass(/\ban\b/);
  await expect(page.locator('#co-pw')).not.toBeVisible();
});
