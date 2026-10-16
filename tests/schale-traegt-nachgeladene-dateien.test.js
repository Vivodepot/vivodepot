'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klassenwächter: jede Datei, die der Kern beim Laden nachlädt, steht in der Schale des Service Workers
   (Befund MODUL-APP-VORABKONFIGURATION-OFFLINE, 13.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Eine Modul-App lädt `vorabkonfiguration.js` über ein eingefügtes <script>. Der Service Worker legt bei der
   Installation nur seine Liste SCHALE ab, und angemeldet wird er erst bei `load`. Was der Kern beim ersten Besuch
   nachlädt und nicht in SCHALE steht, fehlt beim nächsten Start ohne Netz.

   Die Klasse, nicht nur die eine Datei: der Wächter sucht im Kern jedes `document.createElement('script')`, liest
   die Quelle, die das Element bekommt (`<name>.src = <KONSTANTE>`), löst die Konstante auf (`const KONSTANTE = '…'`)
   und verlangt sie in SCHALE. Ein Ladeweg, dessen Quelle der Wächter nicht auflösen kann, ist rot — er muss dann
   hier ausdrücklich verstanden werden, nicht still übergangen.

   Probe im Browser: tests/e2e/modul-app-vorabkonfiguration-offline.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const SW = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');

/** Die Einträge der Liste SCHALE in sw.js, ohne Kommentare. */
function schaleAusSw(swText) {
  const m = /const SCHALE = \[([\s\S]*?)\];/.exec(swText);
  if (!m) throw new Error('sw.js: keine Liste SCHALE gefunden');
  const ohneKommentare = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  return [...ohneKommentare.matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Jede Quelle, die der Kern einem selbst erzeugten <script> gibt; nicht auflösbare als { roh }. */
function nachgeladeneSkripte(kernText) {
  const raus = [];
  const erzeugt = /const (\w+) = document\.createElement\(['"]script['"]\);/g;
  let m;
  while ((m = erzeugt.exec(kernText))) {
    const name = m[1];
    const danach = kernText.slice(m.index, m.index + 2000);
    const zuweisung = new RegExp('\\b' + name + '\\.src = ([^;]+);').exec(danach);
    if (!zuweisung) { raus.push({ roh: name + '.src fehlt in der Nähe' }); continue; }
    const ausdruck = zuweisung[1].trim();
    const literal = /^'([^']+)'$/.exec(ausdruck);
    if (literal) { raus.push({ pfad: literal[1] }); continue; }
    const konstante = /^[A-Z_][A-Z0-9_]*$/.test(ausdruck)
      ? new RegExp('const ' + ausdruck + " = '([^']+)';").exec(kernText) : null;
    raus.push(konstante ? { pfad: konstante[1], ueber: ausdruck } : { roh: ausdruck });
  }
  return raus;
}

const normal = (p) => p.replace(/^\.\//, '');

function fehlendInSchale(kernText, swText) {
  const schale = new Set(schaleAusSw(swText).map(normal));
  return nachgeladeneSkripte(kernText).filter((s) => !s.pfad || !schale.has(normal(s.pfad)));
}

test('[Schale·Klasse] der Kern lädt mindestens ein Skript nach (sonst sucht der Wächter am falschen Ort)', () => {
  const gefunden = nachgeladeneSkripte(KERN);
  assert.ok(gefunden.length >= 1, 'kein document.createElement(\'script\') im Kern gefunden');
  assert.ok(gefunden.some((s) => s.pfad === './vorabkonfiguration.js'), 'die Begleitdatei der Modul-App wird nicht als Ladeweg erkannt: ' + JSON.stringify(gefunden));
});

test('[Schale·Klasse] jede Datei, die der Kern nachlädt, steht in SCHALE von sw.js', () => {
  assert.deepEqual(fehlendInSchale(KERN, SW), []);
});

test('[Schale·Rot-Beweis] ohne den Eintrag in SCHALE meldet der Wächter die Begleitdatei', () => {
  const ohne = SW.replace(/\n\s*'\.\/vorabkonfiguration\.js',/, '\n');
  assert.notEqual(ohne, SW, 'Rot-Beweis ohne Anker: der Eintrag steht nicht in der erwarteten Form in sw.js');
  assert.deepEqual(fehlendInSchale(KERN, ohne).map((s) => s.pfad), ['./vorabkonfiguration.js']);
});

test('[Schale·Rot-Beweis] ein Ladeweg mit nicht auflösbarer Quelle ist rot, nicht übergangen', () => {
  const kern = "const t = document.createElement('script');\n t.src = irgendwoher();";
  assert.deepEqual(fehlendInSchale(kern, SW).map((s) => s.roh), ['irgendwoher()']);
});
