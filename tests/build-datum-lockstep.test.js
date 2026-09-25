'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — BUILD_DATUM-Lockstep an der RICHTIGEN Grenze
   ────────────────────────────────────────────────────────────────────────
   VORGESCHICHTE. Die erste Fassung (16.07.) band BUILD_DATUM an
   SCHALEN_STAND: „hat sich SCHALEN_STAND geändert, muss sich BUILD_DATUM
   geändert haben." Am 26.07. lag der Fehler vor — BUILD_DATUM stand auf
   '2026-07-22', während sieben ungepushte Commits vom 26.07. die Datei
   änderten (darunter Schema 41 und 42) — und der Test war GRÜN, weil
   SCHALEN_STAND sich nicht bewegt hatte. Die Bedingung griff nie.

   Das ist §3.5b in Reinform: die Kontrolle saß an der falschen Grenze.
   Nicht „SCHALEN_STAND hat sich geändert" ist der Auslöser, sondern
   „vivodepot.html hat sich geändert" — denn genau das macht die Angabe
   in der Fußzeile falsch.

   WAS DIE BÜRGERIN SIEHT. BUILD_DATUM wird an drei Stellen gerendert
   (Fußzeile, Einstellungen, Stand-Satz) und ist die Rechengrundlage des
   Alt-Hinweises (VERSION_HINWEIS_SCHWELLE_TAGE). Ein veraltetes
   BUILD_DATUM ist darum keine Lesbarkeitsschuld, sondern eine Zusage an
   die Nutzerin, die die App nicht einlöst.

   DIE AUSNAHME, die den Zirkel verhindert: die BUILD_DATUM-Zeile SELBST
   zählt nicht als Änderung. Sonst verlangte jeder Bump seinen eigenen
   nächsten Bump.

   KEIN STILLES ÜBERSPRINGEN (U2-ADR-106). Fehlt git, wird der Befund als
   UNGEMESSEN ausgewiesen und zählt NICHT als bestanden; unter CI=1 ist er
   rot. Die frühere Fassung machte an derselben Stelle ein stummes
   `return`.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { istEigenesRepo } = require('./ist-eigenes-repo.js');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');
const IN_CI = process.env.CI === '1' || process.env.CI === 'true';

/* Dieser Waechter braucht HISTORIE. Im flachen Klon kann er die Frage nicht
   beantworten — dann meldet er UNGEMESSEN und nicht etwa einen Fund. Ein
   benannter Uebersprung, kein Schweigen: die Zeile steht in der Ausgabe. */
function ohneHistorieUngemessen(was) {
  if (!K.istFlacherKlon()) return false;
  console.log(`﹣ UNGEMESSEN — ${was}: flacher Klon (Tiefe 1), keine Historie. ` +
    'Der Waechter kann hier nichts feststellen; `fetch-depth: 0` gibt ihm den Boden zurueck.');
  return true;
}

/* Der entscheidbare Kern liegt in scripts/build-datum-kern.js — EINE Quelle, zwei
   Zugaenge (dieser Test und hooks/pre-push). Eine wiederholte Regex waere eine Kopie
   und schlechter als keine Pruefung, weil sie wie Deckung aussieht (§7.5). */
const K = require('../scripts/build-datum-kern.js');
const { ohneDatumszeile, leseDatum, lockstepBefund, juengsteInhaltlicheAenderung, heuteLokal, git, gitRoh } = K;

/* ── Fixtures: klein, aber echt in der Form ───────────────────────────── */
const F = (datum, rest) =>
  `const SCHALEN_STAND = 'v74';\nconst BUILD_DATUM = '${datum}';\n${rest}\n`;

/* ── 1 · POSITIVKONTROLLE — der Fehler MUSS gemeldet werden ───────────── */
test('[Lockstep·Positivkontrolle] Änderung an vivodepot.html ohne BUILD_DATUM-Bump wird gemeldet', () => {
  // Der Bezugstag wird MITGEGEBEN, damit das Fixture nicht am Kalender veraltet.
  const befund = lockstepBefund(
    F('2026-07-22', 'const SCHEMA_VERSION_AKTUELL = 41;'),
    F('2026-07-22', 'const SCHEMA_VERSION_AKTUELL = 42;'),
    '2026-07-26',
  );
  assert.ok(befund, 'Der genau vorliegende Fehlerfall muss anschlagen — sonst prüft der Test nichts');
  assert.match(befund, /steht auf '2026-07-22' statt auf '2026-07-26'/);
});

/* ── 2 · NEGATIVKONTROLLEN — was NICHT anschlagen darf ────────────────── */
test('[Lockstep·Negativkontrolle] Änderung MIT Bump ist in Ordnung', () => {
  assert.equal(lockstepBefund(
    F('2026-07-22', 'const SCHEMA_VERSION_AKTUELL = 41;'),
    F('2026-07-26', 'const SCHEMA_VERSION_AKTUELL = 42;'),
    '2026-07-26'), null);
});

test('[Lockstep·Negativkontrolle] keine Änderung, kein Bump nötig', () => {
  assert.equal(lockstepBefund(
    F('2026-07-22', 'const SCHEMA_VERSION_AKTUELL = 42;'),
    F('2026-07-22', 'const SCHEMA_VERSION_AKTUELL = 42;'),
    '2026-07-26'), null);
});

test('[Lockstep·Negativkontrolle] NUR die BUILD_DATUM-Zeile geändert — kein Zirkel', () => {
  // Ohne diese Ausnahme verlangte jeder Bump seinen eigenen nächsten Bump.
  assert.equal(lockstepBefund(
    F('2026-07-22', 'const SCHEMA_VERSION_AKTUELL = 42;'),
    F('2026-07-26', 'const SCHEMA_VERSION_AKTUELL = 42;'),
    '2026-07-26'), null);
});

/* ── 3 · DER IST-ZUSTAND: BUILD_DATUM gegen die juengste echte Aenderung ── */

test('[Lockstep·Ist] BUILD_DATUM ist nicht älter als die jüngste inhaltliche Änderung an vivodepot.html', () => {
  if (ohneHistorieUngemessen('BUILD_DATUM gegen die juengste inhaltliche Aenderung')) return;
  let juengste;
  try {
    juengste = juengsteInhaltlicheAenderung();
  } catch (e) {
    const hinweis = `UNGEMESSEN — git nicht verfügbar (${e.code || e.message}); zählt NICHT als bestanden`;
    assert.ok(!IN_CI, hinweis);
    console.log(`﹣ ${hinweis}`);
    return;
  }
  if (!juengste) { assert.ok(!IN_CI, 'UNGEMESSEN — keine Historie für vivodepot.html'); return; }

  const datum = leseDatum(fs.readFileSync(HTML_PFAD, 'utf8'));
  assert.ok(
    datum >= juengste.datum,
    `BUILD_DATUM steht auf '${datum}', aber vivodepot.html wurde zuletzt am ${juengste.datum} ` +
    `inhaltlich geändert (${juengste.hash.slice(0, 7)}). Die App zeigt der Bürgerin in Fußzeile, ` +
    `Einstellungen und Stand-Satz ein Datum, das sie nicht hat — und der Alt-Hinweis rechnet vom ` +
    `falschen Tag. BUILD_DATUM auf '${juengste.datum}' oder neuer setzen.`
  );
});

test('[Lockstep·Ist] Arbeitsstand gegen HEAD — der nächste Commit trägt seinen Bump', () => {
  let vorher;
  try { vorher = gitRoh('show', 'HEAD:vivodepot.html'); }
  catch (e) {
    const hinweis = `UNGEMESSEN — kein HEAD/git (${e.code || e.message}); zählt NICHT als bestanden`;
    assert.ok(!IN_CI, hinweis);
    console.log(`﹣ ${hinweis}`);
    return;
  }
  const befund = lockstepBefund(vorher, fs.readFileSync(HTML_PFAD, 'utf8'));
  assert.equal(befund, null,
    befund + ' — vor dem Commit BUILD_DATUM auf den heutigen Tag setzen.');
});

/* ── 4 · FORM: die alte Fassung liess '2020-01-01' durchgehen ─────────── */
test('[Lockstep·Form] BUILD_DATUM ist ISO, nicht in der Zukunft und nicht absurd alt', () => {
  const datum = leseDatum(fs.readFileSync(HTML_PFAD, 'utf8'));
  assert.match(datum, /^\d{4}-\d{2}-\d{2}$/, 'Format JJJJ-MM-TT');
  assert.ok(!Number.isNaN(new Date(datum + 'T00:00:00Z').getTime()), 'ist ein echtes Datum');
  // Kalendertag gegen Kalendertag, als Zeichenkette. Die frühere Fassung verglich
  // ein lokales Datum gegen einen UTC-Zeitpunkt und hätte zwischen 00:00 und 02:00
  // Ortszeit den KORREKTEN heutigen Wert als „Zukunft" abgelehnt — derselbe Fehler,
  // den die Geräterunde v76 als Speicher-Blocker fand.
  assert.ok(datum <= heuteLokal(), `BUILD_DATUM '${datum}' liegt nach dem heutigen Tag (${heuteLokal()})`);
  // Untergrenze: der erste Commit des Repos. Die alte Fassung prüfte nur nach oben,
  // '2020-01-01' wäre grün gewesen.
  /* Die Untergrenze braucht denselben Boden wie der Ist-Test: im flachen Klon
     ist der „erste Commit des Repos" der HEAD von heute, und jedes BUILD_DATUM
     von gestern faellt durch. Genau so ist der Lauf am 28.07. rot geworden. */
  let erster = null;
  if (!K.istFlacherKlon()) {
    try { erster = git('log', '--reverse', '--format=%ad', '--date=short').split('\n')[0]; } catch { /* ungemessen */ }
  } else {
    console.log('﹣ UNGEMESSEN — Untergrenze gegen den ersten Commit: flacher Klon, keine Historie.');
  }
  if (erster) {
    assert.ok(datum >= erster,
      `BUILD_DATUM '${datum}' liegt vor dem ersten Commit des Repos (${erster}) — das ist kein Stand, das ist ein Tippfehler.`);
  }
});

/* ── 5 · DIE ZEITQUELLE: die Falle, die heute zum zweiten Mal auftrat ──── */
test('[Lockstep·Zeit] der heutige Tag ist LOKAL, nicht UTC — das 00:00–02:00-Fenster', () => {
  // Positivkontrolle: 00:30 Ortszeit Berlin ist 22:30Z des Vortags. Ein Helfer,
  // der UTC nimmt, liefert hier den falschen Tag.
  const nachts = new Date('2026-07-27T22:30:00Z');
  assert.equal(nachts.toISOString().slice(0, 10), '2026-07-27', 'UTC sagt: der 27.');
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Berlin') {
    assert.equal(heuteLokal(nachts), '2026-07-28', 'lokal ist es bereits der 28. — genau die Divergenz');
  }
  // Negativkontrolle: mittags stimmen beide überein, der Helfer erfindet nichts.
  const mittags = new Date('2026-07-27T12:00:00Z');
  assert.equal(heuteLokal(mittags), mittags.toISOString().slice(0, 10));
});

/* ── 5 · DIE UMGEBUNGSVORAUSSETZUNG, an einem echten flachen Klon ─────────
   Ohne diese zwei Proben waere `istFlacherKlon` eine Zusage: der Pfad, den sie
   oeffnet, ist am Arbeitsplatz nie gelaufen — hier ist der Klon vollstaendig.
   Genau so entsteht ein Waechter, dessen neues Verhalten niemand gesehen hat.

   Gemessen wird an einem WIRKLICH flachen Klon dieses Repos, in einem
   temporaeren Verzeichnis, danach entfernt. Kein Netz: `file://` auf uns selbst. */
const os = require('node:os');

test('[Lockstep·Positivkontrolle] ein flacher Klon wird als solcher erkannt', () => {
  /* UMGEBUNGSVORAUSSETZUNG: geklont wird DIESES Repo. Läuft die Suite auf einem
     über `git archive` ausgepackten Stand, gibt es hier keins — und der Klon
     scheiterte an der Abwesenheit der Historie, nicht am Erkenner. Benannter
     Übersprung statt Schweigen; die Negativkontrolle unten legt ihr Repo selbst
     an und läuft überall weiter. */
  if (!istEigenesRepo(K.REPO)) {
    console.log('﹣ UNGEMESSEN — hier liegt kein Git-Arbeitsbaum (ausgepackter Stand?); ' +
      'ohne Historie ist kein flacher Klon herstellbar. Am Arbeitsplatz und in CI läuft sie.');
    return;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-flach-'));
  const ziel = path.join(tmp, 'flach');
  try {
    /* Auch der Klon braucht die saubere Umgebung: im Hook wuerde er sonst in
       das Repo aus GIT_DIR schreiben statt in das temporaere Verzeichnis. */
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
    execFileSync('git', ['clone', '--depth', '1', '--no-local', '--quiet',
      'file://' + K.REPO, ziel], { stdio: 'pipe', env });
    assert.equal(K.istFlacherKlon(ziel), true,
      'Ohne diese Erkennung meldet der Waechter im flachen Klon eine Verletzung, ' +
      'die es nicht gibt — vakuum-rot, und ein dauerhaft rotes Gate ist ein abgeschaltetes.');
  } catch (e) {
    if (/clone|not a git|Permission/i.test(String(e.message))) {
      assert.fail('UNGEMESSEN — flacher Probe-Klon nicht herstellbar: ' + String(e.message).slice(0, 90));
    }
    throw e;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Lockstep·Negativkontrolle] ein vollstaendiges Repo gilt NICHT als flach', () => {
  /* KORREKTUR (28.07., aus dem CI-Lauf zu `4da04cc`). Die erste Fassung prueste
     `istFlacherKlon()` ohne Argument — also das eigene Arbeitsverzeichnis — und
     erwartete `false`. Am Arbeitsplatz stimmt das; in CI ist der Checkout selbst
     flach, und die Kontrolle wurde rot.

     Das war eine Behauptung ueber die UMGEBUNG im Gewand einer Behauptung ueber
     den ERKENNER — dieselbe Klasse, die dieser Commit bei zwei Waechtern
     repariert, noch einmal in meiner eigenen Probe. Eine Kontrolle, die nur an
     einem Ort gilt, misst den Ort, nicht die Sache.

     Gemessen wird jetzt an einem eigens angelegten, VOLLSTAENDIGEN Repo: ein
     frisches `git init` ist nie flach, gleich wo der Lauf stattfindet. */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-voll-'));
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  try {
    const g = (...a) => execFileSync('git', a, { cwd: tmp, stdio: 'pipe', env });
    g('init', '--quiet');
    g('config', 'user.email', 'probe@example.invalid');
    g('config', 'user.name', 'Probe');
    fs.writeFileSync(path.join(tmp, 'a.txt'), 'x');
    g('add', 'a.txt');
    g('commit', '--quiet', '-m', 'Probe');
    assert.equal(K.istFlacherKlon(tmp), false,
      'sonst waere die Erkennung von einer, die immer „flach" sagt, nicht zu unterscheiden — ' +
      'und der Waechter schwiege ueberall, statt nur dort, wo er nichts sehen kann.');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Lockstep·U2-ADR-232] bereichsBefund(wo) bleibt unter simuliertem GIT_DIR bei der Fixture, nicht beim echten Repo', () => {
  /* U2-ADR-232 (03.09.2026). `gitRohInRepo(wo, …)`/`gitInRepo(wo, …)` nehmen
     das Arbeitsverzeichnis als Argument, GENAU damit `bereichsBefund`/
     `istInhaltlich` gegen ein fabriziertes Wegwerf-Repo fahren koennen (G1,
     31.07.2026) — `tools/waechter-register.js` tut das bei jedem
     `npm test`/`pre-commit` fuer den Selbsttest dieses Waechters. Bis zur
     Reparatur fehlte ihnen die `GIT_*`-Bereinigung, die `istFlacherKlon()`
     in derselben Datei schon trug: unter einem `GIT_DIR`, das (wie im
     `pre-commit`-Hook) auf DIESES Repo zeigt, verliert `cwd` gegen `GIT_DIR`,
     und `git log <fixture-hash>..<fixture-hash>` sucht die Fixture-Hashes im
     echten Repo, wo es sie nicht gibt — `fatal: Invalid revision range`,
     nachgestellt und protokolliert im Auftrag vom selben Tag. */
  const os = require('node:os');
  const UMGEBUNG = (() => {
    const e = { ...process.env };
    for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
    e.GIT_AUTHOR_NAME = e.GIT_COMMITTER_NAME = 'Waechterprobe';
    e.GIT_AUTHOR_EMAIL = e.GIT_COMMITTER_EMAIL = 'probe@localhost';
    return e;
  })();
  const wo = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-build-datum-hook-probe-'));
  const g = (...args) => execFileSync('git', args, { cwd: wo, encoding: 'utf8', stdio: 'pipe', env: UMGEBUNG });
  const GIT_UMGEBUNG_SCHLUESSEL = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE'];
  const vorher = Object.fromEntries(GIT_UMGEBUNG_SCHLUESSEL.map((k) => [k, process.env[k]]));
  try {
    g('init', '-q');
    g('config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(wo, 'vivodepot.html'), "const BUILD_DATUM = '2025-01-01';\nconst SCHEMA_VERSION_AKTUELL = 1;\n");
    g('add', 'vivodepot.html');
    g('commit', '-q', '-m', 'basis', '--date', '2025-01-01T12:00:00');
    const von = g('rev-parse', 'HEAD').trim();
    fs.writeFileSync(path.join(wo, 'vivodepot.html'), "const BUILD_DATUM = '2025-01-01';\nconst SCHEMA_VERSION_AKTUELL = 2;\n");
    g('add', 'vivodepot.html');
    g('commit', '-q', '-m', 'inhaltlich', '--date', '2025-06-01T12:00:00');
    const bis = g('rev-parse', 'HEAD').trim();

    /* DER HOOK-ZUSTAND SELBST, nicht bloss simuliert an einer Kopie: exakt die
       drei Variablen, die git seinen Hooks setzt, zeigen jetzt auf DIESES
       Repo — waehrend `bereichsBefund` gegen die FIXTURE `wo` gerufen wird. */
    process.env.GIT_DIR = path.join(REPO, '.git');
    process.env.GIT_WORK_TREE = REPO;
    process.env.GIT_INDEX_FILE = path.join(REPO, '.git', 'index');

    const befund = K.bereichsBefund(von, bis, wo);
    assert.ok(befund, 'BUILD_DATUM blieb auf 2025-01-01 stehen, waehrend der Inhalt sich aenderte — das muss ' +
      'auch unter geleaktem GIT_DIR ein Fund sein, nicht ein Wurf und nicht ein stilles null.');
    assert.equal(befund.soll, '2025-06-01',
      'ein Befund, der aus dem ECHTEN Repo gelesen haette, traefe hier gar keine Commits (fremde Hashes) ' +
      'und wuerfe — dieselbe Fehlerklasse wie vor der Reparatur.');
  } finally {
    for (const k of GIT_UMGEBUNG_SCHLUESSEL) {
      if (vorher[k] === undefined) delete process.env[k]; else process.env[k] = vorher[k];
    }
    fs.rmSync(wo, { recursive: true, force: true });
  }
});
