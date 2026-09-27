'use strict';
/* ════════════════════════════════════════════════════════════════════════
   S15 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026, Zug 2) — auf dem
   Weg OHNE Picker trägt der Dateiname zusätzlich eine Uhrzeit.
   ────────────────────────────────────────────────────────────────────────
   `depotDateiname()` (Tagesgenauigkeit) ist auf dem Picker-Weg richtig — dort
   wird dieselbe Datei überschrieben. Auf dem Nicht-Picker-Weg (Firefox/Safari/
   Touch, s. Zug 0 dieses Auftrags: in Firefox trug der Kopfzeilen-Download bei
   VIER aufeinanderfolgenden Sicherungen viermal denselben Namen) entsteht bei
   JEDEM Sichern eine NEUE Datei — das Datum unterscheidet dort nichts, der
   Zähler kommt vom Browser. `_dateinameMitUhrzeit()` hängt am tatsächlichen
   Schreibzeitpunkt eine Uhrzeit an (sortierbar, ohne Doppelpunkt) —
   unabhängig davon, ob der Basisname der neutrale Default ODER ein von der
   Bürgerin im Namensdialog gewählter eigener Name ist (S12: EIN Namensschema).
   Grenze: depotDateiname() selbst bleibt unverändert (Picker-Vorschlag,
   FSA-suggestedName) — das ist kein Rückfall in S12, sondern die
   Unterscheidung, die S12 gefehlt hat (S12 galt nur dem Namen, nicht dem
   Zeitpunkt der Wiederholung).

   Nachtrag (Zug 7, Browser-Abnahme in Firefox, 09.08.2026): `_HHMM` allein
   (Stunde+Minute) war zu grob — zwei Sicherungen binnen derselben Minute
   (ein plausibler Fall, kein Konstrukt: schnelles Nacheinander-Klicken)
   trugen real denselben Namen, der Browser hätte wieder selbst einen Zähler
   angehängt. Auf `_HHMMSS` erweitert; die Tests hier entsprechend nachgezogen.
   ════════════════════════════════════════════════════════════════════════ */
process.env.TZ = 'Europe/Berlin';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date(2026, 7, 9, 10, 27, 5);   // 09.08.2026, 10:27:05 Ortszeit — Auftrags-Beispielzeit

test('[S15] Default-Basisname bekommt Datum UND Uhrzeit angehängt', () => {
  const { V } = ladeKern();
  assert.equal(
    V._dateinameMitUhrzeit(V.depotDateiname(JETZT), JETZT),
    'Mein-Vivodepot_2026-08-09_102705.vivodepot',
  );
});

test('[S15] ein von der Bürgerin gewählter eigener Name bekommt ebenfalls eine frische Uhrzeit', () => {
  const { V } = ladeKern();
  assert.equal(
    V._dateinameMitUhrzeit('Papas-Depot.vivodepot', JETZT),
    'Papas-Depot_2026-08-09_102705.vivodepot',
  );
});

test('[S15] ein bereits datierter Basisname bekommt KEIN doppeltes Datum (kein "..._2026-08-09_2026-08-09_102705")', () => {
  const { V } = ladeKern();
  // Der Basisname trägt schon das Datum vom Anlegen (Vorschlag aus depotDateiname()) — beim
  // eigentlichen Schreiben käme, ohne diese Prüfung, ein ZWEITES Datum hinzu.
  const basis = V.depotDateiname(JETZT);   // 'Mein-Vivodepot_2026-08-09.vivodepot'
  const ergebnis = V._dateinameMitUhrzeit(basis, JETZT);
  assert.equal((ergebnis.match(/\d{4}-\d{2}-\d{2}/g) || []).length, 1, 'genau EIN Datum im Namen');
  assert.equal(ergebnis, 'Mein-Vivodepot_2026-08-09_102705.vivodepot');
});

test('[S15] zwei Aufrufe INNERHALB DERSELBEN MINUTE liefern trotzdem verschiedene Namen (Browser-Abnahme, Zug 7)', () => {
  const { V } = ladeKern();
  const basis = V.depotDateiname(JETZT);
  const erste = V._dateinameMitUhrzeit(basis, new Date(2026, 7, 9, 10, 27, 5));
  const zweite = V._dateinameMitUhrzeit(basis, new Date(2026, 7, 9, 10, 27, 41));
  assert.notEqual(erste, zweite, 'zwei Sicherungen binnen derselben Minute müssen sich im Namen unterscheiden');
});

test('[S15] zwei Aufrufe an verschiedenen Uhrzeiten liefern verschiedene Namen (das eigentliche Ziel)', () => {
  const { V } = ladeKern();
  const basis = V.depotDateiname(JETZT);
  const erste = V._dateinameMitUhrzeit(basis, new Date(2026, 7, 9, 10, 27, 5));
  const zweite = V._dateinameMitUhrzeit(basis, new Date(2026, 7, 9, 10, 34, 5));
  assert.notEqual(erste, zweite, 'zwei Sicherungen am selben Tag müssen sich im Namen unterscheiden');
});

/* Browser-Abnahme (Zug 7, 09.08.2026): reproduzierbar in Firefox — Anlegen + sofortiges Sichern
   danach landeten wiederholt in DERSELBEN Sekunde (dreimal hintereinander gemessen, immer die
   ersten beiden Downloads). Uhrzeit-Feinheit allein verschiebt das Problem nur, löst es nicht —
   ein Wiederholungs-Zähler garantiert Eindeutigkeit unabhängig von der Uhr-Auflösung. */
test('[S15] ZWEI Aufrufe zur EXAKT selben Sekunde (dieselbe Date-Instanz) liefern trotzdem verschiedene Namen', () => {
  const { V } = ladeKern();
  const basis = V.depotDateiname(JETZT);
  const erste = V._dateinameMitUhrzeit(basis, JETZT);
  const zweite = V._dateinameMitUhrzeit(basis, JETZT);
  assert.notEqual(erste, zweite, 'echte Kollision (Anlegen + sofortiges Sichern) — die Uhr allein reicht nicht');
});

test('[S15] DREI Aufrufe zur exakt selben Sekunde bleiben alle drei paarweise unterschiedlich', () => {
  const { V } = ladeKern();
  const basis = V.depotDateiname(JETZT);
  const namen = [
    V._dateinameMitUhrzeit(basis, JETZT),
    V._dateinameMitUhrzeit(basis, JETZT),
    V._dateinameMitUhrzeit(basis, JETZT),
  ];
  assert.equal(new Set(namen).size, 3, 'alle drei eindeutig: ' + JSON.stringify(namen));
});

test('[S15] nach einer Kollision setzt eine ECHT neue Uhrzeit den Wiederholungs-Zähler zurück (kein hochgezählter Rest)', () => {
  const { V } = ladeKern();
  const basis = V.depotDateiname(JETZT);
  V._dateinameMitUhrzeit(basis, JETZT);              // erste
  V._dateinameMitUhrzeit(basis, JETZT);              // zweite, kollidiert → Suffix
  const spaeter = V._dateinameMitUhrzeit(basis, new Date(2026, 7, 9, 11, 0, 0));   // andere Sekunde
  assert.equal(spaeter, 'Mein-Vivodepot_2026-08-09_110000.vivodepot',
    'kein Kollisions-Suffix mehr, sobald die Uhrzeit selbst schon eindeutig ist');
});

test('[S15] Format bleibt sortierbar und ohne Doppelpunkt (Dateisysteme)', () => {
  const { V } = ladeKern();
  const name = V._dateinameMitUhrzeit(V.depotDateiname(JETZT), JETZT);
  assert.ok(!name.includes(':'), 'kein Doppelpunkt (Windows/exFAT verbieten ihn im Dateinamen)');
  assert.match(name, /^Mein-Vivodepot_\d{4}-\d{2}-\d{2}_\d{6}\.vivodepot$/, 'YYYY-MM-DD_HHMMSS, sortierbar');
});

test('[S15] Grenze: depotDateiname() selbst bleibt tagesgenau (Picker-Weg unverändert, S12)', () => {
  const { V } = ladeKern();
  assert.equal(V.depotDateiname(JETZT), 'Mein-Vivodepot_2026-08-09.vivodepot');
});

test('[S15] der tatsächliche Nicht-Picker-Schreibweg (_depotBlobSpeichern über depotHerunterladen) nutzt die Uhrzeit-Variante', () => {
  const { html } = ladeKern();
  // Wie A1/D46 (tests/topbar-sichern-einzeln-d46.test.js): Verdrahtung am Quelltext prüfen, weil
  // der Node-Testkern kein echtes DOM ist (U2-ADR-091 Event-Blindzone) und dateiAusgeben() eine
  // frische Closure-Referenz ist, keine über V spionierbare Eigenschaft.
  const start = html.indexOf('async function _depotBlobSpeichern(blob) {');
  assert.ok(start > -1, '_depotBlobSpeichern gefunden');
  const ende = html.indexOf('\nasync function _dateiHandleBerechtigungPruefen', start);
  assert.ok(ende > start, 'Funktionsende gefunden');
  const koerper = html.slice(start, ende);
  const iZiel = koerper.indexOf('_dateinameMitUhrzeit(');
  assert.ok(iZiel > -1, '_dateinameMitUhrzeit() wird im Nicht-Picker-Schreibweg aufgerufen');
  const iDateiAusgeben = koerper.indexOf('dateiAusgeben(blob,', iZiel);
  assert.ok(iDateiAusgeben > -1 && iDateiAusgeben < iZiel + 300,
    'dateiAusgeben() im selben Block, kurz NACH dem _dateinameMitUhrzeit()-Aufruf — nicht mehr der rohe (ggf. gecachte) Name');
  assert.ok(!/dateiAusgeben\(blob,\s*_dateiName\s*\|\|\s*depotDateiname\(\),/.test(koerper),
    'der ALTE, unbewachte Aufruf (roher Name ohne Uhrzeit-Aufbereitung) ist ersetzt');
});
