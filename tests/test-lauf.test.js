'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS): diese Probe startet Hooks und das Platz-Werkzeug
/* ════════════════════════════════════════════════════════════════════════════
   test-lauf.test.js — der Lauf-Helfer (tools/lib/test-lauf.js), Befund TEMP-RESTE-WIEDER (10.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Zusicherungen:
   (1) NODE_OPTIONS wird ERGÄNZT, nicht ersetzt, und der Preload kommt kein zweites Mal hinzu (Auflage 1).
   (2) Jeder Lauf bekommt ein eigenes Laufverzeichnis mit Besitzer-Datei; geräumt wird es in jedem Fall — auch wenn der
       Befehl wirft, auch wenn ein Kind hart beendet wird (das Verzeichnis räumt der Aufrufer, nicht das Kind).
   (3) Über NODE_OPTIONS wird der Preload nur in einem Testprozess wach; ein Werkzeug, das ein Test startet, behält
       sein Verzeichnis (es kann es an den Aufrufer zurückgeben).
   (4) Playwright: der Prozess, der die Konfiguration zuerst lädt, besitzt das Laufverzeichnis; ein geerbtes räumt er nicht.
   (5) Release- und Signierwege laufen ohne den Helfer (Auflage 3): weder sie noch ein Modul, das sie laden, nutzen ihn.
   Jede Probe arbeitet unter einer eigenen Basis, die sie selbst anlegt und räumt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const TL = require('../tools/lib/test-lauf.js');
const T = require('../tools/lib/temp-aufraeumen.js');

const REPO = path.join(__dirname, '..');
const eigeneBasis = () => fs.mkdtempSync(path.join(os.tmpdir(), 'test-lauf-probe-' + process.pid + '-'));

test('[Test-Lauf·NODE_OPTIONS] ergänzt vorhandene Optionen, ersetzt sie nicht, und nimmt den Preload nicht doppelt auf', () => {
  const beide = '--require ' + TL.PRELOAD + ' --require ' + TL.ZEITGRENZE;   // Zeitgrenze seit 23.10.2026 (KLEIN-LAEUFE-UNGEZAEHLT)
  assert.equal(TL.nodeOptionenMitPreload(undefined), beide);
  assert.equal(TL.nodeOptionenMitPreload(''), beide);
  const vorhanden = '--max-old-space-size=4096 --require /irgendwo/anderes.js';
  const ergaenzt = TL.nodeOptionenMitPreload(vorhanden);
  assert.ok(ergaenzt.startsWith(vorhanden + ' '), 'ROT vorher: vorhandene Optionen gingen verloren — ' + ergaenzt);
  assert.ok(ergaenzt.endsWith(beide));
  assert.equal(TL.nodeOptionenMitPreload(ergaenzt), ergaenzt, 'ein zweiter Lauf im Lauf fügt den Preload nicht noch einmal an');
  assert.equal(ergaenzt.split(TL.PRELOAD).length - 1, 1);
  assert.equal(ergaenzt.split(TL.ZEITGRENZE).length - 1, 1);
});

test('[Test-Lauf·Umgebung] eigenes TMPDIR mit Besitzer-Datei, NODE_OPTIONS ergänzt, übrige Umgebung unverändert', () => {
  const basis = eigeneBasis();
  try {
    const lauf = TL.testLauf({ basis, env: { PATH: process.env.PATH, NODE_OPTIONS: '--max-old-space-size=4096', EIGEN: 'x' } });
    assert.equal(path.dirname(lauf.tmpdir), basis);
    assert.ok(path.basename(lauf.tmpdir).startsWith(T.LAUF_PRAEFIX + process.pid + '-'));
    assert.equal(T.besitzerLesen(lauf.tmpdir), process.pid);
    for (const k of ['TMPDIR', 'TMP', 'TEMP', TL.UMGEBUNG_LAUF]) assert.equal(lauf.env[k], lauf.tmpdir, k);
    assert.equal(lauf.env.EIGEN, 'x');
    assert.equal(lauf.env.NODE_OPTIONS, '--max-old-space-size=4096 --require ' + TL.PRELOAD + ' --require ' + TL.ZEITGRENZE);
    lauf.aufraeumen();
    lauf.aufraeumen();
    assert.deepEqual(fs.readdirSync(basis), []);
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});

test('[Test-Lauf·Rot-Beweis] mitTestLauf räumt auch, wenn der Befehl wirft — und reicht den Fehler unverändert weiter', () => {
  const basis = eigeneBasis();
  try {
    let gesehen = null;
    assert.throws(() => TL.mitTestLauf((env) => { gesehen = env.TMPDIR; fs.writeFileSync(path.join(gesehen, 'rest.txt'), 'x'); throw new Error('rot'); }, { basis }), /^Error: rot$/);
    assert.ok(gesehen && !fs.existsSync(gesehen), 'das Laufverzeichnis samt Rest ist fort');
    assert.equal(TL.mitTestLauf(() => 7, { basis }), 7);
    assert.deepEqual(fs.readdirSync(basis), []);
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});

test('[Test-Lauf·CLI·Rot-Beweis] der Exit-Code geht durch, und was ein hart beendetes Kind liegen lässt, ist danach fort', () => {
  const basis = eigeneBasis();
  try {
    const env = { ...process.env, TMPDIR: basis };
    delete env.NODE_OPTIONS;
    delete env[TL.UMGEBUNG_LAUF];
    const helfer = path.join(REPO, 'tools', 'lib', 'test-lauf.js');
    const drei = spawnSync(process.execPath, [helfer, '--', process.execPath, '-e', 'process.exit(3)'], { env, encoding: 'utf8' });
    assert.equal(drei.status, 3, drei.stderr);
    // Das Kind legt unter seinem TMPDIR an und beendet sich selbst mit SIGKILL: kein exit-Handler läuft.
    const kind = "const fs=require('fs'),os=require('os'),path=require('path');"
      + "fs.mkdtempSync(path.join(os.tmpdir(),'hart-beendet-'));process.kill(process.pid,'SIGKILL')";
    const hart = spawnSync(process.execPath, [helfer, '--', process.execPath, '-e', kind], { env, encoding: 'utf8' });
    assert.equal(hart.status, 1, 'ein Signal zählt als 1');
    assert.deepEqual(fs.readdirSync(basis), [], 'ROT vorher: ohne den Helfer bliebe hart-beendet-* im gemeinsamen tmpdir liegen');
    assert.equal(spawnSync(process.execPath, [helfer], { env }).status, 2, 'ohne Befehl: Aufruffehler');
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});

test('[Test-Lauf·Preload·Rot-Beweis] über NODE_OPTIONS wach nur im Testprozess — ein Kind des Tests behält sein Verzeichnis', () => {
  const basis = eigeneBasis();
  try {
    const code = "const fs=require('fs'),os=require('os'),path=require('path');"
      + "fs.mkdtempSync(path.join(os.tmpdir(),'p-'+(process.env.ROLLE)+'-'))";
    const lauf = (zusatz) => {
      const env = { ...process.env, TMPDIR: basis, NODE_OPTIONS: TL.nodeOptionenMitPreload(''), ...zusatz };
      for (const k of ['NODE_TEST_CONTEXT', 'TEST_WORKER_INDEX', 'VD_TEMP_AUFRAEUMEN_AKTIV']) if (!(k in zusatz)) delete env[k];
      const r = spawnSync(process.execPath, ['-e', code], { env, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
    };
    lauf({ ROLLE: 'testdatei', NODE_TEST_CONTEXT: 'child-v8' });
    lauf({ ROLLE: 'worker', TEST_WORKER_INDEX: '0' });
    assert.deepEqual(fs.readdirSync(basis), [], 'Testdatei und Playwright-Worker räumen beim Ende');
    lauf({ ROLLE: 'werkzeug' });
    lauf({ ROLLE: 'kind', NODE_TEST_CONTEXT: 'child-v8', VD_TEMP_AUFRAEUMEN_AKTIV: '12345' });
    assert.deepEqual(fs.readdirSync(basis).map((n) => n.replace(/-[^-]+$/, '')).sort(), ['p-kind', 'p-werkzeug'],
      'ROT, wenn der Preload über NODE_OPTIONS überall wach wäre: ein Werkzeug, das sein Verzeichnis zurückgibt, verlöre es');
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});

test('[Test-Lauf·Playwright] wer zuerst lädt, besitzt das Laufverzeichnis; ein geerbtes wird nicht geräumt', () => {
  const basis = eigeneBasis();
  try {
    const env = {};
    const erst = TL.playwrightLaufBeginnen({ basis, env });
    assert.equal(erst.neu, true);
    assert.equal(env.TMPDIR, erst.tmpdir);
    assert.ok(env.NODE_OPTIONS.includes(TL.PRELOAD));
    const worker = { ...env };
    assert.deepEqual(TL.playwrightLaufBeginnen({ basis, env: worker, pid: process.pid + 1 }), { tmpdir: erst.tmpdir, neu: false });
    assert.equal(TL.playwrightLaufBeenden({ env: worker, pid: process.pid + 1 }), false, 'ein Worker räumt nicht');
    assert.ok(fs.existsSync(erst.tmpdir));
    assert.equal(TL.playwrightLaufBeenden({ env }), true);
    assert.ok(!fs.existsSync(erst.tmpdir));
  } finally { fs.rmSync(basis, { recursive: true, force: true }); }
});

test('[Test-Lauf·Playwright·Anker] jede Playwright-Konfiguration setzt das Laufverzeichnis beim Laden und räumt es im globalTeardown', () => {
  const konfigs = fs.readdirSync(REPO).filter((n) => /^playwright\.config(\.[\w-]+)?\.js$/.test(n));
  assert.ok(konfigs.length >= 4, 'Vorbedingung: die Konfigurationen sind gefunden — ' + konfigs.join(', '));
  for (const k of konfigs) {
    const text = fs.readFileSync(path.join(REPO, k), 'utf8');
    assert.match(text, /require\('\.\/tools\/lib\/test-lauf\.js'\)\.playwrightLaufBeginnen\(\);/, k);
    assert.match(text, /globalTeardown: require\.resolve\('\.\/tests\/e2e\/global-teardown\.js'\)/, k);
    assert.ok(text.indexOf('playwrightLaufBeginnen') < text.indexOf('defineConfig({'), k + ': beim Laden, vor der Konfiguration');
  }
});

/* ── (5) Release- und Signierwege ohne den Helfer (Auflage 3) ─────────────────────────────────────────────────────────
   Die Klasse nach Namen, nicht als Liste: Auslieferung, Release, Signieren, Schlüsselbund, Enclave, Zeremonie, Treuhand,
   Passphrase, Token — dazu jedes Werkzeug, das ein Zugangs-Token aus der Umgebung liest. Geprüft wird statisch: die Datei und jedes Modul, das sie über einen relativen Pfad lädt, nennen den
   Helfer nicht und setzen weder dessen Umgebungsvariable noch NODE_OPTIONS. Gelesen wird nur Code, nie Schlüsselmaterial. */
const SIGNIERWEG = /(^|[-/])(release|ausliefern|auslieferung-je-version|signier\w*|schluesselbund\w*|enclave\w*|zeremonie\w*|treuhand\w*|passphrase\w*|token\w*)([-.])/;
const TOKEN_LESER = /process\.env\.[A-Z_]*TOKEN\b/;
function signierwege() {
  const aus = [];
  const gehe = (rel) => {
    for (const e of fs.readdirSync(path.join(REPO, rel), { withFileTypes: true })) {
      const r = rel + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) gehe(r); continue; }
      if (!/\.(c?js|mjs)$/.test(e.name) || /\.test\.(c?js|mjs)$/.test(e.name)) continue;
      // Nach Namen, oder weil die Datei ein Zugangs-Token aus der Umgebung liest (nur der Name der Variable zählt, kein Wert).
      if (SIGNIERWEG.test(r.slice(rel.length)) || TOKEN_LESER.test(fs.readFileSync(path.join(REPO, r), 'utf8'))) aus.push(r);
    }
  };
  gehe('tools');
  return aus.filter((r) => !/token-abgleich/.test(r)).sort(); // Design-Token sind keine Zugangs-Token
}
function relativeLader(rel) {
  const text = fs.readFileSync(path.join(REPO, rel), 'utf8');
  const raus = [];
  for (const m of text.matchAll(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
    let ziel = path.join(path.dirname(rel), m[1]);
    if (!/\.(c?js|mjs|json)$/.test(ziel)) ziel += '.js';
    if (/\.(c?js|mjs)$/.test(ziel) && fs.existsSync(path.join(REPO, ziel))) raus.push(ziel.split(path.sep).join('/'));
  }
  return raus;
}
const NUTZT_HELFER = /test-lauf|VD_TEST_LAUF|NODE_OPTIONS|playwrightLaufBeginnen|mitTestLauf/;

test('[Test-Lauf·Signierwege] Release-, Auslieferungs-, Signier-, Schlüsselbund- und Token-Wege laden den Helfer nicht, auch nicht über ein geladenes Modul', () => {
  const wege = signierwege();
  // Die Vorbedingung nennt nur Signierwege, die auch im öffentlichen Zuschnitt liegen; die zurückgehaltenen (Schicht 2) erfasst die Klasse im Kanon trotzdem.
  for (const erwartet of ['tools/lib/schluesselbund.js', 'tools/basistemplate-neu-signieren.js', 'tools/oeffentlich-tag-signieren.js']) {
    assert.ok(wege.includes(erwartet), 'Vorbedingung: die Klasse trifft ' + erwartet + ' — gefunden: ' + wege.join(', '));
  }
  assert.ok(wege.length >= 6, 'Vorbedingung: die Klasse ist besetzt (' + wege.length + ')');
  const funde = [];
  for (const start of wege) {
    const gesehen = new Set();
    const offen = [start];
    while (offen.length) {
      const rel = offen.pop();
      if (gesehen.has(rel)) continue;
      gesehen.add(rel);
      if (rel !== start && /\/test-lauf\.js$/.test(rel)) { funde.push(start + ' lädt ' + rel); continue; }
      if (NUTZT_HELFER.test(fs.readFileSync(path.join(REPO, rel), 'utf8'))) funde.push(start + (rel === start ? '' : ' über ' + rel) + ' nennt den Helfer oder NODE_OPTIONS');
      if (gesehen.size < 400) offen.push(...relativeLader(rel));
    }
  }
  assert.deepEqual(funde, [], 'ein Release- oder Signierweg bekäme ein fremdes TMPDIR oder einen fremden --require');
});

test('[Test-Lauf·Signierwege·Rot-Beweis] dieselbe Prüfung findet einen Signierweg, der den Helfer lädt', () => {
  assert.ok(NUTZT_HELFER.test("const { mitTestLauf } = require('./lib/test-lauf.js');"));
  assert.ok(NUTZT_HELFER.test('env.NODE_OPTIONS = x'));
  assert.ok(!NUTZT_HELFER.test("const { spawnSync } = require('node:child_process');"));
  assert.ok(SIGNIERWEG.test('/release-probe.js') && SIGNIERWEG.test('/lib/schluesselbund-probe.js') && SIGNIERWEG.test('/probe-signieren.js'));
  assert.ok(!SIGNIERWEG.test('/landung-vorbereiten.js') && !SIGNIERWEG.test('/pruefen.js'));
});
