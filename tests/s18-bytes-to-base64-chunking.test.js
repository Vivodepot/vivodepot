'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — S18 („S16 und S18", 09.08.2026): `bytesToBase64` wird
   chunkweise (dieselbe `_bytesAlsBinaerstring`, S17) statt
   `String.fromCharCode.apply(null, arr)` über das ganze Array.

   GEMESSEN vor dem Bau (Base64-Grenzen-Bericht, 09.08.2026): Chromium/Node
   scheiterten am alten `.apply`-Verfahren ab ~123–124 KB — eine DEUTLICH
   niedrigere Bruchstelle als S17s ~129 MB, weil `Function.prototype.apply`
   die Argumentliste selbst begrenzt (nicht die Array-Länge). Firefox erst
   ab ~500 KB.

   `bytesToBase64` steht physisch INNERHALB des gepinnten VdCrypto-Blocks
   (Zeile 226 in `vivodepot-krypto-kern-PORT-VERBATIM.js`) — die Behebung
   ändert denselben Pin wie S17, in allen fünf Trägern (Kern, Lese-App,
   VC-Issuer, Template-Generator, kanonische PORT-VERBATIM.js-Quelle).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

// Referenzimplementierung des ALTEN Verfahrens — nur zum Vergleich, nicht Teil des Kerns.
function altesVerfahren(bytes, btoaFn) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoaFn(String.fromCharCode.apply(null, arr));
}

test('[S18] bytesToBase64 ist byte-identisch zum alten .apply-Verfahren', () => {
  const { V } = ladeKern();
  for (const n of [0, 1, 16, 8191, 8192, 8193, 100000, 500000]) {
    const bytes = crypto.randomBytes(n);
    const neu = V.bytesToBase64(bytes);
    const alt = Buffer.from(altesVerfahrenBinaerstring(bytes), 'binary').toString('base64');
    assert.equal(neu, alt, n + ' Bytes: weicht vom alten Verfahren ab');
  }
});

// Baut denselben rohen Binärstring wie das alte `.apply`-Verfahren (ohne dessen Bruchstelle
// selbst zu provozieren) — dient nur als lesbarer Vergleichswert für Buffer-Base64.
function altesVerfahrenBinaerstring(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

test('[S18·Rotmachbarkeit] das alte .apply-Verfahren bricht real an der bekannten Stelle — der Vergleich oben ist nicht ohne Aussage', () => {
  const { document: dok } = ladeKern();
  const btoaFn = (typeof dok.defaultView !== 'undefined' && dok.defaultView.btoa) || global.btoa || ((s) => Buffer.from(s, 'binary').toString('base64'));
  assert.throws(() => altesVerfahren(new Uint8Array(200 * 1024), btoaFn), /call stack|Maximum|arguments/i,
    'das alte .apply-Verfahren muss bei 200 KB real scheitern — sonst belegt der Byte-Identitäts-Vergleich oben nichts');
});

test('[S18] bytesToBase64 übersteht die alte Bruchstelle (500 KB und mehr, Firefox-Kipppunkt eingeschlossen)', () => {
  const { V } = ladeKern();
  for (const kb of [200, 500, 1000]) {
    assert.doesNotThrow(() => V.bytesToBase64(new Uint8Array(kb * 1024)), kb + ' KB sollte nicht mehr scheitern');
  }
});

test('[S18] encryptData/depotSerialisieren nutzen weiterhin dieselbe korrekte Kodierung (Rundlauf unverändert)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('s18-chunking-pw');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Testperson');
  const umschlag = await V.depotSerialisieren();
  const K2 = ladeKern();
  await K2.V.depotLaden(umschlag, 's18-chunking-pw');
  assert.equal(K2.V.getData().sektoren.identity.givenName, 'Testperson', 'Rundlauf über die neue bytesToBase64-Kodierung bleibt korrekt');
});
