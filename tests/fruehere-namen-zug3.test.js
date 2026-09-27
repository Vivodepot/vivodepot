'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Frühere Namen" (11.08.2026), Zug 3: die Heirats-Felder
   werden Verweis. Was nach F4 Zug 4 von heirat_name/heirat_namenswahl übrig
   ist, verweist auf die neue Liste, statt ein zweiter Namens-Ort zu werden
   — die Form der Namensführung bleibt, wo F4 sie hingelegt hat, der Name
   selbst steht nirgends dort. Reine Hinweis-Änderung, kein Migrations-
   bedarf: U2-ADR-050 (Bürgerdaten werden nie durch Migration gelöscht) —
   ein Bestandswert im Rettungsfeld bleibt unverändert stehen.

   Übrige Anlass-Blätter (Scheidung/Einbürgerung/Adoption): existieren
   gemessen (Regel 23) NICHT als eigene Situationsblätter — die Auftrags-
   Formulierung „soweit es sie gibt" trifft heute auf keine zusätzliche
   Stelle zu.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Frühere Namen·Zug3] heirat_namenswahl_frueher verweist auf die neue Liste, Bestandswert bleibt unverändert', () => {
  const { V } = ladeKern();
  const f = V.SEKTOR_BY_ID.identity.sektionen[0].felder.find((x) => x.id === 'choiceOfNameAfterMarriage2');
  assert.ok(f, 'Feld existiert weiterhin (kein Datenverlust)');
  assert.equal(f.typ, 'text', 'bleibt Freitext — nichts wird geparst');
  assert.match(f.hint, /Frühere Namen/, 'Hinweis verweist auf die neue Liste');
});

test('[Frühere Namen·Zug3] heirat_name_frueher (Situationsblatt hauskauf) verweist auf die neue Liste', () => {
  const { V } = ladeKern();
  const sit = V.SITUATION_BY_ID.hauskauf;
  const eintraege = sit.bloecke.flatMap((b) => b.eintraege || []);
  const eintrag = eintraege.find((e) => e.feld && typeof e.feld === 'object' && e.feld.id === 'heirat_name_frueher');
  assert.ok(eintrag, 'Feld existiert weiterhin im Situationsblatt (kein Datenverlust)');
  assert.equal(eintrag.feld.typ, 'text');
  assert.match(eintrag.feld.hint, /Frühere Namen/, 'Hinweis verweist auf die neue Liste');
  assert.match(eintrag.feld.hint, /Verweis, kein zweiter Namens-Ort/, 'sagt ausdrücklich: kein zweiter Ort');
});

test('[Frühere Namen·Zug3] kein zusätzliches Anlass-Situationsblatt (Scheidung/Einbürgerung/Adoption) existiert heute', () => {
  const { V } = ladeKern();
  const ids = Object.keys(V.SITUATION_BY_ID);
  for (const anlass of ['scheidung', 'einbuergerung', 'adoption']) {
    assert.equal(ids.includes(anlass), false, anlass + ' ist kein eigenes Situationsblatt — nichts nachzuziehen');
  }
});

test('[Frühere Namen·Zug3] echter Kern: ein Bestandsdepot mit altem heirat_name_frueher-Wert übersteht ein erneutes Normalisieren unverändert', async () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 58;
  alt.situationen = { hauskauf: { heirat_name_frueher: 'Gemeinsamer Ehename Mustermann' } };
  V.depotNormalisieren(alt);
  V.depotNormalisieren(alt);   // zweimal — Regel 18: Idempotenz derselben Klasse wie F4 Zug 3
  assert.equal(alt.situationen.hauskauf.heirat_name_frueher, 'Gemeinsamer Ehename Mustermann',
    'der Bestandswert bleibt wortgetreu erhalten, kein stilles Verschieben oder Löschen');
});
