'use strict';
/* ABN-B6 BEREICH-OEFFNEN-ZIEL (11.11.2026): „im Bereich öffnen“ führt zum Feld. Die Probe führt `oeffneSektorFeld` aus dem Kern
   gegen ein Feld in zwei ineinander liegenden zugeklappten Karten aus und verlangt: beide Karten offen, Sprung ins Blickfeld,
   Fokus im Feld, Markierung. Die Browser-Probe dazu: tests/e2e/bereich-oeffnen-fuehrt-zum-feld.spec.js (390 px und Desktop).
   Rot-Beweis (am Kern ohne das Aufklappen gemessen): die äußere Karte bleibt zu, die Probe fällt. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const start = html.indexOf('function oeffneSektorFeld(');
const ende = html.indexOf('\n}\n', start) + 3;
const quelle = html.slice(start, ende);
// Der Sprung ruft den Helfer „Rubrik des Feldes öffnen“ (Liste | Detail, U-4); die Probe lädt ihn aus derselben Quelle mit.
const hStart = html.indexOf('function eintragRubrikDesFeldesOeffnen(');
const hEnde = html.indexOf('\n}\n', hStart) + 3;
const helferQuelle = html.slice(hStart, hEnde);

function ausfuehren(feldId) {
  const protokoll = { geoeffnet: [], scroll: 0, fokus: 0, klassen: [], sektor: null };
  const eingabe = { matches: (s) => /input/.test(s), focus: () => { protokoll.fokus++; } };
  const innen = { open: false }; const aussen = { open: false };
  const feld = {
    matches: () => false,
    closest: (s) => (s === 'details' ? innen : null),
    querySelector: () => eingabe,
    scrollIntoView: () => { protokoll.scroll++; },
    classList: { add: (c) => protokoll.klassen.push(c), remove: () => {} },
  };
  innen.parentElement = { closest: (s) => (s === 'details' ? aussen : null) };
  aussen.parentElement = null;
  const doc = { querySelector: (s) => (s.includes(feldId) && s.startsWith('[data-feld="') ? feld : null) };
  const f = new Function('oeffneSektor', 'document', 'requestAnimationFrame', '_ohneProzessHalt', 'setTimeout',
    helferQuelle + '\n' + quelle + '\nreturn oeffneSektorFeld;')(
    (id) => { protokoll.sektor = id; }, doc, (fn) => fn(), (t) => t, () => 0);
  f('health', feldId);
  protokoll.innen = innen.open; protokoll.aussen = aussen.open;
  return protokoll;
}

test('[ABN-B6] der Sprung öffnet die Karten um das Feld, holt es ins Blickfeld, setzt den Fokus und markiert es', () => {
  assert.ok(quelle.includes('oeffneSektorFeld'), 'Funktion im Kern gefunden');
  const p = ausfuehren('allergiesMedicationFoodOther');
  assert.equal(p.sektor, 'health');
  assert.equal(p.innen, true, 'die innere Karte ist offen');
  assert.equal(p.aussen, true, 'die äußere Karte ist offen');
  assert.equal(p.scroll, 1, 'das Feld kommt ins Blickfeld');
  assert.equal(p.fokus, 1, 'der Fokus liegt im Feld');
  assert.deepEqual(p.klassen, ['feld-hervorgehoben'], 'das Feld ist sichtbar markiert');
});

test('[ABN-B6] der Helfer „Rubrik des Feldes öffnen“ wählt die Rubrik des Feldes in der Liste und meldet es, eine gewählte lässt er stehen', () => {
  assert.ok(helferQuelle.includes('eintragRubrikDesFeldesOeffnen'), 'Helfer im Kern gefunden');
  const lauf = (gewaehlt) => {
    const geklickt = [];
    const knopf = { getAttribute: (a) => (a === 'aria-current' && gewaehlt ? 'true' : null), click: () => geklickt.push('rubrik') };
    const eb = { querySelector: (s) => (s === '[data-rubrik="gruppe-a"]' ? knopf : null) };
    const karte = { getAttribute: () => 'gruppe-a' };
    const zeile = { closest: (s) => (s === '[data-karte]' ? karte : null) };
    const doc = { querySelector: (s) => (s === '.eintragebereich' ? eb : null) };
    const f = new Function('document', helferQuelle + '\nreturn eintragRubrikDesFeldesOeffnen;')(doc);
    return { ergebnis: f(zeile), geklickt };
  };
  assert.deepEqual(lauf(false), { ergebnis: true, geklickt: ['rubrik'] }, 'nicht gewählte Rubrik: Klick auf ihre Zeile, true');
  assert.deepEqual(lauf(true), { ergebnis: false, geklickt: [] }, 'gewählte Rubrik: kein Klick, false');
  assert.equal(new Function('document', helferQuelle + '\nreturn eintragRubrikDesFeldesOeffnen;')({ querySelector: () => null })({ closest: () => null }), false, 'ohne Eintragebereich: false');
});

/* Am Handy (U-4, Liste zuerst) ist auch die gewählte Rubrik zu, solange das Detail nicht offen ist. Der Helfer tippt dann ihre Zeile an, wie die
   Person, und meldet true; sonst klebte die Notiz der Vorführung an einer Zeile ohne Fläche (Demo myhealth-vertretung, Schritt 1, Handy 375 und
   WebKit, 18.11.2026). Die Browser-Probe dazu: [Demo myhealth-vertretung · Handy 375] und [… · iPhone WebKit].
   Rot-Beweis: ein Helfer, der eine gewählte Rubrik immer stehen lässt, fällt durch. */
function handyLauf(quelleHelfer, { gewaehlt, detailOffen, detailSichtbar }) {
  const geklickt = [];
  const knopf = { getAttribute: (a) => (a === 'aria-current' && gewaehlt ? 'true' : null), click: () => geklickt.push('rubrik') };
  const detail = { sichtbar: detailSichtbar };
  const eb = {
    querySelector: (s) => (s === '[data-rubrik="gruppe-a"]' ? knopf : s === '.bereich-detail' ? detail : null),
    hasAttribute: (a) => a === 'data-detail-offen' && detailOffen,
  };
  const karte = { getAttribute: () => 'gruppe-a' };
  const zeile = { closest: (s) => (s === '[data-karte]' ? karte : null) };
  const doc = { querySelector: (s) => (s === '.eintragebereich' ? eb : null) };
  const stil = (e) => ({ display: e.sichtbar ? 'block' : 'none' });
  const f = new Function('document', 'getComputedStyle', quelleHelfer + '\nreturn eintragRubrikDesFeldesOeffnen;')(doc, stil);
  return { ergebnis: f(zeile), geklickt };
}

test('[ABN-B6·Handy] gewählte Rubrik bei zugeklapptem Detail: der Helfer öffnet das Detail; am Schreibtisch und bei offenem Detail bleibt es stehen', () => {
  assert.deepEqual(handyLauf(helferQuelle, { gewaehlt: true, detailOffen: false, detailSichtbar: false }), { ergebnis: true, geklickt: ['rubrik'] }, 'Handy, Detail zu: Tipp auf die Zeile, true');
  assert.deepEqual(handyLauf(helferQuelle, { gewaehlt: true, detailOffen: true, detailSichtbar: true }), { ergebnis: false, geklickt: [] }, 'Handy, Detail offen: kein Klick');
  assert.deepEqual(handyLauf(helferQuelle, { gewaehlt: true, detailOffen: false, detailSichtbar: true }), { ergebnis: false, geklickt: [] }, 'Schreibtisch (Detail sichtbar): kein Klick');
});

test('[ABN-B6·Handy Rot-Beweis] ein Helfer, der die gewählte Rubrik immer stehen lässt, öffnet das Detail am Handy nicht', () => {
  const alt = helferQuelle.replace(/if \(!knopf\) return false;[\s\S]*?knopf\.click\(\);/, "if (!knopf || knopf.getAttribute('aria-current') === 'true') return false;\n    knopf.click();");
  assert.notEqual(alt, helferQuelle, 'Voraussetzung: die Stelle gefunden');
  assert.deepEqual(handyLauf(alt, { gewaehlt: true, detailOffen: false, detailSichtbar: false }), { ergebnis: false, geklickt: [] }, 'Rot-Beweis: alter Helfer klickt nicht');
});
