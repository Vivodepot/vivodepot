'use strict';
/* Zwei überlappende interne Speicherläufe (Anlegen + Autosave) machten sich gegenseitig zum
   Konflikt: beide sahen "kein Stand", schrieben kurz nacheinander, der Konfliktcheck des nächsten
   Laufs fand einen anderen Stempel als den gemerkten — "Speichern fehlgeschlagen" ohne echten Fehler
   (Firefox-Abnahme s1-dateisignal, ~1 von 8 Läufen unter Last). depotInternSichern reiht Läufe:
   der Speicher sieht nie zwei Prüf-Lesevorgänge hintereinander, bevor der erste Lauf geschrieben hat. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const warte = () => new Promise((r) => setTimeout(r, 5));

test('[Rot-Beleg] überlappende interne Speicherläufe werden hintereinander gestellt, nie ineinander', async () => {
  const { V } = ladeKern({ indexedDB: createIdbMock(), location: HOSTED });
  await V.depotAnlegen('ueberlappung-pw-731');
  await V._internAutoSpeichernAbschluss();
  const folge = [];
  const holen = V.VdStore.holen.bind(V.VdStore);
  const setzen = V.VdStore.setzen.bind(V.VdStore);
  V.VdStore.holen = async (id) => { folge.push('holen'); await warte(); return holen(id); };
  V.VdStore.setzen = async (rec) => { folge.push('setzen'); await warte(); return setzen(rec); };
  const r = await Promise.all([
    V.depotInternSichern({ still: true }),
    V.depotInternSichern({ still: true }),
    V.depotInternSichern({ still: true }),
  ]);
  assert.deepEqual(r, ['intern', 'intern', 'intern']);
  assert.deepEqual(folge, ['holen', 'setzen', 'holen', 'setzen', 'holen', 'setzen']);
  assert.notEqual(V.saveStatusModell().zustand, 'fehlgeschlagen');
});
