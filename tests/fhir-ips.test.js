'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — FHIR-R4 / IPS-Export Gesundheit (Durchbau T3.4)
   ────────────────────────────────────────────────────────────────────────
   Struktur-Validierung in der node-Suite (läuft immer): IPS-Dokument-Bundle,
   Composition zuerst, vier Sektionen mit IPS-LOINC (Auftrag Stufe 2, 14.07.:
   Procedures-Sektion für eu-eps-Konformität ergänzt), Patient, text-only
   Inhalte (keine erfundenen Codes — Code-Listen sind nicht angedockt).
   ACHTUNG — hier stand bis zum 26.07.2026: „Die ECHTE HL7-Profil-Validierung läuft als
   skip-when-not-installed-Schritt (tests/fhir-ips-validator.test.js) und in CI
   (.github/workflows)." BEIDES IST FALSCH: die Datei existiert nicht, und in den Workflows
   kommt weder `validator_cli` noch `org.hl7.fhir` vor (gemessen 26.07.). Der Satz behauptete
   ein Sicherheitsnetz, das es nie gab — und ist der Grund, warum niemandem auffiel, dass der
   Generator ungültige Bundles erzeugte (U2-ADR-105). Diese Datei prüft STRUKTUR, nicht Profile.
   Eine echte Profil-Validierung ist baubar (der offizielle Validator läuft lokal und offline,
   am 26.07. belegt) und steht als eigener Posten. Kein Krypto.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
const JETZT = new Date('2026-05-31T10:00:00Z');

async function bundleMitDaten() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'gender', 'w');
  // Chip-Mechanik (E1 Option C): je EIN Chip pro Eintrag, kein Kommasplitten mehr.
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }, { text: 'Haselnuss' }]);
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril 5 mg' }, { text: 'Metformin 1000 mg' }]);
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Diabetes mellitus Typ 2' }]);
  // U2-ADR-104: `voroperationen` ist eine Liste — der Skalar-Setter WIRFT hier jetzt (Typ-Wächter).
  // Zwei Zeilen, damit der Generator zwei `Procedure`-Einträge erzeugen MUSS; eine davon ohne Jahr,
  // damit auch der Zweig ohne `performed*` mitläuft.
  V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Blinddarm-Entfernung', year: '2008' });
  V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Hüft-TEP rechts' });
  // N4 (09.08.2026): die geprüften Gesundheitsfelder sind seit N4 Zug 1 schema-sensibel — Opt-in,
  // diese Fixture dient Inhaltsproben, nicht der Zurückhaltung.
  return { V, bundle: V.fhirIpsBundle(JETZT, { sensibel: true }) };
}

test('IPS-Bundle: Dokument-Bundle, Composition zuerst (LOINC 60591-5), Patient referenziert', async () => {
  const { bundle } = await bundleMitDaten();
  assert.equal(bundle.resourceType, 'Bundle');
  assert.equal(bundle.type, 'document');
  assert.ok(bundle.timestamp, 'timestamp vorhanden');
  const comp = bundle.entry[0].resource;
  assert.equal(comp.resourceType, 'Composition', 'Composition ist der erste Eintrag');
  assert.equal(comp.type.coding[0].code, '60591-5', 'IPS-Composition-LOINC');
  assert.equal(comp.status, 'final');
  assert.ok(Array.isArray(comp.author) && comp.author.length, 'author vorhanden');
  const patient = bundle.entry.find(e => e.resource.resourceType === 'Patient');
  assert.ok(patient, 'Patient-Resource');
  assert.equal(comp.subject.reference, patient.fullUrl, 'subject → Patient (fullUrl)');
  assert.equal(patient.resource.gender, 'female');
  assert.equal(patient.resource.name[0].family, 'Mustermann');
});

test('IPS-Bundle: fünf Sektionen mit korrekten LOINC-Codes (eu-eps Procedures + Medical Devices)', async () => {
  const { bundle } = await bundleMitDaten();
  const codes = bundle.entry[0].resource.section.map(s => s.code.coding[0].code);
  assert.ok(codes.includes('48765-2'), 'Allergien-Sektion');
  assert.ok(codes.includes('10160-0'), 'Medikations-Sektion');
  assert.ok(codes.includes('11450-4'), 'Problem-Sektion');
  assert.ok(codes.includes('47519-4'), 'Procedures-Sektion (eu-eps sectionProceduresHx)');
  assert.ok(codes.includes('46264-8'), 'Medizinprodukte-Sektion (eu-eps sectionMedicalDevices)');
});

/* U2-ADR-105 (26.07.2026) — DIESER TEST HIELT DIE FALSCHAUSSAGE FEST.
   Er lautete: „Medizinprodukte-Sektion bleibt IMMER leer mit emptyReason (offene Frage:
   DeviceUseStatement.timing[x] Pflicht, implantate hat kein Datum)" — und pinnte damit, dass das
   Dokument „Keine Medizinprodukte hinterlegt" behauptet, obwohl die Bürgerin welche eingetragen hat.
   Als offene Frage war das richtig; als Dauerzustand ist es eine falsche Aussage in einem
   medizinischen Dokument. Die Frage ist beantwortet: `timing[x]` ist min=1 (nachgemessen, bestätigt),
   und `dataAbsentReason: unknown` trägt — am offiziellen HL7-Validator 6.9.12 belegt (Instanz D2,
   0 Fehler). Die ausführlichen Proben stehen in tests/fhir-daten-abwesend.test.js. */
test('IPS-Bundle: gefuelltes implantate erscheint in der Medizinprodukte-Sektion', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'implantsProsthesesPacemakers', 'Hüft-TEP rechts (Stryker), seit 2019');   // Feld GEFÜLLT
  // N4 (09.08.2026): `implantate` ist seit N4 Zug 1 schema-sensibel — Opt-in.
  const bundle = V.fhirIpsBundle(JETZT, { sensibel: true });
  const dev = bundle.entry[0].resource.section.find(s => s.code.coding[0].code === '46264-8');
  assert.ok(!dev.emptyReason, 'kein emptyReason mehr, wenn etwas hinterlegt IST');
  assert.equal((dev.entry || []).length, 1, 'ein Eintrag aus dem ganzen Freitext — KEIN Splitten');
  const dus = bundle.entry.map(e => e.resource).find(r => r.resourceType === 'DeviceUseStatement');
  assert.ok(dus, 'DeviceUseStatement angelegt');
  assert.equal(dus._timingDateTime.extension[0].valueCode, 'unknown',
    'timing[x] ist Pflicht (min=1) — vorhanden, Wert ausdruecklich unbekannt statt geraten');
  assert.ok(!dus.timingDateTime && !dus.timingPeriod, 'aus „seit 2019" wird KEIN Datum geraten');
});

test('IPS-Bundle: gefüllte Felder → Resourcen, text-only (KEINE erfundenen Codes)', async () => {
  const { bundle } = await bundleMitDaten();
  const byType = (t) => bundle.entry.map(e => e.resource).filter(r => r.resourceType === t);
  const allergien = byType('AllergyIntolerance');
  assert.equal(allergien.length, 2, 'Penicillin + Haselnuss als zwei Einträge');
  assert.equal(allergien[0].code.text, 'Penicillin');
  assert.ok(!allergien[0].code.coding, 'kein erfundener Code — nur code.text');
  assert.equal(byType('MedicationStatement').length, 2);
  assert.equal(byType('Condition').length, 1);
  const comp = bundle.entry[0].resource;
  const allerSek = comp.section.find(s => s.code.coding[0].code === '48765-2');
  assert.equal(allerSek.entry.length, 2, 'Allergie-Sektion referenziert beide Einträge');
  /* U2-ADR-104 — DIE Fähigkeit, für die der Umbau gemacht wurde.
     Bis 26.07.2026 war `voroperationen` ein Freitextfeld, und hier stand: „genau EIN Procedure-Entry,
     kein Semikolon-Split". Das war richtig, solange die Trennung geraten werden musste — aus
     „Blinddarm 2008; Hüft-TEP rechts 2019" zwei Einträge zu machen hätte Struktur erfunden, die die
     Bürgerin nie angelegt hat. Jetzt legt sie sie selbst an: N Zeilen → N `Procedure`. */
  const proceduren = byType('Procedure');
  assert.equal(proceduren.length, 2, 'zwei Listen-Zeilen → ZWEI Procedure-Einträge (eu-eps)');
  assert.equal(proceduren.map(p => p.code.text).join('|'), 'Blinddarm-Entfernung|Hüft-TEP rechts');
  assert.equal(proceduren[0].performedDateTime, '2008', 'ein sauberes Jahr wird FHIR-Datum');
  /* U2-ADR-105 — DIESE ZEILE HIELT BIS ZUM 26.07.2026 DIE FALSCHE FORM FEST.
     Sie lautete: „ohne Jahr KEIN performed* — nicht geraten". Die Absicht war richtig, die Form
     nicht: am offiziellen HL7-Validator 6.9.12 gemessen wurde das GANZE Bundle damit ungültig
     („Procedure.performed[x]: mindestens erforderlich = 1, aber nur gefunden 0" — min=1 in
     `Procedure-uv-ips` 1.1.0/2.0.0 UND `procedure-eu-eps`).
     Jetzt: das Element ist da, sein Wert ausdrücklich unbekannt. Weiterhin wird nichts geraten. */
  assert.ok(!proceduren[1].performedDateTime && !proceduren[1].performedString,
    'ohne Jahr weiterhin KEIN geratener Datumswert');
  assert.equal(proceduren[1]._performedDateTime.extension[0].url,
    'http://hl7.org/fhir/StructureDefinition/data-absent-reason',
    'stattdessen die Standard-Extension — sonst ist das Bundle ungültig');
  assert.equal(proceduren[1]._performedDateTime.extension[0].valueCode, 'unknown');
  assert.ok(!proceduren[0].code.coding, 'kein erfundener Code');
});

test('[Negativprobe] U2-ADR-104: der alte String-Test erzeugte NULL Procedures aus einer Liste', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('health', 'operationsProcedures', { procedure: 'Blinddarm-Entfernung', year: '2008' });
  const g = V.getData().sektoren.health;
  // MUTATION: exakt die Bedingung, die vor dem 26.07. im Generator stand. Sie ist auf einer Liste
  // `false` — der Generator hätte die Procedures-Sektion still geleert, ohne einen Fehler.
  assert.equal(typeof g.operationsProcedures === 'string', false,
    'der alte Test greift auf einer Liste nicht — genau darum musste der Generator mit umgebaut werden');
  // Positivkontrolle des Messpunkts: der NEUE Test greift.
  assert.equal(Array.isArray(g.operationsProcedures) && g.operationsProcedures.length, 1);
  // N4 (09.08.2026): `voroperationen` ist seit N4 Zug 1 schema-sensibel — Opt-in.
  const proceduren = (V.fhirIpsBundle(JETZT, { sensibel: true }).entry || [])
    .map(e => e.resource).filter(r => r && r.resourceType === 'Procedure');
  assert.equal(proceduren.length, 1, 'mit dem neuen Generator entsteht der Eintrag');
});

test('IPS-Bundle: leere Pflicht-Sektion trägt emptyReason (bleibt vorhanden)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);   // nur Allergien
  const comp = V.fhirIpsBundle(JETZT).entry[0].resource;
  const med = comp.section.find(s => s.code.coding[0].code === '10160-0');
  assert.ok(med.emptyReason, 'leere Medikation → emptyReason');
  // N2 Zug 1 („Drei Verdrahtungen", 08.08.2026): 'nilknown' behauptete eine geprüfte,
  // bestätigte Abwesenheit — ein einfach unausgefülltes Feld ist das nicht. 'notasked' s. dort.
  assert.equal(med.emptyReason.coding[0].code, 'notasked');
  assert.ok(!med.entry, 'kein entry bei leerer Sektion');
  const proc = comp.section.find(s => s.code.coding[0].code === '47519-4');
  assert.ok(proc.emptyReason, 'leere Procedures-Sektion (kein voroperationen-Wert) → emptyReason, Sektion bleibt');
  assert.ok(!proc.entry, 'kein entry bei leerer Procedures-Sektion');
});

test('IPS-Bundle: trägt uv-ips- UND eu-eps-Profil auf Bundle und Composition (Auftrag Stufe 2, 14.07.)', async () => {
  const { bundle } = await bundleMitDaten();
  assert.equal(JSON.stringify(bundle.meta.profile), JSON.stringify([
    'http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips',
    'http://hl7.eu/fhir/eps/StructureDefinition/bundle-eu-eps',
  ]));
  const comp = bundle.entry[0].resource;
  assert.equal(JSON.stringify(comp.meta.profile), JSON.stringify([
    'http://hl7.org/fhir/uv/ips/StructureDefinition/Composition-uv-ips',
    'http://hl7.eu/fhir/eps/StructureDefinition/composition-eu-eps',
  ]));
});

test('kernAPI.exportiere("fhir-ips") liefert das Bundle; unbekanntes Format wirft', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const b = V.kernAPI.exportiere('fhir-ips', { jetzt: JETZT });
  assert.equal(b.resourceType, 'Bundle');
  assert.throws(() => V.kernAPI.exportiere('docx'), /nicht angedockt/);
});

test('FHIR-Export ist read-only — data unverändert (Krypto unberührt)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  const vorher = JSON.stringify(V.getData().sektoren.health);
  V.fhirIpsBundle(JETZT);
  assert.equal(JSON.stringify(V.getData().sektoren.health), vorher, 'data unverändert');
});
