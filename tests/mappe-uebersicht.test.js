'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Dokumenten-Mappe Schritt 2 (U2-ADR-013): Übersicht unter FINDEN
   ────────────────────────────────────────────────────────────────────────
   Ein FINDEN-Sidebar-Eintrag (eine Tür, keine Topbar-Doppelung) öffnet die
   Mappen-Übersicht: Liste der Dokumente + Depot-Gesamtgröße. Upload-Flow
   folgt in Schritt 3 — hier ist die Lese-/Übersichts-Schicht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('Sidebar: FINDEN-Gruppe mit Mappe-Eintrag, nach EINTRAGEN; keine Topbar-Doppelung', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.renderSidebar();
  const html = document.getElementById('sidebar').innerHTML;
  assert.ok(html.includes(V.STRINGS.gruppeFinden), 'FINDEN-Gruppe');
  assert.ok(html.includes('data-mappe'), 'Mappe-Eintrag verdrahtet');
  assert.ok(html.includes(V.STRINGS.navMappe), 'Mappe-Label');
  // FINDEN steht nach dem Bereiche-Baum (HERAUSHOLEN ist aufgelöst). Fortsetzen-Fokus
  // (26.08.2026): die frühere EINTRAGEN-Überschrift ist entfallen — V.STRINGS.gruppeEintragen
  // stünde hier nicht mehr im Sidebar-Markup (indexOf -1, Vergleich würde vakuos wahr bleiben);
  // „Alle Bereiche zeigen" ist der reale Nachfolger an dieser Stelle.
  assert.ok(html.indexOf(V.STRINGS.navAlleBereicheZeigen) < html.indexOf(V.STRINGS.gruppeFinden), 'FINDEN nach dem Bereiche-Baum');
});

test('oeffneMappe schaltet die Ansicht auf „mappe" und rendert die Übersicht', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.oeffneMappe();
  assert.equal(V.getViewState().aktiveAnsicht, 'mappe');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.mappeTitel), 'Mappen-Titel');
  assert.ok(html.includes(V.STRINGS.mappeDepotGroesse), 'Depot-Größe-Zeile');
});

test('Übersicht leer: Hinweis statt Liste', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  V.oeffneMappe();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.mappeLeer), 'Leer-Hinweis');
  assert.ok(!html.includes('mappe-liste'), 'keine Liste, wenn leer');
});

test('Übersicht listet Einträge mit Bereich-Label, Größe, Datum (tt.mm.jj) und sensibel-Marker', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.mappeEintragHinzufuegen({ beschriftung: 'Patientenverfügung', bereich: 'advanceCare', sensibel: true, groesse: 2 * 1024 * 1024, dateiname: 'pv.pdf' });
  V.mappeEintragHinzufuegen({ dateiname: 'scan.jpg', groesse: 500 * 1024 });   // ohne Bereich → Allgemein
  V.betreteApp();
  V.oeffneMappe();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('mappe-liste'), 'Liste gerendert');
  assert.ok(html.includes('Patientenverfügung'), 'Beschriftung');
  assert.ok(html.includes('Vorsorge &amp; Recht') || html.includes('Vorsorge'), 'Sektor-Bereich-Label');
  assert.ok(html.includes(V.STRINGS.mappeBereichAllgemein), 'Default-Bereich „Allgemein"');
  assert.ok(html.includes(V.STRINGS.mappeSensibel), 'sensibel-Marker');
  assert.ok(html.includes('2.0 MB'), 'Größe lesbar');
  // Datum im Kurzformat tt.mm.jj.
  assert.ok(/\d{2}\.\d{2}\.\d{2}/.test(html), 'Datum tt.mm.jj');
});

test('mappeBereichLabel: Sektor-Label, Allgemein, Rohwert', () => {
  const { V } = ladeKern();
  assert.equal(V.mappeBereichLabel('advanceCare'), 'Vorsorge & Recht');
  assert.equal(V.mappeBereichLabel('allgemein'), V.STRINGS.mappeBereichAllgemein);
  assert.equal(V.mappeBereichLabel(''), V.STRINGS.mappeBereichAllgemein);
  assert.equal(V.mappeBereichLabel('xyz'), 'xyz', 'unbekannter Bereich → Rohwert');
});
