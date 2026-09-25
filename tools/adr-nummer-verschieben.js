#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   adr-nummer-verschieben.js — eine doppelt vergebene ADR-Nummer mechanisch
   auflösen, ohne die Schwester-ADR zu berühren
   ────────────────────────────────────────────────────────────────────────────
   AUFTRAG (17.09.2026, „ein Wächter gegen doppelt vergebene ADR-Nummern",
   Folge-Anordnung): U2-ADR-398 bleibt eine bekannte, terminierte Kollision
   (s. tests/adr-bestand-pruefen.test.js, „Doppelvergaben … NUR die eine
   terminierte Ausnahme U2-ADR-398") — 165 Verweise in 47 Dateien, eine
   Umbenennung genau jetzt würde eine laufende, fremde Zusammenführung zerlegen.
   Dieses Werkzeug wurde am 17.09. VORBEREITET und am 19.09.2026, nach der Landung von L1,
   AUSGEFÜHRT (U2-ADR-398 → U2-ADR-421, Plan von Hand, 69 Ersetzungen in 25 Dateien).

   WARUM EIN PLAN UND KEIN BLINDER `sed -i 's/398/419/'`: Zwei ADRs teilen sich
   heute dieselbe Nummer — ein dateiweiter oder gar repoweiter Ersatz der
   bloßen Zahl träfe BEIDE, nicht nur die wandernde. Ein bloßer Verweis wie
   „U2-ADR-398" ohne weiteren Kontext in derselben Zeile ist zwischen den
   beiden NICHT automatisch entscheidbar (gemessen: von 47 betroffenen Dateien
   ließen sich per Schlüsselwort nur 20 eindeutig einer Seite zuordnen, 6
   trugen Bezüge zu BEIDEN Themen in derselben Datei, 26 zu keinem der beiden
   Vokabulare — brauchen also eine echte Lektüre, kein Wortmuster). Darum
   nimmt dieses Werkzeug die Entscheidung, WELCHE Zeile zur wandernden ADR
   gehört, nicht selbst vor — sie kommt als geprüfter PLAN (JSON), von einer
   Person oder Sitzung erstellt, die die Zeilen wirklich gelesen hat. Das
   Werkzeug macht nur den fehleranfälligen Teil sicher: 47 Dateien von Hand
   bearbeiten, ohne eine zu vergessen oder eine falsche Zeile der falschen
   ADR zuzuschlagen.

   PLAN-FORMAT (JSON, --plan <datei>):
   {
     "alteDatei": "vivodepot-U2-ADR-398-<slug>-<datum>.md",   // relativ zu docs/adr/
     "neueDatei": "vivodepot-U2-ADR-<NNN>-<slug>-<datum>.md", // derselbe Slug/Datum, neue Nummer
     "alteNummer": "398",
     "neueNummer": "<NNN>",
     "verweise": [
       { "datei": "tests/irgendein.test.js", "zeile": 42, "erwartetTextEnthaelt": "U2-ADR-398" }
       // "zeile" ist 1-indiziert, wie ein Editor sie zeigt.
     ]
   }

   JEDER Verweis wird vor dem Schreiben gegen `erwartetTextEnthaelt` geprüft
   (Sanity-Check: hat sich die Zeilennummer seit dem Lesen des Plans
   verschoben — neuer Commit dazwischen —, bricht der Lauf sofort ab, ändert
   NICHTS, und nennt die abweichende Datei). Auf der betroffenen Zeile wird
   NUR das erste Vorkommen von `U2-ADR-<alteNummer>` ersetzt (Wortgrenze),
   nicht die ganze Zeile und nicht die ganze Datei — eine zweite, andere
   ADR-Nummer in derselben Zeile bleibt unberührt.

   AUFRUF
     node tools/adr-nummer-verschieben.js --plan <plan.json> --probe   nur anzeigen, nichts schreiben
     node tools/adr-nummer-verschieben.js --plan <plan.json>           ausführen
   Nach dem Lauf (nicht Teil dieses Werkzeugs, von Hand/Suite nachziehen):
     node tools/adr-readme-erzeugen.js
     node tools/faktenbasis-erzeugen.js --ohne-suite
     node tools/adr-bestand-pruefen.js docs/adr --gate   (muss die verschobene Nummer nicht mehr zeigen)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

function ladePlan(pfad) {
  const roh = fs.readFileSync(path.resolve(pfad), 'utf8');
  const plan = JSON.parse(roh);
  for (const feld of ['alteDatei', 'neueDatei', 'alteNummer', 'neueNummer', 'verweise']) {
    if (!(feld in plan)) throw new Error('Plan ohne Feld „' + feld + '"');
  }
  if (!Array.isArray(plan.verweise)) throw new Error('Plan-Feld „verweise" muss eine Liste sein');
  return plan;
}

function pruefePlan(plan, repoWurzel = REPO) {
  const adrOrdner = path.join(repoWurzel, 'docs', 'adr');
  const befunde = [];
  const alterPfad = path.join(adrOrdner, plan.alteDatei);
  const neuerPfad = path.join(adrOrdner, plan.neueDatei);
  if (!fs.existsSync(alterPfad)) befunde.push('alteDatei existiert nicht: ' + plan.alteDatei);
  if (fs.existsSync(neuerPfad)) befunde.push('neueDatei existiert bereits: ' + plan.neueDatei);
  if (!new RegExp('\\bU2-ADR-' + plan.alteNummer + '\\b').test('U2-ADR-' + plan.alteNummer)) {
    befunde.push('alteNummer sieht nicht wie ein Nummernkörper aus: ' + plan.alteNummer);
  }
  for (const v of plan.verweise) {
    const voll = path.join(repoWurzel, v.datei);
    if (!fs.existsSync(voll)) { befunde.push(v.datei + ': Datei existiert nicht'); continue; }
    const zeilen = fs.readFileSync(voll, 'utf8').split('\n');
    const zeile = zeilen[v.zeile - 1];
    if (zeile === undefined) { befunde.push(v.datei + ':' + v.zeile + ': Zeile existiert nicht (Datei hat nur ' + zeilen.length + ')'); continue; }
    if (!zeile.includes(v.erwartetTextEnthaelt)) {
      befunde.push(v.datei + ':' + v.zeile + ': erwarteter Text nicht gefunden (Zeile hat sich verschoben?) — '
        + 'erwartet Teilstring ' + JSON.stringify(v.erwartetTextEnthaelt) + ', Zeile ist: ' + JSON.stringify(zeile.slice(0, 120)));
      continue;
    }
    const muster = new RegExp('\\bU2-ADR-' + plan.alteNummer + '\\b');
    if (!muster.test(zeile)) {
      befunde.push(v.datei + ':' + v.zeile + ': Zeile enthält den erwarteten Text, aber keine U2-ADR-' + plan.alteNummer + '-Referenz mehr');
    }
  }
  return befunde;
}

function fuehreAus(plan, { probe, repoWurzel = REPO }) {
  const adrOrdner = path.join(repoWurzel, 'docs', 'adr');
  const alterPfad = path.join(adrOrdner, plan.alteDatei);
  const neuerPfad = path.join(adrOrdner, plan.neueDatei);
  const alteNummerMuster = new RegExp('\\bU2-ADR-' + plan.alteNummer + '\\b', 'g');
  const neueKennung = 'U2-ADR-' + plan.neueNummer;

  const eigeneAenderungen = [{ art: 'umbenennen', von: plan.alteDatei, nach: plan.neueDatei }];
  const eigenerText = fs.readFileSync(alterPfad, 'utf8');
  const eigenerNeuerText = eigenerText.replace(alteNummerMuster, neueKennung);
  const eigeneTreffer = (eigenerText.match(alteNummerMuster) || []).length;
  eigeneAenderungen.push({ art: 'eigene Referenzen ersetzt', anzahl: eigeneTreffer });

  const externeAenderungen = [];
  for (const v of plan.verweise) {
    const voll = path.join(repoWurzel, v.datei);
    const zeilen = fs.readFileSync(voll, 'utf8').split('\n');
    const original = zeilen[v.zeile - 1];
    const ersetzt = original.replace(new RegExp('\\bU2-ADR-' + plan.alteNummer + '\\b'), neueKennung);
    externeAenderungen.push({ datei: v.datei, zeile: v.zeile, von: original, nach: ersetzt });
    if (!probe) {
      zeilen[v.zeile - 1] = ersetzt;
      fs.writeFileSync(voll, zeilen.join('\n'));
    }
  }

  if (!probe) {
    fs.renameSync(alterPfad, neuerPfad);
    fs.writeFileSync(neuerPfad, eigenerNeuerText);
  }

  return { eigeneAenderungen, externeAenderungen };
}

function main() {
  const argv = process.argv.slice(2);
  const planArgIndex = argv.indexOf('--plan');
  if (planArgIndex === -1 || !argv[planArgIndex + 1]) {
    console.error('Aufruf: node tools/adr-nummer-verschieben.js --plan <plan.json> [--probe]');
    process.exit(1);
  }
  const probe = argv.includes('--probe');
  const plan = ladePlan(argv[planArgIndex + 1]);

  const befunde = pruefePlan(plan);
  if (befunde.length) {
    console.error('ABBRUCH — Plan passt nicht mehr auf den echten Bestand:');
    for (const b of befunde) console.error('  ' + b);
    console.error('Nichts geändert. Plan gegen den aktuellen Stand neu erstellen, dann erneut versuchen.');
    process.exit(1);
  }

  const { eigeneAenderungen, externeAenderungen } = fuehreAus(plan, { probe });

  console.log((probe ? '--probe: nichts geschrieben. ' : '') + 'U2-ADR-' + plan.alteNummer + ' → U2-ADR-' + plan.neueNummer + ':');
  console.log('  ' + plan.alteDatei + ' → ' + plan.neueDatei);
  console.log('  eigene Referenzen in der Datei ersetzt: ' + eigeneAenderungen[1].anzahl);
  console.log('  externe Verweise ersetzt: ' + externeAenderungen.length);
  for (const a of externeAenderungen) console.log('    ' + a.datei + ':' + a.zeile);
  if (!probe) {
    console.log('');
    console.log('Jetzt von Hand/Suite nachziehen:');
    console.log('  node tools/adr-readme-erzeugen.js');
    console.log('  node tools/faktenbasis-erzeugen.js --ohne-suite');
    console.log('  node tools/adr-bestand-pruefen.js docs/adr --gate');
  }
}

if (require.main === module) main();
module.exports = { ladePlan, pruefePlan, fuehreAus };
