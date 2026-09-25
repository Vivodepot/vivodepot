'use strict';
/* ════════════════════════════════════════════════════════════════════════
   export-drei-erzeuger-ohne-opt.test.js — „Herausgabe ohne Auswahl" (13.08.2026), Zug 1
   ────────────────────────────────────────────────────────────────────────
   Befund: drei EXPORT_FORMATE-Einträge (vcard-identitaet, vcard-menschen, ics-vorsorge) hatten
   `baue: () => …` — keinen Parameter, die Auswahl aus dem Herausgabe-Dialog konnte den Erzeuger
   strukturell nie erreichen.

   Frisch gemessen (Regel 23), NICHT wie im Auftrag angenommen für alle drei gleich:
   - `vcardIdentitaet()` liest `feldIstSensibel()` je Feld — das ist die GLOBALE, live gelesene
     `data.sensibelFelder`-Landkarte, die `exportAuswahlEphemerAnwenden()` VOR dem baue()-Aufruf
     mutiert. Ein abgewähltes Feld fehlt darum schon heute in der Karte — empirisch am gefüllten
     Depot geprüft (TEL abgewählt → fehlt in der Karte, nach dem Dialog wiederhergestellt). Der
     Dialog bleibt darum FUNKTIONAL korrekt, auch ohne dass `opt` den Erzeuger je erreicht.
   - `vcardMenschen()` liest `data.menschen[]` direkt — kein Feld dort trägt je eine Sensibel-
     Markierung, der Dialog zeigt Sektor-Felder aus `meine-menschen`, die der Erzeuger nie liest.
   - `icsKalender()` liest `data.dokumente` über `prueftermineDokumente()` — der Dialog zeigt
     Sektor-Felder aus `vorsorge`, eine völlig andere Datenquelle als das, was exportiert wird.

   Für die beiden echt kaputten Formate ist die ehrlichere Zwischenlösung (Auftragstext, Zug 1):
   den Dialog für DIESES Format gar nicht erst zu zeigen, statt eine Auswahl zu behaupten, die
   nichts bewirkt (`ohneAuswahl`-Flag). `vcard-identitaet` bleibt unverändert — der Dialog gilt
   dort weiter, weil er bereits wirkt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  k.V.betreteApp();
  return k;
}

test('jeder EXPORT_FORMATE-Eintrag: baue nimmt genau einen Parameter (opt) entgegen', async () => {
  const { V } = await frischMitDepot();
  for (const def of V.EXPORT_FORMATE) {
    assert.equal(def.baue.length, 1, def.id + ': baue(' + def.baue.length + ' Parameter) — Auswahl kann den Erzeuger nicht erreichen');
  }
});

test('vcard-menschen und ics-vorsorge tragen ohneAuswahl; vcard-identitaet nicht (Dialog wirkt dort bereits)', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.EXPORT_FORMAT_BY_ID['vcard-menschen'].ohneAuswahl, true);
  assert.equal(V.EXPORT_FORMAT_BY_ID['ics-vorsorge'].ohneAuswahl, true);
  assert.ok(!V.EXPORT_FORMAT_BY_ID['vcard-identitaet'].ohneAuswahl, 'vcard-identitaet braucht den Dialog nicht zu überspringen');
});

test('vcard-menschen: flowFormatExport ohne optionen zeigt KEINEN Auswahldialog', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('people', 'careLeaveFamilyCareLeave', 'x'); // Dialog-Kandidat, falls Dialog liefe
  const box = document.getElementById('modal-inhalt');
  box.innerHTML = '__SENTINEL__';
  assert.doesNotThrow(() => V.flowFormatExport('vcard-menschen'));
  assert.equal(box.innerHTML, '__SENTINEL__', 'kein Dialog — modal-inhalt bleibt unberührt');
});

test('ics-vorsorge: flowFormatExport ohne optionen zeigt KEINEN Auswahldialog', async () => {
  const { V, document } = await frischMitDepot();
  const box = document.getElementById('modal-inhalt');
  box.innerHTML = '__SENTINEL__';
  assert.doesNotThrow(() => V.flowFormatExport('ics-vorsorge'));
  assert.equal(box.innerHTML, '__SENTINEL__', 'kein Dialog — modal-inhalt bleibt unberührt');
});

test('vcard-identitaet: flowFormatExport ohne optionen zeigt weiterhin den Auswahldialog (Regression)', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  assert.doesNotThrow(() => V.flowFormatExport('vcard-identitaet'));
  const html = document.getElementById('modal-inhalt').innerHTML;
  assert.ok(html.includes('data-feld="givenName"'), 'Dialog zeigt weiterhin die Feld-Auswahl');
});

test('vcard-menschen: Direktaufruf mit optionen (Test/Skript) überspringt den Dialog wie bisher', async () => {
  const { V } = await frischMitDepot();
  assert.doesNotThrow(() => V.flowFormatExport('vcard-menschen', {}));
});
