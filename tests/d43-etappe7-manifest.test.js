'use strict';
/* ════════════════════════════════════════════════════════════════════════
   D43 / U2-ADR-015 — Etappe 7: Manifest finalisieren (defensiv, beide Wege offen)
   ────────────────────────────────────────────────────────────────────────
   Die Entscheidung Inline-Data-URL vs. eigenständige manifest.webmanifest hängt
   am Etappe-1-iPhone-Praxistest („Zum Home-Bildschirm" → Icon UND Name korrekt?)
   → WARTET AUF DIE PRODUKTENTSCHEIDUNG. Bis dahin defensiv: BEIDE Wege bleiben möglich.
   (a) Der Kern trägt WEITER das Inline-Data-URL-Manifest (Single-File-Linie unverändert).
   (b) Eine eigenständige manifest.webmanifest ist VERBATIM vorbereitet (gleiche Werte,
       inkl. Markenfarben) — bereit, falls der iPhone-Test sie verlangt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
function inlineManifest() {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const m = html.match(/rel="manifest" href="data:application\/manifest\+json;base64,([A-Za-z0-9+/=]+)"/);
  if (!m) return null;
  return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
}

test('[D43-E7] Kern behält das Inline-Manifest (Single-File-Linie unverändert)', () => {
  const inl = inlineManifest();
  assert.ok(inl, 'Inline-Data-URL-Manifest weiter vorhanden');
  assert.equal(inl.name, 'Vivodepot');
  assert.equal(inl.display, 'standalone');
});

test('[D43-E7] Eigenständige manifest.webmanifest ist vorbereitet + gültig', () => {
  const p = path.join(REPO, 'manifest.webmanifest');
  assert.ok(fs.existsSync(p), 'manifest.webmanifest existiert (bereit für die separate Variante)');
  const man = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(man.name, 'Vivodepot');
  assert.equal(man.short_name, 'Vivodepot');
  assert.equal(man.display, 'standalone');
  const groessen = (man.icons || []).map((i) => i.sizes).sort();
  assert.deepEqual(groessen, ['192x192', '512x512'], 'Icons 192 + 512 vorhanden');
});

test('[D43-E7] separate Manifest ist VERBATIM zum Inline (gleiche Werte, inkl. Markenfarben)', () => {
  const inl = inlineManifest();
  const man = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.webmanifest'), 'utf8'));
  // Markenfarben dürfen NIE driften (CLAUDE.md) — separate Datei trägt dieselben Werte.
  assert.equal(man.theme_color, inl.theme_color, 'theme_color identisch (Markenfarbe)');
  assert.equal(man.background_color, inl.background_color, 'background_color identisch');
  assert.equal(man.start_url, inl.start_url, 'start_url identisch');
  assert.equal(JSON.stringify(man.icons), JSON.stringify(inl.icons), 'Icons byte-gleich (data:-URLs)');
});
