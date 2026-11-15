'use strict';
/* ═════════════════════════════════════════════════════════════════
   Studio-Umbau S-C (10.11.2026): die Ansprechperson (Name) ist freiwillig.
   Befund: Name und E-Mail der Ansprechperson waren Pflicht in Assistent (Schritt 1), Dialog „Einreichen“ und Einreich-Schema
   (`anbieter.kontakt.required = [name, email]`). Die Maßstab-Frage: die Person wird nicht kleiner, bei Lücke bauen.
   Entscheidung: der NAME ist freiwillig und fehlt in der Datei, wenn er leer ist. Die E-Mail bleibt Pflicht, weil die Antragsdatei
   art=zertifikat ihr `konto` aus ihr ableitet (kontoAus) und das Schema der Antragsdatei `konto` verlangt; ohne sie gäbe es keine
   Rückantwort. Die Meldung heißt deshalb „… E-Mail-Adresse der Einrichtung …“.
   Abnahme: node --test tests/studio-ansprechperson-freiwillig.test.js → 0 fail.
   ROT-BEWEIS: dieselbe Probe gegen die Stände vor S-C (git show HEAD~:… in die drei Kopien) → rot (Name in `required`, as-k-name mit
   aria-required und .muss, validiereStammdaten meldet den Namen); in der Probe selbst: Name wieder in `required` → rot.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const WURZEL = path.join(__dirname, '..');
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

test('[S-C · Schema] in keiner der drei Kopien steht die Ansprechperson (Name) in required; die E-Mail bleibt (Konto der Antragsdatei)', () => {
  for (const rel of KOPIEN) {
    const k = einreichSchema(lies(rel)).properties.anbieter.properties.kontakt;
    assert.ok(Array.isArray(k.required), rel + ': kontakt ohne required');
    assert.ok(!k.required.includes('name'), rel + ': die Ansprechperson (Name) ist Pflicht');
    assert.deepEqual(k.required, ['email'], rel + ': die E-Mail ist der Rückkanal und bleibt Pflicht');
    assert.match(k.description, /freiwillig/, rel + ': die Beschreibung nennt die Ansprechperson nicht als freiwillig');
  }
});
test('[S-C · Studio] ohne Namen entfällt `name` in anbieter.kontakt, mit Namen steht er; validiereStammdaten verlangt nur die E-Mail', () => {
  const { V } = ladeGenerator();
  const form = { anbieterName: 'Sportverein Beispielstadt', strasse: 'Am Sportplatz 3', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland', kontaktEmail: 'verein@beispiel.example' };
  const ohne = V.baueAnbieter(Object.assign({}, form, { kontaktName: '   ' }));
  assert.deepEqual(nativ(ohne.kontakt), { email: 'verein@beispiel.example' });
  assert.deepEqual(nativ(V.validiereStammdaten(ohne)), []);
  const mit = V.baueAnbieter(Object.assign({}, form, { kontaktName: 'Erika Beispiel' }));
  assert.equal(mit.kontakt.name, 'Erika Beispiel');
  const ohneMail = V.baueAnbieter(Object.assign({}, form, { kontaktEmail: '' }));
  assert.deepEqual(nativ(V.validiereStammdaten(ohneMail)), ['Bitte geben Sie eine gültige E-Mail-Adresse der Einrichtung an.']);
  assert.ok(!nativ(V.validiereStammdaten(ohneMail)).some((m) => /Ansprechperson/.test(m)));
});
test('[S-C · Studio] die Antragsdatei entsteht ohne Ansprechperson; das Konto kommt aus der E-Mail', async () => {
  const { V } = ladeGenerator();
  const anbieter = V.baueAnbieter({ anbieterName: 'Sportverein Beispielstadt', strasse: 'Am Sportplatz 3', plz: '12345', ort: 'Beispielstadt', land: 'Deutschland',
    rechtsform: 'e.V.', kontaktEmail: 'verein@beispiel.example' });
  const jwk = { kty: 'OKP', crv: 'Ed25519', x: 'A'.repeat(43) };
  const g = await V.baueAntragsdatei({ anbieter, publicJwk: jwk, antragId: 'a'.repeat(32), ausstelltag: '2026-11-10' });
  assert.deepEqual(nativ(g.datei.kontakt), { email: 'verein@beispiel.example' });
  assert.match(g.datei.konto, /^[a-f0-9]{24}$/);
});
test('[S-C · Oberfläche] die Felder der Ansprechperson sind weder mit Stern noch aria-required „nötig“, tragen „freiwillig“; die E-Mail bleibt nötig', () => {
  const html = lies('vivodepot-studio.html');
  const tag = (id) => (html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>')) || [''])[0];
  const label = (id) => { const m = html.match(new RegExp('<label [^>]*for="' + id + '"[^>]*>')); assert.ok(m, 'kein Label zu ' + id); return m[0] + html.slice(m.index + m[0].length, m.index + m[0].length + 140); };
  for (const id of ['as-k-name', 'sd-k-name']) {
    assert.ok(tag(id), id + ' fehlt');
    assert.doesNotMatch(tag(id), /aria-required/, id + ': ist nicht mehr nötig');
    assert.doesNotMatch(label(id), /class="(?:[^"]* )?muss(?: [^"]*)?"/, id + ': trägt noch den Stern');
    assert.match(label(id), /Ansprechperson \(freiwillig\)/, id + ': ohne „freiwillig“');
    assert.match(label(id), /data-en="Contact person \(optional\)"/, id + ': ohne englische Fassung');
  }
  for (const id of ['as-k-email', 'sd-k-email']) {
    assert.match(tag(id), /aria-required="true"/, id + ': die E-Mail bleibt nötig');
    assert.match(label(id), /class="(?:[^"]* )?muss(?: [^"]*)?"/, id + ': E-Mail ohne Stern');
  }
  assert.ok(!/Namen der Ansprechperson an/.test(html), 'die Namens-Meldung gehört nicht mehr in den Code');
});
