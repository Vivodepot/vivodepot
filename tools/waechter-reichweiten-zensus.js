#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   waechter-reichweiten-zensus.js — über welche Menge läuft jeder Wächter?
   („Reichweiten-Zensus", 10.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS: in EINER Nacht standen fünf Prüfer grün, ohne etwas zu bewachen
   — nicht weil sie falsch maßen, sondern weil ihre MENGE zu eng war
   (`deutsch-leck-pruefen.js`: 0 von 3512 Kennungen mit `pro-`-Präfix, die
   ganze Pro-Achse blind) oder weil ein Zähler „0 Abweichungen" nicht von
   „nie geprüft" unterscheiden konnte. Diese Frage — Menge, Quelle,
   nachweislich Außerhalb, unterscheidbar ja/nein — ist nie systematisch
   gestellt worden.

   WAS DIESES WERKZEUG TUT, für JEDEN Kandidaten (s. `kandidatenErheben()`):
     1. MENGE-MUSTER im Quelltext erkennen (git ls-files / fs.readdirSync /
        fs.readFileSync einer Einzeldatei / hartkodierte Konstante / Argument)
     2. QUELLE daraus ableiten
     3. AUSSERHALB MESSEN — NUR wenn ein `fs.readdirSync`-Aufruf mit einem
        STATISCH auflösbaren Pfad gefunden wird (sonst wäre „außerhalb" eine
        Vermutung, kein Befund, s. Auftrag Auflage 2): Dateisystem flach vs.
        rekursiv vs. `git ls-files` desselben Ordners — drei Zahlen, die
        GENAU DIE ZWEI BEKANNTEN FEHLERKLASSEN generisch aufdecken
        („Unterordner zählen mit" UND „liest gitignorierte Dateien mit").
        Für alles andere (hartkodierte Listen, inhaltlich definierte Mengen):
        EHRLICH „nicht automatisch messbar" statt eine Zahl zu erfinden.
     4. UNTERSCHEIDBAR? — trägt der Kandidat (oder, bei einem über einen Test
        laufenden `tools/*.js`, sein Test) eine Marke aus
        `rot-beweis-pflicht-pruefen.js` (wörtlich wiederverwendet, nicht
        nachgebaut — das ist bereits GENAU diese Frage für die Testebene)?

   POPULATION DIESES ZENSUS, UND DAS IST DIE ANTWORT AUF DIE AUFLAGE „über
   welche Menge läuft DEIN Zensus":
     - JEDE `tests/*.test.js`-Datei (über `rot-beweis-pflicht-pruefen.js#testDateien`,
       rekursiver Dateisystem-Walk unter `tests/` — wörtlich wiederverwendet)
     - JEDES `tools/*.js`, das ENTWEDER direkt aus `hooks/pre-commit`/`hooks/pre-push`
       aufgerufen wird (eigenständiges CLI-Gate, läuft nie über `node --test`)
       ODER von mindestens einer `tests/*.test.js`-Datei direkt `require()`t wird
       (die Prüflogik steckt dort, nicht im Test-Wrapper — genau der Fall bei
       allen fünf Beispielen aus dem Auftrag: keines stand als `require()` in
       seinem eigenen Test, sondern das Muster steckt im `tools/*.js` selbst)
     GRENZE, OFFEN BENANNT: nur EIN Require-Schritt (keine transitive Hülle) —
     ein `tools/*.js`, das nur von einem ANDEREN `tools/*.js` gebraucht wird
     (nie von einem Test, nie von einem Hook direkt), fehlt in diesem Zensus.
     Das ist eine gezogene Grenze, keine übersehene.

   Aufruf:
     node tools/waechter-reichweiten-zensus.js
     node tools/waechter-reichweiten-zensus.js --top 30
   Schreibt die VOLLSTÄNDIGE Erhebung nach `.waechter-zensus-cache/` (gitignored,
   wie `.osv-cache/`) und gibt eine nach Schwere sortierte Kurztabelle aus —
   Tausende Zeilen in den Chat/Bericht zu kippen wäre selbst der Fehler, den
   diese Nacht mehrfach gefunden hat: Prosa statt Werkzeug.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { testDateien: probendateien, traegtMarke } = require('./rot-beweis-pflicht-pruefen.js');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const HOOKS = ['pre-commit', 'pre-push'].map((n) => path.join(REPO, 'hooks', n));

function git(...args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8', env: ohneGitUmgebung() });
}

/* ── 1 · Population ─────────────────────────────────────────────────────── */

/* SELBSTBEZUG (Auftrag, wörtlich: „über welche Menge läuft DEIN Zensus"): `git ls-files`,
   NICHT `fs.readdirSync` — genau der Unterschied, der `aussagen-abgleich-pruefen.js` zum
   Befund machte (das las die Platte, das Ergebnis war je Arbeitsbaum verschieden). Ein
   Zensus, der dieselbe Fehlerklasse selbst trüge, während er sie bei anderen sucht, wäre die
   Pointe der ganzen Nacht. `rot-beweis-pflicht-pruefen.js#testDateien` (Dateisystem-Walk) wird
   NICHT wiederverwendet — an DIESER einen Stelle bewusst NICHT, s. `zensusSelbstpruefung()`
   unten für den gemessenen Unterschied. */
function testDateienAlle() {
  return git('ls-files', '--', 'tests')
    .split('\n')
    .filter((f) => f.endsWith('.test.js'));
}

/* Der Beleg für den Selbstbezug — die Zahl, nicht nur die Behauptung „ich benutze git". */
function zensusSelbstpruefung() {
  const gitDateien = new Set(testDateienAlle());
  const fsDateien = new Set(probendateien(path.join(REPO, 'tests')).map((rel) => 'tests/' + rel));
  const nurGit = [...gitDateien].filter((f) => !fsDateien.has(f));
  const nurFs = [...fsDateien].filter((f) => !gitDateien.has(f));
  return { anzahlGit: gitDateien.size, anzahlFs: fsDateien.size, nurGit, nurFs };
}

function hookInvozierteWerkzeuge() {
  const inhalt = HOOKS.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  const treffer = new Set();
  const re = /\btools\/[A-Za-z0-9_./-]+\.js\b/g;
  let m;
  while ((m = re.exec(inhalt))) treffer.add(m[0]);
  return treffer;
}

/* Ein `tools/*.js`-Pfad, direkt aus einer `tests/*.test.js`-Quelle per
   `require()` referenziert — EIN Schritt, s. Kopf-Kommentar zur Grenze. */
function vonTestsBenoetigteWerkzeuge(alleTestPfade) {
  const treffer = new Set();
  const re = /require\(\s*['"](\.\.?\/[^'"]*?tools\/[^'"]+\.js)['"]\s*\)/g;
  for (const relTest of alleTestPfade) {
    const abs = path.join(REPO, relTest);
    const quelle = fs.readFileSync(abs, 'utf8');
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(quelle))) {
      const aufgeloest = path.resolve(path.dirname(abs), m[1]);
      if (aufgeloest.startsWith(path.join(REPO, 'tools'))) {
        treffer.add('tools/' + path.relative(path.join(REPO, 'tools'), aufgeloest).split(path.sep).join('/'));
      }
    }
  }
  return treffer;
}

function kandidatenErheben() {
  const testDateienListe = testDateienAlle();
  const werkzeuge = new Set([...hookInvozierteWerkzeuge(), ...vonTestsBenoetigteWerkzeuge(testDateienListe)]);
  return {
    tests: testDateienListe,
    werkzeuge: [...werkzeuge].filter((w) => fs.existsSync(path.join(REPO, w))).sort(),
  };
}

/* ── 2 · Menge-Muster im Quelltext ──────────────────────────────────────── */

const MUSTER = Object.freeze([
  { name: 'git-ls-files', quelle: 'git', re: /\bls-files\b/ },
  { name: 'fs.readdirSync', quelle: 'Dateisystem (Verzeichnis)', re: /fs\.readdirSync\(/ },
  { name: 'process.argv', quelle: 'Argument', re: /process\.argv/ },
  { name: 'hartkodierte-konstante', quelle: 'fest im Code', re: /\bconst\s+[A-Z][A-Z0-9_]{2,}\s*=\s*(Object\.freeze\()?\s*\[/ },
  { name: 'require-konstante', quelle: 'fest im Code (importiert)', re: /require\(\s*['"]\.\/lib\// },
  { name: 'fs.readFileSync-einzeldatei', quelle: 'Einzeldatei', re: /fs\.readFileSync\(/ },
]);

function mengeMusterErkennen(quelltext) {
  const treffer = [];
  for (const m of MUSTER) {
    if (m.re.test(quelltext)) treffer.push({ name: m.name, quelle: m.quelle });
  }
  return treffer.length ? treffer : [{ name: 'kein-muster-erkannt', quelle: 'unklar aus dem Quelltext allein' }];
}

/* ── 3 · Außerhalb messen — nur bei statisch auflösbarem Verzeichnis-Pfad ── */

/* Liefert den Text des ERSTEN Arguments eines Aufrufs `praefix(...)`, KLAMMER-BALANCIERT —
   eine naive `[^,)]+`-Regex bräche an einem verschachtelten Aufruf wie
   `fs.readdirSync(path.join(REPO, 'tools', 'lib'))` am ERSTEN Komma ab (mitten in `path.join`s
   eigenen Argumenten) und läse nur "path.join(REPO". Zählt Klammertiefe, bis entweder ein
   Komma AUF DERSELBEN Tiefe (Trenner zum zweiten Argument von `praefix`) oder die schließende
   Klammer von `praefix` selbst erscheint. */
function ersterAufrufArgumentText(quelltext, praefix) {
  const start = quelltext.indexOf(praefix + '(');
  if (start < 0) return null;
  let i = start + praefix.length + 1;
  let tiefe = 0;
  const anfang = i;
  for (; i < quelltext.length; i++) {
    const c = quelltext[i];
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') {
      if (tiefe === 0) break; // schließende Klammer von praefix selbst
      tiefe--;
    } else if (c === ',' && tiefe === 0) break;
  }
  return quelltext.slice(anfang, i).trim();
}

function ersteReaddirPfadAngabe(quelltext) {
  return ersterAufrufArgumentText(quelltext, 'fs.readdirSync');
}

/* Versucht `pfadAusdruck` gegen REPO aufzulösen — literal ODER `path.join(REPO, 'a', 'b')`
   ODER ein Bezeichner, dessen `const NAME = path.join(REPO, …)`-Deklaration im selben
   Quelltext steht (ein Auflösungsschritt, keine volle Auswertung — Ehrlichkeit vor
   Vollständigkeit: was sich nicht so auflösen lässt, bleibt UNGEMESSEN, nicht geraten). */
function pfadAufloesen(pfadAusdruck, quelltext) {
  const literal = pfadAusdruck.match(/^['"]([^'"]+)['"]$/);
  if (literal) return path.resolve(REPO, literal[1]);

  const joinRepo = pfadAusdruck.match(/^path\.join\(\s*REPO\s*(,\s*['"][^'"]+['"])+\s*\)$/);
  if (joinRepo) {
    const segmente = [...pfadAusdruck.matchAll(/['"]([^'"]+)['"]/g)].map((s) => s[1]);
    return path.join(REPO, ...segmente);
  }

  const bezeichner = pfadAusdruck.match(/^[A-Za-z_$][\w$]*$/);
  if (bezeichner) {
    const deklaration = new RegExp('const\\s+' + pfadAusdruck + '\\s*=\\s*(path\\.join\\([^;]+\\));');
    const gefunden = quelltext.match(deklaration);
    if (gefunden) return pfadAufloesen(gefunden[1].trim(), quelltext);
  }
  return null;
}

function relZuRepo(absPfad) {
  return path.relative(REPO, absPfad).split(path.sep).join('/');
}

function dateienRekursiv(dir) {
  const raus = [];
  (function ab(d) {
    for (const n of fs.readdirSync(d)) {
      if (n === '.git' || n === 'node_modules') continue;
      const p = path.join(d, n);
      const st = fs.statSync(p);
      if (st.isDirectory()) ab(p);
      else raus.push(p);
    }
  })(dir);
  return raus;
}

/* Belegt (nicht vermutet), ob der Quelltext selbst schon rekursiv erfasst —
   `{ recursive: true }` am `readdirSync`-Aufruf ODER ein Selbstaufruf-Muster
   (eine benannte Funktion, die sich innerhalb ihres eigenen Bodys erneut
   aufruft). Verhindert, ein bereits repariertes Werkzeug fälschlich als
   Fehlerkandidat zu listen (z. B. `rot-beweis-pflicht-pruefen.js#testDateien`
   selbst, das genau so rekursiv geschrieben ist). */
function scheintBereitsRekursiv(quelltext) {
  if (/readdirSync\([^)]*recursive:\s*true/.test(quelltext)) return true;
  const iife = quelltext.match(/\(function\s+([A-Za-z_$][\w$]*)\s*\(/);
  const fn = quelltext.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
  const name = iife ? iife[1] : (fn ? fn[1] : null);
  if (!name) return false;
  // Definition zählt als EIN Vorkommen — zwei oder mehr heißt: die Funktion ruft sich selbst.
  const vorkommen = (quelltext.match(new RegExp('\\b' + name + '\\s*\\(', 'g')) || []).length;
  return vorkommen >= 2;
}

function aussenMessen(quelltext) {
  const pfadAusdruck = ersteReaddirPfadAngabe(quelltext);
  if (!pfadAusdruck) return { messbar: false, grund: 'kein fs.readdirSync-Aufruf gefunden' };
  const abs = pfadAufloesen(pfadAusdruck, quelltext);
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
    return { messbar: false, grund: 'Pfadausdruck "' + pfadAusdruck + '" nicht statisch auflösbar' };
  }
  const flach = fs.readdirSync(abs).filter((n) => fs.statSync(path.join(abs, n)).isFile()).length;
  const rekursiv = dateienRekursiv(abs).length;
  let gitGetrackt = 0;
  try {
    gitGetrackt = git('ls-files', '--', relZuRepo(abs)).split('\n').filter(Boolean).length;
  } catch (e) { gitGetrackt = -1; }
  return {
    messbar: true,
    pfad: relZuRepo(abs),
    dateisystemFlach: flach,
    dateisystemRekursiv: rekursiv,
    gitGetrackt,
    luecke_unterordner: rekursiv - flach,
    luecke_git: gitGetrackt >= 0 ? Math.abs(rekursiv - gitGetrackt) : null,
    werkzeugScheintRekursiv: scheintBereitsRekursiv(quelltext),
  };
}

/* ── 4 · Unterscheidbar „geprüft & sauber" von „nie geprüft"? ───────────── */

function unterscheidbarkeit(kandidatPfad, quelltext, testDateienDieDiesesToolBrauchen) {
  const eigeneMarke = /Rot-Beweis|Rot-Beleg|Rotmachbarkeit|Rotprobe|Gate-Nachweis|Positivkontrolle|Negativkontrolle|Gegenprobe|Gegenkontrolle/i.test(quelltext);
  if (eigeneMarke) return { marke: true, wo: 'im Werkzeug selbst' };
  for (const t of testDateienDieDiesesToolBrauchen || []) {
    if (traegtMarke(path.join(REPO, t))) return { marke: true, wo: 'im Test ' + t };
  }
  return { marke: false, wo: null };
}

/* ── 5 · Ein Kandidat, vollständig vermessen ────────────────────────────── */

function testsDieDiesesWerkzeugBrauchen(werkzeugPfad, alleTestPfade, indexCache) {
  if (!indexCache.gebaut) {
    indexCache.gebaut = true;
    indexCache.map = new Map();
    const re = /require\(\s*['"](\.\.?\/[^'"]*?tools\/[^'"]+\.js)['"]\s*\)/g;
    for (const relTest of alleTestPfade) {
      const abs = path.join(REPO, relTest);
      const quelle = fs.readFileSync(abs, 'utf8');
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(quelle))) {
        const aufgeloest = path.resolve(path.dirname(abs), m[1]);
        const key = 'tools/' + path.relative(path.join(REPO, 'tools'), aufgeloest).split(path.sep).join('/');
        if (!indexCache.map.has(key)) indexCache.map.set(key, []);
        indexCache.map.get(key).push(relTest);
      }
    }
  }
  return indexCache.map.get(werkzeugPfad) || [];
}

function kandidatVermessen(relPfad, art, kontext) {
  const abs = path.join(REPO, relPfad);
  const quelltext = fs.readFileSync(abs, 'utf8');
  const menge = mengeMusterErkennen(quelltext);
  const aussen = aussenMessen(quelltext);
  const brauchendeTests = art === 'werkzeug' ? testsDieDiesesWerkzeugBrauchen(relPfad, kontext.tests, kontext.indexCache) : [];
  const unt = art === 'test'
    ? { marke: traegtMarke(abs), wo: traegtMarke(abs) ? 'im Test selbst' : null }
    : unterscheidbarkeit(relPfad, quelltext, brauchendeTests);
  return { datei: relPfad, art, menge, aussen, unterscheidbar: unt };
}

/* ── 6 · Schwere-Sortierung ──────────────────────────────────────────────── */

/* WICHTIG: die Frage „kann geprüft-sauber von nie-geprüft unterschieden werden" hat nur
   Gewicht, wenn der Kandidat ÜBERHAUPT eine MENGE MIT AUSSERHALB abläuft — ein einzelner
   Verhaltenstest, der eine feste Fixture-Datei liest (`fs.readFileSync-einzeldatei`) oder ein
   lokales Options-Array für EINEN Testfall trägt (`hartkodierte-konstante`), behauptet keine
   Abdeckung über eine größere Welt — er hat schlicht keine Menge im Sinne des Auftrags. NUR
   die stärkeren, gezielten Muster (Verzeichnis-/Dateisystem-Aufzählung, git, ein Argument, oder
   ein Import aus `./lib/…` — deliberate geteilte Wahrheit, kein lokales Test-Fixture) lösen die
   Reichweiten-Frage überhaupt aus. Diese Grenze ist eine HEURISTIK, keine Beweisführung — sie
   filtert lokale Test-Fixtures heraus, kann aber eine ECHTE Allowlist übersehen, die zufällig
   wie eine lokale Konstante aussieht. Steht deshalb auch im Bericht, nicht nur hier. */
function hatMengeMuster(k) {
  const STARKE_MUSTER = new Set(['git-ls-files', 'fs.readdirSync', 'process.argv', 'require-konstante']);
  return k.menge.some((m) => STARKE_MUSTER.has(m.name));
}

function schwereRang(k) {
  if (!hatMengeMuster(k)) return 4; // keine Menge — die Reichweiten-Frage betrifft ihn nicht
  if (!k.unterscheidbar.marke) return 0; // schwerster Fall: hat eine Menge, kann 0-Treffer nicht von nie-geprüft unterscheiden
  if (k.aussen.messbar && (k.aussen.luecke_unterordner > 0 || k.aussen.luecke_git > 0)) return 1; // gemessene Lücke
  if (!k.aussen.messbar && k.menge.some((m) => m.name === 'fs.readdirSync')) return 2; // Verzeichnis-Menge, aber nicht messbar
  return 3; // Menge vorhanden, unterscheidbar, keine gemessene Lücke
}

function zensusFahren() {
  const { tests, werkzeuge } = kandidatenErheben();
  const indexCache = { gebaut: false };
  const kontext = { tests, indexCache };
  const ergebnisse = [
    ...tests.map((t) => kandidatVermessen(t, 'test', kontext)),
    ...werkzeuge.map((w) => kandidatVermessen(w, 'werkzeug', kontext)),
  ];
  ergebnisse.sort((a, b) => schwereRang(a) - schwereRang(b));
  return { anzahlTests: tests.length, anzahlWerkzeuge: werkzeuge.length, ergebnisse };
}

/* ── 7 · Ausgabe ─────────────────────────────────────────────────────────── */

function main() {
  const argv = process.argv.slice(2);
  const topArgIdx = argv.indexOf('--top');
  const top = topArgIdx >= 0 ? Number(argv[topArgIdx + 1]) : 25;

  const { anzahlTests, anzahlWerkzeuge, ergebnisse } = zensusFahren();
  const selbst = zensusSelbstpruefung();

  const cacheDir = path.join(REPO, '.waechter-zensus-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const datum = new Date().toISOString().slice(0, 10);
  const ausgabePfad = path.join(cacheDir, 'zensus-' + datum + '.json');
  fs.writeFileSync(ausgabePfad, JSON.stringify({ anzahlTests, anzahlWerkzeuge, ergebnisse }, null, 2), 'utf8');

  const nachRang = [0, 1, 2, 3, 4].map((r) => ergebnisse.filter((k) => schwereRang(k) === r).length);
  process.stdout.write('\n── Reichweiten-Zensus ──\n');
  process.stdout.write('Population: ' + anzahlTests + ' Testdateien + ' + anzahlWerkzeuge + ' hook-/test-gebundene Werkzeuge = ' + ergebnisse.length + '\n');
  process.stdout.write('Davon OHNE jedes Menge-Muster (Rang 4, Einzelverhalten, Reichweiten-Frage betrifft sie nicht): ' + nachRang[4] + '\n');
  process.stdout.write('Von den restlichen ' + (ergebnisse.length - nachRang[4]) + ' MIT einer Menge:\n');
  process.stdout.write('  Rang 0 — NICHT unterscheidbar (Menge vorhanden, aber „0 gefunden" ≠ „nie geprüft"): ' + nachRang[0] + '\n');
  process.stdout.write('  Rang 1 — gemessene Lücke (Unterordner und/oder git-Abweichung > 0): ' + nachRang[1] + '\n');
  process.stdout.write('  Rang 2 — Verzeichnis-Menge, Außerhalb nicht automatisch messbar: ' + nachRang[2] + '\n');
  process.stdout.write('  Rang 3 — Menge vorhanden, unterscheidbar, keine gemessene Lücke: ' + nachRang[3] + '\n');
  process.stdout.write('Volle Erhebung: ' + relZuRepo(ausgabePfad) + '\n');
  process.stdout.write('\nSelbstbezug: dieser Zensus zählt Testdateien über `git ls-files` (' + selbst.anzahlGit
    + '), nicht über `fs.readdirSync` (' + selbst.anzahlFs + ') — Differenz: '
    + (selbst.nurFs.length + selbst.nurGit.length) + (selbst.nurFs.length + selbst.nurGit.length
      ? ' (' + [...selbst.nurFs, ...selbst.nurGit].join(', ') + ')' : ' (keine)') + '.\n');
  process.stdout.write('Population umfasst außerdem ' + anzahlWerkzeuge + ' `tools/*.js`-Dateien'
    + ' (nicht nur `tests/*.test.js`) — Antwort auf die Auflage, die eigene Reichweite zu prüfen.\n');

  process.stdout.write('\n── Top ' + top + ' nach Schwere ──\n');
  for (const k of ergebnisse.slice(0, top)) {
    const aussenTxt = k.aussen.messbar
      ? ('flach ' + k.aussen.dateisystemFlach + ' · rekursiv ' + k.aussen.dateisystemRekursiv + ' · git ' + k.aussen.gitGetrackt
        + (k.aussen.werkzeugScheintRekursiv ? ' [Werkzeug erfasst rekursiv]' : ''))
      : ('nicht messbar (' + k.aussen.grund + ')');
    process.stdout.write(
      '  [' + schwereRang(k) + '] ' + k.datei + '\n'
      + '      Menge: ' + k.menge.map((m) => m.name).join(', ') + '  ·  Außerhalb: ' + aussenTxt + '\n'
      + '      Unterscheidbar: ' + (k.unterscheidbar.marke ? 'ja (' + k.unterscheidbar.wo + ')' : 'NEIN') + '\n',
    );
  }
}

if (require.main === module) main();
module.exports = {
  kandidatenErheben, mengeMusterErkennen, pfadAufloesen, aussenMessen,
  scheintBereitsRekursiv, unterscheidbarkeit, kandidatVermessen, schwereRang, hatMengeMuster,
  zensusFahren, zensusSelbstpruefung, testDateienAlle, hookInvozierteWerkzeuge,
};
