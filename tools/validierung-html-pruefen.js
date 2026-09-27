#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   validierung-html-pruefen.js — „Drei Korrekturen und zwei
   Messungen" (13.08.2026), Zug 1.
   ────────────────────────────────────────────────────────────────────────────
   Anlass: die Testzahlen auf `validierung.html` (Website, `Vivodepot-intern`,
   nicht versioniert) sind zweimal hintereinander zwischen zwei Commits
   veraltet — zuletzt sogar innerhalb DESSELBEN Auftrags, der sie gerade erst
   nachgezogen hatte (13.08., zwischen Auftragserstellung und Ausführung wuchs
   die Suite von 3674 auf 3685). Eine von Hand gepflegte Zahl auf einer
   öffentlichen, Institutionen vorgelegten Seite verfällt schneller, als sie
   gepflegt werden kann.

   WÄCHTER, NICHT ERZEUGER (Auftragsentscheidung, Zug 1: „der kleinere
   Eingriff reicht — die Seite wird ohnehin von Hand hochgeladen"). Prüft drei
   Zahlen, die zweimal hintereinander der tatsächliche Stolperstein waren:
   Node-Suite-Zahl, E2E-Zahl, ihre Summe (die Zusammenfassungs-Kachel) — je
   gegen `docs/faktenbasis.md` in `vivodepot-cleanslate`.

   AUSSERHALB DIESES REPOS: `validierung.html` liegt in `Vivodepot-intern`,
   einem zweiten, nicht versionierten Baum. Der Pfad ist deshalb ein
   Pflicht-Argument, kein Rate-Default über eine angenommene Nachbarordner-
   Struktur — „Prüfwerkzeuge nehmen den zu prüfenden Gegenstand als
   Argument".

   ── VIERTE ZAHL: DER OSV-BLOCK (A245, 15.08.2026) ──────────────────────────
   Die Vollerhebung A244 hat eine fünfte falsche Stelle gemessen, die dieser
   Wächter nicht sah: „0 bekannte Schwachstellen · 2 Bibliotheken geprüft".
   Die SBOM trägt heute sieben Komponenten, und `scripts/osv-scan.py` prüft
   ausdrücklich alle. Die „2" beschrieb einen SBOM-Stand von vor Monaten —
   an zwei Stellen der Seite, beide zweisprachig, keine davon rot.

   Die Zahl kommt jetzt aus `vivodepot.sbom.cdx.json`, derselben Quelle, aus
   der `scripts/osv-scan.py` liest. Damit hängen alle vier geprüften Zahlen an
   einer erzeugten Quelle und keine mehr an einer Erinnerung.

   ── WARUM WEITERHIN EIN PFLICHT-ARGUMENT ───────────────────────────────────
   Der Auftrag vom 15.08. schlug „optionaler Standardpfad plus übersprungener
   Testfall" vor. NICHT GEBAUT, und zwar ausdrücklich: ein Wächter, der grün
   meldet, wenn die Datei fehlt, ist schlimmer als keiner — genau der stumme
   Prüfer, den dieses Projekt mehrfach hatte. Ein „übersprungen" in einer
   3800er-Suite liest niemand.
   Der Weg, der stattdessen trägt, ist `tests/validierung-html-pruefen.test.js`:
   dort läuft der Vergleich gegen eine MITVERSIONIERTE Fixture, die die vier
   Fundstellen in ihrer echten Form enthält — die PRÜFLOGIK ist damit bewacht,
   auch ohne den zweiten Baum. Ob die ausgelieferte Seite stimmt, bleibt ein
   Lauf mit `--datei`, der vor jedem Upload gehört: die Datei liegt außerhalb
   dieses Repos, und kein Gate hier kann eine Aussage über sie erzwingen.

   Aufruf: node tools/validierung-html-pruefen.js --datei <pfad-zu-validierung.html>

   ── DIE „KOPFZEILE" IST KEINE EIGENE QUELLE MEHR (14.09.2026) ──────
   Der 14092026-Ordner hat die alte Stand-Zeile im Seitenkopf („Stand: … · N
   automatische Tests") durch eine Prosa-Notiz ohne Rohzahl ersetzt — die
   Kachel weiter unten ist seither die EINZIGE Stelle, die die Suite-Zahl
   trägt. Der bisherige, lose Text-Match `/(\d+) automatische Tests/` fand
   deshalb nicht mehr die Kopfzeile, sondern zufällig eine völlig andere Zeile
   auf der Seite („15 automatische Tests (K22-01 bis K22-15)", die Zahl der
   K22-Kryptotests) — und meldete sie fälschlich als Abweichung.

   Entscheidung: keine zweite Quelle wiederherstellen (das wäre genau die
   Drift, derentwegen dieser Wächter existiert), sondern die Kachel-Hauptzahl
   jetzt an ihr eigenes Markup ankern (das Label „Automatische Tests", nicht
   die bloße Position `<span class="zahl">`). Die frühere „Kopfzeile"-Prüfung
   entfällt ersatzlos — sie prüfte dieselbe Suite-Zahl kein zweites Mal richtig,
   sondern eine andere Zahl falsch. */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const FAKTENBASIS = path.join(REPO, 'docs', 'faktenbasis.md');
const SBOM = path.join(REPO, 'vivodepot.sbom.cdx.json');

function leseFaktenbasisZahlen(pfad = FAKTENBASIS) {
  const inhalt = fs.readFileSync(pfad, 'utf8');
  const suite = inhalt.match(/Suite \(Node-Tests[^)]*\): (\d+)/);
  const e2e = inhalt.match(/E2E \(Playwright[^)]*\): (\d+)/);
  if (!suite || !e2e) throw new Error('Suite- oder E2E-Zahl nicht in ' + pfad + ' gefunden — Format geändert?');
  const suiteZahl = parseInt(suite[1], 10);
  const e2eZahl = parseInt(e2e[1], 10);
  return { suiteZahl, e2eZahl, summe: suiteZahl + e2eZahl };
}

/* Dieselbe Quelle, aus der `scripts/osv-scan.py` liest: die Komponentenliste
   der SBOM. NICHT die Zahl der Komponenten MIT `purl` (osv-scan meldet „2
   Paket-Komponenten (mit purl)") — die Seite sagt „Bibliotheken geprüft", und
   geprüft werden alle Komponenten. Wer die beiden Zahlen verwechselt, stellt
   zwei verschiedene Zählgegenstände nebeneinander (§7.6). */
function leseSbomKomponenten(pfad = SBOM) {
  const sbom = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  if (!Array.isArray(sbom.components)) throw new Error('kein components-Array in ' + pfad);
  return sbom.components.length;
}

/* Die ZWEITE SBOM-Zahl, und sie ist der Grund, warum dieser Wächter am 20.08.
   nachgezogen werden musste (H2/W11). Die Seite sagte bis zum 17.08. „7
   Bibliotheken geprüft" — sachlich falsch: OSV.dev wird nur zu Komponenten mit
   Paket-Kennung (`purl`) befragt, das sind zwei von sieben. Die Produktentscheidung hat den
   Wortlaut am 17.08. berichtigt; der Wächter kannte nur den alten und WARF seither
   an der echten Seite („die OSV-Bibliotheken-Zahl fehlt … Seitenstruktur
   geändert?"), während er gegen seine eigene Fixture grün blieb.

   ZWEI ZAHLEN STATT EINER, weil die berichtigte Aussage zwei Zählgegenstände nennt
   und beide stimmen müssen: was ABGEFRAGT wurde und was der Bestand ist. */
function leseSbomMitPaketKennung(pfad = SBOM) {
  const sbom = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  if (!Array.isArray(sbom.components)) throw new Error('kein components-Array in ' + pfad);
  return sbom.components.filter((c) => c && c.purl).length;
}

/* Zwei Fundstellen in validierung.html, je mit eigenem Wortlaut-Rahmen — bewusst
   nicht auf eine Zahl "irgendwo im Text" geprüft, sondern auf die konkreten
   Stellen, die schon mehrfach stumm blieben. Die Kachel-Hauptzahl ist ans LABEL
   „Automatische Tests" gebunden, nicht an ihre Position unter den fünf
   `<span class="zahl">`-Kacheln der Seite (Tests, Schwachstellen, FHIR-Errors,
   Dateigröße, Lizenzen) — dieselbe Absicherung, die `validierung-html-
   nachziehen.js` seit dessen eigenem Fast-Fehlgriff schon kennt. */
function leseValidierungZahlen(dateiPfad) {
  const inhalt = fs.readFileSync(dateiPfad, 'utf8');
  const kachelZahl = inhalt.match(/(?<=<span class="zahl">)(\d+)(?=<\/span>\s*<span class="zahl-label"><span lang-de>Automatische Tests)/);
  const kachelSub = inhalt.match(/Schicht 1 \((\d+)\) \+ e2e \((\d+)\)/);
  if (!kachelZahl || !kachelSub) {
    throw new Error('eine der beiden bekannten Zahlenstellen (Kachel-Hauptzahl/-Unterzeile) fehlt in ' + dateiPfad + ' — Seitenstruktur geändert?');
  }
  /* ALLE Vorkommen, nicht das erste: die OSV-Zahlen stehen zweimal auf der Seite
     (Ergebnis-Hervorhebung und Kachel-Unterzeile), je zweisprachig. Am 15.08.
     waren beide falsch — ein Wächter, der nur das erste Vorkommen liest, hätte
     die Hälfte durchgelassen und dabei grün gemeldet.

     DER WORTLAUT IST SEIT DEM 17.08. EIN ANDERER, und mit ihm der Gegenstand:
     nicht mehr „N Bibliotheken geprüft" (falsch — OSV.dev kennt nur Komponenten
     mit Paket-Kennung), sondern das Paar „X von Y". Beide Zahlen werden gelesen. */
  const abfragbarDe = [...inhalt.matchAll(/(\d+) Bibliotheken mit Paket-Kennung geprüft \(von (\d+) SBOM-Komponenten\)/g)]
    .map((m) => ({ abfragbar: parseInt(m[1], 10), gesamt: parseInt(m[2], 10) }));
  const abfragbarEn = [...inhalt.matchAll(/(\d+) libraries with package identifier checked \(of (\d+) SBOM components\)/g)]
    .map((m) => ({ abfragbar: parseInt(m[1], 10), gesamt: parseInt(m[2], 10) }));
  const kachelOsvDe = [...inhalt.matchAll(/(\d+) von (\d+) SBOM-Komponenten abfragbar/g)]
    .map((m) => ({ abfragbar: parseInt(m[1], 10), gesamt: parseInt(m[2], 10) }));
  const kachelOsvEn = [...inhalt.matchAll(/(\d+) of (\d+) SBOM components queryable/g)]
    .map((m) => ({ abfragbar: parseInt(m[1], 10), gesamt: parseInt(m[2], 10) }));
  const osv = [].concat(abfragbarDe, abfragbarEn, kachelOsvDe, kachelOsvEn);
  if (!osv.length) {
    throw new Error('die OSV-Zahlen fehlen in ' + dateiPfad + ' — Seitenstruktur geändert?');
  }
  /* DAS STANDDATUM, und es ist der eigentliche Gegenstand von W11: dieselbe Angabe
     stand zweimal auf der Seite und wurde nur an einer Stelle nachgezogen. Geprüft
     wird darum nicht gegen ein Soll von aussen (ein Website-Stand ist ein Stand,
     kein Tageswert und darf nicht am Folgetag rot werden), sondern die SEITE GEGEN
     SICH SELBST: alle Standdaten müssen dasselbe sagen. */
  const datumDe = [...inhalt.matchAll(/Stand:? (\d{1,2})\.? ?([A-Za-zä]+|\d{2})\.? ?(\d{4})/g)].map((m) => m[0]);
  const datumKurz = [...inhalt.matchAll(/Stand (\d{2})\.(\d{2})\.(\d{4})/g)].map((m) => m[1] + '.' + m[2] + '.' + m[3]);
  return {
    kachelZahl: parseInt(kachelZahl[1], 10),
    kachelSuiteAnteil: parseInt(kachelSub[1], 10),
    kachelE2eAnteil: parseInt(kachelSub[2], 10),
    osv,
    osvDe: abfragbarDe, osvEn: abfragbarEn, osvKachelDe: kachelOsvDe, osvKachelEn: kachelOsvEn,
    standDatumLang: datumDe,
    standDatumKurz: datumKurz,
  };
}

function pruefe(dateiPfad, faktenbasisPfad = FAKTENBASIS, sbomPfad = SBOM) {
  const soll = leseFaktenbasisZahlen(faktenbasisPfad);
  soll.komponenten = leseSbomKomponenten(sbomPfad);
  soll.abfragbar = leseSbomMitPaketKennung(sbomPfad);
  const ist = leseValidierungZahlen(dateiPfad);
  const abweichungen = [];
  if (ist.kachelSuiteAnteil !== soll.suiteZahl) {
    abweichungen.push(`Kachel-Unterzeile „Schicht 1 (${ist.kachelSuiteAnteil})" ≠ Faktenbasis-Suite (${soll.suiteZahl})`);
  }
  if (ist.kachelE2eAnteil !== soll.e2eZahl) {
    abweichungen.push(`Kachel-Unterzeile „e2e (${ist.kachelE2eAnteil})" ≠ Faktenbasis-E2E (${soll.e2eZahl})`);
  }
  if (ist.kachelZahl !== soll.summe) {
    abweichungen.push(`Kachel-Hauptzahl (${ist.kachelZahl}) ≠ Faktenbasis-Summe Suite+E2E (${soll.summe})`);
  }
  ist.osv.forEach((o, i) => {
    if (o.gesamt !== soll.komponenten) {
      abweichungen.push(`OSV-Fundstelle ${i + 1}: „von ${o.gesamt} SBOM-Komponenten" ≠ SBOM (${soll.komponenten})`);
    }
    if (o.abfragbar !== soll.abfragbar) {
      abweichungen.push(`OSV-Fundstelle ${i + 1}: „${o.abfragbar} abfragbar" ≠ SBOM-Komponenten mit Paket-Kennung (${soll.abfragbar})`);
    }
  });
  /* Vier Fundstellen erwartet: Hervorhebung de/en und Kachel-Unterzeile de/en.
     Fehlt eine, ist eine Sprachfassung oder eine Kachel nicht nachgezogen — genau
     der Fall aus W11, nur eine Ebene tiefer. */
  for (const [name, liste] of [['Hervorhebung de', ist.osvDe], ['Hervorhebung en', ist.osvEn],
                               ['Kachel de', ist.osvKachelDe], ['Kachel en', ist.osvKachelEn]]) {
    if (!liste.length) abweichungen.push('OSV-Fundstelle fehlt: ' + name);
  }
  // W11: dieselbe Stand-Angabe an mehreren Stellen — sie müssen übereinstimmen.
  const kurzMenge = new Set(ist.standDatumKurz);
  if (kurzMenge.size > 1) {
    abweichungen.push('Standdatum widersprüchlich: ' + [...kurzMenge].join(' vs. ')
      + ' — dieselbe Seite nennt zwei Stände (der Fall aus W11)');
  }
  return { soll, ist, abweichungen };
}

function main() {
  const argv = process.argv.slice(2);
  const dateiIndex = argv.indexOf('--datei');
  if (dateiIndex === -1 || !argv[dateiIndex + 1]) {
    console.error('[validierung-html-pruefen] --datei <pfad-zu-validierung.html> ist Pflicht.');
    process.exit(2);
  }
  const dateiPfad = path.resolve(argv[dateiIndex + 1]);
  if (!fs.existsSync(dateiPfad)) {
    console.error('[validierung-html-pruefen] Datei nicht gefunden: ' + dateiPfad);
    process.exit(2);
  }
  const { soll, abweichungen } = pruefe(dateiPfad);
  if (abweichungen.length > 0) {
    console.error(`[validierung-html-pruefen] ROT — ${abweichungen.length} Abweichung(en) gegen docs/faktenbasis.md (Suite ${soll.suiteZahl}, E2E ${soll.e2eZahl}):`);
    abweichungen.forEach((a) => console.error('  - ' + a));
    process.exit(1);
  }
  console.log(`[validierung-html-pruefen] grün — Testzahlen gegen docs/faktenbasis.md (Suite ${soll.suiteZahl}, E2E ${soll.e2eZahl}) `
    + `und OSV-Block gegen die SBOM (${soll.abfragbar} von ${soll.komponenten} Komponenten abfragbar), Standdatum in sich stimmig.`);
}

module.exports = { leseFaktenbasisZahlen, leseValidierungZahlen, leseSbomKomponenten, leseSbomMitPaketKennung, pruefe };
if (require.main === module) main();
