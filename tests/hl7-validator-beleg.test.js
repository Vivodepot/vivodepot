'use strict';
/* hl7-validator-beleg.test.js — jeder Validator-Bericht nennt Name, Fassung und Prüfsumme; ein freies Jar nur mit Fassung (04.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund HL7-VALIDATOR-FASSUNG (MITTEL, als Klasse): Berichte ohne Validator-Fassung, Wrapper mit freiem --jar.
   Ein kleines Fixture-Jar (Zip mit fhir-build.properties, hier im Test gebaut) ersetzt den 180-MB-Download.
   ROT-BEWEISE: Bericht ohne Name/Fassung · freies Jar ohne lesbare Fassung · Beleg mit Pfad oder Hostname ·
   ein Jar, das nicht der Pin ist, gilt nicht als gepinnt. Der Beleg unter ~/.cache wird hier NIE gelesen — nur in ein
   Temp-Verzeichnis geschrieben (Bedingung der Gegenlesung: der Beleg ist Ausgabe, keine Probe liest ihn). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const VB = require('../tools/lib/hl7-validator-beleg.js');

/* Ein Zip mit genau einer Datei, unkomprimiert (Methode 0) — reicht für `unzip -p`. */
function zipMitEinerDatei(name, inhalt) {
  const daten = Buffer.from(inhalt, 'utf8');
  const nameB = Buffer.from(name, 'utf8');
  const crc = zlib.crc32(daten) >>> 0;
  const lokal = Buffer.alloc(30); lokal.writeUInt32LE(0x04034b50, 0); lokal.writeUInt16LE(20, 4); lokal.writeUInt32LE(crc, 14);
  lokal.writeUInt32LE(daten.length, 18); lokal.writeUInt32LE(daten.length, 22); lokal.writeUInt16LE(nameB.length, 26);
  const zentral = Buffer.alloc(46); zentral.writeUInt32LE(0x02014b50, 0); zentral.writeUInt16LE(20, 4); zentral.writeUInt16LE(20, 6);
  zentral.writeUInt32LE(crc, 16); zentral.writeUInt32LE(daten.length, 20); zentral.writeUInt32LE(daten.length, 24); zentral.writeUInt16LE(nameB.length, 28);
  const lokalTeil = Buffer.concat([lokal, nameB, daten]);
  const zentralTeil = Buffer.concat([zentral, nameB]);
  const ende = Buffer.alloc(22); ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(1, 8); ende.writeUInt16LE(1, 10);
  ende.writeUInt32LE(zentralTeil.length, 12); ende.writeUInt32LE(lokalTeil.length, 16);
  return Buffer.concat([lokalTeil, zentralTeil, ende]);
}

function mitTemp(fn) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-hl7-beleg-'));
  try { return fn(d); } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

test('[HL7-Beleg] ein freies Jar mit fhir-build.properties ergibt Name, Fassung und Prüfsumme, nicht gepinnt', () => mitTemp((d) => {
  const jar = path.join(d, 'validator_cli.jar');
  fs.writeFileSync(jar, zipMitEinerDatei('fhir-build.properties', 'orgfhir.version=6.9.8\nbuildnumber=f8b250d5\n'));
  const v = VB.jarFassung(jar);
  assert.equal(v.name, VB.NAME);
  assert.equal(v.fassung, '6.9.8');
  assert.match(v.sha256, /^[0-9a-f]{64}$/);
  assert.equal(v.gepinnt, false);
}));

test('[HL7-Beleg] das gepinnte Jar (Prüfsumme = Pin) ergibt die Pin-Fassung und gepinnt', () => mitTemp((d) => {
  const jar = path.join(d, 'validator_cli.jar');
  fs.writeFileSync(jar, zipMitEinerDatei('irgendwas.txt', 'x'));
  const pin = { VERSION: '6.9.12', SHA256: VB.sha256Datei(jar) };
  const v = VB.jarFassung(jar, { pin });
  assert.deepEqual([v.fassung, v.gepinnt], ['6.9.12', true]);
}));

test('[HL7-Beleg·Rot-Beweis] ein freies Jar ohne lesbare Fassung ist nicht verwendbar', () => mitTemp((d) => {
  const jar = path.join(d, 'validator_cli.jar');
  fs.writeFileSync(jar, zipMitEinerDatei('irgendwas.txt', 'x'));
  assert.throws(() => VB.jarFassung(jar), /ohne lesbare Fassung/);
  assert.throws(() => VB.jarFassung(path.join(d, 'fehlt.jar')), /nicht angegeben oder nicht vorhanden/);
}));

test('[HL7-Beleg·Rot-Beweis] ein Jar mit anderem SHA als dem Pin: abgewiesen oder mit seiner wirklichen Fassung im Bericht, nie still die Pin-Fassung', () => mitTemp((d) => {
  const pin = require('../tools/lib/hl7-validator-pin.json');
  // (a) ohne lesbare Fassung: abgewiesen
  const ohne = path.join(d, 'ohne.jar');
  fs.writeFileSync(ohne, zipMitEinerDatei('irgendwas.txt', 'x'));
  assert.notEqual(VB.sha256Datei(ohne), pin.sha256);
  assert.throws(() => VB.jarFassung(ohne), /ohne lesbare Fassung/);
  // (b) mit lesbarer Fassung: der Bericht trägt genau diese, nicht die Pin-Fassung, und „gepinnt: false“
  const fremd = path.join(d, 'fremd.jar');
  fs.writeFileSync(fremd, zipMitEinerDatei('fhir-build.properties', 'version=6.9.8\n'));
  assert.notEqual(VB.sha256Datei(fremd), pin.sha256);
  const kopf = VB.belegKopf({ validator: VB.jarFassung(fremd), ergebnis: 'wie-erwartet' });
  assert.equal(kopf.validator.fassung, '6.9.8');
  assert.notEqual(kopf.validator.fassung, pin.version, 'nie still die Pin-Fassung');
  assert.equal(kopf.validator.gepinnt, false);
  // (c) selbst wenn ein fremdes Jar sich 6.9.12 nennt, bleibt es ungepinnt (die Prüfsumme entscheidet, nicht die Angabe)
  const tarn = path.join(d, 'tarn.jar');
  fs.writeFileSync(tarn, zipMitEinerDatei('fhir-build.properties', 'version=' + pin.version + '\n'));
  assert.equal(VB.jarFassung(tarn).gepinnt, false);
}));

test('[HL7-Beleg·Rot-Beweis] ein Bericht ohne Validator-Name und -Fassung ist rot, mit Kopf grün', () => {
  assert.deepEqual(VB.berichtPruefen({ bericht: [] }), ['validator.name', 'validator.fassung', 'validator.sha256']);
  assert.deepEqual(VB.berichtPruefen({ validator: { name: VB.NAME, sha256: 'a'.repeat(64) } }), ['validator.fassung']);
  const kopf = VB.belegKopf({ validator: { name: VB.NAME, fassung: '6.9.12', sha256: 'b'.repeat(64), gepinnt: true }, kernHash: 'c'.repeat(64), ergebnis: 'gruen', jetzt: '2026-10-04T08:00:00Z' });
  assert.deepEqual(VB.berichtPruefen(kopf), []);
  assert.deepEqual(Object.keys(kopf), ['validator', 'datum', 'kernHash', 'ergebnis'], 'genau die Felder des Belegs');
  assert.equal(kopf.datum, '2026-10-04T08:00:00.000Z', 'Datum in UTC');
});

test('[HL7-Beleg·Rot-Beweis] ein Beleg mit Pfad oder Hostname wird nicht geschrieben; ohne beides je Kern-Hash der letzte Lauf', () => mitTemp((d) => {
  const datei = path.join(d, 'gate-belege.json');
  const v = { name: VB.NAME, fassung: '6.9.12', sha256: 'b'.repeat(64), gepinnt: true };
  assert.throws(() => VB.gateBelegSchreiben({ ...VB.belegKopf({ validator: v, kernHash: 'k1', ergebnis: 'gruen' }), jar: path.join(os.homedir(), 'validator_cli.jar') }, datei), /Pfad oder Hostname/);
  assert.throws(() => VB.gateBelegSchreiben(VB.belegKopf({ validator: v, kernHash: os.hostname(), ergebnis: 'gruen' }), datei), /Pfad oder Hostname/);
  VB.gateBelegSchreiben(VB.belegKopf({ validator: v, kernHash: 'k1', ergebnis: 'rot', jetzt: '2026-10-04T08:00:00Z' }), datei);
  VB.gateBelegSchreiben(VB.belegKopf({ validator: v, kernHash: 'k1', ergebnis: 'gruen', jetzt: '2026-10-04T09:00:00Z' }), datei);
  VB.gateBelegSchreiben(VB.belegKopf({ validator: v, kernHash: 'k2', ergebnis: 'gruen' }), datei);
  const alle = JSON.parse(fs.readFileSync(datei, 'utf8'));
  assert.deepEqual(Object.keys(alle).sort(), ['k1', 'k2']);
  assert.equal(alle.k1.ergebnis, 'gruen', 'der letzte Lauf je Kern-Hash');
}));

test('[HL7-Beleg] der Belegort liegt außerhalb des Repos', () => {
  const repo = path.join(__dirname, '..');
  assert.ok(!path.resolve(VB.GATE_BELEG_DATEI).startsWith(path.resolve(repo) + path.sep), VB.GATE_BELEG_DATEI);
  assert.match(VB.GATE_BELEG_DATEI, /vivodepot-hl7-validator[\\/]gate-belege\.json$/);
});
