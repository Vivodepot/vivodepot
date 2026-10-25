'use strict';
/* schalter-pruefen.js — `--help` und unbekannte Schalter halten ein Werkzeug an, bevor es etwas tut (22.10.2026).

   Anlass: `node tools/faktenbasis-erzeugen.js --help` fuhr eine Suite ohne Platz und schrieb docs/faktenbasis.md neu —
   das Werkzeug kannte `--help` nicht und lief mit seiner Vorgabe. Dasselbe galt für jedes schreibende Werkzeug, das
   Schalter nur mit `argv.includes(…)` abfragt: ein Tippfehler (`--chek`) wird still zur Vorgabe, und die schreibt.

   Aufruf, als erste Zeile nach 'use strict':
     require('./lib/schalter-pruefen.js').schalterPruefen(module);
   Wirkt nur, wenn die Datei selbst gestartet wurde (require.main === module); als Bibliothek geladen tut es nichts.
   Bekannt sind die Schalter, die als Zeichenkette '--name' im Quelltext der Datei stehen — keine zweite Liste, die
   veralten kann. `--help`/`-h`: Kopfkommentar ausgeben, Exit 0. Unbekannter Schalter: Meldung und Kopfkommentar,
   Exit 2. Werte hinter einem Schalter (`--ausgabe pfad`) sind keine Schalter und werden nicht geprüft. */
const fs = require('node:fs');
const path = require('node:path');

const PASSPHRASE_IM_ARGV = /^--?passphrase(=.*)?$/i;   // dasselbe Muster wie die Sperre in lib/schluesselbund.js

function bekannteSchalter(quelltext) {
  const bekannt = new Set([...quelltext.matchAll(/['"`](--[a-z0-9][a-z0-9-]*)(?:=)?['"`=]/g)].map((m) => m[1]));
  // Schalter über einen Leser wie `const arg = (n) => argv.indexOf('--' + n)…`: die Namen aus den Aufrufen `arg('name')`.
  const leser = [...quelltext.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\([^)]*\)\s*=>[^\n]*'--'\s*\+|function\s+(\w+)\s*\([^)]*\)\s*\{[^\n]*'--'\s*\+/g)]
    .map((m) => m[1] || m[2]);
  for (const name of leser) {
    for (const m of quelltext.matchAll(new RegExp('\\b' + name + '\\(\\s*[\'"]([a-z0-9][a-z0-9-]*)[\'"]', 'g'))) bekannt.add('--' + m[1]);
  }
  return bekannt;
}

function kopfkommentar(quelltext) {
  const m = quelltext.match(/\/\*[\s\S]*?\*\//);
  return m ? m[0] : '(kein Kopfkommentar)';
}

/* Reines Urteil, ohne Ausgabe und ohne Exit — für die Probe. */
function schalterUrteil(argv, quelltext) {
  // Eine Passphrase im argv sperren die Werkzeuge selbst; diese Prüfung läuft vorher und sperrt darum mit demselben Satz.
  if (argv.some((a) => PASSPHRASE_IM_ARGV.test(a))) return { art: 'passphrase' };
  if (argv.includes('--help') || argv.includes('-h')) return { art: 'hilfe' };
  const bekannt = bekannteSchalter(quelltext);
  const unbekannt = argv.filter((a) => a.startsWith('--') && !bekannt.has(a.split('=')[0]));
  return unbekannt.length ? { art: 'unbekannt', unbekannt } : { art: 'weiter' };
}

function schalterPruefen(mod, argv = process.argv.slice(2)) {
  if (require.main !== mod) return;
  const quelltext = fs.readFileSync(mod.filename, 'utf8');
  const u = schalterUrteil(argv, quelltext);
  if (u.art === 'weiter') return;
  const name = path.basename(mod.filename);
  if (u.art === 'passphrase') {
    console.error(`${name}: Passphrase darf nie als Kommandozeilenargument übergeben werden — Schlüsselbund oder stdin.`);
    process.exit(2);
  }
  if (u.art === 'unbekannt') console.error(`${name}: unbekannter Schalter ${u.unbekannt.join(', ')} — nichts ausgeführt.`);
  console.log(kopfkommentar(quelltext));
  process.exit(u.art === 'hilfe' ? 0 : 2);
}

module.exports = { schalterPruefen, schalterUrteil, bekannteSchalter };
