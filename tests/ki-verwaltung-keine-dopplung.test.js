'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Regressions-Wächter — ki_* wohnt an EINEM Ort (U2-ADR-096 Block E / U2-ADR-069)
   ────────────────────────────────────────────────────────────────────────
   Die alte flache ki_verhalten_*-Menge unter `verwaltung` wurde entfernt (Register
   der entfernten Felder), die lebenden ki_*-Felder wohnen als Unterfelder von
   `vorsorge_instrumente` (Typ ki-verfuegung); kiwiz schreibt dorthin.

   Dieser Test ist ein WÄCHTER, kein Fix: er ist grün auf `cd59998` (keine Dopplung)
   und schlägt fehl, falls eine künftige Änderung `ki_*` wieder FLACH unter
   `verwaltung` einführt (die Dopplung, die auseinanderlaufen könnte).

   Präzision (Gesamtstatus-Bericht S3): geprüft wird über den ORT (verwaltung-Feldset
   vs. Instrument-Unterfeld), NICHT über den bloßen Präfix — `ki_verhaltensgrenze`
   ist ein LEBENDES Instrument-Unterfeld und teilt das Präfix `ki_verhalten` mit der
   entfernten Menge; es darf daher nicht fälschlich als Dopplung gelesen werden.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Alle Feld-IDs eines Sektors, rekursiv über Unterfelder (flachgeklopft) — der „flache" Feldsatz.
function sektorFeldIds(sek) {
  const ids = [];
  const sammle = (felder) => {
    for (const f of (felder || [])) {
      ids.push(f.id);
      if (Array.isArray(f.unterFelder)) sammle(f.unterFelder);
    }
  };
  for (const s of (sek.sektionen || [])) sammle(s.felder);
  return ids;
}

// Die Unterfeld-IDs der geteilten Instrument-Liste provisionInstruments.
function instrumentUnterFeldIds(V) {
  const sek = V.SEKTOR_BY_ID['advanceCare'];
  for (const s of (sek.sektionen || [])) {
    for (const f of (s.felder || [])) {
      if (f.id === 'provisionInstruments') return (f.unterFelder || []).map(u => u.id);
    }
  }
  return [];
}

// "Englisch vor v1": die KI-Felder trugen bis zur Umbenennung ein gemeinsames Präfix ('ki_'), an
// dem sich „lebendes KI-Feld" von „alles andere" unterscheiden ließ. Die neuen Feld-Ids (aus
// KI_KORPUS.steps, z. B. 'basicDecision') teilen kein Präfix mehr — Mitgliedschaft in der echten
// KI_KORPUS-Feld-Id-Liste ersetzt die Präfix-Prüfung, dieselbe Technik wie bei `_kiHatDaten`.
function istKiFeldId(V, id) {
  return V.KI_KORPUS.steps.some(s => s.feld.id === id);
}

test('[Wächter] kein KI-Feld FLACH unter dem verwaltung-Sektor (keine wiedergeborene Dopplung)', () => {
  const { V } = ladeKern();
  const sek = V.SEKTOR_BY_ID['administration'];
  assert.ok(sek, 'verwaltung-Sektor existiert');
  // Nur die verwaltung-EIGENEN Felder; die Instrument-Unterfelder liegen in vorsorge, nicht hier.
  const kiFlach = sektorFeldIds(sek).filter(id => istKiFeldId(V, id));
  assert.deepEqual(kiFlach, [],
    'KI-Felder flach unter verwaltung gefunden — das ist die Dopplung, die der Wächter fernhält: '
    + kiFlach.join(', '));
});

test('[Wächter] die lebenden KI-Felder wohnen als Unterfelder von provisionInstruments', () => {
  const { V } = ladeKern();
  const kiUf = instrumentUnterFeldIds(V).filter(id => istKiFeldId(V, id));
  // Gegenprobe zur Löschung: die Menge ist NICHT verschwunden, sie wohnt am Instrument.
  assert.ok(kiUf.includes('basicDecision'),
    'basicDecision (ehem. ki_grundentscheidung) fehlt als Instrument-Unterfeld — KI-Felder wohnen nicht mehr am erwarteten Ort');
  assert.ok(kiUf.includes('behaviouralLimit'),
    'behaviouralLimit (ehem. ki_verhaltensgrenze) fehlt');
  assert.ok(kiUf.length >= 10, 'die KI-Instrument-Unterfelder sind vollständig (>=10), gefunden: ' + kiUf.length);
});
