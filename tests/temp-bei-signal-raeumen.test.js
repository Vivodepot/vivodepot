'use strict';
/* ════════════════════════════════════════════════════════════════════════
   tools/lib/temp-bei-signal-raeumen.js: ein vorgemerkter Ordner geht beim Prozessende, auch per Signal (02.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund: Temp-Familien (kvf, kvf-gl, klv-kern, inhaltsabgleich, konfektion-nativ-probe, zugkopf,
   produkt-html-*) blieben im TMPDIR liegen — bei einem Abbruch per SIGTERM/SIGINT/SIGHUP (Node endet ohne
   'exit', ein finally läuft nicht) und, bei Proben ohne eigenes Aufräumen, bei jedem Lauf ohne Preload.
   Gehalten wird an einem Kindprozess: normales Ende räumt; jedes der drei Signale räumt, und der Prozess
   endet an genau diesem Signal; ein freigegebener Ordner bleibt; hat der Prozess einen eigenen Hörer, entscheidet
   der (der Helfer beendet ihn nicht). Den Wächter über alle Proben führt der Befund TEMP-LECK-TESTS (Plattenschutz der Suite).
   TEMP_BEI_SIGNAL_PATH lenkt den Helfer um (Rot-Beweis).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HELFER = process.env.TEMP_BEI_SIGNAL_PATH || path.join(__dirname, '..', 'tools', 'lib', 'temp-bei-signal-raeumen.js');

// art: 'ende' (normal), 'warten' (bis Signal), 'frei' (freigeben, dann Ende), 'eigen' (eigener Hörer, wartet)
const KIND = [
  "const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');",
  "const [helfer, art] = process.argv.slice(1);",
  "const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'temp-signal-probe-'));",
  "const frei = require(helfer).beimEndeRaeumen(ordner);",
  "process.stdout.write(ordner + '\\n');",
  "if (art === 'frei') frei();",
  "if (art === 'eigen') process.on('SIGTERM', () => { process.stdout.write('eigen\\n'); setTimeout(() => process.exit(7), 50); });",
  "if (art === 'warten' || art === 'eigen') setInterval(() => {}, 1000);",
].join('\n');

function kind(art, signal) {
  return new Promise((fertig, fehler) => {
    const umgebung = { ...process.env };
    delete umgebung.NODE_OPTIONS;   // ohne das Netz des Testprozesses: geprüft wird der Helfer allein
    const k = spawn(process.execPath, ['-e', KIND, HELFER, art], { env: umgebung, stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = '';
    let err = '';
    let ordner = null;
    k.stdout.on('data', (d) => {
      aus += d;
      if (!ordner && aus.includes('\n')) { ordner = aus.split('\n')[0].trim(); if (signal) k.kill(signal); }
    });
    k.stderr.on('data', (d) => { err += d; });
    k.on('error', fehler);
    k.on('exit', (code, sig) => fertig({ ordner, code, sig, aus, err }));
  });
}
const pruefenUndRaeumen = (ordner) => { const da = fs.existsSync(ordner); if (da) fs.rmSync(ordner, { recursive: true, force: true }); return da; };

test('[Temp·Signal·Helfer] normales Ende: der vorgemerkte Ordner ist weg', async () => {
  const r = await kind('ende');
  assert.ok(r.ordner, 'Vorbedingung: Ordner genannt. stderr: ' + r.err.slice(0, 300));
  assert.equal(r.code, 0);
  assert.equal(pruefenUndRaeumen(r.ordner), false, 'der Ordner liegt nach normalem Ende noch: ' + r.ordner);
});

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  test('[Temp·Signal·Helfer] ' + signal + ': der Ordner ist weg, der Prozess endet am Signal', async () => {
    const r = await kind('warten', signal);
    assert.ok(r.ordner, 'Vorbedingung: Ordner genannt. stderr: ' + r.err.slice(0, 300));
    assert.equal(r.sig, signal, 'der Prozess endet weiter an ' + signal + ' (code ' + r.code + ')');
    assert.equal(pruefenUndRaeumen(r.ordner), false, 'nach ' + signal + ' liegt der Ordner noch: ' + r.ordner);
  });
}

test('[Temp·Signal·Helfer] ein freigegebener Ordner bleibt stehen', async () => {
  const r = await kind('frei');
  assert.ok(r.ordner);
  assert.equal(pruefenUndRaeumen(r.ordner), true, 'der freigegebene Ordner wurde trotzdem geräumt');
});

test('[Temp·Signal·Helfer] mit eigenem Hörer entscheidet der Prozess: der Helfer räumt, beendet aber nicht selbst', async () => {
  const r = await kind('eigen', 'SIGTERM');
  assert.ok(r.ordner);
  assert.match(r.aus, /eigen/, 'der eigene Hörer lief');
  assert.equal(r.code, 7, 'der Prozess endet über seinen eigenen Hörer (exit 7), nicht am neu ausgelösten Signal (sig ' + r.sig + ')');
  assert.equal(pruefenUndRaeumen(r.ordner), false, 'der Ordner liegt noch: ' + r.ordner);
});
