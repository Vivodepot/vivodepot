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
  const html = document.getElementById('sidebar').innerHTML + document.getElementById('tb-aktionen').innerHTML;   // Umbau U-3 Schritt 3 (15.11.2026): die Türen stehen oben in der Kopfleiste
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

test('[Rein/Raus] Nav-Rang (Produktentscheidung 05.10.2026): im Punkt „Austausch und Überblick“ zuerst die Türen (einlesen, herausgeben, Herausgegeben), dann die Überblicke', async () => {
  const { V, document } = await editierbareSitzung();
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  const kopf = document.getElementById('tb-aktionen').innerHTML;
  assert.ok(kopf.indexOf('data-einlesen-zentral=') >= 0 && kopf.indexOf('data-einlesen-zentral=') < kopf.indexOf('data-weitergeben-zentral='), 'Kopfleiste: einlesen vor herausgeben');
  // Umbau U-3 Schritt 3 (15.11.2026): in „Mehr“ stehen die beiden Türen als schmale Einträge (nur auf dem Handy sichtbar).
  const reihe = ['data-einlesen-schmal', 'data-weitergeben-schmal', 'data-mappe', 'data-prueftermine', 'data-verwaltete-depots']
    .map((a) => html.indexOf(a + '='));
  // Umbau U-3 (15.11.2026): „Herausgegeben“ steht oben, gleich nach der Übersicht, nicht mehr im Punkt.
  assert.ok(html.indexOf('data-uebergabe-protokoll=') > html.indexOf('data-uebersicht=') && html.indexOf('data-uebergabe-protokoll=') < html.indexOf(V.STRINGS.gruppeBereiche), 'Herausgegeben steht oben, vor den Bereichen');
  assert.ok(reihe.every((p) => p >= 0), 'jeder Eintrag steht in der Leiste');
  assert.deepEqual(reihe, [...reihe].sort((x, y) => x - y), 'Reihenfolge: einlesen, herausgeben, Meine Dokumente, Prüftermine, Sub-Depots');
});

test('[Rein/Raus] Türen NUR in bearbeitbaren Modi — im read-only-Modus (notfall) ausgeblendet', async () => {
  const { V, document } = await editierbareSitzung();
  V.renderSidebar();
  assert.ok((document.getElementById('sidebar').innerHTML + document.getElementById('tb-aktionen').innerHTML).includes('data-weitergeben-zentral'),
    'Vorbedingung: in editierbarer Sitzung vorhanden');
  V.Modus._setzeIntern('notfall');                             // darfBearbeiten() === false
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML + document.getElementById('tb-aktionen').innerHTML;
  assert.ok(!html.includes('data-weitergeben-zentral') && !html.includes('data-weitergeben-schmal'), 'keine Weitergeben-Tür bei read-only');
  assert.ok(!html.includes('data-einlesen-zentral') && !html.includes('data-einlesen-schmal'), 'keine Einlesen-Tür bei read-only');
});
