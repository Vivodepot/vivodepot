'use strict';
/* S-C (10.11.2026): Schema-Proben mit Ajv (Fremdmodul, darum in tests/mit-modul). Gegenstück: tests/studio-ansprechperson-freiwillig.test.js. Abnahme: node --test tests/mit-modul/studio-ansprechperson-schema.test.js → 0 fail; Rot-Beweis: Name wieder in required → rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..', '..');
const KOPIEN = ['vivodepot-studio.html', 'vivodepot-vc-issuer.html', path.join('docs', 'template-generator', 'submission-schema.json')];
const lies = (rel) => fs.readFileSync(process.env.S_C_STAND ? path.join(process.env.S_C_STAND, rel) : path.join(WURZEL, rel), 'utf8');
const nativ = (x) => JSON.parse(JSON.stringify(x));

/* Das Einreich-Schema steht in den HTML-Dateien als Objekt-Literal, in docs als Datei: von „$id“ rückwärts zur öffnenden Klammer. */
function einreichSchema(text) {
  const i = text.indexOf('"$id": "https://vivodepot.de/schemas/submission-schema.json"');
  assert.ok(i > 0, 'Einreich-Schema nicht gefunden');
  const a = text.lastIndexOf('{', i);
  let tiefe = 0, imText = false, esc = false;
  for (let k = a; k < text.length; k++) {
    const c = text[k];
    if (imText) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') imText = false; continue; }
    if (c === '"') imText = true; else if (c === '{') tiefe++; else if (c === '}' && --tiefe === 0) return JSON.parse(text.slice(a, k + 1));
  }
  throw new Error('Schema nicht geschlossen');
}
const ANBIETER = { anbieterId: 'institution/sv-beispielstadt-de', anbieterName: 'Sportverein Beispielstadt', anbieterTyp: 'institution/sv-beispielstadt-de',
  adresse: { strasse: 'Am Sportplatz 3', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland' }, kontakt: { email: 'verein@beispiel.example' } };
const Ajv = require('ajv/dist/2020');

test('[S-C · Schema] eine Einrichtung ohne Ansprechperson ist in allen drei Kopien gültig; ein leerer Name nicht (er entfällt)', () => {
  for (const rel of KOPIEN) {
    const anbieter = einreichSchema(lies(rel)).properties.anbieter;
    const pruefe = new Ajv({ strict: false, allErrors: true, formats: { email: true } }).compile(anbieter);
    assert.ok(pruefe(nativ(ANBIETER)), rel + ': ohne Ansprechperson ungültig ' + JSON.stringify(pruefe.errors));
    const mit = nativ(ANBIETER); mit.kontakt.name = 'Erika Beispiel';
    assert.ok(pruefe(mit), rel + ': mit Ansprechperson ungültig');
    const leer = nativ(ANBIETER); leer.kontakt.name = '';
    assert.equal(pruefe(leer), false, rel + ': ein leerer Name muss entfallen, nicht leer stehen');
    const ohneMail = nativ(ANBIETER); delete ohneMail.kontakt.email;
    assert.equal(pruefe(ohneMail), false, rel + ': ohne E-Mail gibt es keinen Rückkanal');
  }
});
test('[S-C · Schema · Rot-Beweis] steht der Name wieder in required, ist die Probe rot', () => {
  const s = einreichSchema(lies('docs/template-generator/submission-schema.json'));
  s.properties.anbieter.properties.kontakt.required = ['name', 'email'];
  assert.ok(s.properties.anbieter.properties.kontakt.required.includes('name'));
  const pruefe = new Ajv({ strict: false, formats: { email: true } }).compile(s.properties.anbieter);
  assert.equal(pruefe(nativ(ANBIETER)), false, 'mit Pflicht-Name wäre die Einrichtung ohne Ansprechperson ungültig');
});
