'use strict';
/* EMPFAENGER-QR-OHNE-SPERRE (HOCH, 26.09.2026, gefunden beim Ausbau von G2): „Erst vereinbaren, dann der Auszug" (MyTerms Teil D)
   sperrte den Empfängerkreis-Auszug als DATEI (empfaengerDateiHerausgeben ruft vereinbarungFreigabeHolen('empfaengerkreis')), aber
   derselbe Auszug als QR-Code (empfaengerQrHerausgeben) ging an der Sperre vorbei: bei festgelegter Bedingung und ohne Freigabe kam
   trotzdem eine Lese-URL mit dem verschlüsselten Auszug heraus. Die Regel: jeder Weg zum selben Auszug geht durch dasselbe Tor. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function depotMitKreisUndBedingung({ bedingung }) {
  const { V } = ladeKern();
  await V.depotAnlegen('empfaenger-qr-sperre-pw-2026');
  V.akteurSelbstErklaeren('Testerin');
  V.sektorFeldSetzen('identity', 'givenName', 'Anna');
  await V.empfaengerkreisSetzen({ id: 'k1', name: 'Tochter', bausteine: ['notfall'] });
  if (bedingung) {
    V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [] });
    await V.bedingungFestlegen('SD-BASE', 'PDC-AI');
  }
  // Die Person bricht den Vereinbarungs-Dialog ab (onAbbrechen) — genau der Fall „keine Freigabe".
  const dialoge = [];
  V.ui.modal = (o) => { dialoge.push(o.titel); if (o.onAbbrechen) o.onAbbrechen(); };
  return { V, kreis: V.empfaengerkreisFinden('k1'), dialoge };
}

/* Ein Weg, der ohne Freigabe trotzdem ausliefert, hat das Tor nicht. */
test('[Empfänger·Sperre·Rot-Beweis] bei festgelegter Bedingung ohne Freigabe liefert KEIN Weg den Auszug — weder Datei noch QR', async () => {
  const { V, kreis, dialoge } = await depotMitKreisUndBedingung({ bedingung: true });
  const datei = await V.empfaengerDateiHerausgeben(kreis, 'empfaenger-pw-12');
  assert.equal(datei.weg, 'abgebrochen', 'Datei: die Sperre hält (Bestand)');
  const qr = await V.empfaengerQrHerausgeben(kreis, 'empfaenger-pw-12');
  assert.ok(!qr.url, 'QR: ohne Freigabe keine Lese-URL mit Auszug — heute kam eine heraus');
  assert.equal(qr.abgebrochen, true);
  assert.equal(dialoge.length, 2, 'beide Wege haben nach der Vereinbarung gefragt');
});

test('[Empfänger·Sperre·Gegenprobe] ohne Festlegung laufen beide Wege wie vorher', async () => {
  const { V, kreis } = await depotMitKreisUndBedingung({ bedingung: false });
  const qr = await V.empfaengerQrHerausgeben(kreis, 'empfaenger-pw-12');
  assert.equal(qr.zuGross, false);
  assert.ok(qr.url && qr.url.startsWith(V.EMPFAENGER_QR_LESE_URL), 'die Lese-URL kommt');
});

test('[Empfänger·Sperre] Datei und QR rufen dasselbe Tor mit demselben Weg-Namen', () => {
  const { src } = ladeKern();
  const rumpf = (name) => { const a = src.indexOf('async function ' + name + '('); return src.slice(a, src.indexOf('\n}\n', a)); };
  for (const name of ['empfaengerDateiHerausgeben', 'empfaengerQrHerausgeben']) {
    assert.match(rumpf(name), /vereinbarungFreigabeHolen\('empfaengerkreis'\)/, name);
  }
});
