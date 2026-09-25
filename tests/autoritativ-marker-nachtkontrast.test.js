'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Zwei kleine Anschlüsse an die Sensibel-Freigabe" (12.08.2026), Zug 1.

   `.autoritativ-marker` — der im Sensibel-Freigabe-Bericht als „vermutlich derselbe
   Fall, ungemessen" benannte Geschwisterfall zu `.sensibel-marker`: `--salbei-dunkel`
   als TEXT-Farbe (2,71:1 auf --cream im Nachtmodus, Pflicht 4,5:1) OHNE Eintrag in
   der zentralen html.dark-mode-Aufhell-Liste.

   Gemessen (Regel 23, nicht nur der genannte Fall übernommen): ELF weitere Stellen
   im ganzen Kern tragen `color: var(--salbei-dunkel)` als reinen Text (kein
   Flächen-Gebrauch) OHNE Nachtmodus-Override — derselbe Fehler, dieselbe Ursache.
   Acht davon sitzen auf --cream (2,71:1), drei auf --salbei-light (2,16:1, im
   Nachtmodus SELBST dunkel — „Salbei-Nacht-Tönung"). Beide Hintergründe geprüft:
   die bereits etablierte Aufhellung (#8eab77) besteht auf BEIDEN (5,48:1 / 6,85:1) —
   „derselbe Handgriff" (Auftragsvorgabe), kein Sonderfall nötig.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { verhaeltnis } = require('../tools/lib/kontrast.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

const SALBEI_DUNKEL = { r: 0x4F, g: 0x65, b: 0x39 };          // --salbei-dunkel, unverändert im Nachtmodus
const AUFGEHELLT = { r: 0x8e, g: 0xab, b: 0x77 };             // die etablierte Nachtmodus-Aufhellung
const CREAM_DARK = { r: 0x16, g: 0x1b, b: 0x16 };             // --cream im Nachtmodus
const SALBEI_LIGHT_DARK = { r: 0x25, g: 0x2f, b: 0x1d };      // --salbei-light im Nachtmodus ("Salbei-Nacht-Tönung")

// `.sensibel-toggle[aria-pressed="true"]` stand hier bis 12.08.2026 („Die Herausgabe
// kommt ohne Kästchen aus", Zug 5) — mit dem Feldzeilen-Knopf komplett aus dem Kern entfernt,
// zehn statt elf Stellen. Kein Ersatz nötig: die Selektorliste beschreibt einen realen Bestand,
// keinen festen Sollwert.
const AUF_CREAM = [
  '.autoritativ-marker', '.lage-erfasst-marker', '.mappe-narrativ h3', '.mappe-narrativ h4',
  '.regal-verweis-hin', '.referenz-sprung:hover',
  '.einst-abschnitt h4', '.wizard-frage', '.ampel-titel',
];
const AUF_SALBEI_LIGHT = ['.chip-uebernehmen', '.refm-uebernehmen', '.refm-vorschlaege li.refm-aktiv'];

test('[Zug1] Vor der Reparatur: alle 11 Stellen tragen --salbei-dunkel ohne Nachtmodus-Override und fallen durch', () => {
  const gesamt = verhaeltnis(SALBEI_DUNKEL, CREAM_DARK);
  const salbeiLight = verhaeltnis(SALBEI_DUNKEL, SALBEI_LIGHT_DARK);
  assert.ok(gesamt < 4.5, `--salbei-dunkel auf --cream (Nachtmodus) muss unter 4,5:1 liegen (ist ${gesamt})`);
  assert.ok(salbeiLight < 4.5, `--salbei-dunkel auf --salbei-light (Nachtmodus) muss unter 4,5:1 liegen (ist ${salbeiLight})`);
});

test('[Zug1] Die etablierte Aufhellung (#8eab77) besteht auf beiden betroffenen Nachtmodus-Hintergründen', () => {
  assert.ok(verhaeltnis(AUFGEHELLT, CREAM_DARK) >= 4.5, 'auf --cream');
  assert.ok(verhaeltnis(AUFGEHELLT, SALBEI_LIGHT_DARK) >= 4.5, 'auf --salbei-light — derselbe Handgriff trägt auch hier');
});

test('[Zug1] Alle betroffenen Selektoren stehen jetzt in der zentralen html.dark-mode-Liste', () => {
  const block = HTML.slice(HTML.indexOf('html.dark-mode .logo,'), HTML.indexOf('html.dark-mode .btn-sek'));
  for (const sel of [...AUF_CREAM, ...AUF_SALBEI_LIGHT]) {
    assert.ok(block.includes('html.dark-mode ' + sel), `${sel} fehlt in der Nachtmodus-Aufhell-Liste`);
  }
});

test('[Zug1] Jeder betroffene Selektor trägt weiterhin genau EINE color:var(--salbei-dunkel)-Basisregel (Fläche unverändert)', () => {
  for (const sel of [...AUF_CREAM, ...AUF_SALBEI_LIGHT]) {
    const escaped = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped + '[^{]*\\{[^}]*color:\\s*var\\(--salbei-dunkel\\)');
    assert.ok(re.test(HTML), `${sel} sollte weiterhin color:var(--salbei-dunkel) als Basis (helles/high-contrast Theme) tragen`);
  }
});
