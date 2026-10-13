'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   did.json trägt den Vertrauensanker des Kerns (did:web:vivodepot.de)
   ────────────────────────────────────────────────────────────────────────────
   docs/vc-issuer/did.json ist das DID-Dokument, das unter https://vivodepot.de/.well-known/did.json liegt. Es trägt genau
   den öffentlichen Schlüssel, den Kern, Lese-App und Issuer als TRUST_AUTHORITY_PUBLIC_JWK einbauen, mit dem kid als
   Methodenkennung. Diese Probe hält das fest, damit eine Rotation des Ankers nicht an einer stehengebliebenen did.json
   vorbeigeht, und sie verlangt, dass das Dokument nur öffentliche Teile trägt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DID = path.join(REPO, 'docs', 'vc-issuer', 'did.json');

function ankerAusKern(text) {
  const m = /^const TRUST_AUTHORITY_PUBLIC_JWK = Object\.freeze\(\{([\s\S]*?)\}\);$/m.exec(text);
  assert.ok(m, 'Vorbedingung: der Anker steht im Kern');
  const feld = (n) => { const f = new RegExp(n + ": '([^']+)'").exec(m[1]); return f ? f[1] : null; };
  return { kty: feld('kty'), crv: feld('crv'), alg: feld('alg'), x: feld('x'), kid: feld('kid') };
}

function abweichungen(doc, anker) {
  const raus = [];
  if (doc.id !== 'did:web:vivodepot.de') raus.push('id');
  const vm = Array.isArray(doc.verificationMethod) ? doc.verificationMethod : [];
  const passend = vm.find((v) => v && v.id === 'did:web:vivodepot.de#' + anker.kid);
  if (!passend) { raus.push('keine Methode mit dem kid des Ankers'); return raus; }
  const j = passend.publicKeyJwk || {};
  for (const k of ['kty', 'crv', 'alg', 'x']) if (j[k] !== anker[k]) raus.push('publicKeyJwk.' + k);
  for (const v of vm) {
    const jw = (v && v.publicKeyJwk) || {};
    for (const geheim of ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k']) if (geheim in jw) raus.push('privates Feld ' + geheim);
    if (Object.keys(jw).some((k) => k.startsWith('_'))) raus.push('Vorlagenfeld');
  }
  if (!(doc.assertionMethod || []).includes(passend.id)) raus.push('assertionMethod');
  return raus;
}

test('[did.json] trägt genau den Vertrauensanker des Kerns, nur öffentlich', () => {
  const anker = ankerAusKern(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  const doc = JSON.parse(fs.readFileSync(DID, 'utf8'));
  assert.deepEqual(abweichungen(doc, anker), []);
});

test('[did.json·Rot-Beweis] ein anderer Schlüssel, ein privates Feld oder die alte Vorlage fallen auf', () => {
  const anker = ankerAusKern(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));
  const doc = JSON.parse(fs.readFileSync(DID, 'utf8'));
  const anders = JSON.parse(JSON.stringify(doc)); anders.verificationMethod[0].publicKeyJwk.x = 'A'.repeat(43);
  assert.deepEqual(abweichungen(anders, anker), ['publicKeyJwk.x']);
  const privat = JSON.parse(JSON.stringify(doc)); privat.verificationMethod[0].publicKeyJwk.d = 'erfunden';
  assert.deepEqual(abweichungen(privat, anker), ['privates Feld d']);
  const vorlage = JSON.parse(JSON.stringify(doc)); vorlage.verificationMethod[0].id = 'did:web:vivodepot.de#key-1';
  assert.deepEqual(abweichungen(vorlage, anker), ['keine Methode mit dem kid des Ankers']);
});
