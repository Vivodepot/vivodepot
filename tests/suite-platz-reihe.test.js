'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz (PLATZ-LECK-HOOK-TESTS); in derselben Zeile, damit keine Zeilennummer wandert
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

/* EIGENTÜMER DER MARKE (16.10.2026, Befund VORRANG-MARKE-FREMD-GELOESCHT): reiheLoeschen löscht nur die eigene Marke (cwd im
   markierten Baum, derselbe Vergleich wie bei der Vergabe) oder eine ungültige; eine gültige fremde bleibt stehen, außer mit
   `fremd: true`. reiheSetzen nennt eine überschriebene gültige fremde Marke. Geprüft wird an der DATEI, nicht nur an
   Rückgabewerten — so fällt die Bibliothek davor (SUITE_PLATZ_LIB, s. o.) an der fremden Marke, die sie löscht.
   Die Meldungen der Kommandozeile prüft die Probe zum Platz-CLI. */
const markeDa = (dir) => fs.existsSync(path.join(dir, 'reihe'));

test('[Reihe·Eigentümer·Rot-Beweis] reiheLoeschen aus einem fremden Baum lässt eine gültige Marke stehen und sagt, wem sie gehört', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran);
    const r = sp.reiheLoeschen({ dir: a.dir, cwd: a.baumAnders });
    assert.equal(markeDa(a.dir), true, 'die fremde Marke steht noch');
    assert.equal(r.geloescht, false);
    assert.equal(r.ergebnis, 'fremd');
    assert.equal(r.marke.baum, fs.realpathSync(a.baumDran));
  } finally { a.aufraeumen(); }
});

test('[Reihe·Eigentümer·Rot-Beweis] reiheSetzen auf eine gültige fremde Marke nennt die überschriebene und setzt trotzdem', () => {
  const a = aufbau();
  try {
    const jetzt = Date.now();
    markeSchreiben(a.dir, a.baumDran, jetzt);
    const e = sp.reiheSetzen({ dir: a.dir, baum: a.baumAnders });
    assert.deepEqual(e.ueberschrieben, { baum: fs.realpathSync(a.baumDran), gesetztAm: new Date(jetzt).toISOString() });
    assert.equal(sp.reiheLesen({ dir: a.dir }).baum, fs.realpathSync(a.baumAnders), 'gesetzt wird trotzdem');
    assert.equal(sp.reiheSetzen({ dir: a.dir, baum: a.baumAnders }).ueberschrieben, undefined, 'dieselbe Marke neu: nichts überschrieben');
  } finally { a.aufraeumen(); }
});

test('[Reihe·Eigentümer] Gegenproben: eigene Marke (auch aus einem Unterordner) und abgelaufene fremde werden gelöscht; fremd: true löscht eine fremde', () => {
  const a = aufbau();
  try {
    fs.mkdirSync(path.join(a.baumDran, 'unter'));
    markeSchreiben(a.dir, a.baumDran);
    sp.reiheLoeschen({ dir: a.dir, cwd: path.join(a.baumDran, 'unter') });
    assert.equal(markeDa(a.dir), false, 'eigene Marke gelöscht');

    markeSchreiben(a.dir, a.baumDran, Date.now() - REIHE_GUELTIG_MS - 1000);
    sp.reiheLoeschen({ dir: a.dir, cwd: a.baumAnders });
    assert.equal(markeDa(a.dir), false, 'abgelaufene fremde Marke gelöscht');

    markeSchreiben(a.dir, a.baumDran);
    sp.reiheLoeschen({ dir: a.dir, cwd: a.baumAnders, fremd: true });
    assert.equal(markeDa(a.dir), false, 'fremd: true löscht die fremde Marke');
  } finally { a.aufraeumen(); }
});

test('[Reihe·Eigentümer] Rückgabe nennt, was passiert ist', () => {
  const a = aufbau();
  try {
    assert.equal(sp.reiheLoeschen({ dir: a.dir, cwd: a.baumAnders }).ergebnis, 'keine');
    markeSchreiben(a.dir, a.baumDran);
    assert.equal(sp.reiheLoeschen({ dir: a.dir, cwd: a.baumDran }).ergebnis, 'eigen');
    markeSchreiben(a.dir, a.baumDran, Date.now() - REIHE_GUELTIG_MS - 1000);
    const u = sp.reiheLoeschen({ dir: a.dir, cwd: a.baumAnders });
    assert.equal(u.ergebnis, 'ungueltig'); assert.match(u.marke.grund, /abgelaufen/);
    markeSchreiben(a.dir, a.baumDran);
    const f = sp.reiheLoeschen({ dir: a.dir, cwd: a.baumAnders, fremd: true });
    assert.equal(f.ergebnis, 'fremd-geloescht'); assert.equal(f.geloescht, true);
  } finally { a.aufraeumen(); }
});
/* Rot-Beweis Eigentümer (16.10.2026, von Hand gefahren): mit der Bibliothek vor dieser Änderung fallen beide Proben
   „Rot-Beweis“ (die fremde Marke ist weg; keine überschriebene genannt); die Gegenprobe bleibt grün. */

/* VERWAISTE MARKE (16.10.2026, Befund VORRANG-MARKE-VERWAIST): nach der Schonfrist gilt die Marke nur mit einem lebenden
   Halter oder Ticket im markierten Baum (Suite- oder Air-Platz). Rot-Beweis: die Bibliothek davor (SUITE_PLATZ_LIB auf
   `git show <davor>:tools/lib/suite-platz.js`) hält die verwaiste Marke für gültig, und der fremde Push wartet. */
const ELF_MIN = 11 * 60 * 1000;
test('[Reihe·verwaist] nach der Schonfrist ohne lebenden Lauf im Baum: Marke gilt nicht, ein fremder Push nimmt den Platz', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran, Date.now() - ELF_MIN);
    const r = sp.reiheLesen({ dir: a.dir });
    assert.equal(r.gueltig, false, 'eine verwaiste Marke gilt nicht');
    assert.match(r.grund, /verwaist/);
    assert.equal(holen(a, 'pre-push', a.p(), a.baumAnders).geholt, true, 'der fremde Push wartet nicht hinter einer verwaisten Marke');
  } finally { a.aufraeumen(); }
});

test('[Reihe·verwaist] in der Schonfrist gilt die Marke auch ohne Lauf; danach hält sie ein lebendes Ticket oder ein Halter', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran, Date.now() - 5 * 60 * 1000);
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, true, 'in der Schonfrist: Marke vor dem Lauf gesetzt');
    markeSchreiben(a.dir, a.baumDran, Date.now() - ELF_MIN);
    sp.ticketZiehen({ name: 'pre-push', pid: a.p(), dir: a.dir, cwd: path.join(a.baumDran) });   // wartet im markierten Baum
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, true, 'ein lebendes Ticket im Baum hält die Marke');
    assert.equal(holen(a, 'pre-push', a.p(), a.baumAnders).geholt, false, 'der fremde Push wartet weiter');
  } finally { a.aufraeumen(); }
});

test('[Reihe·verwaist] ein lebender Halter auf dem Air-Platz hält die Marke; ein toter nicht', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran, Date.now() - ELF_MIN);
    const ad = sp.airVerzeichnis(a.dir);
    fs.mkdirSync(ad, { recursive: true });
    const lebend = a.p();
    fs.writeFileSync(path.join(ad, 'platz-1.lock'), JSON.stringify({ pid: lebend, name: 'air-schicken', cwd: fs.realpathSync(a.baumDran), host: os.hostname() }));
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, true, 'der Air-Lauf im Baum hält die Marke');
    fs.writeFileSync(path.join(ad, 'platz-1.lock'), JSON.stringify({ pid: 2 ** 22 + 12345, name: 'air-schicken', cwd: fs.realpathSync(a.baumDran), host: os.hostname() }));
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, false, 'ein toter Halter hält sie nicht');
  } finally { a.aufraeumen(); }
});

/* KLEIN HÄLT DIE MARKE (25.10.2026, Befund VORRANG-MARKE-OHNE-KLEIN): ein Zug, der im Klein-Platz vorprüft, hält die Marke.
   Rot-Beweis: mit der Bibliothek davor (SUITE_PLATZ_LIB auf `git show <davor>:tools/lib/suite-platz.js`) fällt die erste
   Zusicherung — der lebende Klein-Halter zählte nicht, die Marke verwaiste. */
test('[Reihe·verwaist·Klein] ein lebender Klein-Halter oder ein Klein-Ticket im Baum hält die Marke; ein toter nicht', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran, Date.now() - ELF_MIN);
    const kd = path.join(a.dir, 'klein');
    fs.mkdirSync(kd, { recursive: true });
    const eintrag = (pid) => JSON.stringify({ pid, name: 'vor-pre-commit', cwd: fs.realpathSync(a.baumDran), host: os.hostname() });
    fs.writeFileSync(path.join(kd, 'platz-1.lock'), eintrag(a.p()));
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, true, 'der Klein-Lauf im Baum hält die Marke');
    fs.writeFileSync(path.join(kd, 'platz-1.lock'), eintrag(2 ** 22 + 12345));
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, false, 'ein toter Klein-Halter hält sie nicht');
    fs.rmSync(path.join(kd, 'platz-1.lock'));
    sp.ticketZiehen({ name: 'vor-pre-commit', pid: a.p(), dir: kd, cwd: a.baumDran });
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, true, 'ein wartender Klein-Lauf im Baum hält sie auch');
  } finally { a.aufraeumen(); }
});

/* VORRANG-MARKE-OHNE-LAUF-HAELT-REIHE (20.10.2026): eine Marke, deren Baum nur auf dem Air-Platz lebt (air-schicken), blieb gültig —
   richtig, sie verfällt nicht —, hielt aber auf den Suite-Plätzen einen Platz frei, den niemand aus dem Baum brauchte (14 Minuten
   ein leerer Platz bei acht Wartenden). Jetzt hält sie nach der Schonfrist einen Suite-Platz nur frei, wenn im Baum ein Suite-Lauf
   hält oder wartet. */
function airHalterSchreiben(a, pid) {
  const ad = sp.airVerzeichnis(a.dir);
  fs.mkdirSync(ad, { recursive: true });
  fs.writeFileSync(path.join(ad, 'platz-1.lock'), JSON.stringify({ pid, name: 'air-schicken', cwd: fs.realpathSync(a.baumDran), host: os.hostname() }));
}
test('[Reihe·nur Air] nach der Schonfrist hält eine Marke, deren Baum nur auf dem Air lebt, keinen Suite-Platz frei', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran, Date.now() - ELF_MIN);
    airHalterSchreiben(a, a.p());
    assert.equal(sp.reiheLesen({ dir: a.dir }).gueltig, true, 'die Marke verfällt nicht, der Baum lebt auf dem Air');
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, true, 'der erste fremde Lauf');
    assert.equal(holen(a, 'npm test', a.p(), a.baumAnders).geholt, true, 'der zweite fremde Lauf nimmt den Platz, den niemand aus dem Baum braucht');
  } finally { a.aufraeumen(); }
});
test('[Reihe·nur Air·Rot-Beweis] wartet im Baum ein Suite-Lauf oder liegt die Marke in der Schonfrist, bleibt ein Platz frei', () => {
  const a = aufbau();
  try {
    markeSchreiben(a.dir, a.baumDran, Date.now() - ELF_MIN);
    airHalterSchreiben(a, a.p());
    sp.ticketZiehen({ name: 'pre-push', pid: a.p(), dir: a.dir, cwd: path.join(a.baumDran) });   // der Push des Baums wartet auf einen Suite-Platz
    assert.equal(holen(a, 'pre-commit', a.p(), a.baumAnders).geholt, true);
    assert.equal(holen(a, 'npm test', a.p(), a.baumAnders).geholt, false, 'mit wartendem Suite-Lauf im Baum: der Platz bleibt ihm');
  } finally { a.aufraeumen(); }
  const b = aufbau();
  try {
    markeSchreiben(b.dir, b.baumDran, Date.now() - 2 * 60 * 1000);   // in der Schonfrist: „Marke setzen, dann den Lauf starten“
    assert.equal(holen(b, 'pre-commit', b.p(), b.baumAnders).geholt, true);
    assert.equal(holen(b, 'npm test', b.p(), b.baumAnders).geholt, false, 'in der Schonfrist bleibt der Platz frei');
  } finally { b.aufraeumen(); }
});
