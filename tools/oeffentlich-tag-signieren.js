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
   Vor 3: für den Baum des Release-Commits liegt ein Beleg des öffentlichen Laufs vor, und er ist grün
   (tools/oeffentlicher-lauf-beleg.js, 05.10.2026). Mit `--grundliste <datei>` (JSON-Liste bekannter roter Proben)
   hält nur eine NEUE rote Probe an — für die Zeit, bis ein bekannter roter Stand abgearbeitet ist.
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
     node tools/oeffentlich-tag-signieren.js --klon <öffentlicher Klon> --tag v1.0.<Fassung> --auslieferungen <datei> --staende <datei> [--commit <rev>] [--grundliste <datei>]
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');
const { belegLesen, laufBelegPruefen } = require('./oeffentlicher-lauf-beleg.js');

const TAG_MUSTER = /^v1\.0\.\d+$/;
const SIGNATUR = /-----BEGIN (SSH|PGP) SIGNATURE-----/;

function git(klon, args, { erben = false, env } = {}) {
  return spawnSync('git', ['-C', klon, ...args], { encoding: 'utf8', stdio: erben ? 'inherit' : 'pipe', env: env || ohneGitUmgebung() });
}

// REIN: trägt der Inhalt eines Tag-Objekts eine Signatur?
function tagInhaltSigniert(inhalt) { return SIGNATUR.test(String(inhalt || '')); }

/* DER ÖFFENTLICHE PRÜFWEG MUSS STIMMEN (03.10.2026, Signaturkette Option A): SECURITY.md 2.1 nennt den Fingerabdruck des
   Release-Schlüssels, und wer v1.0.<n> prüft, liest dort, welcher Schlüssel es sein muss. Ein Tag mit einem Schlüssel,
   der dort nicht steht (etwa der erste Tag nach einem Schlüsselwechsel, bevor 2.1 nachgezogen ist), wird darum gar nicht
   erst angelegt. Rein: Fingerabdruck aus der Ausgabe von `git tag -v`, und ob er im Abschnitt 2.1 steht. */
function fingerabdruckAusTagV(ausgabe) {
  const m = /with \S+ key (SHA256:[A-Za-z0-9+\/]{43})/.exec(String(ausgabe || ''));
  return m ? m[1] : null;
}
function abschnitt21(security) {
  const t = String(security || '');
  const a = t.indexOf('### 2.1');
  const b = t.indexOf('### 2.2', a + 1);
  return a < 0 ? '' : t.slice(a, b < 0 ? undefined : b);
}
function stehtInSecurity21(security, fp) { return !!fp && abschnitt21(security).includes(fp); }

/* JE FASSUNG GENAU EIN SCHLÜSSEL (03.10.2026, Befund TAG-TOR-SCHLUESSEL-ZEITRAUM): nach einem Schlüsselwechsel nennt 2.1
   beide Schlüssel; „steht irgendwo in 2.1“ ließe dann ein neues Tag mit dem abgelösten durch. Darum trägt jeder
   Fingerabdruck in seiner Zeile seinen Bereich: „gilt ab v1.0.<n>“ und/oder „bis v1.0.<m>“. Ohne Angabe gilt er für alle
   Fassungen (der Stand mit einem einzigen Schlüssel). Gemessen wird an der Fassung im Tag-Namen, nicht an einer Uhrzeit:
   sie steht fest und lässt sich nicht rückdatieren. Rein. */
function schluesselAus21(security) {
  const je = new Map();
  for (const zeile of abschnitt21(security).split('\n')) {
    for (const m of zeile.matchAll(/SHA256:[A-Za-z0-9+\/]{43}/g)) {
      const ab = /gilt ab v1\.0\.(\d+)/.exec(zeile);
      const bis = /bis v1\.0\.(\d+)/.exec(zeile);
      const alt = je.get(m[0]) || { fp: m[0], ab: null, bis: null };
      if (ab) alt.ab = Number(ab[1]);
      if (bis) alt.bis = Number(bis[1]);
      je.set(m[0], alt);
    }
  }
  return [...je.values()];
}
function gueltigFuer(schluessel, fassungNr) {
  return schluessel.filter((k) => (k.ab === null || fassungNr >= k.ab) && (k.bis === null || fassungNr <= k.bis));
}
/* Rein: { ok } oder { ok:false, grund }. */
function tagSchluesselPruefen(security, tag, fp) {
  const treffer = /^v1\.0\.(\d+)$/.exec(String(tag || ''));
  if (!treffer) return { ok: false, grund: 'der Tag heißt v1.0.<Fassung>, nicht „' + tag + '“' };
  const n = Number(treffer[1]);
  if (!fp) return { ok: false, grund: 'der Fingerabdruck des Tag-Schlüssels ist aus git tag -v nicht lesbar' };
  const gueltig = gueltigFuer(schluesselAus21(security), n);
  if (gueltig.length !== 1) return { ok: false, grund: 'für ' + tag + ' gilt laut SECURITY.md 2.1 nicht genau ein Schlüssel (' + gueltig.length + ')' };
  if (gueltig[0].fp !== fp) return { ok: false, grund: 'der Tag ist mit ' + fp + ' signiert, für ' + tag + ' gilt laut SECURITY.md 2.1 ' + gueltig[0].fp };
  return { ok: true };
}

/* NUR EIN NEUER, AUSGELIEFERTER STAND (03.10.2026, Gegenlesung zu TAG-TOR-SCHLUESSEL-ZEITRAUM): der Tag-Name ist frei
   wählbar; mit einem abgelösten Schlüssel ließe sich sonst ein Tag für eine nie veröffentlichte alte Fassung setzen
   (etwa v1.0.856, für die der alte Schlüssel gilt). Darum zwei Register, als Dateien übergeben (die Pfade kennt der
   Aufrufer; dieses Werkzeug läuft im öffentlichen Klon): (a) das Register der Auslieferungen führt den Kern v<n> als
   ausgeliefert (Zeile „| v<n> | …“); (b) n ist größer als jede Fassung im Register der öffentlichen Stände
   ({"staende":[{"fassung":"v1.0.<m>"}]}) — ein Tag ist immer ein neuer, späterer öffentlicher Stand. Den Baum hält
   danach das Tor für das Quell-Tag. Rein: { ok } oder { ok:false, grund }. */
function fassungPruefen(tag, { standDoku, oeffentlicheStaende }) {
  const m = /^v1\.0\.(\d+)$/.exec(String(tag || ''));
  if (!m) return { ok: false, grund: 'der Tag heißt v1.0.<Fassung>' };
  const n = Number(m[1]);
  if (!String(standDoku || '').split('\n').some((z) => z.startsWith('| v' + n + ' |'))) {
    return { ok: false, grund: 'Kern v' + n + ' steht nicht im Register der Auslieferungen — nie ausgeliefert' };
  }
  let staende;
  try { staende = JSON.parse(oeffentlicheStaende).staende; } catch { return { ok: false, grund: 'Register der öffentlichen Stände nicht lesbar' }; }
  const hoechste = Math.max(0, ...staende.map((x) => Number((/^v1\.0\.(\d+)$/.exec(x.fassung) || [])[1] || 0)));
  if (n <= hoechste) return { ok: false, grund: tag + ' ist nicht neuer als der jüngste öffentliche Stand v1.0.' + hoechste };
  return { ok: true };
}

function signieren({ klon, tag, commit = 'HEAD', auslieferungen, staende, grundliste, schreiben = (t) => process.stdout.write(t), env } = {}) {
  const rot = (satz) => { schreiben('[tag-signieren] ROT — ' + satz + '\n'); return 1; };
  if (!klon || !fs.existsSync(path.join(klon, '.git'))) return rot('kein Git-Klon: ' + klon);
  if (!TAG_MUSTER.test(String(tag || ''))) return rot('der Tag heißt v1.0.<Fassung>, nicht „' + tag + '“');
  const lesen = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
  const standDoku = auslieferungen ? lesen(auslieferungen) : null;
  const oeffentlicheStaende = staende ? lesen(staende) : null;
  if (standDoku === null || oeffentlicheStaende === null) return rot('--auslieferungen und --staende (die zwei Register) fehlen oder sind nicht lesbar — ohne Register kein Tag');
  const fassung = fassungPruefen(tag, { standDoku, oeffentlicheStaende });
  if (!fassung.ok) return rot(fassung.grund);
  if (git(klon, ['rev-parse', '-q', '--verify', 'refs/tags/' + tag], { env }).status === 0) {
    return rot('den Tag ' + tag + ' gibt es schon — ein veröffentlichter Tag wird nicht überschrieben');
  }
  const vc = git(klon, ['verify-commit', commit], { env });
  if (vc.status !== 0) {
    return rot('git verify-commit ist rot für ' + commit + ' — der Release-Commit entsteht mit `git commit -S`, und die Prüfung '
      + 'braucht gpg.ssh.allowedSignersFile in der eigenen git-Konfiguration\n' + String(vc.stderr || '').trim());
  }
  // Der öffentliche Lauf für genau diesen Baum (05.10.2026): ohne grünen Beleg kein Tag.
  let liste = null;
  if (grundliste) {
    try { liste = JSON.parse(fs.readFileSync(grundliste, 'utf8')); } catch { return rot('die Grundliste ist nicht lesbar: ' + grundliste); }
    if (!Array.isArray(liste) || liste.some((x) => typeof x !== 'string')) return rot('die Grundliste ist keine Liste von Probennamen');
  }
  const baum = git(klon, ['rev-parse', commit + '^{tree}'], { env }).stdout.trim();
  const lauf = laufBelegPruefen(belegLesen(klon, baum), { baum, grundliste: liste });
  if (!lauf.ok) return rot(lauf.grund);
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
  const fp = fingerabdruckAusTagV(String(v.stderr || '') + String(v.stdout || ''));
  const security = git(klon, ['show', commit + ':SECURITY.md'], { env }).stdout;
  const urteil = tagSchluesselPruefen(security, tag, fp);
  if (!urteil.ok) {
    loeschen();
    return rot(urteil.grund + ' — der öffentliche Prüfweg nennte einen anderen; gelöscht, nichts gepusht');
  }
  schreiben('[tag-signieren] OK — Commit ' + commit + ' und ' + tag + ' signiert und mit git verify-commit / git tag -v geprüft\n');
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  return signieren({ klon: arg('klon') && path.resolve(arg('klon')), tag: arg('tag'), commit: arg('commit') || 'HEAD',
    auslieferungen: arg('auslieferungen') && path.resolve(arg('auslieferungen')), staende: arg('staende') && path.resolve(arg('staende')),
    grundliste: arg('grundliste') && path.resolve(arg('grundliste')) });
}

if (require.main === module) process.exitCode = main();
module.exports = { signieren, tagInhaltSigniert, fingerabdruckAusTagV, stehtInSecurity21, schluesselAus21, gueltigFuer, tagSchluesselPruefen, fassungPruefen, TAG_MUSTER };
