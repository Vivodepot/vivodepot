'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — M1 Zug 1, Gruppe „Ausweisdokumente" („M1", 09.08.2026)
   ────────────────────────────────────────────────────────────────────────
   ausweis_gueltig/reisepass_gueltig sind eigene, vom Bürger eingetragene
   Felder (die Bürgerin hat das Dokument vor sich) — die Anwendung schlägt
   nur einen Wert VOR (§ 6 Abs. 1 PAuswG / § 5 Abs. 1 PassG: zehn Jahre,
   unter 24 Jahren bei Ausstellung sechs), gesetzt wird nie automatisch.
   Dieselbe Linie wie notvertretungAblaufText/W-7: BERECHNET, NIE GESPEICHERT.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `ausweis_gueltig` ist mit diesem Glied in
// die Liste `ausweis` gewandert (mehrwertig) — der `case 'ausweis_gueltig':`-Zweig in
// `_fristHinweisFuerFeld` ist ENTFALLEN (dokumentierter Gap, s. Kommentar am Kern), nicht nur
// ungenutzt. Der berechnete Zehn-/Sechs-Jahre-Vorschlag gilt darum bis zu einer eigenen
// Listen-fähigen Fassung NICHT mehr für den Personalausweis — nur noch für den Reisepass
// (Test unten, unverändert). Die drei Tests hier halten die neue, ehrliche Abwesenheit fest.
test('[M1] `ausweis_gueltig` liefert KEINEN Vorschlag mehr — der Zweig ist entfallen, nicht nur leer', () => {
  const { V } = ladeKern();
  const text = V._fristHinweisFuerFeld('ausweis_gueltig', null,
    { ausweis_ausgestellt: '2026-03-01' }, new Date('2026-03-01'));
  assert.equal(text, '', 'kein Hinweis — der Dispatcher kennt diesen Feldnamen nicht mehr als Sonderfall');
});

test('[M1] auch mit vollständigem Depot bleibt der Vorschlag für den Personalausweis aus (24 Jahre)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('m1-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'birthDate', '2002-03-01');   // wird am 2026-03-01 genau 24
  V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'DE', issuedOn: '2026-03-01' });
  const text = V._fristHinweisFuerFeld('ausweis_gueltig', null,
    V.getData().sektoren.identity, new Date('2026-03-01'));
  assert.equal(text, '', 'dokumentierter Gap: kein Rechen-Vorschlag mehr, auch mit vollständigen Daten');
});

test('[M1] auch mit vollständigem Depot bleibt der Vorschlag für den Personalausweis aus (23 Jahre)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('m1-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'birthDate', '2002-03-02');   // am 2026-03-01 noch 23
  V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'DE', issuedOn: '2026-03-01' });
  const text = V._fristHinweisFuerFeld('ausweis_gueltig', null,
    V.getData().sektoren.identity, new Date('2026-03-01'));
  assert.equal(text, '', 'dokumentierter Gap: kein Rechen-Vorschlag mehr, auch mit vollständigen Daten');
});

test('[M1] reisepass_gueltig: dieselbe Alters-Regel, Geburtsdatum kommt aus identitaet (Cross-Sektor)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('m1-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'birthDate', '2002-03-02');
  V.sektorFeldSetzen('mobility', 'passportIssuedOn', '2026-03-01');
  const text = V._fristHinweisFuerFeld('passportValidUntil', null,
    V.getData().sektoren.mobility, new Date('2026-03-01'));
  assert.match(text, /2032-03-01/, 'sechs Jahre — dieselbe Regel wie beim Ausweis, Geburtsdatum sektorübergreifend gelesen');
});

test('[M1] ohne Ausstellungsdatum kein Vorschlag beim Reisepass — kein Erfinden', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('m1-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'birthDate', '2002-03-02');
  const text = V._fristHinweisFuerFeld('passportValidUntil', null, V.getData().sektoren.mobility, new Date());
  assert.equal(text, '');
});

test('[M1] `ausweis` ist eine Liste mit `ausgestellt`/`gueltig`-Unterfeldern vom Typ datum', () => {
  const { V } = ladeKern();
  const idFelder = V.SEKTOR_BY_ID.identity.sektionen.flatMap(s => s.felder);
  const mobFelder = V.SEKTOR_BY_ID.mobility.sektionen.flatMap(s => s.felder);
  const ausweis = idFelder.find(f => f.id === 'idDocuments');
  assert.equal(ausweis.typ, 'liste');
  assert.equal(ausweis.unterFelder.find(u => u.id === 'issuedOn').typ, 'datum');
  assert.equal(ausweis.unterFelder.find(u => u.id === 'validUntil').typ, 'datum');
  assert.equal(mobFelder.find(f => f.id === 'passportIssuedOn').typ, 'datum');
  assert.equal(mobFelder.find(f => f.id === 'passportValidUntil').typ, 'datum');
  assert.equal(mobFelder.find(f => f.id === 'drivingLicenceValidUntil').typ, 'datum');
});

test('[M1] Prüftermine: Personalausweis-Katalogeintrag zeigt jetzt auf die Liste + ihr Gültigkeits-Unterfeld', () => {
  const { V } = ladeKern();
  const alle = V.alleStandardDokumente();
  const ausweis = alle.find(d => d.typ === 'national-id-card');
  const pass = alle.find(d => d.typ === 'passport');
  const fs = alle.find(d => d.typ === 'driving-licence');
  assert.ok(ausweis && ausweis.felder[0].feldId === 'idDocuments' && ausweis.felder[0].unterfeldId === 'validUntil');
  assert.ok(pass && pass.felder[0].feldId === 'passportValidUntil');
  assert.ok(fs && fs.felder[0].feldId === 'drivingLicenceValidUntil');
});
