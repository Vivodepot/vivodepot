'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kein Suchergebnis ohne Prüfung auf −1 in den E2E-Proben — Wächter tools/e2e-fundstelle-ungeprueft-pruefen.js
   ────────────────────────────────────────────────────────────────────────
   Anlass (05.10.2026): `html.slice(html.indexOf('Verwaltete Depots'), …)` in seitenleiste-struktur-abnahme
   schnitt nach der Umbenennung einen leeren Text, und die Probe bestand immer. Der Bestand in tests/e2e und
   tests/e2e-cross ist beim Bau auf null gebracht; es gibt weder Grundlinie noch Ausnahmeliste.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const W = require('../tools/e2e-fundstelle-ungeprueft-pruefen.js');

test('[E2E-Fundstelle] keine ungeprüfte Fundstelle in tests/e2e und tests/e2e-cross', () => {
  assert.deepEqual(W.messen(W.standardDateien()), []);
});

test('[E2E-Fundstelle] die Standardmenge ist nicht leer (beide Ordner, Helfer eingeschlossen)', () => {
  const namen = W.standardDateien().map((d) => path.relative(W.REPO, d));
  for (const n of ['tests/e2e/seitenleiste-struktur-abnahme.spec.js', 'tests/e2e/helpers.js', 'tests/e2e-cross/support/helpers.js']) assert.ok(namen.includes(n), n);
});

test('[E2E-Fundstelle·Rot-Beweis] der Anlass selbst: ein indexOf im slice ohne Prüfung ist ein Fund', () => {
  const anlass = "const zwischenteil = sidebarHtml.slice(sidebarHtml.indexOf('Verwaltete Depots'), verlassenPos);";
  assert.equal(W.funde(anlass).length, 1);
});

test('[E2E-Fundstelle·Rot-Beweis] erkannt wird, was ungeprüft ist — und nur das', () => {
  const n = (t) => W.funde(t).length;
  assert.equal(n("const i = s.indexOf('x');\nfoo(s.slice(i));"), 1, 'zugewiesen, nie verglichen');
  assert.equal(n("window.x = d.schritte.findIndex((s) => s.id === 'a');"), 1, 'in eine Eigenschaft geschrieben');
  assert.equal(n("return liste.findIndex((r) => r.a === 1);"), 1, 'zurückgegeben');
  assert.equal(n("const i = s.indexOf('x');\n\n\n\n\n\n\nif (i < 0) throw new Error();"), 1, 'Prüfung zu weit weg');
  assert.equal(n("const i = s.indexOf('x');\nif (j > i) {}"), 1, 'nur rechts im Vergleich');
  assert.equal(n("const i = s.indexOf('x');\nif (i < 0) throw new Error('fehlt');"), 0, 'zugewiesen und geprüft');
  assert.equal(n("const i = s.indexOf('x') + 1;\nif (i <= 0) return;"), 0, 'mit Versatz zugewiesen und geprüft');
  assert.equal(n("const i = a ? a.findIndex((f) => f.id === 'v') : -1;\nif (i < 0) throw 1;"), 0, 'Ternär-Zweig');
  assert.equal(n("const i = s.indexOf('x');\nexpect(i, 'da').toBeGreaterThanOrEqual(0);"), 0, 'per expect geprüft');
  assert.equal(n("if (x.indexOf(y) >= 0) f();"), 0, 'direkt verglichen');
  assert.equal(n("if (s.anker.indexOf('feld:') !== 0) f();"), 0, 'direkt gegen 0 verglichen');
});

test('[E2E-Fundstelle·Rot-Beweis] Kommentare, Zeichenketten und Regex-Literale zählen nicht', () => {
  const n = (t) => W.funde(t).length;
  assert.equal(n("// html.slice(html.indexOf('a'))\n/* s.findIndex(f) */"), 0, 'Kommentare');
  assert.equal(n("const t = 'html.indexOf(\"a\")';"), 0, 'Zeichenkette');
  assert.equal(n("expect(t).toMatch(/\\.indexOf\\('/);"), 0, 'Regex-Literal mit Anführungszeichen');
  assert.equal(n("const i = s.indexOf('async function f(');\nif (i < 0) throw 1;"), 0, 'Klammer in der Zeichenkette verwirrt die Klammerzählung nicht');
  assert.equal(n("const u = 'http://x'; s.slice(s.indexOf(u));"), 1, 'ein // in einer Zeichenkette ist kein Kommentar');
});
