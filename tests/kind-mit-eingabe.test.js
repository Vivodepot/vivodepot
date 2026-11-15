'use strict';
/* Der gemeinsame Aufruf für Kindprozesse mit Eingabe: Die Eingabe kommt vollständig an, ein hängendes Kind endet an der Zeitgrenze. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { kindMitEingabe } = require('../tools/lib/kind-mit-eingabe.js');

const LESEN = "let n=0;process.stdin.on('data',(d)=>{n+=d.length});process.stdin.on('end',()=>{process.stdout.write(String(n))})";
const HAENGEN = 'setInterval(() => {}, 1000)';

test('[Kind-Eingabe] 2 MB kommen vollständig an', () => {
  const r = kindMitEingabe(process.execPath, ['-e', LESEN], { eingabe: Buffer.alloc(2 * 1024 * 1024, 65), encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, String(2 * 1024 * 1024));
});

test('[Kind-Eingabe] ohne Eingabe ist stdin geschlossen, das Kind wartet nicht', () => {
  const r = kindMitEingabe(process.execPath, ['-e', LESEN], { encoding: 'utf8', zeitgrenzeMs: 20000 });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '0');
});

test('[Kind-Eingabe·Rot-Beweis] ein hängendes Kind wirft an der Zeitgrenze', { timeout: 15000 }, () => {
  assert.throws(() => kindMitEingabe(process.execPath, ['-e', HAENGEN], { eingabe: 'x', zeitgrenzeMs: 300 }), /Zeitgrenze 300 ms überschritten/);
});

test('[Kind-Eingabe] mit werfen: false kommt status null, nie ein Ergebnis', { timeout: 15000 }, () => {
  const r = kindMitEingabe(process.execPath, ['-e', HAENGEN], { eingabe: 'x', zeitgrenzeMs: 300, werfen: false, encoding: 'utf8' });
  assert.equal(r.status, null);
  assert.match(r.stderr, /kein Ergebnis/);
});

test('[Kind-Eingabe] werfenBeiFehler wirft bei Ausgang ungleich 0, sonst kommt der Ausgang zurück', () => {
  const rot = ['-e', 'process.exit(3)'];
  assert.throws(() => kindMitEingabe(process.execPath, rot, { eingabe: 'x', werfenBeiFehler: true }), /Ausgang 3/);
  assert.equal(kindMitEingabe(process.execPath, rot, { eingabe: 'x' }).status, 3);
});
