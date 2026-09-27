'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-105 — `dataAbsentReason` für Prozedur und Medizinprodukt
   ────────────────────────────────────────────────────────────────────────
   ZWEI BEFUNDE, beide am offiziellen HL7-Validator 6.9.12 gemessen (26.07.2026,
   lokal, offline, mit `hl7.fhir.uv.ips#2.0.0` + `hl7.fhir.eu.eps#1.0.0-ballot`):

   1. Ein `voroperationen`-Eintrag ohne Jahr erzeugte ein `Procedure` OHNE jedes
      `performed`-Element — und damit ein UNGÜLTIGES Bundle:
      „Procedure.performed[x]: mindestens erforderlich = 1, aber nur gefunden 0".
      min=1 gilt in `Procedure-uv-ips` (1.1.0 und 2.0.0) UND in `procedure-eu-eps`;
      es hängt nicht am gesetzten Profil. Kein Randfall: der Anamnese-Wizard fragt
      nur nach dem Eingriff, nicht nach dem Jahr.

   2. Die Medizinprodukte-Sektion sagte IMMER „Keine Medizinprodukte hinterlegt" —
      auch bei gefülltem `implantate`. Das ist keine Auslassung, sondern eine falsche
      Aussage in einem medizinischen Dokument.

   Beides löst dieselbe Standard-Extension: das Pflichtelement ist da, sein Wert ist
   ausdrücklich als unbekannt vermerkt. NICHTS wird geraten — die alte Absicht bleibt,
   sie bekommt nur die Form, die das Profil verlangt.

   FORM (U2-ADR-099): Diskriminante sammelt Verstöße, Test fordert die leere Liste.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { bindungPruefen } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-105';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = [
  'u2-105-procedure-ohne-jahr-traegt-datenabwesenheit',
  'u2-105-procedure-mit-jahr-traegt-das-datum',
  'u2-105-medizinprodukte-sektion-zeigt-vorhandene',
  'u2-105-kein-geratenes-datum-aus-freitext',
];
const DAR_URL = 'http://hl7.org/fhir/StructureDefinition/data-absent-reason';
const JETZT = '2026-07-26T12:00:00Z';

async function depotMit({ mitJahr = true, ohneJahr = true, implantate = '' } = {}) {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('T');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  if (mitJahr)  V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Blinddarm-Entfernung', year: '2008' });
  if (ohneJahr) V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Hüft-TEP rechts' });
  if (implantate) V.sektorFeldSetzen('health', 'implantsProsthesesPacemakers', implantate);
  // N4 (09.08.2026): voroperationen/implantate sind seit N4 Zug 1 schema-sensibel — Opt-in, diese
  // Proben gelten U2-ADR-105s dataAbsentReason-Mechanik, nicht der Zurückhaltung.
  const bundle = V.fhirIpsBundle(JETZT, { sensibel: true });
  const res = (bundle.entry || []).map(e => e.resource);
  return { V, bundle, res,
    procedures: res.filter(r => r.resourceType === 'Procedure'),
    sektion: (id) => ((res[0] && res[0].section) || []).find(s => s.code.coding[0].code === id) };
}

/* ── Probe 1 · ohne Jahr: Element da, Wert unbekannt ──────────────────────── */
function undatierteOhneAbwesenheit(procedures) {
  const fehler = [];
  for (const p of procedures) {
    if (p.performedDateTime || p.performedString) continue;        // datiert — nicht dieser Fall
    const ext = p._performedDateTime && p._performedDateTime.extension && p._performedDateTime.extension[0];
    if (!ext) { fehler.push(p.code.text + ': performed[x] fehlt GANZ — Bundle ungültig'); continue; }
    if (ext.url !== DAR_URL) fehler.push(p.code.text + ': fremde Extension ' + ext.url);
    else if (ext.valueCode !== 'unknown') fehler.push(p.code.text + ': Code ' + ext.valueCode + ' statt unknown');
  }
  return fehler;
}

test('u2-105-procedure-ohne-jahr-traegt-datenabwesenheit', async () => {
  const { procedures } = await depotMit();
  const undatiert = procedures.filter(p => !p.performedDateTime && !p.performedString);
  assert.equal(undatiert.length, 1, 'Positivkontrolle: es GIBT einen undatierten Eintrag zu prüfen');
  assert.deepEqual(undatierteOhneAbwesenheit(procedures), [],
    'ein Procedure ohne Datum MUSS `performed[x]` mit dataAbsentReason tragen — sonst ist das ganze '
    + 'Bundle ungültig (performed[x] ist min=1 in beiden Profilen)');
});

test('[Negativprobe] u2-105-Probe-1: ohne die Extension fehlt das Pflichtelement ganz', async () => {
  const { procedures } = await depotMit();
  const undatiert = procedures.filter(p => !p.performedDateTime && !p.performedString);
  // MUTATION: der Zustand aus `7bba57a` — Extension weg.
  delete undatiert[0]._performedDateTime;
  const fehler = undatierteOhneAbwesenheit(procedures);
  assert.equal(fehler.length, 1, 'die Probe MUSS das melden');
  assert.match(fehler[0], /performed\[x\] fehlt GANZ/,
    'genau der Zustand, den der Validator mit „mindestens erforderlich = 1" ablehnte');
});

/* ── Probe 2 · mit Jahr: echtes Datum, KEINE Abwesenheits-Extension ───────── */
// Das Ergebnis-Array wird BEWUSST hier angelegt und nicht per `procedures.filter().map()` erzeugt:
// `procedures` stammt aus dem VM-Kontext des Kerns, ein daraus abgeleitetes Array trägt dessen
// fremden Prototyp, und `deepStrictEqual` schlägt dann fehl, obwohl der Inhalt stimmt (der Diff
// zeigt zwei identisch aussehende leere Arrays). Dieselbe Falle wie bei U2-ADR-104.
function datierteMitAbwesenheit(procedures) {
  const fehler = [];
  for (const p of procedures) {
    if ((p.performedDateTime || p.performedString) && p._performedDateTime) {
      fehler.push(p.code.text + ': trägt Datum UND dataAbsentReason — widersprüchlich');
    }
  }
  return fehler;
}

test('u2-105-procedure-mit-jahr-traegt-das-datum', async () => {
  const { procedures } = await depotMit();
  const mitDatum = procedures.filter(p => p.performedDateTime);
  assert.equal(mitDatum.length, 1, 'Positivkontrolle: es GIBT einen datierten Eintrag');
  assert.equal(mitDatum[0].performedDateTime, '2008', 'ein sauberes Vierstellen-Jahr wird FHIR-Datum');
  assert.deepEqual(datierteMitAbwesenheit(procedures), [],
    'wo ein Datum steht, darf KEINE Abwesenheits-Extension danebenstehen');
});

test('[Negativprobe] u2-105-Probe-2: die Extension immer zu setzen wäre ein Widerspruch', async () => {
  const { procedures } = await depotMit();
  // MUTATION: Extension auch am datierten Eintrag.
  procedures.find(p => p.performedDateTime)._performedDateTime = { extension: [{ url: DAR_URL, valueCode: 'unknown' }] };
  assert.equal(datierteMitAbwesenheit(procedures).length, 1, 'die Probe MUSS das melden');
});

/* ── Probe 3 · Medizinprodukte: die Sektion sagt die Wahrheit ─────────────── */
// Sammelt Widersprüche zwischen dem, was im Depot steht, und dem, was die Sektion behauptet.
function sektionsWidersprueche(sektion, res, implantateGefuellt) {
  const fehler = [];
  const eintraege = (sektion && sektion.entry) || [];
  const geraete = res.filter(r => r.resourceType === 'Device');
  const nutzungen = res.filter(r => r.resourceType === 'DeviceUseStatement');
  if (implantateGefuellt) {
    if (!eintraege.length) fehler.push('implantate gefüllt, Sektion aber leer — die Aussage ist falsch');
    if (sektion && sektion.emptyReason) fehler.push('implantate gefüllt, Sektion trägt trotzdem emptyReason');
    if (geraete.length !== 1) fehler.push('erwartet 1 Device, gefunden ' + geraete.length);
    if (nutzungen.length !== 1) fehler.push('erwartet 1 DeviceUseStatement, gefunden ' + nutzungen.length);
    if (nutzungen[0]) {
      const ext = nutzungen[0]._timingDateTime && nutzungen[0]._timingDateTime.extension
        && nutzungen[0]._timingDateTime.extension[0];
      if (!ext || ext.url !== DAR_URL) fehler.push('timing[x] ohne dataAbsentReason — min=1 verletzt');
    }
  } else {
    if (eintraege.length) fehler.push('implantate leer, Sektion trägt trotzdem Einträge');
    if (!(sektion && sektion.emptyReason)) fehler.push('implantate leer, aber kein emptyReason');
    if (geraete.length) fehler.push('leeres Device angelegt (' + geraete.length + ')');
  }
  return fehler;
}

test('u2-105-medizinprodukte-sektion-zeigt-vorhandene', async () => {
  const gefuellt = await depotMit({ implantate: 'Hüft-TEP rechts (Stryker), seit 2019' });
  assert.deepEqual(sektionsWidersprueche(gefuellt.sektion('46264-8'), gefuellt.res, true), [],
    'gefülltes `implantate` MUSS in der Sektion erscheinen — „Keine Medizinprodukte hinterlegt" wäre '
    + 'eine falsche Aussage in einem medizinischen Dokument');

  const leer = await depotMit({ implantate: '' });
  assert.deepEqual(sektionsWidersprueche(leer.sektion('46264-8'), leer.res, false), [],
    'leeres `implantate` MUSS emptyReason tragen und KEIN leeres Device anlegen');
});

test('[Negativprobe] u2-105-Probe-3: der alte Zustand war die falsche Aussage', async () => {
  const { sektion, res } = await depotMit({ implantate: 'Hüft-TEP rechts (Stryker), seit 2019' });
  const s = sektion('46264-8');
  // MUTATION: der Zustand bis zum 26.07. — `deviceRefs` war hart `[]`.
  const alt = Object.assign({}, s, { entry: [], emptyReason: { text: 'Keine Medizinprodukte hinterlegt.' } });
  const fehler = sektionsWidersprueche(alt, res.filter(r => r.resourceType !== 'Device' && r.resourceType !== 'DeviceUseStatement'), true);
  assert.ok(fehler.length >= 2, 'die Probe MUSS den alten Zustand als Widerspruch melden: ' + fehler.join(' · '));
  assert.ok(fehler.some(f => /Aussage ist falsch/.test(f)));
});

/* ── Probe 4 · nichts geraten ─────────────────────────────────────────────── */
// „seit 2019" steht im Freitext. Es darf NIRGENDS als Datum auftauchen.
function gerateneDaten(res) {
  const fehler = [];
  for (const r of res.filter(x => x.resourceType === 'DeviceUseStatement')) {
    for (const k of Object.keys(r)) {
      if (/^timing/.test(k) && !k.startsWith('_')) fehler.push('DeviceUseStatement.' + k + ' = ' + JSON.stringify(r[k]));
    }
  }
  for (const r of res.filter(x => x.resourceType === 'Procedure')) {
    if (r.performedDateTime && !/^\d{4}$/.test(r.performedDateTime)) {
      fehler.push('Procedure.performedDateTime = ' + r.performedDateTime + ' (nicht aus einem sauberen Jahr)');
    }
  }
  return fehler;
}

test('u2-105-kein-geratenes-datum-aus-freitext', async () => {
  const { res } = await depotMit({ implantate: 'Hüft-TEP rechts (Stryker), seit 2019' });
  assert.ok(res.some(r => r.resourceType === 'DeviceUseStatement'), 'Positivkontrolle: es gibt etwas zu prüfen');
  assert.deepEqual(gerateneDaten(res), [],
    'aus „seit 2019" darf KEIN timing-Wert entstehen — ein geratenes Datum wäre dieselbe Klasse '
    + 'Fehler wie das verbotene Semikolon-Parsen');
});

test('[Negativprobe] u2-105-Probe-4: eine Jahres-Heuristik würde auffallen', async () => {
  const { res } = await depotMit({ implantate: 'Hüft-TEP rechts (Stryker), seit 2019' });
  // MUTATION: genau die Heuristik, die verboten ist — Jahr aus dem Freitext ziehen.
  const dus = res.find(r => r.resourceType === 'DeviceUseStatement');
  const treffer = /\b(19|20)\d{2}\b/.exec('Hüft-TEP rechts (Stryker), seit 2019');
  dus.timingDateTime = treffer[0];
  const fehler = gerateneDaten(res);
  assert.equal(fehler.length, 1, 'die Probe MUSS ein geratenes Datum melden');
  assert.match(fehler[0], /timingDateTime = "2019"/);
});

/* ── Bindung ─────────────────────────────────────────────────────────────── */
test('[Klausel] U2-ADR-105 nennt diese vier Pruefungen', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

/* ── Proben-Deklaration (U2-ADR-099) ─────────────────────────────────────── */
module.exports = {
  PROBEN: [
    { fuer: 'u2-105-procedure-ohne-jahr-traegt-datenabwesenheit', diskriminante: undatierteOhneAbwesenheit },
    { fuer: 'u2-105-procedure-mit-jahr-traegt-das-datum',         diskriminante: datierteMitAbwesenheit },
    { fuer: 'u2-105-medizinprodukte-sektion-zeigt-vorhandene',    diskriminante: sektionsWidersprueche },
    { fuer: 'u2-105-kein-geratenes-datum-aus-freitext',           diskriminante: gerateneDaten },
  ],
};
