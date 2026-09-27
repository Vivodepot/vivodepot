'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter über den Wächter — `istEigenesRepo()`
   ────────────────────────────────────────────────────────────────────────
   WARUM DIESE STUFE HIER GERECHTFERTIGT IST. Der Filter lautet: eine Prüfung
   des Prüfers lohnt, wenn der Prüfer eine EINBAHNSTRASSE bewacht. Dieser tut
   es zweimal mittelbar — er entscheidet, ob der Hooks-Wächter und die
   Lockstep-Positivkontrolle überhaupt messen. Liefert er fälschlich `false`,
   schweigt am Arbeitsplatz ein Push-Gate, und zwar lautlos: die Suite bliebe
   grün, die UNGEMESSEN-Zeile ginge im Rauschen unter, und nach dem Push ist
   nichts davon mehr zu korrigieren. Genau der Fall vom 27.07., als ein Gate
   nie lief und das weder am Commit noch am Test noch am Diff zu sehen war.

   ALLE DREI KONTROLLEN STELLEN IHRE UMGEBUNG SELBST HER. Die naheliegende
   Positivkontrolle wäre `istEigenesRepo(REPO) === true` — und sie wäre genau
   der Fehler, den dieser Helfer behebt: eine Behauptung über den ORT im
   Gewand einer Behauptung über die SACHE. Auf dem ausgepackten Stand wäre sie
   rot, ohne dass am Erkenner etwas falsch ist. Ein frisches `git init` ist
   dagegen überall ein Repo, und ein leeres Verzeichnis überall keins.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { istEigenesRepo } = require('./ist-eigenes-repo.js');

/** Ein frisches, vollständiges Repo — ohne Rückgriff auf das eigene. */
function frischesRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-eigenrepo-'));
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  execFileSync('git', ['init', '--quiet'], { cwd: tmp, stdio: 'pipe', env });
  return tmp;
}

test('[Eigenes-Repo·Positivkontrolle] die Wurzel eines frischen Repos gilt als eigenes Repo', () => {
  const tmp = frischesRepo();
  try {
    assert.equal(istEigenesRepo(tmp), true,
      'Sonst schweigen Hooks-Wächter und Lockstep-Positivkontrolle am Arbeitsplatz — ' +
      'ein Push-Gate, das niemand mehr laufen sieht.');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Eigenes-Repo·Negativkontrolle] ein Verzeichnis ohne Repo gilt NICHT als eigenes Repo', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-keinrepo-'));
  try {
    assert.equal(istEigenesRepo(tmp), false,
      'sonst wäre der Erkenner von einem, der immer „ja" sagt, nicht zu unterscheiden — ' +
      'und die zwei Wächter liefen auf dem ausgepackten Stand in ein Vakuum-Rot.');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('[Eigenes-Repo·Negativkontrolle] auch mit gesetztem GIT_DIR gilt ein fremdes Verzeichnis nicht als Repo', () => {
  /* DIE KONTROLLE, DIE DEN FEHLER GEFANGEN HAT — und der Grund, warum sie die
     Bedingung selbst herstellt statt sie vorzufinden.

     Git setzt seinen Hooks `GIT_DIR`. Mit gesetztem `GIT_DIR` und ohne
     `GIT_WORK_TREE` hält git das aktuelle Verzeichnis für den Arbeitsbaum, und
     `--show-toplevel` gibt es als seine eigene Wurzel zurueck: der Erkenner
     sagte im Hook zu JEDEM Verzeichnis „ja". Direkt aufgerufen war er gruen.

     Ohne diese Zeile haenge der Nachweis daran, ob die Suite gerade unter einem
     Hook laeuft — eine Behauptung ueber den Ort im Gewand einer Behauptung
     ueber die Sache, und beim naechsten Lauf ohne Hook waere sie fort. */
  const repo = frischesRepo();
  const fremd = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-fremd-'));
  const vorher = process.env.GIT_DIR;
  process.env.GIT_DIR = path.join(repo, '.git');
  try {
    assert.equal(istEigenesRepo(fremd), false,
      'sonst haelt der Erkenner unter jedem Git-Hook jedes Verzeichnis fuer ein Repo — ' +
      'und die zwei Waechter maessen dort, wo nichts ist.');
  } finally {
    if (vorher === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = vorher;
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(fremd, { recursive: true, force: true });
  }
});

test('[Eigenes-Repo·Negativkontrolle] ein UNTERverzeichnis eines Repos ist nicht dessen Wurzel', () => {
  /* Die scharfe Kontrolle. `existsSync('.git')` und ein blosses
     `git rev-parse` bestehen die zwei oberen Proben ebenfalls und fallen erst
     hier durch: git sucht seine Wurzel nach oben. Wird ein ausgepackter Stand
     versehentlich in einen Arbeitsbaum gelegt, mässen die zwei Wächter dann
     das UMGEBENDE Repo — grün, und über den falschen Gegenstand. */
  const tmp = frischesRepo();
  const drin = path.join(tmp, 'unterverzeichnis');
  fs.mkdirSync(drin);
  try {
    assert.equal(istEigenesRepo(drin), false,
      'sonst misst der Wächter das umgebende Repo statt des ausgepackten Standes.');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
