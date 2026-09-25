'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zentrale „Daten herausgeben"-Tür — BEREICH-NEUTRAL (U2-ADR-057)
   ────────────────────────────────────────────────────────────────────────
   Spiegel zu U2-ADR-056 (Einlese-Tür). Die Tür in der Hauptnavigation fragt
   „Woraus herausgeben?" (flowHerausgebenZentral) statt fix aus Gesundheit zu
   geben. Angeboten: die Bereiche, die DATEN tragen (herausgeben ist datenlage-
   adaptiv). Reine Wege-Änderung; kein Krypto, kein Datenmodell.
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

test('1) „Woraus herausgeben?" — Titel bereich-neutral', async () => {
  const { V, document } = await frischMitDepot();
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12 345 678 901' });   // Schnitt Glied 3 (A448): steuerid ist jetzt eine Liste
  V.flowHerausgebenZentral();
  assert.equal(V.STRINGS.herausgebenWoherTitel, 'Woraus herausgeben?');
  const box = modal(document);
  assert.ok(box.includes('data-hz-sektor='), 'Bereichs-Ziele als Wahl vorhanden');
  // U2-ADR-058: „Ganzes Depot" steht ZUERST — die depot-weiten Gesamt-Exporte gehören in die Tür.
  assert.ok(box.includes('data-hz-ganzes'), '„Ganzes Depot" als erste Zeile vorhanden');
  assert.ok(box.indexOf('data-hz-ganzes') < box.indexOf('data-hz-sektor='), '„Ganzes Depot" steht vor den Bereichen');
});

test('2) Ziele = genau die Bereiche mit DATEN (datenlage-adaptiv)', async () => {
  const { V, document } = await frischMitDepot();
  // Explizit zwei Bereiche füllen (akteurSelbstErklaeren füllt nur das Menschen-Register, keine
  // Sektor-Felder). Zwei andere bleiben leer.
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12 345 678 901' });   // Schnitt Glied 3 (A448): steuerid ist jetzt eine Liste
  V.sektorFeldSetzen('education', 'occupationRole', 'Lehrerin');
  V.flowHerausgebenZentral();
  const box = modal(document);
  assert.ok(box.includes('data-hz-sektor="finance"'), 'Finanzen (hat Daten) als Ziel');
  assert.ok(box.includes('data-hz-sektor="education"'), 'Bildung (hat Daten) als Ziel');
  // Ein leerer Bereich ist KEIN Ziel (nichts herzugeben).
  assert.ok(!box.includes('data-hz-sektor="housing"'), 'leeres Wohnen kein Ziel');
  assert.ok(!box.includes('data-hz-sektor="personal"'), 'leeres Persönliches kein Ziel');
});

test('3) Kein fixes Gesundheits-Routing mehr aus der zentralen Tür', async () => {
  const { V, document } = await frischMitDepot();
  V.renderSidebar();
  const sb = document.getElementById('sidebar').innerHTML;
  assert.ok(!sb.includes('data-weitergeben-zentral="health"'), 'zentrale Tür nicht mehr fix Gesundheit');
  assert.ok(sb.includes('data-weitergeben-zentral="1"'), 'neutraler Marker');
});

test('4) Leerer Datenstand → freundlicher Hinweis statt leerem Picker', async () => {
  const { V, document } = await frischMitDepot();
  // Identität über akteurSelbstErklaeren geleert simulieren: wir prüfen den Hinweis-Weg direkt,
  // indem wir ALLE Sektor-Daten entfernen.
  const d = V.getData();
  d.sektoren = {};
  V.flowHerausgebenZentral();
  const box = modal(document);
  assert.ok(!box.includes('data-hz-sektor='), 'keine Bereich-Ziel-Knöpfe');
  assert.ok(box.includes(V.STRINGS.herausgebenWoherLeer.slice(0, 20)), 'Leer-Hinweis');
  // U2-ADR-058: „Ganzes Depot" bleibt AUCH ohne Bereichs-Daten erreichbar — man kann sein Depot
  // (inkl. Register/Notfall-Angaben) jederzeit herausgeben, unabhängig von einzelnen Bereichen.
  assert.ok(box.includes('data-hz-ganzes'), '„Ganzes Depot" auch im Leer-Fall vorhanden');
});

test('5) Ziel „Bereich": flowHerausgeben(<sektor>) öffnet den Bereichs-Chooser (Klick-Ziel)', async () => {
  const { V, document } = await frischMitDepot();
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12 345 678 901' });   // Schnitt Glied 3 (A448): steuerid ist jetzt eine Liste
  V.flowHerausgeben('finance');
  const box = modal(document);
  assert.ok(box.includes('data-h-pdf'), 'PDF-Weg im Chooser');
  // CC-08 (14.07.): der Bereichs-QR-Weg (data-h-qr) ist entfernt (Klartext-Leck an die Systemkamera).
  assert.ok(!box.includes('data-h-qr'), 'kein QR-Weg mehr im Chooser');
  assert.ok(box.includes('data-h-format="sd-jwt-vc-finanzen"'), 'maschinenlesbares Finanz-Format');
});

test('6) Verdrahtung strukturell: Bereich→flowHerausgeben, „Ganzes Depot"→Gesamt-PDF direkt', async () => {
  const { src } = ladeKern();
  const fn = src.slice(src.indexOf('function flowHerausgebenZentral'));
  const koerper = fn.slice(0, fn.indexOf('\n}\n'));
  assert.match(koerper, /data-hz-sektor[\s\S]*flowHerausgeben\(b\.getAttribute\('data-hz-sektor'\)\)/, 'Bereich-Knopf → flowHerausgeben(sektor)');
  // U2-ADR-059: „Ganzes Depot" ruft DIREKT die Gesamt-PDF (Karte/QR sind in die Notfall-Stelle
  // gewandert, JSON ist Wartung → kein leerer Ein-Knopf-Sub-Chooser mehr).
  assert.match(koerper, /data-hz-ganzes[\s\S]*flowVollDepotPdf\(\)/, '„Ganzes Depot"-Knopf → flowVollDepotPdf() direkt');
});

test('7) U2-ADR-059: „Ganzes Depot" trägt nur noch die Gesamt-PDF — Karte/QR raus aus dem Herausgeben-Weg', async () => {
  const { V, src } = ladeKern();
  // Der frühere Sub-Chooser ist weg.
  assert.equal(typeof V.flowHerausgebenGanzesDepot, 'undefined', 'flowHerausgebenGanzesDepot entfernt');
  // Und im Herausgeben-Türen-Kern gibt es keine Notfallkarte-/QR-Marker mehr (die leben jetzt in renderNotfall).
  const fn = src.slice(src.indexOf('function flowHerausgebenZentral'), src.indexOf('function flowHerausgeben(sektorId)'));
  assert.ok(!fn.includes('data-hg-notfallkarte'), 'keine Notfallkarte mehr im Herausgeben-Weg');
  assert.ok(!fn.includes('data-hg-qr'), 'kein Notfall-QR mehr im Herausgeben-Weg');
});
