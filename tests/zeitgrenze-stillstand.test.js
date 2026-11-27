'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS); in derselben Zeile, damit keine Zeilennummer wandert
/* STILLSTAND STATT GESAMTZEIT (25.11.2026): tools/mit-zeitgrenze.pl beendet mit VD_ZEITGRENZE_STILLSTAND_S=<n> einen Befehl, dessen
   Ausgabe n Sekunden lang nicht wächst, und lässt einen Befehl mit stetiger Ausgabe laufen, auch wenn er länger braucht als n.
   Anlass: eine Gesamtgrenze der Suite brach gesunde, nur langsame Läufe ab. Die Zahlen sind hier auf Sekunden verkleinert.
   1. Stetiger Fortschritt über ein Mehrfaches des Stillstands hinaus: kein Abbruch, Exit des Befehls.
   2. Kein Fortschritt: Exit 142 nach dem Stillstand (nicht erst an der Gesamtgrenze), Grund "stillstand", kein Kind lebt mehr.
   3. Rot-Beweis: derselbe stille Befehl ohne die Variable läuft bis zu seinem Ende — der Abbruch in 2. kommt vom Stillstand.
   4. Geht die Ausgabe in keine Datei, ist kein Fortschritt messbar: dann gilt nur die Gesamtgrenze, und STDERR sagt es.
   5. Die Variable erreicht den Befehl nicht (verschachtelte Aufrufe erben sie nicht). */
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'mit-zeitgrenze.pl');
const marke = () => 'VDSTILLSTAND' + process.pid + '_' + Math.random().toString(36).slice(2, 10);
const lebende = (m) => { const r = spawnSync('pgrep', ['-f', m], { encoding: 'utf8' }); return (r.stdout || '').trim() ? r.stdout.trim().split('\n').length : 0; };

function mitWegwerf(f) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-zeitgrenze-stillstand-'));
  try { return f(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
/* Startet das Werkzeug mit STDOUT und STDERR in einer Datei, wie die Suite im Hook. */
function lauf(dir, { gesamt, stillstand, befehl, inDatei = true }) {
  const env = { ...process.env, VD_ZEITGRENZE_DAUER_DATEI: path.join(dir, 'dauer.ndjson'), VD_ZEITGRENZE_PROTOKOLL_DIR: dir };
  delete env.VD_ZEITGRENZE_STILLSTAND_S;
  if (stillstand !== undefined) env.VD_ZEITGRENZE_STILLSTAND_S = String(stillstand);
  const log = path.join(dir, 'lauf.log');
  const fd = fs.openSync(log, 'w');
  const anfang = Date.now();
  try {
    const r = spawnSync('perl', [WERKZEUG, String(gesamt), '--', 'sh', '-c', befehl],
      { env, encoding: 'utf8', timeout: 40000, stdio: inDatei ? ['ignore', fd, fd] : ['ignore', 'pipe', 'pipe'] });
    const dauer = (Date.now() - anfang) / 1000;
    const text = fs.readFileSync(log, 'utf8') + (r.stdout || '') + (r.stderr || '');
    const df = path.join(dir, 'dauer.ndjson');
    const zeilen = fs.existsSync(df) ? fs.readFileSync(df, 'utf8').trim().split('\n').map((z) => JSON.parse(z)) : [];
    return { status: r.status, dauer, text, zeile: zeilen[zeilen.length - 1] };
  } finally { fs.closeSync(fd); }
}

test('[Stillstand·Fortschritt] stetige Ausgabe über ein Mehrfaches des Stillstands: kein Abbruch', () => mitWegwerf((dir) => {
  const r = lauf(dir, { gesamt: 30, stillstand: 2, befehl: 'i=0; while [ $i -lt 12 ]; do echo test $i ok; sleep 0.5; i=$((i+1)); done; exit 0' });
  assert.strictEqual(r.status, 0, 'Exit des Befehls, kein 142: ' + r.text.slice(-300));
  assert.ok(r.dauer >= 5, 'der Lauf brauchte mehr als das Doppelte des Stillstands: ' + r.dauer + ' s');
  assert.strictEqual(r.zeile.ergebnis, 'gruen');
}));

test('[Stillstand·kein Fortschritt] keine neue Ausgabe: Exit 142 nach dem Stillstand, Grund stillstand, kein Kind lebt', () => mitWegwerf((dir) => {
  const m = marke();
  try {
    const r = lauf(dir, { gesamt: 30, stillstand: 2, befehl: "echo los; perl -e 'sleep 30' " + m + ' & sleep 30' });
    assert.strictEqual(r.status, 142, 'Abbruch meldet 142: ' + r.text.slice(-300));
    assert.ok(r.dauer < 10, 'endet kurz nach dem Stillstand 2 s, nicht an der Gesamtgrenze 30 s: ' + r.dauer + ' s');
    assert.match(r.text, /STILLSTAND: 2 s keine neue Ausgabe/);
    assert.deepStrictEqual([r.zeile.ergebnis, r.zeile.grund, r.zeile.stillstand_s], ['zeitgrenze', 'stillstand', 2]);
    spawnSync('sleep', ['1.2']);
    assert.strictEqual(lebende(m), 0, 'kein Kind des Befehls lebt mehr');
  } finally { spawnSync('pkill', ['-f', m]); }
}));

test('[Stillstand·Rot-Beweis] derselbe stille Befehl ohne die Variable läuft bis zu seinem Ende', () => mitWegwerf((dir) => {
  const r = lauf(dir, { gesamt: 30, befehl: 'echo los; sleep 4; exit 0' });
  assert.strictEqual(r.status, 0, 'ohne Stillstands-Wächter kein Abbruch: ' + r.text.slice(-300));
  assert.ok(r.dauer >= 4);
  assert.strictEqual(r.zeile.stillstand_s, null);
}));

test('[Stillstand·nicht messbar] Ausgabe in keine Datei: nur die Gesamtgrenze gilt, mit Hinweis', () => mitWegwerf((dir) => {
  const r = lauf(dir, { gesamt: 30, stillstand: 1, befehl: 'echo los; sleep 3; exit 0', inDatei: false });
  assert.strictEqual(r.status, 0, 'kein Abbruch nach 1 s, weil nichts messbar ist: ' + r.text.slice(-300));
  assert.match(r.text, /Stillstand nicht messbar/);
}));

test('[Stillstand·nicht vererbt] die Variable erreicht den Befehl nicht', () => mitWegwerf((dir) => {
  const r = lauf(dir, { gesamt: 30, stillstand: 5, befehl: 'echo "wert=${VD_ZEITGRENZE_STILLSTAND_S:-leer}"' });
  assert.strictEqual(r.status, 0);
  assert.match(r.text, /wert=leer/);
}));
