'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-380 — eine tote Ausnahme sieht aus, als schütze sie etwas
   ────────────────────────────────────────────────────────────────────────────
   Fund bei U2-ADR-367 (07.09.2026): `tools/textsatz-traeger-erheben.js`s
   `WURZELN_AUSGENOMMEN` führte `'PRE_DEPOT_EN'` — eine Konstante, die U2-ADR-363
   (Zug 2) bereits entfernt hatte. Die Zeile schloss seither NICHTS mehr aus,
   ohne dass ihr Fehlen je einen Fund verdeckt hätte (sie traf schlicht nie).
   Wörtlich festgehalten: „Eine tote Ausnahme sieht aus, als schütze sie etwas, und
   wer sie liest, hält den ausgeschlossenen Gegenstand für existent. Beim
   nächsten Mal schliesst jemand etwas Echtes davon ab, weil 'da steht ja schon
   eine Ausnahme'."

   GEPRÜFT WIRD NUR, WAS BILLIG PRÜFBAR IST: `WURZELN_AUSGENOMMEN` schliesst
   Namen aus einer festen, kleinen Menge (den Top-Level-Exporten des Kerns) aus
   — jeder Eintrag MUSS ein echter Schlüssel von `V` sein, sonst trifft er nie.
   Andere Ausschlusslisten im Bestand (`GESCHWISTER_AUSNAHMEN` in
   textsatz-en-begriffe-pruefen.js, `ERGAENZUNG`/`AUSSCHLUSS` in
   w12-gueltigkeit-pruefen.js) prüfen gegen bewegliche Ziele — laufenden
   Bürgertext bzw. ein Feldmodell mit eigener Auflösungslogik (Sektor/Situation/
   Liste/Unterfeld) — eine allgemeine, billige Prüfung dafür existiert nicht,
   ohne die jeweilige Werkzeug-Logik zu duplizieren (als eigener
   Datenpunkt übergeben, nicht hier nachgebaut).

   ROT-BEWEIS: ein erfundener Name in der Ausschlussliste, den `V` nicht führt,
   muss diese Probe zum Scheitern bringen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { WURZELN_AUSGENOMMEN } = require('../tools/textsatz-traeger-erheben.js');

test('[U2-ADR-380] jeder Eintrag in WURZELN_AUSGENOMMEN ist ein echter Export des Kerns', () => {
  const { V } = ladeKern();
  const tot = [...WURZELN_AUSGENOMMEN].filter((name) => !(name in V));
  assert.deepEqual(tot, [],
    'tote Ausnahme(n) — dieser Name existiert nicht (mehr) im Kern, die Ausnahme schützt nichts: ' +
    tot.join(', '));
});

test('[U2-ADR-380·Rot-Beweis] ein erfundener Name in der Ausschlussliste wird gefunden', () => {
  const { V } = ladeKern();
  const mitErfundenem = new Set(WURZELN_AUSGENOMMEN);
  mitErfundenem.add('_ERFUNDENER_NAME_FUER_DIE_PROBE_U2_ADR_380');
  const tot = [...mitErfundenem].filter((name) => !(name in V));
  assert.deepEqual(tot, ['_ERFUNDENER_NAME_FUER_DIE_PROBE_U2_ADR_380'],
    'die Probe muss den erfundenen Namen fangen, sonst prüft sie nichts');
});
