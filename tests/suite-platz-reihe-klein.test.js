'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS); in derselben Zeile, damit keine Zeilennummer wandert
/* Befund (MITTEL, 07.11.2026): die Vorrang-Marke (`--reihe`) ordnete die Klein-Schlange nicht. Der Zug fuhr seinen
   vor-pre-commit im Klein-Platz und wartete hinter älteren Klein-Tickets fremder Bäume. Jetzt steht ein Klein-Ticket aus dem Baum
   der gültigen Marke vor allen außer pre-push (REIHE_KLEIN_STUFE in tools/lib/suite-platz.js). Echte, schlafende Prozesse als
   Halter und Wartende. Der Rot-Beweis lädt dieselbe Bibliothek im Speicher mit abgeschalteter Stufe. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { spawn } = require('node:child_process');

const LIB = require.resolve('../tools/lib/suite-platz.js');
const sp = require(LIB);

/* Die Bibliothek ohne die neue Stufe: REIHE_KLEIN_STUFE = Infinity heißt „der markierte Baum zählt in der Klein-Schlange nicht“,
   also das Verhalten vor dem Fix. Kompiliert unter dem echten Dateinamen, damit die relativen require auflösen; nichts wird
   geschrieben. */
function libOhneFix() {
  const quelle = fs.readFileSync(LIB, 'utf8');
  const alt = quelle.replace('const REIHE_KLEIN_STUFE = 0.25;', 'const REIHE_KLEIN_STUFE = Infinity;');
  assert.notEqual(alt, quelle, 'die Stufe steht nicht mehr in der Bibliothek');
  const m = new Module(LIB, module);
  m.filename = LIB;
  m.paths = Module._nodeModulePaths(path.dirname(LIB));
  m._compile(alt, LIB);
  return m.exports;
}

const schlaefer = () => spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });

function aufbau(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-platz-reihe-klein-'));
  const baumDran = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'baum-dran-')));
  const baumAnders = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'baum-anders-')));
  const prozesse = [];
  t.after(() => { for (const x of prozesse) x.kill(); for (const d of [dir, baumDran, baumAnders]) fs.rmSync(d, { recursive: true, force: true }); });
  const p = () => { const x = schlaefer(); prozesse.push(x); return x.pid; };
  const kd = path.join(dir, 'klein');
  return { dir, kd, baumDran, baumAnders, p };
}
function markeSchreiben(a) {
  fs.writeFileSync(path.join(a.dir, 'reihe'), JSON.stringify({ baum: a.baumDran, gesetztAm: new Date().toISOString() }) + '\n');
}
const ticket = (lib, a, name, pid, cwd) => lib.ticketZiehen({ name, pid, dir: a.kd, cwd });
const holen = (lib, a, name, pid, cwd, extra = {}) => lib.kleinPlatzHolen({ name, pid, dir: a.dir, n: 1, env: {}, cwd, ...extra });

/* Ein älteres fremdes Klein-Ticket, danach ein Ticket des Zugs (Name fest „vor-pre-commit“, wie im Pick). Ein Klein-Platz frei. */
function szenario(lib, t, { marke = true } = {}) {
  const a = aufbau(t);
  if (marke) markeSchreiben(a);
  const fremdPid = a.p();
  const fremd = ticket(lib, a, 'wagen-proben', fremdPid, a.baumAnders);
  const zugPid = a.p();
  const zug = ticket(lib, a, 'vor-pre-commit', zugPid, a.baumDran);
  return {
    a,
    fremd: () => holen(lib, a, 'wagen-proben', fremdPid, a.baumAnders, { ticket: fremd }).geholt,
    zug: () => holen(lib, a, 'vor-pre-commit', zugPid, a.baumDran, { ticket: zug }).geholt,
  };
}

test('[Reihe·Klein] mit gültiger Marke nimmt der Zug den Klein-Platz vor einem älteren fremden Ticket', (t) => {
  const s = szenario(sp, t);
  assert.equal(s.fremd(), false, 'das ältere fremde Ticket wartet hinter dem markierten Baum');
  assert.equal(s.zug(), true, 'das Ticket aus dem markierten Baum bekommt den Platz');
});

test('[Reihe·Klein·Rot-Beweis] ohne die Stufe wartet der Zug hinter dem älteren fremden Ticket', (t) => {
  const s = szenario(libOhneFix(), t);
  assert.equal(s.zug(), false, 'vor dem Fix: der Zug stand hinter dem älteren Ticket');
  assert.equal(s.fremd(), true);
});

test('[Reihe·Klein·ohne Marke] ohne Marke bleibt die Ankunft: das ältere Ticket zuerst', (t) => {
  const s = szenario(sp, t, { marke: false });
  assert.equal(s.zug(), false);
  assert.equal(s.fremd(), true);
});

function ohneTicket(lib, t) {
  const a = aufbau(t);
  markeSchreiben(a);
  ticket(lib, a, 'wagen-proben', a.p(), a.baumAnders);
  return holen(lib, a, 'vor-pre-commit', a.p(), a.baumDran).geholt;
}
test('[Reihe·Klein·ohne Ticket] auch ohne eigenes Ticket steht der markierte Baum vor fremden Tickets', (t) => {
  assert.equal(ohneTicket(sp, t), true);
  assert.equal(ohneTicket(libOhneFix(), t), false, 'Rot-Beweis: ohne die Stufe stand er hinter allen');
});

test('[Reihe·Klein·pre-push bleibt vorn] ein wartender pre-push steht weiter vor dem markierten Baum', (t) => {
  const a = aufbau(t);
  markeSchreiben(a);
  const pushPid = a.p();
  const push = ticket(sp, a, 'pre-push', pushPid, a.baumAnders);
  const zugPid = a.p();
  const zug = ticket(sp, a, 'vor-pre-commit', zugPid, a.baumDran);
  assert.equal(holen(sp, a, 'vor-pre-commit', zugPid, a.baumDran, { ticket: zug }).geholt, false);
  assert.equal(holen(sp, a, 'pre-push', pushPid, a.baumAnders, { ticket: push }).geholt, true);
});

test('[Reihe·Klein·Marke verwaist] eine ungültige Marke gibt keinen Vorrang', (t) => {
  const a = aufbau(t);
  fs.writeFileSync(path.join(a.dir, 'reihe'), JSON.stringify({ baum: a.baumDran, gesetztAm: '2000-01-01T00:00:00.000Z' }) + '\n');
  const fremdPid = a.p();
  const fremd = ticket(sp, a, 'wagen-proben', fremdPid, a.baumAnders);
  const zugPid = a.p();
  const zug = ticket(sp, a, 'vor-pre-commit', zugPid, a.baumDran);
  assert.equal(holen(sp, a, 'vor-pre-commit', zugPid, a.baumDran, { ticket: zug }).geholt, false);
  assert.equal(holen(sp, a, 'wagen-proben', fremdPid, a.baumAnders, { ticket: fremd }).geholt, true);
});
