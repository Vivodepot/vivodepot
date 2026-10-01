'use strict';
/* Befund KONFORMITAET-ARTEFAKTE-IM-BAUM (28.09.2026): ein Konformitätslauf schreibt seinen Nachweis
   lokal nicht mehr in den Arbeitsbaum. Rot-Beweis: die Fassung davor schrieb fest nach join(HIER, '.artifacts')
   — die Klassenprobe unten findet genau diese Zeile in einer Kopie. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { nachweisVerzeichnis } = require('../tools/lib/nachweis-ablage.js');

const REPO = path.join(__dirname, '..');
const KONF = path.join(REPO, 'tests', 'konformitaet');

test('lokal (ohne CI, ohne VD_NACHWEIS_DIR): Verzeichnis unter os.tmpdir, nicht im Baum', () => {
  const { dir, weg } = nachweisVerzeichnis(KONF, { env: {}, raeumenBeimEnde: false });
  try {
    assert.strictEqual(weg, 'tmpdir');
    assert.ok(dir.startsWith(fs.realpathSync(os.tmpdir())) || dir.startsWith(os.tmpdir()), dir);
    assert.ok(!dir.startsWith(REPO), 'liegt im Arbeitsbaum: ' + dir);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('CI: <hier>/.artifacts, damit der Workflow den Nachweis hochladen kann', () => {
  assert.deepStrictEqual(nachweisVerzeichnis(KONF, { env: { CI: 'true' } }), { dir: path.join(KONF, '.artifacts'), weg: 'CI' });
});

test('VD_NACHWEIS_DIR hat Vorrang', () => {
  assert.strictEqual(nachweisVerzeichnis(KONF, { env: { CI: 'true', VD_NACHWEIS_DIR: '/x/y' } }).weg, 'VD_NACHWEIS_DIR');
});

/* Wächter gegen die Klasse, nicht nur die Einzelstelle: kein Konformitätslauf schreibt fest nach <hier>/.artifacts. */
const FEST = /join\(\s*HIER\s*,\s*['"]\.artifacts['"]\s*\)/;
test('kein Konformitätslauf legt ein Artefakt fest in den Arbeitsbaum', () => {
  const treffer = fs.readdirSync(KONF).filter((f) => /\.(m?js)$/.test(f))
    .filter((f) => FEST.test(fs.readFileSync(path.join(KONF, f), 'utf8')));
  assert.deepStrictEqual(treffer, []);
});

test('Rot-Beweis: die Fassung vor dem Fix wird von der Klassenprobe gefunden', () => {
  const alt = "const ARTEFAKT_DIR  = join(HIER, '.artifacts');";
  assert.ok(FEST.test(alt));
});
