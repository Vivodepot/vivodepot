'use strict';
/* Foto-Rubrik nur lesend (Befund FOTO-RUNDLAUF-VERLUST, 17.11.2026).
   Die Rubrik „Foto“ (D51) zeigt das Deckblatt-Foto in der Liste des Bereichs. Stünde das Feld dort als Auswahl im
   Bearbeiten-Formular (data-edit-ref), läse bearbeitungSpeichern deren beim Zeichnen festgehaltenen Wert zurück. War das
   Foto inzwischen gesetzt, etwa über das Deckblatt, löschte der leere Wert der Auswahl es (Kern: Schleife über
   [data-edit-ref], „delete neu[fid]“). Im Browser gezeigt vom Rundlauf über die Sicherungsdatei
   (Zweites Gerät, Falsches Passwort) und von tests/e2e/hintergrund-wipe-bildschirm.spec.js.
   Diese Probe hält die Ursache an der Quelle fest: die Karte der Foto-Rubrik wird mit darf = false gezeichnet. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function fotoKartenAufrufe(quelle) {
  return quelle.split('\n').filter((z) => /feldgruppenKarteHTML\(\[\{ name: STRINGS\.deckblattFotoHinzufuegen/.test(z));
}
function nurLesend(zeile) {
  return /,\s*false,\s*\{\}\);\s*$/.test(zeile);
}

test('[Foto-Rubrik] die Karte der Foto-Rubrik steht genau einmal im Kern und wird nur lesend gezeichnet', () => {
  const z = fotoKartenAufrufe(KERN);
  assert.equal(z.length, 1, 'Vorbedingung: genau ein Aufruf für die Foto-Rubrik');
  assert.equal(nurLesend(z[0]), true, 'die Foto-Rubrik gibt darf = false weiter, sonst steht das Feld im Bearbeiten-Formular:\n' + z[0].trim());
});

test('[Foto-Rubrik·Rot-Beweis] mit darf statt false fällt die Probe', () => {
  const z = fotoKartenAufrufe(KERN);
  const gekippt = z[0].replace(/,\s*false,\s*\{\}\);\s*$/, ', darf, {});');
  assert.notEqual(gekippt, z[0], 'Vorbedingung: der Aufruf ließ sich kippen');
  assert.equal(nurLesend(gekippt), false);
});
