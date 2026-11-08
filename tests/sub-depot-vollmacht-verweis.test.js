'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Verweis auf die bestimmte Vollmacht im Sub-Depot (05.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die Website sagt, man könne „vermerken, auf welcher Vollmacht die Sorge beruht“. Gemessen am Kern vor diesem Commit:
   vermerkt wurde nur die Art der Grundlage (RECHTSGRUNDLAGEN_VERTRETUNG), keine bestimmte Vollmacht.

   Jetzt: im geöffneten Sub-Depot lässt sich eine Zeile aus dessen Vollmachten-Liste (Vorsorgevollmacht oder
   Betreuerbestellung) als die Vollmacht benennen. Gespeichert wird nur der Verweis, im versiegelten Inhalt. Die Karte und
   die Vertretungsangabe der Antwort nennen Art und Datum; fehlt die Zeile, bleibt es bei der Art der Grundlage.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const SUB_PW = 'Vollmacht-Sub-2026!';
const ZEILE = { id: 'vm-probe-1', instrument: 'enduring-power-of-attorney', dateOfLastChange: '2025-03-01' };

async function mitOffenemSub() {
  const { V } = ladeKern();
  await V.depotAnlegen('Vollmacht-Anker-2026!');
  V.akteurSelbstErklaeren('Tochter');
  const e = await V.subDepotAnlegen({ vorname: 'Ilse', verwaltungsTyp: 'verwaltet', vertretungsGrundlage: 'vorsorge' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
  const d = V.getData();
  d.sektoren.advanceCare = d.sektoren.advanceCare || {};
  d.sektoren.advanceCare.provisionInstruments = [Object.assign({}, ZEILE), { id: 'pv-probe', instrument: 'living-will' }];
  return { V, e };
}
const DATUM = /01\.03\.2025/;

test('[Vollmacht·Verweis] benannt: Grundlage und Vertretungsangabe nennen Art und Datum der Vollmacht', async () => {
  const { V, e } = await mitOffenemSub();
  const ohne = V.vertretungsGrundlageMitVollmacht(e);
  assert.doesNotMatch(ohne, DATUM, 'ohne Verweis nur die Art');
  assert.equal(V.subDepotVollmachtSetzen(e.depotUUID, ZEILE.id), true);
  assert.equal(V._vertretungsVollmachtLesen(e).ref, ZEILE.id);
  const mit = V.vertretungsGrundlageMitVollmacht(e);
  assert.ok(mit.startsWith(ohne + ' · '), mit);
  assert.match(mit, DATUM);
  assert.match(V.anlassVertretung().eigenschaftText, DATUM, 'die Antwort nennt sie');
});

test('[Vollmacht·Verweis] nur Vorsorgevollmacht oder Betreuerbestellung, nur vorhandene Zeilen; leer löscht', async () => {
  const { V, e } = await mitOffenemSub();
  assert.equal(V.subDepotVollmachtSetzen(e.depotUUID, 'pv-probe'), false, 'eine Patientenverfügung ist keine Vollmacht');
  assert.equal(V.subDepotVollmachtSetzen(e.depotUUID, 'gibt-es-nicht'), false);
  assert.equal(V.subDepotVollmachtSetzen(e.depotUUID, ZEILE.id), true);
  assert.equal(V.subDepotVollmachtSetzen(e.depotUUID, ''), true);
  assert.equal(V._vertretungsVollmachtLesen(e), null);
});

test('[Vollmacht·Verweis] die Zeile ist weg: es bleibt bei der Art, nichts geraten', async () => {
  const { V, e } = await mitOffenemSub();
  V.subDepotVollmachtSetzen(e.depotUUID, ZEILE.id);
  V.getData().sektoren.advanceCare.provisionInstruments.shift();
  assert.equal(V._vertretungsVollmachtLesen(e), null);
  assert.doesNotMatch(V.vertretungsGrundlageMitVollmacht(e), DATUM);
});

test('[Vollmacht·Verweis] der Verweis liegt versiegelt und bleibt nach dem Neu-Versiegeln', async () => {
  const { V, e } = await mitOffenemSub();
  V.subDepotVollmachtSetzen(e.depotUUID, ZEILE.id);
  const klartext = Object.assign({}, e); delete klartext.umschlag;
  assert.ok(!JSON.stringify(klartext).includes(ZEILE.id), 'nicht im Klartext des Ankers');
  await V.subKontextVerlassen();
  await V.subDepotNeuVersiegeln(e.depotUUID);
  V.subDepotVertrauenSchliessen(e.depotUUID);
  assert.equal(V._vertretungsVollmachtLesen(e), null, 'geschlossen nicht lesbar');
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  assert.equal((V._vertretungsVollmachtLesen(e) || {}).ref, ZEILE.id);
});

test('[Vollmacht·Auswahl] die Auswahl trägt leer zuerst, dann nur die Vollmacht-Zeilen, die benannte vorgewählt', async () => {
  const { V, e } = await mitOffenemSub();
  V.subDepotVollmachtSetzen(e.depotUUID, ZEILE.id);
  const optionen = [];
  V._vollmachtAuswahlFuellen({ appendChild: (o) => optionen.push(o) }, e);
  assert.deepEqual(optionen.map((o) => o.value), ['', ZEILE.id]);
  assert.equal(optionen.filter((o) => o.selected === true).map((o) => o.value).join(), ZEILE.id);
  assert.match(optionen[1].textContent, DATUM);
});

test('[Vollmacht·Karte] die geöffnete Karte zeigt die Grundlage mit Vollmacht und trägt die Auswahl', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const i = kern.indexOf('\nfunction renderVerwalteteDepots(');
  assert.ok(i > 0);
  const rumpf = kern.slice(i, kern.indexOf('\n}\n', i));
  assert.match(rumpf, /metaZeile\(STRINGS\.grundlageLabel, escapeHTML\(vertretungsGrundlageMitVollmacht\(e\)\)\)/);
  assert.match(rumpf, /data-vollmacht-wahl=/);
  assert.match(rumpf, /_vollmachtAuswahlFuellen\(sel, e\)/);
});

/* Rot-Beweis: der Kern vor diesem Commit kannte keinen Verweis — die Vertretungsangabe trug nur die Art. Nachgestellt mit
   einem Sub-Depot ohne Verweis: die Prüfung der ersten Probe fällt dort. */
test('[Vollmacht·Rot-Beweis] eine Vertretungsangabe ohne Datum der Vollmacht fällt in der Probe', async () => {
  const { V } = await mitOffenemSub();
  assert.throws(() => assert.match(V.anlassVertretung().eigenschaftText, DATUM), /did not match|match/);
});
