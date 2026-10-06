'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Auftrag „Der Fremdweg" (18.08.2026) · die Messung bleibt wahr
   ────────────────────────────────────────────────────────────────────────────
   `tools/fremdweg-messen.js` behauptet je Schritt, wo er gebaut ist. Ohne diese
   Probe verschöbe sich ein Anker still, und der Bericht läse sich weiter, als sei
   der Weg unverändert. Besonders Schritt 10 — seine Behauptung ist ABWESENHEIT,
   und die kippt, sobald jemand den Hinweis in der Lese-App baut. Dann muss die
   Probe rot werden, damit die Messung nachgezogen wird statt zu veralten.

   SIE IST ROT GEWORDEN (04.09.2026, U2-ADR-258) — und hat damit getan, wofür sie
   gebaut war. Der zweite Abriss ist geschlossen: die Lese-App zeigt die Herkunft,
   und sie reist zusätzlich im Artefakt mit (Datensatz, PDF-Fuß). Schritt 10 steht
   jetzt auf `ja`, `zaehl.nein` fällt von 2 auf 1, und die Abwesenheits-Probe unten
   ist zur GEGENPROBE umgebaut: sie hält fest, dass heute KEIN Schritt mehr eine
   Abwesenheit behauptet, und dass der Mechanismus dafür trotzdem noch trägt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { messen, SCHRITTE } = require('../tools/fremdweg-messen.js');

test('[Fremdweg] jeder behauptete Anker trägt — ein kaputter ist ein Fund, kein Wegfall', () => {
  const erg = messen();
  assert.equal(erg.schritte.length, SCHRITTE.length);
  assert.deepEqual(erg.kaputt.map((s) => s.nr), [],
    'Diese Schritte behaupten eine Fundstelle, die es nicht mehr gibt.');
});

test('[Fremdweg] der Weg reisst nirgends mehr: Schritt 5 (Einreichen) trägt eine Adresse, der Engpass ist Schritt 6', () => {
  const erg = messen();
  assert.equal(erg.abriss, null,
    'Ein Schritt steht wieder auf „nein" — der Weg hat sich geändert und der Bericht ist überholt.');
  assert.equal(erg.schritte.find((s) => s.nr === 5).zustand, 'ja');
  assert.equal(erg.schritte.find((s) => s.nr === 6).zustand, 'halb', 'das Zertifikat braucht weiter UNSER Werkzeug');
});

test('[Fremdweg] Schritt 10 ist gebaut — der Empfänger sieht die Herkunft (U2-ADR-258)', () => {
  const erg = messen();
  const s10 = erg.schritte.find((s) => s.nr === 10);
  assert.equal(s10.zustand, 'ja', 'seit 04.09.2026 zeigt die Lese-App den Herkunfts-Block');
  assert.equal(s10.erwartetAbwesend, false, 'die Behauptung ist nicht mehr Abwesenheit, sondern Anwesenheit');
  assert.ok(s10.treffer > 0, 'und der Anker `herkunft-marke` trägt wirklich');
});

test('[Fremdweg·Abwesenheit] heute behauptet KEIN Schritt mehr eine Abwesenheit', () => {
  const erg = messen();
  assert.deepEqual(erg.schritte.filter((s) => s.erwartetAbwesend).map((s) => s.nr), [],
    'kommt ein solcher Schritt zurück, gehört er hier benannt — nicht still mitgeführt.');
});

test('[Fremdweg·Abwesenheit·Gegenprobe] der Mechanismus für eine Abwesenheits-Behauptung trägt noch', () => {
  /* Die Probe darüber wäre sonst ein Leerlauf: „keiner behauptet Abwesenheit" ist auch dann
     wahr, wenn der Mechanismus dafür kaputt ist. Hier wird er an einem gepflanzten Schritt
     gefahren — derselbe Weg, den `messen()` für die echten Schritte geht. */
  const gepflanzt = { nr: 99, was: 'Probe', datei: 'vivodepot-lesen.html',
    anker: 'zeichenkette-die-es-in-der-lese-app-nicht-gibt', zustand: 'nein',
    erwartetAbwesend: true, grund: 'Gegenprobe' };
  const erg = messen([gepflanzt]);
  const s = erg.schritte.find((x) => x.nr === 99);
  assert.equal(s.erwartetAbwesend, true);
  assert.equal(s.treffer, 0);
  assert.equal(s.ankerOk, true, 'ein fehlender Anker ist bei einer Abwesenheits-Behauptung KORREKT');
  const erg2 = messen([Object.assign({}, gepflanzt, { anker: 'herkunft-marke' })]);
  assert.equal(erg2.kaputt.length, 1, 'ein plötzlich VORHANDENER Anker fällt auf — genau wie am 04.09.2026');
});

test('[Fremdweg] die Zählung stimmt mit den Einstufungen überein', () => {
  const erg = messen();
  const summe = erg.zaehl.ja + erg.zaehl.halb + erg.zaehl.nein;
  assert.equal(summe, erg.schritte.length);
  assert.equal(erg.zaehl.nein, 0,
    'kein Abriss mehr: das Einreichen trägt seit GEN1 eine Adresse, die Erkennbarkeit beim Empfänger seit U2-ADR-258.');
});
