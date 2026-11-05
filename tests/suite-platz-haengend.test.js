'use strict';
/* HÄNGENDE PLÄTZE (26.10.2026, Werkzeug-Zug 2, Posten 1). Bis hierher räumte die Platzvergabe nur tote Halter.
   Ein Halter, der lebt, aber nichts mehr tut (eine Sitzung, die nach einem Kontowechsel oder Abbruch in einem Warten hängt), hielt
   seinen Platz, bis jemand ihn von Hand beendete. Jetzt gilt: Hat der ganze Prozessbaum eines Halters über die Frist (Vorgabe
   600 s) zusammen weniger CPU verbraucht als die Schwelle und keinen Prozess gewechselt, wird er laut beendet, mit Zeile im
   Protokoll, und der Platz ist frei. Ausgenommen: ein Halter, dessen Baum selbst mit einem Ticket wartet (--warten), und ein
   Halter, dessen Sitzung den Air-Platz hält oder auf ihn wartet (der Lauf wartet auf GitHub).
   Die Probe arbeitet in eigenen Temp-Verzeichnissen und fährt Frist und Schwelle über die Umgebung klein. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sp = require('../tools/lib/suite-platz.js');
const { ohnePlatzUmgebung } = require('../tools/lib/ohne-platz-umgebung.js');
require('./helfer/platz-isoliert.js').platzIsolieren();

const neuesVerzeichnis = () => fs.mkdtempSync(path.join(os.tmpdir(), 'suite-platz-haengend-'));
// Frist 1 s, Schwelle 0,3 CPU-Sekunden: ein schlafender Halter bleibt darunter, ein rechnender liegt in 1,5 s weit darüber.
const env = { ...ohnePlatzUmgebung(), VD_SUITE_PLATZ_GEHALTEN: '', VD_SUITE_PLATZ_HAENGT_S: '1', VD_SUITE_PLATZ_HAENGT_CPU_S: '0.3' };
/* Halter als Enkel über eine kurzlebige Shell: sie sind keine Kinder der Probe, init räumt sie nach dem Beenden ab (ein Kind der
   Probe bliebe als Zombie „lebend“, solange die Probe es nicht abholt — echte Halter sind nie Kinder des Prüfenden). */
const losgeloest = (code) => ({ pid: Number(execFileSync('sh', ['-c', `"${process.execPath}" -e '${code}' >/dev/null 2>&1 & echo $!`], { encoding: 'utf8' }).trim()),
  kill(sig) { try { process.kill(this.pid, sig); } catch (_) { /* schon weg */ } } });
const schlaefer = () => losgeloest('setTimeout(() => {}, 60000)');
const rechner = () => losgeloest('const e = Date.now() + 60000; while (Date.now() < e) {}');
const warten = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const lebt = (p) => { try { process.kill(p.pid, 0); return true; } catch (_) { return false; } };
function eintragen(dir, k, p, name) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'platz-' + k + '.lock'),
    JSON.stringify({ pid: p.pid, name, cwd: '/baum/' + name, host: os.hostname(), gestartetAm: new Date().toISOString() }));
}
const protokoll = (dir) => { try { return fs.readFileSync(path.join(dir, sp.HAENGEND_PROTOKOLL), 'utf8').trim().split('\n').map(JSON.parse); } catch (_) { return []; } };

test('[Platz·Hängend·Rot-Beweis] ein schlafender Halter verliert den Platz nach der Frist, ein rechnender behält ihn', () => {
  const dir = neuesVerzeichnis();
  const a = schlaefer(); const b = rechner();
  try {
    eintragen(dir, 1, a, 'schlaeft'); eintragen(dir, 2, b, 'rechnet');
    warten(300);   // beide sind gestartet
    const r0 = sp.platzHolen({ name: 'neu', pid: process.pid, dir, n: 2, env });
    assert.equal(r0.geholt, false, 'beim ersten Blick sind beide Plätze belegt (Messbeginn)');
    warten(1500);
    const r = sp.platzHolen({ name: 'neu', pid: process.pid, dir, n: 2, env });
    assert.equal(r.geholt, true, 'der Platz des schlafenden Halters ist frei');
    assert.equal(r.platz, 1);
    assert.deepEqual((r.geraeumt || []).map((g) => [g.name, g.grund]), [['schlaeft', 'haengend']]);
    warten(300);
    assert.equal(lebt(a), false, 'der schlafende Halter ist beendet');
    assert.equal(lebt(b), true, 'der rechnende läuft weiter');
    const z = protokoll(dir);
    assert.equal(z.length, 1, 'eine Zeile im Protokoll');
    assert.equal(z[0].name, 'schlaeft'); assert.equal(z[0].pid, a.pid);
    assert.ok(z[0].cpuS < 0.3 && z[0].stilleS >= 1, 'die Zeile nennt CPU und Dauer der Stille');
  } finally { a.kill('SIGKILL'); b.kill('SIGKILL'); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Platz·Hängend·Klein] auch ein schlafender Klein-Halter verliert seinen Klein-Platz', () => {
  const dir = neuesVerzeichnis();
  const a = schlaefer();
  try {
    eintragen(sp.kleinVerzeichnis(dir), 1, a, 'klein-schlaeft');
    warten(300);
    assert.equal(sp.kleinPlatzHolen({ name: 'neu', pid: process.pid, dir, n: 1, env }).geholt, false);
    warten(1500);
    const r = sp.kleinPlatzHolen({ name: 'neu', pid: process.pid, dir, n: 1, env });
    assert.equal(r.geholt, true);
    warten(300);
    assert.equal(lebt(a), false);
    assert.equal(protokoll(sp.kleinVerzeichnis(dir)).length, 1);
  } finally { a.kill('SIGKILL'); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Platz·Hängend·Ausnahme] wer mit Ticket wartet oder dessen Sitzung am Air-Platz hängt, behält den Platz', () => {
  const dir = neuesVerzeichnis();
  const a = schlaefer(); const b = schlaefer(); const air = schlaefer();
  try {
    eintragen(dir, 1, a, 'wartet-mit-ticket'); eintragen(dir, 2, b, 'wartet-auf-air');
    // a wartet selbst in einer Schlange (hier der Klein-Schlange) — --warten.
    sp.ticketZiehen({ name: 'wartet-mit-ticket', pid: a.pid, dir: sp.kleinVerzeichnis(dir), cwd: '/baum/wartet-mit-ticket' });
    // Die Sitzung von b (gleiche cwd, dieser Rechner) hält den Air-Platz: ihr Lauf wartet auf GitHub.
    fs.mkdirSync(sp.airVerzeichnis(dir), { recursive: true });
    fs.writeFileSync(path.join(sp.airVerzeichnis(dir), 'platz-1.lock'),
      JSON.stringify({ pid: air.pid, name: 'air', cwd: '/baum/wartet-auf-air', host: os.hostname(), gestartetAm: new Date().toISOString() }));
    warten(300);
    sp.platzHolen({ name: 'neu', pid: process.pid, dir, n: 2, env });
    warten(1500);
    const r = sp.platzHolen({ name: 'neu', pid: process.pid, dir, n: 2, env });
    assert.equal(r.geholt, false, 'beide behalten ihren Platz');
    assert.equal(lebt(a), true); assert.equal(lebt(b), true);
    assert.equal(protokoll(dir).length, 0);
  } finally { for (const p of [a, b, air]) p.kill('SIGKILL'); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Platz·Hängend·Vorfahr] ein Halter, der Vorfahr des Prüfenden ist, wird nie beendet', () => {
  const dir = neuesVerzeichnis();
  try {
    // Der Elternprozess dieser Probe hält den Platz (wie ein Hook, aus dem heraus geprüft wird).
    fs.writeFileSync(path.join(dir, 'platz-1.lock'),
      JSON.stringify({ pid: process.ppid, name: 'vorfahr', cwd: '/baum/vorfahr', host: os.hostname(), gestartetAm: new Date().toISOString() }));
    const jetzt = Date.now();
    const ps = `${process.ppid} 1 0:00.00\n${process.pid} ${process.ppid} 0:00.00\n`;
    sp.haengendRaeumen({ dir, n: 1, env, jetzt, psText: ps });
    const r = sp.haengendRaeumen({ dir, n: 1, env, jetzt: jetzt + 5000, psText: ps });
    assert.deepEqual(r, []);
    assert.equal(fs.existsSync(path.join(dir, 'platz-1.lock')), true);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Platz·Hängend·Wechsel] ein Baum, der Prozesse wechselt, gilt als tätig, auch bei kleiner CPU-Summe', () => {
  const dir = neuesVerzeichnis();
  try {
    fs.writeFileSync(path.join(dir, 'platz-1.lock'),
      JSON.stringify({ pid: 424242, name: 'wechselt', cwd: '/baum/w', host: os.hostname(), gestartetAm: new Date().toISOString() }));
    const lebend = { prozessLebt: () => true };
    const jetzt = Date.now();
    sp.haengendRaeumen({ dir, n: 1, env, jetzt, psText: '424242 1 0:00.01\n500 424242 0:00.01\n', ...lebend });
    const r = sp.haengendRaeumen({ dir, n: 1, env, jetzt: jetzt + 5000, psText: '424242 1 0:00.01\n501 424242 0:00.01\n', ...lebend });
    assert.deepEqual(r, [], 'ein neues Kind heißt: der Lauf arbeitet');
    const still = '424242 1 0:00.01\n501 424242 0:00.01\n';
    const r2 = sp.haengendRaeumen({ dir, n: 1, env, jetzt: jetzt + 5500, psText: still, ...lebend, beenden: () => {} });
    assert.deepEqual(r2, [], 'die Frist (1 s) zählt ab dem Wechsel — 0,5 s danach noch nicht um');
    const r3 = sp.haengendRaeumen({ dir, n: 1, env, jetzt: jetzt + 6500, psText: still, ...lebend, beenden: () => {} });
    assert.equal(r3.length, 1, 'nach der Frist ohne Wechsel und ohne CPU: hängend');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
