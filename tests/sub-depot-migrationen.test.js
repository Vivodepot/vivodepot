'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   S5 (23.09.2026): ein Sub-Depot ist ein Depot wie jedes andere (U2-ADR-002) — sein Inhalt durchläuft
   dieselben Migrationen. Bis heute setzte `subKontextBetreten` den entsiegelten Inhalt als `data`, ohne
   `depotNormalisieren`; ein Sub, das ein älterer Kern versiegelt hatte, blieb auf seinem Schema, und jede
   umbenannte Kennung war für den heutigen Kern unsichtbar.

   Rot-Beweis: vor dem Einbau in `subKontextBetreten` sind [S5], [S5·Stufe 88] und der Klassenwächter rot.
   Positivkontrolle: die Migration selbst hebt den alten Inhalt an (das Beispiel ist richtig gebaut).
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { STUFEN } = require('./fixtures/migrations-stufen.js');

const ANKER_PW = 'anker-pw-s5-2026!';
const SUB_PW = 'alt-sub-pw-s5-2026!';

async function ankerMitSub(inhalt) {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Tochter Reiter');
  const umschlag = await V.subDepotVersiegeln(inhalt, SUB_PW);
  const e = V.subDepotEinhaengen(V.blackboxDateiAusUmschlag(umschlag), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
  return { V, e };
}
async function betreten(V, e) {
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  return V.getData();
}
const altInhalt80 = () => ({ schemaVersion: 80, sektoren: { identitaet: { vorname: 'Hedwig' } }, menschen: [], institutionen: [] });

test('[S5·Positivkontrolle] die Migration selbst hebt den alten Inhalt an — das Beispiel ist richtig gebaut', () => {
  const { V } = ladeKern();
  const d = altInhalt80();
  V.depotNormalisieren(d);
  assert.equal(d.sektoren.identity && d.sektoren.identity.givenName, 'Hedwig');
});

test('[S5] ein Sub-Depot mit altem Inhalt wird beim Betreten migriert wie jedes Depot', async () => {
  const { V, e } = await ankerMitSub(altInhalt80());
  const d = await betreten(V, e);
  assert.equal(d.sektoren.identity && d.sektoren.identity.givenName, 'Hedwig', 'der Vorname steht unter der heutigen Kennung');
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('[S5·Stufe 88] eine Person im Sub-Depot auf Schema 87 zeigt ihr Geburtsdatum nach dem Betreten unter birthDate', async () => {
  const { V, e } = await ankerMitSub({ schemaVersion: 87, sektoren: {}, menschen: [{ id: 'p-sub', name: 'Ida Sub', geburtsdatum: '1940-01-01' }] });
  const p = (await betreten(V, e)).menschen.find((m) => m.id === 'p-sub');
  assert.equal(p.birthDate, '1940-01-01', 'das Geburtsdatum ist für den Kern lesbar: ' + JSON.stringify(p));
  assert.equal('geburtsdatum' in p, false);
  assert.equal(V.personGeburtsjahr(p), 1940);
});

test('[S5·Stufe 88·Sicherung] auch im Sub bleibt ein verdrängter, abweichender Wert in _migrationSicherung88 — und nie im Export', async () => {
  const { V, e } = await ankerMitSub({ schemaVersion: 87, sektoren: {},
    menschen: [{ id: 'p-sub', name: 'Ida Sub', geburtsort: 'Köln', birthPlace: 'Bonn' }] });
  const d = await betreten(V, e);
  assert.deepEqual(d._migrationSicherung88, { schemaVersion: 87, menschen: [{ id: 'p-sub', geburtsort: 'Köln' }] });
  const export_ = JSON.stringify(V.vollExportJSON({ sensibel: false })) + JSON.stringify(V.vollExportJSON({ sensibel: true }));
  assert.equal(export_.includes('_migrationSicherung88'), false, 'die Sicherung verlässt das Sub nicht über den Export');
});

test('[S5·Anker unberührt] Betreten und Verlassen eines alten Subs ändert den Anker nicht — weder seine Daten noch seine Bereiche', async () => {
  const { V, e } = await ankerMitSub(altInhalt80());
  const ankerVorher = V.getData();
  const kopie = (d) => JSON.stringify({ sektoren: d.sektoren, menschen: d.menschen, schemaVersion: d.schemaVersion });
  const datenVorher = kopie(ankerVorher);
  const bereicheVorher = V.bereicheAlle().map((b) => b.id).join(',');
  await betreten(V, e);
  await V.subKontextVerlassen();
  assert.equal(kopie(V.getData()), datenVorher, 'die Daten des Ankers sind nach Betreten und Verlassen dieselben');
  assert.equal(V.bereicheAlle().map((b) => b.id).join(','), bereicheVorher, 'die Bereiche des Ankers sind dieselben');
});

test('[S5·Gegenprobe] ein Sub auf dem aktuellen Schema wird nicht als ungespeichert markiert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Tochter Reiter');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Neu', inhaberin: 'Nina', verwaltungsTyp: 'verwaltet', akzent: 'sand' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  assert.equal(V.getData()._migrationHinweisNoetig, undefined, 'ein aktuelles Sub zeigt keinen Migrationshinweis');
});

/* Klassenwächter: jede Stufe der Stufenliste, die ein Alt-Depot baut, muss auch im Sub ankommen — dieselbe gekoppelte
   Kontrolle wie am Anker (`nachher` wahr nach dem Betreten). Aus der Liste abgeleitet, damit jede neue Stufe mitläuft. */
for (const stufe of STUFEN.filter((s) => typeof s.baue === 'function')) {
  test('[S5·Klasse] Stufe ' + stufe.nach + ' kommt im Sub-Depot an: ' + String(stufe.was).slice(0, 60), async () => {
    const { V, e } = await ankerMitSub(stufe.baue());
    const d = await betreten(V, e);
    assert.ok(stufe.nachher(d), 'Stufe ' + stufe.nach + ' ist im Sub nicht angekommen (nachher falsch)');
  });
}
