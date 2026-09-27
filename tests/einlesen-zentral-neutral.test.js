'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zentrale „Daten einlesen"-Tür — BEREICH-NEUTRAL (U2-ADR-056)
   ────────────────────────────────────────────────────────────────────────
   Die Tür in der Hauptnavigation fragt „Wohin einlesen?" (flowEinlesenZentral)
   statt fix nach Gesundheit zu routen. Angeboten: Bereiche mit EIGENEM
   (kategorie:'sektor') Einlese-Format + „Automatisch am Inhalt erkennen".
   Reine Wege-Änderung; kein Krypto, kein Datenmodell.
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
const modal = (document) => document.getElementById('modal-inhalt').innerHTML;

test('1) „Wohin einlesen?" — Titel bereich-neutral, keine Gesundheits-Vorwahl', async () => {
  const { V, document } = await frischMitDepot();
  V.flowEinlesenZentral();
  // Der Modal-Titel liegt außerhalb von #modal-inhalt; wir prüfen den Körper + die Titel-Konstante.
  assert.equal(V.STRINGS.einlesenWohinTitel, 'Wohin einlesen?');
  const box = modal(document);
  // U2-ADR-058: „Ganzes Depot" (= Auto-Erkennung ohne Bereichs-Vorwahl) steht jetzt ZUERST — Spiegel
  // zur Herausgeben-Tür. Der frühere „Automatisch"-Auffangweg (data-iz-auto) wurde dazu umbenannt.
  assert.ok(box.includes('data-iz-ganzes'), '„Ganzes Depot" (Auto-Erkennung) als erster Weg vorhanden');
  assert.ok(box.includes('data-iz-sektor='), 'Bereichs-Ziele als Wahl vorhanden');
  assert.ok(box.indexOf('data-iz-ganzes') < box.indexOf('data-iz-sektor='), '„Ganzes Depot" steht vor den Bereichen');
});

test('2) Ziele = genau die Bereiche mit eigenem Einlese-Format', async () => {
  const { V, document } = await frischMitDepot();
  V.flowEinlesenZentral();
  const box = modal(document);
  // MIT eigenem Sektor-Format → als Ziel angeboten.
  // C7/U2-ADR-118: `vorsorge` ist HERAUSGEFALLEN — sein einziges Einlese-Format war `ics-vorsorge`,
  // und das ist mit Weg 1 entfernt (ICS reiner Export). Die deklarierte Fähigkeit verschwindet aus
  // dem Einlese-Wähler (Auflage 1) — hier festgehalten.
  for (const id of ['health', 'identity', 'finance', 'administration', 'education', 'socialInsurance', 'people']) {
    assert.ok(box.includes('data-iz-sektor="' + id + '"'), 'Ziel ' + id);
  }
  // Depot-only (kein Sektor-Format) → NICHT als Ziel (Auto-Erkennung deckt sie ab). `advanceCare` seit C7 dabei.
  for (const id of ['mobility', 'housing', 'personal', 'advanceCare']) {
    assert.ok(!box.includes('data-iz-sektor="' + id + '"'), 'kein Ziel ' + id);
  }
});

test('3) Kein fixes Gesundheits-Routing mehr aus der zentralen Tür', async () => {
  const { V, document } = await frischMitDepot();
  V.renderSidebar();
  const sb = document.getElementById('sidebar').innerHTML;
  assert.ok(!sb.includes('data-einlesen-zentral="health"'), 'zentrale Tür nicht mehr fix Gesundheit');
  assert.ok(sb.includes('data-einlesen-zentral="1"'), 'neutraler Marker');
});

// Die echte Klick-Route (Attribut-Selektor → onclick) verifiziert die Browser-Preview / e2e; die
// Harness-DOM ist ein Stub ohne Attribut-Selektoren. Headless prüfen wir die ZIELE der Route + die
// Verdrahtung strukturell an der Quelle (kein toter Weg).
test('4) Ziel „Bereich": flowEinlesen(<sektor>) öffnet den Bereichs-Chooser (Klick-Ziel)', async () => {
  const { V, document } = await frischMitDepot();
  V.flowEinlesen('finance');
  const box = modal(document);
  assert.ok(box.includes('data-i-format="sd-jwt-vc-finanzen"'), 'Finanz-Format im Chooser');
  assert.ok(box.includes('data-i-auto="finance"'), 'Auto-Knopf des Bereichs');
});

test('5) Ziel „Automatisch": flowImportAuto() läuft ohne Bereichs-Vorwahl (kein Wurf)', async () => {
  const { V } = await frischMitDepot();
  assert.doesNotThrow(() => V.flowImportAuto());
});

test('6) Verdrahtung strukturell: der Picker bindet Bereich→flowEinlesen, Auto→flowImportAuto', async () => {
  const { src } = ladeKern();
  const fn = src.slice(src.indexOf('function flowEinlesenZentral'));
  const koerper = fn.slice(0, fn.indexOf('\n}\n'));
  assert.match(koerper, /data-iz-sektor[\s\S]*flowEinlesen\(b\.getAttribute\('data-iz-sektor'\)\)/, 'Bereich-Knopf → flowEinlesen(sektor)');
  assert.match(koerper, /data-iz-ganzes[\s\S]*flowImportAuto\(\)/, '„Ganzes Depot"-Knopf → flowImportAuto() ohne Bereich');
});
