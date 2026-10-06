'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Befund LANDUNG-VOLLSTAENDIGKEIT-HAENGT (06.10.2026): im pre-push hing `git apply --check` aus
   tools/landung-vollstaendigkeit-pruefen.js viermal bis zu zwei Stunden in read() auf stdin; der Push auf
   den Kanon kam nicht durch. Die Probe hält zwei Dinge:
   1. Eingabe kommt aus einer Datei, nicht über eine Pipe — ein Befehl, der stdin bis EOF liest, endet.
   2. Ein git-Aufruf, der hängt, endet an der Zeitgrenze GESCHLOSSEN: das Werkzeug wirft, die Kommandozeile
      endet rot mit Meldung — nie „passt“, nie still übersprungen.
   Die hängende Gegenstelle ist ein Ersatz-`git` im PATH, nie das echte Repo.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'landung-vollstaendigkeit-pruefen.js');

/* Ersatz-git: `haengen` schläft (eine Gegenstelle, die nie antwortet), `echo` gibt stdin unverändert aus. */
function ersatzGit(art) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'landung-voll-ersatzgit-'));
  const skript = art === 'haengen' ? '#!/bin/sh\nexec sleep 60\n' : '#!/bin/sh\nexec cat\n';
  fs.writeFileSync(path.join(dir, 'git'), skript, { mode: 0o755 });
  return dir;
}

function laufe(code, pfadVorne, zeitgrenzeMs) {
  return spawnSync(process.execPath, ['-e', code], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, PATH: pfadVorne + path.delimiter + process.env.PATH, VD_LANDUNG_GIT_ZEITGRENZE_MS: String(zeitgrenzeMs) },
  });
}

test('[Landung·Zeitgrenze] Eingabe über eine Datei: ein Befehl, der stdin bis EOF liest, endet mit genau der Eingabe', () => {
  const dir = ersatzGit('echo');
  try {
    const code = `const { git } = require(${JSON.stringify(WERKZEUG)});
      const eingabe = 'x'.repeat(2 * 1024 * 1024) + '\\nende\\n';
      const r = git(['apply', '--check'], process.cwd(), null, eingabe);
      process.stdout.write(String(r.status) + ' ' + String(r.out === eingabe));`;
    const r = laufe(code, dir, 20000);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '0 true');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Landung·Zeitgrenze·Rot-Beweis] ein hängender git-Aufruf wirft an der Zeitgrenze, statt zu warten', () => {
  const dir = ersatzGit('haengen');
  try {
    const code = `const { git } = require(${JSON.stringify(WERKZEUG)});
      try { git(['apply', '--check', '--reverse', '--cached'], process.cwd(), null, 'patch\\n'); process.stdout.write('kein-wurf'); }
      catch (e) { process.stdout.write('wurf: ' + e.message); }`;
    const t0 = Date.now();
    const r = laufe(code, dir, 1500);
    assert.ok(Date.now() - t0 < 20000, 'die Zeitgrenze greift, der Aufruf hängt nicht');
    assert.match(r.stdout, /^wurf: .*Zeitgrenze 1500 ms überschritten.*NICHT gemessen/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Landung·Zeitgrenze·geschlossen] die Kommandozeile endet bei hängendem git rot mit Meldung, nie grün', () => {
  const dir = ersatzGit('haengen');
  try {
    const r = spawnSync(process.execPath, [WERKZEUG, '--landestand', 'a'.repeat(40), '--basis', 'b'.repeat(40)], {
      encoding: 'utf8', timeout: 30000, cwd: os.tmpdir(),
      env: { ...process.env, PATH: dir + path.delimiter + process.env.PATH, VD_LANDUNG_GIT_ZEITGRENZE_MS: '1500' },
    });
    assert.notEqual(r.status, 0, 'ein nicht gemessener Lauf ist rot');
    assert.equal(r.signal, null, 'das Werkzeug endet selbst, nicht durch die äußere Zeitgrenze der Probe');
    assert.match(r.stderr, /Zeitgrenze 1500 ms überschritten/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
