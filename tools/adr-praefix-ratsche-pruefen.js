#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   adr-praefix-ratsche-pruefen.js — Ratsche gegen NEUE präfixlose ADR-Nummern:
   nur, was ein Commit/Push hinzufügt, nie der Bestand (17.09.2026, Auftrag)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: zwei disjunkte ADR-Nummernräume, unterschieden durch Präfix — `B16-ADR-NNN`
   (alte, eingefrorene Linie) und `U2-ADR-NNN` (aktive Linie), s. U2-ADR-090
   (Präfix- und Benennungsregel) — nennen bis heute 821 Fundstellen mit 142
   verschiedenen Nummern OHNE Präfix (Messung 17.09.2026,
   `adr-nummern-ohne-praefix-messung-2026-09-17.md`, VDM2/-89). Eine präfixlose
   Nummer ist NICHT auflösbar — B16 und U2 nummerieren unabhängig ab 1, und im
   Bereich 009–088 sind fast alle Nummern in beiden Linien belegt.

   DIESER BAU IST NICHT DIE BEREINIGUNG DER 821. Die kommt nach dem laufenden
   Schnitt (zwei Drittel liegen in `tests/`/`docs/adr/`, eine breite Umschreibung
   quer durch den Baum würde jetzt kollidieren). Dieser Bau ist die RATSCHE: der
   Bestand bleibt unberührt grün, nur eine NEUE Zeile mit präfixloser Nummer wird
   rot. Wörtlicher Spiegel von `tools/oeffentlicher-zuschnitt-spuren-pruefen.js`
   (das genauso mit internen Sitzungskürzeln verfährt) — GLEICHE BAUART (git-diff-
   Ratsche, nur hinzugefügte Zeilen, Token-Gegenrechnung gegen entfernte Zeilen
   derselben Datei, damit eine verschobene/umformulierte Altstelle nicht neu
   zählt), EIGENE, EIGENSTÄNDIGE DATEI — kein Eingriff in das bestehende,
   bereits in hooks/pre-push verdrahtete Werkzeug.

   DAS MUSTER IST VDM2s (-89), WÖRTLICH ÜBERNOMMEN, NICHT NEU ERFUNDEN — auf
   ausdrücklichen Auftrag hin, samt ihrer eigenen, bereits gefundenen Falle:
   ihre ERSTE Fassung war case-SENSITIV (`(?<!U2-)(?<!B16-)\bADR-0*\d{1,3}\b/g`)
   und schlug an `u2-adr-333` (Kleinschreibung, Dateinamenskonvention, z. B.
   `tests/textsatz-dokumentmodule-u2-adr-333.test.js`) fälschlich an, weil das
   Lookbehind `U2-` (groß) nicht gegen `u2-` (klein) matchte. Das `i`-Flag auf
   dem GANZEN Ausdruck macht auch die Lookbehinds selbst case-insensitiv (JS-
   Semantik) — DAS ist die Korrektur, nicht ein zweites, separates Lookbehind-
   Paar. Probe dieser genauen Falle steht unten im eigenen Test, nicht nur
   gelesen (Auflage 1).

   EIN ECHTER ALT-BEZUG BLEIBT SCHREIBBAR, OHNE SONDERWEG: `B16-ADR-NNN` ist
   die bereits bestehende, benannte Form (U2-ADR-090 §2) — vom negativen
   Lookbehind `(?<!b16-)` bereits selbst gedeckt. Eine neue Zeile, die
   `B16-ADR-015` schreibt, trifft das Muster gar nicht erst; nichts Zusätzliches
   nötig (Auflage 3, geprüft im eigenen Rot/Grün-Paar unten).

   VIER MODI, WIE BEIM VORBILD:
     node tools/adr-praefix-ratsche-pruefen.js                  Fixture (Rot erwartet)
     node tools/adr-praefix-ratsche-pruefen.js --refs < stdin   pre-push (git-Protokoll)
     node tools/adr-praefix-ratsche-pruefen.js --bereich A..B   beliebiger Bereich
     node tools/adr-praefix-ratsche-pruefen.js --arbeitsstand [--wurzel <pfad>] [--kanon <ref>]
        Vorfahr mit dem Kanon gegen den ARBEITSBAUM (samt Index) — für Suite/pre-commit,
        wörtlicher Spiegel der Begründung am Vorbild (dort Kopf-Kommentar).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

const REPO = path.join(__dirname, '..');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'adr-praefix-ratsche', 'push.diff');
const KANON = 'origin/u2-kanon';

// VDM2s Muster (Bericht `adr-nummern-ohne-praefix-messung-2026-09-17.md`), wörtlich: das
// `i`-Flag deckt Muster UND Lookbehinds gleichermaßen ab (JS-Semantik) — B16-ADR-.../
// U2-ADR-... werden in JEDER Schreibweise erkannt, nicht nur in Großschreibung.
function musterNeu() { return /(?<!u2-)(?<!b16-)\bADR-0*\d{1,3}\b/gi; }

/* Die präfixlosen Treffer einer Zeile, normiert (Großschreibung, führende Nullen weg) —
   normiert, damit "ADR-039" und "Adr-039" und "ADR-0039" als DASSELBE Token gelten und eine
   Altstelle, die nur in Schreibweise geändert wird, nicht als neu zählt (dieselbe Vorsicht
   wie beim Vorbild, das seine Etiketten ebenfalls normiert, s. dessen `tokens()`). */
/* Ein Dateipfad ist kein ADR-Verweis (23.09.2026): `tests/adr-263-pdf-schriftdeckung.test.js` nennt eine Datei, deren Name
   eine alte Nummer trägt. Token in Pfadform — mit „/" und auf .js/.mjs/.json/.md endend — zählen darum nirgends; eine
   präfixlose Nummer außerhalb eines Pfads bleibt überall rot. */
const TOKEN = /[^\s"'`()<>\[\]]+/g;
function _pfadeAusblenden(zeile) {
  return zeile.replace(TOKEN, (tok) => (tok.includes('/') && /\.(?:mjs|json|js|md)[.,;:]*$/i.test(tok) ? ' '.repeat(tok.length) : tok));
}
function treffer(zeile) {
  const raus = [];
  const g = musterNeu();
  zeile = _pfadeAusblenden(zeile);
  let m;
  while ((m = g.exec(zeile)) !== null) {
    const ziffern = String(Number(m[0].slice(4).replace(/^0+/, '') || '0'));
    raus.push('ADR-' + ziffern);
  }
  return raus;
}

/* Der Wächter selbst, seine Rot-Beweise und sein gepflanzter Zuwachs — wörtlicher Spiegel der
   gleichnamigen Einträge in tools/lib/oeffentlicher-zuschnitt-ausnahmen.js (dort z. B.
   'tests/fixtures/interne-sitzungskuerzel/', Grund „gepflanzte Positivkontrollen des
   Wächters"). GEMESSEN, NICHT VERMUTET: ohne diese Ausnahme meldet der eigene --arbeitsstand-
   Lauf sich selbst rot, sobald diese drei Pfade committet sind — die eigenen Testzeilen
   SCHREIBEN absichtlich Beispiele wie "ADR-039" als Zeichenkette, damit `treffer()` etwas zu
   finden hat. Das Vorbild löst denselben Widerspruch für Sitzungskürzel über eine
   String-Verkettung im Testkopf (`K = 'KOOR' + 'D5'`) UND eine Datei-Ausnahmeliste zugleich —
   hier reicht die Ausnahmeliste allein, weil auch die Fixture (reiner Text, keine Verkettung
   möglich) denselben Schutz braucht. */
const IGNORIERTE_PFADE = Object.freeze([
  { praefix: 'tools/adr-praefix-ratsche-pruefen.js', grund: 'der Wächter selbst: Muster und Beispiele im Kopfkommentar' },
  { praefix: 'tests/adr-praefix-ratsche-pruefen.test.js', grund: 'Rot-Beweise des Wächters' },
  { praefix: 'tests/fixtures/adr-praefix-ratsche/', grund: 'gepflanzter Zuwachs für den Rot-Beweis' },
  { praefix: 'tools/befund-ratsche.json', grund: 'die Kennungen sind Dateinamen interner Berichte; die ADR-Nummer steht im Namen, ist kein Verweis auf ein ADR' },
]);
function istAusgenommen(datei) {
  return IGNORIERTE_PFADE.some((a) => datei.startsWith(a.praefix));
}

/* Reine Auswertung eines `git diff -U0 -M`-Textes — wörtlicher Spiegel der gleichnamigen
   Funktion im Vorbild (tools/oeffentlicher-zuschnitt-spuren-pruefen.js): Token der ENTFERNTEN
   Zeilen je Datei zählen, ein Token einer hinzugefügten Zeile, das dort schon stand, ist keine
   neue Spur (verschobene/umformulierte Altstelle). */
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
      const t = topf(datei && datei !== '/dev/null' ? datei : alteDatei);
      for (const x of treffer(roh.slice(1))) t.set(x, (t.get(x) || 0) + 1);
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

// GIT_* gestrippt (19.09.2026): sonst gewinnt ein im Hook gesetztes GIT_DIR gegen `cwd`,
// und `--wurzel <wegwerf-ordner>` liest still das echte Repo statt des übergebenen.
function git(args, cwd = REPO) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung(), maxBuffer: 256 * 1024 * 1024 });
}

// Wörtlicher Spiegel der gleichnamigen Funktionen im Vorbild — Rebase-Fang: ein alter
// Remote-Stand, der kein Vorfahr des lokalen mehr ist, ersetzt sich durch den Vorfahr mit dem
// Kanon, sonst erschienen die neu untergezogenen Commits anderer als Zuwachs dieses Pushes.
function istVorfahr(a, b) {
  try { git(['merge-base', '--is-ancestor', a, b]); return true; } catch (_) { return false; }
}
function basisFuer(lokalSha, remoteSha) {
  if (!/^0+$/.test(remoteSha) && istVorfahr(remoteSha, lokalSha)) return remoteSha;
  return git(['merge-base', lokalSha, KANON]).trim();
}
function bereichPruefen(basis, spitze, wurzel = REPO) {
  return neueFunde(git(['diff', '-U0', '-M', '--no-color', basis, spitze], wurzel));
}
function arbeitsstandPruefen(wurzel = REPO, kanon = KANON) {
  const basis = git(['merge-base', 'HEAD', kanon], wurzel).trim();
  return neueFunde(git(['diff', '-U0', '-M', '--no-color', basis], wurzel));
}

function melden(funde, etikett) {
  if (!funde.length) {
    console.log(`[adr-praefix-ratsche] grün — ${etikett}: keine neue Zeile mit präfixloser ADR-Nummer.`);
    return 0;
  }
  console.error(`[adr-praefix-ratsche] ROT — ${etikett}: ${funde.length} neue Zeile(n) mit präfixloser ADR-Nummer:`);
  for (const f of funde) console.error(`  ${f.datei}:${f.zeile}  [${f.treffer.join(', ')}]  ${f.text.trim().slice(0, 140)}`);
  console.error('  Präfix ergänzen — U2-ADR-NNN für die aktive Linie, B16-ADR-NNN für einen echten '
    + 'Alt-Bezug (U2-ADR-090 §2). Präfixlos ist nicht auflösbar: B16 und U2 nummerieren unabhängig ab 1.');
  return 1;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--refs')) {
    const roh = fs.readFileSync(0, 'utf8').trim();
    if (!roh) { console.log('[adr-praefix-ratsche] nichts zu pushen'); return 0; }
    let rot = 0;
    for (const zeile of roh.split('\n').filter(Boolean)) {
      const [lokalRef, lokalSha, , remoteSha] = zeile.split(/\s+/);
      if (/^0+$/.test(lokalSha)) continue;
      try {
        rot |= melden(bereichPruefen(basisFuer(lokalSha, remoteSha), lokalSha), lokalRef);
      } catch (e) {
        console.error(`[adr-praefix-ratsche] ROT — Messung fehlgeschlagen für ${lokalRef}: ${e.message.split('\n')[0]}`);
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

module.exports = { _pfadeAusblenden, neueFunde, treffer, musterNeu, basisFuer, arbeitsstandPruefen, istAusgenommen, FIXTURE };
