'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Das gebaute Produkt bleibt nicht liegen, wenn ein Lauf per Signal endet (02.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund: im TMPDIR lagen in wenigen Tagen rund 16.000 Ordner produkt-html-{privat,pro}-{de,en}-*.
   Ein normaler Lauf räumt sie weg (process 'exit' in tests/produkt-html-erzeugen.js). Endet ein Lauf
   aber per SIGTERM, SIGINT oder SIGHUP (Zeitgrenze der Wagenstufe, Abbruch über suite-platz, ein
   abgebrochener Air-Lauf), beendet Node den Prozess ohne 'exit' — der Ordner blieb.
   Gehalten wird: ein Kindprozess baut das Produkt, wird per Signal beendet; danach ist der Ordner weg,
   und der Prozess endet weiter an genau diesem Signal (das Aufräumen schluckt es nicht).
   SIGKILL lässt sich nicht abfangen; was dabei liegen bleibt, räumt das allgemeine Aufräumen.
   PRODUKT_HTML_ERZEUGEN_PATH lenkt den Helfer um (Rot-Beweis gegen die Fassung nur mit 'exit').
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HELFER = process.env.PRODUKT_HTML_ERZEUGEN_PATH || path.join(__dirname, 'produkt-html-erzeugen.js');

// Das Kind baut das Produkt, nennt den Ordner, den der Helfer angelegt hat, und wartet.
const KIND = [
  "const path = require('node:path');",
  'const datei = require(process.argv[1]).produktHtml(process.argv[2]);',
  "process.stdout.write(path.dirname(path.dirname(datei)) + '\\n');",
  'setInterval(() => {}, 1000);',
].join('\n');

function kindBauenUndBeenden(signal) {
  return new Promise((fertig, fehler) => {
    const umgebung = { ...process.env };
    delete umgebung.NODE_OPTIONS;   // ohne das Netz des Testprozesses: geprüft wird der Helfer allein
    const k = spawn(process.execPath, ['-e', KIND, HELFER, 'privat-de'], { env: umgebung, stdio: ['ignore', 'pipe', 'pipe'] });
    let aus = '';
    let err = '';
    let ordner = null;
    k.stdout.on('data', (d) => {
      aus += d;
      if (!ordner && aus.includes('\n')) { ordner = aus.split('\n')[0].trim(); k.kill(signal); }
    });
    k.stderr.on('data', (d) => { err += d; });
    k.on('error', fehler);
    k.on('exit', (code, sig) => fertig({ ordner, code, sig, err }));
  });
}

for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  test('[Produkt-HTML·Temp·Signal] ' + signal + ': der Ordner des gebauten Produkts ist danach weg, der Prozess endet am Signal', async () => {
    const r = await kindBauenUndBeenden(signal);
    assert.ok(r.ordner, 'Vorbedingung: das Kind hat das Produkt gebaut und seinen Ordner genannt. stderr: ' + r.err.slice(0, 400));
    assert.match(path.basename(r.ordner), /^produkt-html-privat-de-/, 'Vorbedingung: es ist der Ordner des Helfers');
    assert.equal(r.sig, signal, 'der Prozess endet weiter an ' + signal + ' (code ' + r.code + ')');
    const bleibt = fs.existsSync(r.ordner);
    if (bleibt) fs.rmSync(r.ordner, { recursive: true, force: true });   // die Probe selbst lässt nichts liegen
    assert.equal(bleibt, false, 'nach ' + signal + ' liegt der Ordner noch: ' + r.ordner);
  });
}
