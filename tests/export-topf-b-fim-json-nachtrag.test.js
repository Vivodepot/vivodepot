'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Verlustwege-Zug 2 (03.09.2026): `EXPORT_TOPF_B_FELDER` fehlte für
   `fim-json` ganz. `fimVerwaltung()` teilt mit `xoevVerwaltung()` dieselbe
   Mapping-Tabelle (`XOEV_VERWALTUNG_MAPPING`, sektor `verwaltung`) und damit
   dieselben 19 ungedeckten Felder (W-10-Werkzeug, `tools/w10-export-mapping-
   luecken-pruefen.js`, „xoev-fim-verwaltung: 5/24 gedeckt"). Ohne den Eintrag
   zeigte „Das wird herausgegeben" diese Felder für FIM als angekreuzt/
   enthalten — eine Bürgerin hätte geglaubt, sie mitzugeben, obwohl der
   Builder sie nie schreibt. DIE REPARATUR ÄNDERT DEN EXPORT NICHT: nur die
   Übersicht (`formatOhneZiel`) sagt jetzt, was vorher schon galt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

async function depotMitKrypto() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('administration', 'cryptoWalletsOverview', 'Ledger Nano, im Safe');
  return V;
}

test('[Verlustwege·Zug2·Rot-Beweis] fim-json: „Das wird herausgegeben" zeigt ein Topf-B-Feld jetzt als nicht abbildbar', async () => {
  const V = await depotMitKrypto();
  const m = V.exportUebersichtModell(null, 'fim-json');
  const e = [...m.enthalten, ...m.zurueckgehalten].find(x => x.feld === 'cryptoWalletsOverview');
  assert.ok(e, 'ohne die Auflösung wird die Zeile gar nicht erst erreicht');
  assert.equal(e.formatOhneZiel, true,
    'vorher fehlte der EXPORT_TOPF_B_FELDER-Eintrag für fim-json — die Zeile stand unmarkiert und wirkte enthalten');
});

test('[Verlustwege·Zug2] fim-json und xoev-verwaltung tragen dieselbe Topf-B-Menge (eine Mapping-Tabelle, eine Lücke)', async () => {
  const V = await depotMitKrypto();
  const fim = V.exportUebersichtModell(null, 'fim-json');
  const xoev = V.exportUebersichtModell(null, 'xoev-verwaltung');
  const fimFlag = [...fim.enthalten, ...fim.zurueckgehalten].find(x => x.feld === 'cryptoWalletsOverview').formatOhneZiel;
  const xoevFlag = [...xoev.enthalten, ...xoev.zurueckgehalten].find(x => x.feld === 'cryptoWalletsOverview').formatOhneZiel;
  assert.equal(fimFlag, xoevFlag, 'kein zweiter, driftender Datensatz für dieselbe Lücke');
});

test('[Verlustwege·Zug2] der Export selbst ist unverändert — krypto war vorher schon nicht dabei, ist es weiterhin nicht', async () => {
  const V = await depotMitKrypto();
  const bau = V.fimVerwaltung({});
  assert.equal(Object.prototype.hasOwnProperty.call(bau.stammdaten, 'krypto'), false,
    'die Reparatur betrifft nur die Übersicht — der Builder liest weiterhin dieselbe Mapping-Tabelle');
});

test('[Verlustwege·Zug2] ein gedecktes Feld bleibt für fim-json ohne formatOhneZiel', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('administration', 'mainEmailAddress', 'maria@example.de');
  const m = V.exportUebersichtModell(null, 'fim-json');
  const e = [...m.enthalten, ...m.zurueckgehalten].find(x => x.feld === 'mainEmailAddress');
  assert.ok(e, 'email_haupt ist in XOEV_VERWALTUNG_MAPPING gemappt');
  assert.equal(e.formatOhneZiel, false, 'ein gedecktes Feld darf durch die Reparatur nicht neu ausgeschlossen wirken');
});
