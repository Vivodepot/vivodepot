#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klasse-B-Wächter — keine E2E-Spec liefert/lädt die ROHE vivodepot.html
   ────────────────────────────────────────────────────────────────────────
   Auftrag (19.09.2026, im Zug der 37-rote-Proben-Klassifizierung
   e2e-37-rote-klassen-2026-09-19.md): „Keine E2E-Spec und kein Test-Server
   darf die rohe vivodepot.html ausliefern oder laden, außer die Spec
   erklärt sich ausdrücklich als Gerüst-Test (Positivliste)."

   WARUM DAS ÜBERHAUPT EIN FUND WAR (Schnitt-Nachtrag 18.09.2026, s. Kopf-
   Kommentar tests/e2e/helpers.js): seit BUERGERMODUL_BUENDEL aus dem Kern
   entfernt ist, trägt die rohe Datei KEINE nativen Bereiche mehr
   (bereicheAlle()===0, gewollt) — eine Spec, die sie unbesehen lädt, prüft
   ein bereichsloses Gerüst statt eines Produkts. Gemessen an diesem Tag:
   200 von 423 E2E-Proben rot, praktisch alle an einem fehlenden Sektor.
   Zwei eigene Funde in genau dieser Sitzung bestätigen die Klasse: (a)
   u2-adr-224-boot-read-absicherung.spec.js servierte über ihren eigenen
   Lokalserver `path.join(REPO_ROOT, 'vivodepot.html')` — Fix hier bereits
   eingearbeitet: GEBACKENE_PRODUKT_PFADE['privat-de'] statt der rohen Datei.

   WAS DIESER WÄCHTER MISST: eine reine TEXT-FENSTER-Heuristik je Fundstelle
   des Tokens `vivodepot.html` in `tests/e2e/*.spec.js` — kein AST, keine
   Variablenverfolgung (das wäre die zweite Messung eines vorhandenen
   Parsers, den dieses Repo für diesen Zweck nicht hat). Eine Fundstelle
   gilt als ROH, wenn ihr unmittelbares Umfeld (± FENSTER Zeichen) auf die
   Repo-Wurzel zeigt (`__dirname` + zwei `'..'`, oder eine Kennung `REPO`/
   `REPO_ROOT`) UND KEIN Ausnahme-Signal trägt (ein `konfektionieren()`-
   Ergebnis-Ordner: `ordner`/`r.ordner`/`GEBACKENE_PRODUKT_PFADE`/
   `KERN_URL_NACKT`/`konfektionieren(`). `tests/e2e/helpers.js` und
   `tests/e2e/global-setup.js` sind KEINE Spec — sie sind die EINE
   sanktionierte Definitionsstelle des Roh-zu-gebacken-Übergangs selbst
   (KERN_URL_NACKT/GEBACKENE_PRODUKT_PFADE) und darum von der Messung
   ausgenommen, kein SELBSTBEZUG-Loch.

   RATSCHEN-KONVENTION WIE ÜBERALL SONST (project_ratschen_konvention_
   positivliste_in_die_grundlinie): die Grundlinie trägt den GEMESSENEN
   Bestand — auch schon bekannte, noch nicht behobene Fundstellen — als
   Positivliste `jeDatei`. Rot NUR bei STEIGENDER Gesamtzahl, einer
   steigenden Datei-Zahl, oder einer NEUEN Datei, die vorher nicht in der
   Grundlinie stand. Eine sinkende oder unveränderte Zahl ist grün — das
   Sinken selbst ist NICHT dieses Wächters Aufgabe (das ist der eigentliche
   Klasse-B-Fix-Auftrag, bei -de/-cf).

   GERÜST-TEST-AUSNAHME (Positivliste, Wortlaut „die Spec erklärt
   sich ausdrücklich"): eine Datei, die IRGENDWO den wörtlichen Marker
   `GERÜST-TEST` trägt (Kopf-Kommentar, groß geschrieben, absichtlich
   auffällig), ist vollständig ausgenommen — sie prüft das nackte Gerüst
   SELBST (z. B. gegen `bereicheAlle()===0`), das ist ihr Gegenstand, kein
   Rückfall.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const SPEC_VERZEICHNIS = path.join(REPO, 'tests', 'e2e');
const GRUNDLINIE_PFAD = path.join(__dirname, 'klasse-b-rohes-geruest-grundlinie.json');
const FENSTER = 220;
const GERUEST_TEST_MARKER = 'GERÜST-TEST';

// Die eine sanktionierte Definitionsstelle des Übergangs roh→gebacken — kein Fund, keine Spec.
const AUSGENOMMENE_DATEINAMEN = new Set(['helpers.js', 'global-setup.js']);

const ROH_ANKER = [
  /__dirname\s*,\s*['"]\.\.['"]\s*,\s*['"]\.\.['"]/,
  /\bREPO_ROOT\b/,
  /\bREPO\b(?!_KENNUNG|_ROOT)/,
];
const AUSNAHME_SIGNALE = [
  /\bordner\b/,           // r.ordner / ordner[slug] — konfektionieren()-Ausgabeordner
  /GEBACKENE_PRODUKT_PFADE/,
  /GEBACKENE_KERN_DATEI/,
  /KERN_URL_NACKT/,
  /konfektionieren\(/,
];

function dateienListen() {
  return fs.readdirSync(SPEC_VERZEICHNIS)
    .filter((n) => n.endsWith('.spec.js') || AUSGENOMMENE_DATEINAMEN.has(n))
    .filter((n) => !AUSGENOMMENE_DATEINAMEN.has(n))
    .sort();
}

// Alle Fundstellen des Tokens in EINER Datei, roh oder nicht — Rückgabe: Anzahl ROHER Treffer.
// NUR ein Treffer in ANFÜHRUNGSZEICHEN zählt (Code, ein tatsächlicher Pfad-Baustein) — eine
// bloße Nennung in Prosa (Kopf-Kommentar, Fließtext-Erklärung „kopiert DANN NUR vivodepot.html —
// allein …") ist kein Fund. Fund 19.09.2026 (eigene Gegenprobe gegen ab-werk-isolationsprobe.
// spec.js): ein Kommentar, der den Dateinamen nur NENNT, lag zufällig im Fenster eines echten
// `REPO`-Ankers vier Zeilen darüber und zählte fälschlich mit — der Baum selbst (`r.ordner`)
// bleibt unangetastet, es war nie Klasse B.
function rohTrefferInDatei(inhalt) {
  if (inhalt.includes(GERUEST_TEST_MARKER)) return 0;   // Positivliste per Selbstauskunft
  let treffer = 0;
  const token = /['"]vivodepot\.html['"]/g;
  let m;
  while ((m = token.exec(inhalt))) {
    const von = Math.max(0, m.index - FENSTER);
    const bis = Math.min(inhalt.length, m.index + m[0].length + FENSTER);
    const fenster = inhalt.slice(von, bis);
    const istRoh = ROH_ANKER.some((re) => re.test(fenster));
    const istAusgenommen = AUSNAHME_SIGNALE.some((re) => re.test(fenster));
    if (istRoh && !istAusgenommen) treffer++;
  }
  return treffer;
}

function messen() {
  const jeDatei = {};
  for (const name of dateienListen()) {
    const inhalt = fs.readFileSync(path.join(SPEC_VERZEICHNIS, name), 'utf8');
    const n = rohTrefferInDatei(inhalt);
    if (n > 0) jeDatei[name] = n;
  }
  const summe = Object.values(jeDatei).reduce((a, b) => a + b, 0);
  return { summe, jeDatei };
}

function grundlinieLesen() {
  if (!fs.existsSync(GRUNDLINIE_PFAD)) return { summe: 0, jeDatei: {} };
  return JSON.parse(fs.readFileSync(GRUNDLINIE_PFAD, 'utf8'));
}

function grundlinieSchreiben(stand) {
  fs.writeFileSync(GRUNDLINIE_PFAD, JSON.stringify(stand, null, 2) + '\n', 'utf8');
}

// Urteil: rot bei Gesamt-Anstieg ODER Anstieg an irgendeiner EINZELNEN bekannten Datei
// ODER einer NEUEN Datei, die die Grundlinie noch nicht kennt (DRIFT — wie bei den
// anderen Ratschen dieser Sitzung, s. Achsen-Kürzel-Ratsche).
function urteil(gemessen, grundlinie) {
  const befunde = [];
  if (gemessen.summe > grundlinie.summe) {
    befunde.push('Gesamtzahl roher Fundstellen gestiegen: ' + grundlinie.summe + ' → ' + gemessen.summe);
  }
  for (const [datei, anzahl] of Object.entries(gemessen.jeDatei)) {
    const vorher = grundlinie.jeDatei[datei];
    if (vorher === undefined) {
      befunde.push('NEU (DRIFT): ' + datei + ' — ' + anzahl + ' rohe Fundstelle(n), nicht in der Grundlinie');
    } else if (anzahl > vorher) {
      befunde.push(datei + ': ' + vorher + ' → ' + anzahl + ' (gestiegen)');
    }
  }
  return { gruen: befunde.length === 0, befunde };
}

function main() {
  const args = process.argv.slice(2);
  const gemessen = messen();
  if (args.includes('--grundlinie-schreiben')) {
    grundlinieSchreiben(gemessen);
    console.log('Grundlinie geschrieben: Summe ' + gemessen.summe + ', ' + Object.keys(gemessen.jeDatei).length + ' Datei(en).');
    return;
  }
  const grundlinie = grundlinieLesen();
  const u = urteil(gemessen, grundlinie);
  if (u.gruen) {
    console.log('Klasse-B-Wächter grün. Gemessen: ' + gemessen.summe + ' rohe Fundstelle(n) in ' + Object.keys(gemessen.jeDatei).length + ' Datei(en) (Grundlinie: ' + grundlinie.summe + ').');
  } else {
    console.error('Klasse-B-Wächter ROT:');
    for (const b of u.befunde) console.error('  - ' + b);
    process.exitCode = 1;
  }
}

module.exports = { messen, rohTrefferInDatei, grundlinieLesen, urteil, GRUNDLINIE_PFAD, GERUEST_TEST_MARKER, ROH_ANKER, AUSNAHME_SIGNALE };

if (require.main === module) main();
