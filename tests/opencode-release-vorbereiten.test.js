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

/* RELEASE-NOTES (16.10.2026): liegt docs/release-notes/<fassung>.md im Tag-Stand, tragen openCoDE und GitHub genau diesen Text,
   mit dem Prüfsummen-Satz in beiden Sprachen und den Pflichthinweisen; ohne die Datei gilt der CHANGELOG-Abschnitt wie bisher. */
const NOTES = '## Deutsch\n\n**Fassung 1 (1. Oktober 2026)**\n\n### Behoben\n- Etwas auf Deutsch.\n\n---\n\n'
  + '## English\n\n**Version 1 (1 October 2026)**\n\n### Fixed\n- Something in English.\n';
const mitNotes = (text) => (q) => {
  fs.mkdirSync(path.join(q, R.NOTES_ORDNER), { recursive: true });
  fs.writeFileSync(path.join(q, R.NOTES_ORDNER, 'v1.0.1.md'), text);
};
const lesen = (ziel) => ({ rel: JSON.parse(fs.readFileSync(path.join(ziel, 'release.json'), 'utf8')), gh: fs.readFileSync(path.join(ziel, 'github-release.md'), 'utf8') });

test('[Release·Notes] mit Notes-Datei: der geprüfte Text auf beiden Seiten, Prüfsummen-Satz je Sprache, Pflichthinweise am Ende', () =>
  mitKopie(mitNotes(NOTES), (q) => mitZiel((ziel) => {
    assert.deepEqual(R.releaseVorbereiten({ quelle: q, fassung: 'v1.0.1', ziel }).fehler, []);
    const { rel } = lesen(ziel);
    assert.ok(rel.description.startsWith('## Deutsch\n\n**Fassung 1'), rel.description.slice(0, 80));
    assert.doesNotMatch(rel.description, /Erste Fixture-Fassung/, 'nicht der CHANGELOG-Abschnitt');
    const de = rel.description.indexOf(R.PRUEFSUMMEN_SATZ.de), en = rel.description.indexOf('## English'), enSatz = rel.description.indexOf(R.PRUEFSUMMEN_SATZ.en);
    assert.ok(de > 0 && de < en && en < enSatz, 'der deutsche Satz im deutschen, der englische im englischen Abschnitt');
    for (const [titel] of R.PFLICHTHINWEISE) assert.ok(rel.description.indexOf('### ' + titel) > enSatz, titel + ' nach den Notes');
  })));

test('[Release·Notes·gleich] openCoDE und GitHub tragen denselben Text, mit und ohne Notes-Datei', () => {
  for (const aendern of [mitNotes(NOTES), () => {}]) {
    mitKopie(aendern, (q) => mitZiel((ziel) => {
      assert.deepEqual(R.releaseVorbereiten({ quelle: q, fassung: 'v1.0.1', ziel }).fehler, []);
      const { rel, gh } = lesen(ziel);
      assert.equal(gh, rel.description + '\n');
    }));
  }
});

test('[Release·Notes·Rückfall] ohne Notes-Datei bleibt die Beschreibung, wie sie war: CHANGELOG-Abschnitt, Satz, Hinweise', () =>
  mitKopie(() => {}, (q) => {
    const r = R.releaseVorbereiten({ quelle: q, fassung: 'v1.0.1' });
    const abschnitt = R.changelogAbschnitt(fs.readFileSync(path.join(q, 'CHANGELOG.md'), 'utf8'), 'v1.0.1');
    assert.equal(r.release.description, R.mitPflichthinweisen(abschnitt + '\n\n' + R.PRUEFSUMMEN_SATZ.de));
  }));

test('[Release·Notes·Rot-Beweis] eine fehlende Sprache, ein eigener SHA256SUMS-Satz, ein eingefügter Pflichthinweis halten an', () => {
  const loinc = fs.readFileSync(path.join(__dirname, '..', R.PFLICHTHINWEISE[0][1]), 'utf8');
  const faelle = [
    [NOTES.replace('## English', '## Englisch'), /ohne Abschnitt „## English“/],
    [NOTES.replace('## Deutsch', 'Deutsch'), /ohne Abschnitt „## Deutsch“/],
    [NOTES + '\nPrüfsummen in `SHA256SUMS`.\n', /nennen SHA256SUMS/],
    [NOTES + '\n### LOINC\n\n' + loinc, /tragen schon einen Pflichthinweis/],
  ];
  for (const [text, muster] of faelle) {
    mitKopie(mitNotes(text), (q) => {
      const r = R.releaseVorbereiten({ quelle: q, fassung: 'v1.0.1' });
      assert.equal(r.release, null, 'kein Release mit halbem Text');
      assert.ok(r.fehler.some((f) => muster.test(f)), r.fehler.join(' | '));
    });
  }
});
