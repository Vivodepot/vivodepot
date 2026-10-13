'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Hash-Kennung der Fingerabdruck-Mengen (U2-ADR-486 Punkt 7, 08.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   REZEPT_FINGERABDRUECKE und ABWERK_FRUEHERE_FASSUNGEN tragen in Kern und Lese-App jeden Eintrag als `sha256:<hex>`, damit ein
   späteres zweites Verfahren unterscheidbar bleibt. Gelesen wird nur über `_fingerabdruckBekannt`: es nimmt beide Formen, eine
   andere Kennung ist nie ein Treffer. Diese Probe hält die Form, die Lesefunktion und die Klasse fest (kein direktes `.has` mehr).
   Die Rücknahme-Liste ABWERK_SCHUTZ_ZURUECKGEZOGEN (Wort der Gegenlesung 09.10.2026) trägt ihre Schlüssel ebenso und wird nur über
   `_fingerabdruckZurueckgezogen` gelesen: ein Rohstring-Vergleich gegen die Kennung ließe einen zurückgezogenen Eintrag still gelten.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const TRAEGER = [
  ['vivodepot.html', ['REZEPT_FINGERABDRUECKE_KERN', 'ABWERK_FRUEHERE_FASSUNGEN_KERN']],
  ['vivodepot-lesen.html', ['REZEPT_FINGERABDRUECKE_LESEN', 'ABWERK_FRUEHERE_FASSUNGEN_LESEN']],
];
const lesen = (d) => fs.readFileSync(path.join(REPO, d), 'utf8');
function eintraege(text, name) {
  const i = text.indexOf('const ' + name + ' = new Set([');
  assert.ok(i >= 0, 'Vorbedingung: ' + name + ' steht in der Datei');
  return [...text.slice(i, text.indexOf(']);', i)).matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}
function bekanntAus(text) {
  const m = /^function _fingerabdruckBekannt\(menge, hex\) \{\n[\s\S]*?\n\}$/m.exec(text);
  assert.ok(m, 'Vorbedingung: _fingerabdruckBekannt steht in der Datei');
  const k = /^const FINGERABDRUCK_KENNUNG = '([^']*)';$/m.exec(text);
  assert.ok(k, 'Vorbedingung: FINGERABDRUCK_KENNUNG steht in der Datei');
  const h = /^function _fingerabdruckHexGueltig\(hex\) \{\n[\s\S]*?\n\}$/m.exec(text);
  assert.ok(h, 'Vorbedingung: _fingerabdruckHexGueltig steht in der Datei');
  return new Function('const FINGERABDRUCK_KENNUNG = ' + JSON.stringify(k[1]) + ';\n' + h[0] + '\n' + m[0] + '\nreturn _fingerabdruckBekannt;')();
}
function haeltDieRegel(bekannt) {
  const hex = 'a'.repeat(64);
  return bekannt(new Set(['sha256:' + hex]), hex) === true
    && bekannt(new Set([hex]), hex) === true
    && bekannt(new Set(['sha384:' + hex]), hex) === false
    && bekannt(new Set(['sha256:' + hex]), 'sha256:' + hex) === false
    && bekannt(new Set(['sha256:' + hex]), undefined) === false
    && bekannt(new Set(['sha256:' + hex + 'x', 'x' + hex]), hex) === false
    && bekannt(new Set(['sha256:' + hex.toUpperCase(), hex.toUpperCase()]), hex.toUpperCase()) === false
    && bekannt(new Set(['sha256:' + hex.slice(1)]), hex.slice(1)) === false;
}

test('[Hash-Kennung] jeder Eintrag der vier Mengen ist sha256: plus 64 Hex', () => {
  for (const [datei, namen] of TRAEGER) {
    const t = lesen(datei);
    for (const n of namen) {
      const e = eintraege(t, n);
      assert.ok(e.length > 0, n + ' nicht leer');
      assert.deepEqual(e.filter((x) => !/^sha256:[0-9a-f]{64}$/.test(x)), [], datei + ' ' + n);
    }
  }
});

test('[Hash-Kennung] _fingerabdruckBekannt nimmt beide Formen, eine andere Kennung ist kein Treffer (Kern und Lese-App)', () => {
  for (const [datei] of TRAEGER) assert.equal(haeltDieRegel(bekanntAus(lesen(datei))), true, datei);
});

test('[Hash-Kennung·Rot-Beweis] eine Lesefunktion, die über das Ende vergleicht oder das Format nicht verankert, fällt auf', () => {
  const ueberDasEnde = (menge, hex) => typeof hex === 'string' && [...menge].some((e) => e.endsWith(hex));
  assert.equal(haeltDieRegel(ueberDasEnde), false);
  const unverankert = (menge, hex) => typeof hex === 'string' && (menge.has('sha256:' + hex) || menge.has(hex));
  assert.equal(haeltDieRegel(unverankert), false, 'ohne ^[0-9a-f]{64}$ ginge ein Großbuchstaben- oder Kurzwert durch');
});

const DIREKT = /\b(REZEPT_FINGERABDRUECKE|ABWERK_FRUEHERE_FASSUNGEN)_(KERN|LESEN)\.has\(/;
test('[Hash-Kennung·Klasse] keine Stelle liest die Mengen an der Lesefunktion vorbei', () => {
  for (const [datei] of TRAEGER) assert.deepEqual(lesen(datei).split('\n').filter((z) => DIREKT.test(z)), [], datei);
});
test('[Hash-Kennung·Klasse·Rot-Beweis] ein direktes .has wird gefunden', () => {
  assert.equal('x\n  if (ABWERK_FRUEHERE_FASSUNGEN_KERN.has(fp)) y();\n'.split('\n').filter((z) => DIREKT.test(z)).length, 1);
});

/* ── Rücknahme-Liste (Wort der Gegenlesung 09.10.2026: „alle mit sha256:“, kein fail-open) ─────────────────────────────────── */
const RUECKNAHME = [['vivodepot.html', 'ABWERK_SCHUTZ_ZURUECKGEZOGEN_KERN'], ['vivodepot-lesen.html', 'ABWERK_SCHUTZ_ZURUECKGEZOGEN_LESEN']];
function rueckSchluessel(text, name) {
  const i = text.indexOf('const ' + name + ' = new Map([');
  assert.ok(i >= 0, 'Vorbedingung: ' + name + ' steht in der Datei');
  return [...text.slice(i, text.indexOf(']);\n', i)).matchAll(/^  \["([^"]*)",/gm)].map((m) => m[1]);
}
function zurueckAus(text) {
  const m = /^function _fingerabdruckZurueckgezogen\(tabelle, hex\) \{\n[\s\S]*?\n\}$/m.exec(text);
  assert.ok(m, 'Vorbedingung: _fingerabdruckZurueckgezogen steht in der Datei');
  const k = /^const FINGERABDRUCK_KENNUNG = '([^']*)';$/m.exec(text);
  assert.ok(k, 'Vorbedingung: FINGERABDRUCK_KENNUNG steht in der Datei');
  const h = /^function _fingerabdruckHexGueltig\(hex\) \{\n[\s\S]*?\n\}$/m.exec(text);
  assert.ok(h, 'Vorbedingung: _fingerabdruckHexGueltig steht in der Datei');
  return new Function('const FINGERABDRUCK_KENNUNG = ' + JSON.stringify(k[1]) + ';\n' + h[0] + '\n' + m[0] + '\nreturn _fingerabdruckZurueckgezogen;')();
}
function rueckRegel(zurueck) {
  const hex = 'b'.repeat(64);
  const k = ['strings:x.text'];
  const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return gleich(zurueck(new Map([['sha256:' + hex, k]]), hex), k)
    && gleich(zurueck(new Map([[hex, k]]), hex), k)
    && gleich(zurueck(new Map([['sha384:' + hex, k]]), hex), [])
    && gleich(zurueck(new Map([['sha256:' + hex, k]]), hex.toUpperCase()), [])
    && gleich(zurueck(new Map([['sha256:' + hex, k]]), undefined), []);
}

test('[Hash-Kennung·Rücknahme] jeder Schlüssel der Rücknahme-Liste ist sha256: plus 64 Hex (Kern und Lese-App)', () => {
  for (const [datei, name] of RUECKNAHME) {
    const s = rueckSchluessel(lesen(datei), name);
    assert.ok(s.length > 0, name + ' nicht leer');
    assert.deepEqual(s.filter((x) => !/^sha256:[0-9a-f]{64}$/.test(x)), [], datei + ' ' + name);
  }
});

test('[Hash-Kennung·Rücknahme] _fingerabdruckZurueckgezogen trifft beide Formen, eine andere Kennung nie (Kern und Lese-App)', () => {
  for (const [datei] of RUECKNAHME) assert.equal(rueckRegel(zurueckAus(lesen(datei))), true, datei);
});

test('[Hash-Kennung·Rücknahme·Rot-Beweis] ein zurückgezogener Fingerabdruck, der als sha256: steht, wird trotzdem verworfen; ein Rohstring-Leser fällt auf', () => {
  const hex = 'c'.repeat(64);
  for (const [datei] of RUECKNAHME) {
    assert.deepEqual(zurueckAus(lesen(datei))(new Map([['sha256:' + hex, ['strings:haftungC.text']]]), hex), ['strings:haftungC.text'], datei);
  }
  const roh = (tabelle, h) => tabelle.get(h) || [];
  assert.equal(rueckRegel(roh), false, 'ein Leser, der nur den Rohstring sucht, ließe den zurückgezogenen Eintrag still gelten (fail-open)');
});

const DIREKT_RUECK = /\bABWERK_SCHUTZ_ZURUECKGEZOGEN_(KERN|LESEN)\.get\(/;
test('[Hash-Kennung·Rücknahme·Klasse] keine Stelle liest die Rücknahme-Liste an der Lesefunktion vorbei', () => {
  for (const [datei] of RUECKNAHME) assert.deepEqual(lesen(datei).split('\n').filter((z) => DIREKT_RUECK.test(z)), [], datei);
  assert.equal('  x(ABWERK_SCHUTZ_ZURUECKGEZOGEN_LESEN.get(fp) || []);'.split('\n').filter((z) => DIREKT_RUECK.test(z)).length, 1, 'Rot-Beweis');
});
