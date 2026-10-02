'use strict';
/* Die Vorrang-Marke der Suite-Plätze (01.10.2026): der markierte Arbeitsbaum ist dran; daneben höchstens eine
   pre-commit-Schnellstufe; die Marke verfällt nach 90 Minuten oder wenn der Baum fehlt; ohne gültige Marke gilt das
   Verhalten davor. Echte, schlafende Prozesse als Halter. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
// SUITE_PLATZ_LIB: für den Rot-Beweis gegen eine ältere Bibliothek (ohne Marke) umlenkbar.
const sp = require(process.env.SUITE_PLATZ_LIB || '../tools/lib/suite-platz.js');
const REIHE_GUELTIG_MS = 90 * 60 * 1000;
/* Die Marke wird hier als DATEI geschrieben, nicht über die Bibliothek — so prüft der Rot-Beweis gegen eine ältere
   Bibliothek, dass sie die Marke nicht beachtet (und nicht bloß, dass ihr eine Funktion fehlt). */
function markeSchreiben(dir, baum, jetzt = Date.now()) {
  fs.writeFileSync(path.join(dir, 'reihe'), JSON.stringify({ baum: fs.realpathSync(baum), gesetztAm: new Date(jetzt).toISOString() }) + '\n');
}

const ohneErbe = {};
const neu = () => fs.mkdtempSync(path.join(os.tmpdir(), 'suite-platz-reihe-'));
const schlaefer = () => spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });

function aufbau() {
  const dir = neu();
  const baumDran = fs.mkdtempSync(path.join(os.tmpdir(), 'baum-dran-'));
  const baumAnders = fs.mkdtempSync(path.join(os.tmpdir(), 'baum-anders-'));
  const prozesse = [];
  const p = () => { const x = schlaefer(); prozesse.push(x); return x.pid; };
  const aufraeumen = () => { for (const x of prozesse) x.kill(); for (const d of [dir, baumDran, baumAnders]) fs.rmSync(d, { recursive: true, force: true }); };
  return { dir, baumDran, baumAnders, p, aufraeumen };
}
const holen = (a, name, pid, cwd, extra = {}) => sp.platzHolen({ name, pid, dir: a.dir, n: 2, env: ohneErbe, cwd, ...extra });

test('[Reihe] der markierte Baum nimmt den freien Platz vor einem älteren Ticket', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, true, 'der eine fremde pre-commit');
    sp.ticketZiehen({ name: 'pre-push', pid: a.p(), dir: a.dir, cwd: a.baumAnders });   // wartet schon länger
    const r = holen(a, 'landung-vorbereiten', a.p(), path.join(a.baumDran));
    assert.equal(r.geholt, true, 'der markierte Baum vor dem Ticket');
    assert.ok(r.reihe && r.reihe.gueltig);
  } finally { a.aufraeumen(); }
});

test('[Reihe] neben dem markierten Baum höchstens EIN fremder Lauf, kein fremder Push; der Rest wartet', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    assert.equal(holen(a, 'pre-push', a.p(), a.baumAnders).geholt, false, 'ein fremder Push wartet');
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, true, 'ein fremder Lauf darf (seit 01.10.2026 nach Ankunft, nicht nach Name)');
    const zweite = holen(a, 'pre-commit', a.p(), a.baumAnders);
    assert.equal(zweite.geholt, false, 'ein zweiter fremder Lauf wartet — der letzte Platz bleibt dem markierten Baum');
    assert.equal(holen(a, 'npm test', a.p(), a.baumAnders).geholt, false, 'auch eine fremde Suite wartet dann');
    assert.match(sp.meldungBelegt(zweite), /dran ist .* höchstens ein weiterer Lauf, das älteste Ticket zuerst/);
    assert.equal(holen(a, 'pre-push', a.p(), a.baumDran).geholt, true, 'der markierte Baum bekommt den freigehaltenen Platz');
  } finally { a.aufraeumen(); }
});

test('[Reihe] hält der markierte Baum schon einen Platz, darf daneben eine fremde Schnellstufe laufen', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    assert.equal(holen(a, 'pre-push', a.p(), a.baumDran).geholt, true);
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, true);
  } finally { a.aufraeumen(); }
});

test('[Reihe] eine abgelaufene Marke und ein fehlender Baum ergeben das alte Verhalten, mit Hinweis', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran, Date.now() - REIHE_GUELTIG_MS - 1000);
    const r = sp.reiheLesen({ dir: a.dir });
    assert.equal(r.gueltig, false);
    assert.match(r.grund, /Marke abgelaufen, altes Verhalten/);
    assert.equal(holen(a, 'pre-push', a.p(), a.baumAnders).geholt, true, 'abgelaufen: ein fremder Push bekommt seinen Platz wie bisher');
    assert.equal(holen(a, 'npm test', a.p(), a.baumAnders).geholt, true, 'und eine zweite fremde Suite den zweiten');
    const voll = holen(a, 'npm test', a.p(), a.baumAnders);
    assert.match(sp.meldungBelegt(voll), /^Marke abgelaufen, altes Verhalten\. alle Suite-Plätze belegt/);
    markeSchreiben(a.dir, a.baumDran);
    fs.rmSync(a.baumDran, { recursive: true, force: true });
    assert.match(sp.reiheLesen({ dir: a.dir }).grund, /Baum fehlt/);
  } finally { a.aufraeumen(); }
});

test('[Reihe] ohne Marke unverändert: zwei fremde volle Läufe bekommen beide Plätze', () => {
  const a = aufbau();
  try {
    assert.equal(sp.reiheLesen({ dir: a.dir }), null);
    assert.equal(holen(a, 'pre-push', a.p(), a.baumAnders).geholt, true);
    assert.equal(holen(a, 'landung-vorbereiten', a.p(), a.baumAnders).geholt, true);
  } finally { a.aufraeumen(); }
});

/* Rot-Beweis (von Hand gefahren, im Commit belegt): mit der Bibliothek vor dieser Änderung
     SUITE_PLATZ_LIB=<alte tools/lib/suite-platz.js> node --test tests/suite-platz-reihe.test.js
   fallen die Marken-Proben — die alte Bibliothek gibt dem fremden Push den Platz, den die Marke freihält. */

test('[Reihe] imBaum: der Baum selbst und alles darunter, kein Namensvetter', () => {
  const a = aufbau();
  try {
    const baum = fs.realpathSync(a.baumDran);
    fs.mkdirSync(path.join(a.baumDran, 'unter'));
    assert.equal(sp.imBaum(baum, a.baumDran), true);
    assert.equal(sp.imBaum(baum, path.join(a.baumDran, 'unter')), true);
    assert.equal(sp.imBaum(baum, a.baumDran + '-zwei'), false);
  } finally { a.aufraeumen(); }
});
