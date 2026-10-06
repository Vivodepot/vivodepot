'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Feldtyp `verweis` im Erzeuger (vivodepot-studio.html)
   ────────────────────────────────────────────────────────────────────────
   Ergänzt tests/verweis-feldtyp.test.js (Kern-Seite) um die Erzeuger-Seite:
   FELDTYPEN kennt den Typ, normFeldtyp verwechselt ihn NICHT mehr mit `ref`
   (der Fund dieses Zuges — „verweis" stand als Synonym für `ref`, bevor es ein
   eigener kanonischer Typ wurde), und `ziel` reist durch die Angleichung mit.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ladeGenerator } = require('./load-generator.js');

describe('[verweis · Erzeuger] FELDTYPEN kennt den neuen Typ', () => {
  test('FELDTYP_IDS enthält verweis', () => {
    const { V } = ladeGenerator();
    assert.ok(V.FELDTYP_IDS.includes('verweis'));
  });
});

describe('[verweis · Erzeuger · Rot-Beweis] „verweis" ist kein Synonym für „ref" mehr', () => {
  test('normFeldtyp("verweis") liefert verweis, NICHT ref', () => {
    const { V } = ladeGenerator();
    assert.equal(V.normFeldtyp('verweis'), 'verweis');
  });
  test('normFeldtypBefund("verweis") meldet keine Ersetzung — der kanonische Typ kommt unverändert an', () => {
    const { V } = ladeGenerator();
    const b = V.normFeldtypBefund('verweis');
    assert.equal(b.typ, 'verweis');
    assert.equal(b.ersetzt, false, 'verweis ist der Zieltyp selbst, keine Ersetzung');
  });
  test('echte ref-Synonyme bleiben unverändert auf ref abgebildet', () => {
    const { V } = ladeGenerator();
    assert.equal(V.normFeldtyp('referenz'), 'ref');
    assert.equal(V.normFeldtyp('person'), 'ref');
    assert.equal(V.normFeldtyp('ref'), 'ref');
  });
});

describe('[verweis · Erzeuger] normalisiereFeldBefund reicht ziel durch, meldet es nicht als unbekannt', () => {
  test('ein verweis-Feld mit ziel erzeugt keine Angleichungs-Meldung', () => {
    const { V } = ladeGenerator();
    const bef = V.normalisiereFeldBefund({ feldname: 'Register', feldtyp: 'verweis', bereich: 'vorsorge', ziel: 'https://vorsorgeregister.de' });
    assert.equal(bef.feld.ziel, 'https://vorsorgeregister.de');
    // Längen-/JSON-Vergleich statt deepEqual: `bef.angeglichen` ist ein Array aus dem VM-
    // Sandkasten des Erzeugers, ein ANDERES Realm als dieser Test — Node-`assert/strict` hält
    // gleich aussehende Arrays aus zwei Realms trotzdem für ungleich (Konstruktor-Identität),
    // s. feedback_vm_sandbox_arrays_deepstrictequal.md.
    const zielMeldungen = JSON.parse(JSON.stringify(bef.angeglichen)).filter((a) => a.schluessel === 'ziel');
    assert.equal(zielMeldungen.length, 0,
      'ziel ist eine BEKANNTE Eigenschaft (FELD_BEKANNTE_SCHLUESSEL), keine Meldung wert: ' + JSON.stringify(bef.angeglichen));
  });
});
