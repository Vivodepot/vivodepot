'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Rechenbare Datums-Felder + abgeleitete Minderjährigkeit (U2-ADR-023)
   ────────────────────────────────────────────────────────────────────────
   Substrat: Datum rechenbar machen. `birthDate` strukturiert (ISO), `yearOfBirthIfTheExactDayIs`
   als nur-Jahr-Rückfall am Register. Minderjährigkeit wird ABGELEITET, nie gespeichert
   (volles Datum → exakt; nur Jahr → Näherung, als `unsicher` markiert). Kinder sind EINE
   Liste; minderjährig/volljährig ist ein Live-Filter auf das abgeleitete Alter.
   `heute` wird für die Tests fix injiziert (ISO-String) — kein Realzeit-Flackern.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frisch() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Inhaberin');
  return k;
}
const HEUTE = '2026-06-19';

/* ── §1 — geburtsdatum strukturiert + geburtsjahr-Rückfall ───────────────────── */

test('§1 geburtsdatum strukturiert gespeichert; geburtsjahr als nur-Jahr-Rückfall', async () => {
  const { V } = await frisch();
  const idVoll = V.personHinzufuegen({ name: 'Voll Datum', birthDate: '2010-04-05' });
  const idJahr = V.personHinzufuegen({ name: 'Nur Jahr', yearOfBirthIfTheExactDayIs: '2010' });
  const voll = (V.getData().menschen || []).find(m => m.id === idVoll);
  const jahr = (V.getData().menschen || []).find(m => m.id === idJahr);
  assert.equal(voll.birthDate, '2010-04-05', 'volles ISO-Datum strukturiert gespeichert');
  assert.equal(jahr.yearOfBirthIfTheExactDayIs, '2010', 'Rückfall-Jahr strukturiert gespeichert');
  // personGeburtsjahr leitet das Jahr aus beidem ab.
  assert.equal(V.personGeburtsjahr(voll), 2010, 'Jahr aus vollem Datum');
  assert.equal(V.personGeburtsjahr(jahr), 2010, 'Jahr aus Rückfall-Feld');
  assert.equal(V.personGeburtsjahr({ name: 'leer' }), null, 'kein Jahr → null');
});

/* ── §2 — Minderjährigkeit abgeleitet, nicht gespeichert ─────────────────────── */

test('§2 exaktes Alter + Minderjährigkeit aus vollem Datum (Grenze 18. Geburtstag)', async () => {
  const { V } = await frisch();
  // Geburtstag MORGEN → noch 17 → minderjährig, sicher.
  let r = V.minderjaehrigkeit({ birthDate: '2008-06-20' }, HEUTE);
  assert.equal(r.minderjaehrig, true); assert.equal(r.alter, 17); assert.equal(r.unsicher, false);
  // Geburtstag HEUTE → wird 18 → volljährig, sicher.
  r = V.minderjaehrigkeit({ birthDate: '2008-06-19' }, HEUTE);
  assert.equal(r.minderjaehrig, false); assert.equal(r.alter, 18); assert.equal(r.unsicher, false);
  // Geburtstag GESTERN → 18 → volljährig.
  r = V.minderjaehrigkeit({ birthDate: '2008-06-18' }, HEUTE);
  assert.equal(r.minderjaehrig, false); assert.equal(r.alter, 18);
  // personAlter exakt.
  assert.equal(V.personAlter({ birthDate: '2000-01-01' }, HEUTE), 26);
  assert.equal(V.personAlter({ birthDate: '2000-12-31' }, HEUTE), 25);
});

test('§2 nur Geburtsjahr → Näherung, als unsicher markiert; nichts → nicht feststellbar', async () => {
  const { V } = await frisch();
  let r = V.minderjaehrigkeit({ yearOfBirthIfTheExactDayIs: '2012' }, HEUTE);
  assert.equal(r.minderjaehrig, true); assert.equal(r.unsicher, true, 'Jahr-nur ist unsicher');
  r = V.minderjaehrigkeit({ yearOfBirthIfTheExactDayIs: '2000' }, HEUTE);
  assert.equal(r.minderjaehrig, false); assert.equal(r.unsicher, true);
  r = V.minderjaehrigkeit({ name: 'ohne Datum' }, HEUTE);
  assert.equal(r.minderjaehrig, null, 'kein Datum → nicht feststellbar'); assert.equal(r.unsicher, true);
  // volles Datum hat Vorrang vor dem Rückfall-Jahr.
  r = V.minderjaehrigkeit({ birthDate: '2015-01-01', yearOfBirthIfTheExactDayIs: '1980' }, HEUTE);
  assert.equal(r.minderjaehrig, true); assert.equal(r.unsicher, false);
});

/* ── §3 — EINE Kinder-Liste + Live-Filter auf das abgeleitete Alter ──────────── */

test('§3 vereinheitlichte Kinder-Liste: minderjährig-Filter liefert die richtigen Einträge', async () => {
  const { V } = await frisch();
  const minorId = V.personHinzufuegen({ name: 'Mini Mond', birthDate: '2015-03-01' });
  const adultId = V.personHinzufuegen({ name: 'Maxi Mond', birthDate: '1992-08-08' });
  const jahrId  = V.personHinzufuegen({ name: 'Jana Jahr', yearOfBirthIfTheExactDayIs: '2014' });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', { person: { ref: minorId } });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', { person: { ref: adultId } });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', { person: { ref: jahrId } });
  const alle = V.kinderMitStatus(HEUTE);
  assert.equal(alle.length, 3, 'alle Kinder in EINER Liste');
  const minderj = V.kinderGefiltert('minderjaehrig', HEUTE);
  const namen = minderj.map(x => x.person.name).sort().join(',');
  assert.equal(namen, 'Jana Jahr,Mini Mond', 'nur die Minderjährigen (inkl. Jahr-Näherung)');
  const vollj = V.kinderGefiltert('volljaehrig', HEUTE);
  assert.equal(vollj.map(x => x.person.name).join(','), 'Maxi Mond', 'nur die Volljährigen');
  // der minderjährige Eintrag aus Jahr-Näherung trägt das unsicher-Flag.
  assert.equal(minderj.find(x => x.person.name === 'Jana Jahr').status.unsicher, true);
});

/* ── §3b — Ausbildungs-Marker an der Bezugszeile (nur Eingabe, keine Ableitung) ─ */

test('§3b Ausbildungs-Marker + voraussichtliches Ende leben an der Kind-Zeile, nicht an der Person', async () => {
  const { V } = await frisch();
  const kindId = V.personHinzufuegen({ name: 'Lea Lern', birthDate: '2006-09-01' });
  V.listenEintragHinzufuegen('people', 'childrenAndDependants', {
    person: { ref: kindId }, training: 'ja', trainingExpectedToEnd: '2028-07-31',
  });
  const zeile = (V.getData().sektoren.people.childrenAndDependants || [])[0];
  assert.equal(zeile.training, 'ja', 'Marker an der Zeile');
  assert.equal(zeile.trainingExpectedToEnd, '2028-07-31', 'voraussichtliches Ende an der Zeile');
  const person = (V.getData().menschen || []).find(m => m.id === kindId);
  assert.ok(person.training == null && person.trainingExpectedToEnd == null, 'Marker NICHT an der Person (relational)');
});

/* ── §1-Migration — b16-Geburtsjahr strukturiert, nicht als Notiz-Freitext ────── */

test('§1 b16-Import: erwachsene-Geburtsjahr landet im strukturierten Feld, nicht in der Anmerkung', async () => {
  const { V } = await frisch();
  const b16 = JSON.stringify({ kinder_erwachsen_liste: [
    { vorname: 'Tom', nachname: 'Alt', geburtsjahr: '1990', wohnort: 'Bremen', telefon: '0421 1', anmerkung: 'Notiz' },
  ] });
  V.kernAPI.importiere('vivodepot-beta', b16, { alleKonflikte: true });
  const tom = (V.getData().menschen || []).find(m => m.name === 'Tom Alt');
  assert.ok(tom, 'erwachsenes Kind als Register-Person');
  assert.equal(tom.yearOfBirthIfTheExactDayIs, '1990', 'Geburtsjahr strukturiert (rechenbar)');
  assert.equal(tom.adresse, 'Bremen', 'Wohnort → Adresse (Entscheidung C)');
  assert.equal(tom.tel, '0421 1');
  assert.equal(tom.anmerkung, 'Notiz', 'Anmerkung ohne „geboren …"');
  assert.ok(!/geboren/.test(tom.anmerkung || ''), 'kein Geburtsjahr-Freitext mehr in der Anmerkung');
  // in EINER kinder-Liste gelandet (nicht in erwachsene_kinder).
  assert.equal((V.getData().sektoren.people.childrenAndDependants || []).length, 1, 'eine Kinder-Zeile');
});

/* ── §4 — Inventur: alle echten Datums-Felder sind strukturiert (typ:'datum') ──── */

test('§4 Datums-Felder strukturiert: geburtsdatum / schwerbehindertenausweis.gueltig / testament_datum / ausbildung_ende', async () => {
  const { V } = await frisch();
  const typVon = (sektorId, feldId) => {
    const sek = V.SEKTOR_BY_ID[sektorId];
    for (const s of sek.sektionen) for (const f of (s.felder || [])) {
      if (f.id === feldId) return f.typ;
      for (const u of (f.unterFelder || [])) if (u.id === feldId) return u.typ;
    }
    return null;
  };
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `schwerbehindertenausweis_gueltig` ist zum
  // Unterfeld `gueltig` der Liste `severeDisabilityCards` geworden. typVon sucht Unterfelder
  // schon vorher mit (s. U2-ADR-096-Kommentar unten) — die Suche muss nur den neuen Feldnamen
  // kennen, nicht sich selbst ändern.
  const typVonUnterfeld = (sektorId, listeId, unterfeldId) => {
    const sek = V.SEKTOR_BY_ID[sektorId];
    for (const s of sek.sektionen) for (const f of (s.felder || [])) {
      if (f.id !== listeId) continue;
      const u = (f.unterFelder || []).find((x) => x.id === unterfeldId);
      return u ? u.typ : null;
    }
    return null;
  };
  assert.equal(typVon('identity', 'birthDate'), 'datum');
  assert.equal(typVonUnterfeld('socialInsurance', 'severeDisabilityCards', 'validUntil'), 'datum');
  // U2-ADR-096: Das Testament-Datum ist Unterfeld der Instrument-Zeile geworden und heisst dort
  // schlicht `datum` — der typ-Praefix disambiguiert. typVon sucht Unterfelder mit, der Test
  // prueft also weiterhin dieselbe Sache an ihrem neuen Ort.
  assert.equal(typVon('advanceCare', 'dateOfLastChange'), 'datum');
  assert.equal(typVon('people', 'trainingExpectedToEnd'), 'datum');
  // Register-Geburtsdatum ist ebenfalls typ:'datum'; geburtsjahr ist der bewusste nur-Jahr-Rückfall.
  const gd = V.MENSCHEN_REGISTER_FELD.unterFelder.find(u => u.id === 'birthDate');
  const gj = V.MENSCHEN_REGISTER_FELD.unterFelder.find(u => u.id === 'yearOfBirthIfTheExactDayIs');
  assert.equal(gd.typ, 'datum');
  assert.ok(gj, 'geburtsjahr-Rückfall im Register-Schema');
  // pflegegrad_seit bleibt bewusst jahr-granular (Freitext, „seit (Jahr)") — gemeldete Gabelung, nicht erzwungen.
  assert.equal(typVon('socialInsurance', 'careLevelSinceYear'), 'text');
});
