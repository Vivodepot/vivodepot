'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Herkunft je Ressource — „von der Person bereitgestellt“ in jedem FHIR-Bundle, das der Kern selbst erzeugt.
   ────────────────────────────────────────────────────────────────────────────
   VO (EU) 2025/327 (EHDS) Art. 5 Abs. 1: was die Person selbst eingetragen hat, muss „clearly distinguishable“ sein. Eine
   technische Form ist nicht normiert; einen Code „patient-provided“ gibt es nicht, darum erfinden wir keinen. Der Kern sagt
   es mit Standardelementen (Nachtrag U2-ADR-081): eine Provenance, deren `target` JEDE erzeugte Ressource ist, mit
   `agent.type` = author und `agent.who` = Patient (bei Vertretung RelatedPerson mit `onBehalfOf` = Patient).

   Zwei Teile:
     1. Probe je Weg — IPS selbst, IPS delegiert, KBV-PKA, ISiK. Rot-Beweis: eine Ressource ohne Ziel fällt.
     2. Klassenwächter — jede Funktion im Kern, die ein FHIR-Bundle baut, steht unten entweder als ERZEUGER (dann gilt
        die Probe) oder als AUSGENOMMEN mit Grund. Ein neuer Erzeuger ohne Eintrag ist rot.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { vorsorgeDepotAnlegen } = require('../tools/lib/ips-vorsorge-beispiel.js');
const { kvnr } = require('../tools/isik-validieren.js');

const JETZT = new Date('2026-10-09T10:00:00Z');
const PROV_TYP = 'http://terminology.hl7.org/CodeSystem/provenance-participant-type';
const DATENVORGANG = 'http://terminology.hl7.org/CodeSystem/v3-DataOperation';
const KVNR = kvnr('A', '12345678');
const ANSCHRIFT = { storageStreet: 'Rennweg', storageHouseNumber: '35', storagePostalCode: '56626', storageCity: 'Andernach' };

// Die Funktionen im Kern, die ein FHIR-Bundle bauen. Ein neuer Eintrag hier braucht das Wort der Gegenlesung.
const ERZEUGER = ['fhirIpsBundle', 'kbvPkaVollmacht', 'isikDokumente'];
const AUSGENOMMEN = {
  verwahrungsNachweisBundle: 'reicht ein fremdes Original byte-gleich durch; die Person ist Verwahrerin, nicht Autorin (U2-ADR-444)',
  euLabDokumentDerPerson: 'alle Einträge kommen unverändert aus dem Original des Labors; die Person ist Autorin der Composition (Composition.author), stellt aber keine Ressource bereit — eine Provenance „von der Person“ über die Befunde wäre falsch (K18, Nachtrag U2-ADR-444, 22.10.2026)',
};

/* Liefert die Ressourcen eines Bundles, die KEIN Ziel einer Autoren-Provenance der Person sind. Leer heißt: erfüllt. */
function ohneHerkunft(bundle) {
  const eintraege = bundle.entry || [];
  const personen = new Set(eintraege.filter((e) => ['Patient', 'RelatedPerson'].includes(e.resource.resourceType)).map((e) => e.fullUrl));
  const istPerson = (who) => !!who && (personen.has(who.reference) || (who.type === 'Patient' && !!(who.identifier && who.identifier.value)));
  const ziele = new Set();
  for (const { resource: p } of eintraege) {
    if (p.resourceType !== 'Provenance') continue;
    const vorgang = ((p.activity || {}).coding || []).some((c) => c.system === DATENVORGANG && c.code === 'CREATE');
    const autorin = (p.agent || []).some((a) => ((a.type || {}).coding || []).some((c) => c.system === PROV_TYP && c.code === 'author') && istPerson(a.who));
    if (vorgang && autorin) for (const t of p.target || []) ziele.add(t.reference);
  }
  return eintraege.filter((e) => e.resource.resourceType !== 'Provenance' && !ziele.has(e.fullUrl)).map((e) => e.resource.resourceType);
}

async function depot() {
  const { V } = ladeKern();
  await vorsorgeDepotAnlegen(V);
  V.sektorFeldSetzen('health', 'insuranceNumber', KVNR);
  V.sektorFeldSetzen('identity', 'gender', 'w');
  Object.assign(V.getData().sektoren.advanceCare.provisionInstruments[0], ANSCHRIFT);
  // Einträge mit Herkunftsfeld (AllergyIntolerance, MedicationStatement) — sonst prüfte [Herkunft·Felder] nichts.
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril 5 mg' }]);
  return V;
}
function isikPlatzhalter(V) {
  const kdl = Object.fromEntries(Object.entries(V.KDL_GEBRAUCHT).map(([k, code]) => [k, { system: V.KDL_SYSTEM, code }]));
  const T = Object.assign({}, V.IPS_BEGRIFFE.isik, kdl);
  const aus = {};
  for (const k of ['kdlVollmacht', 'kdlPatienteneigen', 'xdsTyp', 'xdsKlasse', 'einrichtung', 'fachrichtung']) aus[T[k].system + '|' + T[k].code] = 'Platzhalter ' + k;
  return aus;
}
// Je Weg die erzeugten Bundles. ISiK ohne Urschrift: dann steht nur DR 2 (die IPS) im Bundle — genug für die Herkunft.
const WEGE = {
  'IPS selbst': (V) => [V.fhirIpsBundle(JETZT, { sensibel: true })],
  'IPS delegiert': (V) => [V.fhirIpsBundle(JETZT, { sensibel: true, anker: { name: 'Maria Mustermann', beziehungCode: 'CHILD' } })],
  'KBV-PKA': (V) => V.kbvPkaVollmacht(JETZT, { sensibel: true }).bundles,
  'ISiK': (V) => [V.isikDokumente(JETZT, { sensibel: true, anzeigetexte: isikPlatzhalter(V) }).bundle],
};

// Der Weg „IPS selbst“ trägt einen wörtlichen Titel: auf ihn zeigt die pruefung:-Zeile des ADR-Nachtrags (statisch lesbar).
test('[Herkunft·IPS selbst] jede erzeugte Ressource ist Ziel einer Provenance mit der Person als Autorin', async () => {
  const V = await depot();
  const [b] = WEGE['IPS selbst'](V);
  assert.ok(b && b.entry.length > 1, 'Positivkontrolle: das Bundle hat Inhalt');
  assert.deepEqual(ohneHerkunft(b), [], 'IPS selbst: Ressourcen ohne Herkunft');
});

for (const [weg, bauen] of Object.entries(WEGE).filter(([w]) => w !== 'IPS selbst')) {
  test('[Herkunft·' + weg + '] jede erzeugte Ressource ist Ziel einer Provenance mit der Person als Autorin', async () => {
    const V = await depot();
    const bundles = bauen(V);
    assert.ok(bundles.length > 0 && bundles.every(Boolean), weg + ': Positivkontrolle — es entsteht ein Bundle');
    for (const b of bundles) {
      assert.ok(b.entry.length > 1, weg + ': das Bundle hat Inhalt');
      assert.deepEqual(ohneHerkunft(b), [], weg + ': Ressourcen ohne Herkunft');
    }
  });
}

test('[Herkunft·delegiert] die Autorin ist die vertretende Person, im Auftrag der Patientin', async () => {
  const V = await depot();
  const b = WEGE['IPS delegiert'](V)[0];
  const prov = b.entry.map((e) => e.resource).find((r) => r.resourceType === 'Provenance');
  const url = (t) => b.entry.find((e) => e.resource.resourceType === t).fullUrl;
  // Die vertretende Person ist die Autorin der Composition (das Vorsorge-Depot trägt weitere RelatedPersons, die Bevollmächtigten).
  const vertretung = b.entry[0].resource.author[0].reference;
  assert.equal(b.entry.find((e) => e.fullUrl === vertretung).resource.resourceType, 'RelatedPerson');
  assert.equal(prov.agent[0].who.reference, vertretung);
  assert.equal(prov.agent[0].onBehalfOf.reference, url('Patient'));
  assert.equal(prov.target[0].reference, b.entry[0].fullUrl, 'die Composition bleibt das erste Ziel');
});

test('[Herkunft·Rot-Beweis] eine Ressource ohne Ziel, eine Provenance ohne author oder ohne CREATE fällt', async () => {
  const V = await depot();
  const kopie = () => JSON.parse(JSON.stringify(WEGE['IPS selbst'](V)[0]));
  const prov = (b) => b.entry.find((e) => e.resource.resourceType === 'Provenance').resource;
  const ohneZiel = kopie(); prov(ohneZiel).target.pop();
  assert.equal(ohneHerkunft(ohneZiel).length, 1, 'eine Ressource ohne Ziel wird gefunden');
  const ohneTyp = kopie(); delete prov(ohneTyp).agent[0].type;
  assert.ok(ohneHerkunft(ohneTyp).length > 0, 'ohne agent.type = author keine Herkunft');
  const ohneVorgang = kopie(); delete prov(ohneVorgang).activity;
  assert.ok(ohneHerkunft(ohneVorgang).length > 0, 'ohne activity = CREATE keine Herkunft');
  const fremd = kopie(); prov(fremd).agent[0].who = { reference: 'urn:uuid:nicht-im-bundle' };
  assert.ok(ohneHerkunft(fremd).length > 0, 'eine Autorin, die nicht die Person ist, zählt nicht');
});

/* Jede Funktion des Kerns, die ein FHIR-Bundle baut (`resourceType: 'Bundle'`), mit ihrem Namen. */
function bundleErzeuger(text) {
  const funde = new Set();
  let fn = null;
  for (const zeile of text.split('\n')) {
    const m = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(zeile);
    if (m) fn = m[1];
    if (/resourceType\s*:\s*['"]Bundle['"]/.test(zeile)) funde.add(fn || '(oberste Ebene)');
  }
  return funde;
}
function unbekannteErzeuger(funde) {
  return [...funde].filter((f) => !ERZEUGER.includes(f) && !Object.prototype.hasOwnProperty.call(AUSGENOMMEN, f));
}
const KERN_TEXT = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Gekoppelte Proben (operating-manual §7.5, tests/pruefstand-bindung.js): ersetzt man die Diskriminante durch eine, die immer meldet,
   muss der jeweilige Wächter rot werden — sonst prüfte er über einem leeren Suchraum. */
const KOPPLUNG = { PROBEN: [
  { fuer: '[Herkunft·IPS selbst] jede erzeugte Ressource ist Ziel einer Provenance mit der Person als Autorin', diskriminante: ohneHerkunft },
  { fuer: '[Herkunft·Klassenwächter] jede Funktion im Kern, die ein FHIR-Bundle baut, ist Erzeuger mit Probe oder benannt ausgenommen', diskriminante: unbekannteErzeuger },
] };
void KOPPLUNG;

test('[Herkunft·Klassenwächter] jede Funktion im Kern, die ein FHIR-Bundle baut, ist Erzeuger mit Probe oder benannt ausgenommen', () => {
  const funde = bundleErzeuger(KERN_TEXT);
  assert.equal(funde.size, ERZEUGER.length + Object.keys(AUSGENOMMEN).length, 'Positivkontrolle: genau die bekannten Erzeuger');
  assert.deepEqual(unbekannteErzeuger(funde), [], 'neuer FHIR-Erzeuger ohne Eintrag (ERZEUGER mit Probe in WEGE, oder AUSGENOMMEN mit Grund)');
  const verwaist = ERZEUGER.concat(Object.keys(AUSGENOMMEN)).filter((f) => !funde.has(f));
  assert.deepEqual(verwaist, [], 'Eintrag ohne Erzeuger im Kern — Liste nachziehen');
  for (const f of ERZEUGER) assert.ok(Object.values(WEGE).some((w) => String(w).includes(f)), f + ': kein Weg in WEGE prüft diesen Erzeuger');
});

test('[Negativprobe] ein neuer Bundle-Erzeuger ohne Eintrag wird gefunden, ein Bundle in einem Kommentarsatz nicht', () => {
  const gepflanzt = KERN_TEXT + "\nfunction neuerAuszug() {\n  return { resourceType: 'Bundle', type: 'collection', entry: [] };\n}\n";
  assert.deepEqual(unbekannteErzeuger(bundleErzeuger(gepflanzt)), ['neuerAuszug']);
  assert.deepEqual(unbekannteErzeuger(bundleErzeuger(KERN_TEXT)), [], 'Vorbedingung: ohne Pflanzung kein Fund');
});

test('[Herkunft·Felder] IPS: recorder/asserter/informationSource/source/performer zeigen auf die Person, delegiert auf die Vertretung', async () => {
  const V = await depot();
  const FELDER = V.IPS_HERKUNFT_FELDER;
  assert.ok(FELDER && Object.keys(FELDER).length > 0, 'Positivkontrolle: die Feldliste ist sichtbar');
  for (const [weg, typ] of [['IPS selbst', 'Patient'], ['IPS delegiert', 'RelatedPerson']]) {
    const b = WEGE[weg](V)[0];
    const ziel = (typ === 'Patient') ? b.entry.find((e) => e.resource.resourceType === 'Patient').fullUrl : b.entry[0].resource.author[0].reference;
    let geprueft = 0;
    for (const { resource: r } of b.entry) {
      for (const feld of (FELDER[r.resourceType] || [])) {
        const wert = Array.isArray(r[feld]) ? r[feld][0] : r[feld];
        assert.equal(wert && wert.reference, ziel, weg + ': ' + r.resourceType + '.' + feld);
        geprueft++;
      }
    }
    assert.ok(geprueft > 0, weg + ': Positivkontrolle — das Beispieldepot hat Einträge mit Herkunftsfeld');
  }
});
