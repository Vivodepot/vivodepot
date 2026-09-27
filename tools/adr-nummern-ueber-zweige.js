#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   adr-nummern-ueber-zweige.js — ADR-Nummern gegen ALLE Zweige, nicht nur den eigenen Baum
   (ADRN-Auftrag, 19.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS: die Doppelvergabe U2-ADR-347 wurde an einem Baum gelöst, der nur sich selbst
   sah — die gewählte Ersatznummer 418 lag auf einem anderen Zweig längst an eine ANDERE ADR
   vergeben, und derselbe Fall war auf einem dritten Zweig schon als 419 gelöst. Jede
   Prüfung im Baum (`tools/adr-bestand-pruefen.js`) sieht das nicht: zwei Zweige, je für
   sich eindeutig, kollidieren erst beim Zusammenführen.

   WAS DAS WERKZEUG TUT:
     --naechste                 die nächste freie Nummer: höchste vergebene Nummer über
                                alle lokalen Zweige (`git for-each-ref`), Remote-Refs und
                                den eigenen Arbeitsbaum (auch UNCOMMITTETE Dateien) + 1
     --pruefe <pfad> …          beansprucht eine dieser ADR-Dateien eine Nummer, die auf
                                einem anderen Zweig eine ANDERE Datei trägt? (Exit 1)
     --pruefe-staged            dasselbe für die gestagten Neuzugänge/Umbenennungen
                                unter docs/adr/ — die Form für den pre-commit-Hook

   WAS ES BEWUSST NICHT IST: ein Reservierungsregister. Ein Register in einem Zweig hätte
   dasselbe Wettlauf-Problem eine Ebene tiefer. Es liest, was git über die anderen Zweige
   schon weiß — und sieht darum NICHT, was in einem anderen Arbeitsbaum noch uncommittet
   liegt oder auf einer anderen Maschine. Es verkleinert das Fenster, es schließt es nicht.

   WEN DER STOPP TRIFFT: nur den, der eine Nummer NEU beansprucht. Bestehende
   Doppelvergaben im eigenen Baum (347/398 bis zu ihrer Auflösung) bleiben Sache von
   `tools/adr-bestand-pruefen.js`; hier zählt nur, was der geprüfte Pfad selbst neu
   nimmt. Gleicher Pfad auf zwei Zweigen (dieselbe Umbenennung zweimal gemacht) ist
   KEINE Kollision — beide Seiten sind byte-gleich mergebar. Ein `-nachtrag-` teilt die
   Nummer seines Trägers und beansprucht sie darum nie.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
// Dieselbe Namensform wie tools/adr-bestand-pruefen.js#DATEINAME_MUSTER, mit dem Ordner davor.
const ADR_PFAD = /^docs\/adr\/vivodepot-U2-ADR-(\d{3}[a-z]?)(-nachtrag)?-.*-(\d{4}-\d{2}-\d{2})\.md$/i;

function git(args, cwd, { umgebung = 'bereinigt' } = {}) {
  return execFileSync('git', args, {
    cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    // Ref-Abfragen lesen Objekte, keinen Index — die Hook-Umgebung stört dort nur (GIT_DIR
    // zeigt aus einem fremden Wegwerf-Repo weg). Einzige Ausnahme: gestagte Dateien, s. u.
    env: umgebung === 'bereinigt' ? ohneGitUmgebung() : process.env,
  });
}

function adrEintrag(pfad) {
  const m = pfad.match(ADR_PFAD);
  if (!m) return null;
  return { pfad, nummer: m[1], zahl: parseInt(m[1], 10), istNachtrag: !!m[2] };
}

/* Alle Refs, gruppiert nach dem `docs/adr`-Tree, auf den sie zeigen. Hunderte Refs teilen sich
   wenige verschiedene ADR-Trees (gemessen 19.09.2026: 936 Refs, 245 Trees) — je Tree wird
   EINMAL gelesen, und die Tree-Hashes aller Refs holt EIN `cat-file --batch-check`-Aufruf. */
function refsNachAdrTree(cwd, muster = ['refs/heads', 'refs/remotes']) {
  const zeilen = git(['for-each-ref', '--format=%(objectname) %(refname)', ...muster], cwd)
    .split('\n').filter(Boolean).map((z) => z.split(' '));
  if (!zeilen.length) return new Map();
  const abfrage = zeilen.map(([sha]) => sha + ':docs/adr').join('\n') + '\n';
  const antworten = execFileSync('git', ['cat-file', '--batch-check'], {
    cwd, input: abfrage, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 64 * 1024 * 1024,
  }).split('\n');
  const jeTree = new Map();
  zeilen.forEach(([, ref], i) => {
    const [treeSha, art] = (antworten[i] || '').split(' ');
    if (art !== 'tree') return; // Zweig ohne docs/adr
    if (!jeTree.has(treeSha)) jeTree.set(treeSha, []);
    jeTree.get(treeSha).push(ref);
  });
  return jeTree;
}

function adrDateienAufTree(treeSha, cwd) {
  return git(['ls-tree', '-r', '--name-only', treeSha], cwd)
    .split('\n').filter(Boolean).map((f) => adrEintrag('docs/adr/' + f)).filter(Boolean);
}

function adrDateienImArbeitsbaum(cwd) {
  const verz = path.join(cwd, 'docs', 'adr');
  if (!fs.existsSync(verz)) return [];
  return fs.readdirSync(verz).map((f) => adrEintrag('docs/adr/' + f)).filter(Boolean);
}

/* nummer → Map(pfad → Refs, auf denen die Datei liegt). Der Arbeitsbaum zählt als Ref
   'ARBEITSBAUM', damit uncommittete eigene Dateien mitgesehen werden. */
function nummernAllerZweige(cwd = REPO, muster) {
  const jeNummer = new Map();
  const eintragen = (e, ref) => {
    if (!jeNummer.has(e.zahl)) jeNummer.set(e.zahl, new Map());
    const dateien = jeNummer.get(e.zahl);
    if (!dateien.has(e.pfad)) dateien.set(e.pfad, { eintrag: e, refs: [] });
    dateien.get(e.pfad).refs.push(ref);
  };
  for (const [treeSha, refs] of refsNachAdrTree(cwd, muster)) {
    for (const e of adrDateienAufTree(treeSha, cwd)) for (const r of refs) eintragen(e, r);
  }
  for (const e of adrDateienImArbeitsbaum(cwd)) eintragen(e, 'ARBEITSBAUM');
  return jeNummer;
}

function hoechsteNummerUeberAlleZweige(cwd = REPO, muster) {
  const nummern = [...nummernAllerZweige(cwd, muster).keys()];
  return nummern.length ? Math.max(...nummern) : 0;
}

function naechsteFreieNummer(cwd = REPO, muster) {
  return String(hoechsteNummerUeberAlleZweige(cwd, muster) + 1).padStart(3, '0');
}

/* Welche der beanspruchten Pfade nehmen eine Nummer, die anderswo eine ANDERE (Nicht-
   Nachtrag-)Datei trägt? */
function kollisionen(beanspruchtePfade, cwd = REPO, muster) {
  const jeNummer = nummernAllerZweige(cwd, muster);
  const funde = [];
  for (const pfad of beanspruchtePfade) {
    const e = adrEintrag(pfad.split(path.sep).join('/'));
    if (!e || e.istNachtrag) continue;
    const dateien = jeNummer.get(e.zahl);
    if (!dateien) continue;
    const fremde = [...dateien.values()]
      .filter((d) => d.eintrag.pfad !== e.pfad && !d.eintrag.istNachtrag)
      .map((d) => ({ pfad: d.eintrag.pfad, refs: d.refs }));
    if (fremde.length) funde.push({ nummer: e.nummer, eigene: e.pfad, fremde });
  }
  return funde;
}

/* Gestagte Neuzugänge und Umbenennungsziele unter docs/adr/. HIER wird die Umgebung
   bewusst NICHT bereinigt: in einem pre-commit-Hook zeigt GIT_INDEX_FILE bei einem
   Teil-Commit auf den Index, der wirklich committet wird — der bereinigte Aufruf läse
   den falschen. */
function gestagteNeuzugaenge(cwd = REPO) {
  return git(['diff', '--cached', '--name-only', '--diff-filter=AR', '--', 'docs/adr/'], cwd, { umgebung: 'geerbt' })
    .split('\n').filter(Boolean);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--naechste')) {
    console.log(naechsteFreieNummer());
    return;
  }
  const pfade = argv.includes('--pruefe-staged')
    ? gestagteNeuzugaenge()
    : argv.includes('--pruefe') ? argv.filter((a) => !a.startsWith('--')) : null;
  if (!pfade) {
    console.error('Aufruf: --naechste | --pruefe <pfad> … | --pruefe-staged');
    process.exit(2);
  }
  if (!pfade.length) { console.log('ADR-Nummern über alle Zweige: keine neuen ADR-Dateien gestagt — nichts zu prüfen.'); return; }
  const funde = kollisionen(pfade);
  if (!funde.length) { console.log('ADR-Nummern über alle Zweige: keine Kollision (' + pfade.length + ' Pfad(e) geprüft).'); return; }
  for (const f of funde) {
    console.error('KOLLISION U2-ADR-' + f.nummer + ': ' + f.eigene);
    for (const x of f.fremde) console.error('   trägt anderswo: ' + x.pfad + '  [' + x.refs.join(', ') + ']');
  }
  console.error('Nächste freie Nummer über alle Zweige: U2-ADR-' + naechsteFreieNummer());
  process.exit(1);
}

if (require.main === module) main();
module.exports = {
  nummernAllerZweige, hoechsteNummerUeberAlleZweige, naechsteFreieNummer, kollisionen,
  gestagteNeuzugaenge, ADR_PFAD,
};
