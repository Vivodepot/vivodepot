'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   CW-12/-19 (24.08.2026) — verknüpfte Person bearbeitbar machen
   ────────────────────────────────────────────────────────────────────────────
   Entschieden (Auftrag „Testrunde-Nachzügler, zweite Tranche"): neben einer
   ausgewählten Person (z. B. „Wer übernimmt die Hauptpflege?", „Hausärztin/
   Hausarzt") erscheint ein „Ansehen/Ändern"-Knopf, der DIREKT
   `flowPersonRegisterBearbeiten` öffnet — denselben Dialog wie in „Meine
   Menschen" selbst. Keine zweite Bearbeitungsstelle.

   Spiegelt exakt A210 (derselbe Mechanismus für Institutionen, 14.08.2026):
   `data-institution-oeffnen` → `flowInstitutionBearbeiten`. Hier:
   `data-person-oeffnen` → `flowPersonRegisterBearbeiten`.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'cw12-19-test-2026!';
async function frischesDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Testerin');
  return k;
}

test('[CW-12/19] ein gesetzter Personen-Verweis (pflege_hauptperson) zeigt den Ansehen/Ändern-Knopf', async () => {
  const { V } = await frischesDepot();
  const personId = V.personHinzufuegen({ name: 'Maria Beispiel' });
  const f = V.feldDefFuer('people', 'whoProvidesThePrimaryCare');
  const html = V.feldInputHTML(f, { ref: personId, override: '' });
  assert.match(html, /data-person-oeffnen="[^"]*"/, 'der Knopf steht, wenn ref gesetzt ist');
  assert.match(html, new RegExp('data-person-oeffnen="' + personId + '"'));
});

test('[CW-12/19·Gegenprobe] ohne gesetzten Verweis (nur Freitext-Override) erscheint KEIN Knopf', async () => {
  const { V } = await frischesDepot();
  const f = V.feldDefFuer('people', 'whoProvidesThePrimaryCare');
  const html = V.feldInputHTML(f, { ref: '', override: 'Nachbarin Frau Weber' });
  assert.equal(html.includes('data-person-oeffnen'), false, 'reiner Freitext hat keine Person zum Öffnen');
});

test('[CW-12/19] institutionOeffnenKnopf und personOeffnenKnopf tragen denselben Wortlaut — ein Muster, zwei Entitäten', () => {
  const { V } = ladeKern();
  assert.equal(V.STRINGS.personOeffnenKnopf, V.STRINGS.institutionOeffnenKnopf);
});

test('[CW-12/19] die Klick-Verdrahtung existiert für beide Hosts (Sektor + Modal), wie bei A210', () => {
  const { src } = ladeKern();
  assert.match(src, /_personOeffnenKlick[\s\S]{0,400}data-person-oeffnen/);
  assert.match(src, /flowPersonRegisterBearbeiten\(btn\.getAttribute\('data-person-oeffnen'\)\)/);
});
