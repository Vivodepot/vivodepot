'use strict';
/* tools/ci-status-pruefen.js gegen aufgezeichnete check-runs-Antworten (Form wie `gh api repos/…/commits/<sha>/check-runs`):
   grün, rot, fehlt, falsche SHA, läuft noch, unlesbar; dazu die Ref-Auswahl aus den pre-push-Zeilen und der Meldemodus. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { urteil, main } = require('../tools/ci-status-pruefen.js');

const SHA = 'a'.repeat(40);
const ANDERE = 'b'.repeat(40);
const lauf = (o) => Object.assign({ name: 'vorpruefung', head_sha: SHA, status: 'completed', conclusion: 'success',
  started_at: '2026-10-02T10:00:00Z', html_url: 'https://github.com/x/y/runs/1' }, o);

test('[CI-Status] grün: der Pflicht-Job ist für genau diese SHA erfolgreich', () => {
  assert.equal(urteil({ check_runs: [lauf({})] }, SHA).gruen, true);
});

test('[CI-Status·Rot-Beweis] rot, fehlt, falsche SHA, läuft noch, unlesbar — jeweils nicht grün', () => {
  const rot = urteil({ check_runs: [lauf({ conclusion: 'failure' })] }, SHA);
  assert.equal(rot.gruen, false); assert.match(rot.rot.join(), /failure/);
  const fehlt = urteil({ check_runs: [lauf({ name: 'anderer-job' })] }, SHA);
  assert.deepEqual(fehlt.fehlend, ['vorpruefung']);
  const falsch = urteil({ check_runs: [lauf({ head_sha: ANDERE })] }, SHA);
  assert.deepEqual(falsch.falscheSha, ['vorpruefung']);
  const offen = urteil({ check_runs: [lauf({ status: 'in_progress', conclusion: null })] }, SHA);
  assert.deepEqual(offen.offen, ['vorpruefung']);
  assert.equal(urteil({ message: 'Not Found' }, SHA).grund, 'unlesbar');
});

test('[CI-Status] der jüngste Lauf zählt: ein Wiederholungslauf ersetzt einen roten', () => {
  const r = urteil({ check_runs: [lauf({ conclusion: 'failure', started_at: '2026-10-02T09:00:00Z' }), lauf({ started_at: '2026-10-02T10:00:00Z' })] }, SHA);
  assert.equal(r.gruen, true);
});

test('[CI-Status] aus den pre-push-Zeilen zählt nur u2-kanon; --nur-melden endet immer mit 0, ohne es mit 1', () => {
  const gefragt = [];
  const holen = (sha) => { gefragt.push(sha); return { check_runs: [lauf({ head_sha: sha, conclusion: 'failure' })] }; };
  const refs = 'refs/heads/x ' + SHA + ' refs/heads/u2-kanon ' + '0'.repeat(40) + '\n'
    + 'refs/heads/y ' + ANDERE + ' refs/heads/vorpruefung/y ' + '0'.repeat(40) + '\n';
  const aus = [];
  assert.equal(main(['--nur-melden'], { holen, schreiben: (t) => aus.push(t), stdin: () => refs }), 0);
  assert.deepEqual(gefragt, [SHA]);
  assert.match(aus.join(''), /NICHT grün — rot/);
  assert.equal(main([], { holen, schreiben: () => {}, stdin: () => refs }), 1);
});

test('[CI-Status] ohne gh oder Netz: UNGEMESSEN, nie grün', () => {
  const aus = [];
  const rc = main(['--sha', SHA], { holen: () => { throw new Error('spawnSync gh ENOENT'); }, schreiben: (t) => aus.push(t) });
  assert.equal(rc, 1);
  assert.match(aus.join(''), /UNGEMESSEN/);
});
