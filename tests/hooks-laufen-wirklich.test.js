'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter — die versionierten Hooks sind AUCH die laufenden
   ────────────────────────────────────────────────────────────────────────
   DER FUND (27.07.2026). Beim ersten echten Push zeigte sich, dass das
   BUILD_DATUM-Gate nie gelaufen war. Es lag in `hooks/pre-push` dieses
   Repos — aber `core.hooksPath` zeigte auf das hooks-Verzeichnis eines
   ANDEREN Worktrees. Der Commit war da, der Test war grün, die Datei war
   versioniert, und ausgeführt wurde eine andere Fassung.

   Der `pre-commit` lief die ganze Zeit „richtig" — aber nur, weil die
   beiden Fassungen zufällig identisch waren. Ein Zufall ist keine Deckung.

   DIE ZWEITE HÄLFTE DES FUNDES: `core.hooksPath` steht im GETEILTEN
   `.git/config`. Wer ihn in einem Worktree setzt, setzt ihn für alle.
   Die erste Reparatur bog darum nur die Richtung um — statt u2-kanon
   zeigte danach cleanslate ins fremde Verzeichnis. Der richtige Ort ist
   `git config --worktree` (braucht `extensions.worktreeConfig=true`).

   WAS GEPRÜFT WIRD
     1. core.hooksPath ist gesetzt und zeigt in DIESES Arbeitsverzeichnis
     2. jede versionierte Hook-Datei ist byte-identisch mit der laufenden

   Das ist „gedeckt ≠ ausgeführt" an der Stelle, an der es am teuersten
   ist: ein Gate, das den Push freigibt.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const { istEigenesRepo } = require('./ist-eigenes-repo.js');

const REPO = path.join(__dirname, '..');
const VERSIONIERT = path.join(REPO, 'hooks');
const IN_CI = process.env.CI === '1' || process.env.CI === 'true';

function git(...args) {
  return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
}

/** Der entscheidbare Kern — ohne git, damit er eine Positivkontrolle tragen kann. */
function hooksBefund(hooksPfad, wurzel, versioniertesVerzeichnis) {
  const fehler = [];
  if (!hooksPfad) {
    fehler.push('core.hooksPath ist NICHT gesetzt — es laufen die Vorlagen aus .git/hooks, also nichts.');
    return fehler;
  }
  const aufgeloest = path.resolve(wurzel, hooksPfad);
  if (aufgeloest !== path.resolve(wurzel) && !aufgeloest.startsWith(path.resolve(wurzel) + path.sep)) {
    fehler.push(
      `core.hooksPath zeigt AUS DIESEM Arbeitsverzeichnis heraus:\n` +
      `        gesetzt : ${aufgeloest}\n` +
      `        erwartet: unterhalb von ${path.resolve(wurzel)}\n` +
      `      Der Commit kann die Hook-Datei tragen und trotzdem eine andere ausfuehren.\n` +
      `      Setzen mit: git config --worktree core.hooksPath "$(pwd)/hooks"\n` +
      `      (core.hooksPath liegt sonst im GETEILTEN .git/config und gilt fuer alle Worktrees.)`
    );
    return fehler;
  }
  if (!fs.existsSync(versioniertesVerzeichnis)) return fehler;
  for (const name of fs.readdirSync(versioniertesVerzeichnis)) {
    const v = path.join(versioniertesVerzeichnis, name);
    if (!fs.statSync(v).isFile()) continue;
    const l = path.join(aufgeloest, name);
    if (!fs.existsSync(l)) { fehler.push(`${name}: versioniert, aber am laufenden Ort nicht vorhanden`); continue; }
    if (fs.readFileSync(v, 'utf8') !== fs.readFileSync(l, 'utf8')) {
      fehler.push(`${name}: die laufende Fassung ist NICHT byte-identisch mit der versionierten`);
    }
  }
  return fehler;
}

/* ── 1 · DER IST-ZUSTAND ──────────────────────────────────────────────── */
test('[Hooks] core.hooksPath zeigt ins eigene Arbeitsverzeichnis, und die Hooks sind die versionierten', () => {
  /* UMGEBUNGSVORAUSSETZUNG: dieser Waechter braucht eine Umgebung, in der Git-
     Hooks ueberhaupt laufen. In CI laufen sie nie — dort wird geklont und
     getestet, nicht committet. `core.hooksPath` ist folglich nicht gesetzt, und
     der Waechter meldete am 28.07. eine Verletzung, wo es nichts zu verletzen
     gab: VAKUUM-ROT.

     Ein benannter Uebersprung, kein Schweigen. Die Zeile steht in der Ausgabe,
     damit „lief nicht" und „war gruen" unterscheidbar bleiben — und die
     Positiv- und Negativkontrollen unten laufen weiter, auch in CI: sie messen
     `hooksBefund` gegen eingespeiste Pfade und brauchen keine Umgebung. */
  if (IN_CI) {
    console.log('﹣ UNGEMESSEN — in CI laufen keine Git-Hooks; hier gibt es nichts zu verletzen. ' +
      'Der Ist-Zustand ist nur am Arbeitsplatz messbar.');
    return;
  }
  /* DIESELBE KLASSE, zweiter Ort (28.07.). Läuft die Suite auf einem über
     `git archive` ausgepackten Stand, gibt es hier kein Repo — und damit weder
     ein `core.hooksPath` noch etwas, das es verletzen könnte. `git config` fiele
     dort auf die globale Konfiguration zurück und meldete „nicht gesetzt": eine
     Aussage über den Arbeitsplatz, ausgegeben als Aussage über den Stand.
     Abgeleitet, nicht gesetzt — eine Umgebungsvariable könnte dieses Gate von
     Hand stummschalten. */
  if (!istEigenesRepo(REPO)) {
    console.log('﹣ UNGEMESSEN — hier liegt kein Git-Arbeitsbaum (ausgepackter Stand?); ' +
      'ohne Repo gibt es keine laufenden Hooks. Am Arbeitsplatz läuft der Wächter.');
    return;
  }
  let hooksPfad;
  try { hooksPfad = git('config', 'core.hooksPath'); }
  catch (e) {
    if (e.status === 1) hooksPfad = '';            // nicht gesetzt — ein eigener Befund, kein Fehler
    else {
      const hinweis = `UNGEMESSEN — git nicht verfuegbar (${e.code || e.message}); zaehlt NICHT als bestanden`;
      assert.ok(!IN_CI, hinweis);
      console.log(`﹣ ${hinweis}`);
      return;
    }
  }
  assert.deepEqual(hooksBefund(hooksPfad, REPO, VERSIONIERT), [],
    'Versionierte Hooks, die nicht laufen, sind der teuerste Fall von „gedeckt ist nicht ausgefuehrt".');
});

/* ── 2 · POSITIVKONTROLLE (§3.5b) ─────────────────────────────────────── */
test('[Hooks·Positivkontrolle] ein umgebogener hooksPath wird gemeldet — mit der erwarteten Meldung', () => {
  /* Genau der Fall vom 27.07.: der Pfad zeigt AUS DEM Arbeitsverzeichnis heraus.
     KORREKTUR 28.07. aus dem CI-Lauf zu `e906429`: die erste Fassung baute den
     fremden Pfad als `<eltern>/vivodepot-cleanslate/hooks`. Am Arbeitsplatz ist
     das der Nachbar-Worktree und liegt draussen. In CI heisst das Verzeichnis
     `/home/runner/work/vivodepot-cleanslate/vivodepot-cleanslate` — der Name
     wiederholt sich, und der angeblich fremde Pfad landete INNERHALB des Repos.
     Die Kontrolle fand nichts und wurde rot.

     Dritte Ausprägung derselben Sache an einem Tag: eine Kontrolle, die vom Ort
     abhaengt, an dem sie zufaellig laeuft. `os.tmpdir()` liegt garantiert
     draussen, gleich wo gemessen wird. */
  const fremd = path.join(os.tmpdir(), 'vd-fremde-hooks', 'hooks');
  const fehler = hooksBefund(fremd, REPO, VERSIONIERT);
  assert.equal(fehler.length, 1, 'genau ein Befund');
  assert.match(fehler[0], /zeigt AUS DIESEM Arbeitsverzeichnis heraus/);
  assert.match(fehler[0], /--worktree/, 'und nennt den Weg zurueck, nicht nur das Problem');
});

test('[Hooks·Positivkontrolle] ein gar nicht gesetzter hooksPath wird gemeldet', () => {
  const fehler = hooksBefund('', REPO, VERSIONIERT);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /NICHT gesetzt/);
});

test('[Hooks·Positivkontrolle] eine abweichende laufende Fassung wird gemeldet', () => {
  // Ein Verzeichnis INNERHALB des Repos, das eine Hook-Datei mit anderem Inhalt traegt.
  const tmp = path.join(REPO, '.hooks-probe-tmp');
  fs.mkdirSync(tmp, { recursive: true });
  try {
    for (const name of fs.readdirSync(VERSIONIERT)) {
      const q = path.join(VERSIONIERT, name);
      if (fs.statSync(q).isFile()) fs.writeFileSync(path.join(tmp, name), fs.readFileSync(q, 'utf8'));
    }
    const erste = fs.readdirSync(tmp)[0];
    fs.appendFileSync(path.join(tmp, erste), '\n# heimlich veraendert\n');
    const fehler = hooksBefund(tmp, REPO, VERSIONIERT);
    assert.equal(fehler.length, 1);
    assert.match(fehler[0], /NICHT byte-identisch/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

/* ── 3 · NEGATIVKONTROLLE ─────────────────────────────────────────────── */
test('[Hooks·Negativkontrolle] der richtige Pfad erzeugt keinen Befund', () => {
  assert.deepEqual(hooksBefund(VERSIONIERT, REPO, VERSIONIERT), [],
    'sonst misst die Kontrolle ihre Umgebung statt den Fehler');
});
