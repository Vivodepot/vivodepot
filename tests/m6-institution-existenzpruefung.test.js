'use strict';
/* ════════════════════════════════════════════════════════════════════════
   M6 — Institutionen bekommen dieselbe Prüfung wie Personen („M5 und M6", 09.08.2026, Zug 2). Befund: `flowRefNeueEntitaet` prüfte für
   Institutionen nur `if (!werte.name) return;` und legte an — für Personen
   existiert `personFindenOderAnlegen` (case-insensitiv) längst. Dieselbe
   Asymmetrie entsteht bei jedem Verweis neu: nach einigen Monaten steht
   dieselbe Arztpraxis mehrfach im Depot.

   `institutionFinden` nutzt DENSELBEN Vergleich wie `personFindenOderAnlegen`
   (case-insensitiv, getrimmt) — aber OHNE die zweite Hälfte (automatisch
   anlegen): Institutionen kommen legitim doppelt vor (zwei Filialen
   derselben Bank), darum bietet `flowRefNeueEntitaet` einen Fund an
   (bewusste Zwei-Knopf-Wahl: „Bestehende verwenden" / „Trotzdem neu
   anlegen"), statt ihn stillschweigend zu verschmelzen. Keine
   Namensvarianten-Erkennung („Praxis Dr. Meier" ≠ „Dr. Meier") — bewusst,
   der Auftrag schließt automatische Zusammenführung bei bloß ähnlichen
   Namen aus.

   Die neue Zwei-Knopf-Verzweigung in flowRefNeueEntitaet selbst (Fund-Dialog
   erscheint statt sofort anzulegen) hängt an `liesEintragAusDOM`, das
   verschachtelte Listen-Unterfelder (`data-edit` unter `data-sub-zeile`)
   liest. Der DOM-Stub dieser Suite gibt bei jedem querySelector ein frisches,
   inhaltsloses Element zurück (tests/load-kern.js, makeEl) — ein getippter
   Wert kann darüber nicht bis liesEintragAusDOM durchgereicht werden. Das
   ist keine Lücke dieses Zugs: tests/listen-ui.test.js dokumentiert exakt
   dieselbe Grenze für die Institutions-Maske (Zeilen 289–298) und verweist
   den vollen Speicher-Pfad bewusst auf die Geräte-Abnahme. Diese Datei prüft
   darum die reine Logik (`institutionFinden`) headless und überlässt die
   Dialog-Verzweigung der Browser-Abnahme (Zug 3).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('[M6] echter Kern: institutionFinden findet einen case-insensitiven, getrimmten Treffer', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const id = V.institutionHinzufuegen({ name: 'Sparkasse München', art: 'bank' });
  assert.equal(V.institutionFinden('  sparkasse münchen  ').id, id);
  assert.equal(V.institutionFinden('Sparkasse Augsburg'), null, 'kein Treffer für einen anderen Namen');
});

test('[M6] institutionFinden fängt KEINE Namensvarianten (bewusst — keine automatische Zusammenführung)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.institutionHinzufuegen({ name: 'Praxis Dr. Meier', art: 'aerztlich' });
  assert.equal(V.institutionFinden('Dr. Meier'), null, 'Namensvariante ist kein automatischer Treffer');
});

test('[M6] institutionFinden: leerer/nur-Leerzeichen-Name liefert null, kein Wurf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.institutionHinzufuegen({ name: 'Sparkasse München', art: 'bank' });
  assert.equal(V.institutionFinden(''), null);
  assert.equal(V.institutionFinden('   '), null);
  assert.equal(V.institutionFinden(null), null);
});

test('[M6] institutionFinden: findet nichts in einem frischen Depot ohne Institutionen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.equal(V.institutionFinden('Irgendwas'), null);
});
