'use strict';
/* Probe — Dosierung im MedicationStatement der Patientenkurzakte.
   Ein eingelesener Medikationsplan kennt die Dosis getrennt. Sie geht als eigenes Chip-Feld `dosis` mit und erscheint im
   IPS als dosage[0].text; die Rückrichtung liest sie von dort zurück. Die Dosis wird nie aus einem Chip-Text geraten.
   Belegt:
     • [DOSIS·a] ein Planeintrag mit Dosis ergibt dosage[0].text, der Chip-Text bleibt wie bisher;
     • [DOSIS·b] ohne Dosis und bei einem getippten Chip steht kein dosage, auch wenn der Text nach Dosis aussieht;
     • [DOSIS·c] zweites Einlesen: ein vorhandener Chip gleichen Texts ohne dosis bekommt den Wert nachgetragen, nichts doppelt;
     • [DOSIS·d] Rückrichtung aus einem fremden IPS, nur aus dosage[0].text;
     • [DOSIS·e] Schemastufe 96 steht in den Stufen-Fixtures;
     • [DOSIS·Rot-Beweis] ohne die Ausgabe im Generator fällt dieselbe Zusicherung;
     • [Anzeige·a–d] eine Dosis, die nicht schon im Chip-Text steht, ist am Chip und in der Import-Vorschau zu sehen;
     • [Anzeige·Rot-Beweis] ohne die Ausgabe am Chip fehlt sie. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const JETZT = '2026-10-01T12:00:00Z';
// Erfunden: Namen, PZN und Instanz-ID stammen aus keinem echten Plan.
const PLAN = '<MP v="026" U="00112233445566778899AABBCCDDEEFF" l="de-DE">'
  + '<P g="Erika" f="Musterfrau" b="19600101"/>'
  + '<A n="Praxis Beispielweg" s="Lindenallee 3" z="12345" c="Musterstadt" t="20261106"/>'
  + '<S>'
  + '<M p="1234567" a="Beispielol 5 mg" m="1" v="1" i="nüchtern einnehmen"><W w="Beispielwirkstoff" s="5 mg"/></M>'
  + '<M a="Mustersalbe ohne Angabe"/>'
  + '</S></MP>';

async function frisch(optionen) {
  const k = ladeKern(optionen);
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
const statements = (b) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === 'MedicationStatement');
const zuName = (b, teil) => statements(b).find((r) => r.medicationCodeableConcept.text.includes(teil));
const klar = (w) => JSON.parse(JSON.stringify(w));

test('[DOSIS·a] ein Planeintrag mit Dosis ergibt dosage[0].text, der Chip-Text bleibt', async () => {
  const k = await frisch();
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  const chips = k.V.getData().sektoren.health.medicationOngoing;
  assert.equal(chips[0].text, 'Beispielol 5 mg · 1-0-1-0 · nüchtern einnehmen', 'Mappe und Blätter lesen weiter den Text');
  assert.equal(chips[0].dosis, '1-0-1-0');
  const r = zuName(k.V.fhirIpsBundle(JETZT, { sensibel: true }), 'Beispielol');
  assert.equal(r.dosage[0].text, '1-0-1-0');
});

test('[DOSIS·b] ohne Dosis und bei einem getippten Chip steht kein dosage', async () => {
  const k = await frisch();
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  const liste = k.V.getData().sektoren.health.medicationOngoing.concat([{ text: 'Getipptol 1-0-1-0' }]);
  k.V.sektorFeldSetzen('health', 'medicationOngoing', liste);
  assert.equal(Object.prototype.hasOwnProperty.call(liste[1], 'dosis'), false, 'kein leeres Feld am Chip');
  const b = k.V.fhirIpsBundle(JETZT, { sensibel: true });
  assert.equal('dosage' in zuName(b, 'Mustersalbe'), false, 'Planeintrag ohne Dosis');
  assert.equal('dosage' in zuName(b, 'Getipptol'), false, 'die Dosis wird nie aus dem Chip-Text geraten');
});

test('[DOSIS·c] zweites Einlesen trägt die Dosis nach und legt nichts doppelt an', async () => {
  const k = await frisch();
  const plan = k.V.bmpXmlLesen(PLAN).plan;
  const [e1, e2] = plan.eintraege;
  k.V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: k.V.bmpEintragText(e1) }, { text: k.V.bmpEintragText(e2) }, { text: 'Fremdes', dosis: '0-0-1-0' }]);
  const r = k.V.bmpPlanUebernehmen(plan);
  assert.deepEqual({ ...r }, { neu: 0, schonDa: 2 });
  const chips = k.V.getData().sektoren.health.medicationOngoing;
  assert.equal(chips.length, 3);
  assert.equal(chips[0].dosis, '1-0-1-0', 'Nachtrag');
  assert.equal('dosis' in chips[1], false, 'der Plan nennt hier keine Dosis');
  assert.equal(chips[2].dosis, '0-0-1-0', 'ein anderer Chip bleibt unberührt');
});

test('[DOSIS·c2] eine vorhandene Dosis wird beim zweiten Einlesen nicht überschrieben', async () => {
  const k = await frisch();
  const plan = k.V.bmpXmlLesen(PLAN).plan;
  k.V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: k.V.bmpEintragText(plan.eintraege[0]), dosis: 'eigene Angabe' }]);
  k.V.bmpPlanUebernehmen(plan);
  assert.equal(k.V.getData().sektoren.health.medicationOngoing[0].dosis, 'eigene Angabe');
});

test('[DOSIS·d] die Rückrichtung liest nur dosage[0].text', async () => {
  const k = await frisch();
  const res = (dosage) => ({ resource: Object.assign({ resourceType: 'MedicationStatement', medicationCodeableConcept: { text: 'Mittel' } }, dosage === undefined ? {} : { dosage }) });
  const lies = (dosage) => {
    const f = k.V._fhirIpsFelder({ resourceType: 'Bundle', entry: [res(dosage)] }).find((x) => x.feldId === 'medicationOngoing');
    return f.wert[0];
  };
  assert.equal(lies([{ text: ' 1-0-0-0 ' }]).dosis, '1-0-0-0');
  assert.equal('dosis' in lies(undefined), false);
  assert.equal('dosis' in lies([{ route: {} }]), false, 'ohne text keine Dosis');
  assert.equal('dosis' in lies([{ text: '   ' }]), false);
  const allergie = k.V._fhirIpsFelder({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'AllergyIntolerance', code: { text: 'Hasel' }, dosage: [{ text: 'x' }] } }] })
    .find((x) => x.feldId === 'allergiesMedicationFoodOther');
  assert.equal('dosis' in allergie.wert[0], false, 'nur am MedicationStatement');
});

test('[DOSIS·e] Schemastufe 96 steht in den Stufen-Fixtures', async () => {
  const { V } = await frisch();
  assert.ok(V.SCHEMA_VERSION_AKTUELL >= 96);
  const { STUFEN } = require('./fixtures/migrations-stufen.js');
  assert.ok(STUFEN.some((st) => st.nach === 96));
});

test('[DOSIS·Rot-Beweis] ohne die Ausgabe im Generator steht kein dosage', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const stelle = '...(e.dosis ? { text: e.dosis } : {})';
  assert.equal(quelle.split(stelle).length, 2, 'die Stelle steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-dosis-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    fs.writeFileSync(kopie, quelle.replace(stelle, '...{}'));
    const k = await frisch({ htmlPfad: kopie, backen: true });
    k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
    assert.equal('text' in zuName(k.V.fhirIpsBundle(JETZT, { sensibel: true }), 'Beispielol').dosage[0], false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Erfunden: ein fremdes IPS mit einem Medikament und seiner Dosis.
const fremdeChips = (k, dosis) => k.V._fhirIpsFelder({ resourceType: 'Bundle', entry: [{ resource: {
  resourceType: 'MedicationStatement', medicationCodeableConcept: { text: 'Mittel 10 mg' }, dosage: [{ text: dosis }] } }] })
  .find((x) => x.feldId === 'medicationOngoing').wert;
const feldDef = (k) => k.V.feldDefFuer('health', 'medicationOngoing');
// Was die Person liest: ohne das Attribut data-chip, das den Chip-Wert für das Speichern trägt.
const chipAmBildschirm = (k, chips) => [k.V.feldInputHTML(feldDef(k), chips), k.V.feldWertHTML(feldDef(k), chips)].map((h) => h.replace(/ data-chip="[^"]*"/g, ''));

test('[Anzeige·a] die Dosis aus einem fremden IPS steht am Chip beim Bearbeiten und in der Ansicht', async () => {
  const k = await frisch();
  for (const html of chipAmBildschirm(k, fremdeChips(k, '1 Tablette morgens'))) assert.ok(html.includes('Mittel 10 mg · 1 Tablette morgens'), html);
});

test('[Anzeige·b] die Import-Vorschau zeigt die Dosis, eine geänderte Dosis ist ein Konflikt', async () => {
  const k = await frisch();
  const vorschau = (dosis) => k.V.importPlan('fhir-ips', JSON.stringify({ resourceType: 'Bundle', entry: [{ resource: {
    resourceType: 'MedicationStatement', medicationCodeableConcept: { text: 'Mittel 10 mg' }, dosage: [{ text: dosis }] } }] }))
    .zeilen.find((z) => z.feldId === 'medicationOngoing');
  assert.ok(vorschau('1-0-0').neuText.includes('Mittel 10 mg · 1-0-0'), vorschau('1-0-0').neuText);
  k.V.sektorFeldSetzen('health', 'medicationOngoing', klar(fremdeChips(k, '1-0-0')));
  assert.equal(vorschau('1-0-0').status, 'gleich');
  assert.equal(vorschau('0-0-1').status, 'konflikt');
});

test('[Anzeige·c] steht die Dosis schon im Chip-Text, erscheint sie nicht doppelt; ein Zahlenanklang im Namen zählt nicht', async () => {
  const k = await frisch();
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  const chips = klar(k.V.getData().sektoren.health.medicationOngoing);
  const c = chips.find((x) => x.text.includes('Beispielol'));
  assert.ok(c.dosis, 'der Planeintrag trägt eine Dosis');
  for (const html of chipAmBildschirm(k, [c])) assert.equal(html.split('· ' + c.dosis).length, 2, html);
  for (const html of chipAmBildschirm(k, fremdeChips(k, '1'))) assert.ok(html.includes('Mittel 10 mg · 1'), 'die 1 aus „10 mg“ ist keine Dosis');
});

test('[Anzeige·d] ein Chip ohne Dosis bleibt unverändert, Markup in der Dosis kommt maskiert an; PDF-Klartext bleibt ohne', async () => {
  const k = await frisch();
  for (const html of chipAmBildschirm(k, [{ text: 'Getipptol' }])) assert.equal(html.includes(' · '), false, html);
  for (const html of chipAmBildschirm(k, fremdeChips(k, '<img src=x>'))) assert.equal(html.includes('<img src=x>'), false, html);
  assert.equal(k.V.feldWertText(feldDef(k), fremdeChips(k, '1-0-0')), 'Mittel 10 mg');
});

test('[Anzeige·Rot-Beweis] ohne die Ausgabe am Chip fehlt die Dosis', async () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const stelle = "(dosis ? escapeHTML(' · ' + dosis) : '')";
  assert.equal(quelle.split(stelle).length, 2, 'die Stelle steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-dosis-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    fs.writeFileSync(kopie, quelle.replace(stelle, "''"));
    const k = await frisch({ htmlPfad: kopie, backen: true });
    for (const html of chipAmBildschirm(k, fremdeChips(k, '1-0-0'))) assert.equal(html.includes('· 1-0-0'), false, html);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
