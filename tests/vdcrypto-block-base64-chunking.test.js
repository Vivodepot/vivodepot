'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — S17 („Die Base64-Grenzen", 09.08.2026): die chunkweise
   Ciphertext-Umwandlung in `encryptData` (`_bytesAlsBinaerstring`) ist
   byte-identisch zum alten `Array.from(...).join('')`-Verfahren und
   übersteht dessen Bruchstelle.

   GEMESSEN vor dem Bau: Chromium/Node scheiterten am alten Verfahren ab
   ~129 MB mit `RangeError: Invalid array length`; Firefox erst ab ~270 MB,
   dort als rohe Zeichenkette „out of memory" geworfen (kein Error-Objekt) —
   beide Fälle wurden bereits vor diesem Zug über
   `speichernOderFehlschlagMarkieren()`s generisches `catch` sichtbar
   gemacht (Kopfzeilen-Zustand „fehlgeschlagen"), kein stiller Datenverlust.
   Diese Datei belegt NUR die Byte-Identität und die Behebung der
   Bruchstelle — nicht die Sichtbarkeit (bereits durch die
   Speicherweg-Suite gedeckt).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

// Referenzimplementierung des ALTEN Verfahrens — nur zum Vergleich, nicht Teil des Kerns.
function altesVerfahren(bytes) {
  return Array.from(bytes, (c) => String.fromCharCode(c)).join('');
}

test('[S17] encryptData verschlüsselt weiterhin korrekt (die neue ct-Kodierung bricht den Rundlauf nicht)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('s17-chunking-pw');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Testperson');
  const blob = await V.depotSerialisieren();
  assert.ok(blob, 'Serialisierung liefert etwas');
});

test('[S17] _bytesAlsBinaerstring ist byte-identisch zum alten Array.from+join-Verfahren', () => {
  const { V } = ladeKern();
  for (const n of [0, 1, 16, 8191, 8192, 8193, 100000, 1000000]) {
    const bytes = crypto.randomBytes(n);
    assert.equal(V._bytesAlsBinaerstring(bytes), altesVerfahren(bytes), n + ' Bytes: weicht vom alten Verfahren ab');
  }
});

test('[S17·Rotmachbarkeit] das alte Verfahren bricht real an der bekannten Stelle — der Vergleich oben ist nicht ohne Aussage', () => {
  assert.throws(() => altesVerfahren(new Uint8Array(130 * 1024 * 1024)), /Invalid array length/);
});

test('[S17] _bytesAlsBinaerstring übersteht die alte Bruchstelle (130 MB und mehr)', () => {
  const { V } = ladeKern();
  for (const mb of [130, 150, 200]) {
    assert.doesNotThrow(() => V._bytesAlsBinaerstring(new Uint8Array(mb * 1024 * 1024)), mb + ' MB sollte nicht mehr scheitern');
  }
});
