'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 3: Architektur-4-Gate + Vorschau-Invariante
   ────────────────────────────────────────────────────────────────────────
   „Es wird nichts gespeichert" muss wahr bleiben: ohne existierendes Passwort/
   sessionKey (oder im passwortlosen Vorschau-Modus) wird NICHTS in IndexedDB
   geschrieben.
   (a) Vorschau MIT eingetragenen Daten → depotInIdbSichern() No-Op, IDB leer.
   (b) Erst-Eintritt ohne Session → No-Op, IDB leer.
   (c) Dispatcher in Vorschau schreibt nicht intern (führt zum Anlege-Pfad).
   (d) Positiv-Kontrolle: erst MIT Session (depotAnlegen) öffnet sich das Gate.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'gate-passwort-789';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
function hosted() { const m = createIdbMock(); return { ...ladeKern({ indexedDB: m, location: HOSTED }), mock: m }; }

test('[D43-E3] Vorschau mit Daten → IDB bleibt leer (Vorschau-Invariante)', async () => {
  const k = hosted();
  k.V.vorschauDepotErzeugen();
  // Bürgerin trägt in der Vorschau etwas ein.
  const d = k.V.getData();
  d.sektoren.identity = { givenName: 'Neugier' };
  assert.equal(k.V.imVorschau(), true, 'Vorschau-Modus aktiv');
  assert.equal(k.V.vorschauHatDaten(d), true, 'Vorschau trägt Daten');
  const r = await k.V.depotInIdbSichern();
  assert.equal(r, null, 'No-Op in der Vorschau');
  assert.equal((await k.V.VdStore.liste()).length, 0, 'NICHTS in IndexedDB geschrieben');
});

test('[D43-E3] Erst-Eintritt ohne Session → No-Op, IDB leer', async () => {
  const k = hosted();
  // Keine Session, kein Vorschau-Depot — frischer Boot.
  const r = await k.V.depotInIdbSichern();
  assert.equal(r, null);
  assert.equal((await k.V.VdStore.liste()).length, 0, 'kein Schlüssel = kein interner Stand');
});

test('[D43-E3] Dispatcher in Vorschau schreibt nicht intern', async () => {
  const k = hosted();
  k.V.vorschauDepotErzeugen();
  k.V.getData().sektoren.identity = { givenName: 'Neugier' };
  const weg = await k.V.depotInternSichern();   // führt zum Anlege-Pfad, kein Write
  assert.equal(weg, 'vorschau', 'Vorschau → Übernehmen-Pfad, kein interner Save');
  assert.equal((await k.V.VdStore.liste()).length, 0, 'IDB leer geblieben');
});

test('[D43-E3] Positiv-Kontrolle: mit Session öffnet sich das Gate (Stand wird geschrieben)', async () => {
  const k = hosted();
  await k.V.depotAnlegen(PW);
  assert.equal(k.V.imVorschau(), false, 'kein Vorschau-Modus mehr');
  const ts = await k.V.depotInIdbSichern();
  assert.ok(ts, 'mit Session wird geschrieben');
  assert.equal((await k.V.VdStore.liste()).length, 1, 'genau ein Anker-Record');
});
