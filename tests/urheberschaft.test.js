'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Urheberschaft pro Eintrag (U2-ADR-005; Provenance-Kette)
   ────────────────────────────────────────────────────────────────────────
   Jeder Datensatz trägt eine anhängende, unveränderliche Liste von Stempeln,
   die die KONKRETE handelnde Person (Verweis auf data.menschen[]), ihre
   Eigenschaft ('selbst' | 'unter-vollmacht' + Grundlage) und den Zeitpunkt
   benennen.

   Diese Suite prüft die SEKTOR-AGNOSTISCHE Mechanik — gegen einen NEUTRALEN
   Test-Stub (kein Bezug auf einen real existierenden Sektor). Die Provenance-
   Mechanik darf keinen Sektor-Namen kennen; das ist der Sinn des Fundament-Schnitts.

   Geprüfte Invarianten (KLASSE-A, wo sicherheitskritisch):
     1) Ein Eintrag wird gestempelt (akteur, eigenschaft, zeitpunkt),
     2) Akteure sind als verschiedene Personen unterscheidbar (nicht nur Rolle),
     3) Anhängen, unveränderlich (Klasse-A): zweiter Stempel ersetzt nicht,
     4) Innerhalb der Verschlüsselung (Klasse-A): nur im Umschlag, nicht im Klartext —
        weder Akteur-Name noch Feldwert noch Sektor-/Feld-ID noch Verweis-IDs.
     5) Stempeln ohne Sitzungs-Akteur wirft — keine vorgetäuschte Urheberschaft, keine Mutation.
     6) Eigenschaft-Validierung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-urheberschaft';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// Neutraler Stub: kein Bezug auf einen real existierenden Sektor. Die Provenance-Mechanik
// ist sektor-agnostisch und akzeptiert beliebige sektorId/feldId-Paare.
const STUB_SEKTOR = 'test_sektor';
const STUB_FELD   = 'test_feld';

test('Eintrag wird gestempelt: akteur (Person), eigenschaft, zeitpunkt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('B');                 // selbst-erklärt
  V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD, 'wert');

  const kette = V.liesUrheberschaft(STUB_SEKTOR, STUB_FELD);
  assert.equal(kette.length, 1, 'genau ein Stempel');
  const s = kette[0];
  assert.equal(s.akteur, akteur.personId, 'akteur verweist auf die konkrete Person (id)');
  assert.equal(s.eigenschaft, 'selbst', 'Eigenschaft selbst');
  assert.match(s.zeitpunkt, ISO, 'Zeitpunkt ISO-8601');
  assert.equal(V.akteurName(s.akteur), 'B', 'akteur ist als Person B auflösbar');
  // Der Feldwert ist gesetzt, der Stempel hängt am selben Datensatz.
  assert.equal(V.getData().sektoren[STUB_SEKTOR][STUB_FELD], 'wert');
});

test('Akteur unterscheidbar: B (selbst) und A (unter Vollmacht) sind verschiedene Personen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);

  // B trägt selbst ein.
  const akteurB = V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD, 'wert');

  // Später handelt A unter Vollmacht am selben Datensatz.
  const idA = V.personSicherstellen('A');
  V.setzeSitzungsAkteur({ personId: idA, eigenschaft: 'unter-vollmacht', vollmachtsGrundlage: 'Vorsorgevollmacht vom 01.01.2026' });
  V.urheberschaftAnhaengen(STUB_SEKTOR, STUB_FELD);

  const kette = V.liesUrheberschaft(STUB_SEKTOR, STUB_FELD);
  assert.equal(kette.length, 2, 'zwei Stempel in der Kette');
  assert.notEqual(kette[0].akteur, kette[1].akteur, 'verschiedene Person-IDs — nicht dieselbe Rolle');
  assert.equal(V.akteurName(kette[0].akteur), 'B');
  assert.equal(V.akteurName(kette[1].akteur), 'A');
  assert.equal(kette[0].eigenschaft, 'selbst');
  assert.equal(kette[1].eigenschaft, 'unter-vollmacht');
  assert.equal(kette[1].vollmachtsGrundlage, 'Vorsorgevollmacht vom 01.01.2026', 'Vollmachts-Grundlage festgehalten');
  assert.notEqual(akteurB.personId, idA);
});

test('[Klasse-A] Anhängen, unveränderlich: zweiter Stempel hängt an, erster bleibt unverändert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD, 'wert');

  const liveKette = V.getData().urheberschaft[STUB_SEKTOR][STUB_FELD];
  assert.equal(liveKette.length, 1);
  const ersterAkteur = liveKette[0].akteur;
  const ersterEig    = liveKette[0].eigenschaft;
  const ersterZeit   = liveKette[0].zeitpunkt;

  // Zweiter Akteur hängt an.
  const idA = V.personSicherstellen('A');
  V.setzeSitzungsAkteur({ personId: idA, eigenschaft: 'unter-vollmacht', vollmachtsGrundlage: 'VV 2026' });
  V.urheberschaftAnhaengen(STUB_SEKTOR, STUB_FELD);

  assert.equal(liveKette.length, 2, 'angehängt, nicht ersetzt');
  assert.equal(liveKette[0].akteur,      ersterAkteur, 'erster Stempel: akteur unverändert');
  assert.equal(liveKette[0].eigenschaft, ersterEig,    'erster Stempel: eigenschaft unverändert');
  assert.equal(liveKette[0].zeitpunkt,   ersterZeit,   'erster Stempel: zeitpunkt unverändert');
  assert.equal(Object.isFrozen(liveKette[0]), true, 'erster Stempel ist eingefroren (unveränderlich)');

  // Direkter Mutationsversuch am eingefrorenen Stempel schlägt fehl (strict mode wirft).
  assert.throws(() => { liveKette[0].akteur = 'MANIPULIERT'; }, TypeError,
    'eingefrorener Stempel lässt sich nicht überschreiben');
  assert.equal(liveKette[0].akteur, ersterAkteur, 'akteur nach Mutationsversuch unverändert');
});

test('[Klasse-A] Innerhalb der Verschlüsselung: Provenance nur im Umschlag, nicht im Klartext', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const NAME_MARKER = 'AKTEUR-NAME-KLARTEXT-MARKER';
  const WERT_MARKER = 'FELD-WERT-KLARTEXT-MARKER';
  const akteur = V.akteurSelbstErklaeren(NAME_MARKER);
  V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD, WERT_MARKER);

  const umschlag = await V.depotSerialisieren();
  const umschlagJSON = JSON.stringify(umschlag);
  assert.ok(!umschlagJSON.includes(NAME_MARKER), 'Akteur-Name nicht im Umschlag-Klartext');
  assert.ok(!umschlagJSON.includes(WERT_MARKER), 'Feldwert nicht im Umschlag-Klartext');
  assert.ok(!umschlagJSON.includes(akteur.personId), 'akteur-id (Stempel-Verweis) nicht im Klartext');
  assert.ok(!umschlagJSON.includes('urheberschaft'), 'Provenance-Strang nicht im Klartext');
  assert.ok(!umschlagJSON.includes('eigenschaft'), 'eigenschaft nicht im Klartext');
  assert.ok(!umschlagJSON.includes(STUB_SEKTOR), 'sektor-id nicht im Klartext');
  assert.ok(!umschlagJSON.includes(STUB_FELD),   'feld-id nicht im Klartext');
  // U2-ADR-078 + U2-ADR-062 (+Nachtrag 21.07.2026): der Anker-Umschlag trägt sechs Krypto-Felder
  // PLUS das Angehörigen-Geschwister angehoerigenOrt (F5 Zug 2: die Abschrift ist entfallen)
  // (Klartext-Ort-Hinweis). Beide sind hier null: kein Vertrauens-Zugang eingerichtet. Der frühere
  // passwortlose notfallCache ist ENTFERNT; der Provenance-Strang bleibt verschlüsselt — genau das
  // prüfen die Zeilen darüber, und daran ändert das neue Feld nichts.
  // A345 (19.08.2026): der Schnitt auf Generation 4 — `ct`/`iv` sind den Feld-Einheiten
  // und der Umschlagstabelle gewichen. Die Zusicherung ist dieselbe geblieben: der
  // Schlüsselsatz ist EXAKT fixiert, damit kein Klartext-Geschwister still dazukommt.
  assert.equal(Object.keys(umschlag).sort().join(','), 'angehoerigenOrt,depotSalt,depotUUID,einheiten,kryptoVersion,pbkdf2,umschlagTabelle');
  assert.equal('notfallCache' in umschlag, false, 'kein Klartext-Cache-Sibling mehr (U2-ADR-078)');

  // Roundtrip: die Provenance wandert IM verschlüsselten Umschlag und kehrt zurück.
  const wieder = await V.depotLaden(umschlag, PW);
  const kette = wieder.urheberschaft[STUB_SEKTOR][STUB_FELD];
  assert.equal(kette.length, 1, 'Provenance nach Roundtrip wiederhergestellt');
  assert.equal(kette[0].akteur, akteur.personId, 'akteur-Verweis nach Roundtrip erhalten');
  assert.equal(wieder.menschen.find(m => m.id === akteur.personId).name, NAME_MARKER, 'Person nach Roundtrip erhalten');
});

test('Stempeln ohne Sitzungs-Akteur wirft — keine vorgetäuschte Urheberschaft, keine Mutation', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);   // kein akteurSelbstErklaeren

  assert.throws(() => V.sektorFeldSetzen(STUB_SEKTOR, STUB_FELD, 'wert'), /Sitzungs-Akteur/,
    'ohne Akteur kann nicht gestempelt werden');
  // Vor jeder Mutation geworfen: weder Feldwert noch Provenance-Struktur entstanden.
  const data = V.getData();
  assert.equal((data.sektoren[STUB_SEKTOR] || {})[STUB_FELD], undefined, 'kein Feldwert bei fehlgeschlagenem Stempel');
  assert.equal(Object.keys(data.urheberschaft).length, 0, 'keine Provenance-Struktur angelegt');
});

test('Eigenschaft-Validierung: unbekannte Eigenschaft und fehlende Vollmachts-Grundlage werfen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.personSicherstellen('X');
  assert.throws(() => V.setzeSitzungsAkteur({ personId: id, eigenschaft: 'irgendwas' }), /eigenschaft/,
    "nur 'selbst' | 'unter-vollmacht'");
  assert.throws(() => V.setzeSitzungsAkteur({ personId: id, eigenschaft: 'unter-vollmacht' }), /vollmachtsGrundlage/,
    'unter-vollmacht braucht eine Grundlage');
  assert.throws(() => V.setzeSitzungsAkteur({ eigenschaft: 'selbst' }), /personId/,
    'Akteur braucht eine personId');
});
