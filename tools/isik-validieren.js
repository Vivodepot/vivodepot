#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die ISiK-Ausgabe (U2-ADR-468) gegen ISiK Stufe 6 prüfen — mit den amtlichen Anzeigetexten, nur zur Laufzeit
   ────────────────────────────────────────────────────────────────────────
   Der Kern trägt die Anzeigetexte von KDL (DVMD) und IHE-D erst, wenn die Nutzung erlaubt ist (das Tor in isikDokumente).
   ISiK verlangt sie aber wörtlich (gemessen). Dieses Werkzeug liest sie darum zur Laufzeit aus dem lokalen FHIR-Paket-Cache
   und reicht sie als opt.anzeigetexte in den echten Generator — sie landen nie in einer Datei im Repo und nie in einer
   Ausgabe des Produkts (entschieden am 01.10.2026). Die erzeugten DocumentReferences liegen in einem Wegwerf-Verzeichnis.

   Vorgelegt in EINEM Validator-Aufruf: DR 1 (Urschrift, eine erfundene Scan-Datei) und DR 2 (IPS), dazu zwei Rot-Beweise —
   DR ohne KDL-Coding, und DR mit einem eigenen statt des amtlichen KDL-Texts. Offline (`-tx n/a`), Paket de.gematik.isik#6.0.0.
   Ein Validator-Lauf ist Last wie eine Suite: nur mit einem Suite-Platz starten.

   Aufruf:  node tools/isik-validieren.js --jar PFAD [--cache ~/.fhir/packages] [--aus ORDNER]
   Ohne --jar: FHIR_VALIDATOR_JAR. Fehlt ein Paket im Cache: Abbruch mit Grund, kein stilles Grün.
   ════════════════════════════════════════════════════════════════════════ */
const VB = require('./lib/hl7-validator-beleg.js');   // Name, Fassung und Prüfsumme des Validators in jedem Bericht (Befund HL7-VALIDATOR-FASSUNG)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern } = require('../tests/load-kern.js');
const { urteilsZuordnung } = require('./lib/fhir-urteil-zuordnung.js');

const IG = 'de.gematik.isik#6.0.0';
const QUELLEN = [['dvmd.kdl.r4#2025.0.1'], ['de.ihe-d.terminology#3.0.1']];

function arg(name) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; }
function javaPfad() {
  for (const k of [process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : null,
    '/opt/homebrew/opt/openjdk@21/bin/java', '/opt/homebrew/opt/openjdk/bin/java', '/usr/local/opt/openjdk@21/bin/java', 'java'].filter(Boolean)) {
    try { execFileSync(k, ['-version'], { stdio: 'ignore' }); return k; } catch (_) { /* weiter */ }
  }
  return null;
}

// display je system|code aus den CodeSystems der lokalen Pakete — nur im Speicher.
function anzeigetexteLesen(cache, gesucht) {
  const aus = {};
  for (const [paket] of QUELLEN) {
    const dir = path.join(cache, paket, 'package');
    if (!fs.existsSync(dir)) throw new Error('Paket fehlt im Cache: ' + paket);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      let r; try { r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { continue; }
      if (!r || r.resourceType !== 'CodeSystem') continue;
      (function lauf(cc) { for (const c of (cc || [])) { const k = r.url + '|' + c.code; if (gesucht.includes(k)) aus[k] = c.display; lauf(c.concept); } })(r.concept);
    }
  }
  const fehlt = gesucht.filter((k) => !aus[k]);
  if (fehlt.length) throw new Error('Anzeigetext nicht im Cache gefunden: ' + fehlt.join(', '));
  return aus;
}

function kvnr(buchstabe, acht) {
  const z = (String(buchstabe.charCodeAt(0) - 64).padStart(2, '0') + acht).split('').map(Number);
  let s = 0; z.forEach((d, i) => { const p = d * (i % 2 === 0 ? 1 : 2); s += p > 9 ? Math.floor(p / 10) + (p % 10) : p; });
  return buchstabe + acht + (s % 10);
}

async function erzeugnisse(cache, aus) {
  const { V } = ladeKern();
  await V.depotAnlegen('isik-validator-2026!');
  // Die echte KDL-Datei aus dem Cache durch denselben Einlass wie bei der Person („KDL selbst laden“, U2-ADR-468, Nachtrag):
  // besteht die amtliche Datei die Prüfung nicht, ist der Einlass falsch gebaut — dann bricht das Werkzeug ab.
  const kdlDatei = path.join(cache, 'dvmd.kdl.r4#2025.0.1', 'package', 'codesystem-kdl.xml.json');
  if (!fs.existsSync(kdlDatei)) throw new Error('Paket fehlt im Cache: dvmd.kdl.r4#2025.0.1');
  const ein = await V.kdlEinlesen('codesystem-kdl.xml.json', new Uint8Array(fs.readFileSync(kdlDatei)));
  if (!ein.ok) throw new Error('Die amtliche KDL besteht den Einlass nicht: ' + ein.grund);
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  V.sektorFeldSetzen('health', 'insuranceNumber', kvnr('A', '12345678'));
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  const scan = 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n% erfundener Scan\n%%EOF').toString('base64');
  const mappeId = V.mappeEintragHinzufuegen({ beschriftung: 'Vorsorgevollmacht (Scan)', dateiname: 'scan.pdf', mime: 'application/pdf', groesse: 40, bereich: 'advanceCare', inhalt: scan });
  const doc = V.dokumentAnlegen({ typ: 'enduring-power-of-attorney', sektorId: 'advanceCare', name: 'Vorsorgevollmacht', gueltigAb: '2025-03-01' });
  V.dokumentSetzen(doc.id, 'mappeRef', { ref: mappeId });
  const kdl = Object.fromEntries(Object.entries(V.KDL_GEBRAUCHT).map(([k, code]) => [k, { system: V.KDL_SYSTEM, code }]));
  const T = Object.assign({}, V.IPS_BEGRIFFE.isik, kdl);
  const codes = ['kdlVollmacht', 'kdlPatienteneigen', 'xdsTyp', 'xdsKlasse', 'einrichtung', 'fachrichtung'].map((k) => T[k].system + '|' + T[k].code);
  const anzeigetexte = anzeigetexteLesen(cache, codes);
  const r = V.isikDokumente('2026-10-01T12:00:00Z', { sensibel: true, urschriftBestaetigt: mappeId, anzeigetexte });
  if (!r.bundle || r.gruende.length) throw new Error('Generator lieferte nicht beide DocumentReferences: ' + r.gruende.join(', '));
  const faelle = [];
  const schreiben = (name, res, erwartet) => { const p = path.join(aus, name + '.json'); fs.writeFileSync(p, JSON.stringify(res, null, 1)); faelle.push({ name, pfad: p, erwartet }); };
  const nach = (code) => r.bundle.entry.map((e) => e.resource).find((d) => d.type.coding[0].code === code);
  schreiben('dr1-vollmacht-urschrift', nach(T.kdlVollmacht.code), 'gueltig');
  schreiben('dr2-ips', nach(T.kdlPatienteneigen.code), 'gueltig');
  const ohneKdl = JSON.parse(JSON.stringify(nach(T.kdlVollmacht.code))); ohneKdl.type.coding.shift();
  schreiben('rot-ohne-kdl', ohneKdl, 'ungueltig');
  const eigenerText = JSON.parse(JSON.stringify(nach(T.kdlVollmacht.code))); eigenerText.type.coding[0].display = 'Vollmacht für die Vorsorge';
  schreiben('rot-eigener-kdl-text', eigenerText, 'ungueltig');
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
  const aus = arg('--aus') || fs.mkdtempSync(path.join(os.tmpdir(), 'isik-validator-'));
  fs.mkdirSync(aus, { recursive: true });
  let abweichungen = 0;
  try {
    const faelle = await erzeugnisse(cache, aus);
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
    // Die Dateien tragen die amtlichen Texte — sie bleiben nie liegen, außer ausdrücklich mit --aus.
    if (wegwerf) fs.rmSync(aus, { recursive: true, force: true });
  }
  return abweichungen ? 1 : 0;
}

if (require.main === module) main().then((c) => process.exit(c), (e) => { console.error(e.message || e); process.exit(2); });
module.exports = { anzeigetexteLesen, kvnr };
