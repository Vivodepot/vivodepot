'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-096 §5 — Notfall-Allowlist über den Instrument-Selektor.
   ────────────────────────────────────────────────────────────────────────
   Die Allowlist ist die Klartext-Grenze: Was hier steht, erscheint OHNE
   Passwort auf Notfall-Blatt und im Sanitäter-Cache. Zwei Regeln weichen
   darum bewusst vom übrigen Selektor-Verhalten ab:

   §5a  Immer GENAU EINE Zeile pro Typ — auch bei Registry-Form „alle".
        Die Klartext-Menge darf nicht mit der Zahl der Instrument-Zeilen
        wachsen. Im unentscheidbaren Fall (keine Zeile datiert) gilt die
        erste gespeicherte Zeile — der sonst übliche „alle"-Rückfall ist
        hier GESPERRT, er höbe die Grenze auf.

   §5b  Das Leerverhalten kehrt sich um: NACHWEISPFLICHT statt „leer statt
        Fehler". Es genügt nicht, dass der Pfad nicht wirft — jeder Wert,
        der heute sichtbar ist, muss danach nachweislich ankommen. Ein
        leeres Feld ist von „bei der Umstellung verloren" nicht zu
        unterscheiden, und zwar dort, wo niemand nachfragen kann.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

// Ein Depot, in dem JEDES Feld der Allowlist belegt ist.
function depotMitAllemBelegt(instrumente) {
  return {
    sektoren: {
      identity: { givenName: 'Maria', familyName: 'Mustermann', birthDate: '1950-03-07' },
      health: {
        bloodType: 'A+',
        allergiesMedicationFoodOther: [{ text: 'Penicillin' }],
        medicationOngoing: [{ text: 'Marcumar' }],
        chronicConditionsDiagnoses: [{ text: 'Vorhofflimmern' }],
        emergencyContacts: [{ ref: '', override: 'Anna Muster' }],
        // N2 Zug 3 („Drei Verdrahtungen", 08.08.2026) — fünf neue Allowlist-Felder.
        implantsProsthesesPacemakers: 'Herzschrittmacher',
        bodyWeightKg: '68',
        healthInsurance: { ref: '', override: 'AOK Bayern' },
        insuranceNumber: 'A123456789',
        generalPractitioner: { ref: '', override: 'Dr. Weber' },
      },
      advanceCare: { provisionInstruments: instrumente },
    },
  };
}

test('§5b Nachweispflicht: JEDES Allowlist-Feld kommt am Notfall-Pfad an', () => {
  const { V } = ladeKern();
  V.setData(depotMitAllemBelegt([
    { id: 'p1', instrument: 'living-will', organDonation: 'ja', storageLocation: 'beim Hausarzt', dateOfLastChange: '2025-06-01' },
    // N2 Zug 3: zweites Instrument, damit `bevollmaechtigter` (typ enduring-power-of-attorney) einen
    // eigenen Selektor-Treffer hat — dieselbe genauEine-Regel wie beim Patientenverfügung-Typ.
    { id: 'p2', instrument: 'enduring-power-of-attorney', authorizedPersons: [{ ref: '', override: 'Peter Muster' }], dateOfLastChange: '2025-06-01' },
  ]));
  const zeilen = V.notfallKernModell();
  const werte = zeilen.map(z => String(z.wert)).join(' | ');

  // Kein „wirft nicht" — jeder einzelne Wert wird nachgewiesen.
  for (const erwartet of ['Maria', 'Mustermann', 'Penicillin', 'Marcumar', 'Vorhofflimmern', 'Anna Muster']) {
    assert.ok(werte.includes(erwartet), 'Allowlist-Wert fehlt am Notfall-Pfad: ' + erwartet);
  }
  // blutgruppe ist ein auswahl-Feld: der Notfall-Pfad zeigt das Options-LABEL („A +"), nicht 'A+'.
  assert.ok(/A\s*\+/.test(werte), 'Blutgruppe fehlt am Notfall-Pfad');
  // Die zwei umgestellten Instrument-Felder — der eigentliche Gegenstand dieses Umbaus.
  assert.ok(werte.includes('beim Hausarzt'),
    'Ablageort der Patientenverfügung kommt NICHT am Notfall-Pfad an — stilles Nichts auf dem Notfall-Blatt (§5b)');
  assert.ok(/ja/i.test(werte), 'Organspende kommt NICHT am Notfall-Pfad an (§5b)');

  // N2 Zug 3 („Drei Verdrahtungen", 08.08.2026) — fünf neue Allowlist-Felder, jedes
  // einzeln nachgewiesen, nicht nur die Feldzahl erhöht.
  assert.ok(werte.includes('Herzschrittmacher'), 'Implantate fehlen am Notfall-Pfad');
  assert.ok(werte.includes('68'), 'Körpergewicht fehlt am Notfall-Pfad');
  assert.ok(werte.includes('AOK Bayern'), 'Krankenkasse fehlt am Notfall-Pfad');
  assert.ok(werte.includes('A123456789'), 'Versichertennummer fehlt am Notfall-Pfad');
  assert.ok(werte.includes('Dr. Weber'), 'Hausarzt fehlt am Notfall-Pfad');
  assert.ok(werte.includes('Peter Muster'), 'bevollmächtigte Person fehlt am Notfall-Pfad');

  // Die Allowlist ist vollständig abgedeckt: kein Eintrag ohne Nachweis oben.
  assert.equal(V.NOTFALL_KERN_FELDER.length, 16, 'Allowlist-Umfang geändert — jede Änderung braucht einen Nachweis oben (die fünf neuen Felder aus N2 Zug 3 sind es)');
});

test('§5a zwei Zeilen desselben Typs → GENAU EIN Wert im Klartext, nicht zwei', () => {
  const { V } = ladeKern();
  V.setData(depotMitAllemBelegt([
    { id: 'p1', instrument: 'living-will', storageLocation: 'beim Hausarzt', dateOfLastChange: '2024-01-01' },
    { id: 'p2', instrument: 'living-will', storageLocation: 'im Safe',       dateOfLastChange: '2026-02-02' },
  ]));
  const orte = V.notfallKernModell().map(z => String(z.wert));
  const treffer = orte.filter(w => w.includes('Hausarzt') || w.includes('Safe'));
  assert.equal(treffer.length, 1, 'Klartext-Menge waechst mit den Instrument-Zeilen — §5a verletzt');
  assert.ok(treffer[0].includes('Safe'), 'die juengere Zeile gewinnt (Datums-Ordnung)');
  assert.ok(!treffer[0].includes('Hausarzt'), 'die aeltere Zeile darf nicht zusaetzlich im Klartext stehen');
});

test('§5a Form „alle" wird im Notfall-Pfad NICHT angewandt (Vollmacht)', () => {
  const { V } = ladeKern();
  // enduring-power-of-attorney steht in der Registry auf „alle" — im Notfall-Pfad gilt das nicht.
  V.setData({ sektoren: { advanceCare: { provisionInstruments: [
    { id: 'v1', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank',       storageLocation: 'Sparkasse' },
    { id: 'v2', instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'gesundheit', storageLocation: 'Hausarzt' },
  ] } } });
  assert.equal(V.listenUnterfeldRoh('advanceCare', 'provisionInstruments', 'enduring-power-of-attorney', 'storageLocation').length, 2,
    'ohne genauEine gilt die Registry-Form „alle"');
  assert.equal(V.listenUnterfeldRoh('advanceCare', 'provisionInstruments', 'enduring-power-of-attorney', 'storageLocation', { genauEine: true }).length, 1,
    'mit genauEine bleibt GENAU EINE Zeile — unabhaengig von der Registry-Form (§5a)');
});

test('§5a undatierte Zeilen: deterministisch dieselbe Zeile bei wiederholtem Lauf', () => {
  const { V } = ladeKern();
  const daten = () => depotMitAllemBelegt([
    { id: 'p1', instrument: 'living-will', storageLocation: 'Ordner Vorsorge' },   // kein datum
    { id: 'p2', instrument: 'living-will', storageLocation: 'Schreibtisch' },      // kein datum
  ]);
  const lauf = () => { V.setData(daten()); return V.notfallKernModell().map(z => String(z.wert)).join('|'); };
  const a = lauf(), b = lauf(), c = lauf();
  assert.equal(a, b); assert.equal(b, c);
  // Der allgemeine „alle"-Rueckfall (§3.2) ist hier GESPERRT — sonst staenden beide im Klartext.
  const treffer = a.split('|').filter(w => w.includes('Ordner') || w.includes('Schreibtisch'));
  assert.equal(treffer.length, 1, 'der „alle"-Rueckfall darf im Notfall-Pfad NICHT greifen (§5a)');
  assert.ok(treffer[0].includes('Ordner Vorsorge'), 'erste gespeicherte Zeile entscheidet');
});

test('§5b keine Zeile vorhanden: Notfall-Blatt bricht nicht — Fall ausdruecklich benannt', () => {
  const { V } = ladeKern();
  V.setData(depotMitAllemBelegt([]));   // gar kein Instrument
  let zeilen;
  assert.doesNotThrow(() => { zeilen = V.notfallKernModell(); }, 'Notfall-Pfad darf ohne Instrument nicht werfen');
  const werte = zeilen.map(z => String(z.wert)).join(' | ');
  // Die uebrigen Allowlist-Felder muessen weiterhin ankommen — der leere Instrument-Teil
  // darf den Rest nicht mitreissen.
  assert.ok(werte.includes('Maria') && /A\s*\+/.test(werte) && werte.includes('Anna Muster'),
    'ohne Instrument fallen die uebrigen Allowlist-Werte aus — das waere ein Totalausfall des Blatts');
  assert.ok(!/Hausarzt|Safe|Ordner/.test(werte), 'kein Platzhalter, kein Geistereintrag');
});
