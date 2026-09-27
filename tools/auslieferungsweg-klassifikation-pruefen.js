#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   auslieferungsweg-klassifikation-pruefen.js — „Rangfolge
   bauen", Posten 2 von 3 (11.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DIE VOLLIMPORT-BAUFORM AUF AUSLIEFERUNGSORTE ÜBERTRAGEN (eigener
   Vorschlag, angenommen): so wie `VOLLIMPORT_MITNEHMEN_SCHLUESSEL`/
   `VOLLIMPORT_DRAUSSEN_SCHLUESSEL` jeden Depot-Schlüssel klassifizieren und
   ein neuer, unklassifizierter Schlüssel den Wächter reißt, klassifiziert
   `tools/lib/auslieferungsorte-register.js` jeden Auslieferungsort — und ein
   neuer Ort OHNE Eintrag reißt DIESEN Wächter. Sonst wächst die
   Zersplitterung (heute: drei verschiedene Bauformen für vier Orte)
   stillschweigend weiter.

   EIGENE ENTDECKUNG, NICHT `vorhandeneSlugs()` AUS `modul-app-packen.js`:
   dieses Werkzeug scannt `module-apps/*` selbst (eigener `fs.readdirSync`),
   statt die Entdeckungsfunktion des Erzeugers zu importieren — dieselbe
   Unabhängigkeits-Regel wie beim Register selbst (s. dort).

   ZWEI FUND-RICHTUNGEN, wie beim Vollimport-Wächter („mehr Ordner als
   Klassifikation" UND „mehr Klassifikation als Ordner" wären beide ein
   Auseinanderlaufen):
     A) ein Ordner existiert (Wurzel zählt immer als Ort), ist aber in
        keinem Register-Eintrag mit passendem `pfad` geführt — NEUER,
        UNKLASSIFIZIERTER ORT.
     B) ein Register-Eintrag behauptet `weg !== 'NICHT_VORHANDEN'`, aber der
        Ordner existiert nicht (mehr) — VERWAISTER EINTRAG.

   OHNE ARGUMENT gegen `tests/fixtures/auslieferungsorte-beispiel/`. `--ziel
   <pfad>` gegen den echten `vivodepot-ios-test`-Klon. `--gate` → Exit 1 bei
   jedem Fund.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { AUSLIEFERUNGSORTE } = require('./lib/auslieferungsorte-register.js');

const REPO = path.join(__dirname, '..');
const FIXTURE_ZIEL = path.join(REPO, 'tests', 'fixtures', 'auslieferungsorte-beispiel');

// Eigene, kleine Entdeckung — KEIN Import aus modul-app-packen.js. Die Wurzel selbst zählt
// immer als EIN Ort (pfad ''), zusätzlich jeder direkte Unterordner von module-apps/, der
// selbst eine vivodepot.html trägt (ein leerer/fremder Ordner dort ist kein Auslieferungsort).
function entdeckteOrte(zielVerzeichnis) {
  const orte = [];
  if (fs.existsSync(path.join(zielVerzeichnis, 'vivodepot.html'))) orte.push('');
  const moduleApps = path.join(zielVerzeichnis, 'module-apps');
  if (fs.existsSync(moduleApps)) {
    for (const eintrag of fs.readdirSync(moduleApps, { withFileTypes: true })) {
      if (!eintrag.isDirectory()) continue;
      const kandidat = path.join('module-apps', eintrag.name);
      if (fs.existsSync(path.join(zielVerzeichnis, kandidat, 'vivodepot.html'))) orte.push(kandidat);
    }
  }
  return orte;
}

function pruefeKlassifikation(zielVerzeichnis) {
  const gefundenePfade = entdeckteOrte(zielVerzeichnis);
  const registerPfade = new Set(
    AUSLIEFERUNGSORTE.filter((o) => o.weg !== 'NICHT_VORHANDEN').map((o) => o.pfad)
  );
  const funde = [];

  for (const pfad of gefundenePfade) {
    if (!registerPfade.has(pfad)) {
      funde.push({
        art: 'unklassifiziert', pfad,
        text: '„' + (pfad || '(Wurzel)') + '" existiert in ' + zielVerzeichnis
          + ', ist aber in keinem Eintrag von tools/lib/auslieferungsorte-register.js geführt — '
          + 'neuer Ort ohne Einordnung.',
      });
    }
  }
  for (const ort of AUSLIEFERUNGSORTE) {
    if (ort.weg === 'NICHT_VORHANDEN') continue;
    if (!gefundenePfade.includes(ort.pfad)) {
      funde.push({
        art: 'verwaist', pfad: ort.pfad, slug: ort.slug,
        text: 'Register führt „' + ort.slug + '" (Weg ' + ort.weg + ') unter „' + (ort.pfad || '(Wurzel)')
          + '", der Ordner existiert dort aber nicht (mehr) in ' + zielVerzeichnis + '.',
      });
    }
  }
  return { funde, gefundenePfade };
}

function main() {
  const argv = process.argv.slice(2);
  const argWert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const ziel = path.resolve(argWert('--ziel') || FIXTURE_ZIEL);
  const gate = argv.includes('--gate');

  console.log('[auslieferungsweg-klassifikation] Ziel: ' + ziel);
  const { funde, gefundenePfade } = pruefeKlassifikation(ziel);
  console.log('  gefundene Orte: ' + (gefundenePfade.length ? gefundenePfade.map((p) => p || '(Wurzel)').join(', ') : '(keiner)'));
  if (!funde.length) {
    console.log('[auslieferungsweg-klassifikation] OK — jeder gefundene Ort ist klassifiziert, kein Eintrag verwaist.');
    return;
  }
  console.log('[auslieferungsweg-klassifikation] ' + funde.length + ' Fund(e):');
  for (const f of funde) console.log('  [' + f.art + '] ' + f.text);
  if (gate) process.exit(1);
}

if (require.main === module) main();
module.exports = { entdeckteOrte, pruefeKlassifikation, FIXTURE_ZIEL };
