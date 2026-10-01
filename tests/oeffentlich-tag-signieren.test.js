'use strict';
/* ═════════════════════════════════════════════════════════════════
   Der Release-Tag des öffentlichen Stands ist signiert (30.09.2026)
   ─────────────────────────────────────────────────────────────────
   tools/oeffentlich-tag-signieren.js legt `v1.0.<Fassung>` mit `git tag -s` an und lässt nur einen Tag stehen, der
   eine Signatur trägt und `git tag -v` gegen `.github/allowed_signers` besteht.
   DIE PROBE BENUTZT NIE EINEN ECHTEN SCHLÜSSEL: ein Wegwerf-SSH-Schlüssel entsteht im Temp, die globale und die
   System-Konfiguration von git sind abgeschaltet (HOME und GIT_CONFIG_GLOBAL im Temp, GIT_CONFIG_NOSYSTEM).
   ROT-BEWEIS: ohne eingerichtetes Signieren, mit einem schon vorhandenen unsignierten Tag und gegen einen fremden
   öffentlichen Schlüssel endet der Lauf rot, und es bleibt kein neuer Tag stehen.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { signieren, tagInhaltSigniert } = require('../tools/oeffentlich-tag-signieren.js');

function wegwerfUmgebung() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-signieren-'));
  const home = path.join(tmp, 'home'); fs.mkdirSync(home);
  const globalCfg = path.join(tmp, 'gitconfig-global'); fs.writeFileSync(globalCfg, '');
  const env = { PATH: process.env.PATH, HOME: home, GIT_CONFIG_GLOBAL: globalCfg, GIT_CONFIG_NOSYSTEM: '1' };
  const klon = path.join(tmp, 'klon'); fs.mkdirSync(klon);
  const g = (...a) => execFileSync('git', ['-C', klon, ...a], { env, encoding: 'utf8', stdio: 'pipe' });
  g('init', '-q'); g('config', 'user.name', 'Probe'); g('config', 'user.email', 'probe@example.invalid');
  fs.writeFileSync(path.join(klon, 'datei.txt'), 'x\n'); g('add', '.'); g('commit', '-q', '-m', 'Stand');
  const schluessel = (name) => {
    const p = path.join(tmp, name);
    execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', name, '-f', p], { env, stdio: 'pipe' });
    return { privat: p, oeffentlich: fs.readFileSync(p + '.pub', 'utf8').trim() };
  };
  const erlaubt = (pub) => { fs.mkdirSync(path.join(klon, '.github'), { recursive: true }); fs.writeFileSync(path.join(klon, '.github', 'allowed_signers'), 'probe@example.invalid ' + pub + '\n'); };
  const signierenEinrichten = (k) => { g('config', 'gpg.format', 'ssh'); g('config', 'user.signingkey', k.privat); };
  const aufraeumen = () => fs.rmSync(tmp, { recursive: true, force: true });
  return { env, klon, g, schluessel, erlaubt, signierenEinrichten, aufraeumen };
}
const leise = () => {};
const tags = (u) => u.g('tag', '-l').split('\n').filter(Boolean);

test('[Tag-Signatur] mit eingerichtetem Signieren entsteht ein signierter Tag, und git tag -v ist grün gegen allowed_signers', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('wegwerf');
    u.signierenEinrichten(k); u.erlaubt(k.oeffentlich);
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 0);
    assert.ok(tagInhaltSigniert(u.g('cat-file', 'tag', 'v1.0.900')), 'der Tag trägt eine Signatur');
    u.g('-c', 'gpg.ssh.allowedSignersFile=' + path.join(u.klon, '.github', 'allowed_signers'), 'tag', '-v', 'v1.0.900');
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur·Rot-Beweis] ohne Signieren, bei vorhandenem unsigniertem Tag und gegen einen fremden Schlüssel: rot, kein neuer Tag', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('wegwerf');
    const fremd = u.schluessel('fremd');
    u.erlaubt(k.oeffentlich);
    // 1 · Signieren nicht eingerichtet
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.901', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), [], 'nach dem Fehlschlag steht kein Tag');
    // 2 · ein schon vorhandener, nur annotierter Tag wird nicht überschrieben — und gälte ohnehin nicht als signiert
    u.g('tag', '-a', 'v1.0.902', '-m', 'unsigniert');
    assert.equal(tagInhaltSigniert(u.g('cat-file', 'tag', 'v1.0.902')), false);
    u.signierenEinrichten(k);
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.902', schreiben: leise, env: u.env }), 1);
    // 3 · signiert, aber allowed_signers nennt einen anderen Schlüssel: git tag -v ist rot, der Tag wird gelöscht
    u.erlaubt(fremd.oeffentlich);
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.903', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), ['v1.0.902'], 'nur der vorher angelegte unsignierte Tag steht, kein neuer');
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur] ohne allowed_signers und mit falschem Tag-Namen endet der Lauf rot, bevor git etwas anlegt', () => {
  const u = wegwerfUmgebung();
  try {
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.904', schreiben: leise, env: u.env }), 1);
    const k = u.schluessel('wegwerf'); u.erlaubt(k.oeffentlich);
    assert.equal(signieren({ klon: u.klon, tag: 'release-1', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), []);
  } finally { u.aufraeumen(); }
});
