'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Eingebaute Anbieter-Zertifikate: das Subjekt hält den Schlüssel selbst
   (Befund BEHOERDEN-ZERTIFIKAT-FREMDER-SCHLUESSEL)
   ────────────────────────────────────────────────────────────────────────
   Ein Anbieter-Zertifikat (VivodepotProviderCredential) bindet `publicKeyJwk` an `anbieterName`. Maschinenlesbar
   sagt es damit: dieser Schlüssel gehört dieser Stelle. Die beiden eingebauten Behörden-Zertifikate (BMJ, BZgA)
   tragen denselben Schlüssel; ihn verwahrt Vivodepot, die Behörden halten keinen (U2-ADR-040, Punkt 1 A und 3 —
   eine bewusste Entscheidung, deren Nachfolge vorgelegt wird). Die Anzeige „Wortlaut von …“ ist richtig und nicht
   Gegenstand dieser Probe; geprüft wird das Subjektfeld der Zertifikate.

   Klassenregel: ein öffentlicher Schlüssel steht in höchstens einem eingebauten Zertifikat — zwei Stellen können
   nicht denselben Schlüssel selbst halten.
   ROT-BEWEIS: der heutige Kern (BMJ und BZgA mit demselben Schlüssel) ist rot — darum als todo, bis die
   Neuausstellung (Vivodepot als Subjekt, die Behörde als Quelle des Wortlauts) mit der Schlüsselzeremonie landet.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function eingebauteZertifikate(src) {
  const m = src.match(/const STANDARD_VORLAGEN_CERTS = Object\.freeze\(\{([^}]*)\}\)/);
  assert.ok(m, 'STANDARD_VORLAGEN_CERTS nicht gefunden — die Probe prüft sonst eine leere Menge');
  const liste = [];
  for (const t of m[1].matchAll(/(\w+):\s*'([^']+)'/g)) {
    const nutzlast = JSON.parse(Buffer.from(t[2].split('.')[1], 'base64url').toString('utf8'));
    const s = nutzlast.credentialSubject || (nutzlast.vc && nutzlast.vc.credentialSubject) || {};
    liste.push({ schluessel: t[1], anbieterId: s.anbieterId, anbieterName: s.anbieterName, jwk: s.publicKeyJwk });
  }
  return liste;
}
function schluesselKennung(jwk) { return jwk ? [jwk.kty, jwk.crv, jwk.x, jwk.y].join('|') : ''; }

function doppelteSchluessel(liste) {
  const nach = new Map();
  for (const z of liste) {
    const k = schluesselKennung(z.jwk);
    if (!nach.has(k)) nach.set(k, []);
    nach.get(k).push(z.anbieterId || z.schluessel);
  }
  return [...nach.values()].filter((ids) => new Set(ids).size > 1);
}

test('[Anbieter-Zertifikat] die eingebauten Zertifikate sind lesbar und tragen je einen Schlüssel', () => {
  const liste = eingebauteZertifikate(KERN);
  assert.ok(liste.length >= 1);
  for (const z of liste) assert.ok(z.anbieterId && z.anbieterName && z.jwk, JSON.stringify(z.schluessel));
});

test('[Anbieter-Zertifikat·Klasse] kein Schlüssel steht in zwei eingebauten Zertifikaten verschiedener Stellen',
  { todo: 'Befund BEHOERDEN-ZERTIFIKAT-FREMDER-SCHLUESSEL (HOCH): BMJ und BZgA tragen den von Vivodepot verwahrten Schlüssel; Neuausstellung mit der Schlüsselzeremonie' },
  () => {
    assert.deepEqual(doppelteSchluessel(eingebauteZertifikate(KERN)), []);
  });

test('[Anbieter-Zertifikat·Rot-Beweis] die Klassenregel erkennt zwei Stellen mit demselben Schlüssel', () => {
  const jwk = { kty: 'OKP', crv: 'Ed25519', x: 'AAAA' };
  assert.deepEqual(doppelteSchluessel([{ anbieterId: 'a', jwk }, { anbieterId: 'b', jwk }]), [['a', 'b']]);
  assert.deepEqual(doppelteSchluessel([{ anbieterId: 'a', jwk }, { anbieterId: 'b', jwk: { ...jwk, x: 'BBBB' } }]), []);
});
