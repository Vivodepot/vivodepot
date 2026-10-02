'use strict';
/* ═════════════════════════════════════════════════════════════════
   tools/opencode-release-vorbereiten.js — Anhänge und Befehle für ein GitLab-Release auf openCoDE (Badge PACKAGES).
   Geprüft gegen die Fixture tests/fixtures/opencode-release-quelle: der Ordner trägt die Anhänge unverändert mit
   SHA256SUMS, release.json nimmt den CHANGELOG-Abschnitt der Fassung und verlinkt jede Paketdatei, die Befehle lesen das
   Token nur aus der Umgebung. Rot-Beweise: fehlende Anlage, fehlender CHANGELOG-Abschnitt, falsches Fassungsformat.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const R = require('../tools/opencode-release-vorbereiten.js');

function mitZiel(tun) {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-release-'));
  try { return tun(ziel); } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
}
function mitKopie(aendern, tun) {
  const quelle = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-release-quelle-'));
  try {
    fs.cpSync(R.FIXTURE, quelle, { recursive: true });
    aendern(quelle);
    return tun(quelle);
  } finally { fs.rmSync(quelle, { recursive: true, force: true }); }
}

test('[openCoDE-Release] Anhänge unverändert, SHA256SUMS stimmt, release.json mit Abschnitt und Links', () => mitZiel((ziel) => {
  const r = R.releaseVorbereiten({ quelle: R.FIXTURE, fassung: 'v1.0.1', ziel });
  assert.deepEqual(r.fehler, []);
  for (const d of R.ANHAENGE) {
    assert.deepEqual(fs.readFileSync(path.join(ziel, d)), fs.readFileSync(path.join(R.FIXTURE, d)), d + ' unverändert');
  }
  for (const zeile of fs.readFileSync(path.join(ziel, 'SHA256SUMS'), 'utf8').trim().split('\n')) {
    const [summe, name] = zeile.split('  ');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ziel, name))).digest('hex'), summe, name);
  }
  const rel = JSON.parse(fs.readFileSync(path.join(ziel, 'release.json'), 'utf8'));
  assert.equal(rel.tag_name, 'v1.0.1');
  assert.match(rel.description, /Erste Fixture-Fassung/);
  assert.doesNotMatch(rel.description, /Davor/, 'nur der Abschnitt dieser Fassung');
  assert.deepEqual(rel.assets.links.map((l) => l.name), R.ANHAENGE.concat(['SHA256SUMS']));
  assert.ok(rel.assets.links.every((l) => l.url === R.paketUrl('1.0.1', l.name)));
}));

test('[openCoDE-Release] die Befehle nennen das Token nur als Umgebungsvariable und laden jede Datei hoch', () => {
  const r = R.releaseVorbereiten({ quelle: R.FIXTURE, fassung: 'v1.0.1' });
  const text = r.befehle.join('\n');
  assert.ok(r.befehle.filter((b) => b.includes('--upload-file')).length === R.ANHAENGE.length + 1);
  assert.match(text, /PRIVATE-TOKEN: \$OPENCODE_TOKEN/);
  assert.equal(/PRIVATE-TOKEN: (?!\$OPENCODE_TOKEN)/.test(text), false, 'kein anderer Token-Wert');
  assert.match(text, /--data @release\.json ".*\/projects\/10391\/releases"/);
});

test('[openCoDE-Release·Trockenlauf] ohne --ziel wird nichts geschrieben', () => {
  const vorher = fs.readdirSync(R.FIXTURE).sort();
  assert.equal(R.main([]), 0);
  assert.deepEqual(fs.readdirSync(R.FIXTURE).sort(), vorher);
});

test('[openCoDE-Release·Rot-Beweis] eine fehlende Anlage, ein fehlender Abschnitt, ein falsches Format halten an', () => {
  mitKopie((q) => fs.rmSync(path.join(q, 'vivodepot-lesen.html')), (q) => {
    assert.deepEqual(R.releaseVorbereiten({ quelle: q, fassung: 'v1.0.1' }).fehler, ['Anlage fehlt in der Quelle: vivodepot-lesen.html']);
  });
  assert.deepEqual(R.releaseVorbereiten({ quelle: R.FIXTURE, fassung: 'v1.0.9' }).fehler, ['kein CHANGELOG-Abschnitt für v1.0.9']);
  assert.match(R.releaseVorbereiten({ quelle: R.FIXTURE, fassung: '1.0.1' }).fehler[0], /Format v1\.0\.<n>/);
  mitZiel((ziel) => {
    R.releaseVorbereiten({ quelle: R.FIXTURE, fassung: 'v1.0.9', ziel });
    assert.deepEqual(fs.readdirSync(ziel), [], 'bei einem Fehler entsteht keine Datei');
  });
});

test('[openCoDE-Release] die Anhänge sind Dateien, die der öffentliche Zuschnitt trägt', () => {
  for (const d of R.ANHAENGE) assert.ok(fs.existsSync(path.join(__dirname, '..', d)), d);
});

test('[openCoDE-Release·Signieren] die vier Befehle: signierter Commit, signierter Tag, beide geprüft — ohne Schlüssel oder Pfad', () => {
  const b = R.signierBefehle('v1.0.856');
  assert.deepEqual(b, ['git commit -S -m "Vivodepot v1.0 (Kern v856)"', 'git tag -s v1.0.856 -m "Vivodepot v1.0.856"',
    'git verify-commit HEAD', 'git tag -v v1.0.856']);
  assert.equal(b.some((z) => /signingkey|allowed|\.ssh|\.pub\b/.test(z)), false);
});

test('[openCoDE-Release·Signieren·Rot-Beweis] ein unsignierter Befehl fiele auf', () => {
  const unsigniert = ['git commit -m "x"', 'git tag -a v1.0.856 -m "x"'];
  assert.equal(unsigniert.every((z) => / -S | -s /.test(z)), false);
  assert.equal(R.signierBefehle('v1.0.856').slice(0, 2).every((z) => / -S | -s /.test(z)), true);
});
