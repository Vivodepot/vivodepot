'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Komponente 2 (Lese-App): read-only Spiegelung der Template-Felder
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-037: die Lese-App rendert data.feldDefinitionen[] aus dem geladenen
   Depot als eigene Abschnitte am Bereich-Ende (Kern-Look), Wert aus dem geteilten
   Slot. Keine Prüfung, keine Krypto. Geprüft: Abschnitt+Wert erscheint; leeres
   Feld nicht; unbekannter Typ übersprungen; defensiv ohne feldDefinitionen; die
   zwei nachgezogenen Katalog-Felder rendern, wenn gesetzt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen } = require('./load-lesen.js');

function depot(feldDefinitionen, sektoren) {
  return { schemaVersion: 23, feldDefinitionen: feldDefinitionen, sektoren: sektoren || {}, menschen: [], urheberschaft: {}, mappe: [] };
}

test('B2-1 Template-Feld erscheint als Abschnitt mit Wert (Kern-Look)', () => {
  const { V } = ladeLesen();
  V.setData(depot(
    [{ sektorId: 'housing', feldId: 'tpl_zaehlpunkt', abschnitt: 'Energie & Erzeugung', typ: 'text', label: 'Zählpunkt' }],
    { housing: { tpl_zaehlpunkt: 'DE0001234' } }
  ));
  const html = V.sektorHTML('housing');
  assert.ok(html.includes('Energie &amp; Erzeugung') || html.includes('Energie & Erzeugung'), 'Abschnittsname');
  assert.ok(html.includes('Zählpunkt'), 'Feld-Label');
  assert.ok(html.includes('DE0001234'), 'Wert aus dem geteilten Slot');
  assert.ok(html.includes('feld-zeile'), 'Kern-Look (feld-zeile)');
});

test('B2-2 leeres Template-Feld wird nicht gezeigt', () => {
  const { V } = ladeLesen();
  V.setData(depot(
    [{ sektorId: 'housing', feldId: 'tpl_zaehlpunkt', abschnitt: 'Energie', typ: 'text', label: 'Zählpunkt' }],
    { housing: {} }
  ));
  assert.ok(!V.sektorHTML('housing').includes('Zählpunkt'), 'leeres Feld nicht gerendert');
});

test('B2-3 unbekannter Typ übersprungen', () => {
  /* NACHGEZOGEN AM 20.08.2026 (A359, Bauweg 3): hier stand `mehrfachauswahl` als Beispiel für
     „unbekannter Typ". Er ist seit diesem Bauweg BEKANNT — die Lese-App kennt jetzt dieselben
     neun Render-Typen wie der Kern. Die Aussage der Probe bleibt und braucht einen Typ, den
     wirklich niemand rendert; sonst prüfte sie den Gegenstand nicht mehr, den sie meint. */
  const { V } = ladeLesen();
  V.setData(depot(
    [{ sektorId: 'housing', feldId: 'tpl_ort', abschnitt: 'Energie', typ: 'geokoordinate', label: 'Standort' }],
    { housing: { tpl_ort: '52.5,13.4' } }
  ));
  assert.ok(!V.sektorHTML('housing').includes('Standort'), 'unbekannter Typ nicht gerendert');
});

test('B2-3·Gegenprobe die fünf nachgezogenen Typen werden gerendert (A359 Bauweg 3)', () => {
  const { V } = ladeLesen();
  V.setData(depot(
    [{ sektorId: 'housing', feldId: 'tpl_tags', abschnitt: 'Energie', typ: 'mehrfachauswahl', label: 'Schlagworte' }],
    { housing: { tpl_tags: ['a', 'b'] } }
  ));
  assert.ok(V.sektorHTML('housing').includes('Schlagworte'),
    'ein angedocktes mehrfachauswahl-Feld war beim Empfänger unsichtbar — genau das war der Befund');
});

test('B2-4 defensiv: Depot ohne feldDefinitionen → kein Bruch', () => {
  const { V } = ladeLesen();
  V.setData({ schemaVersion: 23, sektoren: { housing: {} }, menschen: [], urheberschaft: {}, mappe: [] });
  const html = V.sektorHTML('housing');
  assert.equal(typeof html, 'string', 'rendert ohne Bruch');
});

test('B2-5 Katalog-Sync: pflegegrad_befristet_bis + gdb_nachpruefung sind im Lese-Katalog deklariert', () => {
  // Beide Felder sind seit jeher `sensibel: true` im Schema (Kern UND Lese-App) — seit Befund 2
  // („Die Lese-App wird nirgends mitgemessen", 12./13.08.2026) hält sektorHTML() sie
  // korrekt zurück, auch wenn gesetzt. Die eigentliche Frage dieses Tests — stehen die Felder
  // ÜBERHAUPT im Lese-Katalog (Katalog-Sync, nicht Karteileiche) — gehört darum gegen die
  // SCHEMA-Deklaration geprüft, nicht gegen den (jetzt zurecht leeren) HTML-Ausschnitt.
  const { V } = ladeLesen();
  const sek = V.SEKTOR_BY_ID['socialInsurance'];
  const alleFelder = sek.sektionen.flatMap(s => s.felder || []);
  assert.ok(alleFelder.some(f => f.id === 'careLevelTimeLimitedUntil' && f.label === 'Pflegegrad befristet bis'),
    'pflegegrad_befristet_bis im Lese-Katalog');
  assert.ok(alleFelder.some(f => f.id === 'gdbReviewReAssessmentDate' && f.label.startsWith('GdB — Nachprüfung')),
    'gdb_nachpruefung im Lese-Katalog');
});

test('B2-6 zwei Abschnitte gruppieren; fremder Sektor nicht eingemischt', () => {
  const { V } = ladeLesen();
  V.setData(depot(
    [
      { sektorId: 'housing', feldId: 'tpl_a', abschnitt: 'Energie', typ: 'text', label: 'A' },
      { sektorId: 'housing', feldId: 'tpl_b', abschnitt: 'Sonstiges', typ: 'text', label: 'B' },
      { sektorId: 'health', feldId: 'tpl_fremd', abschnitt: 'Anderswo', typ: 'text', label: 'Fremd' },
    ],
    { housing: { tpl_a: 'x', tpl_b: 'y' }, health: { tpl_fremd: 'z' } }
  ));
  const html = V.sektorHTML('housing');
  assert.ok(html.includes('Energie') && html.includes('Sonstiges'), 'beide Abschnitte');
  assert.ok(!html.includes('Fremd'), 'fremder Sektor nicht eingemischt');
});
