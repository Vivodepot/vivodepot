'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Erzeuger des FIM-Format-Moduls (U2-ADR-465) — gegen die erfundene Leistung S99000001
   ────────────────────────────────────────────────────────────────────────
   Zusicherungen: das erzeugte Modul ist das Fixture-Modul, das der KoSIT-Lauf prüft (ein Weg, kein zweiter);
   ein Schema mit Anhang ergibt ohne `hinweis` kein Modul; Pflichtelemente ohne Zuordnung werden benannt;
   feste Werte und Werteabbildungen müssen in der Aufzählung stehen; ein unbekannter Pfad ist ein Fehler.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'fim-modul-erzeugen.mjs');
const FX = path.join(__dirname, 'fixtures', 'fim-schema');
const laden = () => import(WERKZEUG);
const xsd = () => fs.readFileSync(path.join(FX, 'S99000001-antrag.xsd'), 'utf8');
const zu = () => JSON.parse(fs.readFileSync(path.join(FX, 'S99000001-zuordnung.json'), 'utf8'));

test('[FIM-Modul] das erzeugte Modul ist genau das Modul, das der KoSIT-Lauf prüft', async () => {
  const { modulErzeugen } = await laden();
  const r = modulErzeugen(xsd(), zu());
  assert.deepEqual(r.fehler, []);
  assert.deepEqual(r.modul, JSON.parse(fs.readFileSync(path.join(FX, 'S99000001-format-modul.json'), 'utf8')));
  assert.deepEqual(r.luecken, [], 'der Anhang ist im Fixture optional');
});

test('[FIM-Modul] das Modul besteht die Prüfung des Kerns', async () => {
  const { modulErzeugen } = await laden();
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  const g = V.formatModulPruefen(modulErzeugen(xsd(), zu()).modul);
  assert.equal(g.gueltig, true, 'Grund: ' + g.grund);
});

test('[FIM-Modul·Rot-Beweis] Schema mit Anhang, Zuordnung ohne hinweis: kein Modul', async () => {
  const { modulErzeugen } = await laden();
  const z = zu(); delete z.hinweis;
  const r = modulErzeugen(xsd(), z);
  assert.equal(r.modul, undefined);
  assert.ok(r.fehler.some((f) => /ohne `hinweis`/.test(f)), r.fehler.join(' | '));
  const leer = Object.assign(zu(), { hinweis: '  ' });
  assert.equal(modulErzeugen(xsd(), leer).modul, undefined, 'ein leerer Hinweis zählt nicht');
});

test('[FIM-Modul·Rot-Beweis] Anhang zugeordnet, unbekannter Pfad, Wert außerhalb der Aufzählung, feld und fest zugleich', async () => {
  const { modulErzeugen } = await laden();
  const mit = (felder) => modulErzeugen(xsd(), Object.assign(zu(), { felder: Object.assign(zu().felder, felder) })).fehler;
  assert.ok(mit({ 'G99000002.F99000006': { feld: 'givenName' } }).some((f) => /Anhang/.test(f)));
  assert.ok(mit({ 'G99000002.F99000999': { feld: 'givenName' } }).some((f) => /nicht im Schema/.test(f)));
  assert.ok(mit({ 'G99000002.F99000005': { fest: 'vielleicht' } }).some((f) => /Aufzählung/.test(f)));
  assert.ok(mit({ 'G99000002.F99000005': { feld: 'gender', werte: { m: 'ja' } } }).some((f) => /Zielwert ja/.test(f)));
  assert.ok(mit({ 'G99000002.F99000005': { feld: 'gender', fest: 'true' } }).some((f) => /genau eines/.test(f)));
});

test('[FIM-Modul] ein Pflichtelement ohne Zuordnung wird benannt, nicht gefüllt', async () => {
  const { modulErzeugen } = await laden();
  const z = zu(); delete z.felder['G99000002.F99000004'];
  const r = modulErzeugen(xsd(), z);
  assert.deepEqual(r.luecken, [{ pfad: 'G99000002.F99000004', art: 'ohne-zuordnung' }]);
  assert.ok(!r.modul.zuordnung.some((e) => e.ziel === 'G99000002.F99000004'));
});
