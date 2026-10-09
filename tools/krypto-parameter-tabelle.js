#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Krypto-Parameter in SECURITY.md — aus dem Code erzeugt (04.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Krypto-Parameter standen verteilt in ADRs, FAQ, STANDARDS.md und auf der
   Website, eine Angabe wich vom Code ab (Salt-Länge), und eine ADR beschrieb
   eine Krypto-Version, die der Code nicht mehr liest. Diese Tabelle wird aus
   `vivodepot.html` und `vivodepot-lesen.html` gelesen, nicht geschrieben.

   Jeder Wert kommt über einen festen Anker aus dem Code. Trifft ein Anker nicht
   (oder nicht genau einmal), bricht der Bau ab — es gibt keinen Leerwert und
   keinen Rückfall auf einen alten Text. Die Code-Stelle steht als Konstante
   bzw. Funktion, nicht als Zeilennummer: sonst wäre der Block nach jedem
   Kern-Commit veraltet.

   Bauform wie `fassungen-register.js`:
     node tools/krypto-parameter-tabelle.js --build    schreibt den Block in SECURITY.md
     node tools/krypto-parameter-tabelle.js --check    Block ≠ Erzeugung oder Anker fehlt → Exit 1
     --kern <datei> --lesen <datei> --security <datei>  prüft andere Dateien (Probe)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ANFANG = '<!-- krypto-parameter:anfang — erzeugt von tools/krypto-parameter-tabelle.js --build, nicht von Hand ändern -->';
const ENDE = '<!-- krypto-parameter:ende -->';

// Genau ein Treffer, sonst Abbruch mit dem Namen des Ankers.
function eins(text, muster, name) {
  const alle = [...text.matchAll(new RegExp(muster.source, muster.flags.includes('g') ? muster.flags : muster.flags + 'g'))];
  if (alle.length !== 1) throw new Error('Anker „' + name + '“ trifft ' + alle.length + '-mal statt einmal');
  return alle[0];
}

// Der Rumpf einer Top-Level-Funktion bis zur nächsten Top-Level-Deklaration.
function rumpf(text, name) {
  const m = eins(text, new RegExp('^(?:async )?function ' + name + '\\(', 'm'), 'function ' + name);
  const rest = text.slice(m.index);
  const ende = rest.slice(1).search(/\n(?:async function |function |const |let |\/\*)/);
  return ende < 0 ? rest : rest.slice(0, ende + 1);
}

function zahl(text, muster, name) { return Number(eins(text, muster, name)[1]); }

function gleich(werte, name) {
  if (new Set(werte.map(String)).size !== 1) throw new Error('Anker „' + name + '“ uneinheitlich: ' + werte.join(' / '));
  return werte[0];
}

const c = (s) => '`' + s + '`';

/* Rein: Kern- und Lese-App-Text → Zeilen [Angabe, Wert, Code-Stelle, Auflage]. */
function zeilen(kern, lesen) {
  const iter = zahl(kern, /^const PBKDF2_ITERATIONS = (\d+);/m, 'PBKDF2_ITERATIONS');
  const iterLesen = zahl(lesen, /^const PBKDF2_ITERATIONS = (\d+);/m, 'PBKDF2_ITERATIONS (Lese-App)');
  gleich([iter, iterLesen], 'PBKDF2_ITERATIONS Kern/Lese-App');
  const bits = zahl(kern, /^const HKDF_KEY_LENGTH_BITS = (\d+);/m, 'HKDF_KEY_LENGTH_BITS');
  const hash = eins(rumpf(kern, 'deriveMasterBits'), /name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: '(SHA-\d+)'/, 'deriveMasterBits')[1];
  const hkdfHash = eins(kern, /^const HKDF_HASH = '(SHA-\d+)';/m, 'HKDF_HASH')[1];

  const saltAnlegen = zahl(rumpf(kern, 'depotAnlegen'), /const pbkdf2Salt = crypto\.getRandomValues\(new Uint8Array\((\d+)\)\)/, 'depotAnlegen pbkdf2Salt');
  const saltWechsel = zahl(rumpf(kern, 'passwortWechselDurchfuehren'), /aktuelleSalt = crypto\.getRandomValues\(new Uint8Array\((\d+)\)\)/, 'passwortWechselDurchfuehren aktuelleSalt');
  const pbkdf2Salt = gleich([saltAnlegen, saltWechsel], 'PBKDF2-Salt');

  const depotSalt = zahl(kern, /^const SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES = (\d+);/m, 'SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES');
  const infoDepot = eins(kern, /^const HKDF_INFO_DEPOT_V2_PREFIX = '([^']+)';/m, 'HKDF_INFO_DEPOT_V2_PREFIX')[1];
  const infoAdresse = eins(kern, /^const HKDF_INFO_ADRESSE_V4_PREFIX = '([^']+)';/m, 'HKDF_INFO_ADRESSE_V4_PREFIX')[1];
  const infoHalter = eins(kern, /^const HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX = '([^']+)';/m, 'HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX')[1];
  const depotKey = rumpf(kern, 'deriveDepotKeyV2');
  eins(depotKey, /info: enc\.encode\(HKDF_INFO_DEPOT_V2_PREFIX \+ depotUUID\)/, 'deriveDepotKeyV2 Info');
  eins(depotKey, /\{ name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS \},\s*false,/, 'deriveDepotKeyV2 nicht extrahierbar');

  const enc = rumpf(kern, 'encryptData');
  const iv = zahl(enc, /const iv = crypto\.getRandomValues\(new Uint8Array\((\d+)\)\);/, 'encryptData IV');
  eins(enc, /const params = \{ name: 'AES-GCM', iv \};/, 'encryptData ohne tagLength');

  const allow = (t, n) => eins(t, /^const KRYPTO_VERSION_ALLOWLIST = \[([\d, ]+)\];/m, n)[1].replace(/\s/g, '');
  const versionen = gleich([allow(kern, 'KRYPTO_VERSION_ALLOWLIST'), allow(lesen, 'KRYPTO_VERSION_ALLOWLIST (Lese-App)')], 'Allowlist Kern/Lese-App');

  const aadV3 = eins(kern, /^const _AAD_DEPOT_V2 = Object\.freeze\(\{ ([^}]+) \}\);/m, '_AAD_DEPOT_V2')[1]
    .split(',').map((f) => f.split(':')[0].trim());
  const aadV4 = [...rumpf(kern, '_aadEinheitV4').matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
  if (aadV4.length < 3) throw new Error('Anker „_aadEinheitV4“ liefert zu wenige Felder');

  eins(rumpf(kern, '_einheitSchluesselNeu'), /crypto\.getRandomValues\(new Uint8Array\(HKDF_KEY_LENGTH_BITS \/ 8\)\)/, '_einheitSchluesselNeu');
  const adresseBytes = zahl(kern, /^const ZERFALL_ADRESSE_BYTES = (\d+);/m, 'ZERFALL_ADRESSE_BYTES');
  eins(rumpf(kern, 'deriveAdressKeyV4'), /\{ name: 'HMAC', hash: HKDF_HASH, length: HKDF_KEY_LENGTH_BITS \}/, 'deriveAdressKeyV4 HMAC');

  eins(rumpf(kern, '_fachTuerSchluessel'), /return deriveDepotKeyV2\(master, tuerSalt, depotUUID\);/, '_fachTuerSchluessel');
  rumpf(kern, '_zerfallAttrappe');

  const whcStellen = zahl(kern, /^const WHC_STELLEN = (\d+);/m, 'WHC_STELLEN');
  const whcFrisch = rumpf(kern, '_whcFrisch');
  const whcSalz = zahl(whcFrisch, /salz: crypto\.getRandomValues\(new Uint8Array\((\d+)\)\)/, '_whcFrisch Salz');
  const whcIv = zahl(whcFrisch, /iv: crypto\.getRandomValues\(new Uint8Array\((\d+)\)\)/, '_whcFrisch IV');

  eins(rumpf(kern, '_empfaengerQrSchluesselVerschluesseln'), /iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' \},\s*basis, \{ name: 'AES-GCM', length: 256 \}/, 'QR-Übergabe');
  eins(rumpf(lesen, '_angDeriveKey'), /\{ name: 'PBKDF2', salt: saltBytes, iterations: ANG_PBKDF2_ITERATIONEN, hash: 'SHA-256' \},\s*basis, \{ name: 'AES-GCM', length: 256 \}/, '_angDeriveKey (Lese-App)');
  const p2c = zahl(kern, /^const ANTWORT_JWE_P2C = (\d+);/m, 'ANTWORT_JWE_P2C');
  const pbesHash = eins(rumpf(kern, '_jwePbes2Schluessel'), /hash: '(SHA-\d+)'/, '_jwePbes2Schluessel')[1];
  eins(rumpf(kern, '_jweCompactDir'), /alg: 'dir', enc: 'A256GCM'/, '_jweCompactDir');
  eins(rumpf(kern, 'antwortJwePasswort'), /generateKey\(\{ name: 'AES-GCM', length: 256 \}, true, \['encrypt'\]\)/, 'antwortJwePasswort Inhaltsschlüssel');

  const tsd = (n) => n.toLocaleString('de-DE');
  return [
    ['Passwort-Ableitung', 'PBKDF2-HMAC-' + hash + ', ' + tsd(iter) + ' Iterationen, Ergebnis ' + bits + ' Bit; das Ergebnis ist nur Eingangsschlüssel für HKDF',
      c('PBKDF2_ITERATIONS') + ', ' + c('deriveMasterBits'), 'U2-ADR-213'],
    ['PBKDF2-Salt', pbkdf2Salt + ' Byte, zufällig, neu beim Anlegen und bei jedem Passwortwechsel',
      c('depotAnlegen') + ', ' + c('passwortWechselDurchfuehren'), 'U2-ADR-002'],
    ['Depot-Schlüssel', 'HKDF-' + hkdfHash + ', Salt ' + depotSalt + ' Byte je Depot, Info ' + c(infoDepot) + ' + Depot-UUID, AES-GCM ' + bits + ' Bit, nicht extrahierbar',
      c('deriveDepotKeyV2') + ', ' + c('SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES'), 'U2-ADR-002, U2-ADR-016 · externer Review empfohlen'],
    ['Verschlüsselung', 'AES-' + bits + '-GCM, IV ' + iv + ' Byte, je Verschlüsselung neu per ' + c('crypto.getRandomValues') + ', Tag 128 Bit (WebCrypto-Vorgabe)',
      c('encryptData'), ''],
    ['Krypto-Versionen', '[' + versionen.replace(/,/g, ', ') + '], in Kern und Lese-App vor jeder Ableitung aus einem Depot-Umschlag geprüft',
      c('KRYPTO_VERSION_ALLOWLIST'), 'U2-ADR-149'],
    ['AAD (Version 3)', aadV3.map(c).join(', '), c('_AAD_DEPOT_V2'), 'B16-ADR-085-Nachtrag'],
    ['AAD je Feld-Einheit (Version 4)', aadV4.map(c).join(', '), c('_aadEinheitV4'), 'U2-ADR-149'],
    ['Feld-Einheiten', 'je Einheit ein eigener Inhaltsschlüssel aus ' + bits / 8 + ' Zufallsbyte, unter dem Depot-Schlüssel gewickelt',
      c('_einheitSchluesselNeu'), 'U2-ADR-149'],
    ['Feld-Adressen', 'HMAC-' + hkdfHash + ' über den Feldnamen, auf ' + adresseBytes + ' Byte gekürzt; Schlüssel per HKDF, Info ' + c(infoAdresse) + ' + Depot-UUID',
      c('deriveAdressKeyV4') + ', ' + c('ZERFALL_ADRESSE_BYTES'), 'U2-ADR-149'],
    ['Signaturschlüssel der Halterin', 'Ed25519-Seed per HKDF, Info ' + c(infoHalter) + ' + Depot-UUID, nirgends gespeichert',
      c('deriveHalterSignaturV4'), 'U2-ADR-457 · Auflage: externer Review'],
    ['Fach-Tür (Empfängerkreise)', 'PBKDF2 über das Passwort der Empfängerin mit eigenem Salt, danach HKDF mit demselben Info-String wie der Depot-Schlüssel (' + c(infoDepot) + ')',
      c('_fachTuerSchluessel'), 'U2-ADR-156'],
    ['Fach-Zugang', 'der Fach-Schlüssel wickelt nur die freigegebenen Einheiten; für die übrigen stehen Attrappen gleicher Länge',
      c('_zerfallAttrappe'), 'U2-ADR-156'],
    ['Wiederherstellungs-Hülle', 'Code mit ' + whcStellen + ' Stellen Crockford-Base32; PBKDF2 (' + tsd(iter) + ') mit eigenem ' + whcSalz + '-Byte-Salt, das Ergebnis dient direkt als AES-GCM-Schlüssel (IV ' + whcIv + ' Byte) und wickelt das Ergebnis der Passwort-Ableitung',
      c('WHC_STELLEN') + ', ' + c('_whcFrisch') + ', ' + c('_whcEinwickeln'), 'U2-ADR-430'],
    ['QR-Übergabe', 'PBKDF2 (' + tsd(iter) + ') direkt zu AES-GCM 256 Bit, ohne HKDF', c('_empfaengerQrSchluesselVerschluesseln'), 'keine ADR'],
    ['Einmalpasswort (Lese-App)', 'PBKDF2 direkt zu einem AES-Schlüssel, ohne HKDF', c('_angDeriveKey'), 'U2-ADR-062, U2-ADR-153 · Auflage: externer Review'],
    ['Antwort als JWE, Einmalpasswort', 'PBES2-HS512+A256KW, PBKDF2-' + pbesHash + ' mit ' + tsd(p2c) + ' Iterationen', c('_jwePbes2Schluessel'), 'U2-ADR-449 · Auflage: externer Review'],
    ['SMART Health Link', 'JWE ' + c('alg: dir') + ', A256GCM, zufälliger Schlüssel ' + bits / 8 + ' Byte', c('_jweCompactDir'), 'U2-ADR-047 · externer Review empfohlen (von U2-ADR-449 und U2-ADR-457 als Auflage übernommen)'],
    ['Nicht extrahierbar', 'geheime Schlüssel werden mit ' + c('extractable: false') + ' abgeleitet oder importiert; benannte Ausnahme: der Inhaltsschlüssel der Antwort als JWE (' + c('antwortJwePasswort') + '), den das Einmalpasswort wickelt. Eine Prüfung der Suite sieht jede weitere Ausnahme', '—', 'U2-ADR-026'],
  ];
}

// Jede genannte Entscheidung muss als ADR-Datei unter docs/adr/ liegen.
function adrFehlend(z, adrNamen) {
  const fehlt = [];
  for (const r of z) for (const m of r[3].matchAll(/\b(U2|B16)-ADR-(\d+)(-Nachtrag)?/g)) {
    const muster = new RegExp('^vivodepot-' + m[1] + '-ADR-' + m[2] + (m[3] ? '-Nachtrag' : '-'), 'i');
    if (!adrNamen.some((n) => muster.test(n))) fehlt.push(m[0]);
  }
  return fehlt;
}

function block(kern, lesen, adrNamen = fs.readdirSync(path.join(REPO, 'docs', 'adr'))) {
  const kopf = '| Angabe | Wert | Code-Stelle | Entscheidung |\n|---|---|---|---|\n';
  const z = zeilen(kern, lesen);
  const fehlt = adrFehlend(z, adrNamen);
  if (fehlt.length) throw new Error('Entscheidung ohne ADR-Datei: ' + fehlt.join(', '));
  const rumpfText = z.map((z) => '| ' + z.map((x) => x || '—').join(' | ') + ' |').join('\n');
  return ANFANG + '\n\nDie Zahlen, Längen, Namen und Info-Präfixe in der Spalte „Wert“ sind aus `vivodepot.html` und `vivodepot-lesen.html` gelesen; die übrige Beschreibung und die Spalte „Entscheidung“ sind geschrieben und werden mit derselben Prüfung gehalten (jede genannte ADR muss als Datei vorliegen). „Auflage: externer Review“ heißt: die Entscheidung verlangt vor Produktivschaltung eine externe kryptographische Prüfung dieses Wegs; „externer Review empfohlen“ heißt: sie empfiehlt sie.\n\n' + kopf + rumpfText + '\n\n' + ENDE;
}

function ersetzen(security, neu) {
  const a = security.indexOf(ANFANG);
  const e = security.indexOf(ENDE);
  if (a < 0 || e < a) throw new Error('SECURITY.md trägt die Marken des Krypto-Blocks nicht');
  return security.slice(0, a) + neu + security.slice(e + ENDE.length);
}

function pruefen({ kern, lesen, security }) {
  const soll = block(kern, lesen);
  const a = security.indexOf(ANFANG);
  const e = security.indexOf(ENDE);
  if (a < 0 || e < a) return ['SECURITY.md trägt die Marken des Krypto-Blocks nicht'];
  return security.slice(a, e + ENDE.length) === soll ? [] : ['Der Krypto-Block in SECURITY.md entspricht nicht dem Code — node tools/krypto-parameter-tabelle.js --build'];
}

function main() {
  const argv = process.argv.slice(2);
  const wert = (n, v) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : path.join(REPO, v); };
  const dateien = { kern: wert('--kern', 'vivodepot.html'), lesen: wert('--lesen', 'vivodepot-lesen.html'), security: wert('--security', 'SECURITY.md') };
  const t = Object.fromEntries(Object.entries(dateien).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));
  if (argv.includes('--check')) {
    let befunde;
    try { befunde = pruefen(t); } catch (err) { befunde = [err.message]; }
    if (befunde.length) { for (const b of befunde) console.error('[krypto-parameter] ROT — ' + b); process.exit(1); }
    console.log('[krypto-parameter] grün — der Block in SECURITY.md entspricht dem Code.');
    return;
  }
  fs.writeFileSync(dateien.security, ersetzen(t.security, block(t.kern, t.lesen)));
  console.log('[krypto-parameter] Block geschrieben: ' + dateien.security);
}

if (require.main === module) main();
module.exports = { zeilen, block, ersetzen, pruefen, adrFehlend, ANFANG, ENDE };
