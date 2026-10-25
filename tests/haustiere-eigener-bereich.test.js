'use strict';
/* Tiere als eigener Bereich `pets` im Cluster Alltag (U2-ADR-479, 03.10.2026). Bis hierher waren die Haustiere ein Abschnitt
   von `identity`. `_feldUmzuegeAnwenden` zieht das Feld samt Nebenablagen, Kennungen und Kreis-Umfang um — abbruchsicher, ohne
   Verlust, und kein Kreis gewinnt still etwas. Die vier Proben der Gegenlesung:
     1. feldweise Gleichheit vor/nach (Privat und Pro, Tiere von heute),
     2. ein Depot ohne Tiere bleibt feldgleich,
     3. Abbruch mitten im Umzug lässt den alten Stand stehen (Rot-Beweis),
     4. die Tierdaten in der Ausgabe eines Kreises sind gleich vor und nach.
   Dazu: Kreis nur mit Wohnen sieht die Tiere nicht neu; der Block steht byte-gleich in der Lese-App. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const TIERE = [
  { id: 't1', petNameSpecies: 'Felix, Katze', medication: 'trocken, 2× täglich', otherNotes: 'scheu' },
  { id: 't2', petNameSpecies: 'Bello, Hund' },
];
function altDepot() {
  return {
    schemaVersion: 91,
    sektoren: { identity: { givenName: 'Erna', familyName: 'Probe', pets: JSON.parse(JSON.stringify(TIERE)) }, housing: { rentAmount: '700' } },
    sensibelFelder: { identity: { pets: true, givenName: false } },
    feldGueltigkeit: { identity: { pets: { bis: '2027-01-01' } } },
    urheberschaft: { identity: { pets: [{ akteur: 'a1', eigenschaft: 'selbst', zeitpunkt: '2026-01-01T00:00:00.000Z' }] } },
    empfaengerkreise: [
      { id: 'A', name: 'Mit Identität', bausteine: ['bereich:identity'], ausnahmen: ['identity.pets[0].medication'] },
      { id: 'B', name: 'Nur Wohnen', bausteine: ['bereich:housing'], ausnahmen: [] },
    ],
    zusammenstellungen: [{ id: 'z', name: 'Tierarzt', kennungen: ['identity.pets[0].petNameSpecies', 'identity.givenName'] }],
    blattFelder: { pflegeheim: ['identity.pets', 'identity.givenName'] },
  };
}

test('[Tiere·Bereich] ein vierzehnter Bereich „Tiere“ im Cluster Alltag, mit dem Abschnitt „Haustiere“; identity ohne Tiere', () => {
  const { V } = ladeKern();
  const pets = V.bereicheAlle().find((s) => s.id === 'pets');
  assert.ok(pets, 'Bereich pets');
  assert.deepEqual((pets.sektionen || []).map((x) => x.id), ['pets']);
  assert.equal(V.BEREICH_CLUSTER_ZUORDNUNG.pets, 'alltag');
  const identity = V.bereicheAlle().find((s) => s.id === 'identity');
  assert.ok(!(identity.sektionen || []).some((x) => x.id === 'pets'), 'identity trägt die Tiere nicht mehr');
});

test('[Tiere·1] feldweise Gleichheit: jeder Eintrag, jedes Unterfeld, jede Kennung bytegleich am neuen Ort, Register mit', () => {
  const { V } = ladeKern();
  const d = altDepot();
  V.depotNormalisieren(d);
  assert.deepEqual(d.sektoren.pets.pets, TIERE);
  assert.ok(!('pets' in d.sektoren.identity), 'identity.pets ist fort');
  assert.equal(d.sektoren.identity.givenName, 'Erna', 'der Rest von identity bleibt');
  assert.equal(d.sensibelFelder.pets.pets, true);
  assert.equal(d.sensibelFelder.identity.givenName, false);
  assert.deepEqual(d.feldGueltigkeit.pets.pets, { bis: '2027-01-01' });
  assert.equal(d.urheberschaft.pets.pets[0].akteur, 'a1');
  assert.deepEqual(d.zusammenstellungen[0].kennungen, ['pets.pets[0].petNameSpecies', 'identity.givenName']);
  assert.deepEqual(d.blattFelder.pflegeheim, ['pets.pets', 'identity.givenName']);
  const vorher = JSON.stringify(d);
  V.depotNormalisieren(d);
  assert.equal(JSON.stringify(d), vorher, 'ein zweiter Lauf ändert nichts');
});

test('[Tiere·Kreise] ein Kreis mit Identität behält die Tiere, ein Kreis nur mit Wohnen bekommt sie nicht', () => {
  const { V } = ladeKern();
  const d = altDepot();
  V.depotNormalisieren(d);
  const [a, b] = d.empfaengerkreise;
  assert.deepEqual(a.bausteine, ['bereich:identity', 'bereich:pets']);
  assert.deepEqual(a.ausnahmen, ['pets.pets[0].medication']);
  assert.deepEqual(b.bausteine, ['bereich:housing'], 'kein stiller Zuwachs');
});

test('[Tiere·2] ein Depot ohne Tiere bleibt feldgleich', () => {
  const { V } = ladeKern();
  const d = altDepot();
  delete d.sektoren.identity.pets; delete d.sensibelFelder.identity.pets; delete d.feldGueltigkeit; delete d.urheberschaft;
  d.zusammenstellungen[0].kennungen = ['identity.givenName']; d.blattFelder.pflegeheim = ['identity.givenName'];
  d.empfaengerkreise[0].ausnahmen = [];
  const vorher = JSON.parse(JSON.stringify(d));
  V._feldUmzuegeAnwenden(d);
  // Der Kreis mit Identität bekommt den Baustein auch ohne Tiere — sein Umfang „alles von Identität“ bleibt gleich.
  vorher.empfaengerkreise[0].bausteine.push('bereich:pets');
  assert.deepEqual(d, vorher);
});

test('[Tiere·3] Abbruch mitten im Umzug: der alte Stand bleibt, nichts halb umgezogen (Rot-Beweis)', () => {
  const { V } = ladeKern();
  const d = altDepot();
  const vorher = JSON.stringify(d);
  Object.defineProperty(d, 'zusammenstellungen', { configurable: true, enumerable: true, get() { throw new Error('Abbruch in der Probe'); } });
  assert.throws(() => V._feldUmzuegeAnwenden(d), /Abbruch in der Probe/);
  Object.defineProperty(d, 'zusammenstellungen', { configurable: true, enumerable: true, writable: true, value: JSON.parse(vorher).zusammenstellungen });
  assert.equal(JSON.stringify(d), vorher, 'sektoren, Register und Kreise unverändert');
  assert.ok(Array.isArray(d.sektoren.identity.pets) && !d.sektoren.pets, 'die Tiere stehen noch am alten Ort');
});

test('[Tiere·Konflikt] steht am Ziel schon ein Wert, bleibt die Quelle stehen — kein Überschreiben', () => {
  const { V } = ladeKern();
  const d = altDepot();
  d.sektoren.pets = { pets: [{ id: 'x', petNameSpecies: 'Mimi' }] };
  V._feldUmzuegeAnwenden(d);
  assert.deepEqual(d.sektoren.identity.pets, TIERE);
  assert.deepEqual(d.sektoren.pets.pets, [{ id: 'x', petNameSpecies: 'Mimi' }]);
});

test('[Tiere·4] die Tierdaten in der Ausgabe des Kreises mit Identität sind vor und nach dem Umzug gleich', () => {
  const { V } = ladeKern();
  const werte = (modell) => JSON.stringify(modell).match(/Felix, Katze|Bello, Hund|trocken, 2× täglich/g) || [];
  const d = altDepot();
  // Ein Bereichs-Baustein hält sensible Felder zurück (b1fdf9148, SENSIBEL-FILTER-BEREICHSBAUSTEIN) — vorher wie nachher.
  // Damit die Gleichheit an Werten gemessen wird und nicht an zwei leeren Ausgaben, sind die Tiere hier nicht sensibel.
  d.sensibelFelder.identity.pets = false;
  const vorher = werte(V.empfaengerZuschnittModell(d.empfaengerkreise[0], d)).sort();
  V.depotNormalisieren(d);
  const nachher = werte(V.empfaengerZuschnittModell(d.empfaengerkreise[0], d)).sort();
  assert.ok(nachher.length > 0, 'die Tiere stehen in der Ausgabe');
  assert.deepEqual(nachher.filter((x) => x !== 'trocken, 2× täglich'), vorher.filter((x) => x !== 'trocken, 2× täglich'),
    'gleiche Tierwerte (die Ausnahme „Futter“ des Kreises gilt vorher wie nachher)');
  assert.deepEqual(werte(V.empfaengerZuschnittModell(d.empfaengerkreise[1], d)), [], 'Kreis nur mit Wohnen: keine Tiere');
});

test('[Tiere·Lese-App] der Umzugs-Block steht byte-gleich in Kern und Lese-App, und die Lese-App ruft ihn', () => {
  const block = (datei) => {
    const t = fs.readFileSync(path.join(__dirname, '..', datei), 'utf8');
    const a = t.indexOf('/* >>> FELD-UMZUG-BLOCK BEGIN'); const e = t.indexOf('/* <<< FELD-UMZUG-BLOCK END <<< */');
    assert.ok(a >= 0 && e > a, datei + ' trägt den Block');
    return t.slice(a, e);
  };
  assert.equal(block('vivodepot-lesen.html'), block('vivodepot.html'));
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8'), /\n {2}_feldUmzuegeAnwenden\(obj\);/);
});

/* Jedes Produkt zieht um (Pro P2, 23.10.2026, U2-ADR-421 §8): Pro liest dieselbe identity-Vorlage wie Privat, ohne Tiere. Ein
   Pro-Depot, das seit 17.09. Tiere unter identity führt, findet sie danach unter pets — Pro bietet den Bereich nicht an, zeigt ihn
   aber, weil die Datei dort Daten trägt (ruhender Bereich). Gegenprobe Privat: dasselbe Ergebnis wie vor P2, dort war der Umzug
   schon immer gefahren. Dass ein frisches Pro-Depot keinen Bereich Tiere zeigt, prüft die Probe der ruhenden Pro-Bereiche. */
test('[Tiere·Pro] ein Pro-Depot mit Tieren von heute findet sie unter pets, ohne Verlust (DE und EN); Privat wie bisher', async () => {
  const T = require('../tools/altbestand-vier-produkte-messen.js');
  for (const slug of ['pro-de', 'pro-en', 'privat-de']) {
    const k = await T.oeffnen(slug, { art: 'datenstand', depot: { sektoren: { identity: { givenName: 'Erna', pets: JSON.parse(JSON.stringify(TIERE)) } } } });
    const V = k.V || k;
    const d = V.getData();
    assert.deepEqual(d.sektoren.pets && d.sektoren.pets.pets, TIERE, slug + ': Tiere am neuen Ort');
    assert.ok(!(d.sektoren.identity && 'pets' in d.sektoren.identity), slug + ': nicht mehr unter identity');
    assert.equal(d.sektoren.identity.givenName, 'Erna', slug + ': identity sonst unverändert');
    assert.equal(d.schemaVersion, 94, slug + ': Stufe 94 gesetzt');
  }
});

test('[Tiere·Lese-App·Altdatei] eine Empfängerdatei von heute mit identity.pets zeigt in der Lese-App die Tiere unter Tiere', () => {
  const { ladeLesen } = require('./load-lesen.js');
  const L = ladeLesen();
  const V = L.V || L;
  const obj = { schemaVersion: 91, sektoren: { identity: { givenName: 'Erna', pets: JSON.parse(JSON.stringify(TIERE)) } },
    sensibelFelder: { identity: { pets: false } } };
  const signiertVorher = JSON.stringify(obj);
  V._foldVollmachtenLesen(obj);
  assert.deepEqual(obj.sektoren.pets && obj.sektoren.pets.pets, TIERE);
  assert.ok(!('pets' in obj.sektoren.identity));
  assert.equal(obj.sensibelFelder.pets.pets, false);
  assert.notEqual(JSON.stringify(obj), signiertVorher, 'gelesen wird umgezogen — die Datei selbst bleibt, was sie ist');
});
