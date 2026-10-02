'use strict';
/* ═════════════════════════════════════════════════════════════════
   Schema 91 (01.10.2026, U2-ADR-467): getrennte Felder für Straße, Hausnummer, PLZ und Ort (Identität und Personen)
   und für Familienname und Vornamen (Personen).

   Geprüft, je mit Rot-Beweis:
     (a) Namen werden NIE zerlegt — ein Ein-Feld-Name bleibt, `familyName`/`givenName` bleiben leer, auch bei
         „Maria von der Heide“ und „Dr. Hans-Peter Müller-Lüdenscheidt“.
     (b) Eine Anschrift wird nur VORGESCHLAGEN: die Teile stehen in `anschriftVorschlaege`, die Felder bleiben leer,
         der Altwert bleibt stehen.
     (c) Eine Anschrift, die die feste Regel nicht eindeutig trifft, bekommt keinen Vorschlag.
   Was mit dem Vorschlag danach geschieht (bestätigen, ablehnen, verwerfen, Ausgaben), hält
   tests/anschrift-vorschlag-bestaetigen.test.js.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const altDepot = (schemaVersion, extra) => Object.assign({
  schemaVersion,
  sektoren: { identity: { givenName: 'Erika', familyName: 'Mustermann', streetAddress: 'Lindenweg 4a', postcodeCity: '80331 München' } },
  menschen: [
    { id: 'p1', name: 'Maria von der Heide', adresse: 'Am Hang 12, 50667 Köln' },
    { id: 'p2', name: 'Dr. Hans-Peter Müller-Lüdenscheidt', adresse: 'Straße des 17. Juni 5, 10623 Berlin' },
    { id: 'p3', name: 'Oma', adresse: 'bei Tante Grete im Dorf' },
  ],
}, extra || {});

test('[Stufe 91·a] Namen werden nie zerlegt: der Ein-Feld-Name bleibt, Familienname und Vornamen bleiben leer', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(90);
  V.depotNormalisieren(d);
  assert.ok(d.schemaVersion >= 91);
  for (const p of d.menschen) {
    assert.equal(p.familyName, undefined, p.name + ': kein Familienname geraten');
    assert.equal(p.givenName, undefined, p.name + ': keine Vornamen geraten');
  }
  assert.equal(d.menschen[0].name, 'Maria von der Heide');
  assert.equal(d.menschen[1].name, 'Dr. Hans-Peter Müller-Lüdenscheidt');
  assert.equal(JSON.stringify(d.anschriftVorschlaege).includes('Heide'), false, 'auch kein Namensteil als Vorschlag');
});

test('[Stufe 91·b] die Anschrift kommt nur als Vorschlag: Teile im Vermerk, Felder leer, Altwert bleibt', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(90);
  V.depotNormalisieren(d);
  const id = d.sektoren.identity;
  for (const f of ['street', 'houseNumber', 'postalCode', 'city']) assert.equal(id[f], undefined, 'identity.' + f + ' bleibt leer');
  assert.equal(id.streetAddress, 'Lindenweg 4a');
  assert.equal(id.postcodeCity, '80331 München');
  assert.deepEqual(d.anschriftVorschlaege.identity, { street: 'Lindenweg', houseNumber: '4a', postalCode: '80331', city: 'München' });
  assert.deepEqual(d.anschriftVorschlaege.menschen.p1, { street: 'Am Hang', houseNumber: '12', postalCode: '50667', city: 'Köln' });
  assert.deepEqual(d.anschriftVorschlaege.menschen.p2, { street: 'Straße des 17. Juni', houseNumber: '5', postalCode: '10623', city: 'Berlin' });
  assert.equal(d.menschen[0].adresse, 'Am Hang 12, 50667 Köln');
  for (const f of ['street', 'houseNumber', 'postalCode', 'city']) assert.equal(d.menschen[0][f], undefined, 'Person: ' + f + ' bleibt leer');
});

test('[Stufe 91·c] eine nicht eindeutige Anschrift bekommt keinen Vorschlag', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(90, { sektoren: { identity: { streetAddress: 'Postfach', postcodeCity: 'D-80331 München' } } });
  V.depotNormalisieren(d);
  assert.equal(d.anschriftVorschlaege.identity, undefined, 'weder „Postfach“ noch „D-80331“ treffen die Regel');
  assert.equal(d.anschriftVorschlaege.menschen.p3, undefined, 'eine Zeile ohne Komma und Hausnummer bleibt Altwert');
  assert.deepEqual(V._anschriftTeileNachRegel('B 96 12', '1234 Wien'), {}, 'Straße endet auf Ziffer, PLZ vierstellig: nichts');
  assert.deepEqual(V._anschriftTeileNachRegel('Hauptstraße 12-14', 'irgendwo'), { street: 'Hauptstraße', houseNumber: '12-14' },
    'jede Zeile für sich: die Straße trifft, der Ort nicht');
});

test('[Stufe 91] ein schon gefülltes Feld bekommt keinen Vorschlag', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(90);
  d.sektoren.identity.city = 'Muenchen-Schwabing';
  V.depotNormalisieren(d);
  assert.equal(d.sektoren.identity.city, 'Muenchen-Schwabing');
  assert.equal('city' in d.anschriftVorschlaege.identity, false);
  assert.equal(d.anschriftVorschlaege.identity.street, 'Lindenweg');
});

test('[Stufe 91·Rot-Beweis] ein Depot, das schon auf 91 steht, durchläuft die Stufe nicht — es entstünde kein Vorschlag', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(91);
  V.depotNormalisieren(d);
  assert.equal((d.anschriftVorschlaege || {}).identity, undefined,
    'entstünde er trotzdem, wäre der Vorschlag nicht der Stufe zu verdanken und die Proben oben belegten nichts');
});

test('[Stufe 91] zweimal normalisiert ist wie einmal', () => {
  const { V } = ladeKern({ blank: true });
  const a = altDepot(90); V.depotNormalisieren(a);
  const b = JSON.parse(JSON.stringify(a)); V.depotNormalisieren(b);
  assert.deepEqual(b.sektoren, a.sektoren);
  assert.deepEqual(b.menschen, a.menschen);
  assert.deepEqual(b.anschriftVorschlaege, a.anschriftVorschlaege);
});
