'use strict';
/* SUB-DEPOT-PERSONEN (25.09.2026, HOCH, gefunden bei der Aufnahme der Betreuungs-Vorführung gegen die ausgelieferte v795):
   Ein Sub-Depot aus Bereichs-Bausteinen (bereich:advanceCare, bereich:people, …) trägt die Personen-Verweise ({ ref }) seiner
   Felder, aber NICHT die Personen, auf die sie zeigen. empfaengerZuschnittModell gibt das Register data.menschen nur mit, wenn
   `ziehtMenschen` gesetzt ist — und das setzt der Bereichs-Zweig nur für einen Sektor-Schlüssel mit der Rolle `personenListe`,
   den es seit der Personen-Vereinheitlichung (U2-ADR-022: das Register lebt in data.menschen) im Sektor nicht mehr gibt.
   Folge, gemessen: die Tochter beantwortet eine Anfrage des Kliniksozialdienstes aus ihrem Sub-Depot; der Abgleich zeigt
   „Bevollmächtigte Person(en)" als vorhanden, die Antwort sagt der Klinik „nicht hinterlegt" — eine FALSCHE Auskunft, keine
   fehlende. Ebenso die vorgeschlagene Person der Betreuungsverfügung und der Ehegatte. Der Baustein „notfall" ist nicht
   betroffen (er führt die Personenlisten als Tripel und setzt ziehtMenschen).
   Fix (Kern v797): verweisZieleNachziehen — jedes Paket trägt genau die Ziele seiner Verweise. Die Klasse (Institutionen,
   Bankvollmacht-Zeilen, Mappe; jeder Baustein, der Angehörigen-Cache; auch nichts Überzähliges) hält
   tests/pakete-verweise-klasse.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { verweiseOhneZiel } = require('../tools/pakete-verweise-messen.js');

const PW = 'sub-depot-personen-pw-2026';
const EPA = 'advanceCare.provisionInstruments[enduring-power-of-attorney].authorizedPersons';

async function anker() {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-personen-pw-2026');
  V.akteurSelbstErklaeren('Gertrud Beispiel');
  const anna = V.personHinzufuegen({ name: 'Anna Beispiel', beziehung: 'kind' });
  const werner = V.personHinzufuegen({ name: 'Werner Beispiel', beziehung: 'ehepartner' });
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { ref: werner });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: anna }] });
  return V;
}
const verwaisteVerweise = (ausschnitt) => verweiseOhneZiel(ausschnitt).offen;

test('[SUB-DEPOT-PERSONEN] ein Sub-Depot aus Bereichs-Bausteinen trägt jede Person, auf die eines seiner Felder verweist', async () => {
  const V = await anker();
  for (const bausteine of [['bereich:advanceCare'], ['bereich:people'], ['bereich:advanceCare', 'bereich:health', 'bereich:identity', 'bereich:people']]) {
    assert.deepEqual(verwaisteVerweise(V.empfaengerZuschnittModell({ id: 'k1', name: 'Anna', bausteine })), [], bausteine.join('+'));
  }
});

test('[SUB-DEPOT-PERSONEN·Anfrage] die Antwort aus dem Sub-Depot nennt die bevollmächtigte Person wie der Anker — nicht „nicht hinterlegt"', async () => {
  const V = await anker();
  const imAnker = V.zusammenstellungDatensatz([EPA], { id: 'x', titel: '' }).felder.map((f) => f.wert);
  assert.deepEqual(imAnker, ['Anna Beispiel'], 'Vorbedingung: im Anker aufgelöst');
  const r = await V.empfaengerDateiErzeugen({ id: 'k1', name: 'Anna', bausteine: ['bereich:advanceCare', 'bereich:people'] }, PW);
  const { V: W } = ladeKern();
  await W.depotLaden(JSON.parse(JSON.stringify(r.umschlag)), PW);
  assert.deepEqual(W.zusammenstellungDatensatz([EPA], { id: 'x', titel: '' }).felder.map((f) => f.wert), imAnker);
});

test('[SUB-DEPOT-PERSONEN·Gegenprobe] der Baustein „notfall" trug das Register schon vor dem Fix — der Befund lag im Bereichs-Zweig, nicht im Mechanismus', async () => {
  const V = await anker();
  const aus = V.empfaengerZuschnittModell({ id: 'k1', name: 'Anna', bausteine: ['notfall'] });
  assert.ok(aus.menschen.length > 0);
  assert.deepEqual(verwaisteVerweise(aus), []);
});

test('[SUB-DEPOT-PERSONEN·Rot-Beweis] der Detektor ist nicht blind: ein Verweis ohne mitgegebene Person wird gemeldet', () => {
  const aus = { sektoren: { advanceCare: { provisionInstruments: [{ id: 'vi-1', authorizedPersons: [{ ref: 'p-1' }] }] } }, menschen: [{ id: 'p-2' }] };
  assert.deepEqual(verwaisteVerweise(aus), ['sektoren.advanceCare.provisionInstruments[0].authorizedPersons[0]']);
  aus.menschen.push({ id: 'p-1' });
  assert.deepEqual(verwaisteVerweise(aus), []);
});

// Datenschutz (Prüfung 25.09.2026): das Nachziehen darf keine ausdrückliche Ausnahme der Inhaberin aufheben, und an die
// Institution geht aus dem Sub-Depot nie ein Personen-Datensatz, nur die Anzeige des angefragten Felds.
test('[SUB-DEPOT-PERSONEN·Ausnahme] eine ausgenommene Liste wird nicht nachgezogen — die Ausnahme der Inhaberin geht vor', async () => {
  const V = await anker();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [] });
  const bankId = V.getData().sektoren.advanceCare.provisionInstruments.slice(-1)[0].id;
  V.listenEintragHinzufuegen('finance', 'accounts', { bankingPowersOfAttorneyFrom: [{ ref: bankId }] });
  const mit = V.empfaengerZuschnittModell({ id: 'k1', name: 'Anna', bausteine: ['bereich:finance'] });
  assert.equal(((mit.sektoren.advanceCare || {}).provisionInstruments || []).length, 1, 'Vorbedingung: ohne Ausnahme reist die Bankvollmacht-Zeile mit');
  const ohne = V.empfaengerZuschnittModell({ id: 'k1', name: 'Anna', bausteine: ['bereich:finance'], ausnahmen: ['advanceCare.provisionInstruments'] });
  assert.equal(((ohne.sektoren.advanceCare || {}).provisionInstruments || []).length, 0);
  const ohneMenschen = V.empfaengerZuschnittModell({ id: 'k1', name: 'Anna', bausteine: ['bereich:advanceCare'], ausnahmen: ['people.menschen'] });
  assert.deepEqual(ohneMenschen.menschen, []);
});

test('[SUB-DEPOT-PERSONEN·Institution] die Antwort aus dem Sub-Depot trägt den Namen der Bevollmächtigten, nie ihren Datensatz; Sensibles nur mit Freigabe', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-personen-pw-2026');
  V.akteurSelbstErklaeren('Gertrud Beispiel');
  const anna = V.personHinzufuegen({ name: 'Anna Beispiel', beziehung: 'kind', tel: '0301111111', birthDate: '1970-04-05', adresse: 'Beispielweg 9, 12345 Beispielstadt', email: 'anna@example.de' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: anna }], centralRegisterOfPowersOf: 'ZVR-2021-0815' });
  const r = await V.empfaengerDateiErzeugen({ id: 'k1', name: 'Anna', bausteine: ['bereich:advanceCare'] }, PW);
  const { V: W } = ladeKern();
  await W.depotLaden(JSON.parse(JSON.stringify(r.umschlag)), PW);
  const ZVR = 'advanceCare.provisionInstruments[enduring-power-of-attorney].centralRegisterOfPowersOf';
  const ds = JSON.stringify(W.zusammenstellungDatensatz([EPA, ZVR], { id: 'x', titel: '' }));
  assert.match(ds, /Anna Beispiel/);
  for (const w of ['1970-04-05', 'Beispielweg 9', 'anna@example.de']) assert.ok(!ds.includes(w), 'Datensatz der Person in der Antwort: ' + w);
  assert.ok(!ds.includes('ZVR-2021-0815'), 'die sensible Eintragungsnummer geht ohne Freigabe nicht mit');
  assert.match(JSON.stringify(W.zusammenstellungDatensatz([ZVR], { id: 'x', titel: '' }, { sensibel: true })), /ZVR-2021-0815/, 'mit Freigabe schon');
});
