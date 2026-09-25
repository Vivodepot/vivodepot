'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A461 · Ein ungenaues Geburtsdatum wird eintragbar
   ────────────────────────────────────────────────────────────────────────────
   `identity.birthDate` wird als `<input type="date">` gezeichnet, das nur
   ein vollständiges, gültiges Datum annimmt — ein geschätztes Geburtsjahr
   ("ca. 1990") liess sich nicht eintragen. `menschen[].geburtsjahr` (U2-ADR-023)
   löst genau dieses Problem für andere Personen bereits; `identity.yearOfBirthIfTheExactDayIs`
   überträgt denselben Rückfall auf die eigene Partei.

   Additiv: kein Bestandsdepot trägt `geburtsjahr`, keines verhält sich anders.
   Bewusst NICHT angefasst: der FHIR/IPS-Export (`fhirIpsBundle`, `birthDate`
   1..1) — der verlangt weiter das volle Datum, dieselbe Grenze wie bei
   `menschen[]`, wo der Rückfall ebenfalls nicht in den medizinischen Export
   reicht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-a461';

async function depotMitGeburtsjahr() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  V.sektorFeldSetzen('identity', 'givenName', 'Amina');
  V.sektorFeldSetzen('identity', 'familyName', 'Cheikh');
  V.sektorFeldSetzen('identity', 'yearOfBirthIfTheExactDayIs', '1990');
  return V;
}

test('[A461] geburtsjahr ist ein eigenes Feld, nicht sensibel', () => {
  const { V } = ladeKern();
  const f = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find((x) => x.id === 'yearOfBirthIfTheExactDayIs');
  assert.ok(f, 'geburtsjahr existiert nicht im Schema');
  assert.equal(f.typ, 'text');
  assert.notEqual(f.sensibel, true);
});

test('[A461·Rot-Beweis] alle vier ungenauen Werte lassen sich ins Modell schreiben (das Modell erlaubte es schon)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Amina');
  for (const w of ['1990', 'ca. 1990', '1990-00-00', 'um 1990 herum']) {
    V.sektorFeldSetzen('identity', 'birthDate', w);
    assert.equal(V.getData().sektoren.identity.birthDate, w);
  }
});

test('[A461] die Maske für geburtsjahr ist ein Text-Feld, kein type="date" — ein ungenaues Jahr bleibt sichtbar', () => {
  const { V } = ladeKern();
  const feld = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find((x) => x.id === 'yearOfBirthIfTheExactDayIs');
  const html = V.feldInputHTML(feld, '1990');
  assert.ok(!/type="date"/.test(html), html);
  assert.ok(/value="1990"/.test(html), html);
});

test('[A461] Kern-Gate: Name + Geburtsjahr (ohne volles Datum) reicht für ein vollständiges Dokument', async () => {
  const V = await depotMitGeburtsjahr();
  assert.equal(V._identitaetKernVollstaendig(), true);
});

test('[A461] Vollmacht-Eingangsformel nennt das Geburtsjahr, wenn kein volles Datum vorliegt', async () => {
  const V = await depotMitGeburtsjahr();
  const formel = V._pvEingangsformel();
  assert.ok(formel.includes('geboren 1990'), formel);
  assert.ok(!formel.includes('geboren am'), formel);
});

test('[A461] volles Geburtsdatum sticht das Geburtsjahr (kein Widerspruch, wenn beide gesetzt sind)', async () => {
  const V = await depotMitGeburtsjahr();
  V.sektorFeldSetzen('identity', 'birthDate', '1990-05-03');
  const formel = V._pvEingangsformel();
  assert.ok(formel.includes('geboren am'), formel);
});

test('[A461] FHIR-Export bleibt beim vollen Datum — Geburtsjahr allein erzeugt kein birthDate (bewusste Grenze)', async () => {
  const V = await depotMitGeburtsjahr();
  const bundle = V.fhirIpsBundle(new Date('2026-05-31T10:00:00Z'), { sensibel: true });
  const patient = bundle.entry.find((e) => e.resource.resourceType === 'Patient').resource;
  assert.equal(patient.birthDate, undefined);
});
