'use strict';
/* ════════════════════════════════════════════════════════════════════════
   b16-migrations-knopf.test.js — benannter Einstieg für die B16-Migration
   an der zentralen "Wohin einlesen?"-Tür
   ────────────────────────────────────────────────────────────────────────
   Bericht „B16-Migrationsassistent — Erhebung + Vorschlag" (30.08.2026):
   die Mechanik (parseVivodepotBeta/_b16Felder, B16_FELD_MAPPING) ist bereits
   praktisch vollständig — Fund war reine Auffindbarkeit. `vivodepot-beta`
   trägt `fachpfad:true` und wird darum bewusst aus jedem Bereichs-Chooser
   gefiltert (U2-ADR-059, tests/fachpfad-schnitt.test.js) — richtig so, das
   Format schreibt depot-weit, nicht bereichseigen. Aber die eine zentrale,
   bereich-neutrale Tür (`flowEinlesenZentral`) erwähnte die alte App mit
   keinem Wort, obwohl der fertige Bürger-Text (`STRINGS.importBetaLabel`)
   längst im Code lag — nur nirgends gerendert.

   ROT-BEWEIS: vor dem Fix fehlte der Knopf im gerenderten Modal (erste
   Probe unten lief rot, geprüft). Der Fix fügt GENAU einen zweiten Knopf
   direkt unter „Ganzes Depot — Datei automatisch erkennen" hinzu, der
   direkt auf den bestehenden `flowImportDatei('vivodepot-beta')`-Weg zeigt
   — kein neuer Parser, keine neue Vorschau, kein neuer Bildschirm.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frisch() { const k = ladeKern(); await k.V.depotAnlegen(PW); k.V.betreteApp(); return k; }
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;

test('„Wohin einlesen?" zeigt einen eigenen, benannten Knopf für die alte Vivodepot-Beta-App', async () => {
  const { V, document } = await frisch();
  V.flowEinlesenZentral();
  const box = modal(document);
  assert.ok(box.includes(escapeHTML(V.STRINGS.importBetaLabel)),
    'Der Text "Aus der alten Vivodepot-App übernehmen (Beta-Version)" fehlt im zentralen Einlese-Modal');
  function escapeHTML(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
});

test('der B16-Knopf ist im Quelltext auf flowImportDatei(\'vivodepot-beta\') verdrahtet, nicht auf die generische Auto-Erkennung', () => {
  // KEIN Klick-Simulationstest: der Test-DOM-Stub (tests/load-kern.js) implementiert
  // querySelector/querySelectorAll grundsätzlich als Attrappe (liefert immer ein
  // losgelöstes Leer-Element bzw. []) — dasträfe JEDEN data-iz-*-Knopf gleich, nicht nur
  // diesen neuen, und ist kein Befund über den Fix. Kein bestehender Test im Repo simuliert
  // darum einen Klick auf data-iz-ganzes/data-iz-sektor; sie prüfen wie hier den Quelltext.
  const fs = require('fs');
  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(html.includes('data-iz-beta'), 'data-iz-beta nicht im Quelltext gefunden');
  assert.ok(/beta\.onclick\s*=\s*\(\)\s*=>\s*flowImportDatei\('vivodepot-beta'\)/.test(html),
    'die Verdrahtung muss flowImportDatei(\'vivodepot-beta\') direkt aufrufen, nicht flowImportAuto()');
});

test('der B16-Knopf steht NACH "Ganzes Depot — Datei automatisch erkennen", nicht davor', async () => {
  const { V, document } = await frisch();
  V.flowEinlesenZentral();
  const box = modal(document);
  const posGanzes = box.indexOf('data-iz-ganzes');
  const posBeta = box.indexOf('data-iz-beta');
  assert.ok(posGanzes >= 0 && posBeta >= 0, 'beide Knöpfe müssen vorhanden sein');
  assert.ok(posGanzes < posBeta, '"Ganzes Depot" bleibt an erster Stelle (U2-ADR-058, Spiegel zur Herausgeben-Tür)');
});
