'use strict';
/* ═════════════════════════════════════════════════════════════════
   U2-ADR-467: die Ausgaben nehmen die bestätigten Anschriftsteile — und fallen ohne sie auf die bisherige Zeile
   zurück, damit nichts verloren geht. Was getrennt hereinkommt (XMeld, vCard-N/ADR mit PLZ, SD-JWT mit postal_code,
   FHIR Patient.address), bleibt getrennt; nichts wird aus einer Zeile geteilt.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function mit(identity, menschen) {
  const { V } = ladeKern();
  V.setData(V.depotNormalisieren({ schemaVersion: 91, sektoren: { identity: Object.assign({ givenName: 'Erika', familyName: 'Mustermann', birthDate: '1960-01-01' }, identity) },
    menschen: menschen || [], verwalteteDepots: [] }));
  V.akteurSelbstErklaeren('Erika Mustermann');
  return V;
}
const GETRENNT = { street: 'Lindenweg', houseNumber: '4a', postalCode: '80331', city: 'München' };
const ALT = { streetAddress: 'Lindenweg 4a', postcodeCity: '80331 München' };
const patient = (V) => V.fhirIpsBundle(new Date('2026-10-01T10:00:00Z')).entry.map((e) => e.resource).find((r) => r.resourceType === 'Patient');

test('[Ausgabe·Leseregel] Teile vor Zeile; Identität je Zeile, Person erst mit allen vier Teilen', () => {
  const V = mit({});
  const a = V.anschriftFuerAusgabe('identity', { sektoren: { identity: Object.assign({}, GETRENNT, ALT) } });
  assert.deepEqual([a.getrennt, a.vollstaendig, a.zeile], [true, true, 'Lindenweg 4a, 80331 München']);
  const z = V.anschriftFuerAusgabe('identity', { sektoren: { identity: { streetAddress: 'Lindenweg 4a', postalCode: '80331', city: 'München' } } });
  assert.equal(z.zeile, 'Lindenweg 4a, 80331 München', 'Identität: die Straßenzeile füllt die fehlende Zeile');
  assert.equal(z.vollstaendig, false);
  assert.equal(V.anschriftFuerAusgabe({ adresse: 'Am Hang 12, 50667 Köln' }).zeile, 'Am Hang 12, 50667 Köln', 'Person ohne Teile: die Zeile');
  assert.equal(V.anschriftFuerAusgabe({ adresse: 'Am Hang 12, 50667 Köln', city: 'Köln' }).zeile, 'Am Hang 12, 50667 Köln', 'Person mit nur einem Teil: die bisherige Zeile bleibt');
  assert.equal(V.anschriftFuerAusgabe({ adresse: 'Am Hang 12, 50667 Köln', street: 'Am Hang', houseNumber: '12', postalCode: '50667', city: 'Köln' }).zeile, 'Am Hang 12, 50667 Köln', 'alle vier: die Teile');
  assert.equal(V.anschriftFuerAusgabe({ city: 'Köln' }).zeile, 'Köln', 'ohne bisherige Zeile: was da ist');
});

test('[Ausgabe·FHIR] Patient.address mit Teilen strukturiert, ohne nur als Text', () => {
  assert.deepEqual(patient(mit(GETRENNT)).address,
    [{ use: 'home', type: 'physical', text: 'Lindenweg 4a, 80331 München', line: ['Lindenweg 4a'], city: 'München', postalCode: '80331' }]);
  assert.deepEqual(patient(mit(ALT)).address, [{ use: 'home', text: 'Lindenweg 4a, 80331 München' }], 'keine geratene Struktur');
  assert.equal(patient(mit({})).address, undefined);
});

test('[Ausgabe·FHIR·Rückweg] Patient.address kommt getrennt zurück', () => {
  const V = mit(GETRENNT);
  const felder = V._fhirIpsFelder(V.fhirIpsBundle(new Date('2026-10-01T10:00:00Z')));
  const wert = (f) => (felder.find((x) => x.feldId === f) || {}).wert;
  assert.deepEqual([wert('postalCode'), wert('city'), wert('streetAddress')], ['80331', 'München', 'Lindenweg 4a']);
});

test('[Ausgabe·vCard] ADR in Komponenten (Straße;Ort;;PLZ), ohne Teile wie bisher', () => {
  assert.ok(String(mit(GETRENNT).vcardIdentitaet()).includes('ADR;TYPE=home:;;Lindenweg 4a;München;;80331;'));
  assert.ok(String(mit(ALT).vcardIdentitaet()).includes('ADR;TYPE=home:;;Lindenweg 4a;80331 München;;;'));
  const V = mit({}, [{ id: 'p1', name: 'Anna Schmidt', familyName: 'Schmidt', givenName: 'Anna', street: 'Kastanienweg', houseNumber: '5', postalCode: '80331', city: 'München' }]);
  const k = String(V.vcardMenschen());
  assert.ok(k.includes('N:Schmidt;Anna;;;') && k.includes('ADR;TYPE=home:;;Kastanienweg 5;München;;80331;'), k);
});

test('[Ausgabe·vCard·Rückweg] PLZ und Ort getrennt zurück, Namensteile aus N, die Straße bleibt Zeile', () => {
  const V = mit(GETRENNT);
  const felder = V._vcardIdentitaetFelder(V.parseVCards(V.vcardIdentitaet()));
  const wert = (f) => (felder.find((x) => x.feldId === f) || {}).wert;
  assert.deepEqual([wert('postalCode'), wert('city'), wert('streetAddress'), wert('postcodeCity')], ['80331', 'München', 'Lindenweg 4a', undefined]);
  const W = mit({}, [{ id: 'p1', name: 'Anna Schmidt', familyName: 'Schmidt', givenName: 'Anna', street: 'Kastanienweg', houseNumber: '5', postalCode: '80331', city: 'München' }]);
  const [e] = W._vcardMenschenEintraege(W.parseVCards(W.vcardMenschen()));
  assert.deepEqual([e.familyName, e.givenName, e.adresse], ['Schmidt', 'Anna', 'Kastanienweg 5, 80331 München'], 'vorher fiel alles außer der Straße weg');
});

test('[Ausgabe·SD-JWT] postal_code und locality getrennt; ohne Teile locality = die Zeile, keine geratene PLZ', () => {
  assert.deepEqual(mit(GETRENNT).sdJwtVcIdentitaet().claims.address,
    { country_code: 'DE', street_address: 'Lindenweg 4a', postal_code: '80331', locality: 'München' });
  assert.deepEqual(mit(ALT).sdJwtVcIdentitaet().claims.address, { country_code: 'DE', street_address: 'Lindenweg 4a', locality: '80331 München' });
  const V = mit(GETRENNT);
  const felder = V._sdJwtIdentitaetFelder(V.sdJwtVcIdentitaet());
  assert.ok(felder.some((f) => f.feldId === 'postalCode' && f.wert === '80331') && felder.some((f) => f.feldId === 'city' && f.wert === 'München'));
});

test('[Ausgabe·XMeld] Straße, Hausnummer, PLZ und Wohnort gehen getrennt in die vier Felder', () => {
  const V = mit({});
  const xml = '<xmeld><natuerlichePerson><vorname>Maria</vorname><familienname><name>von der Heide</name></familienname>'
    + '<anschrift><strasse>Am Hang</strasse><hausnummer>12</hausnummer><postleitzahl>50667</postleitzahl><wohnort>Köln</wohnort></anschrift>'
    + '</natuerlichePerson></xmeld>';
  const felder = V._xmeldFelder(V.parseXMeld(xml));
  const wert = (f) => (felder.find((x) => x.feldId === f) || {}).wert;
  assert.deepEqual(['street', 'houseNumber', 'postalCode', 'city'].map(wert), ['Am Hang', '12', '50667', 'Köln']);
  assert.equal(wert('streetAddress'), undefined, 'nicht mehr zu einer Zeile zusammengefügt');
  assert.equal(wert('familyName'), 'von der Heide', 'der Familienname kommt, wie XMeld ihn führt');
});

test('[Ausgabe·Rot-Beweis] ein offener Vorschlag allein erzeugt in keiner Ausgabe einen Teil — nur die bisherige Zeile', () => {
  const { V } = ladeKern();
  V.setData(V.depotNormalisieren({ schemaVersion: 90, sektoren: { identity: Object.assign({ givenName: 'Erika', familyName: 'Mustermann', birthDate: '1960-01-01' }, ALT) },
    menschen: [], verwalteteDepots: [] }));
  V.akteurSelbstErklaeren('Erika Mustermann');
  assert.ok(V.anschriftVorschlag('identity'), 'Vorbedingung: die Stufe hat einen Vorschlag angelegt');
  assert.deepEqual(patient(V).address, [{ use: 'home', text: 'Lindenweg 4a, 80331 München' }], 'nähme FHIR den Vorschlag, stünde hier postalCode/city');
  assert.equal(V.sdJwtVcIdentitaet().claims.address.postal_code, undefined);
  assert.ok(String(V.vcardIdentitaet()).includes('ADR;TYPE=home:;;Lindenweg 4a;80331 München;;;'));
  V.anschriftVorschlagUebernehmen('identity');
  assert.equal(patient(V).address[0].postalCode, '80331', 'Gegenprobe: nach dem Übernehmen sind die Teile da');
});

test('[Ausgabe·FHIR·Rückweg] eine Adresse nur als Text wird nicht in ein Feld gelegt', () => {
  const V = mit({});
  const felder = V._fhirIpsFelder({ entry: [{ resource: { resourceType: 'Patient', name: [{ family: 'M', given: ['E'] }], address: [{ text: 'Lindenweg 4, 80331 München' }] } }] });
  assert.equal(felder.some((f) => /street|postcode|postal|city/i.test(f.feldId)), false);
});

test('[Ausgabe·Dokumentsatz] die Personalien setzen die Zeile aus den Teilen zusammen, sonst der Altwert', () => {
  assert.ok(mit(GETRENNT)._identitaetPersonalienSatz().includes('wohnhaft in Lindenweg 4a, 80331 München'));
  assert.ok(mit(ALT)._identitaetPersonalienSatz().includes('wohnhaft in Lindenweg 4a, 80331 München'));
  const V = mit({}, [{ id: 'p1', name: 'Anna Schmidt', street: 'Kastanienweg', houseNumber: '5', postalCode: '80331', city: 'München' }]);
  assert.ok(V.personVollzeile({ ref: 'p1' }).includes('wohnhaft in Kastanienweg 5, 80331 München'));
});
