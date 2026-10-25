'use strict';
/* Die Klasse hinter Befund JWE-KDF-ZWISCHENPUFFER: vier Stellen außerhalb des Krypto-Pins, die Schlüsselmaterial in einem
   Zwischenpuffer liegen ließen. Je Stelle eine Probe am geladenen Fenster und ein Rot-Beweis an der alten Fassung.

     _fachSchluesselAusRoh   (Kern, Lese-App)  der rohe Fachschlüssel aus base64ToBytes
     _antwortSeedGueltig     (Kern)            die Kopie des Antwort-Seeds, die nur der Längenprüfung dient
     _antwortEcdhSchluessel  (Lese-App)        Z, wie deriveBits es zurückgibt
     _zerfallSchreiben       (Kern)            die Kopien der Inhaltsschlüssel in `rohe`, wenn ein Schritt dazwischen wirft

   Gemessen wird mit tests/helfer/puffer-mitschnitt.js: jeder Puffer, der während des Aufrufs entsteht, wird danach nach
   dem Schlüsselmaterial durchsucht. Z aus deriveBits sieht der Mitschnitt nicht (die Web-Crypto-Funktion baut den Puffer
   selbst); dort hängt sich die Probe an deriveBits und prüft den zurückgegebenen Puffer. Alle Werte erzeugt die Probe. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { mitgeschnitten, funde, muster } = require('./helfer/puffer-mitschnitt.js');

const REPO = path.join(__dirname, '..');
const BINDUNGEN = ['_fachSchluesselAusRoh', '_antwortSeedGueltig', '_antwortSeedB64u', 'ANTWORT_SEED_FORM', '_zerfallSchreiben'];

function kern(html) {
  if (html == null) return { V: ladeKern({ zusatzBindungen: BINDUNGEN }).V, aufraeumen: () => {} };
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'krypto-zwischenpuffer-'));
  const pfad = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(pfad, html);
  try {
    return { V: ladeKern({ zusatzBindungen: BINDUNGEN, htmlPfad: pfad, backen: true }).V, aufraeumen: () => fs.rmSync(ordner, { recursive: true, force: true }) };
  } catch (e) {
    fs.rmSync(ordner, { recursive: true, force: true });
    throw e;
  }
}
const KERN_LAUF = () => ({ global: globalThis, U8: globalThis.Uint8Array });
function lesen(html) {
  const sandbox = ladeLesen(html == null ? {} : { html }).sandbox;
  return { sandbox, lauf: { global: sandbox, U8: vm.runInContext('Uint8Array', sandbox) }, fn: (n) => vm.runInContext(n, sandbox) };
}
// Die alte Fassung einer Stelle, für den Rot-Beweis: neue Zeilen gegen die alten tauschen, genau einmal.
function alt(datei, paare) {
  let html = fs.readFileSync(path.join(REPO, datei), 'utf8');
  for (const [neu, vorher] of paare) {
    assert.equal(html.split(neu).length, 2, datei + ': Vorbedingung — die Stelle steht genau einmal');
    html = html.replace(neu, vorher);
  }
  return html;
}

/* ── _fachSchluesselAusRoh ─────────────────────────────────────────────────────────────────────────────────────────── */
const FACH_NEU = "  const roh = base64ToBytes(rohB64);   // der rohe Fachschlüssel: nach dem Import überschreiben (Befund JWE-KDF-ZWISCHENPUFFER, Klasse)\n"
  + '  try {\n'
  + "    return await crypto.subtle.importKey('raw', roh, { name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS }, false, ['encrypt', 'decrypt']);\n"
  + '  } finally { roh.fill(0); }\n';
const FACH_ALT = "  return crypto.subtle.importKey('raw', base64ToBytes(rohB64), { name: 'AES-GCM', length: HKDF_KEY_LENGTH_BITS },\n"
  + "    false, ['encrypt', 'decrypt']);\n";
async function fachMessen(lauf, fn) {
  const roh = muster(32, 41);
  const { fehler, gesehen } = await mitgeschnitten(lauf, () => fn(Buffer.from(roh).toString('base64')));
  assert.equal(fehler, null, 'Vorbedingung — der Import gelingt');
  assert.ok(gesehen.some((a) => a && a.byteLength === 32), 'Vorbedingung — der Mitschnitt hat den Rohpuffer gesehen');
  return funde(gesehen, { 'der rohe Fachschlüssel': roh });
}

test('[Zwischenpuffer · Fachschlüssel] nach _fachSchluesselAusRoh liegt der rohe Schlüssel in Kern und Lese-App nirgends mehr', async () => {
  const k = kern(null);
  try { assert.deepEqual(await fachMessen(KERN_LAUF(), k.V.__zusatz._fachSchluesselAusRoh), []); } finally { k.aufraeumen(); }
  const l = lesen(null);
  assert.deepEqual(await fachMessen(l.lauf, l.fn('_fachSchluesselAusRoh')), []);
});

test('[Zwischenpuffer · Fachschlüssel · Rot-Beweis] die alte Fassung ohne Überschreiben wird in beiden Trägern gemeldet', async () => {
  const k = kern(alt('vivodepot.html', [[FACH_NEU, FACH_ALT]]));
  try { assert.match((await fachMessen(KERN_LAUF(), k.V.__zusatz._fachSchluesselAusRoh)).join(' | '), /der rohe Fachschlüssel liegt ungenullt/); } finally { k.aufraeumen(); }
  const l = lesen(alt('vivodepot-lesen.html', [[FACH_NEU, FACH_ALT]]));
  assert.match((await fachMessen(l.lauf, l.fn('_fachSchluesselAusRoh'))).join(' | '), /der rohe Fachschlüssel liegt ungenullt/);
});

/* ── _antwortSeedGueltig ───────────────────────────────────────────────────────────────────────────────────────────── */
const SEED_NEU = '  let s = null;   // die Kopie des Seeds dient nur der Längenprüfung: danach überschreiben\n'
  + '  try { s = _antwortSeedAusB64u(f.wert); return s.length === ANTWORT_SEED_BYTES; } catch (e) { return false; } finally { if (s) s.fill(0); }\n';
const SEED_ALT = '  try { return _antwortSeedAusB64u(f.wert).length === ANTWORT_SEED_BYTES; } catch (e) { return false; }\n';
async function seedMessen(V) {
  const seed = muster(32, 97);
  const f = { form: V.__zusatz.ANTWORT_SEED_FORM, wert: V.__zusatz._antwortSeedB64u(Uint8Array.from(seed)) };
  const { ergebnis, gesehen } = await mitgeschnitten(KERN_LAUF(), async () => V.__zusatz._antwortSeedGueltig(f));
  assert.equal(ergebnis, true, 'Vorbedingung — der Seed ist gültig');
  return funde(gesehen, { 'der Antwort-Seed': seed });
}

test('[Zwischenpuffer · Antwort-Seed] nach _antwortSeedGueltig liegt keine Kopie des Seeds mehr im Speicher', async () => {
  const k = kern(null);
  try { assert.deepEqual(await seedMessen(k.V), []); } finally { k.aufraeumen(); }
});

test('[Zwischenpuffer · Antwort-Seed · Rot-Beweis] die alte Fassung lässt die Kopie liegen', async () => {
  const k = kern(alt('vivodepot.html', [[SEED_NEU, SEED_ALT]]));
  try { assert.match((await seedMessen(k.V)).join(' | '), /der Antwort-Seed liegt ungenullt/); } finally { k.aufraeumen(); }
});

/* ── _antwortEcdhSchluessel (Lese-App) ─────────────────────────────────────────────────────────────────────────────── */
const ECDH_NEU = '  let basis;   // Z (roh) trägt das gemeinsame Geheimnis: nach dem Import überschreiben\n'
  + "  try { basis = await crypto.subtle.importKey('raw', roh, { name: 'HKDF' }, false, ['deriveKey']); } finally { new Uint8Array(roh).fill(0); }\n";
const ECDH_ALT = "  const basis = await crypto.subtle.importKey('raw', roh, { name: 'HKDF' }, false, ['deriveKey']);\n";
// Hängt sich an deriveBits des Kontexts und liefert jeden Puffer, den es während des Aufrufs zurückgab.
async function ecdhMessen(l) {
  const subtle = l.fn('crypto.subtle');
  const echt = subtle.deriveBits;
  const geliefert = [];
  const { privateKey } = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const { publicKey } = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  subtle.deriveBits = async function (...args) { const b = await echt.apply(this, args); geliefert.push(b); return b; };
  try {
    await l.fn('_antwortEcdhSchluessel')(privateKey, publicKey, new Uint8Array(32));
  } finally { subtle.deriveBits = echt; }
  assert.equal(geliefert.length, 1, 'Vorbedingung — genau ein deriveBits');
  return new Uint8Array(geliefert[0]).every((x) => x === 0);
}

test('[Zwischenpuffer · ECDH-Z] nach _antwortEcdhSchluessel ist Z in der Lese-App überschrieben', async () => {
  assert.equal(await ecdhMessen(lesen(null)), true);
});

test('[Zwischenpuffer · ECDH-Z · Rot-Beweis] die alte Fassung lässt Z stehen', async () => {
  assert.equal(await ecdhMessen(lesen(alt('vivodepot-lesen.html', [[ECDH_NEU, ECDH_ALT]]))), false);
});

/* ── _zerfallSchreiben ─────────────────────────────────────────────────────────────────────────────────────────────── */
const ZERFALL_NEU = '  } finally { for (const r of rohe) r.roh.fill(0); }\n  _zerfallLaengenPruefen(tabelle);';
const ZERFALL_ALT = '    for (const r of rohe) r.roh.fill(0);\n  } finally { }\n  _zerfallLaengenPruefen(tabelle);';
/* Ein Fach mit einem Schlüssel von 31 Byte lässt den Import werfen, NACHDEM alle Inhaltsschlüssel in `rohe` liegen. Die
   Probe hört importKey mit und merkt sich jeden rohen AES-Schlüssel als Zahlenliste (kein Uint8Array, damit der Mitschnitt
   ihn nicht mitzählt); danach darf keiner davon in einem Puffer des Aufrufs stehen. */
async function zerfallMessen(V) {
  const echt = crypto.subtle.importKey;
  const rohe = [];
  const pbkdf2Salt = Uint8Array.from(muster(16, 5)), depotSalt = Uint8Array.from(muster(32, 11));
  const master = await V.importMasterHkdfKey(await V.deriveMasterBits('probe-passwort-zwischenpuffer', pbkdf2Salt));
  const opt = { hkdfKey: master, pbkdf2Salt, depotSalt, depotUUID: V.uuidV4(), fachName: null, ortHinweis: null,
    faecher: [{ name: 'Probe', kennung: 'probe', fachKeyRoh: Buffer.from(muster(31, 3)).toString('base64'), namen: [] }] };
  crypto.subtle.importKey = function (format, schluessel, alg, ...rest) {
    if (format === 'raw' && alg && alg.name === 'AES-GCM' && schluessel && schluessel.byteLength === 32) rohe.push(Array.from(new globalThis.Uint8Array(schluessel.buffer || schluessel, schluessel.byteOffset || 0, schluessel.byteLength)));
    return echt.call(this, format, schluessel, alg, ...rest);
  };
  let m;
  try {
    m = await mitgeschnitten(KERN_LAUF(), () => V.__zusatz._zerfallSchreiben(V.leeresDepot(), opt));
  } finally { crypto.subtle.importKey = echt; }
  assert.ok(m.fehler, 'Vorbedingung — das Fach mit 31 Byte lässt den Aufruf werfen');
  assert.ok(rohe.length > 0, 'Vorbedingung — die Inhaltsschlüssel wurden gesehen (' + rohe.length + ')');
  return funde(m.gesehen, Object.fromEntries(rohe.map((r, i) => ['Inhaltsschlüssel ' + (i + 1), r])));
}

test('[Zwischenpuffer · Zerfall] wirft _zerfallSchreiben mittendrin, liegt kein Inhaltsschlüssel mehr in `rohe`', async () => {
  const k = kern(null);
  try { assert.deepEqual(await zerfallMessen(k.V), []); } finally { k.aufraeumen(); }
});

test('[Zwischenpuffer · Zerfall · Rot-Beweis] die alte Fassung nullt nur auf dem Erfolgsweg', async () => {
  const k = kern(alt('vivodepot.html', [[ZERFALL_NEU, ZERFALL_ALT]]));
  try { assert.match((await zerfallMessen(k.V)).join(' | '), /Inhaltsschlüssel \d+ liegt ungenullt/); } finally { k.aufraeumen(); }
});
