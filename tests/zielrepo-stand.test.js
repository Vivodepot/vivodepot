'use strict';
/* Probe zum Befund ZIELREPO-ABGEZWEIGT (04.10.2026): tools/lib/zielrepo-stand.js hält das Ziel-Repo von testfassung-legen
   und modul-app-packen gegen origin/main. Rot-Beweise: abgezweigt, fremd voraus, origin nicht holbar. Gegenproben:
   gleich, dahinter mit --ff-only. Voraus ist immer rot: die Prüfung läuft vor den eigenen Commits. Alles in Wegwerf-Repos mit eigenem origin. */
require('./helfer/platz-isoliert.js').platzIsolieren();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { zielStandPruefen } = require('../tools/lib/zielrepo-stand.js');

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function aufbau() {
  const basis = fs.mkdtempSync(path.join(os.tmpdir(), 'zielrepo-stand-'));
  const hub = path.join(basis, 'hub.git');
  git(['init', '--bare', '-q', '--initial-branch=main', hub], basis);
  const klon = (n) => { const k = path.join(basis, n); git(['clone', '-q', hub, k], basis); return k; };
  const commit = (k, datei, betreff) => {
    fs.writeFileSync(path.join(k, datei), datei + Math.random());
    git(['add', datei], k);
    git(['-c', 'user.email=a@a', '-c', 'user.name=A', 'commit', '-q', '-m', betreff], k);
  };
  const ziel = klon('ziel');
  commit(ziel, 'start.txt', 'start');
  git(['push', '-q', 'origin', 'HEAD:main'], ziel);
  const anderer = klon('anderer');
  return { basis, ziel, anderer, commit, weg: () => fs.rmSync(basis, { recursive: true, force: true }) };
}

test('[Zielrepo-Stand] Gegenprobe gleich: keine Befunde', () => {
  const a = aufbau();
  try {
    const r = zielStandPruefen(a.ziel);
    assert.equal(r.lage, 'gleich'); assert.deepEqual(r.funde, []);
  } finally { a.weg(); }
});

test('[Zielrepo-Stand] Gegenprobe dahinter: mit nachziehen per --ff-only auf origin/main, ohne nachziehen nur gemeldet', () => {
  const a = aufbau();
  try {
    a.commit(a.anderer, 'neu.txt', 'iop-demo: fremd, aber auf origin');
    git(['push', '-q', 'origin', 'HEAD:main'], a.anderer);
    const ohne = zielStandPruefen(a.ziel);
    assert.equal(ohne.lage, 'dahinter'); assert.equal(ohne.nachgezogen, false);
    const mit = zielStandPruefen(a.ziel, { nachziehen: true });
    assert.equal(mit.lage, 'dahinter'); assert.equal(mit.nachgezogen, true); assert.deepEqual(mit.funde, []);
    assert.equal(git(['rev-parse', 'HEAD'], a.ziel), git(['rev-parse', 'origin/main'], a.ziel));
  } finally { a.weg(); }
});

test('[Negativprobe] Rot-Beweis: voraus mit einem alten „harness:“-Commit fällt — ein Präfix belegt den Lauf nicht (Fall 11.09.)', () => {
  const a = aufbau();
  try {
    a.commit(a.ziel, 'h.txt', 'harness: v487 -- 2026-09-11, aus einem früheren Lauf');
    a.commit(a.ziel, 'm.txt', 'modul-apps: Kern-Dateien synchronisiert (früherer Lauf)');
    const r = zielStandPruefen(a.ziel);
    assert.equal(r.lage, 'voraus');
    assert.ok(r.funde.some((f) => /voraus, mit Commits, die nicht aus diesem Lauf stammen.*harness: v487/.test(f)), r.funde.join('\n'));
  } finally { a.weg(); }
});

test('[Negativprobe] Rot-Beweis: voraus mit einem fremden Commit fällt', () => {
  const a = aufbau();
  try {
    a.commit(a.ziel, 'f.txt', 'irgendwer: Handarbeit im Ziel');
    const r = zielStandPruefen(a.ziel);
    assert.equal(r.lage, 'voraus');
    assert.ok(r.funde.some((f) => /irgendwer: Handarbeit/.test(f)), r.funde.join('\n'));
  } finally { a.weg(); }
});

test('[Negativprobe] Rot-Beweis: abgezweigt fällt, auch mit nachziehen — nichts wird verschoben', () => {
  const a = aufbau();
  try {
    a.commit(a.anderer, 'o.txt', 'iop-demo: auf origin');
    git(['push', '-q', 'origin', 'HEAD:main'], a.anderer);
    a.commit(a.ziel, 'l.txt', 'harness: v998 -- nur lokal');
    const vorher = git(['rev-parse', 'HEAD'], a.ziel);
    const r = zielStandPruefen(a.ziel, { nachziehen: true });
    assert.equal(r.lage, 'abgezweigt');
    assert.ok(r.funde.some((f) => /abgezweigt/.test(f)), r.funde.join('\n'));
    assert.equal(git(['rev-parse', 'HEAD'], a.ziel), vorher, 'ein abgezweigtes Ziel wird nicht angefasst');
  } finally { a.weg(); }
});

test('[Negativprobe] Rot-Beweis: origin nicht holbar fällt', () => {
  const a = aufbau();
  try {
    git(['remote', 'set-url', 'origin', path.join(a.basis, 'gibt-es-nicht.git')], a.ziel);
    const r = zielStandPruefen(a.ziel);
    assert.equal(r.lage, 'unbekannt');
    assert.ok(r.funde.some((f) => /lässt sich nicht holen/.test(f)), r.funde.join('\n'));
  } finally { a.weg(); }
});
