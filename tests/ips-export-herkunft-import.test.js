'use strict';
/* Probe — eingelesene Einträge gehen mit ihrer Herkunft hinaus (12.11.2026).
   Befunde IPS-EXPORT-IMPORT-HERKUNFT und BMP-UEBERNAHME-OHNE-HERKUNFT (MITTEL): Der IPS-Export gab einen eingelesenen Eintrag als
   Angabe der Person aus (asserter/informationSource = Patient, Ziel der Provenance „von der Person angelegt“). Die Übernahme eines
   Medikationsplans setzte gar keine Herkunft. Selbst Eingetragenes bleibt Angabe der Person und bleibt confirmed.
   Belegt:
     • [Herkunft·Import] ein eingelesenes Feld: keine Personen-Herkunft am Eintrag, eigene Provenance mit der Quelle als author
       und der Person als enterer; die Provenance „von der Person angelegt“ zielt nicht darauf;
     • [Herkunft·Person] ein selbst eingetragenes Feld bleibt wie bisher (asserter = Patient, confirmed, Ziel der Personen-Provenance);
     • [Herkunft·BMP] die Übernahme eines Plans stempelt eingabeArt import mit dem Aussteller als Quelle;
     • [Rückweg·meta.source] ein eingelesenes IPS mit meta.source oder einer verfassenden Organisation trägt diese im Stempel;
     • [Rot-Beweis] die Prüfung schlägt am alten Ausgabebild an;
     • [Wächter·Klasse] jeder Aufruf von sektorFeldSetzen in einer Einlese- oder Übernahmefunktion des Kerns übergibt eine Herkunft;
     • [Wächter·Rot-Beweis] ein gepflanzter Aufruf ohne Herkunft fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const JETZT = '2026-11-12T12:00:00Z';
// Erfunden: Namen und Instanz stammen aus keinem echten Plan.
const PLAN = '<MP v="026" U="00112233445566778899AABBCCDDEEFF" l="de-DE">'
  + '<P g="Erika" f="Musterfrau" b="19600101"/>'
  + '<A n="Praxis Beispielweg" s="Lindenallee 3" z="12345" c="Musterstadt" t="20261106"/>'
  + '<S><M p="1234567" a="Beispielol 5 mg" m="1" v="1"><W w="Beispielwirkstoff" s="5 mg"/></M></S></MP>';

async function frisch() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}
const ressourcen = (b, typ) => b.entry.map((e) => e.resource).filter((r) => r.resourceType === typ);
const fullUrlVon = (b, r) => b.entry.find((e) => e.resource === r).fullUrl;
const patientUrl = (b) => b.entry.find((e) => e.resource.resourceType === 'Patient').fullUrl;

/* Prüft das Ausgabebild: `eingelesen` sind die Ressourcen aus eingelesenen Feldern, `quelle` deren Quelle.
   Liefert die Liste der Verstöße (leer = in Ordnung). */
function herkunftVerstoesse(b, eingelesen, quelle) {
  const fehler = [];
  const pat = patientUrl(b);
  const provs = ressourcen(b, 'Provenance');
  for (const r of eingelesen) {
    const url = fullUrlVon(b, r);
    for (const f of ['asserter', 'recorder', 'informationSource']) {
      if (r[f] && r[f].reference === pat) fehler.push('Personen-Herkunft am eingelesenen Eintrag: ' + r.resourceType + '.' + f);
    }
    const auf = provs.filter((p) => p.target.some((t) => t.reference === url));
    const personAngelegt = auf.filter((p) => p.activity && p.agent.some((a) => a.type.coding[0].code === 'author' && a.who.reference === pat));
    if (personAngelegt.length) fehler.push('die Provenance „von der Person angelegt“ zielt auf ' + r.resourceType);
    const ausQuelle = auf.find((p) => p.agent.some((a) => a.type.coding[0].code === 'author' && a.who.display === quelle)
      && p.agent.some((a) => a.type.coding[0].code === 'enterer' && a.who.reference === pat));
    if (!ausQuelle) fehler.push('keine Provenance mit der Quelle als author und der Person als enterer für ' + r.resourceType);
  }
  return fehler;
}

test('[Herkunft·Import] ein eingelesenes Feld geht mit der Quelle als author und der Person als enterer hinaus', async () => {
  const k = await frisch();
  k.V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Beispielallergen' }], { eingabeArt: 'import', quelle: 'Praxis Beispielweg' });
  const b = JSON.parse(JSON.stringify(k.V.fhirIpsBundle(JETZT, { sensibel: true })));
  const allergie = ressourcen(b, 'AllergyIntolerance')[0];
  assert.ok(allergie, 'die Allergie steht im Bundle');
  assert.deepEqual(herkunftVerstoesse(b, [allergie], 'Praxis Beispielweg'), []);
});

test('[Herkunft·Person] ein selbst eingetragenes Feld bleibt Angabe der Person und bleibt confirmed', async () => {
  const k = await frisch();
  k.V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Beispielallergen' }]);
  k.V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Beispielol' }], { eingabeArt: 'import', quelle: 'Praxis Beispielweg' });
  const b = JSON.parse(JSON.stringify(k.V.fhirIpsBundle(JETZT, { sensibel: true })));
  const pat = patientUrl(b);
  const allergie = ressourcen(b, 'AllergyIntolerance')[0];
  assert.equal(allergie.asserter.reference, pat);
  assert.equal(allergie.verificationStatus.coding[0].code, 'confirmed');
  const personProv = ressourcen(b, 'Provenance').find((p) => p.activity && p.agent[0].who.reference === pat);
  assert.ok(personProv.target.some((t) => t.reference === fullUrlVon(b, allergie)), 'die Personen-Provenance zielt auf den eigenen Eintrag');
  assert.deepEqual(herkunftVerstoesse(b, [ressourcen(b, 'MedicationStatement')[0]], 'Praxis Beispielweg'), [], 'daneben das eingelesene Feld');
});

test('[Herkunft·BMP] die Übernahme eines Medikationsplans stempelt die Herkunft mit dem Aussteller', async () => {
  const k = await frisch();
  k.V.bmpPlanUebernehmen(k.V.bmpXmlLesen(PLAN).plan);
  const kette = k.V.liesUrheberschaft('health', 'medicationOngoing');
  const letzter = kette[kette.length - 1];
  assert.equal(letzter.eingabeArt, 'import');
  assert.equal(letzter.quelle, 'Praxis Beispielweg');
  const b = JSON.parse(JSON.stringify(k.V.fhirIpsBundle(JETZT, { sensibel: true })));
  assert.deepEqual(herkunftVerstoesse(b, ressourcen(b, 'MedicationStatement'), 'Praxis Beispielweg'), []);
});

test('[Rückweg·meta.source] ein eingelesenes IPS trägt meta.source oder die verfassende Organisation im Stempel', async () => {
  const k = await frisch();
  const fremd = {
    resourceType: 'Bundle', type: 'document', meta: { source: 'https://partner.example/app' },
    entry: [
      { fullUrl: 'urn:uuid:p1', resource: { resourceType: 'Patient', id: 'p1', name: [{ family: 'Musterfrau', given: ['Erika'] }] } },
      { fullUrl: 'urn:uuid:a1', resource: { resourceType: 'AllergyIntolerance', id: 'a1', patient: { reference: 'urn:uuid:p1' },
        code: { text: 'Beispielallergen' } } },
    ],
  };
  const plan = k.V.importPlan('fhir-ips', JSON.stringify(fremd));
  assert.match(plan.quelleLabel, /partner\.example\/app/);
  const ohneSource = JSON.parse(JSON.stringify(fremd));
  delete ohneSource.meta;
  ohneSource.entry.push({ fullUrl: 'urn:uuid:o1', resource: { resourceType: 'Organization', id: 'o1', name: 'Beispielklinik' } });
  ohneSource.entry.push({ fullUrl: 'urn:uuid:c1', resource: { resourceType: 'Composition', id: 'c1', author: [{ reference: 'urn:uuid:o1' }] } });
  assert.match(k.V.importPlan('fhir-ips', JSON.stringify(ohneSource)).quelleLabel, /Beispielklinik/);
});

test('[Rot-Beweis] die Prüfung schlägt am alten Ausgabebild an', async () => {
  const k = await frisch();
  k.V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Beispielallergen' }]);
  const b = JSON.parse(JSON.stringify(k.V.fhirIpsBundle(JETZT, { sensibel: true })));
  // So sah die Ausgabe vor dem Fix für jedes Feld aus, auch für ein eingelesenes: Personen-Herkunft, keine Quelle.
  const allergie = ressourcen(b, 'AllergyIntolerance')[0];
  const v = herkunftVerstoesse(b, [allergie], 'Praxis Beispielweg');
  assert.ok(v.some((x) => /Personen-Herkunft/.test(x)), 'asserter = Patient fällt auf');
  assert.ok(v.some((x) => /von der Person angelegt/.test(x)), 'das Ziel der Personen-Provenance fällt auf');
  assert.ok(v.some((x) => /keine Provenance mit der Quelle/.test(x)), 'die fehlende Quelle fällt auf');
});

/* Wächter gegen die Klasse: In jeder Funktion des Kerns, deren Name einliest oder übernimmt, übergibt jeder Aufruf von
   sektorFeldSetzen ein viertes Argument (die Herkunft). Gemessen am Quelltext, nicht als Liste geschrieben. */
const EINLESE_NAME = /(import|uebernehm|einles|empfang)/i;
function aufrufeOhneHerkunft(quelle) {
  const funde = [];
  const kopf = /\n(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
  const koepfe = [];
  let m;
  while ((m = kopf.exec(quelle))) koepfe.push({ name: m[1], ab: m.index });
  koepfe.forEach((f, i) => {
    if (!EINLESE_NAME.test(f.name)) return;
    const rumpf = quelle.slice(f.ab, i + 1 < koepfe.length ? koepfe[i + 1].ab : quelle.length);
    let p = rumpf.indexOf('sektorFeldSetzen(');
    while (p >= 0) {
      if (!/function\s+$/.test(rumpf.slice(Math.max(0, p - 10), p))) {
        let tiefe = 0, kommas = 0, j = p + 'sektorFeldSetzen'.length;
        for (; j < rumpf.length; j++) {
          const c = rumpf[j];
          if (c === '(' || c === '[' || c === '{') tiefe++;
          else if (c === ')' || c === ']' || c === '}') { tiefe--; if (tiefe === 0) break; }
          else if (c === ',' && tiefe === 1) kommas++;
        }
        if (kommas < 3) funde.push(f.name);
      }
      p = rumpf.indexOf('sektorFeldSetzen(', p + 1);
    }
  });
  return funde;
}
const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Wächter·Klasse] jede Einlese- oder Übernahmefunktion übergibt sektorFeldSetzen eine Herkunft', () => {
  assert.deepEqual(aufrufeOhneHerkunft(KERN), []);
});

test('[Wächter·Rot-Beweis] ein gepflanzter Aufruf ohne Herkunft fällt, einer mit Herkunft nicht', () => {
  const gepflanzt = '\nfunction beispielPlanUebernehmen(p) {\n  sektorFeldSetzen(\'health\', \'medicationOngoing\', [p]);\n}\n'
    + 'function beispielImportMitHerkunft(p) {\n  sektorFeldSetzen(\'health\', \'x\', f(p, [1, 2]), { eingabeArt: \'import\' });\n}\n';
  assert.deepEqual(aufrufeOhneHerkunft(gepflanzt), ['beispielPlanUebernehmen']);
});
