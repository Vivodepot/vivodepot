'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz; in derselben Zeile, damit keine Zeilennummer wandert
/* TICKET-VORRANG (06.11.2026): Ein Wort „Tickets mit diesem Präfix vor allen anderen“ steht als Datei mit Ablauf und Grund im
   Platz-Verzeichnis. Wartende Tickets mit dem Präfix kommen nach dem Push vor allen anderen dran, auf allen Plätzen.
   Rot-Beweis: mit der Bibliothek davor (SUITE_PLATZ_LIB auf `git show <davor>:tools/lib/suite-platz.js`) fallen die Fälle
   [Ticket-Vorrang·Rot-Beweis] — die Regeldatei wird hier als Datei geschrieben, nicht über die Bibliothek, damit die alte
   Bibliothek die Reihenfolge zeigt und nicht bloß eine fehlende Funktion. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sp = require(process.env.SUITE_PLATZ_LIB || '../tools/lib/suite-platz.js');

const DATEI = 'ticket-vorrang.json';
const STUNDE = 60 * 60 * 1000;
function regelSchreiben(dir, { praefixe = ['mkt-'], bis = Date.now() + STUNDE, grund = 'Wort 23:17 Marketing zuerst' } = {}) {
  fs.writeFileSync(path.join(dir, DATEI), JSON.stringify({ praefixe, bis: new Date(bis).toISOString(), grund, gesetztAm: new Date().toISOString() }) + '\n');
}
function aufbau() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ticket-vorrang-'));
  const baum = fs.mkdtempSync(path.join(os.tmpdir(), 'ticket-baum-'));
  const prozesse = [];
  const p = () => { const x = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' }); prozesse.push(x); return x.pid; };
  const aufraeumen = () => { for (const x of prozesse) x.kill(); for (const d of [dir, baum]) fs.rmSync(d, { recursive: true, force: true }); };
  return { dir, baum, p, aufraeumen };
}
// Zwei Tickets in derselben Millisekunde sortieren nach PID, nicht nach Ankunft: kurz warten.
function nachEinerMs() { const t = Date.now(); while (Date.now() <= t + 1) { /* warten */ } }
function ziehen(a, dir, name) { const pfad = sp.ticketZiehen({ name, pid: a.p(), dir, cwd: a.baum }); nachEinerMs(); return pfad; }
const namen = (dir) => sp.wartende({ dir }).map((t) => t.name);

test('[Ticket-Vorrang·Rot-Beweis] ein späteres mkt-Ticket kommt vor ein älteres; der Push bleibt vorn', () => {
  const a = aufbau();
  try {
    ziehen(a, a.dir, 'a-erst');
    ziehen(a, a.dir, 'mkt-spaet');
    ziehen(a, a.dir, 'pre-push');
    assert.deepEqual(namen(a.dir), ['pre-push', 'a-erst', 'mkt-spaet'], 'ohne Regel: Push, dann nach Ankunft');
    regelSchreiben(a.dir);
    assert.deepEqual(namen(a.dir), ['pre-push', 'mkt-spaet', 'a-erst'], 'mit Regel: Push, dann das Präfix, dann der Rest');
  } finally { a.aufraeumen(); }
});

test('[Ticket-Vorrang·Rot-Beweis] die Regel im Hauptverzeichnis gilt auch im Klein-Platz', () => {
  const a = aufbau();
  try {
    const kd = path.join(a.dir, 'klein');
    fs.mkdirSync(kd, { recursive: true });
    ziehen(a, kd, 'pro-erst');
    ziehen(a, kd, 'mkt-platzprobe');
    regelSchreiben(a.dir);
    assert.deepEqual(namen(kd), ['mkt-platzprobe', 'pro-erst']);
    // Ein freier Klein-Platz geht an das mkt-Ticket, obwohl es später kam.
    const tickets = sp.wartende({ dir: kd });
    const mkt = tickets.find((t) => t.name === 'mkt-platzprobe');
    const pro = tickets.find((t) => t.name === 'pro-erst');
    const holen = (t) => sp.kleinPlatzHolen({ name: t.name, pid: t.pid, dir: a.dir, n: 1, cwd: a.baum, ticket: t.pfad, env: {} });
    assert.equal(holen(pro).geholt, false, 'das ältere Ticket ohne Präfix wartet');
    assert.equal(holen(mkt).geholt, true, 'das mkt-Ticket nimmt den Platz');
  } finally { a.aufraeumen(); }
});

test('[Ticket-Vorrang] Gegenproben: abgelaufene Regel, Regel ohne Grund, Regel ohne Präfix gelten nicht', () => {
  const a = aufbau();
  try {
    ziehen(a, a.dir, 'a-erst');
    ziehen(a, a.dir, 'mkt-spaet');
    regelSchreiben(a.dir, { bis: Date.now() - 1000 });
    assert.deepEqual(namen(a.dir), ['a-erst', 'mkt-spaet'], 'abgelaufen');
    assert.match(sp.ticketVorrangLesen({ dir: a.dir }).hinweis, /abgelaufen/);
    regelSchreiben(a.dir, { grund: '' });
    assert.deepEqual(namen(a.dir), ['a-erst', 'mkt-spaet'], 'ohne Grund');
    regelSchreiben(a.dir, { praefixe: [] });
    assert.deepEqual(namen(a.dir), ['a-erst', 'mkt-spaet'], 'ohne Präfix');
    fs.writeFileSync(path.join(a.dir, DATEI), '{kaputt');
    assert.deepEqual(namen(a.dir), ['a-erst', 'mkt-spaet'], 'unlesbar');
  } finally { a.aufraeumen(); }
});

test('[Ticket-Vorrang] Setzen nur mit Grund samt Uhrzeit und mit --bis höchstens 12 Stunden voraus; sonst keine Datei', () => {
  const a = aufbau();
  try {
    const jetzt = Date.parse('2026-11-06T00:30:00');
    const setzen = (o) => sp.ticketVorrangSetzen({ dir: a.dir, praefixe: 'mkt-', bis: '01:30', grund: 'Wort von 23:17, Marketing zuerst', jetzt, ...o });
    assert.throws(() => setzen({ grund: '' }), /Grund/);
    assert.throws(() => setzen({ grund: 'Marketing zuerst, ohne Zeit' }), /Uhrzeit/);
    assert.throws(() => setzen({ bis: '' }), /--bis/);
    assert.throws(() => setzen({ bis: new Date(jetzt - 1000).toISOString() }), /--bis/);
    assert.throws(() => setzen({ bis: new Date(jetzt + 13 * STUNDE).toISOString() }), /12 Stunden/);
    assert.throws(() => setzen({ praefixe: '' }), /Präfix/);
    assert.throws(() => setzen({ praefixe: 'm' }), /zwei Zeichen/);
    assert.equal(fs.existsSync(path.join(a.dir, DATEI)), false, 'nichts geschrieben');
    const e = setzen({});
    assert.deepEqual(e.praefixe, ['mkt-']);
    assert.equal(Date.parse(e.bis) - jetzt, STUNDE, '01:30 heißt die nächste 01:30 ab jetzt');
    const r = sp.ticketVorrangLesen({ dir: a.dir, jetzt });
    assert.equal(r.gueltig, true);
    assert.equal(sp.ticketVorrangLesen({ dir: path.join(a.dir, 'klein'), jetzt }).gueltig, true, 'aus dem Klein-Verzeichnis gelesen');
    assert.equal(sp.ticketVorrangAufheben({ dir: a.dir }), true);
    assert.equal(sp.ticketVorrangLesen({ dir: a.dir }), null);
  } finally { a.aufraeumen(); }
});

test('[Ticket-Vorrang] Stufen: Push 0, Präfix 0,5, sonst 1', () => {
  const regel = { gueltig: true, praefixe: ['mkt-', 'pr-x'] };
  assert.equal(sp.vorrang('pre-push', regel), 0);
  assert.equal(sp.vorrang('mkt-a', regel), sp.TICKET_VORRANG_STUFE);
  assert.equal(sp.vorrang('pr-xyz', regel), sp.TICKET_VORRANG_STUFE);
  assert.equal(sp.vorrang('xmkt-a', regel), 1, 'Präfix heißt: am Anfang');
  assert.equal(sp.vorrang('mkt-a', { ...regel, gueltig: false }), 1);
  assert.equal(sp.vorrang('mkt-a'), 1);
});

/* Gemessen 06.11.2026 00:50: Klein 4 belegt bei „jetzt 3 Plätze“, Klein 2 und 3 leer, ein mkt-Ticket wartete. Platz 4 zählt
   mit (er stammt aus der dynamischen Zahl 4); ist ein Platz unter der wirksamen Zahl frei, nimmt ihn das vorderste Ticket. */
test('[Klein·Platz über wirksamer Zahl] ein Halter auf Platz 4 bei 3 wirksamen Plätzen zählt; der freie Platz geht an das vorderste Ticket', () => {
  const a = aufbau();
  try {
    const kd = path.join(a.dir, 'klein');
    fs.mkdirSync(kd, { recursive: true });
    const halter = (k) => fs.writeFileSync(path.join(kd, 'platz-' + k + '.lock'), JSON.stringify({ pid: a.p(), name: 'h' + k, cwd: a.baum, host: os.hostname(), seit: new Date().toISOString() }));
    halter(1); halter(4);
    const env = { VD_KLEIN_DYNAMISCH: '4' };
    ziehen(a, kd, 'pro-erst');
    ziehen(a, kd, 'mkt-platzprobe');
    regelSchreiben(a.dir);
    const t = sp.wartende({ dir: kd });
    const holen = (x) => sp.kleinPlatzHolen({ name: x.name, pid: x.pid, dir: a.dir, cwd: a.baum, ticket: x.pfad, env, wirksam: 3 });
    assert.equal(holen(t[1]).geholt, false, 'pro-erst steht hinter dem mkt-Ticket');
    const r = holen(t[0]);
    assert.equal(r.geholt, true, 'das mkt-Ticket nimmt den freien Platz');
    assert.equal(sp.halter({ dir: kd, n: 4 }).length, 3, 'Plätze 1, 4 und der neue');
    const z = sp.ticketZiehen({ name: 'spaet', pid: a.p(), dir: kd, cwd: a.baum });
    assert.equal(sp.kleinPlatzHolen({ name: 'spaet', pid: a.p(), dir: a.dir, cwd: a.baum, ticket: z, env, wirksam: 3 }).geholt, false,
      'bei 3 Belegten und 3 wirksamen Plätzen wartet der nächste');
  } finally { a.aufraeumen(); }
});
