'use strict';
/* ════════════════════════════════════════════════════════════════════════
   S13 + Zug-3-Nachtrag (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026)
   ────────────────────────────────────────────────────────────────────────
   S13: saveStatusKeineDatei ("Gespeichert — keine Sicherungsdatei") stammt
   von VOR dem Umbau „Depot ist Datei" (08.08.2026). Seither existiert ab dem
   Anlegen IMMER eine Datei — der Zustand heißt nur noch "nicht aktuell",
   nicht "keine". Derselbe Fehler wie Wortlaut Nr. 4 (d40KeineDateiText,
   :3691 ff.), der Quelltext benennt ihn dort selbst: „‚noch keine
   Sicherungsdatei' las sich wie ‚gar keine' — das war der Fehler." Die
   Kopfzeile war in den neun Wortlauten (Zug 3 des Vorauftrags) nicht
   enthalten — dieser Zug holt sie nach.

   Zug 3 zusätzlich, am selben Weg: zielwechselText (S11) schreibt „NICHT" in
   Versalien (Sprachausgaben lesen Versalien teils buchstabenweise, bricht
   außerdem den Ton der übrigen Texte) und nennt den „Downloads-Ordner", der
   beim Anker-Download nicht garantiert ist (Browser können den Ablageort
   selbst wählen lassen — schnellstartSchritt5 sagt das bereits ehrlich).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[S13] saveStatusKeineDatei behauptet nicht länger "keine" Sicherungsdatei', () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.saveStatusKeineDatei, /keine Sicherungsdatei/i,
    'seit "Depot ist Datei" (08.08.) gibt es ab dem Anlegen IMMER eine Datei — nur nicht immer eine aktuelle');
});

test('[S13] saveStatusKeineDatei sagt stattdessen: eine Datei existiert, ist aber veraltet', () => {
  const { V } = ladeKern();
  assert.match(V.STRINGS.saveStatusKeineDatei, /aktuell/i,
    'muss "aktuell" (bzw. das Gegenteil davon) benennen — die etablierte Vokabel dieses ganzen Zustandsmodells');
});

test('[S13] die vier/fünf Save-Status-Zustände bleiben voneinander unterscheidbar (kein Text doppelt)', () => {
  const { V } = ladeKern();
  const texte = [
    V.STRINGS.saveStatusFehlgeschlagen,
    V.STRINGS.saveStatusUnbestaetigt,
    V.STRINGS.saveStatusAenderungEinzahl,
    V.STRINGS.saveStatusAlsDatei,
    V.STRINGS.saveStatusKeineDatei,
  ];
  const eindeutig = new Set(texte);
  assert.equal(eindeutig.size, texte.length, 'jeder Zustand hat einen eigenen Wortlaut, keiner verdeckt einen anderen');
});

test('[Zug 3] zielwechselText schreibt "nicht" NICHT in Versalien (Sprachausgaben, Ton)', () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.zielwechselText, /\bNICHT\b/,
    'Versalien-„NICHT" liest sich in Sprachausgaben teils buchstabenweise und bricht den Ton der übrigen Texte');
  assert.match(V.STRINGS.zielwechselText, /\bnicht\b/i, 'die Aussage selbst (nicht mehr aktuell) bleibt erhalten');
});

test('[Zug 3] zielwechselText behauptet nicht mehr verbindlich einen "Downloads-Ordner"', () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.zielwechselText, /Downloads-Ordner/,
    'beim Anker-Download ist der Ablageort NICHT garantiert — manche Browser lassen ihn die Bürgerin selbst wählen (wie schnellstartSchritt5 bereits ehrlich sagt)');
});
