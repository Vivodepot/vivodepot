'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS); in derselben Zeile, damit keine Zeilennummer wandert
/* ZEITGRENZE-GREIFT-NICHT (21.10.2026): tools/mit-zeitgrenze.pl bricht an der Grenze ab, auch wenn kein SIGALRM ankommt.
   Eine Schnellstufe lief 4713 s unter der Grenze 1500 s weiter, am Ende stand nur der HINWEIS. Dasselbe Bild ergibt ein
   gesperrt geerbtes SIGALRM (Kopf des Werkzeugs, Nachtrag 21.10.2026).
   1. Mit gesperrtem SIGALRM: Exit 142, der Prozessbaum ist gesichert, kein Kind lebt mehr, und das in Grenze plus wenigen Sekunden.
   2. Mit gesperrtem SIGALRM endet ein kurzer Befehl mit seinem eigenen Exit, ohne Wartezeit.
   3. Rot-Beweis: die Sperre ist echt — ein Wecker mit %SIG-Eintrag feuert unter ihr nicht. Ohne die eigene Uhr des
      Werkzeugs liefe 1. also bis zum Ende des Befehls. */
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'mit-zeitgrenze.pl');
// Startet den Rest der Argumente mit gesperrtem SIGALRM; die Maske erbt sich über exec.
const GESPERRT = ['-MPOSIX', '-e', 'POSIX::sigprocmask(POSIX::SIG_BLOCK(), POSIX::SigSet->new(POSIX::SIGALRM())) or die; exec @ARGV or exit 127', '--'];
const marke = () => 'VDZEITGRENZE' + process.pid + '_' + Math.random().toString(36).slice(2, 10);
const lebende = (m) => { const r = spawnSync('pgrep', ['-f', m], { encoding: 'utf8' }); return (r.stdout || '').trim() ? r.stdout.trim().split('\n').length : 0; };

function mitWegwerf(f) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-zeitgrenze-ohne-signal-'));
  try { return f(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const umgebung = (dir) => ({ ...process.env, VD_ZEITGRENZE_DAUER_DATEI: path.join(dir, 'dauer.ndjson'), VD_ZEITGRENZE_PROTOKOLL_DIR: dir });

test('[Zeitgrenze·ohne Signal] gesperrtes SIGALRM: Exit 142, Prozessbaum gesichert, kein Kind lebt, rechtzeitig', () => mitWegwerf((dir) => {
  const m = marke();
  const haenger = path.join(dir, 'haenger.sh');
  fs.writeFileSync(haenger, "#!/bin/sh\nperl -e 'sleep 30' " + m + " &\nperl -e 'sleep 30' " + m + ' &\nsleep 30\n', { mode: 0o755 });
  try {
    const anfang = Date.now();
    const r = spawnSync('perl', [...GESPERRT, 'perl', WERKZEUG, '2', '--', haenger], { encoding: 'utf8', env: umgebung(dir), timeout: 25000 });
    const dauer = Date.now() - anfang;
    assert.strictEqual(r.status, 142, 'Abbruch nach Zeit meldet 142 (status=' + r.status + ', signal=' + r.signal + ', stderr=' + (r.stderr || '').slice(-300) + ')');
    assert.ok(dauer < 10000, 'endet kurz nach der Grenze 2 s, nicht am Ende des Befehls: ' + dauer + ' ms');
    assert.match(r.stderr, /Zeitgrenze gerissen — Prozessbaum gesichert/);
    assert.ok(fs.readdirSync(dir).some((f) => /^zeitgrenze-.*\.txt$/.test(f)), 'die Datei mit dem Prozessbaum liegt da');
    spawnSync('sleep', ['1.2']);
    assert.strictEqual(lebende(m), 0, 'kein Kind des Befehls lebt mehr');
  } finally { spawnSync('pkill', ['-f', m]); }
}));

test('[Zeitgrenze·ohne Signal·kurz] gesperrtes SIGALRM: ein kurzer Befehl endet mit seinem Exit, ohne zu warten', () => mitWegwerf((dir) => {
  const anfang = Date.now();
  const r = spawnSync('perl', [...GESPERRT, 'perl', WERKZEUG, '20', '--', 'sh', '-c', 'exit 3'], { encoding: 'utf8', env: umgebung(dir), timeout: 15000 });
  assert.strictEqual(r.status, 3);
  assert.ok(Date.now() - anfang < 5000, 'kein Warten bis zur Grenze');
}));

test('[Zeitgrenze·ohne Signal·Rot-Beweis] die Sperre ist echt: ein Wecker mit Handler feuert unter ihr nicht', () => {
  const r = spawnSync('perl', [...GESPERRT, 'perl', '-e', '$SIG{ALRM} = sub { print "gefeuert"; exit 0 }; alarm 1; select(undef, undef, undef, 3); print "nicht gefeuert"'],
    { encoding: 'utf8', timeout: 15000 });
  assert.strictEqual(r.stdout, 'nicht gefeuert', 'unter der geerbten Sperre kommt SIGALRM nicht an — ohne eigene Uhr griffe die Grenze nicht');
});
