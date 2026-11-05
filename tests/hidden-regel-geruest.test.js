'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter gegen die Klasse HIDDEN-SCHLAEGT-DISPLAY (Befund MITTEL, 01.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Browser-Vorgabe [hidden] { display: none } ist schwächer als jede Autorenregel: eine Klasse mit display (.btn: inline-flex)
   machte ein Element mit hidden sichtbar. Seit diesem Wagen steht im Gerüst (<style id="schutz-stil">) EINE globale Regel
   [hidden] { display: none !important }. Sie hält nur, solange keine andere Regel display mit !important auf ein Element mit hidden
   legen kann. Darum zwei Prüfungen:
     1. die globale Regel steht im Schutz-Stil des Kerns;
     2. keine Regel in einem <style> des Kerns oder einem Erscheinungsbild (tools/erscheinung/**.css) setzt display außer none mit
        !important, ohne dass jeder Teil ihres Selektors :not([hidden]) trägt; ebenso kein Skript per setProperty('display', …,
        'important') außer none.
   Rot-Beweis: eingepflanzte Verstöße und ein Kern ohne die Regel werden erkannt. Die Probe im Browser über alle Elemente mit hidden
   (Privat und Pro): tests/e2e/hidden-und-wortblock.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(WURZEL, 'vivodepot.html'), 'utf8');
const REGEL = /\[hidden\]:not\(\[hidden="until-found"\]\)\s*\{\s*display:\s*none\s*!important;?\s*\}/;

function schutzStil(html) {
  const m = html.match(/<style id="schutz-stil">([\s\S]*?)<\/style>/);
  return m ? m[1] : '';
}

// Regeln mit display: <nicht none> !important, deren Selektor nicht in jedem Teil :not([hidden]) trägt.
function cssVerstoesse(css) {
  const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const funde = [];
  const regel = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = regel.exec(ohneKommentare))) {
    const selektor = m[1].trim();
    const decl = /display\s*:\s*([a-z-]+)\s*!important/gi;
    let d;
    while ((d = decl.exec(m[2]))) {
      if (d[1].toLowerCase() === 'none') continue;
      const teile = selektor.replace(/^@[^{]*$/, '').split(',').map((s) => s.trim()).filter(Boolean);
      if (teile.some((t) => !t.includes(':not([hidden])'))) funde.push(selektor + ' { display: ' + d[1] + ' !important }');
    }
  }
  return funde;
}

function skriptVerstoesse(js) {
  const funde = [];
  const re = /setProperty\(\s*['"]display['"]\s*,\s*['"]([a-z-]+)['"]\s*,\s*['"]important['"]/g;
  let m;
  while ((m = re.exec(js))) if (m[1] !== 'none') funde.push(m[0]);
  return funde;
}

function kernStile(html) {
  const out = [];
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out.join('\n');
}

function erscheinungsCss() {
  const out = [];
  const lauf = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) lauf(p);
      else if (e.name.endsWith('.css')) out.push([path.relative(WURZEL, p), fs.readFileSync(p, 'utf8')]);
    }
  };
  lauf(path.join(WURZEL, 'tools', 'erscheinung'));
  return out;
}

test('[HIDDEN-SCHLAEGT-DISPLAY] die globale Regel [hidden] { display: none !important } steht im Schutz-Stil des Kerns', () => {
  assert.match(schutzStil(KERN), REGEL);
});

test('[HIDDEN-SCHLAEGT-DISPLAY] keine display-!important-Regel ohne :not([hidden]) im Kern und in den Erscheinungsbildern', () => {
  const funde = cssVerstoesse(kernStile(KERN)).map((f) => 'vivodepot.html: ' + f);
  for (const [datei, css] of erscheinungsCss()) funde.push(...cssVerstoesse(css).map((f) => datei + ': ' + f));
  funde.push(...skriptVerstoesse(KERN).map((f) => 'vivodepot.html (Skript): ' + f));
  assert.deepStrictEqual(funde, []);
});

test('[HIDDEN-SCHLAEGT-DISPLAY·Rot-Beweis] eingepflanzte Verstöße und ein Kern ohne Regel werden erkannt', () => {
  assert.doesNotMatch(schutzStil(KERN.replace(REGEL, '')), REGEL);
  assert.deepStrictEqual(cssVerstoesse('.btn { display: inline-flex !important; }'), ['.btn { display: inline-flex !important }']);
  assert.strictEqual(cssVerstoesse('.a:not([hidden]), .b { display: flex !important; }').length, 1);
  assert.deepStrictEqual(cssVerstoesse('.a:not([hidden]) { display: flex !important; } .c { display: none !important; } .d { display: flex; }'), []);
  assert.strictEqual(skriptVerstoesse("el.style.setProperty('display', 'flex', 'important')").length, 1);
  assert.deepStrictEqual(skriptVerstoesse("el.style.setProperty('display', 'none', 'important')"), []);
});
