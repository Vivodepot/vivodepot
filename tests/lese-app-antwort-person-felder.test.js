'use strict';
/* Die Lese-App zeigt die Felder einer verwiesenen Person, die eine Anfrage ausdrücklich verlangt hat (`personFelder` am
   Verweisfeld, Block `personen` der Antwort): unter dem Verweisfeld je Person ein Zwischentitel mit dem Namen, darunter
   „Feldname: Wert“; was die Person nicht führt, steht mit dem Chip „fehlt“. Ohne weitere Felder bleibt es beim Namen im
   Wert des Feldes. Die Antwort kommt hier aus dem Kern, wie sie hinausginge. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

// Werte aus der Lese-App stammen aus einer eigenen VM; verglichen wird über JSON.
const gleich = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);

const EHE = 'people.spouseOrCivilPartner';
const ANSCHRIFT = ['street', 'houseNumber', 'postalCode', 'city'].map((t) => 'people.person/' + t);

async function antwortAusDemKern(person, personFelder) {
  const { V } = ladeKern();
  await V.depotAnlegen('lese-app-person-felder-2026');
  const d = V.getData();
  d.menschen.push(person);
  d.sektoren.people = Object.assign({}, d.sektoren.people, { spouseOrCivilPartner: { ref: person.id } });
  V.setData(d);
  const anfrage = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Meldebehörde Beispielstadt', zweck: 'Anmeldung einer Wohnung',
    grundlage: '§ 17 BMG', vorgang: 'WA-PROBE-2', gestelltAm: '2026-11-06', gueltigBis: '2099-12-31',
    felder: [Object.assign({ kennung: EHE, zweck: 'Mitziehender Ehegatte', pflicht: true }, personFelder ? { personFelder } : {})],
    antwort: { art: 'einmalpasswort', an: 'probe@beispiel.invalid' } };
  return V.anfrageAntwortDatensatz(anfrage, { sensibel: true });
}
const MAX = { id: 'p-9', name: 'Max Muster', givenName: 'Max', familyName: 'Muster', street: 'Talweg', houseNumber: '3',
  postalCode: '01067', city: 'Dresden' };

test('[Lese-App·Person·Felder] unter dem Verweisfeld je Person der Name, darunter Feldname und Wert; Fehlendes mit „fehlt“', async () => {
  const ds = await antwortAusDemKern(MAX, ['people.person/birthDate'].concat(ANSCHRIFT));
  const { V, document } = ladeLesen();
  const m = V.antwortAnzeigeModell(ds, {});
  const f = m.felder.find((x) => x.kennung === EHE);
  assert.equal(f.personen.length, 1);
  assert.equal(f.personen[0].name, 'Max Muster');
  gleich(f.personen[0].felder.map((z) => z.fehlt ? z.label + ' – fehlt' : z.label + ': ' + z.wert),
    ['Familienname: Muster', 'Vornamen: Max', 'Geburtsdatum – fehlt', 'Straße: Talweg', 'Hausnummer: 3', 'Postleitzahl: 01067', 'Ort: Dresden']);
  V.renderAntwort(ds, { vorgang: 'WA-PROBE-2' });
  const html = document.getElementById('app').innerHTML;
  assert.match(html, /<div class="antwort-person-felder" data-antwort-person="Max Muster"><div class="antwort-person-titel">Max Muster<\/div>/);
  assert.match(html, /<li>Straße: Talweg<\/li>/);
  assert.match(html, /<li class="antwort-person-fehlt">Geburtsdatum <span class="antwort-chip-fehlt">fehlt<\/span><\/li>/);
});

test('[Lese-App·Person·Felder·Rot-Beweis] ohne personFelder bleibt es beim Namen; kein Block unter dem Feld', async () => {
  const ds = await antwortAusDemKern(MAX, null);
  const { V, document } = ladeLesen();
  gleich(V.antwortAnzeigeModell(ds, {}).felder.find((x) => x.kennung === EHE).personen, []);
  V.renderAntwort(ds, { vorgang: 'WA-PROBE-2' });
  assert.ok(!document.getElementById('app').innerHTML.includes('antwort-person-felder'));
});

test('[Lese-App·Person·Felder] die bisherige Anschriftzeile steht als eine Zeile; „verstorben“ als ja/nein', () => {
  const { V } = ladeLesen();
  const ds = { anfrage: {}, vollstaendig: true,
    felder: [{ kennung: EHE, bereich: 'people', feld: 'spouseOrCivilPartner', label: 'Ehegatte', wert: 'Max Muster', roh: { ref: 'p-9' } }],
    personen: [{ ref: 'p-9', name: 'Max Muster', anschrift: 'Am Hang 12, 50667 Köln', deceased: false }] };
  const p = V.antwortAnzeigeModell(ds, {}).felder[0].personen[0];
  gleich(p.felder.map((z) => z.label + ': ' + z.wert), ['Anschrift: Am Hang 12, 50667 Köln', 'Verstorben: nein']);
});

test('[Lese-App·Person·Felder] Deutsch und Englisch tragen jeden Feldnamen, keiner leer', () => {
  const { V } = ladeLesen();
  const namen = ['familyName', 'givenName', 'birthDate', 'birthYear', 'birthPlace', 'street', 'houseNumber', 'postalCode', 'city',
    'anschrift', 'telephone', 'deceased'].map((n) => 'antwortPerson_' + n).concat(['antwortPersonFehlt', 'antwortPersonJa', 'antwortPersonNein']);
  for (const s of namen) {
    assert.ok(typeof V.STRINGS[s] === 'string' && V.STRINGS[s].trim(), 'Deutsch fehlt: ' + s);
    assert.ok(typeof V.LESE_TEXTE_EN[s] === 'string' && V.LESE_TEXTE_EN[s].trim(), 'Englisch fehlt: ' + s);
  }
});
