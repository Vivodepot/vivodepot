'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Proben für `tools/dateisatz-parst-pruefen.js`.

   Der Anlass steht im Werkzeugkopf. Hier steht, warum diese Datei einen
   ROT-BEWEIS trägt und nicht nur einen Grün-Lauf: ein Prüfer, von dem niemand
   gemessen hat, dass er ANSCHLÄGT, ist eine Beruhigung. Genau daran ist die
   Nacht zum 05.09.2026 hängengeblieben — elf Proben lasen `sw.js`, alle waren
   grün, und die Datei war kein gültiges JavaScript.

   Die Rot-Proben unten prüfen die ERKENNUNGSFUNKTION an erfundenen Fällen, nie
   am echten Dateisatz: eine Probe, die ihren eigenen Gegenstand verändert, misst
   sich selbst statt des Bestands.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');
const { pruefe, parsfehler, art } = require('../tools/dateisatz-parst-pruefen.js');
const { DATEISATZ } = require('../scripts/ausgeliefertes-dateiset.js');

const REPO = path.join(__dirname, '..');

test('[Dateisatz] jede ausgelieferte Datei ist gültig — JS parst, JSON parst', () => {
  const e = pruefe(REPO);
  assert.deepEqual(e.kaputt, [],
    'eine ausgelieferte Datei ist syntaktisch ungültig: ' +
    e.kaputt.map((k) => `${k.datei} — ${k.meldung}`).join(' · '));
});

test('[Dateisatz·Ratsche] eine unbekannte Endung gilt als BEFUND, nicht als geprüft', () => {
  const e = pruefe(REPO);
  assert.deepEqual(e.unbekannt, [],
    'der DATEISATZ trägt eine Endung, die dieser Prüfer nicht behandelt: ' +
    e.unbekannt.map((u) => `${u.datei} (${u.endung})`).join(' · ') +
    ' — entweder in ARTEN aufnehmen oder in ANDERSWO_GEDECKT mit Fundstelle eintragen. ' +
    'Schweigend überspringen wäre dieselbe Lücke eine Ebene tiefer.');
  // Und die Ratsche selbst: eine erfundene Endung MUSS unbekannt heissen.
  assert.equal(art('etwas.tar.gz').art, 'unbekannt',
    'eine unbehandelte Endung wird nicht mehr als Befund erkannt');
});

test('[Dateisatz·Positivkontrolle] es wird wirklich etwas geparst', () => {
  const e = pruefe(REPO);
  assert.ok(e.geparst.length + e.kaputt.length > 0,
    'kein einziger Träger wurde überhaupt angefasst — prüft der Prüfer noch?');
  // ZUORDNUNG, nicht Gesundheit: ein KAPUTTER Träger ist zugeordnet, er ist nur rot.
  // Zählte man ihn hier nicht mit, feuerte diese Probe auf Kaputtheit statt auf eine
  // Deckungslücke — sie hiesse Positivkontrolle und prüfte etwas anderes. Genau die
  // Verwechslung, gegen die dieser Prüfer gebaut ist.
  assert.equal(e.geparst.length + e.kaputt.length + e.anderswo.length, DATEISATZ.length,
    'nicht jeder Träger ist zugeordnet — geparst + kaputt + anderswo muss den ganzen Satz ergeben');
});

test('[Dateisatz·ROT-BEWEIS] die Erkennung schlägt an erfundenen Verstößen an', () => {
  // Genau der Fall aus der Nacht zum 05.09.2026: erklärender Rohtext ohne
  // Kommentarzeichen unmittelbar vor einer Anweisung.
  const wieDamals = "// eine Erklaerung\nREBASE auf abc (05.09.): Vorfahr ist xyz\nconst CACHE = 'v1';\n";
  assert.ok(parsfehler('sw.js', wieDamals),
    'der Originalfall — Rohtext vor einer const-Zeile — wird nicht mehr erkannt');

  assert.ok(parsfehler('sw.js', 'const a = ;'), 'kaputtes JavaScript wird nicht erkannt');
  assert.equal(parsfehler('sw.js', "const a = 1;\n"), null, 'gültiges JavaScript wird als kaputt gemeldet');

  assert.ok(parsfehler('manifest.webmanifest', '{ "a": }'), 'kaputtes JSON wird nicht erkannt');
  assert.equal(parsfehler('manifest.webmanifest', '{ "a": 1 }'), null, 'gültiges JSON wird als kaputt gemeldet');
});

test('[Dateisatz·Grenze] die HTML-Träger werden hier NICHT geparst — mit benannter Fundstelle', () => {
  const e = pruefe(REPO);
  const namen = e.anderswo.map((a) => a.datei).sort();
  assert.deepEqual(namen, ['vivodepot-lesen.html', 'vivodepot.html'],
    'die Zuordnung der HTML-Träger hat sich verschoben — dann stimmt auch die Deckungsaussage nicht mehr');
  for (const a of e.anderswo) {
    assert.match(a.wo, /load-kern\.js|load-lesen\.js/,
      'die Deckung wird behauptet, ohne die Fundstelle zu nennen — genau das war der Fehler, den dieser Prüfer verhindern soll');
  }
});
