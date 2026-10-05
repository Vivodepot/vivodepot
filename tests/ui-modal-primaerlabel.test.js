'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Jeder Dialog hat eine Aufschrift für seinen Hauptknopf (Befund 01.10.2026, U2-ADR-468)
   ───────────────────────────────────────────────────────────────────────────
   `ui.modal` zeichnet den Hauptknopf immer. Fehlt `primaerLabel`, steht auf ihm „undefined“ — so geschehen im Dialog der
   ISiK-Ausgabe bei geschlossenem Tor, gefunden beim Durchsehen einer Vorschau. Kein Test sah es, weil keiner die Aufschrift las.
   DIE KLASSE: ein `ui.modal({…})`-Aufruf im Kern ohne `primaerLabel` (bzw. ohne `aktionen`, falls ein Aufruf die Knöpfe selbst
   setzt). Gezählt wird mit Klammerabgleich über das ganze Argument, nicht zeilenweise. Rot-Beweis an einer Kopie im Speicher.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// Das Objekt-Argument jedes `ui.modal({ … })`-Aufrufs, mit Klammerabgleich (Zeichenketten werden übersprungen).
function modalAufrufe(quelle) {
  const aus = [];
  const muster = /\bui\.modal\(\s*\{/g;
  let m;
  while ((m = muster.exec(quelle))) {
    let i = m.index + m[0].length;
    let tiefe = 1;
    let inStr = null;
    while (i < quelle.length && tiefe > 0) {
      const z = quelle[i];
      if (inStr) {
        if (z === '\\') { i += 2; continue; }
        if (z === inStr) inStr = null;
      } else if (z === '\'' || z === '"' || z === '`') inStr = z;
      else if (z === '{') tiefe++;
      else if (z === '}') tiefe--;
      i++;
    }
    aus.push({ zeile: quelle.slice(0, m.index).split('\n').length, arg: quelle.slice(m.index, i) });
  }
  return aus;
}
const ohneHauptknopf = (quelle) => modalAufrufe(quelle).filter((a) => !/\bprimaerLabel\b|\baktionen\b/.test(a.arg)).map((a) => a.zeile);

test('[Dialog·Hauptknopf] jeder ui.modal-Aufruf im Kern trägt eine Aufschrift für den Hauptknopf', () => {
  const aufrufe = modalAufrufe(KERN);
  assert.ok(aufrufe.length > 50, 'Ausbeute: die Aufrufe werden gefunden (' + aufrufe.length + ')');
  assert.deepEqual(ohneHauptknopf(KERN), [], 'Zeilen mit ui.modal ohne primaerLabel — der Knopf hieße „undefined“');
});

test('[Dialog·Hauptknopf·Rot-Beweis] ein gepflanzter Aufruf ohne primaerLabel wird gefunden, auch mit Klammern im Text', () => {
  const gepflanzt = KERN + "\nfunction _probe() { ui.modal({ titel: 'x', koerperHTML: '<p>' + f({ a: 1 }) + '} {</p>' }); }\n";
  assert.equal(ohneHauptknopf(gepflanzt).length, 1);
});
