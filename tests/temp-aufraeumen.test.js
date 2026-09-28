'use strict';
/* TEMP-RESTE-FUELLEN-DIE-PLATTE (28.09.2026, HOCH): Tests hatten 328 GB in rund 180 000 Verzeichnissen unter os.tmpdir
   liegen lassen, die Platte war fast voll. Zusicherungen gegen die Klasse (tools/lib/temp-aufraeumen.js):
   (1) im Testprozess räumt der Preload jedes mkdtemp beim Prozessende — sync, callback, promise und ESM;
   (2) die Wache gibt dem Lauf ein eigenes TMPDIR; was darin liegen bleibt, ist rot, und es wird geräumt;
   (3) im gemeinsamen tmpdir räumt sie nur verwaiste vd-lauf-*-Verzeichnisse — nie etwas anderes.
   Jede Probe hier arbeitet in einem eigenen Verzeichnis, das sie selbst anlegt und räumt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const T = require('../tools/lib/temp-aufraeumen.js');

const REPO = path.join(__dirname, '..');
const PRELOAD = path.join(REPO, 'tools', 'lib', 'temp-aufraeumen-preload.js');
const eigenes = () => fs.mkdtempSync(path.join(os.tmpdir(), 'temp-aufraeumen-probe-' + process.pid + '-'));

function kind(tmp, datei, code, mitPreload) {
  fs.writeFileSync(path.join(tmp, datei), code);
  const basis = path.join(tmp, 'basis'); fs.mkdirSync(basis);
  const env = { ...process.env, TMPDIR: basis };
  delete env.NODE_OPTIONS;
  const r = spawnSync(process.execPath, [...(mitPreload ? ['--require', PRELOAD] : []), path.join(tmp, datei)], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, 'der Kindprozess lief (sonst besteht „nichts liegen geblieben" leer): ' + r.stderr);
  const uebrig = fs.readdirSync(basis);
  fs.rmSync(basis, { recursive: true, force: true });
  return uebrig;
}
const CJS = `const fs=require('fs'),os=require('os'),path=require('path');
fs.mkdtempSync(path.join(os.tmpdir(),'p-sync-'+process.pid+'-'));
fs.mkdtemp(path.join(os.tmpdir(),'p-cb-'+process.pid+'-'),()=>{ fs.promises.mkdtemp(path.join(os.tmpdir(),'p-prom-'+process.pid+'-')).then(()=>{}); });`;
const ESM = `import { mkdtempSync } from 'node:fs'; import os from 'node:os'; import path from 'node:path';
mkdtempSync(path.join(os.tmpdir(),'p-esm-'+process.pid+'-'));`;

test('[Temp·Preload·Rot-Beweis] ohne Preload bleibt jedes mkdtemp liegen, mit Preload keines — sync, callback, promise, ESM', () => {
  const tmp = eigenes();
  try {
    assert.equal(kind(tmp, 'a.js', CJS, false).length, 3, 'Gegenprobe: ohne Preload bleiben drei liegen — das war der Befund');
    assert.deepEqual(kind(tmp, 'a.js', CJS, true), [], 'mit Preload räumt der Prozess beim Ende');
    assert.equal(kind(tmp, 'b.mjs', ESM, false).length, 1);
    assert.deepEqual(kind(tmp, 'b.mjs', ESM, true), [], 'auch ein benannter ESM-Import von mkdtempSync');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

const DIREKT = `const fs=require('fs'),os=require('os'),path=require('path');
fs.writeFileSync(path.join(os.tmpdir(),'direkt-'+process.pid+'.html'),'x');
fs.mkdirSync(path.join(os.tmpdir(),'ordner-'+process.pid,'tief'),{recursive:true});`;

test('[Temp·Preload·Rot-Beweis] auch was direkt in os.tmpdir geschrieben wird (ohne mkdtemp), räumt der Preload — Vorhandenes bleibt', () => {
  const tmp = eigenes();
  try {
    assert.equal(kind(tmp, 'd.js', DIREKT, false).length, 2, 'Gegenprobe: eine Datei und ein Ordner bleiben ohne Preload liegen');
    assert.deepEqual(kind(tmp, 'd.js', DIREKT, true), []);
    // Eine Datei, die schon vor dem Prozess da war, überschreibt er — und lässt sie stehen.
    fs.writeFileSync(path.join(tmp, 'e.js'), "require('fs').writeFileSync(require('path').join(require('os').tmpdir(),'schon-da-'+process.pid+'.txt'),'neu')".replace('process.pid', String(process.pid)));
    const basis = path.join(tmp, 'basis2'); fs.mkdirSync(basis); fs.writeFileSync(path.join(basis, 'schon-da-' + process.pid + '.txt'), 'alt');
    const env = { ...process.env, TMPDIR: basis }; delete env.NODE_OPTIONS;
    assert.equal(spawnSync(process.execPath, ['--require', PRELOAD, path.join(tmp, 'e.js')], { env }).status, 0);
    assert.deepEqual(fs.readdirSync(basis), ['schon-da-' + process.pid + '.txt']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Temp·Wache] Caches, die ein Lauf über Prozessgrenzen teilt, sind keine Reste — mit Grund benannt', () => {
  const basis = eigenes();
  try {
    fs.writeFileSync(path.join(basis, 'vivodepot-e2e-gebacken-0123456789ab-privat-de.html'), 'x');
    fs.mkdirSync(path.join(basis, 'node-compile-cache'));
    fs.writeFileSync(path.join(basis, 'kvf-rest-1234'), 'x');
    assert.deepEqual(T.reste(basis), { anzahl: 1, praefixe: { 'kvf-rest-': 1 } });
    for (const c of T.LAUF_CACHES) assert.ok(c.grund && c.grund.length > 20, 'jeder Cache mit Grund');
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});

test('[Temp·Preload·Anker] jedes node --test-Skript in package.json lädt den Preload', () => {
  const skripte = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).scripts;
  const ohne = Object.entries(skripte).filter(([k, v]) => k.startsWith('test') && v.includes('node --test') && !v.includes('temp-aufraeumen-preload.js')).map(([k]) => k);
  assert.ok(Object.keys(skripte).includes('test'), 'Positivkontrolle');
  assert.deepEqual(ohne, [], 'ROT vorher: ein Test-Skript ohne den Preload lässt seine mkdtemp-Reste liegen');
});

test('[Temp·Wache·Rot-Beweis] ein Lauf, der unter os.tmpdir etwas liegen lässt, ist rot — und das Laufverzeichnis ist trotzdem fort', () => {
  const { bewachterLauf } = require('../tools/geteilte-git-config-wache.js');
  const basis = eigenes();
  try {
    const leck = ['node', ['-e', "const fs=require('fs'),os=require('os'),path=require('path'); fs.mkdtempSync(path.join(os.tmpdir(),'leck-probe-'+process.pid+'-'))"]];
    const exit = bewachterLauf([leck[0], ...leck[1]], { repo: REPO, temp: true, tempBasis: basis });
    assert.equal(exit, 1, 'ROT vorher: der Lauf endete mit 0, der Rest blieb im gemeinsamen tmpdir');
    assert.deepEqual(fs.readdirSync(basis), [], 'das Laufverzeichnis samt Rest ist geräumt');
    const sauber = bewachterLauf(['node', '-e', '0'], { repo: REPO, temp: true, tempBasis: basis });
    assert.equal(sauber, 0, 'Gegenprobe: ein Lauf ohne Rest bleibt grün');
    assert.deepEqual(fs.readdirSync(basis), []);
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});

test('[Temp·Wache] der Lauf sieht sein eigenes TMPDIR', () => {
  const { bewachterLauf } = require('../tools/geteilte-git-config-wache.js');
  const basis = eigenes();
  const merk = path.join(basis, '..', path.basename(basis) + '.tmpdir.txt');
  try {
    bewachterLauf(['node', '-e', `require('fs').writeFileSync(${JSON.stringify(merk)}, require('os').tmpdir())`], { repo: REPO, temp: true, tempBasis: basis });
    const gesehen = fs.readFileSync(merk, 'utf8');
    assert.ok(path.basename(gesehen).startsWith(T.LAUF_PRAEFIX + process.pid + '-'), gesehen);
    assert.ok([basis, fs.realpathSync(basis)].includes(path.dirname(gesehen)), 'unter der angegebenen Basis: ' + gesehen);
  } finally { fs.rmSync(basis, { recursive: true, force: true }); fs.rmSync(merk, { force: true }); }
});

test('[Temp·Räumen] nur verwaiste vd-lauf-*-Verzeichnisse — ein lebender Lauf und jeder fremde Name bleiben', () => {
  const basis = eigenes();
  try {
    const totePid = spawnSync(process.execPath, ['-e', '0']).pid;
    fs.mkdirSync(path.join(basis, T.LAUF_PRAEFIX + totePid + '-abc'));
    fs.mkdirSync(path.join(basis, T.LAUF_PRAEFIX + process.pid + '-lebt'));
    fs.mkdirSync(path.join(basis, 'kvf-alt-und-fremd'));
    const alt = new Date(Date.now() - 24 * 3600 * 1000);
    fs.utimesSync(path.join(basis, 'kvf-alt-und-fremd'), alt, alt);
    assert.deepEqual(T.verwaisteLaeufeRaeumen({ basis }), [T.LAUF_PRAEFIX + totePid + '-abc']);
    assert.deepEqual(fs.readdirSync(basis).sort(), ['kvf-alt-und-fremd', T.LAUF_PRAEFIX + process.pid + '-lebt'].sort(),
      'ein Muster-Räumen nach Präfixen gibt es nicht — auch ein alter Test-Rest bleibt, den räumt eine geprüfte Liste von Hand');
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});
