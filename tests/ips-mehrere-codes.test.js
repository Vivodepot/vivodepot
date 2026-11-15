'use strict';
/* Probe — ein Eintrag im IPS kann mehrere Codes tragen, und ein Medikament kann auf eine Medication verweisen.
   Der Import behält alle coding-Einträge; der erste bleibt chip.code, die übrigen stehen in chip.weitereCodes. Der Export gibt sie
   in derselben Reihenfolge aus. Ein Medikament mit medicationReference wird im Bundle aufgelöst. Was sich nicht lesen lässt,
   steht in der Vorschau und nach dem Übernehmen als nicht übernommen, statt still zu fehlen.
   Rot-Beweis: die Proben [Rot·…] brechen je eine Stelle an einer Kopie des Kerns; Grün ohne sie wäre nur eine Zusage.
   Wächter: jede Stelle im Kern, die nur den ersten coding-Eintrag liest, steht mit Grund auf der Positivliste. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN_PFAD = path.join(__dirname, '..', 'vivodepot.html');
const KERN = fs.readFileSync(KERN_PFAD, 'utf8');
const LISTE = path.join(__dirname, '..', 'tools', 'coding-erster-eintrag-positivliste.json');

const SNOMED = 'http://snomed.info/sct';
const ICD_ALT = 'http://hl7.org/fhir/sid/icd-10-gm';
const ICD = 'http://fhir.de/CodeSystem/bfarm/icd-10-gm';
const SMS = 'https://stoffe.example.invalid/sms';
const JETZT = new Date('2026-10-01T12:00:00Z');

async function frisch(optionen) {
  const k = ladeKern(optionen);
  await k.V.depotAnlegen('mehrere-codes-pw-2026');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
const bundle = (...entry) => ({ resourceType: 'Bundle', entry: entry.map((e) => (e.resource ? e : { resource: e })) });
const diagnose = (coding, text = 'Bluthochdruck') => ({ resourceType: 'Condition', code: { coding, text } });
const feld = (felder, id) => felder.find((x) => x.feldId === id);
const klar = (w) => JSON.parse(JSON.stringify(w));
const ressourcen = (b, typ) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === typ);
const paare = (cc) => cc.coding.map((c) => [c.system, c.code]);
function ausgabe(k, id, chips) {
  k.V.sektorFeldSetzen('health', id, klar(chips));
  return k.V.fhirIpsBundle(JETZT, { sensibel: true });
}
// Erfundene Kennungen; nur die Form zählt.
const DREI = [{ system: SNOMED, code: '91935009', display: 'Fremde Bezeichnung' }, { system: ICD_ALT, code: 'I10.90', version: '2026' }, { system: SMS, code: 'S-1' }];

async function mitKopie(ersetze, tue) {
  for (const [a] of ersetze) assert.equal(KERN.split(a).length, 2, 'die Stelle steht genau einmal im Kern: ' + a);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-mehrere-codes-'));
  try {
    const kopie = path.join(dir, 'kern.html');
    fs.writeFileSync(kopie, ersetze.reduce((s, [a, b]) => s.replace(a, b), KERN));
    await tue(await frisch({ htmlPfad: kopie, backen: true }));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[Codes·Rundlauf] drei Codes kommen an, bleiben und gehen in derselben Reihenfolge hinaus', async () => {
  const k = await frisch();
  const chips = feld(k.V._fhirIpsFelder(bundle(diagnose(DREI))), 'chronicConditionsDiagnoses').wert;
  assert.equal(chips.length, 1, 'ein Eintrag bleibt ein Chip');
  assert.equal(chips[0].code.system, SNOMED);
  assert.equal(chips[0].weitereCodes.length, 2);
  const c = ressourcen(ausgabe(k, 'chronicConditionsDiagnoses', chips), 'Condition')[0];
  assert.deepEqual(paare(c.code), [[SNOMED, '91935009'], [ICD, 'I10.90'], [SMS, 'S-1']]);
  assert.equal(c.code.text, 'Bluthochdruck');
  assert.equal(c.code.coding[1].version, '2026', 'die Fassung geht je Code mit');
});

test('[Codes·Alt] ein Chip ohne weitere Codes ergibt genau ein coding, ein Text-Chip keines', async () => {
  const k = await frisch();
  const b = ausgabe(k, 'chronicConditionsDiagnoses', [{ text: 'Mit Code', code: { system: ICD, code: 'I10.90', version: '2026' } }, { text: 'Nur Text' }]);
  const [mit, ohne] = ressourcen(b, 'Condition');
  assert.equal(mit.code.coding.length, 1);
  assert.equal('coding' in ohne.code, false);
});

test('[Codes·Kanon] eine frühere System-URI im zweiten Eintrag wird die kanonische', async () => {
  const k = await frisch();
  const chip = feld(k.V._fhirIpsFelder(bundle(diagnose([DREI[0], DREI[1]]))), 'chronicConditionsDiagnoses').wert[0];
  assert.equal(chip.weitereCodes[0].system, ICD);
});

test('[Codes·GPS] eine fremde Bezeichnung geht nicht als display einer SNOMED-Codierung hinaus', async () => {
  const k = await frisch();
  const chips = feld(k.V._fhirIpsFelder(bundle(diagnose([DREI[1], DREI[0]]))), 'chronicConditionsDiagnoses').wert;
  const zweite = ressourcen(ausgabe(k, 'chronicConditionsDiagnoses', chips), 'Condition')[0].code.coding[1];
  assert.equal(zweite.system, SNOMED);
  assert.notEqual(zweite.display, 'Fremde Bezeichnung');
  assert.notEqual(zweite.display, 'Bluthochdruck');
});

test('[Codes·Doppelt] derselbe Code zweimal zählt einmal; ein Eintrag ohne system oder code entfällt', async () => {
  const k = await frisch();
  const chip = feld(k.V._fhirIpsFelder(bundle(diagnose([DREI[0], DREI[0], { system: SMS }, { code: 'X' }, DREI[2]]))), 'chronicConditionsDiagnoses').wert[0];
  assert.equal(chip.code.code, '91935009');
  assert.deepEqual(chip.weitereCodes.map((c) => c.code), ['S-1']);
});

test('[Codes·Text] die Bezeichnung kommt auch aus einem späteren coding', async () => {
  const k = await frisch();
  const cc = { coding: [{ system: SMS, code: 'S-1' }, { system: SMS, code: 'S-2', display: 'Stoff zwei' }] };
  assert.equal(feld(k.V._fhirIpsFelder(bundle({ resourceType: 'Condition', code: cc })), 'chronicConditionsDiagnoses').wert[0].text, 'Stoff zwei');
});

test('[Codes·Deckel] über acht weitere Codes: acht bleiben, der Rest steht als nicht übernommen da', async () => {
  const k = await frisch();
  const viele = Array.from({ length: 12 }, (_, i) => ({ system: SMS, code: 'S-' + i }));
  const v = [];
  const chip = feld(k.V._fhirIpsFelder(bundle(diagnose(viele)), v), 'chronicConditionsDiagnoses').wert[0];
  assert.equal(chip.weitereCodes.length, 8);
  assert.equal(v.length, 1);
});

test('[Codes·Kopie] chipListeMitNeuem behält die weiteren Codes', async () => {
  const k = await frisch();
  const chip = { text: 'A', code: { system: SMS, code: 'S-1' }, weitereCodes: [{ system: SMS, code: 'S-2' }] };
  assert.deepEqual(klar(k.V.chipListeMitNeuem([], chip)[0].weitereCodes), [{ system: SMS, code: 'S-2' }]);
});

const MS = (rest) => ({ resourceType: 'MedicationStatement', status: 'active', dosage: [{ text: '1-0-0' }], ...rest });
const MED = { resourceType: 'Medication', id: 'm1', code: { coding: [DREI[2]], text: 'Mittel 10 mg' } };

test('[Med·Verweis] medicationReference ergibt den Chip mit Code und Dosis: über fullUrl, Medication/id und contained', async () => {
  const k = await frisch();
  const faelle = [
    bundle({ fullUrl: 'urn:uuid:m', resource: MED }, { resource: MS({ medicationReference: { reference: 'urn:uuid:m' } }) }),
    bundle({ fullUrl: 'https://x.example.invalid/Medication/m1', resource: MED }, { resource: MS({ medicationReference: { reference: 'Medication/m1' } }) }),
    bundle({ resource: MS({ contained: [MED], medicationReference: { reference: '#m1' } }) }),
  ];
  for (const b of faelle) {
    const v = [];
    const chip = feld(k.V._fhirIpsFelder(b, v), 'medicationOngoing').wert[0];
    assert.equal(chip.text, 'Mittel 10 mg');
    assert.equal(chip.code.code, 'S-1');
    assert.equal(chip.dosis, '1-0-0');
    assert.equal(v.length, 0);
  }
});

const einlesen = (k, b) => klar(k.V.IMPORT_FORMAT_BY_ID['fhir-ips'].parse(JSON.stringify(b)));
const MIT_VERWEIS = bundle({ fullUrl: 'urn:uuid:m', resource: MED }, { resource: MS({ medicationReference: { reference: 'urn:uuid:m' } }) });
const INS_LEERE = bundle(diagnose([], 'Beispielose'), MS({ medicationReference: { reference: 'Medication/fehlt' } }));

test('[Med·Verweis] die verwiesene Medication und das gelesene Medikament stehen nicht unter verworfene', async () => {
  const r = einlesen(await frisch(), MIT_VERWEIS);
  assert.equal(r.felder.length, 1);
  assert.deepEqual(r.verworfene, []);
  assert.deepEqual(r.verworfeneFelder, []);
});

test('[Med·Verweis] ein Verweis ins Leere steht genau einmal, beim Feld', async () => {
  const r = einlesen(await frisch(), INS_LEERE);
  assert.deepEqual(r.verworfene, []);
  assert.equal(r.verworfeneFelder.length, 1);
});

test('[Med·Verweis] eine Medication, auf die nichts verweist, bleibt genannt', async () => {
  const r = einlesen(await frisch(), bundle(MED, diagnose([], 'Beispielose')));
  assert.deepEqual(r.verworfene.map((v) => v.name + ':' + v.grund), ['Medication:ressource-nicht-gelesen']);
});

test('[Rot·Mitgelesen] ohne die mitgelesene Medication stünde sie unter verworfene', () => mitKopie([["typeof r !== 'object' || mitgelesen.has(r)) continue;", "typeof r !== 'object') continue;"]], async (k) => {
  assert.deepEqual(einlesen(k, MIT_VERWEIS).verworfene.map((v) => v.name), ['Medication']);
}));

test('[Rot·Einmal] mit einer zweiten Nennung stünde der Verweis ins Leere doppelt da', () => mitKopie([["patientGelesen = true; }\n", "patientGelesen = true; continue; }\n    if (typ === 'MedicationStatement') dazu(typ, 'ohne-text');\n"]], async (k) => {
  assert.deepEqual(einlesen(k, INS_LEERE).verworfene.map((v) => v.name), ['MedicationStatement']);
}));

test('[Med·Display] nicht auflösbar, aber mit Bezeichnung: der Chip trägt sie', async () => {
  const k = await frisch();
  const v = [];
  const chip = feld(k.V._fhirIpsFelder(bundle(MS({ medicationReference: { reference: 'Medication/fehlt', display: 'Mittel laut Verweis' } })), v), 'medicationOngoing').wert[0];
  assert.equal(chip.text, 'Mittel laut Verweis');
  assert.equal('code' in chip, false);
  assert.equal(v.length, 0);
});

test('[Med·NichtAufloesbar] ein Verweis ins Leere steht in Plan und Satz als nicht übernommen', async () => {
  const k = await frisch();
  const plan = k.V.importPlan('fhir-ips', JSON.stringify(bundle(MS({ medicationReference: { reference: 'Medication/fehlt' } }))));
  assert.equal(plan.verworfeneFelder.length, 1);
  const name = plan.verworfeneFelder[0].name;
  assert.ok(name.includes(k.V.feldDefFuer('health', 'medicationOngoing').label), name);
  assert.ok(k.V.importAnzeigeText(k.V.importAnzeigeModell('vorlage', { defVerworfen: plan.verworfeneFelder })).includes(name));
});

test('[Med·Zaehlt] mehrere ungelesene Einträge eines Felds stehen als eine Zeile mit Anzahl', async () => {
  const k = await frisch();
  const v = [];
  const leer = MS({ medicationReference: { reference: 'Medication/fehlt' } });
  k.V._fhirIpsFelder(bundle(leer, leer, { resourceType: 'Condition', code: { coding: [{ system: SMS, code: 'S-1' }] } }), v);
  assert.equal(v.length, 2);
  assert.ok(v.find((x) => x.name.includes('(2)')), JSON.stringify(v));
});

test('[Vermerk·Vorschau] die Vorschau nennt das Feld und spricht nicht von einer Vorlage', () => {
  const stelle = KERN.split('STRINGS.importTemplateVerworfenAnzahl).replace')[0].slice(-900);
  assert.ok(/verworfeneFelder|_tplV/.test(stelle));
  assert.ok(KERN.includes('_tplV.filter((v) => !v.ausDatei)'), 'nur Vorlagen-Einträge zählen als Vorlage');
  assert.ok(KERN.includes("importAnzeigeModell('vorlage', { defVerworfen: _tplVDatei })"), 'die Einträge der Datei stehen in der Vorschau');
});

test('[Rot·Alle] nur den ersten Eintrag gelesen, ist der Rundlauf kaputt', () => mitKopie([['const alle = _fhirCodesAus(cc && cc.coding);', 'const alle = _fhirCodesAus(cc && cc.coding).slice(0, 1);']], async (k) => {
  const chip = feld(k.V._fhirIpsFelder(bundle(diagnose(DREI))), 'chronicConditionsDiagnoses').wert[0];
  assert.equal('weitereCodes' in chip, false);
}));

test('[Rot·Export] ohne die weiteren Codes im Export fehlen sie', () => mitKopie([['return { coding: [e].concat(e.weitereCodes || []).map(_ccCoding(e.anzeigeName)), text: e.anzeigeName };', 'return { coding: [e].map(_ccCoding(e.anzeigeName)), text: e.anzeigeName };']], async (k) => {
  const chips = [{ text: 'A', code: { system: SMS, code: 'S-1' }, weitereCodes: [{ system: SMS, code: 'S-2' }] }];
  assert.equal(ressourcen(ausgabe(k, 'chronicConditionsDiagnoses', chips), 'Condition')[0].code.coding.length, 1);
}));

test('[Rot·Kanon] ohne Kanonisierung bleibt die alte URI', () => mitKopie([['const eintrag = { system: kanonischesCodeSystem(c.system), code: c.code };', 'const eintrag = { system: c.system, code: c.code };']], async (k) => {
  const chip = feld(k.V._fhirIpsFelder(bundle(diagnose([DREI[0], DREI[1]]))), 'chronicConditionsDiagnoses').wert[0];
  assert.equal(chip.weitereCodes[0].system, ICD_ALT);
}));

test('[Rot·Deckel] ohne Grenze bleiben alle', () => mitKopie([['CHIP_WEITERE_CODES_MAX = 8', 'CHIP_WEITERE_CODES_MAX = 99']], async (k) => {
  const viele = Array.from({ length: 12 }, (_, i) => ({ system: SMS, code: 'S-' + i }));
  assert.equal(feld(k.V._fhirIpsFelder(bundle(diagnose(viele))), 'chronicConditionsDiagnoses').wert[0].weitereCodes.length, 11);
}));

test('[Rot·Verweis] ohne Auflösung entsteht aus dem Verweis kein Chip', () => mitKopie([['{ medicationCodeableConcept: _fhirMedikationAufloesen(bundle, r) }', '{ medicationCodeableConcept: null }']], async (k) => {
  const v = [];
  assert.equal(feld(k.V._fhirIpsFelder(bundle({ fullUrl: 'urn:uuid:m', resource: MED }, { resource: MS({ medicationReference: { reference: 'urn:uuid:m' } }) }), v), 'medicationOngoing'), undefined);
  assert.equal(v.length, 1);
}));

test('[Rot·Vermerk] ohne Vermerk ist der Verlust still', () => mitKopie([['if (!text) { ungelesen++; return null; }', 'if (!text) return null;']], async (k) => {
  const v = [];
  k.V._fhirIpsFelder(bundle(MS({ medicationReference: { reference: 'Medication/fehlt' } })), v);
  assert.equal(v.length, 0);
}));

/* Wächter gegen die Klasse: wer nur coding[0] liest, verliert die übrigen Codes. */
const STELLEN = (quelle) => quelle.split('\n').filter((z) => /coding\[0\]/.test(z) && !/^\s*(\/\/|\*)/.test(z));
function funktionDerZeile(zeile) { const m = /function\s+([A-Za-z0-9_$]+)/.exec(zeile); return m ? m[1] : ''; }
function pruefe(quelle, liste) {
  const erlaubt = new Set(liste.eintraege.map((e) => e.funktion));
  const fremd = STELLEN(quelle).filter((z) => !erlaubt.has(funktionDerZeile(z)));
  return { fremd, zahl: STELLEN(quelle).length };
}

test('[Waechter·coding0] jede Stelle mit dem ersten coding-Eintrag steht mit Grund auf der Positivliste, ohne Luft', () => {
  const liste = JSON.parse(fs.readFileSync(LISTE, 'utf8'));
  for (const e of liste.eintraege) assert.ok(e.funktion && e.grund && e.grund.length >= 20, JSON.stringify(e));
  for (const n of ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html']) {
    const quelle = fs.readFileSync(path.join(__dirname, '..', n), 'utf8');
    assert.deepEqual(pruefe(quelle, liste).fremd, [], n);
  }
  assert.equal(pruefe(KERN, liste).zahl, liste.eintraege.length, 'die Zahl der Einträge ist genau die Zahl der Stellen');
});

test('[Rot·Waechter] eine neue Stelle mit coding[0] fällt', () => {
  const liste = JSON.parse(fs.readFileSync(LISTE, 'utf8'));
  const gepflanzt = KERN + '\nconst x = cc.coding[0];\n';
  assert.equal(pruefe(gepflanzt, liste).fremd.length, 1);
});
