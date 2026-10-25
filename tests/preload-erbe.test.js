'use strict';
/* PRELOAD-ERBE-HUELLE (24.10.2026, MITTEL). Unter der Testlauf-Hülle (tools/lib/test-lauf.js) lädt NODE_OPTIONS den
   Temp-Preload und den Zeitgrenzen-Preload in jeden Enkelprozess. tests/test-zeitgrenze-preload.test.js vergleicht ein Kind
   mit und ohne `--require <preload>`; ihr Lauf „ohne“ trug den Preload unter der Hülle doch, zwei Rot-Beweise fielen
   (vor-pre-commit meldete ein falsches Rot, direkt gefahren war die Probe grün). Zusicherungen:
   (1) ohneLaufPreloads() nimmt genau die beiden Preloads der Hülle aus NODE_OPTIONS, nichts sonst;
   (2) ein Kind mit dieser Umgebung lädt keinen Preload der Hülle, eines mit umgebungFuer() lädt beide;
   (3) Wächter für die Klasse: jede Probe, die einen der beiden Preloads mit `--require` an ein Kind gibt, baut dessen Umgebung
       mit ohneLaufPreloads() oder löscht NODE_OPTIONS. */
require('./helfer/platz-isoliert.js').platzIsolieren();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PRELOAD, ZEITGRENZE, ohneLaufPreloads, umgebungFuer } = require('../tools/lib/test-lauf.js');

const REPO = path.join(__dirname, '..');

test('[Preload-Erbe] ohneLaufPreloads nimmt genau die beiden Preloads der Hülle heraus, fremde Optionen bleiben', () => {
  const mit = umgebungFuer('/tmp/x', { NODE_OPTIONS: '--max-old-space-size=4096', PATH: '/bin' });
  assert.ok(mit.NODE_OPTIONS.includes(PRELOAD) && mit.NODE_OPTIONS.includes(ZEITGRENZE));
  const ohne = ohneLaufPreloads(mit);
  assert.equal(ohne.NODE_OPTIONS, '--max-old-space-size=4096');
  assert.equal(ohne.PATH, '/bin');
  assert.equal(mit.NODE_OPTIONS.includes(PRELOAD), true, 'die Eingabe bleibt unverändert');
  assert.equal('NODE_OPTIONS' in ohneLaufPreloads(umgebungFuer('/tmp/x', {})), false, 'nichts übrig: der Schlüssel fällt weg');
  const gequotet = { NODE_OPTIONS: '--require ' + JSON.stringify(ZEITGRENZE) + ' --trace-warnings' };
  assert.equal(ohneLaufPreloads(gequotet).NODE_OPTIONS, '--trace-warnings');
  // Eine Hülle aus einem anderen Arbeitsbaum trägt dort ihre eigenen Pfade; erkannt wird am Dateinamen.
  const fremd = { NODE_OPTIONS: '--require /anderer/baum/tools/lib/temp-aufraeumen-preload.js --require "/mit leer/tools/lib/test-zeitgrenze-preload.js" --enable-source-maps' };
  assert.equal(ohneLaufPreloads(fremd).NODE_OPTIONS, '--enable-source-maps');
  assert.equal(ohneLaufPreloads({ NODE_OPTIONS: '--require /x/mein-temp-aufraeumen-preload.js.bak' }).NODE_OPTIONS,
    '--require /x/mein-temp-aufraeumen-preload.js.bak', 'nur genau die beiden Dateinamen');
});

test('[Preload-Erbe·Rot-Beweis] ein Kind unter der Hülle lädt beide Preloads; mit ohneLaufPreloads keinen', () => {
  const geladen = (env) => {
    const r = spawnSync(process.execPath, ['-e', 'console.log(JSON.stringify(Object.keys(require.cache)))'], { env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const liste = JSON.parse(r.stdout);
    return [PRELOAD, ZEITGRENZE].filter((p) => liste.includes(p)).length;
  };
  const basis = { ...process.env };
  delete basis.NODE_OPTIONS;
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'preload-erbe-'));
  try {
    const huelle = umgebungFuer(dir, basis);
    assert.equal(geladen(huelle), 2, 'ROT vorher: so erbte der Lauf „ohne Preload“ einer Probe beide Preloads');
    assert.equal(geladen(ohneLaufPreloads(huelle)), 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Die Klasse: eine Probe, die einen Preload der Hülle per --require an ein Kind gibt, misst den Preload. Sie muss die Preloads
   der Hülle aus der Umgebung des Kindes nehmen. */
const PRELOAD_NAME = /temp-aufraeumen-preload|test-zeitgrenze-preload/;
function erbtHuelle(quelle) {
  if (!/['"]--require['"]/.test(quelle) || !PRELOAD_NAME.test(quelle)) return false;
  return !/\bohneLaufPreloads\s*\(/.test(quelle) && !/\bdelete\s+[\w.]+\.NODE_OPTIONS\b/.test(quelle);
}
function probenDateien(dir) {
  const aus = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'fixtures' && e.name !== 'node_modules') aus.push(...probenDateien(p)); } else if (e.name.endsWith('.test.js')) aus.push(p);
  }
  return aus;
}

test('[Preload-Erbe·Wächter] keine Probe gibt einen Preload der Hülle per --require an ein Kind, das die Hülle mit erbt', () => {
  const treffer = probenDateien(path.join(REPO, 'tests')).filter((f) => erbtHuelle(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(REPO, f));
  assert.deepEqual(treffer, [], 'Umgebung des Kindes mit ohneLaufPreloads() aus tools/lib/test-lauf.js bauen');
});

test('[Preload-Erbe·Wächter·Rot-Beweis] die Form der Probe vor dem Fix fällt; mit ohneLaufPreloads oder delete NODE_OPTIONS nicht', () => {
  const vorher = "const PRELOAD = path.join(REPO, 'tools', 'lib', 'test-zeitgrenze-preload.js');\n"
    + "const env = (() => { const e = ohneGitUmgebung(); delete e.NODE_TEST_CONTEXT; return e; })();\n"
    + "spawnSync(process.execPath, ['--test', '--require', PRELOAD, f], { env });\n";
  assert.equal(erbtHuelle(vorher), true);
  assert.equal(erbtHuelle(vorher.replace('ohneGitUmgebung()', 'ohneLaufPreloads(ohneGitUmgebung())')), false);
  assert.equal(erbtHuelle(vorher + 'delete env.NODE_OPTIONS;\n'), false);
  assert.equal(erbtHuelle("spawnSync(process.execPath, ['--require', other]);"), false, 'ein fremder Preload ist nicht die Klasse');
  assert.equal(erbtHuelle("// test-zeitgrenze-preload\nconst x = 1;"), false, 'ohne --require keine Messung');
});
