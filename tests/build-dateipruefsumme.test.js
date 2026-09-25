'use strict';
/* ════════════════════════════════════════════════════════════════════════
   build-dateipruefsumme — der Ganzdatei-Nachweisweg wird erzeugt, nicht von
   Hand nachgezogen (Auftrag, 03.09.2026, v1-Dokumente-Audit Frage 3)
   ────────────────────────────────────────────────────────────────────────
   Diese Suite prüft: (1) Format-Parsing (Rundlauf, fehlende/kaputte Datei),
   (2) die echte `vivodepot.html` + die echte `vivodepot.html.sha256`: keine
   Drift (Positivkontrolle des Ist-Zustands, dieselbe Bauart wie
   `tests/sbom-pflegen.test.js`), (3) Rotmachbarkeit — ein einziges geändertes
   Byte in einer Kopie lässt `--check` mit Exit 1 abbrechen, (4) `--check`
   schreibt nie, unabhängig vom Ergebnis.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { aktuellerHash, zeile, eingecheckterWert, ZIEL_DATEI, PRUEFSUMMEN_DATEI } =
  require('../tools/build-dateipruefsumme.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'build-dateipruefsumme.js');

function frischesRepoVerzeichnis() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-dateipruefsumme-test-'));
  fs.copyFileSync(path.join(REPO, ZIEL_DATEI), path.join(dir, ZIEL_DATEI));
  return dir;
}

test('[Dateiprüfsumme] zeile() erzeugt das shasum-Format, eingecheckterWert() liest es zurück', () => {
  const hash = 'a'.repeat(64);
  const roh = zeile(hash);
  assert.equal(roh, hash + '  vivodepot.html\n');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-dateipruefsumme-test-'));
  fs.writeFileSync(path.join(dir, PRUEFSUMMEN_DATEI), roh);
  const gelesen = eingecheckterWert(dir);
  assert.equal(gelesen.hash, hash);
});

test('[Dateiprüfsumme] eingecheckterWert() gibt null, wenn die Datei fehlt oder kein Hex-Hash am Anfang steht', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-dateipruefsumme-test-'));
  assert.equal(eingecheckterWert(dir), null, 'Datei fehlt komplett');
  fs.writeFileSync(path.join(dir, PRUEFSUMMEN_DATEI), 'kein-hash-hier\n');
  assert.equal(eingecheckterWert(dir), null, 'kein 64-stelliger Hex-Hash am Zeilenanfang');
});

test('[Dateiprüfsumme] echte vivodepot.html + echte vivodepot.html.sha256: keine Drift (Positivkontrolle des Ist-Zustands)', () => {
  const aktuell = aktuellerHash(REPO);
  const eingecheckt = eingecheckterWert(REPO);
  assert.ok(eingecheckt, 'vivodepot.html.sha256 muss existieren und lesbar sein');
  assert.equal(eingecheckt.hash, aktuell,
    'die echte vivodepot.html.sha256 soll HEUTE zur echten vivodepot.html passen — sonst ist das ein echter Befund, kein Testfehler');
});

test('[Dateiprüfsumme] Rotmachbarkeit — ein geändertes Byte in der Kopie lässt --check mit Exit 1 abbrechen', () => {
  const dir = frischesRepoVerzeichnis();
  execFileSync('node', [WERKZEUG, '--repo', dir]);   // schreibt eine korrekte Prüfsumme für die Kopie

  assert.doesNotThrow(() => execFileSync('node', [WERKZEUG, '--check', '--repo', dir]),
    'unverändert soll --check grün sein');

  const p = path.join(dir, ZIEL_DATEI);
  const bytes = fs.readFileSync(p);
  const mutiert = Buffer.from(bytes);
  mutiert[mutiert.length - 1] = mutiert[mutiert.length - 1] ^ 0xff;   // ein einziges Byte kippen
  fs.writeFileSync(p, mutiert);

  assert.throws(() => execFileSync('node', [WERKZEUG, '--check', '--repo', dir], { stdio: 'pipe' }),
    'ein einziges verändertes Byte muss --check zum Scheitern bringen');
});

test('[Dateiprüfsumme] --check schreibt nie — auch nicht bei Drift', () => {
  const dir = frischesRepoVerzeichnis();
  fs.writeFileSync(path.join(dir, PRUEFSUMMEN_DATEI), 'f'.repeat(64) + '  ' + ZIEL_DATEI + '\n');   // absichtlich falsch
  const vorher = fs.readFileSync(path.join(dir, PRUEFSUMMEN_DATEI), 'utf8');

  assert.throws(() => execFileSync('node', [WERKZEUG, '--check', '--repo', dir], { stdio: 'pipe' }));

  const nachher = fs.readFileSync(path.join(dir, PRUEFSUMMEN_DATEI), 'utf8');
  assert.equal(nachher, vorher, '--check darf die Prüfsumme nicht heimlich berichtigen — sonst wäre sie immer richtig und nie eine Aussage');
});
