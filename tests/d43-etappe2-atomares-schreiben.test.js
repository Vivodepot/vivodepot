'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 2: Atomares Schreiben / Datenverlust-Schutz
   ────────────────────────────────────────────────────────────────────────
   Beweist die native Transaktions-Atomarität (kein halb-geschriebener Record):
   (a) Quota-/Disk-Full-Abbruch beim Schreiben → die Operation wirft (tx.onabort).
   (b) Der vorherige Stand bleibt VOLLSTÄNDIG intakt und ladbar.
   (c) Kein Halb-Zustand: genau ein (alter) Record im Store, keine Waise.
   Die Bau-1-tmp-Schlüssel-Choreografie wird NICHT nachgebaut — IDB liefert
   Atomarität nativ über die readwrite-Transaktion.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'atomar-passwort-456';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };

test('[D43-E2] Quota-Abbruch beim Schreiben wirft, alter Stand bleibt intakt (atomar)', async () => {
  const opts = {};
  const mock = createIdbMock(opts);
  const k = ladeKern({ indexedDB: mock, location: HOSTED });
  await k.V.depotAnlegen(PW);

  // 1) Erster Save gelingt.
  k.V.getData().sektoren.identity = { givenName: 'Erst' };
  await k.V.depotInIdbSichern();
  assert.equal((await k.V.VdStore.liste()).length, 1, 'ein Record nach erstem Save');

  // 2) Zweiter Save scheitert (Quota) — darf den alten Record NICHT beschädigen.
  opts.fehlerBeiPut = true;
  k.V.getData().sektoren.identity = { givenName: 'Zweit' };
  await assert.rejects(() => k.V.depotInIdbSichern(), /Quota|abgebrochen/i, 'Abbruch wirft kontrolliert');

  // 3) Kein Halb-Zustand: weiterhin genau ein Record.
  opts.fehlerBeiPut = false;
  const liste = await k.V.VdStore.liste();
  assert.equal(liste.length, 1, 'kein halb-geschriebener / verwaister Record');

  // 4) Der ALTE Stand ('Erst') ist unversehrt ladbar.
  const k2 = ladeKern({ indexedDB: createIdbMock({ _dbs: mock._dbs }), location: HOSTED });
  await k2.V.depotAusIdbLaden(PW);
  assert.equal(k2.V.getData().sektoren.identity.givenName, 'Erst',
    'alter Stand vollständig intakt nach fehlgeschlagenem Schreiben');
});

test('[D43-E2] tx.onabort-Pfad: setzen lehnt bei sofortiger Schreib-Sperre ab', async () => {
  const mock = createIdbMock({ fehlerBeiPut: true });
  const k = ladeKern({ indexedDB: mock, location: HOSTED });
  await assert.rejects(
    () => k.V.VdStore.setzen({ id: 'x', cipherBlob: 'X', gespeichert_am: 'T' }),
    /Quota|abgebrochen/i,
    'sofortige Schreib-Sperre → Reject über tx.onabort',
  );
  assert.equal((await k.V.VdStore.liste()).length, 0, 'nichts geschrieben');
});
