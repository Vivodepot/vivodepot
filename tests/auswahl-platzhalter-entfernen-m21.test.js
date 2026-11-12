'use strict';
/* M21 der Gestaltungsleitung (Abnahme v1033, 03.11.2026): Auswahlfelder.
   · Leer zeigt das geschlossene Feld den hellen Platzhalter „Bitte wählen“, ohne Striche. In der offenen Liste steht er nicht
     (hidden, disabled), statt „— bitte wählen —“ als erster, fett gesetzter und abgehakter Eintrag.
   · Ist ein Wert gewählt, steht als letzter Eintrag unter einer Trennlinie „Auswahl entfernen“, zurückhaltend gesetzt. Es ist
     eine Handlung, keine Antwort: es steht auch neben einer Option „keine Angabe“ (Geschlecht), die eine Aussage ist.
   · Beide tragen den Wert "": die Speicherwege sehen wie bisher ein leeres Feld.
   Gilt für die Auswahl und für die Verweis-Auswahl (Person, Institution, Dokument, Bankvollmacht).
   Rot-Beweis: der Kern vor M21 (der alte erste Eintrag) fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const FELD = { id: 'm21Probe', typ: 'auswahl', optionen: [{ wert: 'a', label: 'Antwort A' }, { wert: 'k', label: 'keine Angabe' }] };

/* Rein: was eine gerenderte Auswahl über Platzhalter und Entfernen sagt. */
function funde(V, html, leer) {
  const aus = [];
  const platz = /<option value="" disabled="" hidden=""( selected="")? data-platzhalter="1">([^<]*)<\/option>/.exec(html);
  if (!platz) aus.push('kein Platzhalter (hidden, disabled)');
  else {
    if (platz[2] !== V.escapeHTML(V.STRINGS.auswahlPlatzhalter)) aus.push('Platzhalter-Text: ' + platz[2]);
    if (/[—–-]/.test(platz[2])) aus.push('Platzhalter mit Strichen');
    if (leer !== !!platz[1]) aus.push(leer ? 'leer, aber der Platzhalter ist nicht gewählt' : 'gewählt, aber der Platzhalter auch');
  }
  if (html.includes(V.escapeHTML(V.STRINGS.subGrundlageLeer))) aus.push('der alte Eintrag „— bitte wählen —“ steht noch da');
  const entf = /<hr><option value="" data-auswahl-entfernen="1">([^<]*)<\/option><\/select>/.exec(html);
  if (leer && entf) aus.push('leer, aber „Auswahl entfernen“ steht da');
  if (!leer && !entf) aus.push('gewählt, aber kein „Auswahl entfernen“ als letzter Eintrag unter einer Trennlinie');
  if (entf && entf[1] !== V.escapeHTML(V.STRINGS.auswahlEntfernen)) aus.push('Entfernen-Text: ' + entf[1]);
  return aus;
}

test('[M21] Auswahl leer: heller Platzhalter, nicht in der Liste, kein „Auswahl entfernen“', () => {
  const { V } = ladeKern();
  assert.deepEqual(funde(V, V.feldInputHTML(FELD, ''), true), []);
  assert.equal(V.STRINGS.auswahlPlatzhalter, 'Bitte wählen');
  assert.equal(V.STRINGS.auswahlEntfernen, 'Auswahl entfernen');
});

test('[M21] Auswahl gewählt: „Auswahl entfernen“ unter der Trennlinie, auch neben „keine Angabe“', () => {
  const { V } = ladeKern();
  assert.deepEqual(funde(V, V.feldInputHTML(FELD, 'a'), false), []);
  assert.deepEqual(funde(V, V.feldInputHTML(FELD, 'k'), false), [], '„keine Angabe“ ist eine Antwort, das Entfernen bleibt');
});

test('[M21] Verweis-Auswahl (Person) folgt demselben Muster', () => {
  const { V } = ladeKern();
  const feld = { id: 'm21Ref', typ: 'ref', entitaet: 'person' };
  assert.deepEqual(funde(V, V.feldInputHTML(feld, { ref: '' }).replace(/<\/div>[\s\S]*$/, ''), true), []);
  const html = V.feldInputHTML(feld, { ref: 'p-1' });
  assert.ok(/<hr><option value="" data-auswahl-entfernen="1">/.test(html), 'gewählt: Entfernen steht da');
});

test('[M21] der Stil: die Trennlinie und „Auswahl entfernen“ zurückhaltend; der Platzhalter hell', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  assert.match(css, /select hr \{ border: 0; border-top: 1px solid var\(--line\);/);
  assert.match(css, /select option\[data-auswahl-entfernen\] \{ color: var\(--ink2\); font-size: var\(--fs-role-hilfe\); \}/);
  assert.match(css, /select:has\(> option\[value=""\]:checked\) \{ font-weight: var\(--fw-regular\); color: color-mix/);
});

test('[M21·Rot-Beweis] der alte erste Eintrag „— bitte wählen —“ fällt durch', () => {
  const { V } = ladeKern();
  const alt = '<select data-edit="m21Probe" data-typ="auswahl"><option value="">' + V.escapeHTML(V.STRINGS.subGrundlageLeer) +
    '</option><option value="a" selected>Antwort A</option></select>';
  const f = funde(V, alt, false);
  assert.ok(f.includes('kein Platzhalter (hidden, disabled)') && f.some((x) => x.includes('der alte Eintrag')), f.join(' | '));
  assert.ok(KERN.includes('function _auswahlEntfernenHTML('), 'Vorbedingung: der Baustein steht im Kern');
});

/* Der Wechsel-Hörer aus dem Kern, mit einer kleinen Auswahl-Attrappe ausgeführt: wählt die Person einen Wert, ohne dass die Seite
   neu zeichnet, hängt er „Auswahl entfernen“ sofort an (Abnahme GL 03.11.2026: das Bild der offenen Liste nach der Wahl). */
function hoererAus(kern) {
  const a = kern.indexOf("document.addEventListener('change', (e) => {\n    const sel = e.target;");
  const b = kern.indexOf('\n  });', a);
  if (a < 0 || b < 0) return null;
  return kern.slice(a + "document.addEventListener('change', ".length, b + '\n  }'.length);
}
function attrappe(werte, gewaehlt) {
  const opts = werte.map((w) => ({ value: w.v, attrs: w.a || {}, selected: false,
    hasAttribute(n) { return n in this.attrs; }, remove() { sel.options.splice(sel.options.indexOf(this), 1); } }));
  const sel = { tagName: 'SELECT', options: opts, angehaengt: [],
    get value() { return gewaehlt; },
    get selectedIndex() { return this.options.findIndex((o) => o.value === gewaehlt && !o.attrs['data-platzhalter']); },
    querySelector(q) { const m = /data-([a-z-]+)/.exec(q); return m ? this.options.find((o) => ('data-' + m[1]) in o.attrs) || null : null; },
    appendChild(knoten) { this.angehaengt.push(knoten.tag); if (knoten.tag === 'option') this.options.push(knoten); return knoten; } };
  return sel;
}
function nachzieherAus(kern) {
  const a = kern.indexOf('function _auswahlEntfernenNachziehen(sel) {');
  return a < 0 ? '' : kern.slice(a, kern.indexOf('\n}\n', a) + 2);
}
function nachWahl(kern, wert) {
  const quelle = hoererAus(kern);
  if (!quelle) return 'Hörer nicht gefunden';
  // Der Hörer baut den Eintrag als Knoten (createElement, textContent); die Attrappe des Dokuments liefert schlichte Knoten.
  const dok = { createElement: (tag) => ({ tag, value: '', textContent: '', attrs: {},
    setAttribute(n, v) { this.attrs[n] = v; }, hasAttribute(n) { return n in this.attrs; } }) };
  const h = new Function('document', 'STRINGS', nachzieherAus(kern) + '\nreturn (' + quelle + ');')(dok, { auswahlEntfernen: 'x' });
  const sel = attrappe([{ v: '', a: { 'data-platzhalter': '1' } }, { v: 'a' }, { v: '__neu__' }], wert);
  h({ target: sel });
  return sel.options.filter((o) => 'data-auswahl-entfernen' in o.attrs).length;
}

test('[M21] gewählt ohne Neuzeichnen: „Auswahl entfernen“ steht sofort da, genau einmal; nicht bei „__neu__“', () => {
  assert.equal(nachWahl(KERN, 'a'), 1);
  assert.equal(nachWahl(KERN, '__neu__'), 0);
});

test('[M21·Rot-Beweis] ein Hörer, der nur entfernt, lässt die Liste nach der Wahl ohne „Auswahl entfernen“', () => {
  const alt = KERN.replace("if (!opt.hasAttribute('data-auswahl-entfernen')) { _auswahlEntfernenNachziehen(sel); return; }", "if (!opt.hasAttribute('data-auswahl-entfernen')) return;");
  assert.notEqual(alt, KERN, 'Vorbedingung: die Stelle steht im Kern');
  assert.equal(nachWahl(alt, 'a'), 0);
});

/* Nachzug (Air-Rotliste 03.11.2026): nach „+ Neue Person“ setzt der Kern den Wert selbst, ohne Wechsel-Ereignis und ohne Neuzeichnen.
   Jede Stelle, die einer Auswahl so einen Wert gibt, ruft _auswahlEntfernenNachziehen; sonst fehlte „Auswahl entfernen“. */
const NACH_NEUER_PERSON = /\n\s*sel\.value = (personId|newId);([^\n]*)/g;
function stellenOhneNachzug(kern) {
  return [...kern.matchAll(NACH_NEUER_PERSON)].filter((m) => !m[2].includes('_auswahlEntfernenNachziehen(sel)')).map((m) => m[0].trim());
}

test('[M21·Neue Person] jede Stelle, die nach „+ Neue Person“ den Wert setzt, zieht „Auswahl entfernen“ nach', () => {
  const alle = [...KERN.matchAll(NACH_NEUER_PERSON)];
  assert.equal(alle.length, 3, 'Vorbedingung: drei Stellen (Person-Auswahl, zwei Verweis-Auswahlen)');
  assert.deepEqual(stellenOhneNachzug(KERN), []);
});

test('[M21·Neue Person] der Nachzug hängt „Auswahl entfernen“ an einen gesetzten Wert, einmal, nie an „__neu__“', () => {
  const dok = { createElement: (tag) => ({ tag, value: '', textContent: '', attrs: {},
    setAttribute(n, v) { this.attrs[n] = v; }, hasAttribute(n) { return n in this.attrs; } }) };
  const nz = new Function('document', 'STRINGS', nachzieherAus(KERN) + '\nreturn _auswahlEntfernenNachziehen;')(dok, { auswahlEntfernen: 'x' });
  const zahl = (wert, mal) => { const sel = attrappe([{ v: '', a: { 'data-platzhalter': '1' } }, { v: 'p1' }, { v: '__neu__' }], wert);
    for (let i = 0; i < mal; i++) nz(sel); return sel.options.filter((o) => 'data-auswahl-entfernen' in o.attrs).length; };
  assert.equal(zahl('p1', 2), 1);
  assert.equal(zahl('__neu__', 1), 0);
  assert.equal(zahl('', 1), 0);
});

test('[M21·Neue Person·Rot-Beweis] eine Stelle ohne den Nachzug fällt auf', () => {
  const alt = KERN.replace('sel.value = personId; _auswahlEntfernenNachziehen(sel);', 'sel.value = personId;');
  assert.notEqual(alt, KERN, 'Vorbedingung: die Stelle steht im Kern');
  assert.deepEqual(stellenOhneNachzug(alt), ['sel.value = personId;']);
});
