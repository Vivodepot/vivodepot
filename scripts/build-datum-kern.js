'use strict';
/* ════════════════════════════════════════════════════════════════════════
   BUILD_DATUM-Lockstep — der gemeinsame Kern
   ────────────────────────────────────────────────────────────────────────
   EIN Mechanismus, ZWEI Zugänge (die wiederkehrende Form vom 26.07.):
     · tests/build-datum-lockstep.test.js  — der nächste Commit
     · hooks/pre-push                      — der GANZE ungepushte Bereich
   Beide rufen dieselben Funktionen. Eine wiederholte Regex wäre eine Kopie
   und schlechter als keine Prüfung, weil sie wie Deckung aussieht (§7.5).

   DIE GRENZE. Auslöser ist „vivodepot.html hat sich geändert" — nicht
   „SCHALEN_STAND hat sich geändert". Die alte Fassung band an SCHALEN_STAND
   und war am 26.07. grün, während der Fehler vorlag.

   DIE AUSNAHME. Die BUILD_DATUM-Zeile selbst zählt nicht als Änderung,
   sonst verlangte jeder Bump seinen eigenen nächsten.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const DATEI = 'vivodepot.html';
const DATUMSZEILE = /^.*const BUILD_DATUM = '[^']*'.*$/m;

// maxBuffer ausdrücklich: vivodepot.html ist ~2,5 MB, der Standardpuffer 1 MB.
// Ohne das wirft `git show` ENOBUFS — und ein try/catch daneben macht daraus
// ein plausibles Ergebnis statt eines Fehlers.
//
// EINSPEISBARES REPO (G1, 31.07.2026): `gitRohInRepo`/`gitInRepo` nehmen das
// Arbeitsverzeichnis als Argument — derselbe Grund wie bei `istFlacherKlon(wo)`
// weiter unten. `bereichsBefund` liest sonst NUR aus dem Git-Zustand DIESES
// Repos; eine Probe könnte ihm nie ein Beispiel unterschieben, sondern müsste
// echte Commits in diesem Arbeitsbaum anlegen. `git`/`gitRoh` bleiben dünne,
// auf REPO gebundene Hüllen — keine bestehende Aufrufstelle ändert sich.
//
// OHNE DIE GIT_*-VARIABLEN (U2-ADR-232, 03.09.2026): genau die Falle, die
// `ohneGitUmgebung()` weiter unten für `istFlacherKlon()` behebt, traf diesen
// allgemeinen Helfer nicht mit — `tools/waechter-register.js` speist über
// `bereichsBefund(von, bis, wo)` ein fabriziertes Wegwerf-Repo ein, und ohne
// Stripping liest ein `git log`/`git show` im `pre-commit`-Hook aus dem
// ECHTEN Repo (`GIT_DIR`), nicht aus `wo`. `scripts/schalen-lockstep-kern.js`,
// von dieser Datei abgeleitet, fand denselben Fehler heute schon und behob ihn
// direkt im geteilten Helfer — hier nachgezogen, aus demselben Grund.
function gitRohInRepo(wo, ...args) {
  return execFileSync('git', args, { cwd: wo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: ohneGitUmgebung() });
}
function gitInRepo(wo, ...args) { return gitRohInRepo(wo, ...args).trim(); }
function gitRoh(...args) { return gitRohInRepo(REPO, ...args); }
// git() trimmt — für Hashes und Daten richtig, für DATEIINHALTE falsch (der
// abschliessende Zeilenumbruch fiele weg und jeder Vergleich meldete eine
// Änderung, die es nicht gibt). Dateien immer über gitRoh().
function git(...args) { return gitInRepo(REPO, ...args); }

/* ── DIE EINE ZEITQUELLE ────────────────────────────────────────────────────
   BUILD_DATUM ist ein KALENDERTAG für Menschen, kein Zeitpunkt. Ein Kalendertag
   ist immer LOKAL; nur Zeitpunkt-Vergleiche gehören nach UTC.

   Warum das keine Marotte ist: Berlin liegt auf UTC+2, lokal ist also voraus.
   Zwischen 00:00 und 02:00 Ortszeit liefert `toISOString().slice(0,10)` den
   VORTAG. Wird BUILD_DATUM in diesem Fenster lokal korrekt gesetzt und dann
   gegen einen UTC-Zeitpunkt geprüft, gilt der richtige Wert als „in der
   Zukunft" und wird abgelehnt. Das ist derselbe Fehler, der in der
   Geräterunde v76 als Speicher-Blocker auffiel — nachts 0–2 Uhr galt der
   heutige Tag als Zukunft. Zweiter Zeuge, also eine Klasse.

   Konsequenz: EINE Quelle, von allen benutzt. Und Kalendertage werden als
   ZEICHENKETTE verglichen (ISO ist dafür sortierbar gebaut), nie als
   Date-Objekt gegen Date.now() — sonst kommt die Zone durch die Hintertür
   wieder herein.
   ────────────────────────────────────────────────────────────────────────── */
function heuteLokal(d = new Date()) {
  return [d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0')].join('-');
}

function ohneDatumszeile(text) { return text.replace(DATUMSZEILE, '«BUILD_DATUM-ZEILE»'); }
function leseDatum(text) { const m = text.match(/const BUILD_DATUM = '([^']*)'/); return m ? m[1] : null; }

/**
 * Änderung ausserhalb der Datumszeile, aber BUILD_DATUM nicht aktuell? → Grund oder null.
 *
 * ⚠ KORREKTUR 27.07.: Die erste Fassung verlangte, dass BUILD_DATUM sich GEÄNDERT hat
 * („dv === dj → Befund"). Das ist die falsche Bedingung — beim ZWEITEN Commit desselben
 * Tages steht BUILD_DATUM bereits auf heute, hat sich aber nicht bewegt, und der Wächter
 * hätte einen Bump in die Zukunft erzwungen. Verlangt ist nicht Bewegung, sondern
 * AKTUALITÄT: nach einer inhaltlichen Änderung muss BUILD_DATUM der heutige lokale
 * Kalendertag sein. Gefunden, weil der Wächter den zweiten Commit des Tages blockierte.
 */
function lockstepBefund(vorher, jetzt, heute) {
  if (vorher == null || jetzt == null) return null;
  if (ohneDatumszeile(vorher) === ohneDatumszeile(jetzt)) return null;
  const dj = leseDatum(jetzt);
  if (leseDatum(vorher) == null || dj == null) return null;
  const tag = heute || heuteLokal();
  return dj === tag ? null
    : `vivodepot.html wurde geändert, BUILD_DATUM steht auf '${dj}' statt auf '${tag}'`;
}

function hatVorgaenger(hash, wo = REPO) {
  try { gitInRepo(wo, 'rev-parse', '--verify', '-q', hash + '^'); return true; } catch { return false; }
}

/* ── UMGEBUNGSVORAUSSETZUNG: dieser Waechter braucht HISTORIE ──────────────
   DER BEFUND (28.07.2026). In CI klont `actions/checkout` mit Tiefe 1. Dort hat
   KEIN Commit einen Vorgaenger, also meldet `istInhaltlich` fuer jeden Commit
   „inhaltlich geaendert" — auch fuer einen, der `vivodepot.html` nicht angefasst
   hat. Der Lauf am 28.07. meldete `a1d923a` als Aenderung an der Datei; dieser
   Commit hat ausschliesslich `tools/lib/kontrast.js` beruehrt.

   Das ist VAKUUM-ROT: eine Verletzung, gemeldet aus einer Umgebung, in der die
   Frage gar nicht beantwortbar ist. Es ist dieselbe Klasse wie vakuum-gruen,
   nur teurer — ein Gate, das dauerhaft rot steht, ist ein abgeschaltetes Gate.

   Zwei Massnahmen, und beide werden gebraucht: `fetch-depth: 0` gibt DIESEM CI
   den Boden zurueck, und diese Erkennung schuetzt JEDE Umgebung, auch eine, in
   der die Tiefe spaeter wieder jemand aendert. Die Workflow-Datei ist das, was
   driftet; der Waechter ist das, was bleibt. */
function istFlacherKlon(wo = REPO) {
  try {
    return execFileSync('git', ['rev-parse', '--is-shallow-repository'],
      { cwd: wo, encoding: 'utf8', env: ohneGitUmgebung() }).trim() === 'true';
  } catch { return false; }   // git antwortet nicht — ein anderer Fall, anderswo behandelt
}

/* ── Eine Umgebung OHNE die GIT_*-Variablen ────────────────────────────────
   GEMESSEN beim Bau der Positivkontrolle (28.07.): sie lief am Terminal gruen
   und im `pre-commit`-Hook rot. Der Grund ist die Umgebung — waehrend eines
   Commits setzt git `GIT_DIR`, `GIT_INDEX_FILE` und `GIT_WORK_TREE`. Ein
   `git rev-parse` in einem ANDEREN Verzeichnis antwortet dann fuer das Repo aus
   der Variablen, nicht fuer das Verzeichnis: `cwd` verliert gegen `GIT_DIR`.

   Das ist derselbe Fehler wie die Wächter, die wir heute repariert haben, nur
   eine Etage tiefer — eine Messung, die etwas anderes misst, als sie zu messen
   vorgibt, und die deshalb genau dort falsch liegt, wo sie gebraucht wird. */
function ohneGitUmgebung() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
  return e;
}

/** Ändert dieser Commit vivodepot.html ausserhalb der Datumszeile? */
function istInhaltlich(hash, wo = REPO) {
  if (!hatVorgaenger(hash, wo)) return true;
  // Der Vorgänger kann die Datei GAR NICHT tragen — bei ihrer Anlage und bei der
  // Umbenennung (49441fc: vivodepot-clean-slate-kern.html -> vivodepot.html).
  // `git show <hash>^:DATEI` wirft dort. Ein solcher Commit hat die Datei
  // eingeführt, ist also inhaltlich; ihn zum Messfehlschlag zu machen, hiesse das
  // Gate an einer Stelle rot zu färben, an der nichts fehlt.
  let vorher;
  try { vorher = gitRohInRepo(wo, 'show', `${hash}^:${DATEI}`); }
  catch (_) { return true; }
  return ohneDatumszeile(vorher) !== ohneDatumszeile(gitRohInRepo(wo, 'show', `${hash}:${DATEI}`));
}

/** Jüngster Commit bis `bis`, der vivodepot.html inhaltlich geändert hat. */
function juengsteInhaltlicheAenderung(bis = 'HEAD', grenze = 60, wo = REPO) {
  for (const z of gitInRepo(wo, 'log', `-${grenze}`, '--format=%H %ad', '--date=short', bis, '--', DATEI).split('\n').filter(Boolean)) {
    const [hash, datum] = z.split(' ');
    if (istInhaltlich(hash, wo)) return { hash, datum };
  }
  return null;
}

/**
 * Zug 3 — der GANZE Bereich, nicht nur der nächste Commit.
 * Ein Bereich kann elf Commits tragen, von denen sieben die Datei ändern, und
 * trotzdem an keiner einzelnen Commit-Grenze auffallen: jeder Commit für sich
 * hat BUILD_DATUM „nicht geändert, aber es war ja schon vorher so".
 * Geprüft wird darum die Spitze gegen die JÜNGSTE inhaltliche Änderung im Bereich.
 */
function bereichsBefund(vonSha, bisSha, wo = REPO) {
  // NEUER BRANCH (remote-sha aus Nullen): nicht „die ganze erreichbare Historie".
  // Das war die Absicht, aber sie ist in einem gewachsenen Repo unerfüllbar — der
  // Lauf greift zwangsläufig über die Anlage/Umbenennung der Datei hinaus und
  // misst Commits, die niemand pusht. Der zu pushende Bereich ist, was NOCH AUF
  // KEINEM Remote liegt; genau das sagt `--not --remotes`. Für einen Zweig, der
  // von einem gepushten Commit abzweigt, ist das exakt der eigene Aufsatz.
  const neuerBranch = !vonSha || /^0+$/.test(vonSha);
  const spanne = neuerBranch ? [bisSha, '--not', '--remotes'] : [`${vonSha}..${bisSha}`];
  const commits = gitInRepo(wo, 'log', '--format=%H %ad', '--date=short', ...spanne, '--', DATEI).split('\n').filter(Boolean);
  const inhaltliche = commits.map(z => { const [hash, datum] = z.split(' '); return { hash, datum }; })
                             .filter(c => istInhaltlich(c.hash, wo));
  if (!inhaltliche.length) return null;
  const juengste = inhaltliche[0];                       // git log ist neueste-zuerst
  const datum = leseDatum(gitRohInRepo(wo, 'show', `${bisSha}:${DATEI}`));
  if (datum >= juengste.datum) return null;
  return {
    grund: `BUILD_DATUM steht auf '${datum}', aber ${inhaltliche.length} Commit(s) im zu pushenden ` +
           `Bereich ändern vivodepot.html — zuletzt am ${juengste.datum} (${juengste.hash.slice(0, 7)}).`,
    soll: juengste.datum, ist: datum, betroffen: inhaltliche.length, gesamt: commits.length,
  };
}

module.exports = {
  REPO, DATEI, heuteLokal, ohneDatumszeile, leseDatum, lockstepBefund, istFlacherKlon,
  istInhaltlich, juengsteInhaltlicheAenderung, bereichsBefund, git, gitRoh,
};
