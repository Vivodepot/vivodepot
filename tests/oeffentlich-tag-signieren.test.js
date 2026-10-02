'use strict';
/* ═════════════════════════════════════════════════════════════════
   Release-Commit und Release-Tag des öffentlichen Stands sind signiert (30.09.2026, umgebaut 01.10.2026)
   ─────────────────────────────────────────────────────────────────
   tools/oeffentlich-tag-signieren.js verlangt einen signierten Release-Commit (`git verify-commit`), legt `v1.0.<Fassung>`
   mit `git tag -s` an und lässt nur einen Tag stehen, der eine Signatur trägt und `git tag -v` besteht — beides gegen die
   eigene git-Konfiguration der aufrufenden Person, nicht gegen eine Schlüsseldatei im Repo.
   DIE PROBE BENUTZT NIE EINEN ECHTEN SCHLÜSSEL: Wegwerf-SSH-Schlüssel entstehen im Temp, die globale und die
   System-Konfiguration von git sind abgeschaltet (HOME und GIT_CONFIG_GLOBAL im Temp, GIT_CONFIG_NOSYSTEM). Die Liste
   vertrauter Schlüssel steht in der Temp-Globalkonfiguration, außerhalb des Klons — wie bei der Schlüsselhalterin.
   ROT-BEWEIS: ein unsignierter Commit, ein Klon ohne eingerichtete Prüfung, ein vorhandener Tag und ein fremder Schlüssel
   enden rot, und es bleibt kein neuer Tag stehen. Der Klon trägt dabei nie eine Schlüsseldatei.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { signieren, tagInhaltSigniert } = require('../tools/oeffentlich-tag-signieren.js');

const PRINZIPAL = 'probe@example.invalid';

function wegwerfUmgebung() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-signieren-'));
  const home = path.join(tmp, 'home'); fs.mkdirSync(home);
  const globalCfg = path.join(tmp, 'gitconfig-global'); fs.writeFileSync(globalCfg, '');
  const env = { PATH: process.env.PATH, HOME: home, GIT_CONFIG_GLOBAL: globalCfg, GIT_CONFIG_NOSYSTEM: '1' };
  const klon = path.join(tmp, 'klon'); fs.mkdirSync(klon);
  const g = (...a) => execFileSync('git', ['-C', klon, ...a], { env, encoding: 'utf8', stdio: 'pipe' });
  const global = (...a) => execFileSync('git', ['config', '--global', ...a], { env, encoding: 'utf8', stdio: 'pipe' });
  g('init', '-q'); g('config', 'user.name', 'Probe'); g('config', 'user.email', PRINZIPAL);
  const schluessel = (name) => {
    const p = path.join(tmp, name);
    execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', name, '-f', p], { env, stdio: 'pipe' });
    return { privat: p, oeffentlich: fs.readFileSync(p + '.pub', 'utf8').trim() };
  };
  // Die Liste vertrauter Schlüssel liegt AUSSERHALB des Klons und wird in der (Temp-)Globalkonfiguration genannt.
  const vertrauen = (pub) => {
    const datei = path.join(home, 'allowed_signers');
    fs.writeFileSync(datei, PRINZIPAL + ' ' + pub + '\n');
    global('gpg.ssh.allowedSignersFile', datei);
  };
  const signierenEinrichten = (k) => { g('config', 'gpg.format', 'ssh'); g('config', 'user.signingkey', k.privat); };
  const commit = (signiert) => {
    fs.appendFileSync(path.join(klon, 'datei.txt'), 'x\n'); g('add', '.');
    g('commit', '-q', ...(signiert ? ['-S'] : []), '-m', 'Stand');
  };
  const aufraeumen = () => fs.rmSync(tmp, { recursive: true, force: true });
  return { env, klon, g, schluessel, vertrauen, signierenEinrichten, commit, aufraeumen };
}
const leise = () => {};
const tags = (u) => u.g('tag', '-l').split('\n').filter(Boolean);
const keineSchluesseldateiImKlon = (u) => assert.equal(fs.existsSync(path.join(u.klon, '.github', 'allowed_signers')), false);

test('[Tag-Signatur] signierter Commit, signierter Tag, beides grün gegen die eigene git-Konfiguration', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('wegwerf');
    u.signierenEinrichten(k); u.vertrauen(k.oeffentlich); u.commit(true);
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 0);
    assert.ok(tagInhaltSigniert(u.g('cat-file', 'tag', 'v1.0.900')), 'der Tag trägt eine Signatur');
    u.g('tag', '-v', 'v1.0.900');
    u.g('verify-commit', 'HEAD');
    keineSchluesseldateiImKlon(u);
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur·Rot-Beweis] unsignierter Commit, keine eingerichtete Prüfung, vorhandener Tag, fremder Schlüssel: rot, kein neuer Tag', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('wegwerf');
    const fremd = u.schluessel('fremd');
    // 1 · der Release-Commit ist nicht signiert
    u.signierenEinrichten(k); u.vertrauen(k.oeffentlich); u.commit(false);
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.901', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), [], 'nach dem Fehlschlag steht kein Tag');
    // 2 · signiert, aber in der eigenen Konfiguration ist keine Prüfliste eingerichtet
    u.commit(true);
    execFileSync('git', ['config', '--global', '--unset', 'gpg.ssh.allowedSignersFile'], { env: u.env, stdio: 'pipe' });
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.902', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), []);
    // 3 · ein schon vorhandener, nur annotierter Tag wird nicht überschrieben
    u.vertrauen(k.oeffentlich);
    u.g('tag', '-a', 'v1.0.903', '-m', 'unsigniert');
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.903', schreiben: leise, env: u.env }), 1);
    // 4 · die eigene Prüfliste nennt einen anderen Schlüssel: verify-commit ist rot, es entsteht kein Tag
    u.vertrauen(fremd.oeffentlich);
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.904', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), ['v1.0.903'], 'nur der vorher angelegte unsignierte Tag steht, kein neuer');
    keineSchluesseldateiImKlon(u);
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur] mit falschem Tag-Namen und ohne Klon endet der Lauf rot, bevor git etwas anlegt', () => {
  const u = wegwerfUmgebung();
  try {
    u.commit(false);
    assert.equal(signieren({ klon: u.klon, tag: 'release-1', schreiben: leise, env: u.env }), 1);
    assert.equal(signieren({ klon: path.join(u.klon, 'gibt-es-nicht'), tag: 'v1.0.905', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), []);
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur·Grenze] das Werkzeug nennt weder einen Schlüsselpfad noch eine Schlüsseldatei im Repo', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'tools', 'oeffentlich-tag-signieren.js'), 'utf8');
  const code = quelle.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((z) => !/^\s*\/\//.test(z)).join('\n');
  assert.equal(/allowed_signers|allowedSignersFile=|user\.signingkey|\.ssh\//.test(code), false);
  // Gegenprobe: die alte Fassung (Prüfung gegen .github/allowed_signers) fiele hier auf.
  assert.equal(/allowed_signers/.test("const erlaubt = path.join(klon, '.github', 'allowed_signers');"), true);
});
