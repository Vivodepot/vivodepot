'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Reisen-Varianten — Wächter (Auftrag M1_Messgeraet_Haerten, Zug 4, 03.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Zwei Dinge sind hier zu belegen, nicht nur zu behaupten: die Variante
   erreicht wirklich die Notfallblatt-Druckansicht (statt z. B. am Angebots-
   Dialog hängen zu bleiben), UND die echte Registry/der echte Reisen-Lauf
   bleiben von ihrer Existenz unberührt („der bestehende Reisen-Lauf muss
   danach unverändert grün sein", Auftrag). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

const { REISEN } = require('../../tools/reisen-registry.js');
const { NOTFALLBLATT_ANGENOMMEN } = require('../../tools/reisen-varianten.js');
const { reiseAusfuehren } = require('../../tools/lib/reisen-kern.js');

/* Schnitt-Nachtrag (18.09.2026): mit BUERGERMODUL_BUENDEL entfernt ist AB_WERK_BEREICH_QUELLEN
   im nativen Gerüst leer (gewollt, s. tests/e2e/global-setup.js). Diese Variante teilt S0-S3 mit
   reise-1-marlies (Probe 2 oben) — die selben Schritte, die andere Reisen echte Bereiche
   brauchen. Passierte bisher zufällig (die Notfallblatt-Annahme selbst prüft keinen konkreten
   Bereichsinhalt), bleibt aber dieselbe Klasse Test wie die übrigen Reisen — derselbe Weg wie
   überall sonst (`konfektionieren()`, synchron), Standard-Produkt privat-de. */
const _gebacken = konfektionieren({
  ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'reisenvarianten-buergerweg-')),
  slug: 'privat-de',
  modulauswahl: [],
  vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
  unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')),
});
const HTML_PFAD = path.join(_gebacken.ordner, 'vivodepot.html');

test('[Reisen-Varianten·Probe 1] die Variante selbst taucht nie in der Registry auf (echte Reisen dürfen dazukommen)', () => {
  assert.ok(!REISEN.some((r) => r.id === NOTFALLBLATT_ANGENOMMEN.id),
    'ROT ERWARTET, wenn falsch: die Variante darf NIE in tools/reisen-registry.js auftauchen — ' +
    'sie liegt bewusst in einer eigenen Datei, damit der Läufer der Grundlinien-Reisen sie nie sieht. Echte neue ' +
    'Reisen (reise-3-anja, reise-4-thomas, …) dürfen der Registry dagegen wachsen.');
});

test('[Reisen-Varianten·Probe 2] die Notfallblatt-angenommen-Variante nutzt dieselben S0-S3-Schrittobjekte wie reise-1-marlies', () => {
  const reise1 = REISEN.find((r) => r.id === 'reise-1-marlies');
  const gemeinsameIds = ['S0-landing', 'S1-einstieg-vorschau', 'S2-anlege-dialog-oeffnen', 'S3-depot-anlegen'];
  for (const id of gemeinsameIds) {
    const original = reise1.schritte.find((s) => s.id === id);
    const inVariante = NOTFALLBLATT_ANGENOMMEN.schritte.find((s) => s.id === id);
    assert.equal(inVariante, original,
      'Schritt „' + id + '": die Variante muss dieselbe Funktionsreferenz nutzen (kein Nachbau) — sonst könnten beide Wege auseinanderlaufen, ohne dass es auffiele.');
  }
});

test('[Reisen-Varianten·Probe 3] die Variante erreicht die Notfallblatt-Druckansicht — angenommen statt abgelehnt',
  { timeout: 60000 }, async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
      const seite = await browser.newPage({ viewport: NOTFALLBLATT_ANGENOMMEN.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      await seite.addInitScript(() => {
        Object.defineProperty(window, "showSaveFilePicker", {
          configurable: true,
          value: async () => ({
            name: "reise-messung.vivodepot",
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          }),
        });
      });
      const { protokoll } = await reiseAusfuehren(seite, NOTFALLBLATT_ANGENOMMEN, { htmlUrl: 'file://' + HTML_PFAD });
      const letzter = protokoll.schritte.find((s) => s.id === 'S4-notfallblatt-angenommen');
      assert.ok(letzter, 'ABBRUCH: der Annahme-Schritt fehlt im Protokoll.');
      const vorhanden = await seite.evaluate(() => !!document.getElementById('notfallblatt-overlay'));
      assert.equal(vorhanden, true,
        'ROT ERWARTET, wenn falsch: nach „Drucken" muss #notfallblatt-overlay im DOM stehen — das ist genau der ' +
        'Zustand, den beide echten Reisen nie erreichen (sie wählen „Später").');
      await seite.close();
    } finally {
      await browser.close();
    }
  });

test('[Reisen-Varianten·Probe 3·Negativkontrolle] dieselben S0-S3-Schritte OHNE den Annahme-Schritt zeigen die Druckansicht nicht',
  { timeout: 60000 }, async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    try {
      const seite = await browser.newPage({ viewport: NOTFALLBLATT_ANGENOMMEN.viewport, hasTouch: true, isMobile: true });
      // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
      // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
      // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
      await seite.addInitScript(() => {
        Object.defineProperty(window, "showSaveFilePicker", {
          configurable: true,
          value: async () => ({
            name: "reise-messung.vivodepot",
            createWritable: async () => ({ write: async () => {}, close: async () => {} }),
          }),
        });
      });
      const nurBisAnlegen = { ...NOTFALLBLATT_ANGENOMMEN, schritte: NOTFALLBLATT_ANGENOMMEN.schritte.filter((s) => s.id !== 'S4-notfallblatt-angenommen') };
      await reiseAusfuehren(seite, nurBisAnlegen, { htmlUrl: 'file://' + HTML_PFAD });
      const vorhanden = await seite.evaluate(() => !!document.getElementById('notfallblatt-overlay'));
      assert.equal(vorhanden, false, 'GRÜN ERWARTET: ohne den Annahme-Klick öffnet sich die Druckansicht nicht von selbst.');
      await seite.close();
    } finally {
      await browser.close();
    }
  });
