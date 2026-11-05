'use strict';
/* SUB-SONDERLOCKEN — Klassenwächter (23.09.2026). Grundsatz, längst entschieden: U2-ADR-002 „Ein Mechanismus für alle
   Depots, kein Anker-Sonderfall", U2-ADR-124 „Gleichwertigkeit". Die Depotinhaberin: „ALLE DEPOTS SIND GLEICH! IMMER! Sie
   unterscheiden sich durch nichts ausser ihrer Position als Anker- oder Sub-Depot."
   Zwei Teile:
   1. MECHANIK: jeder Weg, der einen Depot-Umschlag schreibt — Anker wie Sub —, geht durch `_depotV4Schreiben`; keiner ruft
      ein eigenes `encryptDepot`. Das war S1 (Sub-Anlage als eigenes V3) und S2 (Neuversiegeln mit V3-Annahme).
   2. POSITIVLISTE der noch verbleibenden Abweichungen, je mit Grund. Sie darf nur SCHRUMPFEN: der Deckel ist der Ist-Stand,
      und ein Eintrag, dessen Stelle es nicht mehr gibt, muss gestrichen werden (sonst steht die Liste für eine Lage, die
      vorbei ist). Ein NEUER Sonderweg gehört nicht hier hinein, sondern abgebaut. Befund: SUB-SONDERLOCKEN (Befund-Ratsche). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
function funktionsKoerper(name) {
  const m = new RegExp('^(async )?function ' + name + '\\(', 'm').exec(KERN);
  if (!m) return null;
  const naechste = /^(async )?function [A-Za-z_$][\w$]*\(/gm;
  naechste.lastIndex = m.index + m[0].length;
  const n = naechste.exec(KERN);
  return KERN.slice(m.index, n ? n.index : KERN.length);
}

// subDepotEigenerPasswortWechsel seit 07.10.2026 (Befund SUB-PASSWORTWECHSEL-VERLIERT-FAECHER): er stand nicht auf dieser
// Hand-Liste und schrieb darum unbemerkt mit eigenem encryptDepot und `faecher: []`. Die Klassenprobe darunter zählt
// deshalb nicht nach Liste, sondern jeden encryptDepot-Aufruf im Kern.
const SCHREIBWEGE = ['depotSerialisierenV4', 'subDepotVersiegeln', 'subDepotNeuVersiegeln', 'subDepotEntsiegeln', 'subDepotEigenerPasswortWechsel'];

// Wer im Kern `encryptDepot(` aufruft — je Funktion mit Grund. Ein neuer Aufrufer ist rot: er schreibt einen Umschlag am
// gemeinsamen Speicherweg vorbei, bis er hier begründet steht (und ein Depot-Umschlag gehört nie hierher).
const ENCRYPT_AUFRUFER = {
  _zerfallSchreiben: 'der gemeinsame Speicherweg selbst: Einheiten und Geheimteile',
  empfaengerkreisFachEinrichten: 'verschließt den Fach-Schlüssel unter der Tür des Empfängers — kein Depot-Umschlag',
  depotSerialisierenV3: 'v3-Schreibweg des Ankers für Werkzeug/E2E (bare-Kanal), nie für ein Sub-Depot',
};
function encryptAufrufer(text) {
  const raus = new Set();
  let fn = null;
  for (const z of text.split('\n')) {
    const m = /^(async )?function ([A-Za-z_$][\w$]*)\(/.exec(z);
    if (m) fn = m[2];
    if (/encryptDepot\(/.test(z) && !/^\s*(\/\/|\*)/.test(z) && !/->\s*Promise/.test(z)) raus.add(fn);
  }
  return [...raus].sort();
}

test('[SUB-SONDERLOCKEN·Mechanik·Klasse] jeder encryptDepot-Aufrufer im Kern steht begründet da — kein Umschlag am Speicherweg vorbei', () => {
  assert.deepEqual(encryptAufrufer(KERN), Object.keys(ENCRYPT_AUFRUFER).sort());
});

test('[SUB-SONDERLOCKEN·Mechanik·Klasse·Rot-Beweis] ein eigener encryptDepot in einem Sub-Weg fiele auf', () => {
  const kopie = KERN.replace('_depotV4Schreiben(inhalt, { hkdfKey: k.schluessel, pbkdf2Salt: k.pbkdf2Salt, depotSalt: k.depotSalt, depotUUID: k.depotUUID }, fremd)',
    'VdCrypto.encryptDepot(inhalt, subKey, _AAD_DEPOT_V2)');
  assert.notEqual(kopie, KERN, 'Vorbedingung: die Stelle im Passwortwechsel gibt es');
  assert.ok(encryptAufrufer(kopie).includes('subDepotEigenerPasswortWechsel'), 'der Aufrufer wäre nicht begründet — rot');
});

test('[SUB-SONDERLOCKEN·Mechanik] jeder Weg, der einen Depot-Umschlag schreibt, geht durch _depotV4Schreiben — keiner verschlüsselt selbst', () => {
  for (const name of SCHREIBWEGE) {
    const k = funktionsKoerper(name);
    assert.ok(k, name + ' existiert');
    assert.ok(k.includes('_depotV4Schreiben('), name + ' schreibt über den gemeinsamen Speicherweg');
    assert.ok(!/encryptDepot\(/.test(k), name + ' verschlüsselt NICHT an ihm vorbei');
  }
});

test('[SUB-SONDERLOCKEN·Mechanik·Rot-Beweis] ein Sub-Weg mit eigenem encryptDepot fiele auf', () => {
  const kopie = funktionsKoerper('subDepotVersiegeln').replace('_depotV4Schreiben(', 'VdCrypto.encryptDepot(');
  assert.ok(/encryptDepot\(/.test(kopie) && !kopie.includes('_depotV4Schreiben('), 'dieselbe Prüfung schlüge an');
});

// Was ein Sub-Depot heute noch anders macht als jedes Depot — nur schrumpfen. `stelle` muss im Kern stehen.
const POSITIVLISTE = [];
// NICHT gezählt, mit Grund: S4 (Ablage im Anker) IST die Position — der eine Unterschied, den es geben darf.
// S7 geteilt: Akzentfarbe und Akteur 'unter-vollmacht' folgen aus der Position (jemand handelt für eine andere Person) —
// nicht gezählt. Die deklarierte, nie gelesene Regel 'nach-umfang' ist abgebaut (28.09.2026, v824): der Umfang ist das Fach,
// durchgesetzt im Bearbeitungstor für jedes Depot gleich (tests/vollmacht-fach-schreibt-nicht.test.js).
// Gestrichen: S11 (händischer Umzug der Vertretungsgrundlage) am 07.10.2026 — ein Eintrag aus einer Testfassung vor Stufe 67
// meldet jetzt `sub-vor-stufe-67` und bleibt unverändert (tests/sub-depot-vor-stufe-67.test.js). S1 (Anlage V3), S2 (Neuversiegeln V3-Annahme), S3 (keine Fächer), beide mit Probe (sub-depot-gleiches-format,
// sub-depot-v4-neuversiegeln); S5 (Migrationen) mit tests/sub-depot-migrationen.test.js; S10 nie gelandet (geparkt).
// Gestrichen: S9 (eigener Einstieg der Lese-App für Sub-Umschläge, leseSubUmschlag) am 30.10.2026 — ein Sub-Umschlag geht über
// leseDepotUmschlag wie jede Depot-Datei, mit derselben Sitzung (Wort Krypto 30.10.2026). Gehalten von [SUB-SONDERLOCKEN·S9·…].
// Gestrichen: S6 (eigener Passwortwechsel des Subs neben passwortWechselDurchfuehren) am 30.10.2026 — beide Wechsel gehen durch
// _passwortWechselKern; Sub und Anker unterscheiden sich nur darin, wer ableitet. Gehalten von [SUB-SONDERLOCKEN·S6·…].
// Gestrichen: S8 (die Blackbox-Hülle beim Herausgeben, blackboxDateiAusUmschlag) am 30.10.2026 — ein Teil-Depot geht als
// Depot-Datei mit dem gebundenen Kennzeichen art hinaus, die Hülle wird nur noch gelesen (Nachtrag zu U2-ADR-124/235).
// Gehalten von tests/sub-sonderlocken-s8-format.test.js.
// Die KENNUNGEN sind festgeschrieben, nicht nur ihre Zahl: sonst könnte ein neuer Sonderweg einen abgebauten ersetzen, und
// die Zahl bliebe gleich. Die Grundlinie schrumpft im selben Commit wie die Liste — sie wächst nie.
const KENNUNGEN_GRUNDLINIE = [];
const DECKEL = KENNUNGEN_GRUNDLINIE.length;

function positivlisteUrteil(liste) {
  const fremd = liste.map((e) => e.kennung).filter((k) => !KENNUNGEN_GRUNDLINIE.includes(k));
  return { fremd, zuViele: liste.length > DECKEL, zuWenige: liste.length < DECKEL };
}

test('[SUB-SONDERLOCKEN·Positivliste] nur schrumpfen — feste Kennungen, jeder Eintrag steht noch im Code, der Deckel ist der Ist-Stand', () => {
  const u = positivlisteUrteil(POSITIVLISTE);
  assert.deepEqual(u.fremd, [], 'eine Kennung außerhalb der Grundlinie: ein neuer Sonderweg wird abgebaut, nicht eingetragen');
  assert.equal(u.zuViele, false, 'die Liste ist gewachsen');
  assert.equal(u.zuWenige, false, 'geschrumpft? Dann KENNUNGEN_GRUNDLINIE im selben Commit um genau diese Kennung kürzen');
  for (const e of POSITIVLISTE) {
    const text = e.datei ? fs.readFileSync(path.join(__dirname, '..', e.datei), 'utf8') : KERN;
    assert.ok(text.includes(e.stelle), e.kennung + ': die Stelle gibt es nicht mehr — streichen und den Deckel senken');
    assert.ok(e.grund && e.grund.length > 30, e.kennung + ' trägt einen Grund');
  }
});

test('[SUB-SONDERLOCKEN·Positivliste·Rot-Beweis] ein neuer Sonderweg fällt auf — an der Kennung und an der Zahl', () => {
  const neu = POSITIVLISTE.concat([{ kennung: 'S12', stelle: 'x', grund: 'ein neuer Sonderweg, der sich in die leere Liste schreibt' }]);
  assert.deepEqual(positivlisteUrteil(neu).fremd, ['S12'], 'eine Kennung außerhalb der Grundlinie');
  assert.equal(positivlisteUrteil(neu).zuViele, true, 'und die Liste ist gewachsen');
});

/* S9 abgebaut (30.10.2026, Wort Krypto): Die Lese-App kennt EINEN Leser für Umschläge, leseDepotUmschlag. Eine Ableitung ohne
   Sitzung (depotMasterHkdfKey) bleibt nur für die Tür eines Fachs im Zerfall-Leser-Block, der mit dem Kern zeichengleich ist. */
const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
function aufruferVon(text, senke) {
  const raus = new Set();
  let fn = null;
  for (const z of text.split('\n')) {
    const m = /^(async )?function ([A-Za-z_$][\w$]*)\(/.exec(z);
    if (m) fn = m[2];
    if (z.includes(senke + '(') && !/^\s*(\/\/|\*)/.test(z) && !(m && m[2] === senke)) raus.add(fn);
  }
  return [...raus].sort();
}

test('[SUB-SONDERLOCKEN·S9·Klasse] in der Lese-App leitet nur die Fach-Tür ohne Sitzung ab — kein eigener Leser für Sub-Umschläge', () => {
  assert.deepEqual(aufruferVon(LESEN, 'depotMasterHkdfKey'), ['_fachTuerSchluessel']);
  assert.ok(!/function leseSubUmschlag\(/.test(LESEN), 'leseSubUmschlag ist abgebaut');
});

test('[SUB-SONDERLOCKEN·S9·Klasse·Rot-Beweis] ein zweiter Leser für Sub-Umschläge fiele auf', () => {
  const kopie = LESEN.replace('async function leseDepotUmschlag(', 'async function leseSubUmschlag(u, pw) {\n'
    + '  const masterKey = await depotMasterHkdfKey(pw, base64ToBytes(u.pbkdf2.salt));\n  return masterKey;\n}\nasync function leseDepotUmschlag(');
  assert.notEqual(kopie, LESEN, 'Vorbedingung: leseDepotUmschlag steht in der Lese-App');
  assert.deepEqual(aufruferVon(kopie, 'depotMasterHkdfKey'), ['_fachTuerSchluessel', 'leseSubUmschlag'], 'der zweite Leser wäre rot');
});

test('[SUB-SONDERLOCKEN·S9] ein Sub-Umschlag V3 und V4 öffnet über leseDepotUmschlag; nach Zurück ist die Sitzung zu', async () => {
  const { ladeKern } = require('./load-kern.js');
  const { ladeLesen } = require('./load-lesen.js');
  const { webcrypto } = require('node:crypto');
  const { V: K } = ladeKern();
  await K.depotAnlegen('anker-pw-1234');
  const inhalt = { schemaVersion: 20, sektoren: { identity: { givenName: 'Sub-Mia' } }, menschen: [], situationen: {} };
  const v4 = await K.subDepotVersiegeln(inhalt, 'sub-pw-5678');
  assert.equal(v4.kryptoVersion, 4, 'Vorbedingung: ein V4-Sub-Umschlag');
  const zufall = (n) => webcrypto.getRandomValues(new Uint8Array(n));
  const pbkdf2Salt = zufall(16), depotSalt = zufall(32), depotUUID = K.uuidV4();
  const master = await K.depotMasterHkdfKey('sub-pw-5678', pbkdf2Salt);
  const subKey = await K.deriveDepotKeyV2(master, depotSalt, depotUUID);
  const { iv, ct } = await K.VdCrypto.encryptDepot(inhalt, subKey, K._AAD_DEPOT_V2);
  const v3 = { kryptoVersion: 3, depotUUID, pbkdf2: { salt: K.bytesToBase64(pbkdf2Salt) }, depotSalt: K.bytesToBase64(depotSalt), iv, ct };

  const { V: L } = ladeLesen();
  for (const [name, u] of [['V4', v4], ['V3', v3]]) {
    const datei = { dateiTyp: 'vivodepot-blackbox-export', formatVersion: 1, umschlag: u };   // die Hülle bis v969, für V3 und V4 gleich
    assert.equal(L.erkenneFormat(datei), 'blackbox', name + ': als Sub-Depot erkannt');
    const offen = await L.leseDepotUmschlag(JSON.parse(JSON.stringify(datei.umschlag)), 'sub-pw-5678');
    assert.equal(offen.sektoren.identity.givenName, 'Sub-Mia', name + ': öffnet über den einen Leser');
    assert.equal(L.VdCrypto.sitzungOffen(), true, name + ': die Sitzung ist offen wie bei jeder Depot-Datei');
    await assert.rejects(() => L.leseDepotUmschlag(JSON.parse(JSON.stringify(datei.umschlag)), 'falsch-pw-0000'), name + ': falsches Passwort');
    L.setData(offen);
    L.entladen();   // renderWelcome ruft entladen(), wenn ein Depot geladen ist — der eine Ausgang (Zurück, Schließen)
    assert.equal(L.VdCrypto.sitzungOffen(), false, name + ': nach Zurück ist die Sitzung zu');
  }
});

/* S6 abgebaut (30.10.2026, Wort Krypto mit fünf Bedingungen): ein Passwortwechsel-Kern für Anker und Sub. */
function anzahl(text, muster) { return text.split(muster).length - 1; }
const KERN_S6 = funktionsKoerper('_passwortWechselKern');
const ANKER_S6 = funktionsKoerper('passwortWechselDurchfuehren');
const SUB_S6 = funktionsKoerper('subDepotEigenerPasswortWechsel');
function s6Urteil(kern, anker, sub) {
  const raus = [];
  if (!kern || !/neuPasswort !== String\(neuPasswort\)/.test(kern) || anzahl(kern, 'normalizePassword(neuPasswort)') !== 1) raus.push('kern: NFC ohne Rückfall');
  if (!kern || anzahl(kern, 'new Uint8Array(16)') !== 1 || anzahl(kern, 'new Uint8Array(32)') !== 1) raus.push('kern: Salze 16/32');
  if (!kern || anzahl(kern, 'mitSitzung ? await VdCrypto.setupSession(neuNfc, pbkdf2Salt) : await depotMasterHkdfKey(neuNfc, pbkdf2Salt)') !== 1
    || anzahl(kern, 'setupSession(') !== 1 || anzahl(kern, 'depotMasterHkdfKey(') !== 1) raus.push('kern: genau eine Ableitung');
  for (const [name, k] of [['anker', anker], ['sub', sub]]) {
    if (anzahl(k, '_passwortWechselKern(') !== 1) raus.push(name + ': ruft den Kern genau einmal');
    if (/getRandomValues\(/.test(k)) raus.push(name + ': eigene Salze');
    if (/normalizePassword\((pwNeu|neuPasswort)\)/.test(k)) raus.push(name + ': eigenes NFC des neuen Passworts');
    if (/depotMasterHkdfKey\(|setupSession\(/.test(k)) raus.push(name + ': eigene Ableitung');
  }
  if (anzahl(anker, '_passwortWechselKern(pwNeu, aktuelleDepotUUID, true)') !== 1) raus.push('anker: leitet über die Sitzung ab');
  if (anzahl(sub, '_passwortWechselKern(neuPasswort, umschlag.depotUUID, false)') !== 1) raus.push('sub: leitet ohne Sitzung ab');
  if (!/whcHuelleWickeln\(/.test(anker) || !/_passwortSessionZurueckdrehen\(/.test(anker) || !/depotInIdbSichern\(/.test(anker)) raus.push('anker: Hülle, Zurückdrehen und IDB bleiben beim Aufrufer');
  if (!/_subFremdfelderGeprueft\(/.test(sub)) raus.push('sub: Fremdfelder nur geprüft');
  return raus;
}

test('[SUB-SONDERLOCKEN·S6·Klasse] Anker- und Sub-Wechsel gehen durch _passwortWechselKern — keiner salzt, normalisiert oder leitet selbst ab', () => {
  assert.deepEqual(s6Urteil(KERN_S6, ANKER_S6, SUB_S6), []);
});

test('[SUB-SONDERLOCKEN·S6·Klasse·Rot-Beweis] ein Sub-Wechsel mit eigenen Salzen und eigener Ableitung fiele auf', () => {
  const sub = SUB_S6.replace('const k = await _passwortWechselKern(neuPasswort, umschlag.depotUUID, false);',
    'const s = crypto.getRandomValues(new Uint8Array(16)); const m = await depotMasterHkdfKey(normalizePassword(neuPasswort), s);');
  assert.notEqual(sub, SUB_S6, 'Vorbedingung: der Kern-Aufruf steht im Sub-Wechsel');
  assert.deepEqual(s6Urteil(KERN_S6, ANKER_S6, sub),
    ['sub: ruft den Kern genau einmal', 'sub: eigene Salze', 'sub: eigenes NFC des neuen Passworts', 'sub: eigene Ableitung', 'sub: leitet ohne Sitzung ab']);
  const kern = KERN_S6.replace('const neuNfc = normalizePassword(neuPasswort);', 'const neuNfc = neuPasswort;');
  assert.deepEqual(s6Urteil(kern, ANKER_S6, SUB_S6), ['kern: NFC ohne Rückfall'], 'ein Kern ohne NFC fiele auf');
});

test('[SUB-SONDERLOCKEN·S6] der Sub-Wechsel: frische Salze 16/32, dieselbe depotUUID, NFC-gleich; kein Text → kein Wechsel', async () => {
  const { ladeKern } = require('./load-kern.js');
  const { V: K } = ladeKern();
  await K.depotAnlegen('anker-pw-s6-1234');
  const alt = await K.subDepotVersiegeln({ schemaVersion: 20, verwaltungsTyp: 'verwaltet', sektoren: { identity: { givenName: 'Sub-S6' } }, menschen: [], situationen: {} }, 'sub-alt-pw-5678');
  const nfd = 'neu-Ma\u0308dchen-9012', nfc = nfd.normalize('NFC');
  const neu = await K.subDepotEigenerPasswortWechsel(alt, 'sub-alt-pw-5678', nfd);
  assert.equal(neu.depotUUID, alt.depotUUID, 'dieselbe depotUUID');
  assert.equal(Buffer.from(neu.pbkdf2.salt, 'base64').length, 16);
  assert.equal(Buffer.from(neu.depotSalt, 'base64').length, 32);
  assert.notEqual(neu.pbkdf2.salt, alt.pbkdf2.salt, 'frischer PBKDF2-Salt');
  assert.notEqual(neu.depotSalt, alt.depotSalt, 'frischer HKDF-Salt');
  assert.equal(neu.art, 'sub', 'das Kennzeichen bleibt (S8)');
  assert.equal((await K.subDepotEntsiegeln(neu, nfc)).inhalt.sektoren.identity.givenName, 'Sub-S6', 'öffnet mit der NFC-Form');
  await assert.rejects(() => K.subDepotEntsiegeln(neu, 'sub-alt-pw-5678'), 'das alte Passwort öffnet nicht mehr');
  await assert.rejects(() => K.subDepotEigenerPasswortWechsel(alt, 'sub-alt-pw-5678', undefined), TypeError, 'kein Text: kein Wechsel, kein Rückfall');
});
