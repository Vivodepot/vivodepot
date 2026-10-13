'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Die Quelle eines Baus ist ein benannter Commit, nicht ein Arbeitsbaum (11.10.2026).

   Ein Arbeitsbaum trägt mehr als seinen Commit: nicht getrackte und ignorierte Dateien, nicht committete Änderungen,
   Vorgemerktes. Ein Bau, der daraus liest, baut etwas, das kein Commit je war. Diese Datei ist die EINE Stelle, die aus
   einem Commit ein Verzeichnis macht (`git archive`, entpackt) und prüft, dass ein Verzeichnis genau der Inhalt eines
   Commits ist. Zwei Aufrufer: der Zuschnitt-Bau (echter Lauf in einem Verzeichnis mit `.git`) und die Prüfung der
   Quell-Tags vor einem Push.

   WELCHER CODE LÄUFT: der Aufrufer startet im entpackten Verzeichnis das Werkzeug DES COMMITS. Auswahl, Achsen und
   Erzeuger gehören zu dem Stand, der gebaut wird; ein neueres Werkzeug über einem älteren Commit ergäbe ein Ergebnis,
   das es so nie gab. Die Inhaltsprüfung dagegen läuft hier, im Code des Aufrufers, und hängt damit nicht am Alter des
   inneren Werkzeugs.

   Das Verzeichnis liegt unter os.tmpdir() (im Testlauf das eigene Laufverzeichnis) und wird geräumt, auch bei Abbruch.
   ═════════════════════════════════════════════════════════════════════════════ */
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./ohne-git-umgebung.js');

function git(args, cwd, extra = {}) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 256 * 1024 * 1024, ...extra });
}

/** Der volle Hash des Commits, den `stand` in `repo` benennt, oder null. */
function commitAufloesen(repo, stand) {
  if (!/^[0-9a-f]{7,40}$/.test(stand || '')) return null;
  const r = git(['rev-parse', '--verify', '-q', stand + '^{commit}'], repo);
  const hash = r.status === 0 ? r.stdout.trim() : '';
  return /^[0-9a-f]{40}$/.test(hash) ? hash : null;
}

/** Was der Commit trägt: Pfad → { modus, blob }. Wirft, wenn git es nicht sagt. */
function baumVon(repo, commit) {
  const r = git(['ls-tree', '-r', '-z', commit], repo);
  if (r.status !== 0) throw new Error('git ls-tree: ' + (r.stderr || '').trim());
  const baum = new Map();
  for (const z of r.stdout.split('\0').filter(Boolean)) {
    const m = /^(\d{6}) (\w+) ([0-9a-f]+)\t([\s\S]+)$/.exec(z);
    if (!m) throw new Error('git ls-tree: unlesbare Zeile ' + JSON.stringify(z.slice(0, 80)));
    baum.set(m[4], { modus: m[1], art: m[2], blob: m[3] });
  }
  return baum;
}

const blobHash = (inhalt) => crypto.createHash('sha1').update('blob ' + inhalt.length + '\0').update(inhalt).digest('hex');

/* Jede Datei des Verzeichnisses gegen den Commit: Menge in beide Richtungen, Inhalt (Blob-Hash), Ausführbar-Bit, Symlink.
   `node_modules` an der Wurzel zählt nicht (der Bestand eines entpackten Archivs lässt es ebenso aus). Ein Submodul im
   Commit ist immer eine Abweichung: ein Archiv trägt es nicht. Ergebnis: Liste benannter Abweichungen, leer = gleich. */
function inhaltGegenCommit(verzeichnis, repo, commit) {
  const baum = baumVon(repo, commit);
  const ab = [];
  const gesehen = new Set();
  const lauf = (rel) => {
    for (const e of fs.readdirSync(path.join(verzeichnis, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (!(rel === '' && e.name === 'node_modules')) lauf(r); continue; }
      gesehen.add(r);
      const soll = baum.get(r);
      if (!soll) { ab.push(r + ': liegt im Verzeichnis, nicht im Commit'); continue; }
      const abs = path.join(verzeichnis, r);
      if (soll.modus === '120000') {
        if (!e.isSymbolicLink()) ab.push(r + ': im Commit ein Symlink, im Verzeichnis nicht');
        else if (blobHash(Buffer.from(fs.readlinkSync(abs))) !== soll.blob) ab.push(r + ': Symlink zeigt anderswohin');
        continue;
      }
      if (e.isSymbolicLink() || !e.isFile()) { ab.push(r + ': im Commit eine Datei, im Verzeichnis nicht'); continue; }
      if (blobHash(fs.readFileSync(abs)) !== soll.blob) ab.push(r + ': anderer Inhalt');
      const ausfuehrbar = (fs.statSync(abs).mode & 0o111) !== 0;
      if (ausfuehrbar !== (soll.modus === '100755')) ab.push(r + ': Ausführbar-Bit ' + (ausfuehrbar ? 'gesetzt' : 'fehlt') + ', im Commit ' + soll.modus);
    }
  };
  lauf('');
  for (const [r, soll] of baum) {
    if (soll.art !== 'blob') ab.push(r + ': im Commit ' + soll.art + ' (' + soll.modus + '), ein Archiv trägt das nicht');
    else if (!gesehen.has(r)) ab.push(r + ': im Commit, fehlt im Verzeichnis');
  }
  return ab;
}

/** `git archive <commit>` nach `ziel` (leeres, vorhandenes Verzeichnis) entpacken. Wirft mit dem Grund. */
function archivEntpacken(repo, commit, ziel) {
  const tar = ziel + '.tar';
  try {
    let r = git(['archive', '--format=tar', '-o', tar, commit], repo);
    if (r.status !== 0) throw new Error('git archive: ' + (r.stderr || '').trim());
    r = spawnSync('tar', ['-xf', tar, '-C', ziel], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('tar: ' + (r.stderr || '').trim());
  } finally {
    fs.rmSync(tar, { force: true });
  }
}

/* Der eine Weg: Commit entpacken, gegen den Commit prüfen, `fn({ quelle, tmp })` laufen lassen, räumen.
   Geräumt wird im finally und, falls der Prozess vorher ein Signal bekommt, im Signal-Handler. */
function mitQuelleAusCommit(repo, commit, fn, { praefix = 'vd-quelle-aus-commit-' } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), praefix));
  const raeumen = () => fs.rmSync(tmp, { recursive: true, force: true });
  const beiSignal = (sig) => { raeumen(); process.kill(process.pid, sig); };
  const signale = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  const horcher = new Map(signale.map((s) => [s, () => { process.removeListener(s, horcher.get(s)); beiSignal(s); }]));
  for (const [s, h] of horcher) process.once(s, h);
  try {
    const quelle = path.join(tmp, 'quelle');
    fs.mkdirSync(quelle);
    archivEntpacken(repo, commit, quelle);
    const ab = inhaltGegenCommit(quelle, repo, commit);
    if (ab.length) throw new Error('das entpackte Archiv entspricht nicht dem Commit ' + commit.slice(0, 9) + ': ' + ab.slice(0, 5).join(' | '));
    return fn({ quelle, tmp });
  } finally {
    for (const [s, h] of horcher) process.removeListener(s, h);
    raeumen();
  }
}

module.exports = { commitAufloesen, baumVon, inhaltGegenCommit, archivEntpacken, mitQuelleAusCommit, blobHash };
