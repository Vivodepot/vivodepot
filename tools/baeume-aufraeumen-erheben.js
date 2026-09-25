'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Bäume-Aufräumen — Erhebung, kein Löschen
   ────────────────────────────────────────────────────────────────────────────
   „Aufräumen — 107 Zweige, 55 Arbeitsbäume" (10.09.2026).

   DIE REGEL, DIE ALLES ANDERE SCHLÄGT: ein fremder Arbeitsbaum wird NIE
   abgeräumt, auch wenn er leer aussieht. Am 08.09.2026 wurde ein
   fremder Baum gelöscht und damit fremde, ungesicherte Arbeit vernichtet — der
   Filter war „kein Prozess, sauberer Status, im Kanon enthalten", und das sind
   genau die Eigenschaften eines Baumes, in dem jemand gerade ANFÄNGT. Dieses
   Werkzeug LÖSCHT NICHTS. Es erhebt und schlägt drei Körbe vor; wer freigibt,
   entscheidet ein Mensch oder eine Sitzung, Baum für Baum.

   ZWEI HARTE AUFLAGEN AUS DEM AUFTRAG:
   1. Kein `git` IN einem fremden Arbeitsbaum (kein `-C <fremder-pfad>`, kein
      Hineinwechseln). Zweig-Fragen (voll im Kanon? wie viele Commits voraus?)
      laufen gegen das GETEILTE Objekt-Verzeichnis über die REFS, ausgeführt aus
      DIESEM Baum heraus — das berührt keine fremde Arbeitskopie. Fragen zum
      ARBEITSVERZEICHNIS selbst (ungetrackte/geänderte Dateien, Alter) laufen
      ausschließlich über das Dateisystem (`fs`), nie über `git status`.
   2. „Läuft da was" filtert auf `claude`, nicht auf `node` — gemessen (nicht
      angenommen): der `claude`-Prozess selbst wechselt sein Arbeitsverzeichnis
      NIE (jede Sitzung zeigt in `lsof` dieselbe Haupt-cwd, unabhängig vom
      Scratchpad-Baum, in dem sie tatsächlich arbeitet). Was tatsächlich in den
      Baum wechselt, sind ihre Kindprozesse (Bash-Aufrufe, `node --test`,
      Playwright). Ein bloßes `pgrep node` träfe darum jeden Test-Runner im
      System — sinnlos breit. Der Filter hier ist die praktisch tragfähige
      Lesart der Auflage: EIN system­weiter `lsof`-cwd-Schnappschuss, dagegen
      jeder Baumpfad geprüft — jeder Treffer stammt aus einem Scratchpad-Baum,
      den nichts außer einer Claude-Sitzung anlegt oder betritt.

   DIE DREI KÖRBE (Auftrag Punkt 3):
     sicher weg — Zweig vollständig im Kanon, kein Prozess, keine Anzeichen
                  ungetrackter Änderungen, letzte Dateiänderung vor heute.
     fraglich  — passt nicht sauber ins Muster (heute noch angefasst, Pfad
                 fehlt, o. ä.) — braucht einen zweiten Blick, kein Automatismus.
     Finger weg — trägt Commits, die der Kanon nicht hat, oder zeigt Anzeichen
                  ungetrackter Arbeit, oder ein Prozess läuft dort, oder es ist
                  der Hauptbaum selbst.
   Sicherungsrefs (`sicherung-*`) laufen NIE in einen der drei Körbe — eigene
   Liste, wie der Auftrag verlangt („gesondert ausweisen, nicht in einen Korb").

   Aufruf:
     node tools/baeume-aufraeumen-erheben.js             → Tabelle auf die Konsole
     node tools/baeume-aufraeumen-erheben.js --json      → maschinenlesbar
     node tools/baeume-aufraeumen-erheben.js --markdown  → Bericht-Tabelle (Markdown)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const KANON = 'u2-kanon';
const NOISE_DIRS = new Set(['node_modules', 'test-results', 'playwright-report', '.next', 'dist', 'build', 'coverage', '.cache', '.git']);

function git(args) {
  const r = spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}

function parseWorktreeList() {
  const r = git(['worktree', 'list', '--porcelain']);
  if (r.code !== 0) throw new Error('git worktree list fehlgeschlagen: ' + r.err);
  const bloecke = r.out.split(/\n\n+/).filter(Boolean);
  return bloecke.map((block) => {
    const zeilen = block.split('\n');
    const e = { pfad: null, head: null, branch: null, detached: false, bare: false };
    for (const z of zeilen) {
      if (z.startsWith('worktree ')) e.pfad = z.slice('worktree '.length);
      else if (z.startsWith('HEAD ')) e.head = z.slice('HEAD '.length);
      else if (z.startsWith('branch ')) e.branch = z.slice('branch refs/heads/'.length);
      else if (z === 'detached') e.detached = true;
      else if (z === 'bare') e.bare = true;
    }
    return e;
  });
}

function istSicherungsref(branch) {
  return typeof branch === 'string' && branch.startsWith('sicherung-');
}

// Voll im Kanon? Läuft gegen die REFS im geteilten Objekt-Verzeichnis, aus
// DIESEM Baum heraus — kein `-C` in den fremden Pfad, keine Arbeitskopie berührt.
function vollImKanon(ref) {
  const r = git(['merge-base', '--is-ancestor', ref, KANON]);
  return r.code === 0;
}

function commitsVorausVonKanon(ref) {
  const r = git(['rev-list', '--count', `${KANON}..${ref}`]);
  if (r.code !== 0) return null;
  return Number.parseInt(r.out, 10);
}

function kurzeCommitListeVoraus(ref, max = 5) {
  const r = git(['log', '--oneline', `-${max}`, `${KANON}..${ref}`]);
  if (r.code !== 0) return [];
  return r.out ? r.out.split('\n') : [];
}

// ── Dateisystem, NIE git ────────────────────────────────────────────────────
function alleDateienRekursiv(dir, raus) {
  let eintraege;
  try { eintraege = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
  for (const e of eintraege) {
    if (NOISE_DIRS.has(e.name)) continue;
    const voll = path.join(dir, e.name);
    if (e.isDirectory()) alleDateienRekursiv(voll, raus);
    else if (e.isFile()) raus.push(voll);
  }
}

function dateisystemBefund(baumPfad) {
  if (!fs.existsSync(baumPfad)) return { existiert: false };
  const dateien = [];
  alleDateienRekursiv(baumPfad, dateien);
  let neuesteMtimeMs = 0;
  for (const d of dateien) {
    try {
      const st = fs.statSync(d);
      if (st.mtimeMs > neuesteMtimeMs) neuesteMtimeMs = st.mtimeMs;
    } catch (_) { /* Datei zwischen readdir und stat verschwunden — ignorieren */ }
  }
  // Die `.git`-Verweisdatei jedes Arbeitsbaums entsteht bei `git worktree add`
  // und wird danach nicht mehr angefasst — brauchbare Checkout-Basislinie ohne
  // ein einziges `git`-Kommando gegen den fremden Baum.
  let checkoutBasisMs = null;
  try { checkoutBasisMs = fs.statSync(path.join(baumPfad, '.git')).mtimeMs; } catch (_) { /* kein .git? dann fraglich, s. u. */ }
  const moeglicherweiseGeaendert = checkoutBasisMs != null && neuesteMtimeMs > checkoutBasisMs + 5000;
  const alterTage = neuesteMtimeMs ? (Date.now() - neuesteMtimeMs) / 86400000 : null;
  const heute = new Date().toDateString();
  const letzteAenderungHeute = neuesteMtimeMs ? (new Date(neuesteMtimeMs).toDateString() === heute) : false;
  return { existiert: true, neuesteMtimeMs, checkoutBasisMs, moeglicherweiseGeaendert, alterTage, letzteAenderungHeute, anzahlDateien: dateien.length };
}

// ── Prozesse: EIN systemweiter lsof-cwd-Schnappschuss, dagegen jeder Pfad geprüft ──
function lsofCwdSchnappschuss() {
  const r = spawnSync('lsof', ['-d', 'cwd', '-Fn'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const cwds = [];
  if (r.status !== 0 && r.status !== 1) return cwds; // 1 = lsof meldet Zugriffslücken bei fremden PIDs, kein harter Fehler
  for (const zeile of (r.stdout || '').split('\n')) {
    if (zeile.startsWith('n')) cwds.push(zeile.slice(1));
  }
  return cwds;
}

function laeuftProzessAuf(baumPfad, cwds) {
  const normalisiert = baumPfad.replace(/\/+$/, '');
  return cwds.some((c) => c === normalisiert || c.startsWith(normalisiert + '/'));
}

function klassifizieren(eintrag) {
  if (eintrag.istHauptbaum) return { korb: 'Finger weg', grund: /\.git$/.test(eintrag.pfad) ? 'Repository-Speicher selbst (bare) — nie zur Wahl' : 'Hauptbaum — nie zur Wahl' };
  if (eintrag.istSicherung) return { korb: null, grund: 'Sicherungsref — eigene Liste, kein Korb' };
  if (!eintrag.fs.existiert) return { korb: 'fraglich', grund: 'Pfad im Dateisystem nicht (mehr) vorhanden — Worktree-Eintrag verwaist' };
  if (eintrag.prozessLaeuft) return { korb: 'Finger weg', grund: 'ein Prozess (Claude-Sitzung oder ihr Kind) läuft im Baum' };
  if (eintrag.vollImKanon === false) return { korb: 'Finger weg', grund: `trägt ${eintrag.aheadCount} Commit(s), die ${KANON} nicht hat` };
  if (eintrag.fs.moeglicherweiseGeaendert) return { korb: 'Finger weg', grund: 'Dateien nach dem Checkout angefasst (mtime > Checkout-Basis) — evtl. ungetrackte/geänderte Arbeit' };
  if (eintrag.fs.checkoutBasisMs == null) return { korb: 'fraglich', grund: 'keine `.git`-Verweisdatei gefunden — Checkout-Basis unbekannt' };
  if (eintrag.fs.letzteAenderungHeute) return { korb: 'fraglich', grund: 'heute noch angefasst (Datei-mtime) — voll im Kanon, aber zu frisch für „sicher"' };
  return { korb: 'sicher weg', grund: `voll im ${KANON}, kein Prozess, keine Änderung seit Checkout, letzte Änderung vor heute (${eintrag.fs.alterTage.toFixed(1)} Tage)` };
}

// Sicherungsrefs sind reine Branch-Zeiger, keine Arbeitsbäume — ein sicherung-*-Ref ohne
// eigenen Baum taucht in `git worktree list` nie auf. Eigene Erhebung, damit „gesondert
// ausweisen" (Auftrag Punkt 2) nicht nur die zufällig ausgecheckten trifft.
function alleSicherungsrefs() {
  const r = git(['for-each-ref', '--format=%(refname:short) %(objectname:short)', 'refs/heads/sicherung-*']);
  if (r.code !== 0 || !r.out) return [];
  return r.out.split('\n').map((z) => {
    const [branch, head] = z.split(' ');
    return { branch, head, aheadCount: commitsVorausVonKanon(branch) };
  });
}

function anzahlLokalerZweigeNichtInKanon() {
  const r = git(['branch', '--format=%(refname:short)']);
  if (r.code !== 0) return null;
  const zweige = r.out.split('\n').filter((z) => z && z !== KANON);
  let nichtInKanon = 0;
  for (const z of zweige) if (!vollImKanon(z)) nichtInKanon++;
  return nichtInKanon;
}

// Der EINE Hauptbaum: sein `.git` ist ein VERZEICHNIS (die echte Objekt-Verwaltung), jeder
// verlinkte Arbeitsbaum trägt dort nur eine gitlink-DATEI (ein Verweis, s. `dateisystemBefund`
// oben). Programmatisch ermittelt statt über den Pfad geraten — dieses Werkzeug läuft selbst
// aus einem beliebigen Scratchpad-Baum heraus (`REPO`/`__dirname`), der Aufrufort ist darum
// KEIN verlässliches Signal für „das ist der Hauptbaum".
function istHauptbaumPfad(pfad) {
  try { return fs.statSync(path.join(pfad, '.git')).isDirectory(); } catch (_) { return false; }
}

function erheben() {
  const worktrees = parseWorktreeList().filter((w) => !w.bare);
  const cwds = lsofCwdSchnappschuss();

  const ergebnis = worktrees.map((w) => {
    const branch = w.branch;
    const ref = branch || w.head;
    const istSicherung = istSicherungsref(branch);
    // Hauptbaum (`.git` ist ein Verzeichnis) ODER der bare Repository-Speicher selbst
    // (Namenskonvention `*.git` — enthält die Objekte aller Bäume, nie zur Wahl).
    const istHauptbaum = istHauptbaumPfad(w.pfad) || /\.git$/.test(w.pfad);
    const fsBefund = dateisystemBefund(w.pfad);
    const prozessLaeuft = fsBefund.existiert ? laeuftProzessAuf(w.pfad, cwds) : false;
    const vim = ref ? vollImKanon(ref) : null;
    const ahead = ref ? commitsVorausVonKanon(ref) : null;
    const aheadLog = ahead ? kurzeCommitListeVoraus(ref) : [];

    const eintrag = {
      pfad: w.pfad, branch: branch || '(detached)', head: (w.head || '').slice(0, 8),
      istSicherung, istHauptbaum, fs: fsBefund, prozessLaeuft,
      vollImKanon: vim, aheadCount: ahead, aheadLog,
    };
    const { korb, grund } = klassifizieren(eintrag);
    eintrag.korb = korb;
    eintrag.grund = grund;
    return eintrag;
  });

  return ergebnis;
}

function alsMarkdownTabelle(ergebnis) {
  const kopf = '| Pfad | Zweig | HEAD | voll in ' + KANON + ' | Commits voraus | Prozess | Alter (Tage) | Korb | Begründung |\n'
    + '|---|---|---|---|---|---|---|---|---|';
  const zeilen = ergebnis
    .filter((e) => !e.istSicherung)
    .map((e) => [
      e.pfad, e.branch, e.head,
      e.vollImKanon === null ? '—' : (e.vollImKanon ? 'ja' : 'NEIN'),
      e.aheadCount == null ? '—' : String(e.aheadCount),
      e.prozessLaeuft ? 'LÄUFT' : '—',
      e.fs.existiert ? (e.fs.alterTage == null ? '—' : e.fs.alterTage.toFixed(1)) : 'fehlt',
      e.korb, e.grund.replace(/\|/g, '\\|'),
    ].join(' | '));
  const sicherungen = ergebnis.filter((e) => e.istSicherung);
  const sicherungsTabelle = sicherungen.length
    ? '\n\n## Sicherungsrefs (gesondert, kein Korb)\n\n| Pfad | Zweig | HEAD | Commits voraus |\n|---|---|---|---|\n'
      + sicherungen.map((e) => `| ${e.pfad} | ${e.branch} | ${e.head} | ${e.aheadCount == null ? '—' : e.aheadCount} |`).join('\n')
    : '';
  return kopf + '\n' + zeilen.join('\n') + sicherungsTabelle;
}

function zusammenfassung(ergebnis) {
  const ohneSicherung = ergebnis.filter((e) => !e.istSicherung);
  const zaehlen = (korb) => ohneSicherung.filter((e) => e.korb === korb).length;
  return {
    arbeitsbaeume: ergebnis.length,
    sicherWeg: zaehlen('sicher weg'),
    fraglich: zaehlen('fraglich'),
    fingerWeg: zaehlen('Finger weg'),
    sicherungsrefs: ergebnis.filter((e) => e.istSicherung).length,
  };
}

function main() {
  const args = process.argv.slice(2);
  const ergebnis = erheben();
  const zsf = zusammenfassung(ergebnis);
  const sicherungsrefsGesamt = alleSicherungsrefs();
  const zweigeNichtInKanon = anzahlLokalerZweigeNichtInKanon();
  const voll = { zusammenfassung: { ...zsf, lokaleZweigeNichtInKanon: zweigeNichtInKanon }, baeume: ergebnis, sicherungsrefsGesamt };
  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(voll, null, 2) + '\n');
    return;
  }
  const sicherungsListe = sicherungsrefsGesamt.length
    ? '\n\n## Alle Sicherungsrefs im Bestand (unabhängig von einem Arbeitsbaum)\n\n| Zweig | HEAD | Commits voraus von ' + KANON + ' |\n|---|---|---|\n'
      + sicherungsrefsGesamt.map((s) => `| ${s.branch} | ${s.head} | ${s.aheadCount == null ? '—' : s.aheadCount} |`).join('\n')
    : '\n\nKeine Sicherungsrefs im Bestand.';
  if (args.includes('--markdown')) {
    process.stdout.write(alsMarkdownTabelle(ergebnis) + sicherungsListe + '\n');
    return;
  }
  console.log(`Arbeitsbäume: ${zsf.arbeitsbaeume} · sicher weg: ${zsf.sicherWeg} · fraglich: ${zsf.fraglich} · Finger weg: ${zsf.fingerWeg} · Sicherungsrefs (mit Baum): ${zsf.sicherungsrefs} · lokale Zweige nicht in ${KANON}: ${zweigeNichtInKanon}`);
  console.log('');
  console.log(alsMarkdownTabelle(ergebnis) + sicherungsListe);
}

if (require.main === module) main();

module.exports = { erheben, zusammenfassung, alsMarkdownTabelle, klassifizieren, istSicherungsref };
