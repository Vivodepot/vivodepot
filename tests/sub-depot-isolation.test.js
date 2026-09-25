'use strict';
/* Test 2 — KLASSE-A (DSGVO-kritisch, muss vor jedem Commit grün sein)
   Sub-Depot-Isolation: Das Anker-Passwort der verwaltenden Person öffnet ein
   Sub-Depot NICHT. (U2-ADR-003 / U2-ADR-004; vgl. A-08, C-A-02) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ANKER_PW = 'anker-master-geheim';
const SUB_PW = 'sub-eigenes-geheim';

test('[Klasse-A] Sub-Depot-Isolation: eigenes Passwort öffnet, Anker-Passwort nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Mutter', inhaberin: 'Erika', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  const aufStick = JSON.parse(JSON.stringify(eintrag.umschlag));

  // Eigenes Passwort öffnet.
  const { inhalt } = await V.subDepotEntsiegeln(aufStick, SUB_PW);
  assert.equal(inhalt.verwaltungsTyp, 'verwaltet', 'eigenes Passwort entschlüsselt den Inhalt');

  // Anker-Passwort öffnet NICHT.
  await assert.rejects(() => V.subDepotEntsiegeln(aufStick, ANKER_PW),
    'Anker-Passwort darf das Sub-Depot nicht öffnen');
});

test('[Klasse-A] Sub-Depot-Isolation: Vertrauens-Modus mit Anker-PW füllt die RAM-Map nicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER_PW);
  const eintrag = await V.subDepotAnlegen(
    { bezeichnung: 'Depot Mutter', inhaberin: 'Erika', verwaltungsTyp: 'verwaltet' }, SUB_PW);

  await assert.rejects(() => V.subDepotVertrauenOeffnen(eintrag.depotUUID, ANKER_PW),
    'falsches (Anker-)Passwort muss werfen');
  assert.equal(V.istEntsiegelt(eintrag.depotUUID), false, 'RAM-Map bleibt leer nach Fehlversuch');
});
