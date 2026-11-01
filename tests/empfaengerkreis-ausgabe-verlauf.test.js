'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Verlauf der Ausgaben eines Empfängerkreises (25.10.2026, U2-ADR-120)
   ─────────────────────────────────────────────────────────────────────────────
   Bis hierher hielt ein Kreis nur `letzteAusgabe`: jede neue Datei, jeder neue QR-Code überschrieb die frühere. Jetzt
   hält `verlauf` die letzten zehn Ausgaben, neueste zuerst, mit Zeitpunkt, Zahl der Angaben und Art (Datei oder QR-Code),
   und die Zeile des Kreises zeigt bis zu fünf frühere eingeklappt. Geprüft:
     · Datei und QR-Code vermerken ihre Art; `letzteAusgabe` bleibt wie bisher;
     · der Verlauf endet bei zehn, die Zeile bei fünf (Rot-Beweis: ohne Deckel wächst er weiter);
     · ein Kreis ohne Verlauf (älteres Depot) zeigt die Zeile wie bisher, ohne Aufklapper;
     · der Verlauf überlebt Schließen und Öffnen.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const PW = 'kreis-verlauf-probe-passwort';

async function mitKreis(opt) {
  const k = ladeKern(opt || {});
  await k.V.depotAnlegen(PW);
  await k.V.empfaengerkreisSetzen({ id: 'k1', name: 'Hausärztin', bausteine: ['notfall'] });
  return k;
}

test('[Kreis·Verlauf] Datei und QR-Code vermerken ihre Art, neueste zuerst; letzteAusgabe bleibt', async () => {
  const { V } = await mitKreis();
  await V.empfaengerkreisAusgabeVermerken('k1', 4, 'datei');
  await V.empfaengerkreisAusgabeVermerken('k1', 7, 'qr');
  const k = V.empfaengerkreisFinden('k1');
  assert.deepEqual(k.verlauf.map((v) => [v.art, v.felder]), [['qr', 7], ['datei', 4]]);
  assert.equal(k.letzteAusgabe.felder, 7);
  assert.equal(k.letzteAusgabe.stand, k.verlauf[0].stand);
  assert.deepEqual(Object.keys(k.verlauf[0]).sort(), ['art', 'felder', 'stand'], 'nie was und nie an wen');
});

test('[Kreis·Verlauf] der Verlauf endet bei zehn, die Zeile zeigt fünf frühere', async () => {
  const { V } = await mitKreis();
  for (let i = 1; i <= 12; i++) await V.empfaengerkreisAusgabeVermerken('k1', i, i % 2 ? 'datei' : 'qr');
  const k = V.empfaengerkreisFinden('k1');
  assert.equal(k.verlauf.length, 10);
  assert.equal(k.verlauf[0].felder, 12);
  assert.equal(k.verlauf[9].felder, 3);
  const html = V._kreisZeileHTML(k);
  assert.match(html, /<details class="einst-hint"><summary>[^<]+<\/summary><ul>/);
  assert.equal(html.split('<li>').length - 1, 5);
  const li = html.slice(html.indexOf('<li>') + 4, html.indexOf('</li>'));
  assert.match(li, /11/, 'die erste frühere ist die vorletzte Ausgabe');
});

test('[Kreis·Verlauf] ein Kreis ohne Verlauf zeigt keinen Aufklapper, einer mit nur der letzten Ausgabe auch nicht', async () => {
  const { V } = await mitKreis();
  assert.doesNotMatch(V._kreisZeileHTML(V.empfaengerkreisFinden('k1')), /<details/);
  await V.empfaengerkreisAusgabeVermerken('k1', 2, 'datei');
  assert.doesNotMatch(V._kreisZeileHTML(V.empfaengerkreisFinden('k1')), /<details/, 'die letzte steht schon darüber');
  await V.empfaengerkreisAusgabeVermerken('k1', 3, 'qr');
  assert.match(V._kreisZeileHTML(V.empfaengerkreisFinden('k1')), /<details/);
});

test('[Kreis·Verlauf] der Verlauf überlebt Schließen und Öffnen', async () => {
  const { V } = await mitKreis();
  await V.empfaengerkreisAusgabeVermerken('k1', 5, 'qr');
  await V.depotLaden(await V.depotSerialisieren(), PW);
  assert.deepEqual(V.empfaengerkreisFinden('k1').verlauf.map((v) => v.art), ['qr']);
});

test('[Kreis·Verlauf·Rot-Beweis] ohne den Deckel wächst der Verlauf über zehn, und die Probe sieht es', async () => {
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const ohne = kern.replace('.slice(0, KREIS_VERLAUF_MAX);', ';');
  assert.notEqual(ohne, kern, 'die Ersetzung griff');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kreis-verlauf-'));
  const p = path.join(dir, 'kern.html');
  fs.writeFileSync(p, ohne);
  try {
    const { V } = await mitKreis({ htmlPfad: p, backen: true });
    for (let i = 1; i <= 12; i++) await V.empfaengerkreisAusgabeVermerken('k1', i, 'datei');
    assert.equal(V.empfaengerkreisFinden('k1').verlauf.length, 12);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
