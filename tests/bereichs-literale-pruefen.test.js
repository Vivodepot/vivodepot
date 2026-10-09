'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Bereichskennungen als Literal im Kern — Deckel, nur sinkend (tools/bereichs-literale-pruefen.js)
   ────────────────────────────────────────────────────────────────────────
   Grundsatz: im fertigen Gerüst ist nichts fest verdrahtet; Bereiche kommen aus dem Rezept bzw. den Templates.
   ROT-BEWEIS: ein zusätzliches Literal 'health' in einer neuen Funktion außerhalb einer Region macht den Wächter rot;
   dasselbe Literal in einer benannten Region nicht. Eine Ausnahme ohne Wort ist rot. Senken hebt nie an.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/bereichs-literale-pruefen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

test('[Bereichs-Literale] grün am Ist: jede Gruppe exakt auf ihrem Deckel, die Kennungen kommen aus den Templates', () => {
  const { ids, ist } = W.messungAlle();
  assert.ok(ids.includes('health') && ids.includes('identity'), 'die nativen Kennungen kommen aus den Templates');
  assert.ok(ids.some((i) => i.startsWith('pro-')), 'auch die Pro-Bereiche zählen');
  assert.deepEqual(W.pruefen(ist, W.grundlinieLesen()), []);
});

test('[Bereichs-Literale·Rot-Beweis] ein neues Literal außerhalb einer Region ist rot, in einer Region nicht', () => {
  const ids = W.bereichsKennungen();
  const grundlinie = W.grundlinieLesen();
  const ist = W.messungAlle().ist;
  const neu = { ...ist, kern: W.messen(KERN + '\nfunction neueFesteStelle() { return \'health\'; }\n', ids) };
  assert.match(W.pruefen(neu, grundlinie).join('\n'), /neue Gruppe „neueFesteStelle“ mit 1 Bereichskennung/);
  const inRegion = W.messen(KERN + '\n// PROBE_REGION:BEGIN\nconst x = \'health\';\n// PROBE_REGION:END\n', ids);
  assert.deepEqual(inRegion, ist.kern, 'eine benannte Region zählt nicht');
  const kommentar = W.messen(KERN + '\n// \'health\' nur im Kommentar\n', ids);
  assert.deepEqual(kommentar, ist.kern, 'eine Kommentarzeile zählt nicht');
});

test('[Bereichs-Literale] jede Ausnahme trägt Grund und Wort; ohne Wort ist sie rot', () => {
  const g = W.grundlinieLesen();
  for (const [n, a] of Object.entries(g.ausnahmen)) assert.ok(a.grund && a.wort, n);
  const ohneWort = { ...g, ausnahmen: { ...g.ausnahmen, B16_FELD_MAPPING: { grund: 'x' } } };
  assert.match(W.pruefen(W.messungAlle().ist, ohneWort).join('\n'), /Ausnahme B16_FELD_MAPPING ohne Grund oder ohne Wort/);
});

test('[Bereichs-Literale] die Grundlinie sinkt nur: ein Zuwachs wird nie geschrieben, ein Rückgang schon', () => {
  const g = W.grundlinieLesen();
  const ist = W.messungAlle().ist;
  const gruppe = Object.keys(g.deckel.kern)[0];
  const mehr = { ...ist, kern: { ...ist.kern, [gruppe]: ist.kern[gruppe] + 1 } };
  assert.equal(W.grundlinieSenken(mehr, g).verweigert.length, 1);
  const weniger = { ...ist, kern: { ...ist.kern, [gruppe]: ist.kern[gruppe] - 1 } };
  const r = W.grundlinieSenken(weniger, g);
  assert.deepEqual(r.verweigert, []);
  assert.equal(r.neu.summe.kern, g.summe.kern - 1);
  assert.match(W.pruefen(weniger, g).join('\n'), /Deckel zu hoch/);
});

test('[Bereichs-Literale·Ausnahme·Rot-Beweis] auch eine Ausnahme nimmt nichts Neues auf: Migrationsliste und Krypto-Liste haben je einen exakten Deckel', () => {
  const g = W.grundlinieLesen();
  const ist = W.messungAlle().ist;
  assert.equal(g.ausnahmen.UMSCHLAG_FELDER_BEKANNT.deckel, 0, 'eine Krypto-Liste steht auf 0');
  const k = ist.kern;
  const migration = { ...ist, kern: { ...k, B16_FELD_MAPPING: k.B16_FELD_MAPPING + 1 } };
  assert.match(W.pruefen(migration, g).join('\n'), /Ausnahme „B16_FELD_MAPPING“ wächst von/);
  const krypto = { ...ist, kern: { ...k, KRYPTO_VERSION_ALLOWLIST: 1 } };
  assert.match(W.pruefen(krypto, g).join('\n'), /Ausnahme „KRYPTO_VERSION_ALLOWLIST“ wächst von 0 auf 1/);
  assert.equal(W.grundlinieSenken(migration, g).verweigert.length, 1, 'Senken schreibt keinen Zuwachs einer Ausnahme');
});
