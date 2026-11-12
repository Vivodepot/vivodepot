'use strict';
/* Angaben der Meldebehörde bei der Anmeldung einer Wohnung (U2-ADR-465 Nr. 35, Feldregister).
   Die Hauptwohnung trägt das Einzugsdatum, ob der Wohnungsgeber auch Eigentümer ist, den Namen des Eigentümers und
   das Zuordnungsmerkmal der elektronischen Wohnungsgeberbestätigung; die Person trägt ihren Doktorgrad. Die Probe liest
   den Kern und hält fest: jedes Feld steht in seiner Sektion und Kartengruppe, auf der Ebene modul, die Angaben zum
   Wohnungsgeber nur bei Miete, der Name des Eigentümers nur, wenn der Wohnungsgeber nicht Eigentümer ist, das
   Zuordnungsmerkmal sensibel, Texte in Deutsch und Englisch. Die Lock-Datei pinnt die FIM-Felder, auf die die Bezüge
   zeigen werden (nur Kennung, Fassung, Status; U2-ADR-456). Ein Rot-Beweis zeigt, dass die Prüfung an einer
   verfälschten Kopie anschlägt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const lies = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8'));

const MIETE = { feld: 'ownedOrRented', wert: 'miete' };
const ERWARTET = {
  moveInDate: { typ: 'datum' },
  landlordIsOwner: { typ: 'auswahl', sichtbarWenn: MIETE, optionen: ['ja', 'nein'] },
  ownerName: { typ: 'text', sichtbarWenn: { feld: 'landlordIsOwner', wert: 'nein' } },
  landlordConfirmationCode: { typ: 'text', sichtbarWenn: MIETE, sensibel: true },
};
const FIM_GEPINNT = ['F13001540', 'F13001522', 'F60000229', 'G60000093', 'F60000248', 'F13001541', 'F13001563', 'F13001561'];

function sektion(V, bereich, id) {
  const s = (V.SEKTOR_BY_ID[bereich].sektionen || []).find((x) => x.id === id);
  assert.ok(s, bereich + '/' + id + ' fehlt');
  return s.felder;
}

function pruefeWohnung(felder) {
  for (const [id, soll] of Object.entries(ERWARTET)) {
    const f = felder.find((x) => x.id === id);
    assert.ok(f, id + ' fehlt');
    assert.equal(f.typ, soll.typ, id + ' Typ');
    assert.equal(f.ebene, 'modul', id + ' nicht auf Ebene modul');
    assert.deepEqual(f.sichtbarWenn, soll.sichtbarWenn, id + ' Sichtbarkeit');
    assert.equal(f.sensibel === true, soll.sensibel === true, id + (soll.sensibel ? ' nicht sensibel' : ' sensibel ohne Grund'));
    if (soll.optionen) assert.deepEqual(f.optionen.map((o) => o.wert), soll.optionen, id + ' Optionen');
  }
}

test('[Wohnsitz·Vorlage] Einzug, Wohnungsgeber als Eigentümer, Eigentümer, Zuordnungsmerkmal in wohnen-haupt', () => {
  const { V } = ladeKern();
  pruefeWohnung(sektion(V, 'housing', 'wohnen-haupt'));
});

test('[Wohnsitz·Vorlage·Rot-Beweis] eine Kopie ohne sensibel oder mit dem Eigentümer bei jeder Miete schlägt an', () => {
  const { V } = ladeKern();
  const ohneSensibel = JSON.parse(JSON.stringify(sektion(V, 'housing', 'wohnen-haupt')));
  delete ohneSensibel.find((x) => x.id === 'landlordConfirmationCode').sensibel;
  assert.throws(() => pruefeWohnung(ohneSensibel), /landlordConfirmationCode nicht sensibel/);
  const eigentuemerImmer = JSON.parse(JSON.stringify(sektion(V, 'housing', 'wohnen-haupt')));
  eigentuemerImmer.find((x) => x.id === 'ownerName').sichtbarWenn = MIETE;
  assert.throws(() => pruefeWohnung(eigentuemerImmer), /ownerName Sichtbarkeit/);
});

test('[Wohnsitz·Person] der Doktorgrad steht bei der Person, Ebene modul', () => {
  const { V } = ladeKern();
  const f = sektion(V, 'identity', 'person').find((x) => x.id === 'academicDegree');
  assert.ok(f, 'academicDegree fehlt');
  assert.equal(f.typ, 'text');
  assert.equal(f.ebene, 'modul');
});

test('[Wohnsitz·Texte] Beschriftung in Deutsch und Englisch, auch die Optionen', () => {
  const de = lies('tools/textsatz-de-modul.json').texte;
  const en = lies('tools/textsatz-en-modul.json').texte;
  const kennungen = Object.keys(ERWARTET).map((f) => 'housing.' + f + '.label')
    .concat(['ja', 'nein'].map((w) => 'housing.landlordIsOwner/' + w + '.label'))
    .concat(['identity.academicDegree.label']);
  for (const k of kennungen) {
    assert.ok(typeof de[k] === 'string' && de[k].length > 0, 'DE fehlt: ' + k);
    assert.ok(typeof en[k] === 'string' && en[k].length > 0, 'EN fehlt: ' + k);
    assert.notEqual(de[k], en[k], 'EN ist nicht übersetzt: ' + k);
  }
});

test('[Wohnsitz·Karte] die Felder stehen in den Kartengruppen der Hauptwohnung und der Person', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const gruppe = (id) => {
    const m = kern.match(new RegExp("\\{ id: '" + id + "'[^\\n]*felder: \\[([^\\]]*)\\]"));
    assert.ok(m, id + ' fehlt');
    return m[1].split(',').map((s) => s.trim().replace(/'/g, ''));
  };
  const wohnung = gruppe('fg-wohnen-hauptwohnung');
  for (const id of Object.keys(ERWARTET)) assert.ok(wohnung.includes(id), id + ' fehlt in der Kartengruppe');
  assert.ok(gruppe('fg-identitaet-kern').includes('academicDegree'), 'academicDegree fehlt in der Kartengruppe');
});

test('[Wohnsitz·Quelle] die Lock-Datei pinnt die FIM-Felder der Anmeldung mit Fassung und Status', () => {
  const fim = lies('bereiche/bezuege-quellen.json').quellen.find((q) => q.datensatz === 'fim-baukasten');
  for (const k of FIM_GEPINNT) {
    const d = fim.dateien.find((x) => x.kennung === k);
    assert.ok(d, k + ' nicht gepinnt');
    assert.match(d.sha256, /^[0-9a-f]{64}$/, k + ' ohne Prüfsumme');
    assert.ok(d.fassung && d.freigabestatus, k + ' ohne Fassung oder Status');
  }
});
