'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wiederherstellungs-Code: wie ein abgeschriebener Code gelesen wird, steht an EINER Stelle (whcCodeNormalisieren)
   ────────────────────────────────────────────────────────────────────────
   Vorher stand dieselbe Regel dreimal (whcCodeLesen, whcProbeStelle, whcKontrolleHinweis). Jetzt: Groß/klein egal; Leerraum,
   Bindestrich, Unterstrich, Punkt, Komma, Semikolon und Schrägstrich fallen weg (dieselben Trenner wie bei den sechs Wörtern);
   O zählt als 0, I und L als 1 (Crockford). Der Wächter verlangt, dass jede Lesestelle die eine Funktion ruft und die
   Crockford-Ersetzung nirgends sonst im Kern steht. Rot-Beweis am Ende.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const LESESTELLEN = ['whcCodeLesen', 'whcProbeStelle', 'whcKontrolleHinweis'];

test('[Code·Lesen] Trenner der Wörter, Schreibung und Crockford-Ersatz zählen nicht', () => {
  const { V } = ladeKern();
  assert.equal(typeof V.whcCodeNormalisieren, 'function');
  const code = V.whcCodeErzeugen();
  const gruppen = V.whcCodeGruppiert(code).split('-');
  const stellen = code.slice(0, 27);
  for (const trenner of [' ', '-', '_', '.', ',', ';', '/', '\n', ' - ']) {
    const eingabe = gruppen.join(trenner);
    assert.equal(V.whcCodeLesen(eingabe), stellen, JSON.stringify(trenner));
    assert.equal(V.whcCodeLesen(eingabe.toLowerCase()), stellen, 'klein ' + JSON.stringify(trenner));
    assert.equal(V.whcProbeStelle(eingabe, code), -1, 'Probe ' + JSON.stringify(trenner));
  }
  assert.equal(V.whcCodeNormalisieren('ab-cd_ef.gh,ij;kl/mo o'), 'ABCDEFGH1JK1M00');
  assert.equal(V.whcCodeNormalisieren(null), '');
  // Ein abgeschriebener Fehler bleibt ein Fehler: ein falsches Zeichen fällt durch das Prüfzeichen.
  const falsch = (code[0] === 'A' ? 'B' : 'A') + code.slice(1);
  assert.equal(V.whcCodeLesen(falsch), null);
});

function koerper(text, name) {
  const i = text.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name + ' fehlt');
  return text.slice(i, text.indexOf('\n}\n', i) + 2);
}

function waechterFunde(text) {
  const funde = [];
  for (const f of LESESTELLEN) if (!/whcCodeNormalisieren\(/.test(koerper(text, f))) funde.push(f + ': liest den Code nicht über whcCodeNormalisieren');
  const eigen = koerper(text, 'whcCodeNormalisieren');
  const ohne = text.replace(eigen, '');
  for (const m of ohne.matchAll(/\.replace\(\/O\/g,\s*'0'\)|\.replace\(\/\[IL\]\/g,\s*'1'\)/g)) {
    funde.push('Crockford-Ersatz außerhalb von whcCodeNormalisieren bei Zeichen ' + m.index);
  }
  return funde;
}

test('[Code·Wächter] jede Lesestelle ruft whcCodeNormalisieren; die Ersetzung steht nur dort', () => {
  assert.deepEqual(waechterFunde(KERN), []);
});

test('[Code·Wächter·Rot-Beweis] eine Lesestelle mit eigener Regel fällt', () => {
  const alt = KERN.replace(/function whcProbeStelle\(eingabe, code\) \{\n  const s = whcCodeNormalisieren\(eingabe\);/,
    "function whcProbeStelle(eingabe, code) {\n  const s = String(eingabe || '').toUpperCase().replace(/[\\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');");
  assert.notEqual(alt, KERN);
  const funde = waechterFunde(alt);
  assert.ok(funde.some((f) => /^whcProbeStelle:/.test(f)), funde.join('\n'));
  assert.ok(funde.some((f) => /Crockford-Ersatz außerhalb/.test(f)), funde.join('\n'));
});
