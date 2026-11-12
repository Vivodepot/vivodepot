'use strict';
/* tools/platte-protokoll.js (05.11.2026): je Aufruf eine Zeile mit frei (ohne und mit purgeable, in GB zu 10⁹ Byte), Swap,
   Schnappschüssen, Resten produkt-html-* und den größten Orten. Geprüft wird nur gegen die Beispiel-Ausgaben im
   Werkzeug (BEISPIEL) und Texte in dieser Probe; die Probe misst die Platte des Rechners nicht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const P = require('../tools/platte-protokoll.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'platte-protokoll.js');

test('[Platte-Protokoll·Zeile] die Beispiel-Ausgaben ergeben eine Zeile in GB zu 10⁹ Byte', () => {
  const z = P.zeileBauen(P.beispielLesen()).split('\t');
  assert.deepEqual(z, ['2026-11-05 14:22', '276.0', '283.7', '59.6', '1', '3', 'tmpdir=12.9']);
});

test('[Platte-Protokoll·Einheiten·Rot-Beweis] df in KiB wird zu GB, nicht zu GiB', () => {
  // 257 GiB aus df -h sind rund 276 GB; der Finder rechnet in GB
  const df = 'Filesystem 1024-blocks Used Available Capacity\n/dev/x 1 1 ' + (257 * 1024 * 1024) + ' 1%\n';
  assert.equal((P.dfFreiLesen(df) / 1e9).toFixed(0), '276');
  assert.notEqual((P.dfFreiLesen(df) / 1024 ** 3).toFixed(0), '276', 'Rot-Beweis: in GiB gerechnet stünde 257 da, der Vergleich mit dem Finder liefe falsch');
  assert.throws(() => P.dfFreiLesen('Filesystem Size\n/dev/x 1\n'), /Avail/);
});

test('[Platte-Protokoll·Lesen] Swap, Schnappschüsse und du; fehlende Werte bleiben leer', () => {
  assert.equal(P.swapLesen('vm.swapusage: total = 2048.00M  used = 1024.00M  free = 1024.00M'), 1024 ** 3);
  assert.equal(P.swapLesen('nichts'), null);
  assert.equal(P.schnappschuesseLesen('Snapshots for disk /:\n'), 0);
  assert.equal(P.duLesen(''), null);
  const z = P.zeileBauen({ zeit: 't', freiByte: 1e9, freiWichtigByte: null, swapByte: null, schnappschuesse: 0, produktHtml: 0, orte: [{ name: 'a', byte: null }] });
  assert.equal(z, 't\t1.0\t\t\t0\t0\ta=?');
});

test('[Platte-Protokoll·Aufruf] ohne Argument läuft es gegen die Beispiel-Ausgaben; --protokoll ohne --messen schreibt nichts', () => {
  const aus = execFileSync(process.execPath, [WERKZEUG], { encoding: 'utf8' });
  assert.equal(aus, P.zeileBauen(P.beispielLesen()) + '\n');
  assert.deepEqual(P.argumenteLesen(['--messen', '--ort', 'baeume=/x', '--protokoll', 'p.tsv']), { messen: true, protokoll: 'p.tsv', orte: [{ name: 'baeume', pfad: '/x' }] });
  assert.throws(() => P.argumenteLesen(['--ort', 'ohne-gleich']), /name=pfad/);
  assert.throws(() => P.argumenteLesen(['--loeschen']), /unbekanntes Argument/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'platte-protokoll-'));
  try {
    const datei = path.join(dir, 'p.tsv');
    execFileSync(process.execPath, [WERKZEUG, '--protokoll', datei], { encoding: 'utf8' });
    assert.equal(fs.existsSync(datei), false, 'ohne --messen wird kein Protokoll geschrieben');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
