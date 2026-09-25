'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — 1E signierte Standard-Vorlagen: amtlicher `wortlaut` + `wortlautQuelle`
   ────────────────────────────────────────────────────────────────────────
   Empfänger-seitig (validateTemplate, 1C) lernt die neue, OPTIONALE Eigenschaft
   `wortlaut` (unveränderter amtlicher Wortlaut, § 5 UrhG) — getrennt von `felder`
   (Eingabestruktur) und von Hilfetext (eigene Lizenz-Realität). Ist `wortlaut`
   gesetzt, ist `wortlautQuelle` (Behörde/Titel/Lizenz) Pflicht und der Block ist
   größenbegrenzt. End-to-end: ein wortlaut-tragendes Template, mit dem Test-Key
   signiert (1B-Muster), verifiziert und wird vom Validator akzeptiert — der
   Wortlaut wird byte-gleich durch die Signatur getragen.
   KEY tabu: hier ausschließlich Test-Key/Sentinel, nie der Produktiv-Key.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const FELD = { feldname: 'Dokument vorhanden?', feldtyp: 'jaNein', pflicht: false, bereich: 'vorsorge' };
const QUELLE = { behoerde: 'Bundesministerium der Justiz (BMJ)', titel: 'Textbausteine Patientenverfügung',
                 lizenz: 'amtliches Werk § 5 UrhG, unveränderte Übernahme' };

// ── Validator (1C) lernt wortlaut/wortlautQuelle ─────────────────────────────
test('1E ok: gültiger wortlaut + wortlautQuelle → null (gültig)', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [FELD], wortlaut: 'Eingangsformel: Ich bestimme hiermit …', wortlautQuelle: QUELLE }), null);
});

test('1E additiv: Template OHNE wortlaut bleibt gültig (Rückwärts-Kompatibilität)', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [FELD] }), null);
});

test('1E: wortlaut ohne wortlautQuelle → Grund (Herkunft/Lizenz Pflicht)', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [FELD], wortlaut: 'amtlicher Text' }), /wortlautQuelle/);
});

test('1E: wortlaut kein String → Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [FELD], wortlaut: 42, wortlautQuelle: QUELLE }), /kein Text/);
});

test('1E: wortlaut über dem Cap (60 KB) → Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [FELD], wortlaut: 'a'.repeat(60 * 1024 + 1), wortlautQuelle: QUELLE }), /zu lang/);
});

test('1E: wortlautQuelle ohne behoerde/titel/lizenz → jeweils Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [FELD], wortlaut: 't', wortlautQuelle: { titel: 'T', lizenz: 'L' } }), /behoerde/);
  assert.match(V.validateTemplate({ felder: [FELD], wortlaut: 't', wortlautQuelle: { behoerde: 'B', lizenz: 'L' } }), /titel/);
  assert.match(V.validateTemplate({ felder: [FELD], wortlaut: 't', wortlautQuelle: { behoerde: 'B', titel: 'T' } }), /lizenz/);
});

test('1E ok: wortlautQuelleBroschuere (zweite Quelle) gültig → null', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [FELD], wortlaut: 'amtlicher Text', wortlautQuelle: QUELLE,
    wortlautQuelleBroschuere: { behoerde: 'Bundesministerium der Justiz (BMJ)', titel: 'Broschüre „Patientenverfügung“', url: 'https://www.bmj.de/x.html' } }), null);
});

test('1E: wortlautQuelleBroschuere ohne url → Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [FELD], wortlaut: 't', wortlautQuelle: QUELLE,
    wortlautQuelleBroschuere: { behoerde: 'BMJ', titel: 'T' } }), /wortlautQuelleBroschuere\.url/);
});

// ── End-to-end: Signatur-Kette trägt den Wortlaut (Test-Key, KEY tabu) ────────
test('1E e2e: wortlaut-Template mit Test-Key signiert → verifiziert + Validator akzeptiert, Wortlaut byte-gleich', async () => {
  const { V } = ladeKern();
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const tpl = {
    felder: [FELD],
    wortlaut: 'Eingangsformel: Ich bestimme hiermit für den Fall, dass ich meinen Willen nicht mehr bilden oder verständlich äußern kann …',
    wortlautQuelle: QUELLE,
  };
  const jws = await V._signJWS(tpl, kp.privateKey, {});
  const res = await V._verifyJWS(jws, kp.publicKey, {});
  assert.equal(res.gueltig, true, 'wortlaut-Template-JWS gültig: ' + (res.grund || ''));
  assert.equal(V.validateTemplate(res.nutzlast), null, 'geprüftes wortlaut-Template ist gültig');
  assert.equal(res.nutzlast.wortlaut, tpl.wortlaut, 'wortlaut wird byte-gleich durch die Signatur getragen');
});
