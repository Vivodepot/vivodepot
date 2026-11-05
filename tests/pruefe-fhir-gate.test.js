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

/* HÄNGER IST UNGEMESSEN (30.10.2026, Befund FHIR-GATE-HAENGER-ALS-ROT): ein Lauf über der Zeitgrenze endete mit 1 wie eine
   Regelverletzung; am Zugkopf hieß das Rot samt Verursacher. Jetzt Ausgang 3, derselbe wie beim E2E-Gate. */
const G = require('../scripts/pruefe-fhir-gate.js');
const E2E = require('../scripts/pruefe-e2e-bereich.js');
test('[FHIR-Gate·Hänger·Rot-Beweis] ein Lauf über der Zeitgrenze endet mit dem Ausgang ungemessen, nicht mit 1', () => {
  assert.equal(G.laufErgebnis({ error: { code: 'ETIMEDOUT' }, status: null }), 'haengt');
  assert.equal(G.ausgangFuer('haengt'), G.AUSGANG_UNGEMESSEN);
  assert.notEqual(G.ausgangFuer('haengt'), 1, 'vor dem Fix endete ein Hänger mit 1');
  assert.equal(G.AUSGANG_UNGEMESSEN, E2E.AUSGANG_UNGEMESSEN, 'ein ungemessen-Ausgang für alle Gates');
});
test('[FHIR-Gate·Hänger·Gegenprobe] ein Rot bleibt 1, ein Grün 0', () => {
  assert.equal(G.ausgangFuer(G.laufErgebnis({ status: 1 })), 1);
  assert.equal(G.ausgangFuer(G.laufErgebnis({ status: 0 })), 0);
});
