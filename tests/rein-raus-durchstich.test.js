'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Rein/Raus — die zwei zentralen Nav-Türen (BEIDE bereich-neutral)
   ────────────────────────────────────────────────────────────────────────
   „Daten weitergeben" und „Daten einlesen" stehen auf Nav-Rang in der Sidebar
   (Konzept „Daten rein und raus", 03.07.). Der frühere Gesundheits-Durchstich
   ist abgelöst: die Türen sind bereich-neutral (Marker „1") und fragen „Wohin
   einlesen?" (flowEinlesenZentral, U2-ADR-056) bzw. „Woraus herausgeben?"
   (flowHerausgebenZentral, U2-ADR-057). „Immer sichtbar" = Nav-Rang (im Drawer,
   konsistent mit Eintragen/Finden), nicht Dauer-Präsenz. Nur in bearbeitbaren
   Modi (Modus.darfBearbeiten()). KEINE Krypto — sichert Rendern, Verdrahtung,
   Position, Modus-Gate.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

// Editierbare Sitzung: Depot + Sitzungs-Akteur + Anker-Modus → darfBearbeiten() === true.
// (Ohne Akteur ist darfBearbeiten() false, Z.5192 — dann blenden die Türen bewusst aus.)
async function editierbareSitzung() {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.Modus._setzeIntern('anker');
  return { V, document };
}

test('[Rein/Raus] Sidebar trägt „Daten weitergeben" + „Daten einlesen" — BEIDE bereich-neutral', async () => {
  const { V, document } = await editierbareSitzung();
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  // U2-ADR-056/057: beide Türen sind bereich-neutral — kein fester Gesundheits-Bereich mehr, die
  // Marker tragen „1"; der Klick öffnet „Wohin einlesen?" (flowEinlesenZentral) bzw. „Woraus
  // herausgeben?" (flowHerausgebenZentral).
  assert.ok(html.includes('data-weitergeben-zentral="1"'), 'Weitergeben-Tür → flowHerausgebenZentral (neutral)');
  assert.ok(html.includes('data-einlesen-zentral="1"'), 'Einlesen-Tür → flowEinlesenZentral (neutral)');
  assert.ok(!html.includes('-zentral="gesundheit"'), 'keine Tür mehr fix auf Gesundheit');
  assert.ok(html.includes(V.STRINGS.navWeitergeben), 'Label „Daten herausgeben"');
  assert.equal(V.STRINGS.navWeitergeben, 'Daten herausgeben');   // U2-ADR-046 ① — symmetrisch zu „Daten einlesen" (ein↔heraus)
  assert.ok(html.includes(V.STRINGS.einlesenKnopf), 'Label „Daten einlesen"');
});

test('[Rein/Raus] Nav-Rang: die Türen stehen NACH der Finden-Gruppe (Reihenfolge rein → nachschauen → raus)', async () => {
  const { V, document } = await editierbareSitzung();
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  assert.ok(html.indexOf('data-prueftermine') < html.indexOf('data-weitergeben-zentral'),
    'Weitergeben-Tür nach Finden/Prüftermine, am Ende der Sidebar');
});

test('[Rein/Raus] Türen NUR in bearbeitbaren Modi — im read-only-Modus (notfall) ausgeblendet', async () => {
  const { V, document } = await editierbareSitzung();
  V.renderSidebar();
  assert.ok(document.getElementById('sidebar').innerHTML.includes('data-weitergeben-zentral'),
    'Vorbedingung: in editierbarer Sitzung vorhanden');
  V.Modus._setzeIntern('notfall');                             // darfBearbeiten() === false
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  assert.ok(!html.includes('data-weitergeben-zentral'), 'keine Weitergeben-Tür bei read-only');
  assert.ok(!html.includes('data-einlesen-zentral'), 'keine Einlesen-Tür bei read-only');
});
