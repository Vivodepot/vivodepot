#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die KBV-PKA-Ausgabe der Vorsorgevollmacht (U2-ADR-471) gegen MIO Patientenkurzakte 1.0.0 prüfen
   ────────────────────────────────────────────────────────────────────────
   Baut das Beispiel-Depot (tools/lib/ips-vorsorge-beispiel.js) mit Anschrift des Ablageorts, KVNR und Geschlecht, lässt den
   echten Generator (kbvPkaVollmacht) die DPE-Bundles erzeugen und legt sie zusammen mit drei Rot-Beweisen dem offiziellen
   HL7-Validator in EINEM Aufruf vor — offline (`-tx n/a`), Paket kbv.mio.patientenkurzakte#1.0.0 (zieht kbv.basis 1.1.3 und
   de.basisprofil.r4 0.9.13 aus dem Cache).
     grün erwartet · je bevollmächtigter Person ein Bundle; dazu eines mit Geschlecht divers (other + gender-amtlich-de D)
     rot erwartet  · der Ablageort als Address.text statt in Teilen (das Profil verbietet text, verlangt line/city/postalCode)
                   · die Vertretung ohne provision (actor 1..1)
                   · die PKV-Nummer statt der KVNR (der Slice ist im Profil unerfüllbar — gemessen 02.10.2026)
   Ohne einen Rot-Beweis, der fällt, ist das Grün kein Urteil. Ein Validator-Lauf ist Last wie eine Suite: nur mit Suite-Platz.

   Aufruf:  node tools/kbv-pka-validieren.js --jar PFAD [--cache ~/.fhir/packages] [--aus ORDNER]
   Ohne --jar: FHIR_VALIDATOR_JAR. Fehlt Java, das Jar oder das Paket: Abbruch mit Grund, kein stilles Grün.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('../tests/load-kern.js');
const { vorsorgeDepotAnlegen } = require('./lib/ips-vorsorge-beispiel.js');
const { urteilsZuordnung } = require('./lib/fhir-urteil-zuordnung.js');
const { kvnr } = require('./isik-validieren.js');
const VB = require('./lib/hl7-validator-beleg.js');   // Name, Fassung und Prüfsumme des Validators in jedem Bericht (Befund HL7-VALIDATOR-FASSUNG)

const IG = 'kbv.mio.patientenkurzakte#1.0.0';
const JETZT = '2026-10-02T12:00:00Z';

function arg(name) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; }
function javaPfad() {
  for (const k of [process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    '/opt/homebrew/opt/openjdk@21/bin/java', '/opt/homebrew/opt/openjdk/bin/java', '/usr/local/opt/openjdk@21/bin/java', 'java'].filter(Boolean)) {
    try { execFileSync(k, ['-version'], { stdio: 'ignore' }); return k; } catch (_) { /* macOS-Platzhalter wirft hier */ }
  }
  return null;
}

async function erzeugnisse(aus) {
  const { V } = ladeKern();
  const personen = await vorsorgeDepotAnlegen(V);
  V.sektorFeldSetzen('health', 'insuranceNumber', kvnr('A', '12345678'));
  V.sektorFeldSetzen('identity', 'gender', 'w');
  const z = V.getData().sektoren.advanceCare.provisionInstruments[0];
  Object.assign(z, { storageStreet: 'Rennweg', storageHouseNumber: '35', storagePostalCode: '56626', storageCity: 'Andernach' });
  z.authorizedPersons = [{ ref: personen.tochter }, { ref: V.personHinzufuegen({ name: 'Lea Beispiel' }) }];
  const r = V.kbvPkaVollmacht(JETZT, { sensibel: true });
  if (r.bundles.length !== 2 || r.gruende.length) throw new Error('Generator lieferte nicht zwei Bundles: ' + r.gruende.join(', '));
  const faelle = [];
  const schreiben = (name, res, erwartet) => { const p = path.join(aus, name + '.json'); fs.writeFileSync(p, JSON.stringify(res, null, 1)); faelle.push({ name, pfad: p, erwartet }); };
  const kopie = (b) => JSON.parse(JSON.stringify(b));
  const vertretung = (b) => b.entry.map((e) => e.resource).find((x) => x.resourceType === 'Consent' && x.provision);
  const patient = (b) => b.entry.map((e) => e.resource).find((x) => x.resourceType === 'Patient');
  r.bundles.forEach((b, i) => schreiben('dpe-vorsorgevollmacht-' + (i + 1), b, 'gueltig'));
  V.sektorFeldSetzen('identity', 'gender', 'd');
  schreiben('dpe-geschlecht-divers', V.kbvPkaVollmacht(JETZT, { sensibel: true }).bundles[0], 'gueltig');

  const alsText = kopie(r.bundles[0]);
  vertretung(alsText).sourceReference._display.extension[0].valueAddress = { text: 'Rennweg 35, 56626 Andernach' };
  schreiben('rot-ablageort-als-text', alsText, 'ungueltig');
  const ohneProvision = kopie(r.bundles[0]);
  delete vertretung(ohneProvision).provision;
  schreiben('rot-vertretung-ohne-provision', ohneProvision, 'ungueltig');
  const pkv = kopie(r.bundles[0]);
  patient(pkv).identifier = [{ use: 'secondary', type: { coding: [{ system: 'http://fhir.de/CodeSystem/identifier-type-de-basis', code: 'PKV', display: 'Private Krankenversicherung' }] },
    value: '123456789', assigner: { display: 'Erfundene Versicherung AG' } }];
  schreiben('rot-pkv-nummer', pkv, 'ungueltig');
  return faelle;
}

async function main() {
  const jar = arg('--jar') || process.env.FHIR_VALIDATOR_JAR;
  const java = javaPfad();
  if (!java) { console.error('Abbruch: kein lauffähiges Java gefunden.'); return 2; }
  if (!jar || !fs.existsSync(jar)) { console.error('Abbruch: validator_cli.jar nicht angegeben oder nicht vorhanden (--jar).'); return 2; }
  let validator;
  try { validator = VB.jarFassung(jar); } catch (e) { console.error('Abbruch: ' + e.message); return 2; }
  console.log('  Validator: ' + validator.name + ' ' + validator.fassung + (validator.gepinnt ? ' (gepinnt)' : ' (NICHT gepinnt — freies Jar, Fassung aus dem Jar gelesen)'));
  const cache = arg('--cache') || path.join(os.homedir(), '.fhir', 'packages');
  if (!fs.existsSync(path.join(cache, IG, 'package'))) { console.error('Abbruch: ' + IG + ' fehlt im Paket-Cache ' + cache); return 2; }
  const wegwerf = !arg('--aus');
  const aus = arg('--aus') || fs.mkdtempSync(path.join(os.tmpdir(), 'kbv-pka-validator-'));
  fs.mkdirSync(aus, { recursive: true });
  let abweichungen = 0;
  try {
    const faelle = await erzeugnisse(aus);
    const outcome = path.join(aus, 'sammel.outcome.json');
    try {
      execFileSync(java, ['-jar', jar, ...faelle.map((f) => f.pfad), '-version', '4.0.1', '-ig', IG, '-tx', 'n/a', '-output', outcome], { stdio: 'ignore', timeout: 900000 });
    } catch (_) { /* Rückgabecode ungleich 0 ist bei Befunden normal */ }
    if (!fs.existsSync(outcome)) { console.error('KEIN OperationOutcome — Lauf gescheitert, kein Urteil'); return 1; }
    const urteile = urteilsZuordnung(JSON.parse(fs.readFileSync(outcome, 'utf8')), faelle.map((f) => f.pfad));
    const bericht = [];
    for (const f of faelle) {
      const u = urteile.get(f.pfad);
      const ist = !u.gelesen ? 'ungelesen' : (u.gueltig ? 'gueltig' : 'ungueltig');
      if (ist !== f.erwartet) abweichungen++;
      bericht.push({ name: f.name, erwartet: f.erwartet, ist, fehler: (u.fehler || []).length });
      console.log((ist === f.erwartet ? '  ✔ ' : '  ✖ ') + f.name + '  erwartet ' + f.erwartet + ', ist ' + ist + '  (Fehler: ' + (u.fehler || []).length + ')');
      if (ist !== f.erwartet || f.erwartet === 'ungueltig') for (const z of (u.fehler || []).slice(0, 4)) console.log('      ' + z);
    }
    // Der Bericht trägt nur Urteile und den Validator-Kopf, keine Inhalte — er bleibt auch ohne die Fall-Dateien lesbar.
    fs.writeFileSync(path.join(aus, 'bericht.json'), JSON.stringify({ ...VB.belegKopf({ validator, ergebnis: abweichungen ? 'abweichung' : 'wie-erwartet' }), ig: IG, bericht }, null, 2));
    if (!wegwerf) console.log('\nBericht: ' + path.join(aus, 'bericht.json'));
  } finally {
    if (wegwerf) fs.rmSync(aus, { recursive: true, force: true });
  }
  return abweichungen ? 1 : 0;
}

if (require.main === module) main().then((c) => process.exit(c), (e) => { console.error(e.message || e); process.exit(2); });
