'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Wahl statt Schalter, Sub-Depot (16.10.2026): ein Modul, das in einer Depot-Datei mitreist, wirkt erst, wenn die Person
   es in dieser Sitzung ausdrücklich wählt. `depotLaden` markiert die mitgereisten Module, BEVOR ein Register sie anmeldet.
   Ein Sub-Depot ist ein Depot wie jedes andere (U2-ADR-002): sein Inhalt kommt aus einem versiegelten Umschlag, den
   jemand anderes geschrieben haben kann, und `subKontextBetreten` meldet seine Module in denselben Registern an. Ohne
   Markierung dort wirkte ein im Sub mitgereistes Modul ohne jede Wahl.

   Beobachtet wird ein unsigniertes Textsatz-Modul mit einem gewöhnlichen Text (`strings:fussQuellcode.text`) — derselbe
   Messpunkt wie in der Probe [Sperre·Weg 2].

   Rot-Beweis: [Wahl·Sub-Depot] ist rot, solange `subKontextBetreten` `_depotModuleNichtGewaehltMarkieren` nicht ruft.
   Positivkontrolle: [Wahl·Sub-Depot·Gegenprobe] — das Modul ist gültig und wirkt nach der Wahl (das Beispiel ist richtig
   gebaut). [Wahl·Sub-Depot·Anker bleibt] hält fest, dass das Betreten die Wahl-Lage des Ankers nicht neu beginnt.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PRODUKT = 'privat-de';
const ANKER_PW = 'wahl-sub-anker-pw-2026!';
const SUB_PW = 'wahl-sub-sub-pw-2026!';
const MESSPUNKT = 'strings:fussQuellcode.text';

const fremdesModul = (kennung) => ({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fr', herkunft: kennung || 'wahl-sub-probe',
  texte: { [MESSPUNKT]: 'MITGEREIST-WAHL-PROBE' } });

async function ankerMitSub(V, subInhalt) {
  const umschlag = await V.subDepotVersiegeln(subInhalt, SUB_PW);
  return V.subDepotEinhaengen(V.blackboxDateiAusUmschlag(umschlag), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
}
const subInhalt = (V) => ({ schemaVersion: V.SCHEMA_VERSION_AKTUELL, sektoren: {}, menschen: [], institutionen: [],
  textsprache: 'fr', textsatzModule: [fremdesModul()] });

async function betreten(V, e) {
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
  V.subKontextBetreten(e.depotUUID);
}

test('[Wahl·Sub-Depot] ein mitgereistes Modul eines Sub-Depots wirkt nach dem Betreten erst nach Wahl', async () => {
  const { V } = ladeKern({ produkt: PRODUKT });
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Tochter Reiter');
  const e = await ankerMitSub(V, subInhalt(V));
  await betreten(V, e);
  assert.equal(V.imSubKontext(), true, 'Vorbedingung: im Sub-Kontext');
  assert.equal((V.getData().textsatzModule || []).length, 1, 'Vorbedingung: das Sub trägt das Modul');
  assert.notEqual(V.textLesen(MESSPUNKT), 'MITGEREIST-WAHL-PROBE', 'ohne Wahl wirkt das Modul des Subs nicht');
  assert.deepEqual(V.nichtGewaehlteDepotModule().map((g) => g.typ), ['textsatz'],
    'das mitgereiste Modul des Subs steht zur Wahl');
});

test('[Wahl·Sub-Depot·Gegenprobe] nach der Wahl wirkt dasselbe Modul im Sub — das Beispiel ist richtig gebaut', async () => {
  const { V } = ladeKern({ produkt: PRODUKT });
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Tochter Reiter');
  const e = await ankerMitSub(V, subInhalt(V));
  await betreten(V, e);
  const modul = V.getData().textsatzModule[0];
  V.depotModuleWaehlen([modul]);
  assert.deepEqual(V.nichtGewaehlteDepotModule(), [], 'nach der Wahl steht nichts mehr zur Wahl');
  assert.equal(V.textLesen(MESSPUNKT), 'MITGEREIST-WAHL-PROBE', 'gewählt: der gewöhnliche Text kommt aus dem Modul des Subs');
});

test('[Wahl·Sub-Depot·Anker bleibt] Betreten und Verlassen beginnt die Wahl des Ankers nicht neu', async () => {
  /* Ein Anker, geöffnet mit einem eigenen nicht gewählten Modul: nach Betreten und Verlassen des Subs steht es weiter zur
     Wahl. Hält eine Markierung beim Betreten fest, die additiv ist (nicht `neu`), sonst wirkte das Anker-Modul danach. */
  const Q = ladeKern({ produkt: PRODUKT }).V;
  await Q.depotAnlegen(ANKER_PW);
  Q.akteurSelbstErklaeren('Tochter Reiter');
  const e = await ankerMitSub(Q, subInhalt(Q));
  const d = JSON.parse(JSON.stringify(Q.getData()));
  d.textsatzModule = (d.textsatzModule || []).concat([fremdesModul('wahl-sub-anker')]);
  d.textsprache = 'fr';
  Q.setData(d);
  const umschlag = await Q.depotSerialisieren();
  const V = ladeKern({ produkt: PRODUKT }).V;
  await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), ANKER_PW);
  assert.equal(V.nichtGewaehlteDepotModule().length, 1, 'Vorbedingung: das Anker-Modul steht zur Wahl');
  await betreten(V, e);
  await V.subKontextVerlassen();
  assert.equal(V.imSubKontext(), false, 'Vorbedingung: zurück im Anker');
  assert.equal(V.nichtGewaehlteDepotModule().length, 1, 'das Anker-Modul steht nach dem Verlassen weiter zur Wahl');
  assert.notEqual(V.textLesen(MESSPUNKT), 'MITGEREIST-WAHL-PROBE', 'und wirkt im Anker weiterhin nicht');
});
