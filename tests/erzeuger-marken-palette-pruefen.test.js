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

/* ══ Region STUDIO-ERSCHEINUNG (Studio S0, 08.10.2026, Wort der Gegenlesung) ══════════════════════════════════════════
   Die gebackene Region trägt die Farben des App-Moduls. Ausgeblendet nur, wenn sie genau einmal da ist und der frisch erzeugten
   gleicht. Rot-Beweise: eine Fremdfarbe außerhalb, die Region von Hand verändert, eine zweite Region. */
{
  const paletteRot = (text) => { const p = temp(text); try { return !pruefeDatei(p).sauber; } finally { fs.unlinkSync(p); } };
  const B = require('../tools/studio-erscheinung-backen.js');
  const STUDIO_TEXT = require('node:fs').readFileSync(B.STUDIO, 'utf8');
  const REGION = B.regionLesen(STUDIO_TEXT);
  const varianten = {
    fremdAussen: STUDIO_TEXT.replace('</style>\n</head>', '.fremd { color: #1b6ec2; }\n</style>\n</head>'),
    vonHand: STUDIO_TEXT.replace(REGION, REGION.replace('#f7f8f4', '#1b6ec2')),
    zweiteRegion: STUDIO_TEXT.replace('</style>\n</head>', REGION + '\n</style>\n</head>'),   // nur die Marken doppelt, keine Fremdfarbe
  };
  for (const [name, text] of Object.entries(varianten)) {
    test('[Region STUDIO-ERSCHEINUNG · Rot-Beweis ' + name + '] ' + 'Marken-Palette: sauber ist falsch', () => {
      assert.notEqual(text, STUDIO_TEXT, 'die Variante greift');
      assert.equal(paletteRot(text), true);
    });
  }
  test('[Region STUDIO-ERSCHEINUNG] die echte Studio-Datei: Region genau einmal, gleich dem Modul, ausgeblendet; nichts rot', () => {
    const r = B.regionGeprueftAusblenden(STUDIO_TEXT);
    assert.equal(r.fehler, null);
    assert.equal(r.ausgeblendet, true);
    assert.equal(r.text.length, STUDIO_TEXT.length, 'zeilentreu');
    assert.equal(paletteRot(STUDIO_TEXT), false);
  });
}

