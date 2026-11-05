'use strict';
/* Datum in drei Feldern (Zielbild S4, Abnahme der Gestaltungsleitung zum Design-Zug v979, Nr. 5).
   Jede Datumseingabe aus feldInputHTML steht als Tag, Monat und Jahr in drei schmalen Zahlenfeldern mit eigener Beschriftung;
   der Wert, den Speicherweg, Wizard und Plausibilität lesen, bleibt EIN verstecktes Feld mit data-edit und ISO-Wert.
   Geprüft wird: kein Browser-Datumsfeld mehr aus feldInputHTML und auf der Dokumentkarte, die Teile mit führender Null
   (Entscheidung vom 30.10.2026: „03“), das Zusammensetzen (vollständig, unvollständig, leer), die Prüfung auf einen echten
   Kalendertag (31.02. rollte in JS still in den März) und die Fehlermarkierung auf den sichtbaren Teilen.
   Rot-Beweis je Achse: das alte Browserfeld, ein Zusammensetzen ohne Null-Auffüllung und der 31.02. fallen jeweils durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function teileAus(html) {
  const t = (k) => { const m = new RegExp('data-datum-teil="' + k + '"[^>]*value="([^"]*)"').exec(html); return m ? m[1] : null; };
  return { t: t('t'), m: t('m'), j: t('j') };
}

test('[Datum·Dreifeld] feldInputHTML liefert drei Teile und ein verstecktes ISO-Feld, kein Browser-Datumsfeld', () => {
  const { V } = ladeKern();
  const html = V.feldInputHTML({ id: 'birthDate', typ: 'datum', label: 'Geburtsdatum', keineZukunft: true }, '1958-03-14');
  assert.doesNotMatch(html, /type="date"/);
  assert.match(html, /<div class="datum-dreifeld" role="group" aria-label="Geburtsdatum">/);
  assert.match(html, /<input type="text" hidden="" tabindex="-1" aria-hidden="true" data-datum-iso="1" data-edit="birthDate" data-typ="datum" min="\d{4}-01-01" max="\d{4}-\d{2}-\d{2}" value="1958-03-14">/);
  assert.deepEqual(teileAus(html), { t: '14', m: '03', j: '1958' }, 'Tag und Monat mit führender Null');
  for (const k of ['t', 'm', 'j']) assert.match(html, new RegExp('<label class="datum-teil datum-teil--' + k + '"><span class="datum-teil-name">'));
  assert.match(html, /autocomplete="bday-day"/, 'das Geburtsdatum nennt dem Browser seine Teile');
  const anderes = V.feldInputHTML({ id: 'moveOutDate', typ: 'datum', label: 'Auszug' }, '');
  assert.deepEqual(teileAus(anderes), { t: '', m: '', j: '' });
  assert.doesNotMatch(anderes, /bday-/, 'nur das Geburtsdatum trägt bday-Autofill');
});

test('[Datum·Dreifeld] ein Wert, der kein ISO-Datum ist, steht nicht in den Teilen und bleibt im versteckten Feld', () => {
  const { V } = ladeKern();
  const html = V.feldInputHTML({ id: 'x', typ: 'datum', label: 'X' }, 'um 1950');
  assert.deepEqual(teileAus(html), { t: '', m: '', j: '' });
  assert.match(html, /data-edit="x" data-typ="datum"[^>]*value="um 1950"/);
});

test('[Datum·Dreifeld] kein Browser-Datumsfeld mehr im Erzeuger der Dokumentkarte', () => {
  assert.doesNotMatch(KERN, /'<input type="date" id="doku-/, 'die Dokumentkarte auf der Identitätsseite nimmt das Datum in drei Feldern');
  assert.match(KERN, /_datumDreifeldHTML\('id="doku-neu-datum" class="doku-input" data-doku-neu-datum="1"'/);
});

function gruppeMit(werte) {
  const versteckt = { value: '', ereignisse: [], getAttribute: () => null, dispatchEvent(e) { this.ereignisse.push(e.type); } };
  const teile = { t: { value: werte.t }, m: { value: werte.m }, j: { value: werte.j } };
  return {
    versteckt,
    querySelector(sel) {
      if (sel === '[data-datum-iso]') return versteckt;
      const m = /data-datum-teil="(\w)"/.exec(sel);
      return m ? teile[m[1]] : null;
    },
  };
}

test('[Datum·Dreifeld] Zusammensetzen: vollständig, ohne Null eingegeben, unvollständig, leer', () => {
  const { V } = ladeKern();
  const fall = (werte, erwartet) => { const g = gruppeMit(werte); V._datumDreifeldZusammensetzen(g, false); assert.equal(g.versteckt.value, erwartet, JSON.stringify(werte)); };
  fall({ t: '14', m: '03', j: '1958' }, '1958-03-14');
  fall({ t: '14', m: '3', j: '1958' }, '1958-03-14');      // Zielbild „14 3 1958“
  fall({ t: '1', m: '1', j: '0100' }, '0100-01-01');
  fall({ t: '14', m: '', j: '1958' }, '1958-00-14');      // unvollständig: bleibt erkennbar falsch, wird nie ergänzt
  fall({ t: '', m: '', j: '' }, '');
  fall({ t: '1a4', m: '03', j: '19 58' }, '1958-03-14');  // nur Ziffern zählen
  // Rot-Beweis: ohne Auffüllen mit Null wäre „14 3 1958“ kein ISO-Datum.
  assert.notEqual(['1958', '3', '14'].join('-'), '1958-03-14');
});

test('[Datum·Dreifeld] Melden: beim Verlassen des Datums geht immer ein „change“ an das versteckte Feld, beim Tippen und beim Wechsel zwischen den Teilen nie', () => {
  const { V } = ladeKern();
  const g = gruppeMit({ t: '14', m: '03', j: '1958' });
  V._datumDreifeldZusammensetzen(g, false);
  assert.deepEqual(g.versteckt.ereignisse, []);
  V._datumDreifeldZusammensetzen(g, true);
  assert.deepEqual(g.versteckt.ereignisse, ['change'], 'auch ohne Wertänderung seit dem Tippen');
  // Beim Verlassen bekommen Tag und Monat ihre führende Null, beim Tippen nicht (sonst spränge die Eingabe unter dem Finger).
  const h = gruppeMit({ t: '4', m: '3', j: '1958' });
  V._datumDreifeldZusammensetzen(h, false);
  assert.equal(h.querySelector('[data-datum-teil="m"]').value, '3');
  V._datumDreifeldZusammensetzen(h, true);
  assert.equal(h.querySelector('[data-datum-teil="m"]').value, '03');
  assert.equal(h.querySelector('[data-datum-teil="t"]').value, '04');
  assert.equal(h.versteckt.value, '1958-03-04');
  assert.match(KERN, /document\.addEventListener\('input', \(e\) => \{ const g = teilVon\(e\); if \(g\) _datumDreifeldZusammensetzen\(g, false\); \}, true\);/);
  assert.match(KERN, /document\.addEventListener\('change', \(e\) => \{ const g = teilVon\(e\); if \(g\) \{ _datumDreifeldZusammensetzen\(g, 'auffuellen'\); setTimeout\(\(\) => \{ if \(!g\.contains\(document\.activeElement\)\) _datumDreifeldZusammensetzen\(g, true\); \}, 0\); \} \}, true\);/);
  // Innerhalb des Datums: auffüllen ohne Meldung.
  const a = gruppeMit({ t: '4', m: '3', j: '1958' });
  V._datumDreifeldZusammensetzen(a, 'auffuellen');
  assert.deepEqual(a.versteckt.ereignisse, []);
  assert.equal(a.querySelector('[data-datum-teil="m"]').value, '03');
});

test('[Datum·Plausibel] ein Kalendertag, den es gibt — 31.02. und Tag 00 fallen durch', () => {
  const { V } = ladeKern();
  const inp = { min: '1800-01-01', max: '2026-12-31' };
  assert.equal(V._datumEingabePlausibel(inp, '1958-03-14'), true);
  assert.equal(V._datumEingabePlausibel(inp, '2024-02-29'), true);
  assert.equal(V._datumEingabePlausibel(inp, '1958-02-31'), false);
  assert.equal(V._datumEingabePlausibel(inp, '1958-03-00'), false);
  assert.equal(V._datumEingabePlausibel(inp, '1958-00-14'), false);
  assert.equal(V._datumEingabePlausibel(inp, '2023-02-29'), false);
  // Rot-Beweis: die Prüfung allein über Date.getTime ließe den 31.02. durch.
  assert.equal(isNaN(new Date('1958-02-31T00:00:00Z').getTime()), false);
});

test('[Datum·Fehler] Markierung und Fokus tragen die sichtbaren Teile; der Text nennt Tag, Monat und Jahr', () => {
  const { V } = ladeKern();
  const teile = [{ n: 't' }, { n: 'm' }, { n: 'j' }];
  const versteckt = { hasAttribute: (a) => a === 'data-datum-iso', closest: (s) => (s === '.datum-dreifeld' ? { querySelectorAll: () => teile } : null) };
  assert.deepEqual(V._feldSichtbareTeile(versteckt), teile);
  const text = { type: 'text', hasAttribute: () => false, closest: () => null };
  assert.deepEqual(V._feldSichtbareTeile(text), [text]);
  assert.equal(typeof V.STRINGS.feldFehlerDatumTeile, 'string');
  assert.match(V.STRINGS.feldFehlerDatumTeile, /Tag, Monat und Jahr/);
  assert.equal(V.wizardFehlerText('datum'), V.STRINGS.feldFehlerDatumTeile);
  assert.match(KERN, /_abgelehnt = \(inp\.hasAttribute && inp\.hasAttribute\('data-datum-iso'\)\) \? STRINGS\.feldFehlerDatumTeile : STRINGS\.feldFehlerDatum;/);
  assert.match(KERN, /for \(const z of _feldSichtbareTeile\(feld\)\) \{\n    if \(z\.classList\) z\.classList\.add\('feld-fehler'\);/);
});
