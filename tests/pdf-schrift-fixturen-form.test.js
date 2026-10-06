'use strict';
/* Der Fixture-Ordner tests/fixtures/pdf-schrift/ steht als GANZER Ordner auf der Ausnahmeliste der Fixture-Felder (Schriftdateien,
   kein Depot; U2-ADR-473 W4, Wort der Gegenlesung 05.10.2026). Eine Ausnahme auf einen Ordner nähme auch aus, was später dort
   landet — etwa ein Depot-JSON. Darum hält diese Probe die Form fest: nur .ttf, .woff2, *.cmap.json und README.md, und jede
   cmap.json ist eine Liste von Unicode-Codepunkten (ganze Zahlen 0–0x10FFFF), sonst nichts. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ORDNER = path.join(__dirname, 'fixtures', 'pdf-schrift');
const ERLAUBT = /^(?:[A-Za-z0-9-]+\.(?:ttf|woff2)|[A-Za-z0-9.-]+\.cmap\.json|README\.md)$/;

function ordnerFormFunde(ordner) {
  const funde = [];
  for (const name of fs.readdirSync(ordner)) {
    const p = path.join(ordner, name);
    if (fs.statSync(p).isDirectory()) { funde.push(name + ': Unterordner'); continue; }
    if (!ERLAUBT.test(name)) { funde.push(name + ': nicht erlaubte Datei'); continue; }
    if (name.endsWith('.cmap.json')) {
      let w = null;
      try { w = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { funde.push(name + ': kein JSON'); continue; }
      const ok = Array.isArray(w) && w.length > 0 && w.every((c) => Number.isInteger(c) && c >= 0 && c <= 0x10FFFF);
      if (!ok) funde.push(name + ': keine reine Codepunkt-Liste');
    }
  }
  return funde;
}

test('[PDF-Schrift-Fixturen] der Ordner trägt nur Schriftdateien, cmap-Listen und die README', () => {
  assert.ok(fs.readdirSync(ORDNER).length >= 5, 'die Suche findet die Fixtures');
  assert.deepEqual(ordnerFormFunde(ORDNER), []);
});

test('[PDF-Schrift-Fixturen·Rot-Beweis] ein abgelegtes depot.json und eine cmap mit fremder Struktur machen rot', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-schrift-fixturen-'));
  try {
    for (const n of fs.readdirSync(ORDNER)) fs.copyFileSync(path.join(ORDNER, n), path.join(tmp, n));
    assert.deepEqual(ordnerFormFunde(tmp), [], 'Gegenprobe: die Kopie ist sauber');
    fs.writeFileSync(path.join(tmp, 'depot.json'), JSON.stringify({ schemaVersion: 91, sektoren: {} }));
    assert.deepEqual(ordnerFormFunde(tmp), ['depot.json: nicht erlaubte Datei']);
    fs.rmSync(path.join(tmp, 'depot.json'));
    fs.writeFileSync(path.join(tmp, 'fremd.cmap.json'), JSON.stringify({ sektoren: { identity: {} } }));
    assert.deepEqual(ordnerFormFunde(tmp), ['fremd.cmap.json: keine reine Codepunkt-Liste']);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
