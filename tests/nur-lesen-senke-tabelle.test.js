'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Nur lesen hält an der Senke, nicht nur an der Oberfläche (24.11.2026, Vorbeugung zu FACH-SITZUNG-SCHREIBT-INHABER-DATEI)
   ────────────────────────────────────────────────────────────────────────
   Der Befund war ein Zustand „nur lesen“, den nur die Oberfläche kannte: über ein Fach geöffnet, aber depotSerialisieren schrieb.
   Diese Tabelle verlangt für JEDEN Nur-lesen-Zustand, dass die Stelle, an der gespeichert wird, nicht schreibt:
     · Anker über ein Fach geöffnet  → depotSerialisieren wirft (fach-nur-lesen)
     · Anker aus einer neueren Fassung → depotSerialisieren wirft
     · Anker, dessen Migration warf    → depotSerialisieren wirft
     · Sub über ein Fach geöffnet       → subDepotNeuVersiegeln gibt den Umschlag unverändert zurück (die Senke des Subs)
   Nicht in der Tabelle als Nur-lesen-Zustand, mit Grund (eigene Zeile unten): der Notfall-Modus. Er sperrt die Bearbeitung nur in
   der Ansicht (MODUS_DEF notfall: bearbeitung 'gesperrt'); er ist eine Sicht der Inhaberin auf ihr eigenes, mit ihrem Passwort
   geöffnetes Depot (U2-ADR-078: einziger Einstieg aus der offenen Sitzung). Was dort gespeichert wird, ist ihr eigener Stand unter
   ihrem eigenen Schlüssel — kein fremder Schreibweg. Die Zeile prüft genau das.
   Ein neuer Nur-lesen-Zustand gehört als Zeile hierher.
   ════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const GEHOSTET = { protocol: 'https:', href: 'https://vivodepot.example/app' };
const PW = 'Inhaberin-Tabelle-2026!';
const PW_FACH = 'Fach-Tabelle-2026-Gesundheit!';
const PW_ANDERE = 'Tochter-Tabelle-2026!';
const ordner = [];
after(() => { for (const d of ordner) fs.rmSync(d, { recursive: true, force: true }); });

async function inhaberinMitFach(V) {
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Gerda Beispiel');
  const d = V.getData();
  d.sektoren.health = { ongoingTreatmentNext: 'WERT-GESUNDHEIT' };
  d.sensibelFelder = { health: { ongoingTreatmentNext: false } };
  V.setData(d);
  await V.empfaengerkreisSetzen({ name: 'Anna Gesundheit', bausteine: ['bereich:health'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH);
}
async function wirft(fn) { try { await fn(); return null; } catch (e) { return e || new Error('geworfen'); } }

const ZEILEN = [
  ['Anker über ein Fach geöffnet', async () => {
    const M = ladeKern({ location: GEHOSTET }).V;
    await inhaberinMitFach(M);
    const datei = JSON.parse(JSON.stringify(await M.depotSerialisierenV4()));
    const E = ladeKern({ location: GEHOSTET }).V;
    await E.depotLaden(datei, PW_FACH);
    E.akteurSelbstErklaeren('Anna Beispiel');
    assert.equal(E.Modus.darfBearbeiten(), false, 'die Oberfläche bietet Bearbeitung an');
    const e = await wirft(() => E.depotSerialisieren());
    assert.ok(e && e.code === 'fach-nur-lesen', 'depotSerialisieren schrieb über ein Fach: ' + (e && e.code));
  }],
  ['Anker aus einer neueren Fassung', async () => {
    const M = ladeKern({ location: GEHOSTET }).V;
    await M.depotAnlegen(PW);
    M.akteurSelbstErklaeren('Gerda Beispiel');
    M.getData().schemaVersion = M.SCHEMA_VERSION_AKTUELL + 1;
    const datei = JSON.parse(JSON.stringify(await M.depotSerialisierenV4()));
    const E = ladeKern({ location: GEHOSTET }).V;
    await E.depotLaden(datei, PW);
    assert.equal(E.neuereFassungNurLesen(), true, 'die Datei ist nicht neuer — die Zeile prüft nichts');
    try { E.akteurSelbstErklaeren('Gerda Beispiel'); } catch (_) { /* nur die Bearbeitungserlaubnis herstellen */ }
    assert.ok(await wirft(() => E.depotSerialisieren()), 'depotSerialisieren schrieb eine Datei aus einer neueren Fassung');
  }],
  ['Anker, dessen Migration warf', async () => {
    const kopf = 'function depotNormalisieren(d) {';
    let quelle = fs.readFileSync(KERN, 'utf8');
    assert.equal(quelle.split(kopf).length, 2, 'Anker depotNormalisieren');
    quelle = quelle.replace(kopf, kopf + " if (d && d.zzTabelleMigrationWirft) throw new Error('zz-tabelle: Migration wirft');");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nur-lesen-tabelle-')); ordner.push(dir);
    const pfad = path.join(dir, 'vivodepot.html'); fs.writeFileSync(pfad, quelle);
    const mock = createIdbMock();
    const M = ladeKern({ indexedDB: mock, location: GEHOSTET, htmlPfad: pfad, backen: true }).V;
    await M.depotAnlegen(PW);
    Object.assign(M.getData(), { schemaVersion: 80, zzTabelleMigrationWirft: true });
    await M.depotInIdbSichern();
    const E = ladeKern({ indexedDB: createIdbMock({ _dbs: mock._dbs }), location: GEHOSTET, htmlPfad: pfad, backen: true }).V;
    await E.depotAusIdbLaden(PW);
    assert.ok(E.migrationFehlerErgebnis(), 'die Migration hat nicht geworfen — die Zeile prüft nichts');
    assert.ok(await wirft(() => E.depotSerialisieren()), 'depotSerialisieren schrieb nach einem Migrationswurf');
  }],
  ['Sub über ein Fach geöffnet', async () => {
    const M = ladeKern().V;
    await inhaberinMitFach(M);
    const datei = JSON.parse(JSON.stringify(await M.depotSerialisierenV4()));
    const V = ladeKern().V;
    await V.depotAnlegen(PW_ANDERE);
    V.akteurSelbstErklaeren('Anna Beispiel');
    const ein = V.subDepotEinhaengen(datei, { bezeichnung: 'Mama' });
    const uuid = ein.depotUUID || datei.depotUUID;
    await V.subDepotVertrauenOeffnen(uuid, PW_FACH);
    V.subKontextBetreten(uuid);
    assert.equal(V.Modus.darfBearbeiten(), false, 'die Oberfläche bietet im Sub über ein Fach Bearbeitung an');
    const vorher = JSON.stringify(V.ankerDaten().verwalteteDepots.find((x) => x.depotUUID === uuid).umschlag);
    const nach = await V.subDepotNeuVersiegeln(uuid);
    assert.equal(JSON.stringify(nach), vorher, 'das Sub über ein Fach wurde neu versiegelt');
  }],
];

for (const [name, pruefen] of ZEILEN) {
  test('[Nur lesen·Senke] ' + name, pruefen);
}

test('[Nur lesen·Senke·kein Nur-lesen-Zustand] Notfall-Modus: die eigene Sitzung speichert ihren eigenen Stand unter ihrem Schlüssel', async () => {
  const mock = createIdbMock();
  const M = ladeKern({ indexedDB: mock, location: GEHOSTET }).V;
  await M.depotAnlegen(PW);
  M.akteurSelbstErklaeren('Gerda Beispiel');
  M.sektorFeldSetzen('identity', 'givenName', 'Vor-Notfall');
  M.geheZuNotfall();
  assert.equal(M.Modus.darfBearbeiten(), false, 'Notfall sperrt die Bearbeitung in der Ansicht');
  assert.ok(await M.depotSerialisieren(), 'die eigene Sitzung speichert');
  await M.depotInIdbSichern();
  const I = ladeKern({ indexedDB: createIdbMock({ _dbs: mock._dbs }), location: GEHOSTET }).V;
  assert.ok(await I.depotAusIdbLaden(PW), 'die Inhaberin öffnet ihren Stand mit ihrem Passwort');
  assert.equal(I.getData().sektoren.identity.givenName, 'Vor-Notfall');
});

test('[Nur lesen·Senke·Rot-Beweis] ohne die Marke „über ein Fach“ an der Senke schreibt die Anker-Zeile wieder', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  const anker = ' || _ankerUeberFach; }';
  assert.ok(quelle.includes(anker), 'Rot-Beweis ohne Anker');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nur-lesen-tabelle-rot-')); ordner.push(dir);
  const pfad = path.join(dir, 'vivodepot.html'); fs.writeFileSync(pfad, quelle.replace(anker, '; }'));
  const M = ladeKern({ location: GEHOSTET, htmlPfad: pfad, backen: true }).V;
  await inhaberinMitFach(M);
  const datei = JSON.parse(JSON.stringify(await M.depotSerialisierenV4()));
  const E = ladeKern({ location: GEHOSTET, htmlPfad: pfad, backen: true }).V;
  await E.depotLaden(datei, PW_FACH);
  E.akteurSelbstErklaeren('Anna Beispiel');
  assert.equal(await wirft(() => E.depotSerialisieren()), null, 'ohne die Marke hätte die Senke schreiben müssen');
});
