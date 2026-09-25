#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   wizards-template-erzeugen.js — die fünf reinen Wizards als Template-Register
   ────────────────────────────────────────────────────────────────────────────
   Strang D (17.09.2026), Rundlauf statt Autorenwerkzeug: erzeugt, was es schon gibt — kein Weg,
   einen neuen Wizard zu entwerfen.

   FÜNF, NICHT SIEBEN. Von den sieben Wizards im Bestand bestehen `pvwiz` und `kiwiz` zu
   100 % aus Korpus-Schritten (`PV_BMJ.steps`/`KI_KORPUS.steps`, über
   `_pvBmjSchrittZuWizardSchritt`/`_kiKorpusSchrittZuWizardSchritt`) plus einer generischen
   Fallback-Regel in `_textsatzAufWizardsAnwenden` — kein wizard-eigener Inhalt. Die zwei
   handgeschriebenen `_pvwizEigeneSchritte` sind funktional redundant zur Fallback-Regel
   (byte-gleich gemessen) und entfallen ersatzlos. Diese beiden Wizards werden vom
   Rechtsraum-Modul-Umzug (Strang -21) getragen, nicht von hier — Klärung 17.09.2026,
   „Variante (a)": beide bleiben außerhalb des Feldregister/Template-Generator-Rundlaufs.

   `frage`/`hilfetext` GEHÖREN NICHT INS MODUL: sie entstehen zur Laufzeit aus Textsatz-
   Kennungen — würden sie hier hineingeschrieben, stünde derselbe Text in einem Modul UND auf
   der Sprachachse. Gemessen, nicht angenommen: für jeden wizard-eigenen Schritt existiert
   bereits eine `wizard:<wizardId>.<feldId>.frage`/`.hilfetext`-Kennung in beiden
   Sprachmodulen (Beispiel: `wizard:anamwiz.chronicConditionsDiagnoses.frage`, DE und EN
   belegt) — der Rundlauf braucht sie darum nicht zu tragen, sie sind auf der Sprachachse
   bereits vorhanden.

   DIE SCHRITTFORM (gemessen gegen `dceab851`): gemeinsame Wurzel `{feld, verborgenWenn?}`,
   Wizard-Erweiterung `+ziel?` (überschreibt das Wizard-Standardziel, `wizardSchrittZiel()`).

   QUELLE: `tests/load-kern.js` — derselbe geladene, materialisierte Kern wie überall sonst in
   dieser Kette (Feldkatalog, Bereich-Vergleich). Kein Parallel-Parser der rohen `WIZARDS`-
   Literale: die Materialisierung selbst (`_textsatzAufWizardsAnwenden`) ist die einzige Stelle,
   die weiß, was Kennung und was echter Inhalt ist — ein zweiter Leseweg wäre die Kopie, gegen
   die U2-ADR-149 gebaut ist.

   Aufruf:
     node tools/wizards-template-erzeugen.js            → schreibt tools/wizards-template.json
     node tools/wizards-template-erzeugen.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ZIEL = path.join(REPO, 'tools', 'wizards-template.json');

// Nur diese fünf — s. Kopf-Kommentar. Reihenfolge egal, aber fest, damit das Ergebnis
// zwischen zwei Läufen byte-gleich bleibt (kein Set-Iterationsverhalten im Ausgabetext).
const REINE_WIZARD_IDS = Object.freeze(['gebwiz', 'anamwiz', 'pflwiz', 'heirwiz', 'umzwiz']);

/* Ein Schritt, auf die Rundlauf-Form gebracht: feld (Pflicht) + verborgenWenn?/ziel? (optional,
   nur wenn wirklich gesetzt — kein `undefined`-Schlüssel im Ausgabetext). `frage`/`hilfetext`
   werden bewusst NICHT übernommen, s. Kopf-Kommentar. */
function schrittAufTemplateform(schritt) {
  const raus = { feld: schritt.feld };
  if (schritt.verborgenWenn !== undefined) raus.verborgenWenn = schritt.verborgenWenn;
  if (schritt.ziel !== undefined) raus.ziel = schritt.ziel;
  return raus;
}

function wizardsAusKern() {
  const { ladeKern } = require('../tests/load-kern.js');
  const { V } = ladeKern();
  const wizards = {};
  for (const wizId of REINE_WIZARD_IDS) {
    const w = Object.values(V.WIZARDS).find((x) => x.id === wizId);
    if (!w) throw new Error('Wizard „' + wizId + '" nicht im geladenen Kern gefunden — Anker prüfen.');
    wizards[wizId] = {
      icon: w.icon,
      ziel: w.ziel,
      schritte: w.schritte.map(schrittAufTemplateform),
    };
  }
  return wizards;
}

function transportInhalt(wizards) {
  return JSON.stringify({
    // Singular, wie jeder andere Registertyp im Haus (bereich/logikModul/vorlage/situation/
    // wizard) — 1:1 aus dem bestehenden EINLASS_REGISTER-Eintrag (`typ: 'wizard'`), nicht aus
    // bereichsModulPruefen()s Singular-Konvention geraten, aber dieselbe Regel. Mit dem Plural
    // fände die AB_WERK-Klassifikation (tools/lib/produkt-text-erzeugen.js,
    // _unsigniertesModulKlassifizieren gegen AB_WERK_REGIONEN.find(r => r.modulTyp ===
    // roh.modulTyp)) die Datei nicht — „Unbekannter modulTyp".
    modulTyp: 'wizard',
    moduleVersion: 1,
    herkunft: 'vivodepot',
    sprache: 'de',
    wizards,
  }, null, 2) + '\n';
}

function main() {
  const check = process.argv.includes('--check');
  const wizards = wizardsAusKern();
  const soll = transportInhalt(wizards);
  const ist = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, 'utf8') : null;
  if (ist === soll) {
    console.log('wizards-template-erzeugen: kein Drift — ' + REINE_WIZARD_IDS.length + ' Wizards, '
      + Object.values(wizards).reduce((n, w) => n + w.schritte.length, 0) + ' Schritte.');
    return;
  }
  if (check) {
    console.error('wizards-template-erzeugen: DRIFT — ' + path.relative(REPO, ZIEL));
    console.error('  Abhilfe: node tools/wizards-template-erzeugen.js');
    process.exit(1);
  }
  fs.writeFileSync(ZIEL, soll);
  console.log('wizards-template-erzeugen: geschrieben — ' + REINE_WIZARD_IDS.length + ' Wizards, '
    + Object.values(wizards).reduce((n, w) => n + w.schritte.length, 0) + ' Schritte.');
}

if (require.main === module) main();
module.exports = { wizardsAusKern, schrittAufTemplateform, transportInhalt, REINE_WIZARD_IDS, ZIEL };
