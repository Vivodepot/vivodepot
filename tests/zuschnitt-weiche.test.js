'use strict';
/* Die Zuschnitt-Weiche (tools/lib/wurzel-kopfzeile.js, imOeffentlichenZuschnitt) nimmt Proben aus, die den Kanon-Baum zählen
   oder zurückgehaltene Dateien lesen, und zwar nur im öffentlichen Zuschnitt. Anlass: der öffentliche Lauf v927 (13.10.2026) war
   mit fünf solchen Proben rot. Die Weiche ist eine Lockerung; diese Datei hält fest, dass sie im Kanon nie greift und dass sie
   nicht still wächst.
   1. Die Weiche entscheidet an der Wurzel-Kopfzeile: mit der Quellzeile (Kanon) nein, mit der öffentlichen Zeile ja, ohne
      Wurzeldatei nein. Das Muster der öffentlichen Zeile trifft die Quellzeile nicht.
   2. Rot-Beweis: hätte die Kanon-Wurzel die öffentliche Zeile, griffe die Weiche; die Entscheidung hängt allein an dieser Zeile.
   3. Positivliste: genau diese Stellen in den Proben rufen die Weiche. Eine neue Stelle braucht einen Eintrag hier. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/lib/wurzel-kopfzeile.js');

const REPO = path.join(__dirname, '..');
const KERN_QUELLE = W.wurzelKopfzeileZuruecksetzen(fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8'));

function wurzelMit(text) {
  const o = fs.mkdtempSync(path.join(os.tmpdir(), 'zuschnitt-weiche-'));
  if (text !== null) fs.writeFileSync(path.join(o, W.WURZEL_KOPFZEILE.datei), text);
  return o;
}

test('[Zuschnitt-Weiche] mit der Quellzeile greift die Weiche nicht, mit der öffentlichen Zeile greift sie, ohne Wurzeldatei nicht', () => {
  assert.equal(KERN_QUELLE.split('\n').filter((z) => z === W.WURZEL_KOPFZEILE.quellzeile).length, 1, 'die Kanon-Wurzel trägt die Quellzeile genau einmal');
  const kanon = wurzelMit(KERN_QUELLE);
  const oeffentlich = wurzelMit(W.wurzelKopfzeileSetzen(KERN_QUELLE));
  const leer = wurzelMit(null);
  try {
    assert.equal(W.imOeffentlichenZuschnitt(kanon), false, 'Kanon-Kopfzeile');
    assert.equal(W.imOeffentlichenZuschnitt(oeffentlich), true, 'öffentliche Kopfzeile');
    assert.equal(W.imOeffentlichenZuschnitt(leer), false, 'keine Wurzeldatei');
  } finally { for (const o of [kanon, oeffentlich, leer]) fs.rmSync(o, { recursive: true, force: true }); }
});

test('[Zuschnitt-Weiche·Rot-Beweis] dieselbe Kanon-Wurzel mit der öffentlichen Zeile lässt die Weiche greifen', () => {
  const o = wurzelMit(KERN_QUELLE.replace(W.WURZEL_KOPFZEILE.quellzeile, W.wurzelKopfzeileOeffentlich('v1.0.0')));
  try { assert.equal(W.imOeffentlichenZuschnitt(o), true); } finally { fs.rmSync(o, { recursive: true, force: true }); }
});

const STELLEN = Object.freeze({
  'tests/kern-testflaeche.test.js': 2,          // Ratsche (Zahl der Specs), Klasse (Tiefe der Helfer)
  'tests/navicon-alle-seiten.test.js': 1,       // Zahl der Wurzel-Seiten (zuschnitt-privat: öffentlich zurückgehalten)
  'tests/pro-zuschnitte.test.js': 1,            // Werkzeuge der Auslieferungskette, die der Zuschnitt zurückhält (zuschnitt-privat: öffentlich zurückgehalten)
  'tests/e2e/eine-anlege-aufforderung-je-ansicht.spec.js': 1, // öffentlich kein Pro-Produkt (20.10.2026, Grund je Weiche: tests/e2e-oeffentlich-weichen.test.js)
  'tests/e2e/fix-6-trefferflaechen.spec.js': 1,                 // öffentlich ohne die zurückgehaltenen Vorlagen (20.10.2026, gemessen: mit den Vorlagen grün)
  'tests/e2e/f8-dokument-oeffner-abnahme.spec.js': 1,           // öffentlich ohne die zurückgehaltenen Vorlagen (20.10.2026)
  'tests/e2e/nachlese-f8-m1-zug4-abnahme.spec.js': 1,           // öffentlich ohne die zurückgehaltenen Vorlagen (20.10.2026)
  'tests/suite-rot-zusammenfassung.test.js': 1, // beide Hook-Proben (die Hooks sind zurückgehalten; zuschnitt-privat)
});

test('[Zuschnitt-Weiche·Positivliste] genau diese Proben rufen die Weiche, je mit dieser Zahl von Stellen', () => {
  const gefunden = {};
  const lauf = (rel) => {
    for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'fixtures') lauf(r); continue; }
      if (!/\.(c|m)?js$/.test(e.name) || r === path.join('tests', 'zuschnitt-weiche.test.js')) continue;
      const n = (fs.readFileSync(path.join(REPO, r), 'utf8').match(/imOeffentlichenZuschnitt\(/g) || []).length;
      if (n) gefunden[r.split(path.sep).join('/')] = n;
    }
  };
  lauf('tests');
  // Im öffentlichen Zuschnitt fehlen die zurückgehaltenen Proben (Schicht 2); dort zählen nur die vorhandenen. Im Kanon gilt die ganze Liste.
  const erwartet = W.imOeffentlichenZuschnitt(REPO) ? Object.fromEntries(Object.entries(STELLEN).filter(([d]) => fs.existsSync(path.join(REPO, d)))) : STELLEN;
  assert.deepEqual(gefunden, erwartet);
});
