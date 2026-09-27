'use strict';
/* U2-ADR-NNN (Korpus-Zuordnung, 17.09.2026) — docs/rechtsraum-modul/rechtsraum-modul-schema.json
   bekommt neben `wortlaut` ein zweites, optionales Feld `bauplan` fuer Instrumente mit
   mehrschrittigem Bauplan. Diese Probe prueft nur die SCHEMA-DATEI selbst (kein Laufzeit-
   Konsument existiert bisher — der Quelltext-Umzug ist eigener, offener Konformitaets-Punkt
   derselben ADR), damit die ADR eine tatsaechlich existierende Probe zitieren kann statt einer
   Prosa-Behauptung ueber eine JSON-Datei. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_PFAD = path.join(__dirname, '..', 'docs', 'rechtsraum-modul', 'rechtsraum-modul-schema.json');

function schemaLaden() {
  return JSON.parse(fs.readFileSync(SCHEMA_PFAD, 'utf8'));
}

test('[U2-ADR-NNN·Bauplan] die Schema-Datei ist gueltiges JSON', () => {
  assert.doesNotThrow(() => schemaLaden());
});

test('[U2-ADR-NNN·Bauplan] typen.<typ> traegt bauplan NEBEN wortlaut, beide optional und unabhaengig', () => {
  const schema = schemaLaden();
  const typEintrag = schema.properties.typen.additionalProperties;
  assert.ok(typEintrag.properties.wortlaut, 'wortlaut fehlt');
  assert.deepEqual(typEintrag.properties.wortlaut.type, ['string', 'null'], 'wortlaut-Typ hat sich veraendert');
  assert.ok(typEintrag.properties.bauplan, 'bauplan fehlt');
  assert.deepEqual(typEintrag.properties.bauplan.type, ['array', 'null'], 'bauplan muss Array-oder-null sein');
  assert.ok(!typEintrag.required.includes('bauplan'), 'bauplan darf nicht Pflicht sein');
  assert.ok(!typEintrag.required.includes('wortlaut'), 'wortlaut darf nicht Pflicht sein — beide bleiben unabhaengig optional');
});

test('[U2-ADR-NNN·Bauplan] ein Bauplan-Schritt traegt die Wurzel {feld,verborgenWenn?} plus die Korpus-Erweiterung', () => {
  const schema = schemaLaden();
  const schritt = schema.properties.typen.additionalProperties.properties.bauplan.items;
  assert.ok(schritt.required.includes('feld'), 'feld muss Pflicht sein — die gemeinsame Wurzel');
  for (const key of ['id', 'typ']) {
    assert.ok(schritt.properties.feld.properties[key], `feld.${key} fehlt`);
  }
  assert.ok(!schritt.properties.feld.required || schritt.properties.feld.required.includes('id'), 'feld.id sollte Pflicht sein');
  for (const key of ['verborgenWenn', 'dokEinleitung', 'bezug', 'hilfetext', 'frage']) {
    assert.ok(schritt.properties[key], `Korpus-Erweiterungsfeld ${key} fehlt`);
  }
  assert.ok(!schritt.required.includes('dokEinleitung') && !schritt.required.includes('bezug')
    && !schritt.required.includes('hilfetext') && !schritt.required.includes('frage'),
    'die Korpus-Erweiterungsfelder muessen optional bleiben');
});

/* [U2-ADR-NNN·Bauplan·Rot-Beweis] (A348, Zug 4) — eine neue Probe bringt ihren Rot-Beweis mit,
   sonst ist sie eine Zusage, keine Messung. Diese Probe nimmt das ECHTE, geladene Schema und
   verfälscht gezielt genau die eine Eigenschaft, die die Probe oben prüft (bauplan fehlt am
   typ-Eintrag) — dieselbe Prüf-Assertion muss daran ROT werden, sonst prüft sie nichts. */
test('[U2-ADR-NNN·Bauplan·Rot-Beweis] ein Schema OHNE bauplan-Feld lässt dieselbe Prüfung anschlagen', () => {
  const schema = schemaLaden();
  const verfaelscht = JSON.parse(JSON.stringify(schema));
  delete verfaelscht.properties.typen.additionalProperties.properties.bauplan;
  assert.throws(() => {
    const typEintrag = verfaelscht.properties.typen.additionalProperties;
    assert.ok(typEintrag.properties.bauplan, 'bauplan fehlt');
  }, /bauplan fehlt/, 'die verfälschte Kopie muss an genau der geprüften Eigenschaft scheitern');
});

/* A348 Zug 4 — eine neue Probe bringt ihren Rot-Beweis mit: die zwei Assertion-Bloecke oben
   pruefen nur den GESUNDEN Ist-Stand. Diese Gegenprobe pflanzt zwei reale Regressionen (bauplan
   faelschlich Pflicht statt optional; feld faelschlich NICHT Pflicht in der Bauplan-Wurzel) und
   beweist, dass dieselbe Assertion-Logik sie tatsaechlich findet — nicht nur behauptet zu pruefen. */
test('[U2-ADR-NNN·Bauplan·Gegenprobe] eine gepflanzte Regression (bauplan faelschlich Pflicht, feld faelschlich optional) wird gefunden', () => {
  const schema = schemaLaden();
  const typEintrag = schema.properties.typen.additionalProperties;
  typEintrag.required = [...typEintrag.required, 'bauplan'];
  assert.throws(
    () => assert.ok(!typEintrag.required.includes('bauplan'), 'bauplan darf nicht Pflicht sein'),
    assert.AssertionError,
    'eine faelschlich zur Pflicht gemachte bauplan-Eigenschaft MUSS die Probe brechen',
  );

  const schrittWurzel = schemaLaden().properties.typen.additionalProperties.properties.bauplan.items;
  schrittWurzel.required = schrittWurzel.required.filter((k) => k !== 'feld');
  assert.throws(
    () => assert.ok(schrittWurzel.required.includes('feld'), 'feld muss Pflicht sein — die gemeinsame Wurzel'),
    assert.AssertionError,
    'ein entferntes feld-Pflichtfeld MUSS die Probe brechen',
  );
});
