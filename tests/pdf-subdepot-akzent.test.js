'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter für die PDF-Hex-Werte der Sub-Depot-Töne (13.09.2026, PDF-CI-Auftrag;
   umgestellt 09.10.2026).

   jsPDF kennt keine CSS-Variablen — die PDF-Farb-Übersteuerung
   (_pdfSubAkzentPrimaerRgb) braucht echte #rrggbb-Werte. Bis 09.10.2026 lagen sie
   als Konstante _SUBDEPOT_PALETTE_HEX im Kern, und diese Datei hielt sie gegen den
   :root-CSS-Block. Seit 09.10.2026 kommen sie aus dem Erscheinungsbild-Modul des
   Produkts (_subDepotModulHex, Ebene `basis`; Entscheidung 05.10.2026: die Palette
   ist Modul-Wert, das Gerüst trägt nur die Mechanik). Der Kern-Kommentar über
   _subDepotModulHex nennt diese Datei als Wächter (U2-106, „ein Kommentar behauptet
   keine Datei, die es nicht gibt").

   Was jetzt gilt: für JEDEN Ton der SUBDEPOT_PALETTE ist der PDF-Hex genau der Wert
   dieses Tons im Modul, das ins Standardprodukt gebacken wird
   (tools/erscheinung/erscheinungsbild-salbei-glas-modul.json). Ohne diesen Wächter
   könnte der PDF-Pfad still einen anderen Wert liefern als der Bildschirm — oder
   für einen neuen Ton gar keinen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const MODUL_PFAD = path.join(__dirname, '..', 'tools', 'erscheinung', 'erscheinungsbild-salbei-glas-modul.json');

// Die Probe selbst, damit der Rot-Beweis dieselbe Funktion gegen eine gefälschte Vorlage fahren kann.
function abweichungen(V, basis) {
  const raus = [];
  for (const tok of V.SUBDEPOT_PALETTE) {
    const soll = basis['--' + tok];
    const ist = V._subDepotAkzentHexAufgeloest(tok);
    if (typeof soll !== 'string' || typeof ist !== 'string' || soll.toLowerCase() !== ist.toLowerCase()) {
      raus.push('--' + tok + ': Modul ' + soll + ' vs. PDF ' + ist);
    }
  }
  return raus;
}

test('[PDF-Sub-Depot-Akzent] der PDF-Hex jedes Palettentons ist der Wert dieses Tons im gebackenen Erscheinungsbild-Modul', () => {
  const { V } = ladeKern();
  const modul = JSON.parse(fs.readFileSync(MODUL_PFAD, 'utf8'));
  assert.ok(modul.basis && typeof modul.basis === 'object', 'Testaufbau: das Modul trägt eine Ebene `basis`');
  assert.equal(V.SUBDEPOT_PALETTE.length, 8, 'Testaufbau: acht Töne');
  for (const tok of V.SUBDEPOT_PALETTE) {
    assert.match(String(modul.basis['--' + tok]), /^#[0-9a-fA-F]{6}$/, '--' + tok + ' fehlt im Modul oder ist kein #rrggbb');
    assert.match(String(V._subDepotModulHex(tok)), /^#[0-9a-f]{6}$/, '--' + tok + ': _subDepotModulHex liefert kein normalisiertes #rrggbb');
    assert.equal(V._subDepotModulHex(tok), modul.basis['--' + tok].toLowerCase(), '--' + tok + ': _subDepotModulHex weicht vom Modul ab');
  }
  assert.deepEqual(abweichungen(V, modul.basis), [], 'PDF-Pfad und Modul müssen für alle acht Töne übereinstimmen');
});

test('[PDF-Sub-Depot-Akzent·Rot-Beweis] eine gepflanzte Abweichung im Modulwert wird gefunden (Testaufbau der Probe selbst)', () => {
  const { V } = ladeKern();
  const modul = JSON.parse(fs.readFileSync(MODUL_PFAD, 'utf8'));
  const gefaelscht = { ...modul.basis, '--ton': '#000000' };
  assert.notEqual(String(modul.basis['--ton']).toLowerCase(), '#000000',
    'Testaufbau: die gepflanzte Abweichung muss selbst eine echte Abweichung sein, sonst prüft dieser Rot-Beweis nichts');
  assert.deepEqual(abweichungen(V, gefaelscht), ['--ton: Modul #000000 vs. PDF ' + V._subDepotAkzentHexAufgeloest('ton')],
    'genau der gefälschte Ton muss als Abweichung erscheinen');
  // Auch ein fehlender Ton im Modul fällt auf.
  const ohneRose = { ...modul.basis };
  delete ohneRose['--rose'];
  assert.equal(abweichungen(V, ohneRose).length, 1, 'ein im Modul fehlender Ton wird gefunden');
});
