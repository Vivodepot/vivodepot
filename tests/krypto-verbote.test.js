'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Stufe 6 (Krypto) der 26-Verbote-Strecke — der letzte Zug.
   ────────────────────────────────────────────────────────────────────────
   Verschärfte Sorgfalt (Strecken-Auftrag): NUR prüfen, kein vivodepot.html-
   Eingriff; je Verbot ein AM CODE GEMESSENER Anker, sonst kein Test.

   • u2-002 / u2-016 — v3-only, keine Legacy-Lesepfade:
       Anker KRYPTO_VERSION_ALLOWLIST = [3] (2492), CRYPTO_VERSION_AKTUELL = 3 (2489),
       hartes Lade-Gate (6560/7083), deriveKeyLegacy ersatzlos entfernt (2479/2555).
       U2-002 („keine kryptoVersion-1-Altpfade") und U2-016 („v3-only") sind
       DERSELBE Verbotssatz in zwei Fassungen (Stufe-0-Befund) → EINE Prüfung,
       beide ADR binden darauf.
   • u2-015-aad   — Zeitmarke nie in der AAD: die AAD ist ein fester Drei-Felder-
       Block (_AAD_DEPOT_V2/_AAD_UEBERGABE_V2, 2497/2498) — kein Zeit-/Datumsfeld.
   • u2-078       — passwortloser Stufe-1-Cache ersatzlos entfernt: kein
       notfallCacheBauen/notfallCacheAusUmschlag/flowNotfallAusDatei, und
       depotSerialisieren schreibt keinen notfallCache mehr (7965 ff.).
   • u2-062-cache — Angehörigen-Cache trägt nie Master-Schlüssel/volles Depot:
       `angehoerigenCacheModell()` (9772) baut einen GEPRUNTEN Subset; kein
       Schlüssel-, Passwort- oder Voll-`data`-Feld darin.
       (Die Schlüssel-Hälfte von U2-062 bindet per VERWEIS auf die laufende
       extractable-Inventur — s. ADR-Klausel in U2-ADR-026.)
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { vendorZeilen, kommentarZeilen } = require('../tools/zusicherungen-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function eigenCode(src) {
  const vendor = vendorZeilen(src);
  const kommentar = kommentarZeilen(src);
  return src.split('\n').filter((z, i) => !vendor.has(i + 1) && !kommentar.has(i + 1)).join('\n');
}
const CODE = eigenCode(HTML);

// Balancierter Block ab `const <name>` (für Object.freeze({…}) / […]).
function konstanteBlock(src, name, auf = '{', zu = '}') {
  const start = src.indexOf('const ' + name);
  assert.ok(start >= 0, 'Anker-Konstante fehlt: ' + name);
  const i0 = src.indexOf(auf, start);
  let tiefe = 0;
  for (let i = i0; i < src.length; i++) {
    if (src[i] === auf) tiefe++;
    else if (src[i] === zu) { tiefe--; if (tiefe === 0) return src.slice(i0, i + 1); }
  }
  throw new Error('Kein balancierter Block für ' + name);
}

// ── U2-002 + U2-016 — keine Legacy-Lesepfade (v1/v2) ──
/* 19.08.2026, Zerfall in Feld-Einheiten: die Allowlist ist [3, 4] statt [3].
   Der Wächter wird dadurch NICHT schwächer — was er bewacht, ist die Abwesenheit
   der LEGACY-Versionen 1 und 2, und die prüft er jetzt ausdrücklich und nicht
   mehr nur als Nebenwirkung eines Literalvergleichs. v4 ist die neue Generation,
   v3 bleibt als RÜCKWEG (Auflage A2 zum Bauauftrag), nicht als Legacy-Pfad. */
test('u2-002-016-v3-only-keine-legacy-lesepfade', () => {
  const allow = konstanteBlock(CODE, 'KRYPTO_VERSION_ALLOWLIST', '[', ']');
  const werte = allow.replace(/[[\]\s]/g, '').split(',').filter(Boolean).map(Number);
  assert.deepEqual(werte, [3, 4],
    'KRYPTO_VERSION_ALLOWLIST ist nicht [3, 4]: ' + allow);
  // Die eigentliche Zusicherung, jetzt unabhaengig von der Schreibweise:
  for (const legacy of [1, 2]) {
    assert.ok(!werte.includes(legacy),
      'Legacy-Version ' + legacy + ' steht wieder in der Allowlist: ' + allow);
  }
  assert.ok(/const CRYPTO_VERSION_AKTUELL\s*=\s*3\b/.test(CODE), 'CRYPTO_VERSION_AKTUELL ist nicht 3');
  assert.ok(/const CRYPTO_VERSION_ZERFALL\s*=\s*4\b/.test(CODE), 'CRYPTO_VERSION_ZERFALL ist nicht 4');
  // Hartes Lade-Gate: die Allowlist wird beim Laden geprüft (nicht nur deklariert).
  const gates = (CODE.match(/KRYPTO_VERSION_ALLOWLIST\.includes\(/g) || []).length;
  assert.ok(gates >= 2, 'Lade-Gate fehlt: nur ' + gates + '× KRYPTO_VERSION_ALLOWLIST.includes(');
  // Keine Legacy-Ableitung / kein v1-/v2-Lesepfad zurück.
  for (const muster of [/deriveKeyLegacy/, /PBKDF2_ITERATIONS_LEGACY/,
                        /kryptoVersion\s*===?\s*[12]\b/, /migriereKrypto|kryptoMigration/i]) {
    assert.ok(!muster.test(CODE), 'Legacy-Krypto-Pfad gefunden (' + muster + ')');
  }
});

// ── U2-015 (AAD-Teil) — Zeitmarke nie in der AAD ──
test('u2-015-zeitmarke-nie-in-der-aad', () => {
  for (const name of ['_AAD_DEPOT_V2', '_AAD_UEBERGABE_V2']) {
    const block = konstanteBlock(CODE, name);
    const felder = (block.match(/(\w+)\s*:/g) || []).map(s => s.replace(':', '').trim());
    assert.deepEqual(felder, ['kryptoVersion', 'iterationen', 'kdfTyp'],
      name + ' ist nicht mehr der feste Drei-Felder-Block: ' + felder.join(', '));
    for (const zeit of [/zeit/i, /datum/i, /gespeichert_am/, /timestamp/i, /\bts\b/]) {
      assert.ok(!zeit.test(block), name + ' trägt ein Zeit-/Datumsfeld in der AAD (' + zeit + ')');
    }
  }
});

// ── U2-078 — passwortloser Stufe-1-Cache ersatzlos entfernt ──
/* ── Diskriminanten (B-1, 26.07.): je EINE Stelle, von Wächter UND Probe genutzt.
   Vorher standen die Muster im Wächter und — wiederholt — in der Negativprobe: eine KOPIE,
   die eine Änderung am Wächter-Muster nicht bemerkt hätte. */
const CACHE_PFADE = [/notfallCacheBauen/, /notfallCacheAusUmschlag/, /flowNotfallAusDatei/];
function stufe1CacheVerstoesse(code) {
  const v = CACHE_PFADE.filter(m => m.test(code)).map(m => 'Entfernter Stufe-1-Cache-Pfad ist zurück: ' + m);
  for (const z of code.split('\n')) {
    if (/notfallCache\s*[:=][^=]/.test(z)) v.push('Schreibt notfallCache: ' + z.trim().slice(0, 100));
  }
  return v;
}

const CACHE_INHALT_VERBOTEN = [/subset\s*=\s*data\b/, /\bsubset\s*=\s*tiefKopie\(\s*data\s*\)/,
                               /(masterKey|subKey|sessionKey|hkdfKey|passwort|password|schluessel)\s*[,:]/i];
function cacheInhaltVerstoesse(koerper) {
  const v = CACHE_INHALT_VERBOTEN.filter(m => m.test(koerper))
    .map(m => 'Cache übernimmt Schlüssel-/Passwort-/Voll-Depot-Material: ' + m);
  if (!/subset\s*=\s*\{/.test(koerper)) v.push('Cache wird nicht mehr als gepruntes Subset gebaut');
  return v;
}
// Der Prüfbereich: der Körper von angehoerigenCacheModell bis zur nächsten Top-Level-Funktion.
function cacheModellKoerper(code) {
  const start = code.indexOf('function angehoerigenCacheModell');
  if (start < 0) return '';
  const rest = code.slice(start);
  return rest.slice(0, rest.indexOf('\nfunction ', 10) + 1 || 4000);
}

test('u2-078-kein-passwortloser-stufe1-cache', () => {
  const v = stufe1CacheVerstoesse(CODE);
  assert.deepEqual(v, [], 'U2-ADR-078 (ersatzlos entfallen):\n  ' + v.join('\n  '));
});

// ── U2-062 (Cache-Inhalt-Hälfte) — kein Master-Schlüssel/volles Depot im Cache ──
test('u2-062-angehoerigen-cache-ohne-schluessel-und-volldepot', () => {
  const koerper = cacheModellKoerper(CODE);
  assert.ok(koerper.length > 0, 'Anker `angehoerigenCacheModell` fehlt — leerer Prüfbereich');
  const v = cacheInhaltVerstoesse(koerper);
  assert.deepEqual(v, [], v.join(' · '));
});

// ── U2-062 (Schlüssel-Hälfte) — Always-on-Zusatz zur extractable-Inventur ──
// Bindungsart B (Auftrag 6a.2): die Inventur läuft NUR über test:konformitaet (pre-push + CI mit
// paths-Filter), nicht über `npm test`. Dieser Zusatz läuft immer.
// ANKER-BEFUND (gemessen): `extractable` ist in der Web-Crypto-API POSITIONAL (4. Argument von
// importKey) — im Kern existiert KEIN einziges `extractable:`-Literal. Der Statik-Teil der Inventur
// sucht `extractable:\s*true` und kann daher nie anschlagen (vakuum-grün; der Runtime-Teil ist echt).
// Dieser Test prüft stattdessen die echte Form: jeder Import eines GEHEIMEN/PRIVATEN Schlüssels
// (deriveBits/deriveKey/encrypt/decrypt/sign) trägt `false`; nur reine `verify`-Schlüssel (öffentlich)
// dürfen `true` tragen.
// Diskriminante: alle importKey-Argumentlisten aus einem Quelltext ziehen …
function importKeyAufrufe(code) {
  const aufrufe = [];
  let i = 0;
  while ((i = code.indexOf('crypto.subtle.importKey(', i)) >= 0) {
    const auf = code.indexOf('(', i);
    let tiefe = 0, j = auf;
    for (; j < code.length; j++) {
      if (code[j] === '(') tiefe++;
      else if (code[j] === ')') { tiefe--; if (tiefe === 0) break; }
    }
    aufrufe.push(code.slice(auf, j + 1));
    i = j;
  }
  return aufrufe;
}
// … und je Aufruf prüfen: geheim/privat ⇒ extractable muss false sein (nur `verify` darf true).
const GEHEIME_USAGES = ['deriveBits', 'deriveKey', 'encrypt', 'decrypt', 'sign', 'unwrapKey'];
function extractableVerstoesse(code) {
  const verstoesse = [];
  for (const a of importKeyAufrufe(code)) {
    const m = a.match(/,\s*(true|false)\s*,\s*\[([^\]]*)\]/);
    if (!m) { verstoesse.push('unlesbare Argumentform: ' + a.replace(/\s+/g, ' ').slice(0, 90)); continue; }
    const [, extractable, usagesRoh] = m;
    const usages = usagesRoh.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    if (usages.some(u => GEHEIME_USAGES.includes(u)) && extractable !== 'false') {
      verstoesse.push('extractable=' + extractable + ' bei [' + usages.join(',') + ']: ' + a.replace(/\s+/g, ' ').slice(0, 80));
    }
  }
  return verstoesse;
}

test('u2-062-geheime-schluessel-nie-extrahierbar', () => {
  assert.ok(importKeyAufrufe(CODE).length >= 5,
    'zu wenige importKey-Aufrufe gefunden (' + importKeyAufrufe(CODE).length + ') — Anker prüfen');
  const v = extractableVerstoesse(CODE);
  assert.deepEqual(v, [], 'Geheimer/privater Schlüssel als extrahierbar importiert:\n  ' + v.join('\n  '));
});

// ── Negativproben: jedes Muster fängt einen eingebauten Verstoß ──
test('[Negativprobe] die Stufe-6-Prüfungen werden bei eingebautem Verstoß rot', () => {
  assert.equal(konstanteBlock('const KRYPTO_VERSION_ALLOWLIST = [2, 3, 4];', 'KRYPTO_VERSION_ALLOWLIST', '[', ']')
    .replace(/\s/g, ''), '[2,3,4]', 'Allowlist-Muster greift nicht');
  assert.ok(/deriveKeyLegacy/.test('async function deriveKeyLegacy(pw) {}'), 'Legacy-Muster greift nicht');
  const mitZeit = konstanteBlock("const _AAD_DEPOT_V2 = Object.freeze({ kryptoVersion: 3, gespeichert_am: 1 });", '_AAD_DEPOT_V2');
  assert.ok(/gespeichert_am/.test(mitZeit), 'AAD-Zeitmarken-Muster greift nicht');
  // Gegenrichtung: der heutige, erlaubte Zustand bleibt grün.
  assert.ok(!/kryptoVersion\s*===?\s*[12]\b/.test('kryptoVersion: CRYPTO_VERSION_AKTUELL'),
    'v3-Zuweisung fälschlich als Legacy-Vergleich gewertet');
});

test('[Negativprobe] u2-078 feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const sauber = 'function depotSerialisieren(d) { return { iv, ct }; }';
  assert.deepEqual(stufe1CacheVerstoesse(sauber), [], 'sauberer Serialisierer meldet Verstöße');
  assert.ok(stufe1CacheVerstoesse(sauber + '\nfunction notfallCacheBauen() {}').some(x => /zurück/.test(x)),
    'blind: wiederhergestellter Cache-Pfad wurde NICHT erkannt');
  assert.ok(stufe1CacheVerstoesse(sauber + '\numschlag.notfallCache = bauen();').some(x => /Schreibt/.test(x)),
    'blind: notfallCache-Schreiber wurde NICHT erkannt');
  assert.deepEqual(stufe1CacheVerstoesse(sauber), [], 'nach Rücknahme der Mutation nicht wieder grün');
  // Gegenrichtung: der UI-String der Live-Sicht (hinter dem Passwort) ist kein Cache-Schreiber.
  assert.deepEqual(stufe1CacheVerstoesse('notfallCacheTitel: "Notfall-Informationen",'), [],
    'UI-String fälschlich als Cache-Schreiber gewertet');
});

test('[Negativprobe] u2-062 (Cache-Inhalt) feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const sauber = 'function angehoerigenCacheModell() {\n  const subset = { sektoren: {} };\n  return subset;\n}';
  assert.deepEqual(cacheInhaltVerstoesse(cacheModellKoerper(sauber)), [],
    'geprunter Subset meldet Verstöße — Diskriminante zu grob');
  for (const mut of ['  const x = { masterKey: k };', '  const subset = data;', '  const p = { passwort: pw };']) {
    assert.ok(cacheInhaltVerstoesse(sauber + '\n' + mut).length > 0,
      'blind: „' + mut.trim().slice(0, 30) + '…" wurde NICHT erkannt');
  }
  assert.deepEqual(cacheInhaltVerstoesse(cacheModellKoerper(sauber)), [],
    'nach Rücknahme der Mutation nicht wieder grün');
  // Der Prüfbereich darf nicht leer werden (Slice-Fehler-Klasse aus Stufe 7).
  assert.equal(cacheModellKoerper('function anderes() {}'), '', 'Körper ohne Anker muss leer sein');
  assert.ok(cacheModellKoerper(CODE).length > 0, 'Körper am echten Code ist leer — Anker defekt');
});

test('[Negativprobe] u2-062 (Schlüssel) feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  const sauber = "crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])";
  assert.deepEqual(extractableVerstoesse(sauber), [], 'extractable=false meldet Verstoß — Diskriminante falsch');
  const mutiert = sauber.replace(', false,', ', true,');
  assert.ok(extractableVerstoesse(mutiert).some(x => /extractable=true/.test(x)),
    'blind: geheimer Schlüssel mit extractable=true wurde NICHT erkannt');
  assert.deepEqual(extractableVerstoesse(sauber), [], 'nach Rücknahme der Mutation nicht wieder grün');
  // Gegenrichtung: ein ÖFFENTLICHER verify-Schlüssel darf true tragen.
  assert.deepEqual(extractableVerstoesse("crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, true, ['verify'])"), [],
    'öffentlicher verify-Schlüssel fälschlich als geheim gewertet');
});

// ── Bindungen ans Fundament ──
test('[Klausel] Stufe 6: Krypto-Verbote an ihre ADR gebunden', () => {
  // U2-002 und U2-016 tragen denselben Verbotssatz → dieselbe Prüfung, beide ADR gebunden.
  bindungPruefen('U2-ADR-002', 'invariante', ['u2-002-016-v3-only-keine-legacy-lesepfade'], __filename);
  bindungPruefen('U2-ADR-016', 'invariante', ['u2-002-016-v3-only-keine-legacy-lesepfade'], __filename);
  bindungPruefen('U2-ADR-015', 'invariante', ['u2-015-zeitmarke-nie-in-der-aad'], __filename);
  bindungPruefen('U2-ADR-078', 'invariante', ['u2-078-kein-passwortloser-stufe1-cache'], __filename);
  // U2-062 zweigeteilt: Cache-Inhalt-Hälfte + Schlüssel-Hälfte (beide U2-ADR-026).
  bindungPruefen('U2-ADR-026', 'invariante', [
    'u2-062-angehoerigen-cache-ohne-schluessel-und-volldepot',
    'u2-062-geheime-schluessel-nie-extrahierbar',
  ], __filename);
});

/* ── Konvention (B-1): Deklaration per REFERENZ, nicht per Zeichenkette ──────────────────
   Ein Name wäre eine Behauptung und könnte driften; die Referenz ist die Sache selbst, und der
   Prüfstand (B-2) vergleicht Identität statt Text. */
module.exports = {
  PROBEN: [
    { fuer: 'u2-002-016-v3-only-keine-legacy-lesepfade',              diskriminante: konstanteBlock },
    { fuer: 'u2-015-zeitmarke-nie-in-der-aad',                        diskriminante: konstanteBlock },
    { fuer: 'u2-078-kein-passwortloser-stufe1-cache',                 diskriminante: stufe1CacheVerstoesse },
    { fuer: 'u2-062-angehoerigen-cache-ohne-schluessel-und-volldepot', diskriminante: cacheInhaltVerstoesse },
    { fuer: 'u2-062-geheime-schluessel-nie-extrahierbar',             diskriminante: extractableVerstoesse },
    // U2-ADR-436, Nachtrag 04.10.2026 (Befund JWK-IN-STATE): die Krypto-Verbote a–d über alle Wurzel-Seiten.
    { fuer: '[Krypto a–d · Positivkontrolle] das echte Repo ist grün, jede Wurzel-Seite und die Auslieferungsliste werden gelesen', diskriminante: echteExportVerstoesse },
    { fuer: '[Krypto b · Rot-Beweis] generateKey/importKey mit privater Verwendung und extractable=true; false und verify bleiben grün', diskriminante: exportLauf },
    { fuer: '[Krypto c · Rot-Beweis] exportKey eines privaten Schlüssels ohne Eintrag; ein öffentlicher bleibt grün', diskriminante: exportLauf },
  ],
};

/* ══ Krypto-Verbote a–d (Befund JWK-IN-STATE, Bedingungen der Gegenlesung 03.10.2026) ══════════════════════════════════════════
   Der Wächter steht in tools/krypto-schluessel-export-pruefen.js, die Positivliste in tools/krypto-export-positivliste.json.
   (a) alle Wurzel-*.html, die Auslieferungsliste darin enthalten · (b) generateKey/importKey mit privater oder geheimer
   Verwendung nur mit extractable=false · (c) exportKey eines nicht öffentlichen Schlüssels nur an einer Stelle der
   Positivliste mit Grund · (d) je Regel ein Rot-Beweis an einer erfundenen Fixture, dazu die Positivkontrolle. */
const os = require('node:os');
const EXPORT = require('../tools/krypto-schluessel-export-pruefen.js');
const REPO_WURZEL = path.join(__dirname, '..');

function exportFixture(seiten) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'krypto-export-'));
  for (const [name, code] of Object.entries(seiten)) fs.writeFileSync(path.join(dir, name), '<script>\n' + code + '\n</script>');
  return dir;
}
function exportLauf(seiten, positivliste, dateisatz) {
  const dir = exportFixture(seiten);
  try { return EXPORT.pruefen(dir, { positivliste: positivliste || [], dateisatz: dateisatz || [] }).fehler; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const GRUND = 'Erfundener Grund für die Probe, lang genug.';
function echteExportVerstoesse() { return EXPORT.pruefen(REPO_WURZEL).fehler; }

test('[Krypto a–d · Positivkontrolle] das echte Repo ist grün, jede Wurzel-Seite und die Auslieferungsliste werden gelesen', () => {
  assert.deepEqual(echteExportVerstoesse(), []);
  const r = EXPORT.pruefen(REPO_WURZEL);
  const wurzel = fs.readdirSync(REPO_WURZEL).filter((n) => n.endsWith('.html')).sort();
  assert.deepEqual(r.seiten, wurzel);
  const { DATEISATZ } = require('../scripts/ausgeliefertes-dateiset.js');
  for (const d of DATEISATZ.filter((x) => x.endsWith('.html'))) assert.ok(r.seiten.includes(d), d);
  assert.ok(r.karte.length >= 50, 'zu wenige Aufrufe gefunden (' + r.karte.length + ') — Anker prüfen');
});

test('[Krypto a · Rot-Beweis] eine Seite der Auslieferungsliste, die nicht als Wurzel-Seite vorliegt', () => {
  const f = exportLauf({ 'a.html': '' }, [], ['a.html', 'fehlt.html']);
  assert.ok(f.some((x) => x.startsWith('(a) fehlt.html')), f.join('\n'));
});

test('[Krypto b · Rot-Beweis] generateKey/importKey mit privater Verwendung und extractable=true; false und verify bleiben grün', () => {
  const rot = exportLauf({
    'a.html': "async function f() { return crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']); }\n"
      + "async function g(j) { return crypto.subtle.importKey('jwk', j, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']); }",
  });
  assert.ok(rot.length > 0, 'Nicht-leer-Wache: der Wächter meldet die verschlechterte Fixture');
  assert.ok(rot.some((x) => x.startsWith('(b) a.html · f: generateKey')), rot.join('\n'));
  assert.ok(rot.some((x) => x.startsWith('(b) a.html · g: importKey')), rot.join('\n'));
  const gruen = exportLauf({
    'a.html': "async function f() { return crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']); }\n"
      + "async function g(j) { return crypto.subtle.importKey('jwk', j, { name: 'Ed25519' }, true, ['verify']); }\n"
      + "/* crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign']) — nur ein Kommentar */",
  });
  assert.deepEqual(gruen, []);
  const gelistet = exportLauf({ 'a.html': "async function f() { return crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']); }" },
    [{ datei: 'a.html', funktion: 'f', regel: 'generateKey', grund: GRUND }]);
  assert.deepEqual(gelistet, []);
});

test('[Krypto c · Rot-Beweis] exportKey eines privaten Schlüssels ohne Eintrag; ein öffentlicher bleibt grün', () => {
  const rot = exportLauf({ 'a.html': "async function f(p) { return crypto.subtle.exportKey('jwk', p.privateKey); }" });
  assert.ok(rot.length > 0, 'Nicht-leer-Wache: der Wächter meldet die verschlechterte Fixture');
  assert.ok(rot.some((x) => x.startsWith('(c) a.html · f: exportKey')), rot.join('\n'));
  assert.deepEqual(exportLauf({ 'a.html': "async function f(p) { return crypto.subtle.exportKey('jwk', p.publicKey); }" }), []);
  assert.deepEqual(exportLauf({ 'a.html': "async function f(p) { return crypto.subtle.exportKey('jwk', p.privateKey); }" },
    [{ datei: 'a.html', funktion: 'f', regel: 'exportKey', grund: GRUND }]), []);
});

test('[Krypto c · Rot-Beweis] ein im Code gebautes privates JWK (Shamir-Weg, ohne exportKey) ohne Eintrag; ein öffentliches bleibt grün', () => {
  const rot = exportLauf({ 'a.html': "function f(seed, pub) { const jwk = { kty: 'OKP', crv: 'Ed25519', x: pub.x, d: seed }; return jwk; }" });
  assert.ok(rot.length > 0, 'Nicht-leer-Wache: der Wächter meldet die verschlechterte Fixture');
  assert.ok(rot.some((x) => x.startsWith('(c) a.html · f: baut ein privates JWK')), rot.join('\n'));
  assert.deepEqual(exportLauf({ 'a.html': "function f(pub) { return { kty: 'OKP', crv: 'Ed25519', x: pub.x }; }\nfunction g(o) { return { d: o.d, e: 1 }; }" }), []);
  assert.deepEqual(exportLauf({ 'a.html': "function f(seed, pub) { return { kty: 'OKP', x: pub.x, d: seed }; }" },
    [{ datei: 'a.html', funktion: 'f', regel: 'jwkMitD', grund: GRUND }]), []);
});

test('[Krypto c · Rot-Beweis] ein privates JWK als Text herausgegeben (Klartext-Ausgang) ohne Eintrag; ein öffentliches bleibt grün', () => {
  const rot = exportLauf({ 'a.html': "function f(k) { const t = JSON.stringify(k.jwk, null, 2); return t; }\nfunction g(privatJwk) { return JSON.stringify(privatJwk); }" });
  assert.ok(rot.length > 0, 'Nicht-leer-Wache: der Wächter meldet die verschlechterte Fixture');
  assert.ok(rot.some((x) => x.startsWith('(c) a.html · f: gibt ein privates JWK als Text heraus')), rot.join('\n'));
  assert.ok(rot.some((x) => x.startsWith('(c) a.html · g: gibt ein privates JWK als Text heraus')), rot.join('\n'));
  assert.deepEqual(exportLauf({ 'a.html': "function f(s) { return JSON.stringify(s.publicJwk) + JSON.stringify(s.oeffentlichJwk) + JSON.stringify(s.daten); }" }), []);
});

test('[Krypto c · Rot-Beweis] ein Eintrag ohne Gegenstand und ein Eintrag ohne Grund werden gemeldet', () => {
  const f1 = exportLauf({ 'a.html': '' }, [{ datei: 'a.html', funktion: 'weg', regel: 'exportKey', grund: GRUND }]);
  assert.ok(f1.some((x) => /Eintrag ohne Gegenstand/.test(x)), f1.join('\n'));
  const f2 = exportLauf({ 'a.html': "async function f(p) { return crypto.subtle.exportKey('jwk', p.privateKey); }" },
    [{ datei: 'a.html', funktion: 'f', regel: 'exportKey', grund: '' }]);
  assert.ok(f2.some((x) => /ohne Grund/.test(x)), f2.join('\n'));
});

test('[Krypto a–d] die Positivliste nennt keine Zeilennummern und für jede Exportstelle die zugehörige Erzeugung', () => {
  const liste = JSON.parse(fs.readFileSync(path.join(REPO_WURZEL, EXPORT.POSITIVLISTE), 'utf8')).eintraege;
  for (const e of liste) {
    assert.deepEqual(Object.keys(e).sort(), ['datei', 'funktion', 'grund', 'regel'], JSON.stringify(e));
    assert.doesNotMatch(e.grund, /\bZ\.\s*\d|Zeile\s+\d|:\d{3,}\b/, 'keine Zeilennummer im Grund: ' + e.grund);
  }
});
