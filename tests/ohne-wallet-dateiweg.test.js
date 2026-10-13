'use strict';
/* Der Weg ohne Wallet: dieselben Nachweise gehen als Datei hinaus (Grundsatz „niemand zurückgelassen“, 08.10.2026).
   Die Proben, auf die tests/ohne-wallet-gleichwertig.test.js je Wallet-Stelle zeigt: der Datei-Erzeuger
   (`formatExportInhalt` → `formatAusgabeErzeugen`) liefert die SD-JWT-VC-Form, und der Download je Profil
   (`flowFormatExport`) läuft ohne Wurf. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const SD_JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*~/;

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('Ohne-Wallet-Probe-2026!');
  k.V.akteurSelbstErklaeren('Anna Probe');
  k.V.betreteApp();
  k.V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  k.V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  return k;
}

test('[Ohne Wallet·Datei] der Identitäts-Nachweis geht als Datei hinaus, ohne Wallet', async () => {
  const { V } = await frischMitDepot();
  const def = V.EXPORT_FORMATE.find((d) => d.id === 'sd-jwt-vc-identitaet');
  assert.ok(def && def.kompakt, 'Vorbedingung: das SD-JWT-VC-Format steht in der Registry');
  const inhalt = await V.formatExportInhalt(def, {});
  assert.equal(typeof inhalt, 'string');
  assert.match(inhalt, SD_JWT, 'kompakte Form <JWT>~<Disclosures>~');
  const nutzlast = JSON.parse(Buffer.from(inhalt.split('.')[1], 'base64url').toString('utf8'));
  assert.ok(typeof nutzlast.vct === 'string' && nutzlast.vct.length > 0, 'trägt vct');
});

test('[Ohne Wallet·Datei] der Download je Wallet-Profil läuft ohne Wurf', async () => {
  const { V } = await frischMitDepot();
  for (const id of ['sd-jwt-vc-identitaet', 'sd-jwt-vc-finanzen']) {
    assert.ok(V.EXPORT_FORMATE.some((d) => d.id === id), id + ' in der Registry');
    assert.doesNotThrow(() => V.flowFormatExport(id), id);
  }
});

test('[Ohne Wallet·Datei·Rot-Beweis] die Formprüfung fällt bei der rohen JSON-Form, die Probe misst also die SD-JWT-Ausgabe', async () => {
  const { V } = await frischMitDepot();
  const def = V.EXPORT_FORMATE.find((d) => d.id === 'sd-jwt-vc-identitaet');
  assert.doesNotMatch(JSON.stringify(def.baue({})), SD_JWT, 'ohne den Datei-Erzeuger keine kompakte Form');
  assert.match(await V.formatExportInhalt(def, {}), SD_JWT, 'Gegenprobe: mit ihm schon');
});
