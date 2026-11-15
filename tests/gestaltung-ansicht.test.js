'use strict';
/* Wächter „Ansicht“ (tools/gestaltung-ansicht.js): Zählen, Ratsche und Erhebung gegen Fixtures, ohne Browser.
   Die Messung im Browser steht in tests/e2e/gestaltung-ansicht.spec.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const A = require('../tools/gestaltung-ansicht.js');

const FIX = path.join(__dirname, '..', 'tools', 'gestaltung-fixtures');
const lesen = (n) => JSON.parse(fs.readFileSync(path.join(FIX, n), 'utf8'));
const messung = lesen('ansicht-messung.json');
const satz = A.bausteinSatz(lesen('ansicht-definition.json'));

test('[Ansicht·Zählen] ein Element ohne Baustein an sich und an den Vorfahren zählt, eines innerhalb nicht', () => {
  assert.deepEqual(A.zaehlen(messung.a, satz), { gesamt: 4, ohneBaustein: 1, anteil: 0.75, unbekannt: [] });
  assert.deepEqual(A.zaehlen(messung.b, satz), { gesamt: 2, ohneBaustein: 0, anteil: 1, unbekannt: [] });
  assert.equal(A.zaehlen([], satz).anteil, 1, 'eine leere Ansicht ist nicht zu 0 % modular');
});

test('[Ansicht·Ratsche] gleich ist grün, gestiegen und gesunken sind rot', () => {
  assert.equal(A.vergleichen(messung, lesen('ansicht-soll-gleich.json'), satz).ok, true);
  const hoch = A.vergleichen(messung, lesen('ansicht-soll-tiefer.json'), satz);
  assert.equal(hoch.ok, false, 'Rot-Beweis: a stieg von 0 auf 1');
  assert.match(hoch.zeilen.join('\n'), /a: 0 → 1 .*gestiegen/);
  const tief = A.vergleichen(messung, { zahlen: { a: 2, b: 0 } }, satz);
  assert.equal(tief.ok, false);
  assert.match(tief.zeilen.join('\n'), /a: 2 → 1 gesunken; Grundlinie nachziehen/);
});

test('[Ansicht·Vollständig] eine nicht erhobene und eine nicht mehr gemessene Ansicht sind rot', () => {
  const r = A.vergleichen(messung, { zahlen: { a: 1, c: 0 } }, satz);
  assert.equal(r.ok, false);
  assert.match(r.zeilen.join('\n'), /b: nicht erhoben/);
  assert.match(r.zeilen.join('\n'), /c: in der Grundlinie, aber nicht gemessen/);
  assert.equal(A.vergleichen(messung, { zahlen: {} }, satz).ok, false, 'Rot-Beweis: eine leere Grundlinie lässt keine Messung durch');
});

test('[Ansicht·Satz] ein Name außerhalb des Satzes der Definition ist rot; ohne Satz bleibt die Namensprüfung aus', () => {
  const fremd = { x: [{ pfad: 'div', tag: 'div', baustein: 'erfunden', innerhalb: true }] };
  const r = A.vergleichen(fremd, { zahlen: { x: 0 } }, satz);
  assert.equal(r.ok, false);
  assert.match(r.zeilen[0], /unbekannter Baustein erfunden/);
  assert.equal(A.vergleichen(fremd, { zahlen: { x: 0 } }, null).ok, true);
  assert.equal(A.bausteinSatz({}), null);
  assert.deepEqual([...A.bausteinSatz({ bausteine: [{ name: 'knopf' }, 'chip'] })].sort(), ['chip', 'knopf']);
});

test('[Ansicht·Erhebung] die Grundlinie nimmt Senkungen und neue Ansichten auf, eine Steigung nie', () => {
  const { grundlinie, verweigert } = A.grundlinieNeu(messung, { zweck: 'z', zahlen: { a: 3 } }, satz);
  assert.deepEqual(verweigert, []);
  assert.deepEqual(grundlinie, { zweck: 'z', zahlen: { a: 1, b: 0 } });
  const steigt = A.grundlinieNeu(messung, { zahlen: { a: 0 } }, satz);
  assert.deepEqual(steigt.verweigert, ['a: 0 → 1']);
});

test('[Ansicht·CLI] Selbstprobe grün; --check gegen eine höhere Messung Exit 1, --grundlinie-schreiben verweigert die Steigung', () => {
  const tool = path.join(__dirname, '..', 'tools', 'gestaltung-ansicht.js');
  const lauf = (args) => spawnSync(process.execPath, [tool, ...args], { encoding: 'utf8' });
  const s = lauf([]);
  assert.equal(s.status, 0, s.stderr);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ansicht-'));
  const gl = path.join(tmp, 'gl.json');
  fs.writeFileSync(gl, JSON.stringify({ zahlen: { a: 0, b: 0 } }));
  const def = path.join(FIX, 'ansicht-definition.json');
  const m = path.join(FIX, 'ansicht-messung.json');
  const c = lauf(['--check', '--messung', m, '--grundlinie', gl, '--definition', def]);
  assert.equal(c.status, 1);
  assert.match(c.stderr, /ROT a: 0 → 1/);
  const w = lauf(['--grundlinie-schreiben', '--messung', m, '--grundlinie', gl, '--definition', def]);
  assert.equal(w.status, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(gl, 'utf8')), { zahlen: { a: 0, b: 0 } }, 'nichts geschrieben');
  fs.writeFileSync(gl, JSON.stringify({ zahlen: { a: 4 } }));
  assert.equal(lauf(['--grundlinie-schreiben', '--messung', m, '--grundlinie', gl, '--definition', def]).status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(gl, 'utf8')).zahlen, { a: 1, b: 0 });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('[Ansicht·Grundlinie] die Grundlinie im Repo ist lesbar und hält nur ganze Zahlen ≥ 0', () => {
  const g = JSON.parse(fs.readFileSync(A.GRUNDLINIE, 'utf8'));
  assert.equal(typeof g.zahlen, 'object');
  for (const [k, v] of Object.entries(g.zahlen)) assert.ok(Number.isInteger(v) && v >= 0, k);
});
