'use strict';
/* Die Vorführ-Notiz wartet auf eine Ansicht, die asynchron öffnet (09.10.2026, Befund VORFUEHRUNG-NOTIZ-VOR-ASYNC-DIALOG).
   `_vorfuehrungAnsichtZeigen` öffnet je Station eine Ansicht; gleich danach setzt `_vorfuehrungNotizNachAnsicht` die Notiz an die
   Überschrift der offenen Ansicht. Öffnet eine Ansicht ihren Dialog erst später (await, `.then(` oder der Aufruf einer
   `async function`), steht die Notiz an der Ansicht davor und liegt danach über der Dialog-Überschrift — gefunden an der Station
   „freigabe“, als `_anfrageHerausgeben` asynchron wurde. Die Notiz wartet nur, wenn der Fall `_vorfuehrungAnsichtWartet` setzt.
   Dieser Wächter verlangt das für jeden `case` mit asynchroner Ansicht. Die asynchronen Funktionen kommen aus dem Kern selbst
   (jede `async function`), nicht aus einer Hand-Liste. Grenze: ein synchroner Aufruf, der intern eine asynchrone Funktion ohne
   Rückgabe anstößt, wird nicht erkannt; dafür bleibt die Verdeckungsprobe der Demo-Journeys im E2E. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const KOPF = 'function _vorfuehrungAnsichtZeigen(station) {';

function asyncFunktionen(text) {
  return new Set([...text.matchAll(/async function\s+([\w$]+)/g)].map((m) => m[1]));
}

function faelle(text) {
  const s = text.indexOf(KOPF);
  assert.ok(s >= 0, 'der Kern trägt _vorfuehrungAnsichtZeigen');
  const e = text.indexOf('\n}\n', s);
  assert.ok(e > s, 'das Ende von _vorfuehrungAnsichtZeigen ist zu finden');
  const rumpf = text.slice(s, e);
  return rumpf.split(/\n {4}(?=case '|default:)/).slice(1).map((t) => ({ name: (/^case '([^']+)'/.exec(t) || [null, 'default'])[1], rumpf: t }));
}

function ohneWarten(text) {
  const asy = asyncFunktionen(text);
  return faelle(text).filter((f) => {
    const aufrufe = [...f.rumpf.matchAll(/([\w$]+)\s*\(/g)].map((m) => m[1]).filter((n) => asy.has(n));
    const asynchron = /\bawait\b/.test(f.rumpf) || /\.then\(/.test(f.rumpf) || aufrufe.length > 0;
    return asynchron && !/_vorfuehrungAnsichtWartet\s*=/.test(f.rumpf);
  }).map((f) => f.name);
}

test('jede Station mit asynchroner Ansicht setzt _vorfuehrungAnsichtWartet', () => {
  assert.ok(asyncFunktionen(KERN).has('_anfrageHerausgeben'), 'Vorbedingung: _anfrageHerausgeben ist im Kern asynchron');
  const alle = faelle(KERN).map((f) => f.name);
  for (const n of ['fhir-ips', 'freigabe', 'ausgabe', 'bereich']) assert.ok(alle.includes(n), 'der Fall ' + n + ' wird gelesen');
  assert.deepEqual(ohneWarten(KERN), []);
});

test('Rot-Beweis: „freigabe“ ohne _vorfuehrungAnsichtWartet fällt auf', () => {
  const alt = /_vorfuehrungAnsichtWartet = \(station\.ziel === 'bestaetigen'\)\s*\? (anfrageAntwortDatensatzGeprueft\([\s\S]*?\);\s*\}\))\s*: _anfrageHerausgeben\(a\);/;
  assert.ok(alt.test(KERN), 'Vorbedingung: der Rumpf von „freigabe“ steht so im Kern');
  const gepflanzt = KERN.replace(alt, "if (station.ziel === 'bestaetigen') $1;\n      else _anfrageHerausgeben(a);");
  assert.notEqual(gepflanzt, KERN, 'der Ersatz greift');
  assert.deepEqual(ohneWarten(gepflanzt), ['freigabe']);
});

test('Gegenprobe: ein synchroner Fall ohne _vorfuehrungAnsichtWartet ist erlaubt', () => {
  const sync = faelle(KERN).find((f) => f.name === 'bereich');
  assert.ok(sync && !/_vorfuehrungAnsichtWartet\s*=/.test(sync.rumpf), 'Vorbedingung: „bereich“ setzt nichts');
  assert.ok(!ohneWarten(KERN).includes('bereich'));
});
