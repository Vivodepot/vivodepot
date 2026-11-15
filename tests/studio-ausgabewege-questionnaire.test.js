'use strict';
/* Studio-Ausgabewege, Wagen A (12.11.2026): Entwurf, Assistent und Angehörigen-Blatt geben neben ihrer Datei im eigenen Format
   einen HL7 FHIR R4 Questionnaire (4.0.1, https://hl7.org/fhir/R4/questionnaire.html, CC0) und ein lesbares PDF aus. Das PDF
   trägt die Standarddatei als Anhang (Beziehung Data) und die Originaldatei (Beziehung Source).
   Gehalten:
     · studioPdfBauen({ titel, kopf, abschnitte, anhaenge }): ein PDF mit genau den genannten Anhängen und ihren Beziehungen;
     · entwurfQuestionnaire(state): derselbe Fragebogen wie vorlageQuestionnaire, aber status draft;
     · wizardQuestionnaires(modul): je Assistent ein Questionnaire, je Schritt ein Eintrag (linkId = feld.id, text = frage);
     · blattQuestionnaires(modul): je Situation ein Questionnaire, je Block eine Gruppe, je Eintrag ein readOnly-Eintrag,
       dessen definition auf Bereich und Feld zeigt;
     · in der Grundlinie stehen entwurfSichern, wizardErzeugen und blattErzeugen unter `geschlossen`, nicht mehr unter `luecken`.
   ROT-BEWEIS: am Stand des Studio-PDF-Wagens gibt es keine dieser Funktionen; alle Proben sind rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const fn = (g, name) => {
  assert.equal(typeof g.sandbox[name], 'function', name + ' fehlt im Studio (Ausgabewege, Wagen A)');
  return g.sandbox[name];
};
function anhaenge(bytes) {
  const s = Buffer.from(bytes).toString('latin1');
  const aus = [];
  for (const m of s.matchAll(/\/Type\s*\/EmbeddedFile\b[^]*?\/Length\s+(\d+)[^]*?stream\r?\n/g)) {
    const start = m.index + m[0].length;
    aus.push(Buffer.from(s.slice(start, start + Number(m[1])), 'latin1').toString('utf8'));
  }
  return { dateien: aus, beziehungen: [...s.matchAll(/\/AFRelationship\s*\/(\w+)/g)].map((m) => m[1]) };
}

test('[Studio·Ausgabewege·PDF] studioPdfBauen setzt Titel und Abschnitte und hängt genau die genannten Dateien an', async () => {
  const g = ladeGenerator();
  const bytes = await fn(g, 'studioPdfBauen')({
    titel: 'Probe', kopf: ['TSV Probestadt'],
    abschnitte: [{ titel: 'Abschnitt', zeilen: [['Feld', 'Wert']] }],
    anhaenge: [
      { inhalt: '{"resourceType":"Questionnaire"}', dateiname: 'probe-questionnaire.json', beziehung: 'Data', subtype: 'application/fhir+json' },
      { inhalt: '{"a":1}', dateiname: 'probe.json', beziehung: 'Source', subtype: 'application/json' },
    ],
  });
  assert.equal(Buffer.from(bytes).subarray(0, 5).toString('latin1'), '%PDF-');
  const { dateien, beziehungen } = anhaenge(bytes);
  assert.deepEqual(dateien.sort(), ['{"a":1}', '{"resourceType":"Questionnaire"}']);
  assert.deepEqual(beziehungen.sort(), ['Data', 'Source']);
});

test('[Studio·Ausgabewege·Entwurf] entwurfQuestionnaire ist der Fragebogen der Vorlage mit status draft', () => {
  const g = ladeGenerator();
  const V = g.V;
  const vorlage = V.BEISPIEL_TEMPLATES.verein;
  const state = Object.assign({}, V.STATE, { felder: vorlage.felder.map((f) => Object.assign({}, f)), dokument: { titel: vorlage.titel } });
  Object.assign(V.STATE, state);
  const q = fn(g, 'entwurfQuestionnaire')(state);
  const v = fn(g, 'vorlageQuestionnaire')(state);
  assert.equal(q.resourceType, 'Questionnaire');
  assert.equal(q.status, 'draft');
  assert.deepEqual(JSON.parse(JSON.stringify(q.item)), JSON.parse(JSON.stringify(v.item)), 'dieselben Einträge wie die Vorlage');
});

test('[Studio·Ausgabewege·Assistent] wizardQuestionnaires: je Assistent ein Questionnaire, je Schritt ein Eintrag', () => {
  const g = ladeGenerator();
  const modul = { modulTyp: 'wizard', moduleVersion: 1, herkunft: 'probe', sprache: 'de', wizards: {
    umzug: { titel: 'Umzug', einleitung: 'Neue Anschrift', schritte: [
      { feld: { id: 'strasse', typ: 'text' }, frage: 'Neue Straße?' },
      { feld: { id: 'einzug', typ: 'datum' }, frage: 'Seit wann?' },
    ] },
  } };
  const qs = fn(g, 'wizardQuestionnaires')(modul);
  assert.equal(qs.length, 1);
  const q = qs[0];
  assert.equal(q.resourceType, 'Questionnaire');
  assert.equal(q.title, 'Umzug');
  assert.equal(q.language, 'de');
  assert.deepEqual(q.item.map((i) => i.linkId), ['strasse', 'einzug']);
  assert.deepEqual(q.item.map((i) => i.text), ['Neue Straße?', 'Seit wann?']);
  assert.equal(q.item[1].type, 'date');
});

test('[Studio·Ausgabewege·Blatt] blattQuestionnaires: je Situation ein Questionnaire, Blöcke als Gruppe, Einträge readOnly mit Feldbezug', () => {
  const g = ladeGenerator();
  const modul = { modulTyp: 'angehoerigenVorlage', moduleVersion: 1, herkunft: 'probe', sprache: 'de', situationen: {
    krankenhaus: { titel: 'Krankenhaus', icon: 'users', bloecke: [
      { id: 'block-1', titel: 'Kontakt', eintraege: [{ quelle: 'gesundheit', feld: 'hausarzt' }] },
    ] },
  } };
  const qs = fn(g, 'blattQuestionnaires')(modul);
  assert.equal(qs.length, 1);
  const gruppe = qs[0].item[0];
  assert.equal(gruppe.type, 'group');
  assert.equal(gruppe.text, 'Kontakt');
  const e = gruppe.item[0];
  assert.equal(e.readOnly, true);
  assert.match(e.definition, /gesundheit/);
  assert.match(e.definition, /hausarzt/);
});

test('[Studio·Ausgabewege·Grundlinie] Entwurf, Assistent und Blatt stehen als geschlossen, nicht als Lücke', () => {
  const gl = require(path.join(__dirname, '..', 'tools', 'studio-ausgabewege-grundlinie.json'));
  for (const weg of ['entwurfSichern', 'wizardErzeugen', 'blattErzeugen']) {
    assert.ok(gl.geschlossen[weg], weg + ' ist nicht geschlossen');
    assert.equal(gl.geschlossen[weg].pdf, true);
    assert.ok(!(weg in gl.luecken), weg + ' steht noch als Lücke');
  }
});
