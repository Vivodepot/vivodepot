'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Reisen 3+4 — Wächter (Auftrag „Reisen 3 und 4 automatisieren", 03.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Reise 3 (Anja) belegt zum ersten Mal AN DER ECHTEN UI, was
   `tests/angehoerigen-blaetter-zuschnitt.test.js` nur am Kern-API zeigt: die
   Fünf-Blatt-Allowlist hält — ein Master-Feld (Steuer-ID) erscheint nie in der
   Vertrauensperson-Sicht, ein Allowlist-Feld (Blutgruppe) sehr wohl. Probe 1
   ist darum die wichtigste hier, mit echter Gegenprobe (Kontrollfeld MUSS
   fehlen, nicht nur „irgendwas" MUSS da sein).

   Zusicherung: Z9 (im Regelwerk der produkttragenden Zusicherungen) — diese Marke ist der
   maschinenlesbare Anker, den pruefeNurDurchTest() (tools/zusicherungen-
   kern.js) neben der Datei-Existenz auf Inhalt prüft. Verschwindet die Marke
   (Datei bleibt, Probe 1 wird umbenannt/entfernt), wird Z9 rot.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

const { REISEN, oeffneSektorMobil } = require('../../tools/reisen-registry.js');
const { reiseAusfuehren } = require('../../tools/lib/reisen-kern.js');

/* Schnitt-Nachtrag (18.09.2026): mit BUERGERMODUL_BUENDEL entfernt ist AB_WERK_BEREICH_QUELLEN
   im nativen Gerüst leer (gewollt, s. tests/e2e/global-setup.js) — die Reise gegen die rohe
   vivodepot.html erreichte keine echten Bereiche/Felder. Derselbe Weg wie überall sonst
   (`konfektionieren()`, synchron), Standard-Produkt privat-de. */
const _gebacken = konfektionieren({
  ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'reisen34-buergerweg-')),
  slug: 'privat-de',
  modulauswahl: [],
  vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
  unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')),
});
const HTML_PFAD = path.join(_gebacken.ordner, 'vivodepot.html');
const HTML_URL = 'file://' + HTML_PFAD;

test('[Reisen-3-4·Probe 0] Reise 1-4 stehen unverändert an den ersten vier Stellen — die Registry darf über sie hinaus wachsen (Reise 5+)', () => {
  assert.deepEqual(REISEN.slice(0, 4).map((r) => r.id), ['reise-1-marlies', 'reise-2-petra', 'reise-3-anja', 'reise-4-thomas']);
});

test('[Reisen-3-4·Probe 1] Reise 3 — Allowlist hält an der echten UI: Blutgruppe sichtbar, Steuer-ID (Master-Feld) NIE',
  { timeout: 90000 }, async () => {
    const { chromium } = require('playwright');
    const reise = REISEN.find((r) => r.id === 'reise-3-anja');
    const browser = await chromium.launch();
    try {
      const seite = await browser.newPage({ viewport: reise.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      // GEÄNDERT („die pauschale file://-Flagge weicht der Probe", 12.09.2026):
      // IndexedDB VOR der Navigation ebenfalls entfernt — vorher erzwang `file://` allein den
      // Datei-Modus (internerSpeicherModus()===false), seit dem Wegfall der pauschalen
      // Ursprungs-Flagge NICHT mehr (echte IndexedDB funktioniert unter file:// gemessen, s.
      // Bericht sichern-je-browser-je-lauf-2026-09-12.md). Diese Reise will gezielt den
      // reinen FSA-Datei-Weg messen (Allowlist/Feld-Werte an der echten UI, nicht die
      // Speicher-Modus-Weiche selbst) — ohne diese Attrappe würde headless Chromiums echte
      // IndexedDB den internen Weg nehmen und die hier erwarteten, dateibasierten
      // Rückmeldungen (S16-Auto-Datei-Schreiben) nie zeigen.
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
      const { protokoll } = await reiseAusfuehren(seite, reise, { htmlUrl: HTML_URL });
      const blatt = protokoll.schritte.find((s) => s.id === 'S15-gesundheit-oeffnen');
      assert.ok(blatt, 'ABBRUCH: der Gesundheits-Schritt fehlt im Protokoll.');
      assert.ok(blatt.hinweise.some((h) => h.includes('Blutgruppe')),
        'ROT ERWARTET, wenn falsch: das Allowlist-Feld „Blutgruppe" muss in Anjas Fach ankommen.');
      /* F5 Zug 2 (21.08.2026): der WERT wird jetzt an der Seite selbst gelesen, nicht mehr im
         Protokoll gesucht. Der Grund ist der Wegwechsel: das alte Angehörigen-Blatt war eine
         Lese-Ansicht, sein Wert stand als Text da und landete in den Hinweisen. Ein Fach öffnet
         die gewöhnliche Bereichs-Ansicht — dort steckt der Wert im `<select>`, nicht im Text.
         Die Zusage ist dieselbe; nur die Stelle, an der man sie ablesen muss, ist eine andere. */
      const blutgruppe = await seite.inputValue('[data-edit="bloodType"]', { timeout: 5000 });
      assert.equal(blutgruppe, 'A+', 'der eingetragene WERT (nicht nur das Label) muss ankommen.');

      /* Die harte Hälfte von Z9: das Master-Feld darf NICHT ankommen. Gemessen dort, wo es
         stünde, wenn es käme — nicht nur in den Hinweisen des Gesundheits-Schritts.
         Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `steuerid` ist eine Liste geworden —
         kein `[data-edit="steuerid"]` mehr, sondern `[data-feld-liste="steuerid"] .liste-
         eintraege`. Das Kontrollfeld darf hier keinen einzigen Eintrag zeigen. */
      await oeffneSektorMobil(seite, 'finance');
      await seite.waitForSelector('#content .bereich-kopf', { timeout: 5000 });
      const steueridEintraege = await seite.locator('[data-feld-liste="taxIdsTaxNumbers"] .liste-eintraege > *').count();
      assert.equal(steueridEintraege, 0, 'GRÜN ERWARTET: das Master-Feld „Steuer-ID" trägt in Anjas Fach keinen Eintrag.');
      const seiteText = await seite.content();
      assert.equal(seiteText.includes('99 887 766 554'), false,
        'und der Wert steht auch sonst nirgends auf der Seite.');
      await seite.close();
    } finally {
      await browser.close();
    }
  });

test('[Reisen-3-4·Probe 1·Entschärfungs-Kontrolle] ein Kontrollwert, der NICHT eingetragen wurde, kann auch nicht fälschlich als „vorhanden" durchgehen',
  { timeout: 90000 }, async () => {
    const { chromium } = require('playwright');
    const reise = REISEN.find((r) => r.id === 'reise-3-anja');
    const browser = await chromium.launch();
    try {
      const seite = await browser.newPage({ viewport: reise.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      // GEÄNDERT („die pauschale file://-Flagge weicht der Probe", 12.09.2026):
      // IndexedDB VOR der Navigation ebenfalls entfernt — vorher erzwang `file://` allein den
      // Datei-Modus (internerSpeicherModus()===false), seit dem Wegfall der pauschalen
      // Ursprungs-Flagge NICHT mehr (echte IndexedDB funktioniert unter file:// gemessen, s.
      // Bericht sichern-je-browser-je-lauf-2026-09-12.md). Diese Reise will gezielt den
      // reinen FSA-Datei-Weg messen (Allowlist/Feld-Werte an der echten UI, nicht die
      // Speicher-Modus-Weiche selbst) — ohne diese Attrappe würde headless Chromiums echte
      // IndexedDB den internen Weg nehmen und die hier erwarteten, dateibasierten
      // Rückmeldungen (S16-Auto-Datei-Schreiben) nie zeigen.
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
      const { protokoll } = await reiseAusfuehren(seite, reise, { htmlUrl: HTML_URL });
      const blatt = protokoll.schritte.find((s) => s.id === 'S15-gesundheit-oeffnen');
      assert.ok(!blatt.hinweise.some((h) => h.includes('nie-eingetragener-kontrollwert-9f3a')),
        'GRÜN ERWARTET (Gegenprobe der Probe selbst): ein frei erfundener String darf natürlich nirgends auftauchen — ' +
        'belegt, dass die Assertion oben nicht zufällig immer grün wäre.');
      await seite.close();
    } finally {
      await browser.close();
    }
  });

test('[Reisen-3-4·Probe 2] Reise 4 — Sub-Kontext für Heinrich trägt ein echtes, gespeichertes Feld',
  { timeout: 90000 }, async () => {
    const { chromium } = require('playwright');
    const reise = REISEN.find((r) => r.id === 'reise-4-thomas');
    const browser = await chromium.launch();
    try {
      const seite = await browser.newPage({ viewport: reise.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      // GEÄNDERT („die pauschale file://-Flagge weicht der Probe", 12.09.2026):
      // IndexedDB VOR der Navigation ebenfalls entfernt — vorher erzwang `file://` allein den
      // Datei-Modus (internerSpeicherModus()===false), seit dem Wegfall der pauschalen
      // Ursprungs-Flagge NICHT mehr (echte IndexedDB funktioniert unter file:// gemessen, s.
      // Bericht sichern-je-browser-je-lauf-2026-09-12.md). Diese Reise will gezielt den
      // reinen FSA-Datei-Weg messen (Allowlist/Feld-Werte an der echten UI, nicht die
      // Speicher-Modus-Weiche selbst) — ohne diese Attrappe würde headless Chromiums echte
      // IndexedDB den internen Weg nehmen und die hier erwarteten, dateibasierten
      // Rückmeldungen (S16-Auto-Datei-Schreiben) nie zeigen.
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
      const { protokoll } = await reiseAusfuehren(seite, reise, { htmlUrl: HTML_URL });
      const letzter = protokoll.schritte.find((s) => s.id === 'S10-blutgruppe-eintragen');
      assert.ok(letzter, 'ABBRUCH: Feld-Eintrag-Schritt fehlt im Protokoll.');
      // E4 (05.08.2026): die Ansage benennt seit diesem Fix das Feld (WCAG 4.1.3, zwei
      // gleiche Ansagen hintereinander waren für aria-live nicht unterscheidbar) — der
      // Feldname hier ist „Blutgruppe" (Schritt-id S10-blutgruppe-eintragen).
      assert.equal(letzter.rueckmeldung, 'Angesagt: „Gespeichert: Blutgruppe"',
        'ROT ERWARTET, wenn falsch: das erste echte Feld in Heinrichs Sub-Depot muss eine benannte Autosave-Rückmeldung zeigen (E4).');
      await seite.close();
    } finally {
      await browser.close();
    }
  });
