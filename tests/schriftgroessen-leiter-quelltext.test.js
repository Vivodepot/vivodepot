'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter: keine freie Schriftgröße im Quelltext der Anwendung (11.11.2026, Maßnahme 2 der Auswertung der Design-Nacht)
   Jede Deklaration `font-size` in vivodepot.html, vivodepot-lesen.html, vivodepot-studio.html, vivodepot-vc-issuer.html und
   in den Stilquellen des Kerns zeigt auf eine Stufe der Größenleiter (tools/groessenleiter.json): `var(--fs-role-<stufe>)`,
   `max(16px, var(--fs-role-<stufe>)` oder `inherit`/`1em`/`100%`. Ein fester Wert (px, rem, em), ein Token außerhalb der
   Leiter oder ein zusammengesetzter Wert ist ein Fund.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const lib = require('../tools/lib/schriftgroessen-leiter.js');

test('[Größenleiter·Quelltext] keine freie font-size in der Anwendung und ihren Stilquellen', () => {
  const leiter = lib.leiterLaden();
  const funde = [];
  for (const d of lib.anwendungPruefen(leiter)) for (const v of d.verstoesse) funde.push(`${d.datei}:${v.zeile} ${v.wert} (${v.grund})`);
  assert.deepEqual(funde, [], 'freie Schriftgrößen:\n' + funde.slice(0, 20).join('\n'));
});

test('[Größenleiter·Quelltext] Rot-Beweis: eine freie font-size wird gefunden, eine Leiter-Stufe nicht', () => {
  const leiter = lib.leiterLaden();
  const frei = lib.dateiPruefen('.a { font-size: 13px; } .b { font-size: 0.9rem; } .c { font-size: var(--fs-sm); }', leiter);
  assert.equal(frei.verstoesse.length, 3);
  const gut = lib.dateiPruefen('.a { font-size: var(--fs-role-text); } .b { font-size: max(16px, var(--fs-role-wert)); } .c { font-size: inherit; }', leiter);
  assert.equal(gut.verstoesse.length, 0);
  const inline = lib.dateiPruefen('<span style="font-size:11px">x</span><script>el.style.fontSize = "12px";</script>', leiter);
  assert.equal(inline.verstoesse.length, 2);
});

test('[Größenleiter·Quelltext] jede Stufe der Leiter ist in jeder Seite als Token definiert', () => {
  const fs = require('node:fs'); const path = require('node:path');
  const leiter = lib.leiterLaden();
  const quellen = ['tools/erscheinung/stil/grundlage.css', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html'];
  for (const q of quellen) {
    const t = fs.readFileSync(path.join(__dirname, '..', q), 'utf8');
    for (const s of leiter.stufen) assert.ok(new RegExp(s.token + '\\s*:').test(t), `${q}: ${s.token} nicht definiert`);
  }
});
