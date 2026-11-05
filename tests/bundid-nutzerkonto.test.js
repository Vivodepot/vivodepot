'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Probe: Die BundID ist ein Nutzerkonto, kein Ausweis (Befund 01.11.2026, MITTEL)
   ───────────────────────────────────────────────────────────────────────────
   Der Befund: Die Hilfe zur BundID nannte sie „Ihr digitaler Personalausweis“. Die BundID
   ist das zentrale Bürgerkonto nach § 3 Abs. 1 OZG; der Online-Ausweis (eID) ist nur eine
   der Arten, sich dort anzumelden. Rentenantrag und Ummeldung waren keine tragenden
   Beispiele: Den Rentenantrag stellt man über die Dienste der Rentenversicherung, die
   elektronische Wohnsitzanmeldung gibt es nur in angeschlossenen Gemeinden.

   Geprüft wird jeder Text zur BundID in allen vier Sprachsätzen und in der Lese-App.
   ═══════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const lade = (datei) => JSON.parse(fs.readFileSync(path.join(WURZEL, 'tools', datei), 'utf8')).texte;

const ALS_AUSWEIS = /BundID[^.]*\b(Personalausweis|Ausweis|digital ID|identity card|ID card)\b/i;

function funde(texte) {
  return Object.entries(texte).filter(([, v]) => ALS_AUSWEIS.test(String(v))).map(([k, v]) => `${k}: „${v}“`);
}

for (const datei of ['textsatz-de-modul.json', 'textsatz-de-pro-modul.json', 'textsatz-en-modul.json', 'textsatz-en-pro-modul.json']) {
  test(`BundID heißt Nutzerkonto, nicht Ausweis (${datei})`, () => {
    const t = lade(datei);
    assert.deepEqual(funde(t), []);
    const konto = datei.includes('-de-') ? /^Zentrales Nutzerkonto für Online-Anträge/ : /^Central user account for online applications/;
    assert.match(t['administration.bundid/bundidEmailAddress.hint'], konto);
  });
}

test('BundID: auch die Lese-App trägt den alten Satz nicht', () => {
  const lesen = fs.readFileSync(path.join(WURZEL, 'vivodepot-lesen.html'), 'utf8');
  assert.equal(/BundID ist Ihr digitaler Personalausweis|BundID is your digital ID/.test(lesen), false);
});

test('Rot-Beweis: der alte Wortlaut fällt auf', () => {
  assert.equal(funde({
    a: 'Die BundID ist Ihr digitaler Personalausweis für Behördengänge (Elterngeld, Wohngeld, Rentenantrag, Ummeldung).',
    b: 'BundID is your digital ID for dealing with authorities.',
    c: 'Zentrales Nutzerkonto für Online-Anträge bei Behörden. Anmelden mit dem Online-Ausweis.',
  }).length, 2);
});
