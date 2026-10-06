'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Marken-Palette-Wächter für vivodepot-studio.html (Auftrag, 12.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Erzeuger trug bis zu diesem Zug eine fremde Palette (Blau/Rot/Blaugrau) — niemand
   prüfte das, weil `tools/styleguide-komponenten-abgleich.js` nur den KERN prüft.
   `tools/erzeuger-marken-palette-pruefen.js` schließt genau diese Lücke. Diese Datei zeigt:
   (1) das Werkzeug kann tatsächlich rot werden (Rot-Beweis, gegen eine geschriebene
   Temp-Kopie mit eingefügter Fremdfarbe — nicht gegen die echte Datei geprobt), (2) es
   unterscheidet Ort — ein Farbwert AUSSERHALB des <style>-Blocks (Anbieter-Platzhalter)
   fällt nicht darunter —, (3) der echte Bestand ist heute sauber.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ERLAUBTE_HEX, pruefeDatei } = require('../tools/erzeuger-marken-palette-pruefen.js');

const ECHTE_DATEI = path.join(__dirname, '..', 'vivodepot-studio.html');

function temp(inhalt) {
  const p = path.join(os.tmpdir(), 'erzeuger-marken-palette-test-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.html');
  fs.writeFileSync(p, inhalt, 'utf8');
  return p;
}

describe('[Erzeuger-Marken-Palette·Rotmachbarkeit] das Werkzeug erkennt eine eingefügte Fremdfarbe wirklich', () => {
  test('eine Fremdfarbe im <style>-Block bricht den Lauf', () => {
    const p = temp('<html><head><style>.x { color: #1b6ec2; }</style></head><body></body></html>');
    try {
      const befund = pruefeDatei(p);
      assert.equal(befund.sauber, false, 'die gepflanzte Fremdfarbe muss auffallen');
      assert.deepEqual(befund.fremde, ['#1b6ec2']);
    } finally { fs.unlinkSync(p); }
  });

  test('dieselbe Fremdfarbe AUSSERHALB des <style>-Blocks (Anbieter-Platzhalter) fällt NICHT darunter', () => {
    const p = temp('<html><head><style>.x { color: #4f6539; }</style></head><body><input placeholder="#1b6ec2"></body></html>');
    try {
      const befund = pruefeDatei(p);
      assert.equal(befund.sauber, true, 'ein Formatbeispiel im Markup ist keine Chrome-Farbe des Erzeugers: ' + JSON.stringify(befund));
    } finally { fs.unlinkSync(p); }
  });

  test('eine Datei, die ausschließlich Erlaubt-Liste-Farben trägt, ist sauber', () => {
    const alle = [...ERLAUBTE_HEX].map((h) => '.k-' + h.replace('#', '') + ' { color: ' + h + '; }').join('\n');
    const p = temp('<html><head><style>' + alle + '</style></head><body></body></html>');
    try {
      const befund = pruefeDatei(p);
      assert.equal(befund.sauber, true, 'Positivkontrolle: die eigene Erlaubt-Liste darf sich nicht selbst melden: ' + JSON.stringify(befund));
    } finally { fs.unlinkSync(p); }
  });
});

test('[Erzeuger-Marken-Palette] der echte Erzeuger ist heute sauber (Zielzustand seit 12.09.2026)', () => {
  const befund = pruefeDatei(ECHTE_DATEI);
  assert.ok(befund.hexGesamt > 0, 'Vorbedingung: der Style-Block trägt überhaupt Hex-Farben');
  assert.deepEqual(befund.fremde, [], 'Fremdfarbe im Erzeuger gefunden: ' + JSON.stringify(befund.fremde));
});
