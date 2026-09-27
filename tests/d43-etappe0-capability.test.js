'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 0: Capability-Gerüst + Speicher-Abstraktion
   ────────────────────────────────────────────────────────────────────────
   Prüft die Fundamente OHNE Funktionsänderung:
   (a) Fähigkeits-Erkennung ist defensiv und wirft nie; ohne injizierte Globals
       (Node-Default) → kein IndexedDB, kein SW, Datei-Modus.
   (b) Modus-Weiche: file:// bleibt Datei-Modus; gehostet+IDB → interner Speicher.
       Reine Capability-/Origin-Detektion, KEIN UA-Sniffing.
   (c) VdStore In-Memory-Backend (Rückfall): setzen/holen/liste/loeschen.
   (d) VdStore IndexedDB-Backend (echte IDB-Code-Pfade gegen den Mock):
       Roundtrip + Persistenz über close()/reopen (Backend öffnet je Operation neu).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

test('[D43-E0] Capability: Node-Default → kein IDB/SW, kein file://, Datei-Modus', () => {
  const { V } = ladeKern();
  assert.equal(V.hatIndexedDB(), false, 'ohne indexedDB-Global → false');
  assert.equal(V.hatServiceWorker(), false, 'ohne navigator → false');
  assert.equal(V._istDateiHerkunft(), false, 'ohne location → nicht file://');
  assert.equal(V.internerSpeicherModus(), false, 'ohne IDB → Datei-Modus (Erstklass)');
});

// GEÄNDERT („die pauschale Flagge weicht der Probe", 12.09.2026): vorher stand
// hier `internerSpeicherModus() === false` für file:// — pauschal, ohne dass die echte
// Funktionsprobe je gefragt wurde. Live gemessen (Playwright, Chromium/Firefox/WebKit, echter
// Prozess-Neustart mit demselben Profil, Bericht sichern-je-browser-je-lauf-2026-09-12.md):
// IndexedDB funktioniert unter file:// und übersteht einen echten Neustart. Die Modus-Weiche
// selbst kennt file:// darum nicht mehr — nur `hatIndexedDB()` und das Probe-Ergebnis
// entscheiden, s. die zwei Proben direkt danach für beide Richtungen der Probe selbst.
test('[D43-E0] Capability: file:// UND gehostet verhalten sich an der Modus-Weiche gleich, wenn IDB da ist', () => {
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'file:', href: 'file:///x.html' } });
  assert.equal(V.hatIndexedDB(), true, 'IDB injiziert → erkannt');
  assert.equal(V._istDateiHerkunft(), true, 'file:// bleibt korrekt erkannt (Capability-Detektion selbst unverändert)');
  assert.equal(V.internerSpeicherModus(), true, 'file:// UND IDB vorhanden → interner Speicher, kein pauschaler Fang mehr');
});

test('[D43-E0] Capability: gehostet (https) + IDB → interner Speicher-Modus', () => {
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://example/x' }, navigator: { serviceWorker: {} } });
  assert.equal(V.hatIndexedDB(), true);
  assert.equal(V.hatServiceWorker(), true, 'serviceWorker im navigator erkannt');
  assert.equal(V._istDateiHerkunft(), false);
  assert.equal(V.internerSpeicherModus(), true, 'gehostet + IDB → interner Speicher');
});

test('[D43-E0] VdStore In-Memory-Backend: setzen/holen/liste/loeschen', async () => {
  const { V } = ladeKern();
  assert.equal(V.VdStore.art(), 'speicher', 'ohne IDB → In-Memory-Backend');
  const rec = { id: 'anker', cipherBlob: '{"kryptoVersion":3}', gespeichert_am: '2026-06-12T00:00:00.000Z' };
  await V.VdStore.setzen(rec);
  const back = await V.VdStore.holen('anker');
  assert.equal(JSON.stringify(back), JSON.stringify(rec), 'Roundtrip identisch');
  assert.notEqual(back, rec, 'Tiefkopie — keine geteilte Referenz');
  assert.equal(await V.VdStore.holen('fehlt'), null, 'unbekannte id → null');
  const liste = await V.VdStore.liste();
  assert.equal(liste.length, 1);
  await V.VdStore.loeschen('anker');
  assert.equal(await V.VdStore.holen('anker'), null, 'nach loeschen weg');
});

test('[D43-E0] VdStore IndexedDB-Backend: Roundtrip gegen den Mock', async () => {
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://e/x' } });
  assert.equal(V.VdStore.art(), 'indexeddb', 'mit IDB-Global → IndexedDB-Backend');
  const rec = { id: 'anker', cipherBlob: '{"kryptoVersion":3,"ct":"abc"}', gespeichert_am: '2026-06-12T10:00:00.000Z' };
  const key = await V.VdStore.setzen(rec);
  assert.equal(key, 'anker', 'setzen liefert die id');
  const back = await V.VdStore.holen('anker');
  assert.equal(JSON.stringify(back), JSON.stringify(rec), 'IDB-Roundtrip identisch (cipherBlob + Zeitmarke)');
  const liste = await V.VdStore.liste();
  assert.equal(liste.length, 1, 'getAll über den Store');
});

test('[D43-E0] VdStore IndexedDB: Stand überlebt close()+reopen (eigene Operationen öffnen neu)', async () => {
  const mock = createIdbMock();
  const { V } = ladeKern({ indexedDB: mock, location: { protocol: 'https:', href: 'https://e/x' } });
  await V.VdStore.setzen({ id: 'anker', cipherBlob: 'X', gespeichert_am: 'T1' });
  // Jede VdStore-Operation öffnet die DB frisch und schließt sie wieder (db.close()).
  // holen() trifft also auf eine NEU geöffnete DB → echter Schließen+Öffnen-Beleg.
  const back = await V.VdStore.holen('anker');
  assert.equal(back.cipherBlob, 'X', 'Record überlebt das Schließen/Wieder-Öffnen der DB');
  // Ein zweiter, frisch geladener Kern auf DEMSELBEN Mock-Persistenzspeicher sieht den Stand.
  const zwei = ladeKern({ indexedDB: createIdbMock({ _dbs: mock._dbs }), location: { protocol: 'https:', href: 'https://e/x' } });
  const wieder = await zwei.V.VdStore.holen('anker');
  assert.equal(wieder.cipherBlob, 'X', 'Stand sichtbar in frisch geladener Sitzung (Persistenz)');
});
