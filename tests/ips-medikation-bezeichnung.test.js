'use strict';
/* Probe: Ein Medikament aus einem eingelesenen Plan geht mit getrennten Angaben ins IPS.
   Bezeichnung, Dosis, Einnahmehinweis, Grund und Zusatz stehen je am eigenen Element von MedicationStatement (FHIR R4,
   hl7.fhir.uv.ips#2.0.0), der Chip-Text bleibt, wie die Person ihn liest.
   Belegt:
     • [Bez·a] der Chip trägt die Angaben getrennt, sein Text bleibt;
     • [Bez·b] jedes Element im IPS trägt genau seine Angabe, der Name des Medikaments keine Dosis;
     • [Bez·c] Rundweg: exportiert, eingelesen und wieder exportiert ist nichts verloren, die Person liest denselben Eintrag;
     • [Bez·d] früher eingelesener Chip: nur ein eigener Dosis-Abschnitt trennt, der Rest des Texts geht nicht verloren;
     • [Bez·e] zweites Einlesen trägt fehlende Angaben nach, legt nichts doppelt an und überschreibt nichts;
     • [Bez·f] die Rückrichtung liest ein fremdes IPS, ein leeres Element ergibt kein Feld;
     • [PDF] die Klartext-Ausgabe setzt die Felder einzeln, nennt die Dosis einmal und bleibt ohne fremde Dosis;
     • [W2·…] ein eigener Plan behält nach dem Rundweg über das IPS die Dosis in der Klartext-Ausgabe, eine fremde Dosis bleibt draußen;
     • [Klasse] jede Stelle, die den Namen eines Medikaments ins IPS schreibt, läuft über einen Baustein;
     • [Rot-Beweis] ohne die jeweilige Stelle im Kern fällt die Zusicherung. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { STUFEN } = require('./fixtures/migrations-stufen.js');

const JETZT = '2026-10-01T12:00:00Z';
// Erfunden: Namen, PZN und Instanz-ID stammen aus keinem echten Plan.
const PLAN = '<MP v="026" U="00112233445566778899AABBCCDDEEFF" l="de-DE">'
  + '<P g="Erika" f="Musterfrau" b="19600101"/>'
  + '<A n="Praxis Beispielweg" s="Lindenallee 3" z="12345" c="Musterstadt" t="20261106"/>'
  + '<S>'
  + '<M p="1234567" a="Beispielol 5 mg" m="1" v="1" i="nüchtern einnehmen" r="Blutdruck" x="mit Wasser"><W w="Beispielwirkstoff" s="5 mg"/></M>'
  + '<M a="Mustersalbe ohne Angabe"/>'
  + '</S></MP>';
const VOLLER_TEXT = 'Beispielol 5 mg · 1-0-1-0 · nüchtern einnehmen · Blutdruck · mit Wasser';
const KERN = path.join(__dirname, '..', 'vivodepot.html');

async function frisch(optionen) {
  const k = ladeKern(optionen);
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
async function mitPlan(optionen) {
  const k = await frisch(optionen);
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  return k;
}
const klar = (w) => JSON.parse(JSON.stringify(w));
const chips = (k) => klar(k.V.getData().sektoren.health.medicationOngoing);
const bundle = (k) => klar(k.V.fhirIpsBundle(JETZT, { sensibel: true }));
const statements = (b) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === 'MedicationStatement');
const zuName = (b, teil) => statements(b).find((r) => r.medicationCodeableConcept.text.includes(teil));
const beispielol = (k) => zuName(bundle(k), 'Beispielol');
const feldDef = (k) => k.V.feldDefFuer('health', 'medicationOngoing');
const eingelesen = (k, b) => klar(k.V._fhirIpsFelder(b).find((x) => x.feldId === 'medicationOngoing').wert);
const chipAmBildschirm = (k, c) => [k.V.feldInputHTML(feldDef(k), c), k.V.feldWertHTML(feldDef(k), c)].map((h) => h.replace(/ data-chip="[^"]*"/g, ''));
const nurElemente = (r) => ({ name: r.medicationCodeableConcept.text, dosage: r.dosage, reasonCode: r.reasonCode, note: r.note });

test('[Bez·a] der Chip trägt die Angaben getrennt, sein Text bleibt', async () => {
  const c = chips(await mitPlan())[0];
  assert.equal(c.text, VOLLER_TEXT, 'die Person liest den Eintrag wie bisher');
  assert.equal(c.name, 'Beispielol 5 mg');
  assert.equal(c.dosis, '1-0-1-0');
  assert.equal(c.instruction, 'nüchtern einnehmen');
  assert.equal(c.reason, 'Blutdruck');
  assert.equal(c.note, 'mit Wasser');
});

test('[Bez·b] jedes Element im IPS trägt genau seine Angabe', async () => {
  const k = await mitPlan();
  const r = beispielol(k);
  assert.equal(r.medicationCodeableConcept.text, 'Beispielol 5 mg', 'der Name trägt keine Dosis');
  assert.deepEqual(r.dosage, [{ text: '1-0-1-0', patientInstruction: 'nüchtern einnehmen' }]);
  assert.deepEqual(r.reasonCode, [{ text: 'Blutdruck' }]);
  assert.deepEqual(r.note, [{ text: 'mit Wasser' }]);
  assert.ok(r.text.div.includes(VOLLER_TEXT), 'der lesbare Text nennt alle Angaben');
  const ohne = zuName(bundle(k), 'Mustersalbe');
  assert.equal(ohne.medicationCodeableConcept.text, 'Mustersalbe ohne Angabe');
  for (const feld of ['dosage', 'reasonCode', 'note']) assert.equal(feld in ohne, false, feld + ' ohne Angabe fehlt');
});

test('[Bez·c] Rundweg ohne Verlust, die Person liest denselben Eintrag', async () => {
  const k = await mitPlan();
  const b1 = bundle(k);
  const zurueck = eingelesen(k, b1);
  const k2 = await frisch();
  k2.V.sektorFeldSetzen('health', 'medicationOngoing', zurueck);
  const b2 = bundle(k2);
  assert.deepEqual(nurElemente(zuName(b2, 'Beispielol')), nurElemente(zuName(b1, 'Beispielol')));
  const c = zurueck.find((x) => x.text.includes('Beispielol'));
  for (const html of chipAmBildschirm(k2, [c])) assert.ok(html.includes(VOLLER_TEXT), html);
});

test('[Bez·d] ein früher eingelesener Chip: nur ein eigener Dosis-Abschnitt trennt', async () => {
  const k = await frisch();
  k.V.sektorFeldSetzen('health', 'medicationOngoing', [
    { text: 'Altol 10 mg · 1-0-0 · zum Essen · Blutdruck', dosis: '1-0-0' },
    { text: 'Getipptol 1-0-0', dosis: '1-0-0' },
    { text: 'Ohnedosis · zum Essen' },
  ]);
  const b = bundle(k);
  const alt = zuName(b, 'Altol');
  assert.equal(alt.medicationCodeableConcept.text, 'Altol 10 mg');
  assert.deepEqual(alt.dosage, [{ text: '1-0-0' }]);
  assert.deepEqual(alt.note, [{ text: 'zum Essen · Blutdruck' }], 'der Rest geht nicht verloren und wird nicht gedeutet');
  assert.equal('reasonCode' in alt, false, 'kein Grund geraten');
  const getippt = zuName(b, 'Getipptol');
  assert.equal(getippt.medicationCodeableConcept.text, 'Getipptol 1-0-0', 'kein eigener Abschnitt, der Text bleibt der Name');
  assert.equal('note' in getippt, false);
  assert.equal(zuName(b, 'Ohnedosis').medicationCodeableConcept.text, 'Ohnedosis · zum Essen', 'ohne Dosis wird nichts getrennt');
  assert.deepEqual(chips(k)[0], { text: 'Altol 10 mg · 1-0-0 · zum Essen · Blutdruck', dosis: '1-0-0' }, 'der gespeicherte Wert bleibt');
});

test('[Bez·e] zweites Einlesen trägt nach, doppelt nichts und überschreibt nichts', async () => {
  const k = await frisch();
  k.V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: VOLLER_TEXT, dosis: 'eigene Angabe' }]);
  const r = k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  assert.equal(r.schonDa, 1);
  const c = chips(k).find((x) => x.text === VOLLER_TEXT);
  assert.equal(chips(k).filter((x) => x.text === VOLLER_TEXT).length, 1);
  assert.equal(c.dosis, 'eigene Angabe', 'eine vorhandene Angabe bleibt');
  assert.equal(c.name, 'Beispielol 5 mg');
  assert.equal(c.instruction, 'nüchtern einnehmen');
  const stand = JSON.stringify(chips(k));
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  assert.equal(JSON.stringify(chips(k)), stand, 'ein drittes Einlesen ändert nichts');
});

test('[Bez·f] die Rückrichtung liest ein fremdes IPS, leere Elemente ergeben kein Feld', async () => {
  const k = await frisch();
  const lies = (zusatz) => eingelesen(k, { resourceType: 'Bundle', entry: [{ resource: Object.assign({ resourceType: 'MedicationStatement', medicationCodeableConcept: { text: 'Mittel' } }, zusatz) }] })[0];
  const c = lies({ dosage: [{ text: ' 1-0-0 ', patientInstruction: ' zum Essen ' }], reasonCode: [{ text: 'Husten' }, { coding: [{ display: 'Fieber' }] }], note: [{ text: 'Erste' }, { text: 'Zweite' }] });
  assert.deepEqual(c, { text: 'Mittel', dosis: '1-0-0', instruction: 'zum Essen', reason: 'Husten · Fieber', note: 'Erste · Zweite' });
  assert.deepEqual(lies({ dosage: [{ patientInstruction: '  ' }], reasonCode: [{}], note: [{ text: '' }, null] }), { text: 'Mittel' });
  assert.deepEqual(lies({ dosage: 'x', reasonCode: 'x', note: 'x' }), { text: 'Mittel' });
  const allergie = k.V._fhirIpsFelder({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'AllergyIntolerance', code: { text: 'Hasel' }, note: [{ text: 'x' }] } }] })
    .find((x) => x.feldId === 'allergiesMedicationFoodOther');
  assert.deepEqual(klar(allergie.wert[0]), { text: 'Hasel' }, 'nur am MedicationStatement');
});

test('[Bez·g] Schema-Stufe 98 ist eingetragen', async () => {
  const k = await frisch();
  assert.ok(k.V.SCHEMA_VERSION_AKTUELL >= 98);
  assert.ok(STUFEN.some((s) => s.nach === 98), 'die Stufe steht in den Stufen-Fixtures');
});

test('[PDF] die Klartext-Ausgabe setzt die Felder einzeln und bleibt ohne fremde Dosis', async () => {
  const k = await mitPlan();
  const c = chips(k).filter((x) => x.text === VOLLER_TEXT);
  const text = k.V.feldWertText(feldDef(k), c);
  assert.equal(text, VOLLER_TEXT);
  assert.equal(text.split('1-0-1-0').length, 2, 'die Dosis steht einmal');
  const umgestellt = [{ ...c[0], text: 'Anzeige bleibt nicht massgeblich' }];
  assert.equal(k.V.feldWertText(feldDef(k), umgestellt), VOLLER_TEXT, 'die Zeile kommt aus den Einzelfeldern, nicht aus dem Chip-Text');
  const fremd = [{ text: 'Mittel', dosis: '1-0-0', instruction: 'zum Essen', reason: 'Husten' }];
  assert.equal(k.V.feldWertText(feldDef(k), fremd), 'Mittel · zum Essen · Husten', 'eine fremde Dosis bleibt draußen');
  assert.equal(k.V.feldWertText(feldDef(k), [{ text: 'Altol · 1-0-0 · zum Essen', dosis: '1-0-0' }]), 'Altol · 1-0-0 · zum Essen', 'Altbestand wie bisher');
});

const ERLAUBT = [
  /medicationCodeableConcept: _cc\(\{ \.\.\.e, anzeigeName: bezeichnung \}\)/,   // der eine Baustein
  /medicationCodeableConcept: \{ coding: \[\{ system: SNOMED, code: '787481004'/,  // der feste Eintrag „keine bekannten Medikamente“
  /\{ medicationCodeableConcept: _fhirMedikationAufloesen\(/,                       // Lesen: Medication-Verweis auflösen
];
function schreiberAusserhalb(quelle) {
  return quelle.split('\n')
    .filter((z) => /medicationCodeableConcept\s*:/.test(z) && !/^\s*(\/\/|\/\*|\*)/.test(z))
    .filter((z) => !ERLAUBT.some((m) => m.test(z)));
}

test('[Klasse] der Name eines Medikaments kommt über einen einzigen Baustein ins IPS', () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  assert.deepEqual(schreiberAusserhalb(quelle), []);
  assert.equal(quelle.split('_codeEintraege(g.medicationOngoing).map(').length, 2, 'die Medikation wird an genau einer Stelle gebaut');
  assert.equal(quelle.split('..._medikationElemente(e)').length, 2, 'der Baustein wird genau einmal aufgerufen');
  const nebenweg = quelle + "\nconst x = { medicationCodeableConcept: _cc(e) };\n";
  assert.equal(schreiberAusserhalb(nebenweg).length, 1, 'ein zweiter Schreiber fällt auf');
});

const STELLEN = [
  { name: 'Name', stelle: '_cc({ ...e, anzeigeName: bezeichnung })', neu: '_cc(e)', fall: (r) => assert.equal(r.medicationCodeableConcept.text, VOLLER_TEXT) },
  { name: 'Dosis', stelle: '...(e.dosis ? { text: e.dosis } : {})', neu: '...{}', fall: (r) => assert.equal('text' in r.dosage[0], false) },
  { name: 'Hinweis', stelle: '...(e.instruction ? { patientInstruction: e.instruction } : {})', neu: '...{}', fall: (r) => assert.equal('patientInstruction' in r.dosage[0], false) },
  { name: 'Grund', stelle: '...(e.reason ? { reasonCode: [{ text: e.reason }] } : {})', neu: '...{}', fall: (r) => assert.equal('reasonCode' in r, false) },
  { name: 'Zusatz', stelle: '...(e.note ? { note: [{ text: e.note }] } : {})', neu: '...{}', fall: (r) => assert.equal('note' in r, false) },
];

test('[Rot-Beweis] ohne die jeweilige Stelle fehlt das Element', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-med-bez-'));
  try {
    for (const s of STELLEN) {
      assert.equal(quelle.split(s.stelle).length, 2, s.name + ': die Stelle steht genau einmal im Kern');
      const kopie = path.join(dir, 'kern.html');
      fs.writeFileSync(kopie, quelle.replace(s.stelle, s.neu));
      s.fall(zuName(bundle(await mitPlan({ htmlPfad: kopie, backen: true })), 'Beispielol'));
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Rot-Beweis·Rückweg] ohne das Lesen der Angaben geht der Hinweis beim Einlesen verloren', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  const stelle = 'Object.assign(chip, _fhirMedikationAngaben(r));';
  assert.equal(quelle.split(stelle).length, 2, 'die Stelle steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-med-bez-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    fs.writeFileSync(kopie, quelle.replace(stelle, ''));
    const k = await frisch({ htmlPfad: kopie, backen: true });
    const c = eingelesen(k, { resourceType: 'Bundle', entry: [{ resource: { resourceType: 'MedicationStatement', medicationCodeableConcept: { text: 'Mittel' }, dosage: [{ patientInstruction: 'zum Essen' }] } }] })[0];
    assert.equal('instruction' in c, false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Rot-Beweis·PDF] ohne die Einzelfelder kommt die Zeile aus dem Chip-Text', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  const stelle = 'const name = (bez && !chip.code) ? bez : klartext;';
  assert.equal(quelle.split(stelle).length, 2, 'die Stelle steht genau einmal im Kern');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-med-bez-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    fs.writeFileSync(kopie, quelle.replace(stelle, 'const name = klartext;'));
    const k = await mitPlan({ htmlPfad: kopie, backen: true });
    const c = chips(k).filter((x) => x.text === VOLLER_TEXT);
    const text = k.V.feldWertText(feldDef(k), [{ ...c[0], text: 'Anzeige' }]);
    assert.ok(text.startsWith('Anzeige'), text);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

/* Ein eigener Plan, einmal über das IPS gelaufen, behält seine Dosis in PDF, QR und Notfallkarte (Kennzeichen Meta.source). Eine Dosis aus einem fremden IPS bleibt dort draußen. */
test('[W2·Rundweg] ein eigener Plan behält nach dem Rundweg die Dosis in der Klartext-Ausgabe', async () => {
  const k = await mitPlan();
  const zurueck = eingelesen(k, bundle(k));
  const k2 = await frisch();
  k2.V.sektorFeldSetzen('health', 'medicationOngoing', zurueck);
  const c = chips(k2).filter((x) => x.text.includes('Beispielol'));
  const text = k2.V.feldWertText(feldDef(k2), c);
  assert.equal(text, VOLLER_TEXT);
  assert.equal(text.split('1-0-1-0').length, 2, 'die Dosis steht einmal');
});

test('[W2·Fremd] eine Dosis aus einem fremden IPS bleibt aus der Klartext-Ausgabe draußen', async () => {
  const k = await frisch();
  const c = eingelesen(k, { resourceType: 'Bundle', entry: [{ resource: { resourceType: 'MedicationStatement', medicationCodeableConcept: { text: 'Mittel' }, dosage: [{ text: '1-0-0' }] } }] });
  assert.equal(k.V.feldWertText(feldDef(k), c), 'Mittel');
});

const fremdesIps = (meta) => ({ resourceType: 'Bundle', entry: [{ resource: { resourceType: 'MedicationStatement', ...(meta ? { meta } : {}), medicationCodeableConcept: { text: 'Mittel' }, dosage: [{ text: '1-0-0' }] } }] });

test('[W2·Export] nur ein Eintrag aus dem eigenen Plan trägt das Kennzeichen', async () => {
  const k = await mitPlan();
  k.V.sektorFeldSetzen('health', 'medicationOngoing', [...chips(k), ...eingelesen(k, fremdesIps())]);
  const b = bundle(k);
  assert.equal(zuName(b, 'Beispielol').meta.source, 'urn:vivodepot:medikationsplan');
  assert.equal(zuName(b, 'Mittel').meta.source, undefined, 'ein fremder Eintrag wird beim Weitergeben nicht zum eigenen');
  assert.ok(zuName(b, 'Beispielol').meta.profile.length, 'das Profil bleibt');
});

test('[W2·Zweimal] der zweite Rundweg ändert nichts', async () => {
  const k = await mitPlan();
  const einmal = eingelesen(k, bundle(k));
  const k2 = await frisch();
  k2.V.sektorFeldSetzen('health', 'medicationOngoing', einmal);
  assert.deepEqual(eingelesen(k2, bundle(k2)), einmal);
});

test('[W2·Rot-Beweis] ein anderer Wert in Meta.source macht eine Dosis nicht zur eigenen', async () => {
  const k = await frisch();
  const c = eingelesen(k, fremdesIps({ source: 'urn:example:anderes-system' }));
  assert.equal(c[0].name, undefined);
  assert.equal(k.V.feldWertText(feldDef(k), c), 'Mittel');
});

test('[W2·Rot-Beweis] das Kennzeichen setzt die Dosis frei, ohne Ausfuhr und Rückweg fehlt sie', async () => {
  const k = await frisch();
  assert.equal(k.V.feldWertText(feldDef(k), eingelesen(k, fremdesIps({ source: 'urn:vivodepot:medikationsplan' }))), 'Mittel · 1-0-0');
  const quelle = fs.readFileSync(KERN, 'utf8');
  const STELLEN_W2 = [
    '...(e.name ? { source: FHIR_QUELLE_EIGENER_PLAN } : {})',
    'if (r.meta && r.meta.source === FHIR_QUELLE_EIGENER_PLAN) chip.name = text;',
  ];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-med-bez-'));
  try {
    for (const stelle of STELLEN_W2) {
      assert.equal(quelle.split(stelle).length, 2, 'die Stelle steht genau einmal im Kern');
      const kopie = path.join(dir, 'kern.html');
      fs.writeFileSync(kopie, quelle.replace(stelle, ''));
      const k2 = await mitPlan({ htmlPfad: kopie, backen: true });
      const c = eingelesen(k2, bundle(k2)).filter((x) => x.text.includes('Beispielol'));
      assert.ok(!k2.V.feldWertText(feldDef(k2), c).includes('1-0-1-0'), 'ohne die Stelle fehlt die Dosis');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
