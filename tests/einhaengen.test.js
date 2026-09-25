'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Einhängen (Übergaben-Modul Schritt 3; U2-ADR-003)
   ────────────────────────────────────────────────────────────────────────
   Empfänger-Seite zum Blackbox-Export. Die Empfänger-Person nimmt eine fremde
   Blackbox-Datei in ihre Verwaltung auf. Das eingehängte Depot behält seinen
   EIGENEN Umschlag und Schlüssel (ADR-068 v2 Klärung 5 — kein Re-Encrypt) und
   öffnet sich nur mit dem Passwort der Inhaberin über den bestehenden Vertrauens-
   Modus (RAM-only). Die Datei ist untrusted input und wird hart validiert.
   Beispiel-Kette: C exportiert B's Depot als Blackbox, gibt sie an D; D hängt
   sie ein und öffnet sie mit B's Passwort. Geprüfte Invarianten (KLASSE-A, wo
   sicherheitskritisch):
     1) Voller Rundlauf: Export → Einhängen → Öffnen, Klartext-Marker restauriert,
     2) Kein Re-Encrypt (Klasse-A): ct im Eintrag byte-identisch zur Datei,
     3) Isolation (Klasse-A): Anker-Passwort der Empfängerin öffnet NICHT,
     4) Untrusted-Input: fehlerhafte/Nicht-v2-Datei wird abgelehnt, kein Eintrag,
     5) Audit: 'eingehaengt'-Eintrag mit konkreter Person, anhängend.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW_C   = 'verwalter-c-anker-pw-111';   // Anker der absendenden Person (Depot 1)
const PW_D   = 'empfaenger-d-anker-pw-222';  // Anker der Empfänger-Person (Depot 2)
const SUB_PW = 'inhaberin-b-eigenes-pw-333'; // eigenes Passwort der Inhaberin B
const MARKER = 'BLUTGRUPPE-ROUNDTRIP-MARKER';
const ISO    = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// Wie ein echter Datei-Transfer: durch JSON serialisieren und zurücklesen.
const transfer = (datei) => JSON.parse(JSON.stringify(datei));

// Sender (Depot 1, C): versiegelt B's Inhalt mit Marker unter B's Passwort und
// baut daraus die Blackbox-Datei (gleiche Funktion wie der echte Export-Pfad).
async function blackboxMitMarker() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW_C);
  const inhalt = { schemaVersion: 19, verwaltungsTyp: 'verwaltet', sektoren: { gesundheit: { blutgruppe: MARKER } } };
  const umschlag = await V.subDepotVersiegeln(inhalt, SUB_PW);
  return transfer(V.blackboxDateiAusUmschlag(umschlag));   // verbatim, kein Re-Encrypt
}

// Sender über den ECHTEN Export-Pfad: anlegen → exportieren.
async function blackboxEchterExport() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW_C);
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Depot B', inhaberin: 'B', verwaltungsTyp: 'verwaltet' }, SUB_PW
  );
  return transfer(V.subDepotBlackboxExportieren(eintrag.depotUUID));
}

// Empfänger (Depot 2, D) mit Sitzungs-Akteur.
async function empfaenger() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW_D);
  const akteur = V.akteurSelbstErklaeren('Empfänger D');
  return { V, akteur };
}

test('Voller Rundlauf: exportieren → einhängen → mit Sub-Passwort öffnen → Marker restauriert', async () => {
  const datei = await blackboxMitMarker();
  const { V } = await empfaenger();

  const eintrag = V.subDepotEinhaengen(datei, { bezeichnung: 'Depot B (von C)', inhaberin: 'B' });
  assert.equal(eintrag.verwaltungsTyp, 'verwaltet');
  assert.equal(eintrag.status, 'aktiv');
  assert.equal(V.istEntsiegelt(eintrag.depotUUID), false, 'zunächst versiegelt — Inhalt verschlossen');

  // Öffnen mit B's eigenem Passwort über den bestehenden Vertrauens-Modus (RAM-only).
  const inhalt = await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  assert.equal(inhalt.sektoren.gesundheit.blutgruppe, MARKER, 'Klartext-Marker unverändert restauriert');
  assert.equal(inhalt.schemaVersion, 19, 'Struktur intakt');
  assert.equal(V.istEntsiegelt(eintrag.depotUUID), true, 'jetzt für die Sitzung entsiegelt');
});

test('Voller Rundlauf über den echten Export-Pfad: anlegen → exportieren → einhängen → öffnen', async () => {
  const datei = await blackboxEchterExport();
  const { V } = await empfaenger();
  const eintrag = V.subDepotEinhaengen(datei, { bezeichnung: 'Depot B', inhaberin: 'B' });
  const inhalt = await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  assert.equal(inhalt.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'Klartext-Inhalt nach Roundtrip restauriert');
  assert.equal(inhalt.verwaltungsTyp, 'verwaltet', 'Sub-Depot-Typ im entschlüsselten Inhalt erhalten');
});

test('[Klasse-A] Kein Re-Encrypt: der ct im eingehängten Eintrag ist byte-identisch zur Blackbox-Datei', async () => {
  const datei = await blackboxEchterExport();
  const { V } = await empfaenger();
  const eintrag = V.subDepotEinhaengen(datei, { bezeichnung: 'Depot B', inhaberin: 'B' });

  // U2-ADR-002 (23.09.2026, S1): ein Sub-Depot ist ein Depot wie jedes andere — V4. Gleich streng: statt ct/iv sind
  // Einheiten und Umschlagstabelle byte-identisch (JSON), statt „sechs Felder" genau die V4-Felder.
  assert.equal(JSON.stringify(eintrag.umschlag.einheiten), JSON.stringify(datei.umschlag.einheiten), 'Einheiten VERBATIM — nie neu verschlüsselt');
  assert.equal(JSON.stringify(eintrag.umschlag.umschlagTabelle), JSON.stringify(datei.umschlag.umschlagTabelle), 'Umschlagstabelle unverändert');
  assert.equal(eintrag.umschlag.depotSalt, datei.umschlag.depotSalt, 'depotSalt unverändert');
  assert.equal(eintrag.umschlag.pbkdf2.salt, datei.umschlag.pbkdf2.salt, 'pbkdf2.salt unverändert');
  assert.equal(eintrag.umschlag.depotUUID, datei.umschlag.depotUUID, 'depotUUID behalten');
  assert.equal(eintrag.umschlag.kryptoVersion, 4, 'kryptoVersion 4 — wie jedes Depot');
  assert.equal(
    Object.keys(eintrag.umschlag).sort().join(','),
    'angehoerigenOrt,depotSalt,depotUUID,einheiten,kryptoVersion,pbkdf2,umschlagTabelle',
    'genau die Felder einer Depot-Datei (mit dem Ortshinweis), nichts hinzugefügt'
  );
});

test('[Klasse-A] Isolation: das eingehängte Depot öffnet NICHT mit dem Anker-Passwort der Empfängerin', async () => {
  const datei = await blackboxEchterExport();
  const { V } = await empfaenger();
  const eintrag = V.subDepotEinhaengen(datei, { bezeichnung: 'Depot B', inhaberin: 'B' });

  await assert.rejects(
    () => V.subDepotVertrauenOeffnen(eintrag.depotUUID, PW_D),
    'Anker-Passwort der Empfängerin darf das eingehängte Depot nicht öffnen'
  );
  assert.equal(V.istEntsiegelt(eintrag.depotUUID), false, 'bleibt versiegelt nach Fehlversuch');
  // Nur mit dem eigenen Sub-Passwort der Inhaberin.
  const inhalt = await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  assert.equal(inhalt.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'mit dem Sub-Passwort öffnet es');
});

test('Untrusted-Input: fehlerhafte oder Nicht-v3-Dateien werden abgelehnt, kein Eintrag entsteht', async () => {
  const gut = await blackboxEchterExport();
  const { V } = await empfaenger();

  const keinBlackbox = transfer(gut); keinBlackbox.dateiTyp = 'irgendwas';
  const v1 = transfer(gut); v1.umschlag.kryptoVersion = 1;   // B2/v3: v1 abgelehnt
  const v2 = transfer(gut); v2.umschlag.kryptoVersion = 2;   // B2/v3: v2 abgelehnt (v3-only)
  // U2-ADR-002 (23.09.2026, S1): `gut` ist jetzt V4 — ein fehlendes `ct` wäre dort kein Defekt. Die Strukturprobe gilt
  // darum für BEIDE Formen: V4 ohne Einheiten bzw. ohne Tabelle, und ein V3-Bestand (weiter einhängbar) ohne ct.
  const fehltEinheiten = transfer(gut); delete fehltEinheiten.umschlag.einheiten;
  const fehltTabelle = transfer(gut); delete fehltTabelle.umschlag.umschlagTabelle;
  const fehltCt = transfer(gut);
  fehltCt.umschlag = { kryptoVersion: 3, depotUUID: gut.umschlag.depotUUID, pbkdf2: gut.umschlag.pbkdf2,
    depotSalt: gut.umschlag.depotSalt, iv: 'AAAAAAAAAAAAAAAA' };   // V3-Form, 12-Byte-iv, aber ohne ct
  const extraFeld = transfer(gut); extraFeld.umschlag.geheim = 'x';
  const kaputteUuid = transfer(gut); kaputteUuid.umschlag.depotUUID = 'nicht-uuid';
  const kurzerSalt = transfer(gut); kurzerSalt.umschlag.depotSalt = 'QUJD';   // 3 Byte statt 32

  for (const [name, datei] of [
    ['kein Blackbox-Typ', keinBlackbox],
    ['kryptoVersion 1',  v1],
    ['kryptoVersion 2',  v2],
    ['V4: Einheiten fehlen', fehltEinheiten],
    ['V4: Tabelle fehlt',  fehltTabelle],
    ['V3: ct fehlt',       fehltCt],
    ['Extra-Feld',        extraFeld],
    ['kaputte uuid',      kaputteUuid],
    ['zu kurzer depotSalt', kurzerSalt],
  ]) {
    assert.throws(() => V.subDepotEinhaengen(datei, {}), undefined, 'abgelehnt: ' + name);
  }
  // Auch kaputtes/leeres JSON-Surrogat.
  assert.throws(() => V.subDepotEinhaengen(null, {}));
  assert.equal(V.getData().verwalteteDepots.length, 0, 'kein einziger Eintrag durch untrusted input');
});

test('[Audit] eingehaengt-Eintrag mit konkreter Person, anhängend', async () => {
  const datei = await blackboxEchterExport();
  const { V, akteur } = await empfaenger();
  const eintrag = V.subDepotEinhaengen(datei, { bezeichnung: 'Depot B', inhaberin: 'B' });

  assert.equal(eintrag.delegationsGeschichte.length, 1, 'genau ein Audit-Eintrag');
  const log = eintrag.delegationsGeschichte[0];
  assert.equal(log.art, 'eingehaengt', 'Eintrags-Art');
  assert.equal(log.akteur, akteur.personId, 'konkrete handelnde Person benannt (Person-id, nicht nur Rolle)');
  assert.equal(V.akteurName(log.akteur), 'Empfänger D', 'Person nach Verweis auflösbar');
  assert.match(log.zeitpunkt, ISO, 'Zeitpunkt ISO-8601');
});

test('Einhängen ohne Sitzungs-Akteur wirft — keine namenlose Aufnahme, kein Eintrag', async () => {
  const datei = await blackboxEchterExport();
  const { V } = ladeKern();
  await V.depotAnlegen(PW_D);   // KEIN akteurSelbstErklaeren
  assert.throws(() => V.subDepotEinhaengen(datei, {}), /Sitzungs-Akteur|U2-ADR-005/);
  assert.equal(V.getData().verwalteteDepots.length, 0, 'kein Eintrag bei fehlgeschlagenem Einhängen');
});

test('Kollision: dieselbe depotUUID wird nicht stillschweigend überschrieben', async () => {
  const datei = await blackboxEchterExport();
  const { V } = await empfaenger();
  V.subDepotEinhaengen(datei, { bezeichnung: 'erste Aufnahme', inhaberin: 'B' });
  assert.throws(() => V.subDepotEinhaengen(datei, { bezeichnung: 'zweite Aufnahme', inhaberin: 'B' }),
    /bereits in Verwaltung|depotUUID/i, 'zweites Einhängen derselben UUID abgelehnt');
  assert.equal(V.getData().verwalteteDepots.length, 1, 'nur ein Eintrag');
  assert.equal(V.getData().verwalteteDepots[0].bezeichnung, 'erste Aufnahme', 'erster Eintrag unverändert');
});
