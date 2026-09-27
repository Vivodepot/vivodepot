'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — JSON-Voll-Export (Teil 3, Schnitt 3.1; U2-ADR-NNN, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Bürgerweg zu dieser Funktion ("Alle Daten als Datei (JSON)", Einstellungen
   → Sichern & Wiederherstellen) ist ENTFERNT (U2-ADR-NNN, s.
   docs/adr/…-offener-json-vollexport-entfernt-2026-09-17.md): eine
   unverschlüsselte Volldatei war von einer Weitergabe nicht zu unterscheiden,
   egal wie die Einstellungen-Sektion hieß (Fund am U2-ADR-102-Untersagungs-Gate
   — zurückgenommene Bedingungen einer KI-Verfügung verließen über genau diesen
   Weg unverschlüsselt das Haus). Lesen geht seither über die Lese-App, Umzug/
   Sicherung über den bestehenden verschlüsselten Weg ("Sicherungskopie
   erstellen"). Die Abwesenheit dieses Wegs ist der Wächter in
   tests/u2-adr-102-vollexport-weitergabe-filtert.test.js, hier nicht
   wiederholt.

   `vollExportJSON()` selbst bleibt: ein internes Meßinstrument (29 Testdateien
   + 12 Werkzeuge), NIE mehr über eine Oberfläche erreichbar. Die beiden Tests
   unten prüfen die Funktion direkt, wie vor der ADR — sie waren nie über den
   entfernten Knopf abhängig.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('1) vollExportJSON liefert das ganze Depot als Klartext-Struktur', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  // N4 (09.08.2026): `blutgruppe` ist seit N4 Zug 1 schema-sensibel — Opt-in, die Probe gilt der Tiefkopie.
  const obj = V.vollExportJSON({ sensibel: true });
  assert.equal(obj._typ, 'vivodepot-klartext-export');
  assert.ok(obj.depot && obj.depot.sektoren, 'depot mitsamt sektoren');
  assert.equal(obj.depot.sektoren.identity.givenName, 'Maria');
  assert.equal(obj.depot.sektoren.health.bloodType, 'A+');
  // Read-only Kopie: Mutation am Export verändert NICHT die Laufzeitdaten.
  obj.depot.sektoren.identity.givenName = 'X';
  assert.equal(V.getData().sektoren.identity.givenName, 'Maria', 'tiefKopie — keine Rückwirkung');
});

test('2) Krypto unberührt: der Export ruft keinen Verschlüsselungs-Pfad, Daten bleiben', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const vorher = JSON.stringify(V.getData());
  V.vollExportJSON();
  assert.equal(JSON.stringify(V.getData()), vorher, 'Laufzeitdaten unverändert');
});
