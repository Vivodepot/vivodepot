#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   oeffentlich-tag-signieren.js — Release-Commit und Release-Tag des öffentlichen Stands, signiert (30.09.2026, umgebaut 01.10.2026)
   ─────────────────────────────────────────────────────────────────
   Ein veröffentlichter Stand trägt den Tag `v1.0.<Fassung>`. Dieses Werkzeug prüft den signierten Release-Commit,
   legt den Tag signiert an (`git tag -s`) und prüft ihn, im öffentlichen Klon, aus dem gepusht wird, bevor irgendetwas
   hinausgeht:
     1  der Tag gibt es noch nicht (ein veröffentlichter Tag wird nie überschrieben)
     2  `git verify-commit` ist grün für den Commit, auf den der Tag zeigt (er entstand mit `git commit -S`)
     3  `git tag -s` — git signiert mit der Konfiguration der Person, die das Werkzeug aufruft
     4  der Tag-Inhalt trägt eine Signatur (SSH oder OpenPGP)
     5  `git tag -v` ist grün
   Schlägt 3, 4 oder 5 fehl, wird der lokale Tag wieder gelöscht und der Lauf endet rot (Exit 1) — ein unsignierter oder
   nicht prüfbarer Tag kann so nicht versehentlich mitgepusht werden.

   GEPRÜFT WIRD GEGEN DIE EIGENE GIT-KONFIGURATION DER AUFRUFENDEN PERSON (Umbau 01.10.2026, Entscheidung vom selben Tag: kein
   Schlüsselmaterial in einer Sitzung, auch nicht der öffentliche Teil als Datei im Repo). Bis dahin verlangte das Werkzeug
   `.github/allowed_signers` im Klon. Jetzt prüfen `git verify-commit` und `git tag -v` gegen die Liste, die die Person
   selbst in ihrer git-Konfiguration nennt (`gpg.ssh.allowedSignersFile`, außerhalb des Repos). DIESES WERKZEUG LIEST KEINEN
   SCHLÜSSEL UND KEINEN PFAD, gibt keinen aus und sucht keinen; es ruft nur git auf. Ist die Prüfung nicht eingerichtet,
   ist das rot, nie still grün. Anleitung für die Schlüsselhalterin: interne Übergabe vom 01.10.2026 (Release signieren
   mit einem SSH-Schlüssel). Die Probe (tests/oeffentlich-tag-signieren.test.js) arbeitet mit Wegwerf-Schlüsseln im Temp.

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
  if (git(klon, ['rev-parse', '-q', '--verify', 'refs/tags/' + tag], { env }).status === 0) {
    return rot('den Tag ' + tag + ' gibt es schon — ein veröffentlichter Tag wird nicht überschrieben');
  }
  const vc = git(klon, ['verify-commit', commit], { env });
  if (vc.status !== 0) {
    return rot('git verify-commit ist rot für ' + commit + ' — der Release-Commit entsteht mit `git commit -S`, und die Prüfung '
      + 'braucht gpg.ssh.allowedSignersFile in der eigenen git-Konfiguration\n' + String(vc.stderr || '').trim());
  }
  const loeschen = () => git(klon, ['tag', '-d', tag], { env });
  const s = git(klon, ['tag', '-s', tag, '-m', 'Vivodepot ' + tag, commit], { erben: true, env });
  if (s.status !== 0) { loeschen(); return rot('git tag -s ist gescheitert (ist das Signieren in git eingerichtet?)'); }
  const inhalt = git(klon, ['cat-file', 'tag', tag], { env }).stdout;
  if (!tagInhaltSigniert(inhalt)) { loeschen(); return rot('der Tag trägt keine Signatur — gelöscht, nichts gepusht'); }
  const v = git(klon, ['tag', '-v', tag], { env });
  if (v.status !== 0) {
    loeschen();
    return rot('git tag -v ist rot gegen die eigene git-Konfiguration — gelöscht, nichts gepusht\n' + String(v.stderr || '').trim());
  }
  schreiben('[tag-signieren] OK — Commit ' + commit + ' und ' + tag + ' signiert und mit git verify-commit / git tag -v geprüft\n');
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  return signieren({ klon: arg('klon') && path.resolve(arg('klon')), tag: arg('tag'), commit: arg('commit') || 'HEAD' });
}

if (require.main === module) process.exitCode = main();
module.exports = { signieren, tagInhaltSigniert, TAG_MUSTER };
