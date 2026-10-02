'use strict';
/* Befund SUITE-PLATZ-TICKET-REIHENFOLGE (01.10.2026): bei gültiger Vorrang-Marke las die Platzvergabe die Tickets nicht.
   Den einen Zusatzplatz neben dem markierten Baum nahm der pre-commit, der zuerst nachsah — ein älteres Ticket wartete
   weiter, über Stunden, weil die Marke mehrfach neu gesetzt wurde. Jetzt gilt auch dort die Ankunft: der Zusatzplatz
   geht an das älteste berechtigte Ticket außerhalb des markierten Baums; wer ohne Ticket kommt, steht dahinter.
   Echte, schlafende Prozesse als Halter. SUITE_PLATZ_LIB lenkt für den Rot-Beweis auf die Bibliothek davor um. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sp = require(process.env.SUITE_PLATZ_LIB || '../tools/lib/suite-platz.js');

function markeSchreiben(dir, baum) {
  fs.writeFileSync(path.join(dir, 'reihe'), JSON.stringify({ baum: fs.realpathSync(baum), gesetztAm: new Date().toISOString() }) + '\n');
}
const schlaefer = () => spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' });

function aufbau() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-platz-tickets-'));
  const baumDran = fs.mkdtempSync(path.join(os.tmpdir(), 'baum-dran-'));
  const baumAnders = fs.mkdtempSync(path.join(os.tmpdir(), 'baum-anders-'));
  const prozesse = [];
  const p = () => { const x = schlaefer(); prozesse.push(x); return x.pid; };
  const aufraeumen = () => { for (const x of prozesse) x.kill(); for (const d of [dir, baumDran, baumAnders]) fs.rmSync(d, { recursive: true, force: true }); };
  return { dir, baumDran, baumAnders, p, aufraeumen };
}
const holen = (a, name, pid, cwd, extra = {}) => sp.platzHolen({ name, pid, dir: a.dir, n: 2, env: {}, cwd, ...extra });

test('[Reihe·Tickets] bei gültiger Marke nimmt ein späterer pre-commit den Zusatzplatz NICHT vor einem älteren Ticket', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    const aeltererPid = a.p();
    const aelteres = sp.ticketZiehen({ name: 'pre-commit', pid: aeltererPid, dir: a.dir, cwd: a.baumAnders });
    const spaeterPid = a.p();
    const spaeteres = sp.ticketZiehen({ name: 'pre-commit', pid: spaeterPid, dir: a.dir, cwd: a.baumAnders });
    assert.equal(holen(a, 'pre-commit', spaeterPid, a.baumAnders, { ticket: spaeteres }).geholt, false,
      'das spätere Ticket wartet hinter dem älteren');
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, false, 'wer ohne Ticket kommt, steht hinter allen');
    assert.equal(holen(a, 'pre-commit', aeltererPid, a.baumAnders, { ticket: aelteres }).geholt, true,
      'das ältere Ticket bekommt den Zusatzplatz');
  } finally { a.aufraeumen(); }
});

test('[Reihe·Tickets] ohne fremde Tickets bleibt alles wie zuvor: eine fremde Schnellstufe darf, der markierte Baum vor allen', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    sp.ticketZiehen({ name: 'pre-commit', pid: a.p(), dir: a.dir, cwd: a.baumAnders });   // wartet schon
    assert.equal(holen(a, 'landung-vorbereiten', a.p(), a.baumDran).geholt, true, 'der markierte Baum vor jedem Ticket');
    const b = aufbau();
    try {
      markeSchreiben(b.dir, b.baumDran);
      assert.equal(holen(b, 'pre-commit', b.p(), b.baumAnders).geholt, true, 'keine Tickets: die erste fremde Schnellstufe darf');
    } finally { b.aufraeumen(); }
  } finally { a.aufraeumen(); }
});

test('[Reihe·Tickets] ein Ticket aus dem markierten Baum hält den Zusatzplatz niemandem zu', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    sp.ticketZiehen({ name: 'pre-push', pid: a.p(), dir: a.dir, cwd: a.baumDran });   // der markierte Baum wartet nicht in der Schlange
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, true);
  } finally { a.aufraeumen(); }
});

test('[Reihe·Art] ein Browserlauf bekommt den Zusatzplatz NICHT, solange der markierte Baum einen Browserlauf fährt', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    assert.equal(holen(a, 'pre-push', a.p(), a.baumDran).geholt, true, 'der markierte Baum pusht (E2E-Strecke)');
    const vorschauPid = a.p();
    const vorschau = sp.ticketZiehen({ name: 'vertama-vorschau-pruefung', pid: vorschauPid, dir: a.dir, cwd: a.baumAnders });
    assert.equal(holen(a, 'vertama-vorschau-pruefung', vorschauPid, a.baumAnders, { ticket: vorschau }).geholt, false,
      'Browser neben Browser: er wartet auf das Ende des Pushes');
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, true,
      'der wartende Browserlauf hält den Zusatzplatz niemandem zu — ein node-Lauf bekommt ihn');
  } finally { a.aufraeumen(); }
});

test('[Reihe·Art] ein Browserlauf mit dem ältesten Ticket bekommt den Zusatzplatz neben einem node-Lauf des markierten Baums', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumDran).geholt, true, 'der markierte Baum fährt eine Schnellstufe');
    const vorschauPid = a.p();
    const vorschau = sp.ticketZiehen({ name: 'vertama-vorschau-pruefung', pid: vorschauPid, dir: a.dir, cwd: a.baumAnders });
    sp.ticketZiehen({ name: 'pre-commit', pid: a.p(), dir: a.dir, cwd: a.baumAnders });   // später
    assert.equal(holen(a, 'vertama-vorschau-pruefung', vorschauPid, a.baumAnders, { ticket: vorschau }).geholt, true);
  } finally { a.aufraeumen(); }
});

test('[Reihe·Art] artVon: Push, landung-vorbereiten und Browser-Namen sind e2e, der Rest node', () => {
  for (const n of ['pre-push', 'landung-vorbereiten', 'vertama-vorschau-pruefung', 'demo-vorschau-pruefung', 'e2e studio', 'playwright']) {
    assert.equal(sp.artVon(n), 'e2e', n);
  }
  for (const n of ['pre-commit', 'npm test', 'faktenbasis-erzeugen']) assert.equal(sp.artVon(n), 'node', n);
});

test('[Reihe·Art·Rot-Beweis] ohne die Art-Regel liefe ein Browserlauf neben dem Push — die Probe oben sähe es', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'tools', 'lib', 'suite-platz.js'), 'utf8');
  const alt = "const kannNehmen = (laufName) => !(artVon(laufName) === 'e2e' && e2eHaelt);";
  assert.ok(quelle.includes(alt), 'Testvoraussetzung: die Art-Regel steht so in der Bibliothek');
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-platz-ohne-art-'));
  try {
    const datei = path.join(ordner, 'suite-platz.js');
    fs.writeFileSync(datei, quelle.replace(alt, 'const kannNehmen = () => true;'));
    const ohneArt = require(datei);
    const a = aufbau();
    try {
      markeSchreiben(a.dir, a.baumDran);
      const h = (name, pid, cwd, extra = {}) => ohneArt.platzHolen({ name, pid, dir: a.dir, n: 2, env: {}, cwd, ...extra });
      assert.equal(h('pre-push', a.p(), a.baumDran).geholt, true);
      assert.equal(h('vertama-vorschau-pruefung', a.p(), a.baumAnders).geholt, true, 'ohne Regel: Browser neben Browser');
    } finally { a.aufraeumen(); }
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});
