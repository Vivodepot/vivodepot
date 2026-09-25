'use strict';
/* ════════════════════════════════════════════════════════════════════════
   feldValidieren prüft nur Unterfelder, die für den Eintrag sichtbar sind (15.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund beim Bau der Vorführung „Patientin“: Die Listen-Schleife in feldValidieren prüfte
   JEDES Pflicht-Unterfeld, auch wenn die Oberfläche es für diesen Eintrag gar nicht zeigt.
   „Art der Vollmacht“ (Pflicht, sichtbar nur bei instrument = enduring-power-of-attorney) machte damit
   jede Patientenverfügung und jedes Testament „unstimmig“ — die Herausgeben-Übersicht sagte
   „Diese Angaben sehen unvollständig oder unstimmig aus: Vorsorge-Instrumente“, und die Bürgerin
   hatte kein Feld, das sie hätte ausfüllen können. Seit mindestens 921ba0ab (dort hieß das
   Feld noch `art`), also älter als die Kennungs-Kampagne.

   Regel jetzt: dieselbe Sichtbarkeit wie beim Rendern (feldSichtbar mit dem Eintrag als
   Datenkontext), keine zweite Fassung der Gate-Auswertung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Pflicht·Sichtbarkeit] eine Patientenverfügung ohne „Art der Vollmacht“ ist stimmig — das Feld erscheint bei ihr nicht', () => {
  const { V } = ladeKern();
  const f = V.feldDefFuer('advanceCare', 'provisionInstruments');
  for (const instrument of ['living-will', 'will', 'custodianship-declaration']) {
    assert.deepEqual(V.feldValidieren(f, [{ instrument, form: 'privat' }]), { ok: true }, instrument);
  }
});

test('[Pflicht·Sichtbarkeit·Rot-Beweis] bei einer Vorsorgevollmacht ist dasselbe Feld sichtbar und bleibt Pflicht', () => {
  const { V } = ladeKern();
  const f = V.feldDefFuer('advanceCare', 'provisionInstruments');
  const r = V.feldValidieren(f, [{ instrument: 'enduring-power-of-attorney', form: 'privat' }]);
  assert.deepEqual(r, { ok: false, grund: 'liste-eintrag', eintrag: 0, feld: 'typeOfPowerOfAttorney', sub: 'pflicht' });
  assert.deepEqual(V.feldValidieren(f, [{ instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', form: 'privat' }]), { ok: true });
});

test('[Pflicht·Sichtbarkeit] beide Gate-Formen gelten: sichtbarWenn blendet aus, verborgenWenn ebenso — und ohne Gate bleibt Pflicht Pflicht', () => {
  const { V } = ladeKern();
  const liste = {
    id: 'probe', typ: 'liste', unterFelder: [
      { id: 'art', typ: 'auswahl', optionen: [{ wert: 'a' }, { wert: 'b' }] },
      { id: 'nurBeiA', typ: 'text', pflicht: true, sichtbarWenn: { feld: 'art', wert: 'a' } },
      { id: 'nichtBeiB', typ: 'text', pflicht: true, verborgenWenn: { feld: 'art', wert: 'b' } },
      { id: 'immer', typ: 'text', pflicht: true },
    ],
  };
  assert.deepEqual(V.feldValidieren(liste, [{ art: 'b', immer: 'x' }]), { ok: true }, 'beide bedingten Felder bei art=b ausgeblendet');
  assert.equal(V.feldValidieren(liste, [{ art: 'a', immer: 'x', nichtBeiB: 'x' }]).feld, 'nurBeiA', 'bei art=a sichtbar, also Pflicht');
  assert.equal(V.feldValidieren(liste, [{ art: 'a', nurBeiA: 'x', immer: 'x' }]).feld, 'nichtBeiB', 'verborgenWenn trifft bei art=a nicht, also Pflicht');
  assert.equal(V.feldValidieren(liste, [{ art: 'b' }]).feld, 'immer', 'ein Pflichtfeld ohne Gate bleibt Pflicht');
});
