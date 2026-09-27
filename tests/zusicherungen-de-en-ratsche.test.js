'use strict';
/* ═══════════════════════════════════════════════════════
   Ratsche „jeder Zusicherungsschlüssel hat DE und EN" (19.09.2026, U2-ADR-331/336)
   ───────────────────────────────────────────────────────
   Ein Zusicherungs-Satz sagt dem Empfänger etwas über den Zustand der Anwendung oder der Datei
   („diese Datei ist unverschlüsselt", „Herkunft geprüft"). Er darf aus keinem Modul kommen — also
   muss die App selbst ihn in jeder Sprache tragen, die sie anbietet. Fehlt die englische Fassung,
   liest die englischsprachige Empfängerin einen deutschen Satz, und sie hat kein Original, gegen
   das sie ihn halten könnte.

   Gehalten wird an BEIDEN Stellen, aus der jeweils ERZEUGTEN Sperrliste (nicht aus einer Handliste):
     Lese-App: ZUSICHERUNGS_SCHLUESSEL_LESEN  ↔ STRINGS (de) + ZUSICHERUNG_TEXTE_EN
     Kern:     ZUSICHERUNGS_SCHLUESSEL_KERN   ↔ AB_WERK_TEXTSATZ_DE + TEXTSATZ_EN_QUELLE
   Die Sperrliste wächst, wenn ein neuer Zustands-Satz dazukommt (Erzeuger); diese Ratsche verlangt
   dann DE UND EN, sonst rot — die Lücke kann nicht still entstehen.
   ═══════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const platzhalter = (t) => (String(t).match(/\{[a-z]+\}/gi) || []).sort().join(',');
const DEUTSCH = /[äöüßÄÖÜ]/;

function pruefe(ort, schluessel, de, en) {
  const fehler = [];
  for (const k of schluessel) {
    const d = de(k), e = en(k);
    if (typeof d !== 'string' || !d.trim()) fehler.push(ort + ': ' + k + ' hat keinen deutschen Satz');
    if (typeof e !== 'string' || !e.trim()) { fehler.push(ort + ': ' + k + ' hat keinen englischen Satz'); continue; }
    if (e === d) fehler.push(ort + ': ' + k + ' — die englische Fassung ist der deutsche Satz');
    if (DEUTSCH.test(e)) fehler.push(ort + ': ' + k + ' — die englische Fassung trägt deutsche Zeichen');
    if (typeof d === 'string' && platzhalter(d) !== platzhalter(e)) {
      fehler.push(ort + ': ' + k + ' — Platzhalter verschieden (de ' + platzhalter(d) + ' / en ' + platzhalter(e) + ')');
    }
  }
  return fehler;
}

test('[DE+EN·Lese-App] jeder Zusicherungsschlüssel hat einen deutschen UND einen englischen Satz, mit denselben Platzhaltern', () => {
  const { V } = ladeLesen();
  assert.ok(V.ZUSICHERUNGS_SCHLUESSEL_LESEN.length >= 20, 'Ausbeute: die erzeugte Liste ist nicht leer (' + V.ZUSICHERUNGS_SCHLUESSEL_LESEN.length + ')');
  const fehler = pruefe('Lese-App', V.ZUSICHERUNGS_SCHLUESSEL_LESEN, (k) => V.STRINGS[k], (k) => V.ZUSICHERUNG_TEXTE_EN[k]);
  assert.deepEqual(fehler, []);
});

test('[DE+EN·Lese-App] die englische Tabelle führt KEINEN Schlüssel, der nicht in der Sperrliste steht', () => {
  const { V } = ladeLesen();
  const zuviel = Object.keys(V.ZUSICHERUNG_TEXTE_EN).filter((k) => !V.ZUSICHERUNGS_SCHLUESSEL_LESEN.includes(k));
  assert.deepEqual(zuviel, [], 'ein Eintrag ohne Zusicherung wäre eine zweite, unbewachte Übersetzungsstelle');
});

test('[DE+EN·Lese-App·Wirkung] bei Textsprache en liefert STRINGS den englischen Satz, sonst den deutschen — und ein Modul ändert daran nichts', () => {
  const { V } = ladeLesen();
  const de = V.STRINGS.klartextHinweis;
  assert.match(de, /unverschlüsselt/);
  const d = { schemaVersion: 75, menschen: [], urheberschaft: {}, mappe: [], sektoren: {}, feldDefinitionen: [], sensibelFelder: {}, logikModule: [],
    textsprache: 'en', textsatzModule: [{ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'en', texte: { 'strings:klartextHinweis.text': 'This file is securely encrypted.' } }] };
  V.setData(d);
  V._textsatzModuleAusDepotAnmelden(d);
  assert.equal(V.STRINGS.klartextHinweis, V.ZUSICHERUNG_TEXTE_EN.klartextHinweis, 'die App-eigene englische Fassung gilt, nicht die des Moduls');
  assert.doesNotMatch(V.STRINGS.klartextHinweis, /securely encrypted/);
});

test('[DE+EN·Kern] jeder Zusicherungsschlüssel des Kerns hat einen deutschen UND einen englischen Ab-Werk-Satz, mit denselben Platzhaltern', () => {
  const { V } = ladeKern();
  assert.ok(V.ZUSICHERUNGS_SCHLUESSEL_KERN.length >= 14, 'Ausbeute: ' + V.ZUSICHERUNGS_SCHLUESSEL_KERN.length);
  const fehler = pruefe('Kern', V.ZUSICHERUNGS_SCHLUESSEL_KERN,
    (k) => V.TEXTSATZ_DE_QUELLE.texte['strings:' + k + '.text'], (k) => V.TEXTSATZ_EN_QUELLE.texte['strings:' + k + '.text']);
  assert.deepEqual(fehler, []);
});

test('[DE+EN·Rot-Beweis] die Prüfung findet eine fehlende, eine deutsche und eine platzhalterlose englische Fassung', () => {
  const de = { a: 'Nur deutsch {n}', b: 'Zweiter Satz {n}', c: 'Dritter {n} Satz', d: 'Vierter Satz' };
  const en = { b: 'Zweiter Satz {n}', c: 'Third sentence', d: 'Fourth sentence' };
  const fehler = pruefe('Probe', ['a', 'b', 'c', 'd'], (k) => de[k], (k) => en[k]);
  assert.ok(fehler.some((f) => /a hat keinen englischen/.test(f)), 'fehlend');
  assert.ok(fehler.some((f) => /b — die englische Fassung ist der deutsche Satz/.test(f)), 'gleich');
  assert.ok(fehler.some((f) => /c — Platzhalter verschieden/.test(f)), 'Platzhalter');
  assert.equal(fehler.filter((f) => /^Probe: d /.test(f)).length, 0, 'ein sauberes Paar meldet nichts');
});
