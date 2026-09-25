'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   CW-28 (24.08.2026) — „Daten einlesen": deckt eine Option BundID ab?
   ────────────────────────────────────────────────────────────────────────────
   TATSACHENFRAGE ZUERST GEKLÄRT (Auftragswortlaut „Zu klären, bevor Wortlaut
   geändert wird"): `fimVerwaltung`/`xoevVerwaltung` (vivodepot.html:17817ff)
   nutzen BEIDE dieselbe Abbildung `XOEV_VERWALTUNG_MAPPING`. Sie deckt
   `bundid_status`/`bundid_status_frueher` ab — NICHT `bundid_email`/
   `bundid_ort`, die seit Schnitt Glied 3 (22.08.2026) als Liste (`bundid`)
   geführt werden und in der Abbildung ausdrücklich weggelassen sind.

   Diese Probe prüft, dass BEIDE betroffenen Import-Optionen (fim-json,
   xoev-verwaltung) den ehrlichen Klartext-Zusatz tragen — keine Vermutung,
   sondern derselbe Wortlaut wie an der Abbildungsgrenze im Code.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function modalSpy(V) {
  const rufe = [];
  V.ui.modal = (opt) => { rufe.push(opt); return () => {}; };
  return rufe;
}

test('[CW-28] fim-json und xoev-verwaltung tragen denselben BundID-Hinweis (dieselbe Abbildung)', () => {
  const { V } = ladeKern();
  const formate = V.importFormateFuerSektor('administration');
  const fim = formate.find(f => f.id === 'fim-json');
  const xoev = formate.find(f => f.id === 'xoev-verwaltung');
  assert.ok(fim && xoev, 'Vorbedingung: beide Formate existieren für verwaltung');
  assert.ok(fim.hinweis, 'fim-json trägt einen Hinweis');
  assert.equal(fim.hinweis, xoev.hinweis, 'derselbe Wortlaut, weil dieselbe Abbildung');
  assert.match(fim.hinweis, /BundID/, 'nennt BundID ausdrücklich');
});

test('[CW-28] der Hinweis steht im gerenderten "Daten einlesen"-Modal für verwaltung', () => {
  const { V } = ladeKern();
  const rufe = modalSpy(V);
  V.flowEinlesen('administration');
  assert.equal(rufe.length, 1);
  const html = rufe[0].koerperHTML;
  assert.match(html, /BundID-Verifizierungsstatus/, 'der Klartext-Zusatz steht im Modal-Körper');
  assert.equal((html.match(/BundID-Verifizierungsstatus/g) || []).length, 2,
    'einmal je Format-Knopf (fim-json, xoev-verwaltung)');
});

test('[CW-28·Gegenprobe] ein Format ohne bekannte Abbildungslücke bekommt KEINEN erfundenen Hinweis', () => {
  const { V } = ladeKern();
  const formate = V.importFormateFuerSektor('identity');
  const ohneHinweis = formate.filter(f => !f.hinweis);
  assert.ok(ohneHinweis.length > 0, 'die meisten Formate bleiben unangetastet — kein Hinweis ohne belegte Lücke');
});
