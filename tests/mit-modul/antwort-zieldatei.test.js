'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Antwort trägt die Datei, die die Stelle einliest (W2, Befund UEBERNAHME-OHNE-ABTIPPEN, 04.11.2026)
   ────────────────────────────────────────────────────────────────────────
   Nennt die Anfrage `antwort.format`, baut der Kern aus dem Ausgabe-Format-Modul der Person die Datei und bettet sie in die
   Antwort ein (`zieldatei`). Gehalten wird:
   · Die Datei trägt die freigegebenen Angaben in der Form des Moduls (JSON und XML), und die Antwort validiert gegen das Schema.
   · NUR FREIGEGEBENES: Ein Feld, das das Modul abbildet und das Depot führt, das die Anfrage aber nicht erfragt, fehlt in der
     Datei. Ebenso ein sensibles Feld ohne Freigabe.
   · Ohne passendes Modul, mit Anhang oder Vertreter-Feld im Modul steht ein `grund` da statt einer Datei.
   · Die Anfrage-Prüfung nimmt `antwort.format` nur in der Kennungsform an.
   ROT-BEWEIS: Ohne den Filter `nurKennungen` (in `baueAusMapping`) stünde der Geburtsort in der Datei; die Probe unten fährt
   denselben Kanal ohne Filter und sieht ihn, damit „fehlt" nicht leer besteht.
   Liegt hier, weil sie Ajv braucht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const { ladeKern } = require('../load-kern.js');

const WURZEL = path.join(__dirname, '..', '..');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(WURZEL, 'docs', 'template-generator', 'antwort-schema.json'), 'utf8'));
const MODUL_JSON = {
  modulTyp: 'format', moduleVersion: 1, sprache: 'de', format: 'stelle-probe-json', richtung: 'export',
  sektor: 'identity', label: 'Stelle Probe', quelle: 'antrag',
  zuordnung: [
    { feld: 'givenName', ziel: 'person.vorname' },
    { feld: 'familyName', ziel: 'person.nachname' },
    { feld: 'birthPlace', ziel: 'person.geburtsort' },
  ],
};
const MODUL_XML = Object.assign({}, MODUL_JSON, { format: 'stelle-probe-xml', schreiber: 'xml@1' });

async function kern(module) {
  const { V } = ladeKern();
  await V.depotAnlegen('antwort-zieldatei-pw-2026');
  const d = V.getData();
  d.sektoren.identity = Object.assign({}, d.sektoren.identity, { givenName: 'Walter', familyName: 'Beispiel', birthPlace: 'Köln' });
  d.formatModule = (Array.isArray(d.formatModule) ? d.formatModule : []).concat(module);
  V.setData(d);
  return V;
}
function anfrage(kennungen, format) {
  return { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Stelle', zweck: 'Probe', grundlage: 'Probe', vorgang: 'ZD-1',
    gestelltAm: '2026-11-04', gueltigBis: '2099-12-31',
    felder: kennungen.map((k) => ({ kennung: k, zweck: 'Probe', pflicht: true })),
    antwort: Object.assign({ art: 'einmalpasswort', an: 'probe@beispiel.invalid' }, format === undefined ? {} : { format }) };
}
async function antwort(V, a) {
  const ds = await V.anfrageAntwortDatensatzGeprueft({ anfrage: a }, {});
  assert.ok(ds, 'die Anfrage ist gültig und ergibt einen Datensatz');
  return JSON.parse(JSON.stringify(ds));
}
function schemaFehler(ds) {
  const pruefe = new Ajv2020({ allErrors: true, strict: false, validateFormats: false }).compile(SCHEMA);
  return pruefe(ds) ? [] : pruefe.errors.map((e) => (e.instancePath || '/') + ' ' + e.message);
}

test('[Antwort·Zieldatei] JSON-Modul: die Datei trägt die erfragten Angaben, nicht den nur im Depot stehenden Geburtsort', async () => {
  const V = await kern([MODUL_JSON]);
  const ds = await antwort(V, anfrage(['identity.givenName', 'identity.familyName'], 'stelle-probe-json'));
  assert.deepEqual(schemaFehler(ds), []);
  const z = ds.zieldatei;
  assert.ok(z && typeof z.inhalt === 'string', 'eine Datei ist eingebettet: ' + JSON.stringify(z));
  assert.equal(z.mime, 'application/json');
  assert.equal(z.dateiname.endsWith('.json'), true);
  assert.deepEqual(JSON.parse(z.inhalt), { antrag: { person: { vorname: 'Walter', nachname: 'Beispiel' } } });
});

test('[Antwort·Zieldatei·Rot-Beweis] derselbe Kanal ohne den Filter trüge den Geburtsort', async () => {
  const V = await kern([MODUL_JSON]);
  const ohneFilter = JSON.parse(V.exportFormatFuerId('stelle-probe-json').baue({}));
  assert.equal(ohneFilter.antrag.person.geburtsort, 'Köln', 'Vorbedingung: das Modul bildet den Geburtsort ab, das Depot führt ihn');
  const mitFilter = JSON.parse(V.exportFormatFuerId('stelle-probe-json').baue({ nurKennungen: new Set(['identity.givenName']) }));
  assert.deepEqual(mitFilter, { antrag: { person: { vorname: 'Walter' } } });
});

test('[Antwort·Zieldatei] XML-Modul: dieselben Angaben als XML', async () => {
  const V = await kern([MODUL_XML]);
  const ds = await antwort(V, anfrage(['identity.givenName', 'identity.familyName'], 'stelle-probe-xml'));
  assert.deepEqual(schemaFehler(ds), []);
  assert.equal(ds.zieldatei.mime, 'application/xml');
  assert.match(ds.zieldatei.inhalt, /<antrag><person><vorname>Walter<\/vorname><nachname>Beispiel<\/nachname><\/person><\/antrag>/);
  assert.doesNotMatch(ds.zieldatei.inhalt, /Köln/);
});

test('[Antwort·Zieldatei] ohne passendes Modul, mit Anhang oder Vertreter: ein Grund statt einer Datei', async () => {
  const V = await kern([MODUL_JSON,
    Object.assign({}, MODUL_JSON, { format: 'stelle-probe-vertreter', zuordnung: MODUL_JSON.zuordnung.concat([{ vertreter: 'familyName', ziel: 'vertretung.nachname' }]) })]);
  const fehlt = await antwort(V, anfrage(['identity.givenName'], 'gibt-es-nicht'));
  assert.deepEqual(fehlt.zieldatei, { format: 'gibt-es-nicht', grund: 'format-fehlt' });
  assert.deepEqual(schemaFehler(fehlt), []);
  const vertreter = await antwort(V, anfrage(['identity.givenName'], 'stelle-probe-vertreter'));
  if (vertreter.zieldatei.grund === 'format-fehlt') {
    // Das Modul ist schon beim Andocken verworfen (Vertreter-Feld nur mit Anhang-Rolle): auch dann keine Datei.
    assert.equal(vertreter.zieldatei.inhalt, undefined);
  } else {
    assert.deepEqual(vertreter.zieldatei, { format: 'stelle-probe-vertreter', grund: 'format-liest-am-filter-vorbei' });
  }
  const ohne = await antwort(V, anfrage(['identity.givenName']));
  assert.equal(ohne.zieldatei, undefined, 'ohne antwort.format keine Datei');
});

test('[Antwort·Zieldatei] die Anfrage-Prüfung nimmt antwort.format nur in Kennungsform', () => {
  const { V } = ladeKern();
  assert.equal(V.anfragePruefen(anfrage(['identity.givenName'], 'fim:S03000364@1.0')).anfrage.antwort.format, 'fim:S03000364@1.0');
  for (const schlecht of [42, '', ' ', '<x>', 'a b', 'x'.repeat(121)]) {
    assert.equal(V.anfragePruefen(anfrage(['identity.givenName'], schlecht)).grund, 'antwort-format', JSON.stringify(schlecht));
  }
});
