#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   adr-readme-uebereinstimmung.js — „Eine Datei für die ADR-Übersicht
   — und sie muss stimmen" (15.08.2026), Zug 3.
   ────────────────────────────────────────────────────────────────────────────
   Der INDEX ist nicht falsch geworden, weil jemand geschlampt hat, sondern weil
   nichts gemerkt hat, dass er stehen blieb — drei Wochen und sieben ADRs lang.
   Dieser Wächter ist der Schutz davor, dass sich derselbe Vorgang mit der
   README wiederholt: er wird rot, sobald `docs/adr/README.md` und der
   Dateibestand in `docs/adr/` auseinanderlaufen.

   UNABHÄNGIG von `tools/adr-readme-erzeugen.js`: dieser Wächter parst die
   README-TABELLE selbst (nicht die interne Zeilen-Liste des Generators) und
   vergleicht sie gegen das Dateisystem. Ein Bug im Generator, der die Tabelle
   erzeugt aber nicht mehr zum echten Bestand passt, oder eine README, die
   jemand von Hand nachträgt statt neu zu erzeugen, würde von einem Wächter,
   der dieselbe interne Logik wiederverwendet, nie gefangen — genau die
   Tautologie, die hier vermieden wird.

   Prüft in BEIDE Richtungen (keine Waisen):
     - jede ADR-Datei in docs/adr/ hat genau einen README-Eintrag
     - jeder README-Eintrag hat genau eine ADR-Datei
     - jeder README-Eintrag trägt einen der vier zulässigen Status
       (gilt / teilweise überholt / überholt / gegenstandslos / ungeprüft —
       „ungeprüft" ist der ehrliche Fallback, kein fünfter Zustand im Sinn der
       README-Kopfzeile, s. dort)

   ── DRITTE RICHTUNG (A245, 15.08.2026): DIE QUELLE SELBST ──────────────────
   Die zwei Richtungen oben halten README und Dateibestand zusammen — aber
   beide lesen nur die README-TABELLE. Ob die einzelne ADR-Datei ueberhaupt
   eine „Status heute"-Zeile traegt, sah niemand: fehlt sie, setzt der Erzeuger
   „ungeprüft" ein, die Tabelle ist formal in Ordnung, und der Wächter bleibt
   grün. Genau so blieb U2-ADR-140 unsichtbar — die einzige der 144 Dateien
   ohne die Zeile, entstanden am 14.08. zwischen zwei ADR-Tranchen.

   Der Namen-Wächter faengt das nicht: er prueft NAMEN in den Dateien, nicht
   die Anwesenheit einer Zeile. Ein dritter Wächter waere die falsche Antwort
   (Regel „nicht drei Vorrichtungen fuer eine Frage") — die Prüfung gehoert
   hierher, wo README und Bestand ohnehin gegeneinander gehalten werden.

   Geprüft wird darum zusaetzlich, je ADR-DATEI:
     - sie trägt eine „Status heute"-Zeile (fehlt sie: ROT, nicht still)
     - deren Wert ist einer der zulässigen (inkl. `abgelöst` als Synonym für
       `überholt` — vier Bestandsdateien schreiben es so)
     - und er stimmt mit dem überein, was die README-Tabelle behauptet

   Die letzte Probe ist die schaerfste und der Grund, aus dem der Wächter hier
   NICHT die Funktionen des Erzeugers benutzt: sie hat am 15.08. sechs falsche
   README-Eintraege aufgedeckt, die eine tautologische Prüfung nie gesehen
   haette — der Erzeuger und der Wächter waeren sich in ihrem gemeinsamen
   Irrtum einig gewesen.

   `vergleiche(adrOrdner, readmeText)` ist eine reine Funktion — Wächter nimmt
   den zu prüfenden Gegenstand als Argument (stehende Regel). CLI-Nutzung:
     node tools/adr-readme-uebereinstimmung.js [--adr-ordner <pfad>] [--readme <pfad>]
   Ohne Argumente: prüft den echten `docs/adr/`-Bestand dieses Repos.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ZULAESSIGE_STATUS_BASIS = ['gilt', 'teilweise überholt', 'überholt', 'gegenstandslos', 'ungeprüft'];

function adrDateienAufDisk(adrOrdner) {
  return fs.readdirSync(adrOrdner)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && /U2-ADR-\d+/i.test(f));
}

function nummerAusDatei(datei) {
  // U2-ADR-341b (06.09.2026): `\d{3}` allein liess `341` und `341b` auf dieselbe Kennung
  // fallen — eine echte Kollision, kein Waise, aber genau so gemeldet, weil die README-Zeile
  // (unverkürzt „U2-ADR-341b") keinen passenden Dateibestand mehr fand. Derselbe Fund, dieselbe
  // Korrektur wie in tools/adr-readme-erzeugen.js — bewusst hier ein zweites Mal, nicht geteilt
  // (s. Kopfkommentar: zwei unabhängige Lesungen, die sich einig sein müssen).
  const m = datei.match(/U2-ADR-(\d{3}[a-z]?)/i);
  if (!m) return null;
  const istNachtrag = /-nachtrag-/i.test(datei);
  return `U2-ADR-${m[1]}${istNachtrag ? '-Nachtrag' : ''}`;
}

function readmeEintraege(readmeText) {
  return readmeText
    .split('\n')
    .filter((z) => /^\|\s*U2-ADR-/.test(z))
    .map((z) => {
      const teile = z.split('|').map((t) => t.trim());
      return { nummer: teile[1], status: teile[3] || '' };
    });
}

function hatZulaessigenStatus(status) {
  return ZULAESSIGE_STATUS_BASIS.some((basis) => status === basis || status.startsWith(basis + ' ') || status.startsWith(basis + '('));
}

/* Eigene, vom Erzeuger UNABHAENGIGE Lesung der Status-Zeile. Bewusst hier
   nachgebaut statt importiert: zwei Lesungen, die sich einig sein muessen,
   fangen den Fall, den eine geteilte Funktion per Konstruktion nie faengt.
   Der fuehrende Listenstrich ist erlaubt — U2-ADR-122 schreibt die Zeile so. */
const STATUS_ZEILE = /^(?:-\s+)?\*\*Status heute:\*\*\s*(.+)$/m;

/* `abgelöst` ist im Bestand das Synonym fuer `überholt` (vier Dateien).
   Normalisiert wird nur zum Vergleichen, nicht in der Datei. */
function normalisiereStatus(wert) {
  return String(wert).trim().replace(/\babgelöst\b/, 'überholt');
}

/* Der Status ohne seine Begruendung: alles bis zum ersten „ — " bzw. „, ".
   Die README-Tabelle traegt nur den Kopf, die ADR-Datei Kopf plus Beleg. */
function statusKopf(wert) {
  const roh = normalisiereStatus(wert).split(/\s+[—–]\s+|,\s|\.\s|:\s/)[0].trim();
  /* Laengste passende Basis zuerst — sonst schlaegt „überholt" auf
     „teilweise überholt" nicht an und „gilt" auf gar nichts Falsches. */
  const basis = ZULAESSIGE_STATUS_BASIS
    .filter((b) => roh === b || roh.startsWith(b + ' ') || roh.startsWith(b + '('))
    .sort((a, b) => b.length - a.length)[0];
  if (!basis) return roh;
  let kopf = basis;
  let rest = roh.slice(basis.length).trim();
  const durch = /^durch\s+(U2-ADR-\d+(?:-Nachtrag)?)/.exec(rest);
  if (durch) { kopf += ` durch ${durch[1]}`; rest = rest.slice(durch[0].length).trim(); }
  /* Ein nachgestellter Klammerzusatz gehoert zum Kopf — die README fuehrt ihn
     mit („überholt durch U2-ADR-050 (E3)", „gilt (Block 1)"). Ohne diese Zeile
     meldet der Wächter drei Abweichungen, die keine sind. */
  const klammer = /^(\([^)]*\))/.exec(rest);
  if (klammer) kopf += ` ${klammer[1]}`;
  return kopf;
}

function statusAusDatei(adrOrdner, datei) {
  const treffer = STATUS_ZEILE.exec(fs.readFileSync(path.join(adrOrdner, datei), 'utf8'));
  return treffer ? treffer[1].trim() : null;
}

function vergleiche(adrOrdner, readmeText) {
  const dateien = adrDateienAufDisk(adrOrdner);
  const dateiNummern = new Set(dateien.map(nummerAusDatei).filter(Boolean));
  const eintraege = readmeEintraege(readmeText);
  const eintragNummern = new Set(eintraege.map((e) => e.nummer));
  const statusJeNummer = new Map(eintraege.map((e) => [e.nummer, e.status]));

  const waisenDateien = [...dateiNummern].filter((n) => !eintragNummern.has(n)).sort();
  const waisenEintraege = [...eintragNummern].filter((n) => !dateiNummern.has(n)).sort();
  const ohneGueltigenStatus = eintraege
    .filter((e) => !hatZulaessigenStatus(e.status))
    .map((e) => e.nummer)
    .sort();

  /* Dritte Richtung: die Quelldatei selbst. */
  const ohneStatusZeile = [];
  const dateiStatusUnbekannt = [];
  const statusAbweichung = [];
  for (const datei of dateien) {
    const nummer = nummerAusDatei(datei);
    if (!nummer) continue;
    const roh = statusAusDatei(adrOrdner, datei);
    if (roh === null) { ohneStatusZeile.push(nummer); continue; }
    const kopf = statusKopf(roh);
    if (!hatZulaessigenStatus(kopf)) { dateiStatusUnbekannt.push(`${nummer} („${kopf}")`); continue; }
    const inReadme = statusJeNummer.get(nummer);
    if (inReadme !== undefined && inReadme !== kopf) {
      statusAbweichung.push(`${nummer}: Datei „${kopf}" ≠ README „${inReadme}"`);
    }
  }

  return {
    waisenDateien, waisenEintraege, ohneGueltigenStatus,
    ohneStatusZeile: ohneStatusZeile.sort(),
    dateiStatusUnbekannt: dateiStatusUnbekannt.sort(),
    statusAbweichung: statusAbweichung.sort(),
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  const adrOrdner = path.resolve(arg('adr-ordner', path.join(REPO, 'docs', 'adr')));
  const readmePfad = path.resolve(arg('readme', path.join(adrOrdner, 'README.md')));
  const readmeText = fs.readFileSync(readmePfad, 'utf8');
  const e = vergleiche(adrOrdner, readmeText);
  const { waisenDateien, waisenEintraege, ohneGueltigenStatus } = e;

  const funde = [];
  if (waisenDateien.length) funde.push(`ADR-Dateien ohne README-Eintrag: ${waisenDateien.join(', ')}`);
  if (waisenEintraege.length) funde.push(`README-Einträge ohne ADR-Datei: ${waisenEintraege.join(', ')}`);
  if (ohneGueltigenStatus.length) funde.push(`README-Einträge ohne zulässigen Status: ${ohneGueltigenStatus.join(', ')}`);
  if (e.ohneStatusZeile.length) funde.push(`ADR-Dateien ohne „Status heute"-Zeile: ${e.ohneStatusZeile.join(', ')}`);
  if (e.dateiStatusUnbekannt.length) funde.push(`ADR-Dateien mit unbekanntem Status: ${e.dateiStatusUnbekannt.join(', ')}`);
  if (e.statusAbweichung.length) funde.push(`Status in Datei ≠ Status in README:\n    ${e.statusAbweichung.join('\n    ')}`);

  if (funde.length) {
    console.error('[adr-readme-uebereinstimmung] ROT:');
    for (const f of funde) console.error('  ' + f);
    process.exit(1);
  }
  console.log('[adr-readme-uebereinstimmung] OK — README und Dateibestand stimmen überein.');
}

if (require.main === module) main();

module.exports = { vergleiche, adrDateienAufDisk, readmeEintraege, nummerAusDatei, hatZulaessigenStatus, statusKopf, statusAusDatei, ZULAESSIGE_STATUS_BASIS };
