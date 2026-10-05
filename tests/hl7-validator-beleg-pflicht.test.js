'use strict';
/* hl7-validator-beleg-pflicht.test.js — wer den HL7-Validator aufruft, nimmt ihn über den Beleg-Helfer (04.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Klassenwächter zum Befund HL7-VALIDATOR-FASSUNG: Jede Datei unter tools/, scripts/ und tests/konformitaet/, die den
   HL7-Validator startet (`-jar` zusammen mit validator_cli oder FHIR_VALIDATOR_JAR), lädt tools/lib/hl7-validator-beleg.js.
   Sonst entstünde wieder ein Bericht ohne Fassung oder ein Lauf mit freiem Jar. Andere Validatoren (1EdTech, ITB-SHACL)
   sind nicht gemeint. Dazu: die Registry-Zeile `werkzeugVersion` des HL7-Validators ist gleich dem Pin der Beschaffung.
   ROT-BEWEIS: ein Fixture-Wrapper, der den Validator ohne den Helfer startet. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const PIN = { VERSION: require('../tools/lib/hl7-validator-pin.json').version };

const REPO = path.join(__dirname, '..');
const STARTET_HL7 = (text) => /['"]-jar['"]/.test(text) && /validator_cli|FHIR_VALIDATOR_JAR/.test(text);
const NUTZT_HELFER = (text) => /hl7-validator-beleg(\.js)?['"]/.test(text);

function verstoesse(dateien) {
  return dateien.filter(({ text }) => STARTET_HL7(text) && !NUTZT_HELFER(text)).map(({ rel }) => rel);
}

function bestand() {
  const raus = [];
  const lauf = (ordner) => {
    for (const e of fs.readdirSync(path.join(REPO, ordner), { withFileTypes: true })) {
      const rel = ordner + '/' + e.name;
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'fixtures') lauf(rel); }
      else if (/\.(js|mjs|cjs)$/.test(e.name)) raus.push({ rel, text: fs.readFileSync(path.join(REPO, rel), 'utf8') });
    }
  };
  for (const o of ['tools', 'scripts', 'tests/konformitaet']) lauf(o);
  return raus;
}

test('[HL7-Beleg·Pflicht] jede Datei, die den HL7-Validator startet, lädt den Beleg-Helfer', () => {
  const alle = bestand();
  const starter = alle.filter((d) => STARTET_HL7(d.text)).map((d) => d.rel);
  assert.ok(starter.length >= 5, 'Kontrolle: die Wrapper werden gefunden (' + starter.join(', ') + ')');
  assert.deepEqual(verstoesse(alle), []);
});

test('[HL7-Beleg·Pflicht·Rot-Beweis] ein Wrapper ohne den Helfer fällt auf, einer mit und ein fremder Validator nicht', () => {
  const ohne = { rel: 'tools/x-validieren.js', text: "const jar = process.env.FHIR_VALIDATOR_JAR;\nexecFileSync(java, ['-jar', jar, f]);\n" };
  const mit = { rel: 'tools/y-validieren.js', text: "const VB = require('./lib/hl7-validator-beleg.js');\n" + ohne.text };
  const fremd = { rel: 'tests/konformitaet/adapter/z.mjs', text: "execFileSync(java, ['-jar', shaclJar, f]); // itb-shacl\n" };
  assert.deepEqual(verstoesse([ohne, mit, fremd]), ['tools/x-validieren.js']);
});

test('[HL7-Beleg·Pflicht] die Registry-Zeile werkzeugVersion des HL7-Validators ist der Pin der Beschaffung', () => {
  const t = fs.readFileSync(path.join(REPO, 'tests/konformitaet/externe-validatoren.mjs'), 'utf8');
  const m = /id: 'hl7-fhir-validator'[\s\S]*?werkzeugVersion: '([^']+)'/.exec(t);
  assert.ok(m, 'Registry-Zeile gefunden');
  assert.equal(m[1], PIN.VERSION);
});
