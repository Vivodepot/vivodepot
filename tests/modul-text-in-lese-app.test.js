'use strict';
/* Grundsatz (19.09.2026): Was ein Sprachmodul mitbringt und die Lese-App zeigt, muss aus dem Modul kommen können.
   Gemessen wird ein Lauf der Lese-App (tools/modul-text-lese-app-ausgabe-messen.js): jede Kennung, die sie anfragt, muss sie auch annehmen und der Kern muss sie kennen;
   jeder Text, den sie zeigt, muss über die Anfrage laufen; was sie nie zeigt, steht mit Grund in `tools/modul-text-lese-app-grundlinie.json` (Zahl je Gruppe, nur sinkend).
   Rot-Beweise: eine Option wieder fest verdrahten, eine Anfrage ohne Kern-Kennung, eine neue Familie ohne Grund, ein Deckel, der zu hoch steht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../tools/modul-text-lese-app-messen.js');
const A = require('../tools/modul-text-lese-app-ausgabe-messen.js');

const LESEN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
let _echt = null;
function echt() { return _echt || (_echt = A.erheben()); }

test('[Modul-Text→Lese-App] Positivkontrolle: der Lauf liest etwas, und der Suchraum ist besetzt', () => {
  const m = echt();
  assert.ok(m.kennungen >= 2400, 'Kern-Kennungen: ' + m.kennungen);
  assert.ok(m.gelesen >= 600, 'die Lese-App fragt Texte an: ' + m.gelesen);
  assert.ok(m.durchgaenge >= 10, 'Optionsdurchgänge: ' + m.durchgaenge);
  assert.deepEqual(m.fehler, [], 'beim Rendern ist etwas abgebrochen');
});

test('[Modul-Text→Lese-App] kein Verstoß: jeder angefragte Text wird angenommen, jeder gezeigte Text läuft über die Anfrage, keine Familie ohne Grund', () => {
  const v = echt().verstoesse;
  assert.deepEqual(v.abgewiesen, [], 'die Lese-App fragt an, was sie beim Einlassen verwirft');
  assert.deepEqual(v.fest, [], 'die Lese-App zeigt den Text fest, ein Sprachmodul erreicht ihn nicht');
  assert.deepEqual(v.unklar, [], 'neue Familie ohne Grund in der Grundlinie');
});

test('[Modul-Text→Lese-App] jede Kennung, die die Lese-App anfragt, gibt es im Kern', () => {
  assert.deepEqual(echt().nichtImKern, []);
});

test('[Modul-Text→Lese-App] die Grundlinie: je Gruppe höchstens so viele nie angezeigte Kennungen, und sie sinkt mit', () => {
  const g = A.grundlinieLesen().gruppen;
  const gruende = A.gruppenGruende();
  const ist = echt().gruppen;
  const zuViel = Object.entries(ist).filter(([n, z]) => z > ((g[n] || {}).anzahl || 0)).map(([n, z]) => n + ': ' + z + ' > ' + ((g[n] || {}).anzahl || 0));
  assert.deepEqual(zuViel, [], 'mehr nie angezeigte Kennungen als die Grundlinie erlaubt');
  const zuHoch = Object.entries(g).filter(([n, e]) => (ist[n] || 0) < e.anzahl).map(([n]) => n);
  assert.deepEqual(zuHoch, [], 'ein behobener Fall muss die Grundlinie senken (node tools/modul-text-lese-app-ausgabe-messen.js --grundlinie-schreiben)');
  for (const [n, e] of Object.entries(g)) assert.ok(e.grund && e.grund === gruende[n], 'Gruppe ohne Grund oder mit anderem Grund als im Werkzeug: ' + n);
});

test('[Modul-Text→Lese-App·Rot-Beweis] eine Option wieder fest verdrahtet: der Text wird gezeigt, aber nicht mehr angefragt', () => {
  const ziel = "(opt && _optionLabelLesen(sektorId, feld.id, null, opt)) || String(roh)";
  assert.ok(LESEN.includes(ziel), 'Mutationsstelle fehlt');
  const m = A.erheben({ lesenQuelle: LESEN.replace(ziel, '(opt && opt.label) || String(roh)') });
  assert.ok(m.verstoesse.fest.length > 0, 'der Wächter muss die fest verdrahtete Option finden');
});

test('[Modul-Text→Lese-App] kein Listen- oder Feldwert erscheint als roher Optionsschlüssel', () => {
  assert.deepEqual(echt().rohe, [], 'die Lese-App zeigt einen Options-Schlüssel statt des Labels');
});

test('[Modul-Text→Lese-App·Rot-Beweis] Mehrfachauswahl in einer Liste als roher Schlüssel gezeigt: gefunden', () => {
  const ziel = "return (o && _optionLabelLesen(sektorId, feld.id, uf.id, o)) || String(x); }).filter(Boolean);";
  assert.ok(LESEN.includes(ziel), 'Mutationsstelle fehlt');
  const m = A.erheben({ lesenQuelle: LESEN.replace(ziel, 'return String(x); }).filter(Boolean);') });
  assert.ok(m.rohe.length > 0, 'der Wächter muss den rohen Schlüssel finden');
});

test('[Modul-Text→Lese-App·Rot-Beweis] eine Anfrage ohne Kern-Kennung wird gefunden', () => {
  const ziel = "_textLesenBekannt(sektorId + '#' + sektion.id + '.label')";
  assert.ok(LESEN.includes(ziel), 'Mutationsstelle fehlt');
  const m = A.erheben({ lesenQuelle: LESEN.replace(ziel, "textLesen(sektorId + '#' + sektion.id + '.label')") });
  assert.ok(m.nichtImKern.length > 0 || m.verstoesse.abgewiesen.length > 0, 'die Anfrage nach einer Kennung, die der Kern nicht hat, muss auffallen');
});

test('[Modul-Text→Lese-App·Rot-Beweis] eine neue Familie ohne Grund ist rot', () => {
  const m = A.erheben({ kennungen: M.kennungen().concat(['neuerbereich:x.frage']) });
  assert.ok(m.verstoesse.unklar.includes('neuerbereich:x.frage'));
});

test('[Modul-Text→Lese-App·Rot-Beweis] Bausteine: eine Annahme-Lücke wird gefunden, nur diese Familie', () => {
  const keys = ['identity.label', 'identity.givenName.label', 'identity.givenName.hint'];
  const kern = () => true;
  const m = M.messen(keys, kern, (k) => !k.endsWith('.hint'));
  assert.equal(m.summeFehlt, 1);
  assert.equal(M.messen(keys, kern, kern).summeFehlt, 0);
});
