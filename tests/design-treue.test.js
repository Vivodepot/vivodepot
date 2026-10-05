'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Token-Vollständigkeit des Kerns — U2-ADR-473, Wagen v894.
   ────────────────────────────────────────────────────────────────────────────
   Ein Erscheinungsbild-Profil (Branding-Modul v2) setzt Tokens. Jeder Rohwert in
   einer Regel ist für jedes Profil unerreichbar — ein Profil „Leinen" ohne
   Versalien bliebe in Versalien, solange `text-transform: uppercase` roh dasteht.
   Die Ratsche hält jede Familie auf ihrem Stand; sie kann nur fallen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { messen, vergleichen, FAMILIEN, AUSNAHMEN, GRUNDLINIE, KERN } = require('../tools/design-treue.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'design-treue.js');
const FIX = path.join(__dirname, 'fixtures', 'design-treue');

function gate(dokument, grundlinie) {
  try {
    const aus = execFileSync(process.execPath, [WERKZEUG, '--dokument', dokument, '--grundlinie', grundlinie, '--gate'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, aus };
  } catch (e) { return { code: e.status, aus: String(e.stdout || '') + String(e.stderr || '') }; }
}

test('[Design-Treue] keine Familie im Kern liegt über der Grundlinie', () => {
  const basis = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  const { gestiegen, gefallen } = vergleichen(messen(KERN), basis);
  assert.deepEqual(gestiegen, [], 'ein gestaltender Wert gehört als Token in :root, nicht als Rohwert in eine Regel');
  assert.deepEqual(gefallen, [], 'neuer Tiefstand — mit `node tools/design-treue.js --grundlinie-schreiben` festschreiben');
  assert.ok(basis.gegenstand.length > 60, 'die Grundlinie nennt, was sie zählt');
});

test('[Design-Treue] die Grundlinie führt jede Familie an jedem Ort', () => {
  const basis = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  for (const [ort, fams] of Object.entries(FAMILIEN)) {
    for (const f of fams) assert.equal(typeof basis.zahlen[ort][f], 'number', `${ort}.${f} fehlt in der Grundlinie`);
  }
});

test('[Design-Treue·Negativkontrolle] die saubere Fixture zählt null Rohwerte', () => {
  // Kommentare, Token-Definitionen, @font-face, Inline-SVG, die benannten Ausnahmen
  // (Bedienhilfe A+, Auffangposten des Eingangs), Layout-Zuweisungen an .style und
  // setProperty('--…') sind keine Funde.
  const s = messen(path.join(FIX, 'sauber.html'));
  for (const [ort, fams] of Object.entries(FAMILIEN)) {
    for (const f of fams) {
      if (f === 'styleAttr') continue;
      assert.equal(s[ort][f], 0, `${ort}.${f} in der sauberen Fixture`);
    }
  }
  assert.equal(s.html.styleAttr, 1, 'genau das eine style= außerhalb von SVG und Auffangposten');
  assert.equal(s.js.styleAttr, 1);
});

test('[Design-Treue] jede Familie wird in der Roh-Fixture erkannt', () => {
  const r = messen(path.join(FIX, 'roh.html'));
  assert.deepEqual(r.css, { hex: 1, rgba: 2, farbname: 1, fontSize: 1, fontSizeXs: 1, radiusPx: 1, shadowRoh: 1,
    randLinksDick: 1, uppercase: 1, letterSpacing: 1, fontWeight: 1 });
  assert.equal(r.html.hex, 1);
  assert.equal(r.html.fontWeight, 1);
  assert.equal(r.js.fontSize, 1);
  assert.equal(r.js.randLinksDick, 1);
  assert.equal(r.js.styleZuweisung, 1);
});

test('[Design-Treue·Rot] ein gepflanzter Rohwert `color: #123456` lässt das Gate fallen', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'design-treue-'));
  try {
    const gl = path.join(tmp, 'grundlinie.json');
    execFileSync(process.execPath, [WERKZEUG, '--dokument', path.join(FIX, 'sauber.html'), '--grundlinie', gl, '--grundlinie-schreiben'],
      { stdio: 'ignore' });
    assert.equal(gate(path.join(FIX, 'sauber.html'), gl).code, 0, 'gegen die eigene Grundlinie grün');
    const kopie = path.join(tmp, 'gepflanzt.html');
    fs.writeFileSync(kopie, fs.readFileSync(path.join(FIX, 'sauber.html'), 'utf8')
      .replace('.knopf:hover {', '.gepflanzt { color: #123456; }\n  .knopf:hover {'));
    const g = gate(kopie, gl);
    assert.equal(g.code, 1, 'das Gate muss anschlagen:\n' + g.aus);
    assert.match(g.aus, /css\.hex: 1/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Design-Treue] der Kern ist frei von gestaltenden Rohwerten in CSS und JS-style=', () => {
  // Die Zusicherung aus U2-ADR-473, nicht nur die Ratsche: alle Familien außer der
  // G7-Marke --fs-xs (eine Stufe, kein Rohwert) und der Zahl der style= stehen auf 0.
  const s = messen(KERN);
  for (const ort of ['css', 'html', 'js']) {
    for (const f of FAMILIEN[ort]) {
      if (f === 'fontSizeXs' || f === 'styleAttr') continue;
      assert.equal(s[ort][f], 0, `${ort}.${f}: ein Rohwert ist für jedes Profil unerreichbar`);
    }
  }
});

test('[Design-Treue] jede Ausnahme nennt ihren Grund', () => {
  // Eine neue Ausnahme fasst diese Probe mit an: still eingetragen ist sie eine Auslassung.
  assert.equal(AUSNAHMEN.length, 3);
  for (const a of AUSNAHMEN) {
    assert.ok(['css', 'html', 'js'].includes(a.ort));
    assert.ok(a.muster instanceof RegExp);
    assert.ok(a.grund && a.grund.length > 60, 'Grund fehlt');
  }
});
