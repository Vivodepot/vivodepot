'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ADR-Commit-Hash-Wächter rotmachbar — Zug 1, „Register-Reste"
   (12./13.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   `tools/adr-commit-hashes-pruefen.js` sammelt jeden Backtick-Hex-Beleg in
   `docs/adr/*.md` und prüft ihn gegen die echte Git-Historie — MIT Anker-Probe
   (der 05.08.2026-Fehlschlag: ein Worktree ohne Git-Zugriff meldete „92 von 92
   tot"). Geprüft hier: die Sammelfunktion selbst, die Anker-Probe, und
   Rotmachbarkeit gegen eine Kopie (nie im Arbeitsbaum).
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { sammleHashBelege, hashGueltig, ankerProbe } = require('../tools/adr-commit-hashes-pruefen.js');

const REPO = path.join(__dirname, '..');

/* ── 1 · DIE SAMMLUNG SELBST ─────────────────────────────────────────────────── */

test('[ADR-Hash-Wächter] ein Backtick-Hex-Beleg wird gefunden, auch ohne das Wort "Commit" auf derselben Zeile', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-hash-waechter-'));
  const datei = path.join(tmp, 'probe.md');
  // Der Haus-Stil (INDEX-Kurzform): kein "commit" auf dieser Zeile, trotzdem ein Beleg.
  fs.writeFileSync(datei, '- Datum: 29.05.2026 · umgesetzt (Kern `abc1234`, Suite `def5678`)\n');
  try {
    const belege = sammleHashBelege(datei);
    assert.equal(belege.length, 2);
    assert.deepEqual(belege.map(b => b.hash).sort(), ['abc1234', 'def5678']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[ADR-Hash-Wächter] namentlich ausgeschlossene Werte (Passwort/MD5/SNOMED) zählen nicht als Beleg', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-hash-waechter-'));
  const datei = path.join(tmp, 'probe.md');
  fs.writeFileSync(datei, 'Passwort-Beispiel: `12345678`. SNOMED-Code: `91936005`.\n');
  try {
    const belege = sammleHashBelege(datei);
    assert.equal(belege.length, 0, 'beide Werte stehen auf der Ausschlussliste');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[ADR-Hash-Wächter] hashGueltig erkennt den echten HEAD-Commit als gültig', () => {
  const head = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO }).toString().trim().slice(0, 7);
  assert.equal(hashGueltig(head), true);
});

test('[ADR-Hash-Wächter] hashGueltig weist einen erfundenen Hash als ungültig zurück', () => {
  assert.equal(hashGueltig('0000000'), false);
});

test('[ADR-Hash-Wächter] die Anker-Probe selbst liefert einen gültigen HEAD-Hash', () => {
  const head = ankerProbe();
  assert.match(head, /^[0-9a-f]{7,40}$/);
});

/* ── 2 · ROTMACHBARKEIT: gepflanzt auf einer KOPIE, nie im Baum ─────────────── */

function gateGegenOrdner(dateien) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adr-hash-waechter-gate-'));
  for (const [name, inhalt] of Object.entries(dateien)) {
    fs.writeFileSync(path.join(tmp, name), inhalt);
  }
  try {
    const r = cp.spawnSync('node', ['tools/adr-commit-hashes-pruefen.js', '--ordner', tmp, '--json'], {
      cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('[ADR-Hash-Wächter] Negativkontrolle: eine Datei mit nur gültigen Hashes lässt das Gate grün', () => {
  const head = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO }).toString().trim().slice(0, 7);
  const r = gateGegenOrdner({ 'probe.md': '- **Commit:** `' + head + '`\n' });
  assert.equal(r.code, 0, 'Ausgabe:\n' + r.out.slice(-400));
});

test('[ADR-Hash-Wächter] Positivkontrolle: ein erfundener Hash macht das Gate ROT', () => {
  const r = gateGegenOrdner({ 'probe.md': '- **Commit:** `dead0ff` (ein Hash, den es nie gab)\n' });
  assert.equal(r.code, 1, 'Ausgabe:\n' + r.out.slice(-400));
  const daten = JSON.parse(r.out.match(/\{[\s\S]*\}/)[0]);
  assert.equal(daten.tot, 1);
  assert.equal(daten.totListe[0].hash, 'dead0ff');
});

/* ── 3 · GEGEN DAS ECHTE PRODUKT: keine tote Referenz mehr, nach Zug 1 ──────── */

test('[ADR-Hash-Wächter] die echten ADR-Dateien tragen heute keine tote Commit-Hash-Referenz', () => {
  const r = cp.spawnSync('node', ['tools/adr-commit-hashes-pruefen.js', '--json'],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, 'Ausgabe:\n' + ((r.stdout || '') + (r.stderr || '')).slice(-600));
});
