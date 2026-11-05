'use strict';
/* ═════════════════════════════════════════════════════════════════════════
   Befund UX-EINLESEN-IN-EIGENE-IDENTITAET (Usability-Durchlauf v963, 30.10.2026)
   ─────────────────────────────────────────────────────────────────────────
   Unter „Meine Menschen“ › Einlesen › „Datei automatisch erkennen“ landete eine
   einzelne Kontaktkarte in der eigenen Identität: importFormatErkennen las nur die
   Zahl der Karten (eine Karte → vcard-identitaet), der Bereich bestimmte nur die
   Reihenfolge der Kandidaten.

   Abnahme: Eine eingelesene Kontaktkarte wird über die automatische Erkennung immer
   eine neue Person; die eigene Identität bleibt unverändert. In die Identität kommt
   eine Karte nur über die ausdrückliche Wahl des Formats in „Identität & Person“.

   Rot-Beweis: auf dem Stand vor dem Fix erkennt importFormatErkennen eine einzelne
   Karte als vcard-identitaet, und das Anwenden überschreibt die Identität.
   ═════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'einlesen-kontaktkarte-pw-978';
const KARTE = [
  'BEGIN:VCARD', 'VERSION:4.0', 'FN:Erika Probe', 'N:Probe;Erika;;;',
  'TEL;TYPE=cell:+49 170 0000000', 'EMAIL:erika.probe@example.org', 'END:VCARD', '',
].join('\r\n');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

function menschen(V) { return V.getData().menschen || []; }
function identitaet(V) { return JSON.stringify(V.getData().sektoren.identity || {}); }

for (const [wo, sektorId] of [['Meine Menschen', 'people'], ['Ganzes Depot', undefined], ['Identität & Person', 'identity']]) {
  test('[Einlesen·Kontaktkarte] „Datei automatisch erkennen“ in ' + wo + ': eine Karte wird eine neue Person, die Identität bleibt', async () => {
    const { V } = await frischMitDepot();
    const vorher = identitaet(V);
    const zahl = menschen(V).length;
    const fid = V.importFormatErkennen(KARTE, sektorId);
    assert.equal(fid, 'vcard-menschen', 'die automatische Erkennung führt eine Karte zu Meine Menschen');
    const plan = V.kernAPI.importVorschau(fid, KARTE);
    V.importAnwenden(plan, { alleKonflikte: true });
    assert.equal(menschen(V).length, zahl + 1, 'genau eine neue Person');
    assert.ok(menschen(V).some((m) => JSON.stringify(m).includes('Erika')), 'die neue Person trägt den Namen der Karte');
    assert.equal(identitaet(V), vorher, 'die eigene Identität bleibt unverändert');
  });
}

test('[Einlesen·Kontaktkarte] in die Identität nur über die ausdrückliche Formatwahl', async () => {
  const { V } = await frischMitDepot();
  const f = V.importFormatFuerId('vcard-identitaet');
  assert.ok(f && f.sektor === 'identity', 'das Format für die eigenen Angaben besteht weiter');
  const plan = V.kernAPI.importVorschau('vcard-identitaet', KARTE);
  assert.ok((plan.felder || plan.zeilen || []).length > 0, 'die ausdrückliche Wahl liest die Karte als eigene Angaben');
});

// Wächter gegen die Klasse: keine Kontaktkarte, ob eine oder mehrere, führt aus irgendeinem Bereich über
// die automatische Erkennung in ein Format, das die eigene Identität beschreibt.
test('[Einlesen·Kontaktkarte·Wächter] aus keinem Bereich führt die Erkennung einer Kontaktkarte in die Identität', () => {
  const { V } = ladeKern();
  const drei = KARTE + KARTE.replace(/Erika/g, 'Hans') + KARTE.replace(/Erika/g, 'Ilse');
  const bereiche = V.SEKTOREN.map((s) => s.id).concat([undefined]);
  assert.ok(bereiche.length > 10, 'alle Bereiche sind gelesen');
  for (const text of [KARTE, drei]) {
    for (const b of bereiche) {
      const fid = V.importFormatErkennen(text, b);
      const f = V.importFormatFuerId(fid);
      assert.ok(f && f.sektor !== 'identity', 'Bereich ' + b + ': erkannt als ' + fid);
    }
  }
});
