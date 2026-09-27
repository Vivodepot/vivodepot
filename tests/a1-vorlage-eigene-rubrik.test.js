'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A1 · Kann eine Vorlage ein Feld in die eigene Rubrik eines Moduls legen?
   ────────────────────────────────────────────────────────────────────────────
   ICH HABE DAS AM 21.08.2026 ALS „GEHT NICHT" GEMELDET, und die Meldung war zu
   absolut. Sie hat A2 angehalten (den Anwalts-Prüfstoff auf eine eigene Kennung
   umstellen). **Der Auftrag verlangt: Defekt oder fehlende Fähigkeit? Die Antwort
   ist beides nicht — es ist eine REIHENFOLGE.**

   `_bereichZuSektorId` löst gegen `SEKTOR_BY_ID` auf, und das ist der
   LAUFZEIT-Index: er entsteht über `_sektorIndexNeuBauen()` aus `bereicheAlle()`
   und kennt angedockte Bereiche. **Ist das Bereichsmodul angemeldet, kommt das
   Feld an** — mit `sektorId: 'obhut'`. **Ist es das nicht, wird es benannt
   verworfen**, und das ist richtig: dann gibt es die Rubrik wirklich nicht.

   WORAN DIE ERSTE MESSUNG SCHEITERTE: sie übersetzte die Vorlage in einem Depot
   OHNE das Modul. **Der Fehler lag in meiner Probe, nicht im Kern.**

   WAS TATSÄCHLICH KLEMMT — und das bleibt als Befund: das Einreich-Schema führt
   für `bereich` einen GESCHLOSSENEN enum der zwölf eingebauten Kennungen, und
   `validateTemplate`, das laufende Tor, prüft ihn NICHT. **Schema und Tor sagen
   Verschiedenes.** Eine Drift in der Dokumentation, kein Riegel im Weg — aber
   ein Modulbauer, der das Schema liest, hält die Fähigkeit für nicht vorhanden.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/vorlage-in-eigene-rubrik-messen.js');

function mess() {
  const { V } = ladeKern();
  return M.messen(V);
}

test('[A1·Positivkontrolle] ein eingebauter Bereich kommt durch — der Übersetzer ist heil', () => {
  /* Ohne sie hiesse „ohne Modul verworfen" womöglich nur, dass der Übersetzer gar nichts
     durchlässt. */
  const m = mess();
  assert.equal(m.kontrolleEingebaut, 1,
    'ein Feld mit `bereich: verwaltung` kommt nicht an — dann misst diese Datei einen kaputten '
    + 'Übersetzer statt der Rubrik-Frage');
});

test('[A1·DIE ANTWORT] mit angedocktem Bereichsmodul kommt das Feld an', () => {
  const m = mess();
  assert.equal(m.mitModul.imIndex, true, 'der Laufzeit-Index kennt die angedockte Rubrik nicht');
  assert.equal(m.mitModul.angekommen, 1,
    'das Feld wird trotz angedockter Rubrik verworfen — dann ist es doch eine fehlende Fähigkeit');
  assert.equal(m.mitModul.sektorId, 'obhut', 'es landet nicht in der eigenen Rubrik');
  assert.deepEqual(m.mitModul.verworfen, []);
});

test('[A1] ohne das Modul wird BENANNT verworfen — und das ist richtig', () => {
  /* Kein Defekt: eine Rubrik, die es nicht gibt, darf kein Feld aufnehmen. Der Grund steht
     namentlich da (`bereich`), damit ein Tippfehler nicht wie ein Verzicht aussieht. */
  const m = mess();
  assert.equal(m.ohneModul.angekommen, 0);
  assert.deepEqual(m.ohneModul.verworfen, [{ name: 'Fristensystem', grund: 'bereich' }]);
});

test('[A1·DER REST-BEFUND] Schema und Tor sagen Verschiedenes', () => {
  /* Das laufende Tor lässt die eigene Rubrik durch; das Einreich-Schema kennt sie nicht. Wer das
     Schema liest — und genau das tut ein Modulbauer —, hält die Fähigkeit für nicht vorhanden.
     Vorgelegt, nicht aufgelöst: ob der enum geöffnet oder das Tor verschärft wird, ist eine
     Kontrakt-Frage. */
  const m = mess();
  /* 16.09.2026, Nachtrag U2-ADR-289: der enum trägt seither zusätzlich die benannten Pro-Bereiche (aus dem
     Bereichsersatz des Pro-Produkts). Der Befund selbst bleibt: eine ANGEDOCKTE Rubrik (obhut) kennt er
     weiterhin nicht. Die Zahl kommt darum aus der Quelle, nicht aus einer Konstante hier. */
  const proBereiche = Object.keys(JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, 'fixtures',
    'pro-bereichsersatz-testschablone.json'), 'utf8')).neu).length;
  assert.equal(m.schemaEnum, 13 + proBereiche, 'der enum hat sich verändert');
  assert.equal(m.schemaKenntObhut, false, 'das Schema kennt jetzt eine angedockte Kennung');
  assert.equal(m.torSagt, 'GÜLTIG',
    'das Tor weist die eigene Rubrik jetzt ab — dann ist die Drift aufgelöst und dieser Befund überholt');
});
