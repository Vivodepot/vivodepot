'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Herkunft ohne Abwertung (12.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Die Notfall-Ansicht nennt, wer die Angaben eingetragen hat. Mehr sagt der Satz nicht: Ein Zusatz wie
   „Sie ersetzen keine ärztliche Prüfung.“ wertet die eigene Angabe der Person ab. Selbst Eingetragenes bleibt
   über die Herkunft erkennbar, nicht über eine Abwertung.
   Klasse: Jeder Wortlaut der Anwendung, der die eigene Eintragung nennt („selbst eingetragen“), trägt keinen
   abwertenden Zusatz, in beiden Sprachen.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const DE = require(path.join(__dirname, '..', 'tools', 'textsatz-de-modul.json'));
const EN = require(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'));
const KENNUNG = 'strings:notfallSelbstEingetragen.text';

function texte(modul) {
  const aus = {};
  const lauf = (o) => { for (const [k, v] of Object.entries(o)) { if (typeof v === 'string') aus[k] = v; else if (v && typeof v === 'object') lauf(v); } };
  lauf(modul);
  return aus;
}
const HERKUNFT = /selbst eingetragen|entered[^.]*personally/i;
const ABWERTUNG = /ersetz\w* kein|kein Ersatz|ohne Gewähr|ungeprüft|nicht geprüft|does not replace|do not replace|no substitute|unverified|not verified/i;
function abwertungsFunde(alle) {
  return Object.entries(alle).filter(([, t]) => HERKUNFT.test(t) && ABWERTUNG.test(t)).map(([k]) => k).sort();
}

test('[Notfall·Herkunft] der Satz nennt die Person und sagt nur, wer eingetragen hat', () => {
  const de = texte(DE)[KENNUNG], en = texte(EN)[KENNUNG];
  assert.equal(de, 'Alle Angaben hat {name} selbst eingetragen.');
  assert.equal(en, '{name} entered all of this information personally.');
});

test('[Notfall·Herkunft] kein Wortlaut, der die eigene Eintragung nennt, wertet sie ab', () => {
  const de = texte(DE), en = texte(EN);
  assert.ok(Object.values(de).some((t) => HERKUNFT.test(t)), 'Vorbedingung: der deutsche Textsatz nennt die Herkunft');
  assert.ok(Object.values(en).some((t) => HERKUNFT.test(t)), 'Vorbedingung: der englische Textsatz nennt die Herkunft');
  assert.deepEqual(abwertungsFunde(de), []);
  assert.deepEqual(abwertungsFunde(en), []);
});

test('[Notfall·Herkunft·Rot-Beweis] die frühere Fassung wird in beiden Sprachen gefunden', () => {
  assert.deepEqual(abwertungsFunde({ a: 'Alle Angaben hat {name} selbst eingetragen. Sie ersetzen keine ärztliche Prüfung.' }), ['a']);
  assert.deepEqual(abwertungsFunde({ b: '{name} entered all of this information personally. It does not replace a medical assessment.' }), ['b']);
  assert.deepEqual(abwertungsFunde({ c: 'Diese Karte ersetzt keinen amtlichen Ausweis.' }), [], 'ein Satz ohne Herkunft gehört nicht zur Klasse');
});
