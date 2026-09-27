'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Aushäng-Akt (Übergaben-Modul Schritt 2b; U2-ADR-003, „dritter Weg")
   ────────────────────────────────────────────────────────────────────────
   Export und Aushängen sind GETRENNTE Akte (ADR-068 v2 Klärung 7: bewusste
   Einzelakte, keine Kaskade). Nach dem Blackbox-Export bleibt das Sub-Depot
   aktiv verwaltet; erst ein bestätigter Akt „Übergabe abgeschlossen" hängt es
   aus und setzt es auf 'uebergeben-archiviert'. Das Fenster dazwischen ist die
   Sicherheit — die Obhut reißt nie ab. Geprüfte Invarianten (KLASSE-A, wo
   sicherheitskritisch):
     1) Export hängt NICHT aus (Sub-Depot bleibt aktiv),
     2) Aushängen ist getrennt und bestätigt (erst der Akt setzt den Status),
     3) Audit anhängend mit Person (Klasse-A): zwei Einträge, Export unverändert,
        Aushäng-Eintrag nennt die konkrete handelnde Person,
     4) Kein Re-Export aus dem Archiv (Klasse-A) ohne ausdrückliche Reaktivierung,
     5) Umschlag bleibt im archivierten Zustand erhalten (Rettungs-Pfad).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'anker-verwaltend-geheim-123';
const SUB_PW   = 'inhaberin-eigenes-pw-456';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// Anker mit Sitzungs-Akteur (für den Aushäng-Akt nötig) und einem verwalteten Sub-Depot.
async function anlage() {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  const akteur = V.akteurSelbstErklaeren('Verwalter B');     // konkrete handelnde Person
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Oma', inhaberin: 'Oma', verwaltungsTyp: 'verwaltet' },
    SUB_PW
  );
  return { V, eintrag, akteur };
}

test('Export hängt nicht aus: nach Blackbox-Export bleibt das Sub-Depot aktiv verwaltet', async () => {
  const { V, eintrag } = await anlage();
  V.subDepotBlackboxExportieren(eintrag.depotUUID);

  const live = V.getData().verwalteteDepots.find(x => x.depotUUID === eintrag.depotUUID);
  assert.equal(live.status, 'aktiv', 'weiterhin aktiv verwaltet — Export archiviert nicht');
  assert.equal(V.verwaltungAktiv(live), true, 'gilt als aktiv');
  // Genau ein Audit-Eintrag (der Export), noch KEIN Aushäng-Eintrag.
  assert.equal(live.delegationsGeschichte.length, 1, 'nur der Export im Audit');
  assert.equal(live.delegationsGeschichte[0].art, 'blackbox-export');
});

test('Aushängen ist getrennt und bestätigt: erst der Akt setzt den Status auf uebergeben-archiviert', async () => {
  const { V, eintrag } = await anlage();
  assert.equal(V.getData().verwalteteDepots[0].status, 'aktiv', 'vor dem Akt aktiv');

  V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'Oma' });

  const live = V.getData().verwalteteDepots[0];
  assert.equal(live.status, 'uebergeben-archiviert', 'Status nach dem bestätigten Akt');
  assert.equal(V.verwaltungAktiv(live), false, 'nicht mehr aktiv');
  assert.match(live.archiviertAm, ISO, 'Archivierungs-Datum ISO-8601');
  assert.equal(live.empfaenger, 'Oma', 'Empfänger festgehalten, weil bekannt');
});

test('[Klasse-A] Audit anhängend mit Person: Export- und Aushäng-Eintrag, Export unverändert, Person benannt', async () => {
  const { V, eintrag, akteur } = await anlage();
  V.subDepotBlackboxExportieren(eintrag.depotUUID);

  const live = V.getData().verwalteteDepots[0];
  const exportArt  = live.delegationsGeschichte[0].art;
  const exportZeit = live.delegationsGeschichte[0].zeitpunkt;

  V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'Oma' });

  assert.equal(live.delegationsGeschichte.length, 2, 'zwei Audit-Einträge — anhängend, nicht ersetzt');
  assert.equal(live.delegationsGeschichte[0].art, exportArt, 'Export-Eintrag unverändert (art)');
  assert.equal(live.delegationsGeschichte[0].zeitpunkt, exportZeit, 'Export-Eintrag unverändert (zeitpunkt)');

  const aus = live.delegationsGeschichte[1];
  // UMBENANNT 27.07.2026 (Posten 41): hiess `uebergabe-abgeschlossen` — fuer BEIDE
  // Wege. Beim Beiseitelegen war das eine falsche Aussage in der Akte, auf die sich
  // spaeter jemand beruft: der Anker kann jederzeit wieder aufnehmen. Die Art nennt
  // jetzt, WELCHER Vorgang es war.
  assert.equal(aus.art, 'beiseitegelegt', 'Aushäng-Eintrags-Art nennt die Absicht');
  assert.equal(aus.akteur, akteur.personId, 'konkrete handelnde Person benannt (Person-id, nicht nur Rolle)');
  assert.equal(V.akteurName(aus.akteur), 'Verwalter B', 'Person nach Verweis auflösbar');
  assert.equal(aus.empfaenger, 'Oma', 'Empfänger im Audit festgehalten');
  assert.match(aus.zeitpunkt, ISO, 'Zeitpunkt ISO-8601');
});

test('[Klasse-A] Kein Re-Export aus dem Archiv ohne ausdrückliche Reaktivierung', async () => {
  const { V, eintrag } = await anlage();
  V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'Oma' });

  assert.throws(
    () => V.subDepotBlackboxExportieren(eintrag.depotUUID),
    /archiviert|aufnehmen/i,
    'aus dem Archiv ist kein Export möglich (verhindert wandernde veraltete Blackbox)'
  );

  // Nach ausdrücklicher Reaktivierung wieder exportierbar (Rettungs-Pfad).
  V.subDepotReaktivieren(eintrag.depotUUID);
  assert.equal(V.getData().verwalteteDepots[0].status, 'aktiv', 'reaktiviert');
  const datei = V.subDepotBlackboxExportieren(eintrag.depotUUID);
  assert.equal(datei.dateiTyp, 'vivodepot-blackbox-export', 'nach Reaktivierung wieder exportierbar');
});

test('Umschlag erhalten: der verschlüsselte Umschlag bleibt im archivierten Zustand vorhanden', async () => {
  const { V, eintrag } = await anlage();
  // U2-ADR-002 (23.09.2026, S1): ein Sub-Depot ist ein Depot wie jedes andere — V4; gleich streng, nur in der V4-Form (Einheiten statt ct, V4-Felder statt „sechs").
  const einheitenVorher = JSON.stringify(eintrag.umschlag.einheiten);

  V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'Oma' });

  const live = V.getData().verwalteteDepots[0];
  assert.ok(live.umschlag, 'Umschlag noch vorhanden');
  assert.equal(JSON.stringify(live.umschlag.einheiten), einheitenVorher, 'Chiffrat (Einheiten) unverändert erhalten (Rettungs-Pfad)');
  assert.equal(
    Object.keys(live.umschlag).sort().join(','),
    'angehoerigenOrt,depotSalt,depotUUID,einheiten,kryptoVersion,pbkdf2,umschlagTabelle',
    'die Umschlag-Felder (dieselben wie beim Anker) bleiben vollständig erhalten'
  );
});

test('Aushängen ohne Sitzungs-Akteur wirft — keine namenlose Übergabe, keine Mutation', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);                              // KEIN akteurSelbstErklaeren
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'X', inhaberin: 'Y', verwaltungsTyp: 'verwaltet' }, SUB_PW
  );

  assert.throws(
    () => V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'Y' }),
    /Sitzungs-Akteur|U2-ADR-005/,
    'ohne Akteur kann nicht ausgehängt werden'
  );
  // Vor jeder Mutation geworfen: Status bleibt aktiv, kein Audit-Eintrag.
  const live = V.getData().verwalteteDepots[0];
  assert.equal(live.status, 'aktiv', 'Status unverändert aktiv');
  assert.equal(live.delegationsGeschichte.length, 0, 'kein Audit-Eintrag bei fehlgeschlagenem Aushängen');
});

test('Doppeltes Aushängen wirft — ein bereits archiviertes Depot wird nicht erneut ausgehängt', async () => {
  const { V, eintrag } = await anlage();
  V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'Oma' });
  assert.throws(
    () => V.subDepotAushaengen(eintrag.depotUUID, { empfaenger: 'Oma' }),
    /archiviert/i,
    'kein zweiter Aushäng-Akt am selben Eintrag'
  );
  // Nur ein Aushäng-Eintrag im Audit.
  const aushaeng = V.getData().verwalteteDepots[0].delegationsGeschichte
    .filter(x => x.art === 'beiseitegelegt' || x.art === 'abgegeben');
  assert.equal(aushaeng.length, 1, 'genau ein Aushäng-Eintrag');
});
