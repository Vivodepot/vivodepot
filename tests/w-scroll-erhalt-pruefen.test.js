'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-Scroll-Erhalt (Auftrag N5, 09.08.2026, Zug 3)
   ────────────────────────────────────────────────────────────────────────
   Nach U2-ADR-127 ist renderContent(true) der Fluchtweg aus dem sicheren
   Default (Scroll/Fokus erhalten). Grundlinie: 13 bekannte Navigations-
   Funktionen aus der N5-Zug-0-Vollerhebung. Rot nur bei einem NEUEN
   Funktionsnamen, den die Grundlinie nicht kennt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ermittleFunde, gateBewerten, GRUNDLINIE } = require('../tools/w-scroll-erhalt-pruefen.js');

const GRUNDLINIE_DATEN = require('../tools/w-scroll-erhalt-grundlinie.json');

test('[W-Scroll-Erhalt] die Grundlinie kennt genau 15 Navigations-Funktionen', () => {
  // 13 → 14 am 20.08.2026 (Kette, Auftrag 4, Zug 2): `oeffneZusammenstellen` ist eine echte
  // Navigation zu einem neuen Bildschirm — sie beginnt oben, wie jede andere auch.
  // 14 → 15 am 20.08.2026 (Kette, Auftrag 7, Zug 6): `oeffneAnfrage` ebenso — das Blatt einer
  // Anfrage ist ein neuer Bildschirm, und er beginnt bei „wer fragt und auf welcher Grundlage".
  // 15 → 16 am 25.08.2026 (U2-ADR-174 Teilprojekt 2, Task 4): `oeffneEintragenUebersicht`
  // ebenso — die Eintragen-Übersicht ist ein neuer Bildschirm, sie beginnt oben.
  // 16 → 15 am 30.10.2026 (Befund UX-DOKUMENT-ABLEGEN): `oeffneBestandsAuswahl` entfällt, „Was hier
  // hineingehört“ ist ein Dialog über „Meine Dokumente“, kein eigener Bildschirm mehr.
  // 15 → 16 am 02.11.2026 (Seite „Über und Hinweise“): `oeffneUeberHinweise` öffnet die neue Seite oben
  // wie die übrigen Navigationen.
  // 16 → 17 am 12.11.2026 (Zurück im Browser: `ansichtAusVerlaufOeffnen` öffnet die Ansicht des Verlaufseintrags)
  // 17 → 18 am 16.11.2026 (Trefferseite der Suche): `oeffneSuchtreffer` öffnet die Seite „Treffer für …“ oben, wie
  // `oeffneUeberHinweise`. 18 → 19 am 16.11.2026 (Umbau U-6, mit Einzelwort): `oeffneEinlesen` öffnet die Seite Einlesen oben wie die übrigen Navigationen.
  assert.equal(GRUNDLINIE_DATEN.funktionen.length, 19);
});

test('[W-Scroll-Erhalt] echter Kern: kein neuer renderContent(true)-Aufruf gegen die Grundlinie', () => {
  const funde = ermittleFunde();
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE_DATEN);
  assert.deepEqual(neu, [], 'kein neuer renderContent(true)-Aufruf gegen die Grundlinie');
  assert.equal(rot, false);
});

test('[W-Scroll-Erhalt] jede der 13 bekannten Funktionen löst real im Quelltext auf', () => {
  const funde = ermittleFunde();
  const gefundeneNamen = new Set(funde.map((f) => f.funktion));
  for (const name of GRUNDLINIE_DATEN.funktionen) {
    assert.ok(gefundeneNamen.has(name), name + ' aus der Grundlinie hat keinen realen renderContent(true)-Aufruf mehr');
  }
});

test('[W-Scroll-Erhalt] GRUNDLINIE zeigt auf die vorhandene Grundlinien-Datei', () => {
  const fs = require('node:fs');
  assert.ok(fs.existsSync(GRUNDLINIE));
});

test('[W-Scroll-Erhalt·Rotmachbarkeit] Positivkontrolle: ein neuer renderContent(true)-Aufruf in einer unbekannten Funktion wird gefunden', () => {
  const funde = [{ zeile: 1, funktion: '_testGibtEsNicht' }];
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE_DATEN);
  assert.deepEqual(neu, [{ zeile: 1, funktion: '_testGibtEsNicht' }]);
  assert.equal(rot, true);
});

test('[W-Scroll-Erhalt·Rotmachbarkeit] Negativkontrolle: eine bekannte Funktion bleibt grün', () => {
  const funde = [{ zeile: 1, funktion: 'oeffneSektor' }];
  const { rot } = gateBewerten(funde, GRUNDLINIE_DATEN);
  assert.equal(rot, false);
});
