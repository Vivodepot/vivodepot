'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Keine Testdatei mit before()/after() auf oberster Ebene ohne einen unbedingten Test (25.10.2026)
   ─────────────────────────────────────────────────────────────────────────────
   DER BEFUND: im öffentlichen Lauf brach tests/pro-traegt-erbschein-zugang-ab-werk.test.js zweimal mit SIGABRT ab
   („JavaScript heap out of memory“ nach 4 GB), im privaten Repo lief sie grün. Die Datei legt ihre Tests in einer
   Schleife über die Pro-Produkte an; im öffentlichen Zuschnitt gibt es keins, die Schleife legt keinen Test an. Eine
   Datei, die before() oder after() auf oberster Ebene setzt und keinen einzigen Test anmeldet, läuft unter
   `node --test --test-force-exit` (so ruft package.json die Suite auf) beim Prozessende in eine Schleife, bis der
   Speicher voll ist — gemessen mit Node 24.16; ohne --test-force-exit, mit einem Test oder mit einem übersprungenen
   Test läuft dieselbe Datei grün. afterEach()/beforeEach() allein lösen es nicht aus.
   DIE REGEL: wer before() oder after() auf oberster Ebene setzt, meldet auch einen Test auf oberster Ebene an, der nicht
   in einer Schleife oder Bedingung steht — sinnvoll als Vorbedingung („die Liste ist nicht leer“), im öffentlichen
   Zuschnitt so, dass er dort ebenfalls läuft.
   Geprüft: die Regel über alle Testdateien (statisch, je Zeile am Zeilenanfang); der Rot-Beweis pflanzt einen Verstoß; der
   Laufzeit-Beweis zeigt den Abbruch an einer Wegwerf-Datei und dass ein übersprungener Test ihn verhindert.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneLaufPreloads } = require('../tools/lib/test-lauf.js');

const TESTS = __dirname;
const HAKEN = /^(?:before|after)\s*\(/m;
const UNBEDINGT = /^(?:test|it|describe|suite)\s*\(/m;

function testdateien(wurzel) {
  const aus = [];
  (function geh(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'fixtures' && e.name !== 'node_modules') geh(p); } else if (/\.test\.(?:c?js|mjs)$/.test(e.name)) aus.push(p);
    }
  })(wurzel);
  return aus;
}
const verstoss = (text) => HAKEN.test(text) && !UNBEDINGT.test(text);

test('[Haken·ohne Test] jede Datei mit before()/after() auf oberster Ebene meldet einen unbedingten Test an', () => {
  const dateien = testdateien(TESTS);
  assert.ok(dateien.length > 100, 'Vorbedingung: die Testdateien sind gefunden (' + dateien.length + ')');
  const funde = dateien.filter((f) => verstoss(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(path.join(TESTS, '..'), f));
  assert.deepEqual(funde, []);
});

test('[Haken·ohne Test·Rot-Beweis] eine Schleife allein reicht nicht, ein Test auf oberster Ebene schon', () => {
  const kopf = "const { test, after } = require('node:test');\nafter(() => {});\n";
  assert.equal(verstoss(kopf + 'for (const p of LISTE) test(p, () => {});\n'), true, 'nur in der Schleife');
  assert.equal(verstoss(kopf + "if (LISTE.length) {\n  test('x', () => {});\n}\n"), true, 'nur in der Bedingung');
  assert.equal(verstoss(kopf.replace('after', 'before') + 'for (const p of LISTE) test(p, () => {});\n'), true, 'before() ebenso');
  assert.equal(verstoss(kopf + "test('Vorbedingung', { skip: 'leer' }, () => {});\nfor (const p of LISTE) test(p, () => {});\n"), false);
  assert.equal(verstoss("const { test, afterEach } = require('node:test');\nafterEach(() => {});\n"), false, 'afterEach() löst es nicht aus');
});

test('[Haken·ohne Test·Laufzeit] after() ohne Test bricht unter --test-force-exit ab; ein übersprungener Test verhindert es', () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'haken-ohne-test-'));
  try {
    const kopf = "'use strict';\nconst { test, after } = require('node:test');\nafter(() => {});\n";
    const ohne = path.join(ordner, 'ohne.test.js');
    const mit = path.join(ordner, 'mit.test.js');
    fs.writeFileSync(ohne, kopf);
    fs.writeFileSync(mit, kopf + "test('Vorbedingung', { skip: 'nichts zu prüfen' }, () => {});\n");
    const env = ohneLaufPreloads();
    delete env.NODE_TEST_CONTEXT;   // ein eigener Lauf, nicht ein Kind dieses Runners
    const lauf = (datei) => spawnSync(process.execPath, ['--max-old-space-size=32', '--test', '--test-force-exit', '--test-reporter=tap', datei],
      { cwd: ordner, env, encoding: 'utf8', timeout: 120000 });
    const a = lauf(ohne);
    assert.notEqual(a.status, 0, 'ohne Test: der Lauf ist nicht grün');
    assert.match(String(a.stdout) + String(a.stderr), /heap out of memory|SIGABRT/, 'ohne Test: der Prozess stirbt am Speicher');
    const b = lauf(mit);
    assert.equal(b.status, 0, 'mit übersprungenem Test: grün\n' + b.stdout + b.stderr);
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
