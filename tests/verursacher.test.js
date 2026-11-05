'use strict';
/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   VERURSACHER (Werkzeug-Zug 2, 27.10.2026; Testkonzept Punkt 11) — tools/lib/verursacher.js an einem Wegwerf-Repo: ein Zug
   aus zwei gepickten Wagen; der rote wird zugeordnet (Eigentümer aus dem Quellzweig), mit Sicherungsref herausgenommen und
   gemeldet. Rot-Beweise: offener Verursacher, kein Zugzweig, unsauberer Baum und ein Konflikt beim Herausnehmen ändern den
   Zug nicht; der Konflikt wird zurückgesetzt.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const V = require('../tools/lib/verursacher.js');

function repo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'verursacher-'));
  const env = { ...require('../tools/lib/ohne-git-umgebung.js').ohneGitUmgebung(), GIT_AUTHOR_NAME: 'P', GIT_AUTHOR_EMAIL: 'p@p', GIT_COMMITTER_NAME: 'P', GIT_COMMITTER_EMAIL: 'p@p' };
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete env[k];
  const gs = (args) => spawnSync('git', args, { cwd: d, encoding: 'utf8', env });
  const g = (...a) => { const r = gs(a); if (r.status !== 0) throw new Error(a.join(' ') + ': ' + r.stderr); return r.stdout.trim(); };
  const schreib = (f, t) => fs.writeFileSync(path.join(d, f), t);
  g('init', '-q', '-b', 'kanon');
  schreib('a.js', '1\n'); schreib('b.js', '1\n'); g('add', '.'); g('commit', '-qm', 'basis');
  g('checkout', '-qb', 'krypto-wagen-a-l4-probe'); schreib('a.js', '2\n'); g('commit', '-qam', 'wagen a');
  g('checkout', '-q', 'kanon'); g('checkout', '-qb', 'pro-wagen-b-l4-probe'); schreib('b.js', '2\n'); g('commit', '-qam', 'wagen b');
  g('checkout', '-q', 'kanon'); g('checkout', '-qb', 'zug-probe-l4-2026-10-27');
  g('cherry-pick', '-x', 'krypto-wagen-a-l4-probe'); g('cherry-pick', '-x', 'pro-wagen-b-l4-probe');
  return { d, g, gs, schreib, git: (args) => gs(args).stdout, weg: () => fs.rmSync(d, { recursive: true, force: true }) };
}
const fehlerFuer = (r, datei, kurzVon) => ({ datei, test: 'T', meldung: 'M', zeile: 'FEHLERZEILE · …', wagen: { kurz: r.g('log', '-1', '--format=%h', kurzVon, '--', datei) } });

test('[Verursacher] sicher zugeordnet: Eigentümer aus dem Quellzweig, herausgenommen mit Sicherungsref, gemeldet und abgelegt', () => {
  const r = repo();
  try {
    const vorher = r.g('rev-parse', 'HEAD');
    const ort = path.join(r.d, '.git');
    const e = V.verursacherBehandeln(fehlerFuer(r, 'a.js', 'HEAD'), { git: r.git, gitStatus: r.gs, ort, jetzt: new Date('2026-10-27T21:00:00Z') });
    assert.equal(e.zuordnung.eigentuemer, 'krypto');
    assert.equal(e.zuordnung.zweig, 'krypto-wagen-a-l4-probe');
    assert.equal(e.heraus.raus, true, e.heraus.grund);
    assert.equal(r.g('rev-parse', e.heraus.sicherung), vorher, 'die Sicherung zeigt auf den Zug vorher');
    assert.equal(fs.readFileSync(path.join(r.d, 'a.js'), 'utf8'), '1\n', 'der rote Wagen ist heraus');
    assert.equal(fs.readFileSync(path.join(r.d, 'b.js'), 'utf8'), '2\n', 'der andere bleibt');
    assert.equal(r.g('log', '--format=%s', 'kanon..HEAD'), 'wagen b');
    assert.match(e.zeile, /^VERURSACHER an krypto: Wagen [0-9a-f]{9} \(krypto-wagen-a-l4-probe\) macht den Zug zug-probe-l4-2026-10-27 rot — T in a\.js: M · herausgenommen/);
    const z = JSON.parse(fs.readFileSync(path.join(ort, V.VERURSACHER_DATEI), 'utf8').trim());
    assert.deepEqual([z.eigentuemer, z.raus], ['krypto', true]);
  } finally { r.weg(); }
});

test('[Verursacher·Rot-Beweis] offener Verursacher, kein Zugzweig und unsauberer Baum: nichts herausgenommen, der Zug bleibt', () => {
  const r = repo();
  try {
    const vorher = r.g('rev-parse', 'HEAD');
    const offen = V.verursacherBehandeln({ datei: 'c.js', wagen: { kurz: r.g('rev-parse', '--short', 'HEAD'), unveraendert: true } }, { git: r.git, gitStatus: r.gs });
    assert.equal(offen.heraus.raus, false);
    assert.match(offen.zeile, /^VERURSACHER offen im Zug zug-probe-l4-2026-10-27: die rote Datei ändert kein Wagen/);
    r.schreib('b.js', 'schmutz\n');
    const schmutz = V.verursacherBehandeln(fehlerFuer(r, 'a.js', 'HEAD'), { git: r.git, gitStatus: r.gs });
    assert.match(schmutz.heraus.grund, /weicht von HEAD ab/);
    r.g('checkout', '--', 'b.js');
    r.g('checkout', '-qb', 'krypto-kein-zug');
    const kein = V.verursacherBehandeln(fehlerFuer(r, 'a.js', 'HEAD'), { git: r.git, gitStatus: r.gs });
    assert.match(kein.heraus.grund, /kein Zugzweig/);
    assert.equal(r.g('rev-parse', 'HEAD'), vorher, 'in keinem Fall hat sich der Zug bewegt');
  } finally { r.weg(); }
});

test('[Verursacher·Rot-Beweis] ein Konflikt beim Herausnehmen wird zurückgesetzt; der Zug ist unverändert', () => {
  const r = repo();
  try {
    // ein späterer Wagen baut auf dem roten auf: ohne ihn passt er nicht
    r.schreib('a.js', '3\n'); r.g('commit', '-qam', 'wagen c auf a');
    const vorher = r.g('rev-parse', 'HEAD');
    const roter = r.g('log', '-1', '--format=%h', '--grep=wagen a', 'HEAD');
    const e = V.verursacherBehandeln({ datei: 'a.js', test: 'T', meldung: 'M', wagen: { kurz: roter } }, { git: r.git, gitStatus: r.gs });
    assert.equal(e.heraus.raus, false);
    assert.match(e.heraus.grund, /hielt an .* zurückgesetzt, der Zug ist unverändert/);
    assert.equal(r.g('rev-parse', 'HEAD'), vorher);
    assert.equal(r.g('status', '--porcelain', '--untracked-files=no'), '');
  } finally { r.weg(); }
});

test('[Verursacher] Quelle und Eigentümer aus Nachricht und Zweig', () => {
  assert.equal(V.quelleAusNachricht('x\n\n(cherry picked from commit ' + 'a'.repeat(40) + ')\n(cherry picked from commit ' + 'b'.repeat(40) + ')'), 'b'.repeat(40));
  assert.equal(V.quelleAusNachricht('ohne'), null);
  assert.equal(V.eigentuemerAusZweig('refs/heads/folge-rezept-l4-2026-10-27'), 'folge');
  assert.equal(V.eigentuemerAusZweig('zug-folge37-l4'), null, 'ein Zugzweig ist kein Eigentümer');
});
