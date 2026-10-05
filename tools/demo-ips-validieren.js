#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die IPS-Datei einer gebauten Demo gegen IPS 2.0.0 und EU EPS prüfen (01.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Eine Demo zeigt in der Ansicht „fhir-ips“ einen Auszug aus dem Bündel, das der Kern aus dem gebackenen Beispiel schreibt.
   „Gezeigt“ heißt: genau diese Datei, mit dem Ergebnis des offiziellen HL7-Validators daneben. Dieses Werkzeug liest die
   gebackene Seite der Demo (`app-<beispiel>/vivodepot.html`), öffnet ihr Beispiel im Kern DIESER Seite, schreibt das volle
   Bündel so, wie die Vorführung es tut (`fhirIpsBundle(…, { sensibel: true })`), und legt es mit einem Rot-Beweis dem
   Validator vor. Rot-Beweis: dasselbe Bündel, einem Consent fehlt `provision.actor.role` — es muss fallen.

   Offline wie tools/ips-vorsorge-validieren.js (`-tx n/a`, dieselben Pakete). Ein Validator-Lauf ist Last wie eine Suite:
   nur mit einem Suite-Platz starten.

   Aufruf:  node tools/demo-ips-validieren.js --seite <demo>/app-<beispiel>/vivodepot.html --jar PFAD [--aus ORDNER]
   Ohne --jar: FHIR_VALIDATOR_JAR. Ohne beides: Abbruch mit Grund, kein stilles Grün.
   ════════════════════════════════════════════════════════════════════════ */
const VB = require('./lib/hl7-validator-beleg.js');   // Name, Fassung und Prüfsumme des Validators in jedem Bericht (Befund HL7-VALIDATOR-FASSUNG)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const S = require('./vorfuehrung-showcase-erzeugen.js');
const { ohneActorRolle, PAKETE } = require('./ips-vorsorge-validieren.js');
const { urteilsZuordnung } = require('./lib/fhir-urteil-zuordnung.js');

const VORBEHALT = 'hl7.fhir.eu.eps liegt nur als 1.0.0-ballot vor — Meldungen können am fertigen Standard anders ausfallen.';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}
function javaPfad() {
  const kandidaten = [
    process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    '/opt/homebrew/opt/openjdk@21/bin/java', '/opt/homebrew/opt/openjdk/bin/java', '/usr/local/opt/openjdk@21/bin/java', 'java',
  ].filter(Boolean);
  for (const k of kandidaten) {
    try { execFileSync(k, ['-version'], { stdio: 'ignore' }); return k; } catch (_) { /* nächster Kandidat */ }
  }
  return null;
}

/* Das Bündel, das die Vorführung dieser Seite schreibt: Beispiel aus AB_WERK_SHOWCASE, Kern derselben Seite. */
/* Das Urteil gehört zu genau einer Datei (03.10.2026): der Bericht trägt den SHA-256 des geprüften Bündels, so wie es dem
   Validator vorlag. Der Bau einer Demo setzt die Prüfzeile nur, wenn das Bündel der gebauten Demo denselben Hash hat —
   ändert sich das Beispiel ohne neuen Validator-Lauf, bricht der Bau ab. */
const JETZT = '2026-10-01T12:00:00Z';
const buendelText = (bundle) => JSON.stringify(bundle, null, 1);
/* Der Kern schreibt jedes Bündel mit neuen urn:uuid-Kennungen und dem Zeitpunkt des Schreibens (bundle.timestamp, auch als
   Composition.date) — zwei Läufe über dieselben Daten unterscheiden sich nur darin. Der Hash gilt darum der Form, in der jede
   UUID (in urn:uuid:… und als blanke id) durch ihre Reihenfolge (#1, #2 …) und dieser Zeitpunkt durch einen Platzhalter ersetzt ist. Jeder andere
   Wert, auch jedes Datum aus den Daten, geht unverändert ein. */
function buendelNormalform(bundle) {
  const nummern = new Map();
  const zeit = typeof bundle.timestamp === 'string' ? bundle.timestamp : null;
  return JSON.parse(JSON.stringify(bundle), (k, v) => {
    if (typeof v !== 'string') return v;
    if (zeit && v === zeit) return '<zeitpunkt-des-schreibens>';
    // Dieselbe Kennung als urn:uuid:… und als blanke id bekommt dieselbe Nummer.
    return v.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (u) => { if (!nummern.has(u)) nummern.set(u, nummern.size + 1); return '#' + nummern.get(u); });
  });
}
const buendelSha256 = (bundle) => require('node:crypto').createHash('sha256').update(buendelText(buendelNormalform(bundle))).digest('hex');

/* Dasselbe Bündel aus einem Kern und einem Beispiel-Depot (für den Bau, der die Seite noch nicht hat). */
function buendelAusDepot(V, depot) {
  V.setData(JSON.parse(JSON.stringify(depot)));
  return V.fhirIpsBundle(JETZT, { sensibel: true });
}

function demoBuendel(seitenText, jetzt) {
  const m = /\/\* AB_WERK_SHOWCASE:BEGIN \*\/\s*const AB_WERK_SHOWCASE = (.*?);\s*\/\* AB_WERK_SHOWCASE:END \*\//s.exec(seitenText);
  if (!m || m[1] === 'null') throw new Error('Die Seite trägt kein gebackenes Beispiel (AB_WERK_SHOWCASE) — eine Demo-Seite angeben.');
  const nutzlast = JSON.parse(m[1]);
  if (!nutzlast.depot) throw new Error('AB_WERK_SHOWCASE ohne depot.');
  const V = S._kernAusProdukt(seitenText);
  V.setData(JSON.parse(JSON.stringify(nutzlast.depot)));
  return V.fhirIpsBundle(jetzt || JETZT, { sensibel: true });
}

function main() {
  const seite = arg('--seite');
  if (!seite || !fs.existsSync(seite)) { console.error('Abbruch: --seite <demo>/app-<beispiel>/vivodepot.html fehlt oder ist nicht vorhanden.'); return 2; }
  const jar = arg('--jar') || process.env.FHIR_VALIDATOR_JAR;
  const java = javaPfad();
  if (!java) { console.error('Abbruch: kein lauffähiges Java gefunden.'); return 2; }
  if (!jar || !fs.existsSync(jar)) { console.error('Abbruch: validator_cli.jar nicht angegeben oder nicht vorhanden (--jar).'); return 2; }
  let validator;
  try { validator = VB.jarFassung(jar); } catch (e) { console.error('Abbruch: ' + e.message); return 2; }
  console.log('  Validator: ' + validator.name + ' ' + validator.fassung + (validator.gepinnt ? ' (gepinnt)' : ' (NICHT gepinnt — freies Jar, Fassung aus dem Jar gelesen)'));
  const wegwerf = !arg('--aus');
  const aus = arg('--aus') || fs.mkdtempSync(path.join(os.tmpdir(), 'demo-ips-validator-'));
  fs.mkdirSync(aus, { recursive: true });
  const bundle = demoBuendel(fs.readFileSync(seite, 'utf8'), JETZT);
  const typen = [...new Set(bundle.entry.map((e) => e.resource.resourceType))];
  const faelle = [
    { name: 'demo-ips', pfad: path.join(aus, 'demo-ips.json'), inhalt: bundle, erwartet: 'gueltig' },
    { name: 'demo-ips-ohne-actor-rolle', pfad: path.join(aus, 'demo-ips-ohne-actor-rolle.json'), inhalt: ohneActorRolle(bundle), erwartet: 'ungueltig' },
  ];
  for (const f of faelle) fs.writeFileSync(f.pfad, buendelText(f.inhalt));
  const outcome = path.join(aus, 'sammel.outcome.json');
  try {
    execFileSync(java, ['-jar', jar, ...faelle.map((f) => f.pfad), '-version', '4.0.1', ...PAKETE.flatMap((p) => ['-ig', p]), '-tx', 'n/a', '-output', outcome],
      { stdio: 'ignore', timeout: 900000 });
  } catch (_) { /* Rückgabecode ungleich 0 ist bei Befunden normal — es zählt das OperationOutcome */ }
  if (!fs.existsSync(outcome)) { console.error('KEIN OperationOutcome — Lauf gescheitert, kein Urteil'); return 1; }
  const urteile = urteilsZuordnung(JSON.parse(fs.readFileSync(outcome, 'utf8')), faelle.map((f) => f.pfad));
  let abweichungen = 0;
  const bericht = [];
  for (const f of faelle) {
    const u = urteile.get(f.pfad);
    const ist = !u.gelesen ? 'ungelesen' : (u.gueltig ? 'gueltig' : 'ungueltig');
    if (ist !== f.erwartet) abweichungen++;
    bericht.push({ name: f.name, erwartet: f.erwartet, ist, fehler: u.fehler || [], warnungen: u.warnungen || [] });
    console.log((ist === f.erwartet ? '  ✔ ' : '  ✖ ') + f.name + '  erwartet ' + f.erwartet + ', ist ' + ist + '  (Fehler: ' + (u.fehler || []).length + ', Warnungen: ' + (u.warnungen || []).length + ')');
    for (const z of (u.fehler || []).slice(0, 6)) console.log('      ' + z);
    if (f.erwartet === 'gueltig') for (const z of (u.warnungen || [])) console.log('      Warnung ' + z);
  }
  console.log('  Ressourcen im Bündel: ' + typen.join(', '));
  console.log('  VORBEHALT: ' + VORBEHALT);
  console.log('  Offline (-tx n/a): Codes, die nur ein Terminologieserver prüfen kann, und nicht geladene ValueSets erscheinen als Warnung, nicht als Fehler.');
  fs.writeFileSync(path.join(aus, 'bericht.json'), JSON.stringify({ ...VB.belegKopf({ validator, ergebnis: abweichungen ? 'abweichung' : 'wie-erwartet' }), seite: path.basename(path.dirname(seite)), buendelSha256: buendelSha256(bundle), pakete: PAKETE, vorbehalt: VORBEHALT, ressourcen: typen, bericht }, null, 2));
  if (wegwerf) fs.rmSync(aus, { recursive: true, force: true });
  else console.log('\nBericht: ' + path.join(aus, 'bericht.json'));
  return abweichungen ? 1 : 0;
}

if (require.main === module) process.exit(main());
module.exports = { demoBuendel, buendelAusDepot, buendelSha256, buendelNormalform, JETZT };
