'use strict';
/* Impressum in der Lese-App (31.10.2026, § 5 Abs. 1 DDG: „leicht erkennbar, unmittelbar erreichbar und ständig verfügbar“).
   Die Lese-App hatte weder am Eingangsschirm noch in der Hilfe einen Link auf das Impressum. Der Herkunftsort trägt ihn jetzt,
   mit demselben unersetzbaren Ziel wie der Kern (tools/herkunftsort-register.json), und der Eingangsschirm zeigt den Herkunftsort.
   Rot, wenn der Eingangsschirm den Herkunftsort nicht mehr zeigt oder der Herkunftsort keinen Link auf das Impressum trägt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeLesen, LESEN_PATH } = require('./load-lesen.js');
const { ladeKern } = require('./load-kern.js');

const IMPRESSUM = 'https://vivodepot.de/impressum.html';

function funktionsRumpf(quelle, name) {
  const start = quelle.indexOf('\nfunction ' + name + '(');
  if (start < 0) return '';
  const ende = quelle.indexOf('\n}\n', start);
  return quelle.slice(start, ende < 0 ? undefined : ende);
}
// Befunde am Eingangsschirm: der Rumpf von renderWelcome muss den Herkunftsort einsetzen.
function eingangsschirmBefunde(quelle) {
  const rumpf = funktionsRumpf(quelle, 'renderWelcome');
  if (!rumpf) return ['renderWelcome nicht gefunden'];
  return /\bherkunftsortHTML\(\)/.test(rumpf) ? [] : ['der Eingangsschirm zeigt den Herkunftsort nicht'];
}
function herkunftsortBefunde(html) {
  const b = [];
  const m = html.match(/<a class="herkunft-impressum-link" href="([^"]*)"[^>]*>([^<]*)<\/a>/);
  if (!m) return ['kein Impressum-Link am Herkunftsort'];
  if (m[1] !== IMPRESSUM) b.push('Ziel ' + m[1] + ' statt ' + IMPRESSUM);
  if (!m[2].trim()) b.push('Linktext leer');
  if (!/class="herkunft-datenschutz-link" href="https:\/\/vivodepot\.de\/datenschutz\.html/.test(html)) b.push('kein Datenschutz-Link am Herkunftsort');
  return b;
}

test('[Impressum·Lese-App] der Eingangsschirm zeigt den Herkunftsort', () => {
  assert.deepEqual(eingangsschirmBefunde(fs.readFileSync(LESEN_PATH, 'utf8')), []);
});

test('[Impressum·Lese-App] der Herkunftsort trägt Impressum- und Datenschutz-Link mit dem unersetzbaren Ziel', () => {
  const { V } = ladeLesen();
  assert.equal(V.VIVODEPOT_HERKUNFT_LINK, IMPRESSUM);
  assert.deepEqual(herkunftsortBefunde(V.herkunftsortHTML()), []);
  assert.match(V.hilfeEmpfaengerinHTML(), /herkunft-impressum-link/, 'die Hilfe behält den Herkunftsort');
});

test('[Impressum·Kern] der Impressumslink am Herkunftsort des Kerns zeigt auf dasselbe Ziel', () => {
  const { V } = ladeKern();
  assert.equal(V.VIVODEPOT_HERKUNFT_LINK, IMPRESSUM);
});

test('[Impressum·Rot-Beweis] ohne Herkunftsort am Eingangsschirm und ohne Link am Herkunftsort fällt die Probe', () => {
  const quelle = fs.readFileSync(LESEN_PATH, 'utf8');
  const ohne = quelle.replace(/\n {6}herkunftsortHTML\(\) \+[^\n]*/, '');
  assert.notEqual(ohne, quelle, 'Vorbedingung: die Pflanzung greift');
  assert.deepEqual(eingangsschirmBefunde(ohne), ['der Eingangsschirm zeigt den Herkunftsort nicht']);
  assert.deepEqual(herkunftsortBefunde('<div class="herkunftsort"><p>Urheberin</p></div>'), ['kein Impressum-Link am Herkunftsort']);
  assert.deepEqual(herkunftsortBefunde('<a class="herkunft-impressum-link" href="https://vivodepot.de" x>Impressum</a>'),
    ['Ziel https://vivodepot.de statt ' + IMPRESSUM, 'kein Datenschutz-Link am Herkunftsort']);
});
