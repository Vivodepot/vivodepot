'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Probe: Merkzeichen RF heißt Ermäßigung, nicht Befreiung (Befund 01.11.2026, HOCH)
   ───────────────────────────────────────────────────────────────────────────
   Der Befund: Das ⓘ zu den Merkzeichen und die Beschriftung von RF nannten eine
   Befreiung vom Rundfunkbeitrag. Das Merkzeichen RF gibt eine Ermäßigung auf ein Drittel
   (§ 4 Abs. 2 Rundfunkbeitragsstaatsvertrag); eine Befreiung folgt aus anderen Gründen
   (§ 4 Abs. 1). Wer dem Text glaubt und nicht mehr zahlt, gerät in Rückstand.

   Geprüft wird jeder Text, der RF oder den Rundfunkbeitrag zusammen mit Merkzeichen nennt,
   in allen vier Sprachsätzen, dazu die Lese-App, in die der Satz eingebaut wird.
   ═══════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const lade = (datei) => JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', datei), 'utf8')).texte;

const BEFREIUNG = /[Bb]efreiung|exemption|exempt\b/;
const betrifftRf = (k, v) => /markers/.test(k) && /\bRF\b|Rundfunk|broadcasting/.test(String(v));

function funde(texte) {
  return Object.entries(texte).filter(([k, v]) => betrifftRf(k, v) && BEFREIUNG.test(String(v))).map(([k, v]) => `${k}: „${v}“`);
}

for (const datei of ['textsatz-de-modul.json', 'textsatz-de-pro-modul.json', 'textsatz-en-modul.json', 'textsatz-en-pro-modul.json']) {
  test(`RF heißt Ermäßigung, nicht Befreiung (${datei})`, () => {
    const t = lade(datei);
    assert.deepEqual(funde(t), []);
    const ermaessigung = datei.includes('-de-') ? /Ermäßigung beim Rundfunkbeitrag/ : /reduced broadcasting fee/;
    assert.match(t['socialInsurance.markers/RF.label'], ermaessigung);
    assert.match(t['socialInsurance.markers.hint'], ermaessigung);
  });
}

test('RF: auch die Lese-App trägt keine Befreiung', () => {
  const lesen = fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8');
  assert.equal(/RF = Rundfunkbeitragsbefreiung|Rundfunkbeitragsermäßigung\/-befreiung/.test(lesen), false);
});

test('Rot-Beweis: der alte Wortlaut fällt auf', () => {
  const alt = {
    'socialInsurance.markers.hint': 'Merkzeichen … (G = gehbehindert, H = hilflos, RF = Rundfunkbeitragsbefreiung).',
    'socialInsurance.markers/RF.label': 'RF — Rundfunkbeitragsermäßigung/-befreiung',
    'socialInsurance.markers/G.label': 'G — gehbehindert',
  };
  assert.equal(funde(alt).length, 2);
  assert.equal(funde({ 'x/RF.label': 'RF — broadcasting fee reduction/exemption', 'socialInsurance.markers/RF.label': 'RF — broadcasting fee reduction/exemption' }).length, 1);
});
