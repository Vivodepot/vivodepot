'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Urheberschaft-Anzeige am Bildschirm (Format + Zurückhaltung)
   ────────────────────────────────────────────────────────────────────────
   Der „Eingetragen von …"-Stempel erscheint auch in der Bildschirm-Sicht,
   soll dort aber sehr klein/zurückhaltend sein (eigene .feld-urheber-Klasse,
   kein fettes Inline-Styling) und das Datum als tt.mm.jj tragen (nicht ISO).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('datumKurz: ISO-8601 → tt.mm.jj, ungültig → leer', () => {
  const { V } = ladeKern();
  assert.equal(V.datumKurz('2026-05-30'), '30.05.26');
  assert.equal(V.datumKurz('2026-05-30T14:23:00.000Z'), '30.05.26');
  assert.equal(V.datumKurz('1999-12-01'), '01.12.99');
  assert.equal(V.datumKurz(''), '');
  assert.equal(V.datumKurz(null), '');
  assert.equal(V.datumKurz('quatsch'), '');
});

test('urheberschaftZeileHTML (Teil 5.2): vom Anker selbst → STILL; abweichend → dezent „von [Name]"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('B');
  // Nicht-Namens-Feld: die U2-ADR-017-Speisung benennt die Anker-Person NUR bei vorname/nachname
  // um. telefon lässt den Snapshot-Vergleich (Akteur == Anker) für DIESEN Test unberührt — die
  // Identitäts-Namens-Kopplung selbst prüft tests/provenienz-name-bruecke.test.js.
  V.sektorFeldSetzen('identity', 'telephone', '0151');
  // (a) Eintrag vom Anker selbst (Name == Anker) → keine Zeile (Zurückhaltung).
  assert.equal(V.urheberschaftZeileHTML('identity', 'telephone'), '', 'still beim Anker selbst');

  // (b) Abweichung erzeugen: der Anker wird später umbenannt; der Snapshot bleibt „B".
  V.getData().menschen.find(m => m.id === akteur.personId).name = 'C';
  const html = V.urheberschaftZeileHTML('identity', 'telephone');
  assert.ok(html.includes('class="feld-urheber"'), 'eigene Klasse');
  assert.ok(!html.includes('style='), 'gar kein Inline-Style — Größe kommt aus der CSS-Klasse');
  assert.ok(html.includes(V.STRINGS.urheberVon + ' B'), 'dezent „von B" (Snapshot, nicht der neue Name)');
  assert.ok(!html.includes('C'), 'nicht der aktuelle Name');
  assert.ok(/\d{2}\.\d{2}\.\d{2}/.test(html), 'Datum tt.mm.jj vorhanden');
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(html), 'kein ISO-Datum mehr');
});

test('urheberschaftZeileHTML: unter Vollmacht wird immer gezeigt (Bevollmächtigte ≠ Anker)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Inhaberin');
  const pid = V.personSicherstellen('Hans Vertreter');
  V.setzeSitzungsAkteur({ personId: pid, eigenschaft: 'unter-vollmacht', vollmachtsGrundlage: 'vorsorge' });
  V.sektorFeldSetzen('identity', 'telephone', '0151');
  const html = V.urheberschaftZeileHTML('identity', 'telephone');
  assert.ok(html.includes(V.STRINGS.urheberVon + ' Hans Vertreter'), 'von Hans Vertreter');
  assert.ok(html.includes(V.STRINGS.urheberUnterVollmacht), 'mit Vollmacht-Vermerk');
});

test('CSS: .feld-urheber ist klein (deutlich unter fs-xs) und zurückhaltend', () => {
  const { html } = ladeKern();
  assert.ok(/\.feld-urheber\s*\{[^}]*font-size:\s*0\.6\d?rem/.test(html), 'sehr kleine Schrift (≈0.65rem)');
});
