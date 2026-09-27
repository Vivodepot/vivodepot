'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Test — `faktenbasis-erzeugen --check` nennt die abweichende Zeile und trennt „nicht messbar" vom Unterschied
   (21.09.2026, Spezifikation §36.1b: drei Ausgänge, nicht zwei)
   ─────────────────────────────────────────────────────────────────────────────
   DER ANLASS, GEMESSEN. In einem Arbeitsbaum ohne node_modules war das Wächter-Register nicht ladbar. Der Fehler wurde
   verschluckt (`catch (_) { waechterZahl = null; }`), die Zeile hieß „nicht ermittelbar" (`?? 'nicht ermittelbar'`), und
   --check meldete nur „docs/faktenbasis.md weicht vom Kern ab", ohne die Zeile und ohne den Grund. Wer es nachmessen
   wollte, musste die Datei neu erzeugen, vergleichen und zwei Achsen einzeln ausschließen. Ein FEHLEN war zu einem WERT
   geworden.

   Drei Ausgänge:  gleich · abweichend (die Zeilen werden genannt) · nicht messbar (besteht nicht, auch nicht bei
   gleicher Zeile in der Datei). Die Prüfung ohne Zeile ist die Prüfung, die jemanden ruft, ohne zu sagen, wohin.
   ═════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'faktenbasis-erzeugen.js');
const ECHT = path.join(REPO, 'docs', 'faktenbasis.md');
const { vergleichsBefund } = require(WERKZEUG);

const KOPF = '**Erzeugt am:** 2026-09-21 · **Commit:** `abc1234` · **Werkzeug:** `tools/faktenbasis-erzeugen.js`';
const text = (...zeilen) => [KOPF, ...zeilen].join('\n') + '\n';

function arbeitsordner(t) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'faktenbasis-check-'));
  t.after(() => fs.rmSync(d, { recursive: true, force: true }));
  return d;
}

function check(ausgabe, extra = []) {
  return spawnSync(process.execPath, [...extra, WERKZEUG, '--check', '--ausgabe', ausgabe], { encoding: 'utf8', cwd: REPO });
}

// ── Der Vergleichsbefund, rein ───────────────────────────────────

test('[gleich] dieselben Zeilen, nur Erzeugungsdatum und Commit anders: gleich, nichts genannt', () => {
  const a = text('- Schema-Version: 87', '- Wächter-Register (`tools/waechter-register.js`): 117');
  const b = a.replace('abc1234', 'def5678').replace('2026-09-21', '2026-09-22');
  const r = vergleichsBefund(a, b);
  assert.equal(r.gleich, true);
  assert.deepEqual([r.ungemessen, r.nurDatei, r.nurNeu], [[], [], []]);
});

test('[abweichend] eine geänderte Zeile wird BENANNT: die der Datei und die des Kerns', () => {
  const a = text('- Schema-Version: 87 · SCHALEN_STAND: v767', '- Anlässe: 12');
  const b = text('- Schema-Version: 87 · SCHALEN_STAND: v768', '- Anlässe: 12');
  const r = vergleichsBefund(a, b);
  assert.equal(r.gleich, false);
  assert.deepEqual(r.nurDatei, ['- Schema-Version: 87 · SCHALEN_STAND: v767']);
  assert.deepEqual(r.nurNeu, ['- Schema-Version: 87 · SCHALEN_STAND: v768']);
  assert.deepEqual(r.ungemessen, []);
});

test('[abweichend] nur die Reihenfolge anders: das wird als solche benannt, nicht als leerer Unterschied', () => {
  const a = text('- A: 1', '- B: 2');
  const b = text('- B: 2', '- A: 1');
  const r = vergleichsBefund(a, b);
  assert.equal(r.gleich, false);
  assert.equal(r.nurReihenfolge, true);
  assert.deepEqual([r.nurDatei, r.nurNeu], [[], []]);
});

test('[Rot-Beweis · nicht messbar] „nicht ermittelbar" in der Erzeugung ist ein Ausfall der Messung, kein Unterschied im Inhalt', () => {
  const a = text('- Schema-Version: 87', '- Wächter-Register (`tools/waechter-register.js`): 117');
  const b = text('- Schema-Version: 87', '- Wächter-Register (`tools/waechter-register.js`): nicht ermittelbar (Cannot find module)');
  const r = vergleichsBefund(a, b);
  assert.equal(r.ungemessen.length, 1);
  assert.match(r.ungemessen[0], /Wächter-Register.*nicht ermittelbar \(Cannot find module\)/);
  assert.deepEqual([r.nurDatei, r.nurNeu], [[], []], 'die ungemessene Zeile steht nicht noch einmal als Inhaltsunterschied da');
});

test('[Rot-Beweis · nicht messbar] auch bei GLEICHER Zeile in der Datei: ungemessen ist nicht grün', () => {
  const zeile = '- Wächter-Register (`tools/waechter-register.js`): nicht ermittelbar (Cannot find module)';
  const r = vergleichsBefund(text('- Schema-Version: 87', zeile), text('- Schema-Version: 87', zeile));
  assert.equal(r.gleich, true, 'inhaltlich gleich …');
  assert.equal(r.ungemessen.length, 1, '… und trotzdem gemeldet');
});

// ── Das Werkzeug, an der echten Erzeugung ────────────────────────

test('[Werkzeug · abweichend] eine geänderte Zeile in einer Kopie der echten Datei wird genannt, Exit 1', (t) => {
  const d = arbeitsordner(t);
  const kopie = path.join(d, 'faktenbasis.md');
  const echt = fs.readFileSync(ECHT, 'utf8');
  assert.match(echt, /SCHALEN_STAND: v\d+/, 'Vorbedingung: die echte Datei trägt die Zeile');
  fs.writeFileSync(kopie, echt.replace(/SCHALEN_STAND: v\d+/, 'SCHALEN_STAND: v0'));
  const r = check(kopie);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /weicht vom Kern ab/);
  assert.match(r.stderr, /Datei:.*SCHALEN_STAND: v0/, 'die Zeile der Datei wird genannt');
  assert.match(r.stderr, /Kern: .*SCHALEN_STAND: v\d+/, 'und die des Kerns');
  assert.match(r.stderr, /--ohne-suite/, 'der billige Befehl bleibt genannt');
});

test('[Werkzeug · Rot-Beweis · nicht messbar] ein nicht ladbares Wächter-Register ist NICHT MESSBAR, mit Zeile und Grund, Exit 1', (t) => {
  const d = arbeitsordner(t);
  const kopie = path.join(d, 'faktenbasis.md'); fs.copyFileSync(ECHT, kopie);
  // Ein Vorlader, der das Laden des Registers scheitern lässt: derselbe Zustand wie ein Arbeitsbaum ohne node_modules.
  const vorlader = path.join(d, 'register-fehlt.js');
  fs.writeFileSync(vorlader, "const M = require('node:module'); const laden = M._load;\n"
    + "M._load = function (anfrage, ...rest) { if (/waechter-register/.test(String(anfrage))) throw new Error('simuliert: Modul fehlt'); return laden.call(this, anfrage, ...rest); };\n");
  const r = check(kopie, ['--require', vorlader]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /NICHT MESSBAR/);
  assert.match(r.stderr, /Wächter-Register.*nicht ermittelbar \(simuliert: Modul fehlt\)/, 'Zeile UND Grund in einer Zeile');
  assert.doesNotMatch(r.stderr, /weicht vom Kern ab/, 'kein Inhaltsunterschied: die Datei ist unverändert');
});

test('[Werkzeug · Rot-Beweis · nicht messbar] die Datei trägt dieselbe „nicht ermittelbar"-Zeile: gleich, aber trotzdem Exit 1', (t) => {
  const d = arbeitsordner(t);
  const kopie = path.join(d, 'faktenbasis.md');
  fs.writeFileSync(kopie, fs.readFileSync(ECHT, 'utf8').replace(/^- Wächter-Register.*$/m,
    '- Wächter-Register (`tools/waechter-register.js`): nicht ermittelbar (simuliert: Modul fehlt)'));
  const vorlader = path.join(d, 'register-fehlt.js');
  fs.writeFileSync(vorlader, "const M = require('node:module'); const laden = M._load;\n"
    + "M._load = function (anfrage, ...rest) { if (/waechter-register/.test(String(anfrage))) throw new Error('simuliert: Modul fehlt'); return laden.call(this, anfrage, ...rest); };\n");
  const r = check(kopie, ['--require', vorlader]);
  assert.equal(r.status, 1, 'eine unbemerkt ausgefallene Messung darf nicht bestehen: ' + r.stdout + r.stderr);
  assert.match(r.stderr, /NICHT MESSBAR/);
});
