'use strict';
/* Prozessbaum beim Ablauf (26.09.2026, nach SELBSTTEST-HAENGER-IM-SUITE-AUSSCHNITT): eine Suite stand mit der ganzen Gruppe auf 0 % CPU,
   und als jemand nachsah, lief nichts mehr. tools/mit-zeitgrenze.pl hält darum VOR dem Beenden fest, was in der Gruppe lebt —
   Zustand je Prozess und die Pipes der schlafenden —, damit der nächste Hänger ohne wache Sitzung zu diagnostizieren ist. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'mit-zeitgrenze.pl');

function laufen(werkzeug) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-protokoll-'));
  const r = spawnSync('perl', [werkzeug, '1', '--', 'sh', '-c', 'sleep 30 | cat'],
    { encoding: 'utf8', timeout: 20000, env: { ...process.env, VD_ZEITGRENZE_PROTOKOLL_DIR: dir } });
  const dateien = fs.readdirSync(dir).map((d) => fs.readFileSync(path.join(dir, d), 'utf8'));
  fs.rmSync(dir, { recursive: true, force: true });
  return { r, dateien };
}

test('[Zeitgrenze·Prozessbaum] beim Ablauf: Exit 142, und der Prozessbaum der Gruppe samt Pipes liegt in einer Datei', () => {
  const { r, dateien } = laufen(WERKZEUG);
  assert.equal(r.status, 142, 'der Vertrag mit den Hooks bleibt');
  assert.equal(dateien.length, 1, r.stderr);
  const t = dateien[0];
  assert.match(t, /PID PPID PGID STAT WCHAN ETIME COMMAND/);
  assert.match(t, /sleep 30/);
  assert.match(t, /\bcat\b/);
  assert.match(t, /PIPE|FIFO/, 'woran die schlafenden Prozesse hängen');
  assert.match(r.stderr, /Prozessbaum gesichert: /);
});

test('[Zeitgrenze·Prozessbaum·Rot-Beweis] ohne das Sichern (die Fassung davor) entsteht keine Datei', () => {
  const kopie = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-alt-')), 'mit-zeitgrenze.pl');
  try {
    const text = fs.readFileSync(WERKZEUG, 'utf8');
    assert.ok(text.includes('prozessbaum_sichern(); gruppe_beenden();'));
    fs.writeFileSync(kopie, text.replace('prozessbaum_sichern(); gruppe_beenden();', 'gruppe_beenden();'));
    const { r, dateien } = laufen(kopie);
    assert.equal(r.status, 142);
    assert.equal(dateien.length, 0);
  } finally { fs.rmSync(path.dirname(kopie), { recursive: true, force: true }); }
});

test('[Zeitgrenze·Prozessbaum] ohne Ablauf wird nichts geschrieben', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-protokoll-'));
  try {
    const r = spawnSync('perl', [WERKZEUG, '10', '--', 'true'], { encoding: 'utf8', env: { ...process.env, VD_ZEITGRENZE_PROTOKOLL_DIR: dir } });
    assert.equal(r.status, 0);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
