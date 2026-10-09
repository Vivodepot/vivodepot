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
   BELEG DES ÖFFENTLICHEN LAUFS (05.10.2026): jeder Commit der Wegwerf-Umgebung bekommt einen grünen Beleg für seinen Baum,
   damit die Rot-Beweise oben aus ihrem eigenen Grund fallen. Eigene Proben: fehlender, fremder, roter Beleg und die
   Grundliste bekannter roter Proben.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { signieren, tagInhaltSigniert } = require('../tools/oeffentlich-tag-signieren.js');
const lauf = require('../tools/oeffentlicher-lauf-beleg.js');

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
    const fp = execFileSync('ssh-keygen', ['-lf', p + '.pub'], { env, encoding: 'utf8' }).split(' ')[1];
    return { privat: p, oeffentlich: fs.readFileSync(p + '.pub', 'utf8').trim(), fp };
  };
  // Die Liste vertrauter Schlüssel liegt AUSSERHALB des Klons und wird in der (Temp-)Globalkonfiguration genannt.
  const vertrauen = (pub) => {
    const datei = path.join(home, 'allowed_signers');
    fs.writeFileSync(datei, PRINZIPAL + ' ' + pub + '\n');
    global('gpg.ssh.allowedSignersFile', datei);
  };
  const signierenEinrichten = (k) => { g('config', 'gpg.format', 'ssh'); g('config', 'user.signingkey', k.privat); };
  // SECURITY.md des Stands nennt in 2.1 den Fingerabdruck des Release-Schlüssels (das Werkzeug verlangt es seit 03.10.2026).
  const commit = (signiert, fpInSecurity) => {
    fs.appendFileSync(path.join(klon, 'datei.txt'), 'x\n');
    fs.writeFileSync(path.join(klon, 'SECURITY.md'), '### 2.1 Repository\nFingerabdruck ' + (fpInSecurity || 'SHA256:' + 'A'.repeat(43)) + '\n### 2.2 Weiter\n');
    g('add', '.');
    g('commit', '-q', ...(signiert ? ['-S'] : []), '-m', 'Stand');
    belegFuerHead({ unit: { exit: 0, rot: [] }, e2e: { exit: 0, rot: [] } });
  };
  const belegFuerHead = (teile) => {
    const baum = g('rev-parse', 'HEAD^{tree}').trim();
    lauf.belegSchreiben(klon, { baum, commit: g('rev-parse', 'HEAD').trim(), datum: '2026-10-05', ...teile });
    return baum;
  };
  // Die zwei Register (Auslieferungen, öffentliche Stände) liegen außerhalb des Klons; der jüngste öffentliche Stand ist v1.0.857.
  const auslieferungen = path.join(tmp, 'auslieferungen.md');
  fs.writeFileSync(auslieferungen, '| Stand | … |\n' + [857, 899, 900, 901, 905].map((n) => '| v' + n + ' | x |').join('\n') + '\n');
  const staende = path.join(tmp, 'staende.json');
  fs.writeFileSync(staende, JSON.stringify({ staende: [{ fassung: 'v1.0.843' }, { fassung: 'v1.0.857' }] }));
  const register = { auslieferungen, staende };
  const aufraeumen = () => fs.rmSync(tmp, { recursive: true, force: true });
  return { env, klon, g, schluessel, vertrauen, signierenEinrichten, commit, aufraeumen, register, belegFuerHead, tmp };
}
const leise = () => {};
const tags = (u) => u.g('tag', '-l').split('\n').filter(Boolean);
const keineSchluesseldateiImKlon = (u) => assert.equal(fs.existsSync(path.join(u.klon, '.github', 'allowed_signers')), false);

test('[Tag-Signatur] signierter Commit, signierter Tag, beides grün gegen die eigene git-Konfiguration', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('wegwerf');
    u.signierenEinrichten(k); u.vertrauen(k.oeffentlich); u.commit(true, k.fp);
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 0);
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
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.901', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), [], 'nach dem Fehlschlag steht kein Tag');
    // 2 · signiert, aber in der eigenen Konfiguration ist keine Prüfliste eingerichtet
    u.commit(true);
    execFileSync('git', ['config', '--global', '--unset', 'gpg.ssh.allowedSignersFile'], { env: u.env, stdio: 'pipe' });
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.902', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), []);
    // 3 · ein schon vorhandener, nur annotierter Tag wird nicht überschrieben
    u.vertrauen(k.oeffentlich);
    u.g('tag', '-a', 'v1.0.903', '-m', 'unsigniert');
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.903', schreiben: leise, env: u.env }), 1);
    // 4 · die eigene Prüfliste nennt einen anderen Schlüssel: verify-commit ist rot, es entsteht kein Tag
    u.vertrauen(fremd.oeffentlich);
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.904', schreiben: leise, env: u.env }), 1);
    assert.deepEqual(tags(u), ['v1.0.903'], 'nur der vorher angelegte unsignierte Tag steht, kein neuer');
    keineSchluesseldateiImKlon(u);
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur·Rot-Beweis] ein Schlüssel, dessen Fingerabdruck nicht in SECURITY.md 2.1 steht: rot, der Tag wird wieder gelöscht', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('neu');
    u.signierenEinrichten(k); u.vertrauen(k.oeffentlich); u.commit(true);   // SECURITY nennt einen anderen Fingerabdruck
    let text = '';
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.901', schreiben: (t) => { text += t; }, env: u.env }), 1);
    assert.match(text, /gilt laut SECURITY\.md 2\.1/);
    assert.deepEqual(tags(u), [], 'kein Tag bleibt stehen');
  } finally { u.aufraeumen(); }
  assert.equal(stehtInSecurity21IstRein(), true);
});
function stehtInSecurity21IstRein() {
  const { stehtInSecurity21, fingerabdruckAusTagV } = require('../tools/oeffentlich-tag-signieren.js');
  const fp = 'SHA256:' + 'B'.repeat(43);
  return fingerabdruckAusTagV('Good "git" signature for x with ECDSA key ' + fp) === fp
    && stehtInSecurity21('### 2.1\n' + fp + '\n### 2.2', fp) && !stehtInSecurity21('### 2.1\n### 2.2\n' + fp, fp) && !stehtInSecurity21('', null);
}

test('[Tag-Signatur·Zeitraum·Rot-Beweis] nach dem Schlüsselwechsel: neues Tag mit dem abgelösten Schlüssel fällt, alte Tags bleiben gültig', () => {
  const { tagSchluesselPruefen } = require('../tools/oeffentlich-tag-signieren.js');
  const alt = 'SHA256:' + 'A'.repeat(43);
  const neu = 'SHA256:' + 'N'.repeat(43);
  const sec = '### 2.1 Repository\nRelease-Schlüssel:\n- `' + alt + '` (ED25519), bis v1.0.900\n- `' + neu + '` (ECDSA), gilt ab v1.0.901\n### 2.2 x';
  assert.deepEqual(tagSchluesselPruefen(sec, 'v1.0.905', neu), { ok: true });
  assert.match(tagSchluesselPruefen(sec, 'v1.0.905', alt).grund, /für v1\.0\.905 gilt laut SECURITY\.md 2\.1 SHA256:N/, 'abgelöster Schlüssel für ein neues Tag: rot');
  assert.deepEqual(tagSchluesselPruefen(sec, 'v1.0.857', alt), { ok: true }, 'ein altes Tag bleibt mit dem alten Schlüssel gültig');
  assert.match(tagSchluesselPruefen(sec, 'v1.0.857', neu).grund, /gilt laut SECURITY\.md 2\.1 SHA256:A/);
  const ueberlapp = sec.replace('gilt ab v1.0.901', 'gilt ab v1.0.890');
  assert.match(tagSchluesselPruefen(ueberlapp, 'v1.0.895', neu).grund, /nicht genau ein Schlüssel \(2\)/, 'Überlappung: rot');
  assert.match(tagSchluesselPruefen('### 2.1\n### 2.2', 'v1.0.900', neu).grund, /nicht genau ein Schlüssel \(0\)/);
  assert.match(tagSchluesselPruefen(sec, 'v1.0.905', null).grund, /nicht lesbar/);
  assert.deepEqual(tagSchluesselPruefen('### 2.1\nFingerabdruck `' + alt + '` (ED25519)\n### 2.2', 'v1.0.999', alt), { ok: true }, 'ohne Bereich gilt ein einzelner Schlüssel für alle');
});

test('[Tag-Signatur·Zeitraum·Rot-Beweis] am echten Git: ein Tag v1.0.905 mit dem Schlüssel „bis v1.0.900“ wird angelegt, geprüft und wieder gelöscht', () => {
  const u = wegwerfUmgebung();
  try {
    const alt = u.schluessel('alt');
    const neu = u.schluessel('neu');
    u.signierenEinrichten(alt); u.vertrauen(alt.oeffentlich);
    u.commit(true, alt.fp + '` (ED25519), bis v1.0.900\n- `' + neu.fp + '` (ECDSA), gilt ab v1.0.901');
    let text = '';
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.905', schreiben: (t) => { text += t; }, env: u.env }), 1);
    assert.match(text, /für v1\.0\.905 gilt laut SECURITY\.md 2\.1/);
    assert.deepEqual(tags(u), [], 'kein Tag bleibt stehen');
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.899', schreiben: leise, env: u.env }), 0, 'für v1.0.899 gilt der alte Schlüssel');
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur·Fassung·Rot-Beweis] alter Schlüssel mit erfundener alter Fassung, nie ausgelieferte Fassung, fehlende Register: rot, kein Tag', () => {
  const { fassungPruefen } = require('../tools/oeffentlich-tag-signieren.js');
  const doku = '| v856 | x |\n| v900 | x |\n';
  const st = JSON.stringify({ staende: [{ fassung: 'v1.0.857' }] });
  assert.match(fassungPruefen('v1.0.856', { standDoku: doku, oeffentlicheStaende: st }).grund, /nicht neuer als der jüngste öffentliche Stand v1\.0\.857/);
  assert.match(fassungPruefen('v1.0.950', { standDoku: doku, oeffentlicheStaende: st }).grund, /nie ausgeliefert/);
  assert.deepEqual(fassungPruefen('v1.0.900', { standDoku: doku, oeffentlicheStaende: st }), { ok: true });
  assert.match(fassungPruefen('v1.0.900', { standDoku: doku, oeffentlicheStaende: '{' }).grund, /nicht lesbar/);
  const u = wegwerfUmgebung();
  try {
    const alt = u.schluessel('alt');
    u.signierenEinrichten(alt); u.vertrauen(alt.oeffentlich);
    u.commit(true, alt.fp + '` (ED25519), bis v1.0.900');
    let text = '';
    fs.appendFileSync(u.register.auslieferungen, '| v856 | x |\n');
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.856', schreiben: (t) => { text += t; }, env: u.env }), 1, 'alter Schlüssel, erfundene alte Fassung');
    assert.match(text, /nicht neuer/);
    assert.equal(signieren({ klon: u.klon, tag: 'v1.0.899', schreiben: leise, env: u.env }), 1, 'ohne Register kein Tag');
    assert.deepEqual(tags(u), []);
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur] mit falschem Tag-Namen und ohne Klon endet der Lauf rot, bevor git etwas anlegt', () => {
  const u = wegwerfUmgebung();
  try {
    u.commit(false);
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'release-1', schreiben: leise, env: u.env }), 1);
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

test('[Tag-Signatur·Öffentlicher Lauf·Rot-Beweis] ohne Beleg, mit rotem Beleg, mit Beleg eines anderen Baums: rot, kein Tag', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('release');
    u.signierenEinrichten(k); u.vertrauen(k.oeffentlich);
    u.commit(true, k.fp);
    const baum = u.g('rev-parse', 'HEAD^{tree}').trim();
    fs.rmSync(lauf.belegPfad(u.klon, baum));
    let text = '';
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.900', schreiben: (t) => { text += t; }, env: u.env }), 1);
    assert.match(text, /kein Beleg des öffentlichen Laufs/);
    u.belegFuerHead({ unit: { exit: 1, rot: ['[X] eine Probe'] }, e2e: { exit: 0, rot: [] } });
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 1, 'roter Beleg');
    u.belegFuerHead({ unit: { exit: 0, rot: [] }, e2e: { exit: 1, rot: [] } });
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 1, 'Abbruch ohne Namen');
    fs.writeFileSync(lauf.belegPfad(u.klon, baum), JSON.stringify({ baum: 'f'.repeat(40), unit: { exit: 0, rot: [] }, e2e: { exit: 0, rot: [] } }));
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 1, 'Beleg eines anderen Baums');
    assert.deepEqual(tags(u), [], 'kein Tag bleibt stehen');
  } finally { u.aufraeumen(); }
});

test('[Tag-Signatur·Öffentlicher Lauf·Grundliste] bekannte rote Proben halten nicht an, eine neue schon', () => {
  const u = wegwerfUmgebung();
  try {
    const k = u.schluessel('release');
    u.signierenEinrichten(k); u.vertrauen(k.oeffentlich);
    u.commit(true, k.fp);
    const grundliste = path.join(u.tmp, 'grundliste.json');
    fs.writeFileSync(grundliste, JSON.stringify(['tests/e2e/a.spec.js › bekannt']));
    u.belegFuerHead({ unit: { exit: 0, rot: [] }, e2e: { exit: 1, rot: ['tests/e2e/a.spec.js › bekannt', 'tests/e2e/b.spec.js › neu'] } });
    let text = '';
    assert.equal(signieren({ ...u.register, grundliste, klon: u.klon, tag: 'v1.0.900', schreiben: (t) => { text += t; }, env: u.env }), 1);
    assert.match(text, /neue rote Probe.*b\.spec\.js › neu/);
    u.belegFuerHead({ unit: { exit: 0, rot: [] }, e2e: { exit: 1, rot: ['tests/e2e/a.spec.js › bekannt'] } });
    assert.equal(signieren({ ...u.register, klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 1, 'ohne Grundliste gilt nur grün');
    assert.equal(signieren({ ...u.register, grundliste, klon: u.klon, tag: 'v1.0.900', schreiben: leise, env: u.env }), 0, 'nur Bekanntes rot');
  } finally { u.aufraeumen(); }
});

test('[Öffentlicher Lauf·Auswertung] rote Namen aus node --test und aus dem Playwright-Bericht', () => {
  const ausgabe = 'ℹ pass 3\n✖ failing tests:\n\ntest at tests/a.test.js:1:1\n✖ [A] fällt (1.5ms)\n  Error: x\n\ntest at tests/b.test.js:1:1\n✖ tests/b.test.js (60.1ms)\n';
  assert.deepEqual(lauf.roteUnitProben(ausgabe), ['[A] fällt', 'tests/b.test.js']);
  assert.deepEqual(lauf.roteUnitProben('ℹ pass 3\n'), []);
  const bericht = { suites: [{ file: 'altkern.spec.js', specs: [{ title: 'baut nach', ok: false }, { title: 'grün', ok: true }],
    suites: [{ specs: [{ title: 'innen', ok: false }] }] }] };
  assert.deepEqual(lauf.roteReisen(bericht), ['altkern.spec.js › baut nach', 'altkern.spec.js › innen']);
  assert.deepEqual(lauf.roteReisen(null), []);
});
