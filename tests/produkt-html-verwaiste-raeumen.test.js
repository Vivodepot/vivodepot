'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Verwaiste Produkt-Ordner toter Läufe räumt der nächste Lauf (07.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Befund: am 07.11.2026 lagen 1000 Ordner produkt-html-{privat,pro}-{de,en}-* mit 5,6 GB im TMPDIR. SIGTERM, SIGINT und
   SIGHUP räumt tests/produkt-html-erzeugen.js selbst (tests/produkt-html-temp-signal.test.js); SIGKILL lässt sich nicht
   abfangen, und genau so endet ein Überzeit-Abbruch über suite-platz (SIGTERM, nach 2 s SIGKILL).
   Gehalten wird:
     - Ein Kindprozess legt seinen Ordner an und wird per SIGKILL beendet. Der Ordner bleibt liegen (Rot-Beweis: ohne das
       Räumen beim nächsten Start bliebe er für immer), und der nächste Lauf räumt ihn.
     - Geräumt wird nur das eigene Muster mit der PID eines toten Laufs: Ordner lebender Läufe, der eigene, ältere Ordner
       ohne PID und fremde Namen bleiben stehen.
   Alles läuft in einem eigenen Wurzelordner statt im gemeinsamen TMPDIR, damit parallele Läufe nichts sehen.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const HELFER = path.join(__dirname, 'produkt-html-erzeugen.js');
const P = require(HELFER);

function wurzel(t) {
  const w = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-phtml-verwaist-'));
  t.after(() => fs.rmSync(w, { recursive: true, force: true }));
  return w;
}
/* Eine PID, die sicher nicht mehr lebt: ein Kind, das schon geendet hat. */
function totePid() {
  const r = spawnSync(process.execPath, ['-e', ''], { stdio: 'ignore' });
  return r.pid;
}
const ordner = (w, name) => { fs.mkdirSync(path.join(w, name)); return name; };

test('[Verwaist] SIGKILL lässt den Ordner liegen (Rot-Beweis); der nächste Lauf räumt ihn', async (t) => {
  const w = wurzel(t);
  const kind = spawn(process.execPath, ['-e',
    'const P = require(' + JSON.stringify(HELFER) + ');'
    + 'P._ordnerAnlegen("privat-de", ' + JSON.stringify(w) + ');'
    + 'process.stdout.write("bereit\\n"); setInterval(() => {}, 1000);'], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    kind.stdout.on('data', (d) => { if (String(d).includes('bereit')) resolve(); });
    kind.on('exit', () => reject(new Error('Kind endete vor dem Anlegen')));
  });
  const vorher = fs.readdirSync(w);
  assert.equal(vorher.length, 1, 'das Kind hat genau einen Ordner angelegt');
  assert.match(vorher[0], P.VERWAIST_MUSTER, 'der Ordner trägt die PID im Namen');
  assert.equal(P.VERWAIST_MUSTER.exec(vorher[0])[1], String(kind.pid));

  await new Promise((resolve) => { kind.on('exit', resolve); kind.kill('SIGKILL'); });
  assert.deepEqual(fs.readdirSync(w), vorher,
    'Rot-Beweis: nach SIGKILL liegt der Ordner noch — ohne Räumen beim nächsten Start bliebe er liegen');

  const geraeumt = P.verwaisteRaeumen({ tmp: w });
  assert.deepEqual(geraeumt, vorher);
  assert.deepEqual(fs.readdirSync(w), [], 'der nächste Lauf hat den verwaisten Ordner geräumt');
});

test('[Verwaist] nur das eigene Muster eines toten Laufs wird geräumt', (t) => {
  const w = wurzel(t);
  const tot = totePid();
  const weg = ordner(w, 'produkt-html-pro-en-p' + tot + '-AbC12x');
  const lebend = ordner(w, 'produkt-html-privat-de-p' + process.ppid + '-QwErT1');
  const eigen = ordner(w, 'produkt-html-pro-de-p' + process.pid + '-ZxCvB2');
  const ohnePid = ordner(w, 'produkt-html-privat-en-AbCdE3');
  const fremd = ordner(w, 'produkt-html-lang-p' + tot + '-AbCdE4');
  const anders = ordner(w, 'etwas-p' + tot + '-AbCdE5');

  assert.deepEqual(P.verwaisteRaeumen({ tmp: w }), [weg]);
  assert.deepEqual(fs.readdirSync(w).sort(), [lebend, eigen, ohnePid, fremd, anders].sort());
});

test('[Verwaist·Gegenprobe] lebt die PID, bleibt der Ordner — die Prüfung der PID trägt das Räumen', (t) => {
  const w = wurzel(t);
  const name = ordner(w, 'produkt-html-privat-de-p' + totePid() + '-AbC12x');
  assert.deepEqual(P.verwaisteRaeumen({ tmp: w, lebt: () => true }), []);
  assert.deepEqual(fs.readdirSync(w), [name]);
  assert.deepEqual(P.verwaisteRaeumen({ tmp: w, lebt: () => false }), [name]);
});

test('[Verwaist] fehlt der Wurzelordner, endet das Räumen still', () => {
  assert.deepEqual(P.verwaisteRaeumen({ tmp: path.join(os.tmpdir(), 'vd-gibt-es-nicht-' + process.pid) }), []);
});

/* Klasse: jede Stelle im Repo, die einen Ordner produkt-html-* anlegt, trägt die PID im Namen. Sonst räumt sie nach SIGKILL
   niemand, denn Ordner ohne PID fasst das Räumen nicht an. Gelesen werden tools/, tests/ und scripts/. */
function stellenOhnePid(dateien) {
  const raus = [];
  for (const [datei, text] of dateien) {
    text.split('\n').forEach((z, i) => {
      if (/mkdtemp(?:Sync)?\(/.test(z) && /['"]produkt-html-/.test(z) && !/'-p' \+ process\.pid \+ '-'/.test(z)) raus.push(datei + ':' + (i + 1));
    });
  }
  return raus;
}
test('[Verwaist·Klasse] jeder Ordner produkt-html-* im Repo trägt die PID des Prozesses', () => {
  const wurzelRepo = path.join(__dirname, '..');
  const dateien = [];
  for (const d of ['tools', 'tests', 'scripts']) {
    let namen = [];
    try { namen = fs.readdirSync(path.join(wurzelRepo, d), { withFileTypes: true }); } catch (_) { continue; }
    // Diese Datei selbst nicht: ihr Rot-Beweis trägt absichtlich eine Stelle ohne PID.
    for (const e of namen) {
      const voll = path.join(wurzelRepo, d, e.name);
      if (e.isFile() && e.name.endsWith('.js') && voll !== __filename) dateien.push([d + '/' + e.name, fs.readFileSync(voll, 'utf8')]);
    }
  }
  assert.ok(dateien.some(([d]) => d === 'tests/produkt-html-erzeugen.js'), 'Nicht-leer-Wache: der Helfer ist unter den gelesenen Dateien');
  assert.deepEqual(stellenOhnePid(dateien), []);
});
test('[Verwaist·Klasse·Rot-Beweis] eine Stelle ohne PID fällt auf, eine mit PID nicht', () => {
  const ohne = "const z = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-html-' + slug + '-'));";
  const mit = "const z = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-html-' + slug + '-p' + process.pid + '-'));";
  assert.deepEqual(stellenOhnePid([['x.js', ohne], ['y.js', mit]]), ['x.js:1']);
});
