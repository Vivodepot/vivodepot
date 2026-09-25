'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A-Zug 1 — Rotmachbarkeit der strukturellen G12/G13-Proben (U2-ADR-097 §3)
   ────────────────────────────────────────────────────────────────────────────
   Auftrag Drei_Fehlende_Waechter_2026-08-06.md, Teil A. Belegt zu jeder
   Probe in `tests/konformitaet/kein-master-key.mjs`, dass sie eine echte
   Verletzung fängt — nicht nur, dass sie heute grün ist. Läuft auf reinen
   Text-Kopien, kein Browser (Muster wie
   `tests/mit-modul/b-zug1-s10-rotmachbarkeit.test.js`) — reines JS, deshalb
   direkt in `tests/`, nicht in `tests/mit-modul/`.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ohneKommentareUndStrings } = require('../tools/g11-js-code-ohne-kommentare-strings.js');
const { funktionsKoerper } = require('../tools/funktion-koerper.js');
const LK = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');
const ECHT = fs.readFileSync(HTML_PFAD, 'utf8');

function eigenerCodeAus(htmlRoh) {
  const { script1, script2 } = LK.extrahiereScripts(htmlRoh);
  return script1 + '\n' + script2;
}

/* ── Proben, als reine Funktionen — Kopien der Assertions aus kein-master-key.mjs ── */
function g12PfadSetup(eigenerCodeRoh) {
  const koerper = funktionsKoerper(eigenerCodeRoh, 'setupMasterSession');
  if (!koerper) return { ok: false, grund: 'setupMasterSession() nicht gefunden' };
  if (!/function setupMasterSession\s*\(\s*password\s*,/.test(koerper)) return { ok: false, grund: 'kein password-Argument' };
  if (!/deriveMasterBits\s*\(\s*password\s*,/.test(koerper)) return { ok: false, grund: 'password nicht weitergereicht' };
  return { ok: true };
}
function g12PfadDepotMaster(eigenerCodeRoh) {
  const koerper = funktionsKoerper(eigenerCodeRoh, 'depotMasterHkdfKey');
  if (!koerper) return { ok: false, grund: 'depotMasterHkdfKey() nicht gefunden' };
  if (!/function depotMasterHkdfKey\s*\(\s*passwort\s*,/.test(koerper)) return { ok: false, grund: 'kein passwort-Argument' };
  if (!/deriveMasterBits\s*\(\s*passwort\s*,/.test(koerper)) return { ok: false, grund: 'passwort nicht weitergereicht' };
  return { ok: true };
}
function g12EinzigerSetzer(eigenerCodeRoh) {
  const bodySetup = funktionsKoerper(eigenerCodeRoh, 'setupMasterSession');
  if (!bodySetup) return { ok: false, grund: 'setupMasterSession() nicht gefunden' };
  if (!/sessionHkdfKey\s*=\s*await\s+importMasterHkdfKey\s*\(/.test(bodySetup)) return { ok: false, grund: 'setupMasterSession setzt sessionHkdfKey nicht' };
  const restOhne = ohneKommentareUndStrings(eigenerCodeRoh.replace(bodySetup, ''));
  const nichtNull = [...restOhne.matchAll(/sessionHkdfKey\s*=\s*([^;]+);/g)].filter(m => m[1].trim() !== 'null');
  return nichtNull.length === 0 ? { ok: true } : { ok: false, grund: 'zweiter Setzer: ' + nichtNull.map(m => m[0]).join(' | ') };
}
function g13BekannteWege(eigenerCodeRoh) {
  const eigenerCode = ohneKommentareUndStrings(eigenerCodeRoh);
  const BEKANNT = new Set([
    'depotMasterHkdfKey', 'deriveMasterBits', 'importMasterAesKey', 'importMasterHkdfKey',
    'setupMasterSession', 'master', 'masterHkdfKey', 'masterKey', 'masterNfc',
    'einmalReset', '_scrollUndFokusWiederherstellen',
  ]);
  const treffer = [...new Set([...eigenerCode.matchAll(/\b\w*(?:master|recovery|reset|escrow|backdoor|wiederherstell)\w*\b/gi)].map(m => m[0]))];
  const unbekannt = treffer.filter(t => !BEKANNT.has(t));
  return unbekannt.length === 0 ? { ok: true } : { ok: false, grund: 'neuer Bezeichner: ' + unbekannt.join(', ') };
}
function g13ToterPfadDeriveKey(eigenerCodeRoh) {
  const eigenerCode = ohneKommentareUndStrings(eigenerCodeRoh);
  const n = [...eigenerCode.matchAll(/(?<!\.)\bderiveKey\s*\(/g)].length;
  return n === 1 ? { ok: true } : { ok: false, grund: `${n} Fundstellen statt 1` };
}

test('[A-Zug1·Anker] die echte vivodepot.html besteht alle vier Proben unverändert', () => {
  const c = eigenerCodeAus(ECHT);
  assert.equal(g12PfadSetup(c).ok, true, 'Positivkontrolle setupMasterSession-Pfad');
  assert.equal(g12PfadDepotMaster(c).ok, true, 'Positivkontrolle depotMasterHkdfKey-Pfad');
  const setzer = g12EinzigerSetzer(c);
  assert.equal(setzer.ok, true, 'Positivkontrolle Einziger-Setzer: ' + (setzer.grund || ''));
  const wege = g13BekannteWege(c);
  assert.equal(wege.ok, true, 'Positivkontrolle Bekannte-Wege: ' + (wege.grund || ''));
  assert.equal(g13ToterPfadDeriveKey(c).ok, true, 'Positivkontrolle toter Pfad deriveKey');
});

test('[A-Zug1·Rotmachbarkeit 1] password-Argument aus setupMasterSession entfernt → G12-Pfad rot, sonst nichts', () => {
  const nadel = 'async function setupMasterSession(password, salt) {';
  assert.ok(ECHT.includes(nadel), 'Suchtext im echten Kern nicht gefunden — die Analyse ist veraltet');
  const mutiert = ECHT.replace(nadel, 'async function setupMasterSession(salt) {\n  const password = "BACKDOOR-KONSTANTE";');
  assert.notEqual(mutiert, ECHT, 'Mutation griff nicht');
  const c = eigenerCodeAus(mutiert);
  assert.equal(g12PfadSetup(c).ok, false, 'G12-Pfad-Probe muss rot werden, wenn password kein Argument mehr ist');
  assert.equal(g12PfadDepotMaster(c).ok, true, 'depotMasterHkdfKey-Probe darf NICHT rot werden — andere Ursache');
});

test('[A-Zug1·Rotmachbarkeit 2] zweiter, außenliegender Setzer für sessionHkdfKey → G12-Einziger-Setzer rot, sonst nichts', () => {
  /* F5 Zug 2 (21.08.2026): `angehoerigenAusUmschlag` ist mit der Abschrift entfallen. Der Pfad,
     der heute mit einem FREMDEN Passwort in die Datei kommt, ist der Fach-Weg — und genau dort
     muss die Injektion eines zweiten Setzers gefangen werden. Derselbe Beweis, anderer Anker. */
  const nadel = 'async function _fachTuerSchluessel(passwort, kdfSaltBytes, tuerSalt, depotUUID) {';
  assert.ok(ECHT.includes(nadel), 'Suchtext im echten Kern nicht gefunden — die Analyse ist veraltet');
  const mutiert = ECHT.replace(nadel, nadel + '\n  sessionHkdfKey = await importMasterHkdfKey(await deriveMasterBits(passwort, new Uint8Array(16)));');
  assert.notEqual(mutiert, ECHT, 'Injektion griff nicht');
  const c = eigenerCodeAus(mutiert);
  const setzer = g12EinzigerSetzer(c);
  assert.equal(setzer.ok, false, 'G12-Einziger-Setzer muss rot werden, wenn der Fach-Pfad den Anker-Schlüssel setzt');
  assert.equal(g12PfadSetup(c).ok, true, 'setupMasterSession-Probe darf NICHT rot werden — andere Ursache');
});

test('[A-Zug1·Rotmachbarkeit 3] neuer Bezeichner der Familie „recovery" im eigenen Code → G13-Bekannte-Wege rot, sonst nichts', () => {
  // Bares `<script>`, nicht „irgendein script-Tag ohne src" („Produkt ist eine
  // Datei", 10.09.2026, dasselbe Muster wie in tests/g11-offline-garantie-proben-unabhaengig.
  // test.js): das neue <script id="vor-depot-konfiguration"> steht VOR dem Kern-Skript und wäre
  // sonst die Injektionsstelle — eigenerCodeAus() liest aber nur, was extrahiereScripts() (load-
  // kern.js) als script1/script2 über das literale `<script>`/`</script>` erkennt.
  const marker = /<script>/;
  assert.match(ECHT, marker, 'kein Kern-<script>-Tag gefunden — Injektionsstelle fehlt');
  const mutiert = ECHT.replace(marker, (m) => m + "\nasync function recoveryPfadNeu(x) { return x; }\n");
  assert.notEqual(mutiert, ECHT, 'Injektion griff nicht');
  const c = eigenerCodeAus(mutiert);
  const wege = g13BekannteWege(c);
  assert.equal(wege.ok, false, 'G13-Bekannte-Wege muss rot werden, wenn ein neuer recovery-Bezeichner auftaucht');
  assert.equal(g12PfadSetup(c).ok, true, 'setupMasterSession-Probe darf NICHT rot werden — andere Ursache');
});

test('[A-Zug1·Rotmachbarkeit 4] deriveKey() bekommt einen Aufrufer → G13-Toter-Pfad rot, sonst nichts', () => {
  const nadel = 'async function setupMasterSession(password, salt) {';
  assert.ok(ECHT.includes(nadel), 'Suchtext im echten Kern nicht gefunden — die Analyse ist veraltet');
  const mutiert = ECHT.replace(nadel, nadel + '\n  await deriveKey(password, salt); // Regressions-Sonde: toter Pfad bekommt Aufrufer');
  assert.notEqual(mutiert, ECHT, 'Injektion griff nicht');
  const c = eigenerCodeAus(mutiert);
  assert.equal(g13ToterPfadDeriveKey(c).ok, false, 'G13-Toter-Pfad-Probe muss rot werden, wenn deriveKey() einen Aufrufer bekommt');
  assert.equal(g12PfadSetup(c).ok, true, 'setupMasterSession-Pfad-Probe darf NICHT rot werden — andere Ursache');
});
