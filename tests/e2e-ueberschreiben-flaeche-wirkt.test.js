'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   E2E-Specs überschreiben keine Kern-Funktion über `window.__vdOeffentlich`, die dort nur
   eine KOPIE ist (Befund 19.09.2026, e4-autosave-ansage-feldname.spec.js)
   ────────────────────────────────────────────────────────────────────────────
   Seit dem Kern-Verschluss liegt der Kern in einer IIFE; `window.__vdOeffentlich` trägt Funktionen als
   Kurzform-Einträge (`{ name, … }`) — Kopien der Referenz. `window.__vdOeffentlich.name = () => …`
   ändert nur diese Kopie; der interne Aufruf `name(…)` bindet lexikalisch und merkt nichts. Ein
   Rot-Beweis, der so „den Fix zurücknimmt", nimmt nichts zurück: seine Zusicherung („beide Ansagen
   wortgleich") scheitert, obwohl nichts mutiert wurde. Nur Einträge mit `get name() … set name(v)`
   (Zustandsvariablen) wirken beim Zuweisen.

   REGEL: eine Zuweisung an einen Eintrag OHNE Zugriffspaar trägt auf derselben oder der Zeile davor
   die Marke `nur-oeffentliche-flaeche` — sie sagt, dass die Messung genau diese öffentliche Fläche
   ruft (z. B. `lesewegeMessen`) und keinen internen Aufrufer. Alle anderen Rot-Beweise mutieren den
   Quelltext einer Kopie des gebackenen Produkts (Vorbild: e4-autosave-ansage-feldname.spec.js).
   Der Wächter kennt nur diese Schreibform; `Object.assign`/`defineProperty` sind nicht erfasst. */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const MARKE = 'nur-oeffentliche-flaeche';
// Bausteine getrennt, damit dieses Muster nicht als Treffer in dieser Datei steht.
const FLAECHE = 'window\\.__vd' + 'Oeffentlich\\.';
const ZUWEISUNG = new RegExp(FLAECHE + '([A-Za-z_$][\\w$]*)\\s*=(?![=>])', 'g');

function flaecheNamen(html) {
  const start = html.indexOf('window.__vdOeffentlich = {');
  assert.ok(start > 0, 'Suchraum besetzt: die Namensliste steht im Kern');
  const ende = html.indexOf('\n};', start);
  const block = html.slice(start, ende);
  const mitZugriff = new Set([...block.matchAll(/get ([A-Za-z_$][\w$]*)\(\)/g)].map((m) => m[1]));
  const alle = new Set();
  for (const z of block.split('\n').slice(1)) {
    const m = z.match(/^\s+(?:get\s+)?([A-Za-z_$][\w$]*)\s*(?:\(\))?\s*[,{]/);
    if (m) alle.add(m[1]);
  }
  return { alle, mitZugriff };
}

function funde(quelle, mitZugriff, alle) {
  const zeilen = quelle.split('\n');
  const out = [];
  zeilen.forEach((z, i) => {
    for (const m of z.matchAll(ZUWEISUNG)) {
      const name = m[1];
      if (!alle.has(name) || mitZugriff.has(name)) continue;
      if (z.includes(MARKE) || (zeilen[i - 1] || '').includes(MARKE)) continue;
      out.push({ zeile: i + 1, name });
    }
  });
  return out;
}

describe('[E2E·Fläche] Zuweisung an eine Funktion der öffentlichen Fläche wirkt nicht auf den Kern', () => {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const { alle, mitZugriff } = flaecheNamen(html);

  test('Positivkontrolle: die Fläche trägt Funktionen UND Zustands-Zugriffspaare', () => {
    assert.ok(alle.size > 50, 'Suchraum besetzt: ' + alle.size + ' Namen');
    assert.ok(mitZugriff.size > 5, 'Zugriffspaare gefunden: ' + mitZugriff.size);
    assert.ok(alle.has('_feldSprechbarerName') && !mitZugriff.has('_feldSprechbarerName'), 'die Funktion des Befunds ist ein reiner Kurzform-Eintrag');
    assert.ok(mitZugriff.has('_hintergrundSeit'), 'eine Zustandsvariable hat ihr Zugriffspaar');
  });

  test('[Rot-Beweis] die Form des Befunds wird gefunden; Marke und Zugriffspaar nehmen sie aus', () => {
    const roh = 'await page.evaluate(() => { window.__vd' + 'Oeffentlich._feldSprechbarerName = () => null; });';
    assert.deepEqual(funde(roh, mitZugriff, alle), [{ zeile: 1, name: '_feldSprechbarerName' }]);
    assert.deepEqual(funde('// ' + MARKE + '\n' + roh, mitZugriff, alle), [], 'mit Marke auf der Zeile davor');
    assert.deepEqual(funde('window.__vd' + 'Oeffentlich._hintergrundSeit = 5;', mitZugriff, alle), [], 'Zugriffspaar wirkt');
    assert.deepEqual(funde('const x = window.__vd' + 'Oeffentlich._feldSprechbarerName === f;', mitZugriff, alle), [], 'Vergleich ist keine Zuweisung');
  });

  test('kein E2E-Spec überschreibt eine Kopie ohne Marke', () => {
    const dir = path.join(REPO, 'tests', 'e2e');
    const funde_ = [];
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
      for (const x of funde(fs.readFileSync(path.join(dir, f), 'utf8'), mitZugriff, alle)) funde_.push('tests/e2e/' + f + ':' + x.zeile + ' (' + x.name + ')');
    }
    assert.deepEqual(funde_, [], 'diese Zuweisungen ändern nur die Kopie, nicht den Kern — Quelltext einer gebackenen Kopie mutieren, oder die Marke „' + MARKE + '" setzen, wenn die Messung die öffentliche Fläche selbst ruft');
  });
});
