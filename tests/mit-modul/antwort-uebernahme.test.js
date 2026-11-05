'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Antwort auf eine Anfrage lässt sich übernehmen, ohne abzutippen — erster Schritt (03.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund UEBERNAHME-OHNE-ABTIPPEN (HOCH): Außentexte sagen, die Stelle übernehme die Angaben, statt sie abzutippen. Die
   Antwort war aber ein Datensatz ohne veröffentlichtes Schema, und Personen standen darin nur als Verweis ({ref: <id>}) auf
   das Personenregister des Depots, Institutionen ebenso auf das Institutionsregister. Wer die Antwort einliest, kann
   einen solchen Verweis nicht auflösen.
   Gehalten wird (W1):
   · Neben dem Anfrage-Schema liegt ein Schema für die Antwort (SCHEMA_PFAD unten, draft 2020-12), und die Antwort auf eine
     Sterbefall-Anfrage validiert dagegen.
   · Jeder Verweis in `roh` hat einen Eintrag in `personen` (Person: `ref` und Personalien nach U2-ADR-467) bzw. in
     `institutionen` (Institution: `ref` und `name`).
   · KLASSE: Eine Anfrage nach JEDEM Verweisfeld auf eine Person oder Institution außerhalb von Listen (Einfach- und
     Mehrfachverweis), so wie der Kern seine Bereiche aufzählt (`bereicheAlle`), wird beantwortet, validiert, und jeder
     Verweis ist aufgelöst. Ein neues Verweisfeld nimmt das mit, ohne dass diese Probe es kennt.
   ROT-BEWEIS: Die Prüffunktionen melden einen Verweis ohne Eintrag, einen Eintrag ohne Namen und ein Feld, das ein Schema
   nicht kennt (Positivkontrolle unten). Am Kern vor dem Fix fehlen Schema und Block.
   Bis zum Fix steht die Probe als todo mit der Kennung. Liegt hier, weil sie Ajv braucht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const { ladeKern } = require('../load-kern.js');

const WURZEL = path.join(__dirname, '..', '..');
const SCHEMA_PFAD = path.join(WURZEL, 'docs', 'template-generator', 'antwort-schema.json');

const ICH = { givenName: 'Walter', familyName: 'Beispiel', birthDate: '1941-05-02', birthPlace: 'Köln', street: 'Lindenweg',
  houseNumber: '4', postalCode: '50667', city: 'Köln' };
const KASSE = { id: 'i-1', name: 'Beispiel-Krankenkasse' };
const PARTNERIN = { id: 'p-1', name: 'Erika Beispiel', givenName: 'Erika', familyName: 'Beispiel', birthDate: '1944-08-19',
  street: 'Lindenweg', houseNumber: '4', postalCode: '50667', city: 'Köln' };

// Verweisfelder auf Person oder Institution außerhalb von Listen, so wie der Kern seine Bereiche aufzählt.
function verweisfelder(V) {
  const aus = [];
  for (const b of V.bereicheAlle()) {
    for (const sek of (b.sektionen || [])) {
      for (const f of (sek.felder || [])) {
        if ((f.typ !== 'ref' && f.typ !== 'refMehrfach') || !['person', 'institution'].includes(f.entitaet)) continue;
        if (aus.some((x) => x.bereich === b.id && x.feld === f.id)) continue;
        aus.push({ bereich: b.id, feld: f.id, mehrfach: f.typ === 'refMehrfach', entitaet: f.entitaet, sichtbarWenn: f.sichtbarWenn });
      }
    }
  }
  return aus;
}
async function kernMitDepot(verweisfelder) { // [{ bereich, feld, mehrfach, entitaet }]
  const { V } = ladeKern();
  await V.depotAnlegen('antwort-uebernahme-pw-2026');
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, ICH);
  d.menschen.push(Object.assign({}, PARTNERIN));
  d.institutionen = (Array.isArray(d.institutionen) ? d.institutionen : []).concat([Object.assign({}, KASSE)]);
  for (const { bereich, feld, mehrfach, entitaet, sichtbarWenn } of verweisfelder) {
    const ref = { ref: entitaet === 'institution' ? 'i-1' : 'p-1' };
    // Ein Feld mit Sichtbarkeitsbedingung geht nur hinaus, wenn die Bedingung erfüllt ist (z. B. Vermieter nur bei Miete).
    const bedingung = (sichtbarWenn && sichtbarWenn.feld && 'wert' in sichtbarWenn) ? { [sichtbarWenn.feld]: sichtbarWenn.wert } : {};
    d.sektoren[bereich] = Object.assign({}, d.sektoren[bereich], bedingung, { [feld]: mehrfach ? [ref] : ref });
  }
  V.setData(d);
  return V;
}
function anfrage(kennungen) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Standesamt Beispielstadt', zweck: 'Beurkundung eines Sterbefalls',
    grundlage: '§§ 28, 31 PStG', vorgang: 'SB-PROBE-1', gestelltAm: '2026-11-03', gueltigBis: '2099-12-31',
    felder: kennungen.map((k) => ({ kennung: k, zweck: 'Eintrag ins Sterberegister', pflicht: true })),
    antwort: { art: 'einmalpasswort', an: 'probe@beispiel.invalid' } };
}
// sensibel: true nimmt auch die als sensibel markierten Felder mit (Hausarzt, Seelsorge u. a.), damit die Klasse alle sieht.
async function antwort(V, a, sensibel = false) {
  const ds = await V.anfrageAntwortDatensatzGeprueft({ anfrage: a }, { sensibel });
  assert.ok(ds, 'die Anfrage ist gültig und ergibt einen Datensatz');
  return JSON.parse(JSON.stringify(ds));
}

// Alle Verweise außerhalb des Personenblocks.
function verweise(wert, aus = new Set()) {
  if (Array.isArray(wert)) { for (const x of wert) verweise(x, aus); return aus; }
  if (wert && typeof wert === 'object') {
    if (typeof wert.ref === 'string') aus.add(wert.ref);
    for (const [k, v] of Object.entries(wert)) if (k !== 'personen' && k !== 'institutionen') verweise(v, aus);
  }
  return aus;
}
// Ein Verweis gilt als aufgelöst, wenn ein Personen-Eintrag mit Namen oder ein Institutions-Eintrag mit Namen ihn trägt.
function personenFehler(ds) {
  const p = Array.isArray(ds && ds.personen) ? ds.personen : [];
  const i = Array.isArray(ds && ds.institutionen) ? ds.institutionen : [];
  return [...verweise(ds)].filter((ref) => !p.some((x) => x && x.ref === ref && (x.familyName || x.name))
    && !i.some((x) => x && x.ref === ref && x.name)).map((ref) => 'kein Eintrag für ' + ref);
}
function schemaFehler(ds, schema) {
  if (!schema) return ['kein Schema unter ' + path.relative(WURZEL, SCHEMA_PFAD)];
  const pruefe = new Ajv2020({ allErrors: true, strict: false }).compile(schema);
  return pruefe(ds) ? [] : pruefe.errors.map((e) => (e.instancePath || '/') + ' ' + e.message);
}
function schemaLesen() {
  return fs.existsSync(SCHEMA_PFAD) ? JSON.parse(fs.readFileSync(SCHEMA_PFAD, 'utf8')) : null;
}

test('[Antwort·Übernahme·Sterbefall] die Antwort validiert gegen das Schema, die Partnerin steht mit Personalien darin', { todo: 'Befund UEBERNAHME-OHNE-ABTIPPEN (HOCH): Fix folgt mit W1 (Schema und Personen-Block)' }, async () => {
  const V = await kernMitDepot([{ bereich: 'people', feld: 'spouseOrCivilPartner', entitaet: 'person' }]);
  const ds = await antwort(V, anfrage(['identity.givenName', 'identity.familyName', 'identity.birthDate', 'identity.birthPlace',
    'people.spouseOrCivilPartner']));
  assert.ok(verweise(ds).has('p-1'), 'Vorbedingung: die Antwort nennt die Partnerin (Verweis p-1 in roh)');
  assert.deepEqual({ schema: schemaFehler(ds, schemaLesen()), personen: personenFehler(ds) }, { schema: [], personen: [] });
  const p = ds.personen.find((x) => x.ref === 'p-1');
  for (const k of ['familyName', 'givenName', 'birthDate', 'street', 'houseNumber', 'postalCode', 'city']) {
    assert.equal(p[k], PARTNERIN[k], 'personen[p-1].' + k);
  }
});

test('[Antwort·Übernahme·Klasse] jedes Verweisfeld auf Person oder Institution: Antwort validiert, der Verweis ist aufgelöst', { todo: 'Befund UEBERNAHME-OHNE-ABTIPPEN (HOCH): Fix folgt mit W1 (Schema und Personen-Block)' }, async () => {
  const felder = verweisfelder(ladeKern().V);
  assert.ok(felder.some((f) => f.entitaet === 'institution'), 'Vorbedingung: auch Institutionen-Verweise sind dabei');
  assert.ok(felder.length >= 5, 'Vorbedingung: Verweisfelder gefunden: ' + felder.map((f) => f.bereich + '.' + f.feld).join(', '));
  const V = await kernMitDepot(felder);
  const ds = await antwort(V, anfrage(felder.map((f) => f.bereich + '.' + f.feld)), true);
  const genannt = new Set(ds.felder.map((e) => e.kennung));
  assert.deepEqual(felder.map((f) => f.bereich + '.' + f.feld).filter((k) => !genannt.has(k)), [],
    'Vorbedingung: jedes Verweisfeld geht als Wert hinaus');
  assert.deepEqual({ schema: schemaFehler(ds, schemaLesen()), personen: personenFehler(ds) }, { schema: [], personen: [] });
});

test('[Antwort·Übernahme·Rot-Beweis] die Prüfung meldet Verweise ohne Eintrag und Felder außerhalb des Schemas', () => {
  const nurVerweis = { felder: [{ kennung: 'people.spouseOrCivilPartner', roh: { ref: 'p-1' } }] };
  assert.deepEqual(personenFehler(nurVerweis), ['kein Eintrag für p-1']);
  assert.deepEqual(personenFehler(Object.assign({ personen: [{ ref: 'p-1' }] }, nurVerweis)), ['kein Eintrag für p-1'],
    'ein Eintrag ohne Namen zählt nicht');
  assert.deepEqual(personenFehler(Object.assign({ personen: [Object.assign({ ref: 'p-1' }, PARTNERIN)] }, nurVerweis)), [],
    'Positivkontrolle');
  const kasse = { felder: [{ kennung: 'health.healthInsurance', roh: { ref: 'i-1' } }] };
  assert.deepEqual(personenFehler(kasse), ['kein Eintrag für i-1'], 'ein Institutions-Verweis ohne Eintrag fällt auf');
  assert.deepEqual(personenFehler(Object.assign({ institutionen: [Object.assign({ ref: 'i-1' }, KASSE)] }, kasse)), [],
    'Positivkontrolle Institution');
  assert.equal(schemaFehler({}, null).length, 1, 'ohne Schema meldet die Prüfung genau das');
  const eng = { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', additionalProperties: false,
    properties: { felder: { type: 'array' } } };
  assert.ok(schemaFehler({ felder: [], fremd: 1 }, eng).length >= 1, 'ein Feld außerhalb des Schemas fällt auf');
  assert.deepEqual(schemaFehler({ felder: [] }, eng), [], 'Positivkontrolle');
});
