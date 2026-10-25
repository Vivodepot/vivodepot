'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Befund SDJWT-COUNTRY-CODE-DE (HOCH, 03.10.2026) — die SD-JWT-Identität schrieb `address.country_code: 'DE'` fest.
   Abnahme im Befund: Probe am AUSGABEWEG (der Payload, den der Exportkanal liefert), in allen vier Produkten, kein fest gesetztes
   Land; Fix-Richtung wie in der vCard: Feld weglassen. Rot-Beweis: derselbe Kern mit dem alten Literal fällt.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { PRODUKTE } = require('../tools/lib/vier-produkte.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

async function payload(V) {
  await V.depotAnlegen('sdjwt-land-probe-2026!');
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'street', 'Lindenweg');
  V.sektorFeldSetzen('identity', 'houseNumber', '4a');
  V.sektorFeldSetzen('identity', 'postalCode', '80331');
  V.sektorFeldSetzen('identity', 'city', 'München');
  return V.kernAPI.exportiere('sd-jwt-vc-identitaet', { sensibel: true });
}
const landFunde = (vc) => JSON.stringify(vc).match(/"(?:DE|DEU)"/g) || [];

for (const p of PRODUKTE) {
  test('[SD-JWT·Land·' + p.slug + '] der Payload trägt die Anschrift, aber kein fest gesetztes Land', async () => {
    const vc = await payload(ladeKern({ produkt: p.slug }).V);
    assert.ok(vc && vc.claims && vc.claims.address, p.slug + ': Positivkontrolle — die Anschrift ist im Payload');
    assert.equal(vc.claims.address.postal_code, '80331');
    assert.ok(!('country_code' in vc.claims.address), p.slug + ': kein country_code');
    assert.deepEqual(landFunde(vc), [], p.slug + ': kein Landescode als Wert im Payload');
  });
}

test('[SD-JWT·Land·Rot-Beweis] ein Kern mit dem alten Literal liefert „DE“ und fällt', async () => {
  const zeile = '  const adr = {};';
  assert.equal(KERN.split(zeile).length, 2, 'Vorbedingung: die Zeile steht genau einmal im Kern');
  const pfad = path.join(os.tmpdir(), 'sdjwt-land-rot-' + process.pid + '.html');
  fs.writeFileSync(pfad, KERN.replace(zeile, "  const adr = { country_code: 'DE' };"));
  try {
    const vc = await payload(ladeKern({ htmlPfad: pfad, backen: true }).V);
    assert.equal(vc.claims.address.country_code, 'DE');
    assert.notDeepEqual(landFunde(vc), [], 'die Probe oben wäre rot');
  } finally { fs.rmSync(pfad, { force: true }); }
});
