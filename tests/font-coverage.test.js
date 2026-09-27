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

function ladeBlobs() {
  const html = fs.readFileSync(KERN, 'utf8');
  const re = /url\("data:font\/woff2;base64,([A-Za-z0-9+/=]+)"\)/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

test('Coverage-Gate: genau 4 Font-Blobs + Fixture vorhanden', () => {
  const blobs = ladeBlobs();
  assert.equal(blobs.length, 4, '4 eingebettete WOFF2-Blobs');
  assert.ok(fs.existsSync(FIXTURE), 'Fixture tests/fixtures/inter-subset.json vorhanden');
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
