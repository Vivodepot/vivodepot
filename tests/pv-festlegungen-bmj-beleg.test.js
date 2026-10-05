'use strict';
/* Die 29 Festlegungen der Patientenverfügung leiten sich aus den BMJ-Textbausteinen ab — je Festlegung belegt
   (tools/pv-festlegungen-bmj-beleg.js, gegen den Wortlaut der signierten Standardvorlage). Die Anwendungssituationen
   setzten den Baustein bis 01.10.2026 mit eigener Überleitung zusammen („Diese Patientenverfügung gilt, wenn“, Komma
   statt „...“); seither stehen sie im BMJ-Wortlaut, und jede Festlegung ist belegt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../tools/pv-festlegungen-bmj-beleg.js');

const BEKANNT_ABWEICHEND = [];

test('[PV·BMJ] jede Festlegung ist wörtlich aus den Textbausteinen belegt', () => {
  const r = W.belegen(W.lesen(null));
  assert.equal(r.length, 30, 'Vorbedingung: 30 Festlegungen (29 → 30, U2-ADR-459: „beraten lassen durch“)');
  assert.deepEqual(r.filter((x) => !x.belegt).map((x) => x.id), BEKANNT_ABWEICHEND);
  assert.ok(r.filter((x) => x.belegt && !x.frei).length >= 20, 'Positivkontrolle: Optionstexte wurden wirklich gefunden');
});

test('[PV·BMJ·Rot-Beweis] ein veränderter Optionstext fällt; Fußnotenziffern im amtlichen Text zählen nicht', () => {
  const daten = W.lesen(null);
  const schritte = daten.schritte.filter((s) => s.feld && s.feld.id === 'dialysis');
  assert.equal(W.belegen({ amtlich: daten.amtlich, schritte, texte: daten.texte })[0].belegt, true, 'Vorbedingung: dialysis ist belegt');
  const texte = { ...daten.texte, 'advanceCare.dialysis/ja.label': 'eine künstliche Blutwäsche (Dialyse) nach eigenem Ermessen.' };
  assert.equal(W.belegen({ amtlich: daten.amtlich, schritte, texte })[0].belegt, false, 'ein selbst formulierter Optionstext muss fallen');
  assert.equal(W.amtlichNorm('Indikation10 zur Beschwerdelinderung'), 'Indikation zur Beschwerdelinderung');
});
