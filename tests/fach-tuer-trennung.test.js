'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Tür eines Fachs und der Anker-Schlüssel — was ihre Trennung trägt
   (U2-ADR-156-Nachtrag Fach-Tür, 04.10.2026).
   ────────────────────────────────────────────────────────────────────────
   Die Tür nutzt denselben HKDF-Info-String wie der Anker. Die Schlüssel trennt
   allein das eigene, zufällige kdfSalt je Fach (anderes IKM). tuerSalt ist bis
   zum ersten Passwortwechsel gleich dem Anker-Salz, und die AAD an
   fachSchluessel bindet nur den Platz: Mit gleichem Schlüssel gäbe man die
   öffentliche Anker-AAD einfach mit. Gemessen am Rot-Beweis vom 04.10.2026:
   Anker-Salz als kdfSalt eingesetzt, dann öffnet die Tür bei gleichem Passwort
   das Anker-Geheimnis. Diese Datei schreibt die Bedingung und die Platzbindung
   fest.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'anker-pw-tuer-12345';

async function depotMitFach(fachPasswort) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], fachPasswort, null);
  return { V, u: await V.depotSerialisieren() };
}

// Die Tür so ableiten, wie `_fachTuerSchluessel` es tut — aus den Bausteinen, die der Kern freigibt.
async function tuerAbleiten(V, passwort, eintrag, umschlag) {
  const tuerSalt = V.base64ToBytes(eintrag.kdf.tuerSalt || umschlag.depotSalt);
  const master = await V.depotMasterHkdfKey(V.normalizePassword(passwort), V.base64ToBytes(eintrag.kdf.salt));
  return V.deriveDepotKeyV2(master, tuerSalt, umschlag.depotUUID);
}

async function oeffnet(V, ct, key, aad) {
  try { await V.VdCrypto.decryptDepot(ct, key, aad); return true; } catch (_) { return false; }
}

// Die Salz-Bedingung als reine Prüfung, damit der Rot-Beweis dieselbe Funktion trifft wie die Probe.
function faecherMitAnkerSalz(umschlag) {
  const tabelle = umschlag.umschlagTabelle;
  const anker = tabelle[0].kdf.salt;
  const salze = new Set();
  const funde = [];
  for (let i = 1; i < tabelle.length; i++) {
    const s = tabelle[i].kdf && tabelle[i].kdf.salt;
    if (s === anker || salze.has(s)) funde.push(tabelle[i].kennung);
    salze.add(s);
  }
  return funde;
}

test('[Fach-Tür] kdfSalt je Fach ist eigen und nicht das Anker-Salz', async () => {
  const { V, u } = await depotMitFach('fach-passwort-der-anja-1');
  assert.ok(u.umschlagTabelle.length >= 2, 'Voraussetzung: die Datei trägt ein Fach');
  assert.equal(V.base64ToBytes(u.umschlagTabelle[1].kdf.salt).length, 16, 'kdfSalt hat 16 Byte');
  assert.deepEqual(faecherMitAnkerSalz(u), []);
});

test('[Fach-Tür·Rot] ein Fach mit dem Anker-Salz fällt auf', async () => {
  const { u } = await depotMitFach('fach-passwort-der-anja-1');
  const kopie = JSON.parse(JSON.stringify(u));
  kopie.umschlagTabelle[1].kdf.salt = kopie.umschlagTabelle[0].kdf.salt;
  assert.deepEqual(faecherMitAnkerSalz(kopie), [kopie.umschlagTabelle[1].kennung]);
});

test('[Fach-Tür] gleiches Passwort, Tür öffnet den Anker nicht', async () => {
  // Die Empfängerin wählt dasselbe Passwort wie die Inhaberin: der Fall, in dem allein das Salz trennt.
  const { V, u } = await depotMitFach(PW);
  const anker = u.umschlagTabelle[0];
  const fach = u.umschlagTabelle[1];
  const tuer = await tuerAbleiten(V, PW, fach, u);
  const ankerAad = V.VdCrypto.aadEinheit(u.depotUUID, anker.kennung);
  assert.equal(await oeffnet(V, anker.geheim, tuer, ankerAad), false, 'die Tür öffnet das Anker-Geheimnis nicht');
  // Gegenprobe: der Weg misst überhaupt etwas — der Anker-Schlüssel selbst öffnet es.
  const ankerKey = await tuerAbleiten(V, PW, { kdf: { salt: anker.kdf.salt } }, u);
  assert.equal(await oeffnet(V, anker.geheim, ankerKey, ankerAad), true,
    'BELEG: dieselbe Ableitung mit dem Anker-Salz öffnet — die Probe oben misst die Trennung, nicht einen kaputten Weg');
});

test('[Fach-Tür] fachSchluessel öffnet nur mit der AAD der Fach-Kennung', async () => {
  const pw = 'fach-passwort-der-anja-1';
  const { V, u } = await depotMitFach(pw);
  const fach = u.umschlagTabelle[1];
  const tuer = await tuerAbleiten(V, pw, fach, u);
  assert.equal(await oeffnet(V, fach.fachSchluessel, tuer, V.VdCrypto.aadEinheit(u.depotUUID, fach.kennung)), true);
});

test('[Fach-Tür·Rot] mit der Anker-Kennung als AAD scheitert fachSchluessel', async () => {
  const pw = 'fach-passwort-der-anja-1';
  const { V, u } = await depotMitFach(pw);
  const fach = u.umschlagTabelle[1];
  const tuer = await tuerAbleiten(V, pw, fach, u);
  const ankerAad = V.VdCrypto.aadEinheit(u.depotUUID, u.umschlagTabelle[0].kennung);
  assert.notEqual(fach.kennung, u.umschlagTabelle[0].kennung, 'Voraussetzung: Fach und Anker haben verschiedene Kennungen');
  assert.equal(await oeffnet(V, fach.fachSchluessel, tuer, ankerAad), false);
});

/* ── Was der Zugang einer Vertrauensperson kryptografisch freigibt ─────────────────────
   Beim Empfänger liegt nach dem Öffnen genau ein Schlüssel: K, der zufällige Fach-Schlüssel
   (aus `fachSchluessel` mit der Tür entwickelt). K wickelt nur die Umschläge SEINES Eintrags;
   für nicht freigegebene Einheiten stehen dort Attrappen. Jede Einheit hat einen eigenen,
   bei jedem Speichern neu gezogenen Inhaltsschlüssel. K öffnet also keinen Anker-Umschlag und
   keine nicht freigegebene Einheit. Ein Sub-Depot hat eigenes Passwort, eigene UUID und eigene
   Salze; sein Passwort öffnet weder den Anker noch ein anderes Sub-Depot. */
async function fachK(V, u, pw) {
  const fach = u.umschlagTabelle[1];
  const tuer = await tuerAbleiten(V, pw, fach, u);
  const roh = await V.VdCrypto.decryptDepot(fach.fachSchluessel, tuer, V.VdCrypto.aadEinheit(u.depotUUID, fach.kennung));
  return crypto.subtle.importKey('raw', V.base64ToBytes(roh), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function wickeltAus(V, umschlag, key, u, adresse) {
  try { await V.VdCrypto.schluesselEntwickeln(umschlag, key, V.VdCrypto.aadEinheit(u.depotUUID, adresse)); return true; }
  catch (_) { return false; }
}

test('[Fach-Zugang] K öffnet genau die freigegebenen Einheiten und keinen Anker-Umschlag', async () => {
  const pw = 'fach-passwort-der-anja-1';
  const { V, u } = await depotMitFach(pw);
  const K = await fachK(V, u, pw);
  const anker = u.umschlagTabelle[0];
  const fach = u.umschlagTabelle[1];
  const adressen = Object.keys(u.einheiten);
  let offen = 0;
  for (const a of adressen) {
    if (await wickeltAus(V, fach.umschlaege[a], K, u, a)) offen++;
    assert.equal(await wickeltAus(V, anker.umschlaege[a], K, u, a), false, 'K wickelt keinen Anker-Umschlag aus');
  }
  assert.ok(offen > 0, 'Voraussetzung: das Fach gibt überhaupt etwas frei');
  assert.ok(offen < adressen.length, 'K öffnet nicht alle Einheiten — die übrigen sind Attrappen');
});

test('[Fach-Zugang·Rot] mit dem Anker-Schlüssel wickeln die Anker-Umschläge aus — die Probe misst Trennung, keinen kaputten Weg', async () => {
  const { V, u } = await depotMitFach('fach-passwort-der-anja-1');
  const anker = u.umschlagTabelle[0];
  const ankerKey = await tuerAbleiten(V, PW, { kdf: { salt: anker.kdf.salt } }, u);
  const a = Object.keys(u.einheiten)[0];
  assert.equal(await wickeltAus(V, anker.umschlaege[a], ankerKey, u, a), true);
});

test('[Sub-Depot-Zugang] das Passwort eines Sub-Depots öffnet weder ein anderes Sub-Depot noch den Anker', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  const a = await V.subDepotAnlegen({ bezeichnung: 'Depot Vater', inhaberin: 'Vater', verwaltungsTyp: 'verwaltet' }, 'sub-pw-vater-1');
  const b = await V.subDepotAnlegen({ bezeichnung: 'Depot Mutter', inhaberin: 'Mutter', verwaltungsTyp: 'verwaltet' }, 'sub-pw-mutter-1');
  const dateiA = V.subDepotBlackboxExportieren(a.depotUUID);
  const dateiB = V.subDepotBlackboxExportieren(b.depotUUID);
  await V.subDepotEntsiegeln(dateiA.umschlag, 'sub-pw-vater-1');   // Gegenprobe: der eigene Schlüssel öffnet
  await assert.rejects(() => V.subDepotEntsiegeln(dateiB.umschlag, 'sub-pw-vater-1'), 'öffnet kein fremdes Sub-Depot');
  const anker = await V.depotSerialisieren();
  await assert.rejects(() => ladeKern().V.depotLaden(anker, 'sub-pw-vater-1'), 'öffnet den Anker nicht');
});

test('[Fach-Zugang] nach dem Zurücknehmen einer Freigabe öffnet derselbe K in der neuen Fassung weniger', async () => {
  const pw = 'fach-passwort-der-anja-1';
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  const kreis = V.empfaengerkreiseListe()[0];
  await V.empfaengerkreisFachEinrichten(kreis, pw, null);
  const zaehle = async (u) => {
    const K = await fachK(V, u, pw);
    let n = 0;
    for (const a of Object.keys(u.einheiten)) if (await wickeltAus(V, u.umschlagTabelle[1].umschlaege[a], K, u, a)) n++;
    return n;
  };
  const vorher = await zaehle(await V.depotSerialisieren());
  await V.empfaengerkreisSetzen(Object.assign({}, V.empfaengerkreiseListe()[0], { bausteine: [] }));
  const nachher = await zaehle(await V.depotSerialisieren());
  assert.ok(vorher > 0 && nachher < vorher, `vorher ${vorher}, nachher ${nachher}`);
});

/* ── Die eine Bedingung an ihrer Erzeugungsstelle ──────────────────────────────────────
   Die Trennung trägt allein das je Fach frisch gewürfelte kdfSalt. Bewacht wird darum die Stelle, an der es entsteht
   (`empfaengerkreisFachEinrichten`): 16 Byte aus `crypto.getRandomValues`, nie ein fester oder wiederverwendeter Wert. */
test('[Fach-Tür] zwei Fächer derselben Datei haben verschiedene Salze', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisSetzen({ name: 'Ben', bausteine: ['notfall'] });
  const [k1, k2] = V.empfaengerkreiseListe();
  await V.empfaengerkreisFachEinrichten(k1, 'fach-passwort-anja-1', null);
  await V.empfaengerkreisFachEinrichten(k2, 'fach-passwort-anja-1', null);   // gleiches Passwort: nur das Salz trennt
  const u = await V.depotSerialisieren();
  assert.equal(u.umschlagTabelle.length, 3, 'Voraussetzung: Anker und zwei Fächer');
  assert.notEqual(u.umschlagTabelle[1].kdf.salt, u.umschlagTabelle[2].kdf.salt);
  assert.deepEqual(faecherMitAnkerSalz(u), []);
});

// Die Erzeugungsstelle als reine Prüfung über einen Quelltext — damit der Rot-Beweis dieselbe Funktion an einer Kopie trifft.
function kdfSaltErzeugungPruefen(html) {
  const start = html.indexOf('async function empfaengerkreisFachEinrichten(');
  if (start < 0) return 'Anker fehlt: empfaengerkreisFachEinrichten';
  const rumpf = html.slice(start, html.indexOf('\n}\n', start));
  const zeilen = rumpf.split('\n').filter((z) => /\bconst kdfSalt\s*=/.test(z));
  if (zeilen.length !== 1) return 'nicht genau eine Erzeugung von kdfSalt';
  if (!/=\s*crypto\.getRandomValues\(new Uint8Array\(16\)\);/.test(zeilen[0])) return 'nicht frisch aus dem CSPRNG mit 16 Byte';
  return null;
}
const fs = require('node:fs');
const path = require('node:path');
const KERN_QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Fach-Tür] das kdfSalt entsteht aus 16 Byte CSPRNG, an genau einer Stelle', () => {
  assert.equal(kdfSaltErzeugungPruefen(KERN_QUELLE), null);
});

/* ── Rot-Beweise am Code, dauerhaft in der Suite ───────────────────────────────────────
   Je Fall eine veränderte Kopie des Kerns: die Stelle, die eine Bedingung trägt, wird gebrochen, und dieselben Prüfungen wie
   oben müssen es sehen. Fällt eine dieser Proben, misst die Probe oben nichts mehr. */
const SALZ_ZEILE = '  const kdfSalt = crypto.getRandomValues(new Uint8Array(16));';
const AAD_ZEILE = '    VdCrypto.aadEinheit(aktuelleDepotUUID, k.kennung));';
function kernMit(ersetzen, durch) {
  assert.equal(KERN_QUELLE.split(ersetzen).length - 1, 1, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + ersetzen.trim());
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fach-tuer-rot-'));
  const datei = path.join(dir, 'kern.html');
  const html = KERN_QUELLE.replace(ersetzen, durch);
  fs.writeFileSync(datei, html);
  try { return { V: ladeKern({ htmlPfad: datei, backen: true }).V, html }; }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
async function zweiFaecher(V, pw) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisSetzen({ name: 'Ben', bausteine: ['notfall'] });
  const [k1, k2] = V.empfaengerkreiseListe();
  await V.empfaengerkreisFachEinrichten(k1, pw, null);
  await V.empfaengerkreisFachEinrichten(k2, pw, null);
  return V.depotSerialisieren();
}

test('[Fach-Tür·Rot am Code] Anker-Salz als kdfSalt: die Salz-Prüfung schlägt an, und die Tür öffnet das Anker-Geheimnis', async () => {
  const { V, html } = kernMit(SALZ_ZEILE, '  const kdfSalt = Uint8Array.from(aktuelleSalt);');
  assert.notEqual(kdfSaltErzeugungPruefen(html), null);
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW, null);
  const u = await V.depotSerialisieren();
  assert.deepEqual(faecherMitAnkerSalz(u), [u.umschlagTabelle[1].kennung]);
  const tuer = await tuerAbleiten(V, PW, u.umschlagTabelle[1], u);
  const ankerAad = V.VdCrypto.aadEinheit(u.depotUUID, u.umschlagTabelle[0].kennung);
  assert.equal(await oeffnet(V, u.umschlagTabelle[0].geheim, tuer, ankerAad), true,
    'ohne eigenes Salz trennt nichts mehr: AAD und tuerSalt halten die Tür nicht vom Anker fern');
});

test('[Fach-Tür·Rot am Code] festes Salz: zwei Fächer tragen dasselbe, beide Prüfungen schlagen an', async () => {
  const { V, html } = kernMit(SALZ_ZEILE, '  const kdfSalt = new Uint8Array(16).fill(7);');
  assert.notEqual(kdfSaltErzeugungPruefen(html), null);
  const u = await zweiFaecher(V, 'fach-passwort-anja-1');
  assert.deepEqual(faecherMitAnkerSalz(u), [u.umschlagTabelle[2].kennung]);
});

test('[Fach-Tür·Rot am Code] wiederverwendetes Zufallssalz: zwei Fächer tragen dasselbe, beide Prüfungen schlagen an', async () => {
  const { V, html } = kernMit(SALZ_ZEILE,
    '  const kdfSalt = (globalThis.__salzEinmal || (globalThis.__salzEinmal = crypto.getRandomValues(new Uint8Array(16))));');
  try {
    assert.notEqual(kdfSaltErzeugungPruefen(html), null);
    const u = await zweiFaecher(V, 'fach-passwort-anja-1');
    assert.deepEqual(faecherMitAnkerSalz(u), [u.umschlagTabelle[2].kennung]);
  } finally { delete globalThis.__salzEinmal; }
});

test('[Fach-Tür·Rot am Code] Anker-Kennung als AAD von fachSchluessel: die Platzbindung fällt, die AAD-Probe sieht es', async () => {
  const pw = 'fach-passwort-der-anja-1';
  const { V } = kernMit(AAD_ZEILE, '    VdCrypto.aadEinheit(aktuelleDepotUUID, ZERFALL_FACH_KENNUNG(1)));');
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  await V.empfaengerkreisSetzen({ name: 'Anja', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], pw, null);
  const u = await V.depotSerialisieren();
  const fach = u.umschlagTabelle[1];
  const tuer = await tuerAbleiten(V, pw, fach, u);
  assert.equal(await oeffnet(V, fach.fachSchluessel, tuer, V.VdCrypto.aadEinheit(u.depotUUID, u.umschlagTabelle[0].kennung)), true);
  assert.equal(await oeffnet(V, fach.fachSchluessel, tuer, V.VdCrypto.aadEinheit(u.depotUUID, fach.kennung)), false);
});
