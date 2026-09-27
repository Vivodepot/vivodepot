'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A468 (Laufzettel Nacht 22./23.08.2026, Posten 14) — Schicht 3: kein Feldtyp
   `organisation`, keine Institutions-Art für Stiftung oder Verein
   ────────────────────────────────────────────────────────────────────────────
   ZUG 0, READ-ONLY — KEIN BAU. Zwei der drei Teilbehauptungen des Fundes vom
   21.08. halten unverändert (kein Feldtyp für juristische Personen, keine
   passende Institutions-Art). Die dritte („kein Freitextfeld in verwaltung/
   finanzen") war zu weit gefasst — beide Sektoren führen viele eng benannte
   `typ:'text'`-Felder, aber KEIN allgemeines Auffangfeld; präziser gemessen
   hält der Kern der Aussage trotzdem.

   WARUM KEIN BAU: die zwölf Institutions-Arten sind eine ENTSCHIEDENE,
   geschlossene Architektur (U2-ADR-142, 17.08.2026 — VOR diesem Fund):
   „keine weiteren Werte, was fehlt, kommt, wenn jemand es vermisst" ist
   wörtliche Auftragsvorgabe. Der Andock-Weg dafür ist gebaut
   und verdrahtet — eine fehlende Stiftungs-/Vereins-Art zu ergänzen wäre ein
   Verstoß gegen diese Vorgabe, kein Nachholen. Ein neuer Feldtyp
   `organisation` ist eine eigene, größere Architektur-Frage quer durch Kern/
   Erzeuger/Aussteller — wie A464/A465 nur der Befund, keine Entscheidung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messen, JURISTISCHE_PERSON_MUSTER, AUFFANGFELD_MUSTER } = require('../tools/institution-organisation-luecke-messen.js');

test('[A468] kein Template-Feldtyp für eine juristische Person/Organisation', () => {
  const m = messen();
  // 12.09.2026: `verweis` (externe Adresse) kam als elfter Feldtyp dazu — zählt hier mit,
  // ist selbst kein Feldtyp für eine juristische Person/Organisation.
  assert.equal(m.feldtypenAnzahl, 11, 'der gemessene Stand — ändert sich diese Zahl, gehört die Zeile neu gemessen');
  assert.equal(m.organisationsFeldtyp, false);
});

test('[A468] keine der zwölf Institutions-Arten passt auf Stiftung/Verein', () => {
  const m = messen();
  assert.equal(m.institutionArtenAnzahl, 12, 'der gemessene Stand vom 17.08./21.08.2026');
  assert.deepEqual(m.passendeArtFuerStiftungOderVerein, []);
});

test('[A468·Der Bau existiert schon] der Andock-Mechanismus für neue Institutions-Arten ist verdrahtet (U2-ADR-142)', () => {
  // DAS IST DER GRUND, WARUM DIESER POSTEN KEIN BAU IST: die fehlende Art zu ergänzen
  // wäre kein Nachholen, sondern ein Verstoß gegen die Nachreich-Politik.
  const m = messen();
  assert.equal(m.institutionsArtDockbar, true,
    'ein Anbieter kann Stiftung/Verein heute schon andocken — der vorgesehene Weg existiert');
});

test('[A468·Präzisiert] verwaltung und finanzen haben KEIN allgemeines Auffangfeld — nur identitaet und persoenliches', () => {
  const m = messen();
  assert.deepEqual(m.sektorenMitAuffangfeld.sort(), ['identity', 'personal']);
  assert.equal(m.verwaltungHatAuffangfeld, false);
  assert.equal(m.finanzenHatAuffangfeld, false);
});

test('[A468·Rot-Beweis] die Auffangfeld-Erkennung selbst greift — ein erfundenes Feld wird erkannt, ein eng benanntes nicht', () => {
  assert.equal(AUFFANGFELD_MUSTER.test('sonstiges_test'), true);
  assert.equal(AUFFANGFELD_MUSTER.test('notiz_x'), true);
  assert.equal(AUFFANGFELD_MUSTER.test('ongoingLoansDebts'), false, 'ein eng benanntes Feld zählt nicht als Auffangfeld');
  assert.equal(JURISTISCHE_PERSON_MUSTER.test('stiftung'), true);
  assert.equal(JURISTISCHE_PERSON_MUSTER.test('krankenkasse'), false);
});
