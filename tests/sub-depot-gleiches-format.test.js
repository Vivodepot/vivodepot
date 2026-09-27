'use strict';
/* S1 (23.09.2026): ein Sub-Depot ist ein Depot wie jedes andere (U2-ADR-002: „Ein Mechanismus für alle Depots, kein
   Anker-Sonderfall") — es entsteht und speichert über denselben Weg (V4, Einheiten, Fächer). Bis heute entstand es als
   eigenes V3 mit einem Schlüssel für alles. Ein V3-Bestand wird beim nächsten Speichern V4, wie jedes Bestandsdepot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const SUB_PW = 'sub-gleiches-format';

async function anker() {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-gleiches-format');
  V.akteurSelbstErklaeren('Tochter Reiter');
  return V;
}

test('[S1·Anlage] ein neues Sub-Depot entsteht im selben Format wie jedes Depot (V4)', async () => {
  const V = await anker();
  const e = await V.subDepotAnlegen({ vorname: 'Hedwig', nachname: 'Brandt', vertretungsGrundlage: 'vorsorge' }, SUB_PW);
  assert.equal(e.umschlag.kryptoVersion, 4);
  assert.ok(e.umschlag.einheiten && Array.isArray(e.umschlag.umschlagTabelle), 'Einheiten und Umschlagstabelle wie beim Anker');
  const { inhalt } = await V.subDepotEntsiegeln(e.umschlag, SUB_PW);
  assert.equal(inhalt.vertretungsGrundlage, 'vorsorge', 'und öffnet sich mit dem eigenen Passwort');
});

test('[S1·Rot-Beweis] ein Umschlag im alten Anlage-Format (V3, ein Schlüssel) fiele durch dieselben Prüfungen', async () => {
  const V = await anker();
  const alt = await v3Umschlag(V, V.leeresDepot(), SUB_PW);
  assert.notEqual(alt.kryptoVersion, 4, 'die Prüfung auf V4 schlüge an');
  assert.ok(!(alt.einheiten && Array.isArray(alt.umschlagTabelle)), 'die Prüfung auf Einheiten und Umschlagstabelle schlüge an');
});

// Ein V3-Bestand, versiegelt genau wie bis heute (ein Schlüssel, iv/ct) — kein Nachbau des Lesepfads, nur des alten Schreibwegs.
async function v3Umschlag(V, inhalt, pw) {
  const pbkdf2Salt = crypto.getRandomValues(new Uint8Array(16));
  const depotSalt = crypto.getRandomValues(new Uint8Array(32));
  const depotUUID = crypto.randomUUID();
  const master = await V.depotMasterHkdfKey(pw, pbkdf2Salt);
  const key = await V.deriveDepotKeyV2(master, depotSalt, depotUUID);
  const { iv, ct } = await V.VdCrypto.encryptDepot(inhalt, key, V._AAD_DEPOT_V2);
  return { kryptoVersion: 3, depotUUID, pbkdf2: { salt: V.bytesToBase64(pbkdf2Salt) }, depotSalt: V.bytesToBase64(depotSalt), iv, ct };
}

test('[S1·Bestand] ein V3-Sub-Depot: öffnen, bearbeiten, speichern → V4 mit vollständigem Inhalt', async () => {
  const V = await anker();
  const alt = V.leeresDepot();
  alt.sektoren.health = { ongoingTreatmentNext: 'vorher' };
  alt.sektoren.finance = { companyPensionPolicyNumber: 'P-4711' };
  const e = V.subDepotEinhaengen(V.blackboxDateiAusUmschlag(await v3Umschlag(V, alt, SUB_PW)), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
  assert.equal(e.umschlag.kryptoVersion, 3, 'Vorbedingung: ein V3-Bestand');
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Tochter Reiter');
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'nachher');
  await V.subKontextVerlassen();
  const u = V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID).umschlag;
  assert.equal(u.kryptoVersion, 4, 'gespeichert über denselben Weg wie jedes Depot');
  assert.ok(!('iv' in u) && !('ct' in u), 'kein toter V3-Rest daneben');
  assert.equal(u.depotUUID, e.depotUUID, 'dieselbe Identität');
  const frisch = (await V.subDepotEntsiegeln(u, SUB_PW)).inhalt;
  assert.equal(frisch.sektoren.health.ongoingTreatmentNext, 'nachher', 'die Änderung ist drin');
  assert.equal(frisch.sektoren.finance.companyPensionPolicyNumber, 'P-4711', 'und der übrige Inhalt vollständig');
});
