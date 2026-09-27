'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   scripts/pruefe-fhir-gate.js — der HL7-FHIR-Extern-Gate läuft nur bei Anlass (A1b, 19.09.2026).
   Rot-Beweis: eine Änderung an einer Trägerdatei oder an einer Gate-eigenen Datei löst den Gate aus; ein neuer
   Zweig oder ein nicht messbarer Bereich ebenso (sicher fahren). Gegenprobe: eine reine Dokument-Änderung löst
   nichts aus, und ein Push ohne Diff läuft gar nicht erst.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { anlassGegeben, FHIR_EIGENE_DATEIEN } = require('../scripts/pruefe-fhir-gate.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');

test('[FHIR-Gate·Rot-Beweis] eine Trägerdatei, eine Gate-eigene Datei und ein nicht messbarer Bereich lösen den Gate aus', () => {
  assert.equal(anlassGegeben(['vivodepot.html']).ja, true, 'dort lebt der FHIR-Generator');
  assert.equal(anlassGegeben([FHIR_EIGENE_DATEIEN[0]]).ja, true, 'wer den Validator-Test ändert, muss ihn fahren');
  assert.equal(anlassGegeben(null).ja, true, 'kein messbarer Bereich: sicher fahren');
});

test('[FHIR-Gate·Gegenprobe] eine reine Dokument-Änderung löst nichts aus, ein Push ohne Diff läuft nicht', () => {
  assert.equal(anlassGegeben(['docs/adr/irgendein-adr.md']).ja, false);
  assert.equal(anlassGegeben([]).ja, false);
  const env = ohneGitUmgebung();
  const kopf = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, env, encoding: 'utf8' }).trim();
  const r = spawnSync('node', [path.join(REPO, 'scripts', 'pruefe-fhir-gate.js')], {
    cwd: REPO, env, encoding: 'utf8', input: 'refs/heads/x ' + kopf + ' refs/heads/x ' + kopf + '\n',
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /kein Anlass/);
});
