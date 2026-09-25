'use strict';
/* ════════════════════════════════════════════════════════════════════════
   M5 — Die Inhaberin ist nicht löschbar („M5 und M6", 09.08.2026,
   Zug 1). Befund: `personLoeschen` hatte keinen Guard, `menschenRegisterHTML`
   keinen Filter — die Inhaberin stand als gleichwertiger Listeneintrag
   zwischen den übrigen Personen, mit Entfernen-Option. Dieselbe Person ist
   der Urheberschafts-Anker jedes Stempels (`inhaberAkteurEtablieren`) —
   würde sie gelöscht, verlören alle gestempelten Einträge ihren Bezugspunkt.

   Der Guard nutzt `_inhaberPersonIdFinden()` (dieselbe Drei-Stufen-Auflösung
   wie beim Wiedereintritt), NICHT nur `data.inhaberPersonId` direkt — das
   Feld ist in vielen Depots (auch in dieser Testsuite üblich) nicht explizit
   gesetzt, sondern über den jüngsten `eigenschaft:'selbst'`-Stempel oder den
   Identitäts-Namen auflösbar. Ein Guard, der nur das explizite Feld prüft,
   ließe die Inhaberin in genau den Fällen löschbar, in denen sie bisher am
   längsten unentdeckt blieb.

   Geprüft, per Auftrag: es gibt keinen legitimen Weg, auf dem die Inhaberin
   im LAUFENDEN Depot durch eine andere Person ersetzt werden muss.
   `data.inhaberPersonId` wird nur EINMAL beim Anlegen gesetzt (`depotAnlegen`-
   Flow, vivodepot.html ~17344) und danach nur GEHEILT (derselbe Wert, nie ein
   anderer). „Sub-Depot-Selbstbestimmung" ändert nur das Sub-Depot-Passwort,
   nie `inhaberPersonId`. Eigentümerwechsel bedeutet in diesem Modell ein
   NEUES Depot, keine Mutation des laufenden — der Guard blockiert also
   keinen bestehenden, gewollten Weg.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('[M5] echter Kern: personLoeschen wirft für die Inhaberin (data.inhaberPersonId explizit gesetzt)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria Musterfrau');
  V.getData().inhaberPersonId = akteur.personId;
  assert.throws(() => V.personLoeschen(akteur.personId), /Inhaberin/i);
});

test('[M5] echter Kern: personLoeschen wirft für die Inhaberin auch OHNE explizites inhaberPersonId (Identitäts-Name-Auflösung, Stufe 3)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria Musterfrau');
  // KEIN explizites data.inhaberPersonId gesetzt — wie in den meisten Testaufbauten dieser Suite
  // und in geheilten Alt-Depots ohne frischen Urheberschafts-Stempel (Stufe 2 griffe nur nach
  // einer echten Feld-Bearbeitung). _inhaberPersonIdFinden muss trotzdem über den Identitäts-Namen
  // auflösen (Stufe 3).
  assert.equal(V.getData().inhaberPersonId, null, 'Vorbedingung: kein explizites Feld gesetzt (Default aus leeresDepot())');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  assert.throws(() => V.personLoeschen(akteur.personId), /Inhaberin/i);
});

test('[M5] echter Kern: eine andere Person bleibt weiterhin löschbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria Musterfrau');
  V.getData().inhaberPersonId = akteur.personId;
  const id = V.personHinzufuegen({ name: 'Anna Schmidt', beziehung: 'Schwester' });
  const zurueck = V.personLoeschen(id);
  assert.equal(zurueck, id);
  assert.ok(!V.getData().menschen.some((m) => m.id === id));
});

test('[M5] menschenRegisterHTML: die Inhaberin steht oben, abgesetzt, ohne Entfernen-Knopf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria Musterfrau');
  V.getData().inhaberPersonId = akteur.personId;
  V.personHinzufuegen({ name: 'Anna Schmidt', beziehung: 'Schwester' });
  const html = V.menschenRegisterHTML(true);
  assert.ok(html.includes('menschen-inhaberin'), 'eigener, abgesetzter Block für die Inhaberin');
  assert.ok(html.includes('Maria Musterfrau'), 'Name der Inhaberin erscheint');
  const inhaberinPos = html.indexOf('Maria Musterfrau');
  const annaPos = html.indexOf('Anna Schmidt');
  assert.ok(inhaberinPos > -1 && annaPos > -1 && inhaberinPos < annaPos, 'Inhaberin steht vor den übrigen Personen');
  // Kein Entfernen-Knopf für die Inhaberin — der reguläre Eintrag für Anna behält seinen.
  const inhaberinBlock = html.slice(0, html.indexOf('liste-eintrag" data-person-id'));
  assert.ok(!inhaberinBlock.includes('data-person-entfernen'), 'Inhaberin-Block trägt keinen Entfernen-Knopf');
  assert.ok(html.includes('data-person-entfernen="' + V.getData().menschen.find((m) => m.name === 'Anna Schmidt').id + '"'), 'reguläre Person behält ihren Entfernen-Knopf');
});

test('[M5] menschenRegisterHTML: die Inhaberin zeigt keine geliehene Beziehungs-/Aufgaben-Angabe', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria Musterfrau');
  V.getData().inhaberPersonId = akteur.personId;
  // Falls irgendein Weg `beziehung`/`aufgabe` an der Inhaberin setzt (z. B. Altdaten/Import) —
  // die Zeile zeigt trotzdem die feste Positions-Aussage, nicht den geliehenen Wert.
  const p = V.getData().menschen.find((m) => m.id === akteur.personId);
  p.beziehung = 'Schwester';
  const html = V.menschenRegisterHTML(true);
  assert.ok(!html.includes('Schwester'), 'Rollenangabe (beziehung) erscheint nicht an der Inhaberin-Zeile');
});

test('[M5] read-only (darf=false): kein Entfernen-Knopf irgendwo, Inhaberin-Block bleibt sichtbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria Musterfrau');
  V.getData().inhaberPersonId = akteur.personId;
  const html = V.menschenRegisterHTML(false);
  assert.ok(html.includes('Maria Musterfrau'));
  assert.ok(!html.includes('data-person-entfernen') && !html.includes('data-person-bearbeiten'));
});
