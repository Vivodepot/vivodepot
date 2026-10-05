'use strict';
/* Der Fassungswächter der KBV-Patientenkurzakte (U2-ADR-471, Auflage 2) gegen zwei erfundene Stände: nur 1.0.0 mit Vorstufen
   ist grün, eine neue Fassung in beiden Quellen ist rot mit beiden Fundstellen (Rot-Beweis), ein kaputter Stand ist nicht messbar.
   Live läuft das Werkzeug mit --netz, außerhalb der Suite. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { standPruefen } = require('../tools/kbv-pka-fassung-pruefen.js');

const FIX = path.join(__dirname, 'fixtures', 'kbv-pka-fassung');
const lauf = (args) => { try { return { code: 0, aus: execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'kbv-pka-fassung-pruefen.js'), ...args], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, aus: String(e.stdout) + String(e.stderr) }; } };

test('[PKA-Fassung] ohne Argument (Fixture) und mit dem gleichen Stand: grün', () => {
  assert.equal(lauf([]).code, 0);
  assert.equal(lauf(['--stand', path.join(FIX, 'stand-gleich.json')]).code, 0);
});

test('[PKA-Fassung·Rot] eine neue Fassung wird in beiden Quellen gemeldet', () => {
  const r = lauf(['--stand', path.join(FIX, 'stand-neu.json')]);
  assert.equal(r.code, 1);
  assert.match(r.aus, /Paketregister: Fassung 1\.1\.0/);
  assert.match(r.aus, /MIOParser: Ordner 1\.1\.0/);
});

test('[PKA-Fassung] ein Stand im falschen Format ist nicht messbar, kein stilles Grün', () => {
  assert.equal(standPruefen({ paketregister: {}, mioparser: [] }).fehler, 'Paketregister: unbekanntes Format');
  assert.equal(standPruefen({ paketregister: { versions: {}, 'dist-tags': {} }, mioparser: null }).fehler, 'MIOParser: unbekanntes Format');
});
