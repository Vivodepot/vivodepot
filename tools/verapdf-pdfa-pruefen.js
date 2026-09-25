#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   verapdf-pdfa-pruefen.js — echte PDF/A-Konformitätsprüfung gegen ein
   erzeugtes Vivodepot-PDF, mit veraPDF (PDF Association / Open Preservation
   Foundation, freie/quelloffene Software, europäisch). Ersetzt das bisherige
   „GEPLANT" auf validierung.html durch einen echten, messbaren Befund.

   Erwartet veraPDF lokal installiert (`brew install verapdf`, bringt eine
   eigene Java-Laufzeit als Abhängigkeit mit) und im PATH als `verapdf`
   erreichbar. Läuft veraPDF nicht, meldet dieses Werkzeug das explizit statt
   stumm zu schweigen — kein grüner Schein ohne echten Lauf.

   Aufruf:
     node tools/verapdf-pdfa-pruefen.js --pdf <pfad> [--flavour 3b]
     node tools/verapdf-pdfa-pruefen.js                 (Fixture im Repo)

   Ohne --pdf läuft die Probe gegen die feste Fixture
   tests/fixtures/verapdf-kandidat.pdf, damit die Suite (und jede Sitzung
   ohne Zugriff auf einen echten Kern-Lauf) die Prüf-LOGIK selbst prüfen kann
   — das Fixture-PDF ist synthetisch (Platzhalter-Name), kein echtes Depot.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const FIXTURE_PDF = path.join(REPO, 'tests', 'fixtures', 'verapdf-kandidat.pdf');

function findePdfPfad(argv) {
  const i = argv.indexOf('--pdf');
  if (i >= 0 && argv[i + 1]) return path.resolve(argv[i + 1]);
  return FIXTURE_PDF;
}

function findeFlavour(argv) {
  const i = argv.indexOf('--flavour');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return '3b';
}

function veraPdfVersion() {
  try {
    const out = execFileSync('verapdf', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const zeile = out.split('\n').find((z) => /^veraPDF\s/.test(z.trim()));
    return zeile ? zeile.trim() : out.trim().split('\n')[0];
  } catch (e) {
    return null;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const pdfPfad = findePdfPfad(argv);
  const flavour = findeFlavour(argv);

  const version = veraPdfVersion();
  if (!version) {
    console.error('FEHLER: `verapdf` nicht im PATH gefunden. Installieren mit `brew install verapdf` '
      + '(Java-Laufzeit kommt als Abhängigkeit mit) — kein automatischer Befund ohne echten Lauf.');
    return 1;
  }
  if (!fs.existsSync(pdfPfad)) {
    console.error('FEHLER: PDF nicht gefunden: ' + pdfPfad);
    return 1;
  }

  let roh;
  try {
    roh = execFileSync('verapdf', ['--format', 'json', '-f', flavour, pdfPfad], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    // veraPDF liefert bei NICHT-konformen Dateien einen Exit-Code != 0 UND trotzdem gültiges
    // JSON auf stdout -- das ist der normale, erwartete Fall (nicht "kaputt"), kein echter Fehler.
    roh = e.stdout ? e.stdout.toString() : null;
    if (!roh) {
      console.error('FEHLER: veraPDF-Lauf lieferte keine Ausgabe. stderr: ' + (e.stderr ? e.stderr.toString().slice(0, 2000) : '(leer)'));
      return 1;
    }
  }

  let bericht;
  try {
    bericht = JSON.parse(roh);
  } catch (e) {
    console.error('FEHLER: veraPDF-Ausgabe ist kein gültiges JSON.');
    return 1;
  }

  const job = bericht.report && bericht.report.jobs && bericht.report.jobs[0];
  const vr = job && job.validationResult && job.validationResult[0];
  if (!vr) {
    console.error('FEHLER: unerwartete veraPDF-JSON-Struktur — kein validationResult gefunden.');
    return 1;
  }

  const befund = {
    werkzeug: version,
    profil: vr.profileName,
    datum: new Date().toISOString(),
    geprueftesPdf: pdfPfad,
    konform: vr.compliant === true,
    aussage: vr.statement,
    bestandeneRegeln: vr.details.passedRules,
    nichtBestandeneRegeln: vr.details.failedRules,
    bestandeneChecks: vr.details.passedChecks,
    nichtBestandeneChecks: vr.details.failedChecks,
    nichtBestandeneRegelnDetail: (vr.details.ruleSummaries || [])
      .filter((s) => s.status === 'failed')
      .map((s) => ({
        klausel: s.specification + ' ' + s.clause + '-' + s.testNumber,
        beschreibung: s.description,
        anzahlFehlgeschlagenerChecks: s.failedChecks,
        beispiel: (s.checks && s.checks[0] && s.checks[0].errorMessage) || null,
      })),
  };

  console.log(JSON.stringify(befund, null, 2));
  return 0;
}

if (require.main === module) process.exit(main());
module.exports = { main };
