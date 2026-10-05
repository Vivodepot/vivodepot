'use strict';
/* hooks/_hook-log.sh trennt echte Hook-Läufe von Testläufen (Feld `quelle`, 28.09.2026). Ohne das Feld
   konnte hook-log.ndjson die Frage „wie oft lief der Hook je Landung?" nicht beantworten.
   Rot-Beweis: die Fassung davor schrieb kein `quelle` — die erste Probe prüft genau das Feld. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

function lauf(env) {
  const baum = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-log-quelle-'));
  try {
    fs.mkdirSync(path.join(baum, 'hooks'));
    fs.copyFileSync(path.join(REPO, 'hooks', '_hook-log.sh'), path.join(baum, 'hooks', '_hook-log.sh'));
    execFileSync('/bin/sh', ['-c', '. hooks/_hook-log.sh; hook_log_schreiben probe 0'], { cwd: baum, env });
    return JSON.parse(fs.readFileSync(path.join(baum, 'hook-log.ndjson'), 'utf8').trim());
  } finally { fs.rmSync(baum, { recursive: true, force: true }); }
}
const ohne = () => { const e = { ...process.env }; delete e.VD_HOOK_SPERRE_JE_PID; return e; };

test('ein Hook-Lauf aus einem Test trägt quelle=test', () => {
  assert.strictEqual(lauf({ ...process.env, VD_HOOK_SPERRE_JE_PID: '1' }).quelle, 'test');
});

test('ein echter Hook-Lauf (ohne den Test-Schalter) trägt quelle=echt', () => {
  assert.strictEqual(lauf(ohne()).quelle, 'echt');
});

test('die übrigen Felder bleiben, wie sie waren', () => {
  const e = lauf(ohne());
  // start (02.10.2026): Startzeit des Hooks, damit die Dauer eines Pushes aus dem Log lesbar ist.
  assert.deepStrictEqual(Object.keys(e), ['zeit', 'start', 'hook', 'ziel', 'rc', 'quelle']);
  assert.match(e.start, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  assert.strictEqual(e.hook, 'probe'); assert.strictEqual(e.rc, '0');
});
