'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/testfassung-legen.js („Testfassung ausliefern", Zug 1)
   ────────────────────────────────────────────────────────────────────────
   Prüft die reinen Funktionen (Schalen-Werte-Parsing, Dateisatz) ohne Git/
   Netzwerk — die Vorbedingungen selbst (Arbeitsbaum, ls-remote, Zielrepo)
   sind Seiteneffekte auf einem fremden Klon und gehören nicht in die Suite.

   AUSNAHME, unten: die beiden Zählfunktionen (letzterQuellCommitAusZielHistorie/
   naechsteVersionsnummer) sind git-abhängig auf `ziel` — aber `ziel` ist hier ein
   eigens gebautes, isoliertes Wegwerf-Repo in einem Temp-Verzeichnis, kein fremder
   Klon und kein Netzwerk. Dieselbe Grenze wie beim Rest der Datei (kein Seiteneffekt
   auf etwas, das nicht dieser Testlauf selbst erzeugt und wieder entfernt hat).

   Fund (01.09.2026): beide Funktionen nahmen an, sie seien der einzige
   Schreiber des Zielrepos — `git log -1` auf HEAD, ungefiltert. `modul-app-
   packen.js` committet ins selbe Zielrepo, ohne die `harness:`-Form zu tragen;
   liegt so ein Commit obenauf, wurde die Zählung blind (Befund, Zeilen 108/113
   vor dem Fix). Diese Probe stellt genau den Fall nach: ein `harness:`-Commit,
   darüber ein `modul-app`-artiger Commit — die Zählung muss den `harness:`-Commit
   darunter trotzdem finden.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  schalenWerte, DATEISATZ, letzterQuellCommitAusZielHistorie, naechsteVersionsnummer, dateisatzUndIndexAblegen,
  adrBezeichnetSwAenderung, swAenderungEntscheidung, ablegungZuruecknehmen,
} = require('../tools/testfassung-legen.js');

const REPO = path.join(__dirname, '..');

/* EIGENER FUND (01.09.2026, beim Nachbau der Positivkontrolle): `execFileSync` erbt
   standardmäßig `process.env` — und ein `git commit`, das gerade diesen HOOK ausführt,
   setzt für seinen ganzen Prozessbaum `GIT_DIR`/`GIT_WORK_TREE` (und verwandte
   `GIT_*`-Variablen) auf DIESES Repo. `cwd: ziel` ändert nur das Arbeitsverzeichnis
   des Kindprozesses — es räumt diese geerbten Variablen nicht ab. `git init` in
   `ziel` fand darum das geerbte `GIT_DIR` und initialisierte NICHT frisch dort,
   sondern operierte auf DIESEM Repo weiter ("re-init: ignored --initial-branch=main");
   der folgende `git add vivodepot.html` (cwd=ziel, aber GIT_DIR=dieses Repo) schrieb
   den Fixture-Inhalt `<html>alt</html>` in DIESES Repos Index unter demselben Pfad,
   ohne den Arbeitsbaum anzurühren — beim ersten roten Lauf real aufgetreten und vor
   jedem Commit/Push abgefangen (git restore --staged), nie geschrieben. Jeder
   `execFileSync('git', …)`-Aufruf unten bekommt darum ein VON GIT_* BEREINIGTES `env`
   statt des geerbten — `ziel` ist damit unter JEDER Aufrufbedingung wirklich isoliert,
   nicht nur beim interaktiven Test außerhalb eines Hooks. */
function ohneGitEnv() {
  const rein = {};
  for (const k of Object.keys(process.env)) if (!k.startsWith('GIT_')) rein[k] = process.env[k];
  return rein;
}

/* Baut ein Wegwerf-Git-Repo mit EINEM harness:-Commit, gefolgt von EINEM Fremd-Commit
   (die modul-app-packen.js-Lage) — beide Zählfunktionen laufen dagegen. Lokale
   user.name/user.email PRO REPO (nicht global), damit die Probe unabhängig von der
   Host-Git-Konfiguration reproduzierbar bleibt. */
function wegwerfZielMitFremdCommitObenauf() {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'testfassung-legen-ziel-'));
  const g = (args) => execFileSync('git', args, { cwd: ziel, encoding: 'utf8', env: ohneGitEnv() });
  g(['init', '-q', '-b', 'main']);
  g(['config', 'user.email', 'probe@example.invalid']);
  g(['config', 'user.name', 'Probe']);
  fs.writeFileSync(path.join(ziel, 'vivodepot.html'), '<html>alt</html>');
  g(['add', 'vivodepot.html']);
  g(['commit', '-q', '-m',
    'harness: v41 -- 2026-08-20, SCHALEN_STAND v480 (cleanslate abc1234)\n\n'
    + 'Neu seit dem letzten Einspielen: 3 Commits an den vier Dateien seit deadbee\n\n'
    + 'deadbee..abc1234 auf vivodepot-cleanslate u2-kanon.']);
  const harnessSha = g(['rev-parse', 'HEAD']).trim();
  fs.writeFileSync(path.join(ziel, 'irgendein-modul.json'), '{}');
  g(['add', 'irgendein-modul.json']);
  g(['commit', '-q', '-m', 'modul-app: irgendein-modul v3 angedockt']);
  return { ziel, harnessSha };
}

test('[Testfassung-legen] Rot-Beweis: ein Fremd-Commit (modul-app-packen.js) obenauf blendet die alte Zählung', () => {
  const { ziel } = wegwerfZielMitFremdCommitObenauf();
  try {
    // Die ALTE Form (ungefiltertes `git log -1` auf HEAD) — hier absichtlich nachgebaut,
    // um zu zeigen, dass sie am Fremd-Commit scheitert (der Rot-Beweis für den Fund selbst,
    // nicht nur eine Behauptung im Bericht).
    const alteForm = () => execFileSync('git', ['log', '-1', '--format=%s'], { cwd: ziel, encoding: 'utf8', env: ohneGitEnv() }).trim();
    assert.doesNotMatch(alteForm(), /^harness:/,
      'Vorbedingung: der ungefilterte letzte Commit ist NICHT die harness:-Form — sonst prüft diese Probe nichts');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Testfassung-legen] letzterQuellCommitAusZielHistorie findet den harness:-Commit auch mit einem Fremd-Commit obenauf', () => {
  const { ziel } = wegwerfZielMitFremdCommitObenauf();
  try {
    const quellCommit = letzterQuellCommitAusZielHistorie(ziel);
    assert.equal(quellCommit, 'abc1234', 'muss den Quell-Commit aus dem harness:-Commit lesen, nicht null');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Testfassung-legen] naechsteVersionsnummer zählt vom harness:-Commit weiter, auch mit einem Fremd-Commit obenauf', () => {
  const { ziel } = wegwerfZielMitFremdCommitObenauf();
  try {
    const v = naechsteVersionsnummer(ziel);
    assert.equal(v, '42', 'v41 im harness:-Commit → v42, nicht null/"?"');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Testfassung-legen] Gegenprobe: OHNE Fremd-Commit (harness: ist bereits HEAD) bleibt das Ergebnis gleich', () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'testfassung-legen-ziel-ohne-fremd-'));
  const g = (args) => execFileSync('git', args, { cwd: ziel, encoding: 'utf8', env: ohneGitEnv() });
  try {
    g(['init', '-q', '-b', 'main']);
    g(['config', 'user.email', 'probe@example.invalid']);
    g(['config', 'user.name', 'Probe']);
    fs.writeFileSync(path.join(ziel, 'vivodepot.html'), '<html>alt</html>');
    g(['add', 'vivodepot.html']);
    g(['commit', '-q', '-m',
      'harness: v41 -- 2026-08-20, SCHALEN_STAND v480 (cleanslate abc1234)\n\n'
      + 'Neu seit dem letzten Einspielen: 3 Commits an den vier Dateien seit deadbee\n\n'
      + 'deadbee..abc1234 auf vivodepot-cleanslate u2-kanon.']);
    assert.equal(letzterQuellCommitAusZielHistorie(ziel), 'abc1234');
    assert.equal(naechsteVersionsnummer(ziel), '42');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Testfassung-legen] DATEISATZ ist genau der im Auftrag genannte Vier-Dateien-Satz', () => {
  assert.deepEqual(DATEISATZ, ['vivodepot.html', 'vivodepot-lesen.html', 'sw.js', 'manifest.webmanifest']);
  assert.ok(!DATEISATZ.includes('.nojekyll'), '.nojekyll ist eine Ziel-Pages-Markierung, keine Auslieferungsfassung');
});

test('[Testfassung-legen] schalenWerte liest SCHALEN_STAND/BUILD_DATUM/BUILD_VERSION aus dem echten Kern', () => {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const w = schalenWerte(html);
  assert.match(w.stand, /^v\d+$/, 'SCHALEN_STAND hat die Form vNNN');
  assert.match(w.datum, /^\d{4}-\d{2}-\d{2}$/, 'BUILD_DATUM ist ein ISO-Datum');
  assert.ok(w.version, 'BUILD_VERSION ist gesetzt');
});

test('[Testfassung-legen] schalenWerte liefert undefined-Felder statt zu werfen, wenn nichts passt', () => {
  const w = schalenWerte('kein Treffer hier');
  assert.equal(w.stand, undefined);
  assert.equal(w.datum, undefined);
  assert.equal(w.version, undefined);
});

test('[Testfassung-legen] Rot-Beweis: ein manipulierter SCHALEN_STAND wird korrekt gelesen (kein Cache-Effekt)', () => {
  const html = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const mutiert = html.replace(/const SCHALEN_STAND = '(v\d+)'/, "const SCHALEN_STAND = 'v99999'");
  assert.notEqual(mutiert, html, 'Vorbedingung: die Mutation greift');
  const w = schalenWerte(mutiert);
  assert.equal(w.stand, 'v99999');
});

// U2-ADR-194 (01.09.2026, Auftrag): dateisatzUndIndexAblegen legt die vier
// DATEISATZ-Dateien PLUS eine index.html ab, die auf ./vivodepot.html weiterleitet.
test('[Testfassung-legen] dateisatzUndIndexAblegen legt DATEISATZ plus eine index.html mit Weiterleitung ab', () => {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'testfassung-legen-index-'));
  try {
    dateisatzUndIndexAblegen(ziel);
    for (const d of DATEISATZ) {
      assert.ok(fs.existsSync(path.join(ziel, d)), d + ' muss abgelegt sein');
    }
    const index = fs.readFileSync(path.join(ziel, 'index.html'), 'utf8');
    assert.match(index, /url=\.\/vivodepot\.html/, 'index.html muss auf vivodepot.html DESSELBEN Verzeichnisses weiterleiten');
    // Die Weiterleitung spiegelt die abgelegte Datei, nicht raten. Seit v894 ist das das Erzeugnis privat-de (lang="de-DE"),
    // nicht mehr der Kern (lang="de").
    const abgelegt = fs.readFileSync(path.join(ziel, 'vivodepot.html'), 'utf8').match(/<html lang="([^"]+)"/)[1];
    assert.equal(abgelegt, 'de-DE', 'abgelegt wird das Erzeugnis privat-de');
    assert.match(index, new RegExp('<html lang="' + abgelegt + '">'));
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Testfassung-legen] index.html gehört NICHT zu DATEISATZ — dessen Vier-Dateien-Vertrag bleibt unverändert', () => {
  assert.ok(!DATEISATZ.includes('index.html'),
    'DATEISATZ hat eine eigene Bedeutung (u. a. im sw.js-Diff-Vergleich) — index.html ist ein separater Schritt');
});

test('[Testfassung-legen·Rot-Beweis] die echte Ablege-Aufrufstelle in main() nutzt dateisatzUndIndexAblegen, nicht mehr die alte Einzel-Schleife', () => {
  const quelle = fs.readFileSync(path.join(REPO, 'tools', 'testfassung-legen.js'), 'utf8');
  assert.match(quelle, /\bdateisatzUndIndexAblegen\(ziel\)/, 'main() muss die neue, gemeinsame Funktion aufrufen');
  assert.match(quelle, /\['add', \.\.\.DATEISATZ, 'index\.html'\]/, 'der git-add-Aufruf muss index.html mit aufnehmen');
});

/* ══ „Ein Fix, der sich selbst nicht ausliefern kann" (02.09.2026, Fund) ══
   Der sw.js-Wächter (Service-Worker-Update-Sackgasse, 31.08.2026) blockiert seit v492 auch
   die GEWOLLTE Änderung aus U2-ADR-190 — zwei Proben unten: adrBezeichnetSwAenderung (der
   Beleg-Check) und swAenderungEntscheidung (die Entscheidung, die main() danach nur noch
   ausführt). Beide ohne main()/Netzwerk testbar, s. Kopfkommentar der Datei. */

test('[Testfassung-legen] adrBezeichnetSwAenderung: U2-ADR-190 existiert und nennt sw.js — gültig', () => {
  const r = adrBezeichnetSwAenderung('U2-ADR-190');
  assert.equal(r.ok, true, r.grund);
  assert.match(r.datei, /^vivodepot-U2-ADR-190-/);
});

test('[Testfassung-legen] adrBezeichnetSwAenderung: eine nicht existierende ADR-Nummer bricht ab', () => {
  const r = adrBezeichnetSwAenderung('U2-ADR-999999');
  assert.equal(r.ok, false);
  assert.match(r.grund, /existiert nicht/);
});

test('[Testfassung-legen] adrBezeichnetSwAenderung: eine ungültig geformte Kennung bricht ab', () => {
  const r = adrBezeichnetSwAenderung('nicht-adr-190');
  assert.equal(r.ok, false);
  assert.match(r.grund, /keine ADR-Kennung/);
});

test('[Testfassung-legen] adrBezeichnetSwAenderung: eine existierende ADR OHNE Erwähnung von sw.js bricht ab', () => {
  // Eigenes Wegwerf-docs/adr/-Verzeichnis statt des echten Bestands — sonst hinge diese Probe
  // davon ab, dass niemand je zufällig "sw.js" in eine unabhängige ADR einträgt.
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'testfassung-legen-adr-fixture-'));
  try {
    fs.writeFileSync(path.join(ordner, 'vivodepot-U2-ADR-1-fixture-ohne-sw-2026-01-01.md'),
      '# U2-ADR-1: Fixture ohne Service-Worker-Bezug\n\nDiese ADR handelt von etwas ganz anderem.\n');
    const r = adrBezeichnetSwAenderung('U2-ADR-1', ordner);
    assert.equal(r.ok, false);
    assert.match(r.grund, /nennt aber "sw\.js" an keiner/);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});

test('[Testfassung-legen] swAenderungEntscheidung: reine CACHE-Zeilen-Abweichung blockiert nie, unabhängig vom Schalter', () => {
  assert.equal(swAenderungEntscheidung(true, '+ const CACHE = ...', null).blockiert, false);
  assert.equal(swAenderungEntscheidung(true, '+ const CACHE = ...', 'U2-ADR-190').blockiert, false);
  assert.equal(swAenderungEntscheidung(true, '', null).blockiert, false, 'kein Diff-Text ist ebenfalls kein Blockgrund');
});

test('[Testfassung-legen·Rot-Beweis] swAenderungEntscheidung: OHNE Schalter bricht eine echte sw.js-Abweichung weiterhin ab', () => {
  const r = swAenderungEntscheidung(false, '+ self.addEventListener("message", ...)', null);
  assert.equal(r.blockiert, true);
  assert.match(r.grund, /--sw-aenderung-beabsichtigt/);
});

test('[Testfassung-legen·Rot-Beweis] Gegenprobe: MIT Schalter, aber erfundener ADR, bricht es AUCH ab', () => {
  const r = swAenderungEntscheidung(false, '+ self.addEventListener("message", ...)', 'U2-ADR-999999');
  assert.equal(r.blockiert, true);
  assert.match(r.grund, /existiert nicht/);
});

test('[Testfassung-legen] swAenderungEntscheidung: MIT Schalter und einer echten, sw.js nennenden ADR lässt es durch', () => {
  const r = swAenderungEntscheidung(false, '+ self.addEventListener("message", ...)', 'U2-ADR-190');
  assert.equal(r.blockiert, false, r.grund);
  assert.ok(r.adrPruefung && r.adrPruefung.ok);
  assert.match(r.adrPruefung.datei, /^vivodepot-U2-ADR-190-/);
});

/* Baut ein Wegwerf-Zielrepo mit den fünf abgelegten Dateien (DATEISATZ + index.html) auf
   einer BASIS-Fassung, committet sie — genau der Zustand, den main() vor einem Legen vorfindet. */
function wegwerfZielMitFuenfBasisDateien() {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'testfassung-legen-rollback-'));
  const g = (args) => execFileSync('git', args, { cwd: ziel, encoding: 'utf8', env: ohneGitEnv() });
  g(['init', '-q', '-b', 'main']);
  g(['config', 'user.email', 'probe@example.invalid']);
  g(['config', 'user.name', 'Probe']);
  for (const datei of DATEISATZ) fs.writeFileSync(path.join(ziel, datei), 'BASIS: ' + datei);
  fs.writeFileSync(path.join(ziel, 'index.html'), 'BASIS: index.html');
  g(['add', ...DATEISATZ, 'index.html']);
  g(['commit', '-q', '-m', 'basis']);
  return ziel;
}

test('[Testfassung-legen·Rot-Beweis] ablegungZuruecknehmen nimmt ALLE fünf abgelegten Dateien zurück, nicht nur sw.js', () => {
  const ziel = wegwerfZielMitFuenfBasisDateien();
  try {
    dateisatzUndIndexAblegen(ziel);   // überschreibt alle fünf mit dem echten Inhalt DIESES Repos
    const vorRuecknahme = execFileSync('git', ['status', '--porcelain'], { cwd: ziel, encoding: 'utf8', env: ohneGitEnv() });
    assert.notEqual(vorRuecknahme.trim(), '', 'Vorbedingung: das Ablegen muss den Zielbaum wirklich verändern');
    ablegungZuruecknehmen(ziel);
    const nachRuecknahme = execFileSync('git', ['status', '--porcelain'], { cwd: ziel, encoding: 'utf8', env: ohneGitEnv() });
    assert.equal(nachRuecknahme.trim(), '',
      'nach der Rücknahme muss der Zielbaum vollständig sauber sein — alle fünf Dateien, nicht nur sw.js '
      + '(sonst genau der Fund: „Zielrepo nicht sauber" beim nächsten Lauf)');
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});

test('[Testfassung-legen] main() verdrahtet --sw-aenderung-beabsichtigt und ruft ablegungZuruecknehmen im Abbruchpfad', () => {
  const quelle = fs.readFileSync(path.join(REPO, 'tools', 'testfassung-legen.js'), 'utf8');
  assert.match(quelle, /--sw-aenderung-beabsichtigt/, 'der Schalter muss geparst werden');
  assert.match(quelle, /swAenderungEntscheidung\(/, 'main() muss die Entscheidung nutzen, nicht die alte Inline-Prüfung');
  assert.match(quelle, /ablegungZuruecknehmen\(ziel\)/, 'der Abbruchpfad muss die vollständige Rücknahme aufrufen');
  assert.doesNotMatch(quelle, /\['checkout', '--', 'sw\.js'\]/,
    'die alte, unvollständige Einzeldatei-Rücknahme darf nicht mehr vorkommen');
});
