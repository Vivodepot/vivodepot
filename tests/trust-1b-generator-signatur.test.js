'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Trust-1B Schritt 2a: ERZEUGER signiert das Template (Generator, additiv)
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-037 / Trust-1B: Der Anbieter signiert sein Template mit dem im Browser
   erzeugten Private-Key (den die TA nie sieht). baueSubmissionSigniert legt das
   anbieter-signierte templateJws als separates Artefakt ins Submission-Paket
   (Lieferform a) und prüft selbst, dass es gegen publicKeyJwk desselben Pakets
   verifiziert. Additiv: ohne Key kein templateJws (Plain-template bleibt).
   JWS-Block von aussen genutzt (T-A-08 byte-identisch).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const REPO = path.join(__dirname, '..');
const nativ = (x) => Array.from(x || [], String);

function gueltigeStammdaten() {
  return {
    anbieterName: 'Seniorenresidenz Musterstadt', rechtsform: 'GmbH', ustId: 'DE123456789',
    strasse: 'Lindenallee 12', plz: '12345', ort: 'Musterstadt', land: 'Deutschland',
    kontaktName: 'Petra Beispiel', kontaktFunktion: 'Pflegedienstleitung',
    kontaktEmail: 'p.beispiel@seniorenresidenz-musterstadt.example.de', kontaktTelefon: '+49 30 1234567',
    bereich: 'health',
    useCase: 'Aufnahmebogen fuer neue Bewohnerinnen und Bewohner: Erfassung von Stammdaten und Pflegegrad zur Uebergabe an das Pflegeteam.',
  };
}
function felder() {
  return [{ feldname: 'Vollständiger Name', feldtyp: 'text', pflicht: true, bereich: 'identity' }];
}
async function baueState(V) {
  const paar = await V.erzeugeSchluesselpaarRoh();
  const anbieter = V.baueAnbieter(gueltigeStammdaten());
  const state = { anbieter, publicKeyJwk: paar.publicJwk, felder: felder(), ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false };
  return { paar, state };
}

test('2a-1 Positiv: Generator signiert → templateJws verifiziert gegen publicKeyJwk desselben Pakets', async () => {
  const { V } = ladeGenerator();
  const { paar, state } = await baueState(V);
  const paket = await V.baueSubmissionSigniert(state, paar.privateJwk);
  assert.ok(paket.templatesJws && paket.templatesJws[0], 'templatesJws als separates Artefakt im Paket');
  // Unabhängig gegenprüfen: gegen den publicKeyJwk DESSELBEN Pakets verifizierbar.
  const verifyKey = await V._jwsImportVerifyKey(paket.publicKeyJwk);
  const res = await V._verifyJWS(paket.templatesJws[0], verifyKey, {});
  assert.equal(res.gueltig, true, 'templateJws gültig gegen publicKeyJwk: ' + res.grund);
  // JWS-Nutzlast = das Template-Objekt.
  assert.equal(JSON.stringify(res.nutzlast.felder), JSON.stringify(paket.templates[0].felder), 'signierte Nutzlast = template');
});

test('2a-2 Selbst-Prüfung: FALSCHER Private-Key (≠ publicKeyJwk) → baueSubmissionSigniert wirft', async () => {
  const { V } = ladeGenerator();
  const { state } = await baueState(V);              // publicKeyJwk gehört zu Keypair A
  const fremd = await V.erzeugeSchluesselpaarRoh();  // signiert aber mit Keypair B
  await assert.rejects(
    () => V.baueSubmissionSigniert(state, fremd.privateJwk),
    /passt nicht zum Public-Key/,
    'falscher Key wird beim Erzeugen gefangen, nicht erst beim Bürger'
  );
});

test('2a-3 Additiv: ohne Private-Key kein templateJws — Plain-template bleibt', async () => {
  const { V } = ladeGenerator();
  const { state } = await baueState(V);
  const paket = await V.baueSubmissionSigniert(state, null);
  assert.ok(!paket.templatesJws, 'ohne Key kein templatesJws');
  assert.ok(paket.templates && paket.templates[0] && Array.isArray(paket.templates[0].felder), 'Plain-template vorhanden');
  assert.equal(paket.templates[0].felder.length, 1, 'Plain-template unverändert');
});

test('2a-4 Schema: Paket MIT templateJws ist schema-konform (eingebettet + Datei)', async () => {
  const { V } = ladeGenerator();
  const { paar, state } = await baueState(V);
  const paket = await V.baueSubmissionSigniert(state, paar.privateJwk);
  assert.ok(paket.templatesJws && paket.templatesJws[0]);
  assert.deepEqual(nativ(V.validiereSubmission(paket)), [], 'eingebettetes Schema akzeptiert templatesJws');
  const dateiSchema = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/submission-schema.json'), 'utf8'));
  assert.deepEqual(nativ(V._validateSchema(dateiSchema, paket)), [], 'Datei-Schema akzeptiert templateJws');
});
