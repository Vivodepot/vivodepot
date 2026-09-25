#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   auslieferung-frischewarnung-pruefen.js — „Rangfolge bauen",
   Posten 1 von 3 (11.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS: der Auslieferungsort stand acht Tage/167 Versionen hinter dem
   Kanon, und keine Suite wurde rot — weil keine Suite je hinsah. Dieses
   Werkzeug sieht hin, ohne selbst auszuliefern.

   UNABHÄNGIGE LANDKARTE: die Orte kommen aus `tools/lib/auslieferungsorte-
   register.js` — von Hand gepflegt, NICHT aus `testfassung-legen.js`s
   `DATEISATZ` oder `modul-app-packen.js`s `vorhandeneSlugs()` abgeleitet.
   Ein Prüfer, der dieselbe Liste wie der Erzeuger benutzt, bewacht nichts —
   er stimmt per Konstruktion (11.09.2026).

   NUR MESSEN, NICHT BLOCKIEREN VON SICH AUS — Bauart wie `webseite-stand-
   pruefen.js`/`pages-lockstep-pruefen.js`: `--gate` gibt Exit 1 bei
   Überschreitung, ohne das Flag nur eine Meldung. Ob und wo das in einen Hook
   eingebunden wird, ist eine eigene Entscheidung (s. Bericht
   „testkonzept-uebergaenge-2026-09-11.md", Übergang #7 — genau das Muster,
   das `pages-lockstep-pruefen.js` bereits zeigt: ein Prüfer, der nie
   aufgerufen wird, bewacht so wenig wie keiner).

   OHNE ARGUMENT läuft es gegen `tests/fixtures/auslieferungsorte-beispiel/`
   (Prüfwerkzeuge entstehen im Repo, mit Fixture — stehende Regel). `--ziel
   <pfad>` zeigt auf den echten `vivodepot-ios-test`-Klon. `--kanon-stand
   <vNNN>` überschreibt den gelesenen Kanon-Stand (für Tests — ohne das Flag
   wird `vivodepot.html` DIESES Repos gelesen, ein beweglicher Wert, den ein
   Test nie fest erwarten darf). `--schwelle <n>` (Default 5) ist der
   Versionsabstand, ab dem ein Ort als veraltet gilt.

   Reine Funktionen exportiert, damit Tests sie direkt aufrufen — kein
   CLI-Subprozess nötig, kein beweglicher Kanon-Stand in der Suite.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { AUSLIEFERUNGSORTE } = require('./lib/auslieferungsorte-register.js');

const REPO = path.join(__dirname, '..');
const FIXTURE_ZIEL = path.join(REPO, 'tests', 'fixtures', 'auslieferungsorte-beispiel');
const SCHWELLE_DEFAULT = 5;

function liesSchalenStand(html) {
  const m = /const SCHALEN_STAND = '(v\d+)'/.exec(html);
  return m ? m[1] : null;
}

function alsZahl(vStand) {
  const m = /^v(\d+)$/.exec(String(vStand || ''));
  return m ? parseInt(m[1], 10) : null;
}

// Ein Ort je Register-Eintrag mit weg !== 'NICHT_VORHANDEN'. Fehlt die Datei am erwarteten
// Pfad ganz, ist das SELBST ein Fund (der Ort behauptet zu existieren, tut es aber nicht) —
// nicht dasselbe wie „veraltet", eine eigene Fehlerklasse.
function pruefeFrische(zielVerzeichnis, kanonStand, schwelle) {
  const kanonZahl = alsZahl(kanonStand);
  const funde = [];
  const gemessen = [];
  for (const ort of AUSLIEFERUNGSORTE) {
    if (ort.weg === 'NICHT_VORHANDEN') continue;
    const dateiPfad = path.join(zielVerzeichnis, ort.pfad, 'vivodepot.html');
    if (!fs.existsSync(dateiPfad)) {
      funde.push({ slug: ort.slug, art: 'fehlt', text: ort.slug + ': erwartete Datei fehlt (' + dateiPfad + ').' });
      continue;
    }
    const stand = liesSchalenStand(fs.readFileSync(dateiPfad, 'utf8'));
    const zahl = alsZahl(stand);
    if (zahl == null) {
      funde.push({ slug: ort.slug, art: 'unlesbar', text: ort.slug + ': SCHALEN_STAND nicht gefunden in ' + dateiPfad + '.' });
      continue;
    }
    const abstand = kanonZahl - zahl;
    gemessen.push({ slug: ort.slug, stand, abstand });
    if (abstand > schwelle) {
      funde.push({
        slug: ort.slug, art: 'veraltet', abstand,
        text: ort.slug + ': ' + stand + ' liegt ' + abstand + ' Versionen hinter Kanon ' + kanonStand
          + ' (Schwelle ' + schwelle + ').',
      });
    }
  }
  return { funde, gemessen };
}

function main() {
  const argv = process.argv.slice(2);
  const argWert = (name) => { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : null; };
  const ziel = path.resolve(argWert('--ziel') || FIXTURE_ZIEL);
  const schwelle = argWert('--schwelle') ? parseInt(argWert('--schwelle'), 10) : SCHWELLE_DEFAULT;
  let kanonStand = argWert('--kanon-stand');
  if (!kanonStand) {
    const eigenerKern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
    kanonStand = liesSchalenStand(eigenerKern);
  }
  const gate = argv.includes('--gate');

  console.log('[auslieferung-frischewarnung] Kanon: ' + kanonStand + ' · Schwelle: ' + schwelle + ' Versionen · Ziel: ' + ziel);
  const { funde, gemessen } = pruefeFrische(ziel, kanonStand, schwelle);
  for (const g of gemessen) console.log('  ' + g.slug + ': ' + g.stand + ' (Abstand ' + g.abstand + ')');
  if (!funde.length) {
    console.log('[auslieferung-frischewarnung] OK — kein Ort veraltet oder fehlend.');
    return;
  }
  console.log('[auslieferung-frischewarnung] ' + funde.length + ' Fund(e):');
  for (const f of funde) console.log('  [' + f.art + '] ' + f.text);
  if (gate) process.exit(1);
}

if (require.main === module) main();
module.exports = { liesSchalenStand, alsZahl, pruefeFrische, FIXTURE_ZIEL, SCHWELLE_DEFAULT };
