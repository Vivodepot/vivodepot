/* ════════════════════════════════════════════════════════════════════════
   ANMERKUNG SP — kein Code, sondern Hinweis für den Bau (29.05.2026)

   Dies ist die geprüfte Krypto-Kern-Schicht, WÖRTLICH aus VIVODEPOT.html
   (Schema 19) extrahiert. Sie ist NICHT neu zu generieren — sie ist zu
   portieren. Gib sie dem bauenden Modell als fertigen, unveränderlichen
   Block mit und lass es Hülle, Datenmodell, Modus und Design darum herum
   bauen.

   Regeln für das bauende Modell:
   • Diese Funktionen NICHT umschreiben, umbenennen oder "verbessern".
   • Die einzige nach außen gedachte API ist das Objekt VdCrypto am Ende:
       VdCrypto.setupSession(passwort, saltBytes)  -> Promise<void>
       VdCrypto.encryptDepot(obj, key, aad?)       -> Promise<{iv, ct}>
       VdCrypto.decryptDepot(stored, key, aad?)    -> Promise<obj>
   • Verschlüsselungs-Parameter sind in den AAD-Blöcken gebunden — beim
     Entschlüsseln dieselbe AAD übergeben, sonst schlägt GCM fehl (das ist
     gewollt: Manipulations- und Falschpasswort-Erkennung).
   • Klartext wird NIE auf den Stick geschrieben. removePassword() existiert
     nicht und darf nicht entstehen.

   Herkunft (Zeilen in VIVODEPOT.html):
     Konstanten            13610–13616, 14138–14151
     Modul-Zustand         14153, 14164–14165
     deriveMasterBits      14285–14295
     importMasterAesKey    14298–14303
     importMasterHkdfKey   14306–14310
     deriveKey             14218–14226
     deriveKeyLegacy       14229–14238
     encryptData           14240–14250
     decryptData           14252–14259
     deriveSubKey (v1)     14317–14331
     deriveDepotKeyV2      14344–14364
     _deriveHkdfRaw (Test) 14371–14382
     base64-Helfer         14386–14392
     setupMasterSession    14406–14411
     VdCrypto-Surface      14437–14442

   Nicht in diesem Block (kommen mit den jeweiligen Modulen):
     • Angehörigen-Krypto (eigener Salt/IV, Klasse-A-Trennung, ADR-052)
       → gehört zum Übergaben-Modul (ca. Z. 14444 ff.).
     • _verifyJWS (in der VdCrypto-Surface referenziert) → gehört zur
       VC-/Issuer-Schicht. Solange kein VC-Modul andockt, kann der Verweis
       auf verifyJWS in der Surface entfallen oder auf eine Stub-Funktion
       zeigen.
   ════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════
   WAS DIESER BLOCK IST (Nachtrag 18.09.2026, Krypto-Kapselung Weg A)
   ────────────────────────────────────────────────────────────────────────
   Dieser Block wird WORTGLEICH — byte für byte — in seine Träger übernommen.
   Die Kapselung hat daran nichts geändert, nur WAS innerhalb des Blocks
   geschieht (der lebende Sitzungsschlüssel `sessionHkdfKey` ist seither
   closure-privat in `VdCrypto`, nicht mehr ein plain-script-globaler Name).

   EINE Quelle, SECHS Träger — alle byte-identisch zu genau diesem Block:
     vivodepot.html (dieser Block), vivodepot-lesen.html,
     vivodepot-schluessel-teilen.html, vivodepot-template-generator.html,
     vivodepot-vc-issuer.html, und die kanonische Quelle
     vivodepot-krypto-kern-PORT-VERBATIM.js.

   Das hält nicht dieser Kommentar, sondern ein Prüfer:
     node tools/krypto-block-propagation-pruefen.js
   Er vergleicht jeden Träger byte-genau gegen die kanonische Quelle, hält
   eine Mindestzahl (`TRAEGER_MINDESTZAHL`) gegen ein stilles Herausfallen,
   und prüft jede Pin-Stelle (Voll- und Kurz-Hash) im übrigen Repo gegen den
   aktuellen Block-Hash. Ein Name kann diese Zusicherung nicht tragen — nur
   ein Lauf, der grün oder rot wird.
   ════════════════════════════════════════════════════════════════════════ */


/* ── Konstanten ───────────────────────────────────────────────────────── */

// Check if encryption is available
const CRYPTO_AVAILABLE = !!(window.crypto && window.crypto.subtle);

// AP1-Krypto-Aufrüstung: Iterationszahl als Konstante (OWASP PBKDF2-HMAC-SHA256 Empfehlung 2024)
const PBKDF2_ITERATIONS = 600000;
// B2/v3 (2026-06-12): Legacy-200k-Pfad ersatzlos entfernt (deriveKeyLegacy + PBKDF2_ITERATIONS_LEGACY).

const HKDF_INFO_SUBDEPOT_V1   = 'vivodepot-subdepot-v1';
// KRYPTO-KRITISCH (B2/v3): EIN Domain-Sep-Pfad für Anker UND Sub (ADR-068 v2: „Anker IST ein Depot").
// Identifier-Name als stabiles Label belassen (in Hülle/Tests verdrahtet); Krypto-Generation = v3.
// Domain-separiert/präfixfrei: 'vivodepot/v3/depot/' + depotUUID. Kein String ist Präfix eines anderen.
const HKDF_INFO_DEPOT_V2_PREFIX = 'vivodepot/v3/depot/';
const HKDF_HASH = 'SHA-256';
const HKDF_KEY_LENGTH_BITS = 256;
const SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES = 32;
const CRYPTO_VERSION_AKTUELL = 3; // B2/v3 (2026-06-12): Schlüsseltrennung — PBKDF2-Bits nur noch HKDF-Eingang; war 2.
// ADR-085-Nachtrag: Harte Allowlist — kein Try-Catch-Fallback für unbekannte Versionen.
// B2/v3 (2026-06-12): Release ist v3-only. Keine Lese-Pfade für v1/v2 mehr.
/* ZERFALL IN FELD-EINHEITEN (18.08.2026) — Krypto-Generation 4.
   `KRYPTO_VERSION_ALLOWLIST` trägt BEIDE: v3 ist nicht nur der Migrationsweg, sondern der
   RÜCKWEG, falls sich der Zerfall als falsch erweist. Er wird nicht entfernt, und wer ihn
   entfernen will, braucht dafür eine eigene Entscheidung (Auflage A2 zum Bauauftrag).
   Warum die Version überhaupt steigt, und das ist keine Wahl, sondern eine Folge: eine
   zerfallene Datei mit `kryptoVersion: 3` käme durch das Gate und scheiterte danach — ein
   verwirrender Fehler statt eines klaren. */
const CRYPTO_VERSION_ZERFALL = 4;
const KRYPTO_VERSION_ALLOWLIST = [3, 4];
// ADR-085-Nachtrag: AAD-Blöcke für AES-GCM-Bindung der Krypto-Parameter.
// Depot-Pfad (HKDF-abgeleitete Sub-Keys): kdfTyp 'hkdf-sha256'.
// Übergabe-Pfad (direkter PBKDF2-Schlüssel): kdfTyp 'pbkdf2-sha256'.
// Identifier-Namen (_AAD_*_V2) als stabile Labels belassen; kryptoVersion-Feld = 3.
const _AAD_DEPOT_V2 = Object.freeze({ kryptoVersion: 3, iterationen: PBKDF2_ITERATIONS, kdfTyp: 'hkdf-sha256' });
const _AAD_UEBERGABE_V2 = Object.freeze({ kryptoVersion: 3, iterationen: PBKDF2_ITERATIONS, kdfTyp: 'pbkdf2-sha256' });


/* ── Modul-Zustand (Session-only, NIE persistieren) ───────────────────── */

// `sessionKey` (18.09.2026, Krypto-Kapselung Weg A): ENTFERNT, nicht nur
// versteckt — war seit der Schlüsseltrennung (B2/v3, 2026-06-12) bereits tot (immer `null`,
// nie geschrieben, nur in Kommentaren referenziert, s. Herkunfts-Kommentar zu
// setupMasterSession unten). Ein toter Name kostet beim Neu-Pinnen genauso wie ein lebender —
// er fliegt im selben Zug raus.
// AP 5.2 (ADR-052): Master-Schlüssel-Doppel-Repräsentation und Salt-Speicher.
//
// `sessionHkdfKey` (18.09.2026): war bis heute ein plain-script-globaler
// `let` — in einem <script>-Block ohne Modul-/IIFE-Grenze ist JEDE Top-Level-Deklaration
// vom gesamten Rest der Seite aus erreichbar. `extractable: false` schützt die BYTES des
// CryptoKey, nicht seine BENUTZUNG — wer den lebenden Sitzungsschlüssel erreicht, leitet
// und entschlüsselt, ohne je zu exportieren. Zehn Lesestellen im Kern fragten nur „ist eine
// Sitzung offen" (jetzt `VdCrypto.sitzungOffen()`), zwei setzten zurück (jetzt
// `VdCrypto.sitzungBeenden()`), drei leiteten direkt damit ab (jetzt `VdCrypto.depotSchluessel()`/
// `VdCrypto.adressKey()`, beide ohne Master-Parameter — der Schlüssel bleibt in der Hülle).
// GRUNDSATZ (18.09.2026): geschützt wird das GEHEIMNIS, nicht der ALGORITHMUS —
// `deriveDepotKeyV2`/`deriveAdressKeyV4`/`encryptData`/`decryptData` u. a. bleiben bewusst
// globale, direkt aufrufbare Primitiven (s. Kommentar an `deriveDepotKeyV2`). Ohne den
// lebenden Schlüssel ist eine Ableitungsfunktion für einen Angreifer wertlos — ein
// erreichbarer Schlüssel ist alles. Nur `sessionHkdfKey` selbst zieht darum in die
// closure-private Variable unten, direkt vor `setupMasterSession`, ihrem einzigen Schreiber.
let storedPbkdf2Salt = null;


/* ── Master-Bit-Ableitung und Schlüssel-Import ────────────────────────── */

// PBKDF2-600k → 256 raw bits (ArrayBuffer). Wird zwei Mal verwendet
// (importMasterAesKey + importMasterHkdfKey), danach defensiv überschrieben.
async function deriveMasterBits(password, salt) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    km,
    HKDF_KEY_LENGTH_BITS
  );
}

// Bits → AES-GCM-CryptoKey für ankerPerson-Verschlüsselung.
async function importMasterAesKey(bits) {
  return crypto.subtle.importKey(
    'raw', bits, { name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS },
    false, ['encrypt', 'decrypt']
  );
}

// Bits → HKDF-CryptoKey für Sub-Schlüssel-Ableitung (RFC 5869).
async function importMasterHkdfKey(bits) {
  return crypto.subtle.importKey(
    'raw', bits, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']
  );
}


/* ── deriveKey (Übergabe-Pfad, PBKDF2-600k → AES; Design, NICHT Legacy) ── */

// B2-Abgrenzung: Dieser direkte PBKDF2→AES-Pfad bleibt für Übergabe-Container
// (Empfänger ohne HKDF-Wurzel), inkl. AAD-kdfTyp 'pbkdf2-sha256'. Er ist die
// EINZIGE legitime Direkt-Bit→AES-Verwendung; der Session-/Anker-Pfad nutzt
// ausschließlich HKDF (Schlüsseltrennung).
async function deriveKey(password, salt) {
  // AP 5.2 (ADR-052, Plan §1.7): intern auf zwei-Schritt-Sequenz umgestellt
  // (deriveMasterBits + importMasterAesKey), Signatur unverändert. Funktional
  // identisch zur Beta-17-Implementation.
  const bits = await deriveMasterBits(password, salt);
  return importMasterAesKey(bits);
}

// B2/v3 (2026-06-12): deriveKeyLegacy (200k) ersatzlos entfernt — v3-only Release.


/* ── encryptData / decryptData (AES-256-GCM, optionaler AAD-Block) ────── */

// S17 (CC-Auftrag „Die Base64-Grenzen", 09.08.2026): Array.from+join legte für jedes
// Ciphertext-Byte ein eigenes Ein-Zeichen-String-Objekt an. Bei einem ~90-100 MB großen
// Depot (im Alltag erreichbar — z. B. zwanzig Fotos üblicher Handygröße in der Mappe)
// schlug das fehl: RangeError „Invalid array length" (gemessen: Chromium/Node ab ~129 MB;
// Firefox ab ~270 MB, dort als rohe Zeichenkette "out of memory" geworfen, kein
// Error-Objekt). Blockweise Umwandlung ist byte-identisch zum alten Verfahren (belegt:
// tests/vdcrypto-block-base64-chunking.test.js) und übersteht denselben Kipppunkt.
function _bytesAlsBinaerstring(bytes) {
  const CHUNK = 8192;
  const teile = [];
  for (let i = 0; i < bytes.length; i += CHUNK) teile.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
  return teile.join('');
}

async function encryptData(obj, key, aad = null) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const params = { name: 'AES-GCM', iv };
  if (aad !== null) params.additionalData = new TextEncoder().encode(JSON.stringify(aad));
  const ciphertext = await crypto.subtle.encrypt(params, key, enc.encode(JSON.stringify(obj)));
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ct: btoa(_bytesAlsBinaerstring(new Uint8Array(ciphertext)))
  };
}

async function decryptData(stored, key, aad = null) {
  const iv = Uint8Array.from(atob(stored.iv), c=>c.charCodeAt(0));
  const ct = Uint8Array.from(atob(stored.ct), c=>c.charCodeAt(0));
  const params = { name: 'AES-GCM', iv };
  if (aad !== null) params.additionalData = new TextEncoder().encode(JSON.stringify(aad));
  const plain = await crypto.subtle.decrypt(params, key, ct);
  return JSON.parse(new TextDecoder().decode(plain));
}


/* ── Sub-Schlüssel-Ableitung (HKDF) — für Sub-Depots / Übergaben ──────── */

// HKDF mit fest codiertem Info-String → AES-GCM-Sub-Key für ein Sub-Depot.
// HISTORISCH (cryptoVersion 1): kein aktiver Aufrufer; v1-Container werden im
// v3-Release nicht mehr gelesen (Allowlist [3]). Funktion verbatim belassen
// (nicht zum Ausbau autorisiert). KRYPTO-KRITISCH.
async function deriveSubKey(masterHkdfKey, cryptoSalt) {
  const enc = new TextEncoder();
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: HKDF_HASH,
      salt: cryptoSalt,
      info: enc.encode(HKDF_INFO_SUBDEPOT_V1),
    },
    masterHkdfKey,
    { name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

// KRYPTO-KRITISCH (ADR-068 v2 Sprint 1): HKDF-Sub-Schlüssel pro Depot mit
// depotUUID als Info-String — pro-Depot-Eindeutigkeit für Anker UND Sub-Depots.
// Produktions-API für cryptoVersion 3 (B2/v3: Info-Pfad 'vivodepot/v3/depot/').
// Funktionsname als stabiles Label belassen (in Hülle/Tests verdrahtet).
//
// BLEIBT ABSICHTLICH GLOBAL, NICHT IN DER VdCrypto-HÜLLE (18.09.2026,
// Krypto-Kapselung Weg A): geschützt wird das GEHEIMNIS, nicht der ALGORITHMUS. Diese
// Funktion nimmt ihren Master als expliziten Parameter — sie hat kein eigenes Geheimnis,
// nur eine Ableitungsvorschrift, die jeder mit Code-Ausführung in fünf Zeilen selbst
// schreiben könnte. Sie wird heute schon LEGITIM mit einem NICHT-Sitzungs-Master direkt
// aufgerufen (fremde, empfängerspezifische Master aus Passwörtern Dritter — s.
// `_fachTuerSchluessel`, `_passwortProbeRoundtrip`, `subDepotVersiegeln`/`subDepotEntsiegeln`)
// — sie zu verstecken wäre Sicherheit durch Verbergen, nicht durch Kapselung. Der einzige
// Schutzgegenstand ist der LEBENDE SITZUNGSSCHLÜSSEL selbst (`sessionHkdfKey`, jetzt
// closure-privat in VdCrypto, s. dort `depotSchluessel`) — nicht die Funktion, die ihn
// verwendet. Wer diese Funktion "reparieren" und verstecken will, braucht dafür eine eigene
// Entscheidung, keinen Refaktor-Nebeneffekt.
async function deriveDepotKeyV2(masterHkdfKey, cryptoSalt, depotUUID) {
  if (!depotUUID || typeof depotUUID !== 'string' || depotUUID.length === 0) {
    throw new Error('deriveDepotKeyV2: depotUUID required (non-empty string)');
  }
  if (!(cryptoSalt instanceof Uint8Array) || cryptoSalt.length !== SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES) {
    throw new Error('deriveDepotKeyV2: cryptoSalt must be Uint8Array of length ' + SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES);
  }
  const enc = new TextEncoder();
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: HKDF_HASH,
      salt: cryptoSalt,
      info: enc.encode(HKDF_INFO_DEPOT_V2_PREFIX + depotUUID),
    },
    masterHkdfKey,
    { name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/* ══ ZERFALL IN FELD-EINHEITEN — die Primitiven (18.08.2026) ═══════════════════════════
   Entschieden am 18.08.2026: Der Depot-Inhalt zerfällt vor v1 in Feld-Einheiten mit je
   eigenem Inhaltsschlüssel. Die Feld-Stufe ist die einzige, die die heutige Angehörigensicht
   verlustfrei abbildet (A331: 528 Einheiten; Sektions- und Bereichsschnitt legen 49 bzw. 53
   Felder zu viel offen).

   DREI BAUSTEINE, und jeder hat seinen eigenen Grund:

   1 · DIE PSEUDONYME ADRESSE. Ohne sie verrät die Datei OHNE JEDES PASSWORT, welche Felder
   ausgefüllt sind — `socialInsurance.degreeOfDisabilityGdb` vorhanden heisst: es gibt einen Grad der
   Behinderung. Das wäre qualitativ schlechter als heute, und es folgt aus genau dem, was den
   Zerfall attraktiv macht: der Adressierbarkeit. HMAC-SHA256 über den Namen unter einem
   eigenen, aus dem Depot-Schlüssel abgeleiteten Adress-Schlüssel, auf 16 Byte gekürzt
   (Geburtstagsgrenze 2^64 — bei 528 Einheiten mit sehr grossem Abstand kollisionsfrei, A332).

   **Keine Rotation beim Speichern.** Pseudonyme sind je Depot stabil; wer zwei Fassungen
   derselben Datei sieht, erkennt an gleichbleibenden Adressen, WELCHE Einheiten sich geändert
   haben. Das Restrisiko ist benannt und getragen, nicht stillschweigend übergangen.

   2 · DER NAME REIST IN DER EINHEIT MIT (`{name, wert}`). Das ist die Bedingung, unter der
   alles trägt: dann ist die Pseudonymisierung eine Eigenschaft der DATEI und nicht der
   Laufzeit — Migrationskette, Blackbox-Export und `depotNormalisieren` arbeiten auf dem
   entschlüsselten `data` und sehen nie ein Pseudonym. Und A317 hat gemessen, dass
   `depotNormalisieren` die inneren Schlüssel gerade NICHT filtert: eine Datei kann Adressen
   mitbringen, die der heutige Katalog nicht kennt. Mit dem Namen in der Einheit ist ihr
   Urbild immer rückgewinnbar; ohne ihn wäre es verloren.

   3 · DIE AAD BINDET DIE EINHEIT AN IHREN PLATZ. `_AAD_DEPOT_V2` identifiziert keine Einheit
   — blieben alle unter derselben AAD gebunden, liesse sich der Ciphertext von
   `health.bloodType` an die Stelle von `identity.givenName` legen und entschlüsselte
   fehlerfrei (A331, ein Befund, der in keinem Papier stand). Darum trägt die AAD je Einheit
   zusätzlich `depotUUID` und die ADRESSE. Pseudonym und AAD stützen einander: das Pseudonym
   ist genau die stabile, eindeutige, ohnehin vorhandene Kennung, die eine AAD braucht. */
const ZERFALL_ADRESSE_BYTES = 16;
const HKDF_INFO_ADRESSE_V4_PREFIX = 'vivodepot/v4/adressen/';

// Der Adress-Schlüssel: HKDF aus demselben Master wie der Depot-Schlüssel, aber mit EIGENEM
// Info-Pfad — domain-separiert und präfixfrei gegen 'vivodepot/v3/depot/'. Ein HMAC-Schlüssel,
// kein AES-Schlüssel: er verschlüsselt nie, er benennt nur.
async function deriveAdressKeyV4(masterHkdfKey, cryptoSalt, depotUUID) {
  if (!depotUUID || typeof depotUUID !== 'string' || depotUUID.length === 0) {
    throw new Error('deriveAdressKeyV4: depotUUID required (non-empty string)');
  }
  if (!(cryptoSalt instanceof Uint8Array) || cryptoSalt.length !== SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES) {
    throw new Error('deriveAdressKeyV4: cryptoSalt must be Uint8Array of length ' + SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES);
  }
  const enc = new TextEncoder();
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: HKDF_HASH, salt: cryptoSalt,
      info: enc.encode(HKDF_INFO_ADRESSE_V4_PREFIX + depotUUID) },
    masterHkdfKey,
    { name: 'HMAC', hash: HKDF_HASH, length: HKDF_KEY_LENGTH_BITS },
    false,
    ['sign']
  );
}

// Die Adresse EINER Einheit. Rein: derselbe Name unter demselben Schlüssel ergibt dieselbe
// Adresse — das ist der Grund, warum die Datei ohne Rotation stabil bleibt, und zugleich das
// benannte Restrisiko.
async function feldAdresseV4(adressKey, name) {
  const enc = new TextEncoder();
  const mac = await crypto.subtle.sign('HMAC', adressKey, enc.encode(String(name)));
  return bytesToBase64(new Uint8Array(mac).slice(0, ZERFALL_ADRESSE_BYTES));
}

// Die AAD einer Einheit — `_AAD_DEPOT_V2` plus die zwei Angaben, die sie an ihren Platz binden.
function _aadEinheitV4(depotUUID, adresse) {
  return Object.freeze({
    kryptoVersion: CRYPTO_VERSION_ZERFALL,
    iterationen: PBKDF2_ITERATIONS,
    kdfTyp: 'hkdf-sha256',
    depotUUID: String(depotUUID),
    adresse: String(adresse),
  });
}

/* Ein frischer Inhaltsschlüssel je Einheit — und er entsteht als ROHE ZUFALLSBYTES,
   nicht als `generateKey`. Der Grund ist ein Wächter, und er hat recht behalten:
   der erste Entwurf erzeugte einen EXTRAHIERBAREN Schlüssel und holte die Bytes mit
   `crypto.subtle.exportKey` wieder heraus — beides machte Klasse-A rot
   (`u2-062-geheime-schluessel-nie-extrahierbar` und `G13-Kein-Export`), und beide
   Wächter bleiben unangetastet. Gewickelt werden die BYTES, nicht der Schlüssel;
   damit existiert zu keinem Zeitpunkt ein extrahierbarer Schlüssel im Browser und
   `exportKey` kommt im ganzen Kern weiterhin nicht vor.
   Die Bytes leben nur bis zum Wickeln und werden dort überschrieben — dieselbe
   Disziplin wie bei den Master-Bits in `setupMasterSession`. */
async function _einheitSchluesselNeu() {
  const roh = crypto.getRandomValues(new Uint8Array(HKDF_KEY_LENGTH_BITS / 8));
  const key = await crypto.subtle.importKey('raw', roh, { name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS },
    false, ['encrypt']);
  return { key, roh };
}
// Nimmt die ROHEN Bytes, nicht den Schlüssel — siehe oben. Nullt sie danach.
async function _einheitSchluesselWickeln(rohBytes, umschlagKey, aad) {
  const gewickelt = await encryptData(bytesToBase64(rohBytes), umschlagKey, aad);
  rohBytes.fill(0);
  return gewickelt;
}
/* NICHT extrahierbar, und das ist kein Detail: auf dem LESE-Weg wird der
   Inhaltsschlüssel nur zum Entschlüsseln gebraucht, nie zum Wickeln. Der Wächter
   u2-062 („geheime Schlüssel nie extrahierbar") hat den ersten Entwurf mit
   `true` zu Recht rot gemacht — das war eine Schlüssel-Oberfläche ohne Zweck. */
async function _einheitSchluesselEntwickeln(gewickelt, umschlagKey, aad) {
  const b64 = await decryptData(gewickelt, umschlagKey, aad);
  return crypto.subtle.importKey('raw', base64ToBytes(b64), { name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS },
    false, ['decrypt']);
}

// Test-Helper: HKDF mit VARIABLEM Info-String und VARIABLER Bit-Länge.
// Liefert raw bits (ArrayBuffer), nicht CryptoKey — für RFC-5869-Test-
// Vektor-Vergleich. NICHT vom Produktions-Code aufrufen.
async function _deriveHkdfRaw(masterHkdfKey, salt, info, lengthBits) {
  return crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: HKDF_HASH,
      salt,
      info,
    },
    masterHkdfKey,
    lengthBits
  );
}


/* ── Base64-Helfer für Krypto-Bytes (Salt, IV, Ciphertext) ────────────── */

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(_bytesAlsBinaerstring(arr));
}
function base64ToBytes(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}


/* ── Master-Session-Setup + Krypto-Modul-Surface (stabile Außen-API,
   ADR-085-Nachtrag D.9; Kapselung 18.09.2026, Weg A) ────
   `sessionHkdfKey` ist hier die EINZIGE closure-private Variable — der Rest
   des Blocks (Konstanten, Ableitungs-/Verschlüsselungs-Funktionen) bleibt
   UNVERÄNDERT global; sie brauchen kein Verstecken, weil sie ohne den
   lebenden Schlüssel wertlos sind (s. Kommentar am Modul-Zustand oben). Die
   IIFE ist eine reine Oberflächen-Änderung — kein Algorithmus, kein
   Parameter, keine Ableitungsreihenfolge ändert sich gegenüber vorher. */
const VdCrypto = (function () {
  // Der einzige Ort, an dem der lebende Sitzungsschlüssel noch existiert — kein Export,
  // kein Getter, kein Objektliteral trägt ihn nach draußen (s. Surface unten).
  let sessionHkdfKey = null;

  // Zentrale Master-Session-Setup-Sequenz.
  // B2/v3 (2026-06-12) — SCHLÜSSELTRENNUNG: Die PBKDF2-Bits werden NUR noch als
  // HKDF-Eingangsmaterial importiert (sessionHkdfKey). Die frühere zweite
  // Verwendung derselben Bits direkt als AES-GCM-Master-Schlüssel (`sessionKey =
  // importMasterAesKey(bits)`) ist ENTFERNT — sie war in der Hülle nie gelesen
  // (Anker wird via deriveDepotKeyV2/HKDF verschlüsselt, ADR-068 v2); der tote
  // Name `sessionKey` selbst ist seit heute ebenfalls entfernt (s. o.).
  // ArrayBuffer-Overwrite-Disziplin: nach dem Import werden die raw bits via
  // Uint8Array-View überschrieben (defensiv).
  async function setupMasterSession(password, salt) {
    const bits = await deriveMasterBits(password, salt);
    sessionHkdfKey = await importMasterHkdfKey(bits);
    new Uint8Array(bits).fill(0);
  }

  // Hinweis SP: _verifyJWS gehört zur VC-/Issuer-Schicht und ist NICHT in
  // diesem Basis-Block. Solange kein VC-Modul andockt, den verifyJWS-Eintrag
  // hier weglassen oder auf eine Stub-Funktion zeigen lassen.
  return Object.freeze({
    setupSession:  setupMasterSession,
    encryptDepot:  encryptData,
    decryptDepot:  decryptData,
    // Zerfall in Feld-Einheiten (18.08.2026): der Kern spricht auch hierüber ausschliesslich
    // mit der Surface, nicht mit den Block-Internen.
    //
    // adressKey OHNE Master-Parameter (18.09.2026): vorher `deriveAdressKeyV4` direkt
    // durchgereicht — ein Aufrufer musste den lebenden Sitzungsschlüssel BESITZEN, um ihn
    // hereinzureichen. Jetzt leitet die Hülle selbst ab, aus dem eigenen, verborgenen Zustand.
    adressKey: (cryptoSalt, depotUUID) => {
      if (!sessionHkdfKey) throw new Error('VdCrypto.adressKey: keine offene Session.');
      return deriveAdressKeyV4(sessionHkdfKey, cryptoSalt, depotUUID);
    },
    feldAdresse:   feldAdresseV4,
    aadEinheit:    _aadEinheitV4,
    einheitSchluessel:   _einheitSchluesselNeu,
    schluesselWickeln:   _einheitSchluesselWickeln,
    schluesselEntwickeln: _einheitSchluesselEntwickeln,
    // verifyJWS:  _verifyJWS,   // ← erst aktivieren, wenn die VC-Schicht andockt

    // DREI NEUE OPERATIONEN (18.09.2026) — ersetzen zehn direkte Lesestellen und
    // zwei Rücksetz-Stellen im Kern, die vorher `sessionHkdfKey` selbst prüften/nullten, und
    // drei Stellen, die direkt mit ihm ableiteten. Der Sitzungsschlüssel selbst verlässt die
    // Hülle in keinem der drei Fälle.
    sitzungOffen: () => !!sessionHkdfKey,
    sitzungBeenden: () => { sessionHkdfKey = null; },
    // Die "engere Schlüsselableitung": dieselbe deriveDepotKeyV2-Operation wie die direkten
    // Aufrufer mit fremdem Master (Sub-Depots, Empfängerkreise — die bleiben unverändert,
    // s. Kommentar an deriveDepotKeyV2), aber ohne dass der Aufrufer den Sitzungsschlüssel
    // je in der Hand hält.
    depotSchluessel: (cryptoSalt, depotUUID) => {
      if (!sessionHkdfKey) throw new Error('VdCrypto.depotSchluessel: keine offene Session.');
      return deriveDepotKeyV2(sessionHkdfKey, cryptoSalt, depotUUID);
    },
  });
})();
