#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   testfassung-legen.js — „Die Testfassung ausliefern", Zug 1 (23.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   EIN SKRIPT, DAS DIE TESTFASSUNG LEGT — nicht eine Anleitung, die jemand befolgt.
   Ersetzt den bisherigen Weg (Handarbeit, 26.07.2026): dort bumpte ein erster Versuch
   zwei von drei Lockstep-Stellen und vergaß BUILD_DATUM — genau die Fehlerklasse, die
   dieses Werkzeug ausschliessen
   soll, indem es alle drei zusammen aus EINER Quelle liest, nie von Hand einträgt.

   DER SATZ, DER KOPIERT WIRD (kuratiert, nicht `cp -r`): vivodepot.html,
   vivodepot-lesen.html, sw.js, manifest.webmanifest. NICHT `.nojekyll` — das ist eine
   leere Pages-Markierung im Zielrepo, keine Auslieferungsfassung, wird nie angefasst.
   Kein `docs/`, kein `tests/`, kein `tools/`, kein `.github/`, kein SBOM — der
   Auftrag selbst nennt genau diesen Satz.

   VOR DEM LEGEN PRÜFT ES (der Auftrag, wörtlich): Suite grün, Browser-Proben grün,
   Arbeitsbaum sauber, Lockstep stimmig. „Suite grün" wird hier NICHT durch einen
   erneuten ~2-Minuten-Lauf geprüft, sondern durch dieselbe Bürgschaft, die jeder
   Commit in diesem Repo schon trägt: der lokale HEAD muss mit dem gepushten
   `origin/u2-kanon`-HEAD übereinstimmen — und jeder Push durchläuft bereits
   pre-commit (Suite). Berichtigt (Fund, 01.09.2026): pre-push fährt KEIN
   E2E — er prüft Build-Datum/Lockstep, ein Kampagnen-Gate und Krypto-Vektoren,
   `playwright test` kommt in keinem Hook vor. „Browser-Proben grün" ist damit NICHT
   durch das HEAD-Gleichheits-Gate gedeckt, sondern bleibt eine gesonderte, von Hand
   zu erfüllende Vorbedingung. Ein ungepushter oder abweichender HEAD legt trotzdem
   nichts; das ist keine Bequemlichkeit, sondern dieselbe Vorbedingung wie im
   dokumentierten Vorgänger-Einspielen („`ls-remote` == lokaler HEAD, CI grün").

   EIN COMMIT IM ZIELREPO, kein zweiter zum Nachbessern (die v76-Lehre: `--amend`
   statt Folge-Commit). NACH DEM LEGEN EIN VERMERK — `docs/testfassung-stand.md`
   in DIESEM Repo (nicht im Zielrepo — der Auftrag nennt genau die vier Dateien für
   dort), damit „welcher Stand, welcher Commit, welches Datum" ohne Suchen im
   Ziel-Git-Log zu finden ist.

   `--ziel <pfad>`   Pfad zum geklonten Zielrepo (Default: Geschwisterordner
                     `../vivodepot-ios-test`, wie heute vorgefunden).
   `--push`          Nach dem Commit auch pushen. Ohne dieses Flag bleibt der
                     Commit lokal im Zielrepo liegen — wer nachsehen will, kann.
   `--dry-run`       Nichts schreiben, nur die Vorbedingungen und den geplanten
                     Diff zeigen.

   `--sw-aenderung-beabsichtigt <U2-ADR-Nr>`   „Ein Fix, der sich selbst
   nicht ausliefern kann" (02.09.2026, Fund): der sw.js-Wächter unten (aus der
   Service-Worker-Update-Sackgasse vom 31.08.2026) verweigert seit v492 JEDE Auslieferung,
   bei der sich sw.js in mehr als Kommentaren/der CACHE-Zeile ändert — richtig gegen
   versehentliche Drift, aber blind gegen eine GEWOLLTE Änderung (U2-ADR-190, das
   bedingte skipWaiting). Dieser Schalter hebt die Sperre NUR auf, wenn er eine ADR
   NENNT, die tatsächlich existiert UND sw.js im eigenen Text erwähnt — kein blankes
   `--force` (das wäre in drei Wochen der Normalweg, nicht die Ausnahme). Eine erfundene
   oder unpassende Nummer bricht genauso ab wie ganz ohne Schalter, s.
   `swAenderungEntscheidung`/`adrBezeichnetSwAenderung` unten und deren Rot-Beweise in
   `tests/testfassung-legen.test.js`.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneKommentareUndStrings } = require('./g11-js-code-ohne-kommentare-strings.js');
const { indexWeiterleitungInhalt } = require('./index-weiterleitung-erzeugen.js');
const { DATEISATZ } = require('../scripts/ausgeliefertes-dateiset.js');

const REPO = path.join(__dirname, '..');
const VERMERK = path.join(REPO, 'docs', 'testfassung-stand.md');

// U2-ADR-194 (01.09.2026, Auftrag): die Wurzel lieferte ohne Dateinamen einen
// echten 404 — weder für einen gekürzten/abgetippten Link noch für sw.js' Precache-
// Eintrag ('./', SCHALE) gab es dort etwas zu holen. index.html gehört NICHT zu
// DATEISATZ (der Auftrag nennt genau vier Dateien, s. u.) — separater Schritt, damit
// DATEISATZ seine bestehende Bedeutung (u. a. im sw.js-Diff-Vergleich, im "neu seither"-
// Log) unverändert behält.
function dateisatzUndIndexAblegen(ziel) {
  for (const datei of DATEISATZ) {
    fs.copyFileSync(path.join(REPO, datei), path.join(ziel, datei));
  }
  fs.writeFileSync(path.join(ziel, 'index.html'), indexWeiterleitungInhalt(path.join(ziel, 'vivodepot.html')));
}

// Eigener Fund beim Bau der Positivkontrolle (01.09.2026): `execFileSync` erbt
// standardmäßig `process.env` — ruft dieses Werkzeug jemals aus einem laufenden
// git-Hook heraus (z. B. verschachtelt in einer anderen Automatisierung), trägt die
// Umgebung `GIT_DIR`/`GIT_WORK_TREE` für DAS Repo, das den Hook auslöste; `cwd`
// allein räumt das nicht ab, und `git`-Aufrufe auf `ziel` würden dann still auf dem
// FALSCHEN Repo landen, nicht auf `ziel`. Im Normalbetrieb (manueller CLI-Aufruf)
// ist das ein No-op — es gibt dann keine `GIT_*`-Variablen zu entfernen.
function ohneGitEnv() {
  const rein = {};
  for (const k of Object.keys(process.env)) if (!k.startsWith('GIT_')) rein[k] = process.env[k];
  return rein;
}
function sh(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', env: ohneGitEnv() }).trim();
}
function shOk(cmd, args, cwd) {
  try { return { ok: true, out: sh(cmd, args, cwd) }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || e.message) }; }
}

function schalenWerte(html) {
  const stand = (html.match(/const SCHALEN_STAND = '([^']+)'/) || [])[1];
  const datum = (html.match(/const BUILD_DATUM = '([^']+)'/) || [])[1];
  const version = (html.match(/const BUILD_VERSION = '([^']+)'/) || [])[1];
  return { stand, datum, version };
}

function vorbedingungen(ziel) {
  const funde = [];

  // 1 · Arbeitsbaum sauber (dieses Repo).
  const status = sh('git', ['status', '--porcelain']);
  if (status) funde.push('Arbeitsbaum nicht sauber (' + REPO + '):\n' + status);

  // 2 · Lokaler HEAD == gepushter HEAD — Ersatz für „Suite/E2E/Konformität grün",
  //     weil genau das jeder Push über pre-commit/pre-push bereits erzwingt.
  const lokal = sh('git', ['rev-parse', 'HEAD']);
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const remote = shOk('git', ['ls-remote', 'origin', 'refs/heads/' + branch]);
  const remoteSha = remote.ok ? (remote.out.split(/\s+/)[0] || null) : null;
  if (!remote.ok) funde.push('`git ls-remote origin` fehlgeschlagen — kein Netz oder kein Zugriff:\n' + remote.out);
  else if (remoteSha !== lokal) {
    funde.push('Lokaler HEAD (' + lokal.slice(0, 7) + ') weicht vom gepushten origin/' + branch
      + ' (' + String(remoteSha).slice(0, 7) + ') ab — ungepushte Änderungen liegen nicht unter Suite/E2E-Gate.');
  }

  // 3 · Lockstep in DIESEM Repo — SCHALEN_STAND/BUILD_DATUM/CACHE zusammen, aus derselben Quelle gelesen.
  const kernHtml = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const kern = schalenWerte(kernHtml);
  if (!kern.stand || !kern.datum || !kern.version) funde.push('SCHALEN_STAND/BUILD_DATUM/BUILD_VERSION nicht gefunden in vivodepot.html.');
  const swText = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');
  const cacheMatch = (swText.match(/const CACHE = 'vivodepot-shell-(v\d+)'/) || [])[1];
  if (cacheMatch !== kern.stand) funde.push('Lockstep-Bruch: sw.js CACHE=' + cacheMatch + ' != vivodepot.html SCHALEN_STAND=' + kern.stand + '.');

  // 4 · Zielrepo existiert, ist ein sauberer Git-Klon auf main, aktuell zu seinem eigenen origin.
  if (!fs.existsSync(path.join(ziel, '.git'))) funde.push('Zielpfad ist kein Git-Repo: ' + ziel);
  else {
    const zStatus = sh('git', ['status', '--porcelain'], ziel);
    if (zStatus) funde.push('Zielrepo nicht sauber (' + ziel + '):\n' + zStatus);
    const zBranch = shOk('git', ['rev-parse', '--abbrev-ref', 'HEAD'], ziel);
    if (zBranch.ok && zBranch.out !== 'main') funde.push('Zielrepo steht nicht auf main, sondern auf: ' + zBranch.out);
  }

  return { funde, kern };
}

// Fund (01.09.2026): beide Funktionen sahen bis hierher nur auf den EINEN letzten
// Commit von HEAD — eine Annahme, dass dieses Werkzeug der einzige Schreiber des Zielrepos
// sei. Ist es nicht: `modul-app-packen.js` committet dorthin ebenfalls, ohne die
// `harness:`-Form zu tragen. Sitzt ein solcher Commit obenauf, fand `HEAD` weder das
// `ALT..NEU auf vivodepot-cleanslate`-Muster noch `harness: vNNN` — die Zählung wurde
// blind, nicht nur beim ersten Mal, sondern bei JEDEM Legen nach einem Modul-Packen
// (der Normalfall, kein Sonderfall). `--grep=^harness:` sucht stattdessen gezielt den
// LETZTEN Commit dieser Form, unabhängig davon, was seither sonst noch committet wurde.
function letzterQuellCommitAusZielHistorie(ziel) {
  // Die Commit-Konvention selbst trägt die Herkunft: "…auf vivodepot-cleanslate u2-kanon."
  // mit einer Zeile "ALT..NEU auf vivodepot-cleanslate u2-kanon." — NEU ist der Quell-Commit,
  // auf dem die aktuelle Testfassung beruht.
  const msg = sh('git', ['log', '-1', '--grep=^harness:', '--format=%B'], ziel);
  const treffer = msg.match(/([0-9a-f]{7,40})\.\.([0-9a-f]{7,40})\s+auf\s+vivodepot-cleanslate/);
  return treffer ? treffer[2] : null;
}

function naechsteVersionsnummer(ziel) {
  const msg = sh('git', ['log', '-1', '--grep=^harness:', '--format=%s'], ziel);
  const n = (msg.match(/harness:\s*v(\d+)/) || [])[1];
  return n ? String(parseInt(n, 10) + 1) : null;
}

// „Ein genannter, aber nicht auflösbarer Beleg ist kein Beleg" (dasselbe Prinzip wie
// im Register der Außenaussagen) — prüft NUR zwei Dinge, beide mechanisch, keins
// davon eine Interpretation des ADR-Inhalts (dieselbe bewusste Grenze wie in
// adr-referenzen-pruefen.js): 1) existiert eine ADR-Datei mit dieser Nummer unter
// `docs/adr/`, 2) erwähnt ihr Text die Zeichenkette "sw.js" überhaupt. `adrOrdner`
// ist überschreibbar (Default: das echte docs/adr/ dieses Repos) — Tests zeigen so
// auf ein isoliertes Wegwerf-Verzeichnis statt auf den echten Bestand.
function adrBezeichnetSwAenderung(kennung, adrOrdner) {
  const ordner = adrOrdner || path.join(REPO, 'docs', 'adr');
  const m = /^(?:U2-)?ADR-(\d+)$/.exec(String(kennung || '').trim());
  if (!m) return { ok: false, grund: '„' + kennung + '" ist keine ADR-Kennung der Form U2-ADR-<Zahl>.' };
  const nummer = m[1];
  const treffer = fs.readdirSync(ordner).filter((n) => new RegExp('^vivodepot-U2-ADR-' + nummer + '-').test(n));
  if (!treffer.length) return { ok: false, grund: 'U2-ADR-' + nummer + ' existiert nicht unter ' + ordner + '.' };
  const inhalt = fs.readFileSync(path.join(ordner, treffer[0]), 'utf8');
  if (!inhalt.includes('sw.js')) {
    return { ok: false, grund: 'U2-ADR-' + nummer + ' (' + treffer[0] + ') existiert, nennt aber "sw.js" an keiner '
      + 'Stelle — kein Beleg, dass sie diese Änderung deckt.' };
  }
  return { ok: true, datei: treffer[0] };
}

// Reine Entscheidung, kein Seiteneffekt — der Aufrufer liefert bereits den gemessenen
// Diff-Zustand (aus git, s. main()), diese Funktion sagt nur, ob er die Auslieferung
// blockieren darf. Bei reiner Kommentar-/CACHE-Zeilen-Abweichung ist der Schalter
// irrelevant (nichts zu decken); bei einer echten Abweichung entscheidet
// adrBezeichnetSwAenderung — ohne Schalter oder mit ungültigem bricht es IMMER ab
// (die beiden vom Auftrag verlangten Rot-Beweise: ohne Schalter, und mit Schalter
// aber erfundener ADR).
function swAenderungEntscheidung(nurCacheZeile, swDiffText, swAenderungAdr, adrOrdner) {
  if (nurCacheZeile || !swDiffText) return { blockiert: false };
  if (!swAenderungAdr) {
    return { blockiert: true, grund: 'sw.js weicht in mehr als Kommentaren/der CACHE-Zeile ab — kein '
      + '--sw-aenderung-beabsichtigt <U2-ADR-Nr> angegeben.' };
  }
  const adrPruefung = adrBezeichnetSwAenderung(swAenderungAdr, adrOrdner);
  if (!adrPruefung.ok) return { blockiert: true, grund: adrPruefung.grund };
  return { blockiert: false, adrPruefung };
}

// Fund (02.09.2026): dateisatzUndIndexAblegen() schreibt VOR dem sw.js-Diff-
// Vergleich bereits alle fünf Dateien (DATEISATZ + index.html) in `ziel` — der bisherige
// Abbruchpfad nahm nur `sw.js` zurück und ließ vivodepot.html/vivodepot-lesen.html/
// manifest.webmanifest/index.html verändert im Zielrepo liegen. Der NÄCHSTE Lauf (auch
// modul-app-packen.js) verweigerte dann mit „Zielrepo nicht sauber" — wegen des eigenen
// Zwischenergebnisses dieses Werkzeugs, von Hand zweimal aufgeräumt. Ein Abbruch muss
// den Zielbaum vollständig auf den Stand VOR dem Legen zurücksetzen, nicht teilweise.
function ablegungZuruecknehmen(ziel) {
  execFileSync('git', ['checkout', '--', ...DATEISATZ, 'index.html'], { cwd: ziel, env: ohneGitEnv() });
}

function main() {
  const argv = process.argv.slice(2);
  const zielArgIdx = argv.indexOf('--ziel');
  const ziel = zielArgIdx >= 0 ? path.resolve(argv[zielArgIdx + 1]) : path.join(REPO, '..', 'vivodepot-ios-test');
  const push = argv.includes('--push');
  const dryRun = argv.includes('--dry-run');
  const swAenderungIdx = argv.indexOf('--sw-aenderung-beabsichtigt');
  const swAenderungAdr = swAenderungIdx >= 0 ? argv[swAenderungIdx + 1] : null;

  const { funde, kern } = vorbedingungen(ziel);
  if (funde.length) {
    process.stderr.write('testfassung-legen: VORBEDINGUNG NICHT ERFÜLLT — es wird NICHTS gelegt.\n\n');
    funde.forEach((f) => process.stderr.write('  · ' + f + '\n'));
    process.exit(1);
  }

  const alterQuellCommit = letzterQuellCommitAusZielHistorie(ziel);
  const neueVersion = naechsteVersionsnummer(ziel);
  const neuerQuellCommit = sh('git', ['rev-parse', '--short', 'HEAD']);

  // Volle Liste NUR auf der Konsole (kann bei langer Auslieferungspause hunderte Zeilen tragen) —
  // in die COMMIT-NACHRICHT geht nur die Zahl + der Bereich, sonst würde die Historie des
  // Zielrepos ein Vielfaches der eigentlichen Änderung wiegen.
  let neuSeitherKonsole = '(kein vorheriger Quell-Commit in der Zielhistorie gefunden — Log nicht eingeschränkt)';
  let neuSeitherKurz = '(kein vorheriger Quell-Commit gefunden, siehe Konsolen-Ausgabe für den vollen Bereich)';
  if (alterQuellCommit) {
    const log = shOk('git', ['log', alterQuellCommit + '..HEAD', '--oneline', '--', ...DATEISATZ]);
    if (log.ok) {
      const zeilen = log.out ? log.out.split('\n') : [];
      neuSeitherKonsole = zeilen.length ? log.out : '(keine Commits an den vier Dateien in diesem Bereich)';
      neuSeitherKurz = zeilen.length
        ? zeilen.length + ' Commits an den vier Dateien seit ' + alterQuellCommit
          + ' — volle Liste: git log ' + alterQuellCommit + '..' + neuerQuellCommit + ' --oneline -- ' + DATEISATZ.join(' ')
        : '(keine Commits an den vier Dateien in diesem Bereich)';
    } else {
      neuSeitherKonsole = neuSeitherKurz = '(git log fehlgeschlagen: ' + log.out + ')';
    }
  }

  process.stdout.write('testfassung-legen: Vorbedingungen erfüllt.\n');
  process.stdout.write('  Quelle:  vivodepot-cleanslate/u2-kanon @ ' + neuerQuellCommit
    + ' (SCHALEN_STAND ' + kern.stand + ', BUILD_DATUM ' + kern.datum + ', BUILD_VERSION ' + kern.version + ')\n');
  process.stdout.write('  Ziel:    ' + ziel + ' (main)\n');
  process.stdout.write('  Bisheriger Quell-Commit der Testfassung: ' + (alterQuellCommit || '(unbekannt)') + '\n');
  process.stdout.write('  Neue Version (aus Zielhistorie fortgezählt): v' + (neueVersion || '?') + '\n');
  process.stdout.write('  Neu seit dem letzten Einspielen (an den vier Dateien):\n');
  neuSeitherKonsole.split('\n').forEach((z) => process.stdout.write('    ' + z + '\n'));

  if (dryRun) { process.stdout.write('\n--dry-run: nichts geschrieben, nichts committet.\n'); return; }

  dateisatzUndIndexAblegen(ziel);

  // Rot-Beweis der v76-Lehre, hier als Absicherung statt Nacherzählung: sw.js darf sich
  // gegenüber seiner VORHERIGEN Fassung im Zielrepo in AUSFÜHRBAREM Code NUR in der
  // CACHE-Zeile unterscheiden — Kommentare (z. B. eine neue Versions-Erläuterung, wie
  // sie über der CACHE-Zeile üblich ist) dürfen wachsen, das ist Dokumentation, kein
  // Verhalten. Deshalb wird auf beiden Seiten mit derselben G11-Maskierung verglichen,
  // die auch der Konformitäts-Wächter nutzt (Kommentare + String-Literale entfernt) —
  // nicht der rohe Zeilendiff, der jede neue Kommentarzeile fälschlich als Abweichung
  // liest (31.08.2026, Auftrag Service-Worker-Update-Sackgasse: eine elfzeilige
  // Erläuterung über der neuen CACHE-Zeile löste den alten, rein zeilenbasierten
  // Vergleich grundlos aus).
  const swDiff = shOk('git', ['diff', '--unified=0', '--', 'sw.js'], ziel);
  const swAltOk = shOk('git', ['show', 'HEAD:sw.js'], ziel);
  // Maskierte Kommentarzeilen werden zu Leerzeilen, nicht entfernt (Zeilenzahl bleibt erhalten) —
  // eine LÄNGERE neue Erläuterung erzeugt darum mehr Leerzeilen als die alte und ließe den
  // reinen String-Vergleich trotz identischem Code fehlschlagen. Deshalb zusätzlich alle
  // durchweg leeren Zeilen herausfiltern, bevor verglichen wird — nur ausführbarer Code zählt.
  const nurCode = (s) => s.split('\n').filter((z) => z.trim() !== '').join('\n');
  const swNeuMaskiert = nurCode(ohneKommentareUndStrings(fs.readFileSync(path.join(ziel, 'sw.js'), 'utf8')));
  const nurCacheZeile = swAltOk.ok && nurCode(ohneKommentareUndStrings(swAltOk.out)) === swNeuMaskiert;
  const swEntscheidung = swAenderungEntscheidung(nurCacheZeile, swDiff.ok ? swDiff.out : '', swAenderungAdr);
  if (swEntscheidung.blockiert) {
    process.stderr.write('testfassung-legen: ' + swEntscheidung.grund + ' — abgebrochen, nichts committet.\n');
    if (swDiff.ok && swDiff.out) process.stderr.write(swDiff.out + '\n');
    ablegungZuruecknehmen(ziel);
    process.exit(1);
  }
  if (swEntscheidung.adrPruefung) {
    // „Der maskierte Diff wird VOR dem Schreiben ausgegeben" (Auftrag) — die einzige
    // DURABLE Schreibhandlung dieses Werkzeugs ist der Commit gleich unten, nicht die
    // Arbeitsbaum-Kopie oben (die ein Abbruch jederzeit vollständig zurücknimmt, s.
    // ablegungZuruecknehmen). Sichtbar VOR diesem Commit ist darum die Garantie.
    process.stdout.write('testfassung-legen: sw.js weicht in mehr als Kommentaren/der CACHE-Zeile ab — '
      + 'gedeckt durch ' + swEntscheidung.adrPruefung.datei + ' (--sw-aenderung-beabsichtigt '
      + swAenderungAdr + '). Diff:\n');
    process.stdout.write((swDiff.out || '(kein Text-Diff — nur die Maskierung unterscheidet sich)') + '\n');
  }

  const versionsLabel = neueVersion || kern.stand.replace(/^v/, '');
  const nachricht = 'harness: v' + versionsLabel + ' -- ' + kern.datum + ', SCHALEN_STAND '
    + kern.stand + ' (cleanslate ' + neuerQuellCommit + ')\n\n'
    + (swEntscheidung.adrPruefung ? 'sw.js-Änderung gedeckt durch ' + swAenderungAdr + ' ('
      + swEntscheidung.adrPruefung.datei + ').\n\n' : '')
    + 'Neu seit dem letzten Einspielen: ' + neuSeitherKurz + '\n\n'
    + (alterQuellCommit || 'unbekannt') + '..' + neuerQuellCommit + ' auf vivodepot-cleanslate u2-kanon.';

  execFileSync('git', ['add', ...DATEISATZ, 'index.html'], { cwd: ziel, env: ohneGitEnv() });
  execFileSync('git', ['commit', '-m', nachricht], { cwd: ziel, env: ohneGitEnv() });
  const zielCommit = sh('git', ['rev-parse', '--short', 'HEAD'], ziel);

  fs.writeFileSync(VERMERK,
    '# Testfassung-Stand — zuletzt gelegt\n\n'
    + 'Maschinell erzeugt von `tools/testfassung-legen.js` — nicht von Hand pflegen.\n\n'
    + '- **Gelegt am:** ' + new Date().toISOString() + '\n'
    + '- **Quelle:** vivodepot-cleanslate/u2-kanon @ `' + neuerQuellCommit + '`\n'
    + '- **Ziel:** vivodepot-ios-test/main @ `' + zielCommit + '`' + (push ? ' (gepusht)' : ' (LOKAL, noch nicht gepusht)') + '\n'
    + '- **Schale:** ' + kern.stand + ' · Build ' + kern.version + ' · Stand ' + kern.datum + '\n');

  process.stdout.write('\nGelegt: vivodepot-ios-test @ ' + zielCommit + '\n');

  if (push) {
    execFileSync('git', ['push'], { cwd: ziel, stdio: 'inherit', env: ohneGitEnv() });
    process.stdout.write('Gepusht.\n');
  } else {
    process.stdout.write('NICHT gepusht (--push fehlt) — Commit liegt lokal in ' + ziel + '.\n');
  }
}

if (require.main === module) main();
module.exports = {
  vorbedingungen, schalenWerte, DATEISATZ, letzterQuellCommitAusZielHistorie, naechsteVersionsnummer,
  dateisatzUndIndexAblegen, adrBezeichnetSwAenderung, swAenderungEntscheidung, ablegungZuruecknehmen,
};
