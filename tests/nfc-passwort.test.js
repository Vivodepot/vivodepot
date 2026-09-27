'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test (Klasse A) — B1: Passwort-Unicode-Normalisierung (NFC, Variante B)
   ────────────────────────────────────────────────────────────────────────
   Huellen-Arbeit (Script 2), VdCrypto-Block UNBERUEHRT. Vier Leaf-Funktionen normalisieren vor
   der Ableitung: L1 depotAnlegen, L2 depotLaden, L3 subDepotVersiegeln, L4 subDepotEntsiegeln.
   Variante B: NFC-zuerst; bei GCM-Fehler GENAU EIN NFD-Versuch (nur wenn pw!=NFC); NFD-Erfolg ->
   Re-Encrypt unter NFC beim naechsten Sichern. Neuanlagen (L1/L3) immer NFC, kein Fallback.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

// "Mueller" mit Umlaut als NFC (oe = U+00F6) bzw. NFD (o + U+0308). Realer Tastatur-Unterschied.
// Quell-Literale werden vom Dateisystem als NFC abgelegt -> NFD explizit dekomponieren, sonst waere
// die "NFD"-Konstante in Wahrheit NFC (NFC===NFD) und die Fallback-Pfade blieben ungetestet.
const BASIS = 'Müller-Geheim-123';
const NFC = BASIS.normalize('NFC');   // oe = U+00F6
const NFD = BASIS.normalize('NFD');   // o + U+0308 (dekomponiert)
assert.notEqual(NFC, NFD, 'Test-Vorbedingung: NFC und NFD muessen sich unterscheiden');

function randB64(n) { const a = new Uint8Array(n); webcrypto.getRandomValues(a); return Buffer.from(a).toString('base64'); }

// Baut einen v3-Umschlag, dessen Schluessel aus dem ROHEN (nicht normalisierten) Passwort
// abgeleitet ist — ueber die exponierten Block-Primitiven. Format = die sechs Felder.
// B2/v3: Der Container ist kryptoVersion 3 (v3-only Release); „Legacy" meint hier NUR den
// roh-/NFD-abgeleiteten Schluessel (Defensiv-Fall fuer den B1-NFD-Retry), NICHT ein altes
// Krypto-Format. So passiert er das v3-Versions-Gate und uebt den NFD-Retry-Pfad aus.
async function craftLegacyUmschlag(V, rohPw, inhalt) {
  const pbkdf2SaltB64 = randB64(16);
  const depotSaltB64 = randB64(32);
  const pbkdf2Salt = V.base64ToBytes(pbkdf2SaltB64);
  const depotSalt = V.base64ToBytes(depotSaltB64);
  const depotUUID = V.uuidV4();
  const bits = await V.deriveMasterBits(rohPw, pbkdf2Salt);     // roh, KEINE Normalisierung
  const master = await V.importMasterHkdfKey(bits);
  const subKey = await V.deriveDepotKeyV2(master, depotSalt, depotUUID);
  const { iv, ct } = await V.VdCrypto.encryptDepot(inhalt, subKey, V._AAD_DEPOT_V2);
  return { kryptoVersion: 3, depotUUID, pbkdf2: { salt: pbkdf2SaltB64 }, depotSalt: depotSaltB64, iv, ct };
}

test('normalizePassword: NFD->NFC, ASCII unveraendert, Nicht-String durchgereicht', () => {
  const { V } = ladeKern();
  assert.equal(V.normalizePassword(NFD), NFC);
  assert.equal(V.normalizePassword('ascii-123'), 'ascii-123');
  assert.equal(V.normalizePassword(undefined), undefined);
  assert.equal(V.normalizePassword(null), null);
});

test('[T1] NFC-angelegt + NFD-eingegeben -> entsperrt (Eingabe-Normalisierung, Versuch 1)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(NFC);
  const u = await V.depotSerialisieren();
  const obj = await ladeKern().V.depotLaden(u, NFD);   // NFD-Eingabe -> normalize -> NFC
  assert.ok(obj && typeof obj === 'object', 'NFC-Depot mit NFD-Eingabe geoeffnet');
});

test('[T4] ASCII-Passwort: richtig oeffnet, falsch wirft (Fallback per Guard uebersprungen)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('ascii-pass-12345');
  const u = await V.depotSerialisieren();
  await assert.doesNotReject(() => ladeKern().V.depotLaden(u, 'ascii-pass-12345'));
  await assert.rejects(() => ladeKern().V.depotLaden(u, 'ascii-FALSCH-12345'));
});

test('[T3] echtes Falschpasswort (Umlaut, pw!=NFC) -> wirft (max. zwei Ableitungen, kein Endlos-Retry)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(NFC);
  const u = await V.depotSerialisieren();
  await assert.rejects(() => ladeKern().V.depotLaden(u, 'Fünf-ganz-falsch'), 'falsches Passwort wirft');
});

test('[T2] Legacy-NFD-Depot + NFD-Eingabe -> Roh-Fallback oeffnet; danach Re-Encrypt unter NFC', async () => {
  const { V } = ladeKern();
  const inhalt = V.leeresDepot(); inhalt._marker = 'legacy';
  const legacy = await craftLegacyUmschlag(V, NFD, inhalt);     // Schluessel aus ROH-NFD
  const obj = await V.depotLaden(legacy, NFD);                  // Versuch 1 (NFC) scheitert -> Versuch 2 (NFD) oeffnet
  assert.equal(obj._marker, 'legacy', 'ueber NFD-Fallback geoeffnet');
  // Re-Encrypt: der naechste Serialize schreibt unter dem NFC-Schluessel (Session umgeschluesselt).
  const reUmschlag = await V.depotSerialisieren();
  assert.equal(reUmschlag.depotUUID, legacy.depotUUID, 'depotUUID stabil');
  assert.notEqual(reUmschlag.ct, legacy.ct, 'neuer Ciphertext (re-verschluesselt)');
  const obj2 = await ladeKern().V.depotLaden(reUmschlag, NFC);  // jetzt oeffnet die NFC-Eingabe via Versuch 1
  assert.equal(obj2._marker, 'legacy', 'nach Re-Encrypt mit NFC-Eingabe geoeffnet');
});

test('[T6] Neuanlage normalisiert: NFD-Eingabe -> Depot ist NFC-verschluesselt (Block bekommt nie roh-NFD)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(NFD);                                    // NFD-Eingabe bei der Neuanlage
  const u = await V.depotSerialisieren();
  const obj = await ladeKern().V.depotLaden(u, NFC);            // oeffnet mit NFC (Versuch 1) -> angelegt war NFC
  assert.ok(obj, 'Neuanlage mit NFD-Eingabe -> NFC-verschluesselt');
});

test('[T5] Sub-Depot: NFC-versiegelt+NFD-entsiegelt oeffnet; Legacy-NFD-Sub+NFD -> Fallback + e.umschlag NFC', async () => {
  // (a) NFC-versiegelt + NFD-entsiegelt
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw-12345'); V.akteurSelbstErklaeren('X'); V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'S', inhaberin: 'I', verwaltungsTyp: 'verwaltet', akzent: 'sand' }, NFC);
  const inhalt = await V.subDepotVertrauenOeffnen(e.depotUUID, NFD);
  assert.ok(inhalt, 'NFC-Sub mit NFD-Eingabe geoeffnet');

  // (b) Legacy-NFD-Sub + NFD -> Fallback + Re-Seal unter NFC, stabile depotUUID
  const { V: V2 } = ladeKern();
  await V2.depotAnlegen('anker2-pw-12345');
  const subInhalt = V2.leeresDepot(); subInhalt.verwaltungsTyp = 'verwaltet';
  const legacySub = await craftLegacyUmschlag(V2, NFD, subInhalt);
  const eintrag = { depotUUID: legacySub.depotUUID, bezeichnung: 'Legacy', inhaberin: 'L', verwaltungsTyp: 'verwaltet', status: 'aktiv', verselbststaendigungMoeglich: false, delegationsGeschichte: [], akzent: 'sand', vertretungsGrundlage: null, umschlag: legacySub };
  V2.getData().verwalteteDepots = [eintrag];
  const ctVorher = eintrag.umschlag.ct;
  await V2.subDepotVertrauenOeffnen(legacySub.depotUUID, NFD);   // NFD -> Fallback oeffnet + Re-Seal
  assert.notEqual(eintrag.umschlag.ct, ctVorher, 'Sub-Umschlag unter NFC neu versiegelt');
  assert.equal(eintrag.umschlag.depotUUID, legacySub.depotUUID, 'depotUUID stabil');
  const { inhalt: re } = await V2.subDepotEntsiegeln(eintrag.umschlag, NFC);   // neuer Umschlag oeffnet mit NFC (Versuch 1)
  assert.ok(re, 'neuer Sub-Umschlag oeffnet mit NFC-Eingabe');
});

test('[B1 Inventur] alle vier Leaf-Funktionen normalisieren; L2/L4 mit Guard pw!=NFC', () => {
  const { src } = ladeKern();
  // Etappe 2g (U2-ADR-160): depotAnlegen traegt seither ein optionales zweites Argument
  // (`opts.bereichssatz`) — die Norm-Zeile bleibt trotzdem die ERSTE Anweisung, ungebrancht.
  assert.ok(/async function depotAnlegen\(password, opts\) \{\s*\n\s*password = normalizePassword\(password\);/.test(src), 'L1 normalisiert');
  assert.ok(/async function subDepotVersiegeln\(inhalt, subPasswort\) \{\s*\n\s*subPasswort = normalizePassword\(subPasswort\);/.test(src), 'L3 normalisiert');
  // L2/L4 Fallback-Guard: nur wenn pw != NFC, GENAU ein NFD-Versuch.
  assert.equal((src.match(/if \(typeof \w+ !== 'string' \|\| \w+ === nfc\) throw e1;/g) || []).length, 2, 'L2+L4: Guard pw!=NFC');
  assert.equal((src.match(/\.normalize\('NFD'\)/g) || []).length >= 2, true, 'L2+L4: NFD-Zweitversuch');
});
