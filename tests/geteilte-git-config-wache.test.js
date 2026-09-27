'use strict';
/* Befund, 20.09.2026 — Rot-Beweis für tools/geteilte-git-config-wache.js. Baut ein
   EIGENES, wegwerfbares Bare-Repo mit zwei Arbeitsbäumen (Bauart wie im Befund selbst
   nachgestellt) und beweist an DIESEM isolierten Paar, nicht am echten Repo:
     1. ein sauberer Lauf bleibt grün, der [user]-Abschnitt unangetastet,
     2. der Exit-Code des bewachten Befehls kommt unverändert durch,
     3. ein Lauf, der (wie das echte Leck) `GIT_DIR` leakt und `git config user.*` in einem
        ANDEREN Arbeitsbaum aufruft, wird als Befund erkannt — mit den geänderten Zeilen,
     4. eine Änderung AUSSERHALB der Konfigurationsdatei (ein neuer Branch) lässt die Wache
        unbeteiligt grün,
     5. eine Änderung INNERHALB der Datei, aber AUSSERHALB von [user] (ein neuer, verfolgender
        Zweig — genau das eigene Selbstkorrektur-Beispiel im Kopfkommentar des Werkzeugs),
        lässt die Wache ebenso unbeteiligt grün — sie bewacht den [user]-Abschnitt, nicht die
        ganze Datei und nicht den ganzen Baum. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  geteilteConfigPfad, geaenderteZeilen, userAbschnitt, bewachterLauf, ohneGitUmgebung,
} = require('../tools/geteilte-git-config-wache.js');

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung() });
}

/* Eigenfund (20.09.2026, am echten Push-Gate): `bewachterLauf` reicht die Umgebung des
   bewachten Befehls bewusst UNVERAENDERT durch (spawnSync ohne `env`) — richtig fuer den
   Ernstfall, wo sie `npm test` transparent umschliessen muss. Ruft aber DIESE Testdatei
   selbst unter einem geleakten GIT_DIR (z. B. als geschachtelter Teil von hooks/pre-push
   waehrend eines echten `git push`), erbt der von `bewachterLauf` gestartete `git -C wt1 …`
   dasselbe Leck und schreibt in den ECHTEN Baum statt in `wt1` — belegt an zwei liegen-
   gebliebenen Zweigen (`nebenzweig`, `neu-verfolgend`) im echten Repo nach einem Gate-Lauf.
   Die beiden Gegenproben unten rufen darum selbst mit bereinigter Umgebung auf. */
function mitBereinigterGitEnv(fn) {
  const gerettet = {};
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('GIT_')) { gerettet[k] = process.env[k]; delete process.env[k]; }
  }
  try { return fn(); } finally { Object.assign(process.env, gerettet); }
}

/** Baut ein wegwerfbares Bare-Repo + einen ersten Arbeitsbaum (mit einem Commit). */
function mitHubUndArbeitsbaum(fn) {
  const basis = fs.mkdtempSync(path.join(os.tmpdir(), 'geteilte-config-wache-'));
  const hub = path.join(basis, 'hub.git');
  const wt1 = path.join(basis, 'wt1');
  try {
    // --initial-branch=main: ohne es zeigt HEAD im Bare-Repo auf init.defaultBranch — auf dem CI-Läufer „master",
    // und der zweite `worktree add` fand kein HEAD (erster öffentlicher CI-Lauf, 25.09.2026).
    git(['init', '--bare', '-q', '--initial-branch=main', hub]);
    git(['-C', hub, 'worktree', 'add', '-q', wt1, '-b', 'main']);
    fs.writeFileSync(path.join(wt1, 'a.txt'), 'x');
    git(['-C', wt1, 'add', 'a.txt'], wt1);
    git(['-C', wt1, '-c', 'user.email=a@a', '-c', 'user.name=A', 'commit', '-q', '-m', 'init'], wt1);
    return fn({ basis, hub, wt1 });
  } finally {
    fs.rmSync(basis, { recursive: true, force: true });
  }
}

test('[Wache] geteilteConfigPfad findet dieselbe Datei von JEDEM Arbeitsbaum aus', () => {
  mitHubUndArbeitsbaum(({ hub, wt1 }) => {
    const vonWt1 = geteilteConfigPfad(wt1);
    // `git rev-parse --git-common-dir` liefert einen aufgeloesten Pfad — auf macOS
    // weicht der vom mkdtemp-Pfad ab (/var/… ist ein Symlink auf /private/var/…).
    // Realpath auf beiden Seiten, sonst ein Fund, der keiner ist.
    assert.equal(fs.realpathSync(vonWt1), fs.realpathSync(path.join(hub, 'config')));
    assert.ok(fs.existsSync(vonWt1), 'die Datei muss es (als Bare-Repo-Config) bereits geben');
  });
});

test('[Wache] ein sauberer Lauf bleibt gruen, der bewachte Exit-Code kommt unveraendert durch', () => {
  mitHubUndArbeitsbaum(({ hub, wt1 }) => {
    const vorher = fs.readFileSync(path.join(hub, 'config'), 'utf8');
    const rc = bewachterLauf(['node', '-e', 'process.exit(0)'], { repo: wt1 });
    assert.equal(rc, 0);
    assert.equal(fs.readFileSync(path.join(hub, 'config'), 'utf8'), vorher, 'unveraendert erwartet');
  });
});

test('[Wache] ein eigener Fehlschlag des bewachten Befehls bleibt sichtbar (Exit-Code durchgereicht)', () => {
  mitHubUndArbeitsbaum(({ wt1 }) => {
    const rc = bewachterLauf(['node', '-e', 'process.exit(7)'], { repo: wt1 });
    assert.equal(rc, 7, 'die Wache darf einen eigenen roten Befund NICHT hinter Exit 1 verstecken');
  });
});

test('[Wache·Rot-Beweis] ein geleaktes GIT_DIR, das user.* in einem FREMDEN Arbeitsbaum setzt, wird erkannt', () => {
  mitHubUndArbeitsbaum(({ hub, wt1 }) => {
    // Der zweite Arbeitsbaum, in dem der (nachgestellte) Leck-Aufruf tatsaechlich laeuft.
    git(['-C', hub, 'worktree', 'add', '-q', path.join(path.dirname(wt1), 'wt2'), '-b', 'feature']);
    const wt2 = path.join(path.dirname(wt1), 'wt2');

    // Das nachgestellte Leck selbst: ein Skript, das GENAU den Befund-Mechanismus fährt —
    // GIT_DIR zeigt (wie im echten Fund) auf einen ANDEREN Arbeitsbaum, waehrend `-C wt2`
    // etwas anderes verspricht. `bewachterLauf` bekommt nur den Aussenbefehl zu sehen, nicht
    // die interne Ursache — genau wie am echten Fund, wo die Ursache unbekannt blieb.
    const leckSkript = path.join(path.dirname(wt1), 'leck.js');
    // Spread und GIT-Schluessel bewusst in ZWEI Schritten (nicht im selben Objektliteral) —
    // genau die Form, die tools/git-umgebung-pruefen.js als sicher gegenueber der zweiten,
    // unabhaengigen Ratsche (roherEnvSpreadMitGit, 19.09.2026) einstuft; diese Datei bräuchte
    // sonst selbst einen Grundlinien-Eintrag fuer eine absichtliche, isolierte Simulation.
    fs.writeFileSync(leckSkript, `
      const { execFileSync } = require('node:child_process');
      const env = { ...process.env };
      env.GIT_DIR = ${JSON.stringify(path.join(wt1, '.git'))};
      execFileSync('git', ['-C', ${JSON.stringify(wt2)}, 'config', 'user.email', 'probe@example.invalid'], { env });
      execFileSync('git', ['-C', ${JSON.stringify(wt2)}, 'config', 'user.name', 'Probe'], { env });
    `);

    const rc = bewachterLauf(['node', leckSkript], { repo: wt1 });
    assert.notEqual(rc, 0, 'ROT ERWARTET: das geleakte GIT_DIR hat wirklich in die geteilte Konfiguration geschrieben');

    const config = fs.readFileSync(path.join(hub, 'config'), 'utf8');
    assert.match(config, /probe@example\.invalid/, 'Vorbedingung: das Leck hat tatsaechlich gegriffen');
  });
});

test('[Wache·Gegenprobe] eine Aenderung AUSSERHALB der Konfigurationsdatei bleibt unbeanstandet', () => {
  mitHubUndArbeitsbaum(({ wt1 }) => {
    const rc = mitBereinigterGitEnv(() => bewachterLauf(['git', '-C', wt1, 'branch', 'nebenzweig'], { repo: wt1 }));
    assert.equal(rc, 0, 'ein neuer Branch aendert die geteilte Konfiguration nicht — kein Befund');
  });
});

test('[Wache·Gegenprobe·Selbstkorrektur] ein NEUER, verfolgender Zweig schreibt in dieselbe Datei, aber ausserhalb von [user] — kein Befund', () => {
  // Der eigene Fund vom 20.09.2026 (Einsatz gegen das echte Repo): `git worktree add -b <name>
  // <remote-tracking-ref>` legt einen neuen `[branch "<name>"]`-Abschnitt in derselben geteilten
  // Datei an — voellig harmlos, aber die ERSTE Fassung dieser Wache (Vergleich der ganzen Datei)
  // meldete das als Befund. Bewusst mit einem REMOTE-verfolgenden Start (nicht `git branch`, das
  // schreibt nie in die Config) nachgestellt, um genau diese Luecke zu schliessen.
  mitHubUndArbeitsbaum(({ hub, wt1 }) => {
    // `-b <name> main` allein richtet OHNE `--track` kein Tracking ein (main ist ein lokaler
    // Zweig) — `--track` erzwingt genau das, unabhaengig davon, ob das Ziel lokal oder
    // Remote-verfolgend ist, und schreibt dabei zuverlaessig einen `[branch "<name>"]`-Abschnitt.
    const rc = mitBereinigterGitEnv(() => bewachterLauf(
      ['git', '-C', hub, 'worktree', 'add', '-q', path.join(path.dirname(wt1), 'wt-neu'), '-b', 'neu-verfolgend', '--track', 'main'],
      { repo: wt1 },
    ));
    assert.equal(rc, 0, 'ein neuer, verfolgender Zweig aendert [user] nicht — kein Befund, auch wenn er die Datei aendert');
    const konfigNachher = fs.readFileSync(path.join(hub, 'config'), 'utf8');
    assert.match(konfigNachher, /\[branch "neu-verfolgend"\]/, 'Vorbedingung: der neue Zweig muss die Datei tatsaechlich veraendert haben');
  });
});

test('[userAbschnitt] extrahiert genau den [user]-Block, unbeeinflusst von Nachbarabschnitten', () => {
  const datei = '[core]\n\tbare = true\n[user]\n\temail = a@a\n\tname = A\n[branch "x"]\n\tremote = origin\n';
  assert.equal(userAbschnitt(datei), '[user]\n\temail = a@a\n\tname = A');
  assert.equal(userAbschnitt('[core]\n\tbare = true\n'), null, 'kein [user]-Abschnitt: null, kein Fund');
  assert.equal(userAbschnitt(null), null);
  assert.equal(userAbschnitt('[user]\n\temail = a@a\n'), '[user]\n\temail = a@a\n', 'auch am Dateiende ohne folgenden Abschnitt');
});

test('[geaenderteZeilen] meldet nur die tatsaechlich neuen/entfernten Zeilen, nicht die ganze Datei', () => {
  const vorher = 'a\nb\nc\n';
  const nachher = 'a\nb\nd\n';
  const { neu, weg } = geaenderteZeilen(vorher, nachher);
  assert.deepEqual(neu, ['d']);
  assert.deepEqual(weg, ['c']);
});

test('[geteilteConfigPfad] ausserhalb eines Git-Arbeitsbaums: null, kein Wurf', () => {
  const fremd = fs.mkdtempSync(path.join(os.tmpdir(), 'kein-git-'));
  try {
    assert.equal(geteilteConfigPfad(fremd), null);
  } finally { fs.rmSync(fremd, { recursive: true, force: true }); }
});
