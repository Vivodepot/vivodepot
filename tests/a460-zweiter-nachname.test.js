'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A460 · Der zweite Nachname bekommt einen Ort
   ────────────────────────────────────────────────────────────────────────────
   Zwei Nachnamen gingen bisher in EIN Feld `identity.familyName` — unversehrt,
   aber ohne dass der Kern wusste, dass es zwei sind. `geburtsname` war der
   falsche zweite Ort: sensibel voreingestellt (A161), darum fehlt er im
   Datensatz und ein zweiter Nachname darin verschwände aus jeder
   maschinellen Ausgabe — genau das Problem, das dieser Bau löst, nicht
   wiederholt.

   Belegt an P19 (Ecuador, "María García López"): zwei Nachnamen sind der
   spanischsprachige Normalfall, nicht der Ausnahmefall.

   Additiv: kein Bestandsdepot trägt `nachname2`, keines verhält sich anders.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw-a460';

async function depotMitZweitemNachnamen() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('María');
  V.sektorFeldSetzen('identity', 'givenName', 'María');
  V.sektorFeldSetzen('identity', 'familyName', 'García');
  V.sektorFeldSetzen('identity', 'secondLastName', 'López');
  return V;
}

test('[A460] nachname2 ist ein eigenes Feld, nicht sensibel — anders als geburtsname', () => {
  const { V } = ladeKern();
  const person = V.SEKTOR_BY_ID.identity.sektionen[0].felder;
  const n2 = person.find((f) => f.id === 'secondLastName');
  const geburtsname = person.find((f) => f.id === 'birthName');
  assert.ok(n2, 'nachname2 existiert nicht im Schema');
  assert.equal(n2.typ, 'text');
  assert.notEqual(n2.sensibel, true, 'nachname2 darf nicht sensibel sein — sonst derselbe Fehler wie geburtsname');
  assert.equal(geburtsname.sensibel, true, 'Gegenprobe: geburtsname bleibt sensibel');
});

test('[A460·Rot-Beweis] ohne nachname2 bleibt jede Ausgabe unverändert (additiv)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  const bundle = V.fhirIpsBundle(new Date('2026-05-31T10:00:00Z'), { sensibel: true });
  const name = bundle.entry.find((e) => e.resource.resourceType === 'Patient').resource.name[0];
  assert.equal(name.family, 'Mustermann');
  assert.deepEqual(name.given, ['Maria']);
});

test('[A460] FHIR-Patient führt beide Nachnamen zusammen im family', async () => {
  const V = await depotMitZweitemNachnamen();
  const bundle = V.fhirIpsBundle(new Date('2026-05-31T10:00:00Z'), { sensibel: true });
  const name = bundle.entry.find((e) => e.resource.resourceType === 'Patient').resource.name[0];
  assert.equal(name.family, 'García López');
  assert.deepEqual(name.given, ['María']);
});

test('[A460] Vollmacht-Eingangsformel nennt beide Nachnamen', async () => {
  const V = await depotMitZweitemNachnamen();
  const formel = V._pvEingangsformel();
  assert.ok(formel.includes('María García López'), formel);
});

test('[A460] Deckblatt-Name zeigt beide Nachnamen', async () => {
  const V = await depotMitZweitemNachnamen();
  const db = V.SEKTOR_BY_ID.identity.deckblatt;
  const name = (db.nameFelder || [])
    .map((f) => String(V.feldRohwert('identity', f) || '').trim()).filter(Boolean).join(' ');
  assert.equal(name, 'María García López');
});

test('[A460] Anker-Name (Provenienz/Stempel) trägt beide Nachnamen', async () => {
  const V = await depotMitZweitemNachnamen();
  assert.equal(V.aktuellerAnkerName(), 'María García López');
});

test('[A460] Notfallkarte trägt beide Nachnamen', async () => {
  const V = await depotMitZweitemNachnamen();
  assert.equal(V.notfallKartenMeta().name, 'María García López');
});
