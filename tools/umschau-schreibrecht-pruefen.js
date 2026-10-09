'use strict';
/* umschau-schreibrecht-pruefen.js — keine Eintrage-Stelle schweigt in der Umschau (06.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   In der Umschau (imVorschau(): ohne Depot, ohne Sitzungsakteur) ist Modus.darfBearbeiten() überall false. Jede Stelle,
   die daran eine Eintrage-Möglichkeit hängt, zeigte dort den Schreibschutz-Pfad: Feldwert als Text, Knopf weg, kein
   Hinweis. Eine Nutzerin glaubte darum, sie müsse „erst freigeschaltet werden“. Der Weg ist seither einer: jede solche
   Stelle führt in der Umschau zu „Depot anlegen“ (umschauEinrichten).

   Gemessen wird je Funktion des Kerns: liest sie Modus.darfBearbeiten() und nennt sie imVorschau() NICHT, steht sie in
   der Liste. Die Grundlinie (tools/umschau-schreibrecht-grundlinie.json) hält den Bestand mit Grund; sie darf nur
   sinken. Eine neue Funktion in der Liste ist rot: sie entscheidet über Schreibrecht, ohne an die Umschau zu denken.

   Aufruf:
     node tools/umschau-schreibrecht-pruefen.js                       Abgleich gegen die Grundlinie (Exit 0/1)
     node tools/umschau-schreibrecht-pruefen.js --kern <datei>        einen anderen Kern prüfen
   Probe: tests/umschau-eintragen-klasse.test.js. */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(REPO, 'tools', 'umschau-schreibrecht-grundlinie.json');

// Die Funktion, in der eine Stelle steht: die letzte Deklaration davor, die auf Spalte 0 beginnt.
const KOPF = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/;

function funktionen(text) {
  const zeilen = text.split('\n');
  const aus = new Map();
  let name = null, start = 0;
  const schliessen = (bis) => { if (name) aus.set(name, (aus.get(name) || '') + zeilen.slice(start, bis).join('\n')); };
  zeilen.forEach((z, i) => {
    const m = KOPF.exec(z);
    if (m) { schliessen(i); name = m[1] || m[2]; start = i; }
  });
  schliessen(zeilen.length);
  return aus;
}

function ohneKommentare(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"])\/\/[^\n]*/g, '$1');
}

/* Funktionen, die Modus.darfBearbeiten() lesen und imVorschau() nicht nennen. → sortierte Namensliste */
function messen(kernText) {
  const aus = [];
  for (const [name, code] of funktionen(kernText)) {
    const c = ohneKommentare(code);
    if (/Modus\.darfBearbeiten\(\)/.test(c) && !/\bimVorschau\(\)/.test(c)) aus.push(name);
  }
  return aus.sort();
}

function abgleichen(ist, grundlinie) {
  const bekannt = new Set(grundlinie.funktionen.map((f) => f.name));
  const funde = [];
  for (const n of ist) if (!bekannt.has(n)) funde.push('neu: ' + n + ' liest Modus.darfBearbeiten() ohne imVorschau()-Zweig');
  for (const n of bekannt) if (!ist.includes(n)) funde.push('Luft: ' + n + ' steht nicht mehr in der Liste — Grundlinie senken');
  for (const f of grundlinie.funktionen) if (!f.grund || f.grund.length < 12) funde.push('ohne Grund: ' + f.name);
  return funde;
}

function main(argv) {
  const i = argv.indexOf('--kern');
  const kern = fs.readFileSync(i >= 0 ? path.resolve(argv[i + 1]) : path.join(REPO, 'vivodepot.html'), 'utf8');
  const funde = abgleichen(messen(kern), JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')));
  if (funde.length) { process.stdout.write('[umschau-schreibrecht] ROT\n  ' + funde.join('\n  ') + '\n'); return 1; }
  process.stdout.write('[umschau-schreibrecht] grün\n');
  return 0;
}

module.exports = { messen, abgleichen, funktionen };
if (require.main === module) process.exit(main(process.argv.slice(2)));
