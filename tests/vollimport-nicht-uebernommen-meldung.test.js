'use strict';
/* ════════════════════════════════════════════════════════════════════════
   vollimport-nicht-uebernommen-meldung.test.js — Auftrag „Vollimport ist kein
   Vollimport" (11.09.2026), Teil 2: „Der stille Verlust ist das eigentliche Übel …
   auch für die Schlüssel, die absichtlich draußen bleiben."

   Prüft `vollimportNichtUebernommenNamen(plan, ergebnis)` — die reine, testbare Funktion
   hinter dem zweiten Toast in `flowImportVorschau`. Kein DOM, kein `ui.toast` nötig: die
   Funktion liefert die Namensliste, die UI hängt sie nur noch an einen Toast.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('mappe wird namentlich genannt, wenn sie am Ziel übersprungen wurde — die Beispielzeile', () => {
  const { V } = ladeKern();
  const plan = { formatId: 'json' };
  const ergebnis = { restUebersprungen: ['mappe'] };
  const namen = V.vollimportNichtUebernommenNamen(plan, ergebnis);
  assert.ok(namen.includes(V.STRINGS.importVollLabelMappe), 'mappe fehlt in der Meldung, obwohl übersprungen');
});

test('die drei dauerhaft draußen bleibenden Kategorien stehen IMMER in der Meldung eines Voll-Depot-Imports', () => {
  const { V } = ladeKern();
  const plan = { formatId: 'json' };
  const ergebnis = { restUebersprungen: [] };
  const namen = V.vollimportNichtUebernommenNamen(plan, ergebnis);
  assert.ok(namen.includes(V.STRINGS.importVollLabelTechnischeVersion));
  assert.ok(namen.includes(V.STRINGS.importVollLabelVerwaltungsrolle));
  assert.ok(namen.includes(V.STRINGS.importVollLabelSitzungszustand));
});

test('[Gegenprobe] ein Nicht-Voll-Depot-Import (z. B. ein Anbieter-Format) zeigt gar keine Meldung — der Anspruch auf Vollständigkeit besteht dort nie', () => {
  const { V } = ladeKern();
  const plan = { formatId: 'provider-credential' };
  const ergebnis = { restUebersprungen: ['mappe'] };
  const namen = V.vollimportNichtUebernommenNamen(plan, ergebnis);
  assert.deepEqual(namen, []);
});

test('[Rot-Beweis] ohne übersprungene Schlüssel und ohne plan bleibt die Funktion leer statt zu werfen', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.vollimportNichtUebernommenNamen(null, null), []);
  assert.deepEqual(V.vollimportNichtUebernommenNamen({ formatId: 'json' }, null), []);
});

test('dt+engl vorhanden für jede neue importVoll*-Kennung (VD-Module immer dt+engl)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const kernText = fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'), 'utf8');   // seit S8 (U2-ADR-428): das deutsche Sprachmodul
  const enText = fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8');
  const kennungen = Array.from(kernText.matchAll(/"strings:(importVoll[A-Za-z]+)\.text"/g)).map(m => m[1]);
  assert.ok(kennungen.length >= 20, 'weniger importVoll*-Kennungen im Kern gefunden als erwartet: ' + kennungen.length);
  const fehlend = kennungen.filter(k => !enText.includes('"strings:' + k + '.text"'));
  assert.deepEqual(fehlend, [], 'englische Gegenstücke fehlen in tools/textsatz-en-modul.json: ' + fehlend.join(', '));
});
