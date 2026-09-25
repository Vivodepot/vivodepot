'use strict';
/* ════════════════════════════════════════════════════════════════════════
   SD-JWT in kompakter Form: was Vivodepot ausgibt, kommt wieder herein (17.09.2026, U2-ADR-155 Punkt 11)
   ────────────────────────────────────────────────────────────────────────
   Import—Verwahrung—Ausgabe. Die eigene kompakte Ausgabe (eudiwSdJwtVcSerialisieren, alg:none) liest der
   Kern wie die JSON-Selbstauskunft: dieselben Werte. Eine signierte Form wird benannt abgewiesen, nichts
   übernommen — die Prüfung eines Ausstellers bleibt nach U2-ADR-080 zu.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const b64u = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');
const werte = (plan) => plan.zeilen.map((z) => [z.sektorId, z.feldId, JSON.stringify(z.neuWert)]).sort();

async function depot(V) {
  await V.depotAnlegen('sd-jwt-rundlauf-lang-genug-2026');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Erika');
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  V.sektorFeldSetzen('identity', 'birthDate', '1964-08-12');
  V.sektorFeldSetzen('identity', 'streetAddress', 'Lindenweg 3');
}

test('[SD-JWT·Rundlauf] eigene kompakte Ausgabe → Einlesen → dieselben Werte wie die JSON-Selbstauskunft', async () => {
  const { V } = ladeKern();
  await depot(V);
  const vc = V.sdJwtVcIdentitaet({});
  const { serialisierung } = await V.eudiwSdJwtVcSerialisieren(vc);
  assert.match(serialisierung, /~$/);
  const def = V.importFormatFuerId('sd-jwt-vc-identitaet');
  assert.equal(def.erkennen(serialisierung), true, 'die kompakte Form wird als Identitäts-Nachweis erkannt');
  const kompakt = V.importPlan('sd-jwt-vc-identitaet', serialisierung);
  const json = V.importPlan('sd-jwt-vc-identitaet', JSON.stringify(vc));
  assert.ok(!kompakt.ungueltig);
  assert.ok(kompakt.zeilen.length >= 4, 'Werte kommen an');
  assert.deepEqual(werte(kompakt), werte(json));
  assert.ok(werte(kompakt).some((w) => w[1] === 'givenName' && w[2] === '"Erika"'));
});

test('[SD-JWT·Rot-Beweis] eine signierte kompakte Form wird benannt abgewiesen, nichts übernommen', async () => {
  const { V } = ladeKern();
  await depot(V);
  const kopf = b64u({ alg: 'ES256', typ: 'dc+sd-jwt' });
  const nutz = b64u({ vct: 'urn:vivodepot:identitaet', iss: 'https://aussteller.example', _sd: [] });
  const signiert = kopf + '.' + nutz + '.' + b64u('signatur') + '~' + b64u(['salz', 'given_name', 'Fremd']) + '~';
  const def = V.importFormatFuerId('sd-jwt-vc-identitaet');
  assert.equal(def.erkennen(signiert), true, 'erkannt, damit die Absage benannt ist');
  const plan = V.importPlan('sd-jwt-vc-identitaet', signiert);
  assert.equal(plan.ungueltig, true);
  assert.equal(plan.grund, 'signiert-pruefung-fehlt');
  assert.deepEqual(plan.zeilen, []);
  assert.equal(V.importUngueltigNachricht(plan), V.STRINGS.importSignierterNachweisPruefungFehlt);
  // auch ein unsignierter Kopf mit angehängtem Key-Binding-JWT gilt als signiert
  const mitKb = b64u({ alg: 'none', typ: 'dc+sd-jwt' }) + '.' + nutz + '.~' + b64u(['s', 'given_name', 'X']) + '~' + kopf + '.' + nutz + '.' + b64u('kb');
  assert.equal(V.importPlan('sd-jwt-vc-identitaet', mitKb).grund, 'signiert-pruefung-fehlt');
});

test('[SD-JWT] ein Format-Modul mit leser sd-jwt@1 liest die kompakte Form und weist die signierte benannt ab', async () => {
  const { V } = ladeKern();
  await depot(V);
  const MODUL = { modulTyp: 'format', moduleVersion: 1, format: 'zz-sd-jwt-probe', richtung: 'import', sektor: 'identity',
    label: 'SD-JWT-Probe', sprache: 'de', leser: 'sd-jwt@1', quelle: 'claims', zuordnung: [{ feld: 'givenName', ziel: 'given_name' }] };
  assert.equal(V.formatModulPruefen(MODUL).gueltig, true);
  const kanal = V.formatModulZuImportKanal(MODUL);
  const { serialisierung } = await V.eudiwSdJwtVcSerialisieren({ vct: 'urn:probe', claims: { given_name: 'Erika' } });
  assert.deepEqual(kanal.parse(serialisierung).felder.map((f) => [f.feldId, f.wert]), [['givenName', 'Erika']]);
  const signiert = b64u({ alg: 'EdDSA' }) + '.' + b64u({ vct: 'urn:probe' }) + '.' + b64u('sig') + '~';
  assert.deepEqual(kanal.parse(signiert), { abgewiesen: 'signiert-pruefung-fehlt' });
  assert.equal(kanal.parse('{"given_name":"Erika"}'), null, 'JSON ist nicht die kompakte Form');
});
