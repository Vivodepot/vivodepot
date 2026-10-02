'use strict';
/* ═════════════════════════════════════════════════════════════════
   U2-ADR-467: was mit einem Anschrift-Vorschlag der Stufe 91 geschieht.

   Auflagen (Gegenlesung, 01.10.2026):
     · Der Vorschlag wird nur mit sichtbarer Bestätigung übernommen — bis dahin steht er in keinem Feld.
     · Er steht in der Depotdatei und in der Sicherung, aber in keiner Ausgabe an Dritte.
     · Er verschwindet, sobald die Person bestätigt oder ablehnt; es bleibt kein Altbestand liegen.
     · Ändert die Person die alte Zeile, aus der er stammt, wird er verworfen, nicht still weiter angeboten.
   Die Migration selbst hält tests/schema-91-namen-anschrift-getrennt.test.js.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const TEILE = ['street', 'houseNumber', 'postalCode', 'city'];

function aufgesetzt() {
  const { V } = ladeKern();
  const d = V.depotNormalisieren({
    schemaVersion: 90,
    sektoren: { identity: { givenName: 'Erika', familyName: 'Mustermann', streetAddress: 'Lindenweg 4a', postcodeCity: '80331 München' } },
    menschen: [
      { id: 'p1', name: 'Maria von der Heide', adresse: 'Am Hang 12, 50667 Köln' },
      { id: 'p2', name: 'Dr. Hans-Peter Müller-Lüdenscheidt', adresse: 'Straße des 17. Juni 5, 10623 Berlin' },
    ],
    verwalteteDepots: [],
  });
  V.setData(d);
  V.akteurSelbstErklaeren('Tester');
  return V;
}
const person = (V, id) => V.getData().menschen.find((m) => m.id === id);

test('[Vorschlag·Bestätigen] Übernehmen schreibt die Teile in die leeren Felder und entfernt den Vorschlag', () => {
  const V = aufgesetzt();
  assert.ok(V.anschriftVorschlag('identity'), 'Vorbedingung: Vorschlag steht an');
  assert.equal(V.anschriftVorschlagUebernehmen('identity'), true);
  const id = V.getData().sektoren.identity;
  assert.deepEqual(TEILE.map((t) => id[t]), ['Lindenweg', '4a', '80331', 'München']);
  assert.equal(V.anschriftVorschlag('identity'), null);
  assert.equal(V.getData().anschriftVorschlaege.identity, undefined, 'kein leerer Rest');
  V.anschriftVorschlagUebernehmen('p1');
  assert.deepEqual(TEILE.map((t) => person(V, 'p1')[t]), ['Am Hang', '12', '50667', 'Köln']);
  assert.equal(V.anschriftVorschlag('p1'), null);
  assert.equal(person(V, 'p1').familyName, undefined, 'der Name bleibt unzerlegt, auch beim Übernehmen der Anschrift');
});

test('[Vorschlag·Ablehnen] Verwerfen schreibt kein Feld und entfernt den Vorschlag; nach dem letzten ist der Behälter leer', () => {
  const V = aufgesetzt();
  V.anschriftVorschlagVerwerfen('identity');
  V.anschriftVorschlagVerwerfen('p1');
  V.anschriftVorschlagVerwerfen('p2');
  const d = V.getData();
  for (const t of TEILE) assert.equal(d.sektoren.identity[t], undefined);
  assert.deepEqual(d.anschriftVorschlaege, {}, 'es bleibt kein Altbestand liegen');
  assert.equal(d.sektoren.identity.streetAddress, 'Lindenweg 4a', 'der Altwert bleibt');
});

test('[Vorschlag·selbst geschrieben] ein Teil, den die Person selbst einträgt, ist entschieden — nur sein Vorschlag entfällt', () => {
  const V = aufgesetzt();
  V.sektorFeldSetzen('identity', 'city', 'München-Schwabing');
  assert.deepEqual(V.anschriftVorschlag('identity'), { street: 'Lindenweg', houseNumber: '4a', postalCode: '80331' });
});

test('[Vorschlag·Altzeile geändert] wer die alte Zeile ändert, verwirft den Vorschlag, der aus ihr stammt', () => {
  const V = aufgesetzt();
  V.personAktualisieren('p1', { adresse: 'Neue Straße 1, 50667 Köln' });
  assert.equal(V.anschriftVorschlag('p1'), null, 'Person: kein Vorschlag aus der überholten Zeile');
  assert.ok(V.anschriftVorschlag('p2'), 'die andere Person behält ihren');
  V.personAktualisieren('p2', { tel: '0221 1' });
  assert.ok(V.anschriftVorschlag('p2'), 'eine andere Angabe zu ändern berührt den Vorschlag nicht');
  V.sektorFeldSetzen('identity', 'streetAddress', 'Lindenweg 6');
  assert.equal(V.anschriftVorschlag('identity'), null, 'Identität: dasselbe für die alte Zeile');
});

test('[Vorschlag·Rot-Beweis] ohne den Anschluss in personAktualisieren bliebe der Vorschlag nach geänderter Zeile stehen', () => {
  const V = aufgesetzt();
  const p = person(V, 'p1');
  p.adresse = 'Neue Straße 1, 50667 Köln';   // am Schreibweg vorbei — so sähe es ohne den Anschluss aus
  assert.ok(V.anschriftVorschlag('p1'), 'die Probe oben prüft also wirklich den Schreibweg');
});

test('[Vorschlag·Person entfernt] mit der Person verschwindet ihr Vorschlag', () => {
  const V = aufgesetzt();
  V.personLoeschen('p2');
  assert.equal(V.anschriftVorschlag('p2'), null);
  assert.equal('p2' in (V.getData().anschriftVorschlaege.menschen || {}), false);
});

test('[Vorschlag·Formular] die Bearbeiten-Maske ist mit dem Vorschlag vorbefüllt und sagt sichtbar, dass es einer ist', () => {
  const V = aufgesetzt();
  const { eintrag, kopfHTML } = V.personFormVorbereiten(person(V, 'p1'));
  assert.equal(eintrag.street, 'Am Hang');
  assert.equal(eintrag.city, 'Köln');
  assert.equal(person(V, 'p1').street, undefined, 'vorbefüllt heißt nicht gespeichert');
  assert.ok(kopfHTML.includes(V.STRINGS.anschriftVorschlagHinweis), 'Hinweis „Vorschlag … bitte prüfen“');
  assert.ok(kopfHTML.includes('data-anschrift-vorschlag-verwerfen'), 'Ablehnen ist erreichbar');
  assert.ok(kopfHTML.includes(V.STRINGS.personNameGetrenntHinweis), 'ohne getrennten Namen: die Bitte, ihn einzutragen');
  V.personAktualisieren('p1', { familyName: 'von der Heide', givenName: 'Maria' });
  V.anschriftVorschlagVerwerfen('p1');
  const zweit = V.personFormVorbereiten(person(V, 'p1'));
  assert.equal(zweit.kopfHTML, '', 'Name getrennt, kein Vorschlag: kein Hinweis');
  assert.equal(zweit.eintrag.street, undefined);
});

test('[Vorschlag·Ansicht] die Identität zeigt den Vorschlag mit Übernehmen und Verwerfen über den Anschriftsfeldern', () => {
  const V = aufgesetzt();
  const sek = V.SEKTOR_BY_ID.identity.sektionen.find((s) => (s.felder || []).some((f) => f.id === 'street'));
  assert.ok(sek, 'Vorbedingung: die Vorlage trägt die getrennten Felder');
  const h = V.anschriftVorschlagKarteHTML('identity', sek, true);
  assert.ok(h.includes('Lindenweg') && h.includes('80331'));
  assert.ok(h.includes('data-anschrift-vorschlag-uebernehmen="identity"') && h.includes('data-anschrift-vorschlag-ablehnen="identity"'));
  assert.equal(V.anschriftVorschlagKarteHTML('identity', sek, false).includes('<button'), false, 'ohne Schreibrecht keine Knöpfe');
  V.anschriftVorschlagVerwerfen('identity');
  assert.equal(V.anschriftVorschlagKarteHTML('identity', sek, true), '');
});

test('[Vorschlag·Ausgaben] in Depot und Sicherung ja, in keiner Ausgabe an Dritte', () => {
  const V = aufgesetzt();
  // Sicherung (Umzug mit allem) trägt ihn — sonst stünde die Prüfung nach dem Umzug nicht mehr an.
  assert.ok(V.vollExportJSON({ sensibel: true }).depot.anschriftVorschlaege.menschen.p1);
  // Ausgabe ohne sensible Daten: zurückgehalten — der Schlüssel steht leer da (wie jeder zurückgehaltene), ohne Wert.
  const ohne = V.vollExportJSON();
  assert.deepEqual(ohne.depot.anschriftVorschlaege, {});
  assert.equal(JSON.stringify(ohne).includes('"Am Hang"'), false);
  // Empfänger-Ausschnitt mit allen Bausteinen: weder der Vermerk noch ein vorgeschlagener Teil.
  const alle = V.empfaengerBausteineAlle().map((b) => b.id);
  const teil = JSON.stringify(V.empfaengerZuschnittModell({ id: 'k', name: 'X', bausteine: alle, ausnahmen: [] }));
  assert.equal(teil.includes('anschriftVorschlaege'), false);
  assert.equal(teil.includes('"Am Hang"'), false);
  assert.equal(teil.includes('"Lindenweg"'), false);
  // Standard-Ausgaben: kein vorgeschlagener Teil als eigener Wert.
  const vcard = String(V.vcardIdentitaet()) + String(V.vcardMenschen());
  assert.equal(/;Lindenweg;|;Am Hang;/.test(vcard), false, vcard);
  assert.equal(JSON.stringify(V.sdJwtVcIdentitaet({ sensibel: true })).includes('"80331"'), false);
});
