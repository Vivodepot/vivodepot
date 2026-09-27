'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-184 — die Bildschirm-Zusicherung des Hintergrund-Wipes
   ────────────────────────────────────────────────────────────────────────
   Fund (31.08.2026, Sub-Depot-Klick-Freeze): #content.innerHTML war vor UND
   nach einem Hintergrund-Wipe byte-identisch (17548 Zeichen) — der Speicher
   war leer, der Bildschirm zeigte unverändert Name/Foto/Identitätsansicht.
   Abnahmekriterium, wörtlich verschärft, nachdem ein engeres Maß
   ("#content ist leer") als unzureichend zurückgewiesen wurde ("Da steht
   nicht nur mein Bild, da steht auch mein Name. So einfach ist es also
   nicht."): NIRGENDS im Dokument darf nach dem Wipe ein personenbezogener
   Wert aus dem Depot sichtbar bleiben — nicht nur in #content.

   Methode (eigener Vorschlag): markierte, unverwechselbare Werte
   einpflanzen (Vorname, Nachname, Telefonnummer, ein Bild als data:-URL),
   dann das GANZE Dokument absuchen — outerHTML PLUS jeden input/textarea-
   Wert (bekannte Falle: `.value` überlebt jeden innerHTML-Vergleich, weil
   es eine Live-Eigenschaft ist, keine serialisierte Attribut) PLUS
   document.title (überlebt jede DOM-Aufräumung, steht in Tab-Leiste/
   Fenster-Umschalter/Screenshot).

   Dieser Test läuft NICHT über visibilitychange-Simulation (Timing in
   Playwright unzuverlässig) — er ruft _hintergrundWipeVielleicht() (den
   tatsächlichen Wipe-Vollzug, denselben, den sowohl die abgelaufene Frist
   als auch pagehide auslösen) direkt über window.*, real im Browser.
   Die Frist-LOGIK selbst (wann ausgelöst wird) steht in
   tests/hintergrund-wipe-frist.test.js — dort schneller und deterministisch
   ohne Browser prüfbar.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

// Unverwechselbar genug, um nie zufällig in Boilerplate-Text/CSS/Icons vorzukommen.
const MARK_VORNAME = 'Xyzzyqq7Vorname';
const MARK_NACHNAME = 'Plugh9NachnameMarke';
const MARK_TELEFON = '+49 170 99900011MARK';
// Kein echtes Bild noetig — ein eindeutiger, erkennbarer String im data:-URL-Koerper reicht,
// um zu belegen, dass er (nicht) mehr im DOM steht. Reales PNG waere fuer den Zweck nur Ballast.
const MARK_FOTO_DATA_URL = 'data:image/png;base64,MARKIERTES7FOTO9MUSTERxxYYzz==';

// Auflage 2 ( 2, 31.08.2026): auch der Sub-Kontext (Vollmacht-Modus) pruefen — dort
// liegen ZWEI Datensaetze gleichzeitig (Sub-Inhalt in `data`, Anker in `_ankerData`) und ZWEI
// Ansichten koennen im DOM gestanden haben (Vollmacht-Banner, eigene Sub-Depot-Farbe). Geteilte
// Scan-Funktion, damit beide Tests exakt dieselbe Probe fahren.
async function dokumentScan(page) {
  return page.evaluate(() => {
    const w = [];
    document.querySelectorAll('input, textarea').forEach((el) => { if (el.value) w.push(el.value); });
    return { outerHTML: document.documentElement.outerHTML, title: document.title, feldwerte: w };
  });
}
function alsText(scan) { return scan.outerHTML + '\n' + scan.title + '\n' + scan.feldwerte.join('\n'); }

test('[U2-ADR-184] nach dem Hintergrund-Wipe steht nirgends im Dokument mehr ein personenbezogener Wert', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { name: MARK_VORNAME + ' ' + MARK_NACHNAME, pw: 'wipe-screen-pw-1' });

  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'telephone', MARK_TELEFON);

  // Foto direkt setzen (nicht ueber den Datei-Picker — der Test prueft die Wipe-Zusicherung,
  // nicht den Upload-Weg; mappeEintragHinzufuegen ist derselbe interne Schreibweg, den ein
  // echter Upload auch nimmt).
  await page.evaluate(({ dataUrl }) => {
    const eintrag = window.__vdOeffentlich.mappeEintragHinzufuegen({
      beschriftung: 'Markiertes Testfoto', dateiname: 'mark.png', mime: 'image/png',
      groesse: dataUrl.length, inhalt: dataUrl,
    });
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'profilePhotoCoverPage', { ref: eintrag });
    window.__vdOeffentlich.bearbeitungSpeichern();
    window.__vdOeffentlich.renderContent();
  }, { dataUrl: MARK_FOTO_DATA_URL });

  // Politik A (U2-ADR-103) wipt NIE bei offener, ungesicherter Arbeit — richtig so, unveraendert,
  // und in tests/hintergrund-wipe-frist.test.js separat geprueft. file:// hat aber KEIN
  // Auto-Save (nur explizites Sichern, s. tests/e2e/zug5-persistenz-rauchtest.spec.js-Kopf) —
  // setzeFeld() liesse den Zaehler sonst bis in alle Ewigkeit auf >0 stehen und JEDER Wipe-Aufruf
  // in diesem Test wuerde am Politik-A-Wächter fruehzeitig abbrechen, ohne dass das etwas mit der
  // hier geprueften Bildschirm-Zusicherung zu tun haette. markiereGespeichert() simuliert exakt
  // den Zustand, den ein echtes "Sichern" an dieser Stelle herstellen wuerde (eigener, bereits an
  // anderer Stelle geprüfter Weg) — dieser Test prüft, was NACH einem sauberen Speicherstand mit
  // dem Bildschirm passiert, nicht den Speicherweg selbst.
  await page.evaluate(() => { window.__vdOeffentlich.markiereGespeichert(); });
  await page.waitForTimeout(100);   // Render/Titel-Nachzug abschliessen lassen

  const vor = await page.evaluate(() => {
    const werte = [];
    document.querySelectorAll('input, textarea').forEach((el) => { if (el.value) werte.push(el.value); });
    return {
      outerHTML: document.documentElement.outerHTML,
      title: document.title,
      feldwerte: werte,
    };
  });

  // Vorbedingung: alle vier Marken muessen VOR dem Wipe tatsaechlich irgendwo auffindbar sein —
  // sonst prueft dieser Test nichts (Pflichteingang-Prinzip, wie an anderer Stelle im Bestand).
  const vorText = vor.outerHTML + '\n' + vor.title + '\n' + vor.feldwerte.join('\n');
  for (const marke of [MARK_VORNAME, MARK_NACHNAME, MARK_TELEFON, MARK_FOTO_DATA_URL]) {
    expect(vorText, `Vorbedingung: "${marke}" muss VOR dem Wipe im Dokument stehen — sonst prüft der Test nicht, was er soll`).toContain(marke);
  }

  await page.evaluate(() => { window.__vdOeffentlich._hintergrundWipeVielleicht(); });
  await page.waitForTimeout(100);

  const nach = await page.evaluate(() => {
    const werte = [];
    document.querySelectorAll('input, textarea').forEach((el) => { if (el.value) werte.push(el.value); });
    return {
      outerHTML: document.documentElement.outerHTML,
      title: document.title,
      feldwerte: werte,
    };
  });
  const nachText = nach.outerHTML + '\n' + nach.title + '\n' + nach.feldwerte.join('\n');

  for (const marke of [MARK_VORNAME, MARK_NACHNAME, MARK_TELEFON, MARK_FOTO_DATA_URL]) {
    expect(nachText, `"${marke}" darf NACH dem Wipe NIRGENDS im Dokument mehr stehen`).not.toContain(marke);
  }

  // Zusaetzlich, konkret benannt statt nur ueber die Marken-Schleife: ein Schirm muss
  // tatsaechlich sichtbar sein, nicht nur #content leer hinter einer weiterhin sichtbaren Huelle
  // (der urspruengliche zweite Befund neben der reinen DOM-Lücke).
  // U2-ADR-185 (01.09.2026): NICHT MEHR #w-anlass (Erstbesucher-Schirm) — depotAnlegen() hat
  // bereits real gesichert (FSA-Attrappe), der gehaltene Umschlag ist gesetzt, darum zeigt der
  // Wipe jetzt den Sperrschirm (renderCryptoOverlay, internModus). Derselbe Befund, den dieser
  // Test ursprünglich hatte ("ein Schirm muss sichtbar sein"), gilt unverändert — nur der
  // KONKRETE Schirm ist jetzt der richtige.
  await expect(page.locator('#co-pw')).toBeVisible();
  await expect(page.locator('#w-anlass')).not.toBeVisible();
});

// Auflage 2 ( 2, 31.08.2026): derselbe Wipe, aber WAEHREND die Buergerin im Sub-Kontext
// ist (ein fremdes Sub-Depot mit Passwort geoeffnet UND betreten, `#app.modus-vollmacht`). Echter
// Klickweg wie tests/e2e/depot-liste-sub-kontext.spec.js (subKontextPerUiBetreten), nicht
// programmatisch — der Vollmacht-Banner (per insertAdjacentHTML in #content eingefuegt) und die
// Sub-Depot-Akzentfarbe sind Zustaende, die NUR der echte Betreten-Weg erzeugt.
const MARK_ANKER_VORNAME = 'Ankerqq3Vorname';
const MARK_ANKER_NACHNAME = 'Ankerplugh4Nachname';
const MARK_SUB_VORNAME = 'Subzyzzy5Vorname';
const MARK_SUB_TELEFON = '+49 170 88800022SUBMARK';

test('[U2-ADR-184] dasselbe gilt im Sub-Kontext — Anker-Marken UND Sub-Marken verschwinden vollständig', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { name: MARK_ANKER_VORNAME + ' ' + MARK_ANKER_NACHNAME, pw: 'wipe-screen-sub-pw-1' });

  const subPw = 'wipe-screen-sub-inner-pw-1';
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
  await page.waitForSelector('#sub-neu', { state: 'visible' });
  await page.click('#sub-neu');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', MARK_SUB_VORNAME);
  await page.fill('#id-pw', subPw);
  await page.fill('#id-pw2', subPw);
  await page.click('#m-ok');
  await page.waitForSelector('#id-vorname', { state: 'detached' });
  await page.waitForSelector('[data-sub]');

  const uuid = await page.evaluate(() => (window.getData ? window.getData() : window.__vdOeffentlich.ankerDaten()).verwalteteDepots.slice(-1)[0].depotUUID);
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', subPw);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });

  // Im Sub-Kontext: eine markierte Telefonnummer INS SUB-DEPOT eintragen — data zeigt jetzt auf
  // den Sub-Inhalt, _ankerData haelt den Anker mit dem Anker-Vornamen im Hintergrund.
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'telephone', MARK_SUB_TELEFON);
  await page.evaluate(() => { window.__vdOeffentlich.markiereGespeichert(); });   // s. Kommentar im ersten Test: file:// hat kein Auto-Save
  await page.waitForTimeout(100);

  const vor = await dokumentScan(page);
  const vorText = alsText(vor);
  for (const marke of [MARK_ANKER_VORNAME, MARK_SUB_VORNAME, MARK_SUB_TELEFON]) {
    expect(vorText, `Vorbedingung: "${marke}" muss VOR dem Wipe auffindbar sein`).toContain(marke);
  }
  // MARK_ANKER_NACHNAME wird hier bewusst NICHT als Vorbedingung verlangt — waehrend des
  // Sub-Kontexts zeigt keine Ansicht den Anker-Nachnamen, er liegt nur in `_ankerData` im RAM
  // (kein DOM-Bezug, s. Auflage 2 unten). Vorname reicht als Anker-Marke, die tatsaechlich sichtbar ist.

  await page.evaluate(() => { window.__vdOeffentlich._hintergrundWipeVielleicht(); });
  await page.waitForTimeout(100);

  const nach = await dokumentScan(page);
  const nachText = alsText(nach);
  for (const marke of [MARK_ANKER_VORNAME, MARK_ANKER_NACHNAME, MARK_SUB_VORNAME, MARK_SUB_TELEFON]) {
    expect(nachText, `"${marke}" darf NACH dem Wipe NIRGENDS im Dokument mehr stehen (Sub-Kontext)`).not.toContain(marke);
  }
  // U2-ADR-185: derselbe Grund wie im ersten Test — der Anker wurde real gesichert
  // (depotAnlegen), der Sperrschirm ersetzt den Erstbesucher-Schirm.
  await expect(page.locator('#co-pw')).toBeVisible();
  await expect(page.locator('#w-anlass')).not.toBeVisible();
  await expect(page.locator('#app')).not.toHaveClass(/modus-vollmacht/);
});

// (01.09.2026, während der U2-ADR-184-Verifikation): zweiter Aufrufer derselben
// Ursache. `vorschauVerwerfenUndZuhause()` (Weg a: "Vorschau verlassen" nach
// passwortloser Eingabe) rief `_depotSpeicherZuruecksetzen()` vor `renderWelcome()` auf — exakt
// derselbe Wächter-Defekt wie beim Hintergrund-Wipe, nur ohne den Sub-Kontext-Anteil (eine
// Vorschau-Sitzung hat keinen `_ankerData`/Sub-Depot-Zustand, `imVorschau()` und
// `imSubKontext()` schließen sich aus). Einzeiliger Fix (direkter Aufruf von
// `_eingangsschirmDomAufraeumen()` statt sich auf renderWelcome()s Wächter zu verlassen),
// dieselbe Bildschirm-Zusicherung, hier auf den zweiten Weg geprüft.
const MARK_VORSCHAU_TELEFON = '+49 170 77700033VORMARK';

test('[U2-ADR-184] Vorschau verwerfen räumt denselben Bildschirm auf (zweiter Aufrufer)', async ({ page }) => {
  await oeffneApp(page);
  await page.click('#w-anfangen');                          // Lage A → Vorschau (passwortlos)
  await page.waitForSelector('#app.an', { state: 'attached' });
  await oeffneSektor(page, 'identity');

  // Der Sektor zeigt in der Vorschau eine gesperrte „Beispielansicht" (bereichOhneEintraegeVorschauText)
  // ohne die üblichen [data-edit]-Inline-Felder — setzeFeld()s Klickweg greift hier nicht, und
  // sektorFeldSetzen() wirft ohne Sitzungs-Akteur (den die Vorschau per Definition nicht hat,
  // U2-ADR-034 gilt erst nach Passwort-Vergabe). Direkte Datenzuweisung — derselbe etablierte Weg
  // wie tests/d2-schliessen-lifecycle.test.js ("Auto-Save in der Vorschau"): `data.sektoren` ist
  // genau das, was vorschauHatDaten() prüft, ohne Provenienz-Stempel.
  await page.evaluate(({ wert }) => {
    window.__vdOeffentlich.ankerDaten().sektoren.identity = { telephone: wert };   // `data` als bare top-level Bindung direkt ansprechbar (wie `_hintergrundSeit` in hintergrund-wipe-frist-browser-abnahme.spec.js)
    window.__vdOeffentlich.renderContent();
  }, { wert: MARK_VORSCHAU_TELEFON });
  await page.waitForTimeout(50);

  const vor = await dokumentScan(page);
  const vorText = alsText(vor);
  expect(vorText, 'Vorbedingung: die Marke muss VOR dem Verwerfen im Dokument stehen').toContain(MARK_VORSCHAU_TELEFON);

  // Direkter Aufruf wie in den beiden Tests oben — dieselbe Funktion, die der "Vorschau
  // verlassen"-Knopf im echten Klickweg über flowSchliessenWarnung → onVerwerfen erreicht.
  await page.evaluate(() => { window.__vdOeffentlich.vorschauVerwerfenUndZuhause(); });
  await page.waitForTimeout(100);

  const nach = await dokumentScan(page);
  const nachText = alsText(nach);
  expect(nachText, 'die Marke darf NACH dem Verwerfen NIRGENDS mehr im Dokument stehen').not.toContain(MARK_VORSCHAU_TELEFON);
  await expect(page.locator('#w-anlass')).toBeVisible();
  await expect(page.locator('#app')).not.toHaveClass(/\ban\b/);
});
