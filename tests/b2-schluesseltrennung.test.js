'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test (Klasse A) — B2: Schlüsseltrennung + Domain-Separation + Übergabe + HKDF-Cross-Use
   ────────────────────────────────────────────────────────────────────────
   Beweist die v3-Schlüsseltrennung am ECHTEN Block (Prüfgegenstand, im Test unverändert):
   (a) Ein unter der FRÜHEREN Direkt-Bit-AES-Verwendung verschlüsselter Container ist mit der
       v3-HKDF-Ableitung NICHT entschlüsselbar (ASCII-Passwort = genau 1 PBKDF2-Ableitung,
       NFD-Retry per Guard übersprungen).
   (b) Domain-Separation: ein Schlüssel mit Info-String A (depotUUID-A) entschlüsselt nichts,
       was unter Info-String B (depotUUID-B) verschlüsselt wurde — gleicher Salt, nur die
       Info trennt ('vivodepot/v3/depot/'+uuid).
   (c) Übergabe-Pfad (deriveKey, PBKDF2-600k → AES direkt, _AAD_UEBERGABE_V2) Round-Trip grün
       (B2-Abgrenzung: Design, NICHT Legacy).
   (d) HKDF-Cross-Use (Drift-Audit): Übergabe-Direkt-Schlüssel und Depot-HKDF-Schlüssel aus
       DENSELBEN Bits sind nicht austauschbar.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const PW = 'ascii-trennung-12345';   // ASCII → normalize(NFC)===PW → kein NFD-Retry (genau 1 Ableitung)
function randB64(n) { const a = new Uint8Array(n); webcrypto.getRandomValues(a); return Buffer.from(a).toString('base64'); }

test('[Klasse-A][B2] Trennung: alt-direkter Bit-AES-Container ist mit v3-HKDF NICHT entschlüsselbar', async () => {
  const { V } = ladeKern();
  const pbkdf2Salt = V.base64ToBytes(randB64(16));
  const depotSalt  = V.base64ToBytes(randB64(32));
  const depotUUID  = V.uuidV4();
  const payload = { marker: 'trennung-beweis' };

  const bits = await V.deriveMasterBits(PW, pbkdf2Salt);
  // FRÜHERE Verwendung (vor B2): die PBKDF2-Bits DIREKT als AES-GCM-Master-Schlüssel.
  const altDirektKey = await V.importMasterAesKey(bits);
  const altContainer = await V.VdCrypto.encryptDepot(payload, altDirektKey, V._AAD_DEPOT_V2);

  // v3-Ableitung aus DENSELBEN Bits: HKDF → deriveDepotKeyV2 (Info 'vivodepot/v3/depot/'+uuid).
  const hkdf  = await V.importMasterHkdfKey(bits);
  const v3Key = await V.deriveDepotKeyV2(hkdf, depotSalt, depotUUID);

  await assert.rejects(
    () => V.VdCrypto.decryptDepot(altContainer, v3Key, V._AAD_DEPOT_V2),
    'v3-HKDF-Schlüssel darf den alt-direkt-Bit-Container NICHT öffnen (Trennung bewiesen)'
  );
  // Positiv-Kontrolle: der v3-Schlüssel öffnet, was er selbst verschlüsselt hat.
  const v3Container = await V.VdCrypto.encryptDepot(payload, v3Key, V._AAD_DEPOT_V2);
  const wieder = await V.VdCrypto.decryptDepot(v3Container, v3Key, V._AAD_DEPOT_V2);
  assert.equal(wieder.marker, 'trennung-beweis', 'v3-Schlüssel öffnet v3-Container (Positiv-Kontrolle)');
});

test('[Klasse-A][B2] Domain-Separation: Info-String A entschlüsselt nichts unter B Verschlüsseltes', async () => {
  const { V } = ladeKern();
  const pbkdf2Salt = V.base64ToBytes(randB64(16));
  const depotSalt  = V.base64ToBytes(randB64(32));   // GLEICHER Salt → nur der Info-String (UUID) trennt
  const uuidA = V.uuidV4();
  const uuidB = V.uuidV4();
  assert.notEqual(uuidA, uuidB, 'Test-Vorbedingung: zwei verschiedene UUIDs');

  const bits = await V.deriveMasterBits(PW, pbkdf2Salt);
  const hkdf = await V.importMasterHkdfKey(bits);
  const keyA = await V.deriveDepotKeyV2(hkdf, depotSalt, uuidA);
  const keyB = await V.deriveDepotKeyV2(hkdf, depotSalt, uuidB);

  const encA = await V.VdCrypto.encryptDepot({ wer: 'A' }, keyA, V._AAD_DEPOT_V2);
  await assert.rejects(
    () => V.VdCrypto.decryptDepot(encA, keyB, V._AAD_DEPOT_V2),
    'Schlüssel B (Info-String B) darf A-Container nicht öffnen'
  );
  const zurueck = await V.VdCrypto.decryptDepot(encA, keyA, V._AAD_DEPOT_V2);
  assert.equal(zurueck.wer, 'A', 'Schlüssel A öffnet A (Positiv-Kontrolle)');
});

test('[Klasse-A][B2] Übergabe-Pfad (deriveKey 600k → AES, _AAD_UEBERGABE_V2) Round-Trip grün', async () => {
  const { V } = ladeKern();
  const salt = V.base64ToBytes(randB64(16));
  const key = await V.deriveKey(PW, salt);
  const enc = await V.VdCrypto.encryptDepot({ uebergabe: true }, key, V._AAD_UEBERGABE_V2);
  const dec = await V.VdCrypto.decryptDepot(enc, key, V._AAD_UEBERGABE_V2);
  assert.equal(dec.uebergabe, true, 'Übergabe-Design-Pfad unverändert funktionsfähig');
  // AAD-Bindung (kdfTyp): der Depot-AAD (hkdf-sha256) darf den Übergabe-Container (pbkdf2-sha256) NICHT öffnen.
  await assert.rejects(
    () => V.VdCrypto.decryptDepot(enc, key, V._AAD_DEPOT_V2),
    'kdfTyp-AAD bindet: hkdf-sha256-AAD öffnet keinen pbkdf2-sha256-Container'
  );
});

test('[Klasse-A][B2] HKDF-Cross-Use: Übergabe-Direkt-Key und Depot-HKDF-Key (gleiche Bits) nicht austauschbar', async () => {
  const { V } = ladeKern();
  const pbkdf2Salt = V.base64ToBytes(randB64(16));
  const depotSalt  = V.base64ToBytes(randB64(32));
  const depotUUID  = V.uuidV4();
  const bits = await V.deriveMasterBits(PW, pbkdf2Salt);
  const direktKey = await V.importMasterAesKey(bits);                 // Übergabe-Stil (direkt)
  const hkdf      = await V.importMasterHkdfKey(bits);
  const hkdfKey   = await V.deriveDepotKeyV2(hkdf, depotSalt, depotUUID);

  const encDirekt = await V.VdCrypto.encryptDepot({ q: 'direkt' }, direktKey, V._AAD_DEPOT_V2);
  const encHkdf   = await V.VdCrypto.encryptDepot({ q: 'hkdf' },   hkdfKey,   V._AAD_DEPOT_V2);
  await assert.rejects(() => V.VdCrypto.decryptDepot(encDirekt, hkdfKey,  V._AAD_DEPOT_V2), 'HKDF-Key öffnet keinen Direkt-Container');
  await assert.rejects(() => V.VdCrypto.decryptDepot(encHkdf,   direktKey, V._AAD_DEPOT_V2), 'Direkt-Key öffnet keinen HKDF-Container');
});

test('[Klasse-A][B2] v3-only: Konstanten gesetzt; setupMasterSession ohne Direkt-Bit-AES; Lade-Gate wirft auf Nicht-v3', async () => {
  const { V, src } = ladeKern();
  assert.equal(V.CRYPTO_VERSION_AKTUELL, 3, 'aktuelle Krypto-Version = 3');
  // 21.07.2026 (B2): Diese Zeile prüfte früher NUR den Inhalt der Konstante
  // (JSON.stringify(...) === '[3]'). Das verifizierte nichts — die Konstante war damals an
  // keiner Prüfstelle beteiligt, die Durchsetzung lief über einen Gleichheitsvergleich mit
  // CRYPTO_VERSION_AKTUELL. Ein Test, der eine Deklaration prüft, wiederholt sie nur.
  // Jetzt strukturell: KEIN produktives Versions-Gate vergleicht mehr direkt gegen die
  // Aktuell-Konstante; die Durchsetzung selbst prüft der eigene Test unten (vor PBKDF2).
  assert.ok(!/kryptoVersion\s*[!=]==\s*CRYPTO_VERSION_AKTUELL/.test(src),
    'kein Versions-Gate vergleicht direkt gegen CRYPTO_VERSION_AKTUELL (Allowlist ist die Quelle)');
  assert.ok(/KRYPTO_VERSION_ALLOWLIST\.includes\(umschlag\.kryptoVersion\)/.test(src),
    'die Versions-Gates lesen die Allowlist');
  // Doppel-Bit-Verbrauch entfernt: setupMasterSession setzt sessionKey NICHT mehr aus den Bits.
  assert.ok(!/sessionKey\s*=\s*await\s+importMasterAesKey/.test(src),
    'setupMasterSession verbraucht die PBKDF2-Bits nicht mehr direkt als AES-Schlüssel');
  assert.ok(/sessionHkdfKey\s*=\s*await\s+importMasterHkdfKey\(bits\)/.test(src),
    'Session leitet nur noch die HKDF-Wurzel ab');
  // Lade-Gate (vor der Ableitung): v1 UND v2 werden abgewiesen.
  await V.depotAnlegen(PW);
  const u = await V.depotSerialisieren();
  for (const alt of [1, 2]) {
    const fremd = JSON.parse(JSON.stringify(u)); fremd.kryptoVersion = alt;
    await assert.rejects(() => ladeKern().V.depotLaden(fremd, PW), /kryptoVersion/,
      'depotLaden lehnt kryptoVersion ' + alt + ' ab (v3-only, vor der Ableitung)');
  }
});

/* ── B2 (21.07.2026) — Durchsetzung statt Deklaration ──────────────────────
   Der frühere Test prüfte den INHALT von KRYPTO_VERSION_ALLOWLIST. Das war eine
   Wiederholung der Deklaration, kein Nachweis: die Konstante war an keiner Prüfstelle
   beteiligt. Dieser Test misst stattdessen das Verhalten — und zwar die Reihenfolge,
   auf die es ankommt: ein Nicht-v3-Umschlag muss abgelehnt werden, BEVOR ~600k PBKDF2
   laufen. Gemessen mit einem Zähler auf crypto.subtle.deriveBits (der einzigen Stelle,
   an der die Master-Bits entstehen); die Gegenprobe mit gültigem Umschlag beweist, dass
   der Zähler tatsächlich misst und die Null nicht bloß daher rührt, dass der Spy nie griff. */
test('[Klasse-A][B2] Versions-Gate lehnt VOR der PBKDF2-Ableitung ab (Allowlist durchsetzend)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const gueltig = await V.depotSerialisieren();
  const fremd = JSON.parse(JSON.stringify(gueltig));
  fremd.kryptoVersion = 2;

  const orig = webcrypto.subtle.deriveBits;
  let ableitungen = 0;
  webcrypto.subtle.deriveBits = function (...a) { ableitungen++; return orig.apply(this, a); };
  try {
    const K = ladeKern();
    await assert.rejects(() => K.V.depotLaden(fremd, PW), /kryptoVersion/,
      'kryptoVersion 2 wird abgelehnt');
    assert.equal(ableitungen, 0,
      'keine einzige PBKDF2-Ableitung vor der Ablehnung (Gate liegt VOR der Schlüsselableitung)');
    await K.V.depotLaden(gueltig, PW);          // Gegenprobe: der Zähler misst wirklich
    assert.ok(ableitungen > 0, 'Gegenprobe: ein gültiger v3-Umschlag löst eine Ableitung aus');
  } finally {
    webcrypto.subtle.deriveBits = orig;
  }
});

/* ── B4 (21.07.2026) — Master-Bits-Zeroing (A1-Nachtrag) ───────────────────
   Sichert bestehendes Verhalten ab, das bis dahin ungetestet war: setupMasterSession
   überschreibt die PBKDF2-Master-Bits nach dem Schlüssel-Import mit Nullen.
   Zugriff ohne Produktiv-Umbau: deriveMasterBits gibt den deriveBits-Puffer DIREKT zurück
   (keine Kopie), derselbe ArrayBuffer wird in setupMasterSession genullt — ein Spy auf
   deriveBits hält also genau die Referenz, die das Zeroing trifft.
   ABGRENZUNG: Dies ist NICHT das in der Krypto-Doku beschriebene „Klartext-Zeroing nach
   Verschlüsselung". Ein solches existiert im Code nicht und kann nicht existieren — der
   Klartext in encryptData ist ein unbenanntes Argument ohne Referenz (Befund A1, 21.07.). */
test('[Klasse-A] Master-Bits sind nach setupSession genullt (Zeroing-Disziplin)', async () => {
  const { V } = ladeKern();
  const orig = webcrypto.subtle.deriveBits;
  const gesehen = [];
  webcrypto.subtle.deriveBits = async function (...a) {
    const b = await orig.apply(this, a);
    gesehen.push(b);
    return b;
  };
  try {
    await V.VdCrypto.setupSession('zeroing-testpasswort', new Uint8Array(16));
  } finally {
    webcrypto.subtle.deriveBits = orig;
  }
  assert.equal(gesehen.length, 1, 'genau eine PBKDF2-Ableitung je setupSession');
  const bits = new Uint8Array(gesehen[0]);
  assert.equal(bits.length, 32, '256 Bit Master-Material');
  assert.ok(bits.every(b => b === 0), 'Master-Bits nach dem Import mit Nullen überschrieben');

  // Kontrolle: ohne setupSession bleibt dasselbe Material ungenullt — beweist, dass die
  // Nullen aus dem Zeroing stammen und nicht etwa aus der Ableitung selbst.
  const roh = new Uint8Array(await V.deriveMasterBits('zeroing-testpasswort', new Uint8Array(16)));
  assert.ok(roh.some(b => b !== 0), 'Kontrolle: frisch abgeleitete Bits sind nicht null');
});
