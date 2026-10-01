#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   oeffentlich-tag-signieren.js — der Release-Tag des öffentlichen Stands, signiert (30.09.2026)
   ─────────────────────────────────────────────────────────────────
   Ein veröffentlichter Stand trägt den Tag `v1.0.<Fassung>`. Bis hierher war er nur annotiert. Dieses Werkzeug
   legt ihn signiert an (`git tag -s`), in dem öffentlichen Klon, aus dem gepusht wird, und prüft ihn, bevor
   irgendetwas hinausgeht:
     1  der Tag gibt es noch nicht (ein veröffentlichter Tag wird nie überschrieben)
     2  `git tag -s` — git signiert mit der Konfiguration der Person, die das Werkzeug aufruft
     3  der Tag-Inhalt trägt eine Signatur (SSH oder OpenPGP)
     4  `git tag -v` ist grün gegen den öffentlichen Schlüssel in `.github/allowed_signers` des Klons
   Schlägt 2, 3 oder 4 fehl, wird der lokale Tag wieder gelöscht und der Lauf endet rot (Exit 1) — ein
   unsignierter oder nicht prüfbarer Tag kann so nicht versehentlich mitgepusht werden.

   DIESES WERKZEUG LIEST KEINEN SCHLÜSSEL und sucht keinen. Es ruft nur git auf; welcher Schlüssel signiert,
   bestimmt die git-Konfiguration der aufrufenden Person. Aufgerufen wird es allein im Push-Lauf der
   Schlüsselhalterin, direkt vor dem Push ins öffentliche Repository. Die Probe
   (tests/oeffentlich-tag-signieren.test.js) arbeitet mit einem Wegwerf-Schlüssel im Temp.

   Aufruf:
     node tools/oeffentlich-tag-signieren.js --klon <öffentlicher Klon> --tag v1.0.<Fassung> [--commit <rev>]
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const TAG_MUSTER = /^v1\.0\.\d+$/;
const SIGNATUR = /-----BEGIN (SSH|PGP) SIGNATURE-----/;

function git(klon, args, { erben = false, env } = {}) {
  return spawnSync('git', ['-C', klon, ...args], { encoding: 'utf8', stdio: erben ? 'inherit' : 'pipe', env: env || ohneGitUmgebung() });
}

// REIN: trägt der Inhalt eines Tag-Objekts eine Signatur?
function tagInhaltSigniert(inhalt) { return SIGNATUR.test(String(inhalt || '')); }

function signieren({ klon, tag, commit = 'HEAD', schreiben = (t) => process.stdout.write(t), env } = {}) {
  const rot = (satz) => { schreiben('[tag-signieren] ROT — ' + satz + '\n'); return 1; };
  if (!klon || !fs.existsSync(path.join(klon, '.git'))) return rot('kein Git-Klon: ' + klon);
  if (!TAG_MUSTER.test(String(tag || ''))) return rot('der Tag heißt v1.0.<Fassung>, nicht „' + tag + '“');
  const erlaubt = path.join(klon, '.github', 'allowed_signers');
  if (!fs.existsSync(erlaubt)) return rot('.github/allowed_signers fehlt im Klon — ohne öffentlichen Schlüssel ist die Signatur nicht prüfbar');
  if (git(klon, ['rev-parse', '-q', '--verify', 'refs/tags/' + tag], { env }).status === 0) {
    return rot('den Tag ' + tag + ' gibt es schon — ein veröffentlichter Tag wird nicht überschrieben');
  }
  const loeschen = () => git(klon, ['tag', '-d', tag], { env });
  const s = git(klon, ['tag', '-s', tag, '-m', 'Vivodepot ' + tag, commit], { erben: true, env });
  if (s.status !== 0) { loeschen(); return rot('git tag -s ist gescheitert (ist das Signieren in git eingerichtet?)'); }
  const inhalt = git(klon, ['cat-file', 'tag', tag], { env }).stdout;
  if (!tagInhaltSigniert(inhalt)) { loeschen(); return rot('der Tag trägt keine Signatur — gelöscht, nichts gepusht'); }
  const v = git(klon, ['-c', 'gpg.ssh.allowedSignersFile=' + erlaubt, 'tag', '-v', tag], { env });
  if (v.status !== 0) {
    loeschen();
    return rot('git tag -v ist rot gegen .github/allowed_signers — gelöscht, nichts gepusht\n' + String(v.stderr || '').trim());
  }
  schreiben('[tag-signieren] OK — ' + tag + ' signiert und gegen .github/allowed_signers geprüft\n');
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  return signieren({ klon: arg('klon') && path.resolve(arg('klon')), tag: arg('tag'), commit: arg('commit') || 'HEAD' });
}

if (require.main === module) process.exitCode = main();
module.exports = { signieren, tagInhaltSigniert, TAG_MUSTER };
