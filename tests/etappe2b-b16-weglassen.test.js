'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Etappe 2b (Schnitt Glied 2, A286) — „Weglassen, nicht Umbelegen"
   ────────────────────────────────────────────────────────────────────────
   Jedes Ziel, das `_b16Felder` (das größte Einzelziel der Bereichsschicht,
   143 Kern-Treffer) in den Depot-Schreibweg schickt, muss existieren —
   entweder als Katalogfeld (`feldDefFuer`) oder als BEREICH-ROLLE
   (`personenListe`/`schutzbefohleneListe`/`instrumenteListe` — ein Ziel ohne
   eigenes Katalogfeld, das ins globale Personen-/Instrumenten-Register
   zieht). Fehlt beides, wandert der Wert verlustfrei in die Sammel-Notiz,
   statt einen falschen Sektor-Slot anzulegen.

   Heute lösen ALLE Ziele von `B16_FELD_MAPPING` auf — die Basis-12-Sektoren
   werden nie entfernt, nur angedockte Module fügen hinzu (`bereicheAlle` =
   `SEKTOREN.concat(_BEREICHS_MODUL_REGISTRY)`). Der Rot-Beleg für „existiert
   nicht" braucht darum eine ERFUNDENE Sektor/Feld-Kombination — dieselbe
   Klasse Fehler wie im Anlass des Auftrags „Falsche Sektorliste"
   (`versicherungen`/`arbeit`), nur hier gegen die Feld-Ebene statt die
   Sektor-Liste selbst geprüft.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Vier B16_FELD_MAPPING-Einträge zeigen auf Felder, die es im heutigen Katalog nicht mehr gibt —
// gefunden durch DIESE Probe, nicht vorher bekannt. Zwei sind U2-ADR-067 (10.07.2026, formal
// entfernt, s. ALT_LABEL_REGISTER); der dritte (`sorgerecht_ort`) hat keinen ADR-Eintrag — die
// Sorgerechtsverfügung wurde zur Instrument-Liste (U2-ADR-096) und ein Ablageort-Unterfeld kam
// dabei nie mit. VOR diesem Bau schrieb `_b16Felder` alle vier klaglos in einen Phantom-Slot
// (`data.sektoren.advanceCare.<feldId>`) — sichtbar für niemanden. Der neue Wächter (`_b16ZielExistiert`)
// lenkt sie jetzt in die Sammel-Notiz, wie jedes andere unplatzierbare Rest-Unterfeld. Bewusst
// NICHT aus B16_FELD_MAPPING entfernt — der Wächter fängt sie zur Laufzeit ohnehin ab, und ein
// Entfernen wäre eine zweite, hier nicht beauftragte Änderung an derselben Tabelle.
const B16_STALE_ZIELE_BEKANNT = Object.freeze([
  'patientenverf_wunsch', 'patientenverfuegung_text', 'palliativ_wunsch', 'sorgerecht_ort',
]);

test('[2b] jedes B16_FELD_MAPPING-Ziel existiert im Katalog — bis auf die bekannten Altlasten', () => {
  const { V } = ladeKern();
  const fehlend = V.B16_FELD_MAPPING.filter((m) => !V._b16ZielExistiert(m.sektorId, m.feldId));
  const unbekannt = fehlend.filter((m) => !B16_STALE_ZIELE_BEKANNT.includes(m.alt));
  assert.deepEqual(unbekannt, [], 'eine NEUE tote Mapping-Zeile — benennen (mit Grund) oder korrigieren');
  assert.equal(fehlend.length, B16_STALE_ZIELE_BEKANNT.length,
    'die bekannte Zahl hat sich verändert — gewachsen ist ein Fund, gefallen eine Korrektur, beides gehört benannt');
});

test('[2b] Rollen-Ziele ohne eigenes Katalogfeld gelten als existent (personenListe/instrumenteListe)', () => {
  const { V } = ladeKern();
  // 'menschen' ist KEIN Katalogfeld (Kontakte ziehen ins globale Personen-Register) —
  // trotzdem ein gültiges Ziel, weil `people` es als `personenListe`-Rolle führt.
  // (Der Rollen-Wert selbst bleibt 'menschen' — data.menschen[] ist bewusst NICHT
  // umbenannt, s. Auftrags-Falle "data.menschen[]-Namensraum bleibt Deutsch".)
  assert.equal(V._b16ZielExistiert('people', 'menschen'), true);
  assert.equal(typeof V.feldDefFuer('people', 'menschen'), 'undefined',
    'Gegenprobe: ohne die Rollen-Prüfung wäre das fälschlich "existiert nicht"');
  assert.equal(V._b16ZielExistiert('advanceCare', 'provisionInstruments'), true);
});

test('[2b · Rot-Beleg] eine erfundene Sektor/Feld-Kombination gilt als NICHT existent', () => {
  const { V } = ladeKern();
  assert.equal(V._b16ZielExistiert('versicherungen', 'irgendwas'), false, 'der Sektor existiert nicht');
  assert.equal(V._b16ZielExistiert('gesundheit', 'ein_erfundenes_feld_xyz'), false, 'das Feld existiert nicht');
});

test('[2b · Ende-zu-Ende] eine der vier Altlasten landet in der Sammel-Notiz, nicht in einem Phantom-Feld', () => {
  const { V } = ladeKern();
  const r = V._b16Felder({ data: { palliativ_wunsch: 'Zuhause sterben', vorname: 'Anna' } });
  assert.ok(!r.felder.some((f) => f.feldId === 'palliativ_wunsch'), 'kein Phantom-Slot vorsorge.palliativ_wunsch');
  const notiz = r.felder.find((f) => f.feldId === 'furtherDetails');
  assert.ok(notiz && String(notiz.wert).includes('palliativ_wunsch: Zuhause sterben'),
    'der Wert bleibt lesbar in der Sammel-Notiz, statt spurlos zu verschwinden');
});

test('[2b · Gegenprobe] echte Katalogfelder aus mehreren Sektoren bleiben grün', () => {
  const { V } = ladeKern();
  for (const [sektorId, feldId] of [
    ['health', 'allergiesMedicationFoodOther'], ['finance', 'accounts'], ['mobility', 'vehicles'],
    ['identity', 'pets'], ['personal', 'whoDependsOnMe'], ['housing', 'landlordPhone'],
  ]) {
    assert.equal(V._b16ZielExistiert(sektorId, feldId), true, sektorId + '.' + feldId + ' sollte existieren');
  }
});
