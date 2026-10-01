#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die selbst erzeugten Befunde der Vorführung „Patientin" gegen ihre EU-Profile prüfen
   ────────────────────────────────────────────────────────────────────────
   befunde-erzeugen.js baut zwei FHIR-Dokumente, die in der Demo als autoritative Befunde unter
   „Meine Dokumente" liegen. Dass der Kern sie annimmt, heißt nicht, dass sie ihrem Profil
   entsprechen — dieses Werkzeug fragt den offiziellen HL7-Validator.

   Offline: `-tx n/a` wie tests/konformitaet/externe-validatoren.mjs (dort ist gemessen, dass das
   Urteil ohne Terminologie-Server dasselbe bleibt). Die IG-Pakete müssen lokal im FHIR-Paket-Cache
   liegen, sonst lädt der Validator sie nach — dann ist der Lauf nicht mehr offline.

   VORBEHALT, DER ZU JEDEM ERGEBNIS GEHÖRT: `hl7.fhir.eu.hdr` liegt nur als 0.1.0-ballot vor. Ein
   Ballot-Profil kann Meldungen erzeugen, die am fertigen Standard nicht stünden — und umgekehrt
   schweigen, wo der fertige Standard strenger ist. Das Werkzeug schreibt den Vorbehalt darum in
   jede Ausgabe, nicht nur in diesen Kopf.

   Aufruf:  node tools/vorfuehrung/patientin/befunde-validieren.js --jar PFAD [--aus ORDNER] [--nur DATEI]
   --nur prüft eine einzelne Datei — ein Validator-Lauf braucht einen Slot wie eine Suite, und nach
   einem Fix an nur einem Befund muss der andere nicht mitlaufen.
   Ohne --jar: FHIR_VALIDATOR_JAR. Ohne beides: Abbruch mit Grund, kein stilles Grün.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const HIER = __dirname;
const FAELLE = [
  { datei: 'laborbefund-ca125.json', ig: 'hl7.fhir.eu.laboratory#2.0.0', profil: 'Bundle-eu-lab', vorbehalt: null },
  { datei: 'entlassbrief.json', ig: 'hl7.fhir.eu.hdr#0.1.0-ballot', profil: 'bundle-eu-hdr',
    vorbehalt: 'hl7.fhir.eu.hdr liegt nur als 0.1.0-ballot vor — Meldungen können am fertigen Standard anders ausfallen.' },
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}
function javaPfad() {
  const kandidaten = [
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    '/opt/homebrew/opt/openjdk@21/bin/java', '/opt/homebrew/opt/openjdk/bin/java',
    '/usr/local/opt/openjdk@21/bin/java', 'java',
  ].filter(Boolean);
  for (const k of kandidaten) {
    try { execFileSync(k, ['-version'], { stdio: 'ignore' }); return k; } catch (_) { /* macOS-Platzhalter wirft hier */ }
  }
  return null;
}

const jar = arg('--jar') || process.env.FHIR_VALIDATOR_JAR;
// Ohne --aus ist das Verzeichnis ein Wegwerf-Verzeichnis: das Urteil steht in der Ausgabe, am Ende wird es geräumt.
const wegwerf = !arg('--aus');
const aus = arg('--aus') || fs.mkdtempSync(path.join(os.tmpdir(), 'patientin-validator-'));
const java = javaPfad();
if (!java) { console.error('Abbruch: kein lauffähiges Java gefunden.'); process.exit(2); }
if (!jar || !fs.existsSync(jar)) { console.error('Abbruch: validator_cli.jar nicht angegeben oder nicht vorhanden (--jar).'); process.exit(2); }
fs.mkdirSync(aus, { recursive: true });

const nur = arg('--nur');
const auswahl = nur ? FAELLE.filter((f) => f.datei === nur) : FAELLE;
if (!auswahl.length) { console.error('Abbruch: --nur ' + nur + ' ist keiner der Befunde (' + FAELLE.map((f) => f.datei).join(', ') + ').'); process.exit(2); }

const bericht = [];
let fehlerGesamt = 0;
for (const f of auswahl) {   // nacheinander, nie parallel: ein Validator-Lauf ist Last wie eine Suite
  const eingabe = path.join(HIER, f.datei);
  const outcome = path.join(aus, f.datei + '.outcome.json');
  try {
    execFileSync(java, ['-jar', jar, eingabe, '-version', '4.0.1', '-ig', f.ig, '-tx', 'n/a', '-output', outcome],
      { stdio: 'ignore', timeout: 900000 });
  } catch (_) { /* Rückgabecode ungleich 0 ist bei Befunden normal — es zählt das OperationOutcome */ }
  if (!fs.existsSync(outcome)) {
    bericht.push({ datei: f.datei, ig: f.ig, gelesen: false, vorbehalt: f.vorbehalt });
    fehlerGesamt++;
    continue;
  }
  const oo = JSON.parse(fs.readFileSync(outcome, 'utf8'));
  const nach = (stufe) => (oo.issue || []).filter((i) => stufe.includes(i.severity)).map((i) =>
    ((i.expression && i.expression[0]) || '?') + ': ' + String((i.details && i.details.text) || '').replace(/\s+/g, ' ').slice(0, 220));
  const fehler = nach(['fatal', 'error']);
  fehlerGesamt += fehler.length;
  bericht.push({ datei: f.datei, ig: f.ig, profil: f.profil, gelesen: true, fehler, warnungen: nach(['warning']), vorbehalt: f.vorbehalt, outcome });
}

fs.writeFileSync(path.join(aus, 'bericht.json'), JSON.stringify(bericht, null, 2));
for (const b of bericht) {
  console.log('\n' + b.datei + '  (' + b.ig + ')');
  if (!b.gelesen) { console.log('  KEIN OperationOutcome — Lauf gescheitert, kein Urteil'); }
  else {
    console.log('  Fehler: ' + b.fehler.length + '   Warnungen: ' + b.warnungen.length);
    for (const z of b.fehler) console.log('  ✖ ' + z);
  }
  if (b.vorbehalt) console.log('  VORBEHALT: ' + b.vorbehalt);
}
if (wegwerf) fs.rmSync(aus, { recursive: true, force: true });
else console.log('\nBericht: ' + path.join(aus, 'bericht.json'));
process.exit(fehlerGesamt ? 1 : 0);
