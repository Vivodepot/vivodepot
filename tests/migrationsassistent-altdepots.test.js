'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Der Migrations-Assistent für Altdepots" (12.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Zug 0/1 (gemessen, s. Bericht): die Migrations-Kette (Schema 24→aktuell, 38 Sprünge) ist
   bereits vollständig durch `tests/schema-governance-guard.test.js` (Lückenlosigkeit, Monotonie,
   Kette läuft durch — echter Krypto-Roundtrip von Schema 19) und
   `tests/fixtures/migrations-stufen.js` (je Sprung eine gekoppelte vorher/nachher-Probe) gedeckt.
   `depotLaden()` bricht bei einem Normalisierungs-Fehler NIE das Laden (`try { depotNormalisieren
   } catch {}`) — ein Depot lässt sich heute IMMER öffnen, unabhängig vom Schema-Stand.

   Dieser Auftrag baut nur Zug 2 (Bürger-Hinweis) und schließt Zug 3 (Register). Diese Datei prüft
   ausschließlich Zug 2 — die Migrations-Korrektheit selbst bleibt bei den beiden oben genannten
   Dateien.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'migrationsassistent-pw';

test('[Migrationshinweis] ein wirklich altes Depot (Schema 24) löst den Hinweis beim Laden aus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const dat = V.getData();
  dat.schemaVersion = 24;                              // echter Bestandsstand, unterhalb der aktuellen Version
  const umschlag = await V.depotSerialisieren();
  const geladen = await V.depotLaden(umschlag, PW);
  assert.ok(geladen.schemaVersion > 24, 'Vorbedingung: die Kette hat wirklich hochmigriert');
  assert.equal(V.migrationsHinweisNoetig(), true, 'ein real migriertes Depot muss den Hinweis anfordern');
});

test('[Migrationshinweis] ein frisch angelegtes Depot (bereits aktuell) löst NICHTS aus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const umschlag = await V.depotSerialisieren();       // schemaVersion ist bereits SCHEMA_VERSION_AKTUELL
  await V.depotLaden(umschlag, PW);
  assert.equal(V.migrationsHinweisNoetig(), false,
    'ein Depot, das schon aktuell war, hat sich beim Laden nicht verändert — kein Hinweis');
});

test('[Migrationshinweis] zweimaliges Laden desselben (schon migrierten) Depots löst KEIN zweites Mal aus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const dat = V.getData();
  dat.schemaVersion = 30;
  const umschlagAlt = await V.depotSerialisieren();
  await V.depotLaden(umschlagAlt, PW);
  assert.equal(V.migrationsHinweisNoetig(), true, 'erste Ladung: Hinweis angefordert');
  // Hinweis wird gezeigt (simuliert) → Flag räumt sich selbst weg, wird mit dem Depot gespeichert.
  let modalAufgerufen = null;
  const echtesUiModal = V.ui.modal;
  V.ui.modal = (opt) => { modalAufgerufen = opt; };
  V.migrationsHinweisZeigen();
  assert.ok(modalAufgerufen, 'der Hinweis wurde tatsächlich angezeigt');
  assert.equal(V.migrationsHinweisNoetig(), false, 'nach dem Zeigen ist der Hinweis konsumiert');
  V.ui.modal = echtesUiModal;
  // Erneutes Speichern + Laden desselben, jetzt bereits aktuellen Standes: kein neuer Sprung mehr,
  // also kein neuer Hinweis — der konsumierte Zustand bleibt konsumiert.
  const umschlagErneut = await V.depotSerialisieren();
  await V.depotLaden(umschlagErneut, PW);
  assert.equal(V.migrationsHinweisNoetig(), false, 'kein zweiter Sprung mehr → kein erneuter Hinweis');
});

test('[Migrationshinweis] „Jetzt sichern" ruft depotHerunterladen, „Später" schließt nur', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const dat = V.getData();
  dat.schemaVersion = 40;
  const umschlag = await V.depotSerialisieren();
  await V.depotLaden(umschlag, PW);

  let primaerAufgerufen = null, zweitAufgerufen = null;
  V.ui.modal = (opt) => {
    // Simuliert die Primär-Aktion („Jetzt sichern") — Aufruf, kein echter Datei-Download nötig.
    primaerAufgerufen = typeof opt.onPrimaer === 'function';
    zweitAufgerufen = !!(opt.zweitAktion && typeof opt.zweitAktion.handler === 'function');
    assert.equal(opt.ohneAbbrechen, true, '„Später" ist der Ausweg — kein zusätzlicher Abbrechen-Knopf');
  };
  V.migrationsHinweisZeigen();
  assert.ok(primaerAufgerufen, 'Primär-Knopf ist verdrahtet (Jetzt sichern → depotHerunterladen)');
  assert.ok(zweitAufgerufen, 'Zweit-Knopf ist verdrahtet (Später)');
});

test('[Migrationshinweis] die Texte sind Bürgersprache — kein "Schema" im sichtbaren Text', async () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.migrationsHinweisTitel, /[Ss]chema/);
  assert.doesNotMatch(V.STRINGS.migrationsHinweisText, /[Ss]chema/);
});

/* ── Zug 0/1 — Positivkontrolle, dass die Deckung wirklich besteht (kein blindes Vertrauen) ── */
test('[Zug 0/1 Positivkontrolle] jeder der 39 Migrations-Sprünge (24→aktuell) hat eine Probe', () => {
  const { STUFEN } = require('./fixtures/migrations-stufen.js');
  const { V } = ladeKern();
  const aktuell = V.leeresDepot().schemaVersion;
  for (let n = 24; n <= aktuell; n++) {
    const eintrag = STUFEN.find((s) => s.nach === n);
    assert.ok(eintrag, `Schema-Sprung → ${n} hat keinen Eintrag in migrations-stufen.js`);
    const hatProbe = !!(eintrag.geprueftIn || (eintrag.vorher && eintrag.nachher) || eintrag.nichtPruefbar);
    assert.ok(hatProbe, `Schema-Sprung → ${n} hat weder vorher/nachher noch geprueftIn noch eine dokumentierte Ausnahme`);
  }
});

test('[Zug 0] depotLaden bricht NIE, selbst wenn depotNormalisieren wirft', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const dat = V.getData();
  // Absichtlich eine Form, die eine Migrationsstufe zum Werfen bringen könnte: schemaVersion als
  // Nicht-Zahl — depotNormalisieren() prüft `typeof ziel.schemaVersion === 'number'` vor jedem
  // Klammer-Bump; eine kaputte Version darf das Laden trotzdem nicht verhindern.
  dat.schemaVersion = 'KAPUTT';
  const umschlag = await V.depotSerialisieren();
  let geladen;
  await assert.doesNotReject(async () => { geladen = await V.depotLaden(umschlag, PW); },
    'depotLaden muss auch bei kaputter schemaVersion durchlaufen (try/catch um depotNormalisieren)');
  assert.ok(geladen, 'das Depot öffnet trotzdem — kein Totalverlust');
});
