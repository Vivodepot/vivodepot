'use strict';
/* ═══════════════════════════════════════════════════════════
   Daten werden über den Katalog gefunden, nicht über den Anzeige-Index
   ───────────────────────────────────────────────────────────
   Ein Pro-Kern zeigt die Bürger-Bereiche nicht (U2-ADR-348), die Daten eines solchen Bereichs
   gibt es trotzdem. `SEKTOR_BY_ID` kennt ihn dann nicht. Wer dort nach Daten fragt, wirft oder
   schreibt am Datensatz vorbei.

   Geprüft wird am gebackenen Pro-Kern, mit dem ruhenden Bereich `finance`:
     K1 `kernAPI.liesBereich` und `kernAPI.schreibBereich` treffen seinen Datensatz.
     K2 `feldDefFuer` und `_feldDef` kennen seine Felder, und der Typ-Wächter in
        `sektorFeldSetzen` hängt an dieser Auskunft.

   Rot-Beweis: `_sektorImKatalog` auf `!!SEKTOR_BY_ID[id]` und `_sektorAusKatalog` auf
   `SEKTOR_BY_ID[id] || null` zurückgesetzt, dann fallen alle vier Fälle.
   Die Klasse hält tools/anzeige-index-leser.js fest (tests/anzeige-index-leser.test.js).
   ═══════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function proKern() {
  const { V } = ladeKern({ produkt: 'pro-de', backen: true });
  await V.basisVorlagenVerifizieren();
  await V.depotAnlegen('pro-katalog-pw');
  assert.ok(!V.bereicheAlle().map((s) => s.id).includes('finance'), 'Voraussetzung: finance ruht in diesem Kern');
  return { V, aufraeumen: () => {} };
}

test('[K1] liesBereich trifft den Datensatz eines ruhenden Bereichs', async () => {
  const { V, aufraeumen } = await proKern();
  try {
    V.getData().sektoren.finance = { companyPensionSchemeBav: 'Beispielkasse' };
    assert.equal(V.kernAPI.liesBereich('finance').companyPensionSchemeBav, 'Beispielkasse');
  } finally { aufraeumen(); }
});

test('[K1] schreibBereich trifft den Datensatz eines ruhenden Bereichs', async () => {
  const { V, aufraeumen } = await proKern();
  try {
    V.akteurSelbstErklaeren('Probe');
    V.kernAPI.schreibBereich('finance', { companyPensionSchemeBav: 'Neu' });
    assert.equal(V.getData().sektoren.finance.companyPensionSchemeBav, 'Neu');
  } finally { aufraeumen(); }
});

test('[K2] feldDefFuer und _feldDef kennen das Feld eines ruhenden Bereichs', async () => {
  const { V, aufraeumen } = await proKern();
  try {
    assert.equal(V.feldDefFuer('finance', 'accounts').typ, 'liste');
    assert.equal(V._feldDef('finance', 'accounts').typ, 'liste');
  } finally { aufraeumen(); }
});

test('[K2] der Typ-Wächter in sektorFeldSetzen greift auch im ruhenden Bereich', async () => {
  const { V, aufraeumen } = await proKern();
  try {
    assert.throws(() => V.sektorFeldSetzen('finance', 'accounts', 'Text'), /Listenfeld/);
  } finally { aufraeumen(); }
});
