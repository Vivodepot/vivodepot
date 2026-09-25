'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schalen-Lockstep — der gemeinsame Kern
   ────────────────────────────────────────────────────────────────────────
   EIN Mechanismus, ZWEI Zugänge (dieselbe Form wie BUILD_DATUM, 26.07.):
     · tests/schalen-lockstep-anlass.test.js  — der nächste Commit
     · hooks/pre-push                          — der GANZE ungepushte Bereich
   Beide rufen dieselben Funktionen. Eine wiederholte Regex wäre eine Kopie
   und schlechter als keine Prüfung, weil sie wie Deckung aussieht (§7.5).

   `REPO` und `istFlacherKlon` werden aus scripts/build-datum-kern.js
   WIEDERVERWENDET — der Auftrag liest jenen Kern als Muster, nicht zum
   Anfassen (Nicht-Teil-Klausel), aber diese beiden sind kein BUILD_DATUM-
   Spezifikum. Die restlichen Git-Zugriffe hier sind `wo`-parametriert (jeder
   Aufruf nimmt das Arbeitsverzeichnis als Argument, Default `REPO`) — nur so
   lässt sich derselbe Mechanismus gegen ein eigens angelegtes Test-Repo
   fahren, ohne eine Probe im echten Repository Commits anlegen zu lassen
   (dieselbe Begründung wie `gitRohInRepo`/`gitInRepo` im BUILD_DATUM-Kern).

   DIE GRENZE (Zug 0, intern freigegeben 04.08.2026; erweitert U2-ADR-215, 03.09.2026). Auslöser ist
   „eine Datei des ausgelieferten Dateisatzes hat sich geändert" — nicht
   „SCHALEN_STAND hat sich geändert". Genau das war der Fehler in `4aa0a43`:
   `tests/schalen-stand-sw-lockstep.test.js` prüft nur Gleichstand zwischen
   `vivodepot.html` und `sw.js`, nie den Anlass.

   VIER DATEIEN TRAGEN DIE PFLICHT — abgeleitet aus `DATEISATZ`
   (`scripts/ausgeliefertes-dateiset.js`, U2-ADR-215), nicht mehr zweitgeführt:
   `vivodepot.html` (der ursprüngliche Anlass), `vivodepot-lesen.html` (die
   Lese-App — U2-ADR-217 durchlief genau diesen blinden Fleck), `sw.js` (der
   Service Worker selbst, außerhalb seiner eigenen `CACHE`-Zeile — eigener
   Fund über U2-ADR-217 hinaus) und `manifest.webmanifest` (derzeit inert,
   aber Teil des `SCHALE`-Arrays in `sw.js` und damit tatsächlich
   ausgeliefert). `./` ist kein fünfter Träger — dieselben Bytes wie
   `vivodepot.html` (U2-ADR-020 Weg 1, keine `index.html`); `index.html`
   selbst ist zur Auslieferungszeit generiert, nicht versioniert verglichen.

   DIE AUSNAHME, GESPIEGELT. Die `SCHALEN_STAND`-Zeile in `vivodepot.html`
   UND die `CACHE`-Zeile in `sw.js` zählen je für ihre eigene Datei nicht als
   inhaltliche Änderung — sonst verlangte jeder Bump seinen eigenen nächsten
   (Zirkelschluss). `vivodepot-lesen.html` und `manifest.webmanifest` tragen
   keine eigene Versionszeile; ihr gesamter Inhalt zählt.

   KEIN STILLES ÜBERSPRINGEN (U2-ADR-106). Fehlt git oder liegt ein flacher
   Klon vor, ist der Befund ungemessen und zählt nicht als bestanden; unter
   `CI=1` ist er rot — geprüft in den Zugängen, nicht in diesem Kern.
   ════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('node:child_process');
const { REPO, istFlacherKlon } = require('./build-datum-kern.js');
const { DATEISATZ } = require('./ausgeliefertes-dateiset.js');

const DATEIEN = DATEISATZ;
// Je Datei ihre eigene Versions-Stempelzeile, falls sie eine trägt — nur diese beiden tun es.
// vivodepot-lesen.html und manifest.webmanifest bleiben ohne Eintrag: ihr voller Inhalt zählt.
const STEMPEL_ZEILEN = {
  'vivodepot.html': /^.*const SCHALEN_STAND = '[^']*'.*$/m,
  'sw.js': /^.*const CACHE = '[^']*'.*$/m,
};

// maxBuffer ausdrücklich: vivodepot.html ist mehrere MB, der Standardpuffer 1 MB
// (dieselbe Begründung wie im BUILD_DATUM-Kern).
//
// OHNE DIE GIT_*-VARIABLEN — Fund beim Bau der U2-ADR-215-Reichweiten-Probe (03.09.2026,
// Durchsicht): dieselbe Falle wie im BUILD_DATUM-Kern (dort `ohneGitUmgebung()`,
// Kommentar dort ausführlich), hier aber DIREKT in die geteilte Funktion gebaut statt an jeden
// Aufrufer delegiert — jeder Aufruf gegen ein fabriziertes Wegwerf-Repo (`wo` ≠ REPO) ist
// betroffen, nicht nur ein einzelner. Während eines Commits setzt git `GIT_DIR`/`GIT_INDEX_FILE`/
// `GIT_WORK_TREE`; ein `git log`/`git show` in einem ANDEREN Verzeichnis antwortet dann für das
// Repo aus der Variable, nicht für `cwd` — `cwd` verliert gegen `GIT_DIR`. Lief am Terminal grün,
// im `pre-commit`-Hook rot: „fatal: Invalid revision range" gegen zwei Hashes aus dem
// Wegwerf-Repo, weil `git log` sie im ECHTEN Repo suchte.
function gitRohInRepo(wo, ...args) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  return execFileSync('git', args, { cwd: wo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env });
}
function gitInRepo(wo, ...args) { return gitRohInRepo(wo, ...args).trim(); }

function ohneStempelzeile(datei, text) {
  const re = STEMPEL_ZEILEN[datei];
  return re ? text.replace(re, '«STEMPEL-ZEILE»') : text;
}

function leseStand(text) {
  const m = text.match(/const SCHALEN_STAND = 'v(\d+)'/);
  return m ? Number(m[1]) : null;
}

/** Inhaltlicher Vergleich EINER Schalen-Datei — die Stempelzeile zählt nur bei Dateien, die eine tragen. */
function inhaltlichGeaendert(datei, vorher, jetzt) {
  if (vorher == null && jetzt == null) return false;
  if (vorher == null || jetzt == null) return true;   // Anlage/Löschung ist inhaltlich
  const norm = (t) => ohneStempelzeile(datei, t);
  return norm(vorher) !== norm(jetzt);
}

/**
 * Der Kern-Vergleich, testbar an rohem Text (Fixtures) — analog `lockstepBefund`
 * im BUILD_DATUM-Kern, nur über mehrere Dateien statt einer.
 * `vorherDateien`/`jetztDateien`: { <Datei aus DATEIEN>: text|null, … } — muss nicht alle tragen,
 * fehlende Schlüssel gelten als nicht vorhanden (== null).
 * Rückgabe: Grund-String oder null.
 */
function schalenBefund(vorherDateien, jetztDateien) {
  const geaendert = DATEIEN.filter((d) => inhaltlichGeaendert(d, vorherDateien[d], jetztDateien[d]));
  if (!geaendert.length) return null;

  const htmlVorher = vorherDateien['vivodepot.html'];
  const htmlJetzt = jetztDateien['vivodepot.html'];
  if (htmlJetzt == null) return null;   // vivodepot.html selbst weg — anderer Fall, nicht dieser Wächter
  const standVorher = htmlVorher == null ? null : leseStand(htmlVorher);
  const standJetzt = leseStand(htmlJetzt);
  if (standJetzt == null) return null;   // kein lesbarer Stempel — Form-Frage, nicht Lockstep-Frage
  if (standVorher == null) return null;  // kein Vorgänger-Stempel (Anlage) — nichts, wogegen zu steigen wäre

  if (standJetzt > standVorher) return null;
  return `Schale geändert (${geaendert.join(', ')}), aber SCHALEN_STAND steht auf 'v${standJetzt}' `
    + `statt höher als 'v${standVorher}'`;
}

function hatVorgaenger(hash, wo = REPO) {
  try { gitInRepo(wo, 'rev-parse', '--verify', '-q', hash + '^'); return true; } catch { return false; }
}

/* GEMESSEN 06.09.2026 (interne Erhebung, Fund 2): `vonSha..bisSha` nimmt den REMOTE-SHA aus
   der stdin-Ref-Zeile wörtlich. Nach einem
   Force-Push-Rebase ist das der Stand VOR dem Rebase — kein Vorfahr des neuen HEAD mehr — und die
   Spanne zählt dann die vom Rebase mitgezogenen Kanon-Commits als „eigene" mit (gemessener Fall:
   zwei fremde Commits, „3 von 3" statt „1 von 1", die geforderte Standzahl um zwei zu hoch).
   `istVorfahr` prüft genau das VOR jeder Verwendung von `vonSha` als Spannen-Grenze. */
function istVorfahr(alt, neu, wo = REPO) {
  try { gitInRepo(wo, 'merge-base', '--is-ancestor', alt, neu); return true; } catch { return false; }
}

/** Inhalt EINER Datei bei einem Commit, oder null falls dort nicht vorhanden. */
function dateiBeiCommit(hash, datei, wo = REPO) {
  try { return gitRohInRepo(wo, 'show', `${hash}:${datei}`); } catch { return null; }
}

/** Ändert dieser Commit die Schale (mind. eine der DATEIEN, ausserhalb der Stempelzeile)? */
function istSchaleInhaltlich(hash, wo = REPO) {
  const hatVor = hatVorgaenger(hash, wo);
  const jetzt = {}; const vorher = {};
  for (const d of DATEIEN) {
    jetzt[d] = dateiBeiCommit(hash, d, wo);
    vorher[d] = hatVor ? dateiBeiCommit(`${hash}^`, d, wo) : null;
  }
  // Ohne Vorgänger (Erstanlage des Repos/der Datei) ist jede vorhandene Datei „neu" = inhaltlich —
  // analog build-datum-kern.js: ein Commit, der eine Schalen-Datei einführt, ist inhaltlich.
  if (!hatVor) return DATEIEN.some((d) => jetzt[d] != null);
  return DATEIEN.some((d) => inhaltlichGeaendert(d, vorher[d], jetzt[d]));
}

/** Jüngster Commit bis `bis`, der die Schale inhaltlich geändert hat. */
function juengsteSchalenAenderung(bis = 'HEAD', grenze = 60, wo = REPO) {
  const zeilen = gitInRepo(wo, 'log', `-${grenze}`, '--format=%H %ad', '--date=short', bis, '--', ...DATEIEN)
    .split('\n').filter(Boolean);
  for (const z of zeilen) {
    const [hash, datum] = z.split(' ');
    if (istSchaleInhaltlich(hash, wo)) return { hash, datum };
  }
  return null;
}

/**
 * Der GANZE zu pushende Bereich — analog `bereichsBefund` aus build-datum-kern.js,
 * nur über DATEIEN statt einer einzigen Datei. Ein Bereich mit mehreren Schalen-Commits kann
 * an keiner einzelnen Grenze auffallen, wenn SCHALEN_STAND durchgehend unbewegt blieb.
 */
function schalenBereichsBefund(vonSha, bisSha, wo = REPO) {
  const neuerBranch = !vonSha || /^0+$/.test(vonSha);
  // NACH EINEM FORCE-PUSH-REBASE ist `vonSha` kein Vorfahr von `bisSha` mehr — dieselbe Lage wie
  // ein neuer Branch (kein brauchbarer Zwei-Punkt-Bereich), nur ohne die Null-SHA, die sie sonst
  // anzeigt. `istVorfahr` unterscheidet die zwei Fälle, in denen `vonSha..bisSha` NICHT die
  // richtige Menge ist, von dem einen Fall, in dem es sie ist.
  const vonIstStale = !neuerBranch && !istVorfahr(vonSha, bisSha, wo);
  const spanne = (neuerBranch || vonIstStale) ? [bisSha, '--not', '--remotes'] : [`${vonSha}..${bisSha}`];
  const commits = gitInRepo(wo, 'log', '--format=%H %ad', '--date=short', ...spanne, '--', ...DATEIEN)
    .split('\n').filter(Boolean);
  const inhaltliche = commits.map((z) => { const [hash, datum] = z.split(' '); return { hash, datum }; })
    .filter((c) => istSchaleInhaltlich(c.hash, wo));
  if (!inhaltliche.length) return null;

  const juengste = inhaltliche[0];   // git log ist neueste-zuerst
  const htmlBisSha = dateiBeiCommit(bisSha, 'vivodepot.html', wo);
  const standBisSha = htmlBisSha == null ? null : leseStand(htmlBisSha);

  // Stand VOR dem Bereich, zum Vergleich „gestiegen gegenüber dem Vorgängerstand". Bei einem
  // staleren `vonSha` trägt es selbst keine brauchbare Auskunft mehr (derselbe Grund wie oben) —
  // die Basis ist dann der Elternteil des ÄLTESTEN Commits, den `--not --remotes` als „neu"
  // ausweist. `commits` ist absteigend sortiert (git log), der letzte Eintrag ist der älteste.
  let vonBasis;
  if (neuerBranch) {
    vonBasis = null;
  } else if (vonIstStale) {
    const aeltesterHash = commits[commits.length - 1].split(' ')[0];
    vonBasis = hatVorgaenger(aeltesterHash, wo) ? `${aeltesterHash}^` : null;
  } else {
    vonBasis = vonSha;
  }
  const htmlVonSha = vonBasis ? dateiBeiCommit(vonBasis, 'vivodepot.html', wo) : null;
  const standVonSha = htmlVonSha == null ? null : leseStand(htmlVonSha);

  if (standBisSha == null) return null;   // Form-Frage, nicht dieser Wächter
  if (standVonSha == null) return null;   // kein Vergleichsstempel vor dem Bereich — nichts, wogegen zu steigen wäre
  if (standBisSha > standVonSha) return null;

  return {
    grund: `SCHALEN_STAND steht auf 'v${standBisSha}', aber ${inhaltliche.length} Commit(s) im zu ` +
           `pushenden Bereich ändern die Schale — zuletzt am ${juengste.datum} (${juengste.hash.slice(0, 7)}).`,
    soll: standVonSha + 1, ist: standBisSha, betroffen: inhaltliche.length, gesamt: commits.length,
  };
}

module.exports = {
  REPO, DATEIEN, ohneStempelzeile, leseStand, inhaltlichGeaendert, schalenBefund,
  istSchaleInhaltlich, juengsteSchalenAenderung, schalenBereichsBefund, istFlacherKlon,
  istVorfahr, hatVorgaenger, gitInRepo, gitRohInRepo,
};
