'use strict';
/* ════════════════════════════════════════════════════════════════════════
   shl-belegstrecke-schalter.test.js — die zusammengeführte Belegstrecke
   verliert keinen ihrer Teile (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   tools/shl-belegstrecke.js war in zwei Fassungen auseinandergelaufen: eine
   trug --dokument und --weg (mit ihnen wurden die Gazelle-Belege TI-727 und
   TI-751 gefahren; ohne sie ist keiner reproduzierbar), die andere den
   Validator-Absatz vom 18.09.2026 (vor dem Ausliefern das Dokument mit dem
   HL7-Validator prüfen). Zusammengeführt am 26.09.2026. Ein „nimm die neuere
   Fassung" nähme still eine Hälfte weg — diese Probe hält beide fest.

   Dazu die Wahl des Freigabewegs selbst (`wegEinsetzen`): sie setzt `weg` an
   genau EINER Stelle im Quelltext einer Produktkopie ein und bricht ab, wenn
   der Anker fehlt oder doppelt steht, statt still den Direkt-Weg zu belegen.

   Den vollen Lauf (Chromium, Schritte 10–30, JWE byte-gleich zum Dokument)
   fährt diese Probe NICHT; er dauert und braucht das gebackene Produkt:
   `node tools/shl-belegstrecke.js --ziel <ordner> --weg manifest`.
   ROT-BEWEIS: gepflanzte Fassungen ohne --weg, ohne --dokument, ohne den
   Validator-Absatz; ein Anker 0× und 2×.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'shl-belegstrecke.js');
const { wegEinsetzen, WEG_ANKER } = require(WERKZEUG);

function teileBefund(quelle) {
  const fehlt = [];
  if (!/wert\('--weg',/.test(quelle)) fehlt.push('--weg wird nicht gelesen');
  if (!/wert\('--dokument',/.test(quelle)) fehlt.push('--dokument wird nicht gelesen');
  if (!/--weg direkt\|manifest/.test(quelle)) fehlt.push('--weg steht nicht im Aufruf-Kopf');
  if (!/--dokument <pfad>/.test(quelle)) fehlt.push('--dokument steht nicht im Aufruf-Kopf');
  if (!/FHIR_VALIDATOR_JAR/.test(quelle) || !/validator_cli/.test(quelle)) fehlt.push('Validator-Absatz fehlt');
  if (!/wegEinsetzen\(kernPfad, weg, ziel\)/.test(quelle)) fehlt.push('--weg erreicht das Produkt nicht');
  return fehlt;
}

test('[Belegstrecke] beide Hälften sind da: --weg, --dokument und der Validator-Absatz', () => {
  assert.deepEqual(teileBefund(fs.readFileSync(WERKZEUG, 'utf8')), []);
});

test('[Belegstrecke·Rot-Beweis] jede fehlende Hälfte fällt', () => {
  const echt = fs.readFileSync(WERKZEUG, 'utf8');
  assert.ok(teileBefund(echt.replace(/wert\('--weg',/g, "wert('--x',")).includes('--weg wird nicht gelesen'));
  assert.ok(teileBefund(echt.replace(/wert\('--dokument',/g, "wert('--x',")).includes('--dokument wird nicht gelesen'));
  assert.ok(teileBefund(echt.replace(/FHIR_VALIDATOR_JAR/g, 'X')).includes('Validator-Absatz fehlt'));
});

test('[Belegstrecke] der Anker für --weg steht heute genau einmal im Kern', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.equal(kern.split(WEG_ANKER).length - 1, 1, WEG_ANKER);
});

test('[Belegstrecke] wegEinsetzen: direkt lässt das Produkt, manifest setzt weg an genau einer Stelle', () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'belegstrecke-weg-'));
  try {
    const produkt = path.join(ziel, 'produkt.html');
    fs.writeFileSync(produkt, 'a\n' + WEG_ANKER + '\nb\n');
    assert.equal(wegEinsetzen(produkt, 'direkt', ziel), produkt);
    const kopie = wegEinsetzen(produkt, 'manifest', ziel);
    assert.notEqual(kopie, produkt);
    const text = fs.readFileSync(kopie, 'utf8');
    assert.ok(text.includes('shlProviderPayload(id, { label: e.beschriftung, weg: "manifest" })'), text);
    assert.equal(fs.readFileSync(produkt, 'utf8'), 'a\n' + WEG_ANKER + '\nb\n', 'das Original bleibt unberührt');
  } finally {
    fs.rmSync(ziel, { recursive: true, force: true });
  }
});

test('[Belegstrecke·Rot-Beweis] wegEinsetzen bricht ab, wenn der Anker fehlt oder doppelt steht', () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'belegstrecke-weg-'));
  try {
    const ohne = path.join(ziel, 'ohne.html');
    fs.writeFileSync(ohne, 'shlProviderPayload(id, {})\n');
    assert.throws(() => wegEinsetzen(ohne, 'manifest', ziel), /0× im Produkt/);
    const doppelt = path.join(ziel, 'doppelt.html');
    fs.writeFileSync(doppelt, WEG_ANKER + '\n' + WEG_ANKER + '\n');
    assert.throws(() => wegEinsetzen(doppelt, 'manifest', ziel), /2× im Produkt/);
  } finally {
    fs.rmSync(ziel, { recursive: true, force: true });
  }
});
