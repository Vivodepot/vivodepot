'use strict';
/* Wächter zu U2-ADR-495 (09.10.2026): Land, Rechtsraum und Rechtsform kommen aus dem
   Rechtsraum-Modul, nicht aus dem Code. Die Zahl je Datei und Art kann nur sinken (tools/laenderannahme-grundlinie.json). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/laenderannahme-pruefen.js');

const FIXTURE = fs.readFileSync(path.join(__dirname, 'fixtures', 'laenderannahme', 'vorgaben.js'), 'utf8');

test('[Länderannahme] die geführten Dateien stehen auf der Grundlinie, nicht darüber und nicht darunter', () => {
  const soll = JSON.parse(fs.readFileSync(W.GRUNDLINIE_PFAD, 'utf8')).jeDatei;
  assert.deepEqual(W.vergleichen(W.messen(), soll), []);
});
test('[Länderannahme · Rot-Beweis] das Fixture zählt jede Art, Kommentar, Normzitat und country_code nicht', () => {
  assert.deepEqual(W.zaehlen(FIXTURE), { 'land-vorgabe': 2, 'rechtsraum-vorgabe': 1, 'rechtsform-liste': 1 });
});
test('[Länderannahme · Rot-Beweis] ein neuer Rückfall auf „Deutschland“ im Studio ist rot', () => {
  const studio = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
  const soll = JSON.parse(fs.readFileSync(W.GRUNDLINIE_PFAD, 'utf8')).jeDatei;
  const ist = W.messen();
  ist['vivodepot-studio.html'] = W.zaehlen(studio + "\n<script>const x = y || 'Deutschland';</script>\n");
  assert.equal(W.vergleichen(ist, soll).length, 1);
});
test('[Länderannahme · Drift] eine entfernte Stelle ohne nachgezogene Grundlinie ist ebenfalls rot', () => {
  const soll = JSON.parse(fs.readFileSync(W.GRUNDLINIE_PFAD, 'utf8')).jeDatei;
  const hoeher = JSON.parse(JSON.stringify(soll));
  hoeher['vivodepot-studio.html']['rechtsform-liste'] += 1;
  assert.equal(W.vergleichen(W.messen(), hoeher).length, 1);
});
