'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Umstellung auf die Gestaltungsdefinition (tools/gestaltung-umstellen.js).
   Rot-Beweis: die Fixture umstellen-roh.css zählt frei > 0; nach --exakt weniger, nach --angleichen --schreiben noch weniger.
   Die Grundlinie der freien Werte wird nie angehoben (Höchstwerte v1054 unten, nur sinkend).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const w = require('../tools/gestaltung-freie-werte.js');
const u = require('../tools/gestaltung-umstellen.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'gestaltung-umstellen.js');
const fdef = JSON.parse(fs.readFileSync(path.join(w.FIXTURES, 'definition-gut.json'), 'utf8'));
const tok = u.tokensLaden(fdef);
const roh = fs.readFileSync(path.join(w.FIXTURES, 'umstellen-roh.css'), 'utf8');
const profil = fs.readFileSync(path.join(w.FIXTURES, 'umstellen-profil.css'), 'utf8');
const summe = (c) => Object.values(w.messen(c, fdef).zahlen).reduce((a, b) => a + b, 0);

test('[Umstellen·a] Rot-Beweis: die rohe Fixture zählt frei, --exakt senkt, --angleichen --schreiben senkt weiter', () => {
  const vor = summe(roh);
  const ex = u.anwenden(roh, u.ersetzungen(roh, tok, 'exakt').treffer);
  const an = u.anwenden(roh, u.ersetzungen(roh, tok, 'angleichen').treffer);
  assert.ok(vor > 0);
  assert.ok(summe(ex) < vor, 'exakt muss die Zahl senken');
  assert.ok(summe(an) < summe(ex), 'angleichen muss weiter senken');
});

test('[Umstellen·b] --exakt ändert nur Gleiches: 8 px → --abstand-2, 16 px Radius → --radius-2, 48 px → --treffer; Off-Raster bleibt', () => {
  const ex = u.anwenden(roh, u.ersetzungen(roh, tok, 'exakt').treffer);
  assert.match(ex, /\.a \{ padding: var\(--abstand-2\) var\(--abstand-4\); \}/);
  assert.match(ex, /\.b \{ margin: 0 auto var\(--abstand-5\); \}/);
  assert.match(ex, /\.f \{ border-radius: var\(--radius-2\); \}/);
  assert.match(ex, /\.h \{ min-height: var\(--treffer\); \}/);
  assert.match(ex, /\.d \{ padding: 10px 14px; \}/);
  assert.match(ex, /\.i \{ min-height: 44px; \}/);
  assert.match(ex, /\.l \{ border-radius: 50%; \}/);
  assert.match(ex, /\.n \{ min-height: 24px; min-width: 32px; \}/);   // eine Höhe ist kein Abstand: bleibt Zahl (Review 13.11.)
});

test('[Umstellen·c] --angleichen setzt auf das nächste Token, bei Gleichstand das größere; Negatives und über 32 px bleiben', () => {
  const an = u.anwenden(roh, u.ersetzungen(roh, tok, 'angleichen').treffer);
  assert.match(an, /\.d \{ padding: var\(--abstand-3\) var\(--abstand-4\); \}/); // 10 → 12, 14 → 16 (Gleichstand 12/16 → 16)
  assert.match(an, /\.e \{ margin: var\(--abstand-2\) 0 -4px; \}/); // 6 → 8 (Gleichstand 4/8 → 8)
  assert.match(an, /\.i \{ min-height: var\(--treffer\); \}/);
  assert.match(an, /\.g \{ border-radius: var\(--radius-1\); \}/);
  assert.match(an, /\.k \{ padding: 404px; \}/);
});

test('[Umstellen·d] Profile: Modul-Profile bleiben Zahlen — kein Verweis auf Kern-Token (Regeln des Kerns: unbekannter-verweis)', () => {
  assert.deepEqual(u.profilErsetzungen(profil, tok, 'exakt'), []);
  assert.deepEqual(u.profilErsetzungen(profil, tok, 'angleichen'), []);
});

test('[Umstellen·e] CLI: --angleichen ohne --schreiben ändert die Datei nicht, --exakt schreibt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'umstellen-'));
  try {
    const f = path.join(dir, 'x.css'); fs.writeFileSync(f, roh);
    execFileSync('node', [WERKZEUG, '--angleichen', '--css', f, '--profil', ''], { encoding: 'utf8' });
    assert.equal(fs.readFileSync(f, 'utf8'), roh);
    execFileSync('node', [WERKZEUG, '--exakt', '--css', f, '--profil', ''], { encoding: 'utf8' });
    assert.notEqual(fs.readFileSync(f, 'utf8'), roh);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Umstellen·f] Selbstprobe ohne Argument ist grün', () => {
  assert.match(execFileSync('node', [WERKZEUG], { encoding: 'utf8' }), /Selbstprobe grün/);
});

test('[Umstellen·g] Grundlinie der freien Werte liegt nie über dem Höchststand v1054', () => {
  const hoechst = { padding: 48, margin: 31, gap: 17, radius: 12, trefferMin: 46, mediaFrei: 13 };
  const gl = JSON.parse(fs.readFileSync(w.GRUNDLINIE, 'utf8')).zahlen;
  for (const [a, h] of Object.entries(hoechst)) assert.ok(gl[a] <= h, `${a}: ${gl[a]} > ${h}`);
});
