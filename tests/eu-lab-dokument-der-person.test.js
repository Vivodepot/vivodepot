'use strict';
/* ════════════════════════════════════════════════════════════════════════
   EU-Labordokument der Person (22.10.2026, K18, Nachtrag U2-ADR-444)
   ────────────────────────────────────────────────────────────────────────
   Ein eingelesener EU-Laborbefund (eu-lab) geht zusätzlich als NEUES Dokument
   im EU-Format hinaus, mit der Person als Autorin. Quelle ist allein das
   Original, nie Depot-Felder (U2-ADR-050 E3: kein Nachbau aus Feldern).
   Befund und Messwerte bleiben, wie sie sind; das Original hängt unverändert
   als Binary im Abschnitt „Anhang“ (LOINC 77599-9); relatesTo 'transforms'
   zeigt auf seine Kennung. Kein Verwahrer, keine Unterschrift der Klinik.
   ROT-BEWEIS: ein Byte im Anhang, ein geänderter Messwert, ein Verwahrer
   oder die Klinik als Autorin fallen auf.
   Gegen das Profil Bundle-eu-lab 2.0.0 urteilt der HL7-Validator in
   tests/konformitaet/externe-validatoren.mjs (Fall eu-lab-dokument-der-person).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const LABOR = path.join(__dirname, '..', 'tools', 'vorfuehrung', 'patientin', 'laborbefund-ca125.json');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const ressourcen = (b, typ) => ((b && b.entry) || []).map((x) => x.resource).filter((r) => r && r.resourceType === typ);

function befund(doc, originalBytes) {
  const f = [];
  const original = JSON.parse(originalBytes.toString('utf8'));
  if (!doc || doc.resourceType !== 'Bundle' || doc.type !== 'document') f.push('kein Dokument (type ≠ document)');
  if (!doc.identifier || JSON.stringify(doc.identifier) === JSON.stringify(original.identifier)) f.push('Bundle-Kennung nicht neu');
  const byUrl = new Map(((doc && doc.entry) || []).map((x) => [x.fullUrl, x.resource]));
  const comp = ressourcen(doc, 'Composition')[0];
  if (!comp) return f.concat('keine Composition');
  const origComp = ressourcen(original, 'Composition')[0];
  // dr-comp-identifier (Bundle-eu-lab): die Composition behält ihre Kennung, sie gleicht der des DiagnosticReport.
  if (JSON.stringify(comp.identifier) !== JSON.stringify(origComp.identifier)) f.push('Composition-Kennung geändert');
  const autorin = (comp.author || [])[0] && byUrl.get(comp.author[0].reference);
  if (!autorin || !['Patient', 'RelatedPerson'].includes(autorin.resourceType) || comp.author.length !== 1) f.push('Autorin ist nicht die Person');
  if (comp.custodian) f.push('Verwahrer gesetzt');
  if (comp.attester) f.push('Unterschrift der Klinik übernommen');
  const rel = (comp.relatesTo || []).find((r) => r.code === 'transforms');
  if (!rel || JSON.stringify(rel.targetIdentifier) !== JSON.stringify(original.identifier)) f.push('relatesTo transforms zeigt nicht auf das Original');
  const anhang = (comp.section || []).find((s) => ((s.code || {}).coding || []).some((c) => c.system === 'http://loinc.org' && c.code === '77599-9'));
  const bin = anhang && anhang.entry && byUrl.get(anhang.entry[0].reference);
  if (!bin || bin.resourceType !== 'Binary') f.push('kein Anhang mit Binary');
  else if (sha(Buffer.from(bin.data, 'base64')) !== sha(originalBytes)) f.push('Original nicht byte-gleich');
  if (!anhang || !anhang.title || !anhang.text || !/<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/.test(anhang.text.div || '')) f.push('Anhang ohne Titel oder Lesetext');
  // Befund, Messwerte und Labor: gleich wie im Original.
  for (const typ of ['DiagnosticReport', 'Observation', 'Organization', 'Patient']) {
    if (JSON.stringify(ressourcen(doc, typ)) !== JSON.stringify(ressourcen(original, typ))) f.push(typ + ' verändert');
  }
  return f;
}

async function mitLabor() {
  const { V } = ladeKern();
  await V.depotAnlegen('EuLab-Person-2026!');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Wilhelmine');
  V.sektorFeldSetzen('identity', 'familyName', 'Depotfeldmann');
  const bytes = fs.readFileSync(LABOR);
  const id = V.importAutoritativDokument(bytes.toString('utf8'), new Uint8Array(bytes));
  return { V, id, bytes };
}

test('[EU-Lab·Person] neues Dokument, Original byte-gleich im Anhang', async () => {
  const { V, id, bytes } = await mitLabor();
  assert.ok(id, 'Vorbedingung: autoritativ eingelesen');
  const doc = V.euLabDokumentDerPerson(id, new Date('2026-10-22T10:00:00Z'));
  assert.deepEqual(befund(doc, bytes), []);
  const comp = ressourcen(doc, 'Composition')[0];
  assert.equal(comp.date, '2026-10-22T10:00:00.000Z');
  assert.equal(doc.timestamp, '2026-10-22T10:00:00.000Z');
  assert.deepEqual(comp.author, [{ reference: ressourcen(JSON.parse(bytes.toString('utf8')), 'Composition')[0].subject.reference }], 'Autorin ist der Patient des Originals');
  assert.deepEqual(doc.meta, JSON.parse(bytes.toString('utf8')).meta, 'der Profil-Anspruch des Originals bleibt');
});

test('[EU-Lab·Person] Quelle ist nur das Original: kein Depot-Feld geht in das Dokument', async () => {
  const { V, id } = await mitLabor();
  const text = JSON.stringify(V.euLabDokumentDerPerson(id));
  assert.equal(/Wilhelmine|Depotfeldmann/.test(text), false, 'Name aus dem Depot im Dokument');
});

test('[EU-Lab·Person] im Sub-Kontext ist die Autorin eine RelatedPerson für den Patienten des Originals', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('EuLab-Sub-2026!');
  V.akteurSelbstErklaeren('Mutter');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, 'Sub-EuLab-2026!');
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'Sub-EuLab-2026!');
  V.subKontextBetreten(e.depotUUID);
  const bytes = fs.readFileSync(LABOR);
  const id = V.importAutoritativDokument(bytes.toString('utf8'), new Uint8Array(bytes));
  const doc = V.euLabDokumentDerPerson(id);
  assert.deepEqual(befund(doc, bytes), []);
  const comp = ressourcen(doc, 'Composition')[0];
  const rp = doc.entry.find((x) => x.fullUrl === comp.author[0].reference).resource;
  assert.equal(rp.resourceType, 'RelatedPerson');
  assert.equal(rp.patient.reference, comp.subject.reference);
});

test('[EU-Lab·Person] nur für einen EU-Laborbefund: ein Entlassbrief ergibt kein Dokument und keinen Knopf', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('EuLab-Hdr-2026!');
  V.akteurSelbstErklaeren('Maria');
  const bytes = fs.readFileSync(path.join(__dirname, 'fixtures', 'eigenprobe-eu-hdr.json'));
  const id = V.importAutoritativDokument(bytes.toString('utf8'), new Uint8Array(bytes));
  assert.ok(id, 'Vorbedingung: Entlassbrief eingelesen');
  assert.throws(() => V.euLabDokumentDerPerson(id), /eu-lab-kein-original/);
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(kern, /if \(e\.autoritativ && e\.inhalt && e\.gepruefteIG === FHIR_LAB_DOC_IG\) \{\n\s+koerperHTML \+= '<button type="button" class="btn btn-sek" data-mappe-eu-lab-person=/);
  assert.match(kern, /data-mappe-eu-lab-person\]'\); if \(bEl\) bEl\.onclick = \(\) => mappeAktivBestaetigen\(_aktivFunde, \(\) => flowMappeEuLabDerPersonHerunterladen\(id\)\)/);
});

test('[EU-Lab·Person·Rot-Beweis] ein Byte im Anhang, ein Messwert, ein Verwahrer und die Klinik als Autorin fallen', async () => {
  const { V, id, bytes } = await mitLabor();
  const gut = V.euLabDokumentDerPerson(id);
  const kopie = () => JSON.parse(JSON.stringify(gut));
  const a = kopie(); const bin = ressourcen(a, 'Binary')[0];
  const roh = Buffer.from(bin.data, 'base64'); roh[10] ^= 1; bin.data = roh.toString('base64');
  assert.ok(befund(a, bytes).includes('Original nicht byte-gleich'));
  const b = kopie(); const obs = ressourcen(b, 'Observation')[0]; obs.valueQuantity = { value: 1, unit: 'U/mL' };
  assert.ok(befund(b, bytes).includes('Observation verändert'));
  const c = kopie(); ressourcen(c, 'Composition')[0].custodian = { reference: ressourcen(c, 'Organization').length ? c.entry.find((x) => x.resource.resourceType === 'Organization').fullUrl : 'urn:uuid:x' };
  assert.ok(befund(c, bytes).includes('Verwahrer gesetzt'));
  const d = kopie(); ressourcen(d, 'Composition')[0].author = [{ reference: d.entry.find((x) => x.resource.resourceType === 'Organization').fullUrl }];
  assert.ok(befund(d, bytes).includes('Autorin ist nicht die Person'));
});
