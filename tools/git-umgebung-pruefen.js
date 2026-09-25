#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Git-Umgebung-Wächter — U2-ADR-232 (03.09.2026, Auftrag)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Während eines `pre-commit`-Laufs setzt git seinen Hooks
   `GIT_DIR`, `GIT_INDEX_FILE` und `GIT_WORK_TREE`. Ruft ein Test- oder
   Werkzeugcode `git` als Unterprozess auf und gibt ihm ein ANDERES `cwd` (ein
   Wegwerf-Repo, eine fabrizierte Fixture), gewinnt `GIT_DIR` gegen `cwd` — der
   Aufruf arbeitet dann im ECHTEN Repository statt in seiner Fixture. Am
   Terminal fällt das nie auf, dort ist `GIT_DIR` leer. Zweimal an einem Tag
   (03.09.2026): `scripts/build-datum-kern.js` (dort schon behoben, an EINER
   von zwei betroffenen Stellen — U2-ADR-232 zog die zweite nach) und
   `tests/suite-dateien-kern.test.js` (von der bauenden Sitzung selbst
   gefunden und behoben, bevor er landete). Zweimal ist ein Muster.

   WAS DER WÄCHTER PRÜFT, und die Grenze steht hier, nicht im Bericht: eine
   `git`-Unterprozess-Aufrufstelle in `tests/`, `tools/` oder `scripts/`, deren
   Arbeitsverzeichnis (`cwd:`-Option oder `-C <ziel>`-Flag) NICHT die
   Konstante `REPO` ist — also ein Wegwerf-Repo, eine Fixture, ein fremdes
   Zielverzeichnis sein KANN — und die dabei KEINE `env:`-Option trägt. Eine
   Aufrufstelle ohne `cwd`/`-C` gilt als sicher (sie arbeitet im
   Prozess-Arbeitsverzeichnis, das bei jedem Testlauf und jedem `node
   tools/…`-Aufruf das Repo selbst ist); eine Aufrufstelle mit `cwd: REPO`
   ebenso (dieselbe `GIT_DIR` beantwortet dieselbe Frage richtig, ob gesetzt
   oder nicht). NICHT geprüft wird, OB die `env:`-Option tatsächlich
   `GIT_*` abstreift — das wäre eine Prüfung der Güte, keine der Anwesenheit,
   und sechs unabhängige, alle korrekte Fassungen im heutigen Bestand
   (`ohneGitUmgebung`, `ohneGitEnv`, drei benannte, drei anonyme Inline-
   Kopien) zeigen, dass die Anwesenheit hier der tragende Fall ist — die
   VERGESSENE Absicherung, nicht die vorgetäuschte. Dieselbe Grenzziehung wie
   `tools/rot-beweis-pflicht-pruefen.js`.

   EINE RATSCHE, KEINE FORDERUNG AN DEN BESTAND (Zug-0-Messung, 03.09.2026).
   Zwei Fundstellen bleiben heute ungeschützt: `tools/modul-app-packen.js`
   (schreibend — `git add`/`commit`/`push` in einem fremden Zielrepo — aber
   nicht über die Suite erreichbar, `tests/modul-app-packen.test.js` prüft
   bewusst nur die reinen Helfer) und `tools/krypto-block-propagation-
   pruefen.js` (lesend, über `--repo` einspeisbar, nicht voll verifiziert, ob
   ein Testlauf das exercised). Beide stehen namentlich in der Grundlinie
   (`tools/git-umgebung-grundlinie.json`) — sie zu fordern hiesse, das Gate am
   ersten Tag rot zu haben. Die Grundlinie darf nur SCHRUMPFEN.

   ZWEITE PRÜFUNG (19.09.2026 — die tagelange Index-Korruption).
   Die Prüfung oben fragt nur, OB eine `env:`-Option an der Aufrufstelle
   steht — nicht, WAS sie enthält (bewusst, s.o.: eine Güte-Prüfung wäre der
   falsche Ort). Der Fund vom 19.09. lag aber genau dort, wo eine Anwesenheits-
   Prüfung blind ist: `tests/ohne-git-umgebung.test.js` simulierte einen
   `pre-commit`-Hook mit einem Objektliteral, das die geerbte Prozessumgebung
   per Spread übernahm und ihr zusätzlich nur EINEN GIT-Schlüssel (den fürs
   Verzeichnis) hinzufügte — `env: hookUmgebung` TRÄGT eine `env:`-Option, die
   erste Prüfung sieht also "geschützt". Tatsächlich erbt dieses Objekt jeden
   GIT-Schlüssel, den der AUFRUFENDE Prozess selbst schon gesetzt hat (z. B.
   weil die Suite selbst unter einem echten Hook läuft), und überschreibt nur
   das Verzeichnis — nicht den Index-Pfad. Ergebnis: `git` schreibt Objekte
   ins fabrizierte Verzeichnis, trägt die Baum-Einträge aber in den geerbten,
   ECHTEN Index ein.
   Löscht die Probe hinterher ihr fabriziertes Repo, verwaist der echte,
   geteilte Index — genau die tagelange, mehrfach reproduzierte Korruption
   „fatal: unable to read <sha>". Diese eine Zeile ist KEIN cwd/env-Problem
   (die erste Prüfung fragt danach), sondern ein Konstruktions-Problem: das
   Muster `{ ...process.env, GIT_…: … }` — roher Spread der geerbten Umgebung,
   OHNE vorherige Bereinigung, kombiniert mit einer direkten `GIT_*`-Zuweisung
   im selben Objektliteral — ist per Konstruktion gefährlich, unabhängig davon,
   ob es an einer Aufrufstelle selbst oder (wie hier) in einer Variablen ein
   paar Zeilen darüber steht. Diese zweite Prüfung sucht genau dieses Muster,
   textweit in der ganzen Datei (nicht nur an git-Aufrufstellen), denn die
   Variable kann später an einer beliebigen Aufrufstelle verwendet werden.
   Erlaubt bleibt jeder Spread einer BEREITS bereinigten Quelle
   (`ohneGitUmgebung()`, `ohneGitEnv()` — beide entfernen `GIT_*` zuerst) —
   nur der rohe `process.env`-Spread in Kombination mit einer `GIT_*`-Zuweisung
   im selben Objektliteral zählt. Eigene Ratsche
   (`tools/git-umgebung-grundlinie.json`, Schlüssel `roherEnvSpreadMitGit`),
   heute leer — kein bekannter Bestand trägt dieses Muster mehr.

   Aufruf:
     node tools/git-umgebung-pruefen.js
     node tools/git-umgebung-pruefen.js --verzeichnisse tests,tools,scripts --grundlinie <pfad>
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Erreicht jede `.js`-Datei unter jedem übergebenen Wurzelverzeichnis,
   rekursiv (die Suite-Differenz vom 11.08./A155 lehrte: ein flacher Glob
   lässt Unterordner still aus). */
function jsDateien(wurzel) {
  const raus = [];
  (function ab(d) {
    for (const n of fs.readdirSync(d).sort()) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) ab(p);
      else if (n.endsWith('.js')) raus.push(p);
    }
  })(wurzel);
  return raus;
}

const AUFRUF_MUSTER = /\b(execSync|execFileSync|spawnSync|spawn)\s*\(/g;

/* Die Argumentliste EINER Aufrufstelle, Klammer-balanciert ab der öffnenden
   Klammer von `execSync(`/… — mehrzeilige Aufrufe (der Regelfall im Bestand)
   sind damit vollständig erfasst, nicht nur ihre erste Zeile. */
function argumentTextAb(quelle, offenIdx) {
  let tiefe = 1;
  let i = offenIdx + 1;
  for (; i < quelle.length && tiefe > 0; i++) {
    if (quelle[i] === '(') tiefe++;
    else if (quelle[i] === ')') tiefe--;
  }
  return quelle.slice(offenIdx + 1, i - 1);
}

function zeileVonIndex(quelle, idx) {
  return quelle.slice(0, idx).split('\n').length;
}

/* Ist die Aufrufstelle ein `git`-Aufruf? Zwei Formen im Bestand:
     execFileSync('git', [...], {…})   — Befehl als eigenes erstes Argument
     execSync('git ...', {…})          — Befehl als EIN String, Leerzeichen danach */
function istGitAufruf(argText) {
  return /^\s*['"`]git['"`]\s*,/.test(argText) || /^\s*['"`]git[\s'"`]/.test(argText);
}

/* Das Arbeitsverzeichnis der Aufrufstelle: `cwd:`-Option ODER `-C <ziel>` im
   Argument-Array. `null` heisst: keins von beiden — sicher (Prozess-cwd). */
// `path.join(__dirname, '..')` ist im Bestand die zweithäufigste Schreibweise
// für „das Repo selbst" — inline statt über die Konstante `REPO`. Dieselbe
// GIT_DIR beantwortet dieselbe Frage richtig, ob gesetzt oder nicht.
const REPO_INLINE_MUSTER = /\bcwd\s*:\s*path\.join\(\s*__dirname\s*,\s*['"`]\.\.['"`]\s*\)/;

function arbeitsVerzeichnis(argText) {
  if (REPO_INLINE_MUSTER.test(argText)) return 'REPO';
  const cwdM = argText.match(/\bcwd\s*:\s*([A-Za-z_$][\w.$]*)/);
  if (cwdM) return cwdM[1];
  const cM = argText.match(/['"`]-C['"`]\s*,\s*([A-Za-z_$][\w.$]*)/);
  if (cM) return cM[1];
  return null;
}

// `env:` (explizit) ODER `env` als ES6-Shorthand-Property (kein Doppelpunkt,
// von `{`/`,` vor und `,`/`}` nach dem Bezeichner begrenzt) — beides drückt
// dieselbe Absicht aus, nur die Schreibweise unterscheidet sich.
function traegtEnvOption(argText) {
  return /\benv\s*:/.test(argText) || /[{,]\s*env\s*[,}]/.test(argText);
}

/* Roher Spread der gesamten Prozessumgebung, kombiniert mit einer direkten
   Zuweisung eines GIT-Schlüssels im SELBEN Objektliteral, in beiden
   Reihenfolgen. `[^{}]` hält den Treffer auf einer einzigen flachen
   Klammerebene: weder ein verschachteltes Objekt dazwischen noch ein
   Verlassen des Literals selbst zählt als „selbes Objekt". Ein Spread aus
   einer bereits bereinigten Quelle (`ohneGitUmgebung()`, `ohneGitEnv()`)
   trifft nicht — beide sind kein Spread der rohen Prozessumgebung selbst.
   (Diese Erklärung schreibt das Muster bewusst NICHT wörtlich aus — sonst
   wäre diese Datei ihr eigener erster Fund, siehe Regel-Kommentar am
   Wächter-Kopf und die Konvention „Wert nicht literal" im Bestand.) */
const ROHER_ENV_SPREAD_MIT_GIT_MUSTER =
  /\.\.\.\s*process\.env\b[^{}]*?\bGIT_[A-Z0-9_]+\s*:|\bGIT_[A-Z0-9_]+\s*:[^{}]*?\.\.\.\s*process\.env\b/g;

/**
 * @param {string} datei  absoluter Pfad
 * @returns {number[]}  Zeilen mit rohem `...process.env`+`GIT_*`-Objektliteral
 */
function roherEnvSpreadMitGitInDatei(datei) {
  const quelle = fs.readFileSync(datei, 'utf8');
  const zeilen = new Set();
  let m;
  ROHER_ENV_SPREAD_MIT_GIT_MUSTER.lastIndex = 0;
  while ((m = ROHER_ENV_SPREAD_MIT_GIT_MUSTER.exec(quelle))) zeilen.add(zeileVonIndex(quelle, m.index));
  return [...zeilen].sort((a, b) => a - b);
}

/**
 * @param {string} datei  absoluter Pfad
 * @returns {{zeile:number, wo:string}[]}  jede UNGESCHÜTZTE Risiko-Aufrufstelle
 */
function ungeschuetzteAufrufstellenInDatei(datei) {
  const quelle = fs.readFileSync(datei, 'utf8');
  const funde = [];
  let m;
  AUFRUF_MUSTER.lastIndex = 0;
  while ((m = AUFRUF_MUSTER.exec(quelle))) {
    const offenIdx = m.index + m[0].length - 1;
    const argText = argumentTextAb(quelle, offenIdx);
    if (!istGitAufruf(argText)) continue;
    const wo = arbeitsVerzeichnis(argText);
    if (wo === null || wo === 'REPO') continue;              // sicher: Prozess-cwd oder REPO
    if (traegtEnvOption(argText)) continue;                   // geschützt
    funde.push({ zeile: zeileVonIndex(quelle, m.index), wo });
  }
  return funde;
}

/**
 * DRITTE PRÜFUNG (19.09.2026, GITW): `cwd: REPO` galt oben als sicher — „dieselbe GIT_DIR
 * beantwortet dieselbe Frage richtig". Das stimmt nur, solange die geerbte Umgebung zu DIESEM Baum
 * gehört. Unter einem Hook trägt sie GIT_DIR/GIT_INDEX_FILE/GIT_WORK_TREE eines Baums, und bei
 * `commit -a` einen temporären Index: ein `git ls-files`, `git diff` oder `git add` in REPO
 * beantwortet dann eine andere Frage als am Terminal — und ein fremder hooksPath oder eine
 * Suite, die unter einem Hook eines anderen Baums läuft, macht aus „dasselbe Repo" ein anderes.
 * Diese Prüfung findet jede git-Aufrufstelle mit `cwd: REPO` OHNE `env:`-Option. Der Bestand steht
 * in der Grundlinie (Schlüssel `repoOhneEnv`) und darf nur SCHRUMPFEN.
 * @param {string} datei  absoluter Pfad
 * @returns {number[]}  Zeilen
 */
function repoAufrufeOhneEnvInDatei(datei) {
  const quelle = fs.readFileSync(datei, 'utf8');
  const zeilen = [];
  let m;
  AUFRUF_MUSTER.lastIndex = 0;
  while ((m = AUFRUF_MUSTER.exec(quelle))) {
    const offenIdx = m.index + m[0].length - 1;
    const argText = argumentTextAb(quelle, offenIdx);
    if (!istGitAufruf(argText)) continue;
    if (arbeitsVerzeichnis(argText) !== 'REPO') continue;
    if (traegtEnvOption(argText)) continue;
    zeilen.push(zeileVonIndex(quelle, m.index));
  }
  return zeilen;
}

/* Zwei Befundarten, dieselbe Ratsche wie `rot-beweis-pflicht-pruefen.js`:
     NEU — eine Datei ausserhalb der Grundlinie mit ungeschützter Aufrufstelle.
     GRUNDLINIE-ZU-GROSS — ein Grundlinien-Eintrag, dessen Datei inzwischen
     KEINE ungeschützte Aufrufstelle mehr trägt. Er gehört heraus. */
function pruefe(wurzeln, grundlinie) {
  const dateien = wurzeln.flatMap((w) => jsDateien(w).map((p) => ({ p, rel: relZuWurzelEltern(w, p) })));
  const ausnahme = new Set(grundlinie.ungeschuetzt || []);
  const neu = [];
  const grundlinieZuGross = [];
  const belege = {};
  for (const { p, rel } of dateien) {
    const funde = ungeschuetzteAufrufstellenInDatei(p);
    if (funde.length) belege[rel] = funde;
    if (!ausnahme.has(rel) && funde.length) neu.push(rel);
    if (ausnahme.has(rel) && !funde.length) grundlinieZuGross.push(rel);
  }
  const relDateien = new Set(dateien.map((d) => d.rel));
  const verschwunden = [...ausnahme].filter((r) => !relDateien.has(r));

  // Zweite, unabhängige Ratsche (19.09.2026): rohes `{ ...process.env, GIT_…: … }`,
  // textweit je Datei — nicht an eine cwd/-C-Aufrufstelle gebunden, siehe Kopfkommentar.
  const spreadAusnahme = new Set(grundlinie.roherEnvSpreadMitGit || []);
  const spreadNeu = [];
  const spreadGrundlinieZuGross = [];
  const spreadBelege = {};
  for (const { p, rel } of dateien) {
    const zeilen = roherEnvSpreadMitGitInDatei(p);
    if (zeilen.length) spreadBelege[rel] = zeilen;
    if (!spreadAusnahme.has(rel) && zeilen.length) spreadNeu.push(rel);
    if (spreadAusnahme.has(rel) && !zeilen.length) spreadGrundlinieZuGross.push(rel);
  }
  const spreadVerschwunden = [...spreadAusnahme].filter((r) => !relDateien.has(r));

  // Dritte Ratsche (19.09.2026): `cwd: REPO` ohne `env:` — Schlüssel `repoOhneEnv`.
  const repoAusnahme = new Set(grundlinie.repoOhneEnv || []);
  const repoNeu = [];
  const repoGrundlinieZuGross = [];
  const repoBelege = {};
  for (const { p, rel } of dateien) {
    const zeilen = repoAufrufeOhneEnvInDatei(p);
    if (zeilen.length) repoBelege[rel] = zeilen;
    if (!repoAusnahme.has(rel) && zeilen.length) repoNeu.push(rel);
    if (repoAusnahme.has(rel) && !zeilen.length) repoGrundlinieZuGross.push(rel);
  }
  const repoVerschwunden = [...repoAusnahme].filter((r) => !relDateien.has(r));

  return {
    dateien: dateien.map((d) => d.rel), neu, grundlinieZuGross, verschwunden, belege,
    spreadNeu, spreadGrundlinieZuGross, spreadVerschwunden, spreadBelege,
    repoNeu, repoGrundlinieZuGross, repoVerschwunden, repoBelege,
  };
}

// Relativ zum ELTERNVERZEICHNIS der Wurzel, nicht zu REPO — in der echten
// Prüfung sind beide dasselbe (`tests`/`tools`/`scripts` liegen direkt unter
// REPO), aber eine Fixture-Probe legt ihre Wurzeln unter einem eigenen
// Wegwerf-Verzeichnis an, das mit REPO nichts zu tun hat.
function relZuWurzelEltern(wurzel, p) { return path.relative(path.dirname(wurzel), p).split(path.sep).join('/'); }

function main() {
  const argv = process.argv.slice(2);
  const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
  const wurzeln = arg('verzeichnisse', 'tests,tools,scripts').split(',')
    .map((n) => path.join(REPO, n)).filter((p) => fs.existsSync(p));
  const gPfad = arg('grundlinie', path.join(REPO, 'tools', 'git-umgebung-grundlinie.json'));
  const r = pruefe(wurzeln, JSON.parse(fs.readFileSync(gPfad, 'utf8')));

  console.log(`js-Dateien unter ${wurzeln.map((w) => path.relative(REPO, w)).join(', ')}: ${r.dateien.length}`);
  if (r.neu.length) {
    console.log(`\n✗ ${r.neu.length} Datei(en) mit NEUER ungeschützter git-Risiko-Aufrufstelle:`);
    for (const d of r.neu) for (const f of r.belege[d]) console.log(`   ${d}:${f.zeile}  cwd/-C: ${f.wo}`);
  }
  if (r.grundlinieZuGross.length) {
    console.log(`\n✗ ${r.grundlinieZuGross.length} Grundlinien-Eintrag/Einträge sind nachgerüstet und gehören heraus:`);
    r.grundlinieZuGross.forEach((d) => console.log('   ' + d));
  }
  if (r.verschwunden.length) {
    console.log(`\n✗ ${r.verschwunden.length} Grundlinien-Eintrag/Einträge zeigen ins Leere:`);
    r.verschwunden.forEach((d) => console.log('   ' + d));
  }
  if (r.spreadNeu.length) {
    console.log(`\n✗ ${r.spreadNeu.length} Datei(en) mit rohem '{ ...process.env, GIT_…: … }' (NEU, ohne vorherige Bereinigung):`);
    for (const d of r.spreadNeu) for (const z of r.spreadBelege[d]) console.log(`   ${d}:${z}`);
  }
  if (r.spreadGrundlinieZuGross.length) {
    console.log(`\n✗ ${r.spreadGrundlinieZuGross.length} Grundlinien-Eintrag/Einträge (roherEnvSpreadMitGit) sind nachgerüstet und gehören heraus:`);
    r.spreadGrundlinieZuGross.forEach((d) => console.log('   ' + d));
  }
  if (r.spreadVerschwunden.length) {
    console.log(`\n✗ ${r.spreadVerschwunden.length} Grundlinien-Eintrag/Einträge (roherEnvSpreadMitGit) zeigen ins Leere:`);
    r.spreadVerschwunden.forEach((d) => console.log('   ' + d));
  }
  if (r.repoNeu.length) {
    console.log(`\n✗ ${r.repoNeu.length} Datei(en) mit NEUER git-Aufrufstelle 'cwd: REPO' ohne env-Option (erbt die Hook-Umgebung):`);
    for (const d of r.repoNeu) for (const z of r.repoBelege[d]) console.log(`   ${d}:${z}`);
  }
  if (r.repoGrundlinieZuGross.length) {
    console.log(`\n✗ ${r.repoGrundlinieZuGross.length} Grundlinien-Eintrag/Einträge (repoOhneEnv) sind nachgerüstet und gehören heraus:`);
    r.repoGrundlinieZuGross.forEach((d) => console.log('   ' + d));
  }
  if (r.repoVerschwunden.length) {
    console.log(`\n✗ ${r.repoVerschwunden.length} Grundlinien-Eintrag/Einträge (repoOhneEnv) zeigen ins Leere:`);
    r.repoVerschwunden.forEach((d) => console.log('   ' + d));
  }
  const rot = r.neu.length + r.grundlinieZuGross.length + r.verschwunden.length
    + r.spreadNeu.length + r.spreadGrundlinieZuGross.length + r.spreadVerschwunden.length
    + r.repoNeu.length + r.repoGrundlinieZuGross.length + r.repoVerschwunden.length;
  if (!rot) console.log('\n✓ Jede git-Risiko-Aufrufstelle ausserhalb der Grundlinie streift GIT_* ab, kein roher process.env-Spread mit GIT_*-Zuweisung.');
  process.exit(rot ? 1 : 0);
}

if (require.main === module) main();
module.exports = {
  pruefe, jsDateien, ungeschuetzteAufrufstellenInDatei, istGitAufruf, arbeitsVerzeichnis, traegtEnvOption,
  roherEnvSpreadMitGitInDatei, repoAufrufeOhneEnvInDatei,
};
