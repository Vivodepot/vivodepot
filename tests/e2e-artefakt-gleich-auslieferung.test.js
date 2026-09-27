'use strict';
/* Befund E2E-ARTEFAKT (interner Befund vom 23.09.2026): das Test-Artefakt IST der Auslieferungs-Bau,
   bis auf genau die Region der Entwicklerleiste — byteweise. Die Trägheit der Region im Browser prüft
   tests/mit-modul/e2e-artefakt-traege-browser.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { _entwicklerleisteSchneiden, ENTWICKLERLEISTE_MARKEN } = require('../tools/lib/produkt-text-erzeugen.js');
const { ladeIssuer } = require('./load-issuer.js');
const { testProduktText } = require('./produkt-test-backen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function ausgeliefert(slug) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-artefakt-'));
  const gebaut = konfektionieren({
    ziel: ordner, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: ladeIssuer().V.vorDepotKonfigurationDateiInhalt,
    unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === slug)),
  });
  return { datei: path.join(gebaut.ordner, 'vivodepot.html'), ordner };
}

for (const p of PRODUKTE) {
  test(`[E2E-Artefakt·Byte] ${p.slug}: Test-Artefakt minus genau die Leisten-Region == ausgeliefertes Produkt`, () => {
    const { datei, ordner } = ausgeliefert(p.slug);
    try {
      const auslieferung = fs.readFileSync(datei, 'utf8');
      const testArtefakt = testProduktText(KERN, { slug: p.slug });
      assert.notEqual(testArtefakt, auslieferung, 'Vorbedingung: das Test-Artefakt trägt die Leiste');
      assert.equal(_entwicklerleisteSchneiden(testArtefakt, 'vivodepot.html'), auslieferung,
        'jede Abweichung außerhalb der Leisten-Region ist ein Fund');
    } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  });
}

test('[E2E-Artefakt·Byte·Rot-Beweis] E2E-globalSetup und ladeKern backen dasselbe Test-Artefakt', () => {
  const { bakeProdukt } = require('./e2e/global-setup.js');
  const erwartet = testProduktText(KERN, { slug: 'privat-de' });
  assert.equal(bakeProdukt(KERN, 'privat-de'), erwartet, 'tests/e2e/global-setup.js');
  assert.equal(require('./load-kern.js').ladeKern().html, erwartet, 'tests/load-kern.js');
});

test('[E2E-Artefakt·Optionen·Rot-Beweis] jede Überschreibung, die modulDateienFuer kennt, reicht der Test-Back durch', () => {
  const vp = require('../tools/lib/vier-produkte.js');
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'tools', 'lib', 'vier-produkte.js'), 'utf8');
  const rumpf = quelle.slice(quelle.indexOf('function modulDateienFuer('), quelle.indexOf('\n}\n', quelle.indexOf('function modulDateienFuer(')));
  const schluessel = [...new Set([...rumpf.matchAll(/opts && opts\.(\w+)/g)].map((m) => m[1]))].sort();
  assert.ok(schluessel.length >= 4, 'Kontrolle: die Überschreibungen werden aus der Quelle gelesen (' + schluessel.join(', ') + ')');
  const echt = vp.modulDateienFuer;
  const gesehen = [];
  vp.modulDateienFuer = (p, opts) => { gesehen.push(opts || {}); return echt(p); };
  try {
    const opts = Object.fromEntries(schluessel.map((k) => [k, 'gesetzt-' + k]));
    require('./load-kern.js')._standardProduktBaken(KERN, opts);
  } finally { vp.modulDateienFuer = echt; }
  assert.equal(gesehen.length, 1);
  for (const k of schluessel) assert.equal(gesehen[0][k], 'gesetzt-' + k, 'tests/load-kern.js#_standardProduktBaken verschluckt ' + k);
});

test('[E2E-Artefakt·Träge·statisch] der Code der Leiste greift nur auf die eigenen Elemente zu', () => {
  const [anfang, ende] = ENTWICKLERLEISTE_MARKEN[0];
  const ziele = new Set();
  for (let i = KERN.indexOf(anfang); i >= 0; i = KERN.indexOf(anfang, i + 1)) {
    const region = KERN.slice(i, KERN.indexOf(ende, i));
    for (const m of region.matchAll(/(?:getElementById|querySelector(?:All)?)\(\s*'([^']+)'\s*\)/g)) ziele.add(m[1]);
  }
  assert.deepEqual([...ziele].sort(), ['.dev-leiste', 'tb-modus-select']);
});
