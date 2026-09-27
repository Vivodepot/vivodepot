'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-059 — Fachpfad-Schnitt
   ────────────────────────────────────────────────────────────────────────
   `provider-credential` + `vivodepot-beta` sind kategorie:'depot', content-
   geroutet, ohne sektorId-Bezug → immer Fachtür. Sie gehören NICHT in den
   Bürger-Bereich-Einlese-Chooser. Markiert mit `fachpfad:true`, im Chooser
   herausgefiltert; sie bleiben als Formate bestehen (über „Ganzes Depot —
   automatisch erkennen" erreichbar). json (Backup-Restore) bleibt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frisch() { const k = ladeKern(); await k.V.depotAnlegen(PW); k.V.betreteApp(); return k; }
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;

test('Fachpfade sind markiert (fachpfad:true); json ist KEIN Fachpfad', () => {
  const { V } = ladeKern();
  assert.equal(V.IMPORT_FORMAT_BY_ID['provider-credential'].fachpfad, true);
  assert.equal(V.IMPORT_FORMAT_BY_ID['vivodepot-beta'].fachpfad, true);
  assert.ok(!V.IMPORT_FORMAT_BY_ID['json'].fachpfad, 'json ist kein Fachpfad');
});

test('Bereich-Einlese-Chooser: keine Fachpfade, aber bereichseigenes Format + json', async () => {
  const { V, document } = await frisch();
  V.flowEinlesen('finance');
  const box = modal(document);
  assert.ok(!box.includes('data-i-format="provider-credential"'), 'kein provider-credential im Bereich-Chooser');
  assert.ok(!box.includes('data-i-format="vivodepot-beta"'), 'kein vivodepot-beta im Bereich-Chooser');
  assert.ok(box.includes('data-i-format="sd-jwt-vc-finanzen"'), 'bereichseigenes Finanz-Format bleibt');
  assert.ok(box.includes('data-i-format="json"'), 'json (Backup-Restore) bleibt');
});

test('Fachpfade bleiben als Formate bestehen (nur aus dem Chooser gefiltert, nicht gelöscht)', () => {
  const { V } = ladeKern();
  assert.ok(V.IMPORT_FORMATE.some(f => f.id === 'provider-credential'), 'provider-credential existiert weiter');
  assert.ok(V.IMPORT_FORMATE.some(f => f.id === 'vivodepot-beta'), 'vivodepot-beta existiert weiter');
  // importFormateFuerSektor (UNgefiltert) enthält sie weiter — der Filter sitzt allein im Bürger-Chooser (flowEinlesen).
  assert.ok(V.importFormateFuerSektor('finance').some(f => f.id === 'provider-credential'), 'unfiltriert weiter erreichbar');
});
