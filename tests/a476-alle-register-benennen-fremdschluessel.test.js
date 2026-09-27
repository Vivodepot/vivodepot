'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A476 (Laufzettel Nacht 22./23.08.2026, Posten 15) — vier von fünf Registern
   schweigen über einen Schlüssel, den sie nicht lesen — jetzt keins mehr
   ────────────────────────────────────────────────────────────────────────────
   GEMESSEN 21.08. (Stresstest 10): `bereich`, `institutionsArt`, `rechtsraum`
   und `textsatz` nahmen ein Modul mit einem Fremdschlüssel an, ohne ihn zu
   benennen — nur `format` prüfte gegen eine Schlüssel-Allowlist. Posten 12
   (A466) hat `textsatz` geschlossen; dieser Posten (A476) schließt die drei
   übrigen, WÖRTLICHER SPIEGEL desselben Musters:
   `BEREICH_MODUL_SCHLUESSEL`, `INSTITUTIONSART_MODUL_SCHLUESSEL`,
   `_RECHTSRAUM_MODUL_SCHLUESSEL` — jeweils inklusive der Marken, die
   `modulEinlassen` selbst nachträglich anfügt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[A476·Rot-Beweis] bereichsModulPruefen benennt einen Fremdschlüssel, bleibt aber gültig', () => {
  // `sprache` ist Pflicht, SOBALD das Modul eine Beschriftung trägt (`_modulTraegtBeschriftung`
  // greift auf `bereiche[].label`) — dieselbe Regel wie überall sonst (1.0a), unabhängig von A476.
  const { V } = ladeKern();
  const g = V.bereichsModulPruefen({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'h1', sprache: 'de',
    bereiche: { 'eigene-rubrik': { label: 'R' } }, sektoren: { x: 1 } });
  assert.equal(g.gueltig, true);
  assert.deepEqual(g.verworfene.filter((v) => v.grund === 'unbekannt'), [{ schluessel: 'sektoren', grund: 'unbekannt' }]);
});

test('[A476·Gegenprobe] bereichsModulPruefen — ein sauberes Modul bleibt ohne Verworfen-Eintrag', () => {
  const { V } = ladeKern();
  const g = V.bereichsModulPruefen({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'h1', sprache: 'de',
    bereiche: { 'eigene-rubrik': { label: 'R' } } });
  assert.deepEqual(g.verworfene, []);
});

test('[A476·Rot-Beweis] institutionsArtModulPruefen benennt einen Fremdschlüssel, bleibt aber gültig', () => {
  const { V } = ladeKern();
  const g = V.institutionsArtModulPruefen({ modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de',
    arten: { eigene: 'Eigene' }, personen: [1] });
  assert.equal(g.gueltig, true);
  assert.deepEqual(g.verworfene.filter((v) => v.grund === 'unbekannt'), [{ schluessel: 'personen', grund: 'unbekannt' }]);
});

test('[A476·Gegenprobe] institutionsArtModulPruefen — herkunft ist ein bekannter, kein Fremdschlüssel', () => {
  const { V } = ladeKern();
  const g = V.institutionsArtModulPruefen({ modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de',
    arten: { eigene: 'Eigene' }, herkunft: 'h1' });
  assert.deepEqual(g.verworfene, [], 'herkunft dient als Kennung im Einlass-Register — kein unbekannter Schlüssel');
});

test('[A476·Rot-Beweis] der Rechtsraum-Prüfer (inline in EINLASS_REGISTER) benennt einen Fremdschlüssel', () => {
  const { V } = ladeKern();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'rechtsraum');
  const g = reg.pruefen({ modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 1,
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1 } }, sektoren: { x: 1 } });
  assert.equal(g.gueltig, true);
  assert.deepEqual(g.verworfene.filter((v) => v.grund === 'unbekannt'), [{ schluessel: 'sektoren', grund: 'unbekannt' }]);
});

test('[A476·Gegenprobe] der Rechtsraum-Prüfer — ein sauberes Modul bleibt ohne Fremdschlüssel-Eintrag', () => {
  const { V } = ladeKern();
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'rechtsraum');
  const g = reg.pruefen({ modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 1,
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1 } } });
  assert.deepEqual(g.verworfene.filter((v) => v.grund === 'unbekannt'), []);
});

test('[A476] die eigenen nachträglichen Marken des Kerns gelten bei allen drei Registern NICHT als Fremdschlüssel', () => {
  const { V } = ladeKern();
  const marken = { ungeprueft: true, eingelassenAm: '23.08.2026', anbieterId: 'x', anbieterIdGeprueft: false, appVersion: 1 };
  const bereich = V.bereichsModulPruefen(Object.assign({ modulTyp: 'bereich', moduleVersion: 1, herkunft: 'h1', sprache: 'de',
    bereiche: { r: { label: 'R' } } }, marken));
  const art = V.institutionsArtModulPruefen(Object.assign({ modulTyp: 'institutionsArt', moduleVersion: 1, sprache: 'de',
    arten: { eigene: 'Eigene' } }, marken));
  const reg = V.EINLASS_REGISTER.find((r) => r.typ === 'rechtsraum');
  const rechtsraum = reg.pruefen(Object.assign({ modulTyp: 'rechtsraum', rechtsraum: 'AT', moduleVersion: 1,
    typen: { 'enduring-power-of-attorney': { katalogVersion: 1 } } }, marken));
  for (const [name, g] of [['bereich', bereich], ['institutionsArt', art], ['rechtsraum', rechtsraum]]) {
    assert.deepEqual(g.verworfene.filter((v) => v.grund === 'unbekannt'), [], name + ': eine Kern-Marke gilt fälschlich als Fremdschlüssel');
  }
});
