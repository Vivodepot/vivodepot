'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Erzeuger des FIM-Format-Moduls (U2-ADR-465) — gegen die erfundene Leistung S99000001
   ────────────────────────────────────────────────────────────────────────
   Zusicherungen: das erzeugte Modul ist das Fixture-Modul, das der KoSIT-Lauf prüft (ein Weg, kein zweiter);
   ein Pflicht-Anhang ohne Zuordnung ergibt ohne `hinweis` kein Modul (U2-ADR-465 Nachtrag: Anhänge über Rollen, `pflicht`
   aus dem XSD, `vertreter` nur mit dem Nachweis der Vollmacht); Pflichtelemente ohne Zuordnung werden benannt;
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
  assert.deepEqual(r.luecken, [], 'jeder Pflicht-Anhang ist über eine Rolle zugeordnet');
  assert.equal(r.modul.hinweis, undefined, 'ohne offenen Pflicht-Anhang kein Hinweis nötig');
  assert.deepEqual(r.modul.zuordnung.filter((e) => e.anhang).map((e) => [e.anhang, e.pflicht === true]),
    [['lichtbild', false], ['vollmacht-nachweis', false], ['bescheid', true]], '`pflicht` aus dem XSD; in einer Gruppe, die fehlen darf, nicht');
});

test('[FIM-Modul] Rollen und Personenfelder des Erzeugers sind die des Kerns', async () => {
  const { ANHANG_ROLLEN, VERTRETER_FELDER } = await laden();
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  assert.deepEqual([...ANHANG_ROLLEN].sort(), Object.keys(V.FORMAT_ANHANG_ROLLEN).sort());
  assert.deepEqual([...VERTRETER_FELDER], [...V.FORMAT_VERTRETER_FELDER]);
});

test('[FIM-Modul] das Modul besteht die Prüfung des Kerns', async () => {
  const { modulErzeugen } = await laden();
  const { ladeKern } = require('./load-kern.js');
  const { V } = ladeKern();
  const g = V.formatModulPruefen(modulErzeugen(xsd(), zu()).modul);
  assert.equal(g.gueltig, true, 'Grund: ' + g.grund);
});

test('[FIM-Modul·Rot-Beweis] Pflicht-Anhang ohne Zuordnung und ohne hinweis: kein Modul; mit hinweis eine benannte Lücke', async () => {
  const { modulErzeugen } = await laden();
  const z = zu(); delete z.felder['F99000011'];
  const r = modulErzeugen(xsd(), z);
  assert.equal(r.modul, undefined);
  assert.ok(r.fehler.some((f) => /ohne `hinweis`/.test(f)), r.fehler.join(' | '));
  assert.equal(modulErzeugen(xsd(), Object.assign(zu(), { felder: z.felder, hinweis: '  ' })).modul, undefined, 'ein leerer Hinweis zählt nicht');
  const mitHinweis = modulErzeugen(xsd(), Object.assign(zu(), { felder: z.felder, hinweis: 'Probe: nicht einreichbar ohne Anhang' }));
  assert.deepEqual(mitHinweis.fehler, []);
  assert.deepEqual(mitHinweis.luecken, [{ pfad: 'F99000011', art: 'anhang' }]);
  assert.equal(mitHinweis.modul.hinweis, 'Probe: nicht einreichbar ohne Anhang');
  const ohneLichtbild = zu(); delete ohneLichtbild.felder['G99000002.F99000006'];
  assert.deepEqual(modulErzeugen(xsd(), ohneLichtbild).fehler, [], 'ein freiwilliger Anhang ohne Zuordnung braucht keinen Hinweis');
});

test('[FIM-Modul·Rot-Beweis] Anhang über ein Feld, unbekannter Pfad, Wert außerhalb der Aufzählung, feld und fest zugleich', async () => {
  const { modulErzeugen } = await laden();
  const mit = (felder) => modulErzeugen(xsd(), Object.assign(zu(), { felder: Object.assign(zu().felder, felder) })).fehler;
  assert.ok(mit({ 'G99000002.F99000006': { feld: 'givenName' } }).some((f) => /Anhang nur über eine Rolle/.test(f)));
  assert.ok(mit({ 'G99000002.F99000006': { anhang: 'pass' } }).some((f) => /unbekannte Anhang-Rolle/.test(f)));
  assert.ok(mit({ 'G99000002.F99000006': { anhang: 'bescheid' } }).some((f) => /mehrfach/.test(f)));
  assert.ok(mit({ 'G99000002.F99000004': { anhang: 'bescheid' } }).some((f) => /nur an einem Element vom Typ xs:anyType/.test(f)));
  assert.ok(mit({ 'G99000002.F99000004': { vertreter: 'birthDate' } }).some((f) => /`vertreter` allein/.test(f)));
  const ohneNachweis = zu(); delete ohneNachweis.felder['G99000007.F99000008'];
  assert.ok(modulErzeugen(xsd(), ohneNachweis).fehler.some((f) => /nur mit der Anhang-Rolle vollmacht-nachweis/.test(f)));
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
