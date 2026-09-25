'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kern-Spiegel von kennungen-umschreiben.test.js — Grund-Parität
   ────────────────────────────────────────────────────────────────────────
   `tools/lib/kennungen-umschreiben.js` ist die Nicht-Kern-Vorarbeit; dieses
   Modul (`_sektorenKennungenUmschreiben` in vivodepot.html) ist das Kern-
   native Duplikat, weil der Kern nicht requiren kann. Dieselben Proben,
   gegen die ECHTE eingebackene KENNUNG_MAPPING-Region -- ein Fund hier hätte
   bedeutet, dass die Region veraltet ist oder das Kern-Duplikat vom
   Original abweicht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Kennungen-Umschreiben·Kern] ein einfaches Skalar-Feld wird umbenannt', () => {
  const { V } = ladeKern();
  const alt = { identitaet: { vorname: 'Elisabeth', nachname: 'Wredenhagen-Sonnenschein' } };
  const neu = V._sektorenKennungenUmschreiben(alt, V.KENNUNG_MAPPING);
  assert.deepEqual(neu, { identity: { givenName: 'Elisabeth', familyName: 'Wredenhagen-Sonnenschein' } });
});

test('[Kennungen-Umschreiben·Kern] Original wird NICHT mutiert', () => {
  const { V } = ladeKern();
  const alt = { identitaet: { vorname: 'Elisabeth' } };
  const kopie = JSON.parse(JSON.stringify(alt));
  V._sektorenKennungenUmschreiben(alt, V.KENNUNG_MAPPING);
  assert.deepEqual(alt, kopie);
});

test('[Kennungen-Umschreiben·Kern] ein Listenfeld (ausweis) wird umbenannt UND jedes Element wird umgeschrieben', () => {
  const { V } = ladeKern();
  const alt = { identitaet: { ausweis: [
    { system: 'DE', nr: 'T11XXXXX3', ausgestellt: '2011-06-01', gueltig: '2021-06-01' },
  ] } };
  const neu = V._sektorenKennungenUmschreiben(alt, V.KENNUNG_MAPPING);
  const name = Object.keys(neu.identity)[0];
  assert.notEqual(name, 'ausweis');
  assert.ok(!('nr' in neu.identity[name][0]));
  assert.equal(neu.identity[name][0].documentNumber, 'T11XXXXX3');
});

test('[Kennungen-Umschreiben·Kern·Rot-Beweis] ein unbekanntes Feld bleibt unverändert', () => {
  const { V } = ladeKern();
  const alt = { identitaet: { einErfundenesFeld: 'bleibt' } };
  const neu = V._sektorenKennungenUmschreiben(alt, V.KENNUNG_MAPPING);
  assert.deepEqual(neu, { identity: { einErfundenesFeld: 'bleibt' } });
});

test('[Kennungen-Umschreiben·Kern] Grund-Parität mit der Nicht-Kern-Vorarbeit: identisches Ergebnis für dasselbe Depot-Fragment', () => {
  const { V } = ladeKern();
  const { sektorenUmschreiben } = require('../tools/lib/kennungen-umschreiben.js');
  const alt = {
    identitaet: {
      vorname: 'Test', ausweis: [{ system: 'DE', nr: 'X1', ausgestellt: '2020-01-01', gueltig: '2030-01-01' }],
    },
    finanzen: { steuerid: '12345' },
  };
  const kernErgebnis = V._sektorenKennungenUmschreiben(alt, V.KENNUNG_MAPPING);
  const vorarbeitErgebnis = sektorenUmschreiben(alt, V.KENNUNG_MAPPING);
  assert.deepEqual(kernErgebnis, vorarbeitErgebnis,
    'Kern-Duplikat und Nicht-Kern-Vorarbeit müssen für dieselbe Eingabe dasselbe liefern -- sonst sind es zwei Wahrheiten');
});
