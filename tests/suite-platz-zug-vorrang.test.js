'use strict'; require('./helfer/platz-isoliert.js').platzIsolieren();   // eigener Suite-Platz; in derselben Zeile, damit keine Zeilennummer wandert
/* ZUG-VORRANG AM ZWEIG (08.11.2026, Befund ZUG-VORRANG-AM-NAMEN). Drei Teile, je mit Rot-Beweis:
   (a) Ein Ticket aus einem Zweig zug-… steht vor den Wagen, gleich wie es heißt, und ohne Ablauf, solange es lebt; ein gesetzter
       Ticket-Vorrang (release-) bleibt darüber.
   (b) Die Vorrang-Marke gilt über 90 Minuten hinaus nur mit lebendem Lauf und frischem Herzschlag, nie über 6 Stunden.
   (c) Ein Ticket-Vorrang auf einen Namen, den jeder Wagen trägt (vor-pre-commit …), wird nicht gesetzt und gilt nicht.
   Den Zweig liefert hier ein ersetzter Leser (zweigLeserSetzen) — die Probe hängt nie am Zweig des Baums, in dem sie läuft
   (sonst rot nur im Zugbaum, wie beim Namens-Präfix 1ff6b5578). Ein Fall liest den echten Zweig aus einem Wegwerf-Repo. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const sp = require('../tools/lib/suite-platz.js');

const MIN = 60 * 1000;
const STUNDE = 60 * MIN;
const prozesse = [];
const verzeichnisse = [];
after(() => { for (const x of prozesse) x.kill(); for (const d of verzeichnisse) fs.rmSync(d, { recursive: true, force: true }); sp.zweigLeserSetzen(); });
function wegwerf(praefix) { const d = fs.mkdtempSync(path.join(os.tmpdir(), praefix)); verzeichnisse.push(d); return d; }
function lebender() { const x = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore' }); prozesse.push(x); return x.pid; }
function nachEinerMs() { const t = Date.now(); while (Date.now() <= t + 1) { /* warten */ } }

/* Zwei Bäume: einer im Zugzweig, einer im Wagenzweig. Der Leser kennt nur diese zwei. */
function lage() {
  const dir = wegwerf('zug-vorrang-');
  const zug = wegwerf('zug-baum-');
  const wagen = wegwerf('wagen-baum-');
  sp.zweigLeserSetzen((cwd) => (cwd === zug ? 'zug-v9999-l4-probe' : cwd === wagen ? 'pruefregeln-wagen-probe' : null));
  const ziehen = (d, name, cwd, pid = lebender()) => { const pfad = sp.ticketZiehen({ name, pid, dir: d, cwd }); nachEinerMs(); return pfad; };
  return { dir, zug, wagen, ziehen };
}
const namenMitBaum = (d, l) => sp.wartende({ dir: d }).map((t) => t.name + '@' + (t.cwd === l.zug ? 'zug' : 'wagen'));

test('[Zug-Vorrang·Zweig] gleich benannt: der Zug steht vor dem älteren Wagen — in voll, Klein und Air', () => {
  const l = lage();
  for (const d of [l.dir, path.join(l.dir, 'klein'), path.join(l.dir, 'air')]) {
    fs.mkdirSync(d, { recursive: true });
    l.ziehen(d, 'vor-pre-commit', l.wagen);
    l.ziehen(d, 'vor-pre-commit', l.zug);
    assert.deepEqual(namenMitBaum(d, l), ['vor-pre-commit@zug', 'vor-pre-commit@wagen'], d);
    const [z, w] = sp.wartende({ dir: d });
    assert.equal(z.zweig, 'zug-v9999-l4-probe');
    assert.equal(z.stufe, sp.ZUG_STUFE);
    assert.equal(w.stufe, 1);
  }
});

test('[Zug-Vorrang·Zweig] kein Ablauf: der Zug bleibt vorn, solange er lebt; ein toter Zug ist geräumt', async () => {
  const l = lage();
  l.ziehen(l.dir, 'vor-pre-commit', l.wagen);
  const zugPid = lebender();
  l.ziehen(l.dir, 'landung-vorbereiten', l.zug, zugPid);
  // Es gibt keine Uhrzeit, an der die Stufe endet: weder Datei noch `bis`.
  assert.equal(fs.existsSync(path.join(l.dir, sp.TICKET_VORRANG_DATEI)), false);
  assert.deepEqual(namenMitBaum(l.dir, l), ['landung-vorbereiten@zug', 'vor-pre-commit@wagen']);
  const kind = prozesse.find((x) => x.pid === zugPid);
  await new Promise((r) => { kind.once('exit', r); kind.kill('SIGKILL'); });
  assert.deepEqual(namenMitBaum(l.dir, l), ['vor-pre-commit@wagen'], 'der tote Zug hält niemanden auf');
});

test('[Zug-Vorrang·Zweig] ein gesetzter Ticket-Vorrang (release-) bleibt über dem Zug; der Push über allem', () => {
  const l = lage();
  l.ziehen(l.dir, 'vor-pre-commit', l.zug);
  l.ziehen(l.dir, 'release-teil2', l.wagen);
  l.ziehen(l.dir, 'pre-push', l.wagen);
  sp.ticketVorrangSetzen({ dir: l.dir, praefixe: 'release-', bis: new Date(Date.now() + STUNDE).toISOString(), grund: 'nacht-worte 15:20 Release zuerst' });
  assert.deepEqual(namenMitBaum(l.dir, l), ['pre-push@wagen', 'release-teil2@wagen', 'vor-pre-commit@zug']);
  assert.ok(sp.TICKET_VORRANG_STUFE < sp.ZUG_STUFE && sp.ZUG_STUFE < 1);
});

test('[Zug-Vorrang·Zweig·Rot-Beweis] vorher: ohne Zweig im Ticket und mit abgelaufenem Präfix-Vorrang steht der Zug hinter dem Wagen', () => {
  const l = lage();
  l.ziehen(l.dir, 'vor-pre-commit', l.wagen);
  const zug = l.ziehen(l.dir, 'vor-pre-commit', l.zug);
  // Die alte Form: das Ticket ohne Feld `zweig` (so schrieb ticketZiehen bis heute).
  const e = JSON.parse(fs.readFileSync(zug, 'utf8')); delete e.zweig; fs.writeFileSync(zug, JSON.stringify(e));
  // Der alte Weg: ein Präfix-Vorrang, dessen `bis` mitten im Zuglauf vorbei ist (heute 14:00 und 14:45).
  fs.writeFileSync(path.join(l.dir, sp.TICKET_VORRANG_DATEI), JSON.stringify({ praefixe: ['folge-'], bis: new Date(Date.now() - MIN).toISOString(), grund: 'nacht-worte 13:55', gesetztAm: new Date(Date.now() - STUNDE).toISOString() }));
  assert.deepEqual(namenMitBaum(l.dir, l), ['vor-pre-commit@wagen', 'vor-pre-commit@zug'], 'vorher: der Zug wartet hinter dem Wagen');
});

test('[Zug-Vorrang·Zweig] der echte Leser liest den Zweig aus git, ohne GIT_*-Umgebung', () => {
  sp.zweigLeserSetzen();
  const repo = wegwerf('zug-repo-');
  const git = (...a) => execFileSync('git', ['-C', repo, ...a], { env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'ignore'] });
  git('init', '-q', '-b', 'zug-v9999-l4-probe');
  assert.equal(sp.zweigLesen(repo), 'zug-v9999-l4-probe');
  assert.equal(sp.zweigLesen(wegwerf('kein-repo-')), null);
  assert.equal(sp.istZugZweig('zug-v1050-l4-2026-11-08'), true);
  assert.equal(sp.istZugZweig('pruefregeln-zug-vorrang'), false);
});

// ── (b) Marke: Herzschlag und Obergrenze ─────────────────────────────────────────────────────────────────────────────
function markeSchreiben(dir, baum, { alterMs, lauf }) {
  const gesetztAm = new Date(Date.now() - alterMs).toISOString();
  fs.writeFileSync(path.join(dir, 'reihe'), JSON.stringify({ baum, gesetztAm, ...(lauf ? { lauf } : {}) }) + '\n');
}
const START = 'Sun Nov  8 15:00:00 2026';
const startVon = () => START;

test('[Zug-Vorrang·Marke] über 90 Minuten gilt die Marke mit lebendem Lauf und frischem Herzschlag; reiheHerzschlag frischt auf', () => {
  const dir = wegwerf('marke-');
  const baum = wegwerf('marke-baum-');
  const pid = lebender();
  markeSchreiben(dir, baum, { alterMs: 91 * MIN, lauf: { pid, start: START, herzschlag: new Date(Date.now() - 4 * MIN).toISOString() } });
  assert.equal(sp.reiheLesen({ dir, startVon }).gueltig, true);
  // Herzschlag alt: abgelaufen, mit Grund; nach reiheHerzschlag wieder gültig.
  markeSchreiben(dir, baum, { alterMs: 91 * MIN, lauf: { pid, start: START, herzschlag: new Date(Date.now() - 6 * MIN).toISOString() } });
  const alt = sp.reiheLesen({ dir, startVon });
  assert.equal(alt.gueltig, false);
  assert.match(alt.grund, /^Marke abgelaufen, altes Verhalten$/, 'der Wortlaut bleibt (meldungBelegt hängt an ihm)');
  assert.match(alt.warum, /über 90 Min, Herzschlag nicht frisch/);
  assert.equal(sp.reiheHerzschlag({ dir, pid }), true);
  assert.equal(sp.reiheLesen({ dir, startVon }).gueltig, true);
  assert.equal(sp.reiheHerzschlag({ dir, pid: pid + 1 }), false, 'nur der eingetragene Lauf schlägt');
});

test('[Zug-Vorrang·Marke·Rot-Beweis] über 90 Minuten ohne Lauf, mit totem Lauf oder ohne Herzschlag: abgelaufen; über 6 Std nie', () => {
  const dir = wegwerf('marke-');
  const baum = wegwerf('marke-baum-');
  markeSchreiben(dir, baum, { alterMs: 91 * MIN });
  assert.match(sp.reiheLesen({ dir, startVon }).warum, /über 90 Min, kein Lauf eingetragen/);
  markeSchreiben(dir, baum, { alterMs: 91 * MIN, lauf: { pid: 2 ** 22 + 7, start: START, herzschlag: new Date().toISOString() } });
  assert.match(sp.reiheLesen({ dir, startVon }).warum, /über 90 Min, Lauf PID \d+ lebt nicht/);
  markeSchreiben(dir, baum, { alterMs: 91 * MIN, lauf: { pid: lebender(), start: START } });
  assert.match(sp.reiheLesen({ dir, startVon }).warum, /Herzschlag nicht frisch \(keiner\)/);
  // Obergrenze gegen Leichen: auch mit frischem Herzschlag nach 6 Std nicht mehr, und laut.
  markeSchreiben(dir, baum, { alterMs: 6 * STUNDE + MIN, lauf: { pid: lebender(), start: START, herzschlag: new Date().toISOString() } });
  const o = sp.reiheLesen({ dir, startVon });
  assert.equal(o.gueltig, false);
  assert.equal(o.obergrenze, true);
  assert.match(o.grund, /^OBERGRENZE: Marke älter als 6 Std/);
  assert.equal(sp.REIHE_HOECHSTENS_MS, 6 * STUNDE);
});

// ── (c) Kein Ticket-Vorrang auf allgemeine Namen ─────────────────────────────────────────────────────────────────────
test('[Zug-Vorrang·Präfix] vor-pre-commit, vor- und pre- werden nicht gesetzt; release- und folge- schon', () => {
  const dir = wegwerf('praefix-');
  const bis = new Date(Date.now() + STUNDE).toISOString();
  for (const p of ['vor-pre-commit', 'vor-', 'pre-', 'landung-vorbereiten', 'klein', 'release-,vor-pre-commit']) {
    assert.throws(() => sp.ticketVorrangSetzen({ dir, praefixe: p, bis, grund: 'nacht-worte 13:55 Zugkopf' }), /den Namen trägt jeder Wagen.*Zweig/, p);
  }
  assert.deepEqual(sp.ticketVorrangSetzen({ dir, praefixe: 'release-,folge-', bis, grund: 'nacht-worte 14:54 Folge' }).praefixe, ['release-', 'folge-']);
  assert.deepEqual(sp.ticketVorrangSetzen({ dir, praefixe: 'landung-adr-bestand', bis, grund: 'nacht-worte 12:24 genau dieser Lauf' }).praefixe, ['landung-adr-bestand']);
});

test('[Zug-Vorrang·Präfix·Rot-Beweis] eine schon geschriebene Regel mit vor-pre-commit zieht keinen Wagen mehr vor', () => {
  const l = lage();
  l.ziehen(l.dir, 'xshare-vpc', l.wagen);
  l.ziehen(l.dir, 'vor-pre-commit', l.wagen);
  // So stand die Regel heute 13:55 bis 14:45 (als Datei, am Setzen vorbei).
  fs.writeFileSync(path.join(l.dir, sp.TICKET_VORRANG_DATEI), JSON.stringify({ praefixe: ['vor-pre-commit', 'release-'], bis: new Date(Date.now() + STUNDE).toISOString(), grund: 'nacht-worte 13:55', gesetztAm: new Date().toISOString() }));
  assert.deepEqual(namenMitBaum(l.dir, l), ['xshare-vpc@wagen', 'vor-pre-commit@wagen'], 'der Wagen-vpc überholt nicht');
  assert.deepEqual(sp.ticketVorrangLesen({ dir: l.dir }).praefixe, ['release-'], 'release- gilt weiter');
});
