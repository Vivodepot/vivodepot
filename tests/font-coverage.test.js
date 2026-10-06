'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — D2/D29: Inter-Subset Glyphen-Coverage-Gate (kein stiller Glyphen-Verlust)
   ────────────────────────────────────────────────────────────────────────
   Die 4 eingebetteten Inter-WOFF2 wurden auf die real genutzten Glyphen (+ Headroom-
   Ranges) eingedampft (tools/font-subset.py). Dieser stehende Test verhindert stillen
   Glyphen-Verlust:

   1) Byte-Pin: sha256 jedes eingebetteten Base64-Font-Blobs == Fixture-Wert. Eine
      unbemerkte Font-Änderung (Hand-Edit, falscher Re-Build) wird sofort rot. Die
      Fixture-cmap-Liste wurde beim Build aus der ECHTEN Schrift (fontTools) verifiziert.
   2) Pflicht-Glyphen: alle kritischen Zeichen (Deutsch, Typografie, UI-Symbole, €) sind
      in JEDEM der 4 Gewichte vorhanden (gegen die build-verifizierte cmap der gepinnten Bytes).
   3) Build-Konsistenz: die beim Build erfasste Demand∩Quelle (`must`) ⊆ cmap je Gewicht.

   Regeneration: `python3 tools/font-subset.py` schreibt Fonts UND Fixture gemeinsam neu;
   der Build bricht ab, falls ein Demand-Glyph verloren ginge (sys.exit 3).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const FIXTURE = path.join(__dirname, 'fixtures', 'inter-subset.json');
const WEIGHTS = ['400', '500', '600', '700'];

// Kritische Pflicht-Glyphen (anti-silent-loss): ASCII-Basis + Deutsch + Typografie + UI-Symbole + €.
const KRITISCH = ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  + ' .,:;!?()/-_%&@€'
  + 'ÄÖÜäöüß'
  + '„“”–—·…•'   // „ " " – — · … •
  + '§©×→←−≈≠≤≥⚠✓' // § © × → ← − ≈ ≠ ≤ ≥ ⚠ ✓
).split('').map((c) => c.codePointAt(0));

// Seit v896 stehen die Schriften nicht mehr im Gerüst, sondern als Dateien des Erscheinungsbilds (tools/erscheinung/schriften/);
// gepinnt wird weiter der base64-Text — derselbe, der bis v895 im Kern stand und jetzt ins Modul gebacken wird.
const SCHRIFT_ORDNER = path.join(__dirname, '..', 'tools', 'erscheinung', 'schriften');
function ladeBlobs() {
  return WEIGHTS.map((w) => fs.readFileSync(path.join(SCHRIFT_ORDNER, 'Inter-' + w + '.woff2')).toString('base64'));
}

test('Coverage-Gate: genau 4 Schriftdateien + Fixture vorhanden, Gerüst ohne eingebettete Schrift', () => {
  const blobs = ladeBlobs();
  assert.equal(blobs.length, 4, '4 eingebettete WOFF2-Blobs');
  assert.ok(fs.existsSync(FIXTURE), 'Fixture tests/fixtures/inter-subset.json vorhanden');
  assert.equal(/data:font\/woff2/.test(fs.readFileSync(KERN, 'utf8')), false, 'das Gerüst trägt keine Schrift (v896)');
});

test('Byte-Pin: jeder eingebettete Font-Blob == Fixture-sha256 (keine stille Font-Änderung)', () => {
  const blobs = ladeBlobs();
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  WEIGHTS.forEach((w, i) => {
    const sha = crypto.createHash('sha256').update(blobs[i], 'ascii').digest('hex');
    assert.equal(sha, fx.weights[w].sha256, `Gewicht ${w}: eingebetteter Font == build-verifizierter Font`);
  });
});

test('Pflicht-Glyphen: alle kritischen Zeichen in ALLEN 4 Gewichten (build-verifizierte cmap)', () => {
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const w of WEIGHTS) {
    const cmap = new Set(fx.weights[w].cmap);
    const fehlen = KRITISCH.filter((cp) => !cmap.has(cp)).map((cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
    assert.deepEqual(fehlen, [], `Gewicht ${w}: fehlende Pflicht-Glyphen`);
  }
});

test('Build-Konsistenz: erfasste Demand∩Quelle (must) ⊆ cmap je Gewicht', () => {
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const w of WEIGHTS) {
    const cmap = new Set(fx.weights[w].cmap);
    const fehlen = fx.weights[w].must.filter((cp) => !cmap.has(cp));
    assert.equal(fehlen.length, 0, `Gewicht ${w}: alle must-Codepoints in cmap`);
    assert.ok(fx.weights[w].must.length >= 100, `Gewicht ${w}: plausible Demand-Größe`);
  }
});

/* ── Bedarf gegen cmap, mit begründeten Ausnahmen (02.10.2026, ab v896 über die vier Produkte) ──────────────────────
   Die Fixture-`demand` ist der Stand vom Zuschnitt (09.06.2026). Hier wird der Bedarf JETZT gerechnet — über die vier
   gebackenen Produkte (tools/schrift-bedarf-messen.js), denn seit U2-ADR-426/473 steht der sichtbare Text in den
   Modulen, nicht mehr im Gerüst — und gegen die byte-gepinnte cmap gehalten. Jeder fehlende Codepunkt braucht einen
   Eintrag in tools/font-subset-ausnahmen.json (einzeln, oder als Bereich mit grund 'nur-export', der nur gilt, wenn
   keines seiner Zeichen außerhalb seiner Region vorkommt); ein Eintrag, der nicht mehr fehlt, ist ebenfalls rot.
   Dieselbe Regel hält `python3 tools/font-subset.py --check`. */
const AUSNAHMEN = path.join(__dirname, '..', 'tools', 'font-subset-ausnahmen.json');
const { bedarfMessen } = require('../tools/schrift-bedarf-messen.js');
const HEADROOM = [[0x0000, 0x024F], [0x20AC, 0x20AC], [0x2000, 0x206F], [0x2190, 0x21FF], [0x2200, 0x22FF],
  [0x25A0, 0x25FF], [0x2600, 0x26FF], [0x2713, 0x2713]];
const imHeadroom = (cp) => HEADROOM.some(([a, b]) => cp >= a && cp <= b);
const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
const cpAus = (s) => parseInt(String(s).slice(2), 16);

let _bedarf = null;
function bedarf(regionen) {
  if (!_bedarf) _bedarf = bedarfMessen({ ausserhalb: regionen });
  return _bedarf;
}
function abdeckungPruefen(gemessen, fx, roh) {
  const fehler = [];
  const aus = new Map();
  for (const e of roh.ausnahmen) {
    const cp = cpAus(e.cp);
    if (e.grund !== 'quelle' && e.grund !== 'nur-code') fehler.push(`${e.cp}: unbekannter grund`);
    else if (e.grund === 'quelle' && !imHeadroom(cp)) fehler.push(`${e.cp}: grund 'quelle', liegt aber nicht im Headroom`);
    if (!String(e.notiz || '').trim()) fehler.push(`${e.cp}: notiz fehlt`);
    aus.set(cp, e.grund);
  }
  const bereiche = (roh.bereiche || []).map((b) => ({ ...b, a: cpAus(b.von), z: cpAus(b.bis) }));
  for (const b of bereiche) if (b.grund !== 'nur-export' || !b.region || !String(b.notiz || '').trim()) fehler.push(`${b.von}–${b.bis}: Bereich braucht grund 'nur-export', region und notiz`);
  const imBereich = (cp) => bereiche.find((b) => cp >= b.a && cp <= b.z);
  const alleFehlend = new Set();
  for (const w of WEIGHTS) {
    const cmap = new Set(fx.weights[w].cmap);
    for (const cp of gemessen.alle) if (!cmap.has(cp)) {
      alleFehlend.add(cp);
      if (aus.has(cp)) continue;
      const b = imBereich(cp);
      if (!b) { fehler.push(`Gewicht ${w}: ${hex(cp)} fehlt ohne Grund`); continue; }
      const aussen = gemessen.ausserhalb[b.region];
      if (!aussen || aussen.has(cp)) fehler.push(`Gewicht ${w}: ${hex(cp)} kommt außerhalb der Region ${b.region} vor`);
    }
  }
  for (const cp of aus.keys()) if (!alleFehlend.has(cp)) fehler.push(`${hex(cp)}: steht in den Ausnahmen, fehlt aber nicht mehr`);
  for (const b of bereiche) if (![...alleFehlend].some((cp) => cp >= b.a && cp <= b.z && !aus.has(cp))) fehler.push(`${b.von}–${b.bis}: Bereich deckt nichts mehr`);
  return fehler;
}
const roh = () => JSON.parse(fs.readFileSync(AUSNAHMEN, 'utf8'));
const regionenAus = (r) => [...new Set((r.bereiche || []).map((b) => b.region))];

test('Abdeckung: jeder von den vier Produkten verwendete, in Inter fehlende Codepunkt hat einen Grund', () => {
  const r = roh();
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(abdeckungPruefen(bedarf(regionenAus(r)), fx, r), []);
});

test('Abdeckung, Rot-Beweise: fehlend ohne Grund · veraltete Ausnahme · falscher Grund „quelle“ · Bereich außerhalb der Region', () => {
  const r = roh();
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const g = bedarf(regionenAus(r));
  const plus = (cp, aussen) => ({ alle: new Set([...g.alle, cp]), ausserhalb: aussen ? Object.fromEntries(Object.entries(g.ausserhalb).map(([k, v]) => [k, new Set([...v, cp])])) : g.ausserhalb });
  const r1 = abdeckungPruefen(plus(0x4E2D), fx, r);
  assert.ok(r1.some((m) => m.includes('U+4E2D fehlt ohne Grund')), r1.join('\n'));
  const r2 = abdeckungPruefen(g, fx, { ...r, ausnahmen: r.ausnahmen.concat([{ cp: 'U+0041', grund: 'nur-code', notiz: 'x' }]) });
  assert.ok(r2.some((m) => m.includes('U+0041: steht in den Ausnahmen')), r2.join('\n'));
  const r3 = abdeckungPruefen(plus(0x4E2D), fx, { ...r, ausnahmen: r.ausnahmen.concat([{ cp: 'U+4E2D', grund: 'quelle', notiz: 'x' }]) });
  assert.ok(r3.some((m) => m.includes("U+4E2D: grund 'quelle'")), r3.join('\n'));
  // Ein kyrillisches Zeichen, das (gedacht) auch außerhalb der IPS-Region steht, deckt der Bereich nicht.
  const r4 = abdeckungPruefen(plus(0x0436, true), fx, r);
  assert.ok(r4.some((m) => m.includes('U+0436 kommt außerhalb der Region')), r4.join('\n'));
});

// Dass jede SICHTBARE Ausnahme auf einen Befund der (internen) Befund-Ratsche zeigt, hält eine eigene, interne Probe.
