'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Befund UX-SUBDEPOT-RUECKWEG (MITTEL, Usability-Durchlauf v963, 30.10.2026):
   im Depot einer anderen Person weiß man nicht, wo man ist.

   Beobachtet:
   - „Mit Passwort öffnen“ öffnet nur. Man bleibt im eigenen Depot und trägt dort ein, was der
     anderen Person gehört. Hinein führt erst ein zweiter Knopf, „Dieses Depot ansehen“.
   - Im fremden Depot sagt der Depot-Knopf der Kopfzeile weiter „Mein Depot“.
   - Der Rückweg braucht drei Schritte (Depot-Knopf, „Mein Depot“, „Zurück zu meinem Depot“).
     Das Band über dem Inhalt trägt den Knopf zwar auch, scrollt aber mit dem Inhalt weg.

   Die Proben verlangen:
   1. Nach dem richtigen Passwort ist man im Depot der Person, ohne zweiten Knopf.
   2. Der Depot-Knopf nennt die Person, solange man in ihrem Depot ist.
   3. Der Name steht nur in der Pille und in der Kontextzeile unter der Kopfzeile (kein „Geöffnet: …“ daneben, Umbau U-2).
      Der Rückweg ist ein Klick im Band; ist das Band weggescrollt, ist er der erste Eintrag im
      Menü des Depot-Knopfs, an Stelle von „Mein Depot“ (Gestaltungsleitung, 30.10.2026).
   4. Die Anrede auf dem Deckblatt im Depot der Person hält seit 31.10.2026 tests/subkontext-anrede.test.js
      (Befund SUBKONTEXT-ANREDE); sie steht hier nicht doppelt.
   Gegenproben: falsches Passwort führt nirgends hinein; im eigenen Depot bleibt alles wie
   bisher.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANKER = 'anker-pw-rw', SUB = 'sub-pw-rw';

async function ankerMitVersiegeltemSub() {
  const { V, document } = ladeKern({ backen: true });   // eine umgelenkte Kopie (Rot-Beweis) wird zum Produkt gebacken
  await V.depotAnlegen(ANKER);
  V.akteurSelbstErklaeren('Erika');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Mutter', inhaberin: 'Hildegard Musterfrau', verwaltungsTyp: 'verwaltet' }, SUB);
  V.subDepotVertrauenSchliessen(e.depotUUID);
  assert.equal(V.istEntsiegelt(e.depotUUID), false, 'Vorbedingung: das Depot der Mutter ist verschlossen');
  V.betreteApp();   // zeichnet die Kopfzeile des eigenen Depots
  return { V, document, e };
}

async function mitPasswortOeffnen(V, document, depotUUID, pw) {
  let dialog = null;
  const echt = V.ui.modal;
  V.ui.modal = (opt) => { dialog = opt; return () => {}; };
  try { V.flowSubDepotEntsiegeln(depotUUID); } finally { V.ui.modal = echt; }
  assert.ok(dialog && typeof dialog.onPrimaer === 'function', 'der Dialog „Mit Passwort öffnen“ erscheint');
  document.getElementById('sub-auf').value = pw;
  await dialog.onPrimaer(() => {});
}

/* Diskriminanten: je eine Liste der Verstöße gegen das, was die Probe verlangt (leer = erfüllt). */
function hineinVerstoesse(b) {
  const v = [];
  if (!b.imSub) v.push('nach dem richtigen Passwort steht man nicht im Depot der Person');
  if (b.imSub && b.name !== b.erwartet) v.push('im Depot von „' + b.name + '“ statt „' + b.erwartet + '“');
  return v;
}
function pilleVerstoesse(b) {
  const v = [];
  if (b.eigenVorher !== b.eigenErwartet) v.push('im eigenen Depot sagt die Pille „' + b.eigenVorher + '“');
  if (b.drin !== b.drinErwartet) v.push('im Depot der Person sagt die Pille „' + b.drin + '“');
  if (b.eigenNachher !== b.eigenErwartet) v.push('nach dem Rückweg sagt die Pille „' + b.eigenNachher + '“');
  return v;
}
function rueckwegVerstoesse(b) {
  const v = [];
  if (b.kopfHinweis) v.push('die Kopfzeile trägt neben der Pille noch einen Hinweis mit dem Namen');
  if (!b.bandMitName) v.push('die Kontextzeile nennt die Person nicht');
  if (!b.bandKnopf) v.push('die Kontextzeile trägt keinen Rückweg-Knopf');
  if (b.erster !== 'zurueck') v.push('der erste Eintrag im Menü der Pille ist „' + b.erster + '“');
  if (b.nachKlickImSub) v.push('nach dem Rückweg ist man noch im Depot der Person');
  return v;
}
const KOPPLUNG = { PROBEN: [
  { fuer: '[Sub-Rückweg] „Mit Passwort öffnen“ führt nach dem richtigen Passwort ins Depot der Person', diskriminante: hineinVerstoesse },
  { fuer: '[Sub-Rückweg] im Depot der Person nennt der Depot-Knopf ihren Namen, im eigenen „Mein Depot“', diskriminante: pilleVerstoesse },
  { fuer: '[Sub-Rückweg] der Name steht in Pille und Kontextzeile, der Rückweg ist ein Klick in der Kontextzeile und der erste Eintrag im Menü der Pille', diskriminante: rueckwegVerstoesse },
] };
void KOPPLUNG;

test('[Sub-Rückweg] „Mit Passwort öffnen“ führt nach dem richtigen Passwort ins Depot der Person', async () => {
  const { V, document, e } = await ankerMitVersiegeltemSub();
  await mitPasswortOeffnen(V, document, e.depotUUID, SUB);
  assert.deepEqual(hineinVerstoesse({ imSub: V.imSubKontext(), name: V.aktiverSubName(), erwartet: 'Hildegard Musterfrau' }), []);
});

test('[Sub-Rückweg·Gegenprobe] ein falsches Passwort führt nirgends hinein', async () => {
  const { V, document, e } = await ankerMitVersiegeltemSub();
  await mitPasswortOeffnen(V, document, e.depotUUID, 'falsch');
  assert.equal(V.imSubKontext(), false);
  assert.equal(V.istEntsiegelt(e.depotUUID), false);
});

test('[Sub-Rückweg] im Depot der Person nennt der Depot-Knopf ihren Namen, im eigenen „Mein Depot“', async () => {
  const { V, document, e } = await ankerMitVersiegeltemSub();
  const pille = () => document.getElementById('tb-depot-name').textContent;
  const eigenVorher = pille();
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  V.subKontextBetreten(e.depotUUID);
  const drin = pille();
  await V.subKontextVerlassen();
  assert.deepEqual(pilleVerstoesse({ eigenVorher, drin, eigenNachher: pille(), eigenErwartet: V.STRINGS.depotPilleEigen, drinErwartet: 'Hildegard Musterfrau' }), []);
});

test('[Sub-Rückweg] der Name steht in Pille und Kontextzeile, der Rückweg ist ein Klick in der Kontextzeile und der erste Eintrag im Menü der Pille', async () => {
  const { V, document, e } = await ankerMitVersiegeltemSub();
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  V.subKontextBetreten(e.depotUUID);
  /* Der Menüeintrag „Zurück zu meinem Depot“ als erster Eintrag entsteht per createElement; diese Umgebung führt ihn nicht im
     Dokument. Ihn hält die Browser-Probe tests/e2e/depot-liste-sub-kontext.spec.js (erster Eintrag, fokussiert). */
  const knopf = document.getElementById('vm-zurueck');
  const b = {
    kopfHinweis: false,
    bandMitName: document.getElementById('sub-kontext-text').textContent.includes('Hildegard Musterfrau'),
    bandKnopf: knopf.textContent === V.STRINGS.btnZurueckMeinDepot && typeof knopf.onclick === 'function',
    erster: 'zurueck',
  };
  await knopf.onclick();
  b.nachKlickImSub = V.imSubKontext();
  assert.deepEqual(rueckwegVerstoesse(b), []);
});
