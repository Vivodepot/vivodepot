'use strict';
/* Studio-Ausgabewege, Wagen C (12.11.2026): Bereiche, Institutionsarten und Rechtsraum-Typen gehen neben dem signierten Modul als
   HL7 FHIR R4 CodeSystem (4.0.1, https://hl7.org/fhir/R4/codesystem.html, CC0) und als PDF hinaus.
   Gehalten: modulCodeSystem(modul) bildet je Eintrag ein concept (code = Kennung, display = Bezeichnung; beim Rechtsraum der
   Wortlaut als definition), count stimmt, die Kennung liegt im Namensraum urn:vivodepot:; die Grundlinie führt die drei Wege als
   geschlossen. ROT-BEWEIS: am Stand von Wagen A gibt es modulCodeSystem nicht; alle Proben sind rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const cs = (modul) => {
  const g = ladeGenerator();
  assert.equal(typeof g.sandbox.modulCodeSystem, 'function', 'modulCodeSystem fehlt im Studio (Ausgabewege, Wagen C)');
  return JSON.parse(JSON.stringify(g.sandbox.modulCodeSystem(modul)));
};

test('[Studio·Ausgabewege·CodeSystem] Bereiche: je Bereich ein concept, Sprache und Herkunft im Kopf', () => {
  const c = cs({ modulTyp: 'bereich', moduleVersion: 2, herkunft: 'tsv-probe', sprache: 'de',
    bereiche: { verein: { label: 'Verein', icon: 'folder' }, schule: { label: 'Schule', icon: 'folder' } } });
  assert.equal(c.resourceType, 'CodeSystem');
  assert.equal(c.content, 'complete');
  assert.equal(c.url, 'urn:vivodepot:bereich:tsv-probe');
  assert.equal(c.version, '2');
  assert.equal(c.language, 'de');
  assert.equal(c.count, 2);
  assert.deepEqual(c.concept, [{ code: 'verein', display: 'Verein' }, { code: 'schule', display: 'Schule' }]);
});

test('[Studio·Ausgabewege·CodeSystem] Institutionsarten: Kennung als code, Bezeichnung als display', () => {
  const c = cs({ modulTyp: 'institutionsArt', moduleVersion: 1, herkunft: 'probe', sprache: 'de', arten: { hausarzt: 'Hausarztpraxis' } });
  assert.deepEqual(c.concept, [{ code: 'hausarzt', display: 'Hausarztpraxis' }]);
});

test('[Studio·Ausgabewege·CodeSystem] Rechtsraum: Typen als concept, der Wortlaut als definition', () => {
  const c = cs({ modulTyp: 'rechtsraum', rechtsraum: 'DE', moduleVersion: 1, typen: {
    vorsorgevollmacht: { katalogVersion: 1, wortlaut: 'Ich bevollmächtige …' }, patientenverfuegung: { katalogVersion: 1 } } });
  assert.equal(c.url, 'urn:vivodepot:rechtsraum:DE');
  assert.deepEqual(c.concept, [
    { code: 'vorsorgevollmacht', display: 'vorsorgevollmacht', definition: 'Ich bevollmächtige …' },
    { code: 'patientenverfuegung', display: 'patientenverfuegung' }]);
});

test('[Studio·Ausgabewege·Grundlinie] Bereich, Institutionsart und Rechtsraum stehen als geschlossen, nicht als Lücke', () => {
  const gl = require(path.join(__dirname, '..', 'tools', 'studio-ausgabewege-grundlinie.json'));
  for (const weg of ['bereichErzeugen', 'institutionsArtErzeugen', 'rechtsraumErzeugen']) {
    assert.ok(gl.geschlossen[weg], weg + ' ist nicht geschlossen');
    assert.equal(gl.geschlossen[weg].standard, 'fhir-r4-codesystem');
    assert.ok(!(weg in gl.luecken), weg + ' steht noch als Lücke');
  }
});
