'use strict';
/* ═══════════════════════════════════════════════════════
   Lese-App: jeder Text der eigenen Oberfläche hat eine englische Fassung (B3-Nachtrag, 19.09.2026)
   ───────────────────────────────────────────────────────
   Befund aus dem echten Browser (tests/e2e/lese-app-englisch.spec.js): 70 der 102 Texte der Lese-App gibt es nur dort (Willkommen,
   Passwort, Banner, Notfall-Blatt, Antwort, Kamera, Fehler). Der Kern kennt sie nicht, ihre englische Fassung fehlte überall: eine
   englische Datei erschien mit deutscher Oberfläche. Jetzt: LESE_TEXTE_EN (App-eigen) + ZUSICHERUNG_TEXTE_EN (Zusicherungen) decken jeden
   Schlüssel. Ein neuer deutscher Text ohne Englisch ist rot. S1 (21.09.2026): bis dahin deckte die Region AB_WERK_TEXTSATZ_EN (Kern-gleiche
   Schlüssel) 15 Texte mit ab; sie stehen jetzt in LESE_TEXTE_EN, die Region ist leer.
   ═══════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

const flach = (v) => (Array.isArray(v) ? Array.prototype.slice.call(v).join('\n') : String(v));
const platzhalter = (v) => (flach(v).match(/\{[a-z]+\}/gi) || []).sort().join(',');
const DEUTSCH = /[äöüßÄÖÜ]/;

function englisch(V, k) {
  if (Object.prototype.hasOwnProperty.call(V.ZUSICHERUNG_TEXTE_EN, k)) return V.ZUSICHERUNG_TEXTE_EN[k];
  if (Object.prototype.hasOwnProperty.call(V.LESE_TEXTE_EN, k)) return V.LESE_TEXTE_EN[k];
  return undefined;
}

test('[Lese-App·EN·Oberfläche] JEDER Text der Lese-App hat eine englische Fassung — aus den Zusicherungen oder der App-eigenen Tabelle, nicht aus einer eingebackenen Kern-Basis', () => {
  const V = ladeLesen().V;
  const keys = Object.keys(V.STRINGS);
  assert.ok(keys.length >= 100, 'Ausbeute: ' + keys.length + ' Texte');
  const ohne = keys.filter((k) => englisch(V, k) === undefined);
  assert.equal(ohne.length, 0, 'ohne englische Fassung: ' + ohne.join(', '));
});

test('[Lese-App·EN·Oberfläche] die App-eigene Tabelle führt nur echte Schlüssel, keine Zusicherungen, gleiche Platzhalter, keine deutschen Zeichen', () => {
  const V = ladeLesen().V;
  const keys = new Set(Object.keys(V.STRINGS));
  const tabelle = Object.keys(V.LESE_TEXTE_EN);
  assert.ok(tabelle.length >= 60, 'Ausbeute: ' + tabelle.length);
  const fehler = [];
  for (const k of tabelle) {
    if (!keys.has(k)) fehler.push(k + ': kein Text der Lese-App');
    if (V.ZUSICHERUNGS_SCHLUESSEL_LESEN.includes(k)) fehler.push(k + ': Zusicherung — gehört in ZUSICHERUNG_TEXTE_EN');
    const de = V.STRINGS[k], en = V.LESE_TEXTE_EN[k];
    if (Array.isArray(de) !== Array.isArray(en) || (Array.isArray(de) && de.length !== en.length)) fehler.push(k + ': Form (Absatzzahl) verschieden');
    if (platzhalter(de) !== platzhalter(en)) fehler.push(k + ': Platzhalter verschieden');
    if (DEUTSCH.test(flach(en))) fehler.push(k + ': deutsche Zeichen in der englischen Fassung');
    if (flach(de) === flach(en) && flach(de).trim() !== '') fehler.push(k + ': englische Fassung = deutscher Satz');
  }
  assert.equal(fehler.length, 0, fehler.join('\n'));
});

test('[Lese-App·EN·Oberfläche] bei Textsprache en liefert STRINGS für jeden App-eigenen Text die englische Fassung, bei de die deutsche', () => {
  const V = ladeLesen().V;
  const de = {};
  for (const k of Object.keys(V.LESE_TEXTE_EN)) de[k] = flach(V.STRINGS[k]);
  V._foldVollmachtenLesen({ sektoren: {}, textsatzModule: [], abWerkMitschrift: { bereich: [], sprache: { modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, anbieterId: 'vivodepot', texte: {} }, logikModul: [] } });
  assert.equal(V.textsatzSpracheAktiv(), 'en');
  const abweichend = Object.keys(V.LESE_TEXTE_EN).filter((k) => flach(V.STRINGS[k]) !== flach(V.LESE_TEXTE_EN[k]));
  assert.equal(abweichend.length, 0, 'nicht englisch: ' + abweichend.join(', '));
  assert.equal(V.STRINGS.sichtVoll, 'Depot view');
  assert.equal(de.sichtVoll, 'Depot-Ansicht', 'vorher deutsch');
});

test('[Lese-App·EN·Oberfläche·Rot-Beweis] ein Text ohne englische Fassung wird gefunden', () => {
  const V = ladeLesen().V;
  const ohne = ['erfundenerNeuerText'].filter((k) => englisch(V, k) === undefined);
  assert.deepEqual(Array.from(ohne), ['erfundenerNeuerText']);
});
