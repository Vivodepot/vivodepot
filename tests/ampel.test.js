'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ampel-Status (grün/gelb/rot) — übernommen aus beta.16, jetzt auf der
   Dokument-Ebene (Strang 1b: erinnerungAmpelStatus → dokumentAmpelStatus,
   data.erinnerungen abgelöst).
   ────────────────────────────────────────────────────────────────────────
   Deckt die Ampel-Status-Funktion ab: grün/gelb/rot-Schwellen (b16-Logik),
   Datum in der Vergangenheit, Eintrag ohne Datum → keine Ampelzeile,
   Standard-12-Monate ohne explizites Intervall, Intervall-Skalierung,
   ablaufDatum-Übersteuerung. Die Status-Funktion rechnet direkt auf einem
   Dokument-Datensatz (gleiche Zeit-Feldnamen). Die volle, sortierte Liste
   ist auf die Dokument-Ebene gewandert und wird in prueftermine.test.js
   geprüft (prueftermineDokumente). KEINE Krypto, KEINE Mappings.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-06-03T10:00:00Z');

/* ── Schwellen: grün / gelb / rot (b16-Logik bei Intervall 12) ───────────── */
test('[Ampel] Intervall 12: <11 Monate grün, 11..<14 gelb, ≥14 rot', () => {
  const { V } = ladeKern();
  const s = (basis) => V.dokumentAmpelStatus({ aktualisiertAm: basis, pruefIntervallMonate: 12 }, JETZT).stufe;
  assert.equal(s('2026-01-03'), 'gruen');   // 5 Monate
  assert.equal(s('2025-08-03'), 'gruen');   // 10 Monate (<11)
  assert.equal(s('2025-07-03'), 'gelb');    // exakt 11 Monate → gelb
  assert.equal(s('2025-06-03'), 'gelb');    // 12 Monate
  assert.equal(s('2025-04-03'), 'rot');     // exakt 14 Monate → rot
  assert.equal(s('2025-03-03'), 'rot');     // 15 Monate
});

test('[Ampel] Status trägt den passenden Text (Aktuell / Bald fällig / Überfällig)', () => {
  const { V } = ladeKern();
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2026-01-03', pruefIntervallMonate: 12 }, JETZT).text, V.STRINGS.ampelStatusGruen);
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2025-06-03', pruefIntervallMonate: 12 }, JETZT).text, V.STRINGS.ampelStatusGelb);
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2025-03-03', pruefIntervallMonate: 12 }, JETZT).text, V.STRINGS.ampelStatusRot);
});

/* ── Ohne gesetztes Intervall KEINE Intervall-Ampel (Block Prüftermine, 23.07.2026) ──────
   Frueher galt hier ein stiller Default von 12 Monaten. Der ist entfallen: Eine
   Patientenverfuegung gilt nach § 1827 BGB lebenslang; die 12 Monate waren eine Aussage, die
   Vivodepot selbst aufstellte. Ein datiertes Dokument OHNE Intervall traegt jetzt keine Ampel. */
test('[Ampel] Ohne Intervall und ohne Ablauf → kein Status (null)', () => {
  const { V } = ladeKern();
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2026-01-03' }, JETZT), null);
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2025-04-01' }, JETZT), null);
});

/* ── Datum in der Vergangenheit MIT Intervall → rot ──────────────────────── */
test('[Ampel] Weit zurückliegendes Datum bei gesetztem Intervall → rot', () => {
  const { V } = ladeKern();
  // Mit Intervall greift die Ampel wie bisher; ohne Intervall gaebe es keine (s. o.).
  const st = V.dokumentAmpelStatus({ erstelltAm: '2020-01-01', pruefIntervallMonate: 12 }, JETZT);
  assert.equal(st.stufe, 'rot');
  assert.equal(st.basisDatum, '2020-01-01');
});

/* ── Eintrag ohne Datum → keine Ampelzeile (null) ───────────────────────── */
test('[Ampel] Eintrag ohne jedes Datum → kein Status (null)', () => {
  const { V } = ladeKern();
  assert.equal(V.dokumentAmpelStatus({}, JETZT), null);
  assert.equal(V.dokumentAmpelStatus({ pruefIntervallMonate: 12 }, JETZT), null);   // Intervall ohne Datum
  assert.equal(V.dokumentAmpelStatus(null, JETZT), null);
});

/* ── Intervall-Skalierung (nicht nur jährlich) ──────────────────────────── */
test('[Ampel] Skaliert am gesetzten Intervall (Beispiel 6 Monate)', () => {
  const { V } = ladeKern();
  const s = (basis) => V.dokumentAmpelStatus({ aktualisiertAm: basis, pruefIntervallMonate: 6 }, JETZT).stufe;
  assert.equal(s('2026-02-03'), 'gruen');   // 4 Monate (<5)
  assert.equal(s('2025-12-03'), 'gelb');    // 6 Monate
  assert.equal(s('2025-08-03'), 'rot');     // 10 Monate (≥8)
});

/* ── Ablaufdatum übersteuert (eskaliert nur nach oben) ──────────────────── */
test('[Ampel] ablaufDatum: in ≤30 Tagen → mind. gelb, überschritten → rot', () => {
  const { V } = ladeKern();
  // Intervall-grün, aber Ablauf in 10 Tagen → gelb
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2026-05-03', pruefIntervallMonate: 12, ablaufDatum: '2026-06-13' }, JETZT).stufe, 'gelb');
  // Intervall-grün, aber Ablauf überschritten → rot
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2026-05-03', pruefIntervallMonate: 12, ablaufDatum: '2026-05-30' }, JETZT).stufe, 'rot');
  // ferner Ablauf (>30 Tage) deeskaliert NICHT (bleibt grün)
  assert.equal(V.dokumentAmpelStatus({ aktualisiertAm: '2026-05-03', pruefIntervallMonate: 12, ablaufDatum: '2026-12-20' }, JETZT).stufe, 'gruen');
});

test('[Ampel] Nur ablaufDatum (ohne Basis) erzeugt eine Ampel', () => {
  const { V } = ladeKern();
  assert.equal(V.dokumentAmpelStatus({ ablaufDatum: '2026-06-13' }, JETZT).stufe, 'gelb');
  assert.equal(V.dokumentAmpelStatus({ ablaufDatum: '2026-05-30' }, JETZT).stufe, 'rot');
});

/* ── Brücke dokumentAmpel == dokumentAmpelStatus (gleiche Rechnung) ──────── */
test('[Ampel] dokumentAmpel ist die dünne Brücke auf dokumentAmpelStatus', () => {
  const { V } = ladeKern();
  const doc = { aktualisiertAm: '2025-03-03', pruefIntervallMonate: 12 };
  assert.deepEqual(V.dokumentAmpel(doc, JETZT), V.dokumentAmpelStatus(doc, JETZT));
});
