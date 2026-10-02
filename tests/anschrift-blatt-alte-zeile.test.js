'use strict';
/* ═════════════════════════════════════════════════════════════════
   U2-ADR-467, Punkt 7 auf dem Blatt: die bisherige Anschriftszeile steht im PDF und in der Zusammenfassung einer Person
   nur so lange, bis die Teile, die sie ersetzen, ALLE eingetragen sind (`ersetztDurch`). Identität je Zeile: Straße und
   Hausnummer ersetzen streetAddress, Postleitzahl und Ort ersetzen postcodeCity. Person: alle vier Teile ersetzen adresse.
   Ein einzelner Teil (nur der Ort) lässt die alte Zeile stehen — sonst ginge die bisherige Anschrift vom Blatt, ohne dass
   die neue vollständig ist.
   ROT-BEWEIS: dieselben Felder ohne `ersetztDurch` drucken beides; ein Teil ohne Wert hält die Zeile.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function mit(identity, menschen) {
  const { V } = ladeKern();
  V.setData(V.depotNormalisieren({ schemaVersion: 91, sektoren: { identity: Object.assign({ givenName: 'Erika', familyName: 'Mustermann' }, identity) },
    menschen: menschen || [], verwalteteDepots: [] }));
  return V;
}
const ALT = { streetAddress: 'Lindenweg 4a', postcodeCity: '80331 München' };
const werte = (V) => V.bereichVollModell('identity', { sensibel: true }).bereiche[0].sektionen.flatMap((s) => s.zeilen).map((z) => z.wert);

test('[Blatt·Identität] je Zeile: ein vollständiges Paar ersetzt seine alte Zeile, das andere bleibt', () => {
  const nurStrasse = werte(mit(Object.assign({ street: 'Lindenweg', houseNumber: '4a' }, ALT)));
  assert.ok(!nurStrasse.includes('Lindenweg 4a'), 'Straße und Hausnummer ersetzen streetAddress');
  assert.ok(nurStrasse.includes('80331 München'), 'ohne Postleitzahl und Ort bleibt postcodeCity');
  const alle = werte(mit(Object.assign({ street: 'Lindenweg', houseNumber: '4a', postalCode: '80331', city: 'München' }, ALT)));
  assert.ok(!alle.includes('Lindenweg 4a') && !alle.includes('80331 München'), 'beide Paare: keine alte Zeile');
  assert.ok(alle.includes('Lindenweg') && alle.includes('München'));
});

test('[Blatt·Identität·Rot-Beweis] nur der Ort gesetzt: beide alten Zeilen bleiben', () => {
  const w = werte(mit(Object.assign({ city: 'München' }, ALT)));
  assert.ok(w.includes('Lindenweg 4a') && w.includes('80331 München'));
});

test('[Blatt·Person] adresse entfällt erst mit allen vier Teilen; nur der Ort hält sie', () => {
  const V = mit({});
  const feld = V.MENSCHEN_REGISTER_FELD;
  const z = (e) => V.listenEintragZusammenfassung(feld, Object.assign({ name: 'Maria von der Heide', adresse: 'Am Hang 12, 50667 Köln' }, e));
  assert.match(z({ city: 'Köln' }), /Am Hang 12, 50667 Köln/, 'nur der Ort: die bisherige Anschrift bleibt');
  assert.match(z({ street: 'Am Hang', houseNumber: '12', postalCode: '50667' }), /Am Hang 12, 50667 Köln/, 'drei von vier: bleibt');
  assert.doesNotMatch(z({ street: 'Am Hang', houseNumber: '12', postalCode: '50667', city: 'Köln' }), /Am Hang 12, 50667 Köln/);
});

test('[Blatt·Rot-Beweis] ohne ersetztDurch druckt das Feld weiter, und ein leerer Teil ersetzt nichts', () => {
  const V = mit({});
  const wert = (k) => ({ street: 'Lindenweg', houseNumber: '  ' })[k];
  assert.equal(V.feldDurchTeileErsetzt({ id: 'streetAddress' }, wert), false);
  assert.equal(V.feldDurchTeileErsetzt({ id: 'streetAddress', ersetztDurch: ['street', 'houseNumber'] }, wert), false);
  assert.equal(V.feldDurchTeileErsetzt({ id: 'streetAddress', ersetztDurch: ['street'] }, wert), true);
  const feld = Object.assign({}, V.MENSCHEN_REGISTER_FELD, {
    unterFelder: V.MENSCHEN_REGISTER_FELD.unterFelder.map((u) => (u.id === 'adresse' ? Object.assign({}, u, { ersetztDurch: undefined }) : u)) });
  assert.match(V.listenEintragZusammenfassung(feld, { name: 'X', adresse: 'Am Hang 12', street: 'Am Hang', houseNumber: '12', postalCode: '50667', city: 'Köln' }),
    /Am Hang 12/, 'ohne die Angabe stünde die alte Zeile neben den Teilen');
});
