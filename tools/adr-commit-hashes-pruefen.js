#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ADR-Commit-Hash-Wächter — Zug 1, „Register-Reste" (12./13.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Anlass: eine Messung am 05.08.2026 (im Hub `vivodepot-hub-v2.git`, nicht
   diesem Repo) fand 38 von 91 Commit-Hash-Referenzen in `docs/adr/` tot —
   Ursache: Historien-Umschreibungen im Juli/August. Die Zeile trug „Rang 3,
   kein Prüfer heute" — ein SP-Vermerk, keine Entscheidung. Dieser Wächter ist
   der Prüfer.

   ANKER-PROBE, PFLICHT (Auftragsvorgabe, wortgleich benannt): am 05.08.2026
   lief eine frühere Messung in einem Worktree, in dem `git` nicht ansprechbar
   war, und meldete „92 von 92 tot" — eine Fehlkonfiguration, keine echte
   Zahl. Dieser Wächter prüft darum ZUERST einen bekannt gültigen Hash (den
   HEAD-Commit selbst) und BRICHT AB, wenn der nicht als gültig erkannt wird —
   sonst würde er, wie am 05.08., seine eigene Fehlkonfiguration als Befund
   melden.

   WAS ER TUT: sammelt jeden Backtick-umschlossenen 7-10-stelligen Hex-String
   in `docs/adr/*.md` — das ist die Form, in der der Haus-Stil Commit-Hashes
   durchgängig notiert (`**Commit:** \`hash\``, `**Kern-Commit:** \`hash\``,
   knappe INDEX-Form `(Kern \`hash\`, Suite \`hash\`)` OHNE das Wort „Commit"
   auf derselben Zeile — ein früherer, zeilenbasierter „commit"-Wortfilter
   maß darum nur 119 von tatsächlich ~200 Belegen, gemessen und verworfen).

   NICHT jeder so geformte Hex-String ist ein Commit-Hash — Zug-0-Messung fand
   sechs Fälle, die zufällig gleich aussehen: zwei Passwort-Beispiele
   (`12345678`/`aaaaaaaa`, ADR-027), zwei MD5-Dokument-Prüfsummen (ADR-066),
   ein SNOMED-Code (`91936005`, zweimal). Als benannte Ausnahmen unten
   geführt — NICHT durch Kontext-Raten, sondern durch den exakten Wert, damit
   ein neuer, echter Hash mit ähnlichem Zufallswert nie versehentlich mit
   ausgeschlossen wird.

   Aufruf:
     node tools/adr-commit-hashes-pruefen.js               → gegen docs/adr/
     node tools/adr-commit-hashes-pruefen.js --ordner <pfad>
     node tools/adr-commit-hashes-pruefen.js --json
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
const REPO = path.join(__dirname, '..');
const ORDNER = path.resolve(arg('ordner', path.join(REPO, 'docs', 'adr')));
const ALS_JSON = argv.includes('--json');

const HASH_MUSTER = /`([0-9a-f]{7,10})`/g;

/* Sehen aus wie Commit-Hashes, sind es nicht — Zug-0-Messung, per Hand geprüft.
   Nach WERT ausgeschlossen, nicht nach Kontext-Raten (§ Kommentar oben). */
const KEIN_COMMIT_HASH = new Map([
  ['12345678', 'Passwort-Beispiel, ADR-027'],
  ['aaaaaaaa', 'Passwort-Beispiel, ADR-027'],
  ['fc07cafe', 'MD5-Dokument-Prüfsumme, ADR-066'],
  ['60cb523b', 'MD5-Dokument-Prüfsumme, ADR-066 (+ INDEX-Spiegel)'],
  ['91936005', 'SNOMED-Code, ADR-087 (+ INDEX-Spiegel)'],
]);

function gitVerfuegbar() {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch (_) { return false; }
}

function hashGueltig(hash) {
  try {
    execFileSync('git', ['cat-file', '-e', hash + '^{commit}'], { cwd: REPO, stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch (_) { return false; }
}

function ankerProbe() {
  if (!gitVerfuegbar()) {
    throw new Error('ANKER-PROBE FEHLGESCHLAGEN: `git rev-parse --is-inside-work-tree` schlägt fehl — '
      + 'kein Git-Zugriff in ' + REPO + '. Genau der 05.08.2026-Fehlschlag (Worktree ohne Git-Zugriff, '
      + '„92 von 92 tot" gemeldet). ABBRUCH, keine Messung.');
  }
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO }).toString().trim().slice(0, 7);
  if (!hashGueltig(head)) {
    throw new Error('ANKER-PROBE FEHLGESCHLAGEN: der eigene HEAD-Commit (' + head + ') wird als UNGÜLTIG '
      + 'gemeldet — die Prüf-Methode selbst ist kaputt. ABBRUCH, keine Messung.');
  }
  return head;
}

function dateienRekursiv(ordner) {
  const raus = [];
  for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
    const voll = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) raus.push(...dateienRekursiv(voll));
    else if (eintrag.name.endsWith('.md')) raus.push(voll);
  }
  return raus;
}

/* Sammelt jeden Backtick-Hex-Beleg der richtigen Länge, ausser den namentlich
   ausgeschlossenen (KEIN_COMMIT_HASH). Kein Kontext-Filter (Begründung oben —
   der Haus-Stil nennt „Commit" nicht auf jeder Zeile, die einen trägt). */
function sammleHashBelege(dateiPfad) {
  const inhalt = fs.readFileSync(dateiPfad, 'utf8');
  const zeilen = inhalt.split('\n');
  const belege = [];
  zeilen.forEach((zeile, i) => {
    let m;
    HASH_MUSTER.lastIndex = 0;
    while ((m = HASH_MUSTER.exec(zeile))) {
      if (KEIN_COMMIT_HASH.has(m[1])) continue;
      belege.push({ datei: dateiPfad, zeile: i + 1, hash: m[1], kontext: zeile.trim().slice(0, 160) });
    }
  });
  return belege;
}

function main() {
  const ankerHash = ankerProbe();
  const dateien = dateienRekursiv(ORDNER);
  const alleBelege = dateien.flatMap(sammleHashBelege);
  const tot = alleBelege.filter((b) => !hashGueltig(b.hash));
  const gueltig = alleBelege.length - tot.length;

  if (ALS_JSON) {
    console.log(JSON.stringify({ ankerHash, gesamt: alleBelege.length, gueltig, tot: tot.length, totListe: tot }, null, 1));
    process.exitCode = tot.length > 0 ? 1 : 0;
    return;
  }
  console.error('Anker-Probe bestanden — HEAD-Commit (' + ankerHash + ') als gültig erkannt.');
  console.error('Commit-Hash-Belege in ' + path.relative(REPO, ORDNER) + ': ' + alleBelege.length
    + ' (' + gueltig + ' gültig, ' + tot.length + ' tot)');
  for (const b of tot) {
    console.error('  TOT  ' + path.relative(REPO, b.datei) + ':' + b.zeile + '  `' + b.hash + '`  — ' + b.kontext);
  }
  process.exitCode = tot.length > 0 ? 1 : 0;
}

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(e.message); process.exitCode = 2; }
}

module.exports = { sammleHashBelege, hashGueltig, ankerProbe, dateienRekursiv };
