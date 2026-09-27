'use strict';
/* ═══════════════════════════════════════════════════════
   E2E-Cross — globalSetup: erst das Krypto-Gate, dann das Produkt backen
   ───────────────────────────────────────────────────────
   Seit dem Schnitt (18.09.2026) trägt die rohe vivodepot.html kein Bereichsschema
   mehr; erst das Backen (tools/lib/vier-produkte.js) macht daraus ein Produkt. Die
   Cross-Reisen öffneten die rohe Datei und prüften ein bereichsloses Gerüst — T-CROSS-01
   bricht bei `oeffneSektor('identity')`, und das Gate blieb grün, weil der Lauf vor
   keinem Push stand. Dieselbe Klasse wie in tests/e2e: der bequeme Pfad liefert das
   Gerüst, nicht das Produkt.

   Gebacken wird über DENSELBEN Weg wie tests/e2e (tests/e2e/global-setup.js), in
   dieselben Dateien: keine zweite Fassung des Konfektionierens. Das Krypto-Gate liest
   weiter die rohe Datei — der Krypto-Block ist im Gerüst wie im Produkt derselbe.
   ═══════════════════════════════════════════════════════ */
const kryptoGate = require('./krypto-gate.js');
const e2eSetup = require('../../e2e/global-setup.js');

module.exports = async function globalSetup(...args) {
  await kryptoGate(...args);
  await e2eSetup(...args);
};
