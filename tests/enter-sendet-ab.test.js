'use strict';
/* Enter sendet ab (UX-Durchsicht 03.10.2026, umgesetzt 18.10.2026): Enter im Passwortfeld öffnete das Depot nicht, und kein
   Dialog kannte Enter. _enterLoestAus löst die Hauptaktion aus; ui.modal setzt es für jedes einzeilige Feld seines Körpers,
   der Startschirm für #co-pw, das Öffnen mit Code für das letzte Passwortfeld.
   Klasse (statisch): jedes Passwortfeld im Kern steht in einem ui.modal-Körper oder in einem Schirm mit _enterLoestAus. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function feldAttrappe(attr = {}) {
  const hoerer = [];
  return { onkeydown: null, addEventListener: (t, f) => { if (t === 'keydown') hoerer.push(f); },
    getAttribute: (n) => (n in attr ? attr[n] : null),
    druecke(ev) { const e = Object.assign({ preventDefault() { e.defaultPrevented = true; }, defaultPrevented: false }, ev); hoerer.forEach((f) => f(e)); return e; } };
}

test('[Enter·Helfer] Enter löst aus; IME, Umschalt, eigenes onkeydown und data-eigenes-enter nicht', () => {
  const { V } = ladeKern();
  let n = 0;
  const f = feldAttrappe();
  V._enterLoestAus(f, () => n++);
  assert.equal(f.druecke({ key: 'Enter' }).defaultPrevented, true); assert.equal(n, 1);
  f.druecke({ key: 'a' }); f.druecke({ key: 'Enter', isComposing: true }); f.druecke({ key: 'Enter', shiftKey: true });
  f.druecke({ key: 'Enter', ctrlKey: true }); f.druecke({ key: 'Enter', metaKey: true }); f.druecke({ key: 'Enter', altKey: true });
  assert.equal(n, 1);
  f.onkeydown = () => {}; f.druecke({ key: 'Enter' }); assert.equal(n, 1, 'eigenes onkeydown behandelt Enter selbst');
  const g = feldAttrappe({ 'data-eigenes-enter': '' }); V._enterLoestAus(g, () => n++); g.druecke({ key: 'Enter' });
  assert.equal(n, 1);
  V._enterLoestAus(null, () => n++); V._enterLoestAus(feldAttrappe(), null);   // fehlendes Feld, fehlende Aktion: kein Wurf
});

test('[Enter·Dialog] ui.modal verdrahtet einzeilige Felder seines Körpers mit dem Hauptknopf, Mehrzeiliges und Ankreuzfelder nicht', () => {
  const stelle = KERN.indexOf('\nconst ui = {');
  const ende = KERN.indexOf('\n};', stelle);
  const ui = KERN.slice(stelle, ende);
  assert.match(ui, /box\.querySelectorAll\('input'\)/);
  assert.match(ui, /_ENTER_FELDTYPEN\.has\(/);
  assert.match(ui, /_enterLoestAus\(feld, \(\) => \{ const ok = document\.getElementById\('m-ok'\); if \(ok && !ok\.disabled\) ok\.click\(\); \}\)/);
  const typen = JSON.parse(KERN.match(/const _ENTER_FELDTYPEN = new Set\((\[[^\]]*\])\)/)[1].replace(/'/g, '"'));
  assert.ok(typen.includes('password') && typen.includes('text'));
  assert.ok(!typen.includes('checkbox') && !typen.includes('radio') && !typen.includes('file'));
});

function passwortFelder(text) {
  const zeilen = text.split('\n');
  const raus = [];
  zeilen.forEach((z, i) => {
    if (!/type="password"/.test(z) || /querySelectorAll|^\s*(\/\/|\/\*|\*|#|input\[)/.test(z.trim()) || /^\s*#overlay/.test(z)) return;
    let a = i; while (a > 0 && !/^(async )?function \w+/.test(zeilen[a])) a--;
    let e = i; while (e < zeilen.length - 1 && !/^}/.test(zeilen[e])) e++;
    const koerper = zeilen.slice(a, e + 1).join('\n');
    const name = (zeilen[a].match(/function (\w+)/) || [])[1];
    raus.push({ zeile: i + 1, name, gedeckt: /ui\.modal\(|koerperHTML/.test(koerper) || /_enterLoestAus\(/.test(koerper) });
  });
  return raus;
}

// Diskriminante des Klassenwächters: die Passwortfelder ohne ui.modal-Körper und ohne _enterLoestAus.
function ungedeckteFelder(text) { return passwortFelder(text).filter((f) => !f.gedeckt).map((f) => f.name + ':' + f.zeile); }

test('[Enter·Klasse] jedes Passwortfeld steht in einem ui.modal-Körper oder in einem Schirm mit _enterLoestAus', () => {
  const felder = passwortFelder(KERN);
  assert.ok(felder.length >= 20, 'Vorbedingung: die Passwortfelder des Kerns werden gefunden (' + felder.length + ')');
  assert.deepEqual(ungedeckteFelder(KERN), []);
});

test('[Enter·Klasse·Rot-Beweis] Startschirm und Code-Öffnen ohne _enterLoestAus fallen auf', () => {
  const ohne = KERN
    .replace("  _enterLoestAus(document.getElementById('co-pw'), () => cryptoOverlayOeffnen());   // Enter im Passwortfeld öffnet\n", '')
    .replace("  _enterLoestAus(document.getElementById('whc-pw-neu2'), () => codeOverlayOeffnen(internModus));   // Enter im letzten Feld öffnet\n", '');
  assert.equal(KERN.length - ohne.length > 150, true, 'beide Zeilen stehen im Kern');
  assert.deepEqual(passwortFelder(ohne).filter((f) => !f.gedeckt).map((f) => f.name).sort(), ['renderCodeOeffnen', 'renderCodeOeffnen', 'renderCryptoOverlay']);
});

/* ── Proben-Deklaration (U2-ADR-099): je Wächter die Diskriminante, die er ruft und deren Liste er leer verlangt.
   Helfer und Dialog sind Konstruktions-Form (feste Tastendrücke, feste Stellen im Quelltext). */
module.exports = {
  PROBEN: [
    { fuer: '[Enter·Klasse] jedes Passwortfeld steht in einem ui.modal-Körper oder in einem Schirm mit _enterLoestAus', diskriminante: ungedeckteFelder },
  ],
};
