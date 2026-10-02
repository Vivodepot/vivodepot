#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Den Abschnitt Advance Directives des IPS-Exports gegen IPS 2.0.0 und EU EPS prüfen, in jeder Exportsprache (U2-ADR-466)
   ────────────────────────────────────────────────────────────────────────
   Baut das Beispiel-Depot (tools/lib/ips-vorsorge-beispiel.js) mit dem echten Generator, je angebotener Exportsprache ein
   Bundle mit Freigabe der sensiblen Felder, und legt alle zusammen mit einem Rot-Beweis dem offiziellen HL7-Validator in
   EINEM Aufruf vor. Rot-Beweis: dasselbe Bundle, einem Consent fehlt `provision.actor.role` (in consent-eu-eps 1..1) — es
   muss fallen, sonst ist das Grün kein Urteil.

   Offline wie tests/konformitaet/externe-validatoren.mjs (`-tx n/a`, Pakete im lokalen FHIR-Paket-Cache, dieselbe Pinnung).
   Ein Validator-Lauf ist Last wie eine Suite: nur mit einem Suite-Platz starten.

   VORBEHALT, DER ZU JEDEM ERGEBNIS GEHÖRT: `hl7.fhir.eu.eps` liegt nur als 1.0.0-ballot vor. Wird EPS final, wird die Pinnung
   hier und in der Registry gemeinsam nachgezogen (U2-ADR-466).

   Aufruf:  node tools/ips-vorsorge-validieren.js --jar PFAD [--sprachen en,de] [--aus ORDNER]
   Ohne --jar: FHIR_VALIDATOR_JAR. Ohne beides: Abbruch mit Grund, kein stilles Grün.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('../tests/load-kern.js');
const { vorsorgeDepotAnlegen } = require('./lib/ips-vorsorge-beispiel.js');
const { urteilsZuordnung } = require('./lib/fhir-urteil-zuordnung.js');

const PAKETE = ['hl7.fhir.uv.ips#2.0.0', 'hl7.fhir.eu.eps#1.0.0-ballot'];
const VORBEHALT = 'hl7.fhir.eu.eps liegt nur als 1.0.0-ballot vor — Meldungen können am fertigen Standard anders ausfallen.';
const JETZT = '2026-10-01T12:00:00Z';

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

// Der Rot-Beweis: einem Consent mit actor die Rolle nehmen.
function ohneActorRolle(bundle) {
  const b = JSON.parse(JSON.stringify(bundle));
  const c = b.entry.map((e) => e.resource).find((r) => r.resourceType === 'Consent' && r.provision && r.provision.actor);
  if (!c) throw new Error('Vorbedingung: das Beispiel trägt ein Consent mit actor');
  delete c.provision.actor[0].role;
  return b;
}

async function erzeugnisse(sprachenWahl, aus) {
  const faelle = [];
  const { V } = ladeKern();
  await vorsorgeDepotAnlegen(V);
  const angeboten = V.ipsExportSprachen();
  const sprachen = sprachenWahl ? sprachenWahl.filter((s) => angeboten.includes(s)) : angeboten;
  if (sprachenWahl && sprachen.length !== sprachenWahl.length) {
    throw new Error('nicht angeboten: ' + sprachenWahl.filter((s) => !angeboten.includes(s)).join(', '));
  }
  for (const sprache of sprachen) {
    const p = path.join(aus, 'vorsorge-' + sprache + '.json');
    fs.writeFileSync(p, JSON.stringify(V.fhirIpsBundle(JETZT, { sensibel: true, sprache }), null, 1));
    faelle.push({ name: 'vorsorge-' + sprache, pfad: p, erwartet: 'gueltig' });
  }
  const rot = path.join(aus, 'vorsorge-ohne-actor-rolle.json');
  fs.writeFileSync(rot, JSON.stringify(ohneActorRolle(V.fhirIpsBundle(JETZT, { sensibel: true })), null, 1));
  faelle.push({ name: 'vorsorge-ohne-actor-rolle', pfad: rot, erwartet: 'ungueltig' });
  return faelle;
}

async function main() {
  const jar = arg('--jar') || process.env.FHIR_VALIDATOR_JAR;
  const java = javaPfad();
  if (!java) { console.error('Abbruch: kein lauffähiges Java gefunden.'); return 2; }
  if (!jar || !fs.existsSync(jar)) { console.error('Abbruch: validator_cli.jar nicht angegeben oder nicht vorhanden (--jar).'); return 2; }
  // Ohne --aus ist das Verzeichnis ein Wegwerf-Verzeichnis: das Urteil steht in der Ausgabe, am Ende wird es geräumt.
  const wegwerf = !arg('--aus');
  const aus = arg('--aus') || fs.mkdtempSync(path.join(os.tmpdir(), 'ips-vorsorge-validator-'));
  fs.mkdirSync(aus, { recursive: true });
  const wahl = arg('--sprachen') ? arg('--sprachen').split(',').map((s) => s.trim()).filter(Boolean) : null;
  const faelle = await erzeugnisse(wahl, aus);
  const outcome = path.join(aus, 'sammel.outcome.json');
  const igs = PAKETE.flatMap((p) => ['-ig', p]);
  try {
    execFileSync(java, ['-jar', jar, ...faelle.map((f) => f.pfad), '-version', '4.0.1', ...igs, '-tx', 'n/a', '-output', outcome],
      { stdio: 'ignore', timeout: 900000 });
  } catch (_) { /* Rückgabecode ungleich 0 ist bei Befunden normal — es zählt das OperationOutcome */ }
  if (!fs.existsSync(outcome)) { console.error('KEIN OperationOutcome — Lauf gescheitert, kein Urteil'); return 1; }
  const urteile = urteilsZuordnung(JSON.parse(fs.readFileSync(outcome, 'utf8')), faelle.map((f) => f.pfad));
  let abweichungen = 0;
  const bericht = [];
  for (const f of faelle) {
    const u = urteile.get(f.pfad);
    const ist = !u.gelesen ? 'ungelesen' : (u.gueltig ? 'gueltig' : 'ungueltig');
    const ok = ist === f.erwartet;
    if (!ok) abweichungen++;
    bericht.push({ name: f.name, erwartet: f.erwartet, ist, fehler: u.fehler || [] });
    console.log((ok ? '  ✔ ' : '  ✖ ') + f.name + '  erwartet ' + f.erwartet + ', ist ' + ist + '  (Fehler: ' + (u.fehler || []).length + ')');
    if (!ok || f.erwartet === 'ungueltig') for (const z of (u.fehler || []).slice(0, 6)) console.log('      ' + z);
  }
  console.log('  VORBEHALT: ' + VORBEHALT);
  fs.writeFileSync(path.join(aus, 'bericht.json'), JSON.stringify({ pakete: PAKETE, vorbehalt: VORBEHALT, bericht }, null, 2));
  if (wegwerf) fs.rmSync(aus, { recursive: true, force: true });
  else console.log('\nBericht: ' + path.join(aus, 'bericht.json'));
  return abweichungen ? 1 : 0;
}

if (require.main === module) main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
module.exports = { ohneActorRolle, erzeugnisse, PAKETE };
