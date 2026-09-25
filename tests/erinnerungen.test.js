'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Datums-Helfer (rein) + Versions-Hinweis (Teil 3)
   ────────────────────────────────────────────────────────────────────────
   Strang 1b hat das alte data.erinnerungen-Modell (Lese-/Schreib-/Fälligkeits-/
   Karten-Funktionen) abgelöst — die Zeit-Datenpunkte leben jetzt auf der
   Dokument-Ebene (siehe dokumente.test.js / prueftermine.test.js / ampel.test.js).
   Diese Datei prüft nur noch die GETEILTEN, rein lokalen Datums-Helfer
   (_erTageBis/_erDatumPlusMonate) und den Versions-Hinweis. KEINE Krypto.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-06-03T10:00:00Z');   // fester „heute"-Bezug für die Tests

/* ── Datums-Helfer (rein) ───────────────────────────────────────────────── */
test('[Datum] _erTageBis: heute=0, Zukunft positiv, Vergangenheit negativ', () => {
  const { V } = ladeKern();
  assert.equal(V._erTageBis('2026-06-03', JETZT), 0);
  assert.equal(V._erTageBis('2026-06-13', JETZT), 10);
  assert.equal(V._erTageBis('2026-05-24', JETZT), -10);
  assert.equal(V._erTageBis('kein-datum', JETZT), null);
});

test('[Datum] _erDatumPlusMonate: addiert Monate korrekt (mit Jahresüberlauf)', () => {
  const { V } = ladeKern();
  assert.equal(V._erDatumPlusMonate('2026-01-15', 12), '2027-01-15');
  assert.equal(V._erDatumPlusMonate('2025-12-01', 1), '2026-01-01');
  assert.equal(V._erDatumPlusMonate('2026-06-03', 6), '2026-12-03');
});

/* ── Versions-Hinweis (Teil 3) ──────────────────────────────────────────── */
test('[Version] versionAlterTage misst Tage seit Build-Datum', () => {
  const { V } = ladeKern();
  assert.equal(V.versionAlterTage(new Date('2026-06-03T00:00:00Z'), '2026-06-03'), 0);
  assert.equal(V.versionAlterTage(new Date('2026-06-13T00:00:00Z'), '2026-06-03'), 10);
});

test('[Version] Hinweis-Schwelle ~6 Monate: frisch=aus, alt=an', () => {
  const { V } = ladeKern();
  // 100 Tage alt → unter Schwelle (183) → kein Hinweis
  assert.equal(V.versionHinweisFaellig(new Date('2026-09-11T00:00:00Z'), '2026-06-03'), false);
  // 200 Tage alt → über Schwelle → Hinweis
  assert.equal(V.versionHinweisFaellig(new Date('2026-12-20T00:00:00Z'), '2026-06-03'), true);
  // eigene Schwelle respektiert
  assert.equal(V.versionHinweisFaellig(new Date('2026-07-03T00:00:00Z'), '2026-06-03', 10), true);
});

test('[Version] BUILD_DATUM ist gesetzt und gültig (kein Platzhalter)', () => {
  const { V } = ladeKern();
  assert.match(V.BUILD_DATUM, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(V.VERSION_HINWEIS_SCHWELLE_TAGE, 183);
});
