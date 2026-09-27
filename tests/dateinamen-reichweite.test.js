'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Auftrag „White Label bis ins PDF" (10.09.2026), Zug 2 (Reichweite) — Dateinamen
   ────────────────────────────────────────────────────────────────────────────
   DIE LÜCKE, DIE DIESE PROBE SCHLIESST: `_dateiNamePraefix()`s Wirkung auf `exportDateiname()`
   und `depotDateiname()` war im ersten Durchlauf dieses Auftrags nur per Hand geprüft (ein
   `node -e`-Skript gegen den laufenden Kern, nicht committet) — belegt am Objekt, aber ohne
   eigenen, wiederholbaren Rot-Beweis. Danach kam ausdrücklich die Frage: „prüf es, statt es
   anzunehmen" (Folgeauftrag zur Lese-App-Branding-Landung, 10.09.2026). Diese Datei macht die
   Handmessung zu einer Probe, die bei jedem Lauf wieder gilt.

   `depotDateiname()` (der Name der `.vivodepot`-Datei selbst, primärer Speicherweg — JEDES
   Sichern, nicht nur ein gelegentlicher Export) ist die auffälligere der beiden Stellen; ihr
   Fix ist bereits in `9925b569` gelandet (`'Mein-' + _dateiNamePraefix() + '_' + datum`), hier
   zum ersten Mal automatisiert geprüft.

   RESET-ROT-BEWEIS: dieselbe Sorge wie beim Lese-App-Fund — eine Marke darf nicht am nächsten,
   unbeteiligten Depot hängen bleiben. `_dateiNamePraefix()`/`_markeName()` sind reine Lesefunk-
   tionen ohne eigenen Zwischenspeicher (kein CSS-Custom-Property, kein gecachter String) — sie
   lesen `data.brandingModule` bei JEDEM Aufruf live neu. Ein Leck wie in der Lese-App (ein
   Wert, der beim Schließen hätte zurückgesetzt werden müssen, es aber nicht wurde) ist hier
   strukturell ausgeschlossen — trotzdem geprüft, nicht angenommen (Probe 3). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const MUSTER_BRANDING = Object.freeze({
  modulTyp: 'branding', moduleVersion: 1, herkunft: 'achsentest-dateinamen',
  name: 'Berliner Sparkasse', domain: 'berliner-sparkasse.example',
  farbePrimaer: '#2E5C8A', farbeSekundaer: '#F2A900', schriftart: 'Inter', logo: null,
});

async function frischMitBranding() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const d = V.getData();
  d.brandingModule = [MUSTER_BRANDING];
  V.setData(d);
  return V;
}

test('[Dateinamen-Reichweite] depotDateiname() trägt die angedockte Marke, NICHT „Vivodepot"', async () => {
  const V = await frischMitBranding();
  const JETZT = new Date('2026-09-10T10:00:00Z');
  const name = V.depotDateiname(JETZT);
  assert.equal(name, 'Mein-Berliner-Sparkasse_2026-09-10.vivodepot');
  assert.ok(!name.includes('Vivodepot'), 'das native Literal darf nicht mehr auftauchen, sobald ein Branding-Modul andockt ist');
});

test('[Dateinamen-Reichweite] exportDateiname() trägt dieselbe Marke im Registry-Präfix', async () => {
  const V = await frischMitBranding();
  const def = V.EXPORT_FORMATE.find((f) => f.id === 'fhir-ips');
  assert.ok(def, 'Voraussetzung: die fhir-ips-Registry-Zeile existiert');
  const name = V.exportDateiname(def);
  assert.equal(name, 'Berliner-Sparkasse_Gesundheit_IPS.json');
  assert.ok(!name.includes('Vivodepot'));
});

test('[Dateinamen-Reichweite·Rot-Beweis] ohne Branding-Modul bleibt der native Name „Vivodepot" (Gegenprobe)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  const JETZT = new Date('2026-09-10T10:00:00Z');
  assert.equal(V.depotDateiname(JETZT), 'Mein-Vivodepot_2026-09-10.vivodepot',
    'ohne angedockte Marke gilt weiterhin der native Name — unverändert wie vor diesem Zug');
});

test('[Dateinamen-Reichweite·Rot-Beweis] nach Depot-Reset trägt der Name wieder Vivodepot — kein Marken-Leck zum nächsten Depot', async () => {
  const V = await frischMitBranding();
  const JETZT = new Date('2026-09-10T10:00:00Z');
  assert.equal(V.depotDateiname(JETZT), 'Mein-Berliner-Sparkasse_2026-09-10.vivodepot', 'Voraussetzung: die Partnermarke steht im Namen');
  // Derselbe RAM-Wipe wie beim CSS-Reset (VDK-Reset, tests/vor-depot-konfiguration-branding-css.test.js) —
  // kein separater Vorgang für Dateinamen, dieselbe Funktion räumt `data` insgesamt weg.
  V._depotSpeicherZuruecksetzen();
  assert.equal(V.depotDateiname(JETZT), 'Mein-Vivodepot_2026-09-10.vivodepot',
    'ohne dieses Zurücksetzen bliebe die Marke des geschlossenen Depots am nächsten, unbeteiligten Depot hängen (dieselbe Sorge wie in der Lese-App)');
});
