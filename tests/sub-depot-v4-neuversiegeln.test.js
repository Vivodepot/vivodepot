'use strict';
/* Verdacht (23.09.2026, Sonderlocken-Inventur S2): `subDepotEntsiegeln` liest V3 UND V4, `subDepotNeuVersiegeln`
   schreibt aber nur `Object.assign({}, e.umschlag, { iv, ct })`. Ein als V4 eingehängtes Sub-Depot behielte
   `kryptoVersion: 4` und seine alten Einheiten — der Leser nähme die Einheiten, die Änderung wäre still fort.
   Gemessen wird am frisch entsiegelten Umschlag, nicht am Sitzungs-Inhalt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW_X = 'eigenes-depot-pw';

test('[S2] ein als V4 eingehängtes Sub-Depot behält eine Änderung über das Neuversiegeln', async () => {
  // Ein gewöhnliches Depot, so wie es jede Bürgerin als Datei hat (V4).
  const quelle = ladeKern().V;
  await quelle.depotAnlegen(PW_X);
  quelle.akteurSelbstErklaeren('Hedwig Brandt');
  quelle.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'vorher');
  const umschlag = await quelle.depotSerialisieren();
  assert.equal(umschlag.kryptoVersion, 4, 'Vorbedingung: das Depot ist V4');
  const datei = quelle.blackboxDateiAusUmschlag(umschlag);

  // Eingehängt in das Depot der Tochter, betreten, geändert, verlassen (versiegelt neu).
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw');
  V.akteurSelbstErklaeren('Tochter Reiter');
  const e = V.subDepotEinhaengen(datei, { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
  const umschlagVorher = JSON.parse(JSON.stringify(e.umschlag));
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW_X);
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Tochter Reiter');
  assert.equal(V.getData().sektoren.health.ongoingTreatmentNext, 'vorher', 'Vorbedingung: der Inhalt ist lesbar');
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'nachher');
  await V.subKontextVerlassen();

  const eintrag = V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID);
  const frisch = (await V.subDepotEntsiegeln(eintrag.umschlag, PW_X)).inhalt;
  assert.equal(frisch.sektoren.health.ongoingTreatmentNext, 'nachher', 'die Änderung steht im versiegelten Sub-Depot');

  // Rot-Beweis: dieselbe Messung am Umschlag von VOR dem Neuversiegeln — so sah der Befund aus (die alten Einheiten
  // blieben, das neue iv/ct lag tot daneben). Die Messung liest den versiegelten Stand, nicht den Sitzungs-Inhalt.
  const alt = (await V.subDepotEntsiegeln(umschlagVorher, PW_X)).inhalt;
  assert.equal(alt.sektoren.health.ongoingTreatmentNext, 'vorher', 'Rot-Beweis: der unveränderte Umschlag hätte die Probe rot gemacht');
});

/* Derselbe Speicherweg wie jedes Depot heißt auch: die FÄCHER der Empfängerkreise dieses Depots überleben.
   Die Tante hat ein Fach im Depot der Mutter; nach einer Bearbeitung im eingehängten Depot öffnet ihr Passwort
   es weiterhin. Und wer über ein Fach öffnet, hat nur einen Ausschnitt: lesend, der Umschlag bleibt unberührt. */
const PW_TANTE = 'tante-renate-pw';
async function mutterMitFach() {
  const quelle = ladeKern().V;
  await quelle.depotAnlegen(PW_X);
  quelle.akteurSelbstErklaeren('Hedwig Brandt');
  quelle.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'vorher');
  await quelle.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: ['notfall'] });
  await quelle.empfaengerkreisFachEinrichten(quelle.empfaengerkreiseListe()[0], PW_TANTE);
  const umschlag = await quelle.depotSerialisieren();
  assert.ok(umschlag.umschlagTabelle.length >= 2, 'Vorbedingung: das Depot trägt ein Fach');
  const { V } = ladeKern();
  await V.depotAnlegen('anker-pw');
  V.akteurSelbstErklaeren('Tochter Reiter');
  const e = V.subDepotEinhaengen(quelle.blackboxDateiAusUmschlag(umschlag), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
  return { V, e };
}
const umschlagVon = (V, e) => V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID).umschlag;

test('[S2·Fächer] die Fächer der Empfängerkreise überleben das Neuversiegeln des eingehängten Depots', async () => {
  const { V, e } = await mutterMitFach();
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW_X);
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Tochter Reiter');
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'nachher');
  await V.subKontextVerlassen();
  const u = umschlagVon(V, e);
  assert.equal((await V.subDepotEntsiegeln(u, PW_X)).inhalt.sektoren.health.ongoingTreatmentNext, 'nachher');
  const tante = await V.subDepotEntsiegeln(u, PW_TANTE);   // wirft, wenn das Fach verloren ist
  assert.equal(tante.platz, 1, 'das Passwort der Tante öffnet weiterhin IHR Fach');
});

test('[S2·über ein Fach] wer über ein Fach öffnet, liest nur — und schreibt beim Verlassen nichts zurück', async () => {
  const { V, e } = await mutterMitFach();
  const vorher = JSON.stringify(umschlagVon(V, e));
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW_TANTE);
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Tante Renate');
  assert.equal(V.Modus.darfBearbeiten(), false, 'nur ein Ausschnitt: nicht bearbeitbar');
  await V.subKontextVerlassen();
  assert.equal(JSON.stringify(umschlagVon(V, e)), vorher, 'der Umschlag ist unberührt — kein Ausschnitt überschreibt das Ganze');
});
