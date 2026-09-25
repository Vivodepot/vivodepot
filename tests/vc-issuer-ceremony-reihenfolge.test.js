'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — "Ceremony-Seiten in vivodepot-vc-issuer.html sinnvoll
   durchnummerieren" (29.08.2026, ausgelöst während der xShare-Zertifikats-
   zeremonie 28.08.2026): die F-N-Marken standen NICHT in DOM-Reihenfolge
   (F-2, F-2b, F-4, F-4b, F-3, F-3b, F-5, ...) — verwirrend beim Ablaufen
   der Seite von oben nach unten. Ein Schnellweg-Abschnitt trug zudem gar
   keine "F-"-Marke, sondern nur eine bare Zahl ("3").

   Wächter: jede sichtbare step-no-Marke trägt die Form "F-<Zahl>[Buchstabe]",
   und die Hauptzahl steigt streng in der Reihenfolge, in der die Abschnitte
   im DOM erscheinen — ein Zusatz-Buchstabe (Alternative/Ergänzung zum
   vorherigen Schritt, z. B. "2b") gehört zur UNMITTELBAR vorherigen Hauptzahl.

   Rot-Beweis (vor der Reparatur, 29.08.2026): die erste Probe schlug am
   Schnellweg-Abschnitt fehl — er trug nur eine bare Zahl ("3"), kein
   "F-"-Präfix — genau der Fund aus dem Auftrag. Erst nach dem Umbenennen auf
   "F-3" und dem Durchziehen aller folgenden Hauptzahlen (F-5..F-9) wurde
   dieser Test grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ISSUER_PATH = path.join(__dirname, '..', 'vivodepot-vc-issuer.html');

test('[Ceremony-Reihenfolge] jede step-no-Marke trägt "F-<Zahl>[Buchstabe]", die Hauptzahl steigt streng in DOM-Reihenfolge', () => {
  const html = fs.readFileSync(ISSUER_PATH, 'utf8');
  const marken = [...html.matchAll(/<span class="step-no">([^<]+)<\/span>/g)].map((m) => m[1]);
  assert.ok(marken.length >= 8, 'Vorbedingung: die Probe sieht überhaupt step-no-Marken (gesehen: ' + marken.length + ')');

  let vorherigeZahl = 0;
  marken.forEach((marke) => {
    const treffer = /^F-([0-9]+)([a-z]?)$/.exec(marke);
    assert.ok(treffer, 'Marke „' + marke + '" trägt nicht die Form „F-<Zahl>[Buchstabe]" — jeder Ceremony-Schritt braucht das F-Präfix.');
    const zahl = Number(treffer[1]);
    if (treffer[2]) {
      assert.equal(zahl, vorherigeZahl,
        'Marke „' + marke + '" (Zusatz-Buchstabe) muss zur unmittelbar vorherigen Hauptzahl ' + vorherigeZahl + ' gehören, nicht danebenstehen.');
    } else {
      assert.ok(zahl > vorherigeZahl,
        'Marke „' + marke + '" (' + zahl + ') steht nicht in aufsteigender DOM-Reihenfolge nach ' + vorherigeZahl + ' — Label- und Seiten-Reihenfolge weichen ab.');
      vorherigeZahl = zahl;
    }
  });
});

test('[Ceremony-Reihenfolge] keine Marke wird übersprungen — die Hauptzahlen bilden eine lückenlose 1..N-Folge', () => {
  const html = fs.readFileSync(ISSUER_PATH, 'utf8');
  const marken = [...html.matchAll(/<span class="step-no">F-([0-9]+)[a-z]?<\/span>/g)].map((m) => Number(m[1]));
  const hauptzahlen = [...new Set(marken)].sort((a, b) => a - b);
  assert.deepEqual(hauptzahlen, Array.from({ length: hauptzahlen.length }, (_, i) => i + 1),
    'Hauptzahlen: ' + JSON.stringify(hauptzahlen) + ' — es darf keine Lücke und keine Dopplung geben.');
});
