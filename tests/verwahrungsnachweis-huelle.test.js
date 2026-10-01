'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Verwahrungsnachweis beim Weitergeben — die Hülle (28.09.2026, Verwahrung V1)
   ────────────────────────────────────────────────────────────────────────
   Neben „Original herunterladen" (U2-ADR-086 §2, byte-gleich) gibt es die
   Hülle: Bundle type=collection mit dem Original UNVERÄNDERT als Binary und
   einer Provenance (activity transmit, target das Binary, recorded die
   Herausgabe). Verwahrerin ist die Person selbst; handelt jemand für sie
   (Sub-Kontext), die RelatedPerson mit onBehalfOf — nie Vivodepot. Der
   Aussteller steht als author, aus dem Original gelesen; entity.what.identifier
   ist die Kennung des Originals.
   ROT-BEWEIS: ein Byte im Binary geändert; Vivodepot als Verwahrerin; die
   Provenance im Dokument selbst statt daneben (die Hand-Bauart v3).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const FIX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', n));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function befund(bundle, originalBytes) {
  const f = [];
  if (!bundle || bundle.type !== 'collection') f.push('keine Hülle (type ≠ collection)');
  const ents = (bundle && bundle.entry) || [];
  const byUrl = new Map(ents.map((x) => [x.fullUrl, x.resource]));
  const bin = ents.find((x) => x.resource && x.resource.resourceType === 'Binary');
  if (!bin) f.push('kein Binary');
  else if (sha(Buffer.from(bin.resource.data, 'base64')) !== sha(originalBytes)) f.push('Original nicht byte-gleich');
  const provs = ents.filter((x) => x.resource && x.resource.resourceType === 'Provenance').map((x) => x.resource);
  if (provs.length !== 1) f.push('nicht genau eine Provenance');
  const p = provs[0] || {};
  const act = ((p.activity || {}).coding || [])[0] || {};
  if (act.code !== 'transmit') f.push('activity ist nicht transmit');
  if (!bin || !(p.target || []).some((t) => t.reference === bin.fullUrl)) f.push('target zeigt nicht auf das Binary');
  const kust = (p.agent || []).find((a) => ((a.type || {}).coding || []).some((c) => c.code === 'custodian'));
  const who = kust && kust.who;
  const wer = who && who.reference ? byUrl.get(who.reference) : null;
  if (!wer || !['Patient', 'RelatedPerson'].includes(wer.resourceType)) f.push('Verwahrerin ist nicht Patient/RelatedPerson im Bundle');
  if (wer && wer.resourceType === 'RelatedPerson' && !(kust.onBehalfOf && byUrl.get(kust.onBehalfOf.reference) && byUrl.get(kust.onBehalfOf.reference).resourceType === 'Patient')) f.push('RelatedPerson ohne onBehalfOf Patient');
  if (/vivodepot/i.test(JSON.stringify(p.agent || []))) f.push('Vivodepot als Agent');
  return f;
}

async function mitOriginal(datei) {
  const { V } = ladeKern();
  await V.depotAnlegen('Verwahrung-2026!');
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Musterfrau');
  const bytes = FIX(datei);
  const id = V.importAutoritativDokument(bytes.toString('utf8'), new Uint8Array(bytes));
  return { V, id, bytes };
}

test('[Verwahrung·Hülle] Laborbefund und Entlassbrief: Original byte-gleich als Binary, eine Provenance, Verwahrerin die Person', async () => {
  for (const datei of ['eigenprobe-eu-lab.json', 'eigenprobe-eu-hdr.json']) {
    const { V, id, bytes } = await mitOriginal(datei);
    assert.ok(id, 'Vorbedingung: autoritativ importiert — ' + datei);
    const b = V.verwahrungsNachweisBundle(id, new Date('2026-09-28T10:00:00Z'));
    assert.deepEqual(befund(b, bytes), [], datei);
    const p = b.entry.find((x) => x.resource.resourceType === 'Provenance').resource;
    const orig = JSON.parse(bytes.toString('utf8'));
    if (orig.identifier) assert.deepEqual(p.entity[0].what.identifier, orig.identifier, 'entity: Kennung des Originals');
    assert.equal(p.recorded, '2026-09-28T10:00:00.000Z');
    // Die Hülle ist kein IPS-Dokument: kein Profil-Anspruch am Patient, sonst wäre sie ohne Geburtsdatum
    // am HL7-Validator ungültig (birthDate min=1 in Patient-uv-ips; gemessen 28.09.2026).
    const pat = b.entry.find((x) => x.resource.resourceType === 'Patient').resource;
    assert.equal(pat.birthDate, undefined, 'Vorbedingung: Depot ohne Geburtsdatum');
    assert.equal(pat.meta, undefined, 'Patient der Hülle beansprucht kein Profil');
  }
});

test('[Verwahrung·Hülle] im Sub-Kontext ist die Verwahrerin die RelatedPerson mit onBehalfOf der Person', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Verwahrung-Sub-2026!');
  V.akteurSelbstErklaeren('Mutter');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Lea', inhaberin: 'Lea', verwaltungsTyp: 'verwaltet' }, 'Sub-Vw-2026!');
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'Sub-Vw-2026!');
  V.subKontextBetreten(e.depotUUID);
  const bytes = FIX('eigenprobe-eu-lab.json');
  const id = V.importAutoritativDokument(bytes.toString('utf8'), new Uint8Array(bytes));
  const b = V.verwahrungsNachweisBundle(id);
  assert.deepEqual(befund(b, bytes), []);
  const p = b.entry.find((x) => x.resource.resourceType === 'Provenance').resource;
  const kust = p.agent.find((a) => a.type.coding[0].code === 'custodian');
  assert.ok(kust.onBehalfOf, 'onBehalfOf gesetzt');
});

test('[Verwahrung·Hülle·Rot-Beweis] verändertes Original, Vivodepot als Verwahrerin und die Provenance im Dokument fallen', async () => {
  const { V, id, bytes } = await mitOriginal('eigenprobe-eu-lab.json');
  const gut = V.verwahrungsNachweisBundle(id);
  const kopie = () => JSON.parse(JSON.stringify(gut));
  const a = kopie(); const bin = a.entry.find((x) => x.resource.resourceType === 'Binary').resource;
  const roh = Buffer.from(bin.data, 'base64'); roh[10] ^= 1; bin.data = roh.toString('base64');
  assert.ok(befund(a, bytes).includes('Original nicht byte-gleich'));
  const b = kopie(); const org = { fullUrl: 'urn:uuid:org', resource: { resourceType: 'Organization', name: 'Vivodepot GmbH' } };
  b.entry.push(org); b.entry.find((x) => x.resource.resourceType === 'Provenance').resource.agent.find((x) => x.type.coding[0].code === 'custodian').who = { reference: 'urn:uuid:org', display: 'Vivodepot GmbH' };
  const fb = befund(b, bytes);
  assert.ok(fb.includes('Vivodepot als Agent') && fb.includes('Verwahrerin ist nicht Patient/RelatedPerson im Bundle'));
  const doc = JSON.parse(bytes.toString('utf8')); doc.entry.push({ fullUrl: 'urn:uuid:p', resource: { resourceType: 'Provenance' } });
  assert.ok(befund(doc, bytes).includes('keine Hülle (type ≠ collection)'), 'die Hand-Bauart v3 (Provenance im Dokument) ist keine Hülle');
});

test('[Verwahrung·Hülle] der erste Weg bleibt: „Original herunterladen“ ist weiter byte-gleich, der Knopf der Hülle steht daneben', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.match(kern, /data-mappe-verwahrung=/);
  assert.match(kern, /data-mappe-herunterladen=/);
});
