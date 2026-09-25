'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 1: IDB-Persistenz-Schicht (v3-only)
   ────────────────────────────────────────────────────────────────────────
   (a) Schreiben→Lesen-Roundtrip; Stand überlebt Schließen+Öffnen (frisch
       geladener Kern auf demselben Persistenzspeicher).
   (b) Krypto byte-identisch: der gespeicherte cipherBlob ist ein gültiger
       v3-Umschlag; das Block-Hash-Gate (separat) bleibt grün.
   (c) v≠3 → kontrollierter Fehler (LEGACY-Beschluss, kein Bestand-Fallback).
   (d) Zeitmarke `gespeichert_am` lebt NEBEN dem Chiffrat, NIE im Umschlag/AAD.
   (e) No-Op ohne Session (Vorschau-Invariante — vertieft in Etappe 3).
   (f) Persistenz-Dispatcher: gehostet → intern (IDB), Datei-Modus → unverändert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'persistenz-passwort-123';
const HOSTED = { protocol: 'https:', href: 'https://vivodepot.example/app' };

async function hostedKern(mock) {
  const m = mock || createIdbMock();
  const k = ladeKern({ indexedDB: m, location: HOSTED });
  return { ...k, mock: m };
}

test('[D43-E1] Roundtrip + überlebt Schließen+Öffnen (frischer Kern, gleicher Speicher)', async () => {
  const k1 = await hostedKern();
  await k1.V.depotAnlegen(PW);
  const d = k1.V.getData();
  d.sektoren.identity = { givenName: 'Testa', familyName: 'Muster' };
  const ts = await k1.V.depotInIdbSichern();
  assert.match(ts, /^\d{4}-\d{2}-\d{2}T/, 'gespeichert_am ist ISO-Zeitmarke');

  // Frischer Kern (= App neu geöffnet) auf DEMSELBEN Persistenzspeicher.
  const k2 = await hostedKern(createIdbMock({ _dbs: k1.mock._dbs }));
  const umschlag = await k2.V.depotAusIdbLaden(PW);
  // A345 (19.08.2026): der Anker schreibt seit dem Schnitt in Feld-Einheiten. Der
  // interne Speicher hält, was der Kern schreibt — die Zusicherung bleibt, dass er den
  // Umschlag UNVERÄNDERT durchreicht, nicht dass er eine bestimmte Generation erzwingt.
  assert.equal(umschlag.kryptoVersion, k2.V.CRYPTO_VERSION_ZERFALL, 'geladener Umschlag ist die Form des Schreibwegs');
  assert.equal(k2.V.getData().sektoren.identity.givenName, 'Testa', 'Stand da nach Wieder-Öffnen');
  assert.equal(k2.V.getData().sektoren.identity.familyName, 'Muster');
});

test('[D43-E1] gespeicherter cipherBlob ist ein gültiger Umschlag (Krypto unangetastet)', async () => {
  const k = await hostedKern();
  await k.V.depotAnlegen(PW);
  await k.V.depotInIdbSichern();
  const liste = await k.V.VdStore.liste();
  assert.equal(liste.length, 1, 'genau ein Anker-Record');
  const umschlag = JSON.parse(liste[0].cipherBlob);
  assert.equal(umschlag.kryptoVersion, k.V.CRYPTO_VERSION_ZERFALL);
  assert.ok(k.V.istGueltigerUmschlag(umschlag), 'der geschriebene Umschlag ist gültig');
});

test('[D43-E1] v≠3 → kontrollierter Fehler (kein Bestand-Fallback)', async () => {
  const k = await hostedKern();
  await k.V.VdStore.setzen({
    id: 'alt', gespeichert_am: '2026-01-01T00:00:00.000Z',
    cipherBlob: JSON.stringify({ kryptoVersion: 2, depotUUID: 'alt', pbkdf2: { salt: 'AA' }, depotSalt: 'BB', iv: 'CC', ct: 'DD' }),
  });
  await assert.rejects(() => k.V.depotAusIdbLaden(PW), /nur kryptoVersion 3/, 'v2 wird abgelehnt');
});

test('[D43-E1] Zeitmarke gespeichert_am liegt NEBEN dem Chiffrat, NIE im Umschlag (Auflage 1)', async () => {
  const k = await hostedKern();
  await k.V.depotAnlegen(PW);
  await k.V.depotInIdbSichern();
  const rec = (await k.V.VdStore.liste())[0];
  assert.match(rec.gespeichert_am, /^\d{4}-\d{2}-\d{2}T/, 'Record trägt die Zeitmarke');
  const umschlag = JSON.parse(rec.cipherBlob);
  assert.equal('gespeichert_am' in umschlag, false, 'Zeitmarke NICHT im (AAD-gebundenen) Umschlag');
  // Umschlag-Felder bleiben auf die v3-Sechs plus die bewusst entschiedenen Geschwister beschränkt:
  // angehoerigenCache (Chiffrat, U2-ADR-062) und angehoerigenOrt (Klartext-Ort-Hinweis,
  // U2-ADR-062-Nachtrag 21.07.2026 — muss vor der Passwort-Eingabe lesbar sein).
  // A345: `iv`/`ct` sind den Feld-Einheiten und der Umschlagstabelle gewichen; beide
  // Formen bleiben zulässig, weil der v3-Lesepfad der Rückweg ist. Die Zusicherung
  // ist unverändert: KEIN Feld ausserhalb dieser Menge, damit kein Klartext-Geschwister
  // still dazukommt.
  const erlaubt = new Set(['kryptoVersion', 'depotUUID', 'pbkdf2', 'depotSalt', 'iv', 'ct',
    'einheiten', 'umschlagTabelle',
    'notfallCache', 'angehoerigenCache', 'angehoerigenOrt']);
  for (const key of Object.keys(umschlag)) assert.ok(erlaubt.has(key), 'unerwartetes Umschlag-Feld: ' + key);
});

test('[D43-E1] No-Op ohne Session: depotInIdbSichern schreibt nichts (Vorschau-Invariante)', async () => {
  const k = await hostedKern();
  const r = await k.V.depotInIdbSichern();   // keine Session angelegt
  assert.equal(r, null, 'ohne sessionKey → null (No-Op)');
  assert.equal((await k.V.VdStore.liste()).length, 0, 'IDB bleibt leer');
});

test('[D43-E1] Dispatcher: gehostet → intern (IDB); Datei-Modus → kein IDB-Schreiben', async () => {
  // Gehostet: Save geht intern.
  const k = await hostedKern();
  await k.V.depotAnlegen(PW);
  const weg = await k.V.depotInternSichern();
  assert.equal(weg, 'intern', 'depotInternSichern meldet internen Pfad');
  assert.equal(await k.V.internerStandVorhanden(), true, 'interner Stand vorhanden');
  // kernAPI.speichern läuft in gehostetem Modus über den Dispatcher → IDB.
  k.V.getData().sektoren.identity = { givenName: 'Zwei' };
  await k.V.kernAPI.speichern();
  assert.equal((await k.V.VdStore.liste()).length, 1, 'genau ein Anker-Record (überschrieben, nicht dupliziert)');

  // Datei-Modus (kein IDB injiziert): Dispatcher meidet die interne Senke.
  const f = ladeKern();
  await f.V.depotAnlegen(PW);
  assert.equal(f.V.internerSpeicherModus(), false, 'ohne IDB → Datei-Modus');
  await f.V.depotPersistieren();   // läuft über depotInDateiSichern (Download-Stub), wirft nicht
  assert.equal(await f.V.internerStandMeta(), null, 'Datei-Modus schreibt NICHT in IDB');
  assert.equal(f.V.istUngespeichert(), false, 'nach Datei-Sicherung als gespeichert markiert');
});
