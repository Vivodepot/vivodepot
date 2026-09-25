'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — K7 Zug2 (Auftrag F7/K7, 09.08.2026): der Import wird ein Weg
   statt zwei.
   ────────────────────────────────────────────────────────────────────────
   Befund: flowEinlesenZentral (bereichs-neutral, „Wohin einlesen?") und
   flowEinlesen (pro Bereich, Format-Chooser) überschreiben denselben
   Modal-Körper, beide mit ohneAbbrechen:true — der einzige Ausweg war
   „Schließen", das das GANZE Modal verlässt statt einen Schritt zurück.

   Diese Probe prüft, was in Node ohne echtes DOM prüfbar ist: WAS an
   ui.modal(...) übergeben wird (koerperHTML-Struktur, zweitAktion). Die
   Knopf-Verdrahtung selbst (querySelectorAll liefert im Node-Harness immer
   [], s. tests/load-kern.js makeEl()) braucht Browser-Abnahme (Zug 3:
   „hinein, zurück, wieder hinein").
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function modalSpy(V) {
  const rufe = [];
  V.ui.modal = (opt) => { rufe.push(opt); return () => {}; };
  return rufe;
}

test('[K7·1] flowEinlesen: „Automatisch erkennen" steht VOR den formatspezifischen Knöpfen (nicht mehr zuletzt in der Reihe)', () => {
  const { V } = ladeKern();
  const rufe = modalSpy(V);
  V.flowEinlesen('identity');
  assert.equal(rufe.length, 1);
  const html = rufe[0].koerperHTML;
  const iAuto = html.indexOf('data-i-auto');
  const iFormat = html.indexOf('data-i-format');
  assert.ok(iAuto > -1, 'Auto-Knopf ist vorhanden');
  assert.ok(iFormat > -1, 'Bereich "identitaet" hat mindestens ein eigenes Format (Regressionsschutz für diese Probe)');
  assert.ok(iAuto < iFormat, 'Auto-Knopf steht vor den formatspezifischen Knöpfen');
});

test('[K7·2] flowEinlesen: ein Bereich ohne EIGENES Format zeigt trotzdem die depot-weiten Formate (z. B. JSON) — nur der bereichseigene Filter (K7) ist leer, nicht importFormateFuerSektor', () => {
  const { V } = ladeKern();
  // "mobilitaet" gehört zu den Bereichen ohne eigenes (kategorie:'sektor') Einlese-Format —
  // importFormateFuerSektor hängt aber IMMER die depot-weiten Formate (json) an, s. Zeile 12496ff.
  const formate = V.importFormateFuerSektor('mobility').filter((f) => !f.fachpfad);
  assert.ok(formate.length >= 1, 'mindestens das depot-weite json-Format bleibt sichtbar');
  assert.ok(!formate.some((f) => f.kategorie === 'sektor' && f.sektor === 'mobility'), 'kein bereichseigenes Format für mobilitaet');
  const rufe = modalSpy(V);
  V.flowEinlesen('mobility');
  assert.ok(rufe[0].koerperHTML.includes('data-i-auto'));
  assert.ok(rufe[0].koerperHTML.includes('data-i-format'), 'das depot-weite Format bleibt als Knopf sichtbar');
});

test('[K7·3] flowEinlesen: zweitAktion ist ein echter Zurück-Weg (Label + Handler öffnet flowEinlesenZentral neu)', () => {
  const { V } = ladeKern();
  const rufe = modalSpy(V);
  V.flowEinlesen('identity');
  const opt = rufe[0];
  assert.ok(opt.zweitAktion, 'zweitAktion ist gesetzt (bisher: nur ohneAbbrechen, kein Zurück)');
  assert.equal(opt.zweitAktion.label, V.STRINGS.btnZurueck);
  let geschlossenAufgerufen = false;
  opt.zweitAktion.handler(() => { geschlossenAufgerufen = true; });
  assert.ok(geschlossenAufgerufen, 'der Handler schließt das aktuelle Modal');
  assert.equal(rufe.length, 2, 'und öffnet ein zweites — real, nicht nur behauptet');
  assert.equal(rufe[1].titel, V.STRINGS.einlesenWohinTitel, 'das zweite Modal ist flowEinlesenZentral (bereichs-neutraler Chooser)');
});

test('[K7·4] flowEinlesen: ohneAbbrechen bleibt gesetzt (Schließen ist weiterhin der schnelle Ausweg) — zweitAktion ERGÄNZT, ersetzt nicht', () => {
  const { V } = ladeKern();
  const rufe = modalSpy(V);
  V.flowEinlesen('identity');
  assert.equal(rufe[0].ohneAbbrechen, true);
  assert.equal(rufe[0].primaerLabel, V.STRINGS.btnSchliessen);
});

test('[K7·5] flowEinlesenZentral: „Ganzes Depot — automatisch erkennen" steht weiterhin zuerst (Regressionsschutz, unverändert)', () => {
  const { V } = ladeKern();
  const rufe = modalSpy(V);
  V.flowEinlesenZentral();
  const html = rufe[0].koerperHTML;
  const iGanzes = html.indexOf('data-iz-ganzes');
  const iSektor = html.indexOf('data-iz-sektor');
  assert.ok(iGanzes > -1 && iGanzes < iSektor, '"Ganzes Depot" bleibt der Anfang, nicht nur eine Option unter anderen');
});

/* ── Der Fünf-Bereiche-Filter (Zug 0: aktuell FÜNF, nicht vier — krisenvorsorge kam am selben Tag dazu) ── */

test('[K7·6] flowEinlesenZentral: der Bereichs-Filter — aktuell sechs Bereiche ohne eigenes Import-Format (Erhebung, kein Fix)', () => {
  const { V } = ladeKern();
  /* Stufe 2 (09.09.2026) — die Erhebung gilt ALLEN Bereichen; `SEKTOREN` führt seit dem Umzug
     zwölf und hätte `wohnen` still aus der Zählung genommen. */
  const alle = V.bereicheAlle().map((s) => s.id);
  const mitEigenemFormat = new Set(
    V.IMPORT_FORMATE.filter((f) => f.kategorie === 'sektor').map((f) => f.sektor)
  );
  const ohneEigenesFormat = alle.filter((id) => !mitEigenemFormat.has(id));
  // Diese Probe hält den GEMESSENEN Zustand fest (Regel 23/18-Beleg für den Bericht), sie ist
  // KEINE Norm-Aussage darüber, dass genau diese sechs richtig oder falsch sind — s. Bericht.
  assert.deepEqual(ohneEigenesFormat.sort(), ['emergencyPreparedness', 'mobility', 'personal', 'assets', 'advanceCare', 'housing'].sort());
});
