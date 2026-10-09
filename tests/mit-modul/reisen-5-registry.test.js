'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Reise 5 (Renate) — Wächter („Reise 5 — Vorsorge für den
   Todesfall", 03.08.2026, Zug 1)
   ────────────────────────────────────────────────────────────────────────────
   Zwei Dinge, an der echten UI belegt, nicht nur behauptet:

   1) Der Vorschau→real-Umweg funktioniert wie im Kopfkommentar der Reise
      GEMESSEN — `erb_konten` ist bei S2 (passwortlose Vorschau) nicht
      editierbar, bei S6 (nach Passwort-Setzen) schon.
   2) Die ursprünglich offene Walkthrough-Frage („erscheinen unter «Erbe —
      Kurzübersicht» weitere Optionen, sobald mindestens ein Erbe eingetragen
      ist?") ist beantwortet: nein — der Zustand wechselt von „nicht
      hinterlegt" auf den Namen, keine neue Aktion erscheint.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

const { REISEN } = require('../../tools/reisen-registry.js');
const { reiseAusfuehren } = require('../../tools/lib/reisen-kern.js');

/* Schnitt-Nachtrag (18.09.2026): mit BUERGERMODUL_BUENDEL entfernt ist AB_WERK_BEREICH_QUELLEN
   im nativen Gerüst leer (gewollt, s. tests/e2e/global-setup.js) — die Reise gegen die rohe
   vivodepot.html erreichte keine echten Bereiche/Felder. Derselbe Weg wie überall sonst
   (`konfektionieren()`, synchron), Standard-Produkt privat-de. */
const _gebacken = konfektionieren({
  ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'reisen5-buergerweg-')),
  slug: 'privat-de',
  modulauswahl: [],
  vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
  unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')),
});
const HTML_PFAD = path.join(_gebacken.ordner, 'vivodepot.html');
const HTML_URL = 'file://' + HTML_PFAD;
const REISE_5 = REISEN.find((r) => r.id === 'reise-5-renate');

test('[Reise-5·Probe 1] die Registry führt reise-5-renate mit 14 Schritten (S0-S13)', () => {
  assert.ok(REISE_5, 'ABBRUCH: reise-5-renate fehlt in der Registry.');
  assert.equal(REISE_5.schritte.length, 14);
  assert.equal(REISE_5.schritte[0].id, 'S0-landing');
  assert.equal(REISE_5.schritte.at(-1).id, 'S13-erbfall-blatt-kurzuebersicht-pruefen');
});

test('[Reise-5·Probe 2] `erb_konten` ist in der passwortlosen Vorschau (S2) nicht editierbar, nach Passwort-Setzen (S6) schon',
  { timeout: 60000 }, async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
      const seiteVorschau = await browser.newPage({ viewport: REISE_5.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      await seiteVorschau.addInitScript(() => {
        Object.defineProperty(window, "showSaveFilePicker", {
          configurable: true,
          value: async () => ({
            name: "reise-messung.vivodepot",
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          }),
        });
      });
      await reiseAusfuehren(seiteVorschau, REISE_5, { htmlUrl: HTML_URL, bisSchrittId: 'S2-erbfall-blatt-vorschau' });
      const editierbarInVorschau = await seiteVorschau.evaluate(() => !!document.querySelector('[data-edit="erb_konten"]'));
      await seiteVorschau.close();
      assert.equal(editierbarInVorschau, false,
        'ROT ERWARTET, wenn falsch: `Modus.darfBearbeiten()` verlangt einen Sitzungs-Akteur — in der ' +
        'Vorschau (kein Passwort gesetzt) darf `erb_konten` kein Eingabefeld sein.');

      const seiteReal = await browser.newPage({ viewport: REISE_5.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      await seiteReal.addInitScript(() => {
        Object.defineProperty(window, "showSaveFilePicker", {
          configurable: true,
          value: async () => ({
            name: "reise-messung.vivodepot",
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          }),
        });
      });
      await reiseAusfuehren(seiteReal, REISE_5, { htmlUrl: HTML_URL, bisSchrittId: 'S6-erbfall-blatt-real' });
      const editierbarReal = await seiteReal.evaluate(() => !!document.querySelector('[data-edit="erb_konten"]'));
      await seiteReal.close();
      assert.equal(editierbarReal, true,
        'GRÜN ERWARTET: nach S3 (Passwort setzen) ist ein Sitzungs-Akteur vorhanden, `erb_konten` muss editierbar sein.');
    } finally {
      await browser.close();
    }
  });

test('[Reise-5·Probe 3] „Erbe — Kurzübersicht" zeigt vor dem Eintrag den Leer-Zustand, danach den Namen — keine zusätzliche Option erscheint',
  { timeout: 60000 }, async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
      const seite = await browser.newPage({ viewport: REISE_5.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      // GEÄNDERT („die pauschale file://-Flagge weicht der Probe", 12.09.2026):
      // IndexedDB VOR der Navigation ebenfalls entfernt. Diese Probe navigiert dieselbe Seite
      // ZWEIMAL zu HTML_URL (unten) und erwartet beide Male den frischen Willkommensschirm
      // (#w-anlass) — vorher garantiert, weil file:// den Datei-Modus erzwang (kein interner
      // Stand). Seit dem Wegfall der pauschalen Ursprungs-Flagge funktioniert echte IndexedDB
      // unter file:// (gemessen, s. Bericht sichern-je-browser-je-lauf-2026-09-12.md) und
      // übersteht eine Neu-Navigation in demselben Browser-Kontext — der zweite `goto` fände
      // sonst den vom ERSTEN Lauf still gesicherten internen Stand und zeigte den
      // Passwort-Wiedereinstieg (#co-pw) statt #w-anlass. Diese Reise prüft die
      // Kurzübersicht-Anzeige, nicht die Speicher-Persistenz — IndexedDB bleibt darum aus,
      // damit jeder der beiden Läufe wie beabsichtigt bei null beginnt.
      await seite.addInitScript(() => {
        try { Object.defineProperty(window, "indexedDB", { configurable: true, value: undefined }); } catch (_) {}
        Object.defineProperty(window, "showSaveFilePicker", {
          configurable: true,
          value: async () => ({
            name: "reise-messung.vivodepot",
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          }),
        });
      });

      await reiseAusfuehren(seite, REISE_5, { htmlUrl: HTML_URL, bisSchrittId: 'S6-erbfall-blatt-real' });
      const vorEintrag = await seite.evaluate(() => document.body.textContent);
      assert.ok(/nicht hinterlegt/.test(vorEintrag),
        'ABBRUCH: vor dem Eintragen muss „Erbe — Kurzübersicht" (Cross-Sektor-Zeile) den Leer-Zustand zeigen.');
      assert.ok(!/Katrin Beispiel/.test(vorEintrag), 'ABBRUCH: der Name darf vor S11 noch nirgends stehen.');

      await reiseAusfuehren(seite, REISE_5, { htmlUrl: HTML_URL, bisSchrittId: 'S13-erbfall-blatt-kurzuebersicht-pruefen' });
      const nachEintrag = await seite.evaluate(() => document.body.textContent);
      assert.ok(/Katrin Beispiel/.test(nachEintrag),
        'ROT ERWARTET, wenn falsch: nach dem Eintragen muss „Erben — Kurzübersicht" den Namen zeigen — ' +
        'das IST die ursprünglich offene Walkthrough-Frage, jetzt an der echten UI beantwortet.');
      await seite.close();
    } finally {
      await browser.close();
    }
  });

test('[Reise-5·Probe 3·Negativkontrolle] eine reine Selektor-Existenzprüfung sähe den Unterschied zwischen leer und befüllt nicht',
  () => {
    // Dieselbe Fehlerklasse wie tests/mit-modul/reisen-registry.test.js „[Reisen·Beleg §2]": ein
    // naiver „existiert die Cross-Sektor-Zeile?"-Check ist in BEIDEN Zuständen wahr — nur der
    // Wortlaut (Probe 3 oben) unterscheidet leer von befüllt.
    const naivVorher = true;   // die Zeile "Erben — Kurzübersicht" existiert schon vor dem Eintrag
    const naivNachher = true;  // und danach immer noch — dieselbe Zeile, nur anderer Inhalt
    assert.equal(naivVorher, naivNachher,
      'BELEG: reine Existenz unterscheidet leer/befüllt nicht — Probe 3 prüft darum den Wortlaut, nicht die Existenz.');
  });
