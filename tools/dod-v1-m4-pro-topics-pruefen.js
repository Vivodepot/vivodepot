#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   dod-v1-m4-pro-topics-pruefen.js — trägt ein rezeptgebautes Pro-Produkt GENAU 7 Themen?
   (Abnahme-Strang, 17.09.2026, Abnahmezeile M4)
   ────────────────────────────────────────────────────────────────────────────
   STAND 19.09.2026: Der Schnitt hat BUERGERMODUL_BUENDEL aus dem Kern entfernt; die Ursache unten ist
   damit behoben, `identity` ist ein Template wie die anderen. Der Abschnitt „GEMESSEN" beschreibt den
   Zustand vom 17.09.2026 und bleibt als Herleitung stehen.

   DIE ABNAHMEZEILE (wörtlich): ein aus dem Rezept gebautes Pro-Produkt zeigt genau
   sieben Themen — `identity` plus die sechs Pro-Bereichs-Templates — OHNE dass ein
   `bereichssatz`-Filter oder eine andere Ausnahme eingreifen muss. Beleg: die
   Sektor-Erzeugung über den Template-Weg (`AB_WERK_BEREICH_QUELLEN`) ist byte-identisch zum
   heutigen `bereichsErsatz`-Weg (Rundlauf-Fidelity-Test, sechs von sechs „OK").
   Schluss: wenn ein Pro-Produkt künftig nur trägt, was sein Rezept nennt, wird die heutige
   `_BEREICH_IDS_AUS_ERSATZ`-Filter-Ausnahme (U2-ADR-348-Nachtrag) überflüssig.

   GEMESSEN, NICHT ANGENOMMEN (17.09.2026): ein Produkt, gebaut über `konfektionieren()` mit den
   sechs echten Pro-Bereichs-Templates als `unsignierteModulDateien` (`modulTyp:"bereich"`,
   bestätigt über `AB_WERK_BEREICH_QUELLEN`, s. `tools/lib/produkt-text-erzeugen.js` Zeile ~38)
   und OHNE `bereichsErsatzPfad`, zeigt für ein leeres Depot ohne `bereichssatz` NICHT sieben,
   sondern 19 Themen: die 13 nativen (`BEREICH_IDS_EINGEBAUT`) PLUS die sechs Pro-Templates.

   DIE URSACHE — PRÄZISIERT (17.09.2026, selbst nachgemessen, nicht angenommen):
   NICHT ein Plumbing-Fehler in `konfektionieren()`/`AB_WERK_BEREICH_QUELLEN` selbst — die
   Region wird bereits heute strikt PRODUKTSPEZIFISCH gefüllt (Gegenprobe: zwei
   synthetische Produkte mit unterschiedlichen Bereichs-Modulen, keine Kreuzkontamination,
   `_abWerkModuleAufText` filtert schon jetzt nur die tatsächlich übergebenen Module). Die 13
   nativen Themen kommen stattdessen aus einem ANDEREN, älteren Pfad dazu:
   `BUERGERMODUL_BUENDEL`, das feste, in `vivodepot.html` gebackene Bündel — es ist noch nicht
   entfernt (eigenes Fertigkriterium für Strang A: „BUERGERMODUL_BUENDEL kommt in
   vivodepot.html nicht mehr vor", noch offen). Die Prämisse „nichts mehr zu verbergen" stimmt
   für die WORTLAUT-Herkunft (kein Filter mehr NÖTIG, um etwas zu verstecken), aber die zwölf
   privaten Themen sind trotzdem DA, bis das Bündel selbst weg ist — heute hält `bereichsErsatz`
   sie zurück. Diese Probe hält fest, dass dieser Zustand (Bündel weg) noch nicht erreicht ist.

   WAS FEHLT, DAMIT DIE ZEILE GRÜN WIRD: das Entfernen von `BUERGERMODUL_BUENDEL` selbst (Strang
   A) — NICHT ein neues Rezept-Feld oder ein Umbau am Konfektionierer, beide sind laut
   der Messung oben bereits produktspezifisch und bereit. Ob nach dem Entfernen noch etwas Zusätzliches
   nötig ist (z. B. `bereichsErsatz` bleibt, nur produktweit und ohne die heutige
   `_BEREICH_IDS_AUS_ERSATZ`-Extra-Ausnahme) — das ist eine Bauentscheidung, keine, die diese
   Probe trifft. Sie mißt nur, ob das Ergebnis stimmt.

   Aufruf:
     node tools/dod-v1-m4-pro-topics-pruefen.js --templates-ordner <pfad>
       — baut ein Produkt aus JEDER *.json-Datei im Ordner (unsignierteModulDateien) und zählt
         `bereicheAlle()` für ein leeres Depot. Für die echte Abnahme: die sechs echten Templates.
     node tools/dod-v1-m4-pro-topics-pruefen.js
       — gegen zwei synthetische Fixture-Templates (tests/fixtures/dod-v1-m4-pro-topics/),
         prüft NUR das WERKZEUG (Mechanismus), nicht die echten sechs Pro-Themen — kein
         Netzzugriff, kein Bezug auf einen bestimmten Arbeitsbaum, läuft überall.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('./produkt-konfektionieren.js');

const REPO = path.join(__dirname, '..');
const FIXTURE_ORDNER = path.join(REPO, 'tests', 'fixtures', 'dod-v1-m4-pro-topics');

function argWert(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

/* Baut ein Produkt NUR aus den gegebenen Bereichs-Template-Dateien (kein Sprachmodul, kein
   bereichsErsatz, kein Logikmodul) und liefert die Themen-IDs für ein leeres Depot ohne
   `bereichssatz` — der Fall, den die Abnahmezeile meint ("ohne dass ein Filter eingreifen
   muss": kein Filter GESETZT, nicht nur keiner GEBRAUCHT). Eigener Temp-Ordner je Aufruf,
   aufgeräumt im `finally` des Aufrufers. */
function themenAusTemplatesBauen(templateDateien, ziel) {
  const { ladeIssuer } = require(path.join(REPO, 'tests', 'load-issuer.js'));
  const ISSUER = ladeIssuer().V;
  const r = konfektionieren({
    ziel, slug: 'm4-pro-topics-probe', modulauswahl: [],
    vorDepotKonfigurationInhaltFn: ISSUER.vorDepotKonfigurationDateiInhalt,
    unsignierteModulDateien: templateDateien,
  });
  const htmlPfad = path.join(r.ordner, 'vivodepot.html');
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = htmlPfad;
  delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  try {
    const { ladeKern } = require(path.join(REPO, 'tests', 'load-kern.js'));
    const { V } = ladeKern();
    V.setData(V.leeresDepot());
    return V.bereicheAlle().map((b) => b.id).sort();
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(path.join(REPO, 'tests', 'load-kern.js'))];
  }
}

/* Der eigentliche Vergleich — reine Funktion, kein Bau-/Dateizugriff, testbar mit
   synthetischen ID-Listen. `erwartet` ist die Menge, die die Abnahmezeile verlangt
   (Identität + je eine ID pro Template-Datei). */
function pruefeGenauDieseThemen(tatsaechlich, erwartet) {
  const tSet = new Set(tatsaechlich);
  const eSet = new Set(erwartet);
  const zuViel = tatsaechlich.filter((id) => !eSet.has(id));
  const zuWenig = erwartet.filter((id) => !tSet.has(id));
  return { gruen: zuViel.length === 0 && zuWenig.length === 0, zuViel, zuWenig };
}

function main() {
  const alsJson = process.argv.includes('--json');
  const ordner = argWert('--templates-ordner') || FIXTURE_ORDNER;
  /* Die Identitäts-ID ist ein Parameter, kein Literal: die Abnahmezeile nennt `identity` (der
     heutige Kanon-Stand, s. Bericht 17.09.2026), aber diese Probe darf nicht an einem
     bestimmten Kern-Stand kleben — ein älterer/anderer Arbeitsbaum könnte noch `identitaet`
     tragen. Ohne Angabe kein Rateversuch: die Fixture-Probe unten (nur Mechanik) verzichtet
     bewusst auf diesen Parameter. */
  const identitaetsId = argWert('--identitaet-id') || 'identity';
  const templateDateien = fs.readdirSync(ordner)
    .filter((n) => n.endsWith('.json'))
    .map((n) => path.join(ordner, n));
  if (!templateDateien.length) {
    throw new Error('dod-v1-m4-pro-topics-pruefen: keine *.json-Templates unter ' + ordner);
  }
  const erwarteteThemenIds = templateDateien
    .map((p) => JSON.parse(fs.readFileSync(p, 'utf8')))
    .flatMap((roh) => Object.keys(roh.bereiche || {}));
  const erwartet = [identitaetsId, ...erwarteteThemenIds].sort();

  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'dod-v1-m4-pro-topics-'));
  let ergebnis;
  try {
    let tatsaechlich;
    try {
      tatsaechlich = themenAusTemplatesBauen(templateDateien, ziel);
    } catch (e) {
      /* Ein Kern-Absturz beim Laden ist ein EIGENER Befund, kein Themen-Zählfehler — z. B. der
         am 17.09.2026 gemessene TDZ-Fehler an `_BEREICH_CLUSTER_FORM`, wenn ein Template ein
         `cluster`-Feld trägt (unabhängig bestätigt und gemeldet). Wird hier NICHT verschluckt — anders benannt, damit „0 Themen" nicht wie
         „alles fehlt" aussieht, sondern wie das, was es ist: der Bau kam nie an bereicheAlle(). */
      ergebnis = { quelle: ordner, erwartet, tatsaechlich: null, gruen: false, zuViel: [], zuWenig: [],
        grund: 'kern-absturz', fehler: e.message };
      return ausgeben(ergebnis, alsJson);
    }
    ergebnis = { quelle: ordner, erwartet, tatsaechlich, grund: null, ...pruefeGenauDieseThemen(tatsaechlich, erwartet) };
  } finally {
    fs.rmSync(ziel, { recursive: true, force: true });
  }

  ausgeben(ergebnis, alsJson);
}

function ausgeben(ergebnis, alsJson) {
  if (alsJson) {
    process.stdout.write(JSON.stringify(ergebnis, null, 2) + '\n');
    if (!ergebnis.gruen) process.exitCode = 1;
    return;
  }
  process.stdout.write('M4 — Pro-Themen aus Rezept, ohne bereichssatz-Filter — Quelle: ' + ergebnis.quelle + '\n');
  process.stdout.write('  erwartet (' + ergebnis.erwartet.length + '): ' + ergebnis.erwartet.join(', ') + '\n');
  if (ergebnis.grund === 'kern-absturz') {
    process.stdout.write('ROT — Kern-Absturz beim Bauen/Laden, keine Themen gezählt: ' + ergebnis.fehler + '\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('  tatsächlich (' + ergebnis.tatsaechlich.length + '): ' + ergebnis.tatsaechlich.join(', ') + '\n');
  if (ergebnis.gruen) {
    process.stdout.write('GRÜN — genau die erwarteten Themen, kein Filter nötig.\n');
  } else {
    process.stdout.write('ROT:\n');
    if (ergebnis.zuViel.length) process.stdout.write('  zu viel (nicht erwartet, aber da): ' + ergebnis.zuViel.join(', ') + '\n');
    if (ergebnis.zuWenig.length) process.stdout.write('  zu wenig (erwartet, aber fehlt): ' + ergebnis.zuWenig.join(', ') + '\n');
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { themenAusTemplatesBauen, pruefeGenauDieseThemen, FIXTURE_ORDNER };
