'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Angehörigen-Blätter: fünf Situationsblätter (ADR-061v3 · Freigabe 05.07.)
   ────────────────────────────────────────────────────────────────────────
   (Der Modus, in dem sie einst gerendert wurden, ist seit ANG1, 19.09.2026, entfernt; die Ansicht
   steht in tests/angehoerigen-blatt-ansicht.test.js — hier bleibt der INHALT der Blätter.)
   Genau FÜNF Blätter (Krankenhaus, Pflegeheim-Aufnahme,
   Beerdigung und Nachlass, Behörden und Nachlass, Meine Menschen). „Notarzt"
   ist entfallen (liegt im Notfall-Modus), kein `arzt`. Jedes gezogene Feld
   muss real existieren — im genannten Sektor ODER (Blatt 4) als inline-
   Anlass-Feld in SITUATION_BY_ID['erbfall'] (quelle 'sit:erbfall'). Das ist
   der „nicht still anlegen / keine b16-Waisen"-Check als stehender Test.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

// Auflösung der zulässigen Feld-IDs je Quelle (Sektor, Situations-Inline, Register).
// Gültige Instrument-Typen — aus der Registry des Kerns gelesen, nicht im Test dupliziert:
// kommt ein siebtes Instrument dazu, weiß dieser Wächter es sofort.
function gueltigeInstrumentTypen(V) {
  const liste = V.SEKTOR_BY_ID['advanceCare'].sektionen
    .flatMap(x => x.felder || []).find(f => f.id === 'provisionInstruments');
  const typFeld = (liste.unterFelder || []).find(f => f.id === 'instrument');
  return new Set((typFeld.optionen || []).map(o => o.wert));
}

function felderVon(V, quelle) {
  if (quelle === 'people') return null;                 // Register-Pull, separat erlaubt
  if (typeof quelle === 'string' && quelle.startsWith('sit:')) {
    const sit = V.SITUATION_BY_ID[quelle.slice(4)];
    return sit ? new Set(sit.bloecke.flatMap(b => b.eintraege).map(e => e.feld)
      .filter(f => f && typeof f === 'object').map(f => f.id)) : null;
  }
  return V.SEKTOR_BY_ID[quelle] ? 'sektor' : null;      // Sektor-Aufloesung macht feldDefFuer
}

test('Registry: genau fünf Blätter (Spec), kein notarzt/arzt/tod', () => {
  const { V } = ladeKern();
  assert.equal(V.angehoerigenSituationenAlle().length, 5, 'genau fünf');
  const ids = V.angehoerigenSituationenAlle().map(s => s.id);
  assert.deepEqual([...ids].sort(),
    ['beerdigung', 'behoerden_nachlass', 'krankenhausakut', 'meine_menschen', 'pflegeheimakut']);
  for (const weg of ['arzt', 'notarzt', 'tod']) {
    assert.ok(!ids.includes(weg), 'kein ' + weg + ' im Angehörigen-Modus');
  }
  // Akut-ids bleiben getrennt von den Eigen-Blättern (U2-ADR-012).
  assert.ok(V.SITUATION_BY_ID.krankenhaus, 'Eigen-Blatt krankenhaus existiert weiter');
  assert.ok(!V.SITUATION_BY_ID.krankenhausakut, 'Akut-id ist getrennt vom Eigen-Blatt');
  // Blatt 4 zieht seinen Nachlass-Satz aus dem Eigen-Blatt 'erbfall'.
  assert.ok(V.SITUATION_BY_ID.erbfall, 'Quell-Blatt erbfall existiert (Blatt-4-Nachlass)');
});

test('Brief: Krankenhaus/Pflegeheim/Beerdigung tragen einen hinterlegten Brief', () => {
  const { V } = ladeKern();
  for (const id of ['krankenhausakut', 'pflegeheimakut', 'beerdigung']) {
    const pulls = V._angSituationById(id).bloecke.flatMap(b => b.eintraege);
    assert.ok(pulls.some(e => e.quelle === 'personal' && /^letterFor/.test(e.feld)), id + ' hat einen Brief');
  }
});

test('„keine Waisen": jedes gezogene Feld existiert wirklich (Sektor ODER sit:erbfall-Inline)', () => {
  const { V } = ladeKern();
  for (const s of V.angehoerigenSituationenAlle()) {
    for (const e of s.bloecke.flatMap(b => b.eintraege)) {
      if (e.quelle === 'people' && e.feld === 'menschen') continue;   // Register-Pull
      /* U2-ADR-089 Block 2: Instrument-Zeilen sind ABGELEITET — es gibt kein Sektor-Feld
         dieses Namens. Sie werden deshalb nicht ausgenommen, sondern anders geprüft: der
         Typ muss in den `typ`-Optionen der geteilten Liste vorkommen. Ein Tippfehler
         (`instrument:testment`) fällt damit weiterhin auf, nur eben an der richtigen Stelle. */
      if (typeof e.feld === 'string' && e.feld.startsWith(V.INSTRUMENT_ZEILE_PRAEFIX)) {
        assert.equal(e.quelle, 'advanceCare', s.id + ': Instrument-Zeile nur aus advanceCare');
        const typ = e.feld.slice(V.INSTRUMENT_ZEILE_PRAEFIX.length);
        assert.ok(gueltigeInstrumentTypen(V).has(typ), s.id + ': unbekannter Instrument-Typ ' + typ);
        continue;
      }
      const set = felderVon(V, e.quelle);
      assert.ok(set, s.id + ': Quelle existiert ' + e.quelle);
      // Zwei Namensraeume, zwei Aufloesungen: `sit:`-Inline-Felder liegen im Blatt selbst
      // (eigene Menge), Sektor-Felder loest der KERN auf — feldDefFuer kennt dort auch den
      // Listen-Unterfeld-Selektor (U2-ADR-096). Die frueher hier gebaute eigene id-Liste kannte
      // nur die flache Form und meldete „existiert nicht" fuer Felder, die es sehr wohl gab.
      const da = (set === 'sektor') ? !!V.feldDefFuer(e.quelle, e.feld) : set.has(e.feld);
      assert.ok(da, s.id + ': gezogenes Feld existiert ' + e.quelle + '.' + e.feld);
    }
  }
});

test('Blatt 2 Pflegeheim-Aufnahme: alle sieben Pflege-Delta-Felder drin', () => {
  const { V } = ladeKern();
  const pfl = V._angSituationById('pflegeheimakut').bloecke.flatMap(b => b.eintraege).map(e => e.feld);
  // U2-ADR-096: Der Ablageort der Patientenverfuegung ist Unterfeld der Instrument-Zeile
  // geworden; das Blatt zieht ihn ueber den Selektor. Der Pflege-Delta-Umfang bleibt sieben.
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `pflegekasse_nr` -> `pflegekasse_nummer` (Liste).
  for (const f of ['careLevelSinceYear', 'careLevelTimeLimitedUntil', 'longTermCareFund', 'longTermCareFundNumbers',
                   'longTermCareFundPhone', 'homeCareServiceNameContact',
                   'liste:provisionInstruments:living-will:storageLocation']) {
    assert.ok(pfl.includes(f), 'Pflege-Delta ' + f + ' in Pflegeheim-Aufnahme');
  }
  // hauptpflegeperson (Gesundheit) war schon drin; krankheiten statt erkrankungen.
  assert.ok(pfl.includes('emergencyContacts'));
  assert.ok(pfl.includes('chronicConditionsDiagnoses') && !pfl.includes('erkrankungen'));
});

test('Blatt 4 Behörden und Nachlass: voller 23er erb_*-Satz via sit:erbfall', () => {
  const { V } = ladeKern();
  const eintraege = V._angSituationById('behoerden_nachlass').bloecke.flatMap(b => b.eintraege);
  const erbPulls = eintraege.filter(e => e.quelle === 'sit:erbfall');
  assert.equal(erbPulls.length, 23, 'alle 23 erb_* read-only');
  assert.ok(erbPulls.every(e => /^erb_/.test(e.feld)), 'sit:erbfall zieht nur erb_*');
  // b16-Waisen dürfen NICHT auftauchen (Schema 26).
  const alleFelder = eintraege.map(e => e.feld);
  for (const waise of ['eu_nachlass', 'testamentsvollstrecker', 'testament_typ', 'rentenversicherungen']) {
    assert.ok(!alleFelder.includes(waise), 'keine b16-Waise ' + waise);
  }
  // Der schon hinterlegte Vorsorge-Stand ist mit dabei.
  // U2-ADR-089 Block 2: Das Blatt zieht nicht mehr das Flachfeld, sondern die abgeleitete
  // Instrument-Zeile — sie beantwortet dieselbe Frage aus Record UND Gate statt nur aus dem Gate.
  assert.ok(eintraege.some(e => e.quelle === 'advanceCare' && e.feld === 'instrument:will'));
  assert.ok(!eintraege.some(e => e.feld === 'testament_vorhanden'),
    'das Flachfeld-Gate wird hier nicht mehr direkt gezogen');
  // U2-ADR-096: die ZVR-Nummer ist Unterfeld der Vollmacht-Zeile geworden — ueber den Selektor
  // gezogen, nicht mehr als Flachfeld. Der Inhalt des Blatts aendert sich dadurch nicht.
  assert.ok(eintraege.some(e => e.quelle === 'advanceCare'
    && e.feld === 'liste:provisionInstruments:enduring-power-of-attorney:centralRegisterOfPowersOf'));
});

test('Blatt 5 Meine Menschen: eigenes Blatt, zieht das Register', () => {
  const { V } = ladeKern();
  const eintraege = V._angSituationById('meine_menschen').bloecke.flatMap(b => b.eintraege);
  assert.ok(eintraege.some(e => e.quelle === 'people' && e.feld === 'menschen'), 'Register-Pull');
});

test('„keine Waisen"·Rot-Beweis: ein gepflanzter Tippfehler-Typ und ein gepflanztes Feld ohne Definition fallen auf', () => {
  const { V } = ladeKern();
  assert.equal(gueltigeInstrumentTypen(V).has('testment'), false, 'ein Tippfehler im Instrument-Typ wird nicht als gültig gezählt');
  assert.ok(!V.feldDefFuer('advanceCare', 'gibtEsNichtGepflanzt'), 'ein erfundenes Feld hat keine Definition — die Waisen-Prüfung oben würde es melden');
});
