'use strict';
/* ════════════════════════════════════════════════════════════════════════
   UNABHÄNGIGER Krypto-Verifikations-Harness — gegen den NEUEN Block (B2/v3)
   ────────────────────────────────────────────────────────────────────────
   ABSICHTLICH eigener Code, NICHT die Repo-Suite, NICHT in `node --test`
   eingehängt. Lädt AUSSCHLIESSLICH die kanonische Block-Quelle
   `vivodepot-krypto-kern-PORT-VERBATIM.js` (ohne Hülle, ohne HTML) und prüft
   den Block über Kreuz. Stufe-2-Gegenpfad zur Auflage „der unabhängige
   SP-Harness läuft danach erneut gegen den neuen Block".

   Lauf:  node tools/independent-krypto-harness.js   (Exit 0 = alle grün)

   Vektoren:
   • RFC 5869 HKDF-SHA256 Appendix A.1/A.2/A.3 — hartkodiert (normativ), gegen
     den Block-Pfad _deriveHkdfRaw geprüft (OKM byte-exakt).
   • AES-256-GCM publizierte Anker (McGrew/Viega GCM-Spec = NIST Test Case
     13/14, 256-bit) — gegengeprüft über ZWEI unabhängige Engines: Node-OpenSSL
     (`crypto.createCipheriv`) UND WebCrypto (die Engine, die der Block nutzt).
   • Funktionale Über-Kreuz-Prüfungen an den ECHTEN Block-Funktionen: Round-Trip,
     AAD-Bindung (Depot ≠ Übergabe), GCM-Tag-Manipulation wirft, IV 12-Byte/frisch,
     deriveDepotKeyV2-UUID-Trennung, v3-Schlüsseltrennung (alt-direkter-Bit-Key ≠
     v3-HKDF-Key).

   HINWEIS Netz: Wycheproof/NIST-CAVP-Dateien konnten NICHT geladen werden (Netz
   im Sandbox blockiert). Es liefen daher RFC-5869-HKDF + publizierte GCM-256-
   Anker (Node-OpenSSL ↔ WebCrypto) + funktionale Block-Prüfungen — KEIN
   Wycheproof-Über-Claim.
   ════════════════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const nodeCrypto = require('node:crypto');
const { webcrypto } = nodeCrypto;

const BLOCK_PATH = path.join(__dirname, '..', 'vivodepot-krypto-kern-PORT-VERBATIM.js');
const EXPECTED_PIN = '732ff4b0dc74e7ae9cce9febc8eb5cb3d8e52150775f88c80ff1f8967a8a6282';

let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; fails.push(name + (detail ? ' — ' + detail : '')); console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
async function checkThrows(name, fn) {
  let threw = false;
  try { await fn(); } catch (_) { threw = true; }
  check(name, threw, threw ? '' : 'erwartete Ausnahme blieb aus');
}

/* ── Block laden (nur die kanonische Quelle, eigener vm-Kontext) ─────────── */
const src = fs.readFileSync(BLOCK_PATH, 'utf8');
const actualPin = nodeCrypto.createHash('sha256').update(src, 'utf8').digest('hex');

// `setupMasterSession` NICHT mehr im Export (Krypto-Kapselung Weg A, 18.09.2026): es ist
// seither der einzige Schreiber des lebenden Sitzungsschlüssels und liegt darum INNERHALB
// der VdCrypto-Hülle — genau der Schutzgegenstand, den dieser Harness gegenprüfen soll, nicht
// bloß aufzählen soll. Erreichbar bleibt es unverändert über `VdCrypto.setupSession(...)`.
const HOOK = ';globalThis.__H__ = { deriveMasterBits, importMasterAesKey, importMasterHkdfKey,'
  + ' deriveKey, encryptData, decryptData, deriveSubKey, deriveDepotKeyV2, _deriveHkdfRaw,'
  + ' bytesToBase64, base64ToBytes, VdCrypto, PBKDF2_ITERATIONS,'
  + ' HKDF_INFO_DEPOT_V2_PREFIX, HKDF_HASH, HKDF_KEY_LENGTH_BITS, CRYPTO_VERSION_AKTUELL,'
  + ' KRYPTO_VERSION_ALLOWLIST, _AAD_DEPOT_V2, _AAD_UEBERGABE_V2,'
  // Zerfall in Feld-Einheiten (19.08.2026), Krypto-Generation 4:
  + ' CRYPTO_VERSION_ZERFALL, ZERFALL_ADRESSE_BYTES, HKDF_INFO_ADRESSE_V4_PREFIX,'
  + ' deriveAdressKeyV4, feldAdresseV4, _aadEinheitV4,'
  + ' _einheitSchluesselNeu, _einheitSchluesselWickeln, _einheitSchluesselEntwickeln };';

const sandbox = {
  window: { crypto: webcrypto },
  crypto: webcrypto,
  TextEncoder, TextDecoder,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + HOOK, sandbox, { filename: 'PORT-VERBATIM.js(+hook)' });
const H = sandbox.__H__;

// Kontext-Realm-Uint8Array aus Hex (sonst bricht der instanceof-Check in deriveDepotKeyV2).
const hexBytes = (hex) => H.base64ToBytes(Buffer.from(hex, 'hex').toString('base64'));
const toHex = (ab) => Buffer.from(new Uint8Array(ab)).toString('hex');

/* ── RFC 5869 HKDF-SHA256 Testvektoren (normativ, hartkodiert) ───────────── */
const RFC5869 = [
  { id: 'A.1',
    ikm: '0b'.repeat(22),
    salt: '000102030405060708090a0b0c',
    info: 'f0f1f2f3f4f5f6f7f8f9',
    L: 42,
    okm: '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865' },
  { id: 'A.2',
    ikm: Array.from({length:80},(_,i)=>i.toString(16).padStart(2,'0')).join(''),
    salt: Array.from({length:80},(_,i)=>(0x60+i).toString(16).padStart(2,'0')).join(''),
    info: Array.from({length:80},(_,i)=>(0xb0+i).toString(16).padStart(2,'0')).join(''),
    L: 82,
    okm: 'b11e398dc80327a1c8e7f78c596a49344f012eda2d4efad8a050cc4c19afa97c59045a99cac7827271cb41c65e590e09da3275600c2f09b8367793a9aca3db71cc30c58179ec3e87c14c01d5c1f3434f1d87' },
  { id: 'A.3 (zero salt/info)',
    ikm: '0b'.repeat(22),
    salt: '',
    info: '',
    L: 42,
    okm: '8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8' },
];

async function hkdfOKM(ikmHex, saltHex, infoHex, L) {
  const key = await H.importMasterHkdfKey(hexBytes(ikmHex));
  const okm = await H._deriveHkdfRaw(key, hexBytes(saltHex), hexBytes(infoHex), L * 8);
  return toHex(okm);
}

/* ── AES-256-GCM publizierte Anker (McGrew/Viega GCM-Spec = NIST TC 13/14) ── */
const GCM256 = [
  { id: 'TC13 (leerer PT)',
    key: '00'.repeat(32), iv: '00'.repeat(12), pt: '', aad: '',
    ct: '', tag: '530f8afbc74536b9a963b4f1c4cb738b' },
  { id: 'TC14 (16-Byte-Null-PT)',
    key: '00'.repeat(32), iv: '00'.repeat(12), pt: '00'.repeat(16), aad: '',
    ct: 'cea7403d4d606b6e074ec5d3baf39d18', tag: 'd0d1c8a799996bf0265b98b5d48ab919' },
];

function nodeGcm(keyHex, ivHex, ptHex, aadHex) {
  const c = nodeCrypto.createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
  if (aadHex) c.setAAD(Buffer.from(aadHex, 'hex'));
  const ct = Buffer.concat([c.update(Buffer.from(ptHex, 'hex')), c.final()]);
  return { ct: ct.toString('hex'), tag: c.getAuthTag().toString('hex') };
}
async function webcryptoGcm(keyHex, ivHex, ptHex, aadHex) {
  const key = await webcrypto.subtle.importKey('raw', Buffer.from(keyHex, 'hex'), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const params = { name: 'AES-GCM', iv: Buffer.from(ivHex, 'hex'), tagLength: 128 };
  if (aadHex) params.additionalData = Buffer.from(aadHex, 'hex');
  const out = Buffer.from(new Uint8Array(await webcrypto.subtle.encrypt(params, key, Buffer.from(ptHex, 'hex'))));
  return { ct: out.slice(0, out.length - 16).toString('hex'), tag: out.slice(out.length - 16).toString('hex') };
}

/* ── Lauf ───────────────────────────────────────────────────────────────── */
(async () => {
  console.log('UNABHÄNGIGER KRYPTO-HARNESS — neuer Block ' + EXPECTED_PIN.slice(0, 8) + '…\n');

  console.log('[0] Block-Quelle');
  check('PORT-VERBATIM.js-Hash == erwarteter neuer Pin', actualPin === EXPECTED_PIN, actualPin.slice(0, 16) + '…');
  /* 19.08.2026: die Allowlist trägt [3, 4]. Nicht schwächer, sondern genauer —
     was hier bewacht wird, ist die ABWESENHEIT der Legacy-Versionen 1 und 2, und
     die steht jetzt als eigene Zusicherung da statt als Nebenwirkung eines
     Literalvergleichs. v3 bleibt der RÜCKWEG, nicht ein Legacy-Pfad. */
  check('Block exponiert v3-Konstanten', H.CRYPTO_VERSION_AKTUELL === 3);
  check('Block exponiert die Zerfall-Version 4', H.CRYPTO_VERSION_ZERFALL === 4);
  check('Allowlist ist [3, 4]', JSON.stringify(Array.from(H.KRYPTO_VERSION_ALLOWLIST)) === '[3,4]',
    JSON.stringify(Array.from(H.KRYPTO_VERSION_ALLOWLIST || [])));
  check('Allowlist ohne Legacy-Versionen 1/2',
    !Array.from(H.KRYPTO_VERSION_ALLOWLIST).some((v) => v === 1 || v === 2));
  check('Info-Pfad ist v3-domain-separiert', H.HKDF_INFO_DEPOT_V2_PREFIX === 'vivodepot/v3/depot/', H.HKDF_INFO_DEPOT_V2_PREFIX);
  check('Block-Quelle ohne Legacy-Reste', !/function\s+deriveKeyLegacy/.test(src) && !/PBKDF2_ITERATIONS_LEGACY\s*=/.test(src));
  check('setupMasterSession ohne Direkt-Bit-AES (Schlüsseltrennung)', !/sessionKey\s*=\s*await\s+importMasterAesKey/.test(src));

  console.log('\n[1] RFC 5869 HKDF-SHA256 (normative Vektoren → Block _deriveHkdfRaw)');
  for (const v of RFC5869) {
    const got = await hkdfOKM(v.ikm, v.salt, v.info, v.L);
    check('RFC5869 ' + v.id + ': OKM byte-exakt', got === v.okm, got === v.okm ? '' : 'got=' + got);
  }

  console.log('\n[2] AES-256-GCM publizierte Anker — Node-OpenSSL ↔ WebCrypto');
  for (const v of GCM256) {
    const n = nodeGcm(v.key, v.iv, v.pt, v.aad);
    const w = await webcryptoGcm(v.key, v.iv, v.pt, v.aad);
    check('GCM256 ' + v.id + ': Node-OpenSSL == publizierter Anker', n.ct === v.ct && n.tag === v.tag, 'ct=' + n.ct + ' tag=' + n.tag);
    check('GCM256 ' + v.id + ': WebCrypto == publizierter Anker (Block-Engine)', w.ct === v.ct && w.tag === v.tag, 'ct=' + w.ct + ' tag=' + w.tag);
    check('GCM256 ' + v.id + ': Engines stimmen über Kreuz überein', n.ct === w.ct && n.tag === w.tag);
  }
  // Cross-Engine-Round-Trip mit zufälligen Parametern (Node verschlüsselt → WebCrypto entschlüsselt)
  {
    const key = nodeCrypto.randomBytes(32), iv = nodeCrypto.randomBytes(12), aad = nodeCrypto.randomBytes(20), pt = nodeCrypto.randomBytes(64);
    const c = nodeCrypto.createCipheriv('aes-256-gcm', key, iv); c.setAAD(aad);
    const ct = Buffer.concat([c.update(pt), c.final()]); const tag = c.getAuthTag();
    const wk = await webcrypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
    const dec = Buffer.from(new Uint8Array(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, wk, Buffer.concat([ct, tag]))));
    check('GCM256 Cross-Engine: Node-encrypt → WebCrypto-decrypt round-trip', dec.equals(pt));
  }

  console.log('\n[3] Funktionale Über-Kreuz-Prüfungen am echten Block');
  const pw = 'harness-ascii-123';
  const pbkdf2Salt = hexBytes('00112233445566778899aabbccddeeff');     // 16 B
  const depotSalt = hexBytes('aa'.repeat(32));                          // 32 B
  const uuidA = '11111111-1111-4111-8111-111111111111';
  const uuidB = '22222222-2222-4222-8222-222222222222';
  const bits = await H.deriveMasterBits(pw, pbkdf2Salt);               // PBKDF2-600k (langsam)
  const directKey = await H.importMasterAesKey(bits);                  // alt-direkter Bit-AES
  const hkdf = await H.importMasterHkdfKey(bits);
  const keyA = await H.deriveDepotKeyV2(hkdf, depotSalt, uuidA);       // v3-HKDF
  const keyB = await H.deriveDepotKeyV2(hkdf, depotSalt, uuidB);

  // Round-Trip
  const encA = await H.VdCrypto.encryptDepot({ marker: 'rt' }, keyA, H._AAD_DEPOT_V2);
  const decA = await H.VdCrypto.decryptDepot(encA, keyA, H._AAD_DEPOT_V2);
  check('Round-Trip: encryptDepot→decryptDepot restauriert', decA && decA.marker === 'rt');

  // IV 12 Byte + frisch
  const encA2 = await H.VdCrypto.encryptDepot({ marker: 'rt' }, keyA, H._AAD_DEPOT_V2);
  check('IV ist 12 Byte', Buffer.from(encA.iv, 'base64').length === 12);
  check('IV frisch pro Encrypt (keine Wiederholung)', encA.iv !== encA2.iv);

  // AAD-Bindung: Depot-AAD ≠ Übergabe-AAD
  await checkThrows('AAD-Bindung: Depot-Container öffnet NICHT mit Übergabe-AAD',
    () => H.VdCrypto.decryptDepot(encA, keyA, H._AAD_UEBERGABE_V2));

  // GCM-Tag-Manipulation wirft
  const manip = JSON.parse(JSON.stringify(encA));
  const ctb = Buffer.from(manip.ct, 'base64'); ctb[0] ^= 0x01; manip.ct = ctb.toString('base64');
  await checkThrows('GCM-Tag: 1-Byte-ct-Manipulation wirft', () => H.VdCrypto.decryptDepot(manip, keyA, H._AAD_DEPOT_V2));

  // Domain-Separation: UUID-A-Key öffnet keinen UUID-B-Container
  await checkThrows('Domain-Separation: Key B (uuidB) öffnet A-Container NICHT',
    () => H.VdCrypto.decryptDepot(encA, keyB, H._AAD_DEPOT_V2));

  // v3-Schlüsseltrennung: alt-direkter-Bit-Container ≠ mit v3-HKDF entschlüsselbar
  const encDirekt = await H.VdCrypto.encryptDepot({ marker: 'direkt' }, directKey, H._AAD_DEPOT_V2);
  await checkThrows('v3-Trennung: v3-HKDF-Key öffnet alt-direkten-Bit-Container NICHT',
    () => H.VdCrypto.decryptDepot(encDirekt, keyA, H._AAD_DEPOT_V2));
  await checkThrows('v3-Trennung: alt-direkter-Bit-Key öffnet v3-HKDF-Container NICHT',
    () => H.VdCrypto.decryptDepot(encA, directKey, H._AAD_DEPOT_V2));

  // Übergabe-Pfad (deriveKey, PBKDF2-600k → AES direkt) Round-Trip grün
  const uebKey = await H.deriveKey(pw, pbkdf2Salt);
  const encU = await H.VdCrypto.encryptDepot({ u: true }, uebKey, H._AAD_UEBERGABE_V2);
  const decU = await H.VdCrypto.decryptDepot(encU, uebKey, H._AAD_UEBERGABE_V2);
  check('Übergabe-Pfad (deriveKey) Round-Trip grün', decU && decU.u === true);

  /* ══ [4] RFC 4231 — HMAC-SHA256, normativ und hartkodiert ═══════════════
     Die pseudonymen Adressen der Feld-Einheiten sind HMAC-SHA256 über den
     Feldnamen. Der Harness kannte HMAC bis zum 19.08.2026 nicht — er belegte
     die Adressierung also gar nicht, sondern setzte sie voraus. Die Vektoren
     stehen wörtlich in RFC 4231 §4 und werden über ZWEI Engines geprüft
     (Node-OpenSSL und WebCrypto), wie die GCM-Anker auch. TC5 (auf 128 Bit
     gekürzt) bleibt draussen: das Produkt kürzt anders (16 Byte am Stück,
     s. ZERFALL_ADRESSE_BYTES), und ein Vektor, der etwas anderes misst als
     das Produkt, belegt nichts. */
  console.log('\n[4] RFC 4231 HMAC-SHA256 (normative Vektoren, zwei Engines)');
  const RFC4231 = [
    { id: 'TC1', key: '0b'.repeat(20), data: '4869205468657265',
      mac: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7' },
    { id: 'TC2', key: '4a656665', data: '7768617420646f2079612077616e7420666f72206e6f7468696e673f',
      mac: '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843' },
    { id: 'TC3', key: 'aa'.repeat(20), data: 'dd'.repeat(50),
      mac: '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe' },
    { id: 'TC4', key: '0102030405060708090a0b0c0d0e0f10111213141516171819', data: 'cd'.repeat(50),
      mac: '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b' },
    { id: 'TC6', key: 'aa'.repeat(131),
      data: Buffer.from('Test Using Larger Than Block-Size Key - Hash Key First', 'utf8').toString('hex'),
      mac: '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54' },
    { id: 'TC7', key: 'aa'.repeat(131),
      data: Buffer.from('This is a test using a larger than block-size key and a larger than block-size data. '
        + 'The key needs to be hashed before being used by the HMAC algorithm.', 'utf8').toString('hex'),
      mac: '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2' },
  ];
  for (const v of RFC4231) {
    const n = nodeCrypto.createHmac('sha256', Buffer.from(v.key, 'hex'))
      .update(Buffer.from(v.data, 'hex')).digest('hex');
    const wk = await webcrypto.subtle.importKey('raw', Buffer.from(v.key, 'hex'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const w = Buffer.from(new Uint8Array(await webcrypto.subtle.sign('HMAC', wk, Buffer.from(v.data, 'hex')))).toString('hex');
    check('RFC4231 ' + v.id + ': Node-OpenSSL == normativer Vektor', n === v.mac, n);
    check('RFC4231 ' + v.id + ': WebCrypto == normativer Vektor (Block-Engine)', w === v.mac, w);
  }

  /* ══ [5] Zerfall in Feld-Einheiten — die neuen Primitiven ════════════════
     Vier Zusagen, die der Block seit dem 19.08.2026 macht und die der
     unabhängige Pfad bisher nicht prüfte. */
  console.log('\n[5] Zerfall in Feld-Einheiten (Krypto-Generation 4)');
  const adrA = await H.deriveAdressKeyV4(hkdf, depotSalt, uuidA);
  const adrB = await H.deriveAdressKeyV4(hkdf, depotSalt, uuidB);

  // 5.1 · Determinismus — ohne ihn ist die Adressierung angenommen, nicht belegt.
  const a1 = await H.feldAdresseV4(adrA, 'gesundheit.blutgruppe');
  const a2 = await H.feldAdresseV4(adrA, 'gesundheit.blutgruppe');
  const a3 = await H.feldAdresseV4(adrA, 'identitaet.vorname');
  const a4 = await H.feldAdresseV4(adrB, 'gesundheit.blutgruppe');
  check('Adresse: derselbe Name unter demselben Schlüssel ergibt dieselbe Adresse', a1 === a2, a1);
  check('Adresse: ein anderer Name ergibt eine andere Adresse', a1 !== a3);
  check('Adresse: derselbe Name unter einem ANDEREN Depot ergibt eine andere Adresse', a1 !== a4);
  check('Adresse: ' + H.ZERFALL_ADRESSE_BYTES + ' Byte, base64-kodiert',
    Buffer.from(a1, 'base64').length === H.ZERFALL_ADRESSE_BYTES, a1 + ' → ' + Buffer.from(a1, 'base64').length + ' B');
  check('Adress-Info-Pfad ist v4-domain-separiert und präfixfrei gegen den Depot-Pfad',
    H.HKDF_INFO_ADRESSE_V4_PREFIX === 'vivodepot/v4/adressen/'
    && !H.HKDF_INFO_ADRESSE_V4_PREFIX.startsWith(H.HKDF_INFO_DEPOT_V2_PREFIX)
    && !H.HKDF_INFO_DEPOT_V2_PREFIX.startsWith(H.HKDF_INFO_ADRESSE_V4_PREFIX),
    H.HKDF_INFO_ADRESSE_V4_PREFIX);

  // 5.2 · Trennung Adress-Schlüssel ↔ Inhaltsschlüssel: er benennt, er öffnet nie.
  check('Adress-Schlüssel ist ein HMAC-Schlüssel, nur zum Signieren',
    adrA.algorithm && adrA.algorithm.name === 'HMAC'
    && Array.from(adrA.usages).join(',') === 'sign',
    (adrA.algorithm || {}).name + ' [' + Array.from(adrA.usages || []).join(',') + ']');
  check('Adress-Schlüssel ist nicht extrahierbar', adrA.extractable === false);
  const aadA1 = H._aadEinheitV4(uuidA, a1);
  const { key: inhaltKey, roh: inhaltRoh } = await H._einheitSchluesselNeu();
  const zelle = await H.VdCrypto.encryptDepot({ name: 'gesundheit.blutgruppe', wert: '0 negativ' }, inhaltKey, aadA1);
  await checkThrows('Trennung: der Adress-Schlüssel öffnet KEINE Einheit',
    () => H.VdCrypto.decryptDepot(zelle, adrA, aadA1));
  await checkThrows('Trennung: der DEPOT-Schlüssel öffnet KEINE Einheit',
    () => H.VdCrypto.decryptDepot(zelle, keyA, aadA1));

  /* 5.3 · Der Umschlag um den Inhaltsschlüssel — und die Wege-Trennung: der
     SCHREIB-Schlüssel kann nur verschlüsseln, der aus dem Umschlag entwickelte
     LESE-Schlüssel nur entschlüsseln. Keiner von beiden ist extrahierbar. */
  const rohKopie = Uint8Array.from(inhaltRoh);
  const gewickelt = await H._einheitSchluesselWickeln(inhaltRoh, keyA, aadA1);
  check('Schreib-Weg: die rohen Schlüsselbytes sind nach dem Wickeln genullt',
    inhaltRoh.every((b) => b === 0) && rohKopie.some((b) => b !== 0));
  const entwickelt = await H._einheitSchluesselEntwickeln(gewickelt, keyA, aadA1);
  check('Umschlag: der entwickelte Inhaltsschlüssel ist NICHT extrahierbar', entwickelt.extractable === false);
  check('Umschlag: er darf nur entschlüsseln, nicht verschlüsseln',
    Array.from(entwickelt.usages).join(',') === 'decrypt', Array.from(entwickelt.usages).join(','));
  await checkThrows('Umschlag: exportKey auf den entwickelten Schlüssel wirft',
    () => webcrypto.subtle.exportKey('raw', entwickelt));
  await checkThrows('Umschlag: unter FREMDER AAD lässt er sich nicht entwickeln',
    () => H._einheitSchluesselEntwickeln(gewickelt, keyA, H._aadEinheitV4(uuidA, a3)));
  await checkThrows('Umschlag: mit dem Depot-Schlüssel eines ANDEREN Depots nicht entwickelbar',
    () => H._einheitSchluesselEntwickeln(gewickelt, keyB, aadA1));

  /* 5.4 · Die erweiterte AAD bindet die Einheit an ihren Platz — der
     Vertauschungs-Angriff aus A331, im unabhängigen Pfad und nicht nur in der
     Suite. Gemessen am ENTWICKELTEN Schlüssel, weil nur der entschlüsseln darf. */
  const dec1 = await H.VdCrypto.decryptDepot(zelle, entwickelt, aadA1);
  check('AAD: die Einheit öffnet an ihrem eigenen Platz', dec1 && dec1.wert === '0 negativ');
  await checkThrows('AAD: dieselbe Einheit an FREMDER Adresse öffnet nicht (Vertauschung)',
    () => H.VdCrypto.decryptDepot(zelle, entwickelt, H._aadEinheitV4(uuidA, a3)));
  await checkThrows('AAD: dieselbe Einheit in FREMDEM Depot öffnet nicht',
    () => H.VdCrypto.decryptDepot(zelle, entwickelt, H._aadEinheitV4(uuidB, a1)));
  await checkThrows('AAD: die alte Depot-AAD öffnet die Einheit nicht',
    () => H.VdCrypto.decryptDepot(zelle, entwickelt, H._AAD_DEPOT_V2));
  check('AAD einer Einheit trägt kryptoVersion 4, depotUUID und Adresse',
    aadA1.kryptoVersion === 4 && aadA1.depotUUID === uuidA && aadA1.adresse === a1);

  console.log('\n════════════════════════════════════════════════');
  console.log('ERGEBNIS: ' + pass + ' grün, ' + fail + ' rot');
  if (fail) { console.log('ROT:\n  - ' + fails.join('\n  - ')); process.exit(1); }
  console.log('ALLE GRÜN — unabhängiger Harness bestätigt den neuen Block (' + EXPECTED_PIN.slice(0, 8) + '…).');
})().catch((e) => { console.error('HARNESS-ABBRUCH:', e); process.exit(2); });
