'use strict';
/* Jeder Text, den der Schirm vor dem Depot über vorDepotText() zeigt, steht im englischen Vor-Depot-Modul.

   Schaltet jemand den Schirm vor dem Depot auf Englisch, liest vorDepotText() den Text aus dem Sprachangebot-Modul
   (SPRACHANGEBOT_EN_PFAD in tools/lib/vier-produkte.js). Fehlt der Schlüssel dort, zeigt der Schirm die Kennung selbst,
   etwa „strings:whcOeffnenLink.text“. Diese Probe hält die Klasse: jeder vorDepotText('…')-Schlüssel des Kerns steht im
   Modul. Die abgeleiteten Sprachangebote (ABGELEITETE_SPRACHANGEBOTE) entstehen aus diesem Modul. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { SPRACHANGEBOT_EN_PFAD } = require('../tools/lib/vier-produkte.js');
const REPO = path.join(__dirname, '..');

function vorDepotSchluessel(kern) {
  return [...new Set([...kern.matchAll(/vorDepotText\('([A-Za-z0-9_]+)'\)/g)].map((m) => m[1]))].sort();
}
function fehlende(kern, texte) {
  return vorDepotSchluessel(kern).filter((k) => typeof texte['strings:' + k + '.text'] !== 'string');
}

test('[Vor-Depot-EN] jeder vorDepotText-Schlüssel steht im englischen Vor-Depot-Modul', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const texte = JSON.parse(fs.readFileSync(SPRACHANGEBOT_EN_PFAD, 'utf8')).texte;
  assert.ok(vorDepotSchluessel(kern).length > 20, 'Vorbedingung: der Kern ruft vorDepotText mit festen Schlüsseln');
  assert.deepEqual(fehlende(kern, texte), []);
});

test('[Vor-Depot-EN·Rot-Beweis] ein neuer Schlüssel ohne Text im Modul wird gefunden', () => {
  const kern = "x = vorDepotText('zzProbeNeu'); y = vorDepotText('appTagline');";
  assert.deepEqual(fehlende(kern, { 'strings:appTagline.text': 'Tagline' }), ['zzProbeNeu']);
});
