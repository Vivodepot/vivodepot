'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Block 5 — der Wahrhaftigkeits-Wächter, rotmachbar (B10 · T-Raum, 30.07.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER WÄCHTER (`tools/wahrhaftigkeit-fristen.js`) findet jede Zahl, Frist,
   Intervall und Rechtsaussage im Bürgertext (STRINGS) und hält sie gegen
   `tools/wahrhaftigkeit-grundlinie.json`. Rot wird er, sobald eine Aussage
   auftaucht, die die Grundlinie NICHT kennt — genau die „erfundene Zwölf-Monats-
   Frist", der schwerste Fund der Projektgeschichte.

   WAS HIER GEPRÜFT WIRD:
     · der Tokenizer sieht wirklich hin (Regel 16): Fristen, ausgeschriebene
       Zahlwörter und Paragrafen, und er zerlegt „§ 1358 Abs. 1 BGB" NICHT in
       Bruchstücke;
     · die Bewertung ist rein und trennt neu / ungetestet / belegt;
     · ROTMACHBARKEIT (Regel 18): eine auf einer KOPIE gepflanzte Frist macht das
       Gate rot, die unveränderte Kopie lässt es grün. Gepflanzt wird über
       `KERN_HTML_PATH` auf einer Kopie in os.tmpdir — nie im Arbeitsbaum
       (`vivodepot.html` schreibt nur Fix).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { tokens, gateBewerten, kennung } = require('../tools/wahrhaftigkeit-fristen.js');

const REPO = path.join(__dirname, '..');
// Seit S8 (U2-ADR-428) trägt erst das gebackene deutsche Produkt den deutschen Satz, den dieser Wächter liest; eine Kopie des rohen Gerüsts wäre blind.
const PRODUKT = require('./produkt-html-erzeugen.js').produktHtml('privat-de');

/* ── 1 · DER TOKENIZER SIEHT HIN (Regel 16) ────────────────────────────────── */

test('[Block5] der Tokenizer findet Fristen — Ziffer UND ausgeschrieben', () => {
  assert.deepEqual(tokens('Alle 6 Monate'), ['6 Monate']);
  assert.deepEqual(tokens('endet sechs Monate nach dem Befund'), ['sechs Monate'],
    'Eine ausgeschriebene Frist muss gefunden werden — der schwerste Fund hätte „zwölf Monate" '
    + 'lauten können, und ein reiner Ziffern-Scan wäre daran vorbeigelaufen.');
  assert.deepEqual(tokens('Alle 2 Jahre'), ['2 Jahre']);
});

test('[Block5] ein Paragraf bleibt EIN Rechtsverweis, zerfällt nicht in Zahlen', () => {
  assert.deepEqual(tokens('nur Gesundheit (§ 1358 Abs. 1 BGB)'), ['§ 1358 Abs. 1 BGB'],
    'Zerfiele der Verweis in „1358" und „1", trüge die Grundlinie drei Aussagen statt einer, und '
    + 'jede Formulierungsänderung am Paragrafen machte grundlos rot.');
});

test('[Block5] ein Text ohne Zahl trägt keine Aussage — kein Rauschen', () => {
  assert.deepEqual(tokens('Ihr digitales Depot, in Ihrer Hand.'), []);
});

/* ── 2 · DIE BEWERTUNG IST REIN UND TRENNT DIE KÜBEL ───────────────────────── */

const GL = { aussagen: {
  'k1|6 Monate': { status: 'ungetestet', quelle: null },
  'k2|§ 1358 Abs. 1 BGB': { status: 'quelle', quelle: '§ 1358 BGB' },
} };

test('[Block5] eine bekannte Aussage ist nicht neu; eine unbekannte schon', () => {
  const r = gateBewerten([{ schluessel: 'k1', token: '6 Monate', text: 'Alle 6 Monate' }], GL);
  assert.equal(r.neu.length, 0, 'k1|6 Monate steht in der Grundlinie');
  assert.equal(r.ungetestet.length, 1);

  const r2 = gateBewerten([{ schluessel: 'k1', token: '12 Monate', text: 'Alle 12 Monate' }], GL);
  assert.equal(r2.neu.length, 1, 'k1|12 Monate ist NEU — die geänderte Frist muss auffallen');
});

test('[Block5] eine belegte Aussage landet nicht im Ungetestet-Kübel', () => {
  const r = gateBewerten([{ schluessel: 'k2', token: '§ 1358 Abs. 1 BGB', text: '…' }], GL);
  assert.equal(r.belegt.length, 1);
  assert.equal(r.ungetestet.length, 0);
});

/* ── 3 · ROTMACHBARKEIT: gepflanzt auf einer KOPIE, nie im Baum ─────────────── */

function gateGegenKopie(inhalt) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'block5-'));
  const f = path.join(tmp, 'vivodepot.html');
  fs.writeFileSync(f, inhalt);
  try {
    const r = cp.spawnSync('node', ['tools/wahrhaftigkeit-fristen.js', '--gate'],
      { cwd: REPO, encoding: 'utf8', env: { ...process.env, KERN_HTML_PATH: f }, maxBuffer: 64 * 1024 * 1024 });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('[Block5] Negativkontrolle: die unveränderte Kopie lässt das Gate grün', () => {
  const html = fs.readFileSync(PRODUKT, 'utf8');
  const r = gateGegenKopie(html);
  assert.equal(r.code, 0, 'Gegen den heutigen Stand darf das Gate nicht rot sein — sonst meldete es '
    + 'jeden Lauf als Fund und würde abgeschaltet. Ausgabe:\n' + r.out.slice(-300));
});

test('[Block5] Positivkontrolle: eine erfundene „Alle 12 Monate" macht das Gate ROT', () => {
  const html = fs.readFileSync(PRODUKT, 'utf8');
  const anker = 'Alle 6 Monate';
  assert.equal(html.split(anker).length - 1, 1,
    'Der Pflanz-Anker „' + anker + '" muss genau einmal vorkommen, sonst pflanzt die Probe ins Leere.');
  const r = gateGegenKopie(html.replace(anker, 'Alle 12 Monate'));
  assert.equal(r.code, 1, 'Eine neue, unklassifizierte Frist MUSS rot machen — das ist der schwerste '
    + 'Fund der Projektgeschichte. Ausgabe:\n' + r.out.slice(-300));
  assert.match(r.out, /12 Monate/, 'Das Rot muss die neue Aussage beim Namen nennen, nicht irgendwie rot sein.');
});

/* ── 4 · GEGEN DAS ECHTE PRODUKT: die Grundlinie ist in Sync ────────────────── */

test('[Block5] das echte Produkt trägt keine unklassifizierte Aussage (Grundlinie aktuell)', () => {
  const r = cp.spawnSync('node', ['tools/wahrhaftigkeit-fristen.js', '--gate'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, 'Das Gate ist gegen den eingecheckten Stand rot — die Grundlinie hinkt '
    + 'dem Bürgertext hinterher. Neu klassifizieren und `--grundlinie-schreiben`. Ausgabe:\n'
    + ((r.stdout || '') + (r.stderr || '')).slice(-400));
});
