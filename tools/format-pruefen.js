#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   format-pruefen.js — Prüfprogramm für .vivodepot-Dateien, eigenständig (05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Prüft eine Depot-Datei gegen docs/format/SPEZIFIKATION.md, ohne die App. Eine
   EIGENE Umsetzung: dieses Programm lädt den Kern nicht. Läse es ihn, könnte es
   eine Abweichung zwischen Kern und Spezifikation nie sehen. Den Abgleich hält
   tests/format-spezifikation-kern.test.js.

   DREI STUFEN, weil die Datei ohne Passwort fast nichts zeigt (U2-ADR-156):
     1 Hülle   Kopf, JSON, Pflichtfelder, Längen, Paare Einheit/Umschlag   ohne Passwort
     2 Krypto  jede Einheit öffnet unter ihrer AAD, Verzeichnis, Bindung   mit Passwort
     3 Inhalt  Schemastufe, Bereiche, Feldkennungen                        mit Passwort
   Was nicht geprüft werden konnte, heißt „nicht geprüft“, nie „gültig“.

   PARAMETER AUS DERSELBEN QUELLE WIE DER KERN. Die Krypto-Parameter stehen hier
   nicht als Zahl: sie werden aus vivodepot-krypto-kern-PORT-VERBATIM.js gelesen
   (geparst, nicht ausgeführt), dem gepinnten Block, den der Kern byte-gleich trägt.
   Die übrigen Formatwerte aus docs/format/format-parameter.json. Weicht eine Datei
   davon ab, etwa eine kleinere Rundenzahl in `kdf.iterationen`, ist sie ungültig.
   Ein Prüfer, der schwächere Parameter als gültig meldet, wäre schlimmer als keiner.

   NUR LESEN. Nur node:crypto. Kein Schreiben, keine Ausgabe von Schlüsseln,
   Salzen, Chiffraten oder Feldwerten; aus dem Inhalt erscheinen höchstens
   Feldkennungen und Zahlen. Signaturen werden hier nicht erzeugt.

   Aufruf:
     node tools/format-pruefen.js --datei <pfad> [--passwort-datei <pfad>] [--json]
     node tools/format-pruefen.js                 läuft den Korpus docs/format/korpus/
   Exit: 0 gültig · 1 ungültig · 2 nicht vollständig geprüft · 3 Bedienfehler
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');

const subtle = webcrypto.subtle;
const WURZEL = path.join(__dirname, '..');
const BLOCK_PFAD = path.join(WURZEL, 'vivodepot-krypto-kern-PORT-VERBATIM.js');
const FORMAT_PARAMETER_PFAD = path.join(WURZEL, 'docs', 'format', 'format-parameter.json');
const FELDKATALOG_PFAD = path.join(WURZEL, 'bereiche', 'feldkatalog.json');
const KORPUS_PFAD = path.join(WURZEL, 'docs', 'format', 'korpus', 'korpus.json');

/* ── Parameter ────────────────────────────────────────────────────────────── */

// Die Namen, die aus dem gepinnten Block gelesen werden. Fehlt einer, bricht das Programm ab, statt zu raten.
const BLOCK_KONSTANTEN = ['PBKDF2_ITERATIONS', 'HKDF_INFO_DEPOT_V2_PREFIX', 'HKDF_HASH', 'HKDF_KEY_LENGTH_BITS',
  'SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES', 'CRYPTO_VERSION_AKTUELL', 'CRYPTO_VERSION_ZERFALL', 'KRYPTO_VERSION_ALLOWLIST',
  'ZERFALL_ADRESSE_BYTES', 'HKDF_INFO_ADRESSE_V4_PREFIX'];

function blockKonstantenLesen(text) {
  const raus = {};
  for (const name of BLOCK_KONSTANTEN) {
    const m = new RegExp('^const ' + name + '\\s*=\\s*([^;]+);', 'm').exec(text);
    if (!m) throw new Error('Parameter ' + name + ' fehlt im gepinnten Block.');
    raus[name] = literalLesen(m[1].trim(), name);
  }
  return raus;
}
// Nur Literale: Zahl, Text in einfachen Anführungszeichen, Liste aus Zahlen. Alles andere ist ein Fehler, kein eval.
function literalLesen(roh, name) {
  if (/^\d+$/.test(roh)) return Number(roh);
  if (/^'[^'\\]*'$/.test(roh)) return roh.slice(1, -1);
  if (/^\[\s*\d+(\s*,\s*\d+)*\s*\]$/.test(roh)) return roh.slice(1, -1).split(',').map((s) => Number(s.trim()));
  throw new Error('Parameter ' + name + ' ist kein einfaches Literal: ' + roh.slice(0, 40));
}

function parameterLaden(opt = {}) {
  const block = blockKonstantenLesen(fs.readFileSync(opt.blockPfad || BLOCK_PFAD, 'utf8'));
  const fp = JSON.parse(fs.readFileSync(opt.formatParameterPfad || FORMAT_PARAMETER_PFAD, 'utf8'));
  const w = {};
  for (const [k, v] of Object.entries(fp.werte)) w[k] = v.wert;
  return Object.freeze({ ...block, ...w });
}

/* ── Hilfen ───────────────────────────────────────────────────────────────── */

function b64(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 !== 0) return null;
  return new Uint8Array(Buffer.from(s, 'base64'));
}
const istObjekt = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const hat = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const enc = new TextEncoder();

function aadEinheit(P, depotUUID, adresse) {
  // Die Schlüsselreihenfolge ist Teil des Formats (SPEZIFIKATION.md, AAD).
  return enc.encode(JSON.stringify({ kryptoVersion: P.CRYPTO_VERSION_ZERFALL, iterationen: P.PBKDF2_ITERATIONS,
    kdfTyp: 'hkdf-sha256', depotUUID: String(depotUUID), adresse: String(adresse) }));
}
function aadDepotV3(P) {
  return enc.encode(JSON.stringify({ kryptoVersion: 3, iterationen: P.PBKDF2_ITERATIONS, kdfTyp: 'hkdf-sha256' }));
}

/* ── Befunde ──────────────────────────────────────────────────────────────── */

// Jeder Code steht in SPEZIFIKATION.md (Abschnitt Konformität). Die Probe hält beide Listen gleich.
const CODES = Object.freeze({
  // Stufe 1
  'VDF-KEIN-JSON': 'fehler', 'VDF-KEIN-OBJEKT': 'fehler', 'VDF-KOPF-VERSION': 'fehler', 'VDF-OHNE-KOPF': 'hinweis',
  'VDF-BLACKBOX-HUELLE': 'hinweis', 'VDF-KRYPTOVERSION': 'fehler', 'VDF-PFLICHTFELD': 'fehler', 'VDF-SALZ-LAENGE': 'fehler',
  'VDF-FORM': 'fehler', 'VDF-TABELLE': 'fehler', 'VDF-EINTRAG': 'fehler', 'VDF-KDF-PARAMETER': 'fehler',
  'VDF-IV-LAENGE': 'fehler', 'VDF-PAARE': 'fehler', 'VDF-WHC-FORM': 'fehler', 'VDF-FREMDFELD': 'hinweis',
  'VDF-ATTRAPPE': 'hinweis',
  // Stufe 2
  'VDF-PASSWORT': 'offen', 'VDF-FACH-ABGELAUFEN': 'offen', 'VDF-GEHEIMTEIL': 'fehler', 'VDF-VERZEICHNIS': 'fehler',
  'VDF-EINHEIT': 'fehler', 'VDF-ADRESSE-NAME': 'hinweis', 'VDF-POLSTER': 'hinweis', 'VDF-BINDUNG-ORT': 'hinweis',
  'VDF-BINDUNG-FREMD': 'hinweis',
  // Stufe 3
  'VDF-INHALT': 'fehler', 'VDF-SCHEMA-NEUER': 'hinweis', 'VDF-FELD-UNBEKANNT': 'hinweis',
});

class Befunde {
  constructor() { this.liste = []; }
  add(code, stufe, text) {
    if (!hat(CODES, code)) throw new Error('unbekannter Code ' + code);
    this.liste.push({ code, stufe, art: CODES[code], text });
  }
  hatFehler() { return this.liste.some((b) => b.art === 'fehler'); }
  hatOffen() { return this.liste.some((b) => b.art === 'offen'); }
}

/* ── Stufe 1: Hülle ───────────────────────────────────────────────────────── */

function dateiLesen(text, P, B) {
  let json = text;
  if (text.startsWith(P.dateiKennung)) {
    const v = text.charCodeAt(P.dateiKennung.length);
    if (!P.dateiKopfVersionen.includes(v)) { B.add('VDF-KOPF-VERSION', 1, 'Kopf-Version ' + v + ' ist nicht beschrieben.'); return null; }
    json = text.slice(P.dateiKennung.length + 1);
  } else {
    B.add('VDF-OHNE-KOPF', 1, 'Die Datei trägt keinen Kopf „' + P.dateiKennung + '“ (Altdatei, wird gelesen).');
  }
  let obj;
  try { obj = JSON.parse(json); } catch (e) { B.add('VDF-KEIN-JSON', 1, 'Nach dem Kopf folgt kein gültiges JSON.'); return null; }
  if (!istObjekt(obj)) { B.add('VDF-KEIN-OBJEKT', 1, 'Das JSON ist kein Objekt.'); return null; }
  if (obj.dateiTyp === P.blackboxDateiTyp && istObjekt(obj.umschlag)) {
    B.add('VDF-BLACKBOX-HUELLE', 1, 'Blackbox-Hülle, geprüft wird der eingeschlossene Umschlag.');
    return obj.umschlag;
  }
  return obj;
}

function stufe1(u, P, B) {
  if (!P.KRYPTO_VERSION_ALLOWLIST.includes(u.kryptoVersion)) {
    B.add('VDF-KRYPTOVERSION', 1, 'kryptoVersion ' + JSON.stringify(u.kryptoVersion) + ' ist nicht erlaubt (' + P.KRYPTO_VERSION_ALLOWLIST.join(', ') + ').');
    return;
  }
  if (typeof u.depotUUID !== 'string' || !u.depotUUID) B.add('VDF-PFLICHTFELD', 1, 'depotUUID fehlt oder ist leer.');
  const pSalz = istObjekt(u.pbkdf2) ? b64(u.pbkdf2.salt) : null;
  if (!pSalz) B.add('VDF-PFLICHTFELD', 1, 'pbkdf2.salt fehlt oder ist kein Base64.');
  else if (pSalz.length !== P.pbkdf2SalzBytes) B.add('VDF-SALZ-LAENGE', 1, 'pbkdf2.salt hat ' + pSalz.length + ' Byte, verlangt ' + P.pbkdf2SalzBytes + '.');
  const dSalz = b64(u.depotSalt);
  if (!dSalz) B.add('VDF-PFLICHTFELD', 1, 'depotSalt fehlt oder ist kein Base64.');
  else if (dSalz.length !== P.SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES) B.add('VDF-SALZ-LAENGE', 1, 'depotSalt hat ' + dSalz.length + ' Byte, verlangt ' + P.SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES + '.');

  const formV3 = typeof u.iv === 'string' && typeof u.ct === 'string';
  const formV4 = istObjekt(u.einheiten) && Array.isArray(u.umschlagTabelle);
  if (formV3 === formV4) { B.add('VDF-FORM', 1, 'Die Datei trägt ' + (formV3 ? 'beide Formen' : 'keine der beiden Formen') + ' (iv/ct oder einheiten/umschlagTabelle).'); return; }
  if (formV3 !== (u.kryptoVersion === 3)) { B.add('VDF-FORM', 1, 'Die Form passt nicht zu kryptoVersion ' + u.kryptoVersion + '.'); return; }

  if (formV3) { chiffratPruefen(u, 'Umschlag', P, B); }
  else stufe1V4(u, P, B);

  if (hat(u, P.whcFeld)) whcPruefen(u[P.whcFeld], P, B);
  for (const k of Object.keys(u)) {
    if (!P.umschlagFelderBasis.includes(k)) B.add('VDF-FREMDFELD', 1, 'Feld außerhalb der Basismenge: „' + String(k).slice(0, 40) + '“ (wird weitergetragen).');
  }
}

function chiffratPruefen(c, wo, P, B) {
  if (!istObjekt(c)) { B.add('VDF-EINTRAG', 1, wo + ': kein {iv, ct}.'); return false; }
  const iv = b64(c.iv); const ct = b64(c.ct);
  if (!iv || !ct) { B.add('VDF-EINTRAG', 1, wo + ': iv oder ct fehlt oder ist kein Base64.'); return false; }
  if (iv.length !== P.ivBytes) { B.add('VDF-IV-LAENGE', 1, wo + ': iv hat ' + iv.length + ' Byte, verlangt ' + P.ivBytes + '.'); return false; }
  if (ct.length < 16) { B.add('VDF-EINTRAG', 1, wo + ': ct ist kürzer als ein GCM-Tag.'); return false; }
  return true;
}

function stufe1V4(u, P, B) {
  const tab = u.umschlagTabelle;
  if (!tab.length) { B.add('VDF-TABELLE', 1, 'Die Umschlagstabelle ist leer.'); return; }
  const adressen = Object.keys(u.einheiten);
  let einheitenOk = 0;
  for (const a of adressen) {
    const roh = b64(a);
    if (!roh || roh.length !== P.ZERFALL_ADRESSE_BYTES) B.add('VDF-EINTRAG', 1, 'Eine Adresse ist kein Base64 von ' + P.ZERFALL_ADRESSE_BYTES + ' Byte.');
    if (chiffratPruefen(u.einheiten[a], 'Einheit', P, B)) einheitenOk++;
  }
  const kennungen = new Set();
  tab.forEach((e, i) => {
    const wo = 'Eintrag ' + i;
    if (!istObjekt(e)) { B.add('VDF-EINTRAG', 1, wo + ' ist kein Objekt.'); return; }
    if (e.kennung !== P.fachKennungPraefix + (i + 1)) B.add('VDF-EINTRAG', 1, wo + ': kennung ist nicht „' + P.fachKennungPraefix + (i + 1) + '“.');
    if (kennungen.has(e.kennung)) B.add('VDF-EINTRAG', 1, wo + ': kennung doppelt.');
    kennungen.add(e.kennung);
    if (!istObjekt(e.kdf) || !b64(e.kdf.salt)) B.add('VDF-EINTRAG', 1, wo + ': kdf.salt fehlt.');
    else {
      if (b64(e.kdf.salt).length !== P.pbkdf2SalzBytes) B.add('VDF-SALZ-LAENGE', 1, wo + ': kdf.salt hat nicht ' + P.pbkdf2SalzBytes + ' Byte.');
      // Strenger als der Kern, der das Feld nicht liest (U2-ADR-230): wer etwas anderes hineinschreibt, schreibt nicht dieses Format.
      if (e.kdf.iterationen !== P.PBKDF2_ITERATIONS) B.add('VDF-KDF-PARAMETER', 1, wo + ': kdf.iterationen ist ' + JSON.stringify(e.kdf.iterationen) + ', das Format verlangt ' + P.PBKDF2_ITERATIONS + '.');
      if (i > 0 && e.kdf.tuerSalt !== undefined) {
        const t = b64(e.kdf.tuerSalt);
        if (!t || t.length !== P.SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES) B.add('VDF-SALZ-LAENGE', 1, wo + ': kdf.tuerSalt hat nicht ' + P.SUBDEPOT_CRYPTO_SALT_LENGTH_BYTES + ' Byte.');
      }
    }
    if (i === 0 && istObjekt(e.kdf) && istObjekt(u.pbkdf2) && e.kdf.salt !== u.pbkdf2.salt) {
      B.add('VDF-EINTRAG', 1, wo + ': Der Anker-Eintrag trägt ein anderes Salz als pbkdf2.salt.');
    }
    if (i > 0) chiffratPruefen(e.fachSchluessel, wo + ' fachSchluessel', P, B);
    chiffratPruefen(e.geheim, wo + ' geheim', P, B);
    if (!istObjekt(e.umschlaege)) { B.add('VDF-EINTRAG', 1, wo + ': umschlaege fehlt.'); return; }
    // Jeder Eintrag trägt einen Umschlag für JEDE Einheit, echt oder Attrappe (sonst verriete die Zahl das Fach).
    const ua = Object.keys(e.umschlaege);
    const fehlend = adressen.filter((a) => !hat(e.umschlaege, a)).length;
    const ueberzaehlig = ua.filter((a) => !hat(u.einheiten, a)).length;
    if (fehlend) B.add('VDF-PAARE', 1, wo + ': zu ' + fehlend + ' Einheit(en) fehlt der Umschlag.');
    if (ueberzaehlig) B.add('VDF-PAARE', 1, wo + ': ' + ueberzaehlig + ' Umschlag/Umschläge ohne Einheit.');
    for (const a of ua) chiffratPruefen(e.umschlaege[a], wo + ' Umschlag', P, B);
  });
  /* Attrappen sind von echten Umschlägen nicht zu unterscheiden: alle Umschläge aller Einträge haben dieselbe Byte-Länge.
     Sonst zeigt die Länge ohne Passwort, welche Einheiten ein Fach öffnet. Ein Hinweis, kein Fehler: weggegebene Dateien
     lassen sich nicht nachbessern, und die Datei bleibt lesbar. */
  const ulaengen = new Set();
  for (const e of tab) if (istObjekt(e) && istObjekt(e.umschlaege)) for (const v of Object.values(e.umschlaege)) { const ct = istObjekt(v) ? b64(v.ct) : null; if (ct) ulaengen.add(ct.length); }
  if (ulaengen.size > 1) B.add('VDF-ATTRAPPE', 1, 'Die Umschläge sind verschieden lang (' + [...ulaengen].sort((a, b) => a - b).join(', ') + ' Byte): ohne Passwort ist erkennbar, welche Einheiten ein Fach öffnet.');
  /* Alle Geheimteile sind gleich lang (Polster): sonst verriete die Länge, welcher Eintrag welche Angaben trägt. Das ist die
     Eigenschaft, auf die es ankommt; die Stufe selbst (der Kern schreibt ein Vielfaches von 512 plus ein Zeichen) ist es nicht. */
  const laengen = new Set(tab.filter((e) => istObjekt(e) && istObjekt(e.geheim) && b64(e.geheim.ct)).map((e) => b64(e.geheim.ct).length));
  if (laengen.size > 1) B.add('VDF-POLSTER', 1, 'Die Geheimteile der Einträge sind verschieden lang.');
  return einheitenOk;
}

function whcPruefen(f, P, B) {
  const ok = istObjekt(f) && f.form === P.whcForm && Object.keys(f).sort().join(',') === 'form,huelle,iv,salz'
    && b64(f.salz) && b64(f.salz).length === P.whcSalzBytes && b64(f.iv) && b64(f.iv).length === P.ivBytes
    && b64(f.huelle) && b64(f.huelle).length === P.whcHuelleBytes;
  if (!ok) B.add('VDF-WHC-FORM', 1, 'Das Feld „' + P.whcFeld + '“ hat nicht die beschriebene Form.');
}

/* ── Stufe 2: Krypto ──────────────────────────────────────────────────────── */

async function masterHkdf(P, passwort, salz) {
  const km = await subtle.importKey('raw', enc.encode(passwort), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', salt: salz, iterations: P.PBKDF2_ITERATIONS, hash: P.HKDF_HASH }, km, P.HKDF_KEY_LENGTH_BITS);
  try { return await subtle.importKey('raw', bits, { name: 'HKDF' }, false, ['deriveKey', 'deriveBits']); }
  finally { new Uint8Array(bits).fill(0); }
}
function hkdfAes(P, master, salz, info) {
  return subtle.deriveKey({ name: 'HKDF', hash: P.HKDF_HASH, salt: salz, info: enc.encode(info) }, master,
    { name: 'AES-GCM', length: P.HKDF_KEY_LENGTH_BITS }, false, ['decrypt']);
}
function hkdfHmac(P, master, salz, info) {
  return subtle.deriveKey({ name: 'HKDF', hash: P.HKDF_HASH, salt: salz, info: enc.encode(info) }, master,
    { name: 'HMAC', hash: P.HKDF_HASH, length: P.HKDF_KEY_LENGTH_BITS }, false, ['sign']);
}
async function oeffnenRoh(c, key, aad) {
  const p = { name: 'AES-GCM', iv: b64(c.iv) };
  if (aad) p.additionalData = aad;
  return new Uint8Array(await subtle.decrypt(p, key, b64(c.ct)));
}
const oeffnenJson = async (c, key, aad) => JSON.parse(new TextDecoder().decode(await oeffnenRoh(c, key, aad)));
const aesRoh = (roh) => subtle.importKey('raw', roh, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);

function passwortFormen(pw) {
  const nfc = pw.normalize('NFC');
  const nfd = pw.normalize('NFD');
  return (pw !== nfc && nfd !== nfc) ? [nfc, nfd] : [nfc];
}

// Ein Eintrag öffnet sich (Geheimteil), dann das Verzeichnis, dann jede Einheit. Liefert den Inhalt oder wirft {struktur}.
async function eintragLesen(u, e, schluessel, P, B, mitAltPfad) {
  const geheim = await oeffnenJson(e.geheim, schluessel, aadEinheit(P, u.depotUUID, e.kennung));   // wirft: Schlüssel passt nicht
  return { geheim, lesen: async () => {
    if (!istObjekt(geheim)) { B.add('VDF-GEHEIMTEIL', 2, 'Der Geheimteil ist kein Objekt.'); return null; }
    let adressen;
    if (Array.isArray(geheim.adressen)) {
      const fehlt = geheim.adressen.filter((a) => !hat(e.umschlaege, a) || !hat(u.einheiten, a)).length;
      if (fehlt) { B.add('VDF-VERZEICHNIS', 2, 'Zu ' + fehlt + ' Adresse(n) des Verzeichnisses fehlt Einheit oder Umschlag.'); return null; }
      adressen = geheim.adressen;
    } else if (mitAltPfad) {
      adressen = Object.keys(e.umschlaege);   // Datei vor dem Verzeichnis (21.08.2026): der alte Vergleich steht in Stufe 1
    } else { B.add('VDF-VERZEICHNIS', 2, 'Ein Fach trägt kein Verzeichnis.'); return null; }
    const einheiten = [];
    for (const a of adressen) {
      const aad = aadEinheit(P, u.depotUUID, a);
      let wert;
      try {
        const roh = await oeffnenJson(e.umschlaege[a], schluessel, aad);
        const k = await aesRoh(b64(roh));
        wert = await oeffnenJson(u.einheiten[a], k, aad);
      } catch (err) { B.add('VDF-EINHEIT', 2, 'Eine Einheit öffnet sich nicht unter ihrer Adresse (Umschlag, AAD oder Chiffrat verändert).'); return null; }
      if (!istObjekt(wert) || typeof wert.name !== 'string' || !wert.name || !hat(wert, 'wert')) {
        B.add('VDF-EINHEIT', 2, 'Eine Einheit trägt nicht {name, wert}.'); return null;
      }
      einheiten.push({ adresse: a, name: wert.name, wert: wert.wert, gepolstert: hat(wert, '_pad'),
        laenge: enc.encode(JSON.stringify(wert)).length });
    }
    return einheiten;
  } };
}

function zusammensetzen(einheiten) {
  const d = { sektoren: {} };
  const felder = [];
  for (const e of einheiten) {
    if (e.name === 'sektoren') { for (const b of (Array.isArray(e.wert) ? e.wert : [])) if (!d.sektoren[b]) d.sektoren[b] = {}; continue; }
    const i = e.name.indexOf('.');
    if (i > 0) { felder.push([e.name.slice(0, i), e.name.slice(i + 1), e.wert]); continue; }
    d[e.name] = e.wert;
  }
  for (const [b, f, w] of felder) { if (!d.sektoren[b]) d.sektoren[b] = {}; d.sektoren[b][f] = w; }
  return d;
}

function kanonischJSON(x) {
  if (Array.isArray(x)) return '[' + x.map(kanonischJSON).join(',') + ']';
  if (istObjekt(x)) return '{' + Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + kanonischJSON(x[k])).join(',') + '}';
  return JSON.stringify(x === undefined ? null : x);
}
async function fremdHash(u, P) {
  const raus = {};
  for (const k of Object.keys(u)) if (!P.umschlagFelderBasis.includes(k)) raus[k] = u[k];
  return Buffer.from(await subtle.digest('SHA-256', enc.encode(kanonischJSON(raus)))).toString('base64');
}
function ortNormal(o) { return (typeof o === 'string' && o.trim()) ? o.trim().slice(0, 200) : null; }

async function bindungPruefen(u, geheim, P, B) {
  if (!geheim || geheim.ortGebunden !== true) return;
  const ist = ortNormal(u.angehoerigenOrt);
  if (ist !== null && ist !== ortNormal(geheim.ortHinweis)) B.add('VDF-BINDUNG-ORT', 2, 'Der Ort-Hinweis im Klartext weicht vom gebundenen ab.');
  if ((await fremdHash(u, P)) !== geheim.fremdHash) B.add('VDF-BINDUNG-FREMD', 2, 'Die Felder außerhalb der Basismenge weichen vom gebundenen Stand ab.');
}

function fachAbgelaufen(giltBis, heute) {
  return typeof giltBis === 'string' && giltBis !== '' && heute > giltBis;   // wie im Kern: Textvergleich JJJJ-MM-TT
}

async function stufe2(u, passwort, P, B, opt = {}) {
  const pSalz = b64(u.pbkdf2.salt);
  const dSalz = b64(u.depotSalt);
  const d = new Date();
  const heute = opt.heute || (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));   // lokales Datum, wie der Kern (heuteLokal)
  for (const pw of passwortFormen(passwort)) {
    const master = await masterHkdf(P, pw, pSalz);
    const anker = await hkdfAes(P, master, dSalz, P.HKDF_INFO_DEPOT_V2_PREFIX + u.depotUUID);
    if (u.kryptoVersion === 3) {
      try { return { inhalt: await oeffnenJson({ iv: u.iv, ct: u.ct }, anker, aadDepotV3(P)), ueber: 0 }; }
      catch (e) { continue; }
    }
    let offen = null;
    try { offen = await eintragLesen(u, u.umschlagTabelle[0], anker, P, B, true); offen.platz = 0; }
    catch (e) {
      let abgelaufen = false;
      for (let i = 1; i < u.umschlagTabelle.length && !offen; i++) {
        const e2 = u.umschlagTabelle[i];
        try {
          const tuerSalz = (typeof e2.kdf.tuerSalt === 'string' && e2.kdf.tuerSalt) ? b64(e2.kdf.tuerSalt) : dSalz;
          const tMaster = await masterHkdf(P, pw, b64(e2.kdf.salt));
          const tuer = await hkdfAes(P, tMaster, tuerSalz, P.HKDF_INFO_DEPOT_V2_PREFIX + u.depotUUID);
          const fachRoh = await oeffnenJson(e2.fachSchluessel, tuer, aadEinheit(P, u.depotUUID, e2.kennung));
          const o = await eintragLesen(u, e2, await aesRoh(b64(fachRoh)), P, B, false);
          if (fachAbgelaufen(o.geheim && o.geheim.giltBis, heute)) { abgelaufen = true; continue; }
          offen = o; offen.platz = i;
        } catch (e3) { /* diese Tür passt nicht */ }
      }
      if (!offen) {
        if (abgelaufen) { B.add('VDF-FACH-ABGELAUFEN', 2, 'Das Fach, zu dem das Passwort passt, ist abgelaufen.'); return null; }
        continue;
      }
    }
    const einheiten = await offen.lesen();
    if (!einheiten) return null;
    await bindungPruefen(u, offen.geheim, P, B);
    if (offen.platz === 0) {
      const adressKey = await hkdfHmac(P, master, dSalz, P.HKDF_INFO_ADRESSE_V4_PREFIX + u.depotUUID);
      for (const e of einheiten) {
        const mac = new Uint8Array(await subtle.sign('HMAC', adressKey, enc.encode(e.name))).slice(0, P.ZERFALL_ADRESSE_BYTES);
        if (Buffer.from(mac).toString('base64') !== e.adresse) { B.add('VDF-ADRESSE-NAME', 2, 'Die Adresse einer Einheit passt nicht zu ihrem Namen (geprüft beim Öffnen über Eintrag 1, bis zur ersten Abweichung).'); break; }
      }
    }
    const ungepolstert = einheiten.filter((e) => !e.gepolstert || e.laenge % P.einheitStufeBytes !== 0).length;
    if (ungepolstert) B.add('VDF-POLSTER', 2, ungepolstert + ' Einheit(en) nicht auf ' + P.einheitStufeBytes + '-Byte-Stufen aufgefüllt (Datei vor U2-ADR-464).');
    return { inhalt: zusammensetzen(einheiten), ueber: offen.platz };
  }
  B.add('VDF-PASSWORT', 2, 'Mit diesem Passwort öffnet sich kein Eintrag.');
  return null;
}

/* ── Stufe 3: Inhalt ──────────────────────────────────────────────────────── */

let _feldkatalog = null;
function feldkatalog() {
  if (!_feldkatalog) _feldkatalog = new Set(JSON.parse(fs.readFileSync(FELDKATALOG_PFAD, 'utf8')).felder.map((f) => f.kennung));
  return _feldkatalog;
}

function stufe3(d, P, B, ueber) {
  if (!istObjekt(d)) { B.add('VDF-INHALT', 3, 'Der Inhalt ist kein Objekt.'); return; }
  // Ein Fach trägt nur einen Ausschnitt; die Schemastufe gehört zum ganzen Depot und fehlt dort zu Recht nicht immer.
  if (ueber === 0 || hat(d, 'schemaVersion')) {
    if (typeof d.schemaVersion !== 'number' || !Number.isInteger(d.schemaVersion) || d.schemaVersion < 1) {
      B.add('VDF-INHALT', 3, 'schemaVersion fehlt oder ist keine positive ganze Zahl.');
    } else if (d.schemaVersion > P.schemaVersionAktuell) {
      B.add('VDF-SCHEMA-NEUER', 3, 'schemaVersion ' + d.schemaVersion + ' ist neuer als die beschriebene (' + P.schemaVersionAktuell + '): nur lesbar.');
    }
  }
  if (!istObjekt(d.sektoren)) { B.add('VDF-INHALT', 3, 'sektoren ist kein Objekt.'); return; }
  const kat = feldkatalog();
  let unbekannt = 0;
  for (const [b, felder] of Object.entries(d.sektoren)) {
    if (!istObjekt(felder)) { B.add('VDF-INHALT', 3, 'Der Bereich „' + String(b).slice(0, 40) + '“ ist kein Objekt.'); continue; }
    for (const f of Object.keys(felder)) if (!kat.has(b + '.' + f)) unbekannt++;
  }
  if (unbekannt) B.add('VDF-FELD-UNBEKANNT', 3, unbekannt + ' Feldkennung(en) stehen nicht im Feldregister (Bereichsmodule oder ältere Fassungen; sie werden getragen).');
}

/* ── Gesamturteil ─────────────────────────────────────────────────────────── */

async function dateiPruefen(text, opt = {}) {
  const P = opt.parameter || parameterLaden();
  const B = new Befunde();
  let bisStufe = 0;
  const u = dateiLesen(String(text), P, B);
  if (u) {
    stufe1(u, P, B);
    bisStufe = 1;
    if (!B.hatFehler() && typeof opt.passwort === 'string') {
      const r = await stufe2(u, opt.passwort, P, B, opt);
      if (r && !B.hatFehler()) { bisStufe = 2; stufe3(r.inhalt, P, B, r.ueber); if (!B.hatFehler()) bisStufe = 3; }
    }
  }
  let urteil;
  if (B.hatFehler()) urteil = 'ungueltig';
  else if (bisStufe < 3) urteil = 'nicht-geprueft';
  else urteil = B.liste.some((b) => b.art === 'hinweis') ? 'gueltig-mit-hinweisen' : 'gueltig';
  return { urteil, geprueftBisStufe: bisStufe, befunde: B.liste };
}

const EXIT = { gueltig: 0, 'gueltig-mit-hinweisen': 0, ungueltig: 1, 'nicht-geprueft': 2 };

function ausgabe(name, r) {
  const t = { gueltig: 'gültig', 'gueltig-mit-hinweisen': 'gültig, mit Hinweisen', ungueltig: 'UNGÜLTIG',
    'nicht-geprueft': 'nicht vollständig geprüft (bis Stufe ' + r.geprueftBisStufe + ')' }[r.urteil];
  const zeilen = [name + ': ' + t];
  for (const b of r.befunde) zeilen.push('  [' + b.art + ', Stufe ' + b.stufe + '] ' + b.code + ' — ' + b.text);
  return zeilen.join('\n');
}

async function korpusLaufen(opt = {}) {
  const manifest = JSON.parse(fs.readFileSync(opt.korpusPfad || KORPUS_PFAD, 'utf8'));
  const P = parameterLaden();
  const ergebnisse = [];
  for (const f of manifest.faelle) {
    const text = fs.readFileSync(path.join(path.dirname(opt.korpusPfad || KORPUS_PFAD), f.datei), 'utf8');
    const r = await dateiPruefen(text, { parameter: P, passwort: f.passwort, heute: manifest.heute });
    const codes = [...new Set(r.befunde.map((b) => b.code))].sort();
    const ok = r.urteil === f.erwartet.urteil && JSON.stringify(codes) === JSON.stringify([...f.erwartet.codes].sort());
    ergebnisse.push({ datei: f.datei, ok, ist: { urteil: r.urteil, codes }, soll: f.erwartet });
  }
  return ergebnisse;
}

async function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const json = argv.includes('--json');
  const datei = arg('--datei');
  if (!datei) {
    const e = await korpusLaufen();
    const schlecht = e.filter((x) => !x.ok);
    if (json) console.log(JSON.stringify(e, null, 2));
    else {
      for (const x of e) console.log((x.ok ? 'ok   ' : 'FEHL ') + x.datei + '  ' + x.ist.urteil + ' ' + x.ist.codes.join(','));
      console.log(e.length - schlecht.length + '/' + e.length + ' Korpusfälle mit erwartetem Urteil.');
    }
    return schlecht.length ? 1 : 0;
  }
  let passwort;
  const pd = arg('--passwort-datei');
  if (pd) passwort = fs.readFileSync(pd, 'utf8').replace(/\r?\n$/, '');
  const text = fs.readFileSync(datei, 'utf8');   // der Kopf ist 'VIVODEPOT' + Byte 0x01, beides gültiges UTF-8
  const r = await dateiPruefen(text, { passwort });
  console.log(json ? JSON.stringify(r, null, 2) : ausgabe(datei, r));
  return EXIT[r.urteil];
}

if (require.main === module) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { console.error('Bedienfehler: ' + e.message); process.exitCode = 3; });
}

module.exports = { Befunde, parameterLaden, blockKonstantenLesen, literalLesen, dateiPruefen, korpusLaufen, CODES, BLOCK_KONSTANTEN, EXIT };
