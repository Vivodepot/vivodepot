'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   aufgeloeste-marke-im-depot.test.js — der Wächter „{marke} wird beim Lesen aufgelöst,
   nie in der Datei" (Marken-Fund vom 19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Teil 1: reine Logik (tools/lib/aufgeloeste-marke-im-depot.js) mit gepflanzten Fixturen.
   Teil 2: die Messung am ECHTEN Depot — frisch angelegt, nativ UND unter einer Vor-Depot-
   Fremdmarke, gegen den Katalog des Kerns (deutsch + englisch), Maßstab ist die Quelle.
   Der Rot-Beweis am echten Kern: ohne `_markeAufgeloestZuruecksetzen` in `_abWerkMitschriftErzeugen` findet
   dieser Wächter den aufgelösten Hinweis unter data.abWerkMitschrift.bereich (gemessen).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const {
  aufgeloesteVarianten, stringsMitPfad, aufgeloesteMarkeImDepot, hatPlatzhalter,
} = require('../tools/lib/aufgeloeste-marke-im-depot.js');

const NATIV = { name: 'Vivodepot', domain: 'vivodepot.de' };
const FREMD = { name: 'Test-Institut Fremdmarke', domain: 'fremd.example' };
const KATALOG = {
  'a.hint': 'Der Inhalt bleibt außerhalb von {marke}. Weitere Angaben folgen.',
  'b.text': 'Erhältlich unter {marke_domain} — ohne Konto.',
  'c.label': 'Ohne Platzhalter, nur ein Satz.',
  'd.kurz': '{marke}',
};

/* ── Logik ─────────────────────────────────────────────────────────────── */

test('[Varianten] jede Katalogzeile MIT Platzhalter wird je Marke aufgelöst, Zeilen ohne nicht', () => {
  const v = aufgeloesteVarianten(KATALOG, [NATIV, FREMD]);
  assert.ok(v.has('Der Inhalt bleibt außerhalb von Vivodepot. Weitere Angaben folgen.'));
  assert.ok(v.has('Der Inhalt bleibt außerhalb von Test-Institut Fremdmarke. Weitere Angaben folgen.'));
  assert.ok(v.has('Erhältlich unter fremd.example — ohne Konto.'), 'auch {marke_domain} wird aufgelöst');
  assert.ok(![...v.keys()].some((s) => s.includes('Ohne Platzhalter')), 'eine Zeile ohne Platzhalter erzeugt keine Variante');
});

test('[Varianten·Grenze] eine Zeile, die nur aus dem Platzhalter besteht, wird ausgelassen', () => {
  const v = aufgeloesteVarianten(KATALOG, [NATIV, FREMD]);
  assert.ok(!v.has('Vivodepot') && !v.has('Test-Institut Fremdmarke'),
    'sonst träfe jeder gespeicherte Eintrag „Vivodepot" den Katalog-Eintrag {marke}');
});

test('[Strings] findet Strings in Objekten und Arrays mit Pfad, ohne in Zyklen zu hängen', () => {
  const zyklus = { a: 'x' }; zyklus.selbst = zyklus;
  const s = stringsMitPfad({ liste: [{ t: 'eins' }, 'zwei'], z: zyklus });
  assert.deepEqual(s.map((e) => e.pfad).sort(), ['$.liste[0].t', '$.liste[1]', '$.z.a'].sort());
});

test('[Rot-Beweis] ein gepflanzter, AUFGELÖSTER Satz im Depot wird mit Pfad und Kennung gefunden', () => {
  const v = aufgeloesteVarianten(KATALOG, [NATIV, FREMD]);
  const depot = { abWerkMitschrift: { bereich: [{ felder: [{ hint: 'Der Inhalt bleibt außerhalb von Test-Institut Fremdmarke. Weitere Angaben folgen.' }] }] } };
  const funde = aufgeloesteMarkeImDepot(depot, v);
  assert.equal(funde.length, 1);
  assert.equal(funde[0].pfad, '$.abWerkMitschrift.bereich[0].felder[0].hint');
  assert.equal(funde[0].kennung, 'a.hint');
  assert.equal(funde[0].marke, 'Test-Institut Fremdmarke');
});

test('[Rot-Beweis] ein aufgelöster Satz INNERHALB eines längeren Strings wird ebenfalls gefunden', () => {
  const v = aufgeloesteVarianten(KATALOG, [NATIV]);
  const depot = { notiz: 'Vorspann. Der Inhalt bleibt außerhalb von Vivodepot. Weitere Angaben folgen. Nachspann.' };
  assert.equal(aufgeloesteMarkeImDepot(depot, v).length, 1);
});

test('[Gegenprobe] der UNAUFGELÖSTE Platzhalter im Depot ist der Sollzustand und wird nicht gemeldet', () => {
  const v = aufgeloesteVarianten(KATALOG, [NATIV, FREMD]);
  const depot = { abWerkMitschrift: { sprache: { texte: { 'a.hint': KATALOG['a.hint'] } } }, sonst: 'Vivodepot' };
  assert.deepEqual(aufgeloesteMarkeImDepot(depot, v), [], 'Rohtext mit {marke} und ein bloßes „Vivodepot" sind keine aufgelöste Zeile');
});

test('[Gegenprobe] hatPlatzhalter erkennt beide Platzhalter und ignoriert Nicht-Strings', () => {
  assert.equal(hatPlatzhalter('x {marke} y'), true);
  assert.equal(hatPlatzhalter('x {marke_domain} y'), true);
  assert.equal(hatPlatzhalter('x'), false);
  assert.equal(hatPlatzhalter(null), false);
});

/* ── Messung am ECHTEN Depot ───────────────────────────────────────────── */

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x }, jetzt: '2026-09-19T09:00:00Z' });

async function fremdmarkenBuendel(V) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const sign = async (payload, jwk) => V._signJWS(payload, await V._jwsImportSignKey(jwk), {});
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'test-institut-fremdmarke', anbieterTyp: 'institution/test', anbieterName: FREMD.name, publicKeyJwk: pub },
  };
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'test-institut-fremdmarke', name: FREMD.name, farbePrimaer: '#8b1a2b' };
  return { providerCredentialJws: await sign(cert, SENTINEL_PRIVATE_JWK), modulSignaturJws: await sign(modul, priv) };
}

function variantenAusKern(V) {
  // Deutscher UND englischer Katalog: die Wächter-Zusicherung gilt unabhängig von der Sprache.
  const marken = [{ name: V.AB_WERK_BRANDING.name, domain: V.AB_WERK_BRANDING.domain }, FREMD];
  const de = aufgeloesteVarianten(V.TEXTSATZ_DE_QUELLE.texte, marken);
  const en = aufgeloesteVarianten((V.TEXTSATZ_EN_QUELLE && V.TEXTSATZ_EN_QUELLE.texte) || {}, marken);
  return new Map([...de, ...en]);
}

test('[Ausbeute] der Wächter sucht überhaupt etwas — Varianten aus dem echten Katalog, beide Sprachen, beide Marken', () => {
  const { V } = ladeKern();
  const v = variantenAusKern(V);
  assert.ok(v.size > 100, 'aus 67 deutschen und den englischen Zeilen mit Platzhalter, je zwei Marken: ' + v.size);
});

test('[Anker] ein frisch angelegtes Depot trägt nirgends einen aufgelösten {marke}-Satz — nativ', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('aufgeloeste-marke-nativ-2026');
  const funde = aufgeloesteMarkeImDepot(V.getData(), variantenAusKern(V));
  assert.deepEqual(funde, [], 'aufgelöster Markentext im gespeicherten Depot:\n' + funde.map((f) => f.pfad + ' ← ' + f.kennung + ' (' + f.marke + ')').join('\n'));
});

test('[Anker] … und unter einer Vor-Depot-Fremdmarke', async () => {
  const { V, document: dok } = ladeKern();
  await V.vorDepotKonfigurationAnwenden([await fremdmarkenBuendel(V)], dok.documentElement, OPTS);
  await V.depotAnlegen('aufgeloeste-marke-fremd-2026');
  const funde = aufgeloesteMarkeImDepot(V.getData(), variantenAusKern(V));
  assert.deepEqual(funde, [], 'aufgelöster Markentext im gespeicherten Depot:\n' + funde.map((f) => f.pfad + ' ← ' + f.kennung + ' (' + f.marke + ')').join('\n'));
});
