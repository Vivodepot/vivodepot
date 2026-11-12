'use strict';
/* Mietangaben an der Hauptwohnung (U2-ADR-465, Wohngeld-Durchstich, Feldregister).
   Die Hauptwohnung trägt die Beträge, die in der Miete stecken, den Mietzuschuss, die beruflich genutzte
   Fläche und eine Liste der Mitbewohner und Untermieter. Die Probe liest den Kern und hält fest: jedes Feld
   steht in der Sektion, die Mietangaben nur bei Miete sichtbar, alles auf der Ebene modul, Beträge sensibel,
   Texte in Deutsch und Englisch, alle in der Kartengruppe der Hauptwohnung. Ein Rot-Beweis zeigt, dass die
   Prüfung an einer verfälschten Kopie anschlägt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));

const FELDER = ['heatingCostsInRent', 'hotWaterCostsInRent', 'garageCostsInRent', 'parkingSpaceCostsInRent',
  'serviceChargeFlatRate', 'householdEnergyCosts', 'costsPaidToThirdParties', 'rentSubsidyProvider',
  'rentSubsidyAmount', 'rentSubsidyFrom', 'rentSubsidyUntil', 'commercialUseArea', 'subtenants'];
const UNTERFELDER = ['subtenantRelationship', 'subtenantRoomSize', 'mainResidence', 'mainResidenceSince',
  'subtenantServiceCharges'];
const SENSIBEL = ['heatingCostsInRent', 'hotWaterCostsInRent', 'garageCostsInRent', 'parkingSpaceCostsInRent',
  'serviceChargeFlatRate', 'householdEnergyCosts', 'costsPaidToThirdParties', 'rentSubsidyAmount', 'subtenants'];
// Fläche für Beruf oder Gewerbe und Mitbewohner gibt es auch im Eigentum; alles andere hängt an der Miete.
const AUCH_EIGENTUM = ['commercialUseArea', 'subtenants'];

function hauptwohnung() {
  const { V } = ladeKern();
  const sektion = (V.SEKTOR_BY_ID.housing.sektionen || []).find((s) => s.id === 'wohnen-haupt');
  assert.ok(sektion, 'Sektion wohnen-haupt fehlt');
  return sektion.felder;
}

function pruefeFelder(felder) {
  for (const id of FELDER) {
    const f = felder.find((x) => x.id === id);
    assert.ok(f, id + ' fehlt');
    if (AUCH_EIGENTUM.includes(id)) assert.equal(f.sichtbarWenn, undefined, id + ' gilt auch im Eigentum');
    else assert.deepEqual(f.sichtbarWenn, { feld: 'ownedOrRented', wert: 'miete' }, id);
    assert.equal(f.ebene, 'modul', id);
  }
  for (const id of SENSIBEL) assert.equal(felder.find((x) => x.id === id).sensibel, true, id + ' nicht sensibel');
}

test('[Miete·Vorlage] jedes Feld steht in wohnen-haupt, Mietangaben nur bei Miete sichtbar, Ebene modul', () => {
  pruefeFelder(hauptwohnung());
});

test('[Miete·Vorlage·Rot-Beweis] eine Kopie ohne sensibel am Betrag oder mit Mitbewohnern nur bei Miete schlägt an', () => {
  const ohneSensibel = JSON.parse(JSON.stringify(hauptwohnung()));
  delete ohneSensibel.find((x) => x.id === 'heatingCostsInRent').sensibel;
  assert.throws(() => pruefeFelder(ohneSensibel), /heatingCostsInRent nicht sensibel/);
  const nurMiete = JSON.parse(JSON.stringify(hauptwohnung()));
  nurMiete.find((x) => x.id === 'subtenants').sichtbarWenn = { feld: 'ownedOrRented', wert: 'miete' };
  assert.throws(() => pruefeFelder(nurMiete), /subtenants gilt auch im Eigentum/);
});

test('[Miete·Liste] Mitbewohner und Untermieter als Liste mit fünf Unterfeldern', () => {
  const liste = hauptwohnung().find((x) => x.id === 'subtenants');
  assert.equal(liste.typ, 'liste');
  assert.deepEqual(liste.unterFelder.map((u) => u.id), UNTERFELDER);
  const verh = liste.unterFelder.find((u) => u.id === 'subtenantRelationship');
  assert.deepEqual(verh.optionen.map((o) => o.wert), ['mitbewohner', 'untermieter']);
  assert.equal(liste.unterFelder.find((u) => u.id === 'subtenantServiceCharges').sensibel, true);
});

test('[Miete·Texte] Beschriftung in Deutsch und Englisch, Optionen und Folgeknopf', () => {
  const de = lies('tools/textsatz-de-modul.json').texte;
  const en = lies('tools/textsatz-en-modul.json').texte;
  const kennungen = FELDER.map((f) => 'housing.' + f + '.label')
    .concat(UNTERFELDER.map((u) => 'housing.subtenants/' + u + '.label'))
    .concat(['mitbewohner', 'untermieter'].map((w) => 'housing.subtenants/subtenantRelationship/' + w + '.label'))
    .concat(['hier', 'woanders'].map((w) => 'housing.subtenants/mainResidence/' + w + '.label'))
    .concat(['housing.subtenants.weitererEintrag']);
  for (const k of kennungen) {
    assert.ok(typeof de[k] === 'string' && de[k].length > 0, 'DE fehlt: ' + k);
    assert.ok(typeof en[k] === 'string' && en[k].length > 0, 'EN fehlt: ' + k);
    assert.notEqual(de[k], en[k], 'EN ist nicht übersetzt: ' + k);
  }
});

test('[Miete·Karte] alle neuen Felder stehen in der Kartengruppe der Hauptwohnung', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const m = kern.match(/\{ id: 'fg-wohnen-hauptwohnung'[^\n]*felder: \[([^\]]*)\]/);
  assert.ok(m, 'Kartengruppe fehlt');
  const inGruppe = m[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  for (const id of FELDER) assert.ok(inGruppe.includes(id), id + ' fehlt in der Kartengruppe');
});
