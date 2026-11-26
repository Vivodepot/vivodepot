'use strict';
/* ══════════════════════════════════════════════════════════════════════
   Ein Fehlversuch beim Öffnen lässt die offene Sitzung, wie sie war (24.11.2026, Befund SITZUNG-SCHLUESSEL-NACH-FEHLVERSUCH, HOCH)
   ──────────────────────────────────────────────────────────────────────
   depotLaden setzte den Sitzungsschlüssel (VdCrypto.setupSession) aus dem eingegebenen Passwort, BEVOR klar war, ob es passt,
   und stellte bei einem Fehlschlag nichts zurück. Ist ein Depot offen (gemessener Weg: Konflikt-Dialog, „Stand auf dem Gerät“ öffnet nicht; die Vermutung „Marke › Start lässt die
   Sitzung offen“ ist widerlegt, der Start räumt ab) und scheitert dort
   das Öffnen einer Datei mit falschem Passwort, schrieb der nächste stille Save das offene Depot unter einem Schlüssel aus dem
   falschen Passwort mit den alten Salzen: danach öffnete das eigene Passwort der Inhaberin ihr Depot nicht mehr.
   Der gepinnte Krypto-Block kann eine Sitzung nicht zurückdrehen; darum entschlüsselt depotLaden bei offener Sitzung erst ohne
   Sitzung (depotMasterHkdfKey, wie subDepotEntsiegeln) und übernimmt sie erst nach dem Erfolg.
   Fälle: die Datei eines anderen Depots und die eigene Datei, je mit falschem Passwort (das offene Depot bleibt bearbeitbar und
   speichert unter dem alten Schlüssel); ein Fehlversuch ohne offene Sitzung beendet die Sitzung; Gegenprobe: ein gelungenes Öffnen bei
   offener Sitzung übernimmt das neue Depot und schreibt unter dessen Schlüssel. NFD-Weg bei offener Sitzung: ein falsches Passwort mit
   zerlegbaren Zeichen (zwei Versuche) lässt die Sitzung, ein Bestand von vor B1 (nur mit NFD abgeleitet) öffnet mit der NFC-Eingabe
   und schreibt danach unter NFC. Rot-Beweis: die Reihenfolge von vorher nachgestellt (Sitzung aus dem eingegebenen Passwort vor dem
   Erfolg, nichts zurückgestellt), dann öffnet die Inhaberin ihren Stand nicht. Die Klick-Probe geht denselben Weg im Browser (E2E-Strecke).
   ══════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const GEHOSTET = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const PW_A = 'Inhaberin-A-Fehlversuch-2026!';
const PW_B = 'Anderes-Depot-B-2026!';
const PW_FALSCH = 'Ganz-falsch-2026!';
const PW_FALSCH_NFD = 'Falsch-Grüße-Tür-2026'.normalize('NFC');   // NFD ≠ NFC: der Kern versucht zweimal
const PW_ALT_NFC = 'Alt-Grüße-Öl-2026'.normalize('NFC');
const ordner = [];
after(() => { for (const d of ordner) fs.rmSync(d, { recursive: true, force: true }); });

async function ablauf(fall, opts, falsch = PW_FALSCH) {
  const basis = createIdbMock();
  const A = ladeKern({ indexedDB: basis, location: GEHOSTET, ...(opts || {}) }).V;
  await A.depotAnlegen(PW_A);
  A.akteurSelbstErklaeren('Gerda Beispiel');
  A.sektorFeldSetzen('identity', 'givenName', 'Vorher');
  A.markiereUngespeichert(1);
  await A._internAutoSpeichernAbschluss();
  let umschlag;
  if (fall === 'fremde-datei') {
    const B = ladeKern({ indexedDB: createIdbMock(), location: GEHOSTET, ...(opts || {}) }).V;
    await B.depotAnlegen(PW_B);
    umschlag = await B.depotSerialisierenV4();
  } else {
    umschlag = await A.depotSerialisierenV4();
  }
  let fehl = null;
  try { await A.depotLaden(JSON.parse(JSON.stringify(umschlag)), falsch); } catch (e) { fehl = e; }
  assert.ok(fehl, 'das falsche Passwort hätte scheitern müssen');
  // die offene Sitzung arbeitet weiter: bearbeitbar, der stille Save läuft unter dem alten Schlüssel
  const bearbeitbar = A.Modus.darfBearbeiten();
  A.sektorFeldSetzen('identity', 'givenName', 'Nachher');
  A.markiereUngespeichert(1);
  await A._internAutoSpeichernAbschluss();
  const I = ladeKern({ indexedDB: createIdbMock({ _dbs: basis._dbs }), location: GEHOSTET, ...(opts || {}) }).V;
  let ok = null, err = null;
  try { ok = await I.depotAusIdbLaden(PW_A); } catch (e) { err = e; }
  return { ok, err, I, bearbeitbar };
}

for (const fall of ['fremde-datei', 'eigene-datei']) {
  test('[Fehlversuch·' + fall + '] gescheitertes Öffnen bei offener Sitzung, stiller Save: die Inhaberin öffnet ihren Stand', async () => {
    const r = await ablauf(fall);
    assert.equal(r.bearbeitbar, true, 'nach dem Fehlversuch ist das offene Depot nicht mehr bearbeitbar');
    assert.ok(r.ok, 'die Inhaberin öffnet ihr Depot nicht mehr: ' + (r.err && (r.err.code || r.err.message)));
    assert.equal(r.I.getData().sektoren.identity.givenName, 'Nachher', 'die Arbeit nach dem Fehlversuch fehlt');
  });
}

test('[Fehlversuch·NFD] falsches Passwort mit zerlegbaren Zeichen (NFC- und NFD-Versuch) bei offener Sitzung: die Inhaberin öffnet ihren Stand', async () => {
  for (const fall of ['fremde-datei', 'eigene-datei']) {
    const r = await ablauf(fall, undefined, PW_FALSCH_NFD);
    assert.equal(r.bearbeitbar, true, fall + ': nach dem Fehlversuch ist das offene Depot nicht mehr bearbeitbar');
    assert.ok(r.ok, fall + ': die Inhaberin öffnet ihr Depot nicht mehr: ' + (r.err && (r.err.code || r.err.message)));
    assert.equal(r.I.getData().sektoren.identity.givenName, 'Nachher', fall + ': die Arbeit nach dem Fehlversuch fehlt');
  }
});

/* Ein Bestand von vor B1: mit dem NFD-Passwort abgeleitet (wie tests/passwort-nfc-klasse.test.js). */
async function nfdBestand() {
  const { V } = ladeKern();
  const zufall = (n) => Buffer.from(webcrypto.getRandomValues(new Uint8Array(n))).toString('base64');
  const pbkdf2SaltB64 = zufall(16), depotSaltB64 = zufall(32);
  const depotUUID = V.uuidV4();
  const bits = await V.deriveMasterBits(PW_ALT_NFC.normalize('NFD'), V.base64ToBytes(pbkdf2SaltB64));
  const subKey = await V.deriveDepotKeyV2(await V.importMasterHkdfKey(bits), V.base64ToBytes(depotSaltB64), depotUUID);
  const inhalt = Object.assign(V.leeresDepot(), { _marker: 'nfd-bestand' });
  const { iv, ct } = await V.VdCrypto.encryptDepot(inhalt, subKey, V._AAD_DEPOT_V2);
  return { kryptoVersion: 3, depotUUID, pbkdf2: { salt: pbkdf2SaltB64 }, depotSalt: depotSaltB64, iv, ct };
}

test('[Fehlversuch·NFD·Erfolg] ein Bestand von vor B1 öffnet bei offener Sitzung mit der NFC-Eingabe, danach schreibt die Sitzung unter NFC', async () => {
  const A = ladeKern({ indexedDB: createIdbMock(), location: GEHOSTET }).V;
  await A.depotAnlegen(PW_A);
  A.akteurSelbstErklaeren('Gerda Beispiel');
  const u = await nfdBestand();
  assert.equal((await A.depotLaden(JSON.parse(JSON.stringify(u)), PW_ALT_NFC))._marker, 'nfd-bestand', 'der Bestand öffnet nicht');
  const neu = await A.depotSerialisieren();
  const C = ladeKern({ indexedDB: createIdbMock(), location: GEHOSTET }).V;
  assert.equal((await C.depotLaden(JSON.parse(JSON.stringify(neu)), PW_ALT_NFC))._marker, 'nfd-bestand',
    'nach dem Öffnen schreibt die Sitzung nicht unter dem NFC-Schlüssel des Bestands');
});

test('[Fehlversuch·ohne offene Sitzung] ein Fehlversuch ohne offenes Depot beendet die Sitzung, ein richtiges Passwort öffnet danach', async () => {
  const B = ladeKern({ indexedDB: createIdbMock(), location: GEHOSTET }).V;
  await B.depotAnlegen(PW_B);
  const umschlag = JSON.stringify(await B.depotSerialisierenV4());
  const k = ladeKern({ indexedDB: createIdbMock(), location: GEHOSTET });
  assert.equal(k.V.VdCrypto.sitzungOffen(), false, 'Testaufbau: frischer Kern ohne Sitzung');
  await assert.rejects(() => k.V.depotLaden(JSON.parse(umschlag), PW_FALSCH));
  assert.equal(k.V.VdCrypto.sitzungOffen(), false, 'nach dem Fehlversuch steht eine Sitzung aus dem falschen Passwort');
  await k.V.depotLaden(JSON.parse(umschlag), PW_B);
  assert.equal(k.V.VdCrypto.sitzungOffen(), true, 'das richtige Passwort öffnet danach keine Sitzung');
});

test('[Fehlversuch·Gegenprobe] gelungenes Öffnen bei offener Sitzung übernimmt das neue Depot und schreibt unter dessen Schlüssel', async () => {
  const basis = createIdbMock();
  const A = ladeKern({ indexedDB: basis, location: GEHOSTET }).V;
  await A.depotAnlegen(PW_A);
  A.akteurSelbstErklaeren('Gerda Beispiel');
  const B = ladeKern({ indexedDB: createIdbMock(), location: GEHOSTET }).V;
  await B.depotAnlegen(PW_B);
  B.akteurSelbstErklaeren('Bea Beispiel');
  B.sektorFeldSetzen('identity', 'givenName', 'Bea');
  const umschlagB = await B.depotSerialisierenV4();
  await A.depotLaden(JSON.parse(JSON.stringify(umschlagB)), PW_B);
  A.akteurSelbstErklaeren('Bea Beispiel');
  A.sektorFeldSetzen('identity', 'givenName', 'Bea-neu');
  const neu = await A.depotSerialisieren();
  const C = ladeKern({ indexedDB: createIdbMock(), location: GEHOSTET }).V;
  await C.depotLaden(JSON.parse(JSON.stringify(neu)), PW_B);
  assert.equal(C.getData().sektoren.identity.givenName, 'Bea-neu', 'nach dem Öffnen schreibt die Sitzung nicht unter dem Schlüssel des geöffneten Depots');
});

test('[Fehlversuch·Rot-Beweis] mit der Reihenfolge von vorher (Sitzung vor dem Erfolg, nichts zurückgestellt) öffnet die Inhaberin ihren Stand nicht', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  const anker = 'const sitzungVorher = VdCrypto.sitzungOffen();';
  const beenden = 'if (!sitzungVorher) VdCrypto.sitzungBeenden();';
  assert.equal(quelle.split(anker).length, 2, 'Rot-Beweis ohne Anker: die Unterscheidung „Sitzung offen“ fehlt in depotLaden');
  assert.equal(quelle.split(beenden).length, 2, 'Rot-Beweis ohne Anker: das Beenden nach einem Fehlversuch fehlt in depotLaden');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fehlversuch-rot-')); ordner.push(dir);
  const pfad = path.join(dir, 'vivodepot.html');
  // Der Zweig „ohne Sitzung“ gilt immer (setupSession vor dem Erfolg), und der Fehlversuch stellt nichts zurück: die falsche Sitzung bleibt stehen.
  fs.writeFileSync(pfad, quelle.replace(anker, 'const sitzungVorher = false;').replace(beenden, '/* nichts zurückgestellt */'));
  const r = await ablauf('fremde-datei', { htmlPfad: pfad, backen: true });
  assert.equal(r.bearbeitbar, true, 'Rot-Beweis: das Depot bleibt bearbeitbar, wie vorher');
  assert.ok(!r.ok, 'mit der Reihenfolge von vorher hätte die Inhaberin ihren Stand nicht öffnen dürfen');
});
