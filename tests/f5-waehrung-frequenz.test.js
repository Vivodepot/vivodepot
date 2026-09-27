'use strict';
/* ════════════════════════════════════════════════════════════════════════
   F5 Posten 1 — Währung und Frequenz bei drei Beträgen („F4 und F5", 09.08.2026, Zug 1). W-2 flaggte zehn Betragsfelder ohne
   Einheit — Einheit steckte nur im Platzhalter-Beispiel. Additiv: neue
   Felder, `betrag` bleibt Freitext (keine Migration, kein Schema-Bump).

   Drei Fälle gewählt, die WIRKLICH nur an Währung/Frequenz fehlen (nicht
   an einem zusätzlich vermischten Sachverhalt — `schulden`/`pflegegeld`
   bleiben draußen, W-11-Nachbarschaft, Regel 23 gegen den Auftragswortlaut
   geprüft: die zitierten Zeilennummern trafen im aktuellen Stand nicht
   mehr die gemeinten Felder):
   - `unterhalt.betrag` (Liste, meine-menschen) — Frequenz variiert
     zwischen Unterhaltsarten (monatlich/jährlich/einmalig).
   - `verwaltung_vorgaenge.betrag` (Liste, verwaltung) — Frequenz variiert
     je Zeile (Bescheide unterschiedlicher Vorgänge).
   - `housing.monthlyRentServiceCharges` (Sektorfeld) — nur Währung fehlt (Frequenz steckt
     bereits im Feldnamen „Monatliche Miete").
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function unterhaltFeld(V) {
  return V.SEKTOR_BY_ID['people'].sektionen.flatMap(s => s.felder).find(f => f.id === 'maintenanceObligationsAnd');
}
function verwaltungVorgaengeFeld(V) {
  return V.SEKTOR_BY_ID.administration.sektionen.flatMap(s => s.felder).find(f => f.id === 'ongoingAdministrativeCases');
}
function mieteFeld(V) {
  return V.SEKTOR_BY_ID.housing.sektionen.flatMap(s => s.felder).find(f => f.id === 'monthlyRentServiceCharges');
}

test('[F5] unterhalt: Währung- und Frequenz-Unterfeld existieren, Frequenz ist geschlossen', () => {
  const { V } = ladeKern();
  const feld = unterhaltFeld(V);
  const ids = feld.unterFelder.map(u => u.id);
  assert.ok(ids.includes('currency'), 'Währungsfeld fehlt');
  assert.ok(ids.includes('frequency'), 'Frequenzfeld fehlt');
  const frequenz = feld.unterFelder.find(u => u.id === 'frequency');
  assert.equal(frequenz.typ, 'auswahl');
  assert.deepEqual(frequenz.optionen.map(o => o.wert), ['monatlich', 'jaehrlich', 'einmalig']);
  assert.equal(feld.unterFelder.find(u => u.id === 'amount').typ, 'text', 'amount bleibt Freitext — keine Migration');
});

test('[F5] verwaltung_vorgaenge: Währung- und Frequenz-Unterfeld existieren, je Zeile wählbar', () => {
  const { V } = ladeKern();
  const feld = verwaltungVorgaengeFeld(V);
  const ids = feld.unterFelder.map(u => u.id);
  assert.ok(ids.includes('currency'));
  assert.ok(ids.includes('frequency'));
  const frequenz = feld.unterFelder.find(u => u.id === 'frequency');
  assert.equal(frequenz.typ, 'auswahl');
  assert.deepEqual(frequenz.optionen.map(o => o.wert), ['monatlich', 'jaehrlich', 'einmalig']);
});

test('[F5] housing.monthlyRentServiceCharges: neues Währungsfeld direkt daneben, keine Frequenz nötig (im Feldnamen bereits monatlich)', () => {
  const { V } = ladeKern();
  const sek = V.SEKTOR_BY_ID.housing;
  const alleFelder = sek.sektionen.flatMap(s => s.felder);
  const idx = alleFelder.findIndex(f => f.id === 'monthlyRentServiceCharges');
  assert.ok(idx !== -1, 'monthlyRentServiceCharges-Feld existiert');
  assert.equal(alleFelder[idx + 1].id, 'currency', 'Währungsfeld liegt direkt neben Miete');
});

test('[F5] echter Rundlauf: Unterhalt-Eintrag mit Betrag, Währung, Frequenz — alles kommt zurück', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('people', 'maintenanceObligationsAnd', {
    type: 'Kindesunterhalt', amount: '450', currency: 'EUR', frequency: 'monatlich', direction: 'zahle',
  });
  const eintrag = V.getData().sektoren['people'].maintenanceObligationsAnd[0];
  assert.equal(eintrag.amount, '450');
  assert.equal(eintrag.currency, 'EUR');
  assert.equal(eintrag.frequency, 'monatlich');
});
