'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/sprachregister-bauen.js (Register-Katalog-Plan §6 Schritt 4)
   ────────────────────────────────────────────────────────────────────────
   Prämisse-gegen-Code geprüft, bevor gebaut (s. Kopf-Kommentar des Werkzeugs):
   der Startbestand ist NICHT aus TEXTSATZ_TEXTE_EINGEBAUT (das ist der
   Template-Generator-eigene Untertitel-Text, ein einzelner deutscher String,
   keine Sprachliste), sondern aus der echten Sprach-Achse im Kern plus dem
   real ausgelieferten EN-Modul gemessen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const W = require('../tools/sprachregister-bauen.js');

const REPO = path.join(__dirname, '..');

function wegwerfOrdner() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vd-sprachregister-test-'));
}

test('[Sprachregister·Prämisse] TEXTSATZ_SPRACHE_EINGEBAUT im Kern ist "de", reserviert', () => {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.match(html, /TEXTSATZ_SPRACHE_EINGEBAUT\s*=\s*'de'/);
});

test('[Sprachregister·Prämisse] tools/textsatz-en-modul.json ist ein echtes, ausgeliefertes Sprachmodul (sprache: en)', () => {
  const modul = require(path.join(REPO, 'tools', 'textsatz-en-modul.json'));
  assert.equal(modul.sprache, 'en');
  assert.ok(Number.isInteger(modul.moduleVersion) && modul.moduleVersion >= 1);
});

test('[Sprachregister] STARTBESTAND trägt genau zwei Einträge (de, en), nicht die eine Generator-Untertitel-Zeichenkette', () => {
  assert.equal(W.STARTBESTAND.length, 2);
  assert.deepEqual(W.STARTBESTAND.map((e) => e.sprache).sort(), ['de', 'en']);
  for (const e of W.STARTBESTAND) assert.equal(e.status, 'permanent');
});

test('[Sprachregister] bauen() liefert gültiges JSON mit Fassung, Prüfsumme und Index-Eintrag', () => {
  const artefakt = W.bauen({});
  const geparst = JSON.parse(artefakt.json);
  assert.equal(geparst.schluesselraum, 'sprache');
  assert.equal(geparst.anzahl, 2);
  const echterHash = crypto.createHash('sha256').update(Buffer.from(artefakt.json, 'utf8')).digest('hex');
  assert.equal(artefakt.hash, echterHash);
  assert.equal(artefakt.indexEintrag.achse, 'sprache');
});

test('[Sprachregister·Rot-Beweis] ein unbekannter Status wird abgewiesen', () => {
  assert.throws(() => W.bauen({ eintraege: [{ sprache: 'de', label: { de: 'x', en: 'x' }, status: 'erfunden', quelle: 'x' }] }),
    /unbekannten Status/);
});

test('[Sprachregister·Rot-Beweis] ein Eintrag ohne quelle wird abgewiesen', () => {
  assert.throws(() => W.bauen({ eintraege: [{ sprache: 'de', label: { de: 'x', en: 'x' }, status: 'permanent' }] }),
    /quelle/);
});

test('[Sprachregister] schreiben() trägt die eigene Achse additiv ein, neben feld UND rechtsraum, ohne sie zu berühren', () => {
  const ziel = wegwerfOrdner();
  try {
    const vorhandenerIndex = {
      register: [
        { achse: 'feld', datei: 'feldregister.json', fremd: 'a' },
        { achse: 'rechtsraum', datei: 'rechtsraumregister.json', fremd: 'b' },
      ],
    };
    fs.writeFileSync(path.join(ziel, 'index.json'), JSON.stringify(vorhandenerIndex));
    const artefakt = W.bauen({});
    W.schreiben(ziel, artefakt);
    const index = JSON.parse(fs.readFileSync(path.join(ziel, 'index.json'), 'utf8'));
    assert.equal(index.register.length, 3);
    assert.ok(index.register.some((e) => e.achse === 'feld' && e.fremd === 'a'));
    assert.ok(index.register.some((e) => e.achse === 'rechtsraum' && e.fremd === 'b'));
    assert.ok(index.register.some((e) => e.achse === 'sprache' && e.sha256 === artefakt.hash));
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Sprachregister·CLI] node tools/sprachregister-bauen.js --ziel schreibt die drei Dateien wirklich', () => {
  const { execFileSync } = require('node:child_process');
  const ziel = wegwerfOrdner();
  try {
    const ausgabe = execFileSync('node', [path.join(REPO, 'tools', 'sprachregister-bauen.js'), '--ziel', ziel], { encoding: 'utf8' });
    assert.match(ausgabe, /2 Sprache/);
    assert.ok(fs.existsSync(path.join(ziel, 'sprachregister.json')));
    assert.ok(fs.existsSync(path.join(ziel, 'index.json')));
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});
