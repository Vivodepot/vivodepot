'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Geburtsort in der SD-JWT-Identität (Befund PID-BIRTHPLACE-STRUKTUR, 04.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Das EUDI PID-Rulebook v1.7 §4.1 kennt den Geburtsort nur als Struktur `place_of_birth` mit `country`, `region` und
   `locality`. Nachsehen: Repo eu-digital-identity-wallet/eudi-doc-attestation-rulebooks-catalog, rulebooks/pid/pid-rulebook.md.
   Vivodepot schrieb einen String-Claim `birthplace`, den das Rulebook nicht kennt.

   Gehalten wird:
     · kein Claim `birthplace` in der Identität, gleich was eingetragen ist;
     · steht `place_of_birth` da, ist es ein Objekt mit nur `country`, `region`, `locality`, jedes ein nichtleerer String;
     · aus dem Freitext wird nicht geraten: ein Wert, den die Person nur als Freitext eingetragen hat, erscheint nicht als
       `country` (ein Land ist ein Code, kein Text).
   Dazu die Klasse (Befund PID-KONTAKT-CLAIMNAMEN, 05.11.2026): jeder Claim-Name der Identität steht im Rulebook §4.1.1.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'geburtsort-struktur-pw';
const ERLAUBT = ['country', 'region', 'locality'];

async function identitaet(werte) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Walter Beispiel');
  for (const [k, v] of Object.entries(werte)) V.sektorFeldSetzen('identity', k, v);
  return V.sdJwtVcIdentitaet({ sensibel: true }).claims;
}

function strukturFehler(claims) {
  const fehler = [];
  if (Object.prototype.hasOwnProperty.call(claims, 'birthplace')) fehler.push('birthplace als Claim');
  const p = claims.place_of_birth;
  if (p === undefined) return fehler;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return fehler.concat('place_of_birth kein Objekt');
  for (const [k, v] of Object.entries(p)) {
    if (ERLAUBT.indexOf(k) < 0) fehler.push('place_of_birth.' + k + ' unbekannt');
    else if (typeof v !== 'string' || !v) fehler.push('place_of_birth.' + k + ' leer oder kein String');
  }
  if (!Object.keys(p).length) fehler.push('place_of_birth leer');
  return fehler;
}

test('[PID·Geburtsort] die Identität trägt keinen birthplace-String; place_of_birth nur als Struktur nach dem Rulebook', async () => {
  const claims = await identitaet({ givenName: 'Walter', familyName: 'Beispiel', birthDate: '1950-01-01', birthPlace: 'Beispielstadt' });
  assert.deepEqual(strukturFehler(claims), []);
});

test('[PID·Geburtsort·kein Raten] ein Freitext-Geburtsort wird nie zum Land', async () => {
  const claims = await identitaet({ givenName: 'Walter', familyName: 'Beispiel', birthPlace: 'Deutschland' });
  const p = claims.place_of_birth;
  assert.ok(!(p && typeof p === 'object' && 'country' in p), 'country aus Freitext: ' + JSON.stringify(p));
});

test('[PID·Geburtsort·Rot-Beweis] ein String-birthplace und ein Feld außerhalb der Struktur werden gemeldet', () => {
  assert.deepEqual(strukturFehler({ birthplace: 'Beispielstadt' }), ['birthplace als Claim']);
  assert.deepEqual(strukturFehler({ place_of_birth: 'Beispielstadt' }), ['place_of_birth kein Objekt']);
  assert.deepEqual(strukturFehler({ place_of_birth: { city: 'Beispielstadt' } }), ['place_of_birth.city unbekannt']);
  assert.deepEqual(strukturFehler({ place_of_birth: { locality: 'Beispielstadt' } }), []);
});

test('[PID·Geburtsort·Import] place_of_birth einer PID wird gelesen, birthplace alter Dateien ebenso; kein Objekt, kein Wert', () => {
  const { V } = ladeKern();
  assert.equal(V.geburtsortAusPid({ locality: 'Beispielstadt', country: 'DE' }), 'Beispielstadt, DE');
  assert.equal(V.geburtsortAusPid({ region: 'Beispielland', locality: ' Beispielort ' }), 'Beispielort, Beispielland');
  assert.equal(V.geburtsortAusPid('Beispielstadt'), '');
  assert.equal(V.geburtsortAusPid(['Beispielstadt']), '');
  const parse = V.IMPORT_FORMAT_BY_ID['sd-jwt-vc-identitaet'].parse;
  const wert = (claims) => (parse(JSON.stringify({ vct: 'urn:vivodepot:identitaet', claims })).felder.find((f) => f.feldId === 'birthPlace') || {}).wert;
  assert.equal(wert({ given_name: 'Walter', place_of_birth: { locality: 'Beispielstadt' } }), 'Beispielstadt');
  assert.equal(wert({ given_name: 'Walter', birthplace: 'Beispielstadt' }), 'Beispielstadt');
});

/* Klasse: jeder Claim-Name der Identität, oben und in den Strukturen, steht im PID-Rulebook.
   EUDI PID-Rulebook 1.7 (17.07.2026), Abschnitt 4.1.1, Claim-Namen der SD-JWT-VC-Kodierung. Nachsehen: Repo
   eu-digital-identity-wallet/eudi-doc-attestation-rulebooks-catalog, rulebooks/pid/pid-rulebook.md. Von Hand nach dem Text
   geschrieben, nicht kopiert; technische Claims (vct, cnf, nbf, exp) stehen nicht im Abschnitt. */
const RULEBOOK = Object.freeze({
  oben: ['family_name', 'given_name', 'birthdate', 'place_of_birth', 'nationalities', 'address',
    'birth_family_name', 'birth_given_name', 'email', 'phone_number', 'picture',
    'date_of_expiry', 'date_of_issuance', 'personal_administrative_number', 'sex',
    'issuing_authority', 'issuing_country', 'document_number', 'issuing_jurisdiction',
    'trust_anchor', 'attestation_legal_category'],
  place_of_birth: ['country', 'region', 'locality'],
  address: ['formatted', 'country', 'region', 'locality', 'postal_code', 'street_address', 'house_number'],
});

function unbekannteNamen(claims, rb) {
  const fehler = [];
  for (const [k, v] of Object.entries(claims)) {
    if (rb.oben.indexOf(k) < 0) { fehler.push(k); continue; }
    if (rb[k] && v && typeof v === 'object' && !Array.isArray(v)) {
      for (const u of Object.keys(v)) if (rb[k].indexOf(u) < 0) fehler.push(k + '.' + u);
    }
  }
  return fehler;
}

test('[PID·Claim-Namen] jede Claim der Identität trägt einen Namen aus dem PID-Rulebook §4.1.1', async () => {
  const claims = await identitaet({
    givenName: 'Walter', familyName: 'Beispiel', birthDate: '1950-01-01', birthName: 'Muster', birthPlace: 'Beispielstadt',
    telephone: '0123 456789', email: 'walter@example.org', streetAddress: 'Beispielweg 1', postcodeCity: '12345 Beispielstadt',
  });
  assert.ok(Object.keys(claims).length >= 5, 'Vorbedingung: die Identität trägt Claims');
  assert.deepEqual(unbekannteNamen(claims, RULEBOOK), []);
});

test('[PID·Claim-Namen·Rot-Beweis] ein Name außerhalb des Rulebooks fällt auf, oben und in der Struktur', () => {
  assert.deepEqual(unbekannteNamen({ birthplace: 'x', given_name: 'x' }, RULEBOOK), ['birthplace']);
  assert.deepEqual(unbekannteNamen({ place_of_birth: { city: 'x' }, address: { locality: 'x' } }, RULEBOOK), ['place_of_birth.city']);
});

test('[PID·Claim-Namen·Import] Kontaktdaten werden unter den Rulebook-Namen und unter den alten Namen gelesen', () => {
  const { V } = ladeKern();
  const parse = V.IMPORT_FORMAT_BY_ID['sd-jwt-vc-identitaet'].parse;
  const werte = (claims) => {
    const f = parse(JSON.stringify({ vct: 'urn:vivodepot:identitaet', claims })).felder;
    return ['telephone', 'email'].map((id) => (f.find((x) => x.feldId === id) || {}).wert);
  };
  assert.deepEqual(werte({ given_name: 'Walter', phone_number: '0123 456789', email: 'walter@example.org' }), ['0123 456789', 'walter@example.org']);
  assert.deepEqual(werte({ given_name: 'Walter', mobile_phone_number: '0123 456789', email_address: 'walter@example.org' }), ['0123 456789', 'walter@example.org']);
});
