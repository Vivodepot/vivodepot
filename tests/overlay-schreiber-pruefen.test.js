'use strict';
/* Kein Overlay geht bei offenem Depot verdeckt auf (U2-ADR-463). Wächter: tools/overlay-schreiber-pruefen.js.
   Anlass: nach einem Doppelklick bei offenem Depot lag der Öffnen-Schirm hinter der App. Erhebung aller Wege im Bericht
   zur Ablage ohne Netz; die Positivliste nennt je Eintrag den Grund, neue Einträge nur mit Wort der Gegenlesung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pruefen, POSITIV } = require('../tools/overlay-schreiber-pruefen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Overlay·Wächter] jeder Aufruf eines Overlay-Schreibers holt das Overlay nach vorn oder steht mit Grund in der Positivliste', () => {
  const r = pruefen(KERN);
  assert.ok(r.stellen.length >= 20, 'Ausbeute: die Aufrufe werden gefunden (' + r.stellen.length + ')');
  assert.deepEqual(r.ungedeckt.map((s) => s.schluessel), []);
  assert.deepEqual(r.verwaist, [], 'kein Eintrag der Positivliste ohne Stelle');
  for (const [k, grund] of Object.entries(POSITIV)) assert.match(grund, /nur bei sichtbarem Overlay|nur beim Start|Schluss-Sicht/, k + ': ohne Grund');
});

// Deckel: die Positivliste darf nur schrumpfen — 15 Stellen über 14 Einträge (zwei Boot-Aufrufe teilen einen), 01.10.2026.
// Ein neuer Eintrag oder eine neue Stelle hebt den Deckel nur mit Wort der Gegenlesung.
const DECKEL_STELLEN = 15;
const DECKEL_EINTRAEGE = 14;
test('[Overlay·Wächter·Deckel] die Positivliste wächst nicht über ihren Deckel', () => {
  const ueberListe = pruefen(KERN).stellen.filter((s) => !s.gedeckt && s.grund).length;
  assert.ok(ueberListe <= DECKEL_STELLEN, 'Stellen über die Positivliste: ' + ueberListe + ' > ' + DECKEL_STELLEN);
  assert.ok(Object.keys(POSITIV).length <= DECKEL_EINTRAEGE, 'Einträge: ' + Object.keys(POSITIV).length + ' > ' + DECKEL_EINTRAEGE);
  const mehr = pruefen(KERN + "\nfunction renderWelcome() { if (x) x.onclick = () => renderCryptoOverlay(); }\n").stellen.filter((s) => !s.gedeckt && s.grund).length;
  assert.ok(mehr > DECKEL_STELLEN, 'Rot-Beweis im Test: eine weitere Stelle unter einem bestehenden Eintrag läge über dem Deckel');
});

test('[Overlay·Wächter·Rot-Beweis] der alte Doppelklick-Weg (Schirm direkt rendern) wird gefunden', () => {
  const neu = 'if (_appBereitsBetreten || data) geheZuZuhause(zeigen); else zeigen();';
  assert.equal(KERN.split(neu).length, 2, 'Anker trifft genau einmal');
  const r = pruefen(KERN.replace(neu, 'zeigen();'));
  assert.deepEqual(r.ungedeckt.map((s) => s.schluessel), ['booteEingang · renderCryptoOverlay @ const zeigen = () =>']);
});

test('[Overlay·Wächter·Rot-Beweis] ein neuer, ereignisgetriebener Aufruf ohne beides wird gefunden', () => {
  const r = pruefen(KERN + "\nfunction neuerWeg() { window.addEventListener('message', () => { renderCryptoOverlay(null); }); }\n");
  assert.equal(r.ungedeckt.length, 1);
});
