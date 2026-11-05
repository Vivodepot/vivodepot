'use strict';
/* B03 (01.11.2026): die Prüftermine im englischen Produkt sprachen an vier Stellen Deutsch bzw. das falsche Wort.
     1. Titel „Renewal dates“ statt des Begriffs „review date(s)“, den die übrigen EN-Texte führen;
     2. der Monat der Klartextzeile kam fest aus einer deutschen Monatsliste („Oktober 2027“);
     3. das Kurzdatum stand fest als tt.mm.jj, obwohl das Modul eine eigene Datumsregel trägt;
     4. ein Standarddokument zeigte seinen gespeicherten deutschen Katalognamen statt des Namens in der Anzeigesprache.
   Ein umbenanntes Dokument bleibt, wie die Person es genannt hat. Die deutsche Gegenprobe hält fest, dass Deutsch
   unverändert bleibt (Monat deutsch, Datum tt.mm.jj). */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

// Nur die Monatsnamen, die sich im Englischen unterscheiden (April, August, September, November sind gleich).
const MONATE_DE = ['Januar', 'Februar', 'März', 'Mai', 'Juni', 'Juli', 'Oktober', 'Dezember'];
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'textsatz-en-modul.json'), 'utf8')).texte;

function fixierteUhr(iso) {
  const ms = Date.parse(iso);
  return class FixeDate extends Date {
    constructor(...args) { if (args.length === 0) super(ms); else super(...args); }
    static now() { return ms; }
  };
}

const UMBENANNT = 'Mein alter Ausweis';

function pruefterminSicht(produkt) {
  const { V } = ladeKern({ produkt, Date: fixierteUhr('2026-11-01T10:00:00Z') });
  V.setData(V.leeresDepot());
  const kat = V.alleStandardDokumente().find((k) => k.typ === 'national-id-card');
  assert.ok(kat && kat.name, 'Vorbedingung: das Standarddokument steht im Katalog');
  const jetzt = new Date('2026-11-01T10:00:00Z');
  // Standarddokument, wie „Übernehmen“ es anlegt: der gespeicherte Name ist der Katalogname.
  V.dokumentAnlegen({ typ: kat.typ, name: kat.name, sektorId: kat.sektorId, gueltigAb: '2026-10-01',
    pruefIntervallMonate: 12, istStandard: true, quelle: 'standard' }, jetzt);
  // Dasselbe Dokument, von der Person umbenannt.
  V.dokumentAnlegen({ typ: kat.typ, name: UMBENANNT, sektorId: kat.sektorId, gueltigAb: '2026-09-01',
    pruefIntervallMonate: 12, istStandard: true, quelle: 'standard' }, jetzt);
  return { V, kat, html: V.prueftermineSektionHTML() };
}

test('[B03] EN-Prüftermine: Titel „Review dates“, kein deutscher Monat, kein tt.mm.jj, Standardname englisch, Umbenanntes unverändert', () => {
  const { V, kat, html } = pruefterminSicht('privat-en');
  assert.equal(V.STRINGS.prueftermineTitel, 'Review dates');
  assert.equal(V.STRINGS.navPrueftermine, 'Review dates');
  for (const m of MONATE_DE) assert.ok(!new RegExp('\\b' + m + '\\b').test(html), 'deutscher Monatsname in der EN-Sicht: ' + m);
  assert.ok(/October 2027/.test(html), 'der Monat steht in der Anzeigesprache: ' + html.slice(0, 600));
  assert.ok(!/\b\d{2}\.\d{2}\.\d{2}\b/.test(html), 'kein deutsches Kurzdatum tt.mm.jj in der EN-Sicht');
  const enName = EN['dokument.' + kat.typ + '.name'];
  assert.ok(enName && enName !== kat.name, 'Vorbedingung: der Typ hat einen eigenen EN-Namen');
  assert.ok(html.includes(V.escapeHTML(enName)), 'Standarddokument zeigt den EN-Namen „' + enName + '“');
  assert.ok(!html.includes(V.escapeHTML(kat.name)), 'der deutsche Katalogname „' + kat.name + '“ steht nicht in der EN-Sicht');
  assert.ok(html.includes(V.escapeHTML(UMBENANNT)), 'ein umbenanntes Dokument bleibt, wie es heißt');
});

test('[B03·Gegenprobe] DE-Prüftermine bleiben, wie sie sind: deutscher Monat, tt.mm.jj, Katalogname', () => {
  const { kat, html } = pruefterminSicht('privat-de');
  assert.ok(/Oktober 2027/.test(html), 'deutscher Monat');
  assert.ok(/\b01\.10\.26\b/.test(html), 'deutsches Kurzdatum tt.mm.jj');
  assert.ok(html.includes(kat.name), 'deutscher Katalogname');
  assert.ok(html.includes(UMBENANNT), 'umbenanntes Dokument');
});
