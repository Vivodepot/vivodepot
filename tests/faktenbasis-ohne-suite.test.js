'use strict';
/* ════════════════════════════════════════════════════════════════════════
   faktenbasis-erzeugen --ohne-suite („der vierte Träger", 07.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Fährt die echte CLI als Kindprozess (wie tests/faktenbasis-aktualitaet.test.js),
   gegen eine TEMP-Kopie über `--ausgabe` — nie die committete docs/faktenbasis.md.
   Der Rot-Beweis, den der Auftrag ausdrücklich verlangt: `--ohne-suite` darf eine
   bestehende Suite-Zahl nicht verändern — weder raten noch auf Null setzen.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'faktenbasis-erzeugen.js');

function tempPfad() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-faktenbasis-ohne-suite-test-')), 'faktenbasis.md');
}

test('[Rot-Beweis] --ohne-suite übernimmt eine bestehende Suite-Zahl unverändert, misst nicht neu', () => {
  const temp = tempPfad();
  // Grundgerüst (ohne --ohne-suite, ohne --check) — die Suite-Zeile ist hier noch ein
  // Platzhaltertext, kein Meßwert (s. `pruefebeneZahlen`, `--ausgabe`-Zweig) — irrelevant für
  // diese Probe, nur der ANKER (Zeilenanfang) muss stehen.
  execFileSync('node', [WERKZEUG, '--ausgabe', temp], { cwd: REPO });
  const vorher = fs.readFileSync(temp, 'utf8');
  const geplanteZahl = '424242';
  const praepariert = vorher.replace(/^- Suite \(Node-Tests,.*$/m,
    '- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): ' + geplanteZahl);
  assert.notEqual(praepariert, vorher, 'Anker für die Suite-Zeile nicht gefunden — Test veraltet');
  fs.writeFileSync(temp, praepariert);

  const start = Date.now();
  execFileSync('node', [WERKZEUG, '--ohne-suite', '--ausgabe', temp], { cwd: REPO });
  const dauerMs = Date.now() - start;

  const nachher = fs.readFileSync(temp, 'utf8');
  assert.match(nachher, new RegExp(geplanteZahl),
    '--ohne-suite muss die bestehende Zahl unverändert übernehmen, nicht neu messen');
  assert.ok(!/nicht ermittelt|UNGEMESSEN|nicht neu gemessen/.test(nachher.match(/^- Suite \(Node-Tests,.*$/m)[0]),
    'die geschriebene Zeile darf keinen Platzhalter tragen, wenn eine echte Zahl bestand');
  // Ein echter Suite-Lauf dauert ~50s (s. Kommentar in pruefebeneZahlen) — 15s ist eine grosszügige
  // Schwelle, die jeden versehentlichen Rückfall auf den teuren Pfad zuverlässig fängt, ohne auf
  // exakte Millisekunden angewiesen zu sein.
  assert.ok(dauerMs < 15000, '--ohne-suite lief ' + dauerMs + 'ms — das riecht nach einem echten Suite-Lauf (~50s)');

  fs.rmSync(path.dirname(temp), { recursive: true, force: true });
});

test('[Rot-Beweis Schwelle] --ohne-suite bricht ab, wenn die Ausgabedatei noch nicht existiert — keine geratene Zahl', () => {
  const temp = tempPfad(); // Pfad reserviert, Datei NICHT angelegt
  fs.rmSync(temp, { force: true });
  assert.throws(
    () => execFileSync('node', [WERKZEUG, '--ohne-suite', '--ausgabe', temp], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] }),
    (e) => {
      assert.equal(e.status, 1);
      assert.match(e.stderr.toString(), /existiert noch nicht/);
      return true;
    },
  );
  fs.rmSync(path.dirname(temp), { recursive: true, force: true });
});

test('[Rot-Beweis Schwelle] --ohne-suite bricht ab, wenn die Datei keine Suite-Zeile trägt — keine geratene Zahl', () => {
  const temp = tempPfad();
  fs.writeFileSync(temp, '# Ohne Suite-Zeile\n\nkein Anker hier.\n');
  assert.throws(
    () => execFileSync('node', [WERKZEUG, '--ohne-suite', '--ausgabe', temp], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] }),
    (e) => {
      assert.equal(e.status, 1);
      assert.match(e.stderr.toString(), /keine Suite-Zeile/);
      return true;
    },
  );
  fs.rmSync(path.dirname(temp), { recursive: true, force: true });
});

test('[Meldung] --check nennt den billigen Behebungsweg (--ohne-suite), nicht nur den teuren', () => {
  const temp = tempPfad();
  execFileSync('node', [WERKZEUG, '--ausgabe', temp], { cwd: REPO });
  const echt = fs.readFileSync(temp, 'utf8');
  const verfaelscht = echt.replace('## Sektoren, Felder, Unterfelder', '## Sektoren, Felder, Unterfelder (verfälscht)');
  assert.notEqual(verfaelscht, echt, 'Anker nicht gefunden — Test veraltet');
  fs.writeFileSync(temp, verfaelscht);

  assert.throws(
    () => execFileSync('node', [WERKZEUG, '--check', '--ausgabe', temp], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] }),
    (e) => {
      assert.equal(e.status, 1);
      assert.match(e.stderr.toString(), /--ohne-suite/, 'die Drift-Meldung soll den billigen Behebungsweg nennen');
      return true;
    },
  );
  fs.rmSync(path.dirname(temp), { recursive: true, force: true });
});

test('[Gegenprobe] --ohne-suite gegen eine unveränderte Datei bleibt --check-grün', () => {
  const temp = tempPfad();
  execFileSync('node', [WERKZEUG, '--ausgabe', temp], { cwd: REPO });
  // Erst eine echte Zahl in die Platzhalter-Zeile setzen (wie im ersten Test), sonst würde
  // --ohne-suite auf einem reinen Test-Platzhalter aufsetzen, der real nie vorkommt.
  const roh = fs.readFileSync(temp, 'utf8');
  fs.writeFileSync(temp, roh.replace(/^- Suite \(Node-Tests,.*$/m,
    '- Suite (Node-Tests, echter Lauf `node --test`, TAP-Summenzeile): 1'));

  execFileSync('node', [WERKZEUG, '--ohne-suite', '--ausgabe', temp], { cwd: REPO });
  const out = execFileSync('node', [WERKZEUG, '--check', '--ausgabe', temp], { cwd: REPO }).toString();
  assert.match(out, /ist aktuell/);
  fs.rmSync(path.dirname(temp), { recursive: true, force: true });
});
