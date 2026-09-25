#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Migrationsketten-Deckung messen — welche der 52 Stufen deckt das
   Schema-19-Referenzdepot wirklich ab? (Auftrag, 03.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Rot-Beweis ALS Deckungsmessung: jede der 52 Stufen wird einzeln
   "getoetet" (ihr Transform-Code entfernt, nur die Versions-Anhebung
   bleibt, damit die Kette trotzdem bis zur aktuellen Version durchlaeuft),
   und das Schema-19-Referenzdepot (`tests/fixtures/referenzdepot-schema19.js`)
   laeuft durch die so mutierte Kette. Ändert sich die Ausgabe GAR NICHT
   gegenüber dem unmutierten Lauf, hat die Stufe auf dieses Fixture keine
   Wirkung — das Fixture deckt sie nicht ab. Ändert sich die Ausgabe, deckt
   das Fixture die Stufe ab (eine kuenftige Probe auf diesem Fixture wuerde
   bei einem echten Ausfall dieser Stufe rot).

   Segment-Grenzen: `ziel.schemaVersion = N;` kommt in Quellreihenfolge fuer
   N=24..75 GENAU EINMAL vor (Monotonie, von schema-governance-guard.test.js
   bereits erzwungen) — mal als eigene Anweisung nach einem einzeiligen
   `if(...) ziel.schemaVersion=N;`, mal (Stufe 75) innerhalb eines
   mehrzeiligen Blocks. Die Suche ist deshalb NICHT auf die einzeilige Form
   angewiesen: sie sucht direkt nach der Zuweisung selbst, in Quellreihenfolge,
   und ersetzt jedes Segment durch eine NORMALISIERTE Minimal-Anweisung —
   unabhaengig von der urspruenglichen Ein-/Mehrzeiler-Form.

   Aufruf: node scripts/migrationskette-schema19-deckung-messen.js [--stufe N]
   Ohne --stufe: alle 52 Stufen. Mit --stufe: nur diese eine (schnell, zum
   gezielten Nachpruefen eines einzelnen Befunds).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const ORIG_HTML = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');

function funktionsGrenzen(quelle, name) {
  const marker = 'function ' + name + '(d) {';
  const start = quelle.indexOf(marker);
  if (start < 0) throw new Error('Funktion nicht gefunden: ' + name);
  let tiefe = 0, i = start, ende = -1;
  for (; i < quelle.length; i++) {
    const c = quelle[i];
    if (c === '{') tiefe++;
    else if (c === '}') { tiefe--; if (tiefe === 0) { ende = i; break; } }
  }
  if (ende < 0) throw new Error('Funktionsende nicht gefunden: ' + name);
  return { start, ende };
}

// Findet fuer jede Stufe N (24..75) die END-Position der Zuweisung `schemaVersion = N;`
// innerhalb der Funktion, in Quellreihenfolge (robust gegen Ein-/Mehrzeiler-Form). Steht
// die Zuweisung in einem umschliessenden Block (`if (...) { ...; schemaVersion=N; }`, Stufe
// 75), gehoert die schliessende `}` NOCH zu diesem Segment — sonst bliebe eine verwaiste
// Klammer im Rest-Text stehen und die mutierte Datei waere kein gueltiges JavaScript mehr.
function segmentGrenzen(funktionsText) {
  const grenzen = [];
  let suchAb = 0;
  for (let n = 24; n <= 75; n++) {
    const nadel = 'ziel.schemaVersion = ' + n + ';';
    const pos = funktionsText.indexOf(nadel, suchAb);
    if (pos < 0) throw new Error('Zuweisung fuer Stufe ' + n + ' nicht gefunden (ab Position ' + suchAb + ')');
    let ende = pos + nadel.length;
    let i = ende;
    while (i < funktionsText.length && /\s/.test(funktionsText[i])) i++;
    if (funktionsText[i] === '}') ende = i + 1;
    grenzen.push({ n, ende });
    suchAb = ende;
  }
  return grenzen;
}

// Baut den vollstaendigen, mutierten Funktionstext: Segment `zielStufe` wird auf eine
// normalisierte Minimal-Anweisung reduziert, alle anderen Segmente bleiben unangetastet.
function mutierterFunktionsText(funktionsText, grenzen, zielStufe) {
  // `funktionsText` beginnt mit `function depotNormalisieren(d) {` — die ERSTE `{` darin ist
  // die eigene Oeffnungsklammer der Funktion, kein Segment-Inhalt. Sie muss erhalten bleiben,
  // sonst verliert die mutierte Funktion ihre eigene Klammerung (traf Segment 24, das erste).
  // ZUSAETZLICH gehoert die PRAEAMBEL (`const ziel = ...`, Fruehausstieg bei Nicht-Objekt)
  // technisch noch zu Segment 24 (sie steht vor dessen Bump-Zeile), ist aber KEIN Teil von
  // Stufe 24s eigenem Transform — sie wird von JEDER Stufe gebraucht. Ohne diese Ausnahme
  // wuerde das Stummschalten von Stufe 24 die Funktion komplett lahmlegen (ReferenceError
  // auf `ziel` selbst) statt nur Stufe 24s eigene Wirkung zu entfernen.
  const praeambel = "const ziel = d || data;\n  if (!ziel || typeof ziel !== 'object') return ziel;\n";
  let funktionsOeffnung = funktionsText.indexOf('{') + 1;
  const praeambelPos = funktionsText.indexOf(praeambel, funktionsOeffnung);
  const luecke = praeambelPos >= 0 ? funktionsText.slice(funktionsOeffnung, praeambelPos) : null;
  if (praeambelPos >= 0 && /^\s*$/.test(luecke)) funktionsOeffnung = praeambelPos + praeambel.length;
  else throw new Error('Praeambel nicht direkt (nur durch Leerraum getrennt) nach der Funktionsoeffnung gefunden — Quelltext hat sich vermutlich geaendert, Fund pruefen statt stillschweigend weiterlaufen.');
  let raus = funktionsText.slice(0, funktionsOeffnung);
  let vorherigesEnde = funktionsOeffnung;
  for (const g of grenzen) {
    const segment = funktionsText.slice(vorherigesEnde, g.ende);
    if (g.n === zielStufe) {
      raus += "\n  if (typeof ziel.schemaVersion === 'number' && ziel.schemaVersion < " + g.n
            + ') { ziel.schemaVersion = ' + g.n + '; } // [DECKUNGSMESSUNG] Stufe ' + g.n + ' stummgeschaltet\n';
    } else {
      raus += segment;
    }
    vorherigesEnde = g.ende;
  }
  // Rest nach der letzten Zuweisung (Funktionsende) unveraendert anhaengen.
  raus += funktionsText.slice(vorherigesEnde);
  return raus;
}

function laufMitMutation(zielStufeOderNull) {
  const { start, ende } = funktionsGrenzen(ORIG_HTML, 'depotNormalisieren');
  const funktionsText = ORIG_HTML.slice(start, ende + 1);
  let neuerFunktionsText = funktionsText;
  if (zielStufeOderNull != null) {
    const grenzen = segmentGrenzen(funktionsText);
    neuerFunktionsText = mutierterFunktionsText(funktionsText, grenzen, zielStufeOderNull);
  }
  const neuesHtml = ORIG_HTML.slice(0, start) + neuerFunktionsText + ORIG_HTML.slice(ende + 1);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrationskette-deckung-'));
  const tmpHtml = path.join(tmpDir, 'vivodepot.html');
  fs.writeFileSync(tmpHtml, neuesHtml, 'utf8');
  try {
    const skript = `
      const { ladeKern } = require(${JSON.stringify(path.join(REPO, 'tests', 'load-kern.js'))});
      const { baueDepotSchema19 } = require(${JSON.stringify(path.join(REPO, 'tests', 'fixtures', 'referenzdepot-schema19.js'))});
      const { V } = ladeKern();
      const migriert = V.depotNormalisieren(baueDepotSchema19());
      process.stdout.write(JSON.stringify(migriert));
    `;
    const out = execFileSync('node', ['-e', skript], {
      cwd: REPO, encoding: 'utf8', env: { ...process.env, KERN_HTML_PATH: tmpHtml },
    });
    return out;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  const stufeIdx = args.indexOf('--stufe');
  const nurStufe = stufeIdx >= 0 ? Number(args[stufeIdx + 1]) : null;

  console.error('Baseline (unmutiert) laeuft...');
  const baseline = laufMitMutation(null);
  console.error('Baseline: ' + baseline.length + ' Zeichen JSON.');

  const stufen = nurStufe != null ? [nurStufe] : Array.from({ length: 52 }, (_, i) => i + 24);
  const abgedeckt = [], nichtAbgedeckt = [];
  for (const n of stufen) {
    process.stderr.write('Stufe ' + n + ' stummschalten... ');
    let out;
    try {
      out = laufMitMutation(n);
    } catch (e) {
      console.error('FEHLER: ' + e.message);
      nichtAbgedeckt.push({ n, grund: 'FEHLER: ' + e.message });
      continue;
    }
    if (out === baseline) {
      console.error('UNVERAENDERT (nicht abgedeckt)');
      nichtAbgedeckt.push({ n });
    } else {
      console.error('AENDERT SICH (abgedeckt)');
      abgedeckt.push(n);
    }
  }

  console.log('\n=== ERGEBNIS ===');
  console.log('Abgedeckt (' + abgedeckt.length + '/' + stufen.length + '):', abgedeckt.join(', '));
  console.log('NICHT abgedeckt (' + nichtAbgedeckt.length + '/' + stufen.length + '):',
    nichtAbgedeckt.map(x => x.n).join(', '));
}

main();
