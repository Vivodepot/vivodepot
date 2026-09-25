'use strict';
/* ════════════════════════════════════════════════════════════════════════
   faktenbasis-aktualitaet — der Wächter aus Zug 1 des „Die
   Faktenbasis — und STANDARDS.md als erstes Dokument" (13.08.2026).
   ────────────────────────────────────────────────────────────────────────
   Fährt die echte CLI (`node tools/faktenbasis-erzeugen.js --check`) als
   Kindprozess — nicht die internen Funktionen (die deckt bereits tests/
   faktenbasis-erzeugen.test.js ab). Diese Datei prüft die ÄUSSERE Zusage:
   der Exit-Code, den pre-commit/pre-push tatsächlich auswerten würden.

   Rot-Beweis (Auftrag Zug 1, wörtlich verlangt): „eine Zahl im Kern ändern,
   belegen, dass der Wächter anschlägt, zurücknehmen." Über `--ausgabe` auf
   einer TEMP-Kopie, nicht auf der committeten docs/faktenbasis.md — ein
   erster Versuch mutierte die echte Datei testweise und geriet in einen
   Schreib-Wettlauf mit tests/faktenbasis-erzeugen.test.js, die im selben
   Suite-Lauf nebenläufig dieselbe Datei liest (Node startet Testdateien
   parallel). `--ausgabe` ist dieselbe stehende Regel wie bei sbom-pflegen.js
   (`--html`/`--sbom`): das Werkzeug nimmt den zu prüfenden Gegenstand als
   Argument, damit die Suite es prüfen kann, ohne den Bestand anzufassen.
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
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vd-faktenbasis-test-')), 'faktenbasis.md');
}

test('[Wächter] node tools/faktenbasis-erzeugen.js --check ist heute grün (Exit 0) — gegen die echte docs/faktenbasis.md', () => {
  const out = execFileSync('node', [WERKZEUG, '--check'], { cwd: REPO }).toString();
  assert.match(out, /ist aktuell/);
});

test('[Rot-Beweis] eine gepflanzte Abweichung lässt --check mit Exit 1 scheitern', () => {
  const temp = tempPfad();
  execFileSync('node', [WERKZEUG, '--ausgabe', temp], { cwd: REPO });
  const echt = fs.readFileSync(temp, 'utf8');
  const verfaelscht = echt.replace('## Sektoren, Felder, Unterfelder', '## Sektoren, Felder, Unterfelder (manipuliert)');
  assert.notEqual(verfaelscht, echt, 'Fixture griff nicht — Ankertext nicht gefunden');
  fs.writeFileSync(temp, verfaelscht);

  assert.throws(
    () => execFileSync('node', [WERKZEUG, '--check', '--ausgabe', temp], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] }),
    (e) => e.status === 1,
    '--check hätte bei einer gepflanzten Abweichung mit Exit 1 scheitern müssen',
  );

  fs.rmSync(path.dirname(temp), { recursive: true, force: true });
});

test('[Zurückgenommen] dieselbe Temp-Datei ohne Manipulation ist wieder grün', () => {
  const temp = tempPfad();
  execFileSync('node', [WERKZEUG, '--ausgabe', temp], { cwd: REPO });
  const out = execFileSync('node', [WERKZEUG, '--check', '--ausgabe', temp], { cwd: REPO }).toString();
  assert.match(out, /ist aktuell/);
  fs.rmSync(path.dirname(temp), { recursive: true, force: true });
});
