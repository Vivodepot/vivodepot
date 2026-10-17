'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Depot mit mehr als vier Sub-Depots öffnet und importiert vollständig
   (Abnahme-Teil zu SUB-DEPOT-OBERGRENZE-NICHT-DURCHGESETZT, 16.10.2026)
   ────────────────────────────────────────────────────────────────────────
   B16-ADR-052 nennt null bis vier Sub-Depots, der Kern setzt keine Grenze durch. Ob die Vier künftig beim Anlegen gilt
   oder eine Empfehlung bleibt, entscheidet die Produktverantwortung. In beiden Fällen gilt: eine Datei, die mehr als vier
   Sub-Depots trägt, geht vollständig auf, und nichts wird verworfen — sonst würde aus einer Grenze ein Datenverlust.

   Gehalten an zwei Wegen: Speichern und Wiederöffnen (depotSerialisieren → depotLaden) mit sechs Sub-Depots, und das
   Einhängen einer Übergabe-Datei als sechstes Sub-Depot. Jedes Sub-Depot öffnet danach mit seinem eigenen Passwort.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANKER = 'mehr-als-vier-anker-731';
const ANZAHL = 6;
const subPw = (i) => 'mehr-als-vier-sub-' + i + '-pw';

async function ankerMitSubDepots(n) {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER);
  V.akteurSelbstErklaeren('Verwalterin');
  const uuids = [];
  for (let i = 1; i <= n; i++) {
    const e = await V.subDepotAnlegen({ vorname: 'Person' + i, nachname: 'Probe', verwaltungsTyp: 'verwaltet' }, subPw(i));
    uuids.push(e.depotUUID);
  }
  return { V, uuids };
}

/** Wieder öffnen und prüfen, dass jedes Sub-Depot da ist und mit seinem Passwort aufgeht. `nachLaden` greift für den
    Rot-Beweis zwischen Laden und Prüfen ein, so wie ein Kern, der beim Öffnen verwirft. */
async function wiederOeffnenUndPruefen(umschlag, uuids, nachLaden = () => {}) {
  const { V: V2 } = ladeKern();
  await V2.depotLaden(umschlag, ANKER);
  nachLaden(V2.getData());
  const liste = V2.getData().verwalteteDepots || [];
  assert.deepEqual(liste.map((e) => e.depotUUID), uuids, 'nach dem Wiederöffnen fehlen Sub-Depots oder ihre Reihenfolge ist anders');
  for (let i = 0; i < uuids.length; i++) {
    await V2.subDepotVertrauenOeffnen(liste[i].depotUUID, subPw(i + 1));   // wirft, wenn ein Sub-Depot nicht mehr aufgeht
  }
}

test('[Sub-Depot·mehr als vier] sechs Sub-Depots: speichern, wieder öffnen, alle sechs da und jedes öffnet mit eigenem Passwort', async () => {
  const { V, uuids } = await ankerMitSubDepots(ANZAHL);
  await wiederOeffnenUndPruefen(await V.depotSerialisieren(), uuids);
});

test('[Sub-Depot·mehr als vier·Rot-Beweis] verwürfe das Öffnen ab dem fünften Sub-Depot, fiele die Probe', async () => {
  const { V, uuids } = await ankerMitSubDepots(ANZAHL);
  const umschlag = await V.depotSerialisieren();
  await assert.rejects(
    () => wiederOeffnenUndPruefen(umschlag, uuids, (d) => { d.verwalteteDepots = d.verwalteteDepots.slice(0, 4); }),
    /fehlen Sub-Depots/);
});

test('[Sub-Depot·mehr als vier] eine Übergabe-Datei wird als sechstes Sub-Depot eingehängt, nicht abgewiesen', async () => {
  const quelle = await ankerMitSubDepots(1);
  const datei = quelle.V.subDepotBlackboxExportieren(quelle.uuids[0]);
  const { V } = await ankerMitSubDepots(5);
  V.subDepotEinhaengen(datei, { bezeichnung: 'Eingehängt', inhaberin: 'Person' });
  const liste = V.getData().verwalteteDepots || [];
  assert.equal(liste.length, 6, 'das sechste Sub-Depot wurde nicht eingehängt');
  assert.ok(liste.some((e) => e.depotUUID === quelle.uuids[0]));
});
