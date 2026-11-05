'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Das Antwort-Schema hält, was der Kern schreibt (W1, Befund UEBERNAHME-OHNE-ABTIPPEN, 03.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Neben dem Anfrage-Schema liegt docs/template-generator/antwort-schema.json (draft 2020-12, ohne fremde Schlüssel). Wer
   eine Antwort einliest, prüft sie damit und übernimmt die Angaben, statt sie abzutippen.
   Gehalten wird:
   · KLASSE: Eine Anfrage nach JEDER Kennung, die der Kern kennt (so wie er seine Bereiche aufzählt), dazu eine unbekannte,
     wird in Privat und Pro beantwortet, mit Wert, Code-Form, Verweis und Vertretung. Jede Antwort validiert gegen das
     Schema. Ein neuer Schlüssel im Kern macht die Probe rot, bis das Schema ihn kennt.
   · SCHLÜSSELGLEICHHEIT: Jeder Schlüssel des Schemas kommt in einer dieser Antworten vor, außer den benannten
     (AUSSTEHEND unten, mit Grund). Ein Schlüssel, den der Kern nicht mehr schreibt, macht die Probe rot.
   ROT-BEWEIS: Ein fremder Schlüssel oben, ein fremder Schlüssel in einem Feld und ein fehlender Pflichtschlüssel werden
   gemeldet (Positivkontrolle unten).
   Liegt hier, weil sie Ajv braucht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const { ladeKern } = require('../load-kern.js');

const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'template-generator', 'antwort-schema.json'), 'utf8'));
const PW = 'antwort-schema-pw-2026';
/* Schlüssel des Schemas, die diese Probe noch nicht erzeugt — mit Grund. Die Liste kann nur kürzer werden. */
const AUSSTEHEND = {
  personen: 'füllt der Personen-Block (W1, nach dem PDF-Anhang)',
  institutionen: 'füllt der Personen-Block (W1, nach dem PDF-Anhang)',
  antwortAuf: 'nur bei einer Anfrage aus einer geprüften Vorlage (U2-ADR-366); eigene Probe in tests/kette-07-die-anfrage.test.js',
};

function pruefer() { return new Ajv2020({ allErrors: true, strict: false, validateFormats: false }).compile(SCHEMA); }
function fehler(pruefe, ds) { return pruefe(ds) ? [] : pruefe.errors.map((e) => (e.instancePath || '/') + ' ' + e.message + ' ' + JSON.stringify(e.params)); }

function alleKennungen(V) {
  const k = new Set();
  for (const b of V.bereicheAlle()) for (const s of (b.sektionen || [])) for (const f of (s.felder || [])) k.add(b.id + '.' + f.id);
  return [...k];
}
function anfrage(kennungen) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Stelle', zweck: 'Probe', grundlage: 'Probe', vorgang: 'AS-1',
    gestelltAm: '2026-11-03', gueltigBis: '2099-12-31',
    felder: kennungen.map((k, i) => ({ kennung: k, zweck: 'Probe', pflicht: i % 2 === 0 })),
    antwort: { art: 'einmalpasswort', an: 'probe@beispiel.invalid' } };
}
async function depot(produkt) {
  const { V } = ladeKern(produkt ? { produkt } : {});
  await V.depotAnlegen(PW);
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { givenName: 'Walter', familyName: 'Beispiel', birthDate: '1941-05-02' });
  d.menschen.push({ id: 'p-1', name: 'Erika Beispiel', givenName: 'Erika', familyName: 'Beispiel' });
  if (V.SEKTOR_BY_ID.health) {
    d.sektoren.health = Object.assign({}, d.sektoren.health, {
      allergiesMedicationFoodOther: [V.chipAusEingabe('snomedAllergen', 'Penicillin'), { text: 'Hausstaub' }] });
  }
  if (V.SEKTOR_BY_ID.people) d.sektoren.people = Object.assign({}, d.sektoren.people, { spouseOrCivilPartner: { ref: 'p-1' } });
  V.setData(d);
  return V;
}
async function antwort(V, kennungen) {
  const ds = await V.anfrageAntwortDatensatzGeprueft({ anfrage: anfrage(kennungen) }, { sensibel: true });
  assert.ok(ds, 'die Anfrage ist gültig und ergibt einen Datensatz');
  return JSON.parse(JSON.stringify(ds));
}
/* Pfade aller Schlüssel einer Antwort, in der Form des Schemas: Listen als [], Werte unter roh/wert nicht weiter. */
function schluesselPfade(x, pfad = '', aus = new Set()) {
  if (Array.isArray(x)) { for (const e of x) schluesselPfade(e, pfad + '[]', aus); return aus; }
  if (x && typeof x === 'object') {
    for (const [k, v] of Object.entries(x)) {
      const p = pfad ? pfad + '.' + k : k;
      aus.add(p);
      if (k === 'roh' || k === 'wert' || /antworten$/.test(p)) continue;
      schluesselPfade(v, p, aus);
    }
  }
  return aus;
}
function schemaPfade(s, pfad = '', aus = new Set()) {
  if (s.anyOf) { for (const t of s.anyOf) schemaPfade(t, pfad, aus); return aus; }
  if (s.items) return schemaPfade(s.items, pfad + '[]', aus);
  for (const [k, t] of Object.entries(s.properties || {})) {
    const p = pfad ? pfad + '.' + k : k;
    aus.add(p);
    if (k === 'roh' || k === 'wert' || k === 'antworten') continue;
    schemaPfade(t, p, aus);
  }
  return aus;
}

const GESEHEN = new Set();
const baubar = (slug) => require('../../tools/lib/vier-produkte.js').PRODUKTE.some((p) => p.slug === slug);

test('[Antwort·Schema·Klasse] jede Kennung des Kerns, Privat und Pro: die Antwort validiert gegen das Schema', async () => {
  const pruefe = pruefer();
  // Pro nur, wo es gebaut wird: öffentlich gehen nur die zwei Privat-Produkte hinaus. Privat-de läuft immer und liefert
  // der Gleichheitsprobe unten ihre Schlüssel.
  for (const produkt of [undefined, 'pro-de'].filter((p) => !p || baubar(p))) {
    const V = await depot(produkt);
    const ds = await antwort(V, alleKennungen(V).concat(['xyz.gibtEsNicht']));
    assert.ok(ds.felder.length >= 3 && ds.fehlend.length > 0 && ds.unbekannt.length === 1,
      'Vorbedingung: Werte, fehlende und eine unbekannte Kennung (' + (produkt || 'privat-de') + ')');
    assert.deepEqual(fehler(pruefe, ds), [], produkt || 'privat-de');
    for (const p of schluesselPfade(ds)) GESEHEN.add(p);
  }
});

test('[Antwort·Schema·Klasse] Vertretung aus einem verwalteten Depot validiert ebenso', async () => {
  const pruefe = pruefer();
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Anna Beispiel');
  V.betreteApp();
  const e = await V.subDepotAnlegen({ bezeichnung: 'Mutter', inhaberin: 'Gertrud Beispiel', verwaltungsTyp: 'verwaltet',
    vertretungsGrundlage: 'vorsorge' }, PW);
  await V.subDepotVertrauenOeffnen(e.depotUUID, PW);
  V.subKontextBetreten(e.depotUUID);
  const ds = await antwort(V, ['identity.givenName', 'identity.familyName']);
  assert.ok(ds.vertretung && ds.vertretung.handelnd, 'Vorbedingung: die Antwort trägt die Vertretung');
  assert.deepEqual(fehler(pruefe, ds), []);
  for (const p of schluesselPfade(ds)) GESEHEN.add(p);
});

test('[Antwort·Schema·Gleichheit] jeder Schlüssel des Schemas kommt im Kern vor, außer den benannten', () => {
  assert.ok(GESEHEN.size > 0, 'Vorbedingung: die Klassenproben liefen');
  const offen = [...schemaPfade(SCHEMA)].filter((p) => !GESEHEN.has(p) && !Object.keys(AUSSTEHEND).some((a) => p === a || p.startsWith(a + '[]') || p.startsWith(a + '.')));
  /* Schlüssel, die nur in seltenen Fällen entstehen, stehen hier mit Ort im Kern, statt in einer eigenen Antwort. */
  const SELTEN = {
    'felder[].codeForm.systeme': 'nur mit geführtem oder fremdem Code (gesehen: Penicillin trägt einen)',
    'felder[].abgeleitet': 'nur abgeleitete Angaben (_datensatzAusEintraegen, e.abgeleitet)',
    'felder[].gueltigBis': 'nur Felder mit Gültigkeit (feldGueltigkeitLesen)',
    'felder[].herkunft': 'nur Felder mit Eingabe-Stempel (_letzterStempel)',
    'felder[].herkunft.art': 'wie herkunft', 'felder[].herkunft.verifiziert': 'wie herkunft',
    'modulHerkunft.module[].typ': 'nur mit Modulen im Depot', 'modulHerkunft.module[].kennung': 'wie typ',
    'modulHerkunft.module[].stand': 'wie typ', 'modulHerkunft.module[].stufe': 'wie typ',
    'moduleStand.module[].typ': 'nur mit Modulen im Depot', 'moduleStand.module[].kennung': 'wie typ',
    'moduleStand.module[].version': 'wie typ',
  };
  assert.deepEqual(offen.filter((p) => !SELTEN[p]), [], 'Schlüssel im Schema, die der Kern nicht schreibt');
});

test('[Antwort·Schema·Rot-Beweis] fremde und fehlende Schlüssel werden gemeldet', () => {
  const pruefe = pruefer();
  const gut = { format: 'vivodepot-anlass', formatKennung: 'vivodepot-anlass@1', anlass: { id: 'anfrage' }, erstelltAm: '2026-11-03T00:00:00.000Z',
    felder: [{ kennung: 'identity.givenName', bereich: 'identity', feld: 'givenName', label: 'Vorname', wert: 'Walter', roh: 'Walter' }],
    fehlend: [], unbekannt: [], zurueckgehalten: { sensibel: 0 },
    anfrage: { von: 'S', zweck: 'Z', grundlage: 'G', vorgang: 'V', gueltigBis: '2099-12-31' }, vollstaendig: true };
  assert.deepEqual(fehler(pruefe, gut), [], 'Positivkontrolle');
  assert.ok(fehler(pruefe, Object.assign({}, gut, { fremd: 1 })).length, 'fremder Schlüssel oben');
  assert.ok(fehler(pruefe, Object.assign({}, gut, { felder: [Object.assign({}, gut.felder[0], { fremd: 1 })] })).length, 'fremder Schlüssel im Feld');
  const ohne = Object.assign({}, gut); delete ohne.felder;
  assert.ok(fehler(pruefe, ohne).length, 'fehlender Pflichtschlüssel');
});
