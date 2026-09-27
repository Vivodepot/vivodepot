'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Rot-Beweis: `_textGetterAnhaengen` (vivodepot.html ~28804) muss idempotent
   sein — ein zweiter Aufruf auf einem inzwischen eingefrorenen Trägerobjekt
   darf nicht werfen.

   GEFUNDEN 17.09.2026 (Bereich-Umzug-Rundlauf, an den sechs Pro-Bereichen
   gemessen): `_bereichsModuleAusDepotAnmelden` läuft mindestens zweimal
   (Skript-Eval, dann `depotAnlegen()`) und ruft seit dem Schnitt-Nachtrag
   `_bereichsErsatzFelderLebendigMachen` je Registry-Sektor auf. Trifft der
   zweite Lauf ein inzwischen `Object.freeze()`tes Objekt, sind ALLE seine
   Eigenschaften nicht mehr konfigurierbar (unabhängig vom eigenen
   `configurable:true`) — `Object.defineProperty` warf „Cannot redefine
   property". Betraf nur Pro (inline-Label-Herkunft), nicht die dreizehn
   nativen (schlank, ohne jedes Label) — reiner Zufall der Datenlage, nicht
   der Ursache: JEDES Feld, das zweimal durch einen eingefrorenen Träger
   läuft, wäre getroffen. Fund + Fix: `-96`. ════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Rot-Beweis] _textGetterAnhaengen wirft NICHT bei einem zweiten Aufruf auf ein eingefrorenes Objekt', () => {
  const { V } = ladeKern();
  assert.equal(typeof V._textGetterAnhaengen, 'function', '_textGetterAnhaengen muss exportiert sein');

  const traeger = { label: 'Rohtext, nie gelesen' };
  V._textGetterAnhaengen(traeger, 'label', 'diese-kennung-gibt-es-nicht');
  const ersterWert = traeger.label;
  Object.freeze(traeger);

  assert.doesNotThrow(() => V._textGetterAnhaengen(traeger, 'label', 'diese-kennung-gibt-es-nicht'),
    'ein zweiter Aufruf auf denselben, jetzt eingefrorenen Träger darf nicht werfen');
  assert.equal(traeger.label, ersterWert, 'der Wert bleibt nach dem still übersprungenen Zweitaufruf unverändert');
});
