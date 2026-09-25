'use strict';
/* Der Klartext-Ortshinweis gehört zur Depot-Datei (U2-ADR-062-Nachtrag) — und die Blackbox IST die Depot-Datei eines
   Sub-Depots (U2-ADR-002, Entscheidung 23.09.2026). Bis heute ließen Blackbox und Einhängen ihn still weg: eine Angabe
   der Inhaberin ging verloren, sobald ihr Depot als Sub-Depot eingehängt oder weitergegeben wurde. Rundlauf:
   Anker-Datei → einhängen → bearbeiten und neu versiegeln → Blackbox → Lese-App. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const PW_MUTTER = 'mutter-ortshinweis-pw';
const ORT = 'Umschlag in der Schublade im Flur';

test('[Ortshinweis·Rundlauf] der Ortshinweis überlebt Einhängen, Neuversiegeln, Blackbox und Lese-App', async () => {
  const mutter = ladeKern().V;
  await mutter.depotAnlegen(PW_MUTTER);
  mutter.akteurSelbstErklaeren('Hedwig Brandt');
  mutter.getData().angehoerigen_passwort_ort = ORT;
  await mutter.empfaengerkreisSetzen({ name: 'Tante Renate', bausteine: ['notfall'] });
  await mutter.empfaengerkreisFachEinrichten(mutter.empfaengerkreiseListe()[0], 'tante-renate-pw');
  const datei = await mutter.depotSerialisieren();
  assert.equal(datei.angehoerigenOrt, ORT, 'Vorbedingung: die Depot-Datei der Mutter trägt den Ortshinweis');

  const { V } = ladeKern();
  await V.depotAnlegen('tochter-ortshinweis-pw');
  V.akteurSelbstErklaeren('Tochter Reiter');
  const e = V.subDepotEinhaengen(JSON.parse(JSON.stringify(datei)), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
  const ablage = () => V.getData().verwalteteDepots.find((x) => x.depotUUID === e.depotUUID).umschlag;
  assert.equal(ablage().angehoerigenOrt, ORT, 'eingehängt: der Ortshinweis ist da');

  await V.subDepotVertrauenOeffnen(e.depotUUID, PW_MUTTER);
  V.subKontextBetreten(e.depotUUID);
  V.akteurSelbstErklaeren('Tochter Reiter');
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'Kontrolle im Oktober');
  await V.subKontextVerlassen();
  assert.equal(ablage().angehoerigenOrt, ORT, 'neu versiegelt: derselbe Ortshinweis (aus dem Inhalt, wie bei jedem Depot)');

  const blackbox = JSON.parse(JSON.stringify(V.subDepotBlackboxExportieren(e.depotUUID)));
  assert.equal(blackbox.umschlag.angehoerigenOrt, ORT, 'die Blackbox trägt ihn');

  const { V: L } = ladeLesen();
  assert.equal(L.erkenneFormat(blackbox), 'blackbox');
  const inhalt = await L.leseSubUmschlag(blackbox.umschlag, PW_MUTTER);
  assert.equal(inhalt.sektoren.health.ongoingTreatmentNext, 'Kontrolle im Oktober', 'die Lese-App öffnet die Blackbox mit Ortshinweis');

  const nochmal = ladeKern().V;
  await nochmal.depotAnlegen('dritte-pw-123');
  nochmal.akteurSelbstErklaeren('Dritte');
  const e2 = nochmal.subDepotEinhaengen(blackbox, { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
  assert.equal(nochmal.getData().verwalteteDepots.find((x) => x.depotUUID === e2.depotUUID).umschlag.angehoerigenOrt, ORT,
    'die Blackbox, erneut eingehängt, behält ihn');

  // Rot-Beweis: so sah es bis heute aus — eine Datei, aus der der Ortshinweis beim Weitergeben wegfiel. Dieselbe Messung
  // am eingehängten Umschlag sieht den Verlust.
  const ohne = JSON.parse(JSON.stringify(datei)); delete ohne.angehoerigenOrt;
  const dritte = ladeKern().V;
  await dritte.depotAnlegen('vierte-pw-123');
  dritte.akteurSelbstErklaeren('Vierte');
  const e3 = dritte.subDepotEinhaengen(ohne, { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
  assert.notEqual(dritte.getData().verwalteteDepots.find((x) => x.depotUUID === e3.depotUUID).umschlag.angehoerigenOrt, ORT,
    'Rot-Beweis: ohne den Ortshinweis in der Datei schlüge die Probe an');
});

test('[Ortshinweis·Prüfung] eine Blackbox mit einem Ortshinweis, der kein Text ist, wird abgewiesen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-ortsprobe-pw');
  V.akteurSelbstErklaeren('X');
  const s = await V.subDepotAnlegen({ vorname: 'Y', vertretungsGrundlage: 'vorsorge' }, 'sub-ortsprobe-pw');
  const b = JSON.parse(JSON.stringify(V.blackboxDateiAusUmschlag(s.umschlag)));
  b.umschlag.angehoerigenOrt = { verschachtelt: true };
  assert.throws(() => V.subDepotEinhaengen(b, {}), /V4-Umschlag braucht genau die sechs Felder/);
});
