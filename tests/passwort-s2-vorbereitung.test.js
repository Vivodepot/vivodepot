'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Passwort in zwei Schritten: technische Vorbereitung (30.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Oberfläche der zwei Schritte baut die Gestaltung; hier stehen die Prüfungen, auf die sie sich stützt.
   - K1/K9/K10: pwProbeVergleich sagt, welches der sechs Wörter abweicht, und trennt „nur Schreibung oder Trenner
     anders“ von „gleich“, weil das Depot nur mit der Kanonform öffnet. Ein eigenes Passwort bekommt nie eine Stelle.
   - K10: whcProbeStelle nennt die erste abweichende Stelle des Ersatz-Codes, gelesen wie whcCodeLesen.
   - K4: beim Vorschlag zeigt die Stärke-Anzeige nichts, beim eigenen Passwort wie bisher.
   - K2: „Später einrichten“ ohne eigenen Ablehnen-Dialog ist vorbereitet und steht ab Werk aus.
   Rot-Beweis: eine Probe, die Groß/klein gleichsetzt, und eine Stelle beim eigenen Passwort fallen auf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LISTE = ['tinte', 'wolke', 'hafen', 'apfel', 'geige', 'birke', 'kanne'];
const SOLL = 'tinte-wolke-hafen-apfel-geige-birke';

// Das Urteil, das eine Probe-Funktion über drei Grenzfälle fällt; Grundlage auch des Rot-Beweises.
function probeUrteil(f) {
  const raus = [];
  if (f(SOLL, 'Tinte Wolke Hafen Apfel Geige Birke', LISTE).art === 'gleich') raus.push('Schreibung gilt als gleich');
  if (f(SOLL, SOLL, LISTE).art !== 'gleich') raus.push('Kanonform gilt nicht als gleich');
  if (f('mein-eigenes-passwort', 'mein-eigenes-passwortX', LISTE).wort !== -1) raus.push('eigenes Passwort bekommt eine Stelle');
  return raus;
}

test('[S2·Probe·Wörter] gleich, ein Wort abweichend, nur Schreibung/Trenner, ungleich, leer', () => {
  const { V } = ladeKern();
  const f = V.pwProbeVergleich;
  assert.equal(typeof f, 'function');
  assert.deepEqual(f(SOLL, SOLL, LISTE), { art: 'gleich', wort: -1 });
  assert.deepEqual(f(SOLL, 'tinte-wolke-hafen-apfel-geige-kanne', LISTE), { art: 'wort', wort: 5 });
  assert.deepEqual(f(SOLL, 'tinte wolke hofen apfel geige birke', LISTE), { art: 'wort', wort: 2 }, 'auch mit Leerzeichen getippt');
  assert.deepEqual(f(SOLL, 'Tinte-Wolke-Hafen-Apfel-Geige-Birke', LISTE), { art: 'form', wort: -1 });
  assert.deepEqual(f(SOLL, ' tinte wolke hafen apfel geige birke ', LISTE), { art: 'form', wort: -1 });
  assert.deepEqual(f(SOLL, 'tinte-wolke-hafen', LISTE), { art: 'ungleich', wort: -1 });
  assert.deepEqual(f(SOLL, '', LISTE), { art: 'leer', wort: -1 });
  assert.deepEqual(probeUrteil(f), []);
});

test('[S2·Probe·Wörter] ein eigenes Passwort bekommt nie eine Stelle', () => {
  const { V } = ladeKern();
  assert.deepEqual(V.pwProbeVergleich('mein-eigenes-passwort', 'mein-eigenes-passwort', LISTE), { art: 'gleich', wort: -1 });
  assert.deepEqual(V.pwProbeVergleich('mein-eigenes-passwort', 'Mein-eigenes-passwort', LISTE), { art: 'ungleich', wort: -1 });
});

test('[S2·Probe·Code] erste abweichende Stelle, gelesen wie whcCodeLesen', () => {
  const { V } = ladeKern();
  const code = V.whcCodeErzeugen((n) => new Uint8Array(n).map((_, i) => i * 7 + 3));
  assert.equal(code.length, V.WHC_STELLEN + 1);
  const gruppiert = V.whcCodeGruppiert(code);
  assert.equal(V.whcProbeStelle(gruppiert.toLowerCase(), code), -1, 'Schreibung und Trenner egal');
  assert.equal(V.whcProbeStelle(code.replace(/0/g, 'O'), code), -1, 'O liest sich als 0');
  const falsch = code.slice(0, 11) + (code[11] === 'B' ? '8' : 'B') + code.slice(12);
  assert.equal(V.whcProbeStelle(falsch, code), 11);
  assert.equal(V.whcProbeStelle(code.slice(0, 10), code), null, 'zu kurz: keine Stelle');
  assert.equal(V.whcCodeLesen(gruppiert), code.slice(0, V.WHC_STELLEN), 'Probe und Öffnen lesen gleich');
});

test('[S2·Verdrahtung] die Code-Probe beim Anlegen nennt die Stelle und das angezeigte Zeichen', () => {
  const { V } = ladeKern();
  const code = V.whcCodeErzeugen((n) => new Uint8Array(n).map((_, i) => i * 5 + 1));
  const falsch = code.slice(0, 11) + (code[11] === 'B' ? '8' : 'B') + code.slice(12);
  assert.equal(V.whcKontrolleHinweis(falsch, code), V.STRINGS.whcKontrolleStelle.replace('{g}', '3').replace('{p}', '4').replace('{z}', code[11]));
  assert.equal(V.whcKontrolleHinweis(code, code), V.STRINGS.whcKontrolleStimmt);
  // Gruppe und Zeichen statt laufender Stelle (Marketing 31.10.2026): Stelle 12 ist in Gruppe 3 das vierte Zeichen.
  assert.match(V.whcKontrolleHinweis(falsch, code), /Gruppe 3 .*Zeichen 4/);
});

test('[S2·Verdrahtung] der Passwort-Schritt nennt beim Vorschlag das abweichende Wort und die Kanonform', () => {
  const K = KERN.slice(KERN.indexOf('function _depotIdentitaetUndPasswortAbfragen('));
  const koerper = K.slice(0, K.indexOf('\nfunction ', 10));
  assert.match(koerper, /_pwIstVorschlagForm\(pw\) \? pwProbeVergleich\(pw, pw2\) : null/);
  assert.match(koerper, /STRINGS\.pwProbeWortWeichtAb\.replace\('\{n\}', String\(probe\.wort \+ 1\)\)/);
  assert.match(koerper, /STRINGS\.pwProbeNurSchreibung/);
  assert.ok(koerper.indexOf('pwProbeVergleich(') < koerper.indexOf("modalPwMismatch('id-pw'"), 'die Wort-Probe vor dem allgemeinen Vergleich');
  const { V } = ladeKern();
  for (const k of ['pwProbeWortWeichtAb', 'pwProbeNurSchreibung', 'whcKontrolleStelle']) assert.equal(typeof V.STRINGS[k], 'string', k);
});

test('[S2·Stärke] beim Vorschlag keine Stärke-Anzeige, beim eigenen Passwort wie bisher', () => {
  const { V, document } = ladeKern();
  document.getElementById('id-pw').value = V.passwortVorschlag();
  V.pwStaerkeAnzeigeVerdrahten('id-pw', 'id-pw-staerke');
  assert.equal(document.getElementById('id-pw-staerke').hidden, true, 'Vorschlag: keine Anzeige');
  document.getElementById('id-pw').value = 'kurzes';
  V.pwStaerkeAnzeigeVerdrahten('id-pw', 'id-pw-staerke');
  assert.equal(document.getElementById('id-pw-staerke').hidden, false, 'eigenes Passwort: Anzeige');
});

test('[S2·Später] „Später einrichten“ ohne Ablehnen-Dialog ist vorbereitet und steht ab Werk aus', () => {
  assert.match(KERN, /^var WHC_ABLEHNEN_OHNE_DIALOG = false;$/m);
  assert.match(KERN, /if \(WHC_ABLEHNEN_OHNE_DIALOG\) weiter\(\); else _whcAblehnenFragen\(passwort, weiter\);/);
});

test('[S2·Rot-Beweis] eine Probe, die Schreibung gleichsetzt oder dem eigenen Passwort eine Stelle gibt, fällt auf', () => {
  const nachsichtig = (s, e) => ({ art: e.toLowerCase().replace(/\s+/g, '-') === s ? 'gleich' : 'ungleich', wort: -1 });
  assert.ok(probeUrteil(nachsichtig).includes('Schreibung gilt als gleich'));
  const plaudernd = (s, e) => (e === s ? { art: 'gleich', wort: -1 } : { art: 'wort', wort: 0 });
  assert.ok(probeUrteil(plaudernd).includes('eigenes Passwort bekommt eine Stelle'));
});
