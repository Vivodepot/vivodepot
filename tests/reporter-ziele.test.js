'use strict';
/* reporter-ziele.test.js — kein node --test-Reporter schreibt in ein Gerät oder eine Pipe (03.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Öffentlich war E2E-Reisen auf dem Linux-Runner rot: package.json lenkte den Zeiten-Reporter mit
   --test-reporter-destination=/dev/null um. Node schreibt ein Reporter-Ziel, das kein stdout/stderr ist, über einen
   WriteStream und ruft beim Schließen fsync auf; fsync auf /dev/null ist auf Linux EINVAL, der Lauf stürzt am Ende ab.
   macOS duldet es, darum war es hier grün. Erlaubt sind darum nur stdout, stderr und ein gewöhnlicher Dateipfad; nicht
   erlaubt ist jedes Gerät (/dev/*, auch /dev/stdout und /dev/fd/*), /proc/*, eine Dateinummer und eine Pipe.
   Geprüft wird jede Nennung in package.json und in getrackten Dateien unter tests/, tools/, scripts/, hooks/, .github/.
   ROT-BEWEIS: /dev/null, /dev/stdout, /dev/fd/1, /proc/self/fd/1, „&1“ und eine benannte Pipe fallen; stdout, stderr und
   ein Pfad unter os.tmpdir gehen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const SCHLUESSEL = '--test-reporter-' + 'destination';   // zusammengesetzt, damit diese Datei sich nicht selbst findet
const NENNUNG = new RegExp(SCHLUESSEL.replace(/-/g, '\\-') + "(?:=|['\"]?\\s*,\\s*['\"])([^\\s'\"`,)]+)", 'g');

function zielUrteil(ziel) {
  if (ziel === 'stdout' || ziel === 'stderr') return null;
  if (/^\/dev\//.test(ziel)) return 'Gerät';
  if (/^\/proc\//.test(ziel)) return 'proc';
  if (/^&?\d+$/.test(ziel) || /^&/.test(ziel)) return 'Dateinummer';
  if (/\|/.test(ziel) || /\.(?:fifo|pipe)$/i.test(ziel) || /^pipe:/i.test(ziel)) return 'Pipe';
  return null;
}

function nennungenIm(text) {
  return [...String(text).matchAll(NENNUNG)].map((m) => m[1]);
}

test('[Reporter-Ziele] kein Reporter schreibt in ein Gerät, eine Dateinummer oder eine Pipe', () => {
  const dateien = execFileSync('git', ['ls-files', 'package.json', 'tests', 'tools', 'scripts', 'hooks', '.github'], { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() })
    .split('\n').filter(Boolean).filter((d) => d !== 'tests/reporter-ziele.test.js' && !/\.(?:png|jpg|pdf|woff2?|ttf|zip|gz)$/i.test(d));
  const funde = [];
  let gesehen = 0;
  for (const d of dateien) {
    let t; try { t = fs.readFileSync(path.join(REPO, d), 'utf8'); } catch { continue; }
    if (!t.includes(SCHLUESSEL)) continue;
    for (const ziel of nennungenIm(t)) { gesehen++; const u = zielUrteil(ziel); if (u) funde.push(d + ': ' + ziel + ' (' + u + ')'); }
  }
  assert.ok(gesehen >= 3, 'Positivkontrolle: package.json und die Proben nennen Reporter-Ziele (' + gesehen + ')');
  assert.deepEqual(funde, []);
});

test('[Reporter-Ziele·Rot-Beweis] Geräte, proc, Dateinummern und Pipes fallen; stdout, stderr, Dateipfade gehen', () => {
  for (const ziel of ['/dev/null', '/dev/stdout', '/dev/stderr', '/dev/fd/1', '/proc/self/fd/1', '&1', '2', 'pipe:zeiten', 'zeiten.fifo']) {
    assert.ok(zielUrteil(ziel), ziel + ' muss fallen');
  }
  for (const ziel of ['stdout', 'stderr', '/tmp/vd-zeiten.json', 'zeiten.json']) assert.equal(zielUrteil(ziel), null, ziel);
  assert.deepEqual(nennungenIm('node --test ' + SCHLUESSEL + '=/dev/null x'), ['/dev/null'], 'Form mit =');
  assert.deepEqual(nennungenIm("['" + SCHLUESSEL + "', '/dev/stdout']"), ['/dev/stdout'], 'Form als Argumentliste');
});
