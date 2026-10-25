'use strict';
/* Befund JSON-DOPPELTE-SCHLUESSEL (20.10.2026): kein Objekt in einer versionierten JSON-Datei nennt einen Schlüssel zweimal —
   JSON.parse nähme still den letzten Wert. Wächter über alle .json des Repos, mit Rot-Beweis an erfundenen Texten. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const J = require('../tools/json-doppelte-schluessel-pruefen.js');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'json-doppelte-schluessel-pruefen.js');

test('[JSON-Schlüssel] keine versionierte JSON-Datei nennt einen Schlüssel doppelt', () => {
  const dateien = J.jsonDateien(REPO);
  assert.ok(dateien.length > 100, 'die Liste trifft die JSON-Dateien des Repos (' + dateien.length + ')');
  const { funde, kaputt } = J.pruefen(REPO, dateien);
  assert.deepStrictEqual(kaputt, []);
  assert.deepStrictEqual(funde.map((f) => f.datei + ' ' + f.pfad + ' ' + f.schluessel + ' ×' + f.anzahl), []);
});

test('[JSON-Schlüssel·Rot-Beweis] doppelt mit gleichem und mit anderem Wert, verschachtelt, in Arrays, über Escapes', () => {
  assert.deepStrictEqual(J.doppelteSchluessel('{"a": 1, "b": {"c": 1}}'), []);
  assert.deepStrictEqual(J.doppelteSchluessel('{"a": 1, "a": 1}'), [{ pfad: '$', schluessel: 'a', anzahl: 2 }], 'gleicher Wert');
  assert.deepStrictEqual(J.doppelteSchluessel('{"a": "x", "b": 2, "a": "y"}'), [{ pfad: '$', schluessel: 'a', anzahl: 2 }], 'anderer Wert');
  assert.deepStrictEqual(J.doppelteSchluessel('{"h": {"d.html": "1", "e": "2", "d.html": "1", "d.html": "1"}}'),
    [{ pfad: '.h', schluessel: 'd.html', anzahl: 3 }], 'verschachtelt, dreimal');
  assert.deepStrictEqual(J.doppelteSchluessel('{"l": [{"k": 1}, {"k": 1, "k": 2}]}'), [{ pfad: '.l[1]', schluessel: 'k', anzahl: 2 }], 'im Array');
  assert.deepStrictEqual(J.doppelteSchluessel('{"ab": 1, "a\\u0062": 2}'), [{ pfad: '$', schluessel: 'ab', anzahl: 2 }], 'Escape ist derselbe Schlüssel');
  assert.deepStrictEqual(J.doppelteSchluessel('{"a": "{\\"a\\": 1, \\"a\\": 2}", "s": "\\\\"}'), [], 'Schlüssel in einer Zeichenkette zählen nicht');
  assert.throws(() => J.doppelteSchluessel('{"a": 1,}'), 'kein JSON wirft');
});

test('[JSON-Schlüssel·Rot-Beweis] das Werkzeug endet rot mit Datei und Schlüssel, grün ohne Fund', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'json-schluessel-'));
  try {
    fs.writeFileSync(path.join(d, 'gut.json'), '{"a": 1}\n');
    fs.writeFileSync(path.join(d, 'liste.json'), '{"nachtrag": "−1", "x": 0, "nachtrag": "+1"}\n');
    let fehler = null;
    try { execFileSync(process.execPath, [WERKZEUG, '--wurzel', d, '--datei', 'gut.json', '--datei', 'liste.json'], { stdio: 'pipe' }); } catch (e) { fehler = e; }
    assert.ok(fehler, 'rot');
    assert.strictEqual(fehler.status, 1);
    assert.match(fehler.stderr.toString(), /liste\.json \$ nennt „nachtrag“ 2-mal/);
    const gruen = execFileSync(process.execPath, [WERKZEUG, '--wurzel', d, '--datei', 'gut.json'], { stdio: 'pipe' }).toString();
    assert.match(gruen, /kein doppelter Schlüssel/);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
