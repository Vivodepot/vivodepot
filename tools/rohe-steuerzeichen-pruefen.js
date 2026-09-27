#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rohe-steuerzeichen-pruefen.js — Ratsche gegen NEUE rohe Steuerzeichen in
   getrackten Dateien: nur, was ein Commit/Push hinzufügt, nie der Bestand
   (17.09.2026, Folge der Messung
   rohe-steuerzeichen-getrackte-dateien-2026-09-17.md)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: zwei rohe NUL-Bytes in einem Werkzeug gefunden — git stuft eine Datei
   mit NUL als binär ein, kein Diff, kein Review sieht die Stelle. Eine
   Nachmessung fand eine DRITTE Fundstelle derselben Fehlerklasse (ein rohes
   `0x1f` statt `\x1f`, `vivodepot-schluessel-teilen.html`), die git NICHT als
   binär einstuft — git-eigene Binär-Erkennung reagiert NUR auf NUL, nicht auf
   andere C0-/C1-Steuerzeichen. Eine Prüfung, die git fragt („ist die Datei
   binär?"), findet zwei von drei. DIESER WÄCHTER PRÜFT DARUM SELBST
   DEKODIERTE UNICODE-CODEPUNKTE, NICHT GITS BINÄRFLAGGE — `git diff -a`
   erzwingt einen textuellen Diff auch für Dateien, die git sonst als binär
   unterdrückt (gemessen: ohne `-a` zeigt `git diff` für eine NUL-tragende
   Datei „Binary files … differ", keine Zeile, nichts zu prüfen).

   WAS ALS „ROH" GILT: C0-Steuerzeichen (U+0000–U+001F) außer Tab/LF/CR
   (U+0009/U+000A/U+000D, gewöhnlicher Zeilenumbruch/Einzug) und C1-
   Steuerzeichen (U+0080–U+009F) — exakt der Bereich, den die Messung
   geprüft hat (DEL U+007F ausdrücklich NICHT Teil der Messung, darum auch
   nicht Teil dieses Wächters — der Wächter mißt, was gemessen wurde, erfindet
   keinen weiteren Umfang).

   BAUART: wörtlicher Spiegel von tools/adr-praefix-ratsche-pruefen.js/
   tools/oeffentlicher-zuschnitt-spuren-pruefen.js (git-diff-Ratsche: nur
   hinzugefügte Zeilen, Token-Gegenrechnung gegen entfernte Zeilen derselben
   Datei, damit eine verschobene/umformulierte Altstelle nicht neu zählt) —
   eigenständige neue Datei, kein Eingriff an den bestehenden Werkzeugen.

   VIER MODI, WIE BEI DEN VORBILDERN:
     node tools/rohe-steuerzeichen-pruefen.js                  Fixture (Rot erwartet)
     node tools/rohe-steuerzeichen-pruefen.js --refs < stdin   pre-push (git-Protokoll)
     node tools/rohe-steuerzeichen-pruefen.js --bereich A..B   beliebiger Bereich
     node tools/rohe-steuerzeichen-pruefen.js --arbeitsstand [--wurzel <pfad>] [--kanon <ref>]
        Vorfahr mit dem Kanon gegen den ARBEITSBAUM (samt Index) — für Suite/pre-commit.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'rohe-steuerzeichen', 'push.diff');
const KANON = 'origin/u2-kanon';

/* Erwartete Binärformate nach Endung — aus der Messung wörtlich übernommen (Bericht,
   Kopf: „außer erwarteten Binärformaten (Bilder, Fonts, PDF, Audio, Video, Archive —
   nach Endung)"). `git diff -a` erzwingt zwar einen Text-Diff auch für diese Dateien, aber
   ein echtes Bild/eine echte Schrift/ein echtes PDF trägt sinnvollerweise KEINE Codepunkt-
   Prüfung — sie bestehen strukturell aus Bytes, die als „Steuerzeichen" mißverstanden
   würden, ohne ein Fund zu sein (dieselbe Lehre wie der erste, verworfene Meßversuch). */
const BINAER_ENDUNGEN = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.svg', '.pgm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm',
  '.zip', '.tar', '.gz', '.7z',
]);

/* Namentliche Ausnahmen, JE EINTRAG MIT EIGENEM GRUND — keine Endungs- oder Ordner-
   Pauschale. Übernommen aus dem Meßbericht, mit dessen eigener
   Abgrenzung, nicht neu erfunden. */
const AUSNAHMEN = new Map([
  // Klasse C — eigenes, dokumentiertes Binärformat (U2-ADR-043): `VIVODEPOT\x01`-
  // Magic-Byte-Header. Kein Fehler, sondern das Format selbst.
  ['tests/fixtures/v515-ohne-auszuege/depot-v515-ohne-auszuege.vivodepot',
    'U2-ADR-043: VIVODEPOT\\x01-Magic-Byte-Header, dokumentiertes .vivodepot-Dateiformat, kein Fund.'],
  ['tests/fixtures/vorfuehrung-zugang-zum-recht/demo-de.vivodepot',
    'U2-ADR-043: VIVODEPOT\\x01-Magic-Byte-Header, dokumentiertes .vivodepot-Dateiformat, kein Fund.'],
  ['tests/fixtures/vorfuehrung-zugang-zum-recht/demo-en.vivodepot',
    'U2-ADR-043: VIVODEPOT\\x01-Magic-Byte-Header, dokumentiertes .vivodepot-Dateiformat, kein Fund.'],
  // Klasse D — Steuerzeichen aus PDF-Textextraktion amtlicher Formulare (0x83 Bullet-
  // Artefakt, 0x08/0x0c/0x07 Fett-Overstrike/Seitenwechsel). UNGEPRÜFT, ob es wirklich
  // wortgetreuer amtlicher Text ist (Meßbericht, §„Nicht gemessen") — nur Muster/Zweck sprechen
  // dafür. Als benannte Unsicherheit geführt, nicht als geklärt.
  ['docs/template-generator/basistemplate-inhalte.json',
    'vermutlich PDF-Extraktionsartefakt aus amtlichem Formulartext (Bullet-/Overstrike-Steuerzeichen) — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/vor-umzug-a4-standard-vorlagen.json',
    'vermutlich PDF-Extraktionsartefakt aus amtlichem Formulartext, dieselben Fundstellen wie basistemplate-inhalte.json — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/render-aufnahme/befuellt__advanceCare.html',
    'vermutlich PDF-Extraktionsartefakt aus amtlichem Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/render-aufnahme/leer__advanceCare.html',
    'vermutlich PDF-Extraktionsartefakt aus amtlichem Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/v515-grundlinie/befuellt__vorsorge.html',
    'vermutlich PDF-Extraktionsartefakt aus amtlichem Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/v515-grundlinie/leer__vorsorge.html',
    'vermutlich PDF-Extraktionsartefakt aus amtlichem Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/bmj/betreuungsverfuegung-deutsch-englisch.txt',
    'vermutlich PDF-Extraktionsartefakt aus dem amtlichen BMJ-Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/bmj/organspendeausweis-bzga-stream.txt',
    'vermutlich PDF-Extraktionsartefakt aus dem amtlichen BZgA-Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/bmj/patientenverfuegung-textbausteine.txt',
    'vermutlich PDF-Extraktionsartefakt aus dem amtlichen BMJ-Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  ['tests/fixtures/bmj/vorsorgevollmacht-deutsch-englisch.txt',
    'vermutlich PDF-Extraktionsartefakt aus dem amtlichen BMJ-Formulartext — NICHT gegen die Original-PDF geprüft, offene Frage.'],
  // Klasse B — vermutlich bewusster Fuzzing-Payload (kaputter Unicode-Test-String,
  // wörtlich "binärmüll"), kein Fund.
  ['tests/g3-fuzzing-importparser.test.js',
    'ein rohes NUL ist Teil eines absichtlich kaputten Unicode-Fuzzing-Test-Strings ("binärmüll") — kein Fund, Fuzzing-Payload.'],
  // Eigene Fixture dieses Wächters: die rohen 0x1f darin sind absichtliche Testdaten
  // (Rot-Beweis, Bestandsschutz), kein Fund — derselbe Fall wie der Fuzzing-Payload oben.
  ['tests/fixtures/rohe-steuerzeichen/push.diff',
    'Fixture-Diff der eigenen Ratsche — die rohen 0x1f darin sind absichtliche Testdaten, kein Fund.'],
]);

/* C0 (U+0000–U+001F) ohne Tab/LF/CR, plus C1 (U+0080–U+009F) — exakt der Meßbereich.
   Codepunkte, NICHT Bytes: die erste Fassung der Messung selbst prüfte rohe Bytes und
   verwechselte UTF-8-Folgebytes (0x80–0xBF) jedes Umlauts/Gedankenstrichs mit einem C1-
   Steuerzeichen — 2485 von 2621 Dateien "trafen", unbrauchbar. Diese Funktion bekommt
   darum immer bereits als JS-String dekodierten Text, nie einen rohen Buffer. */
function istRohesSteuerzeichen(codePoint) {
  if (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d) return false;
  if (codePoint <= 0x1f) return true;
  if (codePoint >= 0x80 && codePoint <= 0x9f) return true;
  return false;
}

function treffer(zeile) {
  const raus = [];
  for (const ch of zeile) {
    const cp = ch.codePointAt(0);
    if (istRohesSteuerzeichen(cp)) raus.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
  }
  return raus;
}

function istAusgenommen(datei) {
  if (AUSNAHMEN.has(datei)) return true;
  const ext = path.extname(datei).toLowerCase();
  return BINAER_ENDUNGEN.has(ext);
}

/* Reine Auswertung eines `git diff -a -U0 -M`-Textes — wörtlicher Spiegel der gleichnamigen
   Funktion im Vorbild: Token (hier: gefundene Codepunkte) der ENTFERNTEN Zeilen je Datei
   zählen, ein Token einer hinzugefügten Zeile, das dort schon stand, ist keine neue Spur
   (verschobene/umformulierte Altstelle). */
function neueFunde(diffText) {
  const hinzu = [];
  const entfernt = new Map();
  let datei = null;
  let alteDatei = null;
  let zeileNeu = 0;
  const topf = (d) => { if (!entfernt.has(d)) entfernt.set(d, new Map()); return entfernt.get(d); };
  for (const roh of diffText.split('\n')) {
    if (roh.startsWith('--- ')) { alteDatei = roh.slice(4).replace(/^a\//, ''); continue; }
    if (roh.startsWith('+++ ')) { datei = roh.slice(4).replace(/^b\//, ''); continue; }
    const kopf = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(roh);
    if (kopf) { zeileNeu = Number(kopf[1]); continue; }
    if (roh.startsWith('-')) {
      const d = datei && datei !== '/dev/null' ? datei : alteDatei;
      if (!istAusgenommen(d)) {
        const t = topf(d);
        for (const x of treffer(roh.slice(1))) t.set(x, (t.get(x) || 0) + 1);
      }
      continue;
    }
    if (roh.startsWith('+') && datei && datei !== '/dev/null') {
      hinzu.push({ datei, zeile: zeileNeu, text: roh.slice(1) });
      zeileNeu += 1;
    }
  }
  const funde = [];
  for (const h of hinzu) {
    if (istAusgenommen(h.datei)) continue;
    const t = topf(h.datei);
    const neu = treffer(h.text).filter((x) => {
      if ((t.get(x) || 0) > 0) { t.set(x, t.get(x) - 1); return false; }
      return true;
    });
    if (!neu.length) continue;
    funde.push({ ...h, treffer: [...new Set(neu)] });
  }
  return funde;
}

function git(args, cwd = REPO) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

// Wörtlicher Spiegel der gleichnamigen Funktionen in den Vorbild-Wächtern — Rebase-Fang: ein
// alter Remote-Stand, der kein Vorfahr des lokalen mehr ist, ersetzt sich durch den Vorfahr
// mit dem Kanon, sonst erschienen die neu untergezogenen Commits anderer als Zuwachs.
function istVorfahr(a, b) {
  try { git(['merge-base', '--is-ancestor', a, b]); return true; } catch (_) { return false; }
}
function basisFuer(lokalSha, remoteSha) {
  if (!/^0+$/.test(remoteSha) && istVorfahr(remoteSha, lokalSha)) return remoteSha;
  return git(['merge-base', lokalSha, KANON]).trim();
}
// `-a` (== `--text`): erzwingt einen textuellen Diff, auch für Dateien, die git sonst wegen
// eines rohen NUL-Bytes als binär unterdrückt — DAS ist der Kern dieses Wächters, s. Kopf.
function bereichPruefen(basis, spitze, wurzel = REPO) {
  return neueFunde(git(['diff', '-a', '-U0', '-M', '--no-color', basis, spitze], wurzel));
}
function arbeitsstandPruefen(wurzel = REPO, kanon = KANON) {
  const basis = git(['merge-base', 'HEAD', kanon], wurzel).trim();
  return neueFunde(git(['diff', '-a', '-U0', '-M', '--no-color', basis], wurzel));
}

function melden(funde, etikett) {
  if (!funde.length) {
    console.log(`[rohe-steuerzeichen] grün — ${etikett}: keine neue Zeile mit rohem Steuerzeichen.`);
    return 0;
  }
  console.error(`[rohe-steuerzeichen] ROT — ${etikett}: ${funde.length} neue Zeile(n) mit rohem Steuerzeichen:`);
  for (const f of funde) console.error(`  ${f.datei}:${f.zeile}  [${f.treffer.join(', ')}]  ${f.text.trim().slice(0, 140)}`);
  console.error('  Escape statt Rohbyte schreiben (z. B. \\x1f, \\x00) — ein rohes Steuerzeichen im Quelltext');
  console.error('  ist für Diff/Review unsichtbar oder macht die Datei für git binär (kein Diff mehr).');
  return 1;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--refs')) {
    const roh = fs.readFileSync(0, 'utf8').trim();
    if (!roh) { console.log('[rohe-steuerzeichen] nichts zu pushen'); return 0; }
    let rot = 0;
    for (const zeile of roh.split('\n').filter(Boolean)) {
      const [lokalRef, lokalSha, , remoteSha] = zeile.split(/\s+/);
      if (/^0+$/.test(lokalSha)) continue;
      try {
        rot |= melden(bereichPruefen(basisFuer(lokalSha, remoteSha), lokalSha), lokalRef);
      } catch (e) {
        console.error(`[rohe-steuerzeichen] ROT — Messung fehlgeschlagen für ${lokalRef}: ${e.message.split('\n')[0]}`);
        rot = 1;
      }
    }
    return rot;
  }
  if (argv.includes('--arbeitsstand')) {
    const arg = (n) => { const k = argv.indexOf(n); return k >= 0 ? argv[k + 1] : null; };
    return melden(arbeitsstandPruefen(arg('--wurzel') ? path.resolve(arg('--wurzel')) : REPO, arg('--kanon') || KANON), 'Arbeitsstand');
  }
  const i = argv.indexOf('--bereich');
  if (i >= 0) {
    const [a, b] = argv[i + 1].split('..');
    const spitze = b || 'HEAD';
    const w = argv.indexOf('--wurzel') >= 0 ? path.resolve(argv[argv.indexOf('--wurzel') + 1]) : REPO;
    return melden(bereichPruefen(git(['merge-base', a, spitze], w).trim(), spitze, w), argv[i + 1]);
  }
  return melden(neueFunde(fs.readFileSync(FIXTURE, 'utf8')), 'Fixture');
}

if (require.main === module) process.exit(main());

module.exports = { neueFunde, treffer, istRohesSteuerzeichen, istAusgenommen, basisFuer, arbeitsstandPruefen, AUSNAHMEN, FIXTURE };
