'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Marken-Fund (19.09.2026, Auftrag über marke-e2e-abnahme.spec.js
   „eine Fremdmarke ändert die Kopfzeile sichtbar — und nichts sonst") —
   eine Vor-Depot-Fremdmarke schreibt sich dauerhaft in den gespeicherten Text
   ────────────────────────────────────────────────────────────────────────
   BEFUND, GEMESSEN (nicht nur behauptet — dieselbe Kette per Playwright im
   echten Browser nachvollzogen, dann hier isoliert auf den Node-Weg
   übertragen): `{marke}`-Platzhalter in Textsatz-Strings (z. B.
   `advanceCare.provisionInstruments/note.hint`, vivodepot.html:~6216) sind
   AUSDRÜCKLICH White-Label-fähig (U2-ADR-384/400) — eine aktive Vor-Depot-
   Marke DARF Toasts, PDF-Titel, Installations-Knöpfe umbenennen.

   WAS NICHT SEIN DARF: derselbe aufgelöste Text landet dauerhaft in
   `data.abWerkMitschrift.bereich` — dem Teil des DEPOTS, der beim
   Wiederöffnen unter JEDER SPÄTEREN Marke (nativ oder eine ANDERE
   White-Label-Marke) als Rückfall gilt, wenn das laufende Produkt selbst
   keine eigenen Bereichsdaten mehr mitbringt (_bereichModulAbWerkSeed).
   Ein Depot, das einmal unter „Stadtbank" lief, trüge deren Wortlaut für
   immer mit sich, auch nachdem es unter Vivodepot selbst oder einer dritten
   Marke geöffnet wird.

   URSACHE: `_abWerkMitschriftErzeugen` kopiert die Bereiche der Ab-Werk-Konstanten in die
   Mitschrift und schreibt dabei die Beschriftungen und Hinweise über `textLesen` als Inline
   hinein — `textLesen` löst {marke} unter der AKTIVEN Marke auf. Das Ergebnis ist ein
   aufgelöster Satz im gespeicherten Depot (gemessen: `advanceCare.provisionInstruments/note.hint`).

   FIX: `_markeAufgeloestZuruecksetzen` setzt in der Kopie jeden Text, der genau einer unter der
   aktiven Marke aufgelösten Katalogzeile gleicht, auf die Rohzeile zurück; der Text-Sweep
   (`_textsatzKnotenFuellen`) löst einen Inline-Platzhalter beim Lesen unter der HEUTIGEN Marke
   auf. Die Datei trägt den Platzhalter, die Anzeige die jeweilige Marke.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

function kern() { return ladeKern(); }

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-09-19T09:00:00Z';
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
const FREMDMARKE_NAME = 'Test-Institut Fremdmarke';

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}
async function fremdmarkenBuendel(V) {
  const anbieter = await wegwerfKeypair();
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'test-institut-fremdmarke', anbieterTyp: 'institution/test', anbieterName: FREMDMARKE_NAME, publicKeyJwk: anbieter.pubJwk },
  };
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'test-institut-fremdmarke', name: FREMDMARKE_NAME, farbePrimaer: '#8b1a2b' };
  const providerCredentialJws = await signieren(V, cert, SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

// Sucht rekursiv nach dem ersten Feld-Objekt mit dieser `id` innerhalb einer Bereichs-
// Mitschrift-Struktur (Sektionen -> Felder -> unterFelder, beliebig tief).
function findeFeld(knoten, id) {
  if (!knoten || typeof knoten !== 'object') return null;
  if (Array.isArray(knoten)) {
    for (const k of knoten) { const f = findeFeld(k, id); if (f) return f; }
    return null;
  }
  if (knoten.id === id) return knoten;
  for (const key of ['felder', 'unterFelder', 'sektionen', 'bereiche']) {
    if (knoten[key]) { const f = findeFeld(knoten[key], id); if (f) return f; }
  }
  if (knoten.advanceCare) { const f = findeFeld(knoten.advanceCare, id); if (f) return f; }
  return null;
}

/* DIE INVARIANTE, brandunabhängig: die Ab-Werk-Mitschrift ist ein STRUKTUR-Snapshot, kein
   Textträger (abWerkMitschrift-Kommentar, vivodepot.html:~20455) — ein eingebauter Hinweis
   kommt aus dem Textsatz (kennung), steht also gar nicht als Literal im Feld. Steht doch ein
   Text darin, darf er höchstens der UNAUFGELÖSTE Platzhalter sein, nie ein aufgelöster
   Markenname. (Vor dem Fix stand hier der aufgelöste Text — Fremdmarke oder „Vivodepot".) */
function hinweisIstUnaufgeloest(hint) {
  return hint === undefined || hint === null || String(hint).includes('{marke}');
}

test('[Marken-Fund·Rot-Beweis] eine Vor-Depot-Fremdmarke darf sich NICHT dauerhaft in data.abWerkMitschrift.bereich schreiben', async () => {
  const { V, document: dok } = kern();
  const buendel = await fremdmarkenBuendel(V);
  await V.vorDepotKonfigurationAnwenden([buendel], dok.documentElement, OPTS);

  await V.depotAnlegen('marke-in-abwerk-mitschrift-probe-2026');
  const data = V.getData();

  assert.ok(data && data.abWerkMitschrift && Array.isArray(data.abWerkMitschrift.bereich) && data.abWerkMitschrift.bereich.length > 0,
    'Vorbedingung: das (gebackene) Produkt trägt eine Ab-Werk-Mitschrift der Bereiche');
  const notizFeld = findeFeld(data.abWerkMitschrift.bereich, 'note');
  assert.ok(notizFeld, 'Vorbedingung: das eingebaute advanceCare.provisionInstruments/note-Feld steht in der Mitschrift');
  assert.ok(!String(notizFeld.hint || '').includes(FREMDMARKE_NAME),
    'die aktive Vor-Depot-Fremdmarke darf sich nicht dauerhaft in die gespeicherte Bereichs-Mitschrift schreiben — gefunden: ' + notizFeld.hint);
  assert.ok(hinweisIstUnaufgeloest(notizFeld.hint),
    'die Mitschrift trägt keinen aufgelösten Markentext — gefunden: ' + notizFeld.hint);
});

test('[Marken-Fund·Gegenprobe] auch OHNE Vor-Depot-Marke wird kein aufgelöster Markenname in die Mitschrift gebacken', async () => {
  const { V } = kern();
  await V.depotAnlegen('marke-in-abwerk-mitschrift-gegenprobe-2026');
  const data = V.getData();
  const notizFeld = findeFeld(data.abWerkMitschrift.bereich, 'note');
  assert.ok(notizFeld, 'Vorbedingung: das note-Feld steht in der Mitschrift');
  assert.ok(hinweisIstUnaufgeloest(notizFeld.hint),
    'derselbe Fehler ohne Fremdmarke: auch der native Name „Vivodepot" darf nicht als Literal in der Mitschrift stehen — gefunden: ' + notizFeld.hint);
});

test('[Marken-Fund·Anzeige] die LIVE-Anzeige löst {marke} weiterhin auf — der Fix ändert nur die Quelle, nicht die Darstellung', async () => {
  const { V, document: dok } = kern();
  const buendel = await fremdmarkenBuendel(V);
  await V.vorDepotKonfigurationAnwenden([buendel], dok.documentElement, OPTS);
  await V.depotAnlegen('marke-in-abwerk-mitschrift-anzeige-2026');
  const text = V.textLesen('advanceCare.provisionInstruments/note.hint');
  assert.ok(text.includes(FREMDMARKE_NAME), 'White Label bleibt: die angezeigte Fassung nennt die aktive Marke — ' + text);
});
