'use strict';
/* Das Paket „Im Notfall“ zeigt der Angehörigen, was es verspricht (30.10.2026, Befund UX-NOTFALLPAKET-OHNE-MEDIKAMENTE, HOCH)
   Usability-Durchlauf v963: Wer einer Angehörigen über „Personen, die etwas sehen dürfen“ den Baustein „Im Notfall“ gibt, dem
   verspricht der Baustein Blutgruppe, Allergien, Krankheiten, Medikamente und die eigenen Personen. In der Lese-App stehen
   Allergien und Medikamente nur als „Hinterlegt, nur mit Freigabe sichtbar“; Hausarzt und Notfallkontakte fehlen.

   Der Grund liegt an zwei Stellen. Der Kern legt Allergien und Medikamente in die Datei (der Notfall-Baustein ist vom
   Sensibel-Filter ausgenommen, U2-ADR-156-Nachtrag), gibt aber die Entscheidung der Inhaberin nicht mit (sensibelFelder steht in
   EMPFAENGER_NIE). Die Lese-App fällt darum auf die Voreinstellung des Schemas zurück und hält die Werte zurück. Hausarzt
   (generalPractitioner) und Notfallkontakte (emergencyContacts) stehen gar nicht in der Liste des Bausteins; mit „menschen“
   reisen die Personen, aber nicht, wer Hausarzt oder Notfallkontakt ist.

   Bis zum Fix (31.10.2026) stand diese Probe als erwartete Röte mit drei `todo`. Jetzt trägt die Datei die Freigabe
   (`empfaengerFreigabe`) und die abgewählten Angaben (`empfaengerZurueckgehalten`), und der Baustein nennt Hausarzt und
   Notfallkontakte; der Wächter für die Klasse steht in tests/empfaenger-freigabe-zuschnitt.test.js. Geprüft wird am WERT, über
   den ganzen Weg: Kern → verschlüsselte Datei der Angehörigen → Lese-App. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW = 'notfallpaket-inhaberin-pw';
const PW_FACH = 'notfallpaket-sabine-pw';
const M = {
  allergie: 'MARKER-ALLERGIE-PENICILLIN',
  medikament: 'MARKER-MEDIKAMENT-RAMIPRIL',
  arzt: 'Dr. Marker Hausarzt',
  arztTel: '030 111 2222',
  kontakt: 'Sabine Markerfrau',
  kontaktTel: '0170 333 4444',
};

const kopie = (o) => JSON.parse(JSON.stringify(o));

async function paketFuerSabine(kreisZusatz) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erika Beispiel');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: M.allergie, code: '' }]);   // Chip-Feld (A43/A44)
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: M.medikament, code: '' }]);
  const arzt = V.personHinzufuegen({ name: M.arzt, tel: M.arztTel });
  const kontakt = V.personHinzufuegen({ name: M.kontakt, tel: M.kontaktTel });
  V.sektorFeldSetzen('health', 'generalPractitioner', { ref: arzt, override: '' });
  V.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: kontakt, override: '' }]);
  await V.empfaengerkreisSetzen(Object.assign({ name: 'Sabine', bausteine: ['notfall'] }, kreisZusatz || {}));
  const kreis = V.empfaengerkreiseListe()[0];
  const datei = await V.empfaengerDateiErzeugen(kreis, PW_FACH);
  return kopie(datei.umschlag);
}

async function inDerLeseApp(umschlag) {
  const L = ladeLesen().V;
  const offen = await L.leseDepotUmschlag(kopie(umschlag), PW_FACH);
  L.setData(await L._depotUebernehmenGeprueft(offen));
  const zeichne = (bereich) => { try { return String(L.sektorHTML(bereich)); } catch (_) { return ''; } };
  return { L, html: zeichne('health') + '\n' + zeichne('people'), gesundheit: zeichne('health') };
}

test('[Notfallpaket·Positivkontrolle] die Werte liegen in der Datei der Angehörigen', async () => {
  const umschlag = await paketFuerSabine();
  const L = ladeLesen().V;
  const offen = await L.leseDepotUmschlag(kopie(umschlag), PW_FACH);
  const text = JSON.stringify(offen);
  assert.ok(text.includes(M.allergie), 'Allergien gehen mit (Notfall-Baustein ohne Sensibel-Filter)');
  assert.ok(text.includes(M.medikament), 'Medikamente gehen mit');
});

test('[Notfallpaket] die Lese-App zeigt Allergien und Medikamente, nicht „nur mit Freigabe sichtbar“', async () => {
  const { L, html } = await inDerLeseApp(await paketFuerSabine());
  assert.ok(html.includes(M.allergie), 'Allergien stehen da');
  assert.ok(html.includes(M.medikament), 'Medikamente stehen da');
  assert.ok(!html.includes(L.STRINGS.zurueckgehaltenVorhanden), 'kein „Hinterlegt, nur mit Freigabe sichtbar“');
});

// Nicht genug ist, dass die Personen unter „Menschen“ stehen (dort reisen alle mit): die Angehörige muss im Bereich Gesundheit
// sehen, WER Hausarzt und wer Notfallkontakt ist, und die Nummer gleich daneben.
test('[Notfallpaket] Hausarzt und Notfallkontakt stehen im Bereich Gesundheit, mit Telefonnummer', async () => {
  const { gesundheit: html } = await inDerLeseApp(await paketFuerSabine());
  for (const [was, wert] of [['Hausarzt', M.arzt], ['Telefon des Hausarztes', M.arztTel], ['Notfallkontakt', M.kontakt], ['Telefon des Notfallkontakts', M.kontaktTel]]) {
    assert.ok(html.includes(wert), was + ' steht da');
  }
});

test('[Notfallpaket] nimmt die Inhaberin eine Angabe zurück, sagt die Lese-App, wer sie nicht freigegeben hat', async () => {
  const { L, html } = await inDerLeseApp(await paketFuerSabine({ ausnahmen: ['health.allergiesMedicationFoodOther'] }));
  assert.ok(!html.includes(M.allergie), 'die zurückgenommene Angabe steht nicht da');
  assert.ok(html.includes(M.medikament), 'die übrigen bleiben');
  assert.ok(/Erika[^<]*hat diese Angabe für Sie nicht freigegeben/.test(html), 'der Satz nennt die Inhaberin');
  assert.ok(!html.includes(L.STRINGS.zurueckgehaltenVorhanden), 'nicht der alte Satz');
});
