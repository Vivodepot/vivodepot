'use strict';
/* ════════════════════════════════════════════════════════════════════════
   A464/A465 (Laufzettel Nacht 22./23.08.2026, letzter Posten der Strecke)
   ────────────────────────────────────────────────────────────────────────
   `tests/stresstest-01-boesartiges-modul.test.js` [S1·2]/[S1·3] hält fest:
   für die Größe UND die Schachtelungstiefe eines Moduls gibt es heute keine
   Grenze — "umzudrehen, sobald die Produktentscheidung eine Grenze entscheidet".

   Diese Datei prüft den MECHANISMUS (`_modulGroesseTiefePruefen`,
   `_modulTiefe`), den Posten 20 dieser Nachtstrecke dafür gebaut hat.

   VERDRAHTET 23.08.2026 („Modulprüfung schließen", Posten 2) — die Zahl ist
   entschieden (Produktentscheidung: 512 KB, Tiefe 40). `modulEinlassen` ruft den Mechanismus jetzt für
   jedes der fünf Einlass-Register auf; [S1·2]/[S1·3] in
   `tests/stresstest-01-boesartiges-modul.test.js` sind entsprechend von Messung
   („keine Grenze") zu Zusage umgedreht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function frisch() { const { V } = ladeKern(); return V; }

test('[A464/465·Mechanismus] Größe und Tiefe werden korrekt gemessen', () => {
  const V = frisch();
  const flach = { a: 1, b: 'zwei' };
  const r1 = V._modulGroesseTiefePruefen(flach, {});
  assert.equal(r1.tiefe, 1, 'ein Objekt ohne verschachtelte Objekte hat Tiefe 1');
  assert.ok(r1.bytes > 0);

  const genestet = { a: { b: { c: { d: 1 } } } };
  const r2 = V._modulGroesseTiefePruefen(genestet, {});
  assert.equal(r2.tiefe, 4, 'a→b→c→d ist vier Ebenen tief');
});

test('[A464·Mechanismus] ohne maxBytes wird die Größe gar nicht geprüft — der heutige, ungebundene Zustand', () => {
  const V = frisch();
  const riesig = { text: 'X'.repeat(2_000_000) };   // ~2 MB
  const r = V._modulGroesseTiefePruefen(riesig, {});
  assert.equal(r.ok, true, 'ohne Grenze wird nichts abgelehnt — die Lücke bleibt unverändert bestehen');
});

test('[A464·Rot-Beweis] MIT maxBytes wird ein zu großes Modul abgelehnt, ein kleines nicht', () => {
  const V = frisch();
  const gross = { text: 'X'.repeat(1000) };
  const klein = { text: 'kurz' };
  assert.equal(V._modulGroesseTiefePruefen(gross, { maxBytes: 100 }).grund, 'zu-gross');
  assert.equal(V._modulGroesseTiefePruefen(klein, { maxBytes: 100 }).ok, true);
});

test('[A465·Rot-Beweis] MIT maxTiefe wird ein zu tief geschachteltes Modul abgelehnt, ein flaches nicht', () => {
  const V = frisch();
  let tief = { blatt: 1 };
  for (let i = 0; i < 10; i++) tief = { kind: tief };
  assert.equal(V._modulGroesseTiefePruefen(tief, { maxTiefe: 5 }).grund, 'zu-tief');
  assert.equal(V._modulGroesseTiefePruefen({ a: { b: 1 } }, { maxTiefe: 5 }).ok, true);
});

test('[A465·Mechanismus] `_modulTiefe` misst iterativ — 50 000 Ebenen ohne Stack-Overflow, dieselbe Zahl wie im Angriffs-Fund', () => {
  const V = frisch();
  /* Das genau ist der Angriffsfall aus tools/boesartiges-modul-messen.js: 50 000
     Schachtelungsebenen, die im echten Chromium anstandslos durchgehen. Eine REKURSIVE Messung
     bräche hier im Node-Testlauf ab (der Grund, warum die alte Tiefen-Probe das Speichern nicht
     testen konnte) — `_modulTiefe` allein ist absichtlich iterativ und bricht nicht ab. */
  let tief = { blatt: 1 };
  for (let i = 0; i < 50_000; i++) tief = { kind: tief };
  assert.equal(V._modulTiefe(tief), 50_001, '50 000 verschachtelte {kind:…} plus das Blatt selbst');
});

test('[A465·Mechanismus] die Tiefen-Grenze schlägt zu, BEVOR `JSON.stringify` je läuft — der gefährliche Aufruf wird vermieden', () => {
  const V = frisch();
  /* `JSON.stringify` ist selbst rekursiv (das A465-Artefakt) — bei 50 000 Ebenen würde es im
     Node-Testlauf mit einem Stack-Overflow abbrechen. Die Probe hier zeigt: mit gesetzter
     `maxTiefe` erreicht der Aufruf diesen gefährlichen Pfad gar nicht erst — er lehnt vorher ab. */
  let tief = { blatt: 1 };
  for (let i = 0; i < 50_000; i++) tief = { kind: tief };
  const r = V._modulGroesseTiefePruefen(tief, { maxTiefe: 100 });
  assert.equal(r.grund, 'zu-tief');
  assert.equal(r.bytes, null, 'die Byte-Messung (der gefährliche `JSON.stringify`-Aufruf) wurde nie versucht');
});

test('[A464/465·Mechanismus] ohne jede Grenze bleibt der heutige Zustand: nichts wird geprüft, nichts abgelehnt', () => {
  const V = frisch();
  const r = V._modulGroesseTiefePruefen({ a: { b: { c: 1 } } }, {});
  assert.equal(r.ok, true);
  assert.equal(r.bytes > 0, true);
  assert.equal(r.tiefe, 3);
});

test('[A464/465·Positivkontrolle] der Mechanismus ist verdrahtet — genau ein Aufrufer neben der eigenen Definition', () => {
  /* Bis 23.08.2026 war das hier der Wächter für "noch nicht verdrahtet" (Treffer==1, nur die
     eigene Definition). Mit Posten 2 („Modulprüfung schließen") hat ihren Zweck erfüllt und ist
     zur Positivkontrolle geworden: `modulEinlassen` ist jetzt der eine Aufrufer, der die Zahl auf
     2 hebt. Fiele der Aufruf wieder weg, würde diese Probe wieder rot — jetzt als Warnung vor
     einer stillen Rücknahme der Verdrahtung, nicht mehr als Bestätigung einer Lücke. */
  const { src } = ladeKern();
  const treffer = (src.match(/_modulGroesseTiefePruefen\(/g) || []).length;
  assert.equal(treffer, 2, 'die eigene Definition plus genau ein Aufrufer in modulEinlassen');
});
